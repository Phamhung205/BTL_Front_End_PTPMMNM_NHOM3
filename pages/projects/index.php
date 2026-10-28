<?php
/**
 * Project List Page - Translation Manager
 */
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Danh sách dự án';
$currentPage = 'projects';
$baseUrl = '../../';
?>
<?php include __DIR__ . '/../../components/layout/header.php'; ?>
<body class="bg-gray-50 min-h-screen">
    <?php include __DIR__ . '/../../components/layout/sidebar.php'; ?>
    
    <div class="lg:ml-64">
        <?php include __DIR__ . '/../../components/layout/navbar.php'; ?>
        
        <main class="pt-16 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
            <div id="project-list-container" class="bg-white rounded-xl shadow-sm border border-gray-200">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h2 class="text-lg font-semibold text-gray-900">Danh sách dự án</h2>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <!-- Search -->
                            <div class="relative">
                                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                                <input type="search" id="project-search" aria-label="Tìm kiếm dự án"
                                    class="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Tìm kiếm dự án...">
                            </div>
                            <!-- Create Button -->
                            <a href="create.php" 
                                class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                                Tạo dự án
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div id="project-list-loading" class="hidden p-8">
                    <div class="flex items-center justify-center">
                        <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span class="ml-3 text-gray-500">Đang tải danh sách dự án...</span>
                    </div>
                </div>

                <!-- Empty State -->
                <div id="project-list-empty" class="hidden p-8 text-center">
                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có dự án nào</h3>
                    <p class="text-gray-500 mb-4">Bắt đầu bằng cách tạo dự án đầu tiên.</p>
                    <a href="create.php" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Tạo dự án mới
                    </a>
                </div>

                <!-- Error State -->
                <div id="project-list-error" class="hidden p-8 text-center">
                    <svg class="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-1">Có lỗi xảy ra</h3>
                    <p class="text-gray-500 error-message mb-4">Không thể tải danh sách dự án.</p>
                    <button onclick="loadProjectList()" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                        Thử lại
                    </button>
                </div>

                <!-- Table -->
                <div id="project-list-table" class="hidden">
                    <div class="table-responsive">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên dự án</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngôn ngữ nguồn</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="project-list-body" class="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <?php include __DIR__ . '/../../components/layout/footer.php'; ?>
        </main>
    </div>

    <?php include __DIR__ . '/../../components/ui/toast.php'; ?>
    <?php include __DIR__ . '/../../components/ui/modal.php'; ?>

    <script src="../../assets/js/shared/api.js"></script>
    <script src="../../assets/js/shared/ui.js"></script>
    <script src="../../assets/js/projects/index.js"></script>
</body>
</html>
