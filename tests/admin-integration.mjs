import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes, createHmac } from 'node:crypto';
const fixture = JSON.parse(readFileSync(process.env.TM_TEST_FIXTURE || new URL('../.local/demo-accounts.json', import.meta.url), 'utf8'));
const base = process.env.API_BASE_URL || 'http://127.0.0.1:5088', frontend = process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:8095', suffix = randomBytes(6).toString('hex');
let count = 0, projectId, otherProjectId;
function check(value, label) { assert.ok(value, label); count++; console.log('PASS ' + label); }
async function api(path, method = 'GET', body, token) {
    const res = await fetch(base + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); return { status: res.status, data: text ? JSON.parse(text) : null };
}
const adminProfile = fixture.accounts.find(account => account.role === 'admin');
const adminLogin = await api('/api/auth/login', 'POST', { email: adminProfile.email, password: fixture.password });
check(adminLogin.status === 200 && adminLogin.data.systemRole === 'admin', 'Admin login returns system role');
const token = adminLogin.data.token;
async function findUser(id) { const result = await api('/api/admin/users?q=' + encodeURIComponent(suffix), 'GET', undefined, token); return result.data.items.find(user => user.id === id); }
async function update(user, fields, actor = token) { return api('/api/admin/users/' + user.id, 'PUT', { displayName: user.displayName, systemRole: user.systemRole, isActive: user.isActive, expectedVersion: user.securityVersion, ...fields }, actor); }
const qa = [];
for (const role of ['manager', 'translator', 'reviewer', 'other']) {
    const result = await api('/api/auth/register', 'POST', { email: `adminqa.${role}.${suffix}@example.com`, password: 'AdminQA@Test2026!', displayName: 'Admin QA ' + role, systemRole: 'admin', isActive: true });
    check(result.status === 200 && result.data.systemRole === 'user', 'Registration cannot grant Admin: ' + role); qa.push({ ...result.data, role });
}
const [manager, translator, reviewer, other] = qa;
try {
    check((await api('/api/auth/me', 'GET', undefined, manager.token)).data.systemRole === 'user', 'Identity reflects database system role');
    check((await api('/api/admin/stats')).status === 401, 'Anonymous cannot access admin');
    const me = (await api('/api/auth/me', 'GET', undefined, token)).data;
    const currentAdmin = (await api('/api/admin/users?q=' + encodeURIComponent(adminProfile.email), 'GET', undefined, token)).data.items.find(user => user.id === me.userId);
    const activeAdmins = (await api('/api/admin/users?role=admin&status=active', 'GET', undefined, token)).data.total;
    if (activeAdmins === 1) {
        check((await update(currentAdmin, { systemRole: 'user' })).status === 409, 'Last active Admin cannot be demoted');
        check((await update(currentAdmin, { isActive: false })).status === 409, 'Last active Admin cannot be locked');
    }
    const created = await api('/api/projects', 'POST', { name: 'Admin QA ' + suffix, slug: 'adminqa-' + suffix, sourceLocaleCode: 'vi' }, manager.token); projectId = created.data.id;
    const path = '/api/admin/projects/' + projectId;
    for (const account of [translator, reviewer]) await api('/api/projects/' + projectId + '/members', 'POST', { userId: account.userId, role: account.role }, manager.token);
    for (const account of [manager, translator, reviewer, other]) {
        for (const endpoint of ['/api/admin/stats', '/api/admin/users', '/api/admin/projects', '/api/admin/audit', path + '/members']) check((await api(endpoint, 'GET', undefined, account.token)).status === 403, account.role + ' denied ' + endpoint);
        check((await update(await findUser(other.userId), { systemRole: 'admin' }, account.token)).status === 403, account.role + ' cannot grant system role');
        check((await api(path, 'DELETE', undefined, account.token)).status === 403, account.role + ' cannot delete via admin route');
    }
    const settings = JSON.parse(readFileSync(new URL('../backend/TranslationManager.Backend/appsettings.json', import.meta.url), 'utf8')).Jwt;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: settings.Issuer, aud: settings.Audience, sub: String(other.userId), system_role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const data = header + '.' + payload, forgedClaimToken = data + '.' + createHmac('sha256', (process.env.TM_TEST_JWT_KEY || readFileSync(new URL('../.local/backend-jwt.key', import.meta.url), 'utf8').trim())).update(data).digest('base64url');
    check((await api('/api/admin/stats', 'GET', undefined, forgedClaimToken)).status === 403, 'Even signed stale Admin claim cannot override database role');
    const users = await api('/api/admin/users?q=' + suffix, 'GET', undefined, token);
    check(users.data.total === 4 && users.data.items.length === 4 && !/password|salt|token/.test(JSON.stringify(users.data)), 'User list paginated and contains no credential fields');
    const page2 = await api('/api/admin/users?page=2', 'GET', undefined, token); check(page2.status === 200 && page2.data.items.length <= 50 && page2.data.page === 2, 'User pagination accepts second page');
    for (const endpoint of ['/api/admin/users?page=0', '/api/admin/users?role=manager', '/api/admin/users?status=invalid', '/api/admin/projects?page=-1', '/api/admin/audit?page=0']) check((await api(endpoint, 'GET', undefined, token)).status === 400, 'Reject invalid filter ' + endpoint);
    let target = await findUser(other.userId);
    check((await update(target, { displayName: 'QA <script>alert(1)</script>' })).status === 204, 'Admin can update profile name');
    check((await update(target, { systemRole: 'admin' })).status === 409, 'Stale user version cannot overwrite newer changes');
    target = await findUser(other.userId);
    check((await update(target, { systemRole: 'admin' })).status === 204, 'Admin grants system Admin role');
    check((await api('/api/admin/stats', 'GET', undefined, other.token)).status === 200, 'Existing JWT sees newly granted role immediately');
    target = await findUser(other.userId); check((await update(target, { systemRole: 'user' })).status === 204, 'Admin revokes role');
    check((await api('/api/admin/stats', 'GET', undefined, other.token)).status === 403, 'Revoked Admin loses access without JWT expiry');
    target = await findUser(translator.userId); check((await update(target, { isActive: false })).status === 204, 'Admin locks translator');
    check((await api('/api/projects', 'GET', undefined, translator.token)).status === 401, 'Locked account existing JWT rejected on regular API');
    check((await api('/api/auth/login', 'POST', { email: translator.email, password: 'AdminQA@Test2026!' })).status === 401, 'Locked account cannot log in');
    check((await api(path + '/members', 'POST', { userId: translator.userId, role: 'manager' }, token)).status === 404, 'Locked user cannot be added as active project manager');
    target = await findUser(translator.userId); check((await update(target, { isActive: true })).status === 204, 'Admin unlocks account');
    check((await api('/api/projects', 'GET', undefined, translator.token)).status === 200, 'Unlocked active account can use API');
    target = await findUser(manager.userId); check((await update(target, { isActive: false })).status === 409, 'Cannot lock last active Manager');
    check((await api(path + '/members/' + manager.userId, 'DELETE', undefined, token)).status === 409, 'Admin cannot remove last Manager');
    check((await api(path + '/members/' + manager.userId, 'PUT', { role: 'translator' }, token)).status === 409, 'Admin cannot demote last Manager');
    check((await api('/api/projects/' + projectId + '/translations/stats', 'GET', undefined, token)).status === 403, 'System Admin does not silently gain project translation access');
    check((await api(path + '/members', 'GET', undefined, token)).data.length === 3, 'Admin sees members of project without membership');
    check((await api(path + '/members', 'POST', { userId: other.userId, role: 'manager' }, token)).status === 201, 'Admin assigns replacement project Manager');
    check((await api(path + '/members', 'POST', { userId: other.userId, role: 'manager' }, token)).status === 409, 'Duplicate project member remains conflict');
    target = await findUser(manager.userId); check((await update(target, { isActive: false })).status === 204, 'Manager can be locked after replacement assigned');
    check((await api(path + '/members/' + other.userId, 'DELETE', undefined, token)).status === 409, 'Inactive Manager cannot satisfy last active Manager rule');
    target = await findUser(manager.userId); check((await update(target, { isActive: true })).status === 204, 'Restore Manager account');
    check((await api(path, 'PUT', { name: 'Updated Admin QA ' + suffix, slug: 'adminqa-' + suffix }, token)).status === 204, 'Admin updates project outside own membership');
    check((await api('/api/admin/projects?q=' + suffix, 'GET', undefined, token)).data.items.some(project => project.id === projectId), 'Global project search includes nonmember project');
    const second = await api('/api/projects', 'POST', { name: 'Other Admin QA ' + suffix, slug: 'adminqa-other-' + suffix, sourceLocaleCode: 'en' }, other.token); otherProjectId = second.data.id;
    check((await api('/api/admin/stats', 'GET', undefined, token)).data.projects >= 2, 'Global statistics include all projects');
    const beforeAudit = (await api('/api/admin/audit?q=project.deleted', 'GET', undefined, token)).data.total;
    check((await api('/api/admin/projects/' + otherProjectId, 'DELETE', undefined, token)).status === 204, 'Admin deletes project'); otherProjectId = null;
    const afterAudit = await api('/api/admin/audit?q=project.deleted', 'GET', undefined, token);
    check(afterAudit.data.total === beforeAudit + 1, 'Project deletion audit survives deleted project');
    const userAudit = await api('/api/admin/audit?q=user.updated', 'GET', undefined, token); check(userAudit.data.items.some(item => item.targetId === other.userId) && !/password|salt|token/.test(JSON.stringify(userAudit.data)), 'Account audit records contain allowed fields only');
    let cookie = '', csrf;
    async function gateway(endpoint, method = 'GET', body, csrfValue = csrf) {
        const res = await fetch(frontend + '/gateway.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfValue, Origin: frontend, Cookie: cookie }, body: JSON.stringify({ endpoint, method, ...(body === undefined ? {} : { body }) }) });
        for (const value of res.headers.getSetCookie()) if (value.startsWith('tm_frontend_session=')) cookie = value.split(';')[0]; return res;
    }
    const page = await fetch(frontend + '/pages/admin/index.php'); for (const value of page.headers.getSetCookie()) if (value.startsWith('tm_frontend_session=')) cookie = value.split(';')[0]; csrf = JSON.parse((await page.text()).match(/window\.APP_CONFIG = (.*);<\/script>/)[1]).csrfToken;
    const logged = await gateway('/api/auth/login', 'POST', { email: adminProfile.email, password: fixture.password }); check(logged.status === 200 && !(await logged.text()).includes('token'), 'Admin PHP session keeps JWT private');
    check((await gateway('/api/admin/stats')).status === 200, 'Admin gateway returns authorized global statistics');
    check((await gateway('/api/admin/users/' + other.userId, 'PUT', {}, 'wrong-csrf')).status === 403, 'Admin mutation requires CSRF');
    await gateway('/api/auth/login', 'POST', { email: other.email, password: 'AdminQA@Test2026!' });
    check((await gateway('/api/admin/users')).status === 403, 'Ordinary PHP session cannot access Admin API');
    console.log(`Completed ${count} admin integration checks.`);
} finally {
    if (projectId) await api('/api/admin/projects/' + projectId, 'DELETE', undefined, token);
    if (otherProjectId) await api('/api/admin/projects/' + otherProjectId, 'DELETE', undefined, token);
    const target = await findUser(other.userId); if (target?.systemRole === 'admin') await update(target, { systemRole: 'user' });
}
