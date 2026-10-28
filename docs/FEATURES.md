# Bản đồ chức năng Frontend

Mọi thao tác nghiệp vụ đi qua `assets/js/shared/api.js` → `gateway.php` → Backend → MariaDB.

| Chức năng | Trang PHP | JavaScript | Nhóm API |
| --- | --- | --- | --- |
| Đăng ký / đăng nhập | `register.php`, `login.php` | `assets/js/auth/auth.js` | `/api/auth/register`, `/login`, `/me` |
| Đăng xuất | `logout.php` | `assets/js/auth/logout.js` | Gateway hủy phiên PHP |
| Dashboard | `dashboard.php` | `assets/js/dashboard/index.js` | `/api/dashboard/stats`, `/api/projects` |
| Dự án | `pages/projects/` | `assets/js/projects/index.js` | `/api/projects` |
| Thành viên | Tab thành viên trong chi tiết dự án; `pages/members/` điều hướng tới tab | `assets/js/members/index.js` | `/api/projects/{id}/members` |
| Ngôn ngữ | `pages/languages/` | `assets/js/source/workspace.js` | `/api/projects/{id}/locales` |
| Phiên bản nguồn | `pages/source-versions/` | `assets/js/source/workspace.js` | `/api/projects/{id}/source-versions` |
| Translation Keys | `pages/translation-keys/` | `assets/js/source/workspace.js` | `/api/projects/{id}/translation-keys` |
| Dịch, phân công, bình luận | `pages/translations/` | `assets/js/translations/workspace.js` | `/api/projects/{id}/translations` |
| Duyệt / từ chối | `pages/reviews/` | `assets/js/translations/workspace.js` | `/translations/{id}/approve`, `/reject` |
| Phát hành / tải JSON và ZIP | `pages/releases/` | `assets/js/translations/workspace.js` | `/api/projects/{id}/releases` |
| Lịch sử hoạt động | `pages/history/` | `assets/js/translations/workspace.js` | `/api/projects/{id}/activity` |
| Quản trị hệ thống | `pages/admin/` | `assets/js/admin/index.js` | `/api/admin/*` |
| Kho bản dịch dùng chung | Tab trong `pages/translations/` | `assets/js/memory/index.js` | `/api/translation-memory`, `/languages` |

## View dùng chung

Trang Tạo dự án nhận ngay danh sách ngôn ngữ đích và email/vai trò ban đầu; backend lưu toàn bộ trong cùng transaction. Payload `POST /api/projects` mở rộng bằng `targetLocaleCodes` và `members`, vẫn hỗ trợ payload cũ.

Khi Manager bấm **Phát hành**, backend tạo snapshot và API key chỉ đọc cho release đó; web chính hiển thị key cùng `translation-manager.config.js` đã điền sẵn để tải/copy. Mỗi key chỉ đọc JSON của một snapshot bất biến; backend chỉ lưu hash, trả key thô một lần, và Manager có thể xoay key để thu hồi key cũ. **Tải client tích hợp API** (`GET /api/projects/{id}/releases/{releaseId}/integration`) cung cấp `translation-manager.js`, config mẫu và README. Client tải JSON qua `GET /api/public/releases/{releaseId}/files/{locale}` với header `X-API-Key`, rồi áp dụng khóa `data-i18n` trên website khách hàng. API key không cấp quyền sửa bản dịch hay truy cập dự án khác. `pages/help/index.php` giải thích phân quyền, tình huống 2 và tích hợp API; `examples/website/index.html` là ví dụ độc lập nhận JSON đã phát hành.

- `components/layout/`: khung trang, sidebar, navbar và footer.
- `components/ui/`: thông báo toast, modal, xác nhận.
- `components/workspaces/source.php`: khung trang Ngôn ngữ / Phiên bản nguồn / Translation Keys.
- `components/workspaces/translations.php`: khung trang Bản dịch / Đánh giá / Phát hành / Lịch sử; Kho bản dịch nằm trong tab phụ của Bản dịch.
- `config/frontend.php`: nhúng cấu hình JavaScript; `config/api.php` quản lý URL và endpoint.

