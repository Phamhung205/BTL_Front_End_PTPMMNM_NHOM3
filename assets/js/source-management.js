/** Source / Language / Import workspace — module Bùi Đình Mạnh. */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const el = TM.el;
    const view = document.body.dataset.sourceView;
    const demo = SourceDemo.enabled;
    const routes = { languages: '../languages/index.php', keys: '../translation-keys/index.php', versions: '../source-versions/index.php', import: '../source-versions/import.php', changes: '../source-versions/changes.php' };
    const labels = { new: 'Khóa mới', changed: 'Đã sửa', deleted: 'Đã xóa', restored: 'Khôi phục', unchanged: 'Không đổi', active: 'Đang dùng' };
    const state = { projects: [], project: null, locales: [], keys: [], versions: [], changes: [], page: 1, generation: 0, preview: null, keysKnown: false, busy: false, editing: null, removing: null };
    const descriptions = {
        languages: 'Thiết lập ngôn ngữ và mở rộng nội dung đến nhiều người dùng hơn.',
        keys: 'Tất cả chuỗi văn bản của dự án, được tổ chức theo cấu trúc khóa.',
        versions: 'Theo dõi từng lần cập nhật và những thay đổi của chuỗi nguồn.',
        import: 'Đưa nội dung mới vào dự án. Kiểm tra thay đổi trước khi xác nhận.',
        changes: 'Xem chính xác những gì đã được thêm, chỉnh sửa và loại bỏ.'
    };
    function listen(id, event, fn) { if ($(id)) $(id).addEventListener(event, fn); }
    function show(id, visible) { if ($(id)) $(id).classList.toggle('hidden', !visible); }
    function text(id, value) { if ($(id)) $(id).textContent = value; }
    function notice(message, error) {
        const node = $('sm-notice'); node.textContent = message || ''; node.className = 'sm-notice' + (error ? ' sm-error' : '') + (message ? '' : ' hidden');
    }
    function fieldError(id, message) { text(id, message || ''); show(id, !!message); }
    function url(target, params) {
        const result = new URL(routes[target], location.href);
        if (demo) result.searchParams.set('demo', '1');
        if (state.project) result.searchParams.set('project_id', state.project.id);
        Object.entries(params || {}).forEach(([key, value]) => result.searchParams.set(key, value));
        return result.pathname + result.search;
    }
    function updateLinks() {
        document.querySelectorAll('[data-source-link]').forEach(link => {
            const target = link.dataset.sourceLink;
            link.href = url(target);
            if (target === view || (target === 'versions' && view === 'changes')) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        // Preserve preview and project context across the existing sidebar links.
        document.querySelectorAll('#sidebar a').forEach(link => {
            const target = Object.keys(routes).find(key => link.getAttribute('href')?.split('?')[0].endsWith(routes[key].replace('../', 'pages/')));
            if (target) link.href = url(target);
        });
        const liveUrl = new URL(location.href); liveUrl.searchParams.delete('demo'); $('sm-live-link').href = liveUrl.pathname + liveUrl.search;
    }
    function isManager() { return state.project?.role === 'manager'; }
    function applyPermissions() {
        document.querySelectorAll('[data-manager]').forEach(button => {
            button.disabled = !isManager() || state.busy || (button.id === 'sm-import-submit' && (!$('sm-import-confirm')?.checked || !state.preview));
            button.title = !isManager() ? 'Chỉ manager có quyền thay đổi nguồn và ngôn ngữ.' : '';
        });
    }
    async function request(path, method = 'GET', body) {
        if (demo) return SourceDemo.request(state.project?.id, path, method, body);
        const endpoint = path === '/api/projects' ? path : '/api/projects/' + encodeURIComponent(state.project.id) + path;
        const result = await apiFetch(endpoint, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        if (result.status >= 400) {
            result.success = false;
            result.message = result.message || result.data?.message || result.data?.title || 'Yêu cầu không thực hiện được. Vui lòng thử lại.';
            if (result.status === 413) result.message = 'Tệp JSON nguồn vượt quá giới hạn 2 MB.';
        }
        if ([404, 405].includes(result.status)) {
            result.success = false;
            result.message = 'Chức năng này chưa được backend hỗ trợ. Vui lòng bổ sung API tương ứng rồi thử lại.';
        }
        return result;
    }
    function stats(items, container = 'sm-stats') {
        const node = $(container); if (!node) return;
        node.replaceChildren(...items.map(([label, value, caption, color, icon]) => el('div', { class: 'sm-stat ' + (color || '') }, [
            el('span', { class: 'sm-stat-icon', text: icon || '◇', 'aria-hidden': 'true' }),
            el('div', { class: 'sm-stat-label', text: label }), el('div', { class: 'sm-stat-number', text: value ?? '—' }), el('div', { class: 'sm-stat-caption', text: caption || '' })
        ])));
    }
    function badge(type) { return el('span', { class: 'sm-badge sm-badge-' + (Object.hasOwn(labels, type) ? type : 'unchanged'), text: labels[type] || type }); }
    function list(result) { return TM.listFrom(result.data); }
    function normalizeKey(k) { return { id: k.id ?? k.stringId, key: k.key ?? k.keyPath ?? '', sourceText: k.sourceText ?? k.value ?? '', status: k.status || 'active' }; }
    function versionId(v) { return v.id ?? v.versionId; }
    async function init() {
        text('sm-description', descriptions[view]);
        show('sm-demo-banner', demo);
        show('sm-import-link', view !== 'import');
        updateLinks(); bindEvents();
        if (!demo && !getAuthToken()) {
            $('sm-project').replaceChildren(el('option', { text: 'Chưa đăng nhập' }));
            show('sm-loading', false); notice('Đăng nhập để quản lý dữ liệu dự án, hoặc mở chế độ xem thử với dữ liệu mẫu.');
            $('sm-notice').appendChild(el('a', { href: '../../login.php', text: 'Đăng nhập →' }));
            if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
                const preview = new URL(location.href); preview.searchParams.set('demo', '1');
                $('sm-notice').appendChild(el('a', { href: preview.pathname + preview.search, text: 'Xem thử giao diện →' }));
            }
            text('sm-role', 'Chưa đăng nhập'); return;
        }
        const result = await request('/api/projects');
        if (!result.success) { $('sm-project').replaceChildren(el('option', { text: 'Không tải được dự án' })); notice(result.message, true); show('sm-loading', false); return; }
        state.projects = list(result);
        $('sm-project').replaceChildren(...state.projects.map(project => el('option', { value: project.id, text: project.name })));
        if (!state.projects.length) { $('sm-project').replaceChildren(el('option', { text: 'Chưa có dự án' })); notice('Bạn chưa có dự án nào. Hãy tạo hoặc tham gia một dự án trước.'); show('sm-loading', false); text('sm-role', 'Chưa có dự án'); return; }
        const selected = TM.getQueryParam('project_id') || TM.storageGet(demo ? 'tm_demo_project' : 'tm_current_project');
        state.project = state.projects.find(p => String(p.id) === String(selected)) || state.projects[0];
        $('sm-project').value = state.project.id; $('sm-project').disabled = false;
        await loadProject();
    }
    async function loadProject() {
        const generation = ++state.generation;
        state.preview = null; state.keysKnown = false; state.page = 1;
        show('sm-import-preview', false); show('sm-import-result', false); notice('');
        text('sm-role', TM.ROLE_LABEL[state.project.role] || state.project.role);
        TM.storageSet(demo ? 'tm_demo_project' : 'tm_current_project', state.project.id);
        TM.setQueryParams({ project_id: state.project.id }); updateLinks(); applyPermissions();
        show('sm-loading', true); show('sm-content', false);
        const paths = view === 'languages' ? ['/locales'] : view === 'keys' ? ['/translation-keys'] : view === 'import' ? ['/translation-keys'] : ['/source-versions'];
        const results = await Promise.all(paths.map(path => request(path)));
        if (generation !== state.generation) return;
        const result = results[0];
        if (!result.success && view !== 'import' && !(view === 'changes' && TM.getQueryParam('version_id'))) {
            notice(result.message, true); show('sm-loading', false); return;
        }
        if (view === 'languages') { state.locales = list(result); renderLanguages(); }
        if (view === 'keys' || view === 'import') {
            state.keysKnown = result.success;
            state.keys = result.success ? list(result).map(normalizeKey) : [];
            if (view === 'keys') renderKeys();
            else if (!result.success) notice('Chưa tải được danh mục khóa hiện tại. Bạn vẫn có thể kiểm tra JSON và import, nhưng chưa thể dự báo khóa mới, sửa hoặc xóa.');
        }
        if (view === 'versions' || view === 'changes') {
            state.versions = result.success ? list(result).sort((a, b) => Number(versionId(b)) - Number(versionId(a))) : [];
            if (view === 'versions') renderVersions();
            else await loadChanges(generation);
        }
        if (generation !== state.generation) return;
        show('sm-loading', false); show('sm-content', true); applyPermissions();
    }
    function renderLanguages() {
        const targets = state.locales.filter(l => !l.isSource);
        const source = state.locales.find(l => l.isSource);
        stats([['Tổng ngôn ngữ', state.locales.length, 'Trong dự án hiện tại', '', '文'], ['Ngôn ngữ nguồn', source?.code.toUpperCase() || '—', source?.name || 'Chưa thiết lập', '', '◎'], ['Ngôn ngữ đích', targets.length, 'Sẵn sàng để biên dịch', 'green', '↗'], ['Phạm vi nội dung', 'JSON', 'Object lồng nhau · Unicode', 'amber', '{ }']]);
        const rows = state.locales.slice().sort((a, b) => Number(b.isSource) - Number(a.isSource)).map(locale => {
            const actions = el('div', { class: 'sm-language-actions' });
            if (!locale.isSource && isManager()) {
                actions.append(el('button', { type: 'button', class: 'sm-text-button', text: 'Sửa tên', onclick: () => openLanguage(locale) }), el('button', { type: 'button', class: 'sm-text-button', text: 'Gỡ', onclick: () => openRemove(locale) }));
            }
            return el('div', { class: 'sm-language' }, [el('div', { class: 'sm-locale-icon', text: locale.code.split('-')[0] }), el('div', { class: 'sm-language-info' }, [el('div', { class: 'sm-language-name' }, [el('span', { text: locale.name }), el('span', { class: 'sm-badge ' + (locale.isSource ? 'sm-language-source' : 'sm-language-target'), text: locale.isSource ? 'Ngôn ngữ nguồn' : 'Ngôn ngữ đích' })]), el('div', { class: 'sm-language-code', text: locale.code })]), actions]);
        });
        $('sm-language-list').replaceChildren(...(rows.length ? rows : [el('div', { class: 'sm-empty', text: 'Dự án chưa có ngôn ngữ.' })]));
    }
    function renderKeys() {
        const active = state.keys.filter(k => k.status !== 'deleted');
        stats([['Tổng khóa', state.keys.length, 'Bao gồm các khóa đã xóa', '', '#'], ['Đang sử dụng', active.length, 'Trong phiên bản nguồn hiện tại', 'green', '✓'], ['Khóa có biến', active.filter(k => TM.extractPlaceholders(k.sourceText).length).length, 'Cần giữ đúng biến khi dịch', 'amber', '{ }'], ['Đã xóa khỏi nguồn', state.keys.length - active.length, 'Giữ lại lịch sử của khóa', 'red', '−']]);
        const query = ($('sm-search').value || '').trim().toLocaleLowerCase('vi');
        const status = $('sm-key-status').value;
        const filtered = state.keys.filter(k => (status === 'all' || k.status === status) && (k.key + '\n' + k.sourceText).toLocaleLowerCase('vi').includes(query));
        const pages = Math.max(1, Math.ceil(filtered.length / 12)); state.page = Math.min(state.page, pages);
        $('sm-keys-body').replaceChildren(...filtered.slice((state.page - 1) * 12, state.page * 12).map(key => {
            const placeholders = TM.extractPlaceholders(key.sourceText);
            return el('tr', {}, [el('td', {}, [el('code', { class: 'sm-key', text: key.key })]), el('td', { text: key.sourceText }), el('td', {}, placeholders.length ? placeholders.map(p => el('span', { class: 'sm-placeholder', text: p })) : [el('span', { class: 'sm-muted', text: '—' })]), el('td', {}, [badge(key.status)])]);
        }));
        text('sm-key-count', filtered.length + ' khóa'); show('sm-keys-empty', !filtered.length);
        text('sm-page-info', 'Trang ' + state.page + '/' + pages + ' · ' + filtered.length + ' khóa');
        $('sm-prev').disabled = state.page <= 1; $('sm-next').disabled = state.page >= pages;
    }
    function renderVersions() {
        const latest = state.versions[0];
        stats([['Phiên bản đã nhập', state.versions.length, 'Lịch sử cập nhật nguồn', '', '◷'], ['Khóa hiện tại', latest?.keyCount ?? latest?.total, 'Trong phiên bản mới nhất', 'green', '#'], ['Khóa mới lần cuối', latest?.added, 'So với lần import trước', 'green', '+'], ['Khóa thay đổi lần cuối', latest?.changed, 'Bản dịch cần kiểm tra lại', 'amber', '↻']]);
        text('sm-version-count', state.versions.length + ' phiên bản');
        $('sm-version-list').replaceChildren(...(state.versions.length ? state.versions.map((version, index) => el('article', { class: 'sm-version' }, [
            el('div', { class: 'sm-version-dot', text: '◇' }), el('div', { class: 'sm-version-info' }, [
                el('div', { class: 'sm-version-title' }, [el('span', { text: version.versionName }), index === 0 ? el('span', { class: 'sm-badge sm-badge-restored', text: 'Mới nhất' }) : null]),
                el('div', { class: 'sm-version-meta', text: TM.formatDateTime(version.importedAt) + (version.importedBy ? ' · ' + version.importedBy : '') + ' · ' + (version.keyCount ?? version.total ?? '—') + ' khóa' }),
                el('div', { class: 'sm-version-tags' }, [['new', version.added], ['changed', version.changed], ['deleted', version.deleted]].filter(([, count]) => count != null).map(([type, count]) => el('span', { class: 'sm-badge sm-badge-' + type, text: count + ' ' + labels[type].toLowerCase() })))
            ]), el('a', { class: 'sm-button sm-secondary', text: 'Xem thay đổi →', href: url('changes', { version_id: versionId(version) }) })
        ])) : [el('div', { class: 'sm-empty', text: 'Chưa có phiên bản nguồn. Import JSON đầu tiên để bắt đầu.' })]));
    }
    async function loadChanges(generation) {
        const wanted = TM.getQueryParam('version_id');
        const selected = state.versions.find(v => String(versionId(v)) === wanted) || (!wanted ? state.versions[0] : null);
        const id = selected ? versionId(selected) : wanted;
        $('sm-diff-version').replaceChildren(...state.versions.map(v => el('option', { value: versionId(v), text: v.versionName })));
        if (id && !selected) $('sm-diff-version').appendChild(el('option', { value: id, text: 'Phiên bản #' + id }));
        if (!id) {
            text('sm-diff-title', 'Chưa có phiên bản nguồn'); text('sm-diff-meta', 'Import JSON đầu tiên để bắt đầu theo dõi thay đổi.');
            state.changes = []; renderChanges(); notice('Dự án chưa có phiên bản nguồn.'); return;
        }
        $('sm-diff-version').value = id; TM.setQueryParams({ version_id: id });
        text('sm-diff-title', selected?.versionName || 'Phiên bản #' + id);
        text('sm-diff-meta', selected ? TM.formatDateTime(selected.importedAt) + ' · So với trạng thái trước lần import' : 'Thay đổi ghi nhận trong lần import');
        const result = await request('/source-versions/' + encodeURIComponent(id) + '/changes');
        if (generation !== state.generation) return;
        state.changes = result.success ? list(result) : [];
        if (!result.success) notice(result.message, true);
        renderChanges();
    }
    function renderChanges() {
        stats(['new', 'changed', 'deleted', 'restored'].map((type, i) => [labels[type], state.changes.filter(c => c.type === type).length, 'Trong phiên bản đang xem', ['green', 'amber', 'red', ''][i], ['+', '↻', '−', '↶'][i]]));
        const query = ($('sm-search').value || '').trim().toLocaleLowerCase('vi');
        const type = $('sm-change-type').value;
        const changes = state.changes.filter(c => (type === 'all' || c.type === type) && (c.key + '\n' + (c.oldValue || '') + '\n' + (c.newValue || '')).toLocaleLowerCase('vi').includes(query));
        text('sm-change-count', changes.length + ' thay đổi');
        $('sm-diff-list').replaceChildren(...(changes.length ? changes.map(change => el('article', { class: 'sm-diff-item' }, [
            el('div', { class: 'sm-diff-key' }, [badge(change.type), el('code', { class: 'sm-key', text: change.key })]),
            el('div', { class: 'sm-diff-values' }, [el('div', { class: 'sm-diff-value sm-diff-old' }, [el('small', { text: 'TRƯỚC THAY ĐỔI' }), el('span', { text: change.oldValue ?? 'Chưa có khóa này' })]), el('div', { class: 'sm-diff-value sm-diff-new' }, [el('small', { text: 'SAU THAY ĐỔI' }), el('span', { text: change.newValue ?? 'Đã xóa khỏi nguồn' })])])
        ])) : [el('div', { class: 'sm-empty', text: 'Không có thay đổi phù hợp.' })]));
    }
    function openLanguage(locale) {
        if (!isManager()) return;
        state.editing = locale || null;
        text('sm-language-dialog-title', locale ? 'Sửa tên ngôn ngữ' : 'Thêm ngôn ngữ');
        $('sm-locale-code').value = locale?.code || ''; $('sm-locale-code').disabled = !!locale;
        $('sm-locale-name').value = locale?.name || ''; $('sm-locale-name').disabled = !locale;
        $('sm-locale-name').placeholder = locale ? 'Tên hiển thị' : 'Tự động theo mã ngôn ngữ';
        fieldError('sm-locale-error', ''); $('sm-language-dialog').showModal();
        (locale ? $('sm-locale-name') : $('sm-locale-code')).focus();
    }
    async function saveLanguage(event) {
        event.preventDefault(); if (state.busy || !isManager()) return;
        const code = $('sm-locale-code').value.trim(), name = $('sm-locale-name').value.trim();
        if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code) || code.length > 20) return fieldError('sm-locale-error', 'Mã ngôn ngữ chưa hợp lệ. Ví dụ: vi, en, zh, en-US.');
        if (state.editing && !name) return fieldError('sm-locale-error', 'Vui lòng nhập tên hiển thị.');
        if (!state.editing && state.locales.some(l => l.code.toLowerCase() === code.toLowerCase())) return fieldError('sm-locale-error', 'Ngôn ngữ này đã có trong dự án.');
        state.busy = true; $('sm-save-language').disabled = true; fieldError('sm-locale-error', '');
        try {
            const result = await request(state.editing ? '/locales/' + encodeURIComponent(code) : '/locales', state.editing ? 'PUT' : 'POST', state.editing ? { name } : { localeCode: code });
            if (!result.success) return fieldError('sm-locale-error', result.message);
            $('sm-language-dialog').close(); showToast('Đã lưu ngôn ngữ.', 'success'); await loadProject();
        } finally { state.busy = false; $('sm-save-language').disabled = false; applyPermissions(); }
    }
    function openRemove(locale) {
        if (!isManager() || locale.isSource) return;
        state.removing = locale; fieldError('sm-remove-error', '');
        text('sm-remove-description', 'Gỡ ' + locale.name + ' (' + locale.code + ') khỏi dự án ' + state.project.name + '? Backend sẽ kiểm tra dữ liệu liên quan trước khi cho phép gỡ.');
        $('sm-remove-dialog').showModal();
    }
    async function removeLanguage() {
        if (state.busy || !state.removing || !isManager()) return;
        state.busy = true; $('sm-confirm-remove').disabled = true;
        try {
            const result = await request('/locales/' + encodeURIComponent(state.removing.code), 'DELETE');
            if (!result.success) return fieldError('sm-remove-error', result.message);
            $('sm-remove-dialog').close(); showToast('Đã gỡ ngôn ngữ.', 'success'); await loadProject();
        } finally { state.busy = false; $('sm-confirm-remove').disabled = false; applyPermissions(); }
    }
    function invalidatePreview() { state.preview = null; show('sm-import-preview', false); show('sm-import-result', false); if ($('sm-import-confirm')) $('sm-import-confirm').checked = false; applyPermissions(); }
    async function readFile(file) {
        if (!file) return;
        invalidatePreview(); fieldError('sm-import-error', '');
        if (!/\.json$/i.test(file.name)) return fieldError('sm-import-error', 'Vui lòng chọn tệp có đuôi .json.');
        if (file.size > 2 * 1024 * 1024) return fieldError('sm-import-error', 'Tệp JSON vượt quá giới hạn 2 MB.');
        try { $('sm-json-input').value = (await file.text()).replace(/^\uFEFF/, ''); text('sm-file-name', file.name + ' · ' + TM.formatBytes(file.size)); }
        catch (error) { fieldError('sm-import-error', 'Không đọc được tệp. Hãy chọn lại hoặc dán nội dung JSON.'); }
    }
    function previewImport(event) {
        event.preventDefault(); if (state.busy || !isManager()) return;
        invalidatePreview(); fieldError('sm-import-error', '');
        try {
            const versionName = $('sm-version-name').value.trim();
            if (!versionName) throw new Error('Vui lòng nhập tên phiên bản nguồn.');
            if (versionName.length > 120) throw new Error('Tên phiên bản tối đa 120 ký tự.');
            const raw = $('sm-json-input').value.replace(/^\uFEFF/, '');
            if (new Blob([raw]).size > 2 * 1024 * 1024) throw new Error('Nội dung JSON vượt quá giới hạn 2 MB.');
            let data;
            try { data = JSON.parse(raw); } catch (error) { throw new Error('JSON chưa đúng cú pháp. Kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép.'); }
            const flat = SourceDemo.flatten(data);
            const diff = state.keysKnown ? SourceDemo.compare(flat, state.keys) : Object.entries(flat).map(([key, value]) => ({ key, oldValue: null, newValue: value, type: 'unknown' }));
            const count = type => state.keysKnown ? diff.filter(c => c.type === type).length : '—';
            state.preview = { versionName, data, diff, projectId: state.project.id };
            text('sm-preview-summary', versionName + ' · ' + Object.keys(flat).length + ' khóa nguồn' + (!state.keysKnown ? ' · Chưa đối chiếu được với nguồn hiện tại' : ' · ' + count('unchanged') + ' khóa không đổi'));
            stats([['Tổng khóa nhập', Object.keys(flat).length, 'Trong tệp JSON mới', '', '#'], ['Khóa mới', count('new'), 'Chưa có trong nguồn hiện tại', 'green', '+'], ['Sửa / khôi phục', state.keysKnown ? count('changed') + count('restored') : '—', 'Bản dịch liên quan cần kiểm tra', 'amber', '↻'], ['Khóa bị xóa', count('deleted'), 'Vắng mặt trong tệp mới', 'red', '−']], 'sm-preview-stats');
            const changed = diff.filter(c => c.type !== 'unchanged');
            $('sm-preview-body').replaceChildren(...(changed.length ? changed.map(change => el('tr', {}, [el('td', { class: 'sm-key', text: change.key }), el('td', { text: state.keysKnown ? change.oldValue ?? '—' : 'Chưa đối chiếu' }), el('td', { text: change.newValue ?? '—' }), el('td', {}, [change.type === 'unknown' ? el('span', { class: 'sm-pill', text: 'Chưa đối chiếu' }) : badge(change.type)])])) : [el('tr', {}, [el('td', { colspan: '4', text: 'Nội dung giống phiên bản nguồn hiện tại. Import sẽ tạo phiên bản mới, không nhân đôi khóa.' })])]));
            show('sm-import-preview', true); applyPermissions(); $('sm-import-preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { fieldError('sm-import-error', error.message); }
    }
    async function submitImport() {
        const preview = state.preview;
        if (state.busy || !isManager() || !preview || !$('sm-import-confirm').checked || preview.projectId !== state.project.id) return;
        state.busy = true; $('sm-project').disabled = true; $('sm-refresh').disabled = true; applyPermissions(); text('sm-import-submit', 'Đang import…');
        try {
            const result = await request('/source-versions/import', 'POST', { versionName: preview.versionName, data: preview.data });
            if (!result.success) { fieldError('sm-import-error', result.message); $('sm-import-error').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
            const summary = result.data;
            state.preview = null; show('sm-import-preview', false);
            const resultNode = $('sm-import-result');
            resultNode.replaceChildren(el('h3', { text: '✓ Import thành công' }), el('p', { text: (summary.versionName || preview.versionName) + ' · ' + summary.total + ' khóa · ' + summary.added + ' mới · ' + summary.changed + ' sửa/khôi phục · ' + summary.deleted + ' đã xóa · ' + summary.unchanged + ' không đổi' }), el('a', { class: 'sm-button sm-primary', href: url('changes', { version_id: summary.versionId }), text: 'Xem thay đổi của phiên bản →' }));
            show('sm-import-result', true); resultNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const keys = await request('/translation-keys'); state.keysKnown = keys.success; state.keys = keys.success ? list(keys).map(normalizeKey) : [];
        } finally { state.busy = false; $('sm-project').disabled = false; $('sm-refresh').disabled = false; text('sm-import-submit', 'Import phiên bản nguồn'); applyPermissions(); }
    }
    function bindEvents() {
        listen('sm-project', 'change', async () => { if (state.busy) return; state.project = state.projects.find(p => String(p.id) === $('sm-project').value); TM.setQueryParams({ version_id: null }); await loadProject(); });
        listen('sm-refresh', 'click', () => { if (!state.busy) state.project ? loadProject() : location.reload(); });
        listen('sm-reset-demo', 'click', () => { if (!state.busy) { SourceDemo.reset(); location.reload(); } });
        listen('sm-search', 'input', () => { state.page = 1; view === 'keys' ? renderKeys() : renderChanges(); });
        listen('sm-key-status', 'change', () => { state.page = 1; renderKeys(); });
        listen('sm-prev', 'click', () => { state.page--; renderKeys(); }); listen('sm-next', 'click', () => { state.page++; renderKeys(); });
        listen('sm-change-type', 'change', renderChanges);
        listen('sm-diff-version', 'change', async () => { TM.setQueryParams({ version_id: $('sm-diff-version').value }); await loadChanges(++state.generation); });
        listen('sm-add-language', 'click', () => openLanguage()); listen('sm-language-form', 'submit', saveLanguage);
        ['sm-close-dialog', 'sm-cancel-dialog'].forEach(id => listen(id, 'click', () => { if (!state.busy) $('sm-language-dialog').close(); }));
        listen('sm-cancel-remove', 'click', () => { if (!state.busy) $('sm-remove-dialog').close(); }); listen('sm-confirm-remove', 'click', removeLanguage);
        ['sm-language-dialog', 'sm-remove-dialog'].forEach(id => listen(id, 'cancel', e => { if (state.busy) e.preventDefault(); }));
        listen('sm-json-input', 'input', invalidatePreview); listen('sm-version-name', 'input', invalidatePreview);
        listen('sm-json-file', 'change', event => readFile(event.target.files[0]));
        listen('sm-sample', 'click', () => { if (state.busy) return; $('sm-json-input').value = JSON.stringify({ home: { title: 'Trang chủ', welcome: 'Xin chào {name}!' }, notifications: { unread: 'Bạn có {count} thông báo mới' } }, null, 2); text('sm-file-name', 'JSON mẫu · 3 khóa nguồn'); invalidatePreview(); });
        listen('sm-dropzone', 'dragover', event => { event.preventDefault(); $('sm-dropzone').classList.add('is-dragging'); });
        listen('sm-dropzone', 'dragleave', () => $('sm-dropzone').classList.remove('is-dragging'));
        listen('sm-dropzone', 'drop', event => { event.preventDefault(); $('sm-dropzone').classList.remove('is-dragging'); if (!state.busy) readFile(event.dataTransfer.files[0]); });
        listen('sm-import-form', 'submit', previewImport); listen('sm-import-confirm', 'change', applyPermissions); listen('sm-import-submit', 'click', submitImport);
    }
    document.addEventListener('DOMContentLoaded', () => init().catch(error => { show('sm-loading', false); notice('Không tải được không gian nguồn. Vui lòng làm mới trang và thử lại.', true); console.error('Source workspace:', error); }));
})();
