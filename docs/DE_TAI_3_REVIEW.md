# Review đề tài 3 sau cập nhật ngày 28 tháng 10 năm 2026

Đã đối chiếu mã frontend, backend độc lập và backend đi kèm với đề tài 3 trong DE_TAI_BTL.docx, gồm yêu cầu chung, năm nhóm chức năng, hai yêu cầu kỹ thuật, dữ liệu, hai tình huống và năm phép thử bắt buộc.

**Kết luận:** các nhóm chức năng và cơ chế xử lý chính đã có triển khai, dữ liệu demo và kiểm thử tương ứng. Hồ sơ nộp bài vẫn cần nhóm hoàn thiện LICENSE, thông tin/phân công thành viên, minh chứng cộng tác và release GitHub; công nghệ backend C# cần giảng viên duyệt theo yêu cầu chung. Chưa đủ căn cứ kết luận nghiệm thu hoặc chấm điểm cuối cùng.

## Đối chiếu nhiệm vụ mới

| Nhiệm vụ | Kết quả |
| --- | --- |
| Tạo dự án có ngay ngôn ngữ/thành viên | Form có chọn nhiều ngôn ngữ và thêm email/vai trò. POST /api/projects lưu cùng transaction; lỗi bất kỳ rollback toàn bộ. Payload cũ tương thích. |
| Hoàn thành tình huống 2 | Có nguồn v1/v2, diff thêm/sửa/xóa, đánh dấu cần kiểm tra, sửa/duyệt, release v2 và xác minh release v1 bất biến. Script seed đã thực hiện trên hai dự án mới trong CSDL chính; bộ test riêng thực hiện lại trên CSDL tạm. |
| Phân quyền và Admin riêng | Admin hệ thống tách khỏi Manager/Translator/Reviewer theo dự án. Đã tạo và xác minh đăng nhập admin@translationmanager.local trong translation_manager:3306. Mật khẩu sinh riêng tại .local/admin-account.json. |
| Làm rõ chức năng Admin/User | Có ma trận trong trang Admin, trang Hướng dẫn và phân quyền, tài liệu nhóm. User không tự cấp Admin; Admin phải có vai trò dự án để tham gia dịch/duyệt/phát hành. |
| Website chưa có JSON | Có hướng dẫn tách chữ sang khóa, JSON lồng nhau, hàm tra khóa/data-i18n, xử lý biến và nguồn đầy đủ. Có website mẫu chạy độc lập. |
| Khoảng 1000 từ dịch phổ thông | common-web có 1.010 khóa, 4.494 từ nguồn tiếng Anh, bản dịch vi/zh tương ứng. Nội dung mẫu được tự biên soạn theo nhãn UI phổ biến. |
| Phân công và hướng dẫn lấy API/import | Giữ phân công theo khóa/ngôn ngữ/người dịch; tài liệu liệt kê endpoint và payload. Có client download-release.mjs đăng nhập từ server, tải và kiểm tra SHA-256 trước khi ghi gói. |
| API local trước deploy, phần Đức | Backend phát hành đã có API cần dùng. Đã chạy local, thử tải/import gói thật. Không cần API dịch tự động hoặc dịch vụ trả phí. Cần bàn giao URL backend khi deploy, quyền thành viên và projectId/releaseId với người tích hợp. |
| Review đủ yêu cầu, liệt kê còn thiếu | Bảng đối chiếu và danh sách việc còn lại nằm trong tài liệu này. |
| README có bảng ba người để tự phân | Có ba dòng để điền tên, mã sinh viên, nhiệm vụ và minh chứng; chưa tự gán nhiệm vụ cho cá nhân. |

## Đối chiếu đề bài

