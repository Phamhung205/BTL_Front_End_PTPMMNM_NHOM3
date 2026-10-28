import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = JSON.parse(readFileSync(path.join(root, '.local/integrated-runtime.json'), 'utf8'));
assert.ok(process.env.TM_DEMO_ISOLATED === '1' && runtime.database === 'translation_manager_demo' && runtime.port === 3307);
function sql(query) {
    const result = spawnSync('C:/xampp/mysql/bin/mysql.exe', ['--host=127.0.0.1', '--port=3307', '--user=root', '--database=translation_manager_demo', '--batch', '--skip-column-names', '--execute', query], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
assert.equal(realpathSync(sql('SELECT @@datadir')).toLowerCase(), realpathSync(path.join(root, '.local/mysql-api')).toLowerCase());
let count = 0;
const check = (ok, label) => { assert.ok(ok, label); count++; console.log('PASS ' + label); };
const expected = ['admin_audit', 'locales', 'projects', 'project_locales', 'project_members', 'releases', 'release_api_keys', 'release_files', 'reviews', 'source_changes', 'source_strings', 'source_string_versions', 'source_versions', 'system_admin_guard', 'translations', 'translation_comments', 'translation_history', 'translation_memory', 'users'];
assert.deepEqual(sql('SHOW TABLES').split(/\r?\n/).sort(), expected.sort());
check(true, 'All 19 tables in the required database screenshot are present');
for (const slug of ['catalog-common-web', 'catalog-student-portal']) {
    const id = Number(sql("SELECT id FROM projects WHERE slug='" + slug + "'"));
    check(Number.isSafeInteger(id) && id > 0, slug + ': project exists');
    const total = Number(sql(`SELECT COUNT(*) FROM source_strings WHERE project_id=${id} AND status='active'`));
    check(total >= 100, slug + ': ' + total + ' active source keys (minimum 100)');
    check(sql(`SELECT GROUP_CONCAT(locale_code ORDER BY locale_code) FROM project_locales WHERE project_id=${id}`) === 'en,vi,zh', slug + ': three locales en/vi/zh');
    check(Number(sql(`SELECT COUNT(*) FROM source_strings WHERE project_id=${id} AND status='active' AND LOCATE('.',key_path)>0`)) > 0, slug + ': nested key paths');
    check(Number(sql(`SELECT COUNT(*) FROM source_strings WHERE project_id=${id} AND status='active' AND source_text LIKE '%{%'`)) > 0, slug + ': placeholder examples');
    const translated = sql(`SELECT COUNT(*),SUM(OCTET_LENGTH(t.value)>CHAR_LENGTH(t.value)) FROM translations t JOIN source_strings s ON s.id=t.string_id WHERE s.project_id=${id} AND s.status='active' AND t.status='approved'`).split('\t').map(Number);
    check(translated[0] === total * 2 && translated[1] > 0, slug + ': both target locales fully approved, with Unicode');
    check(Number(sql(`SELECT COUNT(*) FROM source_versions WHERE project_id=${id}`)) >= 2 && Number(sql(`SELECT COUNT(*) FROM releases WHERE project_id=${id}`)) >= 2, slug + ': two source versions and two frozen releases');
}
console.log(`Completed ${count} live demo requirement checks.`);
