# Translation Manager Backend

Cập nhật 22/10/2026: đã đồng bộ các API Ngôn ngữ / Phiên bản nguồn / Translation Keys từ Backend độc lập và nối ba màn hình Frontend. Nhập nguồn chấp nhận `{versionName,rawJson}` hoặc payload cũ `{versionName,data}`; không gửi cả hai. `rawJson` giữ nguyên khóa bị lặp để C# kiểm tra. Nội dung nguồn tối đa 2 MB UTF-8. CSDL cũ cần `database/migrations/003_manh_source_management.sql`; SQL do người dùng tự chạy. Xem `SOURCE_WORKSPACE.md` tại thư mục Frontend để biết cách dùng và kiểm tra.

Bản tích hợp ngày 20/10/2026: bổ sung sửa/xóa dự án, đổi vai trò/xóa thành viên, thêm thành viên bằng email, bảo vệ Manager cuối cùng và sửa lỗi nullable để build. Không cần đổi schema. Hướng dẫn đầy đủ và kết quả test nằm trong `BACKEND_INTEGRATION.md` ở thư mục Frontend đi kèm.

Backend riêng cho BTL **Xây dựng hệ thống quản lý bản dịch và phát hành gói ngôn ngữ cho phần mềm**.

## Công nghệ

- C# / ASP.NET Core Web API (`net10.0`)
- MySQL/MariaDB chạy bằng **XAMPP** (mặc định `127.0.0.1:3306`)
- `MySqlConnector`
- JWT Authentication
- Không chứa PHP và không chứa giao diện Frontend.

> Lưu ý học phần: tài liệu BTL gốc nêu PHP + PostgreSQL/MySQL là yêu cầu kỹ thuật chung. Nếu dùng C# cho backend, nhóm nên xin giảng viên duyệt công nghệ khác trước khi nộp chính thức.

## Chức năng backend hiện có

- Đăng ký / đăng nhập, JWT.
- Project và thành viên theo vai trò `manager`, `translator`, `reviewer`.
- Gắn nhiều locale vào project.
- Nhập JSON nguồn dạng object lồng nhau; flatten thành key path.
- Nhận biết key mới, thay đổi, xóa, khôi phục theo source version.
- Khi source thay đổi, translation liên quan chuyển `needs_review`.
- Danh sách/search/filter translation.
- Lưu draft/translated.
- Kiểm tra placeholder như `{name}`, `{count}`.
- Phân công người dịch, comment.
- Review approve/reject theo quyền.
- Optimistic concurrency bằng `row_version`: hai người sửa cùng bản dịch sẽ trả HTTP 409 thay vì ghi đè.
- Kiểm tra điều kiện phát hành.
- Chốt release và snapshot JSON trong DB; sửa translation hiện tại không thay đổi release cũ.
- Download lại JSON từ release đã chốt.

## CSDL XAMPP

1. Mở XAMPP, Start **MySQL**.
2. Mở phpMyAdmin hoặc MySQL client.
3. Chạy `database/schema.sql`.
4. Chạy `database/seed.sql`.

Connection mặc định:

```text
Server=127.0.0.1
Port=3306
Database=translation_manager
User=root
Password=(trống theo XAMPP mặc định)
```

Nếu MySQL của bạn có mật khẩu, sửa `ConnectionStrings__Default` bằng biến môi trường hoặc `appsettings.json` khi chạy local. Không commit mật khẩu thật.

## Chạy backend

Yêu cầu .NET 10 SDK:

Để chạy cùng Frontend XAMPP: Start Apache/MySQL trong XAMPP, chọn File → Open → Project/Solution trong Visual Studio và mở **TranslationManager.Backend.sln**, chọn profile **http** rồi F5. Nếu đang dừng ở exception, nhấn Shift+F5 trước khi mở Solution. Profile http đặt cả ASPNETCORE_ENVIRONMENT và DOTNET_ENVIRONMENT thành Development. Backend chạy tại http://127.0.0.1:5088; Frontend tại http://localhost:8081/TranslationManager.Frontend/. Nạp database/schema.sql và database/seed.sql nếu database chưa có.

Development tự tạo khóa JWT ngẫu nhiên tại .local/jwt.key khi chưa cấu hình Jwt:Key. Production yêu cầu Jwt__Key qua biến môi trường với ít nhất 32 byte. ConnectionStrings__Default cần khớp DB của bạn; mặc định dùng XAMPP 127.0.0.1:3306. .env.example chỉ là mẫu, ASP.NET không tự tải. Bộ scripts/start-integrated.ps1 tại Frontend là phương án kiểm thử riêng ở MySQL 3307, không cần dùng khi chạy F5 + XAMPP.

```powershell
dotnet restore
dotnet run
```

Mặc định profile HTTP:

```text
http://localhost:5088
```

Kiểm tra:

```text
GET http://localhost:5088/health
```

## API chính

```text
POST /api/auth/register
POST /api/auth/login

GET  /api/projects
POST /api/projects
PUT  /api/projects/{projectId}
DELETE /api/projects/{projectId}
GET  /api/projects/{projectId}/members
POST /api/projects/{projectId}/members
PUT  /api/projects/{projectId}/members/{userId}
DELETE /api/projects/{projectId}/members/{userId}
GET  /api/projects/{projectId}/locales
POST /api/projects/{projectId}/locales

POST /api/projects/{projectId}/source-versions/import
GET  /api/projects/{projectId}/source-versions/{versionId}/changes

GET  /api/projects/{projectId}/translations?locale=en&q=&status=
POST /api/projects/{projectId}/translations
PUT  /api/projects/{projectId}/translations/{translationId}/assign
POST /api/projects/{projectId}/translations/{translationId}/comments
POST /api/projects/{projectId}/translations/{translationId}/approve
POST /api/projects/{projectId}/translations/{translationId}/reject

GET  /api/projects/{projectId}/releases/validate
GET  /api/projects/{projectId}/releases
POST /api/projects/{projectId}/releases
GET  /api/projects/{projectId}/releases/{releaseId}/files/{locale}
```

