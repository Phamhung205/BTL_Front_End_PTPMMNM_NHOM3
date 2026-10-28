import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ids = new Map();
class Element {
    constructor(tag = 'div') {
        this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.value = ''; this.textContent = ''; this.listeners = {};
        const classes = new Set(['hidden']);
        this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle(name, force) { const enabled = force ?? !classes.has(name); enabled ? classes.add(name) : classes.delete(name); } };
    }
    set id(value) { this._id = value; ids.set(value, this); } get id() { return this._id; }
    set innerHTML(_) { throw new Error('Unsafe HTML write'); }
    append(...items) { items.forEach(item => { item.parent = this; this.children.push(item); }); }
    replaceChildren(...items) { this.children = []; this.append(...items); }
    setAttribute(key, value) { this[key] = value; }
    getAttribute(key) { return this[key] ?? null; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    reset() {} reportValidity() { return true; } focus() {}
    click() { return this.listeners.click?.({ target: this }); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
    querySelector(selector) { return this.children.find(child => selector === '[data-conflict]' && child.dataset.conflict) || this.children.map(child => child.querySelector?.(selector)).find(Boolean) || null; }
    querySelectorAll() { return []; }
}
const element = id => { if (!ids.has(id)) { const node = new Element(); node.id = id; } return ids.get(id); };
const links = Object.keys({ translations: 1, releases: 1, history: 1 }).map(key => Object.assign(new Element('a'), { dataset: { sourceLink: key } }));
const location = { href: 'http://localhost/pages/translations/index.php', search: '' }, requests = [];
let handler, mutation = { success: true, data: {} }, dialog, closed = false, count = 0;
const ok = data => ({ success: true, data });
const context = vm.createContext({
    APP_CONFIG: { mode: 'api' }, Node: Element, URL, URLSearchParams, Date, setTimeout, clearTimeout, location,
    sessionStorage: { getItem: () => '{}' }, window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById: element, createElement: tag => new Element(tag), querySelectorAll: selector => selector === '[data-source-link]' ? links : [], body: new Element('body') },
    history: { replaceState(_, __, path) { const url = new URL(path, location.href); location.href = url.href; location.search = url.search; } },
    getBaseUrl: () => '/', apiEndpoint: (name, id) => name === 'projects' ? '/api/projects' : '/api/projects/' + id + '/' + ({ translations: 'translations', translationStats: 'translations/stats', members: 'members', locales: 'locales', releases: 'releases', activity: 'activity' }[name]),
    apiCollection: data => Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null,
    apiGet: async (route, options) => { requests.push({ route, options }); return handler(route, options); },
    apiPost: async (route, body) => { requests.push({ route, body }); return mutation; },
    apiPut: async (route, body) => { requests.push({ route, body }); return mutation; },
    apiDelete: async (route, options) => { requests.push({ route, method: 'DELETE', body: JSON.parse(options.body) }); return mutation; }
});
vm.runInContext(readFileSync(new URL('../assets/js/shared/ui.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../assets/js/translations/workspace.js', import.meta.url), 'utf8'), context);
context.openModal = (title, form, confirm, options) => { dialog = { title, form, confirm, options }; closed = false; };
context.closeModal = () => { closed = true; }; context.setModalBusy = () => {}; context.showToast = () => {};
const evaluate = source => vm.runInContext(source, context);
function check(value, label) { assert.ok(value, label); count++; console.log('PASS ' + label); }
const projects = [{ id: 1, name: 'Manager project', role: 'manager' }, { id: 2, name: 'Reviewer project', role: 'reviewer' }, { id: 3, name: 'Translator project', role: 'translator' }];
const rows = [{ stringId: 1, translationId: 10, key: '<img onerror=alert(1)>', source: 'Xin chào {name}', placeholders: ['{name}'], value: 'Hello {name}', status: 'translated', rowVersion: 3, assignedTo: 5, canEdit: true }];
handler = route => ok(route === '/api/projects' ? projects : route.endsWith('/locales') ? [{ code: 'en', name: 'English', isSource: false }] : route.endsWith('/members') ? [{ id: 5, role: 'translator', displayName: 'Translator' }] : route.endsWith('/stats') ? [{ localeCode: 'en', localeName: 'English', approved: 0, total: 1, translated: 1, missing: 0, draft: 0, needsReview: 0 }] : rows);
evaluate('workflow.module = "translations"'); await context.initializeWorkflow();
check(element('workflow-project').value === '1' && !element('workflow-content').classList.contains('hidden'), 'Loads first authorized project and target translations');
check(element('translations-body').children[0].children[1].children[0].children[0].textContent === rows[0].key, 'Untrusted key rendered as text');
check(links.every(link => link.href.endsWith('?project_id=1')), 'Workflow links retain project');
check(!element('translation-bulk').classList.contains('hidden'), 'Manager sees bulk assignment');
check(element('translations-body').children[0].children[4].children[0].children.some(button => button.textContent === 'Xóa'), 'Manager sees permanent delete for persisted translation');
check(element('translation-assignee').children.map(option => option.textContent).join('|') === 'Tất cả|Giao cho tôi|Chưa phân công|Translator', 'Manager filter shows only assignable member names without project names');
check(!element('translation-assignee-filter').classList.contains('hidden') && element('translation-work-filter').classList.contains('hidden') && !element('translation-status-filter').classList.contains('hidden'), 'Manager retains assignment and status filters');
await context.selectWorkflowProject('3');
check(element('translation-assignee-filter').classList.contains('hidden') && element('translation-status-filter').classList.contains('hidden') && !element('translation-work-filter').classList.contains('hidden'), 'Translator sees a work filter in place of status and assignment filters');
check(element('translation-work').children.length === 1 && element('translation-work').children[0].textContent === 'Giao cho tôi', 'Translator work filter contains only Assigned to me');
const translatorListRequest = [...requests].reverse().find(request => request.route.endsWith('/translations'));
check(translatorListRequest.options.query.assignee === 'me' && translatorListRequest.options.query.status === '', 'Translator list always loads only assigned work and ignores status filter');
evaluate('workflow.project = {id: 2, role: "reviewer"}'); context.renderTranslations();
check(element('translation-bulk').classList.contains('hidden'), 'Reviewer has no bulk assignment');
check(!element('translations-body').children[0].children[4].children[0].children.some(button => button.textContent === 'Xóa'), 'Reviewer has no deletion action');
check(!context.wfCanEdit(rows[0]), 'Reviewer cannot edit even with stale canEdit flag');
evaluate('workflow.project = {id: 1, role: "translator"}');
check(context.wfCanEdit(rows[0]), 'Backend edit permission works without sessionStorage user identity');
check(!context.wfCanEdit({ ...rows[0], canEdit: false }), 'Translator cannot edit another assignee');
evaluate('workflow.project = {id: 1, role: "manager"}');
context.editWorkflowTranslation(rows[0]); element('edit-translation-value').value = 'My local draft {name}';
mutation = { success: false, status: 409, message: 'Changed', details: { currentValue: 'Server version {name}', currentRowVersion: 4, updatedBy: 'Other translator' } };
await dialog.confirm();
check(!closed && element('edit-translation-value').value === 'My local draft {name}', 'Conflict keeps unsaved local text and editor open');
check(requests.at(-1).body.expectedRowVersion === 3, 'Save sends original row version');
const conflict = dialog.form.querySelector('[data-conflict]'); check(!!conflict, 'Conflict displays current server value and resolution choices');
await dialog.confirm(); check(requests.at(-1).body.expectedRowVersion === 3, 'Conflict does not silently advance expected version');
dialog.form.querySelector('[data-conflict]').children.at(-1).click();
await dialog.confirm(); check(requests.at(-1).body.expectedRowVersion === 4 && requests.at(-1).body.value === 'My local draft {name}', 'Explicit overwrite choice uses current version and preserves local content');
context.editWorkflowTranslation(rows[0]); await dialog.confirm(); dialog.form.querySelector('[data-conflict]').children.at(-2).click();
check(element('edit-translation-value').value === 'Server version {name}', 'Explicit reload loads latest server content');
context.reviewWorkflowTranslation(rows[0], false);
check(element('translation-review-note').required && element('translation-review-note').maxLength === 2000, 'Reject form requires bounded reason');
await dialog.confirm(); check(requests.at(-1).route.endsWith('/10/reject') && requests.at(-1).body.expectedRowVersion === 3 && !closed, 'Review conflict keeps original reviewed version');
context.assignWorkflowTranslation(rows[0]); element('single-assignee').value = ''; await dialog.confirm();
check(requests.at(-1).route.endsWith('/10/assign') && requests.at(-1).body.userId === null, 'Single assignment can explicitly unassign');
evaluate('workflow.rows = Array.from({length: 70}, (_, i) => ({stringId:i+1,key:"key"+i,status:"missing"})); workflow.page=1'); context.renderTranslations();
check(element('translations-body').children.length === 50 && !element('translation-next').disabled, 'Large list renders only first 50 rows');
evaluate('workflow.page=2'); context.renderTranslations(); check(element('translations-body').children.length === 20 && element('translation-next').disabled, 'Second page renders remainder with correct navigation');
evaluate('workflow.project={id:1,role:"manager"}; workflow.selected=new Set([1,2])'); element('bulk-assignee').value = '5';
mutation = { success: false, status: 403, message: 'Forbidden' }; await context.bulkAssignTranslations();
check(requests.at(-1).body.stringIds.length === 2 && requests.at(-1).body.userId === 5 && !element('workflow-project').disabled, 'Bulk assignment sends selected ids and recovers controls after failure');

