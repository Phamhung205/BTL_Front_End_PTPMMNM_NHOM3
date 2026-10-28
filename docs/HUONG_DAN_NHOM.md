# Hướng dẫn nhóm và tích hợp gói ngôn ngữ

## Tạo dự án trong một lần lưu

Trang Tạo dự án cho nhập tên, slug, ngôn ngữ nguồn, nhiều ngôn ngữ đích và danh sách email/vai trò. Email phải thuộc tài khoản đã đăng ký, đang hoạt động. Người tạo tự là Manager, không cần thêm chính mình vào danh sách. Nếu một thành viên hoặc ngôn ngữ không hợp lệ, backend rollback toàn bộ thao tác; không có dự án thiếu thành viên hoặc ngôn ngữ do lỗi giữa chừng.

`POST /api/projects` vẫn tương thích payload cũ. Payload mới:

```json
{
  "name": "Website nhóm",
  "slug": "website-nhom",
  "sourceLocaleCode": "en",
  "targetLocaleCodes": ["vi", "zh"],
  "members": [
    {"email": "translator@example.com", "role": "translator"},
    {"email": "reviewer@example.com", "role": "reviewer"}
  ]
}
```

## Phân quyền

| Quyền | Admin hệ thống | User chưa tham gia | Manager dự án | Translator dự án | Reviewer dự án |
| --- | --- | --- | --- | --- | --- |
| Tạo dự án của mình | Có | Có | Có | Có | Có |
| Quản lý người dùng, khóa/mở khóa, cấp/thu Admin | Có | Không | Không | Không | Không |
| Quản lý mọi dự án/thành viên qua trang Admin | Có | Không | Không | Không | Không |
| Xem workspace dự án | Theo tư cách thành viên | Không | Có | Có | Có |
| Quản lý nguồn/ngôn ngữ/thành viên dự án | Cần vai trò Manager | Không | Có | Không | Không |
| Phân công và tạo/xóa bản ghi dịch | Cần vai trò Manager | Không | Có | Không | Không |
| Sửa bản dịch | Cần vai trò phù hợp | Không | Có | Được giao hoặc chưa giao | Không |
| Duyệt/từ chối | Cần Manager/Reviewer | Không | Có | Không | Có |
| Bình luận, lịch sử, báo cáo, tải gói | Cần thành viên | Không | Có | Có | Có |
| Phát hành gói | Cần Manager | Không | Có | Không | Không |

Backend lấy quyền hiện tại từ CSDL mỗi request. User không thể tự cấp Admin khi đăng ký. Khóa tài khoản hoặc gỡ thành viên có hiệu lực với JWT hiện có. Không xóa/hạ Admin cuối cùng hoặc Manager hoạt động cuối cùng.

Ở trang Bản dịch, Manager thấy bộ lọc “Tất cả”, “Giao cho tôi”, “Chưa phân công” và tên những thành viên đang hoạt động có thể nhận bản dịch trong dự án đang mở (Manager/Translator). Translator không thấy bộ lọc phân công hoặc trạng thái; thay vào đó có bộ lọc “Công việc” chỉ có lựa chọn “Giao cho tôi”, nên danh sách chỉ tải các bản dịch được giao cho tài khoản hiện tại. API từ chối nếu Translator gửi ID của thành viên khác. Tên dự án không nằm trong danh sách người được giao.

Trang Admin hiện có mục **Ma trận quyền** để tìm tài khoản bằng email, xem vai trò trong từng dự án và cấp/thu quyền hệ thống. Nút **Thêm tài khoản** tạo User mặc định; chỉ chọn Admin khi cần cấp rõ ràng. Mật khẩu khởi tạo tối thiểu 12 ký tự và backend chỉ lưu bản băm. Thay đổi quyền có kiểm tra phiên bản, lưu nhật ký, chặn tự hạ quyền/tự khóa; Admin phải được thêm vào dự án riêng để dịch.

API phân quyền để trang web tích hợp:

