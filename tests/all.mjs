import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = JSON.parse(readFileSync(path.join(root, '.local/integrated-runtime.json'), 'utf8'));
if (process.env.TM_DEMO_ISOLATED !== '1' || runtime.database !== 'translation_manager_demo' || runtime.port !== 3307) throw new Error('Run scripts/test-all.ps1 against the isolated demo database only.');
process.env.API_BASE_URL = 'http://127.0.0.1:5088';
process.env.FRONTEND_BASE_URL = 'http://127.0.0.1:8095';
const mysql = 'C:/xampp/mysql/bin/mysql.exe', php = 'C:/xampp/php/php.exe';
// Backend độc lập: biến môi trường TM_STANDALONE_BACKEND hoặc repo Backend đặt cạnh Frontend.
const externalBackend = [
    process.env.TM_STANDALONE_BACKEND,
    path.join(root, '..', 'BTL_Back_End_PTPMMNM_NHOM3')
].find(candidate => candidate && existsSync(path.join(candidate, 'TranslationManager.Api.csproj')));
const results = [], log = []; mkdirSync(path.join(root, 'artifacts'), { recursive: true });
function sql(query) {
    const res = spawnSync(mysql, ['--host=127.0.0.1', '--port=3307', '--user=root', '--database=translation_manager_demo', '--batch', '--skip-column-names', '--execute', query], { encoding: 'utf8', windowsHide: true });
    if (res.status !== 0) throw new Error(res.stderr || 'SQL check failed'); return res.stdout.trim();
}
const snapshot = () => ({
    users: sql('SELECT id FROM users ORDER BY id').split(/\s+/).filter(Boolean).map(Number),
    projects: sql('SELECT id FROM projects ORDER BY id').split(/\s+/).filter(Boolean).map(Number),
    audit: Number(sql('SELECT COALESCE(MAX(id),0) FROM admin_audit'))
});
const before = snapshot();
const fixture = JSON.parse(readFileSync(path.join(root, '.local/demo-accounts.json'), 'utf8'));
function run(label, executable, args, cwd = root) {
    console.log('RUN ' + label);
    const started = Date.now(), result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, KEEP_WORKFLOW_QA: '' } });
    const output = (result.stdout || '') + (result.stderr || '') + (result.error?.message || ''); log.push('\n=== ' + label + ' ===\n' + output);
    const checked = output.match(/Completed (\d+) /)?.[1], groups = output.match(/ℹ pass (\d+)/)?.[1];
    results.push({ label, success: result.status === 0, checks: checked ? Number(checked) : null, groups: groups ? Number(groups) : null, seconds: Math.round((Date.now() - started) / 100) / 10 });
    console.log((result.status === 0 ? 'PASS ' : 'FAIL ') + label + (checked ? ' (' + checked + ' checks)' : groups ? ' (' + groups + ' groups)' : ''));
    if (result.status !== 0) console.log(output.slice(-7000));
}
function files(directory, extension) { return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() && !['.git', '.local', 'backend', 'node_modules', 'artifacts', 'bin', 'obj'].includes(entry.name) ? files(path.join(directory, entry.name), extension) : entry.isFile() && extension.some(ext => entry.name.endsWith(ext)) ? [path.join(directory, entry.name)] : []); }
try {
    // The demo API is running: never overwrite its loaded DLL on Windows.
    run('Build bundled Backend', 'dotnet', ['build', 'backend/TranslationManager.Backend/TranslationManager.Api.csproj', '--no-restore', '--output', '.local/build/suite-verification']);
    if (externalBackend) run('Build independent Backend', 'dotnet', ['build', 'TranslationManager.Api.csproj'], externalBackend);
    else results.push({ label: 'Build independent Backend (không tìm thấy repo Backend; đặt TM_STANDALONE_BACKEND)', success: false, checks: null, groups: null });
    const lint = [];
    for (const file of files(root, ['.php', '.js', '.mjs'])) {
        const res = spawnSync(file.endsWith('.php') ? php : process.execPath, [file.endsWith('.php') ? '-l' : '--check', file], { encoding: 'utf8', windowsHide: true });
        if (res.status !== 0) lint.push(res.stdout + res.stderr);
    }
    results.push({ label: 'PHP / JavaScript syntax', success: lint.length === 0, checks: null, groups: null }); log.push(lint.join('\n')); console.log(lint.length ? 'FAIL syntax' : 'PASS PHP / JavaScript syntax');
    for (const test of ['sample-imports', 'demo-requirements', 'source-workspace', 'source-gateway', 'workflow-ui', 'admin-ui', 'workflow-gateway']) run(test, process.execPath, ['tests/' + test + '.mjs']);
    run('Translation create/delete on disposable database', process.execPath, ['tests/translation-actions.mjs']);
    run('Source document validation', 'dotnet', ['run', '--project', 'tests/source-document/SourceDocument.Tests.csproj']);
    run('Atomic project setup and scenario 2', process.execPath, ['tests/project-onboarding.mjs']);
    for (const test of ['integration', 'workflow-integration', 'admin-integration']) run(test, process.execPath, ['tests/' + test + '.mjs']);
    for (const test of ['duc-translation-release', 'duc-import-security', 'manh-source-management']) run(test, process.execPath, ['backend/TranslationManager.Backend/tests/api/' + test + '.test.mjs', 'http://127.0.0.1:5088']);
    run('Đề tài 3: 5 phép thử bắt buộc + 2 tình huống (website mẫu)', process.execPath, ['tests/required-tests.mjs']);
} finally {
    // Remove only records created during this run; baseline/demo data remains in place.
    try {
        const after = snapshot(), users = after.users.filter(id => !before.users.includes(id)), projects = after.projects.filter(id => !before.projects.includes(id));
        const login = await fetch('http://127.0.0.1:5088/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fixture.accounts.find(account => account.role === 'admin').email, password: fixture.password }) });
        if (!login.ok) throw new Error('Demo Admin unavailable during cleanup'); const { token } = await login.json();
        for (const id of projects) { const res = await fetch('http://127.0.0.1:5088/api/admin/projects/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }); if (res.status !== 204) throw new Error('Cannot clean QA project ' + id); }
        if (users.length) {
            const inUse = Number(sql('SELECT COUNT(*) FROM project_members WHERE user_id IN (' + users.join(',') + ')'));
            if (inUse) throw new Error('QA user has membership outside QA projects; preserving accounts');
            sql('DELETE FROM users WHERE id IN (' + users.join(',') + ')');
        }
        const conditions = [];
        if (users.length) conditions.push("(target_type='user' AND target_id IN (" + users.join(',') + '))');
        if (projects.length) conditions.push("(target_type='project' AND target_id IN (" + projects.join(',') + '))');
        if (conditions.length) sql('DELETE FROM admin_audit WHERE id>' + Number(before.audit) + ' AND (' + conditions.join(' OR ') + ')');
        results.push({ label: 'Clean temporary QA data, retain demo fixture', success: true });
    } catch (error) { log.push('Cleanup error: ' + error.message); results.push({ label: 'Clean temporary QA data', success: false }); }
    const passed = results.filter(result => result.success).length, checks = results.reduce((n, result) => n + (result.checks || 0), 0), groups = results.reduce((n, result) => n + (result.groups || 0), 0);
    const date = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const report = '# Báo cáo kiểm thử toàn bộ\n\n' + date + '\n\nMôi trường: PHP 8095 → C# 5088 → MariaDB riêng 3307, database `translation_manager_demo`.\n\n' + `${passed}/${results.length} hạng mục đạt; ${checks} kiểm tra và ${groups} nhóm API.\n\n` + '| Hạng mục | Kết quả | Số kiểm tra / nhóm |\n| --- | --- | --- |\n' + results.map(result => `| ${result.label} | ${result.success ? 'PASS' : 'FAIL'} | ${result.checks || result.groups || '—'} |`).join('\n') + '\n\nDữ liệu demo gốc được giữ lại. Log chi tiết: test-all.log.\n';
    writeFileSync(path.join(root, 'artifacts/test-report.md'), report); writeFileSync(path.join(root, 'artifacts/test-report.json'), JSON.stringify({ date, passed, total: results.length, checks, groups, results }, null, 2)); writeFileSync(path.join(root, 'artifacts/test-all.log'), log.join('\n'));
    console.log(`${passed}/${results.length} suites passed · ${checks} checks · ${groups} API groups. Report: artifacts/test-report.md`);
    if (passed !== results.length) process.exitCode = 1;
}
