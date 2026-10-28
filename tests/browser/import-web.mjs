// Real-browser check: import web test 2 through the web UI, scenario 1 + 2, customer site reads the package.
// Usage: node import-web.mjs <playwright-core/index.mjs> <frontend repo> <work dir>
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { prepareBrowserRun } from './environment.mjs';

const [pwPath, repo, work] = process.argv.slice(2);
prepareBrowserRun(repo, work);
const { chromium } = await import(pathToFileURL(pwPath).href);
const FE = 'http://127.0.0.1:8095', PASSWORD = 'Demo@2026Admin!';
const kit = path.join(repo, 'web-sample-import/web-test-2-techstore');
const shots = path.join(work, 'shots'); mkdirSync(shots, { recursive: true });
let checks = 0;
const problems = [], log = (...a) => console.log(...a);
const check = (cond, msg) => { if (cond) { checks++; log('  PASS', msg); } else { log('  FAIL', msg); problems.push(msg); } };
const shot = (page, name) => page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });

function unzipEntry(buffer, name) {
    const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let offset = buffer.readUInt32LE(end + 16);
    for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
        const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20), nameLength = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
        if (buffer.toString('utf8', offset + 46, offset + 46 + nameLength) === name) {
            const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
            const data = buffer.subarray(start, start + size);
            return method === 8 ? inflateRawSync(data) : data;
        }
        offset += 46 + nameLength + extra + comment;
    }
    throw new Error('missing ' + name);
}

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
async function session(email, label) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', e => problems.push(`[${label}] pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|status of 4\d\d/.test(m.text())) problems.push(`[${label}] console: ${m.text()}`); });
    await page.goto(FE + '/login.php');
    await page.fill('#email', email); await page.fill('#password', PASSWORD);
    await page.click('#login-btn'); await page.waitForURL('**/dashboard.php');
    return page;
}
const servers = [];
function serve(dir, port) {
    const child = spawn('C:\\xampp\\php\\php.exe', ['-S', '127.0.0.1:' + port, '-t', dir], { stdio: 'ignore', windowsHide: true });
    servers.push(child);
    return new Promise(resolve => setTimeout(resolve, 800));
}
async function waitText(page, selector, text, timeout = 15000) {
    await page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent.includes(t), [selector, text], { timeout });
}

