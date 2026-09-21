#!/usr/bin/env python3
"""End-to-end source, designer, command-debugger and isolated build contracts."""
import argparse, json, os, zipfile, io
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--chromium',default=os.getenv('CHROMIUM','/usr/bin/chromium'));args=p.parse_args()
report={'passed':0,'failed':0,'results':[]};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1700,'height':1100});page.set_default_timeout(12000)
 page.on('pageerror',lambda e:errors.append(str(e)) if 'intentional boot failure' not in str(e) else None)
 page.set_content((R/'dist/duo-studio.html').read_text(),wait_until='load')
 def ev(js,arg=None):return page.evaluate(js,arg)
 def frame():return page.frame(name='duokit-'+ev('Duo.ide.token'))
 def live_click(selector):
  # Chromium 144 reports unscaled iframe child boxes; map actual pointer coordinates.
  f=frame();r=f.locator(selector).evaluate('(e)=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}')
  box=page.locator('.ide-live-frame').last.bounding_box();size=f.evaluate('({w:innerWidth,h:innerHeight})')
  page.mouse.click(box['x']+r['x']*box['width']/size['w'],box['y']+r['y']*box['height']/size['h'])
 def run():
  assert ev('Duo.ide.run()') is True
  page.wait_for_function('Duo.ide.frame && !Duo.ide.pending && Duo.ide.builtRevision===Duo.ide.project.revision',timeout=20000)
  frame().wait_for_function('window.DuoPreview')
 def check(name,fn):
  try:
   assert fn() is not False,name
   report['passed']+=1;report['results'].append({'test':name,'passed':True});print('PASS',name,flush=True)
  except Exception as error:
   report['failed']+=1;report['results'].append({'test':name,'passed':False,'error':str(error)});print('FAIL',name,error,flush=True)
   page.screenshot(path=str(R/'screenshots'/('failure-ide-'+str(report['failed'])+'.png')))
 check('All twenty apps register through extracted DuoKit host adapter',lambda:ev('Duo.apps.size===20 && [...Duo.apps.values()].every(a=>a.sdkVersion==="3.0.0")'))
 check('SDK core mounts outside simulator and preserves keyed DOM and focus',lambda:ev(r'''()=>{const host=document.createElement('div');document.body.append(host);const s=new DuoKit.State({text:'hello',count:0});const r=DuoKit.render(host,()=>DuoKit.VStack(DuoKit.TextField('Name',s.projectedValue.map('text')).id('input'),DuoKit.Text(()=>s.value.count).id('count')));const input=host.querySelector('input');input.focus();input.setSelectionRange(1,3);s.update(v=>({...v,count:4}));const ok=host.querySelector('input')===input&&document.activeElement===input&&input.selectionStart===1&&host.querySelector('[data-view-id=count]').textContent==='4';r.dispose();host.remove();return ok;}'''))
 check('Core views implement real two-way form bindings',lambda:ev(r'''()=>{const h=document.createElement('div');document.body.append(h);const s=new DuoKit.State('old'),r=DuoKit.render(h,()=>DuoKit.TextField('name',s));const i=h.querySelector('input');i.value='new';i.dispatchEvent(new Event('input'));const ok=s.value==='new';r.dispose();h.remove();return ok;}'''))
 page.locator('[data-open-ide]').click();page.wait_for_function('Duo.ide.frame&&!Duo.ide.pending')
 check('Full IDE builds real SDK preview from embedded source without downloads',lambda:ev('!!Duo.ide.lastGood&&Object.keys(Duo.ide.project.files).length>=59'))
 check('Preview is an opaque sandbox without same-origin or network privileges',lambda:ev(r'''()=>{const f=Duo.ide.frame;if(f.sandbox.contains('allow-same-origin'))return false;try{void f.contentWindow.Duo;return false;}catch{return f.sandbox.contains('allow-scripts');}}'''))
 check('Preview mounts working CAD geometry, not screenshot content',lambda:frame().evaluate('Duo.shell.getInstance("draftline").root.querySelectorAll("canvas").length>0'))
 # Prove all source modules are used by edited builds, then interact with their mount contracts.
 ev(r'''()=>{const w=Duo.ide.project;for(const id of Duo.apps.keys()){const path='src/apps/'+id+'.js';w.set(path,w.files[path]+'\nDuo.apps.get('+JSON.stringify(id)+').name="Edited '+id+'";\n');}}''')
 run()
 for app in ['chatgpt','threads','google','tiktok','whatsapp','instagram','youtube','maps','gmail','gemini','draftline','scenelab','polyform','pulse','cutroom','folio','gridsheet','keydeck','inkpad','arcade']:
  check(app+': edited source executes and SDK context mounts',lambda app=app:frame().evaluate('id=>{Duo.shell.open(id);const i=Duo.shell.getInstance(id);return Duo.apps.get(id).name==="Edited "+id&&i.ctx.sdk===DuoKit&&i.root.isConnected;}',app))
 check('Invalid source fails with diagnostic while last working preview survives',lambda:ev(r'''async()=>{const i=Duo.ide,w=i.project,f=i.frame;w.set('src/apps/draftline.js',w.files['src/apps/draftline.js']+'\nconst broken = ;');const result=await i.run();return result===false&&i.frame===f&&i.errors.some(e=>e.path==='src/apps/draftline.js'&&e.line>1);}'''))
 ev('Duo.ide.project.resetFile("src/apps/draftline.js")')
 check('Source undo/redo restores file bytes',lambda:ev(r'''()=>{const w=Duo.ide.project,p='src/apps/draftline.js',before=w.files[p];w.set(p,before+'\n// edited');w.undo();if(w.files[p]!==before)return false;w.redo();return w.files[p]===before+'\n// edited';}'''))
 check('Workspace rejects traversal and malformed embedded source',lambda:ev(r'''()=>{const w=Duo.ide.project;try{w.set('../escape.js','');return false;}catch{}const snapshot=w.snapshot();delete snapshot.files['src/core.js'];try{w.restore(snapshot);return false;}catch{return true;}}'''))
 # Work on actual CAD UI, persist both original-DOM attributes and inserted SDK controls.
 ev('Duo.ide.project.app="draftline"');run()
 frame().evaluate('DuoPreview.select(Duo.shell.getInstance("draftline").root.querySelector("button"))')
 page.wait_for_function('Duo.ide.selection?.app==="draftline"')
 selector=ev('Duo.ide.selection.selector')
 ev('(selector)=>Duo.ide.patch("draftline",selector,{text:"Edited CAD tool",style:{background:"rgb(12, 34, 56)",borderRadius:"17px"}})',selector)
 check('Imperative-app visual edits change live UI and editable layout source',lambda:frame().evaluate('selector=>{const el=Duo.shell.getInstance("draftline").root.querySelector(selector);return el.textContent==="Edited CAD tool"&&el.style.borderRadius==="17px";}',selector) and 'Edited CAD tool' in ev('Duo.ide.project.files["views/draftline.layout.json"]'))
 run()
 check('Visual layout edits survive complete source rebuild',lambda:frame().evaluate('selector=>Duo.shell.getInstance("draftline").root.querySelector(selector).textContent==="Edited CAD tool"',selector))
 # Create a new app via the real template dialog.
 page.locator('[data-dev=new]').first.click();page.locator('#new-app-name').fill('Acceptance Counter');page.locator('#create-app').click();page.wait_for_function('Duo.ide.frame&&!Duo.ide.pending&&Duo.ide.project.app.startsWith("user-")')
 app=ev('Duo.ide.project.app');viewpath='views/'+app+'.view.json'
 check('New app template installs in launcher with editable code and view documents',lambda:frame().evaluate('id=>Duo.apps.has(id)&&!!Duo.shell.getInstance(id).api.view',app) and ev('path=>!!Duo.ide.project.files[path]',viewpath))
 live_click('[data-view-id=more]');frame().wait_for_function('Duo.store.data.apps["'+app+'"].count===1')
 check('New application commands mutate real state and update rendered text',lambda:frame().locator('[data-view-id=count]').text_content()=='1')
 # Modify source, rerun preserving model.
 ev('id=>{const w=Duo.ide.project,p="src/apps/"+id+".js";w.set(p,w.files[p].replace("s.count + 1","s.count + 10"));}',app);page.wait_for_timeout(300);run()
 live_click('[data-view-id=more]');frame().wait_for_function('Duo.store.data.apps["'+app+'"].count===11')
 check('Editing JavaScript changes command behavior and retains runtime data across rebuild',lambda:frame().locator('[data-view-id=count]').text_content()=='11')
 frame().evaluate('DuoPreview.select(document.querySelector("[data-view-id=title]"))');page.wait_for_function('Duo.ide.selection?.viewId==="title"')
 page.locator('[data-property=text]').fill('Designed live');page.locator('[data-property=text]').dispatch_event('change');page.wait_for_timeout(150)
 check('WYSIWYG text changes round-trip to native view JSON and render immediately',lambda:'Designed live' in ev('path=>Duo.ide.project.files[path]',viewpath) and frame().locator('[data-view-id=title]').text_content()=='Designed live')
 ev('id=>Duo.ide.patch(id,\'[data-view-id="more"]\',{action:"decrement",text:"Subtract instead"})',app);page.wait_for_timeout(100)
 live_click('[data-view-id=more]');frame().wait_for_function('Duo.store.data.apps["'+app+'"].count===10')
 check('Visual action connections change actual button behavior',lambda:frame().locator('[data-view-id=count]').text_content()=='10')
 frame().locator('[data-view-id=note]').fill('Bound through SDK');page.wait_for_timeout(100)
 check('Native view binding updates shared model and dependent label',lambda:frame().locator('[data-view-id=note-preview]').text_content()=='Bound through SDK')
 ev('id=>Duo.ide.patch(id,\'[data-view-id="root"]\',{append:Duo.Dev.component("Text","inserted-view")})',app);page.wait_for_timeout(150)
 check('Component insertion creates real SDK view and persists readable descriptor',lambda:frame().locator('[data-view-id=inserted-view]').count()==1 and 'inserted-view' in ev('p=>Duo.ide.project.files[p]',viewpath))
 run()
 check('Two-way view-document edits survive a complete rebuild',lambda:frame().locator('[data-view-id=title]').text_content()=='Designed live' and frame().locator('[data-view-id=inserted-view]').count()==1)
 # Hierarchy edits change descriptors, not a detached imitation of the app UI.
 frame().evaluate('DuoPreview.select(document.querySelector("[data-view-id=inserted-view]"))');page.wait_for_function('Duo.ide.selection?.viewId==="inserted-view"')
 ev('Duo.ide.viewOperation("up")');page.wait_for_timeout(100)
 check('Hierarchy reordering round-trips to view-source order',lambda:ev('p=>JSON.parse(Duo.ide.project.files[p]).children.at(-2).id==="inserted-view"',viewpath))
 ev('Duo.ide.viewOperation("duplicate")');page.wait_for_timeout(100)
 check('Duplicating a view preserves properties with unique stable identities',lambda:frame().locator('[data-view-id^="inserted-view-"]').count()==1)
 frame().evaluate("DuoPreview.select(document.querySelector('[data-view-id^=\"inserted-view-\"]'))");page.wait_for_function('Duo.ide.selection?.viewId.startsWith("inserted-view-")')
 ev('Duo.ide.viewOperation("delete")');page.wait_for_timeout(100)
 check('Deleting a view removes its actual descriptor and live DOM',lambda:frame().locator('[data-view-id^="inserted-view-"]').count()==0)
 # Persist binary project data across builds and exports without sharing parent storage.
 frame().evaluate('Duo.Studio.files.put({id:"ide-resource-test",name:"sample.bin",type:"application/octet-stream",data:new Uint8Array([0,19,255,72])})')
 page.wait_for_function('Duo.ide.project.resources.some(r=>r.id==="ide-resource-test")')
 run()
 check('Project filesystem bytes survive rebuilding into a new sandbox',lambda:frame().evaluate('async()=>Array.from((await Duo.Studio.files.get("ide-resource-test")).data).join() === "0,19,255,72"'))
 check('Browser debugger sees named, editable original source files',lambda:ev('Duo.ide.lastGood.html.includes("sourceURL=duokit:///src/apps/chatgpt.js") && Duo.ide.lastGood.html.includes("sourceURL=duokit:///sdk/duokit.js")'))
 # An execution error is not a successful build; the last good runtime stays alive.
 identity=frame().evaluate('window.__lastGood="runtime-identity"')
 code=ev('id=>Duo.ide.project.files["src/apps/"+id+".js"]',app)
 ev(r'v=>Duo.ide.project.set("src/apps/"+v.id+".js", "throw new Error(\"intentional boot failure\");\n"+v.code)',{'id':app,'code':code})
 ev('Duo.ide.run()');page.wait_for_function('!Duo.ide.pending && document.querySelector("#ide-status").textContent==="Runtime startup failed"')
 check('Runtime startup exceptions preserve last good running app',lambda:frame().evaluate('window.__lastGood')==identity)
 ev('v=>Duo.ide.project.set("src/apps/"+v.id+".js",v.code)',{'id':app,'code':code})
 # Simulator ↔ IDE must not reparent/reload the frame.
 frame().evaluate('window.__continuity=Math.random().toString(36)');identity=frame().evaluate('window.__continuity')
 ev('Duo.ide.exit()');page.wait_for_timeout(200);check('Full simulator restores device enclosure and folding controls',lambda:not frame().evaluate('Duo.shell.getState().directTouch') and frame().locator('.studio-topbar').is_visible());ev('Duo.ide.enter()');page.wait_for_timeout(200)
 check('IDE/simulator switching preserves iframe realm and application state',lambda:frame().evaluate('window.__continuity')==identity and frame().locator('[data-view-id=count]').text_content()=='10')
 for destination in ['folded','tabletop','desktop','unfolded']:
  page.locator('#ide-destination').select_option(destination);page.wait_for_timeout(80)
 check('All preview sizes retain running application instance',lambda:frame().evaluate('window.__continuity')==identity)
 # Runtime breakpoint actually pauses before mutation, step pauses after.
 ev('id=>Duo.ide.toggleBreak(id,"increment")',app);ev('id=>Duo.ide.send("invoke",{app:id,action:"increment"})',app)
 page.wait_for_function('Duo.ide.paused?.phase==="before"')
 check('Command breakpoint suspends before application mutation',lambda:frame().evaluate('id=>Duo.store.data.apps[id].count',app)==10 and ev('Duo.ide.paused.frames.length')>=1)
 check('Watch expressions evaluate paused state in preview only',lambda:ev('Duo.ide.evaluate("state.count + 2")').get('value')==12)
 ev('Duo.ide.send("step")');page.wait_for_function('Duo.ide.paused?.phase==="after"')
 check('Step runs the command then suspends with updated state',lambda:frame().evaluate('id=>Duo.store.data.apps[id].count',app)==20)
 ev('Duo.ide.send("resume")');page.wait_for_function('!Duo.ide.paused')
 ev('id=>Duo.ide.send("invoke",{app:id,action:"inspect"})',app);page.wait_for_function('Duo.ide.paused?.phase==="checkpoint"')
 check('Explicit awaited checkpoints expose application locals and stack',lambda:ev('Duo.ide.paused.locals.count===20 && Duo.ide.paused.frames[0].action==="inspect"'))
 ev('Duo.ide.send("resume")');page.wait_for_function('!Duo.ide.paused')
 ev('id=>Duo.ide.send("state-edit",{app:id,json:JSON.stringify({...Duo.ide.snapshot.apps[id],count:45})})',app);frame().wait_for_function('Duo.store.data.apps["'+app+'"].count===45')
 check('Variables editor applies validated model through SDK restore',lambda:frame().locator('[data-view-id=count]').text_content()=='45')
 check('Forged preview messages cannot mutate host selection/state',lambda:ev(r'''()=>{const i=Duo.ide,previous=i.selection;i.message({source:window,data:{duokit:3,token:i.token,type:'selection',selection:{app:'forged'}}});return i.selection===previous;}'''))
 check('Source compilation safely embeds script terminators and replacement metacharacters',lambda:ev("suffix=>{const w=Duo.ide.project,p='src/apps/'+w.app+'.js';w.set(p,w.files[p]+suffix);return !Duo.ide.compiler.build(w).html.includes(suffix);}","\n// </script> $& $'"))
 # Verify real engine debugging independently from the cooperative action debugger.
 def native_debugger():
  cdp=page.context.new_cdp_session(frame());pauses=[]
  cdp.on('Debugger.paused',lambda value:pauses.append(value))
  try:
   cdp.send('Debugger.enable');ev('Duo.ide.send("native-break")');page.wait_for_timeout(300)
   if not pauses:raise AssertionError('Native JavaScript debugger did not pause')
   call=pauses[-1]['callFrames'][0]
   value=cdp.send('Debugger.evaluateOnCallFrame',{'callFrameId':call['callFrameId'],'expression':'Duo.apps.size','returnByValue':True})
   return value['result']['value']>=21
  finally:
   if pauses:cdp.send('Debugger.resume')
   cdp.send('Debugger.disable');cdp.detach()
 check('Native JavaScript debugger pauses and inspects actual application registry',native_debugger)
 def exported():
  html=ev('Duo.ide.compiler.build(Duo.ide.project,{bridge:false,session:Duo.ide.previewSession()}).html')
  other=browser.new_page();other.set_content(html,wait_until='load');other.wait_for_function('window.DuoPreview')
  try:
   return other.evaluate('id=>Duo.apps.has(id)&&Duo.store.data.apps[id].count===45',app) and other.locator('[data-view-id=title]').text_content()=='Designed live'
  finally:other.close()
 check('Standalone edited export runs independently with persisted design and model',exported)
 check('Workspace JSON round trip retains source, view and resources',lambda:ev('()=>{const w=new Duo.Dev.Workspace(DuoSources);w.restore(Duo.ide.project.snapshot());return JSON.stringify(w.files)===JSON.stringify(Duo.ide.project.files)&&w.resources.length>0;}'))
 ev('Duo.ide.stop()');check('Stop destroys the runtime iframe',lambda:ev('Duo.ide.frame===null&&!Duo.ide.pending'))
 check('No unexpected JavaScript exceptions',lambda:not errors)
 report['pageErrors']=errors;browser.close()
(R/'tests/ide-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':report['passed'],'failed':report['failed'],'pageErrors':errors},indent=2))
raise SystemExit(bool(report['failed']))
