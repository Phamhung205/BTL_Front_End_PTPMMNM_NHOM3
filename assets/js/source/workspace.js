
/** Ngôn ngữ, phiên bản nguồn và khóa dịch; API cấp quyền cho từng dự án. */
const sourceWorkspace = { module: '', projects: [], project: null, versions: [], request: 0, diffRequest: 0, versionId: null, fileRequest: 0, readingFile: false };
const sourcePaths = { languages: 'languages', source_versions: 'source-versions', translation_keys: 'translation-keys', translations: 'translations', reviews: 'reviews', releases: 'releases', history: 'history' };

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('source-workspace');
    if (!root) return;
    sourceWorkspace.module = root.dataset.module;
    document.getElementById('source-project').addEventListener('change', event => selectSourceProject(event.target.value));
    document.getElementById('source-retry').addEventListener('click', initializeSourceWorkspace);
    document.getElementById('locale-form')?.addEventListener('submit', addSourceLocale);
    document.getElementById('source-file')?.addEventListener('change', readSourceFile);
    document.getElementById('source-import-form')?.addEventListener('submit', confirmSourceImport);
    document.getElementById('source-compare')?.addEventListener('change', loadSourceChanges);
    document.getElementById('keys-filter')?.addEventListener('submit', event => {
        event.preventDefault();
        loadSourceModule();
    });
    document.getElementById('keys-status')?.addEventListener('change', loadSourceModule);
    initializeSourceWorkspace();
});

function sourceError(message) {
    setTextContent('source-error-message', message);
    showElement('source-error');
}

function sourceProjectId() {
    return String(sourceWorkspace.project?.id ?? '');
}

function sourceManager() {
    return projectRole(sourceWorkspace.project) === 'manager';
}

function sourceRoute(name) {
    return apiEndpoint(name, sourceProjectId());
}

function sourceOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
}

async function initializeSourceWorkspace() {
    const request = ++sourceWorkspace.request;
    sourceWorkspace.project = null;
    sourceWorkspace.diffRequest++;
    hideElement('source-content');
    hideElement('source-error');
    hideElement('source-empty');
    showElement('source-loading');

    const picker = document.getElementById('source-project');
    picker.disabled = true;

    if (APP_CONFIG.mode !== 'api') {
        hideElement('source-loading');
        sourceError('Ba chức năng này sử dụng Backend thật. Hãy cấu hình APP_MODE=api để sử dụng.');
        return;
    }

    const result = await apiGet(apiEndpoint('projects'));
    if (request !== sourceWorkspace.request) return;
    hideElement('source-loading');

    const projects = result.success ? apiCollection(result.data) : null;
    if (!projects) {
        sourceError(result.message || 'Danh sách dự án không hợp lệ.');
        return;
    }

    sourceWorkspace.projects = projects;
    picker.replaceChildren();

    if (!projects.length) {
        sourceOption(picker, '', 'Chưa có dự án');
        setTextContent('source-empty', 'Bạn chưa tham gia dự án nào. Hãy tạo dự án hoặc nhờ Manager thêm bạn.');
        showElement('source-empty');
        return;
    }

    projects.forEach(project =>
        sourceOption(picker, String(project.id), project.name)
    );

    const requested = new URLSearchParams(location.search).get('project_id');

    if (requested && !projects.some(project => String(project.id) === requested)) {
        sourceOption(picker, '', 'Chọn dự án được phép xem');
        picker.value = '';
        picker.disabled = false;
        sourceError('Không tìm thấy dự án trong danh sách được phép xem. Hãy chọn dự án khác.');
        return;
    }

    picker.disabled = false;
    await selectSourceProject(requested || String(projects[0].id));
}

