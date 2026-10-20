<?php
/**
 * Review / Approve - Translation Manager
 * Module Phạm Thế Đức: duyệt, từ chối (kèm lý do), bình luận bản dịch.
 */
session_start();
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Đánh giá bản dịch';
$currentPage = 'reviews';
$baseUrl = '../../';
?>
<?php include __DIR__ . '/../../components/header.php'; ?>
<body class="bg-gray-50 min-h-screen">
    <?php include __DIR__ . '/../../components/sidebar.php'; ?>

    <div class="lg:ml-64">
        <?php include __DIR__ . '/../../components/navbar.php'; ?>

        <main class="px-4 sm:px-6 lg:px-8 pt-20 lg:pt-24 pb-8 min-h-screen flex flex-col">
            <!-- Bộ lọc -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="rv-project" class="block text-xs font-medium text-gray-500 mb-1">Dự án</label>
                        <select id="rv-project" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"></select>
                    </div>
                    <div>
                        <label for="rv-locale" class="block text-xs font-medium text-gray-500 mb-1">Ngôn ngữ đích</label>
                        <select id="rv-locale" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"></select>
                    </div>
                    <div>
                        <label for="rv-search" class="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm</label>
                        <input type="search" id="rv-search" placeholder="Khóa, chuỗi nguồn, bản dịch..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                </div>
                <nav id="rv-tabs" class="flex flex-wrap gap-2 mt-4"></nav>
            </div>

            <div id="rv-role-hint" class="hidden mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800"></div>

            <!-- Duyệt hàng loạt -->
            <div id="rv-bulk" class="hidden mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label class="inline-flex items-center gap-2 text-sm text-green-900">
                        <input type="checkbox" id="rv-check-all" class="w-4 h-4 text-green-600 border-gray-300 rounded">
                        Chọn tất cả bản dịch hợp lệ
                    </label>
                    <span class="text-sm text-green-900">Đã chọn <strong id="rv-bulk-count">0</strong></span>
                    <button id="rv-bulk-approve" type="button" class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">Duyệt các mục đã chọn</button>
                </div>
            </div>

            <div id="rv-loading" class="hidden bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div class="flex items-center justify-center">
                    <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span class="ml-3 text-gray-500">Đang tải...</span>
                </div>
            </div>

            <div id="rv-empty" class="hidden bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                <p id="rv-empty-text" class="text-gray-500"></p>
            </div>

            <div id="rv-error" class="hidden bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p id="rv-error-text" class="text-gray-500"></p>
            </div>

            <div id="rv-list" class="space-y-3"></div>

            <?php include __DIR__ . '/../../components/footer.php'; ?>
        </main>
    </div>

    <?php include __DIR__ . '/../../components/toast.php'; ?>
    <?php include __DIR__ . '/../../components/modal.php'; ?>

    <script src="../../assets/js/api.js"></script>
    <script src="../../assets/js/ui.js"></script>
    <script src="../../assets/js/translation-common.js"></script>
    <script src="../../assets/js/reviews.js"></script>
</body>
</html>
