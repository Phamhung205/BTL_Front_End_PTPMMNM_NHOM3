# Đề tài 3 — Phép thử bắt buộc và hai tình huống sử dụng

Đối chiếu mục 4 và mục 6 của Đề tài 3 trong `DE_TAI_BTL.docx` với bộ kiểm thử tự động và cách trình diễn trên giao diện web. Dữ liệu dùng là 3 website mẫu trong [web-sample-import](../web-sample-import/README.md).

Kiểm tra lại độc lập và các lỗi bổ sung đã sửa: [KIEM_TRA_LAI_2026-10-29.md](KIEM_TRA_LAI_2026-10-29.md). Script Chrome: [tests/browser](../tests/browser/README.md).

## Chạy kiểm thử

```powershell
.\scripts\test-all.ps1                     # toàn bộ (CSDL demo riêng 3307), gồm bộ dưới đây
node tests\required-tests.mjs              # riêng 5 phép thử + 2 tình huống, khi stack demo đang chạy
```

`tests/required-tests.mjs` gọi API thật (5088 → MariaDB), tạo tài khoản/dự án QA mới mỗi lần chạy. Phép thử 5 chạy **đúng tệp `translation-manager.js` do hệ thống sinh** (lấy từ gói tích hợp ZIP của release) trên các phần tử `data-i18n` của `login.html` / `index.html` thật của website mẫu, đọc gói qua API công khai bằng `X-API-Key` như website khách.

## Phép thử bắt buộc

| # | Yêu cầu | Kiểm tra tự động (`tests/required-tests.mjs`) | Trình diễn trên web |
| --- | --- | --- | --- |
| 1 | Nhập lại cùng tệp không nhân đôi khóa; giữ đúng cấu trúc lồng nhau khi xuất | Nhập `web-test-2-techstore/i18n/vi.json` 2 lần: lần 2 `+0/~0/−0/=37`; `translation-keys` có 37 khóa không trùng; nhập lại `en.json` không tạo bản ghi; tệp `vi.json`/`en.json` của release giống hệt (deep equal) JSON lồng nhau đã nhập, SHA-256 khớp | Phiên bản nguồn → nhập lại cùng tệp: hộp xem trước báo `+0 khóa mới · 0 sửa · 37 giữ nguyên · 0 xóa`; Phát hành → tải `vi.json` |
| 2 | Nguồn có `{name}`, bản dịch thiếu hoặc thêm biến bị báo lỗi theo quy ước | Nguồn v2 `Chào mừng {name} quay lại!`: gửi duyệt thiếu `{name}` → 400 `missing: ["{name}"]`; thêm `{user}` → 400 `extra: ["{user}"]`; nhập tệp sai biến → báo `placeholderIssues`, chỉ lưu nháp; Reviewer duyệt bản nháp đó → 400 | Bản dịch → *Dịch / Gửi duyệt* khóa `login.welcome.title`, nhập "Welcome back!" → thông báo lỗi biến ngay trong hộp thoại |
| 3 | Nguồn đổi làm bản dịch liên quan cần kiểm tra lại; khóa không đổi giữ trạng thái | Nhập `i18n/v2/vi.json`: đúng 1 mới / 2 sửa / 1 xóa; 2 bản dịch khóa sửa → `needs_review`; khóa mới `missing`; khóa xóa rời danh sách dịch; **34 khóa còn lại giữ `approved` và giữ nguyên `row_version`**; điều kiện phát hành bị chặn | Phiên bản nguồn → nhập v2 → *Xem thay đổi*; Bản dịch → lọc *Cần sửa / nguồn thay đổi* còn đúng 2 khóa |
| 4 | Hai người lưu cùng bản dịch từ một phiên bản nền: phát hiện xung đột, không âm thầm ghi đè | Translator (được giao) và Manager mở cùng `row_version`; Translator lưu → 200; Manager lưu → 409 kèm `currentValue`, `currentRowVersion`; CSDL giữ bản của Translator | Mở cùng khóa ở 2 trình duyệt, lưu lần lượt: người sau thấy bản mới nhất và 2 lựa chọn *Tải nội dung mới nhất* / *Giữ nội dung của tôi và ghi đè ở lần lưu tiếp* |
| 5 | Ứng dụng đọc đúng gói đã xuất; sửa bản dịch hiện tại không thay nội dung gói đã phát hành | Client đọc gói 1.0.0, hiển thị đúng chữ/placeholder; sửa `login.form.heading` sau phát hành → tệp 1.0.0 giữ nguyên từng byte, website vẫn hiện nội dung đã phát hành; gói 2.0.0 hiển thị câu mới và thay `{name}`/`{count}` ("Welcome back, Lan!"); gói 1.0.0 vẫn đọc được, vẫn còn khóa đã xóa; key của 1.0.0 không đọc được 2.0.0, thiếu key → 401 | Chạy `web-test-2-techstore/site` với config release 1.0.0 và một bản với config 2.0.0; đổi EN ở menu website |

## Hai tình huống sử dụng