| Thao tác | Endpoint | Quyền |
| --- | --- | --- |
| Danh mục vai trò/quyền | GET `/api/admin/roles`, `/api/admin/permissions` | Admin |
| Tra tài khoản theo email / xem tài khoản | GET `/api/admin/users/find?email=...`, `/api/admin/users/{userId}` | Admin |
| Quyền hiệu lực của tài khoản | GET `/api/admin/users/{userId}/permissions` | Admin |
| Tạo tài khoản | POST `/api/admin/users`, `{email,displayName,password,systemRole}` | Admin |
| Cấp/thu quyền Admin/User | PUT `/api/admin/users/{userId}/role`, `{role,expectedVersion}` | Admin |
| Khóa/mở tài khoản | PUT `/api/admin/users/{userId}/status`, `{isActive,expectedVersion}` | Admin |
| Quyền của chính người dùng | GET `/api/auth/permissions` | Đăng nhập |
| Quyền trong dự án | GET `/api/projects/{projectId}/permissions` | Thành viên dự án |

`systemRole` chỉ nhận `admin` hoặc `user`. `manager`, `translator`, `reviewer` là vai trò dự án và được gán riêng. Các endpoint dùng bảng `users`, `project_members` và `admin_audit` hiện có; không cần tạo bảng hay chạy SQL bổ sung.

Tạo Admin riêng cho CSDL chính đã có schema:

```powershell
.\scripts\create-local-admin.ps1
```

Email: `admin@translationmanager.local`. Mật khẩu nằm trong `.local/admin-account.json`. Script chỉ nhận CSDL `translation_manager` tại localhost:3306, không ghi đè tài khoản email khác và không tự đổi mật khẩu tài khoản đang có.

## Bộ bản dịch có sẵn và tình huống 2

`examples/catalog/common-web` có 1.010 khóa, hơn 4.000 từ tiếng Anh; `student-portal` có 170 khóa. Mỗi bộ có en/vi/zh và bản v2. Mỗi khóa có bản dịch tương ứng; biến `{name}` / `{count}` giống nhau giữa ngôn ngữ. Nội dung là nhãn/thông báo phổ biến tự biên soạn theo 50 nhóm sản phẩm, tài khoản, đơn hàng, tài liệu, công việc…; không phải dịch máy gọi API và không được mô tả là nội dung đã được người dùng thật duyệt.

Sinh lại tệp mẫu bằng `node scripts/demo/build-website-catalog.mjs`. Lệnh import dưới đây tạo ba tài khoản demo riêng, hai dự án mẫu mới và hai release mỗi dự án, không sửa dự án khác:

```powershell
$env:API_BASE_URL='http://127.0.0.1:5088'
node scripts/demo/import-website-catalog.mjs
```

Tài khoản/mật khẩu demo được sinh tại `.local/catalog-accounts.json`; kết quả và ID tại `.local/catalog-import-result.json`. Có thể chạy lại để kiểm tra/hoàn thành dữ liệu còn dở; script không đổi gói đã chốt. Nếu bạn đã tự sửa dự án mẫu, sao lưu hoặc tạo bộ dự án mới trước khi dùng script để hoàn thành lại dữ liệu mẫu.

Luồng trình diễn tình huống 2:

1. Đăng nhập Catalog Manager, vào dự án mẫu, xem release `catalog-1.0.0` bằng Ứng dụng đọc gói.
2. Hai snapshot nguồn `catalog-source-v1` và `catalog-source-v2` đã có sẵn. So sánh chúng: `home.welcome` đổi nội dung và thêm biến `{count}`, `home.help` được thêm, `actions.cancel` bị xóa. Khóa khác không đổi.
3. Khi thực hành lại từ đầu trên dự án mới: import `en.json`, hoàn tất dịch/duyệt v1; sau đó import toàn bộ `en.v2.json`. Các bản dịch bị ảnh hưởng thành needs_review hoặc chưa dịch; gói mới bị chặn.
4. Manager phân công; Translator sửa theo `vi.v2.json` / `zh.v2.json`, gửi duyệt. Reviewer xác nhận. Bản lưu từ row_version cũ trả 409.
5. Manager phát hành `catalog-2.0.0`. Mở ứng dụng đọc gói, đổi qua bản cũ và bản mới: câu chào/biến/khóa thay đổi đúng, gói v1 giữ SHA-256 ban đầu.
6. Trang Phát hành → Xuất báo cáo JSON để lấy tiến độ/điều kiện hiện tại và metadata lịch sử release. Báo cáo hiện tại không phải snapshot bất biến; các file từng release mới là snapshot bất biến.

