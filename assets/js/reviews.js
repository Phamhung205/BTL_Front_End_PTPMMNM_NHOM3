/**
 * Review / Approve - Translation Manager (module Phạm Thế Đức)
 * Duyệt / từ chối bản dịch theo trạng thái, kiểm tra biến thay thế, bình luận.
 */
(function () {
    const $ = function (id) { return document.getElementById(id); };
    const el = TM.el;

    const TABS = [
        { key: 'translated', label: 'Chờ duyệt', stat: 'translated' },
        { key: 'needs_review', label: 'Cần sửa lại', stat: 'needsReview' },
        { key: 'approved', label: 'Đã duyệt', stat: 'approved' }
    ];

    const state = {
        projects: [],
        project: null,
        role: '',
        locale: null,
        tab: 'translated',
        items: [],
        stats: null,
        checked: new Set(),
        request: 0,
        busy: false
    };

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const tab = TM.getQueryParam('tab');
        if (TABS.some(function (t) { return t.key === tab; })) state.tab = tab;

        $('rv-project').addEventListener('change', function () {
            const project = state.projects.find(function (p) { return String(p.id) === $('rv-project').value; });
            if (project) selectProject(project);
        });
        $('rv-locale').addEventListener('change', function () {
            state.locale = $('rv-locale').value;
            TM.rememberLocale(state.locale);
            reload();
        });
        $('rv-search').addEventListener('input', TM.debounce(loadList, 300));
        $('rv-check-all').addEventListener('change', function () {
            const checked = this.checked;
            approvableItems().forEach(function (item) {
                if (checked) state.checked.add(item.translationId); else state.checked.delete(item.translationId);
            });
            renderList();
        });
        $('rv-bulk-approve').addEventListener('click', bulkApprove);

        setView('loading');
        const picked = await TM.initProjectPicker($('rv-project'));
        if (picked.error) return setView('error', picked.error);
        state.projects = picked.projects;
        if (!picked.project) return setView('empty', 'Bạn chưa tham gia dự án nào.');
        await selectProject(picked.project);
    }

    function api(path) {
        return '/api/projects/' + encodeURIComponent(state.project.id) + path;
    }

    function canReview() {
        return state.role === 'manager' || state.role === 'reviewer';
    }

    async function selectProject(project) {
        state.project = project;
        state.role = String(project.role || '').toLowerCase();
        TM.rememberProject(project.id);
        state.items = [];
        state.checked.clear();

        const hint = canReview()
            ? ''
            : 'Bạn là Translator: chỉ xem kết quả review và bình luận. Chỉ Manager hoặc Reviewer được duyệt/từ chối.';
        $('rv-role-hint').textContent = hint;
        TM.show('rv-role-hint', !!hint);

        setView('loading');
        const locales = await TM.loadLocales(project.id);
        if (locales.error) return setView('error', locales.error);
        if (!locales.targets.length) {
            state.locale = null;
            $('rv-locale').textContent = '';
            renderTabs();
            return setView('empty', 'Dự án chưa có ngôn ngữ đích.');
        }
        state.locale = TM.fillLocaleSelect($('rv-locale'), locales.targets);
        await reload();
    }

    async function reload() {
        await Promise.all([loadList(), loadStats()]);
    }

    // ===================== Tabs / thống kê =====================

    async function loadStats() {
        if (!state.project || !state.locale) return;
        const result = await apiGet(api('/translations/stats'));
        state.stats = result.success ? TM.listFrom(result.data).find(function (s) { return s.localeCode === state.locale; }) || null : null;
        renderTabs();
    }

    function renderTabs() {
        const nav = $('rv-tabs');
        nav.textContent = '';
        TABS.forEach(function (tab) {
            const active = tab.key === state.tab;
            const count = state.stats ? state.stats[tab.stat] : null;
            nav.appendChild(el('button', {
                type: 'button',
                class: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ' + (active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'),
                onclick: function () {
                    if (state.tab === tab.key) return;
                    state.tab = tab.key;
                    state.checked.clear();
                    TM.setQueryParams({ tab: tab.key });
                    renderTabs();
                    loadList();
                }
            }, [
                tab.label,
                count === null || count === undefined ? null : el('span', { class: 'px-1.5 rounded-full text-xs ' + (active ? 'bg-white text-indigo-700' : 'bg-white text-gray-600'), text: String(count) })
            ]));
        });
    }

    // ===================== Danh sách =====================

    function setView(view, message) {
        TM.show('rv-loading', view === 'loading');
        TM.show('rv-empty', view === 'empty');
        TM.show('rv-error', view === 'error');
        TM.show('rv-list', view === 'list');
        if (view === 'empty') $('rv-empty-text').textContent = message || '';
        if (view === 'error') $('rv-error-text').textContent = message || '';
        if (view !== 'list') TM.show('rv-bulk', false);
    }

    async function loadList() {
        if (!state.project || !state.locale) return;
        const params = new URLSearchParams({ locale: state.locale, status: state.tab });
        const q = $('rv-search').value.trim();
        if (q) params.set('q', q);

        const request = ++state.request;
        if (!state.items.length) setView('loading');
        const result = await apiGet(api('/translations?' + params.toString()));
        if (request !== state.request) return;
        if (!result.success) return setView('error', TM.errorMessage(result, 'Không tải được danh sách bản dịch.'));

        state.items = TM.listFrom(result.data);
        const ids = new Set(state.items.map(function (i) { return i.translationId; }));
        Array.from(state.checked).forEach(function (id) { if (!ids.has(id)) state.checked.delete(id); });
        renderList();
    }

    function approvableItems() {
        if (!canReview() || state.tab === 'approved') return [];
        return state.items.filter(function (item) { return TM.checkPlaceholders(item.source, item.value).ok; });
    }

    function renderList() {
        const list = $('rv-list');
        list.textContent = '';
        if (!state.items.length) {
            const messages = {
                translated: 'Không có bản dịch nào đang chờ duyệt.',
                needs_review: 'Không có bản dịch nào cần sửa lại.',
                approved: 'Chưa có bản dịch nào được duyệt.'
            };
            setView('empty', $('rv-search').value.trim() ? 'Không có bản dịch nào khớp từ khóa.' : messages[state.tab]);
            return;
        }
        setView('list');
        state.items.forEach(function (item) { list.appendChild(renderCard(item)); });

        const approvable = approvableItems();
        TM.show('rv-bulk', approvable.length > 0);
        $('rv-bulk-count').textContent = String(state.checked.size);
        $('rv-check-all').checked = approvable.length > 0 && approvable.every(function (i) { return state.checked.has(i.translationId); });
        $('rv-bulk-approve').disabled = state.checked.size === 0 || state.busy;
    }

    function renderCard(item) {
        const check = TM.checkPlaceholders(item.source, item.value);
        const reviewable = canReview() && state.tab !== 'approved';

        const header = el('div', { class: 'flex flex-wrap items-center gap-2' });
        if (reviewable && check.ok) {
            const box = el('input', { type: 'checkbox', class: 'w-4 h-4 text-green-600 border-gray-300 rounded', title: 'Chọn để duyệt hàng loạt' });
            box.checked = state.checked.has(item.translationId);
            box.addEventListener('change', function () {
                if (box.checked) state.checked.add(item.translationId); else state.checked.delete(item.translationId);
                renderList();
            });
            header.appendChild(box);
        }
        header.appendChild(el('span', { class: 'font-mono text-sm font-semibold text-gray-900 break-all', text: item.key }));
        header.appendChild(TM.statusBadge(item.status));
        header.appendChild(el('span', { class: 'ml-auto text-xs text-gray-500', text: 'Người dịch: ' + (item.updatedByName || '--') + ' · ' + TM.formatDateTime(item.updatedAt) }));

        const source = el('div', { class: 'text-sm text-gray-800 whitespace-pre-wrap break-words' });
        TM.renderHighlighted(source, item.source);
        const value = el('div', { class: 'text-sm text-gray-900 whitespace-pre-wrap break-words' });
        TM.renderHighlighted(value, item.value);

        const body = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-3' }, [
            el('div', { class: 'p-3 rounded-lg bg-gray-50 border border-gray-200' }, [el('p', { class: 'text-xs font-medium text-gray-500 mb-1', text: 'Chuỗi nguồn' }), source]),
            el('div', { class: 'p-3 rounded-lg bg-indigo-50 border border-indigo-100' }, [el('p', { class: 'text-xs font-medium text-indigo-600 mb-1', text: 'Bản dịch (' + state.locale + ')' }), value])
        ]);

        let placeholderLine;
        if (!check.expected.length && !check.actual.length) placeholderLine = el('span', { class: 'text-gray-400', text: 'Không có biến thay thế' });
        else if (check.ok) placeholderLine = el('span', { class: 'text-green-700', text: '✓ Biến thay thế khớp: ' + check.expected.join(', ') });
        else placeholderLine = el('span', { class: 'text-red-700 font-medium', text: '✗ Biến thay thế không khớp: ' + TM.placeholderSummary(check) });

        const footer = el('div', { class: 'flex flex-wrap items-center gap-3 mt-3 text-xs' }, [placeholderLine]);
        if (item.lastReviewDecision && item.lastReviewNote) {
            footer.appendChild(el('span', { class: 'text-gray-500', text: 'Review gần nhất (' + (item.lastReviewDecision === 'approved' ? 'duyệt' : 'từ chối') + '): “' + item.lastReviewNote + '”' }));
        }

        const actions = el('div', { class: 'flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100' });
        if (canReview()) {
            if (state.tab !== 'approved') {
                actions.appendChild(el('button', {
                    type: 'button',
                    class: 'px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
                    title: check.ok ? 'Duyệt bản dịch' : 'Không thể duyệt khi biến thay thế không khớp',
                    disabled: !check.ok || state.busy,
                    text: 'Duyệt',
                    onclick: function () { approveOne(item); }
                }));
            }
            actions.appendChild(el('button', {
                type: 'button',
                class: 'px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50',
                disabled: state.busy,
                text: state.tab === 'approved' ? 'Thu hồi duyệt' : 'Từ chối',
                onclick: function () { openRejectDialog(item); }
            }));
        }
        actions.appendChild(el('button', {
            type: 'button',
            class: 'px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg',
            text: 'Bình luận' + (item.commentCount ? ' (' + item.commentCount + ')' : ''),
            onclick: function () { openCommentsDialog(item); }
        }));
        actions.appendChild(el('a', {
            href: '../translations/index.php?project_id=' + encodeURIComponent(state.project.id) + '&locale=' + encodeURIComponent(state.locale),
            class: 'px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800',
            text: 'Mở trang dịch →'
        }));

        return el('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-4' }, [header, body, footer, actions]);
    }

    // ===================== Duyệt / từ chối =====================

    function approve(item, note) {
        return apiPost(api('/translations/' + item.translationId + '/approve'), { note: note || null, expectedRowVersion: item.rowVersion });
    }

    async function approveOne(item) {
        if (state.busy) return;
        state.busy = true;
        renderList();
        const result = await approve(item);
        state.busy = false;
        handleReviewResult(result, 'Đã duyệt “' + item.key + '”');
    }

    function handleReviewResult(result, successText) {
        if (result.success) showToast(successText, 'success');
        else if (result.status === 409) showToast('Bản dịch vừa được người khác thay đổi — đã tải lại danh sách.', 'warning');
        else showToast(TM.errorMessage(result, 'Thao tác thất bại.'), 'error');
        reload();
    }

    function openRejectDialog(item) {
        const html = '<div class="space-y-3">'
            + '<p id="rv-reject-key" class="text-sm text-gray-600"></p>'
            + '<div><label for="rv-reject-note" class="block text-sm font-medium text-gray-700 mb-1">Lý do (bắt buộc)</label>'
            + '<textarea id="rv-reject-note" rows="3" maxlength="2000" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ví dụ: Sai thuật ngữ, cần dùng “Sign in” thay vì “Login”"></textarea>'
            + '<p id="rv-reject-error" class="hidden mt-1 text-sm text-red-600"></p></div></div>';
        openModal(state.tab === 'approved' ? 'Thu hồi duyệt' : 'Từ chối bản dịch', html, async function () {
            const note = $('rv-reject-note').value.trim();
            if (!note) {
                $('rv-reject-error').textContent = 'Hãy ghi rõ lý do để người dịch sửa lại.';
                $('rv-reject-error').classList.remove('hidden');
                return;
            }
            const button = $('modal-confirm-btn');
            button.disabled = true;
            const result = await apiPost(api('/translations/' + item.translationId + '/reject'), { note: note, expectedRowVersion: item.rowVersion });
            button.disabled = false;
            if (!result.success && result.status !== 409) {
                $('rv-reject-error').textContent = TM.errorMessage(result, 'Không từ chối được.');
                $('rv-reject-error').classList.remove('hidden');
                return;
            }
            closeModal();
            handleReviewResult(result, 'Đã chuyển “' + item.key + '” về trạng thái cần sửa lại');
        });
        $('rv-reject-key').textContent = 'Khóa: ' + item.key;
        $('modal-confirm-btn').textContent = state.tab === 'approved' ? 'Thu hồi' : 'Từ chối';
        $('rv-reject-note').focus();
    }

    async function bulkApprove() {
        const targets = approvableItems().filter(function (item) { return state.checked.has(item.translationId); });
        if (!targets.length || state.busy) return;

        state.busy = true;
        renderList();
        let ok = 0;
        const failed = [];
        for (const item of targets) {
            const result = await approve(item);
            if (result.success) ok++; else failed.push(item.key + ': ' + (result.message || 'lỗi'));
        }
        state.busy = false;
        state.checked.clear();
        if (failed.length) showToast('Đã duyệt ' + ok + '/' + targets.length + '. Lỗi: ' + failed.join('; '), 'warning');
        else showToast('Đã duyệt ' + ok + ' bản dịch', 'success');
        reload();
    }

    // ===================== Bình luận =====================

    function openCommentsDialog(item) {
        const html = '<div class="space-y-3">'
            + '<div id="rv-comments" class="space-y-3 max-h-64 overflow-y-auto"></div>'
            + '<textarea id="rv-comment-body" rows="2" maxlength="2000" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Viết bình luận..."></textarea>'
            + '</div>';
        openModal('Bình luận · ' + item.key, html, async function () {
            const body = $('rv-comment-body').value.trim();
            if (!body) return showToast('Nhập nội dung bình luận.', 'warning');
            const button = $('modal-confirm-btn');
            button.disabled = true;
            const result = await apiPost(api('/translations/' + item.translationId + '/comments'), { body: body });
            button.disabled = false;
            if (!result.success) return showToast(TM.errorMessage(result, 'Không gửi được bình luận.'), 'error');
            $('rv-comment-body').value = '';
            item.commentCount = (item.commentCount || 0) + 1;
            renderList();
            loadComments(item);
        });
        $('modal-confirm-btn').textContent = 'Gửi bình luận';
        loadComments(item);
    }

    async function loadComments(item) {
        const box = $('rv-comments');
        if (!box) return;
        box.textContent = '';
        box.appendChild(el('p', { class: 'text-sm text-gray-400', text: 'Đang tải...' }));
        const result = await apiGet(api('/translations/' + item.translationId + '/comments'));
        box.textContent = '';
        if (!result.success) return box.appendChild(el('p', { class: 'text-sm text-red-600', text: TM.errorMessage(result, 'Không tải được bình luận.') }));
        const comments = TM.listFrom(result.data);
        if (!comments.length) box.appendChild(el('p', { class: 'text-sm text-gray-400', text: 'Chưa có bình luận.' }));
        comments.forEach(function (c) {
            box.appendChild(el('div', null, [
                el('div', { class: 'text-xs text-gray-500' }, [el('span', { class: 'font-medium text-gray-800', text: c.userName }), ' · ' + TM.formatDateTime(c.createdAt)]),
                el('p', { class: 'text-sm text-gray-700 whitespace-pre-wrap break-words', text: c.body })
            ]));
        });
    }
})();
