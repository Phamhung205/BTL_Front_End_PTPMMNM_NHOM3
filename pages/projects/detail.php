<?php
/**
 * Project Detail Page - Translation Manager
 */
session_start();
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Chi tiết dự án';
$currentPage = 'projects';
$baseUrl = '../../';
?>
<?php include __DIR__ . '/../../components/header.php'; ?>
<body class="bg-gray-50 min-h-screen">
    <?php include __DIR__ . '/../../components/sidebar.php'; ?>
    
    <div class="lg:ml-64">
        <?php include __DIR__ . '/../../components/navbar.php'; ?>
        
        <main class="pt-16 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
            <div id="project-detail-container">
                <!-- Breadcrumb -->
                <nav class="mb-6">
                    <ol class="flex items-center gap-2 text-sm">
                        <li><a href="index.php" class="text-indigo-600 hover:text-indigo-800">Dự án</a></li>
                        <li class="text-gray-400">/</li>
                        <li class="text-gray-500">Chi tiết</li>
                    </ol>
                </nav>

                <!-- Loading -->
                <div id="project-detail-loading" class="hidden">
                    <div class="flex items-center justify-center py-16">
                        <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span class="ml-3 text-gray-500">Đang tải thông tin dự án...</span>
                    </div>
                </div>

                <!-- Error -->
                <div id="project-detail-error" class="hidden">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <svg class="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 mb-1">Có lỗi xảy ra</h3>
                        <p class="text-gray-500 error-message mb-4">Không thể tải thông tin dự án.</p>
                        <a href="index.php" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                            ← Quay lại danh sách
                        </a>
                    </div>
                </div>

                <!-- Content -->
                <div id="project-detail-content" class="hidden">
                    <!-- Project Info Card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div class="p-6">
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <h2 id="detail-project-name" class="text-xl font-bold text-gray-900">--</h2>
                                    <div class="flex flex-wrap items-center gap-3 mt-2">
                                        <span class="inline-flex items-center gap-1 text-sm text-gray-500">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                            </svg>
                                            <span id="detail-project-slug" class="font-mono">--</span>
                                        </span>
                                        <span id="detail-project-role" class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">--</span>
                                        <span class="inline-flex items-center gap-1 text-sm text-gray-500">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <span id="detail-project-date">--</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p id="detail-project-description" class="mt-4 text-sm text-gray-600">--</p>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div class="border-b border-gray-200">
                            <nav class="flex gap-0 px-6">
                                <button data-tab="overview" class="px-4 py-3 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600">
                                    Tổng quan
                                </button>
                                <button data-tab="members" class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                                    Thành viên
                                </button>
                            </nav>
                        </div>

                        <!-- Tab: Overview -->
                        <div data-tab-content="overview" class="p-6">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <p class="text-sm text-gray-500">Tên dự án</p>
                                    <p id="overview-name" class="text-sm font-medium text-gray-900 mt-1">--</p>
                                </div>
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <p class="text-sm text-gray-500">Slug</p>
                                    <p id="overview-slug" class="text-sm font-medium text-gray-900 mt-1 font-mono">--</p>
                                </div>
                                <div class="bg-gray-50 rounded-lg p-4 sm:col-span-2">
                                    <p class="text-sm text-gray-500">Mô tả</p>
                                    <p id="overview-description" class="text-sm font-medium text-gray-900 mt-1">--</p>
                                </div>
                            </div>
                        </div>

                        <!-- Tab: Members -->
                        <div data-tab-content="members" class="hidden">
                            <!-- Members Header -->
                            <div class="px-6 py-4 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-base font-semibold text-gray-900">Danh sách thành viên</h3>
                                    <button onclick="openAddMemberModal()" 
                                        class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        Thêm thành viên
                                    </button>
                                </div>
                            </div>

                            <!-- Members Loading -->
                            <div id="members-loading" class="hidden p-8">
                                <div class="flex items-center justify-center">
                                    <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    <span class="ml-3 text-gray-500">Đang tải danh sách thành viên...</span>
                                </div>
                            </div>

                            <!-- Members Empty -->
                            <div id="members-empty" class="hidden p-8 text-center">
                                <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                                <p class="text-gray-500">Chưa có thành viên nào.</p>
                            </div>

                            <!-- Members Error -->
                            <div id="members-error" class="hidden p-8 text-center">
                                <svg class="w-12 h-12 text-red-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <p class="text-gray-500 error-message">Không thể tải danh sách thành viên.</p>
                            </div>

                            <!-- Members Table -->
                            <div id="members-table" class="hidden">
                                <div class="table-responsive">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành viên</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tham gia</th>
                                            </tr>
                                        </thead>
                                        <tbody id="members-body" class="bg-white divide-y divide-gray-200">
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <?php include __DIR__ . '/../../components/footer.php'; ?>
        </main>
    </div>

    <?php include __DIR__ . '/../../components/toast.php'; ?>
    <?php include __DIR__ . '/../../components/modal.php'; ?>

    <script src="../../assets/js/api.js"></script>
    <script src="../../assets/js/ui.js"></script>
    <script src="../../assets/js/projects.js"></script>
    <script src="../../assets/js/members.js"></script>
    <script>
        // Also populate overview tab when project loads
        const origLoadDetail = loadProjectDetail;
        loadProjectDetail = async function() {
            await origLoadDetail();
            // Copy detail values to overview tab
            const nameEl = document.getElementById('detail-project-name');
            const slugEl = document.getElementById('detail-project-slug');
            const descEl = document.getElementById('detail-project-description');
            if (nameEl) { const ov = document.getElementById('overview-name'); if (ov) ov.textContent = nameEl.textContent; }
            if (slugEl) { const ov = document.getElementById('overview-slug'); if (ov) ov.textContent = slugEl.textContent; }
            if (descEl) { const ov = document.getElementById('overview-description'); if (ov) ov.textContent = descEl.textContent; }
        };
    </script>
</body>
</html>