async function selectSourceProject(id) {
    sourceWorkspace.project =
        sourceWorkspace.projects.find(project => String(project.id) === id) || null;

    if (!sourceWorkspace.project) return;

    document.getElementById('source-project').value = id;
    const url = new URL(location.href);
    url.searchParams.set('project_id', id);
    history.replaceState(null, '', url.pathname + url.search);

    sourceWorkspace.diffRequest++;
    sourceWorkspace.fileRequest++;
    sourceWorkspace.readingFile = false;
    sourceWorkspace.versionId = null;
    sourceWorkspace.versions = [];

    document.getElementById('source-import-form')?.reset();
    document.getElementById('locale-form')?.reset();

    hideElement('source-import-result');
    hideElement('source-diff');

    setTextContent('source-permission', sourceManager()
        ? 'Manager: quản lý ngôn ngữ và nhập phiên bản nguồn.'
        : 'Bạn có quyền xem ngôn ngữ, phiên bản nguồn và khóa dịch. Manager quản lý nội dung nguồn.');

    document.querySelectorAll('[data-source-link]').forEach(link => {
        link.href = getBaseUrl()
            + 'pages/'
            + sourcePaths[link.dataset.sourceLink]
            + '/index.php?project_id='
            + encodeURIComponent(id);

        if (link.dataset.sourceLink === sourceWorkspace.module) {
            link.setAttribute('aria-current', 'page');
        }
    });

    await loadSourceModule();
}

async function loadSourceModule() {
    if (!sourceWorkspace.project) return;

    const request = ++sourceWorkspace.request;
    const module = sourceWorkspace.module;

    hideElement('source-error');
    hideElement('source-empty');
    hideElement('source-content');
    showElement('source-loading');

    const endpointName = {
        languages: 'locales',
        source_versions: 'sourceVersions',
        translation_keys: 'translationKeys'
    }[module];

    const query = module === 'translation_keys'
        ? {
            q: document.getElementById('keys-query').value.trim(),
            status: document.getElementById('keys-status').value
        }
        : null;

    const result = await apiGet(
        sourceRoute(endpointName),
        query ? { query } : {}
    );

    if (request !== sourceWorkspace.request) return;

    hideElement('source-loading');

    const rows = result.success ? apiCollection(result.data) : null;

    if (!rows) {
        sourceError(result.message || 'Dữ liệu trả về không hợp lệ.');
        return;
    }

    showElement('source-content');

    document.getElementById('locale-form')?.classList.toggle('hidden', !sourceManager());
    document.getElementById('source-import-form')?.classList.toggle('hidden', !sourceManager());

    if (module === 'languages') {
        renderSourceLocales(rows);
    } else if (module === 'source_versions') {
        sourceWorkspace.versions = rows;
        renderSourceVersions(rows);
    } else {
        renderSourceKeys(rows);
    }

    if (!rows.length) {
        setTextContent(
            'source-empty',
            module === 'languages'
                ? 'Chưa có ngôn ngữ.'
                : module === 'source_versions'
                    ? 'Chưa nhập phiên bản nguồn nào.'
                    : 'Không có khóa phù hợp với bộ lọc.'
        );
        showElement('source-empty');
    }
}

function sourceRow(bodyId, values) {
    const row = document.createElement('tr');
    values.forEach(value => appendCell(row, value));
    document.getElementById(bodyId).append(row);
    return row;
}

function renderSourceLocales(rows) {
    setTextContent(
        'locales-count',
        `${rows.length} ngôn ngữ · ${rows.filter(locale => locale.isSource).length} nguồn · ${rows.filter(locale => !locale.isSource).length} đích`
    );

    document.getElementById('locales-body').replaceChildren();

    rows.forEach(locale => {
        const actions = document.createElement('div');
        actions.className = 'flex gap-4';

        if (sourceManager() && !locale.isSource) {
            actions.append(
                actionButton('Sửa tên', () => editSourceLocale(locale)),
                actionButton('Gỡ', () => removeSourceLocale(locale), true)
            );
        } else {
            actions.textContent = locale.isSource
                ? 'Cố định theo dự án'
                : 'Chỉ xem';
        }

        sourceRow('locales-body', [
            locale.code,
            locale.name,
            locale.isSource ? 'Nguồn' : 'Đích',
            actions
        ]);
    });
}

