/** Thành viên; role trên giao diện chỉ phục vụ UX. Backend phải kiểm tra lại khi tích hợp. */
let membersLoading = false;
async function loadProjectMembers(projectId) {
    if (membersLoading) return;
    membersLoading = true;
    collectionState('members', 'loading');
    const result = await apiGet(apiEndpoint('members', projectId));
    membersLoading = false;
    const members = result.success ? apiCollection(result.data) : null;
    if (!result.success || !members) {
        collectionState('members', 'error', result.message || 'Dữ liệu thành viên không đúng định dạng.');
        return;
    }
    const body = document.getElementById('members-body');
    body.replaceChildren();
    members.forEach(member => {
        const row = document.createElement('tr');
        const name = String(member.displayName || member.fullName || member.name || member.userName || member.user?.fullName || 'Người dùng');
        const profile = document.createElement('div');
        profile.className = 'flex items-center gap-3';
        const avatar = document.createElement('span');
        avatar.className = 'flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex-shrink-0';
        avatar.textContent = name.charAt(0).toUpperCase();
        const label = document.createElement('span');
        label.textContent = name;
        profile.append(avatar, label);
        appendCell(row, profile);
        appendCell(row, member.email || member.user?.email || '--');
        const role = memberRole(member);
        appendCell(row, roleBadge(role));
        appendCell(row, formatDate(member.joinedAt || member.joined_at || member.createdAt));
        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-4';
        if (canManageMember(currentProject, member)) {
            actions.append(actionButton('Đổi vai trò', () => openEditMemberModal(member)),
                actionButton('Xóa thành viên', () => openRemoveMemberModal(member), true));
        } else {
            actions.textContent = '—';
        }
        appendCell(row, actions);
        body.append(row);
    });
    collectionState('members', members.length ? 'table' : 'empty');
}
function openAddMemberModal() {
    if (!window.__currentProjectId || !canEditProject(currentProject)) {
        showToast('Bạn không có quyền thực hiện chức năng này.', 'error');
        return;
    }
    const form = document.createElement('form');
    form.id = 'add-member-form';
    form.className = 'space-y-4';
    form.noValidate = true;
    const emailLabel = document.createElement('label');
    emailLabel.textContent = 'Email thành viên';
    emailLabel.htmlFor = 'member-email';
    emailLabel.className = 'block text-sm font-medium text-gray-700';
    const email = document.createElement('input');
    email.type = 'email';
    email.id = 'member-email';
    email.autocomplete = 'email';
    email.required = true;
    email.placeholder = 'member@example.com';
    email.className = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg';
    const roleLabel = document.createElement('label');
    roleLabel.textContent = 'Vai trò';
    roleLabel.htmlFor = 'member-role';
    roleLabel.className = emailLabel.className;
    const roles = document.createElement('select');
    roles.id = 'member-role';
    roles.className = email.className;
    assignableMemberRoles(currentProject).forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
        roles.append(option);
    });
    const error = document.createElement('p');
    error.id = 'add-member-error';
    error.className = 'hidden text-sm text-red-600';
    error.setAttribute('role', 'alert');
    form.append(emailLabel, email, roleLabel, roles, error);
    form.addEventListener('submit', event => { event.preventDefault(); handleAddMember(); });
    openModal('Thêm thành viên', form, handleAddMember, { confirmText: 'Thêm thành viên', busyText: 'Đang thêm...' });
}
async function handleAddMember() {
    const button = document.getElementById('modal-confirm-btn');
    if (button.disabled) return;
    hideElement('add-member-error');
    const emailInput = document.getElementById('member-email');
    const email = emailInput.value.trim();
    const role = document.getElementById('member-role').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setTextContent('add-member-error', 'Vui lòng nhập email hợp lệ.');
        showElement('add-member-error');
        emailInput.focus();
        return;
    }
    if (!assignableMemberRoles(currentProject).includes(role) || !window.__currentProjectId) {
        setTextContent('add-member-error', 'Không xác định được dự án hoặc vai trò.');
        showElement('add-member-error');
        return;
    }
    setModalBusy(true);
    const result = await apiPost(apiEndpoint('members', window.__currentProjectId), { email, role });
    setModalBusy(false);
    if (result.success) {
        closeModal();
        showToast('Thêm thành viên thành công!', 'success');
        await loadProjectMembers(window.__currentProjectId);
    } else {
        setTextContent('add-member-error', result.message);
        showElement('add-member-error');
    }
}
function openEditMemberModal(member) {
    if (!window.__currentProjectId || !canManageMember(currentProject, member)) {
        showToast('Bạn không có quyền thay đổi thành viên này.', 'error');
        return;
    }
    const projectId = window.__currentProjectId;
    const form = document.createElement('form');
    form.className = 'space-y-4';
    const label = document.createElement('p');
    label.textContent = member.email || member.user?.email || member.fullName || 'Thành viên';
    form.append(label);
    const select = modalField(form, 'edit-member-role', 'Vai trò', '', 'select');
    assignableMemberRoles(currentProject).forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        select.append(option);
    });
    select.value = memberRole(member);
    const error = modalError('edit-member-error');
    form.append(error);
    const submit = async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;
        error.classList.add('hidden');
        if (!assignableMemberRoles(currentProject).includes(select.value)) {
            error.textContent = 'Vai trò không hợp lệ.';
            error.classList.remove('hidden');
            return;
        }
        setModalBusy(true);
        const result = await apiPut(apiEndpoint('member', projectId, memberUserId(member)), { role: select.value });
        setModalBusy(false);
        if (result.success) {
            closeModal();
            showToast('Cập nhật vai trò thành công!', 'success');
            await loadProjectDetail();
        } else {
            error.textContent = result.message;
            error.classList.remove('hidden');
        }
    };
    form.addEventListener('submit', event => { event.preventDefault(); submit(); });
    openModal('Đổi vai trò thành viên', form, submit, { confirmText: 'Lưu vai trò', busyText: 'Đang lưu...' });
}
function openRemoveMemberModal(member) {
    if (!window.__currentProjectId || !canManageMember(currentProject, member)) {
        showToast('Bạn không có quyền xóa thành viên này.', 'error');
        return;
    }
    const projectId = window.__currentProjectId;
    const content = document.createElement('div');
    content.className = 'space-y-4';
    const message = document.createElement('p');
    message.textContent = 'Xóa “' + (member.email || member.user?.email || member.fullName || 'Thành viên') + '” khỏi dự án? Người này sẽ mất quyền truy cập dự án.';
    const error = modalError('remove-member-error');
    content.append(message, error);
    openModal('Xóa thành viên', content, async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;
        error.classList.add('hidden');
        setModalBusy(true);
        const result = await apiDelete(apiEndpoint('member', projectId, memberUserId(member)));
        setModalBusy(false);
        if (result.success) {
            closeModal();
            showToast('Đã xóa thành viên khỏi dự án.', 'success');
            let self = false;
            try { self = String(JSON.parse(sessionStorage.getItem('user_display') || '{}').id) === String(memberUserId(member)); } catch (_) {}
            if (APP_CONFIG.mode === 'api' && self) location.assign('index.php');
            else await loadProjectDetail();
        } else {
            error.textContent = result.message;
            error.classList.remove('hidden');
        }
    }, { confirmText: 'Xóa thành viên', busyText: 'Đang xóa...', danger: true });
}
