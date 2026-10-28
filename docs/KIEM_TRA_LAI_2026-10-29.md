# Kiểm tra lại độc lập — Đề tài 3, ngày 29/10/2026

> Báo cáo lịch sử. Kết quả sau đợt hoàn thiện mới nhất và cách trình diễn: [DEMO_NHOM3.md](DEMO_NHOM3.md). Fashion hiện đã đủ bản dịch vi/en/ja; bộ tổng đạt 21/21 và Chrome 45/45.

## Kết luận

Năm phép thử bắt buộc và hai tình huống đạt trên bản mã hiện tại. Lượt chạy lại đầu tiên chỉ đạt **17/19 hạng mục, 487 kiểm tra và 28 nhóm API**: hai lỗi nằm trong cách chạy test trên Windows. Sau sửa, bộ tổng hợp đạt **19/19 hạng mục, 526 kiểm tra và 28 nhóm API**. 526 là tổng số kiểm tra được các script đếm; 28 nhóm API được báo riêng, không phải toàn bộ số lệnh assert.

Các kết quả trình duyệt được đếm riêng: **19/19 kiểm tra Chrome** cho TechStore và hai tình huống; **10/10 kiểm tra Chrome** cho Fashion/Beautyshop. Báo cáo trước ghi 20 bước cho TechStore, nhưng script thực tế chỉ có 19 lần kiểm tra. Các bộ `workflow-ui`, `source-workspace`, `admin-ui` trong test tổng sử dụng DOM mô phỏng; không gọi chúng là kiểm thử Chrome.

## Lỗi tìm thấy và sửa khi kiểm tra lại

| Vấn đề tái hiện được | Sửa và bằng chứng |
| --- | --- |
| Test build ghi DLL vào thư mục backend đang chạy, Windows báo MSB3027/MSB3021 | Build kiểm tra vào `.local/build/suite-verification`; chạy lại bộ tổng đạt |
| Test tạo/xóa bản dịch so sánh chuỗi đường dẫn junction với đường dẫn thật, báo sai và không chạy 30 kiểm tra | So sánh `realpathSync` hai đường dẫn; vẫn kiểm tra đúng thư mục MariaDB của workspace; 30/30 đạt |
| Gộp JSON có `__proto__.polluted` / `constructor.prototype.other` làm mất khóa và ghi vào `Object.prototype` | Dùng object không có prototype khi dựng JSON, cả UI và hai công cụ chuyển website; thêm kiểm tra giữ khóa/Unicode và không thay prototype |
| `JSON.parse` bỏ mất thuộc tính lặp trước khi gộp; đường dẫn dấu chấm và đường dẫn lồng nhau trùng cũng có thể bị bỏ qua | Kiểm tra tên thuộc tính gốc, kể cả tên dùng Unicode escape; từ chối đường dẫn trùng trong một tệp. Cùng khóa/cùng nội dung ở hai tệp khác nhau vẫn được gộp |
| PowerShell 5.1 mặc định đưa SQL sang mysql bằng ASCII, làm chữ Unicode thành `?` khi khởi tạo dữ liệu | Đặt UTF-8 trong phạm vi gọi mysql và khôi phục encoding sau đó. Tái hiện `中文` thành HEX `3F3F` trước sửa; gọi đúng hàm đã sửa cho HEX `E4B8ADE69687` |
| Kiểm tra Fashion cũ dùng `.catch(() => '[ja] Đăng ký')` nên có thể báo đạt dù không tìm thấy phần tử | Bỏ giá trị dự phòng, so sánh đúng nội dung phần tử thật; chạy lại Chrome đạt 10/10 |

Các kiểm tra mới cho JSON nằm trong `tests/source-workspace.mjs`: tăng từ 16 lên 25. Không bỏ kiểm tra để đạt tổng mới.

## Yêu cầu và phạm vi đã kiểm chứng

