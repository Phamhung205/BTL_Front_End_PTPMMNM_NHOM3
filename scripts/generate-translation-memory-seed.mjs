import fs from 'node:fs';
import path from 'node:path';

const localesDir = process.argv[2];
const outputFile = process.argv[3] || 'backend/TranslationManager.Backend/database/seeds/translation_memory_common_web.sql';
if (!localesDir) throw new Error('Usage: node scripts/generate-translation-memory-seed.mjs <path-to-common-ui-translations/locales> [output.sql]');

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const flatten = (value, prefix = '', into = new Map()) => {
    if (typeof value === 'string') into.set(prefix, value);
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, into);
    }
    return into;
};
const escapeSql = value => `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "''").replaceAll('\0', '\\0').replaceAll('\n', '\\n').replaceAll('\r', '\\r')}'`;
const canonical = value => value.normalize('NFC').trim().replace(/\s+/gu, ' ');
// English and Chinese already have >=1,000 records in the live database.
const targetFiles = new Map([
    ['de', 'de'], ['es', 'es'], ['fr', 'fr'], ['ja', 'ja'], ['ko', 'ko'],
    ['pt', 'pt-BR'], ['ru', 'ru'], ['th', 'th']
]);
const vi = read(path.join(localesDir, 'vi.json'));
const en = read(path.join(localesDir, 'en.json'));
const uiSources = [];
for (const dataset of ['common-web', 'student-portal']) {
    const root = path.resolve('examples/catalog', dataset);
    if (!fs.existsSync(root)) continue;
    const viStrings = flatten(read(path.join(root, 'vi.json')));
    const enStrings = flatten(read(path.join(root, 'en.json')));
    for (const [key, viText] of viStrings) {
        const enText = enStrings.get(key);
        if (canonical(viText) && canonical(enText || '')) uiSources.push([viText, enText]);
    }
}

const statements = [
    '-- Common website UI translation memory seed (MIT source: https://github.com/deviro/common-ui-translations).',
    '-- Vietnamese source phrases come from this repository\'s common-web/student-portal demo JSON.',
    '-- Each target language receives at least 1,000 distinct Vietnamese-to-target pairs.'
];
const counts = {};
for (const [locale, fileCode] of targetFiles) {
    const target = read(path.join(localesDir, `${fileCode}.json`));
    const seen = new Set();
    const pairs = [];
    const add = (source, translation) => {
        if (typeof source !== 'string' || typeof translation !== 'string') return;
        source = canonical(source);
        translation = canonical(translation);
        if (!source || !translation) return;
        const key = `${source}\u0000${translation}`;
        if (seen.has(key)) return;
        seen.add(key);
        pairs.push([source, translation]);
    };
    for (const [viText, enText] of uiSources) add(viText, target[enText]);
    if (pairs.length < 1000) {
        for (const [englishText, viText] of Object.entries(vi)) add(viText, target[englishText]);
    }
    if (pairs.length < 1000) throw new Error(`${locale}: only ${pairs.length} valid unique pairs found`);
    const selected = pairs.slice(0, 1000);
    counts[locale] = selected.length;
    statements.push(`\nINSERT IGNORE INTO translation_memory(source_locale_code,target_locale_code,source_text,target_text,source_hash,target_hash) VALUES\n` +
        selected.map(([source, translation]) => `('vi',${escapeSql(locale)},${escapeSql(source)},${escapeSql(translation)},SHA2(TRIM(${escapeSql(source)}),256),SHA2(TRIM(${escapeSql(translation)}),256))`).join(',\n') + ';');
}
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, statements.join('\n'), 'utf8');
console.log(JSON.stringify({ outputFile, counts, bytes: fs.statSync(outputFile).size }, null, 2));
