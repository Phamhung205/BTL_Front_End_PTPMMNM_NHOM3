/**
 * lang.js – Nút chuyển ngôn ngữ VI ⇆ EN, đọc gói đã phát hành từ Translation Manager.
 * Lumière Beauty
 */
let currentLang = 'VI';

function setLangLabel(locale) {
  currentLang = locale.toUpperCase();
  const label = document.getElementById('langLabel');
  if (label) label.textContent = currentLang;
}

function toggleLang() {
  const btn = document.getElementById('langToggleBtn');
  btn?.classList.add('scale-90');
  setTimeout(() => btn?.classList.remove('scale-90'), 150);
  if (!window.TranslationManager) { showToast('Thiếu translation-manager.js'); return; }
  const next = currentLang === 'VI' ? 'en' : 'vi';
  TranslationManager.setLanguage(next)
    .then(() => {
      try { localStorage.setItem('lumiere-language', next); } catch (_) {}
      showToast(next === 'en' ? 'Switched to English' : 'Đã chuyển sang Tiếng Việt');
    })
    .catch(error => { console.error('[TranslationManager]', error); showToast('Không tải được bản dịch: ' + error.message); });
}

document.addEventListener('translationmanager:language-changed', event => setLangLabel(event.detail.locale));
document.addEventListener('DOMContentLoaded', () => {
  if (!window.TranslationManager) return;
  let saved = null;
  try { saved = localStorage.getItem('lumiere-language'); } catch (_) {}
  const options = TranslationManager.locales.includes(saved) ? { defaultLocale: saved } : {};
  TranslationManager.init(options).catch(error => console.error('[TranslationManager]', error));
});