- `tests/required-tests.mjs`: 7/7 nhóm, 45 kiểm tra, gồm nhập lại không nhân đôi, JSON lồng nhau, biến thiếu/thừa, nguồn đổi chỉ tác động bản dịch liên quan, xung đột 409, snapshot cũ giữ nguyên byte và client đọc gói.
- `duc-import-security`: 5/5 nhóm; Manager không thể ghi vào khóa thuộc dự án khác, khóa đã xóa hoặc không tồn tại; nhập JSON không tự duyệt; quyền Manager/Translator/Reviewer được kiểm tra.
- Chrome: chọn nhiều tệp nguồn/bản dịch, xem trước khác biệt, nhập, duyệt, phát hành, tải client, đổi ngôn ngữ, sửa nguồn v2, lỗi thiếu biến trên UI, duyệt lại và giữ cả hai gói.
- CSDL demo có `catalog-common-web` **1.010 khóa / 3 ngôn ngữ**, `catalog-student-portal` **170 khóa / 3 ngôn ngữ**. Hai catalog này đáp ứng quy mô đề bài; Fashion chỉ 79 khóa và TechStore chỉ 37 khóa, không dùng riêng hai mẫu đó để khẳng định đạt quy mô.
- Đã fetch GitHub: frontend `main` là `5a29f031a8bb5673d7992754462c9488f6a7fd8c`; backend `main` là `1c9f0b81fb7b0a002ae075360851abe5f27a2ebc`. HEAD hai nhánh local bằng các commit đó; working tree có thay đổi chưa commit, nên không nói toàn bộ code hiện tại giống GitHub.
- Các tệp nghiệp vụ C#, DTO, controller, hỗ trợ, SQL/test tương ứng giữa hai backend giống nội dung sau chuẩn hóa BOM/xuống dòng. Có khác biệt đóng gói: `database/demo_snapshot.sql` chỉ có ở backend đi kèm frontend; cấu hình/README từng repo không được coi là giống hệt.

## Giới hạn và việc trước khi nộp

- Test Fashion điền các khóa thiếu bằng `[en]` / `[ja]` cộng chữ nguồn. Đây là dữ liệu QA để chạy luồng, **chưa phải bản dịch tiếng Anh/tiếng Nhật hoàn chỉnh**. Các tệp gốc trong bộ import vẫn thể hiện phần thiếu; Reviewer cần hoàn thiện trước khi trình diễn nếu chọn mẫu này.
- Beautyshop có 179 khóa và bản tiếng Anh đề xuất; kiểm thử không thay thế việc kiểm tra chất lượng ngôn ngữ. Công cụ tách HTML không tự dịch chữ viết trong JavaScript, `alt` hoặc `aria-label`.
- Các ca kiểm thử trên không chứng minh mọi thao tác trên mọi trang đều đã được kiểm tra. Bộ Chrome Fashion/Beautyshop kiểm tra các trang và bộ chọn ngôn ngữ được ghi trong script.
- Chưa có `LICENSE` trong repo frontend tại lượt kiểm tra. Cần hoàn thiện giấy phép/nguồn tham khảo, thông tin thành viên và bằng chứng đóng góp, bản release nộp bài theo yêu cầu chung. C# backend cần phù hợp với yêu cầu hoặc được giảng viên chấp thuận; không thể suy ra việc chấp thuận từ test pass.

## Chạy lại và bằng chứng

Chạy từ junction ASCII theo `docs/SETUP.md`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-all.ps1
```

- Báo cáo tổng hiện tại: `artifacts/test-report.md`, `artifacts/test-report.json`, `artifacts/test-all.log`.
- Bằng chứng lỗi trước sửa: `artifacts/recheck-before.json`, `artifacts/recheck-before.log`.
- Chrome TechStore: `artifacts/browser-techstore.log`, ảnh tại `artifacts/recheck-browser-techstore/shots/`.
- Chrome Fashion/Beautyshop sau bỏ kiểm tra yếu: `artifacts/browser-fashion-beauty-strict.log`, ảnh tại `artifacts/recheck-browser-fashion-beauty-strict/shots/`.
- Script Chrome và hướng dẫn chạy: `tests/browser/README.md`.

Mọi thao tác ghi dữ liệu trong lượt này dùng MariaDB demo cổng **3307**; không chạy SQL trên `translation_manager:3306`. Dữ liệu demo giữ lại; dịch vụ được dừng sau kiểm tra. Các thay đổi chưa commit/push. `artifacts/` và `.local/` không đưa vào Git, vì có cấu hình/key đọc release demo và ảnh màn hình.
