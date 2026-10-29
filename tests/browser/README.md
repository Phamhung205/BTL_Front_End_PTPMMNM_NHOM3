# Kiểm thử Chrome thật

Hai script này được đưa từ bộ kiểm tra local vào repo để có thể chạy lại. Dùng Chrome đã cài trên Windows tại `C:\Program Files\Google\Chrome\Application\chrome.exe`, PHP XAMPP và module `playwright-core`.

1. Từ junction ASCII của frontend, chạy `scripts/prepare-demo.ps1`. Không chạy đồng thời với `tests/all.mjs` vì bước dọn dữ liệu QA của bộ tổng sẽ xóa dữ liệu vừa tạo.
2. Chuẩn bị thư viện (hoặc dùng đường dẫn `playwright-core/index.mjs` đã cài):

```powershell
npm install --prefix .local/browser-deps playwright-core
$pwModule = Join-Path $PWD.Path '.local/browser-deps/node_modules/playwright-core/index.mjs'
$env:TM_DEMO_ISOLATED = '1'
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
node tests/browser/import-web.mjs $pwModule $PWD.Path (Join-Path $PWD.Path "artifacts/chrome-techstore-$runId")
node tests/browser/kits-1-3.mjs $pwModule $PWD.Path (Join-Path $PWD.Path "artifacts/chrome-fashion-beauty-$runId")
Remove-Item Env:\TM_DEMO_ISOLATED
```

Các script kiểm tra runtime là `translation_manager_demo:3307` và xác minh thư mục dữ liệu MariaDB trùng workspace (hỗ trợ junction). Chỉ nhận thư mục đầu ra **mới**, nằm dưới `artifacts`; không xóa thư mục cũ.

- `import-web.mjs`: 53 kiểm tra, tạo dự án và import nhiều tệp qua UI, Reviewer duyệt, phát hành 1.0.0, website đọc gói, nhập v2/xem diff/sửa biến/duyệt/phát hành 2.0.0 và so sánh website dùng gói cũ.
- `kits-1-3.mjs`: 101 kiểm tra: nhập nguồn/bản dịch Fashion và Beautyshop qua giao diện; kiểm tra mọi vị trí có khóa của Fashion trong vi/en/ja và cả 4 trang Beautyshop trong vi/en. Chuẩn bị dự án và duyệt/phát hành dùng API. Dữ liệu Fashion đủ 86 khóa mỗi ngôn ngữ, không điền chuỗi QA khi thiếu bản dịch.

Website mẫu chạy tạm trên 8102/8103 và 8111/8113. Chrome và máy chủ mẫu được đóng khi kết thúc. Dự án demo và gói đã tạo được giữ trong DB demo để xem lại; ảnh/config nằm trong `artifacts` bị Git bỏ qua. Chạy `scripts/stop-integrated.ps1` từ cùng junction để dừng PHP/API/MariaDB demo.

## Phạm vi rà chữ đầy đủ

Lượt hoàn thiện: **53/53 TechStore + 101/101 Fashion/Beautyshop = 154/154**, chạy Chrome thật với các gói được import, duyệt và phát hành trên API/DB demo.

- `site-coverage.mjs` duyệt toàn bộ nút chữ trong DOM (kể cả phần đang ẩn), option, placeholder, title, alt, aria-label; báo lỗi nếu chữ cần dịch chưa có khóa hoặc nội dung không khớp từ điển/ngôn ngữ hiện tại. Chỉ bỏ qua tên ngôn ngữ bản địa có `translate="no"`, số/giá, mã đơn, email/URL, chữ viết tắt avatar.
- `site-interactions.mjs` kiểm tra 7 thông báo Fashion ở vi/en/ja, mọi nút giỏ hàng Beautyshop ở vi/en, gửi liên hệ, lỗi mật khẩu, 4 mức độ mạnh, nhãn hiện/ẩn mật khẩu, bộ lọc, tiêu đề dashboard và trạng thái đăng nhập TechStore.
- Đổi ngôn ngữ khi nút/thông báo giỏ hàng đang hiển thị: câu, tên sản phẩm và nút sau khi phục hồi vẫn đúng ngôn ngữ mới; lựa chọn sắp xếp được giữ nguyên.
- Cả 9 tệp HTML được rà: Fashion 1 tệp chứa các màn hình; TechStore 4 trang; Beautyshop 4 trang.
- Tên riêng, thương hiệu, mã sản phẩm/đơn, giá và dữ liệu người dùng giữ nguyên. Thông báo kiểm tra trường bắt buộc/email do trình duyệt cung cấp phụ thuộc ngôn ngữ Chrome, không phải chuỗi trong website.
