/** Explicit, local-only preview data. Never substitutes for a failed API request. */
const SourceDemo = (function () {
    'use strict';
    const storageKey = 'tm_manh_preview_v1';
    const enabled = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
        && new URLSearchParams(location.search).get('demo') === '1';
    const names = { vi: 'Tiếng Việt', en: 'English', zh: '中文', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch' };
    function seed() {
        const original = {
            app: { name: 'Translation Manager', description: 'Không gian cộng tác quản lý bản dịch' },
            home: { title: 'Trang chủ', welcome: 'Xin chào {name}!', subtitle: 'Bắt đầu ngày làm việc của bạn' },
            auth: { login: 'Đăng nhập', register: 'Đăng ký', email: 'Địa chỉ email', password: 'Mật khẩu', forgot: 'Quên mật khẩu?' },
            projects: { title: 'Dự án của tôi', create: 'Tạo dự án mới', empty: 'Bạn chưa tham gia dự án nào' },
            common: { save: 'Lưu thay đổi', cancel: 'Hủy', search: 'Tìm kiếm', loading: 'Đang tải…', delete: 'Xóa', confirm: 'Xác nhận' },
            notifications: { unread: 'Bạn có {count} thông báo chưa đọc', success: 'Thao tác thành công' },
            errors: { required: '{field} là bắt buộc', network: 'Không thể kết nối tới máy chủ' },
            legacy: { banner: 'Chào mừng đến với phiên bản cũ' }
        };
        const current = JSON.parse(JSON.stringify(original));
        current.home.welcome = 'Chào mừng {name} quay trở lại!';
        current.common.save = 'Lưu';
        current.notifications.unread = 'Bạn có {count} thông báo mới';
        current.settings = { title: 'Cài đặt', language: 'Ngôn ngữ hiển thị', profile: 'Hồ sơ cá nhân' };
        delete current.legacy;
        const first = flatten(original), second = flatten(current);
        const firstKeys = Object.entries(first).map(([key, sourceText], i) => ({ id: i + 1, key, sourceText, status: 'active' }));
        const diff = compare(second, firstKeys);
        const keys = firstKeys.map(k => second[k.key] === undefined ? { ...k, status: 'deleted' } : { ...k, sourceText: second[k.key] });
        for (const [key, value] of Object.entries(second)) if (!first[key]) keys.push({ id: keys.length + 1, key, sourceText: value, status: 'active' });
        const projects = [
            { id: 1, name: 'Translation Manager', slug: 'translation-manager', sourceLocaleCode: 'vi', role: 'manager' },
            { id: 2, name: 'Ứng dụng thương mại', slug: 'commerce-app', sourceLocaleCode: 'vi', role: 'manager' }
        ];
        const makeLocales = () => [{ code: 'vi', name: names.vi, isSource: true }, { code: 'en', name: names.en, isSource: false }, { code: 'zh', name: names.zh, isSource: false }];
        return { projects, data: {
            1: { locales: makeLocales(), keys, versions: [
                { id: 2, versionName: 'source-1.1.0', importedAt: '2026-10-21T09:15:00+07:00', importedBy: 'Bùi Đình Mạnh', keyCount: Object.keys(second).length, added: 3, changed: 3, deleted: 1, changes: diff.filter(c => c.type !== 'unchanged') },
                { id: 1, versionName: 'source-1.0.0', importedAt: '2026-10-19T14:30:00+07:00', importedBy: 'Bùi Đình Mạnh', keyCount: firstKeys.length, added: firstKeys.length, changed: 0, deleted: 0, changes: firstKeys.map(k => ({ key: k.key, oldValue: null, newValue: k.sourceText, type: 'new' })) }
            ] },
            2: { locales: makeLocales().slice(0, 2), keys: [], versions: [] }
        } };
    }
    function flatten(root) {
        if (!root || Array.isArray(root) || typeof root !== 'object') throw new Error('JSON nguồn phải là object ở cấp gốc.');
        const result = Object.create(null);
        function walk(node, prefix, depth) {
            if (depth > 64) throw new Error('JSON vượt quá 64 cấp lồng nhau.');
            for (const [key, value] of Object.entries(node)) {
                if (!key.trim() || key.includes('.')) throw new Error('Tên khóa không được rỗng hoặc chứa dấu chấm: ' + (key || '(rỗng)'));
                if (key !== key.trim()) throw new Error('Tên khóa không được có khoảng trắng ở đầu hoặc cuối: ' + key);
                const path = prefix ? prefix + '.' + key : key;
                if (path.length > 500) throw new Error('Đường dẫn khóa tối đa 500 ký tự: ' + path);
                if (typeof value === 'string') {
                    if (value.length > 10000) throw new Error('Nội dung tại “' + path + '” tối đa 10000 ký tự.');
                    result[path] = value;
                }
                else if (value && !Array.isArray(value) && typeof value === 'object') {
                    if (!Object.keys(value).length) throw new Error('Object rỗng không chứa khóa dịch tại: ' + path);
                    walk(value, path, depth + 1);
                } else throw new Error('Giá trị tại “' + path + '” phải là chuỗi; không hỗ trợ mảng, số, boolean hoặc null.');
            }
        }
        walk(root, '', 0);
        if (!Object.keys(result).length) throw new Error('Tệp nguồn không có khóa dịch.');
        return result;
    }
    function compare(flat, keys) {
        const old = new Map(keys.map(k => [k.key, k]));
        const changes = Object.entries(flat).map(([key, value]) => {
            const previous = old.get(key);
            return { key, oldValue: previous ? previous.sourceText : null, newValue: value,
                type: !previous ? 'new' : previous.status === 'deleted' ? 'restored' : previous.sourceText !== value ? 'changed' : 'unchanged' };
        });
        keys.filter(k => k.status !== 'deleted' && !Object.hasOwn(flat, k.key)).forEach(k => changes.push({ key: k.key, oldValue: k.sourceText, newValue: null, type: 'deleted' }));
        return changes.sort((a, b) => a.key.localeCompare(b.key));
    }
    function read() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(storageKey));
            if (saved && saved.projects && saved.data) return saved;
        } catch (e) {}
        return seed();
    }
    let state = enabled ? read() : null;
    function persist() { try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {} }
    function projectData(id) { return state.data[id]; }
    function importVersion(id, versionName, data) {
        const project = projectData(id);
        if (project.versions.some(v => v.versionName === versionName)) return { success: false, status: 409, message: 'Tên phiên bản đã tồn tại. Hãy chọn tên khác.' };
        const flat = flatten(data), diff = compare(flat, project.keys);
        const nextId = Math.max(0, ...project.versions.map(v => v.id)) + 1;
        let keyId = Math.max(0, ...project.keys.map(k => k.id));
        for (const change of diff) {
            const old = project.keys.find(k => k.key === change.key);
            if (change.type === 'deleted') old.status = 'deleted';
            else if (old) { old.sourceText = change.newValue; old.status = 'active'; }
            else project.keys.push({ id: ++keyId, key: change.key, sourceText: change.newValue, status: 'active' });
        }
        const count = type => diff.filter(c => c.type === type).length;
        const summary = { versionId: nextId, versionName, total: Object.keys(flat).length, added: count('new'), changed: count('changed') + count('restored'), unchanged: count('unchanged'), deleted: count('deleted') };
        project.versions.unshift({ ...summary, id: nextId, keyCount: summary.total, importedAt: new Date().toISOString(), importedBy: 'Bạn (xem thử)', changes: diff.filter(c => c.type !== 'unchanged') });
        persist();
        return { success: true, status: 200, data: summary };
    }
    async function request(id, path, method, body) {
        if (!enabled) throw new Error('Chế độ xem thử chưa bật.');
        const ok = data => ({ success: true, status: 200, data: JSON.parse(JSON.stringify(data)) });
        if (path === '/api/projects') return ok(state.projects);
        const project = projectData(id);
        if (!project) return { success: false, status: 404, message: 'Không tìm thấy dự án mẫu.' };
        if (path === '/locales' && method === 'GET') return ok(project.locales);
        if (path === '/locales' && method === 'POST') {
            if (project.locales.some(l => l.code.toLowerCase() === body.localeCode.toLowerCase())) return { success: false, status: 409, message: 'Ngôn ngữ đã có trong dự án.' };
            project.locales.push({ code: body.localeCode, name: names[body.localeCode] || body.localeCode, isSource: false }); persist(); return ok({});
        }
        if (path.startsWith('/locales/') && ['PUT', 'DELETE'].includes(method)) {
            const locale = project.locales.find(l => l.code === decodeURIComponent(path.slice('/locales/'.length)));
            if (!locale || locale.isSource) return { success: false, status: 400, message: 'Không thể sửa hoặc gỡ ngôn ngữ nguồn.' };
            if (method === 'PUT') locale.name = body.name;
            else project.locales = project.locales.filter(l => l !== locale);
            persist(); return ok({});
        }
        if (path === '/translation-keys') return ok(project.keys);
        if (path === '/source-versions') return ok(project.versions.map(({ changes, ...v }) => v));
        if (path === '/source-versions/import') return importVersion(id, body.versionName, body.data);
        const match = /^\/source-versions\/(\d+)\/changes$/.exec(path);
        if (match) {
            const version = project.versions.find(v => v.id === Number(match[1]));
            return version ? ok(version.changes) : { success: false, status: 404, message: 'Không tìm thấy phiên bản.' };
        }
        return { success: false, status: 404, message: 'Không có dữ liệu xem thử cho thao tác này.' };
    }
    return { enabled, names, flatten, compare, request, reset: function () { state = seed(); persist(); } };
})();
