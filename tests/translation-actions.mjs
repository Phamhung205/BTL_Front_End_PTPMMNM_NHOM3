import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'node:net';

// All mutations and hard-delete assertions use a disposable database, never 3306 or the demo DB.
const root = fileURLToPath(new URL('../', import.meta.url));
const database = 'translation_actions_verify_' + randomBytes(6).toString('hex');
assert.match(database, /^translation_actions_verify_[a-f0-9]{12}$/);
const apiBase = 'http://127.0.0.1:5092', frontend = 'http://127.0.0.1:8096';
const children = [], checks = [];
let created = false, logs = '', cookie = '', csrf;
function check(value, label) { assert.ok(value, label); checks.push(label); console.log('PASS ' + label); }
function sql(query, db = database) {
    assert.ok(db === database || db === 'mysql');
    const result = spawnSync('C:/xampp/mysql/bin/mysql.exe', ['--host=127.0.0.1', '--port=3307', '--user=root', '--connect-timeout=5', '--default-character-set=utf8mb4', '--batch', '--raw', '--skip-column-names', '--database=' + db],
        { input: 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci; ' + query, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr || 'Start the isolated MariaDB on port 3307 first.');
    return result.stdout.replace(/\r\n/g, '\n').trim();
}
async function freePort(port) {
    const server = createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    await new Promise(resolve => server.close(resolve));
}
function start(executable, args, cwd, env) {
    const child = spawn(executable, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', error => { logs += error.message; });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs = (logs + data).slice(-12000); });
    children.push(child); return child;
}
async function waitFor(url) {
    for (let i = 0; i < 80; i++) {
        try { const response = await fetch(url); if (response.ok) return; } catch (_) {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Test service did not start. ' + logs);
}
async function direct(endpoint, method = 'GET', body, token) {
    const response = await fetch(apiBase + endpoint, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text(); return { status: response.status, data: text ? JSON.parse(text) : null };
}
async function pageRequest(url, options = {}) {
    const response = await fetch(frontend + url, { ...options, headers: { ...options.headers, Cookie: cookie } });
    for (const value of response.headers.getSetCookie()) if (value.startsWith('tm_frontend_session=')) cookie = value.split(';')[0];
    return response;
}
function gatewayRaw(endpoint, method = 'GET', body, query) {
    return pageRequest('/gateway.php', { method: 'POST', headers: { Origin: frontend, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ endpoint, method, ...(body === undefined ? {} : { body }), ...(query ? { query } : {}) }) });
}
async function gateway(...args) { const response = await gatewayRaw(...args); const text = await response.text(); return { status: response.status, data: text ? JSON.parse(text) : null }; }

await freePort(5092); await freePort(8096);
// MariaDB uses the ASCII junction, while Node resolves import.meta.url to its physical path.
assert.equal(realpathSync(sql('SELECT @@datadir;', 'mysql')).toLowerCase(), realpathSync(path.join(root, '.local/mysql-api')).toLowerCase(), 'Only the workspace MariaDB may host the disposable test database.');
assert.equal(sql("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='" + database + "';", 'mysql'), '0');
const build = spawnSync('dotnet', ['build', 'backend/TranslationManager.Backend/TranslationManager.Api.csproj', '--no-restore', '--output', '.local/build/translation-actions'], { cwd: root, windowsHide: true, encoding: 'utf8' });
assert.equal(build.status, 0, build.stdout + build.stderr);
try {
    sql('CREATE DATABASE `' + database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;', 'mysql'); created = true;
    for (const file of ['schema.sql', 'seed.sql']) sql(readFileSync(path.join(root, 'backend/TranslationManager.Backend/database', file), 'utf8').replace(/\btranslation_manager\b/g, database));
    start('dotnet', [path.join(root, '.local/build/translation-actions/TranslationManager.Api.dll'), '--urls', apiBase], path.join(root, 'backend/TranslationManager.Backend'), {
        ConnectionStrings__Default: 'Server=127.0.0.1;Port=3307;Database=' + database + ';User ID=root;Password=;', Jwt__Key: randomBytes(64).toString('base64'), FrontendOrigins: frontend,
        Storage__ReleasePath: path.join(root, '.local/translation-action-fixtures', database)
    });
    start('C:/xampp/php/php.exe', ['-S', '127.0.0.1:8096', 'router.php'], root, { API_BASE_URL: apiBase });
    await waitFor(apiBase + '/health'); await waitFor(frontend + '/login.php');
    const password = 'ActionQA@2026!'; const users = [];
    for (const name of ['manager', 'translator', 'reviewer', 'outsider']) {
        const result = await direct('/api/auth/register', 'POST', { email: name + '@actions.example.test', displayName: name, password });
        assert.equal(result.status, 200); users.push(result.data);
    }
    const [manager, translator, reviewer, outsider] = users;
    const html = await (await pageRequest('/login.php')).text(); csrf = JSON.parse(html.match(/window\.APP_CONFIG = (.*);<\/script>/)[1]).csrfToken;
    assert.equal((await gateway('/api/auth/login', 'POST', { email: manager.email, password })).status, 200);
    const project = (await gateway('/api/projects', 'POST', { name: 'Action QA', slug: 'action-qa', sourceLocaleCode: 'vi' })).data;
    const base = '/api/projects/' + project.id, route = base + '/translations';
    for (const [account, role] of [[translator, 'translator'], [reviewer, 'reviewer']]) assert.equal((await gateway(base + '/members', 'POST', { userId: account.userId, role })).status, 201);
    for (const localeCode of ['en', 'fr']) assert.equal((await gateway(base + '/locales', 'POST', { localeCode })).status, 200);
    const source = Object.fromEntries(Array.from({ length: 84 }, (_, i) => ['key' + String(i).padStart(3, '0'), 'Nguồn ' + i]));
    assert.equal((await gateway(base + '/source-versions/import', 'POST', { versionName: 'v1', rawJson: JSON.stringify(source) })).status, 200);
    for (const account of [translator, reviewer, outsider]) check((await direct(route + '/create-missing', 'POST', { localeCode: 'en' }, account.token)).status === 403, 'Non-manager cannot create missing rows: ' + account.displayName);
    const added = await gateway(route + '/create-missing', 'POST', { localeCode: 'en' });
    check(added.status === 200 && added.data.created === 84 && sql("SELECT COUNT(*) FROM translations WHERE locale_code='en' AND value IS NULL AND assigned_to IS NULL AND row_version=1;") === '84', 'Gateway creates all 84 empty unassigned records in the database');
    check((await gateway(route + '/create-missing', 'POST', { localeCode: 'en' })).data.created === 0 && sql("SELECT COUNT(*) FROM translation_history WHERE action='created';") === '84', 'Repeated create-all does not duplicate rows or history');
    const concurrent = await Promise.all([1, 2].map(() => direct(route + '/create-missing', 'POST', { localeCode: 'fr' }, manager.token)));
    check(concurrent.every(result => result.status === 200) && concurrent.reduce((n, result) => n + result.data.created, 0) === 84, 'Concurrent create-all inserts each missing row once');
    check((await gateway(route + '/create-missing', 'POST', { localeCode: 'vi' })).status === 400, 'Cannot create translations for the source locale');
    const list = async () => (await gateway(route, 'GET', undefined, { locale: 'en' })).data;
    let rows = await list(); const first = rows[0];
    const saved = await gateway(route, 'POST', { stringId: first.stringId, localeCode: 'en', value: 'Hello', status: 'translated', expectedRowVersion: first.rowVersion });
    const approved = await direct(route + '/' + first.translationId + '/approve', 'POST', { expectedRowVersion: saved.data.rowVersion }, reviewer.token);
    assert.equal(approved.status, 200);
    assert.equal((await gateway(route + '/' + first.translationId + '/comments', 'POST', { body: 'Cascade QA' })).status, 201);
    check((await gateway(route + '/' + first.translationId, 'DELETE', { expectedRowVersion: first.rowVersion })).status === 409, 'Single delete refuses a stale loaded version');
    for (const account of [translator, reviewer, outsider]) check((await direct(route + '/' + first.translationId, 'DELETE', { expectedRowVersion: approved.data.rowVersion }, account.token)).status === 403, 'Non-manager cannot delete: ' + account.displayName);
    const deleted = await gateway(route + '/' + first.translationId, 'DELETE', { expectedRowVersion: approved.data.rowVersion });
    check(deleted.status === 200 && deleted.data.deleted === 1 && sql('SELECT COUNT(*) FROM translations WHERE id=' + first.translationId + ';') === '0', 'Single delete physically removes its database row through the gateway');
    for (const table of ['translation_comments', 'translation_history', 'reviews']) check(sql('SELECT COUNT(*) FROM ' + table + ' WHERE translation_id=' + first.translationId + ';') === '0', 'Hard delete cascades ' + table);
    check(sql('SELECT COUNT(*) FROM source_strings WHERE project_id=' + project.id + ';') === '84' && sql("SELECT COUNT(*) FROM translations t JOIN source_strings s ON s.id=t.string_id WHERE s.project_id=" + project.id + " AND t.locale_code='fr';") === '84', 'Deletion preserves source keys and other locales');
    rows = (await list()).filter(row => row.translationId);
    const stale = await gateway(route, 'DELETE', { localeCode: 'en', items: rows.slice(0, 2).map((row, i) => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion + i })) });
    check(stale.status === 409 && (await list()).filter(row => row.translationId).length === 83, 'Bulk stale version rolls back the entire selection');
    const other = (await gateway('/api/projects', 'POST', { name: 'Other scope', slug: 'other-scope', sourceLocaleCode: 'vi' })).data;
    const otherBase = '/api/projects/' + other.id;
    await gateway(otherBase + '/locales', 'POST', { localeCode: 'en' });
    await gateway(otherBase + '/source-versions/import', 'POST', { versionName: 'v1', rawJson: '{"outside":"Nguồn ngoài"}' });
    await gateway(otherBase + '/translations/create-missing', 'POST', { localeCode: 'en' });
    const foreign = (await gateway(otherBase + '/translations', 'GET', undefined, { locale: 'en' })).data[0];
    const mixed = await gateway(route, 'DELETE', { localeCode: 'en', items: [rows[0], foreign].map(row => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion })) });
    check(mixed.status === 404 && (await list()).filter(row => row.translationId).length === 83, 'Mixed-project deletion rejects every item without partial deletion');
    const item = { translationId: rows[0].translationId, expectedRowVersion: rows[0].rowVersion };
    check((await gateway(route, 'DELETE', { localeCode: 'fr', items: [item] })).status === 404, 'Bulk delete cannot cross locale boundaries');
    for (const items of [[], [item, item], [{ ...item, expectedRowVersion: 0 }], [null]]) check((await gateway(route, 'DELETE', { localeCode: 'en', items })).status === 400, 'Reject invalid deletion selection');
    check((await direct(route, 'DELETE', { localeCode: 'en', items: [item] })).status === 401, 'Deletion requires authentication');
    const bulk = await gateway(route, 'DELETE', { localeCode: 'en', items: rows.map(row => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion })) });
    check(bulk.status === 200 && bulk.data.deleted === 83 && (await list()).every(row => !row.translationId && row.status === 'missing'), 'Bulk hard-delete removes all 83 remaining records across pages');
    check(sql('SELECT COUNT(*) FROM translations WHERE id=' + foreign.translationId + ';') === '1', 'Bulk deletion preserves another project');
    delete source.key083;
    await gateway(base + '/source-versions/import', 'POST', { versionName: 'v2', rawJson: JSON.stringify(source) });
    check((await gateway(route + '/create-missing', 'POST', { localeCode: 'en' })).data.created === 83, 'Create-all skips source keys deleted in a newer version');
    rows = await list(); const draft = rows[0];
    await gateway(route, 'POST', { stringId: draft.stringId, localeCode: 'en', value: 'Preserve existing draft', status: 'draft', expectedRowVersion: draft.rowVersion });
    const before = sql('SELECT * FROM translations WHERE id=' + draft.translationId + ';');
    check((await gateway(route + '/create-missing', 'POST', { localeCode: 'en' })).data.created === 0 && sql('SELECT * FROM translations WHERE id=' + draft.translationId + ';') === before, 'Create-all preserves existing values, status, timestamps and row versions');
    check((await gateway(route + '/' + first.translationId, 'DELETE', { expectedRowVersion: 1 })).status === 404, 'An old translation ID cannot delete a recreated record');
    const publishSave = await gateway(otherBase + '/translations', 'POST', { stringId: foreign.stringId, localeCode: 'en', value: 'Published snapshot', status: 'translated', expectedRowVersion: foreign.rowVersion });
    const publishApproved = await gateway(otherBase + '/translations/' + foreign.translationId + '/approve', 'POST', { expectedRowVersion: publishSave.data.rowVersion });
    const release = await gateway(otherBase + '/releases', 'POST', { versionName: 'delete-qa-1.0' }); assert.equal(release.status, 201);
    const filePath = otherBase + '/releases/' + release.data.id + '/files/en';
    const snapshot = Buffer.from(await (await gatewayRaw(filePath)).arrayBuffer());
    assert.equal((await gateway(otherBase + '/translations/' + foreign.translationId, 'DELETE', { expectedRowVersion: publishApproved.data.rowVersion })).status, 200);
    check(Buffer.from(await (await gatewayRaw(filePath)).arrayBuffer()).equals(snapshot), 'Hard deletion preserves immutable published JSON');
    console.log(`Completed ${checks.length} isolated translation add/delete checks.`);
} finally {
    for (const child of children.reverse()) {
        if (child.exitCode === null && child.signalCode === null) {
            const closed = new Promise(resolve => child.once('close', resolve)); child.kill();
            await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 5000))]);
        }
    }
    if (created) { assert.match(database, /^translation_actions_verify_[a-f0-9]{12}$/); sql('DROP DATABASE `' + database + '`;', 'mysql'); }
}
