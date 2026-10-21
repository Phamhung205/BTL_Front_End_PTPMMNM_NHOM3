<?php
/**
 * Translation Editor - Translation Manager
 * Module Phạm Thế Đức: dịch, lưu nháp, gửi review, phân công, bình luận, lịch sử, xử lý xung đột.
 */
session_start();
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Bản dịch';
$currentPage = 'translations';
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
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                        <label for="tr-project" class="block text-xs font-medium text-gray-500 mb-1">Dự án</label>
                        <select id="tr-project" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"></select>
                    </div>
                    <div>
                        <label for="tr-locale" class="block text-xs font-medium text-gray-500 mb-1">Ngôn ngữ đích</label>
                        <select id="tr-locale" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"></select>
                    </div>
                    <div>
                        <label for="tr-search" class="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm</label>
                        <input type="search" id="tr-search" placeholder="Khóa, chuỗi nguồn, bản dịch..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label for="tr-status" class="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                        <select id="tr-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Tất cả</option>
                            <option value="missing">Chưa dịch</option>
                            <option value="draft">Bản nháp</option>
                            <option value="translated">Chờ duyệt</option>
                            <option value="needs_review">Cần sửa lại</option>
                            <option value="approved">Đã duyệt</option>
                        </select>
                    </div>
                    <div>
                        <label for="tr-assignee" class="block text-xs font-medium text-gray-500 mb-1">Phân công</label>
                        <select id="tr-assignee" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Tất cả</option>
                        </select>
                    </div>
                </div>

                <!-- Tiến độ theo ngôn ngữ -->
                <div id="tr-progress" class="hidden mt-4 pt-4 border-t border-gray-100">
                    <div class="flex items-center justify-between text-sm mb-1">
                        <span class="text-gray-600">Tiến độ duyệt <span id="tr-progress-locale" class="font-mono font-medium text-gray-800"></span></span>
                        <span id="tr-progress-text" class="font-medium text-gray-900"></span>
                    </div>
                    <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div id="tr-progress-bar" class="h-2 bg-green-500 rounded-full" style="width: 0%"></div>
                    </div>
                    <div id="tr-progress-chips" class="flex flex-wrap gap-2 mt-3"></div>
                </div>
            </div>

            <div id="tr-role-hint" class="hidden mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800"></div>

            <!-- Phân công hàng loạt (Manager) -->
            <div id="tr-bulk" class="hidden mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span class="text-sm text-indigo-900">Đã chọn <strong id="tr-bulk-count">0</strong> khóa</span>
                    <select id="tr-bulk-assignee" class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"></select>
                    <button id="tr-bulk-assign" type="button" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">Phân công</button>
                    <button id="tr-bulk-clear" type="button" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">Bỏ chọn</button>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
                <!-- Danh sách khóa -->
                <section class="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h2 class="text-base font-semibold text-gray-900">Khóa dịch</h2>
                        <span id="tr-count" class="text-sm text-gray-500"></span>
                    </div>

                    <div id="tr-loading" class="hidden p-8">
                        <div class="flex items-center justify-center">
                            <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span class="ml-3 text-gray-500">Đang tải bản dịch...</span>
                        </div>
                    </div>

                    <div id="tr-empty" class="hidden p-8 text-center">
                        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p id="tr-empty-text" class="text-gray-500"></p>
                    </div>

                    <div id="tr-error" class="hidden p-8 text-center">
                        <svg class="w-12 h-12 text-red-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p id="tr-error-text" class="text-gray-500"></p>
                    </div>

                    <div id="tr-table" class="hidden table-responsive">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th id="tr-check-head" class="hidden px-3 py-2 w-8">
                                        <input type="checkbox" id="tr-check-all" title="Chọn tất cả" class="w-4 h-4 text-indigo-600 border-gray-300 rounded">
                                    </th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa / Nguồn</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bản dịch</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dịch</th>
                                </tr>
                            </thead>
                            <tbody id="tr-body" class="bg-white divide-y divide-gray-100"></tbody>
                        </table>
                    </div>
                </section>

                <!-- Khung dịch -->
                <aside class="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
                    <div id="ed-empty" class="p-8 text-center">
                        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                        </svg>
                        <p class="text-sm text-gray-500">Chọn một khóa trong danh sách để dịch.</p>
                        <p class="text-xs text-gray-400 mt-2">Phím tắt khi đang gõ: <kbd class="px-1 border rounded">Ctrl</kbd>+<kbd class="px-1 border rounded">S</kbd> lưu nháp, <kbd class="px-1 border rounded">Ctrl</kbd>+<kbd class="px-1 border rounded">Enter</kbd> gửi review.</p>
                    </div>

                    <div id="ed-panel" class="hidden">
                        <div class="px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p id="ed-key" class="font-mono text-sm font-semibold text-gray-900 break-all"></p>
                                <p id="ed-meta" class="text-xs text-gray-500 mt-1"></p>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <span id="ed-status"></span>
                                <button id="ed-close" type="button" title="Đóng" class="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>

                        <div class="p-4 space-y-4">
                            <div id="ed-review-note" class="hidden p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800"></div>

                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Chuỗi nguồn</span>
                                    <button id="ed-copy-source" type="button" class="text-xs text-indigo-600 hover:text-indigo-800">Chép nguồn sang bản dịch</button>
                                </div>
                                <div id="ed-source" class="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap break-words"></div>
                            </div>

                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label for="ed-value" class="text-xs font-medium text-gray-500 uppercase tracking-wider">Bản dịch (<span id="ed-locale" class="font-mono normal-case"></span>)</label>
                                    <span id="ed-counter" class="text-xs text-gray-400"></span>
                                </div>
                                <textarea id="ed-value" rows="5"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="Nhập bản dịch..."></textarea>
                                <div class="mt-2">
                                    <p class="text-xs text-gray-500 mb-1">Biến thay thế (bấm vào biến còn thiếu để chèn):</p>
                                    <div id="ed-placeholders" class="flex flex-wrap gap-1.5"></div>
                                </div>
                            </div>

                            <p id="ed-readonly" class="hidden text-sm text-gray-500 italic"></p>
                            <div id="ed-msg" class="hidden"></div>

                            <!-- Xung đột 409 -->
                            <div id="ed-conflict" class="hidden p-3 rounded-lg bg-red-50 border border-red-200">
                                <p class="text-sm font-semibold text-red-800">Có người khác đã sửa bản dịch này</p>
                                <p id="ed-conflict-meta" class="text-xs text-red-700 mt-1"></p>
                                <div class="mt-2 p-2 bg-white rounded border border-red-100">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="text-xs text-gray-500">Bản mới nhất trên máy chủ</span>
                                        <span id="ed-conflict-status"></span>
                                    </div>
                                    <p id="ed-conflict-value" class="text-sm text-gray-800 whitespace-pre-wrap break-words"></p>
                                </div>
                                <div class="flex flex-wrap gap-2 mt-3">
                                    <button id="ed-conflict-take" type="button" class="px-3 py-1.5 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-lg">Dùng bản mới nhất</button>
                                    <button id="ed-conflict-overwrite" type="button" class="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg">Giữ bản của tôi và ghi đè</button>
                                </div>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <button id="ed-save-draft" type="button" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Lưu nháp</button>
                                <button id="ed-submit" type="button" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Gửi review</button>
                            </div>

                            <!-- Phân công (Manager) -->
                            <div id="ed-assign-wrap" class="hidden pt-4 border-t border-gray-100">
                                <label for="ed-assign-select" class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phân công người dịch</label>
                                <div class="flex gap-2">
                                    <select id="ed-assign-select" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"></select>
                                    <button id="ed-assign-btn" type="button" class="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg disabled:opacity-50">Cập nhật</button>
                                </div>
                            </div>
                        </div>

                        <!-- Bình luận / Lịch sử -->
                        <div class="border-t border-gray-200">
                            <nav class="flex px-4">
                                <button id="ed-tab-comments" type="button" class="px-3 py-2 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600">Bình luận <span id="ed-comment-count"></span></button>
                                <button id="ed-tab-history" type="button" class="px-3 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">Lịch sử</button>
                            </nav>
                            <div id="ed-pane-comments" class="p-4">
                                <div id="ed-comment-list" class="space-y-3"></div>
                                <div id="ed-comment-form" class="hidden mt-4">
                                    <textarea id="ed-comment-body" rows="2" maxlength="2000" placeholder="Viết bình luận cho người dịch / reviewer..."
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                                    <div class="flex justify-end mt-2">
                                        <button id="ed-comment-send" type="button" class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">Gửi bình luận</button>
                                    </div>
                                </div>
                            </div>
                            <div id="ed-pane-history" class="hidden p-4">
                                <ol id="ed-history-list" class="space-y-3"></ol>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <?php include __DIR__ . '/../../components/footer.php'; ?>
        </main>
    </div>

    <?php include __DIR__ . '/../../components/toast.php'; ?>
    <?php include __DIR__ . '/../../components/modal.php'; ?>

    <script src="../../assets/js/api.js"></script>
    <script src="../../assets/js/ui.js"></script>
    <script src="../../assets/js/translation-common.js"></script>
    <script src="../../assets/js/translations.js"></script>
</body>
</html>
