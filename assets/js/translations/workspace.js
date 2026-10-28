/** Translation workflow. Server permissions and row versions remain authoritative. */
const workflow = { module: '', projects: [], project: null, members: [], locales: [], rows: [], stats: [], selected: new Set(), selectionAnchor: null, request: 0, detail: 0, page: 1, activityPage: 1, busy: false, ready: false };
const workflowPaths = { languages: 'languages', source_versions: 'source-versions', translation_keys: 'translation-keys', translations: 'translations', reviews: 'reviews', releases: 'releases', history: 'history' };
const translationLabels = { missing: 'Chưa dịch', draft: 'Nháp', translated: 'Chờ duyệt', needs_review: 'Cần sửa / nguồn thay đổi', approved: 'Đã duyệt' };
const activityLabels = { created: 'Tạo bản ghi dịch', saved_draft: 'Lưu nháp', submitted: 'Gửi duyệt', approved: 'Duyệt bản dịch', rejected: 'Từ chối bản dịch', assigned: 'Phân công', unassigned: 'Gỡ phân công', commented: 'Bình luận', source_imported: 'Nhập nguồn', published: 'Phát hành' };
const wf = id => document.getElementById(id);
const wfRoute = name => apiEndpoint(name, workflow.project?.id);
const wfManager = () => projectRole(workflow.project) === 'manager';
const wfReviewer = () => ['manager', 'reviewer'].includes(projectRole(workflow.project));
function wfUserId() { try { return JSON.parse(sessionStorage.getItem('user_display') || '{}').id; } catch (_) { return null; } }
function wfCanEdit(row) { return ['manager', 'translator'].includes(projectRole(workflow.project)) && (typeof row.canEdit === 'boolean' ? row.canEdit : wfManager() || (projectRole(workflow.project) === 'translator' && String(row.assignedTo) === String(wfUserId()))); }
function wfText(tag, text, className = '') { const node = document.createElement(tag); node.textContent = text ?? ''; node.className = className; return node; }
function wfOption(select, value, text) { const option = wfText('option', text); option.value = value; select.append(option); }
function wfError(message) { setTextContent('workflow-error-text', message); showElement('workflow-error'); }
function wfEmpty(message) { setTextContent('workflow-empty', message); wf('workflow-empty').classList.toggle('hidden', !message); }
function wfTime(value) { const date = new Date(value); return value && Number.isFinite(date.getTime()) ? date.toLocaleString('vi-VN') : '--'; }
function wfSetBusy(busy) {
    workflow.busy = busy;
    if (busy) {
        const nodes = [wf('workflow-project'), ...document.querySelectorAll('#workflow-content button, #workflow-content input, #workflow-content select, #workflow-content textarea')];
        workflow.disabledControls = new Map(nodes.map(node => [node, node.disabled]));
        nodes.forEach(node => { node.disabled = true; });
    } else {
        workflow.disabledControls?.forEach((disabled, node) => { node.disabled = disabled; });
        workflow.disabledControls = null;
    }
    if (!busy && wf('release-publish')) wf('release-publish').disabled = !workflow.ready;
}
document.addEventListener('DOMContentLoaded', () => {
    const root = wf('translation-workspace'); if (!root) return;
    workflow.module = root.dataset.module;
    wf('translation-tab-project')?.addEventListener('click', () => setTranslationPane('project'));
    wf('translation-tab-memory')?.addEventListener('click', () => setTranslationPane('memory'));
    if (workflow.module === 'translations') setTranslationPane(location.hash === '#translation-memory-pane' ? 'memory' : 'project', false);
    wf('workflow-project').addEventListener('change', event => selectWorkflowProject(event.target.value));
    wf('workflow-retry').addEventListener('click', initializeWorkflow);
    wf('translation-filter')?.addEventListener('submit', event => { event.preventDefault(); reloadTranslations(); });
    ['translation-locale', 'translation-status', 'translation-assignee', 'translation-work'].forEach(id => wf(id)?.addEventListener('change', reloadTranslations));
    wf('translation-select-all')?.addEventListener('change', event => {
        const start = (workflow.page - 1) * 50;
        workflow.rows.slice(start, workflow.page * 50).forEach(row => event.target.checked ? workflow.selected.add(row.stringId) : workflow.selected.delete(row.stringId));
        workflow.selectionAnchor = event.target.checked ? start : null;
        renderTranslations();
    });
    wf('translation-previous')?.addEventListener('click', () => { workflow.page--; renderTranslations(); });
    wf('translation-next')?.addEventListener('click', () => { workflow.page++; renderTranslations(); });
    wf('bulk-assign')?.addEventListener('click', bulkAssignTranslations);
    wf('bulk-approve-selected')?.addEventListener('click', () => bulkApproveWorkflowTranslations(workflow.rows.filter(row => workflow.selected.has(row.stringId)), 'selected'));
    wf('bulk-approve-all')?.addEventListener('click', () => bulkApproveWorkflowTranslations(workflow.rows, 'all'));
    wf('translation-select-results')?.addEventListener('click', selectAllWorkflowTranslations);
    wf('translation-clear-selection')?.addEventListener('click', () => { workflow.selected.clear(); workflow.selectionAnchor = null; renderTranslations(); });
    wf('bulk-delete')?.addEventListener('click', deleteSelectedWorkflowTranslations);
    wf('bulk-create-missing')?.addEventListener('click', createMissingWorkflowTranslations);
    wf('release-form')?.addEventListener('submit', publishWorkflowRelease);
    wf('release-api-config-download')?.addEventListener('click', downloadPublishedApiConfig);
    wf('release-api-config-copy')?.addEventListener('click', copyPublishedApiConfig);
    wf('release-revalidate')?.addEventListener('click', loadWorkflowModule);
    wf('activity-refresh')?.addEventListener('click', () => { workflow.activityPage = 1; loadWorkflowModule(); });
    wf('activity-previous')?.addEventListener('click', () => { workflow.activityPage--; loadWorkflowModule(); });
    wf('activity-next')?.addEventListener('click', () => { workflow.activityPage++; loadWorkflowModule(); });
    initializeWorkflow();
});
async function initializeWorkflow() {
    if (workflow.busy) return;
    const request = ++workflow.request; workflow.detail++; workflow.project = null;
    hideElement('workflow-content'); hideElement('workflow-error'); wfEmpty(''); showElement('workflow-loading');
    wf('workflow-project').disabled = true;
    if (APP_CONFIG.mode !== 'api') { hideElement('workflow-loading'); wfError('Chức năng này cần APP_MODE=api và Backend C#.'); return; }
    const result = await apiGet(apiEndpoint('projects'));
    if (request !== workflow.request) return;
    const projects = result.success ? apiCollection(result.data) : null;
    hideElement('workflow-loading');
    if (!projects) { wfError(result.message || 'Danh sách dự án không hợp lệ.'); return; }
    workflow.projects = projects; const picker = wf('workflow-project'); picker.replaceChildren();
    if (!projects.length) { wfOption(picker, '', 'Chưa có dự án'); wfEmpty('Bạn chưa tham gia dự án nào. Hãy tạo dự án hoặc nhờ Manager thêm bạn.'); return; }
    projects.forEach(project => wfOption(picker, String(project.id), project.name)); picker.disabled = false;
    const requested = new URLSearchParams(location.search).get('project_id');
    if (requested && !projects.some(project => String(project.id) === requested)) { wfOption(picker, '', 'Chọn dự án'); picker.value = ''; wfError('Bạn không có quyền xem dự án này. Hãy chọn dự án được phép truy cập.'); return; }
    await selectWorkflowProject(requested || String(projects[0].id));
}
async function selectWorkflowProject(id) {
    if (workflow.busy) return;
    workflow.project = workflow.projects.find(project => String(project.id) === String(id)) || null;
    if (!workflow.project) return;
    workflow.request++; workflow.detail++; workflow.page = 1; workflow.activityPage = 1; workflow.selected.clear(); workflow.selectionAnchor = null; workflow.rows = []; workflow.ready = false;
    wf('workflow-project').value = String(id);
    const url = new URL(location.href); url.searchParams.set('project_id', id); history.replaceState(null, '', url.pathname + url.search + url.hash);
    document.querySelectorAll('[data-source-link]').forEach(link => {
        link.href = getBaseUrl() + 'pages/' + workflowPaths[link.dataset.sourceLink] + '/index.php?project_id=' + encodeURIComponent(id);
        if (link.dataset.sourceLink === workflow.module) link.setAttribute('aria-current', 'page');
    });
    setTextContent('workflow-permission', 'Vai trò: ' + projectRole(workflow.project) + '. ' + (wfManager() ? 'Quản lý phân công, bản dịch, đánh giá và phát hành.' : wfReviewer() ? 'Đánh giá bản dịch, bình luận và tải bản phát hành.' : 'Chỉ dịch các khóa Manager đã giao cho bạn, gửi duyệt và bình luận.'));
    wf('release-form')?.reset(); wf('translation-filter')?.reset();
    const request = ++workflow.request;
    hideElement('workflow-content'); hideElement('workflow-error'); wfEmpty(''); showElement('workflow-loading');
    if (['translations', 'reviews'].includes(workflow.module)) {
        const translator = projectRole(workflow.project) === 'translator';
        wf('translation-assignee-filter')?.classList.toggle('hidden', !wfManager());
        wf('translation-status-filter')?.classList.toggle('hidden', translator);
        wf('translation-work-filter')?.classList.toggle('hidden', !translator);
        if (translator) { const work = wf('translation-work'); work.replaceChildren(); wfOption(work, 'me', 'Giao cho tôi'); work.value = 'me'; }
        const results = await Promise.all([apiGet(wfRoute('locales')), apiGet(wfRoute('members'))]);
        if (request !== workflow.request) return;
        const locales = results[0].success ? apiCollection(results[0].data) : null;
        const members = results[1].success ? apiCollection(results[1].data) : null;
        if (!locales || !members) { hideElement('workflow-loading'); wfError(results.find(result => !result.success)?.message || 'Không tải được ngôn ngữ hoặc thành viên.'); return; }
        workflow.locales = locales.filter(locale => !locale.isSource); workflow.members = members;
        const picker = wf('translation-locale'); picker.replaceChildren();
        workflow.locales.forEach(locale => wfOption(picker, locale.code, locale.name + ' (' + locale.code + ')'));
        if (workflow.locales.length) picker.value = workflow.locales[0].code;
        if (!workflow.locales.length) { hideElement('workflow-loading'); wfEmpty('Dự án chưa có ngôn ngữ đích. Manager cần thêm tại mục Ngôn ngữ.'); return; }
        const assignees = members.filter(member => member.isActive !== false && memberRole(member) === 'translator' && memberUserId(member) != null);
        const filter = wf('translation-assignee'); filter.replaceChildren();
        [['', 'Tất cả'], ['me', 'Giao cho tôi'], ['none', 'Chưa phân công']].forEach(([value, label]) => wfOption(filter, value, label));
        const bulk = wf('bulk-assignee'); bulk.replaceChildren(); wfOption(bulk, '', assignees.length ? 'Chọn người dịch' : 'Chưa có người dịch trong dự án');
        wfOption(bulk, 'unassign', 'Gỡ phân công');
        assignees.forEach(member => {
            if (wfManager()) wfOption(filter, String(memberUserId(member)), member.displayName);
            wfOption(bulk, String(memberUserId(member)), member.displayName);
        });
        bulk.value = '';
        const assignmentInfo = wf('translation-assignee-info');
        if (assignmentInfo) {
            assignmentInfo.textContent = assignees.length
                ? `Có ${assignees.length} người dịch trong dự án. Chọn các khóa cần giao rồi chọn người nhận.`
                : 'Dự án chưa có tài khoản vai trò Người dịch. Hãy thêm người dịch trong mục Thành viên dự án.';
        }
    }
    await loadWorkflowModule();
}
function reloadTranslations() { workflow.page = 1; workflow.selected.clear(); workflow.selectionAnchor = null; return loadWorkflowModule(); }
async function loadWorkflowModule() {
    if (!workflow.project || workflow.busy) return;
    const request = ++workflow.request; workflow.detail++;
    hideElement('workflow-content'); hideElement('workflow-error'); wfEmpty(''); showElement('workflow-loading');
    if (['translations', 'reviews'].includes(workflow.module)) {
        const locale = wf('translation-locale').value;
        if (!locale) { hideElement('workflow-loading'); return; }
        const results = await Promise.all([
            apiGet(wfRoute('translations'), { query: { locale, q: wf('translation-query').value.trim(), status: projectRole(workflow.project) === 'translator' ? '' : wf('translation-status').value, assignee: wfManager() ? wf('translation-assignee').value : projectRole(workflow.project) === 'translator' ? wf('translation-work').value : '' } }),
            apiGet(wfRoute('translationStats'))
        ]);
        if (request !== workflow.request) return;
        hideElement('workflow-loading');
        const rows = results[0].success ? apiCollection(results[0].data) : null, stats = results[1].success ? apiCollection(results[1].data) : null;
        if (!rows || !stats) { wfError(results.find(result => !result.success)?.message || 'Dữ liệu bản dịch không hợp lệ.'); return; }
        workflow.rows = rows; workflow.stats = stats;
        workflow.selected = new Set([...workflow.selected].filter(id => rows.some(row => row.stringId === id)));
        workflow.page = Math.max(1, Math.min(workflow.page, Math.ceil(rows.length / 50) || 1));
        showElement('workflow-content'); renderTranslations();
        const progress = stats.find(item => item.localeCode === locale);
        if (projectRole(workflow.project) === 'translator') {
            const count = status => rows.filter(row => row.status === status).length;
            setTextContent('translation-progress', `Phần việc được giao cho bạn (${workflow.rows.length} khóa): ${count('approved')} đã duyệt · ${count('missing')} chưa dịch · ${count('draft')} nháp · ${count('translated')} chờ duyệt · ${count('needs_review')} cần sửa`);
        } else {
            setTextContent('translation-progress', progress ? `${progress.localeName}: ${progress.approved}/${progress.total} đã duyệt · ${progress.missing} chưa dịch · ${progress.draft} nháp · ${progress.translated} chờ duyệt · ${progress.needsReview} cần sửa / nguồn thay đổi` : 'Chưa có thống kê.');
        }
    } else if (workflow.module === 'releases') {
        const results = await Promise.all([apiGet(wfRoute('releases')), apiGet(wfRoute('releases') + '/validate')]);
        if (request !== workflow.request) return;
        hideElement('workflow-loading');
        const releases = results[0].success ? apiCollection(results[0].data) : null;
        if (!releases || !results[1].success || typeof results[1].data?.ready !== 'boolean') { wfError(results.find(result => !result.success)?.message || 'Dữ liệu phát hành không hợp lệ.'); return; }
        showElement('workflow-content'); renderWorkflowReleases(releases, results[1].data);
    } else {
        const result = await apiGet(wfRoute('activity'), { query: { page: String(workflow.activityPage) } });
        if (request !== workflow.request) return;
        hideElement('workflow-loading');
        const items = result.success ? apiCollection(result.data) : null;
        if (!items) { wfError(result.message || 'Không tải được lịch sử.'); return; }
        showElement('workflow-content'); const list = wf('activity-list'); list.replaceChildren();
        items.forEach(item => list.append(renderWorkflowActivity(item)));
        wfEmpty(items.length ? '' : 'Chưa có hoạt động ở trang này.');
        setTextContent('activity-page', 'Trang ' + workflow.activityPage);
        wf('activity-previous').disabled = workflow.activityPage <= 1; wf('activity-next').disabled = !result.data.hasMore;
    }
}
function renderTranslations() {
    const body = wf('translations-body'); body.replaceChildren();
    const pageRows = workflow.rows.slice((workflow.page - 1) * 50, workflow.page * 50);
    wf('translation-bulk').classList.toggle('hidden', !wfReviewer());
    wf('translation-manager-bulk-actions')?.classList.toggle('hidden', !wfManager());
    wf('translation-manager-bulk-actions-secondary')?.classList.toggle('hidden', !wfManager());
    wf('translation-review-bulk-actions')?.classList.toggle('hidden', !wfReviewer());
    wf('translation-select-all').classList.toggle('hidden', !wfReviewer());
    pageRows.forEach((row, localIndex) => {
        const tr = document.createElement('tr');
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = workflow.selected.has(row.stringId); checkbox.setAttribute('aria-label', 'Chọn ' + row.key);
        const rowIndex = (workflow.page - 1) * 50 + localIndex;
        checkbox.addEventListener('click', event => { checkbox.dataset.shiftSelect = String(event.shiftKey); });
        checkbox.addEventListener('change', () => {
            const checked = checkbox.checked, shift = checkbox.dataset.shiftSelect === 'true';
            checkbox.dataset.shiftSelect = 'false';
            if (shift && workflow.selectionAnchor !== null) {
                const first = Math.min(workflow.selectionAnchor, rowIndex), last = Math.max(workflow.selectionAnchor, rowIndex);
                workflow.rows.slice(first, last + 1).forEach(item => checked ? workflow.selected.add(item.stringId) : workflow.selected.delete(item.stringId));
            } else {
                checked ? workflow.selected.add(row.stringId) : workflow.selected.delete(row.stringId);
            }
            workflow.selectionAnchor = rowIndex;
            renderTranslations();
        });
        appendCell(tr, wfReviewer() ? checkbox : '');
        const source = document.createElement('div'); source.append(wfText('p', row.key, 'font-mono text-indigo-700 mb-2'), wfText('p', row.source, 'whitespace-pre-wrap'));
        if (row.placeholders?.length) source.append(wfText('p', 'Biến: ' + row.placeholders.join(', '), 'text-xs text-amber-700 mt-2'));
        appendCell(tr, source); appendCell(tr, row.value ?? 'Chưa dịch');
        const status = document.createElement('div'); status.append(wfText('p', translationLabels[row.status] || row.status, 'font-medium'), wfText('p', row.assignedToName || 'Chưa phân công', 'mt-2 text-xs'));
        if (row.lastReviewNote) status.append(wfText('p', 'Đánh giá gần nhất: ' + row.lastReviewNote, 'text-xs mt-2'));
        appendCell(tr, status);
        const actions = document.createElement('div'); actions.className = 'flex flex-col items-start gap-3';
        actions.append(actionButton(wfCanEdit(row) ? 'Dịch / Gửi duyệt' : 'Xem bản dịch', () => editWorkflowTranslation(row)));
        if (wfReviewer() && row.translationId && row.value != null && row.status !== 'draft') {
            if (row.status !== 'approved') actions.append(actionButton('Duyệt', () => reviewWorkflowTranslation(row, true)));
            actions.append(actionButton('Từ chối', () => reviewWorkflowTranslation(row, false), true));
        }
        if (row.translationId) actions.append(actionButton('Bình luận (' + (row.commentCount || 0) + ') / Lịch sử', () => openWorkflowDiscussion(row)));
        if (wfManager()) {
            actions.append(actionButton('Phân công', () => assignWorkflowTranslation(row)));
            if (row.translationId) actions.append(actionButton('Xóa', () => deleteWorkflowTranslation(row), true));
        }
        appendCell(tr, actions); body.append(tr);
    });
    updateWorkflowSelection();
    setTextContent('translation-count', `${workflow.rows.length} khóa phù hợp · hiển thị tối đa 50 khóa mỗi trang`);
    wfEmpty(workflow.rows.length ? '' : projectRole(workflow.project) === 'translator' ? 'Chưa có phần việc được giao cho bạn. Hãy nhờ Manager phân công các khóa cần dịch.' : 'Không có khóa phù hợp. Hãy đổi bộ lọc hoặc nhập nguồn tại mục Phiên bản nguồn.');
    setTextContent('translation-page', `Trang ${workflow.page}/${Math.ceil(workflow.rows.length / 50) || 1}`);
    wf('translation-previous').disabled = workflow.page <= 1; wf('translation-next').disabled = workflow.page * 50 >= workflow.rows.length;
}
function updateWorkflowSelection() {
    const existing = workflow.rows.filter(row => workflow.selected.has(row.stringId) && row.translationId).length;
    setTextContent('translation-selected', `Đã chọn ${workflow.selected.size} khóa · ${existing} bản dịch hiện có`);
    const rows = workflow.rows.slice((workflow.page - 1) * 50, workflow.page * 50), count = rows.filter(row => workflow.selected.has(row.stringId)).length;
    wf('translation-select-all').checked = rows.length > 0 && count === rows.length; wf('translation-select-all').indeterminate = count > 0 && count < rows.length;
    setTextContent('translation-select-results', `Chọn tất cả ${workflow.rows.length} kết quả`);
    wf('translation-select-results').disabled = workflow.busy || !workflow.rows.length;
    wf('translation-clear-selection').disabled = workflow.busy || !workflow.selected.size;
    wf('bulk-delete').disabled = workflow.busy || !existing;
    const selectedPending = workflow.rows.filter(row => workflow.selected.has(row.stringId) && row.status === 'translated' && row.translationId && row.value != null).length;
    const allPending = workflow.rows.filter(row => row.status === 'translated' && row.translationId && row.value != null).length;
    wf('bulk-approve-selected').disabled = workflow.busy || !selectedPending;
    wf('bulk-approve-all').disabled = workflow.busy || !allPending;
    setTextContent('bulk-approve-selected', `Duyệt bản đã chọn (${selectedPending})`);
    setTextContent('bulk-approve-all', `Duyệt tất cả đang chờ (${allPending})`);
}
function selectAllWorkflowTranslations() {
    if (!wfReviewer() || workflow.busy) return;
    workflow.selected = new Set(workflow.rows.map(row => row.stringId));
    workflow.selectionAnchor = null;
    renderTranslations();
}
function bulkApproveWorkflowTranslations(candidates, mode) {
    if (!wfReviewer() || workflow.busy) return;
    const pending = candidates.filter(row => row.status === 'translated' && row.translationId && row.value != null);
    const skipped = candidates.length - pending.length;
    if (!pending.length) { wfError(mode === 'selected' ? 'Trong các khóa đã chọn không có bản dịch nào đang chờ duyệt.' : 'Không có bản dịch nào đang chờ duyệt trong kết quả hiện tại.'); return; }
    if (pending.length > 1000) { wfError('Mỗi lần duyệt tối đa 1.000 bản dịch. Hãy lọc bớt kết quả rồi thử lại.'); return; }
    const items = pending.map(row => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion }));
    const skippedText = skipped ? ` Bỏ qua ${skipped} khóa không ở trạng thái chờ duyệt.` : '';
    const message = `Sẽ duyệt ${pending.length} bản dịch ở ngôn ngữ ${wf('translation-locale').selectedOptions[0]?.textContent || wf('translation-locale').value}.${skippedText} Thao tác chỉ áp dụng cho các bản dịch đang chờ duyệt.`;
    showConfirmDialog(`Duyệt ${pending.length} bản dịch`, message, async () => {
        wfSetBusy(true);
        const result = await apiPost(wfRoute('translations') + '/approve', { items });
        wfSetBusy(false);
        if (!result.success) { wfError(result.message || 'Không duyệt được các bản dịch đã chọn.'); return; }
        workflow.selected.clear(); workflow.selectionAnchor = null;
        showToast(`Đã duyệt ${result.data?.approved ?? pending.length} bản dịch.`, 'success');
        await loadWorkflowModule();
    });
}
function openWorkflowMutation(title, content, perform, successMessage, options = {}) {
    if (!wfManager() || workflow.busy) return;
    const projectId = workflow.project.id, locale = wf('translation-locale').value;
    const error = modalError('translation-mutation-error'); content.append(error);
    openModal(title, content, async () => {
        if (!wfManager() || workflow.busy || workflow.project?.id !== projectId || wf('translation-locale').value !== locale) {
            error.textContent = 'Dự án hoặc ngôn ngữ đã thay đổi. Đóng hộp thoại và chọn lại thao tác.'; error.classList.remove('hidden'); return;
        }
        setModalBusy(true); wfSetBusy(true);
        let result;
        try { result = await perform(); }
        finally { wfSetBusy(false); setModalBusy(false); }
        if (result.success) {
            closeModal(); workflow.selected.clear(); showToast(successMessage(result.data), 'success'); await loadWorkflowModule();
        } else {
            error.textContent = result.message; error.classList.remove('hidden');
            if ([404, 409].includes(result.status) && !content.querySelector('[data-reload-translations]')) {
                const reload = actionButton('Tải lại danh sách', async () => { closeModal(); await reloadTranslations(); });
                reload.dataset.reloadTranslations = 'true'; content.append(reload);
            }
        }
    }, options);
}
function createMissingWorkflowTranslations() {
    if (!wfManager() || workflow.busy) return;
    const route = wfRoute('translations') + '/create-missing', locale = wf('translation-locale').value;
    const content = document.createElement('div'); content.className = 'space-y-4';
    content.append(wfText('p', `Tạo bản ghi cho mọi khóa nguồn đang dùng chưa có bản dịch ${locale} trong dự án, kể cả ngoài bộ lọc hiện tại.`),
        wfText('p', 'Bản dịch đã có được giữ nguyên. Bản ghi mới để trống nội dung, chưa phân công và chưa được duyệt.', 'text-sm text-gray-600'));
    openWorkflowMutation('Thêm tất cả bản ghi dịch còn thiếu', content,
        () => apiPost(route, { localeCode: locale }),
        data => `Đã thêm ${data.created} bản ghi dịch trống; giữ nguyên ${data.existing} bản ghi đã có.`,
        { confirmText: 'Thêm tất cả', busyText: 'Đang thêm...' });
}
function deleteWorkflowTranslation(row) {
    if (!row.translationId) return;
    openDeleteWorkflowTranslations([row], false);
}
function deleteSelectedWorkflowTranslations() {
    if (!wfManager() || workflow.busy) return;
    const rows = workflow.rows.filter(row => workflow.selected.has(row.stringId) && row.translationId);
    if (!rows.length) { wfError('Chưa chọn bản dịch hiện có để xóa.'); return; }
    if (rows.length > 10000) { wfError('Mỗi lần xóa tối đa 10.000 bản dịch. Hãy thu hẹp bộ lọc.'); return; }
    openDeleteWorkflowTranslations(rows, true);
}
function openDeleteWorkflowTranslations(rows, bulk) {
    if (!wfManager() || workflow.busy) return;
    const route = wfRoute('translations'), locale = wf('translation-locale').value;
    const items = rows.map(row => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion }));
    const content = document.createElement('div'); content.className = 'space-y-4';
    content.append(wfText('p', `Xóa vĩnh viễn ${items.length} bản dịch ${locale} khỏi CSDL?`, 'font-medium'),
        wfText('p', rows.slice(0, 5).map(row => row.key).join(', ') + (rows.length > 5 ? ` và ${rows.length - 5} khóa khác` : ''), 'font-mono text-sm'),
        wfText('p', 'Bình luận, lịch sử và đánh giá của các bản dịch này cũng bị xóa. Khóa nguồn và các bản phát hành đã có được giữ lại. Sau khi xóa, khóa nguồn sẽ hiển thị Chưa dịch.', 'text-sm text-gray-600'));
    const perform = bulk
        ? () => apiDelete(route, { body: JSON.stringify({ localeCode: locale, items }) })
        : () => apiDelete(route + '/' + items[0].translationId, { body: JSON.stringify({ expectedRowVersion: items[0].expectedRowVersion }) });
    openWorkflowMutation(bulk ? 'Xóa các bản dịch đã chọn' : 'Xóa bản dịch', content, perform,
        data => `Đã xóa ${data.deleted} bản dịch khỏi CSDL.`,
        { confirmText: 'Xóa vĩnh viễn', busyText: 'Đang xóa...', danger: true });
}
function workflowTranslationContext(row) {
    const form = document.createElement('form'); form.className = 'space-y-4';
    form.append(wfText('p', row.key, 'font-mono text-indigo-700'), wfText('p', 'Nguồn: ' + row.source, 'whitespace-pre-wrap text-sm'));
    return form;
}
function editWorkflowTranslation(row) {
    const form = workflowTranslationContext(row), editable = wfCanEdit(row), route = wfRoute('translations'), locale = wf('translation-locale').value;
    const input = modalField(form, 'edit-translation-value', 'Bản dịch', row.value ?? '', 'textarea'); input.maxLength = 10000; input.rows = 6; input.required = true; input.readOnly = !editable;
    if (row.placeholders?.length) form.append(wfText('p', 'Giữ đúng các biến: ' + row.placeholders.join(', '), 'text-sm text-amber-700'));
    if (row.lastReviewNote) form.append(wfText('p', 'Đánh giá gần nhất: ' + row.lastReviewNote, 'text-sm'));
    const status = modalField(form, 'edit-translation-status', 'Lưu dưới dạng', '', 'select');
    wfOption(status, 'draft', 'Nháp'); wfOption(status, 'translated', 'Gửi duyệt'); status.value = 'draft'; status.disabled = !editable;
    const error = modalError('translation-edit-error'); form.append(error);
    let version = row.rowVersion;
    form.addEventListener('submit', event => { event.preventDefault(); wf('modal-confirm-btn').click(); });
    openModal(editable ? 'Chỉnh sửa bản dịch' : 'Nội dung bản dịch', form, async () => {
        if (!editable) { closeModal(); return; }
        if (!form.reportValidity()) return;
        setModalBusy(true);
        const result = await apiPost(route, { stringId: row.stringId, localeCode: locale, value: input.value, status: status.value, expectedRowVersion: version });
        setModalBusy(false);
        if (result.success) { closeModal(); showToast('Đã lưu bản dịch.', 'success'); await loadWorkflowModule(); return; }
        error.textContent = result.message; error.classList.remove('hidden');
        form.querySelector('[data-conflict]')?.remove();
        if (result.status === 409 && Number.isInteger(result.details?.currentRowVersion)) {
            const current = result.details, conflict = document.createElement('div'); conflict.dataset.conflict = 'true'; conflict.className = 'p-4 bg-amber-50 rounded-lg space-y-3';
            conflict.append(wfText('p', `Bản mới nhất (phiên bản ${current.currentRowVersion}) bởi ${current.updatedBy || 'thành viên khác'} · ${wfTime(current.updatedAt)}`, 'text-sm font-medium'), wfText('pre', current.currentValue ?? 'Chưa dịch', 'whitespace-pre-wrap text-sm'));
            conflict.append(actionButton('Tải nội dung mới nhất vào trình soạn thảo', () => { input.value = current.currentValue ?? ''; version = current.currentRowVersion; conflict.remove(); error.textContent = 'Đã tải bản mới nhất. Kiểm tra rồi lưu lại.'; }));
            conflict.append(actionButton('Giữ nội dung của tôi và xác nhận ghi đè ở lần lưu tiếp', () => { version = current.currentRowVersion; conflict.remove(); error.textContent = 'Nội dung của bạn được giữ lại. Bấm Lưu để ghi đè bản vừa hiển thị.'; }, true));
            form.append(conflict);
        }
    }, { confirmText: editable ? 'Lưu bản dịch' : 'Đóng' });
}
function reviewWorkflowTranslation(row, approve) {
    if (!wfReviewer()) return;
    const route = wfRoute('translations') + '/' + row.translationId + (approve ? '/approve' : '/reject'), form = workflowTranslationContext(row);
    form.append(wfText('p', 'Bản dịch: ' + row.value, 'whitespace-pre-wrap text-sm'));
    const note = modalField(form, 'translation-review-note', approve ? 'Ghi chú (tùy chọn)' : 'Lý do từ chối', '', 'textarea'); note.maxLength = 2000; note.required = !approve;
    const error = modalError('translation-review-error'); form.append(error);
    form.addEventListener('submit', event => { event.preventDefault(); wf('modal-confirm-btn').click(); });
    openModal(approve ? 'Duyệt bản dịch' : 'Từ chối bản dịch', form, async () => {
        if (!form.reportValidity()) return;
        setModalBusy(true); const result = await apiPost(route, { note: note.value.trim() || null, expectedRowVersion: row.rowVersion }); setModalBusy(false);
        if (result.success) { closeModal(); showToast(approve ? 'Đã duyệt bản dịch.' : 'Đã gửi yêu cầu sửa.', 'success'); await loadWorkflowModule(); }
        else { error.textContent = result.status === 409 ? 'Bản dịch đã thay đổi. Đóng hộp thoại, tải lại danh sách và xem bản mới trước khi đánh giá.' : result.message; error.classList.remove('hidden'); }
    }, { confirmText: approve ? 'Duyệt' : 'Từ chối', danger: !approve });
}
function assignWorkflowTranslation(row) {
    if (!wfManager()) return;
    const form = workflowTranslationContext(row), select = modalField(form, 'single-assignee', 'Người được phân công', '', 'select');
    wfOption(select, '', 'Chọn người dịch'); wfOption(select, 'unassign', 'Gỡ phân công'); workflow.members.filter(member => member.isActive !== false && memberRole(member) === 'translator' && memberUserId(member) != null).forEach(member => wfOption(select, String(memberUserId(member)), member.displayName)); select.value = row.assignedTo == null ? '' : String(row.assignedTo);
    const error = modalError('assignment-error'); form.append(error);
    const route = wfRoute('translations'), locale = wf('translation-locale').value;
    openModal('Phân công bản dịch', form, async () => {
        if (!select.value) { error.textContent = 'Hãy chọn người dịch hoặc chọn rõ “Gỡ phân công”.'; error.classList.remove('hidden'); return; }
        setModalBusy(true);
        const userId = select.value === 'unassign' ? null : Number(select.value);
        const result = row.translationId
            ? await apiPut(route + '/' + row.translationId + '/assign', { userId, expectedRowVersion: row.rowVersion })
            : await apiPut(route + '/assign', { localeCode: locale, stringIds: [row.stringId], userId });
        setModalBusy(false);
        if (result.success) { closeModal(); showToast('Đã cập nhật phân công.', 'success'); await loadWorkflowModule(); }
        else { error.textContent = result.message; error.classList.remove('hidden'); }
    }, { confirmText: 'Lưu phân công' });
}
async function bulkAssignTranslations() {
    if (!wfManager() || workflow.busy) return;
    if (!workflow.selected.size || workflow.selected.size > 500) { wfError('Chọn từ 1 đến 500 khóa để phân công.'); return; }
    const selectedAssignee = wf('bulk-assignee').value;
    if (!selectedAssignee) { wfError('Chọn tài khoản người dịch trước khi phân công.'); return; }
    const route = wfRoute('translations') + '/assign', body = { localeCode: wf('translation-locale').value, stringIds: [...workflow.selected], userId: selectedAssignee === 'unassign' ? null : Number(selectedAssignee) };
    wfSetBusy(true); const result = await apiPut(route, body); wfSetBusy(false);
    if (result.success) { workflow.selected.clear(); showToast('Đã cập nhật phân công.', 'success'); await loadWorkflowModule(); }
    else wfError(result.message);
}
async function openWorkflowDiscussion(row) {
    const request = ++workflow.detail, route = wfRoute('translations') + '/' + row.translationId;
    const results = await Promise.all([apiGet(route + '/comments'), apiGet(route + '/history')]);
    if (request !== workflow.detail) return;
    const comments = results[0].success ? apiCollection(results[0].data) : null, entries = results[1].success ? apiCollection(results[1].data) : null;
    if (!comments || !entries) { wfError(results.find(result => !result.success)?.message || 'Không tải được thảo luận.'); return; }
    const form = workflowTranslationContext(row), list = document.createElement('div'); list.className = 'space-y-3';
    form.append(wfText('h3', 'Bình luận', 'font-semibold'), list);
    const renderComments = () => { list.replaceChildren(); if (!comments.length) list.append(wfText('p', 'Chưa có bình luận.', 'text-sm text-gray-500')); comments.forEach(comment => { const item = document.createElement('div'); item.append(wfText('p', comment.userName + ' · ' + wfTime(comment.createdAt), 'text-xs text-gray-500'), wfText('p', comment.body, 'whitespace-pre-wrap text-sm')); list.append(item); }); };
    renderComments();
    const input = modalField(form, 'translation-comment', 'Thêm bình luận', '', 'textarea'); input.maxLength = 2000; input.required = true;
    const error = modalError('comment-error'); const send = wfText('button', 'Gửi bình luận', 'workflow-primary'); send.type = 'submit'; form.append(error, send);
    form.addEventListener('submit', async event => {
        event.preventDefault(); if (!form.reportValidity() || modalBusy) return;
        setModalBusy(true); const result = await apiPost(route + '/comments', { body: input.value.trim() }); setModalBusy(false);
        if (result.success) { comments.push(result.data); row.commentCount = comments.length; input.value = ''; error.classList.add('hidden'); renderComments(); renderTranslations(); }
        else { error.textContent = result.message; error.classList.remove('hidden'); }
    });
    form.append(wfText('h3', 'Lịch sử bản dịch (100 hoạt động gần nhất)', 'font-semibold pt-4'));
    entries.forEach(entry => form.append(renderWorkflowActivity({ ...entry, kind: 'translation' })));
    openModal('Thảo luận / Lịch sử', form, closeModal, { confirmText: 'Đóng' });
}
function renderWorkflowActivity(item) {
    const card = document.createElement('article'); card.className = 'workflow-card space-y-2';
    card.append(wfText('p', (activityLabels[item.action] || item.action) + (item.label ? ' · ' + item.label : '') + (item.localeCode ? ' · ' + item.localeCode : ''), 'font-medium'), wfText('p', (item.userName || '') + ' · ' + wfTime(item.createdAt), 'text-xs text-gray-500'));
    if (item.oldValue != null || item.newValue != null) {
        const details = document.createElement('details'); details.append(wfText('summary', 'Xem nội dung', 'text-sm text-indigo-600 cursor-pointer'));
        if (item.oldValue != null) details.append(wfText('p', 'Trước: ' + item.oldValue, 'whitespace-pre-wrap text-sm mt-3'));
        if (item.newValue != null) details.append(wfText('p', (item.action === 'rejected' || item.action === 'commented' || item.action === 'published' ? 'Ghi chú: ' : 'Sau: ') + item.newValue, 'whitespace-pre-wrap text-sm mt-3'));
        card.append(details);
    }
    return card;
}
function renderWorkflowReleases(releases, validation) {
    workflow.ready = validation.ready;
    const status = wf('release-validation'); status.replaceChildren();
    status.append(wfText('p', validation.ready ? 'Đủ điều kiện phát hành.' : 'Chưa đủ điều kiện phát hành.', validation.ready ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'));
    status.append(wfText('p', `Nguồn: ${validation.latestSourceVersionName || 'Chưa nhập'} · ${validation.activeStrings} khóa`, 'text-sm mt-2'));
    (validation.problems || []).forEach(problem => status.append(wfText('p', '• ' + problem, 'text-sm mt-2 text-amber-700')));
    status.append(actionButton('Xuất báo cáo JSON', exportWorkflowReport));
    const progress = wf('release-progress'); progress.replaceChildren();
    (validation.locales || []).forEach(locale => progress.append(wfText('p', `${locale.localeName} (${locale.localeCode}): ${locale.approved}/${locale.total} đã duyệt · ${locale.missing} chưa dịch · ${locale.draft} nháp · ${locale.translated} chờ duyệt · ${locale.needsReview} cần sửa`, 'text-sm mt-2')));
    wf('release-form').classList.toggle('hidden', !wfManager()); wf('release-publish').disabled = !validation.ready;
    const list = wf('releases-list'); list.replaceChildren();
    releases.forEach(release => {
        const card = document.createElement('article'); card.className = 'workflow-card space-y-3';
        card.append(wfText('h2', release.version, 'font-semibold text-lg'), wfText('p', `${release.publishedByName} · ${wfTime(release.publishedAt)} · nguồn ${release.sourceVersionName || '--'} · ${release.keyCount} khóa`, 'text-sm text-gray-500'));
        if (release.note) card.append(wfText('p', release.note, 'text-sm whitespace-pre-wrap'));
        const route = wfRoute('releases') + '/' + release.id;
        const preview = document.createElement('a'); preview.textContent = 'Mở ứng dụng đọc gói'; preview.className = 'text-indigo-600 text-sm font-medium';
        preview.href = getBaseUrl() + 'pages/consumer/index.php?project_id=' + encodeURIComponent(workflow.project.id) + '&release_id=' + encodeURIComponent(release.id); card.append(preview);
        const zip = actionButton('Tải gói ZIP', () => downloadWorkflowRelease(route + '/download', release.version + '.zip', zip)); card.append(zip);
        const integrationHelp = wfText('p', 'Khách dùng API key chỉ đọc của release này. Tải client mẫu rồi điền key trong translation-manager.config.js.', 'text-sm text-gray-600'); card.append(integrationHelp);
        if (wfManager()) {
            const keyButton = actionButton('Cấp lại API key khách hàng', () => createWorkflowReleaseApiKey(route, release, keyButton, keyPanel)); card.append(keyButton);
        }
        const keyPanel = document.createElement('section'); keyPanel.className = 'hidden border rounded-lg p-3 space-y-2';
        keyPanel.append(wfText('h3', 'API key chỉ hiển thị lần này', 'font-semibold'));
        keyPanel.append(wfText('p', 'Key chỉ đọc các bản dịch trong release này. Tạo key mới sẽ thu hồi key cũ.', 'text-sm text-amber-700'));
        const keyValue = document.createElement('textarea'); keyValue.readOnly = true; keyValue.rows = 2; keyValue.className = 'workflow-input font-mono text-sm'; keyValue.setAttribute('aria-label', 'API key khách hàng');
        keyPanel.append(keyValue);
        const configValue = document.createElement('textarea'); configValue.readOnly = true; configValue.rows = 7; configValue.className = 'workflow-input font-mono text-xs'; configValue.setAttribute('aria-label', 'Cấu hình tích hợp');
        keyPanel.append(configValue);
        const copyConfig = actionButton('Sao chép cấu hình', async () => {
            try { await navigator.clipboard.writeText(configValue.value); showToast('Đã sao chép cấu hình API.', 'success'); }
            catch { configValue.focus(); configValue.select(); showToast('Hãy sao chép cấu hình đang được chọn.'); }
        });
        const downloadConfig = actionButton('Tải translation-manager.config.js', () => {
            const url = URL.createObjectURL(new Blob([configValue.value], { type: 'text/javascript;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url; link.download = 'translation-manager.config.js';
            document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
        });
        keyPanel.append(copyConfig, downloadConfig); card.append(keyPanel);
        const integration = actionButton('Tải client tích hợp API', () => downloadWorkflowRelease(route + '/integration', release.version + '-api-integration.zip', integration)); card.append(integration);
        (release.files || []).forEach(file => {
            const row = document.createElement('div'); row.className = 'border-t pt-3 space-y-2';
            row.append(wfText('p', `${file.localeCode}${file.isSource ? ' (nguồn)' : ''} · ${file.keyCount} khóa · ${file.sizeBytes} byte`, 'text-sm'), wfText('p', 'SHA-256: ' + file.sha256, 'font-mono text-xs break-all'));
            const button = actionButton('Tải ' + file.fileName, () => downloadWorkflowRelease(route + '/files/' + encodeURIComponent(file.localeCode), file.fileName, button)); row.append(button); card.append(row);
        });
        list.append(card);
    });
    wfEmpty(releases.length ? '' : 'Chưa có bản phát hành. Hoàn tất dịch và duyệt để tạo phiên bản đầu tiên.');
}
async function createWorkflowReleaseApiKey(route, release, button, panel) {
    if (!wfManager() || button.disabled) return;
    showConfirmDialog('Tạo / đổi API key', `Key mới chỉ đọc bản phát hành ${release.version}. Nếu release đã có key, key cũ sẽ mất hiệu lực. Tiếp tục?`, async () => {
        button.disabled = true;
        const result = await apiPost(route + '/api-key', {});
        button.disabled = false;
        if (!result.success) { wfError(result.message); return; }
        const key = result.data.apiKey;
        const apiBaseUrl = String(APP_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');
        const keyField = panel.querySelector('textarea[aria-label="API key khách hàng"]');
        const configField = panel.querySelector('textarea[aria-label="Cấu hình tích hợp"]');
        keyField.value = key;
        configField.value = `window.TRANSLATION_MANAGER_CONFIG = {\n  apiBaseUrl: '${apiBaseUrl}',\n  releaseId: ${release.id},\n  apiKey: '${key}',\n  selector: '[data-translation-language]',\n  defaultLocale: 'vi'\n};`;
        panel.classList.remove('hidden');
        showToast('Đã tạo API key chỉ đọc cho release này. Hãy lưu key trước khi rời trang.', 'success');
    });
}
async function exportWorkflowReport() {
    const result = await apiGet(wfRoute('releases') + '/report');
    if (!result.success) { wfError(result.message); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'project-' + workflow.project.id + '-report.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function publishWorkflowRelease(event) {
    event.preventDefault(); if (!wfManager() || !workflow.ready || workflow.busy || !event.currentTarget.reportValidity()) return;
    const route = wfRoute('releases'), body = { versionName: wf('release-version').value.trim(), note: wf('release-note').value.trim() || null };
    showConfirmDialog('Phát hành ' + body.versionName, 'Tạo snapshot cố định cho toàn bộ ngôn ngữ theo nguồn và các bản dịch đã duyệt hiện tại?', async () => {
        wfSetBusy(true); const result = await apiPost(route, body); wfSetBusy(false);
        if (result.success) { wf('release-form').reset(); showPublishedReleaseApiKey(result.data); showToast('Đã phát hành và tạo API key cho khách hàng.', 'success'); await loadWorkflowModule(); }
        else { await loadWorkflowModule(); wfError(result.message + (result.details?.problems?.length ? ' ' + result.details.problems.join(' ') : '')); }
    });
}
function showPublishedReleaseApiKey(release) {
    if (!release?.apiKey || !release?.id) return;
    const defaultLocale = release.files?.find(file => !file.isSource)?.localeCode || 'vi';
    const config = {
        apiBaseUrl: String(APP_CONFIG?.apiBaseUrl || '').replace(/\/$/, ''),
        releaseId: release.id,
        apiKey: release.apiKey,
        selector: '[data-translation-language]',
        defaultLocale
    };
    wf('release-api-key-value').value = release.apiKey;
    wf('release-api-config-value').value = 'window.TRANSLATION_MANAGER_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n';
    wf('release-api-key-result').classList.remove('hidden');
    wf('release-api-key-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function downloadPublishedApiConfig() {
    const contents = wf('release-api-config-value')?.value;
    if (!contents) return;
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/javascript;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'translation-manager.config.js';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function copyPublishedApiConfig() {
    const field = wf('release-api-config-value');
    if (!field?.value) return;
    try { await navigator.clipboard.writeText(field.value); showToast('Đã sao chép cấu hình API.', 'success'); }
    catch { field.focus(); field.select(); showToast('Hãy sao chép cấu hình đang được chọn.'); }
}
function setTranslationPane(pane, updateUrl = true) {
    const memory = pane === 'memory';
    wf('translation-pane-project')?.classList.toggle('hidden', memory);
    wf('translation-memory-pane')?.classList.toggle('hidden', !memory);
    const projectTab = wf('translation-tab-project'), memoryTab = wf('translation-tab-memory');
    projectTab?.setAttribute('aria-selected', String(!memory));
    memoryTab?.setAttribute('aria-selected', String(memory));
    projectTab?.classList.toggle('bg-indigo-600', !memory); projectTab?.classList.toggle('text-white', !memory);
    projectTab?.classList.toggle('text-indigo-700', memory); projectTab?.classList.toggle('hover:bg-indigo-50', memory);
    memoryTab?.classList.toggle('bg-indigo-600', memory); memoryTab?.classList.toggle('text-white', memory);
    memoryTab?.classList.toggle('text-indigo-700', !memory); memoryTab?.classList.toggle('hover:bg-indigo-50', !memory);
    if (updateUrl && workflow.module === 'translations') {
        const url = new URL(location.href);
        url.hash = memory ? 'translation-memory-pane' : '';
        history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
}
async function downloadWorkflowRelease(route, fallbackName, button) {
    if (button.disabled) return; button.disabled = true;
    const result = await apiGet(route, { download: true }); button.disabled = false;
    if (!result.success) { wfError(result.message); return; }
    const url = URL.createObjectURL(result.data), link = document.createElement('a'); link.href = url; link.download = result.filename || fallbackName;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
