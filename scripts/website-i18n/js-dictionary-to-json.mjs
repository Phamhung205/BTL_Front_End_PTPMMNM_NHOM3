// Chuyển từ điển ngôn ngữ viết bằng object JavaScript (vd. languages.js: const translations = { en: {...}, vi: {...} })
// thành các tệp JSON theo ngôn ngữ để nhập vào Translation Manager.
//
//   node scripts/website-i18n/js-dictionary-to-json.mjs <languages.js> <tên-biến> <thư-mục-đầu-ra>
//
// Tệp chỉ được đọc như dữ liệu, không thực thi mã. Hỗ trợ khóa không có dấu nháy, chuỗi '...' hoặc "...",
// chú thích // và /* */, dấu phẩy cuối. Không hỗ trợ biểu thức, hàm hoặc chuỗi template.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [input, variable, outputDirectory] = process.argv.slice(2);
if (!input || !variable || !outputDirectory) {
    console.error('Cách dùng: node scripts/website-i18n/js-dictionary-to-json.mjs <languages.js> <tên-biến> <thư-mục-đầu-ra>');
    process.exit(2);
}
const source = readFileSync(input, 'utf8').replace(/^﻿/, '');
const declaration = new RegExp('(?:const|let|var)\\s+' + variable.replace(/[$]/g, '\\$') + '\\s*=\\s*\\{').exec(source);
if (!declaration) throw new Error('Không tìm thấy biến ' + variable + ' trong ' + input);

let index = declaration.index + declaration[0].length - 1;
function fail(message) { throw new Error(message + ' (vị trí ' + index + ')'); }
function skipSpace() {
    for (;;) {
        while (/\s/.test(source[index] ?? '')) index++;
        if (source.startsWith('//', index)) { index = source.indexOf('\n', index); if (index < 0) index = source.length; continue; }
        if (source.startsWith('/*', index)) { const end = source.indexOf('*/', index + 2); if (end < 0) fail('Chú thích chưa đóng'); index = end + 2; continue; }
        return;
    }
}
function readString() {
    const quote = source[index++]; let text = '';
    while (index < source.length && source[index] !== quote) {
        if (source[index] === '\\') {
            const next = source[index + 1];
            const escapes = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`', '/': '/' };
            if (next === 'u') { text += String.fromCharCode(parseInt(source.slice(index + 2, index + 6), 16)); index += 6; continue; }
            if (!(next in escapes)) fail('Escape không hỗ trợ \\' + next);
            text += escapes[next]; index += 2; continue;
        }
        if (source[index] === '\n') fail('Chuỗi xuống dòng không hợp lệ');
        text += source[index++];
    }
    if (source[index++] !== quote) fail('Chuỗi chưa đóng');
    return text;
}
function readKey() {
    if (source[index] === '"' || source[index] === "'") return readString();
    const match = /^[A-Za-z_$][\w$-]*/.exec(source.slice(index));
    if (!match) fail('Khóa không hợp lệ');
    index += match[0].length;
    return match[0];
}
function readObject() {
    if (source[index++] !== '{') fail('Cần dấu {');
    const result = Object.create(null);
    for (;;) {
        skipSpace();
        if (source[index] === '}') { index++; return result; }
        const key = readKey();
        if (Object.hasOwn(result, key)) fail('Khóa bị lặp: ' + key);
        skipSpace();
        if (source[index++] !== ':') fail('Cần dấu : sau khóa ' + key);
        skipSpace();
        if (source[index] === '{') result[key] = readObject();
        else if (source[index] === '"' || source[index] === "'") result[key] = readString();
        else fail('Giá trị của ' + key + ' phải là chuỗi hoặc object');
        skipSpace();
        if (source[index] === ',') index++;
        else if (source[index] !== '}') fail('Cần dấu , hoặc } sau khóa ' + key);
    }
}

const dictionary = readObject();
mkdirSync(outputDirectory, { recursive: true });
for (const [locale, values] of Object.entries(dictionary)) {
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) || typeof values !== 'object') throw new Error('Mã ngôn ngữ không hợp lệ ở cấp đầu: ' + locale);
    writeFileSync(path.join(outputDirectory, locale + '.json'), JSON.stringify(values, null, 2) + '\n');
    const count = Object.keys(values).length, empty = Object.values(values).filter(value => typeof value === 'string' && !value.trim()).length;
    console.log(`${locale}.json: ${count} khóa${empty ? `, ${empty} khóa rỗng (sẽ được báo là chưa dịch khi nhập)` : ''}`);
}
