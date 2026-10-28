import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

// Only the isolated stack started by start-integrated.ps1 (database port 3307).
const backend = process.env.API_BASE_URL || 'http://127.0.0.1:5088', frontend = process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:8095';
const suffix = randomBytes(6).toString('hex'), password = 'Workflow@Test123';
let count = 0, projectId;
function check(ok, label) { assert.ok(ok, label); count++; console.log('PASS ' + label); }
async function direct(path, method = 'GET', body, token) {
    const res = await fetch(backend + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); return { status: res.status, data: text ? JSON.parse(text) : null };
}
function session() {
    let cookie = '', csrf;
    const request = async (path, options = {}) => {
        const res = await fetch(frontend + path, { ...options, headers: { ...options.headers, Cookie: cookie } });
        for (const value of res.headers.getSetCookie()) if (value.startsWith('tm_frontend_session=')) cookie = value.split(';')[0]; return res;
    };
    return {
        async login(email) { const page = await (await request('/login.php')).text(); csrf = JSON.parse(page.match(/window\.APP_CONFIG = (.*);<\/script>/)[1]).csrfToken; return this.call('/api/auth/login', 'POST', { email, password }); },
        async raw(endpoint, method = 'GET', body, query) { return request('/gateway.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Origin: frontend }, body: JSON.stringify({ endpoint, method, ...(body === undefined ? {} : { body }), ...(query ? { query } : {}) }) }); },
        async call(...args) { const res = await this.raw(...args); const text = await res.text(); return { status: res.status, data: text ? JSON.parse(text) : null }; }
    };
}
const accounts = [];
for (const role of ['manager', 'translator', 'reviewer', 'outsider']) {
    const email = `workflow.${role}.${suffix}@example.com`, res = await direct('/api/auth/register', 'POST', { email, password, displayName: 'Workflow ' + role });
    check(res.status === 200, 'Register isolated QA ' + role); const client = session();
    const login = await client.login(email); check(login.status === 200 && !JSON.stringify(login.data).includes('token'), 'Gateway login ' + role);
    accounts.push({ role, email, client, id: res.data.userId, token: res.data.token });
}
const [manager, translator, reviewer, outsider] = accounts, m = manager.client, t = translator.client, r = reviewer.client;
try {
    const created = await m.call('/api/projects', 'POST', { name: 'Workflow QA ' + suffix, slug: 'workflow-' + suffix, sourceLocaleCode: 'vi' });
    check(created.status === 201, 'Create project through gateway'); projectId = created.data.id; const path = '/api/projects/' + projectId;
    for (const account of [translator, reviewer]) check((await m.call(path + '/members', 'POST', { userId: account.id, role: account.role })).status === 201, 'Add ' + account.role);
    check((await m.call(path + '/locales', 'POST', { localeCode: 'en' })).status === 200, 'Attach target');
    check((await m.call(path + '/source-versions/import', 'POST', { versionName: 'v1', rawJson: '{"hello":"Xin chào {name}","menu":{"open":"Mở"}}' })).status === 200, 'Import source snapshot');
    const list = () => m.call(path + '/translations', 'GET', undefined, { locale: 'en' });
    let rows = (await list()).data; check(rows.length === 2 && rows.every(row => row.status === 'missing'), 'Untranslated keys visible');
    check((await m.call(path + '/translations/assign', 'PUT', { localeCode: 'en', stringIds: rows.map(row => row.stringId), userId: translator.id })).status === 200, 'Bulk assign missing translations');
    rows = (await list()).data; check(rows.every(row => row.assignedTo === translator.id && row.translationId), 'Assignment creates editable records');
    check((await t.call(path + '/translations', 'GET', undefined, { locale: 'en' })).data.every(row => row.canEdit), 'Server provides edit permission for assigned translator');
    check((await r.call(path + '/translations', 'GET', undefined, { locale: 'en' })).data.every(row => row.canEdit === false), 'Server denies edit permission to reviewer');
    const hello = rows.find(row => row.key === 'hello'), open = rows.find(row => row.key === 'menu.open');
    const save = (client, row, value, status, version = row.rowVersion) => client.call(path + '/translations', 'POST', { stringId: row.stringId, localeCode: 'en', value, status, expectedRowVersion: version });
    check((await save(r, hello, 'Hello {name}', 'draft')).status === 403, 'Reviewer cannot edit');
    const invalid = await save(t, hello, 'Hello', 'translated'); check(invalid.status === 400 && invalid.data.details.missing.includes('{name}'), 'Placeholder error survives gateway');
    const saved = await save(t, hello, 'Hello {name}', 'translated'); check(saved.status === 200, 'Translator submits for review');
    const conflict = await save(m, hello, 'Stale {name}', 'draft'); check(conflict.status === 409 && conflict.data.details.currentValue === 'Hello {name}' && conflict.data.details.currentRowVersion === saved.data.rowVersion, 'Concurrent save returns latest version without overwrite');
    check((await t.call(path + '/translations/' + hello.translationId + '/approve', 'POST', { expectedRowVersion: saved.data.rowVersion })).status === 403, 'Translator cannot approve');
    check((await r.call(path + '/translations/' + hello.translationId + '/reject', 'POST', { expectedRowVersion: saved.data.rowVersion, note: '' })).status === 400, 'Reject requires reason');
    const rejected = await r.call(path + '/translations/' + hello.translationId + '/reject', 'POST', { expectedRowVersion: saved.data.rowVersion, note: 'Kiểm tra câu chào' }); check(rejected.status === 200 && rejected.data.status === 'needs_review', 'Reviewer rejects with reason');
    const revision = await save(t, hello, 'Welcome {name}', 'translated', rejected.data.rowVersion); check(revision.status === 200, 'Translator resubmits corrected translation');
    check((await r.call(path + '/translations/' + hello.translationId + '/approve', 'POST', { expectedRowVersion: saved.data.rowVersion })).status === 409, 'Stale review blocked');
    check((await r.call(path + '/translations/' + hello.translationId + '/approve', 'POST', { expectedRowVersion: revision.data.rowVersion })).status === 200, 'Reviewer approves latest translation');
    const openSaved = await save(t, open, 'Open', 'draft'); check(openSaved.status === 200, 'Save draft');
    check((await r.call(path + '/translations/' + open.translationId + '/approve', 'POST', { expectedRowVersion: openSaved.data.rowVersion })).status === 400, 'Draft cannot be approved');
    const openSubmitted = await save(t, open, 'Open', 'translated', openSaved.data.rowVersion);
    check((await r.call(path + '/translations/' + open.translationId + '/approve', 'POST', { expectedRowVersion: openSubmitted.data.rowVersion })).status === 200, 'Second translation approved');
    check((await t.call(path + '/translations/' + hello.translationId + '/comments', 'POST', { body: 'Đã kiểm tra Unicode 中文.' })).status === 201, 'Member comments');
    const comments = await r.call(path + '/translations/' + hello.translationId + '/comments'); check(comments.data[0].body.includes('中文'), 'Comments load with Unicode');
    check((await m.call(path + '/translations/' + hello.translationId + '/history')).data.some(item => item.action === 'rejected'), 'Translation history includes review');
    const stats = await r.call(path + '/translations/stats'); check(stats.data[0].approved === 2 && stats.data[0].total === 2, 'Progress matches approved translations');
    check((await m.call(path + '/releases/validate')).data.ready, 'Release validation ready');
    check((await t.call(path + '/releases', 'POST', { versionName: '1.0' })).status === 403, 'Only manager publishes');
    const release = await m.call(path + '/releases', 'POST', { versionName: '1.0', note: 'QA release' }); check(release.status === 201 && release.data.files.length === 2, 'Manager publishes source and target snapshot');
    check((await m.call(path + '/releases', 'POST', { versionName: '1.0' })).status === 409, 'Duplicate release version rejected');
    const file = await r.raw(path + '/releases/' + release.data.id + '/files/en'), bytes = Buffer.from(await file.arrayBuffer());
    check(file.status === 200 && JSON.parse(bytes).hello === 'Welcome {name}' && JSON.parse(bytes).menu.open === 'Open', 'Reviewer downloads nested JSON');
    check(createHash('sha256').update(bytes).digest('hex') === file.headers.get('X-Content-SHA256'), 'Downloaded JSON SHA-256 matches');
    const zip = await t.raw(path + '/releases/' + release.data.id + '/download'), zipBytes = Buffer.from(await zip.arrayBuffer()); check(zip.status === 200 && zipBytes.subarray(0, 2).toString() === 'PK', 'Translator downloads valid ZIP bytes');
    const latest = (await list()).data.find(row => row.key === 'hello');
    check((await save(t, latest, 'Hello again {name}', 'draft')).status === 200, 'Edit after release');
    const oldFile = await m.raw(path + '/releases/' + release.data.id + '/files/en'); check(Buffer.from(await oldFile.arrayBuffer()).equals(bytes), 'Existing release remains immutable');
    const activities = await r.call(path + '/activity', 'GET', undefined, { page: '1' });
    check(activities.status === 200 && ['translation', 'comment', 'source', 'release'].every(kind => activities.data.items.some(item => item.kind === kind)), 'Project activity includes all workflow event types');
    check((await r.call(path + '/activity', 'GET', undefined, { page: '2' })).data.items.length === 0, 'Activity pagination supports empty next page');
    const outsiderStats = await outsider.client.call('/api/dashboard/stats'); check(outsiderStats.data.projects === 0 && outsiderStats.data.pendingTranslations === 0, 'Dashboard scoped to membership');
    const dashboard = await t.call('/api/dashboard/stats'); check(dashboard.data.projects === 1 && dashboard.data.managedProjects === 0 && dashboard.data.languages === 2 && dashboard.data.pendingTranslations === 1, 'Dashboard returns accurate pending count');
    for (const endpoint of ['/activity', '/translations/stats', '/releases', '/releases/' + release.data.id + '/download']) check((await outsider.client.raw(path + endpoint)).status === 403, 'Outsider denied ' + endpoint);
    check((await m.call(path + '/members/' + translator.id, 'DELETE')).status === 204 && (await t.call(path + '/activity')).status === 403, 'Removed member loses history access immediately');
    if (process.env.KEEP_WORKFLOW_QA === '1') {
        writeFileSync(new URL('../.local/workflow-qa.json', import.meta.url), JSON.stringify({ email: manager.email, projectId, suffix }));
        console.log('Browser QA project retained: ' + projectId + ', email: ' + manager.email);
    }
    console.log(`Completed ${count} workflow integration checks against isolated MariaDB.`);
} finally {
    if (projectId && process.env.KEEP_WORKFLOW_QA !== '1') await direct('/api/projects/' + projectId, 'DELETE', undefined, manager.token);
}
