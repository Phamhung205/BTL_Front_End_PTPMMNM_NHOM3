// Đề tài 3 — mục 6 "Các phép thử bắt buộc" và mục 4 "Hai tình huống sử dụng", chạy trên dữ liệu 3 website mẫu
// trong web-sample-import/. Chỉ chạy trên CSDL demo/tạm (tạo tài khoản và dự án QA mới mỗi lần chạy).
//   node tests/required-tests.mjs            (API_BASE_URL mặc định http://127.0.0.1:5088)
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { inflateRawSync } from 'node:zlib';

const API = (process.env.API_BASE_URL || 'http://127.0.0.1:5088').replace(/\/$/, '');
const kitUrl = path => new URL('../web-sample-import/' + path, import.meta.url);
const readText = path => readFileSync(kitUrl(path), 'utf8').replace(/^﻿/, '');
const readJson = path => JSON.parse(readText(path));
const run = Date.now().toString(36) + randomBytes(2).toString('hex'), password = 'Qa@' + randomBytes(9).toString('base64url');
let checks = 0;
const results = [];
function check(condition, label) { assert.ok(condition, label); checks++; }
async function section(title, body) {
    const started = checks;
    try { await body(); results.push({ title, ok: true, checks: checks - started }); console.log(`PASS ${title} (${checks - started} kiểm tra)`); }
    catch (error) { results.push({ title, ok: false, error: error.message }); console.log(`FAIL ${title}: ${error.message}`); throw error; }
}

async function call(method, path, token, body, raw = false) {
    const response = await fetch(API + path, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (raw) return { status: response.status, headers: response.headers, buffer: Buffer.from(await response.arrayBuffer()) };
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null };
}
async function ok(method, path, token, body, expected = [200, 201]) {
    const result = await call(method, path, token, body);
    if (!expected.includes(result.status)) throw new Error(`${method} ${path} → HTTP ${result.status} ${JSON.stringify(result.data)}`);
    return result.data;
}
async function account(role) {
    const email = `qa.${role}.${run}@required-tests.local`;
    const created = await ok('POST', '/api/auth/register', null, { email, displayName: 'QA ' + role, password });
    return { email, id: created.userId, token: created.token };
}
const flatten = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : flatten(value, prefix + key + '.'));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rowsByKey = rows => Object.fromEntries(rows.map(row => [row.key, row]));

// Đọc một tệp trong ZIP (gói tích hợp do backend tạo) mà không cần thư viện ngoài.
function unzipEntry(buffer, name) {
    const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let offset = buffer.readUInt32LE(end + 16);
    for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
        const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20);
        const nameLength = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
        if (buffer.toString('utf8', offset + 46, offset + 46 + nameLength) === name) {
            const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
            const data = buffer.subarray(start, start + size);
            return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
        }
        offset += 46 + nameLength + extra + comment;
    }
    throw new Error('ZIP thiếu ' + name);
}

// DOM tối giản từ HTML thật của website: mọi phần tử có data-i18n*, đủ cho translation-manager.js.
function fakeDocument(html) {
    const elements = [];
    for (const tag of html.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g)) {
        const attributes = {};
        for (const attribute of tag[2].matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) attributes[attribute[1]] = (attribute[2] ?? attribute[3] ?? attribute[4] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        if (!Object.keys(attributes).some(name => name.startsWith('data-i18n'))) continue;
        const dataset = {};
        for (const [name, value] of Object.entries(attributes)) if (name.startsWith('data-')) dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
        elements.push({ tag: tag[1].toLowerCase(), dataset, textContent: '', attributes, getAttribute(name) { return this.attributes[name] ?? null; }, setAttribute(name, value) { this.attributes[name] = value; } });
    }
    const selectorMatches = (element, selector) => selector.startsWith('[data-i18n') && selector.slice(1, -1) in element.attributes;
    const document = { title: '', documentElement: { lang: 'vi' }, elements,
        querySelectorAll: selector => elements.filter(element => selectorMatches(element, selector)),
        querySelector: selector => elements.find(element => selectorMatches(element, selector)) ?? null,
        dispatchEvent() {}, createElement: () => ({}) };
    return document;
}
async function loadClient(clientSource, html, config) {
    const document = fakeDocument(html);
    const window = { TRANSLATION_MANAGER_CONFIG: config };
    const context = vm.createContext({ window, document, fetch, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, console });
    vm.runInContext(clientSource, context);
    // Giống website: init() đọc cấu hình rồi tải ngôn ngữ mặc định.
    await window.TranslationManager.init();
    return { document, manager: window.TranslationManager };
}

