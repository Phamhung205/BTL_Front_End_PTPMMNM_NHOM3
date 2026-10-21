<?php
session_start();
require_once __DIR__ . '/../config/api.php';
$sourceTitles = ['languages' => 'Ngôn ngữ', 'keys' => 'Khóa nguồn', 'versions' => 'Phiên bản nguồn', 'import' => 'Import JSON', 'changes' => 'Chi tiết thay đổi'];
if (!isset($sourceTitles[$sourceView ?? ''])) { http_response_code(404); exit; }
$pageTitle = $sourceTitles[$sourceView];
$currentPage = ['languages' => 'languages', 'keys' => 'translation_keys'][$sourceView] ?? 'source_versions';
$baseUrl = '../../';
include __DIR__ . '/header.php';
?>
<body class="bg-gray-50 min-h-screen" data-source-view="<?php echo $sourceView; ?>">
    <link rel="stylesheet" href="../../assets/css/source-management.css">
    <?php include __DIR__ . '/sidebar.php'; ?>
    <div class="lg:ml-64">
        <?php include __DIR__ . '/navbar.php'; ?>
        <main class="sm-workspace">
            <div class="sm-breadcrumb">Không gian dự án <span>/</span> Quản lý nguồn</div>
            <div class="sm-heading">
                <div><div class="sm-eyebrow">SOURCE MANAGEMENT</div><h2><?php echo $pageTitle; ?></h2><p id="sm-description"></p></div>
                <a id="sm-import-link" class="sm-button sm-primary" data-source-link="import" href="../source-versions/import.php"><span aria-hidden="true">＋</span> Import JSON nguồn</a>
            </div>
            <div id="sm-demo-banner" class="sm-banner hidden"><span><strong>Chế độ xem thử</strong> · Dữ liệu mẫu chỉ lưu trong tab này, không ghi vào cơ sở dữ liệu.</span><div><button id="sm-reset-demo" class="sm-text-button" type="button">Khôi phục mẫu</button><a id="sm-live-link" class="sm-text-button" href="?">Dùng API thật ↗</a></div></div>
            <div class="sm-context sm-card">
                <div><label for="sm-project">Dự án đang làm việc</label><select id="sm-project" disabled><option>Đang tải dự án…</option></select></div>
                <span id="sm-role" class="sm-pill">Đang kết nối</span>
                <button id="sm-refresh" type="button" class="sm-button sm-secondary">↻ Làm mới</button>
            </div>
            <nav class="sm-tabs" aria-label="Quản lý nguồn">
                <a data-source-link="languages" href="../languages/index.php">Ngôn ngữ</a>
                <a data-source-link="keys" href="../translation-keys/index.php">Khóa nguồn</a>
                <a data-source-link="versions" href="../source-versions/index.php">Phiên bản nguồn</a>
                <a data-source-link="import" href="../source-versions/import.php">Import JSON</a>
            </nav>
            <div id="sm-notice" class="sm-notice hidden" role="status" aria-live="polite"></div>
            <div id="sm-loading" class="sm-loading" role="status">Đang tải dữ liệu…</div>
            <div id="sm-content" class="hidden">
            <?php if ($sourceView === 'languages'): ?>
                <div id="sm-stats" class="sm-stats"></div>
                <section class="sm-card"><div class="sm-card-heading"><div><h3>Ngôn ngữ trong dự án</h3><p>Quản lý ngôn ngữ nguồn và các ngôn ngữ đích cần dịch.</p></div><button id="sm-add-language" type="button" class="sm-button sm-primary" data-manager>＋ Thêm ngôn ngữ</button></div><div id="sm-language-list" class="sm-language-list"></div></section>
                <p class="sm-footnote">Ngôn ngữ nguồn được thiết lập khi tạo dự án. Thêm ngôn ngữ đích để bắt đầu biên dịch và kiểm tra tiến độ.</p>
            <?php elseif ($sourceView === 'keys'): ?>
                <div id="sm-stats" class="sm-stats"></div>
                <section class="sm-card"><div class="sm-card-heading"><div><h3>Danh mục khóa nguồn</h3><p>Khóa được tạo và cập nhật từ các lần import JSON.</p></div><span id="sm-key-count" class="sm-pill"></span></div>
                    <div class="sm-toolbar"><label class="sm-search"><span aria-hidden="true">⌕</span><input id="sm-search" type="search" placeholder="Tìm theo khóa hoặc nội dung nguồn" aria-label="Tìm khóa nguồn"></label><select id="sm-key-status" aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option value="active">Đang sử dụng</option><option value="deleted">Đã xóa khỏi nguồn</option></select></div>
                    <div class="sm-table-wrap"><table class="sm-table"><thead><tr><th>Khóa</th><th>Nội dung nguồn</th><th>Biến thay thế</th><th>Trạng thái</th></tr></thead><tbody id="sm-keys-body"></tbody></table></div><div id="sm-keys-empty" class="sm-empty hidden">Không có khóa phù hợp.</div><div class="sm-table-footer"><span id="sm-page-info"></span><div><button id="sm-prev" class="sm-button sm-secondary" type="button">← Trước</button><button id="sm-next" class="sm-button sm-secondary" type="button">Sau →</button></div></div>
                </section>
            <?php elseif ($sourceView === 'versions'): ?>
                <div id="sm-stats" class="sm-stats"></div>
                <section class="sm-card"><div class="sm-card-heading"><div><h3>Lịch sử phiên bản</h3><p>Mỗi lần import lưu lại nội dung nguồn và danh sách thay đổi.</p></div><span id="sm-version-count" class="sm-pill"></span></div><div id="sm-version-list" class="sm-version-list"></div></section>
            <?php elseif ($sourceView === 'import'): ?>
                <div class="sm-import-grid"><section class="sm-card"><div class="sm-card-heading"><div><h3>Nhập chuỗi nguồn mới</h3><p>Tải tệp JSON hoặc dán nội dung để xem trước.</p></div><span class="sm-step">01 / Chuẩn bị</span></div>
                    <form id="sm-import-form" class="sm-form" novalidate>
                        <label for="sm-version-name">Tên phiên bản nguồn <span class="sm-required">*</span></label><input id="sm-version-name" maxlength="120" placeholder="Ví dụ: source-1.2.0" autocomplete="off" required>
                        <label id="sm-dropzone" class="sm-dropzone" for="sm-json-file"><span class="sm-upload-icon" aria-hidden="true">↑</span><strong>Kéo thả tệp JSON vào đây</strong><span>hoặc nhấn để chọn tệp · tối đa 2 MB</span><input id="sm-json-file" type="file" accept=".json,application/json" class="sm-visually-hidden"></label><div id="sm-file-name" class="sm-footnote" aria-live="polite"></div>
                        <div class="sm-label-row"><label for="sm-json-input">Nội dung JSON</label><button id="sm-sample" type="button" class="sm-text-button">Dùng JSON mẫu</button></div><textarea id="sm-json-input" rows="13" class="sm-code-input" spellcheck="false" placeholder='{"home": {"title": "Trang chủ", "welcome": "Xin chào {name}"}}'></textarea>
                        <div id="sm-import-error" class="sm-notice sm-error hidden" role="alert"></div><button id="sm-preview" type="submit" class="sm-button sm-primary" data-manager>Kiểm tra &amp; xem trước →</button>
                    </form>
                </section><aside class="sm-import-aside"><section class="sm-card sm-guide"><div class="sm-eyebrow">QUY ƯỚC JSON</div><h3>Một tệp, toàn bộ chuỗi nguồn</h3><p>Hỗ trợ object lồng nhau với giá trị là chuỗi, Unicode và các biến như <code>{name}</code>, <code>{count}</code>.</p><pre>{
  "home": {
    "title": "Trang chủ",
    "welcome": "Chào {name}!"
  }
}</pre><p>Khóa được chuyển thành đường dẫn: <code>home.title</code>, <code>home.welcome</code>.</p><ul><li>Tên khóa không rỗng và không chứa dấu chấm.</li><li>Không hỗ trợ mảng, số, boolean hoặc null.</li><li>Mỗi phiên bản phải có tên riêng.</li></ul></section><div class="sm-warning"><strong>Lưu ý khi thay thế nguồn</strong><p>Import là toàn bộ phiên bản mới. Khóa cũ vắng mặt trong tệp sẽ được đánh dấu đã xóa. Bản dịch liên quan đến chuỗi thay đổi cần được kiểm tra lại.</p></div></aside></div>
                <section id="sm-import-preview" class="sm-card sm-preview hidden"><div class="sm-card-heading"><div><h3>Xem trước phiên bản</h3><p id="sm-preview-summary"></p></div><span class="sm-step">02 / Xác nhận</span></div><div id="sm-preview-stats" class="sm-stats sm-inset"></div><div class="sm-table-wrap sm-preview-table"><table class="sm-table"><thead><tr><th>Khóa</th><th>Nội dung cũ</th><th>Nội dung mới</th><th>Thay đổi</th></tr></thead><tbody id="sm-preview-body"></tbody></table></div><div class="sm-form"><label class="sm-checkbox"><input id="sm-import-confirm" type="checkbox"> Tôi đã kiểm tra và xác nhận đây là toàn bộ chuỗi nguồn của phiên bản mới.</label><button id="sm-import-submit" type="button" class="sm-button sm-primary" disabled data-manager>Import phiên bản nguồn</button></div></section>
                <section id="sm-import-result" class="sm-card sm-result hidden" aria-live="polite"></section>
            <?php elseif ($sourceView === 'changes'): ?>
                <a class="sm-back" data-source-link="versions" href="index.php">← Tất cả phiên bản nguồn</a>
                <section class="sm-card sm-diff-heading"><div><div class="sm-eyebrow">THAY ĐỔI CHUỖI NGUỒN</div><h3 id="sm-diff-title">Chi tiết phiên bản</h3><p id="sm-diff-meta"></p></div><div><label for="sm-diff-version">Phiên bản</label><select id="sm-diff-version"></select></div></section>
                <div id="sm-stats" class="sm-stats"></div>
                <section class="sm-card"><div class="sm-toolbar"><label class="sm-search"><span aria-hidden="true">⌕</span><input id="sm-search" type="search" placeholder="Tìm khóa thay đổi" aria-label="Tìm thay đổi"></label><select id="sm-change-type" aria-label="Loại thay đổi"><option value="all">Tất cả thay đổi</option><option value="new">Khóa mới</option><option value="changed">Đã sửa</option><option value="deleted">Đã xóa</option><option value="restored">Khôi phục</option></select><span id="sm-change-count" class="sm-pill"></span></div><div id="sm-diff-list"></div></section>
                <p class="sm-footnote">So sánh với trạng thái nguồn ngay trước lần import này. Các khóa không thay đổi không xuất hiện trong danh sách.</p>
            <?php endif; ?>
            </div>
            <div class="sm-bottom-note"><span>Translation Manager</span><span>Quản lý nguồn · Bùi Đình Mạnh</span></div>
        </main>
    </div>
    <dialog id="sm-language-dialog" class="sm-dialog"><form id="sm-language-form" class="sm-form" novalidate><div class="sm-label-row"><h3 id="sm-language-dialog-title">Thêm ngôn ngữ</h3><button id="sm-close-dialog" type="button" class="sm-icon-button" aria-label="Đóng">×</button></div><p class="sm-footnote">Chọn mã ngôn ngữ đích cho dự án.</p><label for="sm-locale-code">Mã ngôn ngữ</label><input id="sm-locale-code" list="sm-locale-options" maxlength="20" placeholder="Ví dụ: en, ja, en-US" required><datalist id="sm-locale-options"><option value="en">English</option><option value="vi">Tiếng Việt</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="fr">Français</option><option value="de">Deutsch</option></datalist><label for="sm-locale-name">Tên hiển thị</label><input id="sm-locale-name" maxlength="80" placeholder="Ví dụ: English"><div id="sm-locale-error" class="sm-notice sm-error hidden" role="alert"></div><div class="sm-dialog-actions"><button id="sm-cancel-dialog" type="button" class="sm-button sm-secondary">Hủy</button><button id="sm-save-language" type="submit" class="sm-button sm-primary">Lưu ngôn ngữ</button></div></form></dialog>
    <dialog id="sm-remove-dialog" class="sm-dialog"><div class="sm-form"><h3>Gỡ ngôn ngữ khỏi dự án?</h3><p id="sm-remove-description"></p><div id="sm-remove-error" class="sm-notice sm-error hidden" role="alert"></div><div class="sm-dialog-actions"><button id="sm-cancel-remove" type="button" class="sm-button sm-secondary">Hủy</button><button id="sm-confirm-remove" type="button" class="sm-button sm-danger">Gỡ ngôn ngữ</button></div></div></dialog>
    <?php include __DIR__ . '/toast.php'; ?>
    <script src="../../assets/js/api.js"></script><script src="../../assets/js/ui.js"></script><script src="../../assets/js/translation-common.js"></script><script src="../../assets/js/source-data.js"></script><script src="../../assets/js/source-management.js"></script>
</body>
</html>