async function addSourceLocale(event) {
    event.preventDefault();
    if (!sourceManager()) return;

    const form = event.currentTarget;
    const button = form.querySelector('button');

    if (button.disabled) return;

    const code = document.getElementById('locale-code').value.trim();

    if (code.length > 20 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code)) {
        sourceError('Mã ngôn ngữ không hợp lệ. Ví dụ: vi, en, zh, en-US; tối đa 20 ký tự.');
        return;
    }

    button.disabled = true;
    document.getElementById('source-project').disabled = true;

    const result = await apiPost(sourceRoute('locales'), {
        localeCode: code
    });

    button.disabled = false;
    document.getElementById('source-project').disabled = false;

    if (result.success) {
        form.reset();
        showToast('Đã thêm ngôn ngữ.', 'success');
        await loadSourceModule();
    } else {
        sourceError(result.status === 409
            ? 'Ngôn ngữ này đã có trong dự án.'
            : result.message);
    }
}

function editSourceLocale(locale) {
    if (!sourceManager() || locale.isSource) return;

    const form = document.createElement('form');
    form.className = 'space-y-4';

    const name = modalField(
        form,
        'locale-name',
        'Tên hiển thị trong dự án',
        locale.name
    );

    name.maxLength = 80;
    name.required = true;

    const error = modalError('locale-edit-error');
    form.append(error);

    const endpoint = sourceRoute('locales')
        + '/'
        + encodeURIComponent(locale.code);

    const submit = async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;

        if (!name.value.trim() || name.value.trim().length > 80) {
            error.textContent = 'Tên cần từ 1 đến 80 ký tự.';
            error.classList.remove('hidden');
            return;
        }

        setModalBusy(true);
        document.getElementById('source-project').disabled = true;

        const result = await apiPut(endpoint, {
            name: name.value.trim()
        });

        setModalBusy(false);
        document.getElementById('source-project').disabled = false;

        if (result.success) {
            closeModal();
            showToast('Đã cập nhật tên ngôn ngữ.', 'success');
            await loadSourceModule();
        } else {
            error.textContent = result.message;
            error.classList.remove('hidden');
        }
    };

    form.addEventListener('submit', event => {
        event.preventDefault();
        submit();
    });

    openModal('Sửa tên ngôn ngữ ' + locale.code, form, submit, {
        confirmText: 'Lưu'
    });
}

function removeSourceLocale(locale) {
    if (!sourceManager() || locale.isSource) return;

    const content = document.createElement('div');

    const note = document.createElement('p');
    note.textContent = 'Gỡ ngôn ngữ ' + locale.code
        + ' khỏi dự án? Chỉ gỡ được khi chưa có bản dịch, phân công hoặc gói phát hành.';

    const error = modalError('locale-remove-error');
    content.append(note, error);

    const endpoint = sourceRoute('locales')
        + '/'
        + encodeURIComponent(locale.code);

    openModal('Gỡ ngôn ngữ', content, async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;

        setModalBusy(true);
        document.getElementById('source-project').disabled = true;

        const result = await apiDelete(endpoint);

        setModalBusy(false);
        document.getElementById('source-project').disabled = false;

        if (result.success) {
            closeModal();
            showToast('Đã gỡ ngôn ngữ.', 'success');
            await loadSourceModule();
        } else {
            error.textContent = result.status === 409
                ? 'Ngôn ngữ đã có bản dịch, phân công hoặc gói phát hành nên không thể gỡ.'
                : result.message;
            error.classList.remove('hidden');
        }
    }, {
        confirmText: 'Gỡ ngôn ngữ',
        danger: true
    });
}

// Đọc nội dung file JSON người dùng đã chọn.
async function readSourceFile(event) {
    const request = ++sourceWorkspace.fileRequest;
    const file = event.target.files?.[0];

    if (!file) {
        sourceWorkspace.readingFile = false;
        return;
    }

    const textarea = document.getElementById('source-json');
    textarea.value = '';

    if (file.size > 2 * 1024 * 1024) {
        sourceWorkspace.readingFile = false;
        sourceError('Tệp JSON nguồn tối đa 2 MB.');
        event.target.value = '';
        return;
    }

    sourceWorkspace.readingFile = true;

    try {
        const text = await file.text();

        if (request !== sourceWorkspace.fileRequest) return;

        textarea.value = text.replace(/^\uFEFF/, '');
        hideElement('source-error');
    } catch (_) {
        if (request === sourceWorkspace.fileRequest) {
            sourceError('Không đọc được tệp JSON. Hãy thử lại.');
        }
    } finally {
        if (request === sourceWorkspace.fileRequest) {
            sourceWorkspace.readingFile = false;
        }
    }
}

