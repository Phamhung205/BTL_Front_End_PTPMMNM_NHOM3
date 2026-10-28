/** UI chung; dữ liệu nhập và dữ liệu API chỉ được render bằng textContent. */
function showElement(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideElement(id) { document.getElementById(id)?.classList.add('hidden'); }
function setTextContent(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const open = sidebar?.classList.contains('-translate-x-full');
    sidebar?.classList.toggle('-translate-x-full', !open);
    document.getElementById('sidebar-overlay')?.classList.toggle('hidden', !open);
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', String(Boolean(open)));
    updateSidebarAccessibility();
}
function updateSidebarAccessibility() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.inert = window.innerWidth < 1024 && sidebar.classList.contains('-translate-x-full');
}
window.addEventListener('resize', updateSidebarAccessibility);
function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    menu?.classList.toggle('hidden');
    document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', String(!menu?.classList.contains('hidden')));
}
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
    toast.className = 'toast flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ' + (colors[type] || colors.info);
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const text = document.createElement('span');
    text.textContent = message;
    text.className = 'text-sm font-medium flex-1';
    const close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', 'Đóng thông báo');
    close.addEventListener('click', () => toast.remove());
    toast.append(text, close);
    container.append(toast);
    setTimeout(() => toast.remove(), 5000);
}
let modalFocus = null;
let modalBusy = false;
function openModal(title, content, onConfirm, options = {}) {
    modalFocus = document.activeElement;
    setTextContent('modal-title', title);
    document.getElementById('modal-body').replaceChildren(content);
    const button = document.getElementById('modal-confirm-btn');
    button.dataset.confirmText = options.confirmText || 'Xác nhận';
    button.dataset.busyText = options.busyText || 'Đang xử lý...';
    button.textContent = button.dataset.confirmText;
    button.classList.toggle('bg-red-600', Boolean(options.danger));
    button.classList.toggle('hover:bg-red-700', Boolean(options.danger));
    button.classList.toggle('bg-indigo-600', !options.danger);
    button.classList.toggle('hover:bg-indigo-700', !options.danger);
    button.disabled = false;
    button.onclick = onConfirm;
    modalBusy = false;
    showElement('modal-backdrop');
    showElement('modal-container');
    document.body.classList.add('dialog-open');
    (document.querySelector('#modal-body input, #modal-body select, #modal-body textarea') || document.querySelector('#modal-container button'))?.focus();
}
function setModalBusy(busy) {
    modalBusy = busy;
    document.querySelectorAll('#modal-container button, #modal-container input, #modal-container select, #modal-container textarea').forEach(el => { el.disabled = busy; });
    const button = document.getElementById('modal-confirm-btn');
    button.textContent = busy ? button.dataset.busyText : button.dataset.confirmText;
    document.getElementById('modal-container').setAttribute('aria-busy', String(busy));
}
function closeModal() {
    if (modalBusy) return;
    hideElement('modal-backdrop');
    hideElement('modal-container');
    document.getElementById('modal-body')?.replaceChildren();
    document.body.classList.remove('dialog-open');
    modalFocus?.focus();
}
let confirmCallback = null;
function showConfirmDialog(title, message, callback) {
    modalFocus = document.activeElement;
    setTextContent('confirm-title', title);
    setTextContent('confirm-message', message);
    confirmCallback = callback;
    document.getElementById('confirm-action-btn').onclick = () => {
        const action = confirmCallback;
        closeConfirmDialog();
        if (typeof action === 'function') action();
    };
    showElement('confirm-backdrop');
    showElement('confirm-dialog');
    document.body.classList.add('dialog-open');
    document.querySelector('#confirm-dialog button')?.focus();
}
function closeConfirmDialog() {
    hideElement('confirm-backdrop');
    hideElement('confirm-dialog');
    confirmCallback = null;
    document.body.classList.remove('dialog-open');
    modalFocus?.focus();
}
function formatDate(value) {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : '--';
}
function projectRole(project) {
    const role = project?.role ?? project?.userRole ?? project?.currentUserRole;
    return typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : '';
}
function canEditProject(project) { return projectRole(project) === 'manager'; }
function canDeleteProject(project) { return projectRole(project) === 'manager'; }
function memberRole(member) {
    const role = member?.role ?? member?.projectRole;
    return typeof role === 'string' ? role.trim().toLowerCase() : '';
}
function memberUserId(member) { return member?.userId ?? member?.user?.id ?? member?.id; }
function assignableMemberRoles(project) {
    return projectRole(project) === 'manager' ? ['translator', 'reviewer', 'manager'] : [];
}
function canManageMember(project, member) {
    if (memberUserId(member) == null || memberUserId(member) === '') return false;
    const role = memberRole(member);
    return projectRole(project) === 'manager' && ['manager', 'translator', 'reviewer'].includes(role);
}
function actionButton(label, onClick, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = 'text-sm font-medium whitespace-nowrap ' + (danger ? 'text-red-600 hover:text-red-800' : 'text-indigo-600 hover:text-indigo-800');
    button.addEventListener('click', onClick);
    return button;
}
function modalError(id) {
    const error = document.createElement('p');
    error.id = id;
    error.className = 'hidden text-sm text-red-600';
    error.setAttribute('role', 'alert');
    return error;
}
function modalField(form, id, label, value = '', type = 'text') {
    const wrapper = document.createElement('div');
    const caption = document.createElement('label');
    caption.htmlFor = id;
    caption.textContent = label;
    caption.className = 'block text-sm font-medium text-gray-700 mb-1';
    const input = document.createElement(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    input.id = id;
    if (input.tagName === 'INPUT') input.type = type;
    if (type === 'textarea') input.rows = 3;
    input.className = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg';
    input.value = value;
    wrapper.append(caption, input);
    form.append(wrapper);
    return input;
}
function roleBadge(role) {
    const badge = document.createElement('span');
    const colors = { manager: 'bg-blue-100 text-blue-700', translator: 'bg-green-100 text-green-700', reviewer: 'bg-yellow-100 text-yellow-700' };
    badge.className = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ' + (colors[role] || 'bg-gray-100 text-gray-700');
    badge.textContent = role || 'Chưa có dữ liệu';
    return badge;
}
function appendCell(row, text, className = 'px-6 py-4 text-sm text-gray-500') {
    const cell = document.createElement('td');
    cell.className = className;
    if (text instanceof Node) cell.append(text);
    else cell.textContent = text ?? '--';
    row.append(cell);
    return cell;
}
function projectLink(project, label) {
    const link = document.createElement('a');
    link.className = 'text-sm font-medium text-indigo-600 hover:text-indigo-800';
    link.href = getBaseUrl() + 'pages/projects/detail.php?id=' + encodeURIComponent(project.id ?? project.projectId ?? '');
    link.textContent = label;
    return link;
}
function renderProjectRows(body, projects, detailed = false) {
    body.replaceChildren();
    projects.forEach((project, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        if (detailed) appendCell(row, index + 1);
        appendCell(row, projectLink(project, project.name || project.projectName || '--'));
        appendCell(row, project.slug || '--', 'px-6 py-4 text-sm text-gray-500 font-mono');
        if (detailed) appendCell(row, project.sourceLocaleCode || '--', 'px-6 py-4 text-sm text-gray-500 project-description');
        appendCell(row, roleBadge(projectRole(project)));
        appendCell(row, formatDate(project.createdAt || project.created_at));
        appendCell(row, projectLink(project, 'Chi tiết'));
        body.append(row);
    });
}
function collectionState(prefix, state, message) {
    ['loading', 'empty', 'error', 'table'].forEach(name => {
        document.getElementById(prefix + '-' + name)?.classList.toggle('hidden', name !== state);
    });
    const error = document.querySelector('#' + prefix + '-error .error-message');
    if (error && message) error.textContent = message;
}
// ===== Đọc và gộp tệp JSON ngôn ngữ (dùng cho nhập nguồn và nhập bản dịch) =====
const LOCALE_JSON_MAX_BYTES = 2 * 1024 * 1024;
// JSON.parse normally discards repeated property names before validation can see them.
function parseLocaleJson(text) {
    const data = JSON.parse(text);
    const stack = [];
    for (const token of text.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|[^\s{}\[\]:,"]+/g) || []) {
        const frame = stack.at(-1);
        if (token === '{' || token === '[') {
            stack.push({ object: token === '{', key: true, names: new Set() });
            if (stack.length > 64) throw new Error('JSON vượt quá độ sâu 64 cấp.');
        } else if (token === '}' || token === ']') stack.pop();
        else if (frame?.object && token === ',') frame.key = true;
        else if (frame?.object && token === ':') frame.key = false;
        else if (frame?.object && frame.key && token.startsWith('"')) {
            const name = JSON.parse(token);
            if (frame.names.has(name)) throw new Error('Khóa JSON bị lặp: ' + name);
            frame.names.add(name);
        }
    }
    return data;
}
async function readLocaleJsonFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) throw new Error('Chưa chọn tệp JSON.');
    if (files.reduce((total, file) => total + file.size, 0) > LOCALE_JSON_MAX_BYTES) throw new Error('Tổng dung lượng các tệp JSON tối đa 2 MB.');
    const documents = [];
    for (const file of files) {
        const text = (await file.text()).replace(/^﻿/, '');
        try { documents.push({ name: file.name, text, data: parseLocaleJson(text) }); }
        catch (error) { throw new Error(file.name + ': ' + (error instanceof SyntaxError ? 'JSON sai cú pháp. Hãy kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép.' : error.message)); }
    }
    return documents;
}
/** Gộp nhiều tệp (ví dụ vi.json + "vi 2.json") thành một bảng khóa phẳng; cùng khóa khác nội dung thì báo lỗi. */
function mergeLocaleJsonDocuments(documents) {
    const values = new Map(), origin = new Map();
    let documentPaths;
    const walk = (node, path, file, depth) => {
        if (depth > 64) throw new Error(file + ': JSON vượt quá độ sâu 64 cấp.');
        if (typeof node === 'string' && path) {
            if (documentPaths.has(path)) throw new Error(file + ': khóa dịch bị trùng đường dẫn: ' + path);
            documentPaths.add(path);
            if (values.has(path) && values.get(path) !== node) throw new Error('Khóa "' + path + '" có nội dung khác nhau trong ' + origin.get(path) + ' và ' + file + '.');
            values.set(path, node); origin.set(path, file); return;
        }
        if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.keys(node).length)
            throw new Error(file + ': chỉ hỗ trợ object lồng nhau với giá trị chuỗi; không dùng mảng, số, null hoặc object rỗng (tại "' + (path || 'gốc') + '").');
        Object.entries(node).forEach(([key, value]) => {
            if (key.split('.').some(segment => !segment || segment !== segment.trim())) throw new Error(file + ': tên khóa "' + key + '" không hợp lệ.');
            const next = path ? path + '.' + key : key;
            if (next.length > 500) throw new Error(file + ': đường dẫn khóa tối đa 500 ký tự.');
            walk(value, next, file, depth + 1);
        });
    };
    documents.forEach(item => { documentPaths = new Set(); walk(item.data, '', item.name, 1); });
    for (const key of values.keys()) {
        for (let dot = key.indexOf('.'); dot !== -1; dot = key.indexOf('.', dot + 1)) {
            if (values.has(key.slice(0, dot))) throw new Error('Khóa "' + key.slice(0, dot) + '" vừa là chuỗi vừa là nhóm của "' + key + '".');
        }
    }
    return values;
}
/** Chuyển bảng khóa phẳng về JSON lồng nhau để người dùng đọc lại trước khi nhập. */
function localeJsonFromMap(values) {
    const root = Object.create(null);
    [...values.keys()].sort().forEach(key => {
        const parts = key.split('.'); let node = root;
        parts.slice(0, -1).forEach(part => { node = node[part] ??= Object.create(null); });
        node[parts.at(-1)] = values.get(key);
    });
    return JSON.stringify(root, null, 2);
}
function loadUserDisplay() {
    let user = {};
    try { user = JSON.parse(sessionStorage.getItem('user_display') || '{}'); } catch (_) {}
    ['navbar-user-name', 'dropdown-user-name'].forEach(id => setTextContent(id, user.name || 'Người dùng'));
    ['navbar-user-email', 'dropdown-user-email'].forEach(id => setTextContent(id, user.email || ''));
    setTextContent('navbar-user-avatar', String(user.name || user.email || 'U').charAt(0).toUpperCase());
}
async function loadSystemAccess() {
    if (APP_CONFIG.mode !== 'api' || !document.querySelector('main') || !apiEndpoint('me') || document.getElementById('admin-workspace')) return;
    const result = await apiGet(apiEndpoint('me'));
    if (!result.success) return;
    document.getElementById('sidebar-admin-link')?.classList.toggle('hidden', result.data?.systemRole !== 'admin');
}
document.addEventListener('click', event => {
    const menu = document.getElementById('user-menu');
    const button = document.getElementById('user-menu-btn');
    if (menu && button && !button.contains(event.target) && !menu.contains(event.target)) {
        menu.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
    }
});
document.addEventListener('keydown', event => {
    const dialog = ['modal-container', 'confirm-dialog'].map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
    if (event.key === 'Escape') {
        if (dialog?.id === 'modal-container') closeModal();
        else if (dialog) closeConfirmDialog();
        hideElement('user-menu');
    }
    if (dialog && event.key === 'Tab') {
        const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
        const first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    updateSidebarAccessibility();
    loadUserDisplay();
    loadSystemAccess();
});
