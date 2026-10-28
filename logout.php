<?php
require_once __DIR__ . '/config/api.php';
$pageTitle = 'Đăng xuất';
$baseUrl = '';
include __DIR__ . '/components/layout/header.php';
?>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <main class="w-full max-w-md m-4 bg-white rounded-xl shadow-sm p-6">
        <h1 class="text-xl font-semibold text-gray-900">Đăng xuất</h1>
        <p id="logout-status" class="mt-4 text-sm text-gray-600" role="status">Đang kết thúc phiên đăng nhập...</p>
        <button id="logout-retry" class="hidden mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-white" type="button">Thử lại</button>
        <a href="login.php" class="block mt-4 text-sm text-indigo-600">Về trang đăng nhập</a>
    </main>
    <script src="assets/js/shared/api.js"></script>
    <script src="assets/js/auth/logout.js"></script>
</body>
</html>
