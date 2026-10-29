import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../web-sample-import/', import.meta.url));
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const flatten = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : flatten(value, prefix + key + '.'));
const variables = value => [...new Set(value.match(/\{[A-Za-z0-9_.-]+\}/g) || [])].sort();
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
const htmlFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? htmlFiles(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);

for (const [kit, targets] of [['web-test-1-fashion', ['en', 'ja']], ['web-test-2-techstore', ['en']], ['web-test-3-beautyshop', ['en']]]) {
    const dir = path.join(root, kit, 'i18n'), source = new Map(flatten(read(path.join(dir, 'vi.json'))));
    for (const locale of targets) {
        const target = new Map(flatten(read(path.join(dir, locale + '.json'))));
        assert.deepEqual([...target.keys()].sort(), [...source.keys()].sort(), kit + '/' + locale + ': keys');
        check([...target.values()].every(value => value.trim() && !/^\[(en|ja|vi)\]/.test(value)), kit + '/' + locale + ': complete translations without QA filler');
        for (const [key, value] of target) assert.deepEqual(variables(value), variables(source.get(key)), kit + '/' + locale + '/' + key);
        check(true, kit + '/' + locale + ': exact placeholder sets');
    }
    const refs = htmlFiles(path.join(root, kit, 'site')).flatMap(file => [...readFileSync(file, 'utf8').matchAll(/\bdata-i18n(?:-placeholder|-title|-alt|-aria-label|-document-title)?="([^"]+)"/g)].map(match => match[1]));
    check(refs.length > 0 && refs.every(key => source.has(key)), kit + ': every HTML translation reference exists in the source');
}
const tech = path.join(root, 'web-test-2-techstore');
for (const [locale, files] of [['vi', ['vi.json', 'vi 2.json']], ['en', ['en.json', 'en2.json']]]) {
    const merged = Object.fromEntries(files.flatMap(file => flatten(read(path.join(tech, 'site/Json', file)))));
    assert.deepEqual(merged, Object.fromEntries(flatten(read(path.join(tech, 'i18n', locale + '.json')))));
    check(true, 'TechStore ' + locale + ': multi-file import equals prepared snapshot');
}
const vi2 = new Map(flatten(read(path.join(tech, 'i18n/v2/vi.json'))));
const en2 = new Map(flatten(read(path.join(tech, 'i18n/v2/en.json'))));
assert.deepEqual([...en2.keys()].sort(), [...vi2.keys()].sort());
for (const [key, value] of en2) { assert.ok(value.trim()); assert.deepEqual(variables(value), variables(vi2.get(key))); }
check(true, 'TechStore v2: complete keys and placeholders for scenario 2');
console.log(`Completed ${checks} sample import data checks.`);
