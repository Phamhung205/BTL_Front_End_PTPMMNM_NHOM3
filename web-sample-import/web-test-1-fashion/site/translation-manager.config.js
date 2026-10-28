// Tải tệp này từ trang Phát hành của Translation Manager ngay sau khi phát hành (đã điền sẵn releaseId và API key).
// Tệp mẫu dưới đây chỉ để website chạy được khi chưa có key: chữ gốc tiếng Việt được giữ nguyên.
window.TRANSLATION_MANAGER_CONFIG = {
  apiBaseUrl: 'http://127.0.0.1:5088',
  releaseId: 0,
  apiKey: 'PASTE_API_KEY_HERE',
  selector: '[data-translation-language]',
  defaultLocale: 'vi'
};
