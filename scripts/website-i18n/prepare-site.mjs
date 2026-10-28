// Chuẩn bị website tĩnh để import vào Translation Manager (không cần thư viện ngoài).
//
//   node scripts/website-i18n/prepare-site.mjs <thư-mục-website> <thư-mục-đầu-ra> [--locale vi] [--dictionary vi.json ...]
//
// - Sao chép website sang thư mục đầu ra (không sửa bản gốc).
// - Gắn data-i18n vào chữ hiển thị trong mọi tệp .html; placeholder/title dùng data-i18n-placeholder/-title,
//   <title> dùng data-i18n-document-title. Phần tử đã có data-i18n được giữ nguyên khóa.
// - Ghi i18n/<locale>.json (JSON lồng nhau, ngôn ngữ nguồn) để nhập ở trang Phiên bản nguồn.
// - --dictionary: JSON nguồn sẵn có (khóa → chữ). Chữ trùng nội dung dùng lại khóa đó, mọi khóa trong từ điển
//   được giữ trong tệp nguồn để bản dịch cũ (en.json, ja.json...) nhập vào khớp khóa.
// Không xử lý chữ nằm trong JavaScript (alert, toast...) hoặc thuộc tính alt/aria-label.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((value, index) => !value.startsWith('--') && !['--locale', '--dictionary'].includes(args[index - 1]));
if (positional.length !== 2) {
    console.error('Cách dùng: node scripts/website-i18n/prepare-site.mjs <website> <đầu-ra> [--locale vi] [--dictionary vi.json ...]');
    process.exit(2);
}
const [siteDirectory, outputDirectory] = positional.map(value => path.resolve(value));
const locale = args.includes('--locale') ? args[args.indexOf('--locale') + 1] : 'vi';
if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale || '')) throw new Error('Mã ngôn ngữ nguồn không hợp lệ: ' + locale);
const dictionaryFiles = args.flatMap((value, index) => value === '--dictionary' ? [path.resolve(args[index + 1])] : []);
if (!existsSync(siteDirectory)) throw new Error('Không tìm thấy website: ' + siteDirectory);
if (existsSync(outputDirectory) && readdirSync(outputDirectory).length) throw new Error('Thư mục đầu ra phải trống: ' + outputDirectory);

const SKIP_CONTENT = new Set(['script', 'style', 'noscript', 'svg', 'code', 'pre', 'template', 'textarea', 'option', 'select']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ATTRIBUTES = ['placeholder', 'title'];
const TAG = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/gi;
const ATTRIBUTE = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function decode(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
        const lower = entity.toLowerCase();
        if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
        if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
        return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[lower];
    });
}
const normalize = text => decode(text).replace(/\s+/g, ' ').trim();
const escapeAttribute = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
function translatable(text) {
    if ((text.match(/\p{L}/gu) || []).length < 2) return false;               // chữ cái viết tắt/avatar

    if (/^[#]?[A-Z]{1,6}-?\d+$/.test(text)) return false;                    // mã đơn hàng, SKU
    if (/^[\d\s.,:%$€£¥₫đ+\-–—()\/x×*]+$/iu.test(text)) return false;        // giá, số lượng
    if (/^\S+@\S+\.\S+$/.test(text) || /^(https?:)?\/\//i.test(text)) return false; // email, URL
    return true;
}
function slug(text) {
    const base = text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const words = base.split('_').filter(Boolean);
    let result = '';
    for (const word of words) { if ((result + '_' + word).length > 48) break; result = result ? result + '_' + word : word; }
    return result || 'text';
}
function attributes(text) {
    const map = new Map(); let match; ATTRIBUTE.lastIndex = 0;
    while ((match = ATTRIBUTE.exec(text)) !== null) map.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
    return map;
}
function htmlFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) return ['node_modules', '.git'].includes(entry.name) ? [] : htmlFiles(full);
        return entry.name.toLowerCase().endsWith('.html') ? [full] : [];
    });
}

