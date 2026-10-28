import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ids = new Map();
class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.value = ''; this.textContent = ''; this.listeners = {}; const classes = new Set(['hidden']); this.classList = { add: n => classes.add(n), remove: n => classes.delete(n), contains: n => classes.has(n), toggle(n, force) { (force ?? !classes.has(n)) ? classes.add(n) : classes.delete(n); } }; }
    set id(value) { this._id = value; ids.set(value, this); } get id() { return this._id; }
    set innerHTML(_) { throw new Error('Unsafe HTML assignment'); }
    append(...nodes) { this.children.push(...nodes); } replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(key, value) { this[key] = value; } removeAttribute(key) { delete this[key]; }
    addEventListener(name, fn) { this.listeners[name] = fn; } reportValidity() { return true; } focus() {}
}
const element = id => { if (!ids.has(id)) { const node = new Element(); node.id = id; } return ids.get(id); };
let handler, mutation, dialog, count = 0; const requests = [], tabs = ['overview', 'users', 'projects', 'audit', 'permissions'].map(tab => Object.assign(new Element('button'), { dataset: { adminTab: tab } }));
const location = { href: 'http://localhost/pages/admin/index.php', search: '' };
const context = vm.createContext({ APP_CONFIG: { mode: 'api' }, URL, URLSearchParams, Date, Node: Element, window: { addEventListener() {} }, location,
    history: { replaceState(_, __, path) { const url = new URL(path, location.href); location.href = url.href; location.search = url.search; } },
    document: { addEventListener() {}, getElementById: element, createElement: tag => new Element(tag), querySelectorAll: selector => selector === '[data-admin-tab]' ? tabs : [] },
    apiEndpoint: name => ({ me: '/api/auth/me', adminStats: '/api/admin/stats', adminUsers: '/api/admin/users', adminProjects: '/api/admin/projects', adminAudit: '/api/admin/audit', adminRoles: '/api/admin/roles', adminPermissions: '/api/admin/permissions', adminFindUser: '/api/admin/users/find' }[name]),
    apiCollection: data => Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null,
    apiGet: async (path, options) => { requests.push({ path, options }); return handler(path, options); },
    apiPut: async (path, body) => { requests.push({ path, body }); return mutation; }, apiPost: async (path, body) => { requests.push({ path, body }); return mutation; }, apiDelete: async path => { requests.push({ path }); return mutation; }
});
vm.runInContext(readFileSync(new URL('../assets/js/shared/ui.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../assets/js/admin/index.js', import.meta.url), 'utf8'), context);
context.openModal = (title, content, confirm) => { dialog = { title, content, confirm }; }; context.closeModal = () => {}; context.setModalBusy = () => {}; context.showToast = () => {};
const evaluate = script => vm.runInContext(script, context), ok = data => ({ success: true, data });
function check(value, label) { assert.ok(value, label); count++; console.log('PASS ' + label); }
handler = () => ok({ userId: 1, systemRole: 'user' }); await context.initializeAdmin();
check(!element('admin-denied').classList.contains('hidden') && element('admin-content').classList.contains('hidden'), 'Ordinary account cannot see Admin content');
check(requests.length === 1 && requests[0].path === '/api/auth/me', 'Unauthorized account never requests global data');
handler = path => ok(path === '/api/auth/me' ? { userId: 1, systemRole: 'admin', displayName: 'Admin' } : { users: 4, activeUsers: 3, admins: 1, projects: 2, sourceStrings: 10, translations: 8, releases: 1, auditEvents: 2 });
await context.initializeAdmin(); check(!element('admin-overview').classList.contains('hidden') && element('admin-stats').children.length === 8, 'Admin sees all overview statistics');
check(location.search === '?tab=overview', 'Admin navigation is reflected in URL');
const user = { id: 2, email: 'qa@example.com', displayName: '<script>alert(1)</script>', systemRole: 'user', isActive: true, securityVersion: 3, projectCount: 1 };
handler = () => ok({ items: [user], total: 1, hasMore: false });
await context.selectAdminTab('users'); check(element('admin-users-body').children[0].children[0].children[0].children[0].textContent === user.displayName, 'User name rendered as safe text');
check(element('admin-previous').disabled && element('admin-next').disabled, 'Single-page navigation remains disabled at bounds');
element('admin-users-q').value = 'qa & ?'; element('admin-users-role').value = 'admin'; element('admin-users-status').value = 'locked'; await context.loadAdminTab();
check(requests.at(-1).options.query.q === 'qa & ?' && requests.at(-1).options.query.status === 'locked' && requests.at(-1).options.query.role === 'admin', 'Search forwards explicit user role and lock status');
context.editAdminUser(user); element('admin-edit-name').value = 'Edited'; element('admin-edit-role').value = 'admin'; element('admin-edit-status').value = 'locked';
mutation = { success: false, status: 409, message: 'Last active Admin' }; await dialog.confirm();
check(requests.at(-1).body.expectedVersion === 3 && requests.at(-1).body.systemRole === 'admin' && requests.at(-1).body.isActive === false, 'User update sends original version and explicit role/status');
check(element('admin-user-error').textContent === 'Last active Admin', 'Guard or conflict error stays visible in editor');
mutation = { success: false, status: 403, message: 'Access revoked' }; await dialog.confirm();
check(element('admin-content').classList.contains('hidden') && !element('admin-denied').classList.contains('hidden'), 'Revoked Admin mutation clears privileged content');
evaluate('adminState.me={userId:1,systemRole:"admin"}; adminState.tab="projects"');
context.deleteAdminProject({ id: 5, name: 'Project', slug: 'demo-project' }); const before = requests.length; element('admin-delete-slug').value = 'wrong'; await dialog.confirm();
check(requests.length === before && element('admin-delete-error').textContent.length > 0, 'Project deletion requires exact slug confirmation');
element('admin-delete-slug').value = 'demo-project'; await dialog.confirm(); check(requests.at(-1).path === '/api/admin/projects/5', 'Confirmed deletion uses Admin-specific endpoint');
evaluate('adminState.me={userId:1,systemRole:"admin"}; adminState.tab="users"');
let resolveOld; handler = () => new Promise(resolve => { resolveOld = resolve; }); const old = context.loadAdminTab();
handler = () => ok({ items: [{ ...user, displayName: 'Current' }], total: 1, hasMore: false }); await context.selectAdminTab('projects');
resolveOld(ok({ items: [user], total: 1, hasMore: false })); await old;
check(element('admin-users').classList.contains('hidden') && !element('admin-projects').classList.contains('hidden'), 'Late previous-tab response cannot reveal stale content');
handler = () => ({ success: false, status: 403, message: 'Forbidden' }); await context.loadAdminTab();
check(element('admin-content').classList.contains('hidden'), 'Read permission failure clears all Admin panels');
evaluate('adminState.me={userId:1,systemRole:"admin"}; adminState.tab="permissions"');
const target = { id: 9, email: 'target@example.com', displayName: 'Target User', systemRole: 'user', isActive: true, securityVersion: 4, createdAt: '2026-01-01', projectCount: 1 };
const snapshot = { userId: 9, email: target.email, displayName: target.displayName, systemRole: 'user', isActive: true, securityVersion: 4, permissions: [], projects: [{ projectId: 5, name: 'Translation project', role: 'translator', permissions: ['translations.edit'], translationEditScope: 'assigned_only' }] };
handler = path => path === '/api/admin/roles' ? ok({ version: 1, systemRoles: [{ code: 'admin', label: 'Admin', scope: 'system', description: 'System admin', permissions: ['admin.users.read'] }, { code: 'user', label: 'Người dùng', scope: 'system', description: 'Standard user', permissions: [] }], projectRoles: [{ code: 'translator', label: 'Translator', scope: 'project', description: 'Translation', permissions: ['translations.edit'] }] }) : path === '/api/admin/permissions' ? ok({ version: 1, items: [{ code: 'admin.users.read', label: 'Find users', scope: 'system' }, { code: 'translations.edit', label: 'Edit translations', scope: 'project' }] }) : ok({});
await context.loadAdminTab(); check(!element('admin-permissions').classList.contains('hidden') && element('admin-role-catalog').children.length === 3, 'Permission view reads role catalog from Admin API');
handler = path => path === '/api/admin/users/find' ? ok(target) : ok(snapshot);
element('admin-permission-email').value = target.email; await context.findAdminPermissionUser();
check(element('admin-permission-identity').textContent.includes(target.email) && element('admin-permission-projects').children.length === 1, 'Email lookup shows safe user identity and project permissions');
mutation = ok({ ...target, systemRole: 'admin', securityVersion: 5 }); element('admin-permission-role').value = 'admin'; await context.grantAdminSystemRole({ preventDefault() {} });
check(requests.some(item => item.path === '/api/admin/users/9/role' && item.body.role === 'admin' && item.body.expectedVersion === 4), 'Role grant uses target ID and optimistic version');
context.createAdminUser(); element('admin-create-email').value = 'created@example.test'; element('admin-create-name').value = 'Created User'; element('admin-create-password').value = 'LongTemporaryPassword!2026'; element('admin-create-role').value = 'user'; mutation = ok({ id: 10 }); await dialog.confirm();
check(requests.some(item => item.path === '/api/admin/users' && item.body?.email === 'created@example.test' && item.body.systemRole === 'user' && item.body.password === 'LongTemporaryPassword!2026'), 'Create account modal posts validated form to Admin API');
console.log(`Completed ${count} admin UI behavior checks.`);