| Yêu cầu | Bằng chứng |
| --- | --- |
| 1. Dự án/ngôn ngữ/thành viên/khóa, JSON lồng nhau | ProjectsController, ProjectService, LocaleService, SourceDocument, JsonTree và các trang tương ứng. |
| 2. Nguồn mới, thêm/sửa/xóa, cần kiểm tra lại | SourceVersionService lưu snapshot/diff; bản dịch liên quan tăng row_version; khóa không đổi giữ trạng thái. |
| 3. Dịch, tìm kiếm, phân công, nháp, bình luận, sửa đồng thời | TranslationService và workspace; kiểm tra HTTP 409, giữ nội dung của lần lưu thành công. |
| 4. Biến, hoàn thành, quyền xác nhận | PlaceholderValidator, quyền controller, review và điều kiện phát hành. Nháp thiếu biến không được coi là đã duyệt. |
| 5. Chốt, xuất gói và báo cáo, ứng dụng đọc, giữ bản cũ | ReleaseService, JSON/ZIP/manifest/SHA-256, API report, trang consumer, examples/website. |
| Kỹ thuật 1 | Tự flatten/unflatten, xử lý nguồn và diff, so khớp tập biến. Quy ước dấu chấm thống nhất giữa frontend và hai backend; đường dẫn trùng hoặc cha/con xung đột bị từ chối. |
| Kỹ thuật 2 | Row_version chống ghi đè cũ, nguồn đổi tăng phiên bản, review/validate chặn nội dung chưa hợp lệ, file release lưu snapshot riêng. |
| Dữ liệu | Hai dự án mới: catalog-common-web có 1.010 khóa đang dùng; catalog-student-portal có 170; mỗi dự án en/vi/zh, hai source version, hai release. |
| Tình huống 1 | Import → phân công → dịch/kiểm tra biến → duyệt → phát hành → ứng dụng đọc gói đã chạy qua API và trình duyệt. |
| Tình huống 2 | Nguồn v2 → xem diff → sửa/duyệt bản dịch bị ảnh hưởng → release v2; kiểm tra gói cũ giữ nguyên. |

Năm phép thử bắt buộc đã có bằng chứng: import lại không nhân đôi và giữ cấu trúc khi xuất; thiếu/thừa biến bị báo lỗi; nguồn đổi chỉ tác động bản dịch liên quan; hai người lưu cùng nền bị 409; ứng dụng hiển thị đúng file và gói cũ không đổi.

## Kết quả kiểm thử

| Hạng mục | Kết quả |
| --- | --- |
| Build hai backend | Đạt, không lỗi/cảnh báo trong lượt kiểm tra cuối |
| So sánh mã nghiệp vụ hai backend | 36 tệp C# tương ứng giống nhau |
| PHP/JS/MJS phía frontend | 59 tệp đạt cú pháp |
| PowerShell mới/cập nhật | Parser của create-local-admin.ps1 và prepare-demo.ps1 đạt |
| Bộ kiểm thử tổng hợp test-all.ps1 | 17/17 hạng mục đạt, 450 kiểm tra và 23 nhóm API, có dọn dữ liệu QA |
| UI mô phỏng DOM | source-workspace 16; workflow-ui 39; admin-ui 18 kiểm tra đạt |
| SourceDocument | 23 kiểm tra đạt, có khóa dấu chấm và từ chối xung đột đường dẫn |
| Gateway HTTP | source-gateway 35; workflow-gateway 67 kiểm tra đạt; ZIP giữ nguyên byte |
| API dịch/review/release | 13/13 nhóm ở mỗi backend |
| API quản lý nguồn | 10/10 nhóm ở mỗi backend |
| Tạo dự án nguyên tử và tình huống 2 | 25/25 kiểm tra ở mỗi backend |
| Tích hợp PHP/API | integration 76; workflow-integration 53; admin-integration 77 kiểm tra đạt |
| Bộ dữ liệu JSON | V1/V2 của cả hai dự án có cùng tập khóa/biến giữa en/vi/zh |
| Client tải gói | Đã tải đủ 3 ngôn ngữ của release v2 và xác minh SHA-256 |
| Trình duyệt thật | Form thêm ngôn ngữ/thành viên, tự sinh slug; website chuyển en/vi/zh; consumer đọc release v1/v2 đúng câu chào và biến; Admin riêng đăng nhập và xem ma trận quyền |

Các test API ghi dữ liệu QA đã chạy trên MariaDB tạm cổng 3317 với API 5097/5098 và PHP 8097; tiến trình và dữ liệu tạm đã dọn. Sau đó chạy trọn scripts/test-all.ps1 trên translation_manager_demo:3307: 17/17 hạng mục đạt, bao gồm chuẩn bị catalog, các chức năng cũ/mới và dọn dữ liệu QA. Website đã được trả về CSDL chính translation_manager:3306, /health xác nhận CONNECTED. Báo cáo/log tổng hợp ở artifacts/test-report.md, artifacts/test-report.json và artifacts/test-all.log.

Tổng hợp lượt API/tích hợp tách riêng: 9/9 suite đạt, gồm 46 nhóm API và 256 kiểm tra onboarding/tích hợp. Các kiểm tra UI, gateway và SourceDocument được ghi riêng phía trên.

## Các lỗi lần trước đã xử lý

- Bỏ LF trước thẻ mở PHP của gateway; kiểm tra byte ZIP và SHA-256 qua PHP đạt.
- Hai bản backend cùng dùng quy ước khóa có dấu chấm; frontend, README và test phù hợp, không nới lỏng ca trùng đường dẫn.
- Bổ sung ứng dụng đọc gói và xuất báo cáo JSON.
- Bổ sung dữ liệu đủ quy mô và hai release cho tình huống 2.
- Có CONTRIBUTING. .local và 19 tệp runtime của backend độc lập đã được bỏ khỏi index Git, giữ nguyên file trên máy và thêm ignore; chưa tạo commit.

