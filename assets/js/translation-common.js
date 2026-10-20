/**
 * Translation Common - Translation Manager
 * Tiện ích dùng chung cho các trang Bản dịch / Đánh giá / Phát hành (module Phạm Thế Đức).
 *
 * Mọi dữ liệu người dùng nhập đều render bằng textContent để tránh XSS.
 * Cần nạp sau api.js và ui.js.
 */
const TM = (function () {
    const PLACEHOLDER_SOURCE = '\\{[A-Za-z_][A-Za-z0-9_]*\\}';

    const STATUS_META = {
        missing:      { label: 'Chưa dịch',   cls: 'bg-gray-100 text-gray-600' },
        draft:        { label: 'Bản nháp',    cls: 'bg-yellow-100 text-yellow-800' },
        translated:   { label: 'Chờ duyệt',   cls: 'bg-blue-100 text-blue-700' },
        needs_review: { label: 'Cần sửa lại', cls: 'bg-orange-100 text-orange-700' },
        approved:     { label: 'Đã duyệt',    cls: 'bg-green-100 text-green-700' }
    };

    const ROLE_LABEL = { manager: 'Manager', translator: 'Translator', reviewer: 'Reviewer' };

    /** Tạo phần tử DOM an toàn: el('span', { class: '...', text: '...' }, [children]) */
    function el(tag, props, children) {
        const node = document.createElement(tag);
        if (props) {
            Object.keys(props).forEach(function (key) {
                const value = props[key];
                if (value === null || value === undefined || value === false) return;
                if (key === 'class') node.className = value;
                else if (key === 'text') node.textContent = value;
                else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.substring(2), value);
                else node.setAttribute(key, value === true ? '' : value);
            });
        }
        const list = Array.isArray(children) ? children : (children === undefined || children === null ? [] : [children]);
        list.forEach(function (child) {
            if (child === null || child === undefined || child === false) return;
            node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
        });
        return node;
    }

    // ===== Placeholder {name}/{count} — cùng quy tắc với PlaceholderValidator của Backend =====

    function extractPlaceholders(text) {
        const found = (text || '').match(new RegExp(PLACEHOLDER_SOURCE, 'g')) || [];
        return Array.from(new Set(found)).sort();
    }

    function checkPlaceholders(source, value) {
        const expected = extractPlaceholders(source);
        const actual = extractPlaceholders(value);
        const missing = expected.filter(function (p) { return actual.indexOf(p) < 0; });
        const extra = actual.filter(function (p) { return expected.indexOf(p) < 0; });
        return { expected: expected, actual: actual, missing: missing, extra: extra, ok: missing.length === 0 && extra.length === 0 };
    }

    /** Hiển thị văn bản, tô màu các biến {name}. */
    function renderHighlighted(container, text) {
        container.textContent = '';
        const str = text || '';
        const re = new RegExp(PLACEHOLDER_SOURCE, 'g');
        let last = 0;
        let match;
        while ((match = re.exec(str)) !== null) {
            if (match.index > last) container.appendChild(document.createTextNode(str.substring(last, match.index)));
            container.appendChild(el('span', { class: 'px-1 rounded bg-purple-100 text-purple-700 font-mono', text: match[0] }));
            last = match.index + match[0].length;
        }
        if (last < str.length) container.appendChild(document.createTextNode(str.substring(last)));
    }

    function placeholderSummary(check) {
        const parts = [];
        if (check.missing.length) parts.push('thiếu ' + check.missing.join(', '));
        if (check.extra.length) parts.push('thừa ' + check.extra.join(', '));
        return parts.join('; ');
    }

    // ===== Hiển thị =====

    function statusBadge(status) {
        const meta = STATUS_META[status] || { label: status || '--', cls: 'bg-gray-100 text-gray-700' };
        return el('span', { class: 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ' + meta.cls, text: meta.label });
    }

    function formatDateTime(value) {
        if (!value) return '--';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function formatBytes(bytes) {
        if (bytes === null || bytes === undefined) return '--';
        if (bytes < 1024) return bytes + ' B';
        return (bytes / 1024).toFixed(1) + ' KB';
    }

    function show(id, visible) {
        const node = document.getElementById(id);
        if (node) node.classList.toggle('hidden', !visible);
    }

    /** Thông báo lỗi từ kết quả apiFetch, kèm chi tiết placeholder nếu Backend trả về. */
    function errorMessage(result, fallback) {
        let message = (result && result.message) || fallback || 'Có lỗi xảy ra.';
        const details = result && result.data && result.data.details;
        if (details && (Array.isArray(details.missing) || Array.isArray(details.extra))) {
            const summary = placeholderSummary({ missing: details.missing || [], extra: details.extra || [] });
            if (summary) message += ' (' + summary + ')';
        }
        return message;
    }

    function debounce(fn, ms) {
        let timer = null;
        return function () {
            const args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(null, args); }, ms);
        };
    }

    // ===== Trạng thái trang (URL + sessionStorage) =====

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function setQueryParams(params) {
        const url = new URL(window.location.href);
        Object.keys(params).forEach(function (key) {
            const value = params[key];
            if (value === null || value === undefined || value === '') url.searchParams.delete(key);
            else url.searchParams.set(key, value);
        });
        window.history.replaceState(null, '', url.toString());
    }

    function storageGet(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function storageSet(key, value) {
        try { sessionStorage.setItem(key, value); } catch (e) {}
    }

    function currentUser() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user_display') || '{}');
            return { id: user.id ? Number(user.id) : null, name: user.name || '', email: user.email || '' };
        } catch (e) {
            return { id: null, name: '', email: '' };
        }
    }

    function listFrom(data) {
        return Array.isArray(data) ? data : ((data && (data.data || data.items)) || []);
    }

    // ===== Dự án / ngôn ngữ / thành viên =====

    /**
     * Nạp danh sách dự án vào <select>. Ưu tiên ?project_id trên URL, sau đó dự án dùng gần nhất.
     */
    async function initProjectPicker(selectEl) {
        const result = await apiGet('/api/projects');
        if (!result.success) return { error: result.message || 'Không tải được danh sách dự án.', projects: [], project: null };

        const projects = listFrom(result.data);
        selectEl.textContent = '';
        projects.forEach(function (p) {
            selectEl.appendChild(el('option', { value: String(p.id), text: p.name + ' · ' + (ROLE_LABEL[p.role] || p.role) }));
        });

        const wanted = getQueryParam('project_id') || storageGet('tm_current_project');
        const project = projects.find(function (p) { return String(p.id) === String(wanted); }) || projects[0] || null;
        if (project) {
            selectEl.value = String(project.id);
            rememberProject(project.id);
        }
        return { projects: projects, project: project };
    }

    function rememberProject(id) {
        storageSet('tm_current_project', String(id));
        setQueryParams({ project_id: id });
    }

    async function loadLocales(projectId) {
        const result = await apiGet('/api/projects/' + encodeURIComponent(projectId) + '/locales');
        if (!result.success) return { error: result.message || 'Không tải được danh sách ngôn ngữ.', all: [], targets: [], source: null };
        const all = listFrom(result.data);
        return {
            all: all,
            targets: all.filter(function (l) { return !l.isSource; }),
            source: all.find(function (l) { return l.isSource; }) || null
        };
    }

    function fillLocaleSelect(selectEl, locales) {
        selectEl.textContent = '';
        locales.forEach(function (l) {
            selectEl.appendChild(el('option', { value: l.code, text: l.code + (l.name && l.name !== l.code ? ' — ' + l.name : '') }));
        });
        const wanted = getQueryParam('locale') || storageGet('tm_current_locale');
        const found = locales.find(function (l) { return l.code === wanted; }) || locales[0];
        if (found) {
            selectEl.value = found.code;
            rememberLocale(found.code);
        }
        return found ? found.code : null;
    }

    function rememberLocale(code) {
        storageSet('tm_current_locale', code);
        setQueryParams({ locale: code });
    }

    async function loadMembers(projectId) {
        const result = await apiGet('/api/projects/' + encodeURIComponent(projectId) + '/members');
        return result.success ? listFrom(result.data) : [];
    }

    return {
        el: el,
        STATUS_META: STATUS_META,
        ROLE_LABEL: ROLE_LABEL,
        extractPlaceholders: extractPlaceholders,
        checkPlaceholders: checkPlaceholders,
        placeholderSummary: placeholderSummary,
        renderHighlighted: renderHighlighted,
        statusBadge: statusBadge,
        formatDateTime: formatDateTime,
        formatBytes: formatBytes,
        show: show,
        errorMessage: errorMessage,
        debounce: debounce,
        getQueryParam: getQueryParam,
        setQueryParams: setQueryParams,
        storageGet: storageGet,
        storageSet: storageSet,
        currentUser: currentUser,
        listFrom: listFrom,
        initProjectPicker: initProjectPicker,
        rememberProject: rememberProject,
        loadLocales: loadLocales,
        fillLocaleSelect: fillLocaleSelect,
        rememberLocale: rememberLocale,
        loadMembers: loadMembers
    };
})();
