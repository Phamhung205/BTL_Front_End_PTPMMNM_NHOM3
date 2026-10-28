// Nối menu ngôn ngữ của TechStore với Translation Manager.
// - Trang chủ có <select data-translation-language>: client tự gắn sự kiện.
// - Các trang khác dùng menu riêng; main.js phát sự kiện techstore:language-change.
(() => {
  const storageKey = 'techstore-language';
  document.addEventListener('techstore:language-change', event => {
    const language = event.detail?.language;
    if (language && window.TranslationManager) TranslationManager.setLanguage(language).catch(error => console.error('[TranslationManager]', error));
  });
  document.addEventListener('translationmanager:language-changed', event => {
    const locale = event.detail.locale;
    const label = document.querySelector('#langLabel');
    if (label) label.textContent = locale.toUpperCase();
    document.querySelectorAll('[data-translation-language]').forEach(select => { select.value = locale; });
    try { localStorage.setItem(storageKey, locale); } catch (_) {}
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.TranslationManager) { console.error('[TranslationManager] Thiếu translation-manager.js.'); return; }
    let saved = null;
    try { saved = localStorage.getItem(storageKey); } catch (_) {}
    const options = TranslationManager.locales.includes(saved) ? { defaultLocale: saved } : {};
    TranslationManager.init(options).catch(error => console.error('[TranslationManager]', error));
  });
})();
