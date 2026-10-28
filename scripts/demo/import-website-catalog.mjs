import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = (process.env.API_BASE_URL || 'http://127.0.0.1:5088').replace(/\/$/, '');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Catalog seed is restricted to a local backend.');
const privateFile = process.env.TM_CATALOG_CREDENTIALS || path.join(root, '.local/catalog-accounts.json');
mkdirSync(path.dirname(privateFile), { recursive: true });
let fixture;
if (existsSync(privateFile)) fixture = JSON.parse(readFileSync(privateFile, 'utf8').replace(/^\uFEFF/, ''));
else {
    fixture = { api: base, password: randomBytes(24).toString('base64'), accounts: ['manager', 'translator', 'reviewer'].map(role => ({ role, email: 'catalog.' + role + '@translationmanager.local', displayName: 'Catalog ' + role })) };
    writeFileSync(privateFile, JSON.stringify(fixture, null, 2));
}
async function request(route, method = 'GET', body, token, allowed = [200, 201, 204]) {
    const response = await fetch(base + route, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text(); const data = text ? JSON.parse(text) : null;
    if (!allowed.includes(response.status)) throw new Error(method + ' ' + route + ': HTTP ' + response.status + ' ' + (data?.message || 'Request failed'));
    return { status: response.status, data };
}
const users = {};
for (const account of fixture.accounts) {
    await request('/api/auth/register', 'POST', { email: account.email, displayName: account.displayName, password: fixture.password }, undefined, [200, 409]);
    users[account.role] = (await request('/api/auth/login', 'POST', { email: account.email, password: fixture.password })).data;
}
const call = (route, method = 'GET', body, actor = 'manager', allowed) => request(route, method, body, users[actor].token, allowed);
function flatten(data, prefix = '', result = new Map()) {
    for (const [key, value] of Object.entries(data)) { const next = prefix ? prefix + '.' + key : key; if (typeof value === 'string') result.set(next, value); else flatten(value, next, result); }
    return result;
}
async function download(route, token) {
    const response = await fetch(base + route, { headers: { Authorization: 'Bearer ' + token } }); assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'), response.headers.get('X-Content-SHA256'));
    return bytes;
}
async function translateAll(route, directory, version) {
    for (const locale of ['vi', 'zh']) {
        const data = flatten(JSON.parse(readFileSync(path.join(directory, locale + (version === 2 ? '.v2' : '') + '.json'), 'utf8')));
        let rows = (await call(route + '/translations?locale=' + locale)).data;
        const pending = rows.filter(row => row.status !== 'approved' || row.value !== data.get(row.key));
        for (let i = 0; i < pending.length; i += 400) await call(route + '/translations/assign', 'PUT', { localeCode: locale, stringIds: pending.slice(i, i + 400).map(row => row.stringId), userId: users.translator.userId });
        rows = (await call(route + '/translations?locale=' + locale)).data;
        // A small queue bounds request count and database contention.
        let next = 0;
        const work = rows.filter(row => row.status !== 'approved' || row.value !== data.get(row.key));
        await Promise.all(Array.from({ length: 4 }, async () => {
            while (next < work.length) {
                const row = work[next++];
                const saved = await call(route + '/translations', 'POST', { stringId: row.stringId, localeCode: locale, value: data.get(row.key), status: 'translated', expectedRowVersion: row.rowVersion }, 'translator');
                await call(route + '/translations/' + saved.data.id + '/approve', 'POST', { expectedRowVersion: saved.data.rowVersion }, 'reviewer');
            }
        }));
        console.log(directory.split(path.sep).at(-1) + ' v' + version + ' ' + locale + ': ' + rows.length + ' translations ready');
    }
}
const output = [];
for (const [dataset, name] of [['common-web', 'Website phổ thông · 1.010 khóa'], ['student-portal', 'Cổng sinh viên · 170 khóa']]) {
    const directory = path.join(root, 'examples/catalog', dataset), slug = 'catalog-' + dataset;
    let project = (await call('/api/projects')).data.find(item => item.slug === slug);
    if (!project) project = (await call('/api/projects', 'POST', { name, slug, sourceLocaleCode: 'en', targetLocaleCodes: ['vi', 'zh'], members: ['translator', 'reviewer'].map(role => ({ userId: users[role].userId, role })) })).data;
    const route = '/api/projects/' + project.id;
    let releases = (await call(route + '/releases')).data;
    let first = releases.find(item => item.version === 'catalog-1.0.0');
    if (!first) {
        const versions = (await call(route + '/source-versions')).data;
        if (!versions.some(item => item.versionName === 'catalog-source-v1')) await call(route + '/source-versions/import', 'POST', { versionName: 'catalog-source-v1', rawJson: readFileSync(path.join(directory, 'en.json'), 'utf8') });
        await translateAll(route, directory, 1);
        first = (await call(route + '/releases', 'POST', { versionName: 'catalog-1.0.0', note: 'Bộ nhãn giao diện mẫu en/vi/zh; bản phát hành trước khi nguồn thay đổi.' })).data;
    }
    const oldPath = route + '/releases/' + first.id + '/files/vi', oldBytes = await download(oldPath, users.manager.token);
    let second = releases.find(item => item.version === 'catalog-2.0.0');
    if (!second) {
        const versions = (await call(route + '/source-versions')).data;
        if (!versions.some(item => item.versionName === 'catalog-source-v2')) {
            const diff = (await call(route + '/source-versions/import', 'POST', { versionName: 'catalog-source-v2', rawJson: readFileSync(path.join(directory, 'en.v2.json'), 'utf8') })).data;
            assert.equal(diff.added, 1); assert.equal(diff.changed, 1); assert.equal(diff.deleted, 1);
            assert.equal((await call(route + '/releases/validate')).data.ready, false);
            await call(route + '/releases', 'POST', { versionName: 'catalog-must-be-blocked' }, 'manager', [400]);
        }
        await translateAll(route, directory, 2);
        second = (await call(route + '/releases', 'POST', { versionName: 'catalog-2.0.0', note: 'Tình huống 2: đổi câu chào và biến, thêm trợ giúp, xóa Hủy; sửa/duyệt và chốt gói mới.' })).data;
    }
    assert.ok((await download(oldPath, users.manager.token)).equals(oldBytes), 'Old release must remain unchanged');
    if (dataset === 'common-web') {
        const website = path.join(root, 'examples/website'); mkdirSync(path.join(website, 'locales'), { recursive: true });
        for (const locale of ['en', 'vi', 'zh']) writeFileSync(path.join(website, 'locales', locale + '.json'), await download(route + '/releases/' + second.id + '/files/' + locale, users.manager.token));
        writeFileSync(path.join(website, 'release.json'), JSON.stringify({ version: second.version, projectId: project.id, releaseId: second.id, keyCount: second.keyCount, files: second.files }, null, 2));
    }
    output.push({ dataset, projectId: project.id, keyCount: second.keyCount, firstReleaseId: first.id, secondReleaseId: second.id, oldReleaseUnchanged: true });
}
writeFileSync(process.env.TM_CATALOG_RESULT || path.join(path.dirname(privateFile), 'catalog-import-result.json'), JSON.stringify({ api: base, projects: output }, null, 2));
console.log('Catalog imported and scenario 2 verified. Credentials: ' + privateFile);
