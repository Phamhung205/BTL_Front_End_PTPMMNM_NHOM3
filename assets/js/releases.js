/**
 * Release / Download - Translation Manager (module Phạm Thế Đức)
 * Kiểm tra điều kiện phát hành, chốt snapshot, tải file JSON từng ngôn ngữ hoặc cả gói .zip.
 */
(function () {
    const $ = function (id) { return document.getElementById(id); };
    const el = TM.el;

    // Cùng quy tắc với ReleaseService.VersionRegex của Backend.
    const VERSION_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,58}[A-Za-z0-9])?$/;

    const state = {
        projects: [],
        project: null,
        role: '',
        validation: null,
        releases: [],
        publishing: false,
        preview: null
    };

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        $('rl-project').addEventListener('change', function () {
            const project = state.projects.find(function (p) { return String(p.id) === $('rl-project').value; });
            if (project) selectProject(project);
        });
        $('rl-refresh').addEventListener('click', reload);
        $('rl-form').addEventListener('submit', function (e) { e.preventDefault(); confirmPublish(); });
        $('rl-version').addEventListener('input', function () { TM.show('rl-version-error', false); });
        $('rl-preview-close').addEventListener('click', closePreview);
        $('rl-preview-backdrop').addEventListener('click', closePreview);
        $('rl-preview-download').addEventListener('click', function () {
            if (state.preview) downloadFile(state.preview.release, state.preview.file);
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePreview(); });

        const picked = await TM.initProjectPicker($('rl-project'));
        if (picked.error) return showError(picked.error);
        state.projects = picked.projects;
        if (!picked.project) {
            $('rl-summary').textContent = 'Bạn chưa tham gia dự án nào.';
            return;
        }
        await selectProject(picked.project);
    }

    function api(path) {
        return '/api/projects/' + encodeURIComponent(state.project.id) + path;
    }

    function isManager() {
        return state.role === 'manager';
    }

    function showError(message) {
        $('rl-error').textContent = message || '';
        TM.show('rl-error', !!message);
    }

    async function selectProject(project) {
        state.project = project;
        state.role = String(project.role || '').toLowerCase();
        TM.rememberProject(project.id);
        $('rl-version').value = '';
        $('rl-note').value = '';
        await reload();
    }

    async function reload() {
        if (!state.project) return;
        showError(null);
        await Promise.all([loadValidation(), loadReleases()]);
    }

    // ===================== Kiểm tra điều kiện =====================

    async function loadValidation() {
        $('rl-summary').textContent = 'Đang kiểm tra...';
        const result = await apiGet(api('/releases/validate'));
        if (!result.success) {
            state.validation = null;
            $('rl-summary').textContent = TM.errorMessage(result, 'Không kiểm tra được điều kiện phát hành.');
            $('rl-locales').textContent = '';
            renderPublishState();
            return;
        }
        state.validation = result.data;
        renderValidation(result.data);
    }

    function renderValidation(v) {
        const badge = $('rl-ready-badge');
        badge.textContent = '';
        badge.appendChild(el('span', {
            class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ' + (v.ready ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'),
            text: v.ready ? '✓ Sẵn sàng phát hành' : 'Chưa đủ điều kiện'
        }));

        $('rl-summary').textContent = v.activeStrings + ' khóa nguồn đang hoạt động'
            + (v.latestSourceVersionName ? ' · Phiên bản nguồn mới nhất: ' + v.latestSourceVersionName : ' · Chưa import phiên bản nguồn');

        const box = $('rl-locales');
        box.textContent = '';
        (v.locales || []).forEach(function (l) {
            const pct = l.total ? Math.round(l.approved * 100 / l.total) : 0;
            const done = l.total > 0 && l.approved === l.total;
            box.appendChild(el('div', null, [
                el('div', { class: 'flex items-center justify-between text-sm mb-1' }, [
                    el('span', { class: 'font-medium text-gray-800' }, [
                        el('span', { class: 'font-mono', text: l.localeCode }),
                        l.localeName && l.localeName !== l.localeCode ? el('span', { class: 'text-gray-500 font-normal', text: ' — ' + l.localeName }) : null
                    ]),
                    el('span', { class: done ? 'text-green-700 font-medium' : 'text-gray-600', text: l.approved + '/' + l.total + ' đã duyệt (' + pct + '%)' })
                ]),
                el('div', { class: 'w-full h-2 bg-gray-100 rounded-full overflow-hidden' }, [
                    el('div', { class: 'h-2 rounded-full ' + (done ? 'bg-green-500' : 'bg-indigo-500'), style: 'width: ' + pct + '%' })
                ]),
                el('div', { class: 'flex flex-wrap gap-3 mt-1 text-xs text-gray-500' }, [
                    'Chưa dịch: ' + l.missing, 'Nháp: ' + l.draft, 'Chờ duyệt: ' + l.translated, 'Cần sửa: ' + l.needsReview
                ].map(function (t) { return el('span', { text: t }); }).concat([
                    done ? null : el('a', {
                        class: 'text-indigo-600 hover:text-indigo-800',
                        href: '../translations/index.php?project_id=' + encodeURIComponent(state.project.id) + '&locale=' + encodeURIComponent(l.localeCode),
                        text: 'Đến trang dịch →'
                    })
                ]))
            ]));
        });

        const problems = $('rl-problems');
        problems.textContent = '';
        (v.problems || []).forEach(function (p) { problems.appendChild(el('li', { text: p })); });
        TM.show('rl-problems', (v.problems || []).length > 0);
        renderPublishState();
    }

    function renderPublishState() {
        const ready = !!(state.validation && state.validation.ready);
        const button = $('rl-publish');
        button.disabled = !isManager() || !ready || state.publishing;
        button.textContent = state.publishing ? 'Đang phát hành...' : 'Chốt & phát hành';
        $('rl-version').disabled = !isManager();
        $('rl-note').disabled = !isManager();

        let hint = '';
        if (!isManager()) hint = 'Chỉ Manager của dự án được chốt phát hành. Bạn vẫn có thể tải các bản đã phát hành.';
        else if (!ready) hint = 'Cần duyệt đủ bản dịch cho mọi ngôn ngữ đích trước khi phát hành.';
        $('rl-publish-hint').textContent = hint;
    }

    // ===================== Chốt phát hành =====================

    function suggestNextVersion() {
        const latest = state.releases[0] && state.releases[0].version;
        if (!latest) return '1.0.0';
        const m = /^(v?)(\d+)\.(\d+)\.(\d+)$/.exec(latest);
        return m ? m[1] + m[2] + '.' + m[3] + '.' + (Number(m[4]) + 1) : '';
    }

    function confirmPublish() {
        if (!isManager() || state.publishing) return;
        const version = $('rl-version').value.trim();
        const error = $('rl-version-error');
        if (!version) {
            error.textContent = 'Nhập tên phiên bản (ví dụ 1.0.0).';
            return TM.show('rl-version-error', true);
        }
        if (!VERSION_RE.test(version)) {
            error.textContent = 'Chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới; không bắt đầu/kết thúc bằng ký tự đặc biệt.';
            return TM.show('rl-version-error', true);
        }
        if (state.releases.some(function (r) { return r.version === version; })) {
            error.textContent = 'Phiên bản này đã được phát hành, hãy đặt tên khác.';
            return TM.show('rl-version-error', true);
        }

        const locales = (state.validation && state.validation.locales || []).map(function (l) { return l.localeCode; }).join(', ');
        showConfirmDialog(
            'Phát hành phiên bản ' + version + '?',
            'Hệ thống sẽ chốt snapshot cho ngôn ngữ nguồn và ' + (locales || 'các ngôn ngữ đích') + '. Sau khi chốt, nội dung gói không thay đổi.',
            function () { publish(version); });
    }

    async function publish(version) {
        state.publishing = true;
        renderPublishState();
        const result = await apiPost(api('/releases'), { versionName: version, note: $('rl-note').value.trim() || null });
        state.publishing = false;

        if (result.success) {
            showToast('Đã phát hành phiên bản ' + result.data.version + ' (' + result.data.files.length + ' file)', 'success');
            $('rl-version').value = '';
            $('rl-note').value = '';
            await reload();
            return;
        }

        renderPublishState();
        const details = result.data && result.data.details;
        if (result.status === 400 && details && Array.isArray(details.problems)) {
            renderValidation(details);
            showToast(result.message || 'Chưa đủ điều kiện phát hành.', 'warning');
        } else if (result.status === 409) {
            $('rl-version-error').textContent = result.message;
            TM.show('rl-version-error', true);
            loadReleases();
        } else {
            showToast(TM.errorMessage(result, 'Không phát hành được.'), 'error');
        }
    }

    // ===================== Danh sách bản phát hành =====================

    async function loadReleases() {
        const result = await apiGet(api('/releases'));
        if (!result.success) {
            state.releases = [];
            showError(TM.errorMessage(result, 'Không tải được danh sách bản phát hành.'));
        } else {
            state.releases = TM.listFrom(result.data);
        }
        renderReleases();
        if (isManager() && !$('rl-version').value) $('rl-version').placeholder = suggestNextVersion() || '1.0.0';
    }

    function renderReleases() {
        const body = $('rl-releases-body');
        body.textContent = '';
        $('rl-release-count').textContent = state.releases.length ? state.releases.length + ' bản' : '';
        TM.show('rl-releases-empty', state.releases.length === 0);
        TM.show('rl-releases-table', state.releases.length > 0);

        state.releases.forEach(function (release) {
            const files = el('div', { class: 'flex flex-wrap gap-1.5' });
            release.files.forEach(function (file) {
                files.appendChild(el('span', { class: 'inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs' }, [
                    el('button', {
                        type: 'button',
                        class: 'px-2 py-1 font-mono ' + (file.isSource ? 'bg-gray-100 text-gray-700' : 'bg-white text-indigo-700') + ' hover:bg-indigo-50',
                        title: 'Xem trước · SHA-256 ' + file.sha256,
                        text: file.fileName,
                        onclick: function () { openPreview(release, file); }
                    }),
                    el('button', {
                        type: 'button',
                        class: 'px-1.5 py-1 border-l border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700',
                        title: 'Tải ' + file.fileName,
                        text: '↓',
                        onclick: function () { downloadFile(release, file); }
                    })
                ]));
            });

            body.appendChild(el('tr', { class: 'hover:bg-gray-50 align-top' }, [
                el('td', { class: 'px-5 py-4' }, [
                    el('div', { class: 'text-sm font-semibold font-mono text-gray-900', text: release.version }),
                    release.note ? el('div', { class: 'text-xs text-gray-500 mt-0.5 max-w-xs break-words', text: release.note }) : null
                ]),
                el('td', { class: 'px-5 py-4 text-sm text-gray-600 whitespace-nowrap' }, [
                    el('div', { text: TM.formatDateTime(release.publishedAt) }),
                    el('div', { class: 'text-xs text-gray-400', text: release.publishedByName })
                ]),
                el('td', { class: 'px-5 py-4 text-sm text-gray-600 font-mono whitespace-nowrap', text: release.sourceVersionName || '--' }),
                el('td', { class: 'px-5 py-4 text-sm text-gray-600', text: String(release.keyCount) }),
                el('td', { class: 'px-5 py-4' }, files),
                el('td', { class: 'px-5 py-4 whitespace-nowrap' }, [
                    el('button', {
                        type: 'button',
                        class: 'inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg',
                        text: 'Tải .zip',
                        onclick: function () { downloadZip(release); }
                    })
                ])
            ]));
        });
    }

    // ===================== Tải / xem trước =====================

    async function downloadFile(release, file) {
        const result = await apiDownload(api('/releases/' + release.id + '/files/' + encodeURIComponent(file.localeCode)), file.fileName);
        if (!result.success) return showToast(TM.errorMessage(result, 'Không tải được file.'), 'error');
        showToast('Đã tải ' + result.fileName, 'success');
    }

    async function downloadZip(release) {
        const result = await apiDownload(api('/releases/' + release.id + '/download'), (state.project.slug || 'release') + '-' + release.version + '.zip');
        if (!result.success) return showToast(TM.errorMessage(result, 'Không tải được gói.'), 'error');
        showToast('Đã tải ' + result.fileName, 'success');
    }

    async function openPreview(release, file) {
        state.preview = { release: release, file: file };
        $('rl-preview-title').textContent = release.version + ' / ' + file.fileName;
        $('rl-preview-meta').textContent = file.keyCount + ' khóa · ' + TM.formatBytes(file.sizeBytes) + ' · SHA-256 ' + file.sha256;
        $('rl-preview-content').textContent = 'Đang tải...';
        TM.show('rl-preview-backdrop', true);
        TM.show('rl-preview', true);

        const result = await apiFetchRaw(api('/releases/' + release.id + '/files/' + encodeURIComponent(file.localeCode)));
        if (!state.preview || state.preview.file !== file) return;
        $('rl-preview-content').textContent = result.success ? await result.response.text() : TM.errorMessage(result, 'Không tải được nội dung.');
    }

    function closePreview() {
        state.preview = null;
        TM.show('rl-preview-backdrop', false);
        TM.show('rl-preview', false);
    }
})();