// Lượt 1: phân tích HTML, ghi nhận mọi đoạn chữ cần gắn khóa.
function analyse(html) {
    const items = [], stack = [];
    let cursor = 0, match;
    const pushText = (start, end) => {
        const raw = html.slice(start, end), top = stack.at(-1);
        if (!top || top.skip || !raw.trim()) return;
        top.texts.push({ start, end, raw });
    };
    TAG.lastIndex = 0;
    while ((match = TAG.exec(html)) !== null) {
        pushText(cursor, match.index);
        cursor = TAG.lastIndex;
        if (!match[2]) continue; // comment hoặc doctype
        const [full, closing, rawName, attributeText, selfClosing] = match, name = rawName.toLowerCase();
        if (closing) {
            const index = stack.map(item => item.name).lastIndexOf(name);
            if (index === -1) continue;
            while (stack.length > index) finish(stack.pop(), items, html);
            continue;
        }
        const attrs = attributes(attributeText);
        const parent = stack.at(-1);
        if (parent) parent.children++;
        const skipped = Boolean(parent?.skip) || SKIP_CONTENT.has(name) || attrs.get('translate') === 'no'
            || (attrs.get('class') || '').split(/\s+/).includes('notranslate') || attrs.has('data-i18n-skip');
        if (!skipped) {
            for (const attribute of ATTRIBUTES) {
                const value = attrs.get(attribute);
                if (value && !attrs.has('data-i18n-' + attribute) && translatable(normalize(value)))
                    items.push({ kind: 'attribute', attribute, insertAt: match.index + full.length - (selfClosing ? 2 : 1), text: normalize(value) });
                else if (value && attrs.has('data-i18n-' + attribute))
                    items.push({ kind: 'existing', key: attrs.get('data-i18n-' + attribute), text: normalize(value) });
            }
        }
        if (VOID.has(name) || selfClosing) continue;
        if (['script', 'style'].includes(name)) {
            const end = html.toLowerCase().indexOf('</' + name, TAG.lastIndex);
            TAG.lastIndex = cursor = end === -1 ? html.length : end;
            continue;
        }
        stack.push({ name, attrs, skip: skipped, existing: attrs.get('data-i18n') ?? (name === 'title' ? attrs.get('data-i18n-document-title') : undefined),
            openEnd: match.index + full.length - 1, children: 0, texts: [] });
    }
    pushText(cursor, html.length);
    while (stack.length) finish(stack.pop(), items, html);
    return items;
}
function finish(element, items) {
    if (element.skip) return;
    const texts = element.texts.filter(text => translatable(normalize(text.raw)));
    if (element.existing !== undefined) {
        const text = normalize(element.texts.map(item => item.raw).join(' '));
        if (text) items.push({ kind: 'existing', key: element.existing, text });
        return;
    }
    if (!texts.length) return;
    if (element.name === 'title') { items.push({ kind: 'title', insertAt: element.openEnd, text: normalize(texts.map(t => t.raw).join(' ')) }); return; }
    if (element.children === 0 && texts.length === element.texts.length && texts.length === 1) {
        items.push({ kind: 'element', insertAt: element.openEnd, text: normalize(texts[0].raw) });
        return;
    }
    for (const text of texts) {
        const leading = text.raw.match(/^\s*/)[0], trailing = text.raw.match(/\s*$/)[0];
        items.push({ kind: 'wrap', start: text.start + leading.length, end: text.end - trailing.length, text: normalize(text.raw) });
    }
}

