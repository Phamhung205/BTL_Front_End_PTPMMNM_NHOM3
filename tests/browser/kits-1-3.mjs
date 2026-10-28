// Real-browser check of kit 1 (fashion, adapter over languages.js API) and kit 3 (beautyshop, VI/EN toggle).
// Usage: node kits-1-3.mjs <playwright-core/index.mjs> <frontend repo> <work dir>
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { prepareBrowserRun } from './environment.mjs';

const [pwPath, repo, work] = process.argv.slice(2);
prepareBrowserRun(repo, work);
const { chromium } = await import(pathToFileURL(pwPath).href);
const API = 'http://127.0.0.1:5088', PASSWORD = 'Demo@2026Admin!';
mkdirSync(path.join(work, 'shots'), { recursive: true });
let checks = 0;
const problems = [], log = (...a) => console.log(...a);
const check = (cond, msg) => { if (cond) { checks++; log('  PASS', msg); } else { log('  FAIL', msg); problems.push(msg); } };
const flatten = (node, prefix = '') => Object.entries(node).flatMap(([k, v]) => typeof v === 'string' ? [[prefix + k, v]] : flatten(v, prefix + k + '.'));
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
async function call(method, p, token, body, raw) {
    const r = await fetch(API + p, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (raw) return Buffer.from(await r.arrayBuffer());
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`${method} ${p} → ${r.status} ${JSON.stringify(data)}`);
    return data;
}
const login = async email => (await call('POST', '/api/auth/login', null, { email, password: PASSWORD })).token;
function unzipEntry(buffer, name) {
    const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let offset = buffer.readUInt32LE(end + 16);
    for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
        const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20), n = buffer.readUInt16LE(offset + 28), x = buffer.readUInt16LE(offset + 30), c = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
        if (buffer.toString('utf8', offset + 46, offset + 46 + n) === name) {
            const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
            const data = buffer.subarray(start, start + size);
            return method === 8 ? inflateRawSync(data) : data;
        }
        offset += 46 + n + x + c;
    }
    throw new Error('missing ' + name);
}
const [mgr, tr, rev] = await Promise.all(['manager', 'translator', 'reviewer'].map(role => login(role + '.demo@tm.local')));
const translatorId = (await call('POST', '/api/auth/login', null, { email: 'translator.demo@tm.local', password: PASSWORD })).userId;
const run = Date.now().toString(36);

