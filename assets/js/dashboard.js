/**
 * Dashboard Module - Translation Manager
 * Hiển thị thống kê tổng quan và dự án gần đây
 */

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardStats();
    loadRecentProjects();
});

/**
 * Load Dashboard Statistics
 */
async function loadDashboardStats() {
    // Thử load từ API projects để tính số liệu cơ bản
    const result = await apiGet('/api/projects');
    
    const totalProjectsEl = document.getElementById('stat-total-projects');
    const myProjectsEl = document.getElementById('stat-my-projects');
    const totalLangsEl = document.getElementById('stat-total-languages');
    const pendingEl = document.getElementById('stat-pending-translations');

    if (result.success && result.data) {
        const projects = Array.isArray(result.data) ? result.data : (result.data.data || result.data.items || []);
        if (totalProjectsEl) totalProjectsEl.textContent = projects.length;
        if (myProjectsEl) myProjectsEl.textContent = projects.length;
    } else {
        if (totalProjectsEl) totalProjectsEl.textContent = '--';
        if (myProjectsEl) myProjectsEl.textContent = '--';
    }

    // Chưa có API thống kê ngôn ngữ và bản dịch
    if (totalLangsEl) totalLangsEl.textContent = '--';
    if (pendingEl) pendingEl.textContent = '--';
}

/**
 * Load Recent Projects
 */
async function loadRecentProjects() {
    const tableBody = document.getElementById('recent-projects-body');
    const loadingEl = document.getElementById('recent-projects-loading');
    const emptyEl = document.getElementById('recent-projects-empty');
    const errorEl = document.getElementById('recent-projects-error');
    const tableEl = document.getElementById('recent-projects-table');

    if (!tableBody) return;

    // Show loading
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (tableEl) tableEl.classList.add('hidden');

    const result = await apiGet('/api/projects');

    // Hide loading
    if (loadingEl) loadingEl.classList.add('hidden');

    if (!result.success) {
        if (errorEl) {
            const errorMsg = errorEl.querySelector('.error-message');
            if (errorMsg) errorMsg.textContent = result.message || 'Không thể tải dữ liệu.';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    const projects = Array.isArray(result.data) ? result.data : (result.data.data || result.data.items || []);

    if (projects.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    // Show table
    if (tableEl) tableEl.classList.remove('hidden');

    // Render recent projects (last 5)
    const recentProjects = projects.slice(0, 5);
    tableBody.innerHTML = ''; // Safe: we build content below with textContent

    recentProjects.forEach(function(project) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap';
        const nameLink = document.createElement('a');
        nameLink.href = getBaseUrl() + 'pages/projects/detail.php?id=' + encodeURIComponent(project.id || project.projectId || '');
        nameLink.className = 'text-sm font-medium text-indigo-600 hover:text-indigo-800';
        nameLink.textContent = project.name || project.projectName || '--';
        nameCell.appendChild(nameLink);
        row.appendChild(nameCell);

        const slugCell = document.createElement('td');
        slugCell.className = 'px-6 py-4 whitespace-nowrap';
        const slugBadge = document.createElement('span');
        slugBadge.className = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700';
        slugBadge.textContent = project.slug || '--';
        slugCell.appendChild(slugBadge);
        row.appendChild(slugCell);

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

        const dateCell = document.createElement('td');
        dateCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        dateCell.textContent = formatDate(project.createdAt || project.created_at || '');
        row.appendChild(dateCell);

        const actionCell = document.createElement('td');
        actionCell.className = 'px-6 py-4 whitespace-nowrap';
        const viewLink = document.createElement('a');
        viewLink.href = getBaseUrl() + 'pages/projects/detail.php?id=' + encodeURIComponent(project.id || project.projectId || '');
        viewLink.className = 'text-sm text-indigo-600 hover:text-indigo-800 font-medium';
        viewLink.textContent = 'Xem chi tiết';
        actionCell.appendChild(viewLink);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}

/**
 * Format date string
 */
function formatDate(dateStr) {
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
