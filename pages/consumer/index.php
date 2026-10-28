<?php
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Ứng dụng đọc gói ngôn ngữ'; $currentPage = 'releases'; $baseUrl = '../../';
include __DIR__ . '/../../components/layout/header.php';
?>
<body class="bg-gray-50 min-h-screen">
<?php include __DIR__ . '/../../components/layout/sidebar.php'; ?>
<div class="lg:ml-64">
<?php include __DIR__ . '/../../components/layout/navbar.php'; ?>
<main class="pt-20 p-6 space-y-5">
    <h1 class="text-2xl font-bold">Ứng dụng đọc gói ngôn ngữ</h1>
    <p>Chọn một bản phát hành để xem website dùng đúng nội dung đã chốt, kể cả khi bản dịch hiện tại tiếp tục thay đổi.</p>
    <form id="consumer-form" class="bg-white border rounded-xl p-5 flex flex-wrap gap-4 items-end">
        <label>Dự án<select id="consumer-project" class="block border rounded p-2" required></select></label>
        <label>Bản phát hành<select id="consumer-release" class="block border rounded p-2" required></select></label>
        <label>Ngôn ngữ<select id="consumer-locale" class="block border rounded p-2" required></select></label>
        <label>Tên thay thế {name}<input id="consumer-name" value="Minh" maxlength="80" class="block border rounded p-2"></label>
        <label>Số lượng {count}<input id="consumer-count" type="number" value="3" min="0" max="1000000" class="block border rounded p-2"></label>
        <button class="bg-indigo-600 text-white rounded px-4 py-2">Đọc gói</button>
    </form>
    <p id="consumer-status" role="status" class="text-sm whitespace-pre-wrap"></p>
    <article id="consumer-preview" class="bg-white border rounded-xl p-6 space-y-4" aria-label="Website dùng gói phát hành"></article>
    <details class="bg-white border rounded-xl p-5"><summary class="cursor-pointer font-medium">Toàn bộ khóa trong gói</summary><div id="consumer-strings" class="grid gap-3 mt-4"></div></details>
    <p><a href="../help/index.php#api" class="text-indigo-600">Hướng dẫn lấy API và import gói vào website</a></p>
    <?php include __DIR__ . '/../../components/layout/footer.php'; ?>
</main></div>
<?php include __DIR__ . '/../../components/ui/toast.php'; ?>
<script src="../../assets/js/shared/api.js"></script>
<script src="../../assets/js/shared/ui.js"></script>
<script src="../../assets/js/consumer/index.js"></script>
</body></html>