// SỬA LỖI: Chấp nhận khóa có dấu chấm và object lồng nhau.
function validateSourceJson(rawJson) {
    if (new TextEncoder().encode(rawJson).length > 2 * 1024 * 1024) {
        throw new Error('JSON nguồn tối đa 2 MB.');
    }

    let data;

    try {
        data = JSON.parse(rawJson);
    } catch (_) {
        throw new Error(
            'JSON sai cú pháp. Hãy kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép.'
        );
    }

    let count = 0;
    const paths = new Set();

    const walk = (node, path, depth) => {
        if (depth > 64) {
            throw new Error('JSON vượt quá độ sâu 64 cấp.');
        }

        if (typeof node === 'string' && path) {
            if (node.length > 10000) {
                throw new Error('Mỗi nội dung nguồn tối đa 10000 ký tự.');
            }

            if (paths.has(path)) {
                throw new Error('Khóa dịch bị trùng đường dẫn: ' + path);
            }

            paths.add(path);
            count++;
            return;
        }

        if (!node ||
            typeof node !== 'object' ||
            Array.isArray(node) ||
            !Object.keys(node).length) {
            throw new Error(
                'Nguồn phải là object lồng nhau với giá trị chuỗi, không chứa object rỗng hoặc mảng.'
            );
        }

        Object.entries(node).forEach(([key, value]) => {
            // Hỗ trợ:
            // {"home.title": "Trang chủ"}
            // {"home": {"title": "Trang chủ"}}
            if (key.split('.').some(segment =>
                !segment || segment !== segment.trim()
            )) {
                throw new Error(
                    'Tên khóa không được có đoạn rỗng hoặc khoảng trắng đầu/cuối (ví dụ: home.title).'
                );
            }

            const next = path ? path + '.' + key : key;

            if (next.length > 500) {
                throw new Error('Đường dẫn khóa JSON tối đa 500 ký tự.');
            }

            walk(value, next, depth + 1);
        });
    };

    walk(data, '', 1);

    // Phát hiện xung đột giữa khóa cha và khóa con.
    for (const path of paths) {
        for (
            let dot = path.indexOf('.');
            dot !== -1;
            dot = path.indexOf('.', dot + 1)
        ) {
            const parent = path.slice(0, dot);

            if (paths.has(parent)) {
                throw new Error(
                    'Khóa dịch xung đột: "' + parent +
                    '" vừa là chuỗi vừa là nhóm của "' + path + '".'
                );
            }
        }
    }

    return count;
}

function confirmSourceImport(event) {
    event.preventDefault();

    if (!sourceManager()) return;

    if (sourceWorkspace.readingFile) {
        sourceError('Đang đọc tệp. Hãy chờ nội dung xuất hiện rồi nhập nguồn.');
        return;
    }

    const versionName = document
        .getElementById('source-version-name')
        .value.trim();

    const rawJson = document.getElementById('source-json').value;
    let count;

    try {
        if (!versionName || versionName.length > 120) {
            throw new Error('Tên phiên bản cần từ 1 đến 120 ký tự.');
        }

        count = validateSourceJson(rawJson);
    } catch (error) {
        sourceError(error.message);
        return;
    }

    const content = document.createElement('div');
    content.className = 'space-y-4';

    const note = document.createElement('p');
    note.textContent = 'Nhập phiên bản “' + versionName +
        '” với ' + count + ' khóa vào ' +
        sourceWorkspace.project.name +
        '? Khóa cũ vắng mặt sẽ được đánh dấu đã xóa. Nguồn thay đổi sẽ yêu cầu xem lại bản dịch liên quan.';

    const error = modalError('source-import-error');
    content.append(note, error);

    const endpoint = sourceRoute('sourceVersions') + '/import';

    openModal('Xác nhận nhập toàn bộ nguồn', content, async () => {
        if (document.getElementById('modal-confirm-btn').disabled) return;

        setModalBusy(true);
        document.getElementById('source-project').disabled = true;

        const result = await apiPost(endpoint, {
            versionName,
            rawJson
        });

        setModalBusy(false);
        document.getElementById('source-project').disabled = false;

        if (!result.success) {
            error.textContent = result.message ||
                (result.status === 409
                    ? 'Tên phiên bản đã tồn tại. Hãy chọn tên khác.'
                    : 'Không nhập được nguồn. Hãy kiểm tra cấu trúc JSON và thử lại.');

            error.classList.remove('hidden');
            return;
        }

        closeModal();

        document.getElementById('source-version-name').value = '';

        const summary = result.data;

        setTextContent(
            'source-import-result',
            'Đã nhập ' + summary.total + ' khóa: ' +
            summary.added + ' mới, ' +
            summary.changed + ' thay đổi/khôi phục, ' +
            summary.deleted + ' đã xóa, ' +
            summary.unchanged + ' giữ nguyên.'
        );

        showElement('source-import-result');
        hideElement('source-diff');

        showToast('Nhập nguồn thành công.', 'success');
        await loadSourceModule();
    }, {
        confirmText: 'Nhập nguồn',
        busyText: 'Đang nhập...'
    });
}