Script import thực hiện đầy đủ cả sáu bước nghiệp vụ qua API và kiểm tra gói cũ không đổi. Bộ test `tests/project-onboarding.mjs` kiểm tra độc lập trên CSDL tạm, bao gồm lỗi rollback, quyền, nguồn đổi, xung đột và phát hành lại.

## API của Đức và kiểm thử local trước deploy

Cần chạy backend API ở local để kiểm tra import, phân công, duyệt, phát hành và website nhận gói. Không cần thêm một API dịch trả phí. Hệ thống hiện có backend tại 5088; frontend `.env.local` chỉ cần `API_BASE_URL=http://127.0.0.1:5088`. Chạy `scripts/start-xampp.ps1` để dùng MySQL 3306. Không chạy test tích hợp ghi dữ liệu QA trên CSDL chính; bộ test dùng CSDL riêng.

Hợp đồng cần thống nhất khi bàn giao phần API:

| Thao tác | Endpoint / dữ liệu chính |
| --- | --- |
| Đăng nhập từ server/script | POST `/api/auth/login`, email/password → token |
| Import nguồn | POST `/api/projects/{id}/source-versions/import`, `{versionName, rawJson}` |
| Liệt kê khóa để lấy stringId | GET `/api/projects/{id}/translations?locale=vi` |
| Nhập bản dịch có sẵn của website (Manager) | POST `/api/projects/{id}/translations/import`, `{localeCode, rawJson, status: "translated"\|"draft", overwrite}` — không tự duyệt; sai biến lưu nháp; báo cáo khóa không có trong nguồn/rỗng/giữ bản cũ |
| Phân công | PUT `/api/projects/{id}/translations/assign`, `{localeCode,stringIds,userId}` |
| Lưu/gửi duyệt | POST `/api/projects/{id}/translations`, `{stringId,localeCode,value,status,expectedRowVersion}` |
| Duyệt | POST `/api/projects/{id}/translations/{translationId}/approve`, `{expectedRowVersion}` |
| Kiểm tra điều kiện | GET `/api/projects/{id}/releases/validate` |
| Chốt | POST `/api/projects/{id}/releases`, `{versionName,note}` |
| Danh sách release | GET `/api/projects/{id}/releases` |
| JSON của một ngôn ngữ | GET `/api/projects/{id}/releases/{releaseId}/files/{locale}` |
| ZIP toàn bộ gói | GET `/api/projects/{id}/releases/{releaseId}/download` |
| Phát hành và nhận API key chỉ đọc cho release (Manager) | POST `/api/projects/{id}/releases` → trả key một lần; POST `/api/projects/{id}/releases/{releaseId}/api-key` để cấp lại/thu hồi key cũ |
| JSON khách hàng đọc bằng `X-API-Key` | GET `/api/public/releases/{releaseId}/files/{locale}` |
| ZIP tích hợp website (JSON + client + README) | GET `/api/projects/{id}/releases/{releaseId}/integration` |
| Báo cáo | GET `/api/projects/{id}/releases/report` |

Các API nghiệp vụ dùng `Authorization: Bearer TOKEN`. Với frontend PHP, gateway giữ token phía server. Website ngoài nên tải gói bằng script/server trong lúc build hoặc cập nhật, không nhúng token quản trị vào JavaScript công khai. URL API khi deploy phải đổi sang backend thực, dùng HTTPS và cấu hình origin cụ thể nếu gọi khác origin. [MDN về CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) mô tả điều kiện trình duyệt áp dụng khi gọi giữa các origin.

Tải JSON đã phát hành bằng client có sẵn:

```powershell
$env:API_BASE_URL='http://127.0.0.1:5088'
$env:TM_API_EMAIL='EMAIL_THANH_VIEN_DU_AN'
$env:TM_API_PASSWORD='MAT_KHAU_CUA_BAN'
node scripts/download-release.mjs PROJECT_ID RELEASE_ID .local/imports/goi-moi
Remove-Item Env:\TM_API_EMAIL,Env:\TM_API_PASSWORD
```

Thay ID bằng số thật trong `.local/catalog-import-result.json` hoặc response API. Thư mục đầu ra phải chưa tồn tại. Client kiểm tra SHA-256 của mọi file trước khi ghi. Copy JSON vào website hoặc chuyển bundle vào bước build, giữ tên phiên bản rõ ràng để có thể quay lại gói cũ.

