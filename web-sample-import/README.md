# Import website mẫu vào Translation Manager

Ba website mẫu (`web test 1`, `web test 2`, `web test 3`) đã được chuyển thành **bộ import** để đưa vào hệ thống qua giao diện web, dịch/duyệt, phát hành và cho chính website đọc gói đã phát hành.

| Bộ | Website | Tình trạng gốc | Đã chuẩn bị |
| --- | --- | --- | --- |
| `web-test-1-fashion` | Shop thời trang, 1 trang (đăng nhập, dashboard, sản phẩm) | Từ điển `languages.js` (en/vi/ja) thiếu khóa và nhiều câu tiếng Nhật chưa hoàn chỉnh | Gắn khóa HTML, hoàn thiện **86 khóa ở mỗi tệp vi/en/ja**, không còn giá trị rỗng hoặc chuỗi QA `[en]`/`[ja]`; `i18n-adapter.js` giữ API cũ của `languages.js` |
| `web-test-2-techstore` | TechStore 4 trang | Đã có `data-i18n`; mỗi ngôn ngữ chia 2 tệp (`vi.json` + `vi 2.json`) | `i18n/vi.json`, `en.json` 236 khóa (đã gộp); `i18n/v2/` cho tình huống 2; mọi trang dùng gói phát hành (bỏ import cục bộ localStorage) |
| `web-test-3-beautyshop` | Lumière Beauty 4 trang | Chữ tiếng Việt viết cứng, nút VI/EN chỉ đổi nhãn | Tách chữ thành 197 khóa (`common.*`, `index.*`, `about.*`...), gắn khóa cho cả 4 trang, danh sách lựa chọn và thông báo động; `en.json` là bản dịch đề xuất; nút VI/EN đọc gói |

Cấu trúc mỗi bộ: `i18n/` (JSON để nhập), `site/` (website đã gắn khóa + `translation-manager.js` + `translation-manager.config.js` mẫu).

## Phần chữ đã hoàn thiện

- Fashion: toàn bộ màn hình đăng nhập/đăng ký/dashboard/sản phẩm, 7 thông báo và tên danh mục trong thông báo lọc; vi/en/ja.
- TechStore: cả 4 trang, menu, bảng thống kê, thứ trong tuần, tooltip, đăng ký, độ mạnh mật khẩu, lỗi và trạng thái đăng nhập; vi/en. Bộ chọn chỉ hiện ngôn ngữ có trong release.
- Beautyshop: cả 4 trang, lựa chọn sắp xếp/chủ đề liên hệ, placeholder tin nhắn, thông báo liên hệ/giỏ hàng và tên sản phẩm trong thông báo; vi/en.
- Chữ động đang hiện cũng đổi khi đổi ngôn ngữ. Giá, mã đơn, tên riêng, thương hiệu và tên ngôn ngữ bản địa giữ nguyên.
- Bản nguồn và bản dịch đủ cùng tập khóa và biến. Chạy Chrome theo [tests/browser/README.md](../tests/browser/README.md) để rà cả chữ chưa gắn khóa, thuộc tính và thao tác, không chỉ các vị trí đã có khóa.

**Đã import bộ cũ:** nhập toàn bộ `i18n/vi.json` mới thành phiên bản nguồn mới; nhập lại các tệp đích với tùy chọn *Thay bản dịch đang có*, gửi Reviewer duyệt, rồi phát hành phiên bản mới. Tải lại **cả client và config** vào website. Bản phát hành cũ giữ nguyên.

## Các bước import qua giao diện web (Manager)

1. **Tạo dự án** (Dự án → Tạo dự án): ngôn ngữ nguồn `vi`; bỏ chọn `vi` ở ngôn ngữ đích, chọn `en` (web test 1 thêm `ja`); thêm email Translator và Reviewer.
2. **Phiên bản nguồn** → chọn tệp nguồn → đặt tên phiên bản (ví dụ `v1`) → **Nhập nguồn**.
   - Web test 2 có thể chọn **cùng lúc** `site/Json/vi.json` và `site/Json/vi 2.json`: trang tự gộp theo khóa (khóa trùng khác nội dung sẽ bị báo lỗi). Hoặc chọn `i18n/vi.json` đã gộp sẵn.
   - Hộp xác nhận hiển thị **xem trước khác biệt** so với nguồn đang dùng: số khóa mới / sửa / giữ nguyên / sẽ bị đánh dấu xóa, kèm danh sách khóa sẽ bị xóa. Nếu tệp chỉ chứa một phần nguồn, hãy chọn đủ mọi tệp để không mất khóa không liên quan.
3. **Bản dịch** → chọn ngôn ngữ đích → **Nhập bản dịch từ tệp JSON** → chọn `i18n/en.json` (web test 2 có thể chọn cùng lúc `site/Json/en.json` + `site/Json/en2.json`) → chọn *Gửi duyệt* → **Nhập bản dịch**.
   - Không tự duyệt. Bản mới/cập nhật khớp biến được *Chờ duyệt*; bản sai biến được nhập thì chỉ lưu nháp. Bản đang có được giữ lại không đổi trạng thái. Báo cáo phân biệt số khóa sai biến trong tệp và số bản sai biến thực sự đã lưu nháp; nội dung rỗng, dài hơn 10.000 ký tự và khóa không có trong nguồn bị bỏ qua, liệt kê riêng.
   - Nhập lại cùng tệp không tạo bản ghi trùng. Bản đang có nội dung khác chỉ bị thay khi tích *Thay bản dịch đang có*.
