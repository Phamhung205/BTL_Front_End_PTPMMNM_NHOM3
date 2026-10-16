<?php
/**
 * Create Project Page - Translation Manager
 */
session_start();
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Tạo dự án mới';
$currentPage = 'projects';
$baseUrl = '../../';
?>
<?php include __DIR__ . '/../../components/header.php'; ?>
<body class="bg-gray-50 min-h-screen">
    <?php include __DIR__ . '/../../components/sidebar.php'; ?>
    
    <div class="lg:ml-64">
        <?php include __DIR__ . '/../../components/navbar.php'; ?>
        
        <main class="pt-16 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
            <!-- Breadcrumb -->
            <nav class="mb-6">
                <ol class="flex items-center gap-2 text-sm">
                    <li><a href="index.php" class="text-indigo-600 hover:text-indigo-800">Dự án</a></li>
                    <li class="text-gray-400">/</li>
                    <li class="text-gray-500">Tạo mới</li>
                </ol>
            </nav>

            <div class="max-w-2xl">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h2 class="text-lg font-semibold text-gray-900">Tạo dự án mới</h2>
                        <p class="text-sm text-gray-500 mt-1">Điền thông tin dự án bên dưới.</p>
                    </div>

                    <!-- Error -->
                    <div id="create-project-error" class="hidden mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-sm text-red-700 error-message"></span>
                        </div>
                    </div>

                    <form id="create-project-form" class="p-6 space-y-5" novalidate>
                        <!-- Project Name -->
                        <div>
                            <label for="project-name" class="block text-sm font-medium text-gray-700 mb-1">Tên dự án <span class="text-red-500">*</span></label>
                            <input type="text" id="project-name" name="name" required
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ví dụ: PNH eFootball">
                            <p id="name-error" class="hidden mt-1 text-sm text-red-600"></p>
                        </div>

                        <!-- Slug -->
                        <div>
                            <label for="project-slug" class="block text-sm font-medium text-gray-700 mb-1">Slug <span class="text-red-500">*</span></label>
                            <input type="text" id="project-slug" name="slug" required
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                placeholder="ví dụ: pnh-efootball">
                            <p id="slug-error" class="hidden mt-1 text-sm text-red-600"></p>
                            <p class="mt-1 text-xs text-gray-400">Chỉ chứa chữ thường, số và dấu gạch ngang. Ví dụ: pnh-efootball</p>
                        </div>

                        <!-- Description -->
                        <div>
                            <label for="project-description" class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                            <textarea id="project-description" name="description" rows="4"
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                placeholder="Mô tả ngắn về dự án..."></textarea>
                        </div>

                        <!-- Buttons -->
                        <div class="flex items-center gap-3 pt-2">
                            <button type="submit" id="create-project-btn"
                                class="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Tạo dự án
                            </button>
                            <a href="index.php" class="px-6 py-2.5 text-gray-700 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                Hủy
                            </a>
                        </div>
                    </form>
                </div>
            </div>

            <?php include __DIR__ . '/../../components/footer.php'; ?>
        </main>
    </div>

    <?php include __DIR__ . '/../../components/toast.php'; ?>

    <script src="../../assets/js/api.js"></script>
    <script src="../../assets/js/ui.js"></script>
    <script src="../../assets/js/projects.js"></script>
</body>
</html>