let managerPage;
async function prepareRelease(kitName, targets) {
    const kit = path.join(repo, 'web-sample-import', kitName);
    const project = await call('POST', '/api/projects', mgr, { name: kitName + ' ' + run, slug: kitName + '-' + run, sourceLocaleCode: 'vi', targetLocaleCodes: targets,
        members: [{ email: 'translator.demo@tm.local', role: 'translator' }, { email: 'reviewer.demo@tm.local', role: 'reviewer' }] });
    const base = '/api/projects/' + project.id;
    if (!managerPage) {
        managerPage = await (await browser.newContext()).newPage();
        managerPage.on('pageerror', error => problems.push('[import UI] ' + error.message));
        await managerPage.goto('http://127.0.0.1:8095/login.php');
        await managerPage.fill('#email', 'manager.demo@tm.local'); await managerPage.fill('#password', PASSWORD);
        await managerPage.click('#login-btn'); await managerPage.waitForURL('**/dashboard.php');
    }
    const total = flatten(readJson(path.join(kit, 'i18n/vi.json'))).length;
    await managerPage.goto(`http://127.0.0.1:8095/pages/source-versions/index.php?project_id=${project.id}`);
    await managerPage.waitForSelector('#source-import-form:not(.hidden)');
    await managerPage.setInputFiles('#source-file', path.join(kit, 'i18n/vi.json'));
    await managerPage.waitForFunction(() => document.getElementById('source-json').value.length > 100);
    await managerPage.fill('#source-version-name', 'v1');
    await managerPage.click('#source-import-form button[type=submit]'); await managerPage.click('#modal-confirm-btn');
    await managerPage.waitForFunction(n => document.getElementById('source-import-result').textContent.includes(`Đã nhập ${n} khóa`), total);
    check(true, kitName + ': nhập nguồn qua giao diện web');
    for (const locale of targets) {
        await managerPage.goto(`http://127.0.0.1:8095/pages/translations/index.php?project_id=${project.id}`);
        await managerPage.waitForSelector('#translations-body tr');
        await managerPage.selectOption('#translation-locale', locale);
        await managerPage.waitForFunction(() => !document.getElementById('bulk-import-translations').disabled);
        await managerPage.click('#bulk-import-translations');
        await managerPage.setInputFiles('#translation-import-file', path.join(kit, 'i18n', locale + '.json'));
        await managerPage.waitForFunction(n => document.getElementById('modal-body').textContent.includes(`${n} khóa sau khi gộp`), total);
        await managerPage.click('#modal-confirm-btn');
        await managerPage.waitForFunction(n => !document.getElementById('translation-import-report').classList.contains('hidden') && document.getElementById('translation-import-report').textContent.includes(`${n} thêm mới`), total);
        const rows = await call('GET', `${base}/translations?locale=${locale}`, mgr);
        check(rows.length === total && rows.every(row => row.status === 'translated' && row.value?.trim()), kitName + '/' + locale + ': nhập đủ bản dịch thật qua web, chưa tự duyệt');
        const pending = (await call('GET', `${base}/translations?locale=${locale}`, mgr)).filter(row => row.status === 'translated').map(row => ({ translationId: row.translationId, expectedRowVersion: row.rowVersion }));
        if (pending.length) await call('POST', base + '/translations/approve', rev, { items: pending });
    }
    const release = await call('POST', base + '/releases', mgr, { versionName: '1.0.0' });
    const client = unzipEntry(await call('GET', `${base}/releases/${release.id}/integration`, mgr, null, true), 'translation-manager.js');
    const site = path.join(work, kitName);
    cpSync(path.join(kit, 'site'), site, { recursive: true });
    writeFileSync(path.join(site, 'translation-manager.js'), client);
    writeFileSync(path.join(site, 'translation-manager.config.js'), `window.TRANSLATION_MANAGER_CONFIG = ${JSON.stringify({ apiBaseUrl: API, releaseId: release.id, apiKey: release.apiKey, selector: '[data-translation-language]', defaultLocale: 'vi' }, null, 2)};\n`);
    writeFileSync(path.join(work, kitName + '.translation-manager.js'), client);
    return site;
}
const servers = [];
const serve = (dir, port) => { servers.push(spawn('C:\\xampp\\php\\php.exe', ['-S', '127.0.0.1:' + port, '-t', dir], { stdio: 'ignore', windowsHide: true })); return new Promise(r => setTimeout(r, 800)); };
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const waitText = (page, selector, text) => page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent.trim() === t, [selector, text], { timeout: 15000 });
async function verifyRendered(page, kitName, locale) {
    await page.waitForFunction(expected => document.documentElement.lang === expected, locale);
    const dictionary = Object.fromEntries(flatten(readJson(path.join(repo, 'web-sample-import', kitName, 'i18n', locale + '.json'))));
    const result = await page.evaluate(values => {
        const problems = []; let total = 0;
        for (const [attribute, target] of [['data-i18n', null], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-title', 'title'], ['data-i18n-document-title', 'documentTitle']]) {
            document.querySelectorAll('[' + attribute + ']').forEach(element => {
                total++;
                const key = element.getAttribute(attribute), value = values[key];
                const actual = target === 'documentTitle' ? document.title : target ? element.getAttribute(target) : element.textContent;
                if (typeof value !== 'string' || actual?.trim() !== value.trim()) problems.push({ key, actual, expected: value });
            });
        }
        return { total, problems };
    }, dictionary);
    check(result.total > 0 && result.problems.length === 0, kitName + '/' + locale + ': mọi vị trí có khóa trên ' + new URL(page.url()).pathname + ' khớp gói ' + JSON.stringify(result.problems));
}
try {
    log('Web test 1 (fashion): nguồn vi, đích en + ja; lớp tương thích thay languages.js');
    const site1 = await prepareRelease('web-test-1-fashion', ['en', 'ja']);
    await serve(site1, 8111);
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    page.on('pageerror', e => problems.push('[fashion] ' + e.message));
    await page.goto('http://127.0.0.1:8111/index.html');
    await waitText(page, '[data-i18n="loginTitle"]', 'Đăng nhập vào tài khoản');
    const options = await page.$$eval('#languageSelector option', items => items.map(item => item.value));
    check(options.join() === 'en,ja,vi', 'bộ chọn ngôn ngữ lấy đúng 3 ngôn ngữ từ gói: ' + options.join());
    await page.selectOption('#languageSelector', 'en');
    await waitText(page, '[data-i18n="loginTitle"]', 'Login to Your Account');
    check(await page.getAttribute('[data-i18n-placeholder]', 'placeholder') !== null, 'placeholder có khóa dịch');
    await page.selectOption('#languageSelector', 'ja');
    await waitText(page, '[data-i18n="loginTitle"]', 'アカウントにログイン');
    check((await page.textContent('[data-i18n="register"]')).trim() === '新規登録', 'hiển thị bản dịch tiếng Nhật hoàn chỉnh từ gói');
    await page.screenshot({ path: path.join(work, 'shots/fashion-ja.png'), fullPage: true });
    await page.reload();
    await waitText(page, '[data-i18n="loginTitle"]', 'アカウントにログイン');
    check(true, 'ngôn ngữ đã chọn được nhớ sau khi tải lại trang');
    page.on('dialog', d => d.accept());
    await page.evaluate(() => showPage('dashboardPage'));
    check(await page.inputValue('#dashboardLanguageSelector') === 'ja', 'bộ chọn ở dashboard đồng bộ ngôn ngữ');
    await page.selectOption('#dashboardLanguageSelector', 'en');
    await waitText(page, '[data-i18n="dashboardTitle"]', 'Dashboard');
    check(await page.inputValue('#languageSelector') === 'en', 'đổi ở dashboard đồng bộ lại bộ chọn chung');
    for (const locale of ['vi', 'en', 'ja']) {
        await page.selectOption('#dashboardLanguageSelector', locale);
        await verifyRendered(page, 'web-test-1-fashion', locale);
    }

    log('Web test 3 (beautyshop): chữ tách từ HTML, nút VI ⇄ EN');
    const site3 = await prepareRelease('web-test-3-beautyshop', ['en']);
    await serve(site3, 8113);
    const shop = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    shop.on('pageerror', e => problems.push('[beauty] ' + e.message));
    await shop.goto('http://127.0.0.1:8113/index.html');
    await waitText(shop, '#langLabel', 'VI');
    await shop.click('#langToggleBtn');
    await waitText(shop, '#langLabel', 'EN');
    const nav = await shop.textContent('a[href="pages/products.html"][data-i18n]');
    check(nav.trim() === 'Products', 'nút VI/EN chuyển menu sang tiếng Anh: ' + nav.trim());
    check((await shop.title()) === 'Lumière Beauty – Premium Cosmetics', 'tiêu đề trang theo gói: ' + await shop.title());
    await shop.screenshot({ path: path.join(work, 'shots/beauty-en.png'), fullPage: false });
    await shop.goto('http://127.0.0.1:8113/pages/about.html');
    await waitText(shop, '#langLabel', 'EN');
    check(true, 'trang con (pages/about.html) đọc gói và nhớ ngôn ngữ EN');
    await shop.click('#langToggleBtn');
    await waitText(shop, '#langLabel', 'VI');
    check((await shop.textContent('a[href="../index.html"][data-i18n]')).trim() === 'Trang Chủ', 'quay lại tiếng Việt');
    for (const file of ['index.html', 'pages/products.html', 'pages/about.html', 'pages/contact.html']) {
        await shop.goto('http://127.0.0.1:8113/' + file);
        await shop.waitForFunction(() => ['vi', 'en'].includes(document.documentElement.lang));
        for (const locale of ['en', 'vi']) {
            await shop.evaluate(code => TranslationManager.setLanguage(code), locale);
            await verifyRendered(shop, 'web-test-3-beautyshop', locale);
        }
    }
} catch (error) { problems.push('EXCEPTION: ' + error.message); console.error(error); }
finally { await browser.close(); servers.forEach(s => s.kill()); }
log(problems.length ? `\n${problems.length} vấn đề:\n - ` + problems.join('\n - ') : '\nKhông có vấn đề nào.');
console.log(`Completed ${checks} real Chrome checks; ${problems.length} problems.`);
process.exitCode = problems.length ? 1 : 0;