## Tách Frontend / Backend

Project này là **Backend độc lập**. Frontend PHP/HTML/Tailwind/JavaScript sẽ nằm ở project khác và chỉ gọi HTTP API của backend.

```text
Frontend
   |
   | HTTP + JSON + JWT
   v
C# ASP.NET Core Backend
   |
   v
MySQL/MariaDB (XAMPP)
```

## Deploy

- `Dockerfile`: thuận tiện cho Northflank/container hosting.
- `web.config`: dùng khi publish ASP.NET Core lên Windows/IIS như hosting hỗ trợ ASP.NET.
- Frontend có thể deploy riêng; backend chỉ cần đặt `FrontendOrigins`, connection string và JWT bằng biến môi trường.

## Cấu trúc

```text
TranslationManager.Backend/
├── Controllers/
├── Data/
├── Dtos/
├── Models/
├── Services/
├── Support/
├── database/
├── storage/releases/
├── Program.cs
├── TranslationManager.Api.csproj
├── appsettings.json
├── Dockerfile
├── web.config
└── README.md
```

## Hoàn thiện giao diện và API hỗ trợ — 25/10/2026

Frontend đã nối đầy đủ Translation/Review/Release, phân công hàng loạt, bình luận, xử lý xung đột rowVersion và tải JSON/ZIP qua phiên PHP có CSRF. Danh sách bản dịch trả canEdit theo quyền hiện tại của người đăng nhập.

API bổ sung trong WorkspaceController:
- GET /api/dashboard/stats: projects, managedProjects, languages, pendingTranslations; chỉ thống kê các dự án hiện tham gia.
- GET /api/projects/{projectId}/activity?page=1: {items,page,hasMore}; tối đa 50 hoạt động mỗi trang, gồm nguồn, bản dịch, phân công, đánh giá, bình luận và phát hành.

Nếu CSDL MariaDB đã có đủ bảng nhưng dùng schema cũ, cần migration 002 rồi 003. Controller mới không thêm bảng. Lượt này migration chỉ được chạy trên database kiểm thử riêng ở cổng 3307, không sửa database XAMPP cổng 3306.

Hai Backend build thành công. Bộ Translation/Release đạt 13/13 nhóm, Source/Locale đạt 10/10 nhóm; luồng đầy đủ qua gateway đạt 53/53 kiểm tra trên MariaDB kiểm thử. Chi tiết sử dụng ở docs/FEATURES.md trong Frontend.

## Admin hệ thống và demo

Migration 004_system_admin.sql bổ sung users.system_role/is_active/security_version, system_admin_guard và admin_audit. API /api/admin/* yêu cầu policy SystemAdmin; JWT đọc lại quyền và trạng thái người dùng trên mỗi request. GET /api/auth/me trả danh tính hiện tại. Vai trò Admin độc lập với manager/translator/reviewer của dự án.

Admin quản lý tài khoản, khóa/mở, vai trò hệ thống, toàn bộ dự án/thành viên và đọc nhật ký. Bảo vệ Admin đang hoạt động cuối cùng và Manager đang hoạt động cuối cùng. Không tự cấp quyền Admin qua đăng ký công khai.

Admin đầu tiên được tạo bằng CLI --bootstrap-admin với BootstrapAdmin__Email, BootstrapAdmin__DisplayName, BootstrapAdmin__Password (12+ ký tự), connection string và JWT phù hợp. Lệnh không cấp thêm Admin nếu đã có Admin, không có bootstrap API công khai.

Frontend có scripts/prepare-demo.ps1 và scripts/test-all.ps1. Bộ demo dùng translation_manager_demo ở MariaDB riêng cổng 3307. Hướng dẫn và tài khoản demo: docs/SETUP.md trong Frontend. Không áp dụng mật khẩu demo vào hệ thống thật.

## Import bản dịch JSON — cập nhật 29/10/2026

Manager gọi POST /api/projects/{projectId}/translations/import với localeCode, rawJson, status (draft/translated) và overwrite. Bản nhập không tự duyệt. Báo cáo trả created/updated/unchanged/keptExisting, empty/notInSource/tooLong, placeholderMismatch (sai biến trong tệp), savedDraft (số bản sai biến thực sự được ghi và lưu nháp), kèm danh sách khóa.

Khóa sai dự án/đã xóa/không tồn tại không được ghi. Cùng nội dung giữ nguyên trạng thái; đổi nội dung khi overwrite=true thì cần duyệt lại. Giá trị trên 10.000 ký tự bị bỏ qua theo khóa trong import bản dịch; import nguồn vẫn từ chối toàn bộ tài liệu nếu có giá trị quá dài. Giới hạn tài liệu JSON vẫn là 2 MB.

Kiểm thử hồi quy: tests/api/duc-import-security.test.mjs (6 nhóm). Hướng dẫn chạy, dữ liệu đủ 2 dự án/3 ngôn ngữ/ít nhất 100 khóa và hai tình huống nằm trong docs/DEMO_NHOM3.md của repo frontend.
