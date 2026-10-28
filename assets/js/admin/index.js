/** System administration is authorized by current database role on every API request. */
const adminState = { me: null, tab: 'overview', page: 1, request: 0, detail: 0, busy: false, permissionUser: null, roleCatalog: null };
const adminTabs = ['overview', 'users', 'projects', 'audit', 'permissions'];
const ae = id => document.getElementById(id);
function adminText(tag, text, classes = '') { const node = document.createElement(tag); node.textContent = text ?? ''; node.className = classes; return node; }
function adminOption(select, value, label) { const option = adminText('option', label); option.value = value; select.append(option); }
function adminError(message) { setTextContent('admin-error-text', message); showElement('admin-error'); }
function adminTime(value) { const date = new Date(value); return value && Number.isFinite(date.getTime()) ? date.toLocaleString('vi-VN') : '--'; }
function denyAdmin() { adminState.me = null; adminState.permissionUser = null; adminState.roleCatalog = null; adminState.request++; adminState.detail++; hideElement('admin-content'); hideElement('admin-loading'); hideElement('admin-error'); hideElement('admin-permission-user'); ['admin-stats', 'admin-users-body', 'admin-projects-body', 'admin-audit-list', 'admin-role-catalog', 'admin-permission-projects'].forEach(id => ae(id)?.replaceChildren()); setTextContent('admin-permission-identity', ''); setTextContent('admin-permission-current', ''); showElement('admin-denied'); }
document.addEventListener('DOMContentLoaded', () => {
    if (!ae('admin-workspace')) return;
    document.querySelectorAll('[data-admin-tab]').forEach(button => button.addEventListener('click', () => selectAdminTab(button.dataset.adminTab)));
    ['users', 'projects', 'audit'].forEach(tab => ae('admin-' + tab + '-filter').addEventListener('submit', event => { event.preventDefault(); adminState.page = 1; loadAdminTab(); }));
    ae('admin-retry').addEventListener('click', initializeAdmin);
    ae('admin-previous').addEventListener('click', () => { if (adminState.page > 1) { adminState.page--; loadAdminTab(); } });
    ae('admin-next').addEventListener('click', () => { adminState.page++; loadAdminTab(); });
    ae('admin-add-user')?.addEventListener('click', createAdminUser);
    ae('admin-permission-find')?.addEventListener('submit', findAdminPermissionUser);
    ae('admin-permission-grant')?.addEventListener('submit', grantAdminSystemRole);
    ae('admin-permission-reload')?.addEventListener('click', findAdminPermissionUser);
    ae('admin-permission-manage-projects')?.addEventListener('click', () => selectAdminTab('projects'));
    ae('admin-permission-email')?.addEventListener('input', () => { adminState.detail++; adminState.permissionUser = null; hideElement('admin-permission-user'); ae('admin-permission-find-btn').disabled = false; });
    initializeAdmin();
});
async function initializeAdmin() {
    const request = ++adminState.request; hideElement('admin-content'); hideElement('admin-denied'); hideElement('admin-error'); showElement('admin-loading');
    if (APP_CONFIG.mode !== 'api') { denyAdmin(); return; }
    const result = await apiGet(apiEndpoint('me'));
    if (request !== adminState.request) return;
    if (!result.success) { hideElement('admin-loading'); if (result.status === 401 || result.status === 403) denyAdmin(); else adminError(result.message); return; }
    if (result.data?.systemRole !== 'admin') { denyAdmin(); return; }
    adminState.me = result.data; setTextContent('admin-user-name', result.data.displayName);
    showElement('admin-content');
    const requested = new URLSearchParams(location.search).get('tab'); await selectAdminTab(adminTabs.includes(requested) ? requested : 'overview');
}
async function selectAdminTab(tab) {
    if (!adminState.me || adminState.busy || !adminTabs.includes(tab)) return;
    if (tab !== 'permissions' && ae('admin-permission-find-btn')) ae('admin-permission-find-btn').disabled = false;
    adminState.tab = tab; adminState.page = 1; adminState.detail++;
    const url = new URL(location.href); url.searchParams.set('tab', tab); history.replaceState(null, '', url.pathname + url.search);
    document.querySelectorAll('[data-admin-tab]').forEach(button => { if (button.dataset.adminTab === tab) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
    await loadAdminTab();
}
async function loadAdminTab() {
    if (!adminState.me || adminState.busy) return;
    const tab = adminState.tab, request = ++adminState.request; adminState.detail++;
    adminTabs.forEach(name => hideElement('admin-' + name)); hideElement('admin-pagination'); hideElement('admin-error'); showElement('admin-loading');
    if (tab === 'permissions') { await loadAdminPermissionCatalog(request); return; }
    const endpoint = apiEndpoint({ overview: 'adminStats', users: 'adminUsers', projects: 'adminProjects', audit: 'adminAudit' }[tab]);
    const query = tab === 'overview' ? null : { q: ae('admin-' + tab + '-q').value.trim(), page: String(adminState.page), ...(tab === 'users' ? { role: ae('admin-users-role').value, status: ae('admin-users-status').value } : {}) };
    const result = await apiGet(endpoint, query ? { query } : {});
    if (request !== adminState.request) return;
    hideElement('admin-loading');
    if (!result.success) { if (result.status === 401 || result.status === 403) denyAdmin(); else adminError(result.message); return; }
    if (tab === 'overview') { if (!result.data || typeof result.data.users !== 'number') { adminError('Thống kê không hợp lệ.'); return; } renderAdminStats(result.data); }
    else {
        const rows = apiCollection(result.data);
        if (!rows || typeof result.data.total !== 'number') { adminError('Dữ liệu quản trị không hợp lệ.'); return; }
        if (tab === 'users') renderAdminUsers(rows); else if (tab === 'projects') renderAdminProjects(rows); else renderAdminAudit(rows);
        setTextContent('admin-' + tab + '-count', rows.length ? `${result.data.total} kết quả · tối đa 50 kết quả mỗi trang` : 'Không có kết quả phù hợp.');
        setTextContent('admin-page-label', `Trang ${adminState.page} / ${Math.max(1, Math.ceil(result.data.total / 50))}`);
        ae('admin-previous').disabled = adminState.page <= 1; ae('admin-next').disabled = !result.data.hasMore; showElement('admin-pagination');
    }
    showElement('admin-' + tab);
}
function renderAdminStats(stats) {
    const grid = ae('admin-stats'); grid.replaceChildren();
    [['Tài khoản', stats.users], ['Đang hoạt động', stats.activeUsers], ['Admin đang hoạt động', stats.admins], ['Dự án', stats.projects], ['Khóa nguồn đang dùng', stats.sourceStrings], ['Bản dịch có nội dung', stats.translations], ['Bản phát hành', stats.releases], ['Thao tác quản trị', stats.auditEvents]].forEach(([label, value]) => {
        const card = document.createElement('article'); card.className = 'workflow-card'; card.append(adminText('p', label, 'text-sm text-slate-500'), adminText('p', value, 'text-3xl font-bold text-slate-900 mt-3')); grid.append(card);
    });
}

async function loadAdminPermissionCatalog(request) {
    const [rolesResult, permissionsResult] = await Promise.all([
        apiGet(apiEndpoint('adminRoles')),
        apiGet(apiEndpoint('adminPermissions'))
    ]);
    if (request !== adminState.request || adminState.tab !== 'permissions') return;
    hideElement('admin-loading');
    if (!rolesResult.success || !permissionsResult.success) {
        const failure = !rolesResult.success ? rolesResult : permissionsResult;
        if (failure.status === 401 || failure.status === 403) denyAdmin(); else adminError(failure.message);
        return;
    }
    const roles = rolesResult.data, definitions = permissionsResult.data?.items;
    if (roles?.version !== 1 || !Array.isArray(roles.systemRoles) || !Array.isArray(roles.projectRoles) || !Array.isArray(definitions)) {
        adminError('Danh mục vai trò từ API không hợp lệ.'); return;
    }
    adminState.roleCatalog = roles;
    renderAdminRoleCatalog(roles, definitions);
    showElement('admin-permissions');
}

function renderAdminRoleCatalog(catalog, definitions) {
    const container = ae('admin-role-catalog'); container.replaceChildren();
    const byCode = new Map(definitions.map(item => [item.code, item]));
    [...catalog.systemRoles, ...catalog.projectRoles].forEach(role => {
        const card = document.createElement('article'); card.className = 'workflow-card';
        card.append(adminText('h3', role.label, 'font-semibold'), adminText('p', role.scope === 'system' ? 'Quyền hệ thống' : 'Quyền theo dự án', 'text-xs text-slate-500 mt-1'), adminText('p', role.description, 'text-sm mt-2'));
        const list = document.createElement('ul'); list.className = 'list-disc pl-5 mt-3 text-sm space-y-1';
        role.permissions.forEach(code => list.append(adminText('li', byCode.get(code)?.label || code)));
        card.append(list); container.append(card);
    });
}

function clearPermissionError() { const error = ae('admin-permission-error'); error.textContent = ''; error.classList.add('hidden'); }
function showPermissionError(message) { const error = ae('admin-permission-error'); error.textContent = message; error.classList.remove('hidden'); }

async function findAdminPermissionUser(event) {
    event?.preventDefault();
    clearPermissionError();
    const emailInput = ae('admin-permission-email'), email = emailInput.value.trim().toLowerCase();
    if (!emailInput.reportValidity()) return;
    const request = ++adminState.detail; adminState.permissionUser = null;
    hideElement('admin-permission-user'); ae('admin-permission-find-btn').disabled = true;
    const found = await apiGet(apiEndpoint('adminFindUser'), { query: { email } });
    if (request !== adminState.detail || adminState.tab !== 'permissions' || email !== emailInput.value.trim().toLowerCase()) return;
    ae('admin-permission-find-btn').disabled = false;
    if (!found.success) { if (found.status === 401 || found.status === 403) denyAdmin(); else showPermissionError(found.message); return; }
    if (!Number.isSafeInteger(found.data?.id) || found.data.email?.toLowerCase() !== email || !Number.isInteger(found.data.securityVersion)) { showPermissionError('Thông tin tài khoản từ API không hợp lệ.'); return; }
    const permissions = await apiGet(apiEndpoint('adminUsers') + '/' + found.data.id + '/permissions');
    if (request !== adminState.detail || adminState.tab !== 'permissions' || email !== emailInput.value.trim().toLowerCase()) return;
    if (!permissions.success) { if (permissions.status === 401 || permissions.status === 403) denyAdmin(); else showPermissionError(permissions.message); return; }
    if (permissions.data?.userId !== found.data.id || permissions.data.email?.toLowerCase() !== email || permissions.data.securityVersion !== found.data.securityVersion) { showPermissionError('Quyền vừa thay đổi. Hãy tải lại tài khoản.'); return; }
    adminState.permissionUser = permissions.data;
    renderPermissionUser(permissions.data);
}

function renderPermissionUser(user) {
    clearPermissionError();
    setTextContent('admin-permission-identity', `${user.displayName} · ${user.email}`);
    setTextContent('admin-permission-current', `Quyền hệ thống hiện tại: ${user.systemRole === 'admin' ? 'Admin' : 'Người dùng'} · ${user.isActive ? 'Đang hoạt động' : 'Đã khóa'} · phiên bản ${user.securityVersion}`);
    const roleSelect = ae('admin-permission-role'); roleSelect.replaceChildren();
    (adminState.roleCatalog?.systemRoles || []).forEach(role => adminOption(roleSelect, role.code, role.label));
    roleSelect.value = user.systemRole;
    const projects = ae('admin-permission-projects'); projects.replaceChildren();
    if (!user.projects.length) projects.append(adminText('p', 'Tài khoản chưa tham gia dự án nào.', 'text-sm text-slate-500'));
    user.projects.forEach(project => {
        const card = document.createElement('article'); card.className = 'border rounded-lg p-3 flex flex-wrap justify-between gap-3 items-center';
        const info = document.createElement('div'); info.append(adminText('p', project.name, 'font-medium'), adminText('p', `${project.role} · ${project.permissions.length} quyền · phạm vi dịch: ${project.translationEditScope}`, 'text-sm text-slate-500'));
        const button = actionButton('Quản lý vai trò dự án', () => openAdminMembers({ id: project.projectId, name: project.name }));
        card.append(info, button); projects.append(card);
    });
    showElement('admin-permission-user');
}

async function grantAdminSystemRole(event) {
    event.preventDefault(); clearPermissionError();
    const user = adminState.permissionUser, role = ae('admin-permission-role').value;
    if (!user || !['admin', 'user'].includes(role)) { showPermissionError('Tìm lại tài khoản trước khi lưu quyền.'); return; }
    if (role === user.systemRole) { showToast('Tài khoản đã có quyền này.', 'success'); return; }
    ae('admin-permission-save').disabled = true;
    const result = await apiPut(apiEndpoint('adminUsers') + `/${user.userId}/role`, { role, expectedVersion: user.securityVersion });
    ae('admin-permission-save').disabled = false;
    if (!result.success) { if (result.status === 401 || result.status === 403) denyAdmin(); else showPermissionError(result.message); return; }
    adminState.permissionUser = null;
    showToast('Đã cập nhật quyền hệ thống và ghi nhật ký.', 'success');
    await findAdminPermissionUser();
    if (user.userId === adminState.me?.userId && role !== 'admin') await initializeAdmin();
}

function createAdminUser() {
    const form = document.createElement('form'); form.className = 'space-y-4';
    const email = modalField(form, 'admin-create-email', 'Email đăng nhập', '', 'email'); email.required = true; email.maxLength = 190; email.autocomplete = 'email';
    const name = modalField(form, 'admin-create-name', 'Tên hiển thị'); name.required = true; name.minLength = 2; name.maxLength = 120;
    const password = modalField(form, 'admin-create-password', 'Mật khẩu tạm thời (ít nhất 12 ký tự)', '', 'password'); password.required = true; password.minLength = 12; password.maxLength = 200; password.autocomplete = 'new-password';
    const role = modalField(form, 'admin-create-role', 'Quyền hệ thống', '', 'select'); adminOption(role, 'user', 'Người dùng'); adminOption(role, 'admin', 'Admin hệ thống');
    form.append(adminText('p', 'Mật khẩu được băm trước khi lưu. Chia mật khẩu ban đầu an toàn trực tiếp cho người nhận.', 'text-sm text-amber-700'));
    const error = modalError('admin-create-user-error'); form.append(error);
    form.addEventListener('submit', event => { event.preventDefault(); ae('modal-confirm-btn').click(); });
    openModal('Tạo tài khoản', form, async () => {
        if (!form.reportValidity()) return;
        setModalBusy(true);
        const result = await apiPost(apiEndpoint('adminUsers'), { email: email.value.trim(), displayName: name.value.trim(), password: password.value, systemRole: role.value });
        setModalBusy(false); password.value = '';
        if (!result.success) { adminModalFailure(result, error); return; }
        closeModal(); showToast('Đã tạo tài khoản và ghi nhật ký.', 'success');
        if (adminState.tab === 'users') await loadAdminTab();
        else { await selectAdminTab('users'); ae('admin-users-q').value = email.value.trim(); await loadAdminTab(); }
    }, { confirmText: 'Tạo tài khoản' });
}

function renderAdminUsers(rows) {
    const body = ae('admin-users-body'); body.replaceChildren();
    rows.forEach(user => {
        const tr = document.createElement('tr'), name = document.createElement('div');
        name.append(adminText('p', user.displayName + (user.id === adminState.me.userId ? ' (bạn)' : ''), 'font-medium text-slate-900'), adminText('p', user.email, 'text-xs text-slate-500 mt-1'));
        appendCell(tr, name); appendCell(tr, adminText('span', user.systemRole === 'admin' ? 'Admin' : 'Người dùng', user.systemRole === 'admin' ? 'admin-role-pill' : 'text-slate-500'));
        appendCell(tr, adminText('span', user.isActive ? 'Hoạt động' : 'Đã khóa', user.isActive ? 'text-green-700' : 'text-red-700'));
        appendCell(tr, user.projectCount + ' dự án · ' + adminTime(user.createdAt)); appendCell(tr, actionButton('Sửa quyền / Trạng thái', () => editAdminUser(user))); body.append(tr);
    });
}
function adminModalFailure(result, error) {
    if (result.status === 401 || result.status === 403) { closeModal(); denyAdmin(); return; }
    error.textContent = result.message; error.classList.remove('hidden');
}
function editAdminUser(user) {
    const form = document.createElement('form'); form.className = 'space-y-4';
    form.append(adminText('p', user.email, 'font-medium text-slate-700'));
    const name = modalField(form, 'admin-edit-name', 'Tên hiển thị', user.displayName); name.required = true; name.minLength = 2; name.maxLength = 120;
    const role = modalField(form, 'admin-edit-role', 'Quyền hệ thống', '', 'select'); adminOption(role, 'user', 'Người dùng'); adminOption(role, 'admin', 'Admin hệ thống'); role.value = user.systemRole;
    const status = modalField(form, 'admin-edit-status', 'Trạng thái', '', 'select'); adminOption(status, 'active', 'Hoạt động'); adminOption(status, 'locked', 'Khóa tài khoản'); status.value = user.isActive ? 'active' : 'locked';
    form.append(adminText('p', 'Thay đổi quyền hoặc khóa tài khoản có hiệu lực từ request tiếp theo. Tài khoản phải còn ít nhất một Admin và mỗi dự án còn một Manager đang hoạt động.', 'text-sm text-amber-700'));
    const error = modalError('admin-user-error'); form.append(error);
    const reload = actionButton('Đóng và tải lại dữ liệu mới nhất', () => { closeModal(); loadAdminTab(); }); form.append(reload);
    form.addEventListener('submit', event => { event.preventDefault(); ae('modal-confirm-btn').click(); });
    openModal('Cập nhật tài khoản', form, async () => {
        if (!form.reportValidity()) return;
        setModalBusy(true);
        const result = await apiPut(apiEndpoint('adminUsers') + '/' + user.id, { displayName: name.value.trim(), systemRole: role.value, isActive: status.value === 'active', expectedVersion: user.securityVersion });
        setModalBusy(false);
        if (!result.success) { adminModalFailure(result, error); return; }
        closeModal(); showToast('Đã cập nhật tài khoản.', 'success');
        if (user.id === adminState.me.userId) await initializeAdmin(); else await loadAdminTab();
    }, { confirmText: 'Lưu quyền và trạng thái' });
}
function renderAdminProjects(rows) {
    const body = ae('admin-projects-body'); body.replaceChildren();
    rows.forEach(project => {
        const tr = document.createElement('tr'), name = document.createElement('div'); name.append(adminText('p', project.name, 'font-medium text-slate-900'), adminText('p', project.slug, 'font-mono text-xs mt-1'));
        appendCell(tr, name); appendCell(tr, (project.createdByName || '--') + ' · ' + project.sourceLocaleCode);
        appendCell(tr, `${project.memberCount} thành viên · ${project.stringCount} khóa · ${project.releaseCount} phát hành`);
        const actions = document.createElement('div'); actions.className = 'flex flex-wrap gap-3';
        actions.append(actionButton('Thành viên', () => openAdminMembers(project)), actionButton('Sửa', () => editAdminProject(project)), actionButton('Xóa', () => deleteAdminProject(project), true)); appendCell(tr, actions); body.append(tr);
    });
}
function editAdminProject(project) {
    const form = document.createElement('form'); form.className = 'space-y-4';
    const name = modalField(form, 'admin-project-name', 'Tên dự án', project.name); name.required = true; name.minLength = 2; name.maxLength = 160;
    const slug = modalField(form, 'admin-project-slug', 'Slug', project.slug); slug.required = true; slug.maxLength = 160; slug.pattern = '[a-z0-9]+(-[a-z0-9]+)*';
    const error = modalError('admin-project-error'); form.append(error);
    form.addEventListener('submit', event => { event.preventDefault(); ae('modal-confirm-btn').click(); });
    openModal('Sửa dự án', form, async () => {
        if (!form.reportValidity()) return;
        setModalBusy(true); const result = await apiPut(apiEndpoint('adminProjects') + '/' + project.id, { name: name.value.trim(), slug: slug.value.trim() }); setModalBusy(false);
        if (result.success) { closeModal(); showToast('Đã cập nhật dự án.', 'success'); await loadAdminTab(); } else adminModalFailure(result, error);
    }, { confirmText: 'Lưu dự án' });
}
function deleteAdminProject(project) {
    const form = document.createElement('form'); form.className = 'space-y-4';
    form.append(adminText('p', `Xóa dự án "${project.name}" sẽ xóa thành viên, nguồn, bản dịch và bản phát hành trong database.`, 'text-sm text-red-700'));
    const input = modalField(form, 'admin-delete-slug', 'Nhập slug để xác nhận: ' + project.slug); input.required = true;
    const error = modalError('admin-delete-error'); form.append(error);
    openModal('Xóa dự án', form, async () => {
        if (input.value !== project.slug) { error.textContent = 'Nhập đúng slug dự án để xác nhận.'; error.classList.remove('hidden'); return; }
        setModalBusy(true); const result = await apiDelete(apiEndpoint('adminProjects') + '/' + project.id); setModalBusy(false);
        if (result.success) { closeModal(); showToast('Đã xóa dự án và ghi nhật ký.', 'success'); await loadAdminTab(); } else adminModalFailure(result, error);
    }, { confirmText: 'Xóa dự án', danger: true });
}
async function openAdminMembers(project) {
    const request = ++adminState.detail, route = apiEndpoint('adminProjects') + '/' + project.id + '/members';
    const result = await apiGet(route); if (request !== adminState.detail) return;
    const members = result.success ? apiCollection(result.data) : null;
    if (!members) { if (result.status === 401 || result.status === 403) denyAdmin(); else adminError(result.message || 'Không tải được thành viên.'); return; }
    const content = document.createElement('div'); content.className = 'space-y-5';
    content.append(adminText('p', project.name, 'font-medium'), adminText('p', 'Vai trò được cấp trong dự án này. Dự án luôn phải còn một Manager đang hoạt động.', 'text-sm text-slate-500'));
    const error = modalError('admin-member-error');
    const change = async (method, path, body) => {
        setModalBusy(true); const changed = method === 'DELETE' ? await apiDelete(path) : method === 'POST' ? await apiPost(path, body) : await apiPut(path, body); setModalBusy(false);
        if (!changed.success) { adminModalFailure(changed, error); return; }
        closeModal(); await openAdminMembers(project);
    };
    members.forEach(member => {
        const row = document.createElement('div'); row.className = 'border-b pb-4 space-y-2';
        row.append(adminText('p', member.displayName + ' · ' + member.email + (member.isActive ? '' : ' · Đã khóa'), 'text-sm'));
        const select = document.createElement('select'); select.className = 'workflow-input'; select.setAttribute('aria-label', 'Vai trò của ' + member.email);
        ['manager', 'translator', 'reviewer'].forEach(role => adminOption(select, role, role)); select.value = member.role;
        const actions = document.createElement('div'); actions.className = 'flex gap-4'; actions.append(actionButton('Lưu vai trò', () => change('PUT', route + '/' + member.userId, { role: select.value })), actionButton('Gỡ thành viên', () => change('DELETE', route + '/' + member.userId), true)); row.append(select, actions); content.append(row);
    });
    const form = document.createElement('form'); form.className = 'space-y-3';
    const email = modalField(form, 'admin-member-email', 'Thêm thành viên bằng email', '', 'email'); email.required = true; email.maxLength = 190;
    const role = modalField(form, 'admin-member-role', 'Vai trò trong dự án', '', 'select'); ['translator', 'reviewer', 'manager'].forEach(value => adminOption(role, value, value));
    const add = adminText('button', 'Thêm thành viên', 'workflow-primary'); add.type = 'submit'; form.append(add);
    form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) change('POST', route, { email: email.value.trim(), role: role.value }); });
    content.append(form, error); openModal('Thành viên dự án', content, async () => { closeModal(); await loadAdminTab(); }, { confirmText: 'Đóng' });
}
function renderAdminAudit(rows) {
    const list = ae('admin-audit-list'); list.replaceChildren();
    const labels = { 'admin.bootstrapped': 'Khởi tạo Admin', 'user.updated': 'Cập nhật tài khoản', 'project.updated': 'Sửa dự án', 'project.deleted': 'Xóa dự án', 'project.member_added': 'Thêm thành viên', 'project.member_updated': 'Đổi vai trò dự án', 'project.member_removed': 'Gỡ thành viên' };
    rows.forEach(item => {
        const card = document.createElement('article'); card.className = 'workflow-card space-y-2';
        card.append(adminText('p', (labels[item.action] || item.action) + ' · ' + item.targetType + ' #' + (item.targetId ?? '--'), 'font-medium'), adminText('p', (item.actorName || 'Admin') + ' · ' + (item.actorEmail || '') + ' · ' + adminTime(item.createdAt), 'text-xs text-slate-500'));
        const details = document.createElement('details'); details.append(adminText('summary', 'Xem chi tiết', 'cursor-pointer text-indigo-600 text-sm'));
        let summary = item.summary; try { summary = JSON.stringify(JSON.parse(summary), null, 2); } catch (_) {}
        details.append(adminText('pre', summary, 'text-xs whitespace-pre-wrap break-all mt-3')); card.append(details); list.append(card);
    });
}
