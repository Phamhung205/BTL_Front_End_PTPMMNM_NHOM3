<?php
require_once __DIR__ . '/../../config/api.php';
$pageTitle = 'Hướng dẫn và phân quyền'; $currentPage = 'help'; $baseUrl = '../../';
include __DIR__ . '/../../components/layout/header.php';
?>
<body class="bg-gray-50 min-h-screen">
<?php include __DIR__ . '/../../components/layout/sidebar.php'; ?>
<div class="lg:ml-64"><?php include __DIR__ . '/../../components/layout/navbar.php'; ?>
<main class="pt-20 p-6 space-y-6 max-w-6xl">
<h1 class="text-2xl font-bold">Hướng dẫn và phân quyền</h1>
<section id="permissions" class="bg-white border rounded-xl p-6 space-y-3">
<h2 class="text-xl font-semibold">Admin và User có thể làm gì</h2>
<p>Admin là quyền hệ thống. Manager, Translator và Reviewer là vai trò riêng trong mỗi dự án. Backend kiểm tra quyền ở mỗi request.</p>
<div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr><th class="border p-3 text-left">Vai trò</th><th class="border p-3 text-left">Chức năng</th></tr></thead><tbody>
<tr><th class="border p-3 text-left">Admin hệ thống</th><td class="border p-3">Xem thống kê toàn hệ thống; tìm, khóa/mở khóa tài khoản; cấp/thu hồi Admin; quản lý dự án và thành viên qua trang Admin; xem nhật ký quản trị. Bảo vệ Admin cuối cùng và Manager cuối cùng. Muốn dịch/duyệt/phát hành ở workspace, Admin cũng phải tham gia dự án với vai trò phù hợp.</td></tr>
<tr><th class="border p-3 text-left">User chưa tham gia</th><td class="border p-3">Đăng nhập, tạo dự án và trở thành Manager dự án đó. Không xem hoặc sửa dự án của người khác; không dùng API Admin.</td></tr>
<tr><th class="border p-3 text-left">Manager</th><td class="border p-3">Quản lý dự án, thành viên, ngôn ngữ, nhập nguồn, so sánh phiên bản, phân công, dịch, duyệt/từ chối, tạo/xóa bản ghi dịch, xuất báo cáo, phát hành gói.</td></tr>
<tr><th class="border p-3 text-left">Translator</th><td class="border p-3">Chỉ xem và dịch các khóa Manager đã giao cho tài khoản của mình; lưu nháp/gửi duyệt, bình luận, xem lịch sử và tải gói. Không thấy việc của người dịch khác hoặc khóa chưa phân công; không duyệt/phát hành hoặc quản lý thành viên.</td></tr>
<tr><th class="border p-3 text-left">Reviewer</th><td class="border p-3">Xem, tìm kiếm, bình luận, duyệt/từ chối từng bản hoặc chọn nhiều để duyệt các bản đang chờ, xem lịch sử và tải gói. Chỉ duyệt bản đã gửi; không sửa nội dung dịch, phân công, nhập nguồn hoặc phát hành.</td></tr>
</tbody></table></div>
</section>
<section id="scenario2" class="bg-white border rounded-xl p-6 space-y-3">
<h2 class="text-xl font-semibold">Tình huống 2 — Nguồn mới đến bản phát hành mới</h2>
<ol class="list-decimal pl-6 space-y-2"><li>Manager vào Phiên bản nguồn, nhập toàn bộ snapshot mới dưới tên khác.</li><li>Chọn hai phiên bản để xem khóa thêm, sửa, xóa. Khóa không đổi giữ trạng thái; bản dịch bị ảnh hưởng cần kiểm tra lại.</li><li>Ở Bản dịch, chọn các khóa cần giao, chọn đúng tài khoản Translator rồi bấm Phân công. Có thể giao các nhóm khóa riêng cho từng người.</li><li>Translator chỉ thấy và sửa các khóa đã giao cho mình trong mục Công việc → Giao cho tôi. Khóa chưa phân công sẽ không cho Translator lưu.</li><li>Translator sửa đúng biến của nguồn mới, gửi duyệt. Reviewer kiểm tra và xác nhận.</li><li>Manager vào Phát hành, kiểm tra điều kiện rồi chốt tên phiên bản mới.</li><li>Mở Ứng dụng đọc gói, chọn lần lượt bản cũ/bản mới để đối chiếu. Bản cũ vẫn giữ nguyên nội dung.</li></ol>
<p>Dữ liệu thực hành: examples/catalog/common-web/en.json → en.v2.json; có bản dịch vi/zh cho cả hai phiên bản.</p>
</section>
<section id="api" class="bg-white border rounded-xl p-6 space-y-3">
<h2 class="text-xl font-semibold">Lấy API và import gói vào website</h2>
<p>Chạy backend local trước khi deploy để thử toàn luồng. API_BASE_URL trong .env.local trỏ về backend (mặc định http://127.0.0.1:5088). Không cần thuê API hoặc dịch vụ trả phí cho chức năng phát hành.</p>
<ol class="list-decimal pl-6 space-y-2"><li>Script phía server đăng nhập POST /api/auth/login để nhận JWT.</li><li>Manager tạo dự án, thêm ngôn ngữ/thành viên, import nguồn qua POST /api/projects/{id}/source-versions/import với versionName và rawJson.</li><li>Phân công qua PUT /api/projects/{id}/translations/assign với localeCode, stringIds và userId. Translator lưu, Reviewer duyệt từng bản hoặc duyệt hàng loạt qua POST /api/projects/{id}/translations/approve với items gồm translationId và expectedRowVersion.</li><li>Khi Manager bấm <b>Phát hành</b>, web chính tạo snapshot và API key chỉ đọc release đó, rồi hiện key cùng cấu hình đã điền để tải/copy ngay. Key chỉ hiển thị ở phiên phát hành này; tạo lại key sẽ thu hồi key cũ.</li><li>Bấm <b>Tải client tích hợp API</b> để lấy client mẫu. Dùng translation-manager.config.js được tải ở bước trước cùng translation-manager.js; nếu dùng file mẫu, điền key vào trường apiKey. Đổi apiBaseUrl khi backend được deploy.</li><li>Trong website khách hàng, gắn data-i18n="duong.dan.khoa" vào phần tử, thêm select data-translation-language, nạp hai file config/client rồi gọi TranslationManager.init(). Khi chọn ngôn ngữ, client tải JSON từ API và thay các khóa đã được gắn.</li></ol>
<p>Frontend hiện giữ JWT trong phiên PHP. Website sử dụng gói nên tải bằng script/server, không đặt JWT quản trị trong JavaScript công khai.</p>
</section>
<section id="without-json" class="bg-white border rounded-xl p-6 space-y-3">
<h2 class="text-xl font-semibold">Website chưa có JSON</h2>
<p>Tách chuỗi HTML/PHP/JS thành khóa ổn định như home.title, actions.save; đưa nội dung nguồn vào JSON lồng nhau rồi import. Thay chữ cố định trên website bằng hàm t(key) hoặc phần tử data-i18n. Nội dung biến dùng {name}, {count}; giữ nguyên biến khi dịch.</p>
<p>Xuất toàn bộ snapshot mỗi lần cập nhật nguồn. Không import riêng một mẩu vì khóa vắng trong snapshot được hiểu là đã xóa. Bài viết/sản phẩm động trong CSDL nên có bảng bản dịch riêng.</p>
<p>Ví dụ chạy độc lập: <a class="text-indigo-600" href="../../examples/website/index.html">website dùng JSON</a>. Website chỉ cần tải gói khi build hoặc cập nhật, không cần gọi API quản trị mỗi lượt xem.</p>
</section>
<?php include __DIR__ . '/../../components/layout/footer.php'; ?>
</main></div>
<script src="../../assets/js/shared/api.js"></script><script src="../../assets/js/shared/ui.js"></script>
</body></html>