## Kiểm tra bổ sung: front-end, back-end và CSDL

- Front-end giữ nguyên trang Admin hiện có; mục Ma trận quyền được nối thêm tra cứu theo email, xem quyền theo từng dự án, gán Admin/User, cùng nút tạo tài khoản trong tab Tài khoản. Dữ liệu API được chèn bằng `textContent`; frontend không nhận password/token của tài khoản mới.
- Back-end có endpoint danh mục quyền, tra cứu/xem tài khoản, tạo tài khoản, gán quyền hệ thống, khóa/mở tài khoản và xem quyền của chính tài khoản hoặc trong dự án. Backend kiểm tra quyền theo CSDL, audit thay đổi, dùng `expectedVersion`, ngăn tự khóa/tự hạ quyền và giữ bảo vệ Admin/Manager cuối cùng.
- Cả backend đi kèm và backend độc lập đã build thành công. Trên mỗi backend, 26 kiểm tra phân quyền tích hợp đạt; các suite trước đó cho dịch/phát hành (13), quản lý nguồn (10) và tạo dự án/tình huống 2 (25) tiếp tục đạt. UI Admin đạt 18 kiểm tra; gateway đạt 79 kiểm tra.
- Truy vấn chỉ đọc `information_schema.tables` trên `translation_manager:3306` trả đúng 17 bảng như ảnh đính kèm: `admin_audit`, `locales`, `projects`, `project_locales`, `project_members`, `releases`, `release_files`, `reviews`, `source_changes`, `source_strings`, `source_string_versions`, `source_versions`, `system_admin_guard`, `translations`, `translation_comments`, `translation_history`, `users`.
- **Không thiếu bảng cho chức năng hiện tại và không cần SQL bổ sung.** Phân quyền dùng role cố định, dữ liệu quyền chi tiết được khai báo trong backend và các quan hệ thành viên hiện có; không tạo thêm schema cho CRUD Admin.
- Các suite tích hợp phân quyền chạy trên MariaDB tạm riêng; không tạo tài khoản hay thay đổi schema/dữ liệu của CSDL chính. Mật khẩu/API key local không bị thay đổi.
- Mã nguồn và API build tạm đã được xác minh. Tiến trình API local đang nghe cổng 5088 hiện trả 404 với `/api/admin/roles`, nên cần người vận hành build/restart API từ mã mới trước khi kiểm tra giao diện với tiến trình đó. Không sửa `.env.local` theo lưu ý của nhóm.
- UI bộ lọc phân công: Manager lọc theo người nhận/trạng thái trong dự án hiện tại; Translator chỉ thấy “Công việc → Giao cho tôi”, không thấy bộ lọc trạng thái/phân công. API chặn truy vấn Translator theo ID thành viên khác.

## Việc nhóm còn phải hoàn thiện trước khi nộp

1. Thống nhất và bổ sung LICENSE của sản phẩm, kiểm tra ghi nguồn/giấy phép thư viện và tài nguyên tái sử dụng.
2. Xác nhận giảng viên đã duyệt C#/ASP.NET Core cho backend. Yêu cầu chung của tài liệu ghi PHP + PostgreSQL/MySQL; frontend PHP không tự thay thế việc duyệt công nghệ xử lý nghiệp vụ khác.
3. Điền bảng ba thành viên, nhiệm vụ, mã sinh viên; bổ sung minh chứng issue, commit, review và chuẩn bị vấn đáp theo phần phụ trách.
4. Commit mã nguồn, cấp quyền đọc GitHub cho giảng viên, tạo release cuối kỳ kèm mã commit đầy đủ và ZIP, kiểm tra cài/chạy lại trên môi trường sạch theo README.
5. Khóa JWT từng có trong lịch sử Git backend. Việc bỏ khỏi index không xóa các commit cũ; nếu repo đã được chia sẻ, thay khóa và xử lý bản đã chia sẻ theo phạm vi của nhóm. Không thay khóa hoặc viết lại lịch sử Git trong lượt này.
6. Rà soát bản dịch theo ngữ cảnh của website thật trước khi dùng thực tế. Bộ dữ liệu hiện là UI mẫu dùng để kiểm thử và trình diễn.

Không yêu cầu dịch máy, realtime hoặc mọi định dạng bản địa hóa theo phạm vi đề tài. Không cần thêm dịch vụ trả phí để thực hiện các chức năng trên.