const run = Date.now().toString(36);
let projectId;
try {
    log('1) Manager tạo dự án qua giao diện (nguồn vi, đích en, thêm Translator/Reviewer)');
    const mgr = await session('manager.demo@tm.local', 'manager');
    await mgr.goto(FE + '/pages/projects/create.php');
    await mgr.fill('#project-name', 'TechStore web test 2 ' + run);
    await mgr.fill('#project-source-locale', 'vi');
    await mgr.uncheck('input[name="targetLocales"][value="vi"]');
    await mgr.check('input[name="targetLocales"][value="en"]');
    for (const [email, role] of [['translator.demo@tm.local', 'translator'], ['reviewer.demo@tm.local', 'reviewer']]) {
        await mgr.click('#project-add-member');
        const row = mgr.locator('#project-initial-members > div').last();
        await row.locator('input[type=email]').fill(email); await row.locator('select').selectOption(role);
    }
    await mgr.click('#create-project-btn');
    await mgr.waitForURL(/projects\/detail\.php\?id=\d+/);
    projectId = new URL(mgr.url()).searchParams.get('id');
    check(Boolean(projectId), 'tạo dự án thành công, id ' + projectId);

    log('2) Nhập nguồn: chọn cùng lúc Json/vi.json + "Json/vi 2.json" (gộp thành một phiên bản)');
    await mgr.goto(`${FE}/pages/source-versions/index.php?project_id=${projectId}`);
    await mgr.waitForSelector('#source-import-form:not(.hidden)');
    await mgr.setInputFiles('#source-file', [path.join(kit, 'site/Json/vi.json'), path.join(kit, 'site/Json/vi 2.json')]);
    await waitText(mgr, '#source-file-summary', 'Đã gộp 2 tệp');
    check((await mgr.textContent('#source-file-summary')).includes('37 khóa'), 'gộp 2 tệp thành 37 khóa');
    await mgr.fill('#source-version-name', 'techstore-v1');
    await mgr.click('#source-import-form button[type=submit]');
    await mgr.waitForSelector('#modal-container:not(.hidden)');
    check((await mgr.textContent('#modal-body')).includes('+37 khóa mới'), 'xem trước: +37 khóa mới');
    await shot(mgr, '01-source-import-preview');
    await mgr.click('#modal-confirm-btn');
    await waitText(mgr, '#source-import-result', 'Đã nhập 37 khóa');
    check(true, 'nhập nguồn qua web: 37 khóa');

    log('3) Nhập bản dịch có sẵn: chọn Json/en.json + Json/en2.json');
    await mgr.goto(`${FE}/pages/translations/index.php?project_id=${projectId}`);
    await mgr.waitForSelector('#translations-body tr');
    await mgr.click('#bulk-import-translations');
    await mgr.setInputFiles('#translation-import-file', [path.join(kit, 'site/Json/en.json'), path.join(kit, 'site/Json/en2.json')]);
    await waitText(mgr, '#modal-body', '37 khóa sau khi gộp');
    await shot(mgr, '02-translation-import-dialog');
    await mgr.click('#modal-confirm-btn');
    await mgr.waitForSelector('#translation-import-report:not(.hidden)');
    const report = await mgr.textContent('#translation-import-report');
    check(report.includes('37 thêm mới') && report.includes('0 sai biến'), 'báo cáo nhập: 37 thêm mới');
    await mgr.waitForFunction(() => document.getElementById('translation-progress')?.textContent.includes('37 chờ duyệt'));
    check(true, 'tiến độ: 37 chờ duyệt, chưa tự duyệt');
    await shot(mgr, '03-translation-import-report');

    log('4) Reviewer duyệt tất cả đang chờ');
    const rev = await session('reviewer.demo@tm.local', 'reviewer');
    await rev.goto(`${FE}/pages/reviews/index.php?project_id=${projectId}`);
    await rev.waitForSelector('#translations-body tr');
    await rev.click('#bulk-approve-all'); await rev.click('#confirm-action-btn');
    await rev.waitForFunction(() => document.getElementById('translation-progress')?.textContent.includes('37/37 đã duyệt'));
    check(true, 'reviewer duyệt 37/37');

    log('5) Manager phát hành 1.0.0, lấy cấu hình + client tích hợp');
    async function publishAndCollect(version, siteDir) {
        await mgr.goto(`${FE}/pages/releases/index.php?project_id=${projectId}`);
        await mgr.waitForSelector('#release-form:not(.hidden)');
        await mgr.waitForFunction(() => !document.getElementById('release-publish').disabled);
        await mgr.fill('#release-version', version); await mgr.fill('#release-note', 'Phát hành ' + version + ' từ giao diện');
        await mgr.click('#release-publish'); await mgr.click('#confirm-action-btn');
        await mgr.waitForSelector('#release-api-key-result:not(.hidden)');
        const config = await mgr.inputValue('#release-api-config-value');
        cpSync(path.join(kit, 'site'), siteDir, { recursive: true });
        writeFileSync(path.join(siteDir, 'translation-manager.config.js'), config);
        const [download] = await Promise.all([mgr.waitForEvent('download'), mgr.getByRole('button', { name: 'Tải client tích hợp API' }).first().click()]);
        const zip = readFileSync(await download.path());
        writeFileSync(path.join(siteDir, 'translation-manager.js'), unzipEntry(zip, 'translation-manager.js'));
        return { config, zipName: download.suggestedFilename() };
    }
    const siteV1 = path.join(work, 'site-v1');
    const p1 = await publishAndCollect('1.0.0', siteV1);
    check(/apiKey": "tmr_read_/.test(p1.config) && p1.zipName.endsWith('api-integration.zip'), 'nhận API key chỉ đọc và client tích hợp');
    await shot(mgr, '04-release-1-api-key');

    log('6) Website TechStore (web test 2) đọc gói 1.0.0');
    await serve(siteV1, 8102);
    const shopContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const shop = await shopContext.newPage();
    shop.on('pageerror', e => problems.push('[site] pageerror: ' + e.message));
    await shop.goto('http://127.0.0.1:8102/login.html');
    await waitText(shop, '[data-i18n="login.form.heading"]', 'Log In');
    check(await shop.getAttribute('#loginEmail', 'placeholder') === 'your@email.com', 'trang đăng nhập hiển thị tiếng Anh từ gói (mặc định en)');
    await shop.click('#langBtn'); await shop.locator('.lang-option', { hasText: 'Tiếng Việt' }).click();
    await waitText(shop, '[data-i18n="login.form.heading"]', 'Đăng Nhập');
    check((await shop.textContent('#langLabel')).trim() === 'VI', 'menu ngôn ngữ của website chuyển sang Tiếng Việt');
    await shop.click('#langBtn'); await shop.locator('.lang-option', { hasText: 'English' }).click();
    await waitText(shop, '[data-i18n="login.welcome.title"]', 'Welcome Back!');
    await shot(shop, '05-site-login-en-v1');
    await shop.goto('http://127.0.0.1:8102/index.html');
    await shop.selectOption('#langSelect', 'vi');
    await waitText(shop, '[data-i18n="home.title"]', 'Khám Phá Tương Lai Công Nghệ');
    await shop.selectOption('#langSelect', 'en');
    await waitText(shop, '[data-i18n="home.title"]', 'Discover the Future of Technology');
    check(true, 'trang chủ đổi vi ⇄ en bằng bộ chọn data-translation-language');

    log('7) Tình huống 2: nhập nguồn v2 → xem khác biệt');
    await mgr.goto(`${FE}/pages/source-versions/index.php?project_id=${projectId}`);
    await mgr.waitForSelector('#source-import-form:not(.hidden)');
    await mgr.setInputFiles('#source-file', path.join(kit, 'i18n/v2/vi.json'));
    await mgr.waitForFunction(() => document.getElementById('source-json').value.length > 100);
    await mgr.fill('#source-version-name', 'techstore-v2');
    await mgr.click('#source-import-form button[type=submit]');
    await mgr.waitForSelector('#modal-container:not(.hidden)');
    const preview = await mgr.textContent('#modal-body');
    check(preview.includes('+1 khóa mới') && preview.includes('2 khóa sửa nội dung') && preview.includes('1 khóa sẽ bị đánh dấu xóa') && preview.includes('login.form.demo_label'), 'xem trước v2: +1 mới, 2 sửa, 1 xóa (login.form.demo_label)');
    await shot(mgr, '06-source-v2-preview');
    await mgr.click('#modal-confirm-btn');
    await waitText(mgr, '#source-import-result', '1 mới, 2 thay đổi/khôi phục, 1 đã xóa');
    await mgr.locator('#versions-body tr', { hasText: 'techstore-v2' }).getByRole('button', { name: 'Xem thay đổi' }).click();
    await waitText(mgr, '#source-diff-status', '4 khóa thay đổi');
    const diff = await mgr.textContent('#changes-body');
    check(['login.welcome.title', 'login.form.error', 'login.form.show_password', 'login.form.demo_label'].every(key => diff.includes(key)), 'bảng khác biệt có đủ 4 khóa');
    await shot(mgr, '07-source-v2-diff');

    log('8) Sửa bản dịch bị ảnh hưởng (kiểm tra biến) và duyệt');
    await mgr.goto(`${FE}/pages/translations/index.php?project_id=${projectId}`);
    await mgr.waitForSelector('#translations-body tr');
    await mgr.selectOption('#translation-status', 'needs_review');
    await mgr.waitForFunction(() => document.getElementById('translation-count')?.textContent.startsWith('2 khóa'));
    check(true, 'lọc "Cần sửa / nguồn thay đổi": 2 khóa');
    async function editRow(key, value, expectError) {
        await mgr.locator('#translations-body tr', { hasText: key }).getByRole('button', { name: 'Dịch / Gửi duyệt' }).click();
        await mgr.fill('#edit-translation-value', value); await mgr.selectOption('#edit-translation-status', 'translated');
        await mgr.click('#modal-confirm-btn');
        if (expectError) { await mgr.waitForSelector('#translation-edit-error:not(.hidden)'); return mgr.textContent('#translation-edit-error'); }
        await mgr.waitForSelector('#modal-container', { state: 'hidden' });
        return null;
    }
    const placeholderError = await editRow('login.welcome.title', 'Welcome back!', true);
    check(/biến/i.test(placeholderError), 'thiếu {name} bị báo lỗi ngay trên giao diện: ' + placeholderError);
    await shot(mgr, '08-placeholder-error');
    await mgr.fill('#edit-translation-value', 'Welcome back, {name}!'); await mgr.click('#modal-confirm-btn');
    await mgr.waitForSelector('#modal-container', { state: 'hidden' });
    await mgr.waitForFunction(() => document.getElementById('translation-count')?.textContent.startsWith('1 khóa'));
    await editRow('login.form.error', 'Incorrect email or password. You have {count} attempts left.', false);
    await mgr.selectOption('#translation-status', 'missing');
    await mgr.waitForFunction(() => document.getElementById('translation-count')?.textContent.startsWith('1 khóa'));
    await editRow('login.form.show_password', 'Show password', false);
    await rev.goto(`${FE}/pages/reviews/index.php?project_id=${projectId}`);
    await rev.waitForSelector('#translations-body tr');
    await rev.click('#bulk-approve-all'); await rev.click('#confirm-action-btn');
    await rev.waitForFunction(() => document.getElementById('translation-progress')?.textContent.includes('37/37 đã duyệt'));
    check(true, 'reviewer duyệt lại 3 bản bị ảnh hưởng → 37/37');

    log('9) Phát hành 2.0.0; website mới đọc 2.0.0, website cũ vẫn đọc 1.0.0');
    const siteV2 = path.join(work, 'site-v2');
    await publishAndCollect('2.0.0', siteV2);
    await serve(siteV2, 8103);
    const shop2 = await shopContext.newPage();
    await shop2.goto('http://127.0.0.1:8103/login.html');
    await waitText(shop2, '[data-i18n="login.welcome.title"]', 'Welcome back, Lan!');
    check((await shop2.textContent('[data-i18n="login.form.error"]')).trim() === 'Incorrect email or password. You have 3 attempts left.', 'gói 2.0.0 có câu mới và thay biến {name}/{count}');
    await shot(shop2, '09-site-login-en-v2');
    await shop.goto('http://127.0.0.1:8102/login.html');
    await waitText(shop, '[data-i18n="login.welcome.title"]', 'Welcome Back!');
    check((await shop.textContent('[data-i18n="login.form.demo_label"]')).trim() === 'Demo', 'website trỏ gói 1.0.0 vẫn hiển thị nội dung cũ (gói đã chốt không đổi)');
    await mgr.goto(`${FE}/pages/releases/index.php?project_id=${projectId}`);
    await mgr.waitForSelector('#releases-list > *');
    check((await mgr.textContent('#releases-list')).includes('2.0.0') && (await mgr.textContent('#releases-list')).includes('1.0.0'), 'trang Phát hành giữ cả 2 bản');
    await shot(mgr, '10-releases-list');
} catch (error) {
    problems.push('EXCEPTION: ' + error.message);
    console.error(error);
} finally {
    await browser.close();
    servers.forEach(child => child.kill());
}
log(problems.length ? `\n${problems.length} vấn đề:\n - ` + problems.join('\n - ') : '\nKhông có vấn đề nào.');
console.log(`Completed ${checks} real Chrome checks; ${problems.length} problems.`);
process.exitCode = problems.length ? 1 : 0;