4. Khóa còn thiếu: tick chọn → **Phân công khóa đã chọn** cho Translator → Translator dịch và *Gửi duyệt*.
5. **Đánh giá** (Reviewer): **Duyệt tất cả đang chờ** hoặc duyệt/từ chối từng bản.
6. **Phát hành** (Manager): nhập phiên bản `1.0.0` → **Phát hành**. Tải `translation-manager.config.js` (có sẵn releaseId và API key chỉ đọc, chỉ hiện một lần) và **Tải client tích hợp API**, chép `translation-manager.js` trong ZIP vào `site/`.
7. Mở website bằng máy chủ tĩnh bất kỳ, ví dụ:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8102 -t web-sample-import\web-test-2-techstore\site
```

Mở http://127.0.0.1:8102/login.html và đổi ngôn ngữ bằng menu của website. Website gọi `GET /api/public/releases/{releaseId}/files/{locale}` với header `X-API-Key`; key chỉ đọc đúng release đó.

`translation-manager.js` trong `site/` là bản do hệ thống sinh cho danh sách ngôn ngữ của bộ đó; nên tải lại từ release của bạn. `translation-manager.config.js` mẫu có `releaseId: 0` nên website chỉ hiển thị chữ gốc cho tới khi thay bằng tệp tải từ trang Phát hành.

## Tình huống 2 với web test 2

1. Đã phát hành `1.0.0` từ `i18n/vi.json` + `i18n/en.json`.
2. **Phiên bản nguồn** → nhập `i18n/v2/vi.json` tên `v2`. Xem trước: +1 khóa mới (`login.form.show_password`), 2 khóa sửa (`login.welcome.title`, `login.form.error` thêm biến `{name}`/`{count}`), 1 khóa sẽ bị xóa (`login.form.demo_label`). Sau khi nhập bấm **Xem thay đổi**.
3. **Bản dịch** → lọc *Cần sửa / nguồn thay đổi*: 2 khóa. Sửa theo `i18n/v2/en.json`; gửi thiếu `{name}` sẽ bị báo lỗi. Dịch khóa mới ở bộ lọc *Chưa dịch*. Các khóa khác vẫn *Đã duyệt*.
4. Reviewer duyệt → Manager phát hành `2.0.0` → website dùng config của `2.0.0` hiển thị "Welcome back, Lan!"; website dùng config của `1.0.0` vẫn hiển thị nội dung cũ.

## Tự chuẩn bị website khác

```powershell
# Website chưa có JSON: tách chữ HTML thành khóa + JSON nguồn (không sửa bản gốc)
node scripts/website-i18n/prepare-site.mjs <thư-mục-website> <thư-mục-đầu-ra> --locale vi
# Đã có từ điển dạng object JavaScript (languages.js): chuyển sang JSON theo ngôn ngữ
node scripts/website-i18n/js-dictionary-to-json.mjs languages.js translations <thư-mục-đầu-ra>
# Dùng lại khóa của từ điển khi tách HTML
node scripts/website-i18n/prepare-site.mjs <website> <đầu-ra> --locale vi --dictionary <đầu-ra-json>/vi.json
```

`prepare-site.mjs` gắn `data-i18n` cho chữ hiển thị, `data-i18n-placeholder` / `data-i18n-title` / `data-i18n-alt` / `data-i18n-aria-label` cho thuộc tính và cả nội dung `<option>`, `data-i18n-document-title` cho `<title>`; chữ trùng trên nhiều trang dùng chung khóa `common.*`. Bỏ qua script/style/svg/code, phần tử có `data-i18n-skip` hoặc `translate="no"`, số/giá/mã đơn/email/URL và chữ dưới 2 ký tự chữ cái. Chữ trong JavaScript cần được nối thủ công bằng `TranslationManager.t()` và `TranslationManager.apply()` (đã thực hiện trong cả 3 bộ mẫu); chữ bị chia mảnh bởi thẻ định dạng (ví dụ `Vẻ Đẹp <i>Thuần Khiết</i>`) thành nhiều khóa, người dịch cần dịch theo ngữ cảnh. Sau khi tách, gắn `translation-manager.config.js` và `translation-manager.js` trước script đổi ngôn ngữ của website rồi gọi `TranslationManager.init()` (xem `site/js/lang.js`, `site/assets/js/tm-adapter.js`, `site/i18n-adapter.js`).

Bộ import này được tạo từ các tệp zip gốc bằng hai công cụ trên; bản dịch `web-test-3-beautyshop/i18n/en.json` là bản đề xuất cho demo, vẫn phải qua Reviewer duyệt trong hệ thống.

## Chữ sinh ra bằng JavaScript

Client tích hợp do backend sinh đã hỗ trợ `t(key, variables)` và `apply()`:

```js
// Toast/alert: dịch câu và biến bằng gói hiện tại.
const message = TranslationManager.t('messages.password_short', { count: 8 });
document.getElementById('toastMsg').textContent = message;

// Nếu chữ cần đổi theo ngôn ngữ ngay khi đang hiển thị, giữ khóa trên phần tử.
const element = document.getElementById('toastMsg');
element.dataset.i18n = 'messages.password_short';
element.dataset.i18nVars = JSON.stringify({ count: 8 });
TranslationManager.apply();
```

Dùng `textContent` cho nội dung dịch; không ghép nội dung người dùng vào `innerHTML`. Khi biến cũng là bản dịch (tên sản phẩm/độ mạnh mật khẩu), tính lại biến trong sự kiện `translationmanager:language-changed` như các script mẫu.
