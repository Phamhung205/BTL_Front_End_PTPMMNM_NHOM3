/**
 * Members Module - Translation Manager
 * Quản lý thành viên dự án
 */

/**
 * Load Project Members
 */
async function loadProjectMembers(projectId) {
    const loadingEl = document.getElementById('members-loading');
    const emptyEl = document.getElementById('members-empty');
    const errorEl = document.getElementById('members-error');
    const tableEl = document.getElementById('members-table');
    const tableBody = document.getElementById('members-body');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (tableEl) tableEl.classList.add('hidden');

    const result = await apiGet('/api/projects/' + encodeURIComponent(projectId) + '/members');

    if (loadingEl) loadingEl.classList.add('hidden');

    if (!result.success) {
        if (errorEl) {
            const errorMsg = errorEl.querySelector('.error-message');
            if (errorMsg) errorMsg.textContent = result.message || 'Không thể tải danh sách thành viên.';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    const members = Array.isArray(result.data) ? result.data : (result.data.data || result.data.items || []);

    if (members.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (tableEl) tableEl.classList.remove('hidden');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    members.forEach(function(member) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        // Avatar + Name
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'flex items-center gap-3';
        
        const avatar = document.createElement('div');
        const memberName = member.fullName || member.name || member.userName || 'N/A';
        avatar.className = 'flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold';
        avatar.textContent = memberName.charAt(0).toUpperCase();
        nameDiv.appendChild(avatar);

        const nameText = document.createElement('span');
        nameText.className = 'text-sm font-medium text-gray-900';
        nameText.textContent = memberName;
        nameDiv.appendChild(nameText);

        nameCell.appendChild(nameDiv);
        row.appendChild(nameCell);

        // Email
        const emailCell = document.createElement('td');
        emailCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        emailCell.textContent = member.email || '--';
        row.appendChild(emailCell);

        // Role
        const roleCell = document.createElement('td');
        roleCell.className = 'px-6 py-4 whitespace-nowrap';
        const roleBadge = document.createElement('span');
        const role = member.role || member.projectRole || '--';
        const roleColors = {
            'owner': 'bg-purple-100 text-purple-700',
            'manager': 'bg-blue-100 text-blue-700',
            'translator': 'bg-green-100 text-green-700',
            'reviewer': 'bg-yellow-100 text-yellow-700'
        };
        roleBadge.className = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ' + (roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-700');
        roleBadge.textContent = role;
        roleCell.appendChild(roleBadge);
        row.appendChild(roleCell);

        // Joined At
        const dateCell = document.createElement('td');
        dateCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        dateCell.textContent = formatMemberDate(member.joinedAt || member.joined_at || member.createdAt || member.created_at || '');
        row.appendChild(dateCell);

        tableBody.appendChild(row);
    });
}

function formatMemberDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch(e) {
        return dateStr;
    }
}

/**
 * Open Add Member Modal
 */
function openAddMemberModal() {
    const html = `
        <form id="add-member-form" class="space-y-4">
            <div>
                <label for="member-email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" id="member-email" 
                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="member@example.com" required>
                <p id="member-email-error" class="hidden mt-1 text-sm text-red-600"></p>
            </div>
            <div>
                <label for="member-role" class="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select id="member-role" 
                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="translator">Translator</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="manager">Manager</option>
                </select>
            </div>
            <div id="add-member-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-lg">
                <span class="text-sm text-red-700 error-message"></span>
            </div>
        </form>
    `;
    // This HTML is safe - it's built by our code, not from user input
    openModal('Thêm thành viên', html, handleAddMember);
}

/**
 * Handle Add Member
 */
async function handleAddMember() {
    const emailInput = document.getElementById('member-email');
    const roleSelect = document.getElementById('member-role');
    const emailError = document.getElementById('member-email-error');
    const formError = document.getElementById('add-member-error');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    const email = emailInput ? emailInput.value.trim() : '';
    const role = roleSelect ? roleSelect.value : 'translator';

    // Validation
    if (!email) {
        if (emailError) { emailError.textContent = 'Vui lòng nhập email.'; emailError.classList.remove('hidden'); }
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (emailError) { emailError.textContent = 'Email không đúng định dạng.'; emailError.classList.remove('hidden'); }
        return;
    }

    if (emailError) emailError.classList.add('hidden');
    if (formError) formError.classList.add('hidden');

    // Loading
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Đang thêm...';
    }

    const projectId = window.__currentProjectId;
    if (!projectId) {
        showToast('Không xác định được dự án.', 'error');
        return;
    }

    const result = await apiPost('/api/projects/' + encodeURIComponent(projectId) + '/members', { email, role });

    if (result.success) {
        closeModal();
        showToast('Thêm thành viên thành công!', 'success');
        loadProjectMembers(projectId);
    } else {
        if (formError) {
            const errMsg = formError.querySelector('.error-message');
            if (errMsg) errMsg.textContent = result.message || 'Không thể thêm thành viên.';
            formError.classList.remove('hidden');
        }
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Xác nhận';
        }
    }
}
