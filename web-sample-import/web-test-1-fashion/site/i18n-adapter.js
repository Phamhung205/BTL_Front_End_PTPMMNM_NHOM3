// Thay languages.js: giữ API cũ (currentLanguage, t, setLanguage, initLanguage, updatePageLanguage)
// nhưng lấy nội dung từ gói đã phát hành của Translation Manager qua translation-manager.js.
let currentLanguage = 'vi';
const languageLabels = { vi: 'Tiếng Việt', en: 'English', ja: '日本語' };
const languageSelectors = '#languageSelector, #dashboardLanguageSelector';

function t(key) { return key; }
function updatePageLanguage() { /* client đã áp dụng bản dịch cho mọi phần tử data-i18n */ }

function syncLanguageSelectors(lang) {
    document.querySelectorAll(languageSelectors).forEach(select => {
        if ([...select.options].some(option => option.value === lang)) select.value = lang;
    });
}

function setLanguage(lang) {
    if (!window.TranslationManager) return Promise.resolve(0);
    return TranslationManager.setLanguage(lang).then(changed => {
        currentLanguage = lang;
        syncLanguageSelectors(lang);
        try { localStorage.setItem('language', lang); } catch (_) {}
        return changed;
    }).catch(error => { console.error('[TranslationManager]', error); syncLanguageSelectors(currentLanguage); });
}

function initLanguage() {
    if (!window.TranslationManager) { console.error('[TranslationManager] Thiếu translation-manager.js.'); return; }
    document.querySelectorAll(languageSelectors).forEach(select => {
        select.replaceChildren(...TranslationManager.locales.map(code => new Option(languageLabels[code] || code.toUpperCase(), code)));
    });
    let saved = null;
    try { saved = localStorage.getItem('language'); } catch (_) {}
    const config = window.TRANSLATION_MANAGER_CONFIG || {};
    const initial = TranslationManager.locales.includes(saved) ? saved : (config.defaultLocale || 'vi');
    syncLanguageSelectors(initial);
    // Hai bộ chọn đã được script.js gắn sự kiện gọi setLanguage(); client không gắn thêm bộ chọn nào.
    TranslationManager.init({ selector: '[data-translation-manager-unused]', defaultLocale: initial })
        .then(() => { currentLanguage = initial; })
        .catch(error => console.error('[TranslationManager]', error));
}