// Từ điển có sẵn: chữ → khóa (ưu tiên khóa đầu tiên theo thứ tự tệp).
const dictionary = new Map(), dictionaryEntries = new Map();
function flatten(node, prefix = '') {
    return Object.entries(node).flatMap(([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : flatten(value, prefix + key + '.'));
}
for (const file of dictionaryFiles) {
    for (const [key, value] of flatten(JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')))) {
        dictionaryEntries.set(key, value);
        const text = normalize(value);
        if (text && !dictionary.has(text)) dictionary.set(text, key);
    }
}

mkdirSync(outputDirectory, { recursive: true });
cpSync(siteDirectory, outputDirectory, { recursive: true, filter: source => !/[\\/](node_modules|\.git)([\\/]|$)/.test(source) });

const pages = htmlFiles(outputDirectory).map(file => {
    const html = readFileSync(file, 'utf8');
    return { file, html, page: slug(path.basename(file, '.html')), items: analyse(html) };
});
const pagesByText = new Map();
for (const page of pages) for (const item of page.items) if (item.kind !== 'existing') {
    if (!pagesByText.has(item.text)) pagesByText.set(item.text, new Set());
    pagesByText.get(item.text).add(page.page);
}

const source = new Map(dictionaryEntries), keyByText = new Map(dictionary);
for (const page of pages) for (const item of page.items) if (item.kind === 'existing') {
    if (source.has(item.key) && source.get(item.key) !== item.text) console.warn(`Cảnh báo: khóa ${item.key} có nội dung khác nhau giữa các trang.`);
    if (!source.has(item.key)) source.set(item.key, item.text);
}
const leafKeys = new Set(source.keys());
function namespace(name) { return leafKeys.has(name) ? 'page_' + name : name; }
function keyFor(item, page) {
    if (keyByText.has(item.text)) return keyByText.get(item.text);
    const group = pagesByText.get(item.text).size > 1 ? 'common' : namespace(page.page);
    let key = group + '.' + slug(item.text), suffix = 2;
    while (source.has(key) && source.get(key) !== item.text) key = group + '.' + slug(item.text) + '_' + suffix++;
    source.set(key, item.text); keyByText.set(item.text, key);
    return key;
}

const report = [];
for (const page of pages) {
    const edits = [];
    for (const item of page.items) {
        if (item.kind === 'existing') continue;
        const key = keyFor(item, page);
        if (item.kind === 'attribute') edits.push({ at: item.insertAt, insert: ` data-i18n-${item.attribute}="${escapeAttribute(key)}"` });
        else if (item.kind === 'title') edits.push({ at: item.insertAt, insert: ` data-i18n-document-title="${escapeAttribute(key)}"` });
        else if (item.kind === 'element') edits.push({ at: item.insertAt, insert: ` data-i18n="${escapeAttribute(key)}"` });
        else edits.push({ at: item.end, insert: '</span>' }, { at: item.start, insert: `<span data-i18n="${escapeAttribute(key)}">` });
    }
    let html = page.html;
    edits.sort((a, b) => b.at - a.at).forEach(edit => { html = html.slice(0, edit.at) + edit.insert + html.slice(edit.at); });
    writeFileSync(page.file, html);
    report.push({ file: path.relative(outputDirectory, page.file).replace(/\\/g, '/'), tagged: edits.length, existing: page.items.filter(item => item.kind === 'existing').length });
}

// Kiểm tra khóa cha/con trước khi ghi JSON lồng nhau.
for (const key of source.keys()) for (let dot = key.indexOf('.'); dot !== -1; dot = key.indexOf('.', dot + 1))
    if (source.has(key.slice(0, dot))) throw new Error(`Khóa "${key.slice(0, dot)}" vừa là chuỗi vừa là nhóm của "${key}".`);
const nested = Object.create(null);
[...source.keys()].sort().forEach(key => {
    const parts = key.split('.'); let node = nested;
    parts.slice(0, -1).forEach(part => { node = node[part] ??= Object.create(null); });
    node[parts.at(-1)] = source.get(key);
});
mkdirSync(path.join(outputDirectory, 'i18n'), { recursive: true });
writeFileSync(path.join(outputDirectory, 'i18n', locale + '.json'), JSON.stringify(nested, null, 2) + '\n');
writeFileSync(path.join(outputDirectory, 'i18n', 'prepare-report.json'), JSON.stringify({ locale, keys: source.size, pages: report }, null, 2) + '\n');
console.log(`Đã gắn khóa ${report.reduce((n, page) => n + page.tagged, 0)} vị trí trên ${report.length} trang; ${source.size} khóa nguồn → i18n/${locale}.json`);
for (const page of report) console.log(`  ${page.file}: ${page.tagged} mới, ${page.existing} đã có`);
