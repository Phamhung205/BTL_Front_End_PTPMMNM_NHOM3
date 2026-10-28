/** Danh sách, tạo, sửa, xóa và chi tiết dự án. */
let allProjects = null;
let projectListLoading = false;
let currentProject = null;
let detailLoading = false;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('project-list-container')) {
        loadProjectList();
        document.getElementById('project-search').addEventListener('input', filterProjects);
    }
    const form = document.getElementById('create-project-form');
    if (form) {
        form.addEventListener('submit', handleCreateProject);
        setupSlugGeneration();
        document.getElementById('project-add-member')?.addEventListener('click', addInitialProjectMember);
        const source = document.getElementById('project-source-locale');
        const updateTargets = () => document.querySelectorAll('[name="targetLocales"]').forEach(input => {
            input.disabled = input.value === source.value.trim().toLowerCase();
            if (input.disabled) input.checked = false;
        });
        source.addEventListener('input', updateTargets); updateTargets();
        const button = document.getElementById('create-project-btn');
        button.disabled = true;
        button.textContent = 'Đang kiểm tra phiên...';
        apiGet(apiEndpoint('projects')).then(result => {
            button.disabled = !result.success;
            button.textContent = 'Tạo dự án';
            if (!result.success) {
                showElement('create-project-error');
                document.querySelector('#create-project-error .error-message').textContent = result.message;
            }
        });
    }
    if (document.getElementById('project-detail-container')) {
        setupDetailTabs();
        loadProjectDetail();
    }
});
async function loadProjectList() {
    if (projectListLoading) return;
    projectListLoading = true;
    allProjects = null;
    collectionState('project-list', 'loading');
    const result = await apiGet(apiEndpoint('projects'));
    projectListLoading = false;
    const projects = result.success ? apiCollection(result.data) : null;
    if (!result.success || !projects) {
        collectionState('project-list', 'error', result.message || 'Dữ liệu dự án không đúng định dạng.');
        return;
    }
    allProjects = projects;
    filterProjects();
}
function addInitialProjectMember() {
    const container = document.getElementById('project-initial-members');
    if (container.children.length >= 100) return;
    const row = document.createElement('div'); row.className = 'flex flex-wrap gap-2 items-center'; row.dataset.initialMember = 'true';
    const email = document.createElement('input'); email.type = 'email'; email.required = true; email.maxLength = 190; email.placeholder = 'Email đã đăng ký'; email.setAttribute('aria-label', 'Email thành viên'); email.className = 'flex-1 min-w-0 px-3 py-2 border rounded-lg';
    const role = document.createElement('select'); role.setAttribute('aria-label', 'Vai trò thành viên'); role.className = 'px-3 py-2 border rounded-lg';
    for (const [value, label] of [['translator', 'Translator · Người dịch'], ['reviewer', 'Reviewer · Người duyệt'], ['manager', 'Manager · Quản lý']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = label; role.append(option);
    }
    row.append(email, role, actionButton('Bỏ', () => row.remove(), true)); container.append(row); email.focus();
}
function filterProjects() {
    if (!Array.isArray(allProjects)) return;
    const query = document.getElementById('project-search').value.trim().toLocaleLowerCase('vi');
    const projects = allProjects.filter(project => [project.name || project.projectName, project.slug, project.sourceLocaleCode]
        .some(value => String(value || '').toLocaleLowerCase('vi').includes(query)));
    const empty = document.getElementById('project-list-empty');
    empty.querySelector('h3').textContent = query ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án nào';
    empty.querySelector('p').textContent = query ? 'Thử từ khóa khác hoặc xóa nội dung tìm kiếm.' : 'Bắt đầu bằng cách tạo dự án đầu tiên.';
    renderProjectRows(document.getElementById('project-list-body'), projects, true);
    collectionState('project-list', projects.length ? 'table' : 'empty');
}
function generateSlug(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function setupSlugGeneration() {
    const name = document.getElementById('project-name');
    const slug = document.getElementById('project-slug');
    name.addEventListener('input', () => { if (!slug.dataset.manual) slug.value = generateSlug(name.value); });
    slug.addEventListener('input', () => { if (slug.value) slug.dataset.manual = 'true'; else delete slug.dataset.manual; });
}
async function handleCreateProject(event) {
    event.preventDefault();
    const button = document.getElementById('create-project-btn');
    if (button.disabled) return;
    hideElement('create-project-error');
    hideElement('name-error');
    hideElement('slug-error');
    const name = document.getElementById('project-name').value.trim();
    const slug = document.getElementById('project-slug').value.trim();
    const sourceLocaleCode = document.getElementById('project-source-locale')?.value.trim() || '';
    if (!event.currentTarget.reportValidity()) return;
    const targetLocaleCodes = [...document.querySelectorAll('[name="targetLocales"]:checked')].map(input => input.value)
        .concat((document.getElementById('project-extra-locales')?.value || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
    const members = [...document.querySelectorAll('[data-initial-member]')].map(row => ({ email: row.querySelector('input').value.trim(), role: row.querySelector('select').value }));
    if (targetLocaleCodes.length > 20 || new Set(targetLocaleCodes).size !== targetLocaleCodes.length || targetLocaleCodes.includes(sourceLocaleCode.toLowerCase()) || targetLocaleCodes.some(code => code.length > 20 || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code))) {
        showElement('create-project-error'); document.querySelector('#create-project-error .error-message').textContent = 'Chọn tối đa 20 ngôn ngữ đích hợp lệ, không lặp và khác ngôn ngữ nguồn.'; return;
    }
    const validName = name.length >= 2 && name.length <= 160;
    if (!validName) { setTextContent('name-error', 'Tên dự án cần từ 2 đến 160 ký tự.'); showElement('name-error'); }
    const validSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
    if (!validSlug) { setTextContent('slug-error', 'Slug chỉ chứa chữ thường, số và dấu gạch ngang giữa các từ.'); showElement('slug-error'); }
    if (!validName || !validSlug) return;
    if (sourceLocaleCode.length < 2 || sourceLocaleCode.length > 20) {
        showElement('create-project-error');
        document.querySelector('#create-project-error .error-message').textContent = 'Mã ngôn ngữ nguồn cần từ 2 đến 20 ký tự.';
        return;
    }
    button.disabled = true;
    button.textContent = 'Đang tạo...';
    const result = await apiPost(apiEndpoint('projects'), { name, slug, sourceLocaleCode, targetLocaleCodes, members });
    if (result.success) {
        showToast('Tạo dự án thành công!', 'success');
        const project = result.data?.data || result.data;
        const id = project?.id ?? project?.projectId;
        setTimeout(() => location.assign(id ? 'detail.php?id=' + encodeURIComponent(id) : 'index.php'), 500);
    } else {
        showElement('create-project-error');
        document.querySelector('#create-project-error .error-message').textContent = result.message;
        button.disabled = false;
        button.textContent = 'Tạo dự án';
    }
}
async function loadProjectDetail() {
    if (detailLoading) return;
    detailLoading = true;
    currentProject = null;
    window.__currentProjectId = null;
    collectionState('project-detail', 'loading');
    hideElement('project-detail-content');
    const projectId = new URLSearchParams(location.search).get('id');
    if (!projectId) {
        detailLoading = false;
        collectionState('project-detail', 'error', 'Không tìm thấy ID dự án.');
        return;
    }
    // Tận dụng API danh sách đã được yêu cầu; không tự giả định GET /projects/{id} tồn tại.
    const result = await apiGet(apiEndpoint('projects'));
    detailLoading = false;
    const projects = result.success ? apiCollection(result.data) : null;
    const project = projects?.find(item => String(item.id ?? item.projectId) === projectId);
    if (!result.success || !projects || !project) {
        collectionState('project-detail', 'error', result.message || (projects ? 'Không tìm thấy dự án trong danh sách được phép xem.' : 'Dữ liệu dự án không đúng định dạng.'));
        return;
    }
    hideElement('project-detail-loading');
    showElement('project-detail-content');
    currentProject = project;
    window.__currentProjectId = projectId;
    document.querySelectorAll('[data-project-module]').forEach(link => {
        link.href = getBaseUrl() + 'pages/' + link.dataset.projectModule + '/index.php?project_id=' + encodeURIComponent(projectId);
    });
    const name = project.name || project.projectName || '--';
    const description = 'Ngôn ngữ nguồn: ' + (project.sourceLocaleCode || '--');
    ['detail-project-name', 'overview-name'].forEach(id => setTextContent(id, name));
    ['detail-project-slug', 'overview-slug'].forEach(id => setTextContent(id, project.slug || '--'));
    ['detail-project-description', 'overview-description'].forEach(id => setTextContent(id, description));
    setTextContent('detail-project-date', formatDate(project.createdAt || project.created_at));
    const role = projectRole(project);
    document.getElementById('detail-project-role').replaceWith(Object.assign(roleBadge(role), { id: 'detail-project-role' }));
    const manage = canEditProject(project);
    document.getElementById('add-member-btn').classList.toggle('hidden', !manage);
    document.getElementById('edit-project-btn').classList.toggle('hidden', !canEditProject(project));
    document.getElementById('delete-project-btn').classList.toggle('hidden', !canDeleteProject(project));
    setTextContent('project-permission-note', manage
        ? 'Manager: sửa/xóa dự án, thêm thành viên, đổi vai trò và xóa thành viên. Dự án luôn cần ít nhất một Manager.'
        : role ? 'Bạn có thể xem dự án và thành viên. Các thao tác quản lý dành cho Manager.'
            : 'API chưa cung cấp vai trò của bạn. Các thao tác quản lý chưa được mở.');
    const membersLink = document.getElementById('sidebar-members-link');
    if (membersLink) membersLink.href = getBaseUrl() + 'pages/members/index.php?project_id=' + encodeURIComponent(projectId);
    activateDetailTab(location.hash === '#members' ? 'members' : 'overview');
}
function activateDetailTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === tab;
        button.classList.toggle('border-indigo-500', active);
        button.classList.toggle('text-indigo-600', active);
        button.classList.toggle('border-transparent', !active);
        button.classList.toggle('text-gray-500', !active);
        button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-tab-content]').forEach(content => content.classList.toggle('hidden', content.dataset.tabContent !== tab));
    if (tab === 'members' && window.__currentProjectId) loadProjectMembers(window.__currentProjectId);
}
function setupDetailTabs() {
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.addEventListener('click', () => {
            history.replaceState(null, '', '#' + button.dataset.tab);
            activateDetailTab(button.dataset.tab);
        });
    });
    window.addEventListener('hashchange', () => activateDetailTab(location.hash === '#members' ? 'members' : 'overview'));
}
function openEditProjectModal() {
    if (!window.__currentProjectId || !canEditProject(currentProject)) {
        showToast('Bạn không có quyền sửa dự án.', 'error');
        return;
    }
    const projectId = window.__currentProjectId;
    const form = document.createElement('form');
    form.className = 'space-y-4';
    form.noValidate = true;
    const name = modalField(form, 'edit-project-name', 'Tên dự án *', currentProject.name || currentProject.projectName || '');
    const slug = modalField(form, 'edit-project-slug', 'Slug *', currentProject.slug || '');
    name.required = slug.required = true;
    const hint = document.createElement('p');
    hint.className = 'text-xs text-gray-500';
    hint.textContent = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang giữa các từ.';
    const error = modalError('edit-project-error');
    form.append(hint, error);
    const submit = async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;
        error.classList.add('hidden');
        const validName = name.value.trim().length >= 2 && name.value.trim().length <= 160;
        if (!validName || slug.value.trim().length > 160 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.value.trim())) {
            error.textContent = !validName ? 'Tên dự án cần từ 2 đến 160 ký tự.' : 'Slug không hợp lệ. Chỉ dùng chữ thường, số và dấu gạch ngang giữa các từ (tối đa 160 ký tự).';
            error.classList.remove('hidden');
            (!validName ? name : slug).focus();
            return;
        }
        setModalBusy(true);
        const result = await apiPut(apiEndpoint('project', projectId), { name: name.value.trim(), slug: slug.value.trim() });
        setModalBusy(false);
        if (result.success) {
            closeModal();
            showToast('Cập nhật dự án thành công!', 'success');
            await loadProjectDetail();
        } else {
            error.textContent = result.message;
            error.classList.remove('hidden');
        }
    };
    form.addEventListener('submit', event => { event.preventDefault(); submit(); });
    openModal('Sửa dự án', form, submit, { confirmText: 'Lưu thay đổi', busyText: 'Đang lưu...' });
}
function openDeleteProjectModal() {
    if (!window.__currentProjectId || !canDeleteProject(currentProject)) {
        showToast('Bạn không có quyền xóa dự án.', 'error');
        return;
    }
    const projectId = window.__currentProjectId;
    const content = document.createElement('div');
    content.className = 'space-y-4';
    const message = document.createElement('p');
    message.textContent = 'Xóa dự án “' + (currentProject.name || currentProject.projectName || '') + '”? Dữ liệu dự án và danh sách thành viên sẽ bị xóa. Thao tác này không thể hoàn tác.';
    const error = modalError('delete-project-error');
    content.append(message, error);
    openModal('Xóa dự án', content, async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;
        error.classList.add('hidden');
        setModalBusy(true);
        const result = await apiDelete(apiEndpoint('project', projectId));
        setModalBusy(false);
        if (result.success) {
            closeModal();
            location.assign('index.php');
        } else {
            error.textContent = result.message;
            error.classList.remove('hidden');
        }
    }, { confirmText: 'Xóa dự án', busyText: 'Đang xóa...', danger: true });
}
