import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise visible state, permissions and out-of-order responses without a browser/database.
class Element {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase(); this.children = []; this.dataset = {}; this.value = ''; this.textContent = '';
        const classes = new Set(['hidden']);
        this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
            toggle(name, force) { const enabled = force ?? !classes.has(name); if (enabled) classes.add(name); else classes.delete(name); } };
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener() {}
    reset() {}
}
const ids = new Map();
const element = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
const links = ['languages', 'source_versions', 'translation_keys'].map(module => Object.assign(new Element('a'), { dataset: { sourceLink: module } }));
const requests = [];
let handler;
const location = { href: 'http://localhost/pages/languages/index.php', search: '' };
const context = vm.createContext({
    APP_CONFIG: { mode: 'api' }, Node: Element, TextEncoder, URL, URLSearchParams, location,
    window: { addEventListener() {} },
    history: { replaceState(_, __, path) { const url = new URL(path, location.href); location.href = url.href; location.search = url.search; } },
    document: { addEventListener() {}, getElementById: element, createElement: tag => new Element(tag), querySelectorAll: selector => selector === '[data-source-link]' ? links : [] },
    getBaseUrl: () => '/', apiEndpoint: (name, id) => name === 'projects' ? '/api/projects' : '/api/projects/' + id + '/' + ({ locales: 'locales', sourceVersions: 'source-versions', translationKeys: 'translation-keys' }[name]),
    apiCollection: data => Array.isArray(data) ? data : null,
    apiGet: async (path, options) => { requests.push({ path, options }); return handler(path, options); }
});
vm.runInContext(readFileSync(new URL('../assets/js/shared/ui.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../assets/js/source/workspace.js', import.meta.url), 'utf8'), context);
const evaluate = code => vm.runInContext(code, context);
const ok = data => ({ success: true, data });
const projects = [{ id: 1, name: 'Managed project', role: 'manager' }, { id: 2, name: 'Read project', role: 'reviewer' }];
const locales = [{ code: 'vi', name: 'Tiếng Việt', isSource: true }, { code: 'en', name: '<script>unsafe</script>', isSource: false }];
let count = 0;
function check(ok, label) { assert.ok(ok, label); count++; console.log('PASS ' + label); }

evaluate('sourceWorkspace.module = "languages"');
handler = path => ok(path === '/api/projects' ? projects : locales);
await context.initializeSourceWorkspace();
check(element('source-project').value === '1' && !element('source-content').classList.contains('hidden'), 'Open first authorized project when no project is specified');
check(!element('locale-form').classList.contains('hidden'), 'Manager sees language form');
let rows = element('locales-body').children;
check(rows[0].children[3].children[0].children.length === 0 && rows[1].children[3].children[0].children.length === 2, 'Source locale protected; target has edit/remove actions');
check(rows[1].children[1].textContent === '<script>unsafe</script>', 'API content is rendered as text');
check(links.every(link => link.href.endsWith('?project_id=1')), 'Module navigation retains selected project');
await context.selectSourceProject('2');
check(element('locale-form').classList.contains('hidden'), 'Reviewer has no language form');
check(element('locales-body').children.every(row => row.children[3].children[0].children.length === 0), 'Reviewer has no mutation actions');
check(links.every(link => link.href.endsWith('?project_id=2')), 'Switching project updates all module links');

let resolveOld;
evaluate('sourceWorkspace.project = sourceWorkspace.projects[0]');
handler = () => new Promise(resolve => { resolveOld = resolve; });
const oldRequest = context.loadSourceModule();
handler = () => ok([{ code: 'fr', name: 'Français', isSource: false }]);
await context.selectSourceProject('2');
resolveOld(ok(locales)); await oldRequest;
check(element('locales-body').children.length === 1 && element('locales-body').children[0].children[0].textContent === 'fr', 'Late response from previous project cannot overwrite current rows');

handler = () => ({ success: false, status: 403, message: 'No access' });
await context.loadSourceModule();
check(!element('source-error').classList.contains('hidden') && element('source-content').classList.contains('hidden'), 'Failed request clears access to previous visible content');

evaluate('sourceWorkspace.module = "translation_keys"');
element('keys-query').value = 'hello & world'; element('keys-status').value = 'deleted';
handler = () => ok([{ key: 'menu.open', sourceText: 'Mở', status: 'deleted', updatedAt: null }]);
await context.loadSourceModule();
check(requests.at(-1).options.query.q === 'hello & world' && requests.at(-1).options.query.status === 'deleted', 'Search sends explicit query values and status');
check(element('keys-body').children[0].children[2].textContent === 'Đã xóa', 'Deleted key state is visible');

evaluate('sourceWorkspace.module = "source_versions"');
handler = () => ok([{ id: 10, versionName: 'v2', importedBy: 'Manager', keyCount: 2, added: 1, changed: 1, deleted: 0 }, { id: 9, versionName: 'v1' }]);
await context.loadSourceModule();
handler = () => ok([{ type: 'restored', key: 'menu.open', oldValue: null, newValue: 'Mở' }]);
await context.openSourceChanges({ id: 10, versionName: 'v2' });
check(element('changes-body').children[0].children[0].textContent === 'Khôi phục', 'Version changes show restored keys');
element('source-compare').value = '9'; await context.loadSourceChanges();
check(requests.at(-1).options.query.compareToVersionId === '9', 'Select an arbitrary comparison version');

location.search = '?project_id=999';
handler = () => ok(projects); await context.initializeSourceWorkspace();
check(element('source-content').classList.contains('hidden') && element('source-error-message').textContent.includes('được phép xem'), 'Invalid project URL does not display another project silently');
check(element('source-project').disabled === false, 'Invalid project can be recovered by choosing an authorized project');
console.log(`Completed ${count} source workspace behavior checks.`);
