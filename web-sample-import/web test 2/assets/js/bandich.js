(() => {
  const storageKey = 'techstore-translations';
  const translationAttributes = ['placeholder', 'title'];
  let pendingImport = null;
  let importStatus = null;

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function hasStringValue(value) {
    return typeof value === 'string'
      || (isObject(value) && Object.values(value).some(hasStringValue));
  }

  function getTranslation(translations, key) {
    return key.split('.').reduce((value, part) => {
      return isObject(value) ? value[part] : undefined;
    }, translations);
  }

  function applyTranslations(translations) {
    let appliedCount = 0;

    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = getTranslation(translations, element.dataset.i18n);
      if (typeof value === 'string') {
        element.textContent = value;
        appliedCount++;
      }
    });

    translationAttributes.forEach(attribute => {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
        const key = element.dataset[`i18n${attribute[0].toUpperCase()}${attribute.slice(1)}`];
        const value = getTranslation(translations, key);
        if (typeof value === 'string') {
          element.setAttribute(attribute, value);
          appliedCount++;
        }
      });
    });

    const titleElement = document.querySelector('[data-i18n-document-title]');
    if (titleElement) {
      const value = getTranslation(translations, titleElement.dataset.i18nDocumentTitle);
      if (typeof value === 'string') {
        document.title = value;
        appliedCount++;
      }
    }

    return appliedCount;
  }

  function showStatus(status, message, isError = false) {
    status.textContent = message;
    status.classList.toggle('translation-import-error', isError);
  }

  function setCurrentLanguage(language, translations) {
    const translation = translations[language];
    if (!isObject(translation)) return null;

    const appliedCount = applyTranslations(translation);
    document.documentElement.lang = language;
    const languageLabel = document.querySelector('#langLabel');
    if (languageLabel) languageLabel.textContent = language.toUpperCase();
    return appliedCount;
  }

  document.addEventListener('techstore:language-change', event => {
    const language = event.detail?.language;
    if (language !== 'vi' && language !== 'en') return;

    try {
      const savedImport = localStorage.getItem(storageKey);
      if (!savedImport) throw new Error('Hãy import cả vi.json và en.json trước khi đổi ngôn ngữ.');

      const imported = JSON.parse(savedImport);
      const appliedCount = isObject(imported.translations)
        ? setCurrentLanguage(language, imported.translations)
        : null;
      if (appliedCount === null) {
        throw new Error(`Không tìm thấy bản dịch ${language}.json đã import.`);
      }

      imported.language = language;
      localStorage.setItem(storageKey, JSON.stringify(imported));
      if (importStatus) {
        const message = appliedCount > 0
          ? `Đã chuyển sang ${language.toUpperCase()}.`
          : `Đã chuyển sang ${language.toUpperCase()}; trang này chưa có khóa dịch tương ứng.`;
        showStatus(importStatus, message, appliedCount === 0);
      }
    } catch (error) {
      if (importStatus) showStatus(importStatus, error.message, true);
    }
  });

  function initTranslationImport() {
    const panel = document.createElement('section');
    panel.className = 'translation-import';
    panel.setAttribute('aria-label', 'Import bản dịch');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.multiple = true;
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Chọn thư mục có Json/vi.json và Json/en.json');
    fileInput.setAttribute('webkitdirectory', '');
    fileInput.setAttribute('directory', '');

    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'translation-import-button';
    selectButton.textContent = 'Import thư mục ngôn ngữ';
    selectButton.addEventListener('click', () => fileInput.click());

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = 'translation-import-button translation-apply-button';
    applyButton.textContent = 'Áp dụng bản dịch';
    applyButton.hidden = true;

    const status = document.createElement('p');
    status.className = 'translation-import-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Chọn thư mục có Json/vi.json và Json/en.json; sau đó đổi ngôn ngữ bằng menu.';
    importStatus = status;

    fileInput.addEventListener('change', async () => {
      const files = [...(fileInput.files || [])];
      if (files.length === 0) return;

      try {
        const translations = {};
        for (const file of files) {
          const language = file.name.match(/^(vi|en)\.json$/i)?.[1]?.toLowerCase();
          if (!language) continue;
          if (translations[language]) throw new Error(`File ${language}.json bị chọn nhiều lần.`);

          const content = JSON.parse(await file.text());
          if (!isObject(content) || !hasStringValue(content)) {
            throw new Error(`${file.name} không có cấu trúc bản dịch hợp lệ.`);
          }
          translations[language] = content;
        }

        if (!translations.vi || !translations.en) {
          throw new Error('Thư mục cần có đủ Json/vi.json và Json/en.json.');
        }

        pendingImport = { translations, language: document.documentElement.lang === 'en' ? 'en' : 'vi' };
        applyButton.hidden = false;
        showStatus(status, 'Đã chọn vi.json và en.json. Nhấn “Áp dụng bản dịch” để lưu và chuyển đổi ngôn ngữ.');
      } catch (error) {
        pendingImport = null;
        applyButton.hidden = true;
        showStatus(status, `Không thể đọc bản dịch: ${error.message}`, true);
      } finally {
        fileInput.value = '';
      }
    });

    applyButton.addEventListener('click', () => {
      if (!pendingImport) return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(pendingImport));
        const language = pendingImport.language;
        const applied = setCurrentLanguage(language, pendingImport.translations);
        const message = applied > 0
          ? 'Đã lưu vi.json và en.json. Có thể đổi ngôn ngữ bất cứ lúc nào mà không cần import lại.'
          : 'Đã lưu vi.json và en.json; trang này chưa có khóa dịch tương ứng. Có thể đổi ngôn ngữ bằng menu.';
        showStatus(status, message);
      } catch (error) {
        showStatus(status, `Không thể lưu bản dịch: ${error.message}`, true);
      }
    });

    panel.append(selectButton, applyButton, fileInput, status);
    document.body.prepend(panel);

    try {
      const savedImport = localStorage.getItem(storageKey);
      if (!savedImport) return;

      const imported = JSON.parse(savedImport);
      if (!isObject(imported) || !isObject(imported.translations)) {
        throw new Error('Dữ liệu bản dịch đã lưu không hợp lệ.');
      }

      if (isObject(imported.translations.vi) && isObject(imported.translations.en)) {
        const language = imported.language === 'en' ? 'en' : 'vi';
        setCurrentLanguage(language, imported.translations);
      } else {
        showStatus(status, 'Bản dịch cũ chỉ có một ngôn ngữ. Hãy import lại thư mục có đủ vi.json và en.json.', true);
      }
    } catch (error) {
      showStatus(status, `Không thể tải bản dịch đã lưu: ${error.message}`, true);
    }
  }

  document.addEventListener('DOMContentLoaded', initTranslationImport);
})();
