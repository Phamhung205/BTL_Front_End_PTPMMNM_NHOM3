/**
 * Projects Module - Translation Manager
 * Quản lý dự án: list, create, detail
 */

document.addEventListener('DOMContentLoaded', function() {
    // Project List Page
    if (document.getElementById('project-list-container')) {
        loadProjectList();
        setupProjectSearch();
    }

    // Create Project Page
    const createForm = document.getElementById('create-project-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateProject);
        setupSlugGeneration();
    }

    // Project Detail Page
    if (document.getElementById('project-detail-container')) {
        loadProjectDetail();
    }
});

// === Project List ===

let allProjects = [];

async function loadProjectList() {
    const loadingEl = document.getElementById('project-list-loading');
    const emptyEl = document.getElementById('project-list-empty');
    const errorEl = document.getElementById('project-list-error');
    const tableEl = document.getElementById('project-list-table');
    const tableBody = document.getElementById('project-list-body');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (tableEl) tableEl.classList.add('hidden');

    const result = await apiGet('/api/projects');

    if (loadingEl) loadingEl.classList.add('hidden');

    if (!result.success) {
        if (errorEl) {
            const errorMsg = errorEl.querySelector('.error-message');
            if (errorMsg) errorMsg.textContent = result.message || 'Không thể tải danh sách dự án.';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    allProjects = Array.isArray(result.data) ? result.data : (result.data.data || result.data.items || []);

    renderProjectList(allProjects);
}

function renderProjectList(projects) {
    const emptyEl = document.getElementById('project-list-empty');
    const tableEl = document.getElementById('project-list-table');
    const tableBody = document.getElementById('project-list-body');

    if (!tableBody) return;

    if (projects.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (tableEl) tableEl.classList.add('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (tableEl) tableEl.classList.remove('hidden');

    tableBody.innerHTML = '';

    projects.forEach(function(project, index) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        // STT
        const sttCell = document.createElement('td');
        sttCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        sttCell.textContent = index + 1;
        row.appendChild(sttCell);

        // Project Name
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap';
        const nameLink = document.createElement('a');
        nameLink.href = 'detail.php?id=' + encodeURIComponent(project.id || project.projectId || '');
        nameLink.className = 'text-sm font-medium text-indigo-600 hover:text-indigo-800';
        nameLink.textContent = project.name || project.projectName || '--';
        nameCell.appendChild(nameLink);
        row.appendChild(nameCell);

        // Slug
        const slugCell = document.createElement('td');
        slugCell.className = 'px-6 py-4 whitespace-nowrap';
        const slugBadge = document.createElement('span');
        slugBadge.className = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 font-mono';
        slugBadge.textContent = project.slug || '--';
        slugCell.appendChild(slugBadge);
        row.appendChild(slugCell);

        // Description
        const descCell = document.createElement('td');
        descCell.className = 'px-6 py-4 text-sm text-gray-500 max-w-xs truncate';
        descCell.textContent = project.description || '--';
        row.appendChild(descCell);

        // Role
        const roleCell = document.createElement('td');
        roleCell.className = 'px-6 py-4 whitespace-nowrap';
        const roleBadge = document.createElement('span');
        const role = project.role || project.userRole || '--';
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

        // Created At
        const dateCell = document.createElement('td');
        dateCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        dateCell.textContent = formatDate(project.createdAt || project.created_at || '');
        row.appendChild(dateCell);

        // Action
        const actionCell = document.createElement('td');
        actionCell.className = 'px-6 py-4 whitespace-nowrap';
        const viewLink = document.createElement('a');
        viewLink.href = 'detail.php?id=' + encodeURIComponent(project.id || project.projectId || '');
        viewLink.className = 'inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium';
        viewLink.textContent = 'Chi tiết';
        actionCell.appendChild(viewLink);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}

function setupProjectSearch() {
    const searchInput = document.getElementById('project-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        if (!query) {
            renderProjectList(allProjects);
            return;
        }
        const filtered = allProjects.filter(function(p) {
            const name = (p.name || p.projectName || '').toLowerCase();
            const slug = (p.slug || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            return name.includes(query) || slug.includes(query) || desc.includes(query);
        });
        renderProjectList(filtered);
    });
}

// === Create Project ===

function setupSlugGeneration() {
    const nameInput = document.getElementById('project-name');
    const slugInput = document.getElementById('project-slug');
    
    if (!nameInput || !slugInput) return;

    nameInput.addEventListener('input', function() {
        if (!slugInput.dataset.manual) {
            slugInput.value = generateSlug(this.value);
            validateSlugInput();
        }
    });

    slugInput.addEventListener('input', function() {
        slugInput.dataset.manual = 'true';
        validateSlugInput();
    });
}

function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function validateSlugInput() {
    const slugInput = document.getElementById('project-slug');
    const slugError = document.getElementById('slug-error');
    if (!slugInput || !slugError) return;

    const value = slugInput.value;
    const isValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) || value === '';
    
    if (value && !isValid) {
        slugError.textContent = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang.';
        slugError.classList.remove('hidden');
    } else {
        slugError.textContent = '';
        slugError.classList.add('hidden');
    }
}

async function handleCreateProject(e) {
    e.preventDefault();

    const nameInput = document.getElementById('project-name');
    const slugInput = document.getElementById('project-slug');
    const descInput = document.getElementById('project-description');
    const submitBtn = document.getElementById('create-project-btn');
    const errorEl = document.getElementById('create-project-error');

    if (errorEl) errorEl.classList.add('hidden');

    const name = nameInput ? nameInput.value.trim() : '';
    const slug = slugInput ? slugInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    // Validation
    let hasError = false;
    const nameError = document.getElementById('name-error');
    const slugError = document.getElementById('slug-error');

    if (!name) {
        if (nameError) { nameError.textContent = 'Vui lòng nhập tên dự án.'; nameError.classList.remove('hidden'); }
        hasError = true;
    } else {
        if (nameError) nameError.classList.add('hidden');
    }

    if (!slug) {
        if (slugError) { slugError.textContent = 'Vui lòng nhập slug.'; slugError.classList.remove('hidden'); }
        hasError = true;
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        if (slugError) { slugError.textContent = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang.'; slugError.classList.remove('hidden'); }
        hasError = true;
    } else {
        if (slugError) slugError.classList.add('hidden');
    }

    if (hasError) return;

    // Loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Đang tạo...';
    }

    const result = await apiPost('/api/projects', { name, slug, description });

    if (result.success) {
        showToast('Tạo dự án thành công!', 'success');
        const projectId = result.data ? (result.data.id || result.data.projectId) : null;
        setTimeout(function() {
            if (projectId) {
                window.location.href = 'detail.php?id=' + encodeURIComponent(projectId);
            } else {
                window.location.href = 'index.php';
            }
        }, 1000);
    } else {
        if (errorEl) {
            const errMsg = errorEl.querySelector('.error-message') || errorEl;
            errMsg.textContent = result.message || 'Không thể tạo dự án.';
            errorEl.classList.remove('hidden');
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Tạo dự án';
        }
    }
}

// === Project Detail ===

async function loadProjectDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (!projectId) {
        showToast('Không tìm thấy ID dự án.', 'error');
        return;
    }

    const loadingEl = document.getElementById('project-detail-loading');
    const contentEl = document.getElementById('project-detail-content');
    const errorEl = document.getElementById('project-detail-error');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');

    const result = await apiGet('/api/projects/' + encodeURIComponent(projectId));

    if (loadingEl) loadingEl.classList.add('hidden');

    if (!result.success) {
        if (errorEl) {
            const errorMsg = errorEl.querySelector('.error-message');
            if (errorMsg) errorMsg.textContent = result.message || 'Không thể tải thông tin dự án.';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    if (contentEl) contentEl.classList.remove('hidden');

    const project = result.data;
    
    // Render project info
    const nameEl = document.getElementById('detail-project-name');
    const slugEl = document.getElementById('detail-project-slug');
    const descEl = document.getElementById('detail-project-description');
    const dateEl = document.getElementById('detail-project-date');
    const roleEl = document.getElementById('detail-project-role');

    if (nameEl) nameEl.textContent = project.name || project.projectName || '--';
    if (slugEl) slugEl.textContent = project.slug || '--';
    if (descEl) descEl.textContent = project.description || 'Không có mô tả.';
    if (dateEl) dateEl.textContent = formatDate(project.createdAt || project.created_at || '');
    if (roleEl) {
        const role = project.role || project.userRole || '--';
        roleEl.textContent = role;
        const roleColors = {
            'owner': 'bg-purple-100 text-purple-700',
            'manager': 'bg-blue-100 text-blue-700',
            'translator': 'bg-green-100 text-green-700',
            'reviewer': 'bg-yellow-100 text-yellow-700'
        };
        roleEl.className = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ' + (roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-700');
    }

    // Store projectId for member operations
    window.__currentProjectId = projectId;

    // Setup tabs
    setupDetailTabs();
}

function setupDetailTabs() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Update button styles
            tabButtons.forEach(function(b) {
                b.classList.remove('border-indigo-500', 'text-indigo-600');
                b.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });
            this.classList.add('border-indigo-500', 'text-indigo-600');
            this.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

            // Show/hide tab content
            document.querySelectorAll('[data-tab-content]').forEach(function(content) {
                content.classList.toggle('hidden', content.dataset.tabContent !== tab);
            });

            // Load members if switching to members tab
            if (tab === 'members' && window.__currentProjectId) {
                loadProjectMembers(window.__currentProjectId);
            }
        });
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch(e) {
        return dateStr;
    }
}
