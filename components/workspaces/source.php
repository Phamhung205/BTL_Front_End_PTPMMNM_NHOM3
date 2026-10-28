
<?php
require_once __DIR__ . '/../../config/api.php';

$moduleTitles = [
    'languages' => 'Ngôn ngữ',
    'source_versions' => 'Phiên bản nguồn',
    'translation_keys' => 'Translation Keys'
];

if (!isset($moduleTitles[$sourceModule ?? ''])) {
    http_response_code(404);
    exit;
}

$pageTitle = $moduleTitles[$sourceModule];
$currentPage = $sourceModule;
$baseUrl = '../../';

include __DIR__ . '/../layout/header.php';
?>

<body class="bg-gray-50 min-h-screen">

    <?php include __DIR__ . '/../layout/sidebar.php'; ?>

    <div class="lg:ml-64">

        <?php include __DIR__ . '/../layout/navbar.php'; ?>

        <main
            id="source-workspace"
            data-module="<?php echo $sourceModule; ?>"
            class="pt-16 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col"
        >

            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-900">
                    <?php echo $pageTitle; ?>
                </h1>

                <p class="text-sm text-gray-500 mt-2">
                    Quản lý ngôn ngữ và nội dung nguồn theo từng dự án.
                </p>
            </div>

            <!-- Chọn dự án -->
            <div class="bg-white border border-gray-200 rounded-xl p-5 mb-6">

                <label
                    for="source-project"
                    class="block text-sm font-medium mb-2"
                >
                    Dự án
                </label>

                <select
                    id="source-project"
                    disabled
                    class="w-full sm:max-w-lg border border-gray-300 rounded-lg px-3 py-2.5"
                >
                    <option>Đang tải dự án...</option>
                </select>

                <p
                    id="source-permission"
                    class="text-sm text-gray-500 mt-3"
                ></p>

                <nav
                    class="flex flex-wrap gap-4 mt-4 text-sm"
                    aria-label="Nội dung dự án"
                >
                    <a data-source-link="languages"
                       href="../languages/index.php"
                       class="text-indigo-600">Ngôn ngữ</a>

                    <a data-source-link="source_versions"
                       href="../source-versions/index.php"
                       class="text-indigo-600">Phiên bản nguồn</a>

                    <a data-source-link="translations"
                       href="../translations/index.php"
                       class="text-indigo-600">Bản dịch</a>

                    <a data-source-link="reviews"
                       href="../reviews/index.php"
                       class="text-indigo-600">Đánh giá</a>

                    <a data-source-link="releases"
                       href="../releases/index.php"
                       class="text-indigo-600">Phát hành</a>

                    <a data-source-link="history"
                       href="../history/index.php"
                       class="text-indigo-600">Lịch sử</a>
                </nav>

            </div>

            <!-- Thông báo lỗi -->
            <div
                id="source-error"
                role="alert"
                class="hidden mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg"
            >
                <p id="source-error-message"></p>

                <button
                    id="source-retry"
                    type="button"
                    class="mt-2 underline"
                >
                    Thử lại
                </button>
            </div>

            <p
                id="source-loading"
                role="status"
                class="p-8 text-center text-gray-500"
            >
                Đang tải dữ liệu...
            </p>

            <p
                id="source-empty"
                role="status"
                class="hidden p-8 text-center text-gray-500"
            ></p>

            <section id="source-content" class="hidden mb-8 space-y-5">

                <?php if ($sourceModule === 'languages'): ?>

                    <!-- Quản lý ngôn ngữ -->
                    <form
                        id="locale-form"
                        class="hidden bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-end gap-3"
                    >
                        <div class="flex-1">
                            <label
                                for="locale-code"
                                class="block text-sm font-medium mb-2"
                            >
                                Mã ngôn ngữ đích
                            </label>

                            <input
                                id="locale-code"
                                required
                                maxlength="20"
                                placeholder="en, zh, en-US"
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                            >
                        </div>

                        <button
                            type="submit"
                            class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg"
                        >
                            Thêm ngôn ngữ
                        </button>
                    </form>

                    <p
                        id="locales-count"
                        role="status"
                        class="text-sm text-gray-500"
                    ></p>

                    <div class="bg-white border border-gray-200 rounded-xl table-responsive">
                        <table>
                            <thead class="bg-gray-50">
                                <tr>
                                    <th>Mã</th>
                                    <th>Tên hiển thị</th>
                                    <th>Loại</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="locales-body"></tbody>
                        </table>
                    </div>

                <?php elseif ($sourceModule === 'source_versions'): ?>

                    <!-- Nhập phiên bản nguồn -->
                    <form
                        id="source-import-form"
                        class="hidden bg-white border border-gray-200 rounded-xl p-5 space-y-4"
                    >

                        <h2 class="font-semibold">
                            Nhập phiên bản nguồn
                        </h2>

                        <p class="text-sm text-amber-700">
                            Mỗi lần nhập là toàn bộ nguồn.
                            Khóa vắng mặt trong tệp mới sẽ được đánh dấu đã xóa;
                            bản dịch và lịch sử được giữ lại.
                        </p>

                        <div>
                            <label
                                for="source-version-name"
                                class="block text-sm font-medium mb-2"
                            >
                                Tên phiên bản
                            </label>

                            <input
                                id="source-version-name"
                                required
                                maxlength="120"
                                placeholder="Ví dụ: v1.0"
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                            >
                        </div>

                        <!-- Chọn file JSON -->
                        <div>
                            <label
                                for="source-file"
                                class="block text-sm font-medium mb-2"
                            >
                                Tệp JSON (tối đa 2 MB; có thể chọn nhiều tệp của cùng ngôn ngữ nguồn để gộp)
                            </label>

                            <input
                                id="source-file"
                                type="file"
                                multiple
                                accept=".json,application/json"
                                class="w-full text-sm"
                            >
                            <p id="source-file-summary" role="status" class="text-xs text-gray-500 mt-1"></p>
                        </div>

                        <!-- Hiển thị JSON -->
                        <div>
                            <label
                                for="source-json"
                                class="block text-sm font-medium mb-2"
                            >
                                Nội dung JSON
                            </label>

                            <textarea
                                id="source-json"
                                required
                                rows="8"
                                spellcheck="false"
                                placeholder='{"home.title": "Trang chủ"}'
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 font-mono text-sm"
                            ></textarea>
                        </div>

                        <!-- SỬA HƯỚNG DẪN -->
                        <p class="text-xs text-gray-500">
                            Hỗ trợ JSON dạng khóa có dấu chấm
                            (ví dụ: home.title) hoặc object lồng nhau
                            với giá trị chuỗi.
                            Không dùng mảng, khóa trùng hoặc
                            đường dẫn xung đột.
                        </p>

                        <button
                            type="submit"
                            class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg"
                        >
                            Nhập nguồn
                        </button>

                    </form>

                    <!-- Kết quả nhập -->
                    <p
                        id="source-import-result"
                        role="status"
                        class="hidden p-4 bg-green-50 text-green-800 rounded-lg"
                    ></p>

                    <!-- Danh sách phiên bản -->
                    <div class="bg-white border border-gray-200 rounded-xl table-responsive">
                        <table>
                            <thead class="bg-gray-50">
                                <tr>
                                    <th>Phiên bản</th>
                                    <th>Người nhập / Ngày</th>
                                    <th>Số khóa</th>
                                    <th>Thay đổi</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="versions-body"></tbody>
                        </table>
                    </div>

                    <!-- So sánh thay đổi -->
                    <div
                        id="source-diff"
                        class="hidden bg-white border border-gray-200 rounded-xl p-5 space-y-4"
                    >

                        <h2
                            id="source-diff-title"
                            class="font-semibold"
                        ></h2>

                        <div>
                            <label
                                for="source-compare"
                                class="block text-sm font-medium mb-2"
                            >
                                So sánh với
                            </label>

                            <select
                                id="source-compare"
                                class="w-full sm:max-w-lg border border-gray-300 rounded-lg px-3 py-2.5"
                            ></select>
                        </div>

                        <p
                            id="source-diff-status"
                            role="status"
                            class="text-sm text-gray-500"
                        ></p>

                        <div class="table-responsive">
                            <table>
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th>Thay đổi</th>
                                        <th>Khóa</th>
                                        <th>Trước</th>
                                        <th>Sau</th>
                                    </tr>
                                </thead>
                                <tbody id="changes-body"></tbody>
                            </table>
                        </div>

                    </div>

                <?php else: ?>

                    <!-- Danh sách Translation Keys -->
                    <form
                        id="keys-filter"
                        class="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-end gap-3"
                    >

                        <div class="flex-1">
                            <label
                                for="keys-query"
                                class="block text-sm font-medium mb-2"
                            >
                                Tìm khóa hoặc nội dung nguồn
                            </label>

                            <input
                                id="keys-query"
                                maxlength="500"
                                placeholder="Nhập từ khóa..."
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                            >
                        </div>

                        <div>
                            <label
                                for="keys-status"
                                class="block text-sm font-medium mb-2"
                            >
                                Trạng thái
                            </label>

                            <select
                                id="keys-status"
                                class="border border-gray-300 rounded-lg px-3 py-2.5"
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Đang dùng</option>
                                <option value="deleted">Đã xóa</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg"
                        >
                            Tìm kiếm
                        </button>

                    </form>

                    <p
                        id="keys-count"
                        role="status"
                        class="text-sm text-gray-500"
                    ></p>

                    <div class="bg-white border border-gray-200 rounded-xl table-responsive">
                        <table>
                            <thead class="bg-gray-50">
                                <tr>
                                    <th>Khóa</th>
                                    <th>Nội dung nguồn</th>
                                    <th>Trạng thái</th>
                                    <th>Cập nhật</th>
                                </tr>
                            </thead>
                            <tbody id="keys-body"></tbody>
                        </table>
                    </div>

                <?php endif; ?>

            </section>

            <?php include __DIR__ . '/../layout/footer.php'; ?>

        </main>
    </div>

    <?php include __DIR__ . '/../ui/toast.php'; ?>
    <?php include __DIR__ . '/../ui/modal.php'; ?>

    <script src="../../assets/js/shared/api.js"></script>
    <script src="../../assets/js/shared/ui.js?v=<?php echo filemtime(__DIR__ . '/../../assets/js/shared/ui.js'); ?>"></script>
    <script src="../../assets/js/source/workspace.js?v=<?php echo filemtime(__DIR__ . '/../../assets/js/source/workspace.js'); ?>"></script>

</body>
</html>
