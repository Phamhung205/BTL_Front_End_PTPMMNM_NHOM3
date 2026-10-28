import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = process.argv[2] || process.env.API_BASE_URL;
if (process.env.TM_DEMO_ISOLATED !== '1') throw new Error('Run this write test only through the isolated API audit harness.');
const fixture = JSON.parse(readFileSync(process.env.TM_TEST_FIXTURE, 'utf8'));
const adminProfile = fixture.accounts.find(account => account.role === 'admin');
let checks = 0;
const suffix = Math.random().toString(36).slice(2, 10);
const email = `permission.${suffix}@example.test`;
const password = 'PermissionTest!2026';

async function call(path, method = 'GET', body, token) {
    const response = await fetch(base + path, {
        method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    let data = null;
    try { data = await response.json(); } catch {}
    return { status: response.status, data };
}
function check(condition, label) { assert.ok(condition, label); checks++; console.log('PASS ' + label); }

const adminLogin = await call('/api/auth/login', 'POST', { email: adminProfile.email, password: fixture.password });
assert.equal(adminLogin.status, 200, 'fixture Admin login');
const adminToken = adminLogin.data.token;
check((await call('/api/admin/roles')).status === 401, 'Anonymous cannot read the role catalog');
check((await call('/api/admin/roles', 'GET', undefined, adminToken)).status === 200, 'Admin reads system and project role definitions');
const catalog = (await call('/api/admin/roles', 'GET', undefined, adminToken)).data;
check(catalog.systemRoles.map(role => role.code).join(',') === 'admin,user', 'Global roles remain Admin and User');
check(catalog.projectRoles.map(role => role.code).join(',') === 'manager,translator,reviewer', 'Project roles remain Manager, Translator and Reviewer');
check((await call('/api/admin/permissions', 'GET', undefined, adminToken)).data.items.length >= 30, 'Admin reads detailed permission definitions');

const registered = await call('/api/auth/register', 'POST', { email, displayName: 'Permission Test', password });
assert.equal(registered.status, 200, 'test account registration');
const userToken = registered.data.token;
check((await call('/api/admin/roles', 'GET', undefined, userToken)).status === 403, 'Regular User cannot read Admin role endpoints');
const mine = await call('/api/auth/permissions', 'GET', undefined, userToken);
check(mine.status === 200 && mine.data.systemRole === 'user' && mine.data.permissions.includes('projects.create'), 'User reads their own effective permissions');

const created = await call('/api/admin/users', 'POST', { email: `managed.${suffix}@example.test`, displayName: 'Managed Account', password, systemRole: 'user' }, adminToken);
check(created.status === 201 && created.data.systemRole === 'user' && !JSON.stringify(created.data).match(/password|salt|hash|token/i), 'Admin creates User without exposing password or credential fields');
const targetEmail = created.data.email;
const found = await call('/api/admin/users/find?email=' + encodeURIComponent(targetEmail.toUpperCase()), 'GET', undefined, adminToken);
check(found.status === 200 && found.data.id === created.data.id, 'Admin searches accounts by normalized email');
check((await call('/api/admin/users/find?email=missing@example.test', 'GET', undefined, adminToken)).status === 404, 'Email search reports a missing account');
let targetToken = (await call('/api/auth/login', 'POST', { email: targetEmail, password })).data.token;
const snapshot = await call(`/api/admin/users/${created.data.id}/permissions`, 'GET', undefined, adminToken);
check(snapshot.status === 200 && snapshot.data.userId === created.data.id && snapshot.data.systemRole === 'user', 'Admin sees the account permission snapshot');

const upgraded = await call(`/api/admin/users/${created.data.id}/role`, 'PUT', { role: 'admin', expectedVersion: created.data.securityVersion }, adminToken);
check(upgraded.status === 200 && upgraded.data.systemRole === 'admin' && !('password' in upgraded.data), 'Admin grants system Admin with optimistic version');
check((await call('/api/admin/roles', 'GET', undefined, targetToken)).status === 200, 'Role grant takes effect for an existing login token');
check((await call(`/api/admin/users/${created.data.id}/role`, 'PUT', { role: 'manager', expectedVersion: upgraded.data.securityVersion }, adminToken)).status === 400, 'Project role cannot be assigned as a global role');
check((await call(`/api/admin/users/${created.data.id}/role`, 'PUT', { role: 'user', expectedVersion: created.data.securityVersion }, adminToken)).status === 409, 'Stale role update returns a conflict');

const downgraded = await call(`/api/admin/users/${created.data.id}/role`, 'PUT', { role: 'user', expectedVersion: upgraded.data.securityVersion }, adminToken);
check(downgraded.status === 200 && downgraded.data.systemRole === 'user', 'Admin revokes global Admin role');
check((await call('/api/admin/roles', 'GET', undefined, targetToken)).status === 403, 'Revoked Admin immediately loses access with old token');
const locked = await call(`/api/admin/users/${created.data.id}/status`, 'PUT', { isActive: false, expectedVersion: downgraded.data.securityVersion }, adminToken);
check(locked.status === 200 && locked.data.isActive === false, 'Admin can lock an account');
check((await call('/api/auth/me', 'GET', undefined, targetToken)).status === 401, 'Locked account cannot use an existing token');
const unlocked = await call(`/api/admin/users/${created.data.id}/status`, 'PUT', { isActive: true, expectedVersion: locked.data.securityVersion }, adminToken);
check(unlocked.status === 200 && unlocked.data.isActive === true, 'Admin can re-enable an account');

const self = await call('/api/auth/me', 'GET', undefined, adminToken);
const selfUser = await call(`/api/admin/users/${self.data.userId}`, 'GET', undefined, adminToken);
check((await call(`/api/admin/users/${self.data.userId}/role`, 'PUT', { role: 'user', expectedVersion: selfUser.data.securityVersion }, adminToken)).status === 409, 'Admin cannot demote the account currently in use');
check((await call(`/api/admin/users/${self.data.userId}/status`, 'PUT', { isActive: false, expectedVersion: selfUser.data.securityVersion }, adminToken)).status === 409, 'Admin cannot lock the account currently in use');

const project = await call('/api/projects', 'POST', { name: 'Permission Scope ' + suffix, slug: 'permission-' + suffix, sourceLocaleCode: 'en' }, adminToken);
check(project.status === 201, 'Admin can create a project using the existing project flow');
const projectId = project.data.id;
check((await call(`/api/admin/projects/${projectId}/members`, 'POST', { email: targetEmail, role: 'translator' }, adminToken)).status === 201, 'Admin assigns a project role independently of system role');
targetToken = (await call('/api/auth/login', 'POST', { email: targetEmail, password })).data.token;
const projectPermissions = await call(`/api/projects/${projectId}/permissions`, 'GET', undefined, targetToken);
check(projectPermissions.status === 200 && projectPermissions.data.role === 'translator' && projectPermissions.data.permissions.includes('translations.edit') && !projectPermissions.data.permissions.includes('reviews.approve'), 'Project permission API enforces Translator scope');
check((await call(`/api/admin/users/${created.data.id}/permissions`, 'GET', undefined, userToken)).status === 403, 'A User cannot inspect another account permissions');

console.log(`Completed ${checks} permission integration checks against ${base}.`);
