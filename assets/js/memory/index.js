(() => {
    const endpoint = APP_CONFIG.endpoints.translationMemory;
    const languagesEndpoint = APP_CONFIG.endpoints.translationMemoryLanguages;
    const languageSelect = document.getElementById('memory-language');
    const results = document.getElementById('memory-results');
    const status = document.getElementById('memory-status');
    const query = document.getElementById('memory-query');
    let page = 1;
    let hasMore = false;
    let languageName = '';
    let selectedTranslation = '';

    async function loadLanguages() {
        const response = await apiGet(languagesEndpoint);
        if (!response.success || !Array.isArray(response.data?.items)) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Không tải được ngôn ngữ — hãy thử tải lại';
            languageSelect.replaceChildren(option);
            languageSelect.disabled = true;
            status.textContent = response.message || 'Không tải được danh sách ngôn ngữ.';
            showElement('memory-retry');
            return false;
        }
        hideElement('memory-retry');
        languageSelect.disabled = false;
        languageSelect.replaceChildren();
        for (const language of response.data.items) {
            if (!language || typeof language.code !== 'string' || typeof language.name !== 'string') continue;
            const option = document.createElement('option');
            option.value = language.code;
            const count = Number.isSafeInteger(language.count) ? language.count : 0;
            option.textContent = `${language.name} (${language.code}) — ${count.toLocaleString('vi-VN')} bản dịch`;
            languageSelect.append(option);
        }
        if (!languageSelect.options.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chưa có ngôn ngữ nào trong kho';
            languageSelect.append(option);
            languageSelect.disabled = true;
            status.textContent = 'Kho chưa có bản dịch đã gửi hoặc duyệt.';
            return false;
        }
        return true;
    }

    function rowCell(text, className = '') {
        const cell = document.createElement('td');
        cell.className = `px-4 py-3 align-top ${className}`;
        cell.textContent = text;
        return cell;
    }

    function render(items) {
        results.replaceChildren();
        if (!items.length) {
            const row = document.createElement('tr');
            const cell = rowCell('Không tìm thấy bản dịch phù hợp.', 'text-gray-500');
            cell.colSpan = 3;
            row.append(cell);
            results.append(row);
            return;
        }
        for (const item of items) {
            if (typeof item?.sourceText !== 'string' || typeof item?.targetText !== 'string') continue;
            const row = document.createElement('tr');
            row.className = 'border-t border-gray-100 hover:bg-indigo-50/50';
            row.append(rowCell(item.sourceText, 'whitespace-pre-wrap'));
            row.append(rowCell(item.targetText, 'whitespace-pre-wrap'));
            const action = document.createElement('td');
            action.className = 'px-4 py-3 align-top';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'text-indigo-700 hover:underline font-medium';
            button.textContent = 'Chọn bản dịch';
            button.addEventListener('click', () => select(item));
            action.append(button);
            row.append(action);
            results.append(row);
        }
    }

    function select(item) {
        selectedTranslation = item.targetText;
        document.getElementById('memory-source-text').textContent = item.sourceText;
        document.getElementById('memory-target-text').textContent = item.targetText;
        document.getElementById('memory-detail-language').textContent = languageName;
        showElement('memory-detail');
        document.getElementById('memory-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function search() {
        const locale = languageSelect.value;
        languageName = languageSelect.selectedOptions[0]?.textContent || locale;
        if (!locale) return;
        status.textContent = 'Đang tìm trong kho bản dịch...';
        const response = await apiGet(endpoint, { query: { locale, q: query.value.trim(), page: String(page) } });
        if (!response.success) {
            status.textContent = response.message || 'Không tải được kho bản dịch.';
            return;
        }
        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        render(items);
        hasMore = Boolean(response.data?.hasMore);
        document.getElementById('memory-page').textContent = `Trang ${page} · ${response.data?.total ?? items.length} kết quả`;
        document.getElementById('memory-previous').disabled = page <= 1;
        document.getElementById('memory-next').disabled = !hasMore;
        document.getElementById('memory-target-heading').textContent = `Bản dịch · ${languageName}`;
        status.textContent = items.length ? 'Chọn một kết quả để xem bản dịch.' : 'Không tìm thấy bản dịch phù hợp.';
        hideElement('memory-detail');
    }

    document.getElementById('memory-filter').addEventListener('submit', event => { event.preventDefault(); page = 1; search(); });
    document.getElementById('memory-retry').addEventListener('click', async () => { if (await loadLanguages()) search(); });
    languageSelect.addEventListener('change', () => { page = 1; search(); });
    document.getElementById('memory-previous').addEventListener('click', () => { if (page > 1) { page--; search(); } });
    document.getElementById('memory-next').addEventListener('click', () => { if (hasMore) { page++; search(); } });
    document.getElementById('memory-copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(selectedTranslation); showToast('Đã sao chép bản dịch.', 'success'); }
        catch (_) { showToast('Trình duyệt không cho phép sao chép tự động.', 'error'); }
    });

    loadLanguages().then(loaded => { if (loaded) search(); });
})();