**Tình huống 1 — nhập chuỗi nguồn → phân công dịch → kiểm tra biến → xác nhận → xuất gói → ứng dụng đọc gói** (web test 1, vi → en + ja): bộ import đã đủ 79 khóa ở cả `vi.json`, `en.json`, `ja.json`. Test cố ý bỏ một khóa en và làm rỗng một khóa ja trong yêu cầu thử để kiểm tra phân công/chặn phát hành; Translator hoàn thiện bằng bản dịch thật từ tệp, Reviewer duyệt; phát hành 3 tệp vi/en/ja và website đọc gói. Không sửa tệp mẫu thành dữ liệu thiếu, không dùng chuỗi QA dự phòng.

**Tình huống 2 — nhập phiên bản nguồn mới → xem khác biệt → sửa bản dịch bị ảnh hưởng → phát hành phiên bản mới** (web test 2): nhập v2 → khác biệt 4 khóa → chỉ 3 bản dịch cần xử lý → sửa, kiểm tra biến, duyệt → phát hành 2.0.0; gói 1.0.0 không đổi.

Cả hai tình huống đã chạy **qua giao diện web trên Chrome thật** với TechStore: 19/19 kiểm tra đạt. Fashion/Beautyshop có thêm 26/26 kiểm tra, gồm nhập nguồn/bản dịch qua web, đồng bộ bộ chọn ngôn ngữ, đối chiếu từng vị trí có khóa ở 3 ngôn ngữ Fashion và cả 4 trang Beautyshop trong vi/en. Tổng 45/45 kiểm tra Chrome; đây là lượt riêng, không cộng vào số kiểm tra của bộ tổng.

## Kết quả lượt chạy ngày 29/10/2026

| Bộ | Kết quả |
| --- | --- |
| `scripts/test-all.ps1` (CSDL demo riêng 3307) | **21/21 hạng mục, 557 kiểm tra, 29 nhóm API** |
| `tests/required-tests.mjs` | 7/7 nhóm, 45 kiểm tra (Tình huống 1, Phép thử 1–5 + Tình huống 2, website chưa có JSON) |
| `backend/TranslationManager.Backend/tests/api/duc-translation-release.test.mjs` | 13/13 nhóm |
| `backend/TranslationManager.Backend/tests/api/duc-import-security.test.mjs` | 6/6 nhóm |
| Chrome thật — import qua web + 2 tình huống (web test 2) | 19/19 kiểm tra có đếm trong script; xem báo cáo kiểm tra lại |
| Chrome thật — web test 1 và web test 3 | 26/26 kiểm tra |
| `tests/sample-imports.mjs` | 14 kiểm tra: đầy đủ khóa/bản dịch/biến, mọi tham chiếu HTML có trong nguồn, gộp TechStore đúng nội dung |
| `tests/demo-requirements.mjs` | 15 kiểm tra trên DB: đúng 19 bảng, hai dự án 1.010/170 khóa, mỗi dự án 3 ngôn ngữ, Unicode, biến, hai nguồn/release |

## Lỗi phát hiện và đã sửa trong lượt này

| Lỗi | Ảnh hưởng | Sửa |
| --- | --- | --- |
| `SaveAsync`: `Convert.ToString(null)` trả chuỗi rỗng nên `?? throw` không chạy | Manager dự án A ghi được bản dịch vào khóa của dự án B / khóa đã xóa; khóa không tồn tại gây 500 | Kiểm tra `as string ?? throw` (cả 2 backend); test hồi quy trong `duc-import-security` |
| Script `.ps1` lưu UTF-8 không BOM, dùng `RandomNumberGenerator.GetBytes(int)` | Không chạy được trên Windows PowerShell 5.1 mặc định | Lưu UTF-8 BOM, hàm sinh khóa tương thích 5.1 |
| `scripts/demo/prepare-demo.mjs` cho Translator dịch trước khi phân công | Chuẩn bị demo lỗi 403 sau khi backend chỉ cho dịch khóa được giao | Phân công trước khi dịch |
| `tests/all.mjs` dùng đường dẫn Backend cố định trên máy khác | Bước build Backend độc lập lỗi trên máy khác | Biến `TM_STANDALONE_BACKEND` hoặc repo Backend đặt cạnh Frontend |
| `pattern` ô phiên bản phát hành không hợp lệ ở Chrome mới (cờ `v`) | Kiểm tra tên phiên bản phía trình duyệt bị bỏ qua, console báo lỗi | Thoát dấu `-` trong lớp ký tự |
| Test lỗi thời: `workflow-ui` (Reviewer có thanh duyệt hàng loạt; gỡ phân công phải chọn rõ), `duc-translation-release` (Translator chỉ thấy khóa được giao) | Báo FAIL sai dù chức năng đúng | Cập nhật test theo quy tắc hiện hành |
| MariaDB không tạo CSDL trong thư mục có dấu tiếng Việt | `prepare-demo.ps1` lỗi khó hiểu | Script báo lỗi rõ kèm lệnh tạo junction ASCII (`docs/SETUP.md`) |

## Chức năng bổ sung để import website

- **Nhập bản dịch từ tệp JSON** (trang Bản dịch, API `POST /translations/import`) — đưa bản dịch có sẵn của website vào hệ thống mà không tự duyệt.
- **Nhập nguồn nhiều tệp** (gộp `vi.json` + `vi 2.json`) và **xem trước khác biệt** trước khi xác nhận, tránh vô tình đánh dấu xóa khóa không liên quan.
- Công cụ `scripts/website-i18n/prepare-site.mjs` (tách chữ HTML thành khóa) và `js-dictionary-to-json.mjs` (chuyển `languages.js` sang JSON).
