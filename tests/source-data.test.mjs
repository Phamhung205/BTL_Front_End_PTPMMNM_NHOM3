import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function preview() {
    const memory = new Map();
    const context = createContext({ location: { hostname: '127.0.0.1', search: '?demo=1' }, URLSearchParams, sessionStorage: { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) } });
    runInContext(readFileSync(new URL('../assets/js/source-data.js', import.meta.url), 'utf8') + '\nthis.demoApi = SourceDemo;', context);
    return context.demoApi;
}

test('JSON lồng nhau, Unicode và placeholder giữ nguyên', () => {
    const api = preview();
    const flat = api.flatten({ home: { title: 'Trang chủ', welcome: '你好 {name}' } });
    assert.deepEqual({ ...flat }, { 'home.title': 'Trang chủ', 'home.welcome': '你好 {name}' });
});

test('từ chối kiểu dữ liệu và khóa ngoài quy ước trước khi import', () => {
    const api = preview();
    for (const input of [[], null, { a: [] }, { a: 1 }, { a: null }, { a: false }, { 'a.b': 'x' }, { '': 'x' }, { a: {} }, {}]) assert.throws(() => api.flatten(input));
});

test('import lại không nhân đôi; xóa và khôi phục giữ đúng khóa', async () => {
    const api = preview();
    const original = { home: { title: 'Trang chủ', welcome: 'Chào {name}' } };
    const send = (versionName, data) => api.request(2, '/source-versions/import', 'POST', { versionName, data });
    assert.equal((await send('v1', original)).data.added, 2);
    const repeat = await send('v2', original);
    assert.equal(repeat.data.added, 0); assert.equal(repeat.data.unchanged, 2);
    assert.equal((await api.request(2, '/translation-keys', 'GET')).data.length, 2);
    const next = await send('v3', { home: { title: 'Trang chính' } });
    assert.equal(next.data.changed, 1); assert.equal(next.data.deleted, 1);
    await send('v4', original);
    const changes = await api.request(2, '/source-versions/4/changes', 'GET');
    assert.equal(changes.data.find(c => c.key === 'home.welcome').type, 'restored');
    assert.equal((await api.request(2, '/translation-keys', 'GET')).data.length, 2);
});

test('phiên bản và dự án khác giữ nguyên khi import nguồn mới', async () => {
    const api = preview();
    const old = await api.request(1, '/source-versions/2/changes', 'GET');
    await api.request(1, '/source-versions/import', 'POST', { versionName: 'v3', data: { hello: 'Mới' } });
    assert.deepEqual((await api.request(1, '/source-versions/2/changes', 'GET')).data, old.data);
    assert.equal((await api.request(2, '/translation-keys', 'GET')).data.length, 0);
});

test('tên phiên bản trùng trả 409 và không sửa nguồn hiện tại', async () => {
    const api = preview();
    const before = await api.request(1, '/translation-keys', 'GET');
    const result = await api.request(1, '/source-versions/import', 'POST', { versionName: 'source-1.1.0', data: { injected: 'Không được ghi' } });
    assert.equal(result.status, 409);
    assert.deepEqual((await api.request(1, '/translation-keys', 'GET')).data, before.data);
});
