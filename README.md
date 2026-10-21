# Translation Manager Frontend

PHP dựng HTML; JavaScript gọi backend ASP.NET Core bằng JSON và JWT. Các component giao diện được dùng chung trong `components/`.

## Chạy local

Yêu cầu PHP 8 trở lên. Tại thư mục frontend:

```powershell
# Với PHP của XAMPP:
& C:/xampp/php/php.exe -S 127.0.0.1:3000 -t .
```

Mở http://127.0.0.1:3000. Backend mặc định: http://localhost:5088. Có thể đặt biến môi trường `API_BASE_URL` trước khi chạy PHP. File `.env.example` chỉ là tài liệu mẫu, ứng dụng chưa tự đọc `.env`.

Backend phải cấu hình `FrontendOrigins` cho phép `http://127.0.0.1:3000` khi dùng API thật (đã có trong cấu hình backend mẫu). Đăng nhập để lưu JWT trong sessionStorage. Không lưu thông tin đăng nhập hay mật khẩu trong mã nguồn.

## Phần Bùi Đình Mạnh

| Trang | Đường dẫn |
| --- | --- |
| Ngôn ngữ | `/pages/languages/index.php` |
| Khóa nguồn | `/pages/translation-keys/index.php` |
| Phiên bản nguồn | `/pages/source-versions/index.php` |
| Import JSON | `/pages/source-versions/import.php` |
| Thay đổi phiên bản | `/pages/source-versions/changes.php?version_id=2` |

Chọn dự án ở đầu trang; lựa chọn đi theo liên kết trong module. Chỉ manager được thêm/sửa/gỡ ngôn ngữ và import nguồn. Backend vẫn phải kiểm tra quyền ở máy chủ.

Import hỗ trợ JSON object lồng nhau với giá trị chuỗi; Unicode và placeholder `{name}`, `{count}`. Không chấp nhận mảng, số, boolean, null, khóa rỗng, có khoảng trắng đầu/cuối hoặc chứa dấu chấm. Giới hạn: 2 MB, 64 cấp lồng nhau, đường dẫn khóa 500 ký tự, nội dung mỗi chuỗi 10000 ký tự. Backend cũng từ chối thuộc tính JSON bị lặp. File phải chứa toàn bộ phiên bản nguồn. Có xem trước và xác nhận việc đánh dấu xóa khóa vắng mặt. Sửa JSON, tên phiên bản hoặc đổi dự án sẽ hủy bản xem trước.

## Xem thử không cần backend

Mở http://127.0.0.1:3000/pages/languages/index.php?demo=1

Chế độ `demo=1` chỉ bật trên localhost/127.0.0.1/::1, hiển thị nhãn rõ ràng, không gọi API hoặc ghi DB. Dữ liệu giả được lưu trong sessionStorage riêng (`tm_manh_preview_v1`); nút **Khôi phục mẫu** trả về dữ liệu ban đầu. Có hai dự án mẫu, thêm/sửa/gỡ ngôn ngữ, tìm khóa, import và xem diff qua nhiều phiên bản. Dữ liệu mẫu này phục vụ xem giao diện, chưa phải bộ dữ liệu nghiệm thu 100 khóa/dự án.

Nút **Dùng API thật** tắt demo. Nếu chưa đăng nhập hoặc backend thiếu endpoint, trang hiển thị trạng thái tương ứng; không tự chuyển sang dữ liệu giả.

## API sử dụng

Prefix: `/api/projects/{projectId}`. Response danh sách là mảng JSON; cũng chấp nhận `{items: [...]}` hoặc `{data: [...]}`. `projectId` lấy từ `GET /api/projects`, mỗi dự án có `id`, `name`, `role`, `sourceLocaleCode`.

| Method / path | Payload hoặc response | Backend hiện có |
| --- | --- | --- |
| `GET /locales` | `[{code, name, isSource}]` | Có |
| `POST /locales` | `{localeCode}`; tên được backend đặt theo mã | Có |
| `PUT /locales/{code}` | `{name}`; sửa tên riêng cho dự án | Có, cần migration 003 |
| `DELETE /locales/{code}` | Gỡ khỏi dự án; chặn nếu có bản dịch/phân công hoặc release | Có |
| `GET /translation-keys` | `[{id, key, sourceText, status}]`, status `active/deleted` | Có |
| `GET /source-versions` | `[{id, versionName, importedAt, importedBy, keyCount, added, changed, deleted}]`; importedBy là tên hiển thị | Có |
| `POST /source-versions/import` | `{versionName, data}` → `{versionId, versionName, total, added, changed, unchanged, deleted}` | Có |
| `GET /source-versions/{id}/changes` | `[{type, key, oldValue, newValue}]` | Có |

Các trường đếm và người import trong danh sách phiên bản có thể vắng mặt; UI dùng dấu `—` thay vì tự suy ra số. Nếu chưa tải được khóa hiện tại, import vẫn kiểm tra cú pháp nhưng ghi rõ chưa thể dự báo diff. Backend là nơi quyết định kết quả import cuối cùng.

Backend của Mạnh đã có các API tương ứng. Với CSDL cũ, chạy `database/migrations/003_manh_source_management.sql` của backend trước khi dùng. Tên ngôn ngữ đích được đặt tự động khi thêm; có thể sửa tên riêng cho từng dự án. Production không hỗ trợ PHP mặc định trên mọi nền tảng, cần chọn hosting/runtime phù hợp trước khi deploy.

## Kiểm tra xử lý JSON và dữ liệu xem thử

Yêu cầu Node.js 18 trở lên; không cần cài npm package:

```powershell
node --test tests/source-data.test.mjs
```

Kiểm tra JSON lồng nhau/Unicode, từ chối dữ liệu sai kiểu, import lại không nhân đôi, xóa/khôi phục khóa, lịch sử phiên bản giữ nguyên, dữ liệu độc lập giữa dự án và tên phiên bản trùng trả 409. Các test này kiểm tra frontend và dữ liệu xem thử; không thay thế test API/CSDL thật.
