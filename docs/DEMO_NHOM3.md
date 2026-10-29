# Nhóm 3 — Import website và trình diễn đúng đề bài

## 1. Khởi động

Chạy từ junction ASCII đã hướng dẫn trong [SETUP.md](SETUP.md). Trên máy hiện tại:

```powershell
cd C:\Users\GIANG\TMWork\BTL_Front_End_PTPMMNM_NHOM3
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-demo.ps1
```

Mở **http://127.0.0.1:8095**. Bộ demo dùng CSDL `translation_manager_demo` ở **3307**, tách với CSDL chính 3306.

Tài khoản để tự tạo dự án/import: `manager.demo@tm.local`, `translator.demo@tm.local`, `reviewer.demo@tm.local`. Mật khẩu dùng riêng cho demo local: `Demo@2026Admin!`. Đăng nhập Reviewer/Translator ở cửa sổ hoặc hồ sơ trình duyệt khác để không ghi đè phiên Manager.

## 2. Hai dự án đủ quy mô trong ảnh

`prepare-demo.ps1` tạo sẵn:

| Dự án | Khóa nguồn đang dùng | Ngôn ngữ | Dữ liệu |
| --- | ---: | --- | --- |
| `catalog-common-web` | 1.010 | en, vi, zh | `examples/catalog/common-web/` |
| `catalog-student-portal` | 170 | en, vi, zh | `examples/catalog/student-portal/` |

Cả hai có JSON lồng nhau, Unicode, biến thay thế, nguồn v1/v2 và release 1.0.0/2.0.0. Tài khoản sở hữu hai dự án này là bộ **catalog**, khác tài khoản demo ở mục 1: xem email/mật khẩu local trong `.local/catalog-accounts.demo.json`. ID dự án/release ở `.local/catalog-import-result.demo.json`. Các tệp tài khoản không đưa lên Git.

Phần này chứng minh yêu cầu **2 dự án × 3 ngôn ngữ × ít nhất 100 khóa**. Ba website bên dưới dùng để minh họa tích hợp/import; không cần thêm khóa vô nghĩa vào chúng cho đủ 100.

## 3. Import cả ba website qua giao diện

| Website | Thư mục bộ import | Nguồn | Đích |
| --- | --- | --- | --- |
| Web test 1 — Fashion | `web-sample-import/web-test-1-fashion/` | `i18n/vi.json`, 86 khóa | `i18n/en.json`, `i18n/ja.json`, mỗi tệp 86 khóa hoàn chỉnh |
| Web test 2 — TechStore | `web-sample-import/web-test-2-techstore/` | `i18n/vi.json`, 236 khóa | `i18n/en.json`, 236 khóa |
| Web test 3 — Beautyshop | `web-sample-import/web-test-3-beautyshop/` | `i18n/vi.json`, 197 khóa | `i18n/en.json`, 197 khóa |

1. **Manager → Dự án → Tạo dự án**. Nguồn `vi`; đích `en` (Fashion thêm `ja`). Thêm email Translator và Reviewer.
2. **Phiên bản nguồn** → chọn nguồn → tên `v1` → nhập. Xem trước khóa mới/sửa/xóa rồi xác nhận. TechStore có thể chọn đồng thời `site/Json/vi.json` và `site/Json/vi 2.json`; kết quả gộp cũng là 236 khóa.
3. **Bản dịch** → chọn ngôn ngữ đích → **Nhập bản dịch từ tệp JSON**. Chọn tệp tương ứng, giữ trạng thái *Gửi duyệt*. Với TechStore có thể chọn đồng thời `site/Json/en.json` và `site/Json/en2.json`. Fashion làm lần lượt en và ja.
4. Đọc báo cáo: bản mới/cập nhật chưa tự duyệt; rỗng/quá dài/ngoài nguồn được liệt kê; bản sai biến được ghi thì lưu nháp. Tích *Thay bản dịch đang có* chỉ khi muốn thay nội dung khác. Nhập lại cùng nội dung giữ nguyên trạng thái hiện có.
5. **Reviewer → Đánh giá** → chọn dự án/ngôn ngữ → duyệt bản đang chờ. Có thể từ chối và ghi lý do để Translator sửa.
6. **Manager → Phát hành** → kiểm tra đủ điều kiện → phát hành `1.0.0`. Tải config và client tích hợp; giữ API key chỉ đọc của đúng release.
7. Chép `translation-manager.config.js` và `translation-manager.js` vừa tải vào thư mục `site/` của bộ đó, thay tệp mẫu. Config mẫu có releaseId 0 nên chưa thể tải gói.

Ví dụ chạy TechStore (mở cửa sổ PowerShell riêng):

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8102 -t web-sample-import/web-test-2-techstore/site
```

Mở `http://127.0.0.1:8102/login.html`, đổi VI/EN. Fashion và Beautyshop dùng `index.html` trong thư mục `site/` tương ứng. Dừng máy chủ mẫu bằng Ctrl+C.

## 4. Hai tình huống và năm phép thử

