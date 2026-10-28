import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export function prepareBrowserRun(repo, work) {
    assert.ok(repo && work, 'Usage: node tests/browser/<test>.mjs <playwright-core/index.mjs> <repo> <new artifacts directory>');
    assert.equal(process.env.TM_DEMO_ISOLATED, '1', 'Start scripts/prepare-demo.ps1 and set TM_DEMO_ISOLATED=1.');
    const runtime = JSON.parse(readFileSync(path.join(repo, '.local/integrated-runtime.json'), 'utf8'));
    assert.equal(runtime.database, 'translation_manager_demo');
    assert.equal(runtime.port, 3307);
    const db = spawnSync('C:/xampp/mysql/bin/mysql.exe', ['--host=127.0.0.1', '--port=3307', '--user=root', '--batch', '--skip-column-names', '--execute', 'SELECT @@datadir'], { encoding: 'utf8', windowsHide: true });
    assert.equal(db.status, 0, db.stderr);
    assert.equal(realpathSync(db.stdout.trim()).toLowerCase(), realpathSync(path.join(repo, '.local/mysql-api')).toLowerCase());
    // Keep local release keys/screenshots in ignored artifacts, never delete an existing directory.
    const relative = path.relative(path.resolve(repo, 'artifacts'), path.resolve(work));
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Output must be under repo/artifacts.');
    assert.ok(!existsSync(work), 'Use a new output directory for each browser run.');
    mkdirSync(work, { recursive: true });
}
