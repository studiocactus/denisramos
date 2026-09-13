const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
function load(file,deps={}){let source=stripTypeScriptTypes(fs.readFileSync(file,'utf8'));const names=[...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(m=>m[1]);source=source.replace(/import (\{[^}]+\}) from ([^;]+);/g,'const $1 = require($2);').replace(/export /g,'');const module={exports:{}};new Function('require','module','Response',source+'\nObject.assign(module.exports,{'+names.join(',')+'});')(name=>deps[name]??require(name),module,Response);return module.exports;}
const urls=load('src/lib/project-url.ts');const lib=load('src/lib/client-projects.ts',{'./project-url':urls});
const id='00000000-0000-4000-8000-000000000001';
const project={action:'project',client_id:id,title:'Website',description:'Resumo',stage:0,start_date:'2026-09-11',due_date:'2026-10-11',next_step:'Briefing',delivery_url:'example.com'};
test('normalizes email, project URL and optional dates',()=>{assert.equal(lib.parseWorkspaceMutation({action:'client',name:' Cliente ',email:'CLIENTE@EXAMPLE.COM',company:''}).values.email,'cliente@example.com');assert.equal(lib.parseWorkspaceMutation(project).values.delivery_url,'https://example.com/');assert.equal(lib.parseWorkspaceMutation({...project,start_date:''}).values.start_date,null)});
test('rejects invalid stages, dates, URLs and required fields',()=>{for(const patch of [{stage:5},{stage:1.5},{due_date:'2026-02-30'},{due_date:'2026-01-01'},{delivery_url:'javascript:alert(1)'},{client_id:'bad'},{title:' '},{description:'x'.repeat(3001)}])assert.throws(()=>lib.parseWorkspaceMutation({...project,...patch}));assert.throws(()=>lib.parseWorkspaceMutation({action:'update',project_id:id,body:' '}));assert.throws(()=>lib.parseWorkspaceMutation({...project,id,version:'bad'}));});
function mock({user={id,email:'client@example.com'},admin=false,rows=[],dbError=null}={}){const calls=[];const query=new Proxy({}, {get(_,key){if(key==='then')return(resolve)=>resolve({data:rows,error:dbError});return(...args)=>{calls.push([key,...args]);return query;}}});return {calls,auth:{getUser:async()=>({data:{user},error:null})},rpc:async()=>({data:admin,error:null}),from:(table)=>{calls.push(['from',table]);return query;}};}
const route=client=>load('src/app/api/workspace/route.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/client-projects':lib,'next/server':{after:()=>{}},'@/lib/workspace-mailer':{sendWorkspaceEmails:async()=>({})}});
const req=(body,origin='https://portfolio.test')=>new Request('https://portfolio.test/api/workspace',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('anonymous access returns 401 before any database query',async()=>{const client=mock({user:null});assert.equal((await route(client).GET(new Request('https://portfolio.test/api/workspace'))).status,401);assert.equal((await route(client).POST(req(project))).status,401);assert.equal(client.calls.length,0)});
test('clients cannot use admin view or mutate client projects',async()=>{const client=mock();assert.equal((await route(client).GET(new Request('https://portfolio.test/api/workspace?admin=1'))).status,403);assert.equal((await route(client).POST(req(project))).status,403);assert.equal(client.calls.length,0)});
test('rejects cross-origin requests before accessing session',async()=>{assert.equal((await route(null).POST(req(project,'https://attacker.test'))).status,403)});
test('client reads filter by verified session email',async()=>{const client=mock();assert.equal((await route(client).GET(new Request('https://portfolio.test/api/workspace'))).status,200);assert(client.calls.some(c=>c[0]==='eq'&&c[1]==='email'&&c[2]==='client@example.com'))});
test('comment author is set by the server and cannot be spoofed',async()=>{const client=mock();assert.equal((await route(client).POST(req({action:'update',project_id:id,body:'Olá',author_role:'admin',author_id:'forged'}))).status,200);const inserted=client.calls.find(c=>c[0]==='insert')[1];assert.equal(inserted.author_role,'client');assert.equal(inserted.author_id,id)});
test('stale admin edits return conflict instead of claiming success',async()=>{const client=mock({admin:true,rows:null});assert.equal((await route(client).POST(req({...project,id,version:'2026-09-11T00:00:00Z'}))).status,409);assert(client.calls.some(c=>c[0]==='eq'&&c[1]==='updated_at'))});
test('missing schema returns actionable setup state',async()=>{const client=mock({admin:true,dbError:{code:'PGRST205'}});const result=await route(client).GET(new Request('https://portfolio.test/api/workspace?admin=1'));assert.equal(result.status,503);assert.equal((await result.json()).setupRequired,true)});
const templates=load('src/lib/workspace-email-template.ts',{'./client-projects':lib});
test('emails escape project content and keep links inside client portal',()=>{const job={id,recipient:'client@example.test',kind:'stage',attempts:1,payload:{name:'<script>alert(1)</script>',title:'Projeto\r\nBcc: bad',stage:3,next_step:'<img src=x onerror=alert(1)>',due_date:'2026-10-11'}};const message=templates.workspaceEmailTemplate(job,'https://portfolio.test');assert(!message.html.includes('<script>'));assert(!message.html.includes('<img'));assert(!/[\r\n]/.test(message.subject));assert(message.html.includes('https://portfolio.test/cliente'));assert(message.text.includes('Em revisão'));assert.throws(()=>templates.workspaceEmailTemplate(job,'http://portfolio.test'))});
test('invitation explains first access without exposing a password',()=>{const message=templates.workspaceEmailTemplate({id,recipient:'client@example.test',kind:'invitation',attempts:1,payload:{name:'Cliente'}},'https://portfolio.test');assert(message.text.includes('crie sua senha'));assert(message.html.includes('Acessar meus projetos'));});

test('admin can edit every client profile field while clients cannot change other profiles',async()=>{
 const fields={action:'client',id,version:'2026-09-11T00:00:00Z',name:'Cliente',email:'client@example.com',company:'Empresa',phone:'11999999999',project_contact:'Responsável',additional_email:'extra@example.com',whatsapp:'11988888888',address:'São Paulo'};
 const client=mock({admin:true,rows:{id}});
 assert.equal((await route(client).POST(req(fields))).status,200);
 const saved=client.calls.find(c=>c[0]==='update')[1];
 for(const key of ['phone','project_contact','additional_email','whatsapp','address'])assert.equal(saved[key],fields[key]);
 const denied=mock(); assert.equal((await route(denied).POST(req(fields))).status,403);
});
test('archive requires admin, a valid boolean and a matching version',async()=>{
 const mutation={action:'archive_project',id,version:'2026-09-11T00:00:00Z',archived:true};
 assert.throws(()=>lib.parseWorkspaceMutation({...mutation,archived:'true'}));
 assert.equal((await route(mock()).POST(req(mutation))).status,403);
 assert.equal((await route(mock({admin:true,rows:null})).POST(req(mutation))).status,409);
 const client=mock({admin:true,rows:{id}});assert.equal((await route(client).POST(req({...mutation,archived:false}))).status,200);
 assert.equal(client.calls.find(c=>c[0]==='update')[1].archived_at,null);
 assert(client.calls.some(c=>c[0]==='eq'&&c[1]==='updated_at'));
});
test('deletion rejects clients and stale versions',async()=>{
 const mutation={action:'delete_project',id,version:'2026-09-11T00:00:00Z'};
 assert.equal((await route(mock()).POST(req(mutation))).status,403);
 const client=mock({admin:true});client.rpc=async name=>({data:name==='is_portfolio_admin',error:null});
 assert.equal((await route(client).POST(req(mutation))).status,409);
});

const fileRoute=client=>load('src/app/api/workspace/files/route.ts',{'@/lib/supabase/server':{createClient:async()=>client}});
const fileName=id+'-document.pdf';
const deleteReq=(body={project:id,name:fileName},origin='https://portfolio.test')=>new Request('https://portfolio.test/api/workspace/files',{method:'DELETE',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
function fileClient({user={id},accessible=true,removed=[{name:fileName}],error=null}={}) {
 const calls=[];
 return {calls,auth:{getUser:async()=>({data:{user}})},from:()=>({select:()=>({eq:(_column,project)=>({maybeSingle:async()=>{calls.push(['access',project]);return {data:accessible?{id:project}:null,error:null};}})})}),storage:{from:bucket=>({remove:async paths=>{calls.push(['remove',bucket,paths]);return {data:removed,error};}})}};
}
test('file deletion rejects foreign origins, anonymous users and inaccessible projects',async()=>{
 assert.equal((await fileRoute(null).DELETE(deleteReq(undefined,'https://attacker.test'))).status,403);
 const anonymous=fileClient({user:null}); assert.equal((await fileRoute(anonymous).DELETE(deleteReq())).status,401);assert.equal(anonymous.calls.length,0);
 const denied=fileClient({accessible:false});assert.equal((await fileRoute(denied).DELETE(deleteReq())).status,404);assert(!denied.calls.some(c=>c[0]==='remove'));
});
test('file deletion cannot escape the authorized project folder',async()=>{
 for(const name of ['../document.pdf',fileName+'/other',id+'-../other',id+'-file\\other']) {
  const client=fileClient();assert.equal((await fileRoute(client).DELETE(deleteReq({project:id,name}))).status,400);assert.equal(client.calls.length,0);
 }
 const client=fileClient();assert.equal((await fileRoute(client).DELETE(deleteReq())).status,200);assert.deepEqual(client.calls[1],['remove','workspace-files',[id+'/'+fileName]]);
});
test('file deletion does not claim success when storage rejects or removes nothing',async()=>{
 assert.equal((await fileRoute(fileClient({removed:[]})).DELETE(deleteReq())).status,404);
 assert.equal((await fileRoute(fileClient({error:{message:'denied'}})).DELETE(deleteReq())).status,503);
});