function renderSourceVersions(rows) {
    document.getElementById('versions-body').replaceChildren();

    rows.forEach(version => sourceRow('versions-body', [
        version.versionName,
        version.importedBy + ' / ' + formatDate(version.importedAt),
        version.keyCount,
        '+' + version.added + ' mới / ' +
            version.changed + ' sửa / ' +
            version.deleted + ' xóa',
        actionButton('Xem thay đổi', () => openSourceChanges(version))
    ]));
}

async function openSourceChanges(version) {
    sourceWorkspace.versionId = String(version.id);

    setTextContent('source-diff-title', 'Thay đổi của ' + version.versionName);

    const select = document.getElementById('source-compare');
    select.replaceChildren();

    sourceOption(select, '', 'Lần nhập trước (bao gồm khóa khôi phục)');

    sourceWorkspace.versions
        .filter(item => item.id !== version.id)
        .forEach(item => sourceOption(
            select,
            String(item.id),
            item.versionName
        ));

    showElement('source-diff');
    await loadSourceChanges();
}

async function loadSourceChanges() {
    if (!sourceWorkspace.versionId || !sourceWorkspace.project) return;

    const request = ++sourceWorkspace.diffRequest;

    document.getElementById('changes-body').replaceChildren();
    setTextContent('source-diff-status', 'Đang tải thay đổi...');

    const base = document.getElementById('source-compare').value;

    const result = await apiGet(
        sourceRoute('sourceVersions') +
        '/' +
        encodeURIComponent(sourceWorkspace.versionId) +
        '/changes',
        base ? { query: { compareToVersionId: base } } : {}
    );

    if (request !== sourceWorkspace.diffRequest) return;

    const rows = result.success ? apiCollection(result.data) : null;

    if (!rows) {
        setTextContent(
            'source-diff-status',
            result.message || 'Dữ liệu so sánh không hợp lệ.'
        );
        return;
    }

    setTextContent(
        'source-diff-status',
        rows.length
            ? rows.length + ' khóa thay đổi.'
            : 'Không có thay đổi giữa hai phiên bản.'
    );

    const labels = {
        new: 'Mới',
        changed: 'Thay đổi',
        deleted: 'Đã xóa',
        restored: 'Khôi phục'
    };

    rows.forEach(change => sourceRow('changes-body', [
        labels[change.type] || change.type,
        change.key,
        change.oldValue ?? '—',
        change.newValue ?? '—'
    ]));
}

function renderSourceKeys(rows) {
    document.getElementById('keys-body').replaceChildren();

    setTextContent('keys-count', rows.length + ' khóa phù hợp.');

    rows.forEach(key => sourceRow('keys-body', [
        key.key,
        key.sourceText,
        key.status === 'deleted' ? 'Đã xóa' : 'Đang dùng',
        formatDate(key.updatedAt)
    ]));
}
