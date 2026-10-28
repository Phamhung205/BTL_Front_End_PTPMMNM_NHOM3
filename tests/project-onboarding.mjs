import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
if (process.env.TM_DEMO_ISOLATED !== '1') throw new Error('Run this test on the isolated test database only.');
const base = process.env.API_BASE_URL || 'http://127.0.0.1:5088';
const suffix = randomBytes(5).toString('hex'), password = 'Onboarding@Test2026!';
let checks = 0; const projects = [];
function check(value, label) { assert.ok(value, label); checks++; console.log('PASS ' + label); }
async function api(route, method = 'GET', body, user) {
    const response = await fetch(base + route, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(user ? { Authorization: 'Bearer ' + user.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text(); return { status: response.status, data: text ? JSON.parse(text) : null };
}
const users = [];
for (const role of ['manager','translator','reviewer','outsider']) users.push((await api('/api/auth/register','POST',{email: role + suffix + '@onboarding.test',displayName: role,password,systemRole:'admin'})).data);
const [manager, translator, reviewer, outsider] = users;
const payload = { name:'Onboarding QA',slug:'onboarding-'+suffix,sourceLocaleCode:'EN',targetLocaleCodes:['VI','zh'],members:[{email:translator.email,role:'translator'},{userId:reviewer.userId,role:'reviewer'}] };
try {
    check((await api('/api/auth/me','GET',undefined,manager)).data.systemRole === 'user', 'Registration cannot grant system Admin');
    const created = await api('/api/projects','POST',payload,manager); check(created.status===201,'Create project with languages and members in one request'); projects.push(created.data.id);
    const route='/api/projects/'+created.data.id;
    check((await api(route+'/locales','GET',undefined,manager)).data.map(item=>item.code).sort().join(',')==='en,vi,zh','Source and targets normalized and saved together');
    const members=(await api(route+'/members','GET',undefined,manager)).data;
    check(members.length===3 && members.some(item=>item.id===translator.userId && item.role==='translator') && members.some(item=>item.id===reviewer.userId && item.role==='reviewer'),'Initial member roles persisted');
    const before=(await api('/api/projects','GET',undefined,manager)).data.length;
    const failures=[{targetLocaleCodes:['en']},{targetLocaleCodes:['vi','VI']},{targetLocaleCodes:['../x']},{members:[{email:'missing'+suffix+'@onboarding.test',role:'translator'}]},{members:[{userId:manager.userId,role:'reviewer'}]},{members:[{userId:translator.userId,role:'admin'}]},{members:[{userId:translator.userId,role:'translator'},{email:translator.email,role:'reviewer'}]}];
    for(let i=0;i<failures.length;i++) check((await api('/api/projects','POST',{...payload,slug:'invalid-'+suffix+'-'+i,...failures[i]},manager)).status===400,'Invalid initial setup rejected #'+i);
    check((await api('/api/projects','GET',undefined,manager)).data.length===before,'Failed setup leaves no partial project');
    check((await api('/api/admin/users','GET',undefined,translator)).status===403,'Project member cannot access global administration');
    check((await api(route+'/releases/report','GET',undefined,outsider)).status===403,'Outsider cannot export project report');
    check((await api(route+'/releases/report','GET',undefined,reviewer)).data.validation.ready===false,'Authorized report includes current blockers');
    const source={home:{welcome:'Xin chào {name}',title:'Trang chủ'},stable:'Giữ nguyên'};
    check((await api(route+'/source-versions/import','POST',{versionName:'v1',data:source},manager)).status===200,'Import initial nested source');
    async function complete(locale, values) {
        let rows=(await api(route+'/translations?locale='+locale,'GET',undefined,manager)).data;
        await api(route+'/translations/assign','PUT',{localeCode:locale,stringIds:rows.map(row=>row.stringId),userId:translator.userId},manager);
        rows=(await api(route+'/translations?locale='+locale,'GET',undefined,manager)).data;
        for(const row of rows) {
            if(row.status==='approved'&&row.value===values[row.key])continue;
            const saved=await api(route+'/translations','POST',{stringId:row.stringId,localeCode:locale,value:values[row.key],status:'translated',expectedRowVersion:row.rowVersion},translator);
            assert.equal(saved.status,200); assert.equal((await api(route+'/translations/'+saved.data.id+'/approve','POST',{expectedRowVersion:saved.data.rowVersion},reviewer)).status,200);
        }
    }
    for(const locale of ['vi','zh']) await complete(locale,{'home.welcome':'Hello {name}','home.title':'Home',stable:'Stable'});
    const first=await api(route+'/releases','POST',{versionName:'v1'},manager); check(first.status===201,'Publish first release');
    const fileRoute=route+'/releases/'+first.data.id+'/files/vi';
    async function file() {const res=await fetch(base+fileRoute,{headers:{Authorization:'Bearer '+manager.token}});return Buffer.from(await res.arrayBuffer());}
    const bytes=await file(), oldRows=(await api(route+'/translations?locale=vi','GET',undefined,manager)).data;
    const changed=await api(route+'/source-versions/import','POST',{versionName:'v2',data:{home:{welcome:'Chào {name}, có {count} tin'},stable:'Giữ nguyên',help:'Trợ giúp'}},manager);
    check(changed.data.added===1&&changed.data.changed===1&&changed.data.deleted===1,'Scenario 2 identifies added, changed and deleted keys');
    const rows=(await api(route+'/translations?locale=vi','GET',undefined,manager)).data;
    check(rows.find(row=>row.key==='home.welcome').status==='needs_review'&&rows.find(row=>row.key==='stable').status==='approved','Only affected translation needs another review');
    const stale=oldRows.find(row=>row.key==='home.welcome');
    check((await api(route+'/translations','POST',{stringId:stale.stringId,localeCode:'vi',value:'Outdated {name} {count}',status:'translated',expectedRowVersion:stale.rowVersion},translator)).status===409,'Source update blocks stale translation saves');
    check((await api(route+'/releases','POST',{versionName:'premature-v2'},manager)).status===400,'Cannot publish changed source before review');
    for(const locale of ['vi','zh']) await complete(locale,{'home.welcome':'Welcome {name}, {count} updates',stable:'Stable',help:'Help'});
    const second=await api(route+'/releases','POST',{versionName:'v2'},manager); check(second.status===201,'Scenario 2 completes corrected translations, review and new release');
    check((await file()).equals(bytes),'First package is immutable after second release');
    const report=await api(route+'/releases/report','GET',undefined,reviewer);
    check(report.data.validation.ready&&report.data.releases.length===2,'Export report lists ready state and both releases');
    const current=await fetch(base+route+'/releases/'+second.data.id+'/files/vi',{headers:{Authorization:'Bearer '+reviewer.token}});
    const currentBytes=Buffer.from(await current.arrayBuffer()); check(createHash('sha256').update(currentBytes).digest('hex')===current.headers.get('X-Content-SHA256'),'New package checksum is valid');
    console.log(`Completed ${checks} onboarding/scenario 2 checks.`);
} finally {for(const id of projects) await api('/api/projects/'+id,'DELETE',undefined,manager);}
