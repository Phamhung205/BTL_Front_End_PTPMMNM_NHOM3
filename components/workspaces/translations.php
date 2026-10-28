<?php
require_once __DIR__ . '/../../config/api.php';
$titles = ['translations' => 'Bản dịch', 'reviews' => 'Đánh giá', 'releases' => 'Phát hành', 'history' => 'Lịch sử'];
if (!isset($titles[$workflowModule ?? ''])) { http_response_code(404); exit; }
$pageTitle = $titles[$workflowModule];
$currentPage = $workflowModule;
$baseUrl = '../../';
include __DIR__ . '/../layout/header.php';
?>
<body class="bg-gray-50 min-h-screen">
<?php include __DIR__ . '/../layout/sidebar.php'; ?>
<div class="lg:ml-64">
    <?php include __DIR__ . '/../layout/navbar.php'; ?>
    <main id="translation-workspace" data-module="<?= $workflowModule ?>" class="pt-16 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
        <div class="mb-6"><h1 class="text-2xl font-bold text-gray-900"><?= $pageTitle ?></h1><p class="text-sm text-gray-500 mt-2">Dịch, cộng tác và phát hành nội dung theo từng dự án.</p></div>
        <div class="workflow-card mb-5">
            <label for="workflow-project" class="block text-sm font-medium mb-2">Dự án</label>
            <select id="workflow-project" disabled class="workflow-input sm:max-w-lg"><option>Đang tải dự án...</option></select>
            <p id="workflow-permission" class="text-sm text-gray-500 mt-3"></p>
            <nav class="flex flex-wrap gap-4 mt-4 text-sm" aria-label="Nội dung dự án">
                <?php foreach (['languages' => 'Ngôn ngữ', 'source_versions' => 'Nguồn', 'translation_keys' => 'Khóa', 'translations' => 'Bản dịch', 'reviews' => 'Đánh giá', 'releases' => 'Phát hành', 'history' => 'Lịch sử'] as $key => $title): ?>
                <a data-source-link="<?= $key ?>" href="#" class="text-indigo-600"><?= $title ?></a>
                <?php endforeach; ?>
            </nav>
            <?php if ($workflowModule === 'translations'): ?>
            <div class="flex flex-wrap gap-2 mt-4 border-t border-gray-100 pt-3" role="tablist" aria-label="Khu vực bản dịch">
                <button id="translation-tab-project" type="button" role="tab" aria-selected="true" aria-controls="translation-pane-project" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">Bản dịch dự án</button>
                <button id="translation-tab-memory" type="button" role="tab" aria-selected="false" aria-controls="translation-pane-memory" class="px-3 py-2 rounded-lg text-indigo-700 hover:bg-indigo-50 text-sm">Kho bản dịch</button>
            </div>
            <?php endif; ?>
        </div>
        <div id="workflow-error" role="alert" class="hidden mb-5 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg"><p id="workflow-error-text"></p><button id="workflow-retry" type="button" class="underline mt-2">Thử lại</button></div>
        <p id="workflow-loading" role="status" class="p-8 text-center text-gray-500">Đang tải dữ liệu...</p>
        <p id="workflow-empty" role="status" class="hidden p-8 text-center text-gray-500"></p>
        <section id="workflow-content" class="hidden space-y-5 mb-8">
        <?php if (in_array($workflowModule, ['translations', 'reviews'], true)): ?>
            <?php if ($workflowModule === 'translations'): ?><div id="translation-pane-project" role="tabpanel" aria-labelledby="translation-tab-project" class="space-y-5"><?php endif; ?>
            <form id="translation-filter" class="workflow-card flex flex-wrap gap-3 items-end">
                <div><label for="translation-locale" class="workflow-label">Ngôn ngữ đích</label><select id="translation-locale" class="workflow-input" required></select></div>
                <div class="flex-1"><label for="translation-query" class="workflow-label">Tìm kiếm</label><input id="translation-query" maxlength="500" placeholder="Khóa, nguồn hoặc bản dịch" class="workflow-input"></div>
                <div id="translation-status-filter"><label for="translation-status" class="workflow-label">Trạng thái</label><select id="translation-status" class="workflow-input">
                    <option value="">Tất cả</option><option value="missing">Chưa dịch</option><option value="draft">Nháp</option><option value="translated" <?= $workflowModule === 'reviews' ? 'selected' : '' ?>>Chờ duyệt</option><option value="needs_review">Cần sửa / nguồn thay đổi</option><option value="approved">Đã duyệt</option>
                </select></div>
                <div id="translation-work-filter" class="hidden"><label for="translation-work" class="workflow-label">Công việc</label><select id="translation-work" class="workflow-input"><option value="me">Giao cho tôi</option></select></div>
                <div id="translation-assignee-filter"><label for="translation-assignee" class="workflow-label">Phân công</label><select id="translation-assignee" class="workflow-input"><option value="">Tất cả</option><option value="me">Giao cho tôi</option><option value="none">Chưa phân công</option></select></div>
                <button class="workflow-primary" type="submit">Tìm kiếm</button>
            </form>
            <div id="translation-progress" class="workflow-card" role="status"></div>
            <div id="translation-bulk" class="hidden workflow-card flex flex-wrap items-center gap-3">
                <div id="translation-manager-bulk-actions" class="contents">
                    <button id="bulk-create-missing" type="button" class="workflow-primary">Thêm tất cả bản ghi còn thiếu</button>
                    <?php if ($workflowModule === 'translations'): ?><button id="bulk-import-translations" type="button" class="workflow-primary">Nhập bản dịch từ tệp JSON</button><?php endif; ?>
                </div>
                <button id="translation-select-results" type="button" class="text-indigo-600 text-sm">Chọn tất cả kết quả</button>
                <button id="translation-clear-selection" type="button" class="text-gray-600 text-sm" disabled>Bỏ chọn tất cả</button>
                <span id="translation-selected" class="text-sm">Đã chọn 0 khóa</span>
                <div id="translation-manager-bulk-actions-secondary" class="contents">
                    <label for="bulk-assignee" class="sr-only">Người nhận phân công</label><select id="bulk-assignee" class="workflow-input sm:w-auto"></select>
                    <button id="bulk-assign" type="button" class="workflow-primary">Phân công khóa đã chọn</button>
                    <p id="translation-assignee-info" class="w-full text-xs text-gray-500" role="status"></p>
                    <button id="bulk-delete" type="button" class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50" disabled>Xóa bản dịch đã chọn</button>
                </div>
                <div id="translation-review-bulk-actions" class="contents">
                    <button id="bulk-approve-selected" type="button" class="workflow-primary">Duyệt bản đã chọn</button>
                    <button id="bulk-approve-all" type="button" class="workflow-primary">Duyệt tất cả đang chờ</button>
                </div>
                <p class="w-full text-xs text-gray-500">Chọn từng khóa bằng checkbox; giữ Shift rồi chọn khóa cuối để chọn cả dải. “Chọn tất cả kết quả” áp dụng qua mọi trang.</p>
                <p class="w-full text-xs text-gray-500">Áp dụng cho ngôn ngữ đích đang chọn. Thêm tất cả chỉ tạo bản ghi trống để dịch; xóa sẽ xóa vĩnh viễn bản dịch cùng bình luận và lịch sử, giữ khóa nguồn và bản phát hành đã có.</p>
            </div>
            <section id="translation-import-report" class="hidden workflow-card space-y-2" role="status" aria-live="polite"></section>
            <p id="translation-count" role="status" class="text-sm text-gray-500"></p>
            <div class="workflow-card p-0 table-responsive"><table><thead><tr><th><input id="translation-select-all" type="checkbox" aria-label="Chọn tất cả khóa trên trang"></th><th>Khóa / Nội dung nguồn</th><th>Bản dịch</th><th>Trạng thái / Phân công</th><th>Thao tác</th></tr></thead><tbody id="translations-body"></tbody></table></div>
            <div id="translation-pagination" class="flex gap-4 items-center"><button id="translation-previous" type="button" class="text-indigo-600">Trang trước</button><span id="translation-page" class="text-sm"></span><button id="translation-next" type="button" class="text-indigo-600">Trang sau</button></div>
            <?php if ($workflowModule === 'translations'): ?></div><div id="translation-memory-pane" role="tabpanel" aria-labelledby="translation-tab-memory" class="hidden space-y-5"><?php include __DIR__ . '/translation-memory.php'; ?></div><?php endif; ?>
        <?php elseif ($workflowModule === 'releases'): ?>
            <div class="workflow-card space-y-3"><div class="flex flex-wrap gap-4 justify-between items-center"><h2 class="font-semibold">Điều kiện phát hành</h2><button id="release-revalidate" type="button" class="text-indigo-600 text-sm">Kiểm tra lại</button></div><div id="release-validation" role="status"></div><div id="release-progress"></div></div>
            <form id="release-form" class="hidden workflow-card space-y-4">
                <h2 class="font-semibold">Tạo bản phát hành</h2>
                <p class="text-sm text-gray-500">Toàn bộ bản dịch phải được duyệt. Bản phát hành lưu nội dung cố định theo phiên bản nguồn hiện tại.</p>
                <div><label for="release-version" class="workflow-label">Phiên bản</label><input id="release-version" required maxlength="60" pattern="[A-Za-z0-9][A-Za-z0-9._\-]*" placeholder="1.0.0" class="workflow-input"></div>
                <div><label for="release-note" class="workflow-label">Ghi chú</label><textarea id="release-note" rows="3" maxlength="1000" class="workflow-input"></textarea></div>
                <button id="release-publish" type="submit" class="workflow-primary" disabled>Phát hành</button>
            </form>
            <section id="release-api-key-result" class="hidden workflow-card space-y-3" aria-live="polite">
                <h2 class="font-semibold">Bản phát hành đã tạo — API key khách hàng</h2>
                <p class="text-sm text-amber-700">Key này chỉ hiển thị ở đây một lần và chỉ đọc bản phát hành vừa tạo. Hãy tải hoặc sao chép cấu hình trước khi rời trang.</p>
                <div><label for="release-api-key-value" class="workflow-label">API key</label><textarea id="release-api-key-value" rows="2" readonly class="workflow-input font-mono text-sm"></textarea></div>
                <div><label for="release-api-config-value" class="workflow-label">translation-manager.config.js</label><textarea id="release-api-config-value" rows="8" readonly class="workflow-input font-mono text-xs"></textarea></div>
                <div class="flex flex-wrap gap-3"><button id="release-api-config-download" type="button" class="workflow-primary">Tải translation-manager.config.js</button><button id="release-api-config-copy" type="button" class="text-indigo-600">Sao chép cấu hình</button></div>
            </section>
            <div id="releases-list" class="space-y-4"></div>
        <?php else: ?>
            <div class="flex flex-wrap justify-between gap-3"><p class="text-sm text-gray-500">Nhập nguồn, bản dịch, phân công, đánh giá, bình luận và phát hành; mỗi trang tối đa 50 hoạt động.</p><button id="activity-refresh" type="button" class="text-indigo-600">Làm mới</button></div>
            <div id="activity-list" class="space-y-4"></div>
            <div class="flex items-center gap-4"><button id="activity-previous" type="button" class="text-indigo-600">Trang trước</button><span id="activity-page" class="text-sm"></span><button id="activity-next" type="button" class="text-indigo-600">Trang sau</button></div>
        <?php endif; ?>
        </section>
        <?php include __DIR__ . '/../layout/footer.php'; ?>
    </main>
</div>
<?php include __DIR__ . '/../ui/toast.php'; include __DIR__ . '/../ui/modal.php'; ?>
<script src="../../assets/js/shared/api.js"></script><script src="../../assets/js/shared/ui.js?v=<?= filemtime(__DIR__ . '/../../assets/js/shared/ui.js') ?>"></script><script src="../../assets/js/translations/workspace.js?v=<?= filemtime(__DIR__ . '/../../assets/js/translations/workspace.js') ?>"></script><?php if ($workflowModule === 'translations'): ?><script src="../../assets/js/memory/index.js?v=<?= filemtime(__DIR__ . '/../../assets/js/memory/index.js') ?>"></script><?php endif; ?>
</body></html>
