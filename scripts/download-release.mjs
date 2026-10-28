// Server/build-time client: credentials come from the environment, never browser JS.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const [projectId, releaseId, outputArgument] = process.argv.slice(2);
if (![projectId,releaseId].every(value => /^[1-9][0-9]*$/.test(value || ''))) throw new Error('Usage: node scripts/download-release.mjs PROJECT_ID RELEASE_ID [NEW_OUTPUT_DIRECTORY]');
const base=(process.env.API_BASE_URL||'http://127.0.0.1:5088').replace(/\/$/,'');
const url=new URL(base);
if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))) throw new Error('Use HTTPS or loopback HTTP.');
if(!process.env.TM_API_EMAIL||!process.env.TM_API_PASSWORD) throw new Error('Set TM_API_EMAIL and TM_API_PASSWORD for an authorized project member.');
const output=path.resolve(outputArgument||'.local/imports/project-'+projectId+'-release-'+releaseId);
if(existsSync(output)) throw new Error('Output directory already exists; use a new directory to preserve the previous package.');
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.TM_API_EMAIL,password:process.env.TM_API_PASSWORD})});
if(!login.ok) throw new Error('Login failed: HTTP '+login.status);
const {token}=await login.json(),route=base+'/api/projects/'+projectId+'/releases/'+releaseId;
const headers={Authorization:'Bearer '+token};
const detail=await fetch(route,{headers}); if(!detail.ok) throw new Error('Cannot read release: HTTP '+detail.status);
const release=await detail.json(),files=[];
for(const file of release.files){
 if(!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(file.localeCode)) throw new Error('Unsupported locale code');
 const response=await fetch(route+'/files/'+encodeURIComponent(file.localeCode),{headers}); if(!response.ok)throw new Error('Download failed: HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer()),sha=createHash('sha256').update(bytes).digest('hex');
 if(sha!==file.sha256||sha!==response.headers.get('X-Content-SHA256'))throw new Error('Checksum mismatch for '+file.localeCode);
 JSON.parse(bytes.toString('utf8')); files.push({name:file.localeCode+'.json',bytes});
}
// All files are validated before creating the destination.
mkdirSync(output,{recursive:true}); for(const file of files)writeFileSync(path.join(output,file.name),file.bytes);
writeFileSync(path.join(output,'manifest.json'),JSON.stringify(release,null,2));
console.log('Imported release '+release.version+' ('+files.length+' languages) into '+output);
