/* This sample renders only immutable release files, never live translations or HTML. */
const consumer = { projects: [], releases: [], sequence: 0 };
const cp = id => document.getElementById('consumer-' + id);
function consumerOptions(select, values, label) {
    select.replaceChildren();
    for (const item of values) { const option = document.createElement('option'); option.value = String(item.id ?? item.localeCode); option.textContent = label(item); select.append(option); }
}
function consumerFlatten(node, prefix = '', output = Object.create(null)) {
    for (const [key, value] of Object.entries(node)) {
        const next = prefix ? prefix + '.' + key : key;
        if (typeof value === 'string') output[next] = value;
        else if (value && !Array.isArray(value) && typeof value === 'object') consumerFlatten(value, next, output);
    }
    return output;
}
function consumerInterpolate(text, variables) { return text.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (token, name) => Object.hasOwn(variables, name) ? variables[name] : token); }
async function loadConsumerReleases() {
    const sequence = ++consumer.sequence; cp('preview').replaceChildren(); cp('strings').replaceChildren(); cp('status').textContent = 'Đang tải bản phát hành...';
    const result = await apiGet('/api/projects/' + cp('project').value + '/releases');
    if (sequence !== consumer.sequence) return;
    if (!result.success) { cp('status').textContent = result.message; consumer.releases = []; consumerOptions(cp('release'), [], x => x); consumerOptions(cp('locale'), [], x => x); return; }
    consumer.releases = result.data;
    consumerOptions(cp('release'), consumer.releases, item => item.version + ' · ' + item.keyCount + ' khóa');
    const requested = new URLSearchParams(location.search).get('release_id');
    if (consumer.releases.some(item => String(item.id) === requested)) cp('release').value = requested;
    selectConsumerRelease();
}
function selectConsumerRelease() {
    const release = consumer.releases.find(item => String(item.id) === cp('release').value);
    consumerOptions(cp('locale'), release?.files || [], item => item.localeCode + (item.isSource ? ' (nguồn)' : ''));
    cp('status').textContent = release ? 'Nhấn Đọc gói để hiển thị bản phát hành ' + release.version + '.' : 'Dự án chưa có bản phát hành. Hoàn tất dịch và duyệt trước khi phát hành.';
    cp('preview').replaceChildren(); cp('strings').replaceChildren(); ++consumer.sequence;
}
async function readConsumerPackage(event) {
    event?.preventDefault(); if (!cp('form').reportValidity()) return;
    const projectId = cp('project').value, releaseId = cp('release').value, locale = cp('locale').value;
    if (!projectId || !releaseId || !locale) return;
    const sequence = ++consumer.sequence; cp('status').textContent = 'Đang đọc và kiểm tra gói...';
    try {
        const result = await apiGet('/api/projects/' + projectId + '/releases/' + releaseId + '/files/' + encodeURIComponent(locale), { download: true });
        if (!result.success) throw new Error(result.message);
        const bytes = await result.data.arrayBuffer();
        const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
        const release = consumer.releases.find(item => String(item.id) === releaseId);
        const file = release.files.find(item => item.localeCode === locale);
        if (sha256 !== file.sha256) throw new Error('Gói tải về sai SHA-256. Không hiển thị nội dung chưa xác minh.');
        const strings = consumerFlatten(JSON.parse(new TextDecoder().decode(bytes)));
        if (Object.keys(strings).length !== file.keyCount) throw new Error('Số khóa trong gói không khớp bản phát hành.');
        if (sequence !== consumer.sequence) return;
        const variables = { name: cp('name').value, count: cp('count').value };
        cp('preview').replaceChildren(); cp('strings').replaceChildren();
        const text = (tag, value, parent) => { const node = document.createElement(tag); node.textContent = consumerInterpolate(value, variables); if (tag === 'button') { node.type = 'button'; node.className = 'mr-3 px-4 py-2 bg-indigo-600 text-white rounded-lg'; } parent.append(node); };
        text('h2', strings['app.title'] ?? strings['home.title'] ?? strings['app.name'] ?? release.version, cp('preview'));
        for (const key of ['app.subtitle', 'home.welcome', 'home.courses', 'home.description', 'actions.save', 'actions.cancel', 'actions.submit']) if (strings[key]) text(key.startsWith('actions.') ? 'button' : 'p', strings[key], cp('preview'));
        if (cp('preview').children.length < 2) for (const value of Object.values(strings).slice(0, 6)) text('p', value, cp('preview'));
        for (const [key, value] of Object.entries(strings)) { const row = document.createElement('div'); row.className = 'border-b py-2'; text('code', key, row); text('p', value, row); cp('strings').append(row); }
        cp('status').textContent = `Release ${release.version} · ${locale} · ${file.keyCount} khóa · SHA-256 hợp lệ: ${sha256}`;
    } catch (error) { if (sequence === consumer.sequence) { cp('preview').replaceChildren(); cp('strings').replaceChildren(); cp('status').textContent = error.message; } }
}
document.addEventListener('DOMContentLoaded', async () => {
    cp('form').addEventListener('submit', readConsumerPackage);
    cp('project').addEventListener('change', loadConsumerReleases); cp('release').addEventListener('change', selectConsumerRelease);
    cp('locale').addEventListener('change', () => { ++consumer.sequence; cp('preview').replaceChildren(); cp('strings').replaceChildren(); cp('status').textContent = 'Nhấn Đọc gói để xem ngôn ngữ đã chọn.'; });
    const result = await apiGet(apiEndpoint('projects'));
    if (!result.success) { cp('status').textContent = result.message; return; }
    consumer.projects = result.data; consumerOptions(cp('project'), consumer.projects, item => item.name);
    const requested = new URLSearchParams(location.search).get('project_id');
    if (requested && !consumer.projects.some(item => String(item.id) === requested)) { cp('status').textContent = 'Bạn không có quyền xem dự án được yêu cầu.'; cp('project').value = ''; return; }
    if (requested) cp('project').value = requested;
    if (consumer.projects.length) await loadConsumerReleases(); else cp('status').textContent = 'Bạn chưa tham gia dự án nào.';
});