## Phân quyền

Admin là quyền toàn hệ thống. Manager, Translator và Reviewer là vai trò theo từng dự án. Backend kiểm tra quyền cho mỗi request. Manager chọn các khóa rồi giao từng nhóm cho một Translator; tài khoản Translator chỉ thấy và sửa các khóa được giao cho chính mình. Khóa chưa phân công chỉ Manager nhìn thấy để phân phối. Tài khoản đăng ký mới chưa tham gia dự án nên có dashboard trống cho tới khi tạo hoặc được thêm vào dự án.

Kho bản dịch dùng chung lấy cặp tiếng Việt–ngôn ngữ đích từ các bản dịch đã gửi hoặc duyệt. Bản nháp và nội dung rỗng không được gợi ý. Kho không lưu tên người dịch, tài khoản hay mã dự án; người dùng tìm theo nội dung và chọn ngôn ngữ đích để xem/sao chép bản dịch.

## Thêm và xóa bản dịch

Manager có các thao tác ở trang Bản dịch/Đánh giá:

- **Thêm tất cả bản ghi còn thiếu:** tạo bản ghi trống, chưa phân công cho mọi khóa nguồn đang dùng chưa có bản dịch ở ngôn ngữ đích đang chọn. Không tự dịch nội dung và không ghi đè bản ghi đã có; thao tác này áp dụng toàn dự án/ngôn ngữ, không phụ thuộc bộ lọc.
- **Chọn tất cả kết quả:** chọn toàn bộ các khóa khớp bộ lọc, kể cả các trang sau 50 dòng. Có thể bỏ chọn tất cả hoặc chọn từng dòng.
- **Duyệt hàng loạt:** Manager/Reviewer có thể duyệt các bản đã chọn hoặc toàn bộ bản đang chờ trong kết quả hiện tại. Bản nháp, bản thiếu và bản đã duyệt được bỏ qua; phiên bản nội dung và biến thay thế được kiểm tra trước khi lưu.
- **Xóa** từng dòng / **Xóa bản dịch đã chọn:** hiện hộp thoại xác nhận rồi xóa vật lý bản ghi `translations`. Bình luận, lịch sử và đánh giá liên quan bị xóa theo khóa ngoại. Khóa nguồn, bản dịch của ngôn ngữ khác và các bản phát hành đã có được giữ nguyên. Sau khi xóa, khóa nguồn hiển thị **Chưa dịch**.

API bổ sung:

| Phương thức | Endpoint | Dữ liệu |
| --- | --- | --- |
| POST | `/api/projects/{id}/translations/create-missing` | `localeCode` |
| DELETE | `/api/projects/{id}/translations/{translationId}` | JSON `expectedRowVersion` |
| DELETE | `/api/projects/{id}/translations` | JSON `localeCode`, `items: [{translationId, expectedRowVersion}]` |
| POST | `/api/projects/{id}/translations/approve` | JSON `items: [{translationId, expectedRowVersion}]` |

Xóa hàng loạt tối đa 10.000 bản ghi/lần và thực hiện trong một giao dịch. Nếu một bản dịch đã đổi phiên bản, không còn tồn tại hoặc sai dự án/ngôn ngữ, toàn bộ yêu cầu bị từ chối trước khi xóa. Không cần thêm bảng/cột mới.

Duyệt hàng loạt tối đa 1.000 bản/lần, chỉ Manager/Reviewer được phép. Toàn bộ lô được duyệt trong một giao dịch; nếu một dòng đã thay đổi hoặc không còn ở trạng thái chờ duyệt, cả lô bị từ chối.

Kiểm thử riêng tính năng thêm/xóa: `tests/translation-actions.mjs` dùng CSDL tạm `translation_actions_verify_*` trên MariaDB riêng 3307, PHP 8096 và API 5092; tự dọn CSDL sau khi chạy. Bộ `scripts/test-all.ps1` đã tích hợp bài kiểm tra này.
