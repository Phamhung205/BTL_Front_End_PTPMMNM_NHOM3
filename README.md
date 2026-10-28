# Translation Manager — Frontend

Frontend PHP 8 và JavaScript, gọi Backend ASP.NET Core qua gateway cùng origin. Tài khoản, dự án và bản dịch được lưu trong MariaDB; không còn bộ mô phỏng lưu nghiệp vụ trong trình duyệt.

## Chạy website với CSDL chính

Bật Apache và MySQL XAMPP, mở PowerShell tại thư mục Frontend rồi chạy:

```powershell
.\scripts\start-xampp.ps1
```

- Frontend Apache: http://localhost:8081/TranslationManager.Frontend/
- Frontend PHP: http://127.0.0.1:8095/
- Backend: http://127.0.0.1:5088/
- CSDL: `translation_manager`, MySQL XAMPP cổng **3306**.

Hai URL frontend dùng cùng API và CSDL. Email thử đúng định dạng vẫn đăng ký được. Xem [cài đặt và chạy](docs/SETUP.md).

## Cấu trúc mã nguồn

```text
TranslationManager.Frontend/
├── assets/
│   ├── css/app.css
│   └── js/
│       ├── shared/          # API, thông báo, modal, quyền giao diện
│       ├── auth/            # Đăng ký, đăng nhập, đăng xuất
│       ├── dashboard/       # Thống kê và dự án gần đây
│       ├── projects/        # Danh sách, tạo, sửa, xóa, chi tiết dự án
│       ├── members/         # Thành viên và vai trò dự án
│       ├── source/          # Ngôn ngữ, phiên bản nguồn, Translation Keys
│       ├── translations/    # Dịch, đánh giá, phát hành, lịch sử
│       └── admin/           # Quản trị hệ thống
├── components/
│   ├── layout/              # Header, footer, navbar, sidebar
│   ├── ui/                  # Toast và modal
│   └── workspaces/          # View dùng chung theo nhóm chức năng
├── config/
│   ├── api.php              # API URL và danh sách endpoint
│   ├── frontend.php         # Cấu hình JavaScript
│   └── session.php          # Phiên PHP, cookie, CSRF
├── pages/                   # Màn hình chia theo chức năng
├── scripts/                 # Khởi động, dừng, chuẩn bị demo, chạy test
├── tests/                   # Bộ kiểm thử hiện có để tự chạy
├── docs/                    # Hướng dẫn chạy và bản đồ chức năng
├── backend/                 # Backend đang được các script sử dụng
├── .local/                  # Dữ liệu chạy, khóa, phiên; bỏ qua trong Git
├── index.php                # Trang vào
├── login.php / register.php / logout.php
├── dashboard.php
├── gateway.php              # Chuyển HTTP tới Backend, giữ JWT ở server
└── router.php               # Định tuyến PHP built-in server
```

Bản đồ từng màn hình, file JavaScript và API: [FEATURES.md](docs/FEATURES.md).

## Cấu hình

`.env.local` giữ `API_BASE_URL=http://127.0.0.1:5088` và độ dài mật khẩu tối thiểu nếu cần. Frontend chỉ sử dụng API thật. JWT nằm trong phiên PHP ở server; trình duyệt chỉ giữ cookie phiên, thông tin hiển thị và email được ghi nhớ.

Backend đi kèm vẫn được dùng bởi lệnh khởi động. SQL nằm trong `backend/TranslationManager.Backend/database/`; bản xuất demo được giữ tại `demo_snapshot.sql` trong thư mục đó.

Ảnh, báo cáo, ZIP, công cụ bàn giao và tài liệu cũ được cất tại `.local/archive/`, ngoài mã nguồn hoạt động. Các bản sao cấu hình cũng được giữ ở đó để có thể xem lại. Dữ liệu MySQL, tài khoản, phiên và khóa JWT không bị dọn.

## Tự kiểm thử

Lệnh và môi trường chạy test nằm trong [SETUP.md](docs/SETUP.md). Lượt kiểm tra ngày 28/10/2026 chạy trọn bộ trên CSDL demo: 17/17 hạng mục đạt, 450 kiểm tra và 23 nhóm API; báo cáo ở `artifacts/test-report.md`. Website sau kiểm tra được trả về CSDL chính 3306.

Kiểm tra bổ sung phân quyền chạy riêng trên CSDL tạm cho cả hai backend: 26 API checks mỗi bản, 18 kiểm tra UI Admin và 79 kiểm tra gateway. CSDL chính có đúng 17 bảng theo schema, nên không cần SQL bổ sung cho phân quyền hiện tại. Chi tiết ở [báo cáo đối chiếu đề tài 3](docs/DE_TAI_3_REVIEW.md); API tích hợp xem trong [hướng dẫn nhóm](docs/HUONG_DAN_NHOM.md).


## Thành viên và phân công

Bảng để nhóm tự điền sau; chưa gán công việc hoặc đóng góp cho cá nhân nào.

| STT | Họ tên | Mã sinh viên | Nhiệm vụ phụ trách | Minh chứng commit / issue / review |
| --- | --- | --- | --- | --- |
| 1 | Chưa điền | Chưa điền | Nhóm tự phân công | Chưa điền |
| 2 | Chưa điền | Chưa điền | Nhóm tự phân công | Chưa điền |
| 3 | Chưa điền | Chưa điền | Nhóm tự phân công | Chưa điền |

## Các chức năng bổ sung ngày 28/10/2026

- Tạo dự án, chọn nhiều ngôn ngữ đích và thêm thành viên đã đăng ký trong cùng một form, lưu nguyên tử bằng một transaction.
- Admin hệ thống độc lập với Manager / Translator / Reviewer theo dự án. Trang Hướng dẫn và phân quyền giải thích các quyền tương ứng; API kiểm tra quyền thật ở máy chủ.
- Tài khoản Admin riêng local: `admin@translationmanager.local`. Tạo/kiểm tra bằng `scripts/create-local-admin.ps1`; mật khẩu được sinh và lưu trong `.local/admin-account.json`, không commit.
- Hai bộ bản dịch có sẵn: `common-web` có 1.010 khóa, `student-portal` có 170 khóa; ba ngôn ngữ en/vi/zh, JSON lồng nhau, Unicode và biến. Chuỗi được biên soạn từ các mẫu nhãn giao diện thông dụng, không sao chép nguyên văn một website bên thứ ba. Đây là dữ liệu demo; cần rà soát ngôn ngữ theo ngữ cảnh trước khi dùng thực tế.
- Tình huống 2 có dữ liệu nguồn v1/v2, khóa thêm/sửa/xóa, hai release bất biến, bộ kiểm thử tự động và hướng dẫn trình diễn.
- Trang Phát hành có xuất báo cáo JSON và mở ứng dụng đọc gói. `examples/website/index.html` là website độc lập dùng JSON đã tải từ release, xác minh SHA-256 trước khi hiển thị.

Tài liệu nhóm: [hướng dẫn API, JSON và demo](docs/HUONG_DAN_NHOM.md), [review theo đề tài 3](docs/DE_TAI_3_REVIEW.md).

Mã nhóm phát triển nằm trong PHP/JavaScript ở frontend và Controllers/Services/Support/Dtos/database ở backend. Thư viện chính: ASP.NET Core, JwtBearer, MySqlConnector, Tailwind CSS; ghi rõ giấy phép/nguồn của từng thư viện trong hồ sơ nộp bài. LICENSE của sản phẩm cần nhóm thống nhất lựa chọn trước khi phát hành công khai.
