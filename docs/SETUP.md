# Cài đặt và chạy

## Website với CSDL XAMPP 3306

1. Giữ Frontend trong `C:/xampp/htdocs/TranslationManager.Frontend`.
2. Bật Apache và MySQL trong XAMPP. Apache trên máy này dùng cổng 8081, MySQL dùng cổng 3306.
3. CSDL chính là `translation_manager`. CSDL đang có dữ liệu không cần import lại.
4. Chạy từ thư mục Frontend:

```powershell
.\scripts\start-xampp.ps1
```

Script dùng Backend đi kèm tại cổng 5088 với cấu hình XAMPP trong `backend/TranslationManager.Backend/appsettings.json`, kiểm tra CSDL và khởi động PHP 8095. Script không tự nạp/xóa dữ liệu hoặc chạy migration trên CSDL chính.

Mở http://localhost:8081/TranslationManager.Frontend/ hoặc http://127.0.0.1:8095/. Cả hai gọi cùng Backend 5088 và lưu tài khoản đăng ký trong `translation_manager.users` ở 3306.

Kiểm tra trong phpMyAdmin:

```sql
USE translation_manager;
SELECT @@port AS database_port;
SELECT id, email, display_name, system_role, created_at
FROM users ORDER BY id DESC;
```

Email thử chỉ cần đúng định dạng; ứng dụng local không kiểm tra hộp thư có tồn tại thực. Tài khoản mới có quyền hệ thống User. Cấp Admin đầu tiên theo `database/setup_existing_admin_and_languages.sql` của Backend; những lần sau dùng trang Admin.

## Dùng Backend độc lập bằng Visual Studio

Dừng Backend do script khởi động trước khi chạy F5 để giải phóng cổng 5088. Mở project Backend độc lập, chọn profile HTTP/Development và chạy F5. Kết nối mặc định của Backend cần trỏ tới `127.0.0.1:3306 / translation_manager`.

Frontend đọc API URL trong `.env.local`:

```dotenv
API_BASE_URL=http://127.0.0.1:5088
PASSWORD_MIN_LENGTH=6
```

Kiểm tra http://127.0.0.1:5088/health: phải trả `status: OK`, `database: CONNECTED`. Khi đổi Backend hoặc CSDL, đăng nhập lại.

## Lưu ý môi trường Windows

- Các script `.ps1` chạy được bằng **Windows PowerShell 5.1** (mặc định của Windows) và PowerShell 7; tệp được lưu UTF-8 có BOM để giữ đúng tiếng Việt.
- Lệnh `dotnet` phải có trong PATH (.NET 10 SDK). Nếu cài SDK vào thư mục người dùng: `$env:PATH = "$env:USERPROFILE\.dotnet;$env:PATH"`.
- MariaDB của XAMPP **không tạo được CSDL demo trong thư mục có ký tự tiếng Việt** (ví dụ `...\BTL Xây dựng hệ thống...`). Khi đó `prepare-demo.ps1` dừng và in lệnh tạo junction ASCII; chạy script từ đường dẫn junction:

```powershell
New-Item -ItemType Directory -Force C:\TMWork | Out-Null
cmd /c mklink /J C:\TMWork\BTL_Front_End_PTPMMNM_NHOM3 "<đường dẫn Frontend>"
cmd /c mklink /J C:\TMWork\BTL_Back_End_PTPMMNM_NHOM3 "<đường dẫn Backend>"
cd C:\TMWork\BTL_Front_End_PTPMMNM_NHOM3
.\scripts\prepare-demo.ps1
$env:NODE_OPTIONS = '--preserve-symlinks --preserve-symlinks-main'   # để Node giữ đường dẫn junction khi chạy test-all
.\scripts\test-all.ps1
```

`tests/all.mjs` build Backend độc lập từ biến `TM_STANDALONE_BACKEND`, hoặc repo `BTL_Back_End_PTPMMNM_NHOM3` đặt cạnh Frontend.

## Bộ demo riêng và kiểm thử

```powershell
.\scripts\prepare-demo.ps1
```

Lệnh này chuyển API 5088 sang MariaDB riêng cổng **3307**, database `translation_manager_demo`. Tài khoản đăng ký lúc đó nằm trong CSDL demo. Thông tin các tài khoản demo có tại `.local/demo-accounts.json`. Dữ liệu CSDL chính 3306 được giữ nguyên.

Muốn chạy bộ kiểm thử tự động hiện có:

```powershell
.\scripts\test-all.ps1
```

Bộ test chạy trên CSDL demo 3307, có tạo dữ liệu QA. Không chạy riêng các test tích hợp trên API đang dùng CSDL chính. Báo cáo được sinh vào `artifacts/` khi bạn chạy test; thư mục này bị bỏ qua trong Git và chặn truy cập HTTP.

Quay lại CSDL chính sau khi dùng demo/test:

```powershell
.\scripts\start-xampp.ps1
```

Dừng các tiến trình thuộc bộ chạy bằng `.\scripts\stop-integrated.ps1`. Lệnh không dừng Apache/MySQL XAMPP ở cổng 8081/3306.

## Các file cần giữ khi chạy

`prepare-demo.ps1` cũng import hai dự án catalog 1.010 và 170 khóa (en/vi/zh) cùng nguồn/release v1/v2. Tài khoản bộ này ở `.local/catalog-accounts.demo.json`, ID ở `.local/catalog-import-result.demo.json`; chúng tách khỏi các file catalog của CSDL chính. Xem `docs/HUONG_DAN_NHOM.md` để thực hành tình huống 2 và lấy API.

`.env.local`, `.local/sessions/`, các khóa JWT và dữ liệu `.local/mysql-api/` là dữ liệu chạy, không phải mã thừa. Các file này bị bỏ qua trong Git. `.local/archive/` chứa bản bàn giao và tài liệu cũ, không được dùng khi phục vụ website.