const kit1 = { vi: readJson('web-test-1-fashion/i18n/vi.json'), en: readJson('web-test-1-fashion/i18n/en.json'), ja: readJson('web-test-1-fashion/i18n/ja.json'), html: readText('web-test-1-fashion/site/index.html') };
const kit2 = { vi: readJson('web-test-2-techstore/i18n/vi.json'), en: readJson('web-test-2-techstore/i18n/en.json'), vi2: readJson('web-test-2-techstore/i18n/v2/vi.json'), en2: readJson('web-test-2-techstore/i18n/v2/en.json'), login: readText('web-test-2-techstore/site/login.html') };
const kit3 = { vi: readJson('web-test-3-beautyshop/i18n/vi.json'), en: readJson('web-test-3-beautyshop/i18n/en.json') };

const health = await call('GET', '/health');
if (health.status !== 200) throw new Error('Backend chưa chạy tại ' + API);
const manager = await account('manager'), translator = await account('translator'), reviewer = await account('reviewer');
async function createProject(name, slug, targets) {
    const created = await ok('POST', '/api/projects', manager.token, { name, slug: slug + '-' + run, sourceLocaleCode: 'vi', targetLocaleCodes: targets,
        members: [{ email: translator.email, role: 'translator' }, { email: reviewer.email, role: 'reviewer' }] });
    return '/api/projects/' + created.id;
}
const list = (base, locale, user = manager) => ok('GET', `${base}/translations?locale=${locale}`, user.token);
async function translateAndApprove(base, locale, values) {
    // Manager giao các khóa còn thiếu cho Translator; Translator dịch/gửi duyệt; Reviewer duyệt hàng loạt.
    let rows = await list(base, locale);
    const unassigned = rows.filter(row => row.status !== 'approved' && row.assignedTo !== translator.id).map(row => row.stringId);
    for (let i = 0; i < unassigned.length; i += 400) await ok('PUT', `${base}/translations/assign`, manager.token, { localeCode: locale, stringIds: unassigned.slice(i, i + 400), userId: translator.id });
    rows = await list(base, locale, translator);
    for (const row of rows.filter(item => ['missing', 'draft', 'needs_review'].includes(item.status))) {
        const value = values.get(row.key);
        assert.ok(typeof value === 'string' && value.trim(), `Missing real translation: ${locale}/${row.key}`);
        await ok('POST', `${base}/translations`, translator.token, { stringId: row.stringId, localeCode: locale, value, status: 'translated', expectedRowVersion: row.rowVersion });
    }
    const pending = (await list(base, locale)).filter(row => row.status === 'translated').map(row => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion }));
    for (let i = 0; i < pending.length; i += 1000) await ok('POST', `${base}/translations/approve`, reviewer.token, { items: pending.slice(i, i + 1000) });
}
async function publish(base, version) {
    const release = await ok('POST', `${base}/releases`, manager.token, { versionName: version, note: 'QA ' + version });
    const zip = await call('GET', `${base}/releases/${release.id}/integration`, manager.token, undefined, true);
    return { ...release, client: unzipEntry(zip.buffer, 'translation-manager.js') };
}
// Đúng cách website khách đọc gói: API công khai + header X-API-Key, không dùng tài khoản dự án.
async function publicFile(releaseId, locale, apiKey) {
    const response = await fetch(`${API}/api/public/releases/${releaseId}/files/${locale}`, { headers: apiKey ? { 'X-API-Key': apiKey } : {} });
    return { status: response.status, sha: response.headers.get('x-content-sha256'), buffer: Buffer.from(await response.arrayBuffer()) };
}

