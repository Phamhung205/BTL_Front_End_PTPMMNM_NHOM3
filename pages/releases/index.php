<?php
/**
 * Release / Download - Translation Manager
 * Module Phạm Thế Đức: kiểm tra điều kiện, chốt snapshot phát hành, tải file JSON / gói .zip.
 */
session_start();
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Phát hành gói ngôn ngữ';
$currentPage = 'releases';
$baseUrl = '../../';
?>
<?php include __DIR__ . '/../../components/header.php'; ?>
<body class="bg-gray-50 min-h-screen">
    <?php include __DIR__ . '/../../components/sidebar.php'; ?>

    <div class="lg:ml-64">
        <?php include __DIR__ . '/../../components/navbar.php'; ?>

        <main class="px-4 sm:px-6 lg:px-8 pt-20 lg:pt-24 pb-8 min-h-screen flex flex-col">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div class="sm:col-span-2">
                        <label for="rl-project" class="block text-xs font-medium text-gray-500 mb-1">Dự án</label>
                        <select id="rl-project" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"></select>
                    </div>
                    <div class="sm:text-right">
                        <button id="rl-refresh" type="button" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Kiểm tra lại
                        </button>
                    </div>
                </div>
            </div>

            <div id="rl-error" class="hidden mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"></div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">
                <!-- Điều kiện phát hành -->
                <section class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div class="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                        <h2 class="text-base font-semibold text-gray-900">Điều kiện phát hành</h2>
                        <span id="rl-ready-badge"></span>
                    </div>
                    <div class="p-5">
                        <p id="rl-summary" class="text-sm text-gray-600">Đang kiểm tra...</p>
                        <div id="rl-locales" class="mt-4 space-y-4"></div>
                        <ul id="rl-problems" class="hidden mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 list-disc list-inside space-y-1"></ul>
                    </div>
                </section>

                <!-- Chốt phát hành -->
                <section class="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div class="px-5 py-4 border-b border-gray-200">
                        <h2 class="text-base font-semibold text-gray-900">Chốt phát hành</h2>
                    </div>
                    <form id="rl-form" class="p-5 space-y-4" novalidate>
                        <div>
                            <label for="rl-version" class="block text-sm font-medium text-gray-700 mb-1">Tên phiên bản</label>
                            <input type="text" id="rl-version" maxlength="60" autocomplete="off"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="1.0.0">
                            <p id="rl-version-error" class="hidden mt-1 text-sm text-red-600"></p>
                        </div>
                        <div>
                            <label for="rl-note" class="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                            <textarea id="rl-note" rows="2" maxlength="1000"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ví dụ: Bản phát hành cho app 2.3"></textarea>
                        </div>
                        <button id="rl-publish" type="submit" disabled
                            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            Chốt &amp; phát hành
                        </button>
                        <p id="rl-publish-hint" class="text-xs text-gray-500"></p>
                        <p class="text-xs text-gray-400">Khi chốt, hệ thống lưu snapshot JSON của từng ngôn ngữ kèm mã SHA-256. Sửa bản dịch sau này không làm thay đổi bản đã phát hành.</p>
                    </form>
                </section>
            </div>

            <!-- Lịch sử phát hành -->
            <section class="bg-white rounded-xl shadow-sm border border-gray-200">
                <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 class="text-base font-semibold text-gray-900">Các bản đã phát hành</h2>
                    <span id="rl-release-count" class="text-sm text-gray-500"></span>
                </div>
                <div id="rl-releases-empty" class="hidden p-8 text-center text-gray-500 text-sm">Chưa có bản phát hành nào.</div>
                <div id="rl-releases-table" class="hidden table-responsive">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phiên bản</th>
                                <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phát hành</th>
                                <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nguồn</th>
                                <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số khóa</th>
                                <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File JSON</th>
                                <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gói</th>
                            </tr>
                        </thead>
                        <tbody id="rl-releases-body" class="bg-white divide-y divide-gray-100"></tbody>
                    </table>
                </div>
            </section>

            <?php include __DIR__ . '/../../components/footer.php'; ?>
        </main>
    </div>

    <!-- Xem trước file JSON -->
    <div id="rl-preview-backdrop" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40"></div>
    <div id="rl-preview" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div class="min-w-0">
                    <h3 id="rl-preview-title" class="text-lg font-semibold text-gray-900 truncate"></h3>
                    <p id="rl-preview-meta" class="text-xs text-gray-500 font-mono break-all"></p>
                </div>
                <button id="rl-preview-close" type="button" class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <pre id="rl-preview-content" class="flex-1 overflow-auto m-0 p-6 bg-gray-900 text-gray-100 text-sm font-mono whitespace-pre"></pre>
            <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button id="rl-preview-download" type="button" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Tải file</button>
            </div>
        </div>
    </div>

    <?php include __DIR__ . '/../../components/toast.php'; ?>
    <?php include __DIR__ . '/../../components/modal.php'; ?>

    <script src="../../assets/js/api.js"></script>
    <script src="../../assets/js/ui.js"></script>
    <script src="../../assets/js/translation-common.js"></script>
    <script src="../../assets/js/releases.js"></script>
</body>
</html>
