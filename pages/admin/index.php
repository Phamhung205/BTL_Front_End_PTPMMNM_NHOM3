<?php
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Quản trị hệ thống'; $baseUrl = '../../';
include __DIR__ . '/../../components/layout/header.php';
?>
<body class="bg-slate-50 min-h-screen">
<header class="admin-header"><a href="../../dashboard.php" class="font-bold text-lg">Translation Manager <span class="admin-brand-label">ADMIN</span></a><div class="flex flex-wrap items-center gap-4 text-sm"><span id="admin-user-name"></span><a href="../../dashboard.php">Không gian dự án ↗</a><a href="../../logout.php">Đăng xuất</a></div></header>
<main id="admin-workspace" class="admin-main">
    <div class="flex flex-wrap justify-between gap-4 items-start mb-6"><div><p class="text-indigo-600 text-xs font-bold tracking-widest mb-2">QUẢN TRỊ HỆ THỐNG</p><h1 class="text-3xl font-bold text-slate-900">Trung tâm quản trị</h1><p class="text-slate-500 mt-2">Quản lý tài khoản, dự án và theo dõi các thay đổi trong hệ thống.</p></div><span class="admin-role-pill">Admin hệ thống</span></div>
    <p id="admin-loading" role="status" class="workflow-card text-slate-500">Đang kiểm tra quyền truy cập...</p>
    <div id="admin-denied" role="alert" class="hidden workflow-card border-red-200 text-red-700"><h2 class="font-semibold">Không có quyền quản trị</h2><p class="mt-2">Trang này dành cho Admin hệ thống. Manager, Translator và Reviewer làm việc trong các dự án được phân quyền.</p><a class="inline-block text-indigo-600 mt-4" href="../../dashboard.php">Về Dashboard</a></div>
    <div id="admin-error" role="alert" class="hidden mb-5 p-4 bg-red-50 text-red-700 rounded-lg"><p id="admin-error-text"></p><button id="admin-retry" type="button" class="underline mt-2">Thử lại</button></div>
    <div id="admin-content" class="hidden space-y-6">
        <nav class="admin-tabs" aria-label="Quản trị hệ thống"><button type="button" data-admin-tab="overview">Tổng quan</button><button type="button" data-admin-tab="users">Tài khoản</button><button type="button" data-admin-tab="projects">Dự án</button><button type="button" data-admin-tab="audit">Nhật ký quản trị</button><button type="button" data-admin-tab="permissions">Ma trận quyền</button></nav>
        <section id="admin-overview" class="hidden space-y-6">
            <div id="admin-stats" class="admin-stat-grid"></div>
            <div class="admin-info-grid"><article class="workflow-card"><h2 class="font-semibold text-lg mb-3">Quản trị rõ phạm vi</h2><p class="text-sm text-slate-600 leading-7">Admin quản lý quyền hệ thống, khóa tài khoản và điều phối thành viên trên mọi dự án. Quyền Manager, Translator và Reviewer được cấp riêng theo từng dự án.</p><button class="workflow-primary mt-5" type="button" data-admin-tab="users">Quản lý tài khoản</button></article><article class="workflow-card"><h2 class="font-semibold text-lg mb-3">Bảo vệ quyền truy cập</h2><ul class="text-sm text-slate-600 space-y-3"><li>Luôn giữ ít nhất một Admin đang hoạt động.</li><li>Không khóa Manager đang hoạt động cuối cùng của dự án.</li><li>Khóa tài khoản và thu hồi quyền có hiệu lực từ request tiếp theo.</li><li>Thay đổi quản trị được lưu cùng giao dịch vào nhật ký.</li></ul></article></div>
        </section>
        <section id="admin-users" class="hidden space-y-4">
            <button id="admin-add-user" type="button" class="workflow-primary">Thêm tài khoản</button>
            <form id="admin-users-filter" class="workflow-card flex flex-wrap items-end gap-3"><div class="flex-1"><label class="workflow-label" for="admin-users-q">Tên hoặc email</label><input id="admin-users-q" class="workflow-input" maxlength="200" placeholder="Tìm tài khoản..."></div><div><label class="workflow-label" for="admin-users-role">Quyền hệ thống</label><select id="admin-users-role" class="workflow-input"><option value="">Tất cả</option><option value="admin">Admin</option><option value="user">Người dùng</option></select></div><div><label class="workflow-label" for="admin-users-status">Trạng thái</label><select id="admin-users-status" class="workflow-input"><option value="">Tất cả</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option></select></div><button class="workflow-primary">Tìm kiếm</button></form>
            <p id="admin-users-count" class="text-sm text-slate-500" role="status"></p><div class="workflow-card table-responsive"><table><thead><tr><th>Tài khoản</th><th>Quyền hệ thống</th><th>Trạng thái</th><th>Dự án / Ngày tạo</th><th>Thao tác</th></tr></thead><tbody id="admin-users-body"></tbody></table></div>
        </section>
        <section id="admin-projects" class="hidden space-y-4">
            <form id="admin-projects-filter" class="workflow-card flex items-end gap-3"><div class="flex-1"><label class="workflow-label" for="admin-projects-q">Tên hoặc slug</label><input id="admin-projects-q" class="workflow-input" maxlength="200" placeholder="Tìm dự án trong toàn hệ thống..."></div><button class="workflow-primary">Tìm kiếm</button></form>
            <p id="admin-projects-count" class="text-sm text-slate-500" role="status"></p><div class="workflow-card table-responsive"><table><thead><tr><th>Dự án</th><th>Người tạo / Ngôn ngữ</th><th>Thành viên / Khóa / Phát hành</th><th>Thao tác</th></tr></thead><tbody id="admin-projects-body"></tbody></table></div>
        </section>
        <section id="admin-audit" class="hidden space-y-4">
            <form id="admin-audit-filter" class="workflow-card flex items-end gap-3"><div class="flex-1"><label class="workflow-label" for="admin-audit-q">Tìm thao tác, nội dung hoặc email Admin</label><input id="admin-audit-q" class="workflow-input" maxlength="200" placeholder="user.updated, project.deleted..."></div><button class="workflow-primary">Tìm kiếm</button></form>
            <p id="admin-audit-count" class="text-sm text-slate-500" role="status"></p><div id="admin-audit-list" class="space-y-3"></div>
        </section>
        <section id="admin-permissions" class="hidden workflow-card">
            <h2 class="text-lg font-semibold mb-2">Phân quyền tài khoản theo email</h2>
            <p class="text-sm text-slate-500 mb-4">Tìm tài khoản đã đăng ký để cấp hoặc thu quyền hệ thống. Vai trò dịch được cấp riêng theo từng dự án bên dưới.</p>
            <form id="admin-permission-find" class="flex flex-wrap items-end gap-3 mb-4">
                <div class="flex-1"><label for="admin-permission-email" class="workflow-label">Email người cần phân quyền</label><input id="admin-permission-email" type="email" required maxlength="190" autocomplete="off" class="workflow-input" placeholder="Email tài khoản đã đăng ký"></div>
                <button id="admin-permission-find-btn" class="workflow-primary">Tìm tài khoản</button>
            </form>
            <p id="admin-permission-error" class="hidden text-sm text-red-700 mb-4" role="alert"></p>
            <div id="admin-permission-user" class="hidden border rounded-lg p-4 mb-5 space-y-4">
                <p id="admin-permission-identity" class="font-medium"></p><p id="admin-permission-current" class="text-sm text-slate-600"></p>
                <form id="admin-permission-grant" class="flex flex-wrap items-end gap-3">
                    <div><label for="admin-permission-role" class="workflow-label">Quyền hệ thống mới</label><select id="admin-permission-role" class="workflow-input" required></select></div>
                    <button id="admin-permission-save" class="workflow-primary">Lưu quyền hệ thống</button>
                    <button id="admin-permission-reload" type="button" class="text-indigo-600 text-sm">Tải lại quyền mới nhất</button>
                </form>
                <p class="text-sm text-amber-700">Cấp Admin cho phép quản trị tài khoản và mọi dự án. Thay đổi có hiệu lực từ request tiếp theo; hệ thống luôn giữ ít nhất một Admin hoạt động.</p>
                <div><h3 class="font-semibold mb-2">Vai trò trong các dự án</h3><div id="admin-permission-projects" class="space-y-3"></div><button id="admin-permission-manage-projects" type="button" class="mt-3 text-indigo-600 text-sm">Thêm vào dự án khác</button></div>
            </div>
            <details class="mb-5"><summary class="cursor-pointer font-medium">Vai trò và phạm vi được hỗ trợ</summary><div id="admin-role-catalog" class="space-y-3 mt-3"></div></details>
            <h2 class="text-lg font-semibold mb-2">Hai tầng phân quyền</h2><p class="text-sm text-slate-500 mb-5">Admin là quyền hệ thống. Ba vai trò dự án được cấp độc lập cho từng dự án; Admin cần được thêm vào dự án để tham gia luồng dịch.</p><div class="table-responsive"><table><thead><tr><th>Chức năng</th><th>Admin hệ thống</th><th>Manager dự án</th><th>Translator</th><th>Reviewer</th></tr></thead><tbody>
            <tr><td>Quản lý tài khoản, quyền Admin, khóa/mở tài khoản</td><td>Có</td><td>Không</td><td>Không</td><td>Không</td></tr><tr><td>Xem/sửa/xóa toàn bộ dự án, điều phối thành viên</td><td>Có, qua trang Admin</td><td>Trong dự án</td><td>Không</td><td>Không</td></tr><tr><td>Quản lý nguồn và ngôn ngữ dự án</td><td>Theo vai trò dự án</td><td>Có</td><td>Chỉ xem</td><td>Chỉ xem</td></tr><tr><td>Dịch / gửi duyệt</td><td>Theo vai trò dự án</td><td>Có</td><td>Khóa được giao hoặc chưa giao</td><td>Không</td></tr><tr><td>Duyệt / từ chối</td><td>Theo vai trò dự án</td><td>Có</td><td>Không</td><td>Có</td></tr><tr><td>Phát hành</td><td>Theo vai trò dự án</td><td>Có</td><td>Không</td><td>Không</td></tr><tr><td>Xem nhật ký quản trị hệ thống</td><td>Có</td><td>Không</td><td>Không</td><td>Không</td></tr>
        </tbody></table></div></section>
        <div id="admin-pagination" class="hidden flex flex-wrap justify-between items-center gap-4"><button id="admin-previous" type="button" class="text-indigo-600">← Trang trước</button><span id="admin-page-label" class="text-sm text-slate-500"></span><button id="admin-next" type="button" class="text-indigo-600">Trang sau →</button></div>
    </div>
    <?php include __DIR__ . '/../../components/layout/footer.php'; ?>
</main>
<?php include __DIR__ . '/../../components/ui/toast.php'; include __DIR__ . '/../../components/ui/modal.php'; ?>
<script src="../../assets/js/shared/api.js"></script><script src="../../assets/js/shared/ui.js"></script><script src="../../assets/js/admin/index.js"></script>
</body></html>
