import { writeFileSync } from 'node:fs';
if (process.env.TM_DEMO_ISOLATED !== '1') throw new Error('Use scripts/prepare-demo.ps1 to validate the isolated stack first.');
const base = 'http://127.0.0.1:5088', password = 'Demo@2026Admin!';
async function api(path, method = 'GET', body, token) {
    const response = await fetch(base + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text(); const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(method + ' ' + path + ': HTTP ' + response.status + ' ' + JSON.stringify(data)); return data;
}
const profiles = [
    { role: 'admin', email: 'admin.demo@tm.local', displayName: 'Admin Demo' },
    { role: 'manager', email: 'manager.demo@tm.local', displayName: 'Manager Demo' },
    { role: 'translator', email: 'translator.demo@tm.local', displayName: 'Translator Demo' },
    { role: 'reviewer', email: 'reviewer.demo@tm.local', displayName: 'Reviewer Demo' },
    { role: 'user', email: 'user.demo@tm.local', displayName: 'Người dùng Demo' }
];
const accounts = [];
for (const profile of profiles) {
    let account;
    try { account = await api('/api/auth/login', 'POST', { email: profile.email, password }); }
    catch (error) {
        if (profile.role === 'admin') throw error;
        await api('/api/auth/register', 'POST', { email: profile.email, displayName: profile.displayName, password });
        account = await api('/api/auth/login', 'POST', { email: profile.email, password });
    }
    if (profile.role === 'admin' && account.systemRole !== 'admin') throw new Error('Demo Admin has not been bootstrapped.');
    accounts.push({ ...profile, id: account.userId, token: account.token });
}
const [admin, manager, translator, reviewer] = accounts;
const mine = await api('/api/projects', 'GET', undefined, manager.token);
let project = mine.find(item => item.slug === 'translation-showcase');
if (!project) {
    const created = await api('/api/projects', 'POST', { name: 'Demo · Cổng thông tin sinh viên', slug: 'translation-showcase', sourceLocaleCode: 'vi' }, manager.token);
    project = { id: created.id };
    const path = '/api/projects/' + project.id;
    for (const localeCode of ['en', 'zh']) await api(path + '/locales', 'POST', { localeCode }, manager.token);
    for (const account of [translator, reviewer]) await api(path + '/members', 'POST', { userId: account.id, role: account.role }, manager.token);
    await api(path + '/source-versions/import', 'POST', { versionName: 'source-1.0', data: { app: { title: 'Cổng thông tin sinh viên', subtitle: 'Học tập, kết nối và phát triển' }, home: { welcome: 'Xin chào {name}', courses: 'Bạn đang học {count} môn' }, menu: { home: 'Trang chủ', profile: 'Hồ sơ', results: 'Kết quả học tập' }, actions: { save: 'Lưu thay đổi', cancel: 'Hủy', submit: 'Gửi yêu cầu' } } }, manager.token);
    const english = ['Student Portal', 'Learn, connect and grow', 'Welcome {name}', 'You are studying {count} courses', 'Home', 'Profile', 'Academic results', 'Save changes', 'Cancel', 'Submit request'];
    const chinese = ['学生门户', '学习、联系与成长', '你好 {name}', '你正在学习 {count} 门课程', '首页', '个人资料', '学习成绩', '保存更改', '取消', '提交申请'];
    const values = {
        en: { 'app.title': english[0], 'app.subtitle': english[1], 'home.welcome': english[2], 'home.courses': english[3], 'menu.home': english[4], 'menu.profile': english[5], 'menu.results': english[6], 'actions.save': english[7], 'actions.cancel': english[8], 'actions.submit': english[9] },
        zh: { 'app.title': chinese[0], 'app.subtitle': chinese[1], 'home.welcome': chinese[2], 'home.courses': chinese[3], 'menu.home': chinese[4], 'menu.profile': chinese[5], 'menu.results': chinese[6], 'actions.save': chinese[7], 'actions.cancel': chinese[8], 'actions.submit': chinese[9] }
    };
    for (const locale of ['en', 'zh']) {
        const rows = await api(path + '/translations?locale=' + locale, 'GET', undefined, manager.token);
        for (const row of rows) {
            const saved = await api(path + '/translations', 'POST', { stringId: row.stringId, localeCode: locale, value: values[locale][row.key], status: 'translated', expectedRowVersion: row.rowVersion }, translator.token);
            await api(path + '/translations/' + saved.id + '/approve', 'POST', { expectedRowVersion: saved.rowVersion }, reviewer.token);
        }
        await api(path + '/translations/assign', 'PUT', { localeCode: locale, stringIds: rows.map(row => row.stringId), userId: translator.id }, manager.token);
    }
    await api(path + '/releases', 'POST', { versionName: '1.0.0', note: 'Snapshot đã duyệt đầy đủ để demo tải JSON/ZIP.' }, manager.token);
    const current = await api(path + '/translations?locale=en', 'GET', undefined, manager.token);
    for (const [key, status] of [['app.subtitle', 'draft'], ['home.welcome', 'translated'], ['menu.profile', 'translated']]) {
        const row = current.find(item => item.key === key);
        const saved = await api(path + '/translations', 'POST', { stringId: row.stringId, localeCode: 'en', value: values.en[key], status, expectedRowVersion: row.rowVersion }, translator.token);
        if (key === 'menu.profile') await api(path + '/translations/' + saved.id + '/reject', 'POST', { expectedRowVersion: saved.rowVersion, note: 'Hãy dùng thuật ngữ Student profile trước khi gửi duyệt lại.' }, reviewer.token);
        if (key === 'home.welcome') await api(path + '/translations/' + saved.id + '/comments', 'POST', { body: 'Giữ nguyên biến {name}; bản dịch này đang chờ Reviewer kiểm tra.' }, translator.token);
    }
    const invite = await api('/api/auth/register', 'POST', { email: 'locked.demo@tm.local', displayName: 'Tài khoản khóa Demo', password });
    const locked = (await api('/api/admin/users?q=locked.demo%40tm.local', 'GET', undefined, admin.token)).items.find(item => item.id === invite.userId);
    if (locked) await api('/api/admin/users/' + locked.id, 'PUT', { displayName: locked.displayName, systemRole: 'user', isActive: false, expectedVersion: locked.securityVersion }, admin.token);
}
// These remain untranslated so the demo shows adding languages and tracking missing work.
const additionalLocales = [
    ['ja', 'Tiếng Nhật (日本語)'], ['ko', 'Tiếng Hàn (한국어)'],
    ['fr', 'Tiếng Pháp (Français)'], ['de', 'Tiếng Đức (Deutsch)'],
    ['es', 'Tiếng Tây Ban Nha (Español)'], ['pt', 'Tiếng Bồ Đào Nha (Português)'],
    ['ru', 'Tiếng Nga (Русский)'], ['th', 'Tiếng Thái (ไทย)']
];
const localePath = '/api/projects/' + project.id + '/locales';
const existingLocales = await api(localePath, 'GET', undefined, manager.token);
for (const [localeCode, name] of additionalLocales) {
    if (existingLocales.some(locale => locale.code === localeCode)) continue;
    await api(localePath, 'POST', { localeCode }, manager.token);
    await api(localePath + '/' + localeCode, 'PUT', { name }, manager.token);
    console.log('Added demo language: ' + localeCode + ' — ' + name);
}
const output = { frontend: 'http://127.0.0.1:8095', adminUrl: 'http://127.0.0.1:8095/pages/admin/index.php', projectId: project.id, password, additionalLocales: additionalLocales.map(([code, name]) => ({ code, name })), accounts: accounts.map(({ token, ...account }) => account) };
writeFileSync(new URL('../../.local/demo-accounts.json', import.meta.url), JSON.stringify(output, null, 2));
console.log('Demo ready: ' + output.frontend + '\nAdmin: ' + output.adminUrl + '\nPassword (local demo only): ' + password);
for (const account of accounts) console.log(account.role.padEnd(12) + account.email);