// ---------------- Tình huống 1 (web test 1: vi → en, ja) ----------------
let fashion;
await section('Tình huống 1: nhập nguồn → phân công → kiểm tra biến → xác nhận → xuất gói → ứng dụng đọc gói (web test 1)', async () => {
    fashion = await createProject('QA Fashion', 'qa-fashion', ['en', 'ja']);
    const source = flatten(kit1.vi);
    const imported = await ok('POST', `${fashion}/source-versions/import`, manager.token, { versionName: 'fashion-v1', rawJson: JSON.stringify(kit1.vi) });
    check(imported.added === source.length && imported.deleted === 0, 'nhập JSON nguồn lồng nhau của website');
    // Omit one translation and blank one only in this test request to exercise assignment/editing.
    const partialEn = structuredClone(kit1.en), partialJa = structuredClone(kit1.ja);
    delete partialEn.index.vay_mua_he;
    partialJa.register = '';
    const en = await ok('POST', `${fashion}/translations/import`, manager.token, { localeCode: 'en', rawJson: JSON.stringify(partialEn), status: 'translated' });
    const ja = await ok('POST', `${fashion}/translations/import`, manager.token, { localeCode: 'ja', rawJson: JSON.stringify(partialJa), status: 'translated' });
    check(en.created === source.length - 1 && en.notInSource === 0, 'nhập en, chừa một khóa để Translator hoàn thiện');
    check(ja.empty === 1 && ja.created === source.length - 1, 'giá trị rỗng trong yêu cầu thử bị bỏ qua');
    let validation = await ok('GET', `${fashion}/releases/validate`, manager.token);
    check(!validation.ready, 'bản nhập chưa duyệt và khóa còn thiếu chặn phát hành');
    await translateAndApprove(fashion, 'en', new Map(flatten(kit1.en)));
    await translateAndApprove(fashion, 'ja', new Map(flatten(kit1.ja)));
    validation = await ok('GET', `${fashion}/releases/validate`, manager.token);
    check(validation.ready && validation.activeStrings === source.length, 'đủ bản dịch đã duyệt → được phát hành');
    const release = await publish(fashion, '1.0.0');
    check(release.files.length === 3 && typeof release.apiKey === 'string', 'phát hành 3 tệp vi/en/ja và cấp API key chỉ đọc');
    const app = await loadClient(release.client, kit1.html, { apiBaseUrl: API, releaseId: release.id, apiKey: release.apiKey, defaultLocale: 'vi' });
    await app.manager.setLanguage('en');
    const enValues = new Map(flatten(kit1.en));
    const tagged = app.document.querySelectorAll('[data-i18n]');
    check(tagged.length > 50 && tagged.every(element => enValues.has(element.dataset.i18n) && element.textContent === enValues.get(element.dataset.i18n)), 'website đọc gói en và hiển thị đúng chữ của từng khóa');
    check(app.document.title === kit1.en.index.women_s_clothing_store, 'tiêu đề trang lấy từ gói');
});

// ---------------- 5 phép thử bắt buộc + tình huống 2 (web test 2: TechStore) ----------------
const techstore = await createProject('QA TechStore', 'qa-techstore', ['en']);
const keyCount = flatten(kit2.vi).length;
let release1;

