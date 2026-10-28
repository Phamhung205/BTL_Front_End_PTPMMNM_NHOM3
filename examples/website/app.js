let dictionary = {}, sequence = 0;
const lookup = key => key.split('.').reduce((value, part) => value?.[part], dictionary);
const format = text => text.replace(/\{(name|count)\}/g, (_, key) => ({ name: 'Minh', count: '3' }[key]));
function entries(node, prefix = '') { return Object.entries(node).flatMap(([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : entries(value, prefix + key + '.')); }
function renderDictionary() {
    const query = document.getElementById('search').value.toLocaleLowerCase();
    const rows = entries(dictionary).filter(([key, value]) => (key + ' ' + value).toLocaleLowerCase().includes(query));
    const container = document.getElementById('strings'); container.replaceChildren();
    for (const [key, value] of rows) { const row = document.createElement('p'), label = document.createElement('code'), text = document.createElement('span'); label.textContent = key; text.textContent = format(value); row.append(label, text); container.append(row); }
    document.getElementById('count').textContent = rows.length + ' / ' + entries(dictionary).length + ' khóa';
}
async function loadLanguage() {
    const current = ++sequence, language = document.getElementById('language').value;
    document.getElementById('status').textContent = 'Đang tải gói...';
    try {
        const [response, metadata] = await Promise.all([fetch('locales/' + language + '.json'), fetch('release.json')]);
        if (!response.ok || !metadata.ok) throw new Error('Chưa có gói mẫu. Chạy import-website-catalog.mjs hoặc lấy JSON của một release đã chốt.');
        const bytes = await response.arrayBuffer(), release = await metadata.json();
        const file = release.files?.find(item => item.localeCode === language);
        const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
        if (!file || sha !== file.sha256) throw new Error('Gói không khớp SHA-256 của bản phát hành.');
        const data = JSON.parse(new TextDecoder().decode(bytes));
        if (current !== sequence) return;
        dictionary = data; document.documentElement.lang = language;
        document.querySelectorAll('[data-i18n]').forEach(element => { const value = lookup(element.dataset.i18n); element.textContent = typeof value === 'string' ? format(value) : element.dataset.i18n; });
        renderDictionary(); document.getElementById('status').textContent = 'Release ' + release.version + ' · ' + language + ' · ' + entries(dictionary).length + ' khóa · SHA-256 hợp lệ';
    } catch (error) { if (current === sequence) { dictionary = {}; document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = '—'; }); renderDictionary(); document.getElementById('status').textContent = error.message; } }
}
document.getElementById('language').addEventListener('change', loadLanguage);
document.getElementById('search').addEventListener('input', renderDictionary);
loadLanguage();
