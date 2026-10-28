/** Dùng một request cho danh sách và thống kê dự án. */
let dashboardLoading = false;
document.addEventListener('DOMContentLoaded', loadRecentProjects);
async function loadRecentProjects() {
    if (dashboardLoading) return;
    dashboardLoading = true;
    collectionState('recent-projects', 'loading');
    const result = await apiGet(apiEndpoint('projects'));
    dashboardLoading = false;
    const projects = result.success ? apiCollection(result.data) : null;
    setTextContent('stat-total-projects', '--');
    setTextContent('stat-my-projects', '--');
    if (!result.success || !projects) {
        collectionState('recent-projects', 'error', result.message || 'Dữ liệu dự án không đúng định dạng.');
        return;
    }
    // GET projects chưa khẳng định tổng dự án toàn hệ thống; chỉ đếm những dự án có vai trò.
    const isComplete = Array.isArray(result.data);
    const ownProjects = projects.filter(project => projectRole(project));
    if (isComplete && ownProjects.length === projects.length) setTextContent('stat-my-projects', ownProjects.length);
    if (APP_CONFIG.mode === 'api') loadDashboardStats();
    if (!projects.length) { collectionState('recent-projects', 'empty'); return; }
    const recent = [...projects].sort((a, b) => (Date.parse(b.createdAt || b.created_at) || 0) - (Date.parse(a.createdAt || a.created_at) || 0)).slice(0, 5);
    renderProjectRows(document.getElementById('recent-projects-body'), recent);
    collectionState('recent-projects', 'table');
}
async function loadDashboardStats() {
    const result = await apiGet(apiEndpoint('dashboardStats'));
    if (!result.success || !result.data) {
        ['stat-total-projects', 'stat-my-projects', 'stat-total-languages', 'stat-pending-translations'].forEach(id => setTextContent(id, '--'));
        const note = document.getElementById('dashboard-stats-note');
        if (note) { note.textContent = result.message || 'Không tải được thống kê.'; note.classList.remove('hidden'); }
        return;
    }
    const stats = result.data;
    setTextContent('stat-total-projects', stats.projects);
    setTextContent('stat-my-projects', stats.managedProjects);
    setTextContent('stat-total-languages', stats.languages);
    setTextContent('stat-pending-translations', stats.pendingTranslations);
    hideElement('dashboard-stats-note');
}