await section('Phép thử 1: nhập lại cùng tệp không nhân đôi khóa; giữ đúng cấu trúc lồng nhau khi xuất', async () => {
    const first = await ok('POST', `${techstore}/source-versions/import`, manager.token, { versionName: 'techstore-v1', rawJson: JSON.stringify(kit2.vi) });
    const again = await ok('POST', `${techstore}/source-versions/import`, manager.token, { versionName: 'techstore-v1-nhap-lai', rawJson: JSON.stringify(kit2.vi) });
    check(first.added === keyCount, 'lần đầu thêm đủ khóa');
    check(again.added === 0 && again.changed === 0 && again.deleted === 0 && again.unchanged === keyCount, 'nhập lại cùng tệp: không thêm, sửa hay xóa khóa nào');
    const keys = await ok('GET', `${techstore}/translation-keys?status=all`, manager.token);
    check(keys.length === keyCount && new Set(keys.map(key => key.key)).size === keyCount, 'CSDL không có khóa trùng');
    const importedTwice = await ok('POST', `${techstore}/translations/import`, manager.token, { localeCode: 'en', rawJson: JSON.stringify(kit2.en) });
    const importedAgain = await ok('POST', `${techstore}/translations/import`, manager.token, { localeCode: 'en', rawJson: JSON.stringify(kit2.en) });
    check(importedTwice.created === keyCount && importedAgain.created === 0 && importedAgain.unchanged === keyCount, 'nhập lại cùng tệp bản dịch không tạo bản ghi trùng');
    await translateAndApprove(techstore, 'en', new Map(flatten(kit2.en)));
    release1 = await publish(techstore, '1.0.0');
    const vi = await call('GET', `${techstore}/releases/${release1.id}/files/vi`, manager.token, undefined, true);
    const en = await call('GET', `${techstore}/releases/${release1.id}/files/en`, manager.token, undefined, true);
    assert.deepEqual(JSON.parse(vi.buffer.toString('utf8')), kit2.vi); check(true, 'gói vi xuất ra giống hệt cấu trúc lồng nhau của tệp nhập');
    assert.deepEqual(JSON.parse(en.buffer.toString('utf8')), kit2.en); check(true, 'gói en giữ cấu trúc lồng nhau của website');
    check(en.headers.get('x-content-sha256') === sha256(en.buffer), 'SHA-256 khớp nội dung tải về');
});

let changes;
await section('Phép thử 3 + Tình huống 2 (bước 1–2): nhập nguồn mới → xem khác biệt; khóa đổi cần kiểm tra lại, khóa không đổi giữ trạng thái', async () => {
    const before = rowsByKey(await list(techstore, 'en'));
    const imported = await ok('POST', `${techstore}/source-versions/import`, manager.token, { versionName: 'techstore-v2', rawJson: JSON.stringify(kit2.vi2) });
    check(imported.added === 1 && imported.changed === 2 && imported.deleted === 1, 'phân biệt 1 khóa mới, 2 khóa sửa, 1 khóa xóa');
    changes = await ok('GET', `${techstore}/source-versions/${imported.versionId}/changes`, manager.token);
    const byType = type => changes.filter(change => change.type === type).map(change => change.key).sort();
    assert.deepEqual(byType('changed'), ['login.form.error', 'login.welcome.title']);
    assert.deepEqual(byType('new'), ['login.form.show_password']);
    assert.deepEqual(byType('deleted'), ['login.form.demo_label']);
    check(true, 'màn hình khác biệt liệt kê đúng từng khóa và loại thay đổi');
    const after = rowsByKey(await list(techstore, 'en'));
    check(after['login.welcome.title'].status === 'needs_review' && after['login.form.error'].status === 'needs_review', 'bản dịch của khóa đổi nguồn chuyển "cần kiểm tra lại"');
    check(after['login.form.show_password'].status === 'missing' && !after['login.form.demo_label'], 'khóa mới chưa dịch, khóa xóa không còn trong danh sách dịch');
    const untouched = Object.keys(after).filter(key => !['login.welcome.title', 'login.form.error', 'login.form.show_password'].includes(key));
    check(untouched.length === keyCount - 3 && untouched.every(key => after[key].status === 'approved' && after[key].rowVersion === before[key].rowVersion), 'mọi khóa không đổi giữ nguyên trạng thái đã duyệt và phiên bản');
    const validation = await ok('GET', `${techstore}/releases/validate`, manager.token);
    check(!validation.ready, 'nguồn đã đổi nhưng chưa kiểm tra lại thì chưa được phát hành');
});

