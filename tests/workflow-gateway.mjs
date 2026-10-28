import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

// Isolated HTTP server exercises PHP sessions, route allowlists, errors and binary transport.
const root = fileURLToPath(new URL('../', import.meta.url));
let received, errorResponse = false, count = 0;
const zip = Buffer.from([0x50, 0x4b, 3, 4, 0, 255, 128, 13, 10]);
const backend = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    received = { url: req.url, method: req.method, body: body ? JSON.parse(body) : null, authorization: req.headers.authorization };
    if (errorResponse) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Bản dịch đã thay đổi.', token: 'private', details: { currentRowVersion: 8, currentValue: '最新 {name}', currentStatus: 'translated', debug: 'private', exception: 'private' } })); return;
    }
    if (req.url.endsWith('/download')) { res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="demo-1.0.zip"' }); res.end(zip); return; }
    if (req.url.endsWith('/files/en')) { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="en.json"', 'X-Content-SHA256': 'a'.repeat(64) }); res.end('{"hi":"Hello {name}"}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(req.url === '/api/auth/login' ? { token: 'private-jwt', userId: 1 } : []));
});
backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
const reserve = createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening'); const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const php = spawn(process.env.PHP_PATH || 'C:/xampp/php/php.exe', ['-S', `127.0.0.1:${port}`, '-t', root, root + 'router.php'], { cwd: root, windowsHide: true, env: { ...process.env, APP_MODE: 'api', API_BASE_URL: `http://127.0.0.1:${backend.address().port}` }, stdio: 'pipe' });
let logs = '', cookie = '', csrf = ''; php.stderr.on('data', data => logs += data);
async function request(path, options = {}) {
    const res = await fetch(origin + path, { ...options, headers: { ...options.headers, Cookie: cookie } });
    for (const value of res.headers.getSetCookie()) if (value.startsWith('tm_frontend_session=')) cookie = value.split(';')[0];
    return res;
}
const call = (endpoint, method = 'GET', body, query, csrfToken = csrf) => request('/gateway.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Origin: origin }, body: JSON.stringify({ endpoint, method, ...(body === undefined ? {} : { body }), ...(query ? { query } : {}) }) });
function check(value, label) { assert.ok(value, label); count++; console.log('PASS ' + label); }
try {
    for (let i = 0; i < 60; i++) { try { await request('/login.php'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
    for (const page of ['translations', 'reviews', 'releases', 'history']) {
        const res = await request(`/pages/${page}/index.php?project_id=1`), html = await res.text();
        check(res.status === 200 && html.includes(`data-module="${page}"`), 'PHP renders ' + page);
        check(html.includes('pages/releases/index.php?project_id=1'), 'Sidebar retains project in ' + page);
        csrf = JSON.parse(html.match(/window\.APP_CONFIG = (.*);<\/script>/)[1]).csrfToken;
    }
    check((await call('/api/projects/1/releases/1/download')).status === 401, 'Download requires login');
    const adminPage = await request('/pages/admin/index.php'); check(adminPage.status === 200 && (await adminPage.text()).includes('id="admin-denied"'), 'Separate Admin page renders access gate');
    check((await call('/api/admin/stats')).status === 401, 'Admin API requires an authenticated session');
    const login = await call('/api/auth/login', 'POST', {}); check(!(await login.text()).includes('private-jwt'), 'JWT remains server-side');
    const routes = [
        ['/api/auth/me'], ['/api/auth/permissions'], ['/api/admin/roles'], ['/api/admin/permissions'], ['/api/admin/stats'],
        ['/api/admin/users/find', 'GET', undefined, { email: 'qa@example.com' }], ['/api/admin/users', 'GET', undefined, { q: 'qa & ? #', role: 'admin', status: 'locked', page: '2' }],
        ['/api/admin/users', 'POST', { email: 'new@example.com', displayName: 'New User', password: 'StrongPassword2026!', systemRole: 'user' }],
        ['/api/admin/users/2/permissions'], ['/api/admin/users/2/role', 'PUT', { role: 'admin', expectedVersion: 1 }], ['/api/admin/users/2/status', 'PUT', { isActive: false, expectedVersion: 1 }],
        ['/api/projects/1/permissions'],
        ['/api/admin/users/2', 'PUT', { displayName: 'QA', systemRole: 'user', isActive: false, expectedVersion: 1 }],
        ['/api/admin/projects'], ['/api/admin/projects/1', 'PUT', { name: 'Project', slug: 'project' }], ['/api/admin/projects/1', 'DELETE'],
        ['/api/admin/projects/1/members'], ['/api/admin/projects/1/members', 'POST', { email: 'qa@example.com', role: 'manager' }],
        ['/api/admin/projects/1/members/2', 'PUT', { role: 'reviewer' }], ['/api/admin/projects/1/members/2', 'DELETE'], ['/api/admin/audit', 'GET', undefined, { page: '1', q: 'user.updated' }],
        ['/api/dashboard/stats'], ['/api/projects/1/activity', 'GET', undefined, { page: '2' }],
        ['/api/projects/1/translations', 'GET', undefined, { locale: 'en', q: 'a & ? #', status: 'needs_review', assignee: 'me' }],
        ['/api/projects/1/translations', 'POST', { stringId: 1, localeCode: 'en', value: 'Hello', status: 'draft', expectedRowVersion: 0 }],
        ['/api/projects/1/translations/create-missing', 'POST', { localeCode: 'en' }],
        ['/api/projects/1/translations/1', 'DELETE', { expectedRowVersion: 3 }],
        ['/api/projects/1/translations', 'DELETE', { localeCode: 'en', items: [{ translationId: 1, expectedRowVersion: 3 }] }],
        ['/api/projects/1/translations/stats'], ['/api/projects/1/translations/assign', 'PUT', { localeCode: 'en', stringIds: [1], userId: 2 }],
        ['/api/projects/1/translations/1/assign', 'PUT', { userId: null, expectedRowVersion: 1 }],
        ['/api/projects/1/translations/1/comments'], ['/api/projects/1/translations/1/comments', 'POST', { body: '你好' }],
        ['/api/projects/1/translations/1/history'], ['/api/projects/1/translations/1/approve', 'POST', { expectedRowVersion: 1 }], ['/api/projects/1/translations/1/reject', 'POST', { expectedRowVersion: 1, note: 'Sửa' }],
        ['/api/projects/1/releases'], ['/api/projects/1/releases/validate'], ['/api/projects/1/releases/1'], ['/api/projects/1/releases', 'POST', { versionName: '1.0' }]
    ];
    for (const [path, method = 'GET', body, query] of routes) {
        check((await call(path, method, body, query)).status === 200 && received.authorization === 'Bearer private-jwt' && received.method === method, 'Forwards ' + method + ' ' + path);
        if (query?.q) assert.equal(new URL(received.url, origin).searchParams.get('q'), query.q);
        if (method === 'DELETE' && path.includes('/translations')) check(JSON.stringify(received.body) === JSON.stringify(body), 'Forwards deletion version and selection JSON');
    }
    check((await call('/api/projects/1/translations/1', 'DELETE')).status === 400, 'Translation delete requires JSON confirmation data');
    check((await call('/api/projects/1/translations/1', 'DELETE', { expectedRowVersion: 3 }, undefined, 'invalid')).status === 403, 'Translation delete requires valid CSRF');
    const download = await call('/api/projects/1/releases/1/download');
    check(download.headers.get('Content-Type') === 'application/zip' && download.headers.get('Content-Disposition').includes('demo-1.0.zip'), 'ZIP filename and MIME type preserved');
    check(Buffer.from(await download.arrayBuffer()).equals(zip), 'ZIP bytes preserved exactly');
    const json = await call('/api/projects/1/releases/1/files/en');
    check(json.headers.get('X-Content-SHA256') === 'a'.repeat(64) && (await json.json()).hi === 'Hello {name}', 'JSON download preserves data and SHA-256');
    errorResponse = true;
    const conflict = await call('/api/projects/1/translations', 'POST', {}), error = await conflict.json();
    check(conflict.status === 409 && error.details.currentRowVersion === 8 && error.details.currentValue === '最新 {name}', 'Conflict details reach editor');
    check(!JSON.stringify(error).includes('private') && !('debug' in error.details), 'Conflict forwards only allowed business fields');
    errorResponse = false;
    for (const args of [
        ['/api/admin/users', 'GET', undefined, { role: 'manager' }], ['/api/admin/users', 'GET', undefined, { status: 'deleted' }],
        ['/api/admin/users/find', 'GET', undefined, { email: '' }], ['/api/admin/permissions', 'POST', {}], ['/api/admin/users/1/role', 'DELETE'],
        ['/api/admin/users/1', 'DELETE'], ['/api/admin/audit', 'DELETE'], ['/api/auth/me', 'POST', {}],
        ['/api/projects/1/translations', 'GET', undefined, { status: 'deleted' }], ['/api/projects/1/translations', 'GET', undefined, { assignee: '../2' }],
        ['/api/projects/1/translations', 'GET', undefined, { locale: '//evil' }], ['/api/projects/1/activity', 'GET', undefined, { page: '-1' }],
        ['/api/projects/1/translations', 'DELETE'], ['/api/projects/1/releases/1', 'DELETE'], ['/api/projects/1/releases/1/files/../../x'],
        ['/api/projects/1/releases/1/download', 'GET', undefined, { url: 'http://evil' }]
    ]) check((await call(...args)).status === 400, 'Rejects unsupported request ' + args[0]);
    check((await call('/api/projects/1/releases/1/download', 'GET', undefined, undefined, 'wrong')).status === 403, 'Download requires CSRF token');
    check(!/Fatal error|Warning:|Parse error/.test(logs), 'PHP has no runtime warnings');
    console.log(`Completed ${count} workflow gateway checks.`);
} finally { php.kill(); await once(php, 'exit'); await new Promise(resolve => backend.close(resolve)); }
