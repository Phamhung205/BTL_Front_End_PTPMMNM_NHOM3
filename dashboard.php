<?php
/**
 * Dashboard Page - Translation Manager
 */
require_once __DIR__ . '/config/api.php';
$pageTitle = 'Dashboard';
$currentPage = 'dashboard';
$baseUrl = '';
?>
<?php include __DIR__ . '/components/layout/header.php'; ?>
<body class="bg-gray-50 min-h-screen">
    <?php include __DIR__ . '/components/layout/sidebar.php'; ?>
    
    <div class="lg:ml-64">
        <?php include __DIR__ . '/components/layout/navbar.php'; ?>
        
        <main class="pt-16 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <!-- Total Projects -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500">Dự án tham gia</p>
                            <p id="stat-total-projects" class="text-2xl font-bold text-gray-900 mt-1">--</p>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl">
                            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- My Projects -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500">Dự án quản lý</p>
                            <p id="stat-my-projects" class="text-2xl font-bold text-gray-900 mt-1">--</p>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
                            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Total Languages -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500">Tổng ngôn ngữ</p>
                            <p id="stat-total-languages" class="text-2xl font-bold text-gray-900 mt-1">--</p>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-xl">
                            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Pending Translations -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500">Bản dịch cần xử lý</p>
                            <p id="stat-pending-translations" class="text-2xl font-bold text-gray-900 mt-1">--</p>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl">
                            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <p id="dashboard-stats-note" role="alert" class="hidden text-sm text-red-600 mb-4"></p>
            <!-- Recent Projects -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-semibold text-gray-900">Dự án gần đây</h2>
                        <a href="pages/projects/index.php" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Xem tất cả →</a>
                    </div>
                </div>

                <!-- Loading -->
                <div id="recent-projects-loading" class="hidden p-8">
                    <div class="flex items-center justify-center">
                        <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span class="ml-3 text-gray-500">Đang tải dữ liệu...</span>
                    </div>
                </div>

                <!-- Empty State -->
                <div id="recent-projects-empty" class="hidden p-8 text-center">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    <p class="text-gray-500">Chưa có dự án nào.</p>
                    <a href="pages/projects/create.php" class="inline-flex items-center mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        + Tạo dự án mới
                    </a>
                </div>

                <!-- Error State -->
                <div id="recent-projects-error" class="hidden p-8 text-center">
                    <svg class="w-12 h-12 text-red-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-gray-500 error-message">Không thể tải dữ liệu.</p>
                    <button onclick="loadRecentProjects()" class="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">Thử lại</button>
                </div>

                <!-- Table -->
                <div id="recent-projects-table" class="hidden">
                    <div class="table-responsive">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên dự án</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="recent-projects-body" class="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <?php include __DIR__ . '/components/layout/footer.php'; ?>
        </main>
    </div>

    <?php include __DIR__ . '/components/ui/toast.php'; ?>
    <?php include __DIR__ . '/components/ui/modal.php'; ?>

    <script src="assets/js/shared/api.js"></script>
    <script src="assets/js/shared/ui.js"></script>
    <script src="assets/js/dashboard/index.js"></script>
</body>
</html>