await section('Phép thử 2: nguồn có {name}, bản dịch thiếu hoặc thêm biến bị báo lỗi', async () => {
    await ok('PUT', `${techstore}/translations/assign`, manager.token, { localeCode: 'en', stringIds: Object.values(rowsByKey(await list(techstore, 'en'))).filter(row => row.status !== 'approved').map(row => row.stringId), userId: translator.id });
    const row = rowsByKey(await list(techstore, 'en', translator))['login.welcome.title'];
    check(row.placeholders.join() === '{name}', 'API cho biết biến cần giữ của chuỗi nguồn');
    let saved = await call('POST', `${techstore}/translations`, translator.token, { stringId: row.stringId, localeCode: 'en', value: 'Welcome back!', status: 'translated', expectedRowVersion: row.rowVersion });
    check(saved.status === 400 && saved.data.details.missing.join() === '{name}', 'thiếu {name} khi gửi duyệt → lỗi, chỉ rõ biến thiếu');
    saved = await call('POST', `${techstore}/translations`, translator.token, { stringId: row.stringId, localeCode: 'en', value: 'Welcome back, {name} {user}!', status: 'translated', expectedRowVersion: row.rowVersion });
    check(saved.status === 400 && saved.data.details.extra.join() === '{user}', 'thừa {user} → lỗi, chỉ rõ biến thừa');
    const imported = await ok('POST', `${techstore}/translations/import`, manager.token, { localeCode: 'en', rawJson: JSON.stringify({ login: { welcome: { title: 'Welcome back!' } } }), overwrite: true });
    check(imported.placeholderMismatch === 1 && imported.placeholderIssues[0].missing.join() === '{name}', 'nhập tệp sai biến: báo cáo đúng khóa và biến');
    const draft = rowsByKey(await list(techstore, 'en'))['login.welcome.title'];
    check(draft.status === 'draft', 'bản sai biến chỉ được lưu nháp, không coi là đã kiểm tra');
    const approve = await call('POST', `${techstore}/translations/${draft.translationId}/approve`, reviewer.token, { expectedRowVersion: draft.rowVersion });
    check(approve.status === 400, 'reviewer không duyệt được bản nháp sai biến');
});

await section('Phép thử 4: hai người lưu cùng bản dịch từ một phiên bản nền → phát hiện xung đột, không âm thầm ghi đè', async () => {
    const seenByTranslator = rowsByKey(await list(techstore, 'en', translator))['login.form.error'];
    const seenByManager = rowsByKey(await list(techstore, 'en'))['login.form.error'];
    check(seenByTranslator.rowVersion === seenByManager.rowVersion, 'hai người mở cùng phiên bản nền');
    const first = await call('POST', `${techstore}/translations`, translator.token, { stringId: seenByTranslator.stringId, localeCode: 'en', value: kit2.en2.login.form.error, status: 'translated', expectedRowVersion: seenByTranslator.rowVersion });
    const second = await call('POST', `${techstore}/translations`, manager.token, { stringId: seenByManager.stringId, localeCode: 'en', value: 'Wrong password, {count} tries left.', status: 'translated', expectedRowVersion: seenByManager.rowVersion });
    check(first.status === 200, 'người lưu trước thành công');
    check(second.status === 409 && second.data.details.currentValue === kit2.en2.login.form.error && second.data.details.currentRowVersion === seenByManager.rowVersion + 1, 'người lưu sau nhận 409 kèm bản mới nhất');
    check(rowsByKey(await list(techstore, 'en'))['login.form.error'].value === kit2.en2.login.form.error, 'CSDL giữ bản của người lưu trước');
});