Khi Manager bấm **Phát hành**, API trả snapshot release cùng key mới; trang hiện ngay key và file `translation-manager.config.js` đã điền sẵn để tải/copy. Key chỉ hiển thị một lần; dùng chức năng tạo lại sẽ thu hồi key trước đó. Bấm **Tải client tích hợp API**, giải nén ZIP gồm client, config mẫu và README. Kiểm tra `apiBaseUrl`, đặc biệt khi dùng từ máy khác hoặc sau deploy. Website khách hàng gắn `data-i18n="duong.dan.khoa"` vào phần tử HTML, thêm `<select data-translation-language>` và gọi `TranslationManager.init()`. Client gọi `/api/public/releases/{releaseId}/files/{locale}` với header `X-API-Key`, chỉ lấy snapshot đã phát hành. Key không có quyền sửa bản dịch hay đọc release khác. Website mẫu `/examples/website/index.html` cũng đọc gói JSON đã phát hành; nó chọn en/vi/zh, thay biến, tìm toàn bộ khóa, kiểm tra checksum và hiển thị bằng textContent. Trang `/pages/consumer/index.php` đọc trực tiếp gói của release được chọn qua gateway, có kiểm tra quyền dự án.

Không cần nhắn Đức để bổ sung API phát hành mới: các endpoint trên đã tồn tại trong mã nguồn. Cần thống nhất với Đức URL khi deploy, tài khoản thành viên dùng tích hợp và projectId/releaseId; đây là cấu hình của môi trường bàn giao.

## Website hiện chưa có JSON

Chọn cách chuyển dần sang khóa giao diện:

1. Lập danh sách chữ cố định ở HTML/PHP/JS: menu, nút, tiêu đề, nhãn form, thông báo. Đặt khóa theo ngữ cảnh, ví dụ `checkout.actions.pay`, không dùng nguyên câu làm khóa.
2. Tạo object JSON lồng nhau với giá trị chuỗi. `home.title` và `{"home":{"title":"..."}}` được chuẩn hóa về cùng đường dẫn; không khai báo cả hai cùng lúc. Không hỗ trợ array, null, boolean, số hay object rỗng.
3. Thay chữ cố định bằng hàm tra khóa hoặc `data-i18n`. Đưa biến động vào `{name}`, `{count}`; không tự ghép các mảnh câu dịch theo thứ tự cố định. Nếu dùng i18next, cấu hình interpolation prefix/suffix thành `{` và `}` cho khớp hệ thống, hoặc chuyển đổi đồng nhất lúc build; mặc định i18next dùng `{{name}}`. [Tài liệu interpolation](https://www.i18next.com/translation-function/interpolation).
4. Import toàn bộ nguồn, dịch/duyệt rồi tải JSON đã phát hành. Cách đọc và thay text có trong `examples/website/app.js`.
5. Bài viết hoặc mô tả sản phẩm lưu trong CSDL nên có bảng nội dung theo locale, không trộn mọi dữ liệu động vào gói nhãn UI. Không thể chỉ import JSON rồi tự động dịch một website đang hardcode chữ; website cần bước gắn khóa này.

Mỗi lần nhập nguồn là toàn bộ snapshot; khóa vắng mặt được hiểu là đã xóa. Không import một đoạn JSON nhỏ để cập nhật vài câu của dự án lớn. Trang Phiên bản nguồn cho chọn **nhiều tệp cùng lúc** (ví dụ `vi.json` + `vi 2.json`) để gộp thành một snapshot, và hộp xác nhận **xem trước** số khóa mới/sửa/giữ nguyên/sẽ bị xóa kèm danh sách khóa sẽ bị xóa trước khi nhập.

Bản dịch đã có sẵn của website (en.json, ja.json...) nhập ở trang **Bản dịch → Nhập bản dịch từ tệp JSON** cho ngôn ngữ đích đang chọn (cũng chọn được nhiều tệp). Công cụ chuẩn bị website và 3 website mẫu đã chuẩn bị sẵn: [web-sample-import/README.md](../web-sample-import/README.md) — `scripts/website-i18n/prepare-site.mjs` tách chữ HTML thành khóa + JSON nguồn, `scripts/website-i18n/js-dictionary-to-json.mjs` chuyển từ điển kiểu `languages.js` sang JSON.

Bộ kiểm thử theo 5 phép thử bắt buộc và 2 tình huống của đề tài: [PHEP_THU_BAT_BUOC.md](PHEP_THU_BAT_BUOC.md).
