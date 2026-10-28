import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Chỉ chạy với bộ dịch vụ local của start-integrated.ps1 (MariaDB riêng tại 3307).
const backend = process.env.API_BASE_URL || 'http://127.0.0.1:5088';
const frontend = process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:8095';
let count = 0;
function check(value, label) { assert.ok(value, label); count++; console.log('PASS ' + label); }
async function api(path, method = 'GET', body, token) {
    const response = await fetch(backend + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null, headers: response.headers };
}
const suffix = randomBytes(8).toString('hex');
const accounts = [];
for (const name of ['Manager A', 'Manager B', 'Translator', 'Reviewer', 'Outsider']) {
    const body = { displayName: name, email: name.replaceAll(' ', '.').toLowerCase() + '.' + suffix + '@example.com', password: randomBytes(20).toString('base64url') };
    const result = await api('/api/auth/register', 'POST', body);
    check(result.status === 200 && result.data.displayName === name && Boolean(result.data.token), 'Đăng ký Backend: ' + name);
    accounts.push({ ...body, id: result.data.userId, token: result.data.token });
}
const [a, b, translator, reviewer, outsider] = accounts;
check((await api('/health')).status === 200, 'Backend kết nối MariaDB thật');
check((await api('/api/auth/register', 'POST', a)).status === 409, 'Email trùng trả 409');
check((await api('/api/auth/login', 'POST', { email: a.email, password: 'wrong-password' })).status === 401, 'Sai mật khẩu trả 401');
check((await api('/api/auth/login', 'POST', a)).status === 200, 'Đăng nhập với mật khẩu đúng');
check((await api('/api/projects')).status === 401, 'Backend chặn request không có JWT');
check((await api('/api/projects', 'GET', undefined, 'invalid.jwt.token')).status === 401, 'Backend chặn JWT giả');
const jwtSettings = JSON.parse(readFileSync(new URL('../backend/TranslationManager.Backend/appsettings.json', import.meta.url), 'utf8')).Jwt;
const runtimeKey = (process.env.TM_TEST_JWT_KEY || readFileSync(new URL('../.local/backend-jwt.key', import.meta.url), 'utf8').trim());
function signedToken(claims) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const content = header + '.' + payload;
    return content + '.' + createHmac('sha256', runtimeKey).update(content).digest('base64url');
}
const claims = { iss: jwtSettings.Issuer, aud: jwtSettings.Audience, sub: String(a.id), exp: Math.floor(Date.now() / 1000) + 3600 };
check((await api('/api/projects', 'GET', undefined, signedToken({ ...claims, exp: claims.exp - 7200 }))).status === 401, 'Backend chặn JWT hết hạn có chữ ký hợp lệ');
check((await api('/api/projects', 'GET', undefined, signedToken({ ...claims, iss: 'wrong-issuer' }))).status === 401, 'Backend chặn JWT sai issuer có chữ ký hợp lệ');
check((await api('/api/projects', 'POST', { name: 'Missing locale', slug: 'missing-' + suffix }, a.token)).status === 400, 'Tạo dự án bắt buộc ngôn ngữ nguồn');
const created = await api('/api/projects', 'POST', { name: 'Integration project', slug: 'integration-' + suffix, sourceLocaleCode: 'en' }, a.token);
check(created.status === 201, 'Tạo dự án với sourceLocaleCode');
const projectPath = '/api/projects/' + created.data.id;
const membersPath = projectPath + '/members';
check((await api('/api/projects', 'GET', undefined, a.token)).data.some(p => p.id === created.data.id && p.role === 'manager' && p.sourceLocaleCode === 'en'), 'Người tạo dự án nhận Manager đúng hợp đồng Backend');
check((await api(membersPath, 'POST', { email: translator.email, role: 'translator' }, a.token)).status === 201, 'Manager thêm thành viên bằng email');
check((await api(membersPath, 'POST', { userId: reviewer.id, role: 'reviewer' }, a.token)).status === 201, 'Vẫn hỗ trợ thêm thành viên bằng userId');
check((await api(membersPath, 'POST', { email: translator.email, role: 'manager' }, a.token)).status === 409, 'Thêm trùng không âm thầm đổi vai trò');
check((await api(membersPath, 'POST', { email: 'missing.' + suffix + '@example.com', role: 'reviewer' }, a.token)).status === 404, 'Email chưa đăng ký trả 404');
check((await api(membersPath, 'GET', undefined, a.token)).data.some(m => m.userId === translator.id && m.displayName === translator.displayName && m.role === 'translator'), 'Danh sách thành viên trả userId/displayName đúng');
for (const account of [translator, reviewer, outsider]) {
    check((await api(projectPath, 'PUT', { name: 'Forbidden', slug: 'forbidden' }, account.token)).status === 403, account.displayName + ' bị chặn sửa dự án');
    check((await api(projectPath, 'DELETE', undefined, account.token)).status === 403, account.displayName + ' bị chặn xóa dự án');
    check((await api(membersPath, 'POST', { email: outsider.email, role: 'manager' }, account.token)).status === 403, account.displayName + ' bị chặn thêm thành viên');
    check((await api(membersPath + '/' + translator.id, 'PUT', { role: 'manager' }, account.token)).status === 403, account.displayName + ' bị chặn đổi vai trò');
    check((await api(membersPath + '/' + reviewer.id, 'DELETE', undefined, account.token)).status === 403, account.displayName + ' bị chặn xóa thành viên');
}
check((await api(membersPath, 'GET', undefined, outsider.token)).status === 403, 'Người ngoài dự án không xem được thành viên');
check(!(await api('/api/projects', 'GET', undefined, outsider.token)).data.some(p => p.id === created.data.id), 'Người ngoài không thấy dự án trong danh sách');
check((await api(projectPath, 'PUT', { name: 'Updated integration', slug: 'updated-' + suffix }, a.token)).status === 204, 'Manager sửa dự án');
check((await api(membersPath + '/' + translator.id, 'PUT', { role: 'reviewer' }, a.token)).status === 204, 'Manager đổi vai trò thành viên');
check((await api(membersPath + '/' + translator.id, 'PUT', { role: 'owner' }, a.token)).status === 400, 'Không có vai trò Owner trong Backend');
check((await api(membersPath + '/' + a.id, 'PUT', { role: 'translator' }, a.token)).status === 409, 'Không hạ quyền Manager cuối cùng');
check((await api(membersPath + '/' + a.id, 'DELETE', undefined, a.token)).status === 409, 'Không xóa Manager cuối cùng');
check((await api(membersPath + '/' + reviewer.id, 'DELETE', undefined, a.token)).status === 204, 'Manager xóa thành viên');
check((await api(membersPath, 'GET', undefined, reviewer.token)).status === 403, 'Xóa thành viên thu hồi quyền ngay dù JWT còn hạn');
check((await api(membersPath, 'POST', { email: b.email, role: 'manager' }, a.token)).status === 201, 'Manager cấp vai trò Manager cho người khác');
const race = await Promise.all([
    api(membersPath + '/' + a.id, 'PUT', { role: 'translator' }, a.token),
    api(membersPath + '/' + b.id, 'PUT', { role: 'reviewer' }, b.token),
]);
check(race.filter(r => r.status === 204).length === 1 && race.filter(r => r.status === 409).length === 1, 'Hai Manager cùng hạ quyền vẫn giữ ít nhất một Manager');
const remainingManager = (await api(membersPath, 'GET', undefined, a.token)).data.find(m => m.role === 'manager');
const manager = remainingManager.userId === a.id ? a : b;
const demoted = manager === a ? b : a;
check((await api(projectPath, 'PUT', { name: 'Forbidden', slug: 'forbidden' }, demoted.token)).status === 403, 'Manager bị hạ quyền mất quyền sửa ngay');
check((await api(projectPath + '/source-versions/import', 'POST', { versionName: 'qa-v1', data: { greeting: 'Hello {name}' } }, manager.token)).status === 200, 'Tạo dữ liệu nguồn để kiểm tra xóa có khóa ngoại RESTRICT');
check((await api(projectPath, 'DELETE', undefined, manager.token)).status === 204, 'Xóa dự án có source version/string thành công');
check((await api(projectPath, 'DELETE', undefined, manager.token)).status === 404, 'Dự án đã xóa trả 404');
const cors = await fetch(backend + '/api/projects', { method: 'OPTIONS', headers: { Origin: frontend, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
check(cors.status === 204 && cors.headers.get('access-control-allow-origin') === frontend, 'CORS cho phép origin Frontend đã cấu hình');

class WebClient {
    cookie = ''; csrf = '';
    async request(path, options = {}) {
        const response = await fetch(frontend + path, { ...options, redirect: 'manual', headers: { ...options.headers, ...(this.cookie ? { Cookie: this.cookie } : {}) } });
        for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith('tm_frontend_session=')) this.cookie = cookie.split(';')[0];
        const text = await response.text();
        return { status: response.status, text, headers: response.headers };
    }
    async open() {
        const page = await this.request('/login.php');
        const config = JSON.parse(page.text.match(/window\.APP_CONFIG = (.*);<\/script>/)[1]);
        this.csrf = config.csrfToken;
        return { ...page, config };
    }
    async api(endpoint, method = 'GET', body, csrf = this.csrf) {
        const response = await this.request('/gateway.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Origin: frontend }, body: JSON.stringify({ endpoint, method, ...(body === undefined ? {} : { body }) }) });
        return { ...response, data: response.text ? JSON.parse(response.text) : null };
    }
}
const web = new WebClient();
const page = await web.open();
check(page.config.mode === 'api' && page.config.gateway && !page.text.includes('src="assets/js/local.js"'), 'Frontend chạy API mode, không tải bộ mô phỏng local');
check(page.headers.getSetCookie().some(c => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)), 'Cookie phiên Frontend có HttpOnly và SameSite');
check((await web.api('/api/projects')).status === 401, 'Proxy chặn phiên chưa đăng nhập');
check((await web.api('/api/auth/login', 'POST', a, 'wrong-csrf')).status === 403, 'Proxy chặn CSRF sai');
check((await web.api('http://external.example/api/projects')).status === 400, 'Proxy không cho chuyển request tới URL tùy ý');
const beforeLoginCookie = web.cookie;
const proxiedLogin = await web.api('/api/auth/login', 'POST', a);
check(proxiedLogin.status === 200 && proxiedLogin.data.displayName === a.displayName, 'Đăng nhập qua Frontend proxy với Backend thật');
check(!Object.hasOwn(proxiedLogin.data, 'token') && !proxiedLogin.text.includes(a.token), 'Proxy không trả JWT về JavaScript');
check(web.cookie !== beforeLoginCookie, 'Đổi session ID khi đăng nhập');
check((await web.api('/api/projects')).status === 200, 'Phiên PHP gửi JWT hợp lệ tới Backend');
await web.open();
check((await web.api('/api/projects')).status === 200, 'Đăng nhập vẫn hoạt động sau khi tải lại trang');
const proxyProject = await web.api('/api/projects', 'POST', { name: 'Proxy QA project', slug: 'proxy-' + suffix, sourceLocaleCode: 'vi' });
check(proxyProject.status === 201, 'Tạo dự án từ Frontend proxy');
const proxyPath = '/api/projects/' + proxyProject.data.id;
check((await web.api(proxyPath + '/members/' + a.id, 'DELETE')).data.code === 'last_manager', 'Proxy giữ mã lỗi bảo vệ Manager cuối cùng');
check((await web.api(proxyPath, 'PUT', { name: 'Proxy QA updated', slug: 'proxy-updated-' + suffix })).status === 204, 'Sửa dự án qua proxy');
check((await web.api(proxyPath + '/members', 'POST', { email: translator.email, role: 'translator' })).status === 201, 'Thêm thành viên bằng email qua proxy');
check((await web.api(proxyPath + '/members/' + translator.id, 'PUT', { role: 'reviewer' })).status === 204, 'Đổi vai trò qua proxy');
check((await web.api(proxyPath + '/members/' + translator.id, 'DELETE')).status === 204, 'Xóa thành viên qua proxy');
check((await web.api(proxyPath, 'DELETE')).status === 204, 'Xóa dự án qua proxy');
check((await web.api('/api/auth/logout', 'POST', {})).status === 204, 'Đăng xuất kết thúc phiên PHP');
await web.open();
check((await web.api('/api/projects')).status === 401, 'Sau đăng xuất không dùng lại được phiên Frontend');
for (const path of ['/.env.local', '/.local/backend-jwt.key', '/backend/TranslationManager.Backend/appsettings.json', '/config/session.php', '/tests/integration.mjs']) {
    check((await web.request(path)).status === 404, 'Không công khai file nội bộ ' + path);
}
console.log('Completed ' + count + ' integration checks.');
