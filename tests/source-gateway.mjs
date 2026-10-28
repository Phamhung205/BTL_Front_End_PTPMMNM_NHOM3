import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// HTTP transport tests with an isolated mock API. No database connection or writes.
const root = fileURLToPath(new URL('../', import.meta.url));
let received;
const backend = createServer(async (request, response) => {
    let text = ''; for await (const chunk of request) text += chunk;
    received = { url: request.url, method: request.method, authorization: request.headers.authorization, body: text ? JSON.parse(text) : null };
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(request.url === '/api/auth/login' ? { token: 'private-mock-token', userId: 1, displayName: 'QA' } : []));
});
backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
const reserve = createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
const frontend = `http://127.0.0.1:${port}`;
const php = spawn(process.env.PHP_PATH || 'C:/xampp/php/php.exe', ['-S', `127.0.0.1:${port}`, '-t', root, root + 'router.php'], {
    cwd: root, windowsHide: true, env: { ...process.env, APP_MODE: 'api', API_BASE_URL: `http://127.0.0.1:${backend.address().port}` }, stdio: 'pipe'
});
let logs = ''; php.stderr.on('data', data => logs += data);
let cookie = '', csrf = '', count = 0;
function check(ok, label) { assert.ok(ok, label); count++; console.log('PASS ' + label); }
async function request(path, options = {}) {
    const response = await fetch(frontend + path, { ...options, headers: { ...options.headers, Cookie: cookie } });
    for (const value of response.headers.getSetCookie()) if (value.startsWith('tm_frontend_session=')) cookie = value.split(';')[0];
    return { status: response.status, text: await response.text() };
}
async function call(endpoint, method = 'GET', body, query) {
    return request('/gateway.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Origin: frontend }, body: JSON.stringify({ endpoint, method, ...(body === undefined ? {} : { body }), ...(query === undefined ? {} : { query }) }) });
}
try {
    for (let i = 0; i < 60; i++) {
        try { await request('/login.php'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    const page = await request('/pages/languages/index.php?project_id=1');
    assert.equal(page.status, 200, 'Language page HTTP status: ' + page.text.slice(0, 200));
    const config = JSON.parse(page.text.match(/window\.APP_CONFIG = (.*);<\/script>/)[1]); csrf = config.csrfToken;
    check(page.status === 200 && page.text.includes('id="locale-form"'), 'Language PHP page renders');
    check(page.text.includes('pages/source-versions/index.php?project_id=1'), 'Sidebar preserves project context');
    check((await request('/pages/source-versions/index.php')).text.includes('id="source-import-form"'), 'Source version PHP page renders');
    check((await request('/pages/translation-keys/index.php')).text.includes('id="keys-filter"'), 'Translation key PHP page renders');
    check((await call('/api/projects/1/locales')).status === 401, 'New routes require an authenticated PHP session');
    const login = await call('/api/auth/login', 'POST', { email: 'qa@example.com', password: 'test' });
    check(login.status === 200 && !login.text.includes('private-mock-token'), 'Login keeps JWT server-side');
    for (const [path, method, body] of [
        ['/locales', 'GET'], ['/locales', 'POST', { localeCode: 'en' }], ['/locales/en-US', 'PUT', { name: 'English' }], ['/locales/en-US', 'DELETE'],
        ['/source-versions', 'GET'], ['/source-versions/2/changes', 'GET'], ['/translation-keys', 'GET']
    ]) {
        check((await call('/api/projects/1' + path, method, body)).status === 200 && received.method === method && received.authorization === 'Bearer private-mock-token', 'Forward authorized route ' + method + ' ' + path);
    }
    const query = 'xin chào & ? # + / \\';
    check((await call('/api/projects/1/translation-keys', 'GET', undefined, { q: query, status: 'deleted' })).status === 200, 'Search supports special characters');
    const url = new URL(received.url, 'http://localhost');
    check(url.searchParams.get('q') === query && url.searchParams.get('status') === 'deleted', 'Query values survive RFC3986 encoding');
    check((await call('/api/projects/1/source-versions/2/changes', 'GET', undefined, { compareToVersionId: '1' })).status === 200 && received.url.endsWith('?compareToVersionId=1'), 'Compare arbitrary source versions');
    const rawJson = '{"key":"first","key":"second"}';
    check((await call('/api/projects/1/source-versions/import', 'POST', { versionName: 'v1', rawJson })).status === 200 && received.body.rawJson === rawJson, 'Duplicate JSON properties reach backend unchanged');
    const large = JSON.stringify(Object.fromEntries(Array.from({ length: 180 }, (_, i) => ['key' + i, 'x'.repeat(7000)])));
    check((await call('/api/projects/1/source-versions/import', 'POST', { versionName: 'large', rawJson: large })).status === 200 && received.body.rawJson === large, 'Sources above 1 MB pass through gateway intact');
    for (const [endpoint, method, body, query] of [
        ['http://evil.example', 'GET'], ['/api/projects/1/locales?url=http://evil.example', 'GET'],
        ['/api/projects/1/locales', 'GET', undefined, { url: 'http://evil.example' }],
        ['/api/projects/1/translation-keys', 'GET', undefined, { q: ['nested'] }],
        ['/api/projects/1/translation-keys', 'GET', undefined, { status: 'invalid' }],
        ['/api/projects/1/source-versions/2/changes', 'GET', undefined, { compareToVersionId: '../1' }],
        ['/api/projects/1/source-versions/2', 'DELETE'], ['/api/projects/1/translation-keys', 'POST', {}]
    ]) check((await call(endpoint, method, body, query)).status === 400, 'Reject unsupported route/query ' + endpoint);
    const context = vm.createContext({ document: { addEventListener() {} }, window: { addEventListener() {} }, TextEncoder });
    // Như trang thật (source.php): ui.js nạp trước workspace.js và cung cấp bộ gộp/kiểm tra JSON dùng chung.
    vm.runInContext(readFileSync(new URL('../assets/js/shared/ui.js', import.meta.url), 'utf8'), context);
    vm.runInContext(readFileSync(new URL('../assets/js/source/workspace.js', import.meta.url), 'utf8'), context);
    check(context.validateSourceJson('{"menu":{"open":"Mở"},"empty":""}') === 2, 'Frontend validates nested sources and empty strings');
    check(context.validateSourceJson('{"a.b":"x"}') === 1, 'Frontend accepts documented dotted key paths');
    for (const json of ['{}', '[]', '{"x":1}', '{"a":"x","a.b":"y"}', '{"x":{}}', 'invalid']) {
        assert.throws(() => context.validateSourceJson(json)); count++;
    }
    const errors = logs.split('\n').filter(line => /Fatal error|Warning:|Parse error/.test(line));
    check(errors.length === 0, 'PHP serves all new flows without runtime warnings');
    console.log(`Completed ${count} source gateway/frontend checks without a database.`);
} finally {
    php.kill(); await once(php, 'exit'); await new Promise(resolve => backend.close(resolve));
}
