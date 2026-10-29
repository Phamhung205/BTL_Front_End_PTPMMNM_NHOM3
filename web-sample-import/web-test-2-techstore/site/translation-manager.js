(() => {
  const supportedLocales = ["en","vi"];
  const defaults = window.TRANSLATION_MANAGER_CONFIG || {};
  let config = {};
  let dictionary = {};
  let sequence = 0;

  function getValue(object, path) {
    return path.split('.').reduce((value, part) => value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined, object);
  }

  function interpolate(text, variables = {}) {
    return text.replace(/\{([A-Za-z0-9_.-]+)\}/g, (token, key) => Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : token);
  }

  function translate(key, variables = {}, fallback = key) {
    const value = getValue(dictionary, key);
    return interpolate(typeof value === 'string' ? value : fallback, variables);
  }

  function format(element, text) {
    let variables = {};
    try { variables = JSON.parse(element.dataset.i18nVars || '{}'); } catch (_) {}
    return interpolate(text, variables);
  }

  function apply(localeDictionary) {
    let changed = 0;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = getValue(localeDictionary, element.dataset.i18n);
      if (typeof value === 'string') { element.textContent = format(element, value); changed++; }
    });
    ['placeholder', 'title', 'alt', 'aria-label'].forEach(attribute => {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
        const value = getValue(localeDictionary, element.getAttribute(`data-i18n-${attribute}`));
        if (typeof value === 'string') { element.setAttribute(attribute, format(element, value)); changed++; }
      });
    });
    const title = document.querySelector('[data-i18n-document-title]');
    if (title) {
      const value = getValue(localeDictionary, title.dataset.i18nDocumentTitle);
      if (typeof value === 'string') { document.title = format(title, value); changed++; }
    }
    return changed;
  }

  async function setLanguage(locale) {
    if (!supportedLocales.includes(locale)) throw new Error(`Ngôn ngữ không có trong gói phát hành: ${locale}`);
    if (!config.apiBaseUrl || !config.releaseId || !config.apiKey) throw new Error('Điền apiBaseUrl, releaseId và apiKey trong translation-manager.config.js.');
    const current = ++sequence;
    const endpoint = `${config.apiBaseUrl.replace(/\/+$/, '')}/api/public/releases/${encodeURIComponent(config.releaseId)}/files/${encodeURIComponent(locale)}`;
    const response = await fetch(endpoint, { headers: { 'X-API-Key': config.apiKey } });
    if (!response.ok) throw new Error(response.status === 401 ? 'API key không hợp lệ hoặc đã bị thu hồi.' : `Không tải được bản dịch ${locale}.`);
    const next = await response.json();
    if (current !== sequence) return 0;
    dictionary = next;
    document.documentElement.lang = locale;
    const changed = apply(dictionary);
    document.dispatchEvent(new CustomEvent('translationmanager:language-changed', { detail: { locale, changed } }));
    return changed;
  }

  window.TranslationManager = {
    locales: supportedLocales.slice(),
    setLanguage,
    t: translate,
    apply: () => apply(dictionary),
    async init(options = {}) {
      config = { ...defaults, ...options };
      const selector = config.selector || '[data-translation-language]';
      const select = document.querySelector(selector);
      const initial = config.defaultLocale || select?.value || document.documentElement.lang || supportedLocales[0];
      if (select) {
        const existingLabels = Object.fromEntries([...select.options].map(option => [option.value, option.textContent.trim()]));
        select.replaceChildren(...supportedLocales.map(locale => {
          const option = document.createElement('option');
          option.value = locale;
          option.translate = false;
          option.textContent = config.labels?.[locale] || existingLabels[locale] || locale.toUpperCase();
          return option;
        }));
        select.value = supportedLocales.includes(initial) ? initial : supportedLocales[0];
        select.addEventListener('change', () => setLanguage(select.value).catch(error => console.error('[TranslationManager]', error)));
      }
      return setLanguage(supportedLocales.includes(initial) ? initial : supportedLocales[0]);
    }
  };
})();
