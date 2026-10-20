/**
 * Translation Editor - Translation Manager (module Phạm Thế Đức)
 * Dịch, lưu nháp, gửi review, phân công, bình luận, lịch sử và xử lý xung đột (HTTP 409).
 */
(function () {
    const $ = function (id) { return document.getElementById(id); };
    const el = TM.el;

    const HISTORY_LABEL = {
        saved_draft: 'Lưu nháp',
        submitted: 'Gửi review',
        assigned: 'Phân công',
        approved: 'Duyệt',
        rejected: 'Từ chối'
    };

    const ROLE_HINT = {
        manager: 'Bạn là Manager: có thể dịch, phân công (tick ô đầu dòng để giao nhiều khóa) và duyệt ở trang Đánh giá.',
        translator: 'Bạn là Translator: dịch các khóa chưa phân công hoặc được giao cho bạn. "Gửi review" kiểm tra biến {name}/{count} trước khi gửi.',
        reviewer: 'Bạn là Reviewer: trang này chỉ xem và bình luận. Duyệt/từ chối bản dịch tại trang Đánh giá.'
    };

    const state = {
        projects: [],
        project: null,
        role: '',
        me: TM.currentUser(),
        locale: null,
        members: [],
        items: [],
        current: null,   // khóa đang mở (trạng thái mới nhất biết từ máy chủ)
        base: null,      // { rowVersion, value } lúc bắt đầu sửa => expectedRowVersion khi lưu
        conflict: null,  // { status, details } khi máy chủ trả 409
        checked: new Set(),
        listRequest: 0,
        saving: false,
        tab: 'comments'
    };

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const status = TM.getQueryParam('status');
        if (status && Array.from($('tr-status').options).some(function (o) { return o.value === status; })) $('tr-status').value = status;

        bindEvents();
        setListState('loading');
        const picked = await TM.initProjectPicker($('tr-project'));
        if (picked.error) return setListState('error', picked.error);
        state.projects = picked.projects;
        if (!picked.project) return setListState('empty', 'Bạn chưa tham gia dự án nào.');
        await selectProject(picked.project);
    }

    function api(path) {
        return '/api/projects/' + encodeURIComponent(state.project.id) + path;
    }

    function bindEvents() {
        $('tr-project').addEventListener('change', function () {
            const select = this;
            const wanted = select.value;
            const project = state.projects.find(function (p) { return String(p.id) === wanted; });
            if (state.project) select.value = String(state.project.id);
            guardUnsaved(function () {
                select.value = wanted;
                if (project) selectProject(project);
            });
        });

        $('tr-locale').addEventListener('change', function () {
            const select = this;
            const wanted = select.value;
            select.value = state.locale;
            guardUnsaved(function () {
                select.value = wanted;
                state.locale = wanted;
                TM.rememberLocale(wanted);
                state.items = [];
                state.checked.clear();
                closeEditor();
                loadList();
                loadProgress();
            });
        });

        $('tr-search').addEventListener('input', TM.debounce(loadList, 300));
        $('tr-status').addEventListener('change', onStatusFilterChange);
        $('tr-assignee').addEventListener('change', loadList);

        $('tr-check-all').addEventListener('change', function () {
            const checked = this.checked;
            state.items.forEach(function (item) {
                if (checked) state.checked.add(item.stringId); else state.checked.delete(item.stringId);
            });
            renderList();
        });
        $('tr-bulk-assign').addEventListener('click', bulkAssign);
        $('tr-bulk-clear').addEventListener('click', function () { state.checked.clear(); renderList(); });

        $('ed-close').addEventListener('click', function () { guardUnsaved(function () { closeEditor(); renderList(); }); });
        $('ed-value').addEventListener('input', function () { renderPlaceholderCheck(); });
        $('ed-value').addEventListener('keydown', function (e) {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === 's' || e.key === 'S') { e.preventDefault(); save('draft'); }
            if (e.key === 'Enter') { e.preventDefault(); save('translated'); }
        });
        $('ed-copy-source').addEventListener('click', copySource);
        $('ed-save-draft').addEventListener('click', function () { save('draft'); });
        $('ed-submit').addEventListener('click', function () { save('translated'); });
        $('ed-conflict-take').addEventListener('click', takeServerVersion);
        $('ed-conflict-overwrite').addEventListener('click', overwriteWithMine);
        $('ed-assign-btn').addEventListener('click', assignCurrent);
        $('ed-tab-comments').addEventListener('click', function () { switchTab('comments'); });
        $('ed-tab-history').addEventListener('click', function () { switchTab('history'); });
        $('ed-comment-send').addEventListener('click', sendComment);

        window.addEventListener('beforeunload', function (e) {
            if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    // ===================== Dự án / quyền =====================

    async function selectProject(project) {
        state.project = project;
        state.role = String(project.role || '').toLowerCase();
        TM.rememberProject(project.id);
        state.items = [];
        state.checked.clear();
        closeEditor();
        renderRoleHint();
        setListState('loading');

        const results = await Promise.all([TM.loadLocales(project.id), TM.loadMembers(project.id)]);
        const locales = results[0];
        state.members = results[1];
        fillMemberOptions();
        if (locales.error) return setListState('error', locales.error);

        if (!locales.targets.length) {
            state.locale = null;
            $('tr-locale').textContent = '';
            TM.show('tr-progress', false);
            $('tr-count').textContent = '';
            return setListState('empty', 'Dự án chưa có ngôn ngữ đích. Manager cần thêm ngôn ngữ trước khi dịch.');
        }

        state.locale = TM.fillLocaleSelect($('tr-locale'), locales.targets);
        await Promise.all([loadList(), loadProgress()]);
    }

    function isManager() { return state.role === 'manager'; }
    function canTranslate() { return state.role === 'manager' || state.role === 'translator'; }

    function canEditItem(item) {
        if (!canTranslate()) return false;
        if (state.role === 'translator' && item.assignedTo && state.me.id && item.assignedTo !== state.me.id) return false;
        return true;
    }

    function readonlyReason(item) {
        if (!canTranslate()) return 'Vai trò Reviewer chỉ xem và bình luận. Duyệt bản dịch ở trang Đánh giá.';
        return 'Khóa này đã được phân công cho ' + (item.assignedToName || 'người dịch khác') + '.';
    }

    function renderRoleHint() {
        const text = ROLE_HINT[state.role] || '';
        $('tr-role-hint').textContent = text;
        TM.show('tr-role-hint', !!text);
    }

    function assignableMembers() {
        return state.members.filter(function (m) { return m.role === 'translator' || m.role === 'manager'; });
    }

    function fillMemberOptions() {
        const filter = $('tr-assignee');
        const keep = filter.value;
        filter.textContent = '';
        filter.appendChild(el('option', { value: '', text: 'Tất cả' }));
        filter.appendChild(el('option', { value: 'me', text: 'Được giao cho tôi' }));
        filter.appendChild(el('option', { value: 'none', text: 'Chưa phân công' }));
        assignableMembers().forEach(function (m) {
            filter.appendChild(el('option', { value: String(m.id), text: m.displayName }));
        });
        filter.value = Array.from(filter.options).some(function (o) { return o.value === keep; }) ? keep : '';

        [$('tr-bulk-assignee'), $('ed-assign-select')].forEach(function (select) {
            select.textContent = '';
            assignableMembers().forEach(function (m) {
                select.appendChild(el('option', { value: String(m.id), text: m.displayName + ' (' + (TM.ROLE_LABEL[m.role] || m.role) + ')' }));
            });
            select.appendChild(el('option', { value: 'none', text: '— Bỏ phân công —' }));
        });
    }

    // ===================== Danh sách =====================

    function onStatusFilterChange() {
        TM.setQueryParams({ status: $('tr-status').value });
        loadList();
        loadProgress();
    }

    async function loadList() {
        if (!state.project || !state.locale) return;
        const params = new URLSearchParams({ locale: state.locale });
        const q = $('tr-search').value.trim();
        const status = $('tr-status').value;
        const assignee = $('tr-assignee').value;
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        if (assignee) params.set('assignee', assignee);

        const request = ++state.listRequest;
        if (!state.items.length) setListState('loading');
        const result = await apiGet(api('/translations?' + params.toString()));
        if (request !== state.listRequest) return; // đã có yêu cầu mới hơn

        if (!result.success) return setListState('error', TM.errorMessage(result, 'Không tải được danh sách bản dịch.'));

        state.items = TM.listFrom(result.data);
        const visible = new Set(state.items.map(function (i) { return i.stringId; }));
        Array.from(state.checked).forEach(function (id) { if (!visible.has(id)) state.checked.delete(id); });
        renderList();
        refreshCurrentAfterReload();
    }

    function findItem(stringId) {
        return state.items.find(function (i) { return i.stringId === stringId; }) || null;
    }

    function setListState(view, message) {
        TM.show('tr-loading', view === 'loading');
        TM.show('tr-empty', view === 'empty');
        TM.show('tr-error', view === 'error');
        TM.show('tr-table', view === 'table');
        if (view === 'empty') $('tr-empty-text').textContent = message || '';
        if (view === 'error') $('tr-error-text').textContent = message || '';
    }

    function renderList() {
        const body = $('tr-body');
        body.textContent = '';
        $('tr-count').textContent = state.locale ? state.items.length + ' khóa' : '';
        TM.show('tr-check-head', isManager());

        if (!state.items.length) {
            const filtered = $('tr-search').value.trim() || $('tr-status').value || $('tr-assignee').value;
            setListState('empty', filtered ? 'Không có khóa nào khớp bộ lọc.' : 'Dự án chưa có chuỗi nguồn. Hãy import phiên bản nguồn trước.');
        } else {
            setListState('table');
            state.items.forEach(function (item) { body.appendChild(renderRow(item)); });
        }
        updateBulkBar();
    }

    function renderRow(item) {
        const selected = state.current && state.current.stringId === item.stringId;
        const row = el('tr', { class: 'cursor-pointer ' + (selected ? 'bg-indigo-50' : 'hover:bg-gray-50') });
        row.addEventListener('click', function (e) {
            if (e.target.closest('input[type=checkbox]')) return;
            openItem(item.stringId);
        });

        if (isManager()) {
            const box = el('input', { type: 'checkbox', class: 'w-4 h-4 text-indigo-600 border-gray-300 rounded', title: 'Chọn để phân công' });
            box.checked = state.checked.has(item.stringId);
            box.addEventListener('change', function () {
                if (box.checked) state.checked.add(item.stringId); else state.checked.delete(item.stringId);
                updateBulkBar();
            });
            row.appendChild(el('td', { class: 'px-3 py-3 align-top' }, box));
        }

        row.appendChild(el('td', { class: 'px-4 py-3 align-top max-w-xs' }, [
            el('div', { class: 'text-sm font-mono text-gray-900 truncate', title: item.key, text: item.key }),
            el('div', { class: 'text-xs text-gray-500 truncate mt-0.5', title: item.source, text: item.source })
        ]));
        row.appendChild(el('td', { class: 'px-4 py-3 align-top max-w-xs' },
            item.value
                ? el('div', { class: 'text-sm text-gray-800 truncate', title: item.value, text: item.value })
                : el('span', { class: 'text-sm text-gray-400 italic', text: 'Chưa có bản dịch' })));
        row.appendChild(el('td', { class: 'px-4 py-3 align-top whitespace-nowrap' }, [
            TM.statusBadge(item.status),
            item.commentCount ? el('span', { class: 'ml-2 text-xs text-gray-500', title: item.commentCount + ' bình luận', text: '💬 ' + item.commentCount }) : null
        ]));
        const mine = item.assignedTo && item.assignedTo === state.me.id;
        row.appendChild(el('td', {
            class: 'px-4 py-3 align-top text-sm ' + (mine ? 'text-indigo-700 font-medium' : 'text-gray-600'),
            text: item.assignedToName ? item.assignedToName + (mine ? ' (tôi)' : '') : '—'
        }));
        return row;
    }

    function updateBulkBar() {
        const count = state.checked.size;
        TM.show('tr-bulk', isManager() && count > 0);
        $('tr-bulk-count').textContent = String(count);
        const all = $('tr-check-all');
        all.checked = state.items.length > 0 && state.items.every(function (i) { return state.checked.has(i.stringId); });
        all.indeterminate = count > 0 && !all.checked;
    }

    async function loadProgress() {
        if (!state.project || !state.locale) return TM.show('tr-progress', false);
        const locale = state.locale;
        const result = await apiGet(api('/translations/stats'));
        if (!result.success || locale !== state.locale) return;

        const stat = TM.listFrom(result.data).find(function (s) { return s.localeCode === locale; });
        if (!stat) return TM.show('tr-progress', false);

        const pct = stat.total ? Math.round(stat.approved * 100 / stat.total) : 0;
        $('tr-progress-locale').textContent = locale;
        $('tr-progress-text').textContent = stat.approved + '/' + stat.total + ' đã duyệt (' + pct + '%)';
        $('tr-progress-bar').style.width = pct + '%';

        const chips = $('tr-progress-chips');
        chips.textContent = '';
        [['missing', stat.missing], ['draft', stat.draft], ['translated', stat.translated], ['needs_review', stat.needsReview], ['approved', stat.approved]]
            .forEach(function (pair) {
                const key = pair[0];
                const meta = TM.STATUS_META[key];
                const active = $('tr-status').value === key;
                chips.appendChild(el('button', {
                    type: 'button',
                    title: active ? 'Bỏ lọc' : 'Lọc: ' + meta.label,
                    class: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ' + meta.cls + (active ? ' ring-2 ring-offset-1 ring-indigo-400' : ''),
                    onclick: function () {
                        $('tr-status').value = active ? '' : key;
                        onStatusFilterChange();
                    }
                }, [meta.label, el('span', { class: 'font-semibold', text: String(pair[1]) })]));
            });
        TM.show('tr-progress', true);
    }

    // ===================== Khung dịch =====================

    function isDirty() {
        return !!state.current && !$('ed-value').disabled && $('ed-value').value !== (state.base ? state.base.value : '');
    }

    function guardUnsaved(proceed) {
        if (!isDirty()) return proceed();
        showConfirmDialog('Bỏ thay đổi chưa lưu?', 'Bản dịch đang sửa chưa được lưu. Tiếp tục sẽ mất nội dung vừa nhập.', proceed);
    }

    function openItem(stringId) {
        if (state.current && state.current.stringId === stringId) return;
        guardUnsaved(function () {
            const item = findItem(stringId);
            if (!item) return;
            loadIntoEditor(item);
            renderList();
            $('ed-value').focus();
        });
    }

    function loadIntoEditor(item) {
        state.current = Object.assign({}, item);
        state.base = { rowVersion: item.rowVersion, value: item.value || '' };
        state.conflict = null;
        $('ed-value').value = item.value || '';
        TM.show('ed-empty', false);
        TM.show('ed-panel', true);
        hideConflict();
        setEditorMsg(null);
        renderEditorMeta();
        renderPlaceholderCheck();
        switchTab(state.tab);
    }

    function closeEditor() {
        state.current = null;
        state.base = null;
        state.conflict = null;
        $('ed-value').value = '';
        TM.show('ed-panel', false);
        TM.show('ed-empty', true);
    }

    /** Sau khi tải lại danh sách: cập nhật khóa đang mở nhưng không xóa nội dung đang gõ dở. */
    function refreshCurrentAfterReload() {
        if (!state.current) return;
        const fresh = findItem(state.current.stringId);
        if (!fresh) return;
        if (isDirty()) {
            Object.assign(state.current, fresh);
            renderEditorMeta();
        } else {
            loadIntoEditor(fresh);
        }
    }

    function syncListItem(item) {
        const listItem = findItem(item.stringId);
        if (listItem) Object.assign(listItem, item);
        renderList();
    }

    function renderEditorMeta() {
        const item = state.current;
        if (!item) return;

        $('ed-key').textContent = item.key;
        $('ed-locale').textContent = state.locale;
        const status = $('ed-status');
        status.textContent = '';
        status.appendChild(TM.statusBadge(item.status));
        TM.renderHighlighted($('ed-source'), item.source);

        const meta = ['Phân công: ' + (item.assignedToName || 'chưa có')];
        if (item.value && item.updatedByName) meta.push('Sửa lần cuối: ' + item.updatedByName + ' · ' + TM.formatDateTime(item.updatedAt));
        $('ed-meta').textContent = meta.join('  •  ');

        const note = $('ed-review-note');
        if (item.status === 'needs_review') {
            note.textContent = item.lastReviewDecision === 'rejected' && item.lastReviewNote
                ? 'Reviewer đã từ chối: “' + item.lastReviewNote + '”'
                : 'Chuỗi nguồn đã thay đổi — hãy kiểm tra và cập nhật lại bản dịch.';
            TM.show('ed-review-note', true);
        } else {
            TM.show('ed-review-note', false);
        }

        const editable = canEditItem(item);
        $('ed-value').disabled = !editable;
        $('ed-copy-source').classList.toggle('hidden', !editable);
        $('ed-save-draft').disabled = !editable || state.saving;
        $('ed-submit').disabled = !editable || state.saving;
        $('ed-readonly').textContent = editable ? '' : readonlyReason(item);
        TM.show('ed-readonly', !editable);

        TM.show('ed-assign-wrap', isManager());
        if (isManager()) {
            const select = $('ed-assign-select');
            const wanted = item.assignedTo ? String(item.assignedTo) : 'none';
            select.value = Array.from(select.options).some(function (o) { return o.value === wanted; }) ? wanted : 'none';
        }
        $('ed-comment-count').textContent = item.commentCount ? '(' + item.commentCount + ')' : '';
    }

    function renderPlaceholderCheck() {
        const item = state.current;
        if (!item) return null;
        const value = $('ed-value').value;
        const check = TM.checkPlaceholders(item.source, value);
        const box = $('ed-placeholders');
        box.textContent = '';

        if (!check.expected.length && !check.actual.length) {
            box.appendChild(el('span', { class: 'text-xs text-gray-400', text: 'Chuỗi này không có biến thay thế.' }));
        }
        check.expected.forEach(function (p) {
            const ok = check.actual.indexOf(p) >= 0;
            if (ok) {
                box.appendChild(el('span', { class: 'px-2 py-0.5 rounded font-mono text-xs bg-green-100 text-green-700', title: 'Đã có trong bản dịch', text: '✓ ' + p }));
            } else {
                box.appendChild(el('button', {
                    type: 'button',
                    class: 'px-2 py-0.5 rounded font-mono text-xs bg-red-100 text-red-700 hover:bg-red-200',
                    title: 'Thiếu trong bản dịch — bấm để chèn',
                    text: '✗ ' + p,
                    onclick: function () { insertAtCursor(p); }
                }));
            }
        });
        check.extra.forEach(function (p) {
            box.appendChild(el('span', { class: 'px-2 py-0.5 rounded font-mono text-xs bg-red-100 text-red-700', title: 'Không có trong chuỗi nguồn', text: '+ ' + p }));
        });

        $('ed-counter').textContent = value.length + ' ký tự';
        return check;
    }

    function insertAtCursor(text) {
        const textarea = $('ed-value');
        if (textarea.disabled) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
        renderPlaceholderCheck();
    }

    function copySource() {
        const item = state.current;
        if (!item || $('ed-value').disabled) return;
        const apply = function () {
            $('ed-value').value = item.source;
            $('ed-value').focus();
            renderPlaceholderCheck();
        };
        if ($('ed-value').value.trim() && $('ed-value').value !== item.source) {
            showConfirmDialog('Thay nội dung bản dịch?', 'Nội dung đang nhập sẽ được thay bằng chuỗi nguồn.', apply);
        } else {
            apply();
        }
    }

    function setEditorMsg(type, text) {
        const box = $('ed-msg');
        if (!type) {
            box.className = 'hidden';
            box.textContent = '';
            return;
        }
        const styles = {
            error: 'bg-red-50 border-red-200 text-red-700',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            success: 'bg-green-50 border-green-200 text-green-700',
            info: 'bg-blue-50 border-blue-200 text-blue-700'
        };
        box.className = 'p-3 rounded-lg border text-sm ' + (styles[type] || styles.info);
        box.textContent = text;
    }

    function setSaving(saving) {
        state.saving = saving;
        $('ed-save-draft').textContent = saving ? 'Đang lưu...' : 'Lưu nháp';
        $('ed-submit').textContent = saving ? 'Đang gửi...' : 'Gửi review';
        const editable = state.current ? canEditItem(state.current) : false;
        $('ed-save-draft').disabled = saving || !editable;
        $('ed-submit').disabled = saving || !editable;
        $('ed-conflict-overwrite').disabled = saving;
    }

    // ===================== Lưu / xung đột =====================

    async function save(status, overrideRowVersion) {
        const item = state.current;
        if (!item || state.saving || !canEditItem(item)) return;

        const value = $('ed-value').value;
        if (!value.trim()) return setEditorMsg('error', 'Bản dịch không được để trống.');
        const check = TM.checkPlaceholders(item.source, value);
        if (status === 'translated' && !check.ok) {
            return setEditorMsg('error', 'Chưa thể gửi review: biến thay thế ' + TM.placeholderSummary(check) + '. Bạn vẫn có thể "Lưu nháp".');
        }

        setSaving(true);
        const result = await apiPost(api('/translations'), {
            stringId: item.stringId,
            localeCode: state.locale,
            value: value,
            status: status,
            expectedRowVersion: overrideRowVersion !== undefined ? overrideRowVersion : state.base.rowVersion
        });
        setSaving(false);

        if (state.current !== item) return; // người dùng đã chuyển sang khóa khác

        if (result.success) {
            const data = result.data;
            Object.assign(item, {
                translationId: data.id,
                value: data.value,
                status: data.status,
                rowVersion: data.rowVersion,
                updatedByName: state.me.name || item.updatedByName,
                updatedAt: new Date().toISOString()
            });
            state.base = { rowVersion: data.rowVersion, value: data.value };
            state.conflict = null;
            hideConflict();
            syncListItem(item);
            renderEditorMeta();

            if (status === 'draft' && data.placeholderCheck && !data.placeholderCheck.ok) {
                setEditorMsg('warning', 'Đã lưu nháp. Lưu ý biến thay thế chưa khớp (' + TM.placeholderSummary(data.placeholderCheck) + ') — cần sửa trước khi gửi review.');
            } else {
                setEditorMsg('success', status === 'draft' ? 'Đã lưu nháp.' : 'Đã gửi review. Reviewer sẽ duyệt ở trang Đánh giá.');
            }
            showToast(status === 'draft' ? 'Đã lưu nháp' : 'Đã gửi review', 'success');
            loadProgress();
            if (state.tab === 'history') loadHistory();
            return;
        }

        if (result.status === 409) return showConflict(status, result);
        setEditorMsg('error', TM.errorMessage(result, 'Không lưu được bản dịch.'));
    }

    function showConflict(status, result) {
        const details = result.data && result.data.details;
        if (!details || details.currentRowVersion === undefined) {
            setEditorMsg('error', (result.message || 'Dữ liệu đã thay đổi.') + ' Đang tải lại danh sách...');
            loadList();
            return;
        }
        state.conflict = { status: status, details: details };
        $('ed-conflict-meta').textContent = (details.updatedBy ? details.updatedBy + ' đã lưu' : 'Đã có thay đổi')
            + (details.updatedAt ? ' lúc ' + TM.formatDateTime(details.updatedAt) : '')
            + '. Hệ thống không ghi đè âm thầm — hãy chọn cách xử lý.';
        $('ed-conflict-value').textContent = details.currentValue || '(chưa có nội dung)';
        const badge = $('ed-conflict-status');
        badge.textContent = '';
        badge.appendChild(TM.statusBadge(details.currentStatus));
        setEditorMsg(null);
        TM.show('ed-conflict', true);
    }

    function hideConflict() {
        TM.show('ed-conflict', false);
    }

    function takeServerVersion() {
        const item = state.current;
        if (!item || !state.conflict) return;
        const d = state.conflict.details;
        Object.assign(item, {
            value: d.currentValue,
            status: d.currentStatus,
            rowVersion: d.currentRowVersion,
            assignedTo: d.assignedTo,
            assignedToName: d.assignedToName,
            updatedByName: d.updatedBy,
            updatedAt: d.updatedAt
        });
        state.base = { rowVersion: d.currentRowVersion, value: d.currentValue || '' };
        state.conflict = null;
        $('ed-value').value = d.currentValue || '';
        hideConflict();
        syncListItem(item);
        renderEditorMeta();
        renderPlaceholderCheck();
        setEditorMsg('info', 'Đã tải bản mới nhất từ máy chủ.');
    }

    function overwriteWithMine() {
        const conflict = state.conflict;
        if (!conflict) return;
        showConfirmDialog(
            'Ghi đè bản dịch?',
            'Bản của bạn sẽ thay thế bản người khác vừa lưu. Bản cũ vẫn được giữ trong lịch sử.',
            function () { save(conflict.status, conflict.details.currentRowVersion); });
    }

    // ===================== Phân công =====================

    function parseAssignee(raw) {
        return raw === 'none' || !raw ? null : Number(raw);
    }

    async function assignCurrent() {
        const item = state.current;
        if (!item || !isManager()) return;
        const userId = parseAssignee($('ed-assign-select').value);
        if ((item.assignedTo || null) === userId) return showToast('Không có thay đổi phân công.', 'info');

        $('ed-assign-btn').disabled = true;
        const result = item.translationId
            ? await apiPut(api('/translations/' + item.translationId + '/assign'), { userId: userId, expectedRowVersion: item.rowVersion })
            : await apiPut(api('/translations/assign'), { localeCode: state.locale, stringIds: [item.stringId], userId: userId });
        $('ed-assign-btn').disabled = false;

        if (!result.success) {
            showToast(TM.errorMessage(result, 'Không phân công được.'), 'error');
            if (result.status === 409) loadList();
            return;
        }
        item.assignedTo = userId;
        item.assignedToName = result.data.assignedToName || null;
        syncListItem(item);
        renderEditorMeta();
        showToast(userId ? 'Đã phân công cho ' + item.assignedToName : 'Đã bỏ phân công', 'success');
        if (!item.translationId) loadList(); // lấy translationId vừa được tạo
        else if (state.tab === 'history') loadHistory();
    }

    function bulkAssign() {
        const ids = Array.from(state.checked);
        if (!ids.length) return;
        const userId = parseAssignee($('tr-bulk-assignee').value);

        const run = async function () {
            $('tr-bulk-assign').disabled = true;
            const result = await apiPut(api('/translations/assign'), { localeCode: state.locale, stringIds: ids, userId: userId });
            $('tr-bulk-assign').disabled = false;
            if (!result.success) return showToast(TM.errorMessage(result, 'Không phân công được.'), 'error');
            showToast(userId
                ? 'Đã phân công ' + result.data.assigned + ' khóa cho ' + result.data.assignedToName
                : 'Đã bỏ phân công ' + result.data.assigned + ' khóa', 'success');
            state.checked.clear();
            await loadList();
        };

        if (userId) run();
        else showConfirmDialog('Bỏ phân công?', 'Bỏ phân công ' + ids.length + ' khóa đã chọn?', run);
    }

    // ===================== Bình luận / lịch sử =====================

    function switchTab(tab) {
        state.tab = tab;
        ['comments', 'history'].forEach(function (name) {
            const active = name === tab;
            $('ed-tab-' + name).className = 'px-3 py-2 text-sm font-medium border-b-2 ' + (active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700');
            TM.show('ed-pane-' + name, active);
        });
        if (tab === 'comments') loadComments(); else loadHistory();
    }

    function hint(text, cls) {
        return el('p', { class: 'text-sm ' + (cls || 'text-gray-400'), text: text });
    }

    async function loadComments() {
        const item = state.current;
        const list = $('ed-comment-list');
        list.textContent = '';
        if (!item) return;

        TM.show('ed-comment-form', !!item.translationId);
        if (!item.translationId) return list.appendChild(hint('Lưu bản dịch (hoặc phân công) trước để bắt đầu bình luận.'));

        list.appendChild(hint('Đang tải bình luận...'));
        const id = item.translationId;
        const result = await apiGet(api('/translations/' + id + '/comments'));
        if (!state.current || state.current.translationId !== id || state.tab !== 'comments') return;

        list.textContent = '';
        if (!result.success) return list.appendChild(hint(TM.errorMessage(result, 'Không tải được bình luận.'), 'text-red-600'));
        const comments = TM.listFrom(result.data);
        if (!comments.length) list.appendChild(hint('Chưa có bình luận.'));
        comments.forEach(function (c) {
            list.appendChild(el('div', { class: 'flex gap-3' }, [
                el('div', { class: 'flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center', text: (c.userName || '?').charAt(0).toUpperCase() }),
                el('div', { class: 'flex-1 min-w-0' }, [
                    el('div', { class: 'text-xs text-gray-500' }, [el('span', { class: 'font-medium text-gray-800', text: c.userName }), ' · ' + TM.formatDateTime(c.createdAt)]),
                    el('p', { class: 'text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5', text: c.body })
                ])
            ]));
        });
    }

    async function sendComment() {
        const item = state.current;
        const input = $('ed-comment-body');
        const body = input.value.trim();
        if (!item || !item.translationId) return;
        if (!body) return showToast('Nhập nội dung bình luận.', 'warning');

        $('ed-comment-send').disabled = true;
        const result = await apiPost(api('/translations/' + item.translationId + '/comments'), { body: body });
        $('ed-comment-send').disabled = false;
        if (!result.success) return showToast(TM.errorMessage(result, 'Không gửi được bình luận.'), 'error');

        input.value = '';
        item.commentCount = (item.commentCount || 0) + 1;
        syncListItem(item);
        renderEditorMeta();
        loadComments();
    }

    async function loadHistory() {
        const item = state.current;
        const list = $('ed-history-list');
        list.textContent = '';
        if (!item) return;
        if (!item.translationId) return list.appendChild(hint('Chưa có lịch sử.'));

        list.appendChild(hint('Đang tải lịch sử...'));
        const id = item.translationId;
        const result = await apiGet(api('/translations/' + id + '/history'));
        if (!state.current || state.current.translationId !== id || state.tab !== 'history') return;

        list.textContent = '';
        if (!result.success) return list.appendChild(hint(TM.errorMessage(result, 'Không tải được lịch sử.'), 'text-red-600'));
        const entries = TM.listFrom(result.data);
        if (!entries.length) list.appendChild(hint('Chưa có lịch sử.'));
        entries.forEach(function (h) {
            list.appendChild(el('li', { class: 'border-l-2 border-gray-200 pl-3' }, [
                el('div', { class: 'text-xs text-gray-500' }, [
                    el('span', { class: 'font-medium text-gray-800', text: HISTORY_LABEL[h.action] || h.action }),
                    ' · ' + h.userName + ' · ' + TM.formatDateTime(h.createdAt)
                ]),
                historyDetail(h)
            ]));
        });
    }

    function historyDetail(h) {
        if (h.action === 'assigned') {
            return el('p', { class: 'text-sm text-gray-700', text: (h.oldValue || 'Chưa phân công') + ' → ' + (h.newValue || 'Bỏ phân công') });
        }
        if (h.action === 'approved' || h.action === 'rejected') {
            return h.newValue ? el('p', { class: 'text-sm text-gray-700 whitespace-pre-wrap break-words', text: '“' + h.newValue + '”' }) : null;
        }
        return el('div', null, [
            h.oldValue && h.oldValue !== h.newValue ? el('p', { class: 'text-xs text-gray-400 line-through whitespace-pre-wrap break-words', text: h.oldValue }) : null,
            el('p', { class: 'text-sm text-gray-700 whitespace-pre-wrap break-words', text: h.newValue || '' })
        ]);
    }
})();