**Tình huống 1:** nhập nguồn → chọn một khóa chưa dịch để phân công → Translator dịch và gửi duyệt → Reviewer duyệt → nhập/duyệt các bản còn lại → phát hành → website đọc gói. Để trình diễn phân công, làm bước dịch một khóa trước khi nhập toàn bộ bản dịch sẵn có; mặc định import giữ bản đang có.

**Tình huống 2 với TechStore:**

1. Sau release 1.0.0, nhập `i18n/v2/vi.json` với tên `v2`.
2. Xem trước và **Xem thay đổi**: 1 mới, 2 sửa, 1 xóa. Hai bản dịch đổi nguồn phải kiểm tra lại, 233 khóa không đổi vẫn đã duyệt.
3. Thử gửi `Welcome back!` cho `login.welcome.title`: phải báo thiếu `{name}`. Sửa thành `Welcome back, {name}!`; khóa `login.form.error` giữ `{count}`. Dịch khóa mới `login.form.show_password` thành `Show password`.
4. Reviewer duyệt lại → Manager phát hành 2.0.0. Website cấu hình release mới hiện `Welcome back, Lan!`; website giữ cấu hình release cũ vẫn hiện `Welcome Back!`.

| Phép thử trong ảnh | Cách kiểm chứng |
| --- | --- |
| 1. Nhập lại không nhân đôi, xuất giữ lồng nhau | Nhập lại v1: 0 mới/0 sửa/0 xóa. Tải JSON release và so sánh cây JSON |
| 2. Thiếu/thừa biến | Bỏ `{name}` hoặc thêm `{user}` khi gửi duyệt: API 400, có chi tiết biến sai |
| 3. Nguồn đổi | Tình huống 2: đúng khóa liên quan cần kiểm tra lại, khóa khác giữ trạng thái |
| 4. Hai người cùng sửa | Manager và Translator được giao mở cùng khóa; lưu một bên rồi lưu bên còn lại: 409, hiện bản mới nhất |
| 5. Gói đã phát hành không đổi | Tải gói v1 trước/sau khi sửa bản dịch hoặc nhập v2: bytes/SHA-256 không đổi; website v1 vẫn hiển thị nội dung cũ |

Quy ước chung: object JSON lồng nhau, lá là chuỗi; khóa dấu chấm được hiểu là đường dẫn; không mảng/object rỗng/khóa trùng/xung đột cha-con. Biến dùng `{name}`, `{count}` và phải giữ đúng tập tên khi gửi duyệt.

## 5. Kết quả đã chạy trên bản hoàn thiện

- Nền `main` trước đợt hoàn thiện: FE `5a29f031a8bb5673d7992754462c9488f6a7fd8c`, BE `1c9f0b81fb7b0a002ae075360851abe5f27a2ebc`. Mã hoàn thiện và các test được bổ sung trên nền hai commit này; xem lịch sử Git để lấy commit mới nhất.
- `scripts/test-all.ps1`: **21/21 hạng mục, 557 kiểm tra, 29 nhóm API**.
- Bộ bắt buộc: **7/7 nhóm, 45 kiểm tra**.
- Chrome TechStore: **53/53**; Chrome Fashion/Beautyshop: **101/101**. Tổng **154/154** kiểm tra trình duyệt, chạy riêng bộ tổng.
- Đã hoàn thiện chữ tĩnh/động của cả 9 tệp HTML: alert/toast, trạng thái đăng nhập, mật khẩu, tùy chọn sắp xếp/liên hệ, thứ trong tuần, tên sản phẩm trong thông báo và nhãn truy cập. Rà DOM không còn chữ giao diện chưa gắn khóa; tên riêng/giá/mã đơn giữ nguyên. Xem phạm vi cụ thể trong [kiểm thử Chrome](../tests/browser/README.md).
- Hai backend đã build; code nghiệp vụ và các test vừa sửa được đồng bộ ở hai repo.
- Lỗi hoàn thiện thêm: báo cáo import phân biệt dữ liệu giữ lại với bản sai biến thực sự lưu nháp; tệp có chuỗi quá dài vẫn nhập được các khóa hợp lệ; chặn nhập nếu không tải được nguồn để xem trước khác biệt.
- Sửa bước dừng/khởi động lại trên Windows: chờ đúng tiến trình demo thoát hoàn toàn trước khi mở lại MariaDB/API, tránh khóa `ibdata1` hoặc DLL. Lệnh dừng vẫn kiểm tra tiến trình thuộc bộ demo trước khi thao tác.
- Log: `artifacts/test-report.md`, `artifacts/test-all.log`, `artifacts/full-text-techstore-4.log`, `artifacts/full-text-fashion-beauty-2.log`. Ảnh: thư mục `shots/` trong `artifacts/full-text-techstore-4/` và `artifacts/full-text-fashion-beauty-2/`.

Chạy lại toàn bộ: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-all.ps1`. Chạy Chrome: [tests/browser/README.md](../tests/browser/README.md). Dừng dịch vụ demo khi dùng xong: `scripts/stop-integrated.ps1` từ cùng junction ASCII.

Phạm vi thực hiện là chức năng, dữ liệu, import và kiểm thử trong đề/ảnh. Thông tin thành viên, giấy phép và xác nhận công nghệ do nhóm tự chỉnh theo yêu cầu của bạn.