await section('Phép thử 5 + Tình huống 2 (bước 3–4): sửa bản dịch bị ảnh hưởng → phát hành mới; ứng dụng đọc đúng gói, gói cũ không đổi', async () => {
    const enV1 = await publicFile(release1.id, 'en', release1.apiKey);
    check(enV1.status === 200 && enV1.sha === sha256(enV1.buffer), 'website đọc gói 1.0.0 bằng API key chỉ đọc');
    let app = await loadClient(release1.client, kit2.login, { apiBaseUrl: API, releaseId: release1.id, apiKey: release1.apiKey, defaultLocale: 'vi' });
    await app.manager.setLanguage('en');
    const byKey = key => app.document.querySelectorAll('[data-i18n]').find(element => element.dataset.i18n === key);
    check(byKey('login.form.heading').textContent === kit2.en.login.form.heading && byKey('login.welcome.title').textContent === kit2.en.login.welcome.title, 'ứng dụng hiển thị đúng chữ của gói 1.0.0');
    check(app.document.querySelectorAll('[data-i18n-placeholder]').every(element => element.attributes.placeholder === flatten(kit2.en).find(([key]) => key === element.dataset.i18nPlaceholder)?.[1]), 'placeholder ô nhập lấy từ gói');

    // Sửa bản dịch hiện tại (chưa phát hành) không làm đổi gói đã phát hành.
    const heading = rowsByKey(await list(techstore, 'en'))['login.form.heading'];
    await ok('PUT', `${techstore}/translations/assign`, manager.token, { localeCode: 'en', stringIds: [heading.stringId], userId: translator.id });
    await ok('POST', `${techstore}/translations`, translator.token, { stringId: heading.stringId, localeCode: 'en', value: 'Sign in now', status: 'translated', expectedRowVersion: heading.rowVersion });
    const stillV1 = await publicFile(release1.id, 'en', release1.apiKey);
    check(stillV1.sha === enV1.sha && stillV1.buffer.equals(enV1.buffer), 'sửa bản dịch hiện tại: gói 1.0.0 giữ nguyên từng byte');
    await app.manager.setLanguage('en');
    check(byKey('login.form.heading').textContent === kit2.en.login.form.heading, 'ứng dụng vẫn hiển thị nội dung đã phát hành, không lộ bản đang sửa');

    // Tình huống 2: sửa các bản bị ảnh hưởng theo v2, duyệt, phát hành 2.0.0.
    await translateAndApprove(techstore, 'en', new Map([...flatten(kit2.en2), ['login.form.heading', 'Sign in now']]));
    const release2 = await publish(techstore, '2.0.0');
    check(release2.sourceVersionName === 'techstore-v2' && release2.keyCount === flatten(kit2.vi2).length, 'gói 2.0.0 gắn với phiên bản nguồn v2');
    app = await loadClient(release2.client, kit2.login, { apiBaseUrl: API, releaseId: release2.id, apiKey: release2.apiKey, defaultLocale: 'vi' });
    await app.manager.setLanguage('en');
    check(byKey('login.welcome.title').textContent === 'Welcome back, Lan!' && byKey('login.form.error').textContent === 'Incorrect email or password. You have 3 attempts left.', 'ứng dụng đọc gói 2.0.0 và thay biến {name}, {count}');
    check(byKey('login.form.heading').textContent === 'Sign in now', 'gói mới có nội dung đã sửa');
    const oldAgain = await publicFile(release1.id, 'en', release1.apiKey);
    check(oldAgain.sha === enV1.sha, 'gói 1.0.0 vẫn đọc được và không đổi sau khi phát hành 2.0.0');
    check((await publicFile(release2.id, 'en', release1.apiKey)).status === 401 && (await publicFile(release1.id, 'en', null)).status === 401, 'API key chỉ đọc đúng một bản phát hành; thiếu key bị từ chối');
    check(JSON.parse(oldAgain.buffer.toString('utf8')).login.form.demo_label === kit2.en.login.form.demo_label && JSON.parse((await publicFile(release2.id, 'en', release2.apiKey)).buffer.toString('utf8')).login.form.demo_label === undefined, 'khóa đã xóa còn trong gói cũ, không có trong gói mới');
});

// ---------------- Dữ liệu website chưa có JSON (web test 3) ----------------
await section('Website chưa có JSON (web test 3): nguồn tách từ HTML nhập được và bản dịch đề xuất khớp đủ khóa', async () => {
    const beauty = await createProject('QA Beauty', 'qa-beauty', ['en']);
    const total = flatten(kit3.vi).length;
    const imported = await ok('POST', `${beauty}/source-versions/import`, manager.token, { versionName: 'beauty-v1', rawJson: JSON.stringify(kit3.vi) });
    check(imported.added === total && total >= 100, 'website mẫu có ít nhất 100 khóa và nhập đủ');
    const en = await ok('POST', `${beauty}/translations/import`, manager.token, { localeCode: 'en', rawJson: JSON.stringify(kit3.en) });
    check(en.created === total && en.notInSource === 0 && en.placeholderMismatch === 0, 'bản dịch đề xuất khớp đủ khóa nguồn');
    const stats = (await ok('GET', `${beauty}/translations/stats`, manager.token)).find(item => item.localeCode === 'en');
    check(stats.translated === total && stats.approved === 0, 'bản nhập đang chờ Reviewer duyệt');
});

console.log(`\n${results.filter(result => result.ok).length}/${results.length} nhóm đạt.`);
console.log(`Completed ${checks} required-test checks.`);