evaluate('workflow.rows=Array.from({length:84},(_,i)=>({stringId:i+1,translationId:i<73?i+100:null,rowVersion:2,key:"key"+i,status:"missing"})); workflow.selected.clear(); workflow.page=2');
context.selectAllWorkflowTranslations();
check(evaluate('workflow.selected.size') === 84 && element('translations-body').children.length === 34, 'Select all includes matching results beyond the current page');
check(element('translation-selected').textContent.includes('73 bản dịch') && !element('bulk-delete').disabled, 'Selection distinguishes persisted records from virtual missing rows');
mutation = { success: false, status: 409, message: 'Translation changed' };
context.deleteSelectedWorkflowTranslations(); await dialog.confirm();
check(requests.at(-1).method === 'DELETE' && requests.at(-1).body.items.length === 73 && requests.at(-1).body.localeCode === 'en', 'Bulk deletion includes all selected persisted records and the chosen locale');
check(requests.at(-1).body.items.at(-1).translationId === 172 && requests.at(-1).body.items.every(item => item.expectedRowVersion === 2), 'Bulk deletion carries row versions across pages');
check(!closed && evaluate('workflow.selected.size') === 84 && !element('workflow-project').disabled, 'Deletion conflict retains selection and restores controls');
context.deleteWorkflowTranslation(rows[0]); await dialog.confirm();
check(requests.at(-1).route === '/api/projects/1/translations/10' && requests.at(-1).body.expectedRowVersion === 3, 'Single deletion targets the persisted translation with its loaded version');
context.createMissingWorkflowTranslations(); await dialog.confirm();
check(requests.at(-1).route.endsWith('/create-missing') && Object.keys(requests.at(-1).body).join(',') === 'localeCode', 'Create all targets missing records in the locale independently of selection/filter');
evaluate('workflow.project={id:2,role:"reviewer"}'); const beforeDenied = requests.length;
context.createMissingWorkflowTranslations(); context.deleteWorkflowTranslation(rows[0]); context.selectAllWorkflowTranslations();
check(requests.length === beforeDenied, 'Reviewer cannot trigger bulk creation or deletion');
evaluate('workflow.project={id:1,role:"manager"}');
evaluate('workflow.module="releases"'); context.renderWorkflowReleases([], { ready: false, activeStrings: 1, problems: ['Not approved'], locales: [] });
check(element('release-publish').disabled && !element('release-form').classList.contains('hidden'), 'Manager cannot publish when validation fails');
evaluate('workflow.project={id:2,role:"reviewer"}'); context.renderWorkflowReleases([], { ready: true, activeStrings: 1, problems: [], locales: [] });
check(element('release-form').classList.contains('hidden'), 'Reviewer can view releases but cannot publish');
evaluate('workflow.module="translations"; workflow.project={id:1,role:"manager"}');
let resolveOld;
handler = route => route.includes('/1/') ? new Promise(resolve => { if (!route.endsWith('/stats')) resolveOld = resolve; else resolve(ok([])); }) : ok(route.endsWith('/stats') ? [] : [{ stringId: 99, key: 'new-project', status: 'missing' }]);
const oldRequest = context.loadWorkflowModule(); evaluate('workflow.project={id:2,role:"reviewer"}'); await context.loadWorkflowModule(); resolveOld(ok(rows)); await oldRequest;
check(evaluate('workflow.rows[0].key') === 'new-project', 'Late previous-project response cannot overwrite current project');
handler = () => ({ success: false, status: 403, message: 'Access revoked' }); await context.loadWorkflowModule();
check(element('workflow-content').classList.contains('hidden') && element('workflow-error-text').textContent === 'Access revoked', 'Access failure hides previous project content');
console.log(`Completed ${count} workflow UI behavior checks.`);
