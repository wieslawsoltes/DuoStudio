#!/usr/bin/env python3
"""Functional engine, application and simulator regression tests. No network needed."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse, base64, io, json, os, time, zipfile, xml.etree.ElementTree as ET
R = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(); p.add_argument('--url'); p.add_argument('--chromium',default=os.getenv('CHROMIUM','/usr/bin/chromium')); args=p.parse_args()
results=[]; errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':1100});page.set_default_timeout(7000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 if args.url: page.goto(args.url)
 else: page.set_content((R/'dist/duo-studio.html').read_text())
 page.wait_for_function('window.Duo?.simulator');page.evaluate('window.S=Duo.Studio; window.D=Duo;D.store.data.prefs.reducedMotion=true;D.shell.refresh()')
 def ev(js,arg=None): return page.evaluate(js,arg)
 def ok(v,message='Assertion failed'):
  if not v: raise AssertionError(message)
 def check(name,fn):
  t=time.monotonic()
  try:
   v=fn();ok(v is not False);results.append({'test':name,'passed':True,'ms':round((time.monotonic()-t)*1000)});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'test':name,'passed':False,'error':str(e)});print('FAIL',name,str(e),flush=True)
   page.screenshot(path=str(R/f'screenshots/failure-creative-{len(results)}.png'))
 def open_app(id):
  ev("id=>{document.querySelector('#system-dialog').close();D.shell.closeSecond();D.shell.setPosture('open');D.shell.open(id)}",id);page.wait_for_timeout(90)
  return page.locator(f'#workspace [data-app={id}]')
 def model(id):return ev('id=>D.store.data.apps[id]',id)
 def action(id,name,data=None):
  return ev("async a=>{const i=D.shell.getInstance(a.id);await i.actions[a.name]({dataset:a.data||{}},{shiftKey:false});}",{'id':id,'name':name,'data':data})
 def field(id,name,value):
  el=page.locator(f'#workspace [data-app={id}] [data-field="{name}"]').first
  el.fill(str(value));el.dispatch_event('change')
 creative=['draftline','scenelab','polyform','pulse','cutroom','folio','gridsheet','keydeck','inkpad','arcade']
 for id in creative:
  check(id+': usable mounted panes',lambda id=id:(open_app(id),ev('id=>[...D.shell.getInstance(id).root.querySelectorAll(".duo-panes>.pane")].filter(p=>p.clientWidth>0&&p.clientHeight>0).length===2',id))[1])
 check('All twenty model seeds satisfy session schema',lambda:ev('(()=>{for(const id of D.apps.keys())D.shell.getInstance(id);D.store.validate(JSON.parse(D.store.export()));return true})()'))
 # Calculation semantics and bounded error handling.
 cases=[('precedence','=2+3*4',14),('right associative powers','=2^3^2',512),('unary exponent','=-2^2',-4),('percent','=200*15%',30),('lazy IF','=IF(TRUE,7,1/0)',7),('IFERROR','=IFERROR(1/0,42)',42),('text','=UPPER("duo")&" studio"','DUO studio'),('range SUM','=SUM(A1:A3)',6),('average','=AVERAGE(A1:A3)',2),('range COUNT','=COUNT(A1:A3)',3),('division zero','=1/0','#DIV/0!'),('negative sqrt','=SQRT(-1)','#NUM!'),('unknown function','=EXEC("bad")','#NAME?'),('invalid reference','=ZZ999','#REF!'),('cycle','=D1','#CYCLE!'),('syntax rejection','=globalThis.alert(1)','#NAME?')]
 for name,formula,want in cases:
  check('Formula: '+name,lambda f=formula,w=want:ok(ev('f=>new S.Formula.Workbook({A1:1,A2:2,A3:3,D1:f}).value("D1")',f)==w))
 check('Formula fill preserves absolute references and quoted text',lambda:ev("S.Formula.translate('=$A1+B$2+\"A1\"',2,3)==='$A3+E$2+\"A1\"'.replace(/^/,'=')"))
 check('Formula malicious syntax cannot access host objects',lambda:ev("(()=>{delete globalThis.probe;const w=new S.Formula.Workbook({A1:'=constructor.constructor(\"globalThis.probe=1\")()'});w.value('A1');return !globalThis.probe;})()"))
 check('CSV round trip preserves delimiter, quotes, multiline cells',lambda:ev("(()=>{const a=[['one,two','a\"b','line\\nnext'],['3','4','5']];return JSON.stringify(S.CSV.parse(S.CSV.stringify(a)))===JSON.stringify(a)})()"))
 check('CSV rejects unclosed quoted cell',lambda:ev("(()=>{try{S.CSV.parse('\"unfinished');return false}catch{return true}})()"))
 # Actual CAD interactions and geometry interchange.
 def cad():
  r=open_app('draftline');n=len(model('draftline')['entities']);el=r.locator('.cad-command input');el.fill('line 10 20 130 80');el.press('Enter');ok(len(model('draftline')['entities'])==n+1);action('draftline','duplicate');ok(len(model('draftline')['entities'])==n+2);action('draftline','project-undo');ok(len(model('draftline')['entities'])==n+1);action('draftline','project-redo');ok(len(model('draftline')['entities'])==n+2)
 check('CAD command, duplicate, scoped undo and redo',cad)
 check('CAD DXF: lines, circles, rectangles and text round trip',lambda:ev("(()=>{const e=D.store.data.apps.draftline.entities,r=S.Geometry.CAD.parseDXF(S.Geometry.CAD.dxf(e));return r.entities.length>e.length&&r.entities.some(e=>e.type==='circle')&&r.entities.some(e=>e.type==='text')})()"))
 check('CAD SVG output parses without XML errors',lambda:ev("!new DOMParser().parseFromString(S.Geometry.CAD.svg(D.store.data.apps.draftline.entities),'image/svg+xml').querySelector('parsererror')"))
 def map_cad():
  open_app('maps');n=len(model('draftline')['entities']);action('maps','studio-handoff');page.wait_for_timeout(120);ok(len(model('draftline')['entities'])>n+1);ok(model('draftline')['entities'][-1]['layer']=='Fictional route')
 check('Maps handoff creates connected CAD route segments',map_cad)
 check('Concave polygon ear clipping and closed extrusion',lambda:ev("(()=>{const p=[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2]],m=S.Geometry.extrude(p,2,30,4);S.Geometry.validateMesh(m);return S.Geometry.triangulate(p).length===4&&m.vertices.length===30&&m.faces.length===56})()"))
 check('OBJ negative indices and quad triangulation',lambda:ev("(()=>{const m=S.Geometry.parseOBJ('v 0 0 0\\nv 1 0 0\\nv 1 1 0\\nv 0 1 0\\nf -4 -3 -2 -1');return m.faces.length===2&&m.faces[1][2]===3})()"))
 check('OBJ rejects invalid face indices',lambda:ev("(()=>{try{S.Geometry.parseOBJ('v 0 0 0\\nf 1 2 3');return false}catch{return true}})()"))
 def scene():
  open_app('scenelab');n=len(model('scenelab')['objects']);action('scenelab','add-object',{'type':'cube'});ok(len(model('scenelab')['objects'])==n+1);action('scenelab','duplicate-object');ok(len(model('scenelab')['objects'])==n+2);action('scenelab','delete-object');ok(len(model('scenelab')['objects'])==n+1)
 check('SceneLab add, duplicate and delete actual geometry',scene)
 check('Scene OBJ/STL exports contain transformed triangles',lambda:ev("(()=>{const o=D.store.data.apps.scenelab.objects;return S.Geometry.parseOBJ(S.Geometry.obj(o)).faces.length>100&&S.Geometry.stl(o).includes('facet normal')})()"))
 def poly():
  open_app('polyform');n=len(model('scenelab')['objects']);action('polyform','send-scene');page.wait_for_timeout(100);ok(len(model('scenelab')['objects'])==n+1);ok(model('scenelab')['objects'][-1]['type']=='mesh')
 check('Polyform generates mesh and transfers into SceneLab',poly)
 def pulse():
  r=open_app('pulse');old=model('pulse')['tracks'][0]['pattern'][1];r.locator('[data-action=step][data-track=kick][data-step="1"]').click();ok(model('pulse')['tracks'][0]['pattern'][1]!=old);action('pulse','play');page.wait_for_timeout(160);ok(ev('D.shell.getInstance("pulse").api.engine.running'));ev('D.shell.getInstance("pulse").api.engine.play()');page.wait_for_timeout(160);ok(ev('D.shell.getInstance("pulse").api.engine.running'));ev('D.shell.home()');ok(ev('!D.shell.getInstance("pulse").api.engine.running'))
 check('Pulse edits steps, schedules audio, tolerates double Play, stops hidden',pulse)
 check('Offline audio bounce contains audible stereo PCM and correct WAV header',lambda:ev("async()=>{const m=structuredClone(D.store.data.apps.pulse);m.bars=1;const b=await S.Audio.render(m,1),v=S.Audio.wav(b);return b.numberOfChannels===2&&b.length>44100&&b.getChannelData(0).some(n=>Math.abs(n)>.001)&&new TextDecoder().decode(v.slice(0,4))==='RIFF'&&new DataView(v.buffer).getUint32(40,true)===v.length-44}"))
 check('MIDI export has SMF header, tempo and note messages',lambda:ev("(()=>{const v=S.Audio.midi(D.store.data.apps.pulse);return new TextDecoder().decode(v.slice(0,4))==='MThd'&&v.includes(0x99)&&v.includes(0x51)})()"))
 def video_handoff():
  open_app('youtube');n=len(model('cutroom')['clips']);action('youtube','studio-handoff');page.wait_for_timeout(250);ok(len(model('cutroom')['clips'])==n+1);ok(model('cutroom')['clips'][-1]['source']=='dunes')
 check('YouTube film handoff appends an editable timeline clip',video_handoff)
 def cut():
  open_app('cutroom');n=len(model('cutroom')['clips']);ev('D.shell.getInstance("cutroom").api.seek(2)');page.wait_for_timeout(160);action('cutroom','split-clip');ok(len(model('cutroom')['clips'])==n+1)
 check('Cutroom seeks and splits real source media',cut)
 def sheet():
  r=open_app('gridsheet');ok(ev('D.shell.getInstance("gridsheet").api.workbook.value("D7")')==3546);ev('D.shell.getInstance("gridsheet").api.select("E2")');f=r.locator('.cell-formula');
  if not f.count():f=r.locator('[name=formula]')
  f.fill('=D2*2');f.press('Enter');ok(ev('D.shell.getInstance("gridsheet").api.workbook.value("E2")')==2700)
 check('GridSheet formula-bar editing recalculates dependencies',sheet)
 def fill():
  ev('()=>{const a=D.shell.getInstance("gridsheet").api;a.select("E2");a.select("E4",true);a.fill(false)}');ok(model('gridsheet')['cells']['E4']=='=D4*2');ok(ev('D.shell.getInstance("gridsheet").api.workbook.value("E4")')==1520)
 check('GridSheet range-fill translates relative formulas',fill)
 check('GridSheet virtualizes cell DOM',lambda:ev('document.querySelectorAll("[data-app=gridsheet] [data-cell]").length<1200'))
 # Independent ZIP/XML validation of all three editable Office formats.
 for app,method,part in [('folio','docx','word/document.xml'),('gridsheet','xlsx','xl/worksheets/sheet1.xml'),('keydeck','pptx','ppt/slides/slide1.xml')]:
  def office(app=app,method=method,part=part):
   data=ev("a=>{const v=S.Office[a.method](D.store.data.apps[a.app]);let s='';for(const c of v)s+=String.fromCharCode(c);return btoa(s)}",{'app':app,'method':method})
   raw=base64.b64decode(data);(R/'tests'/('export-fixture.'+method)).write_bytes(raw)
   with zipfile.ZipFile(io.BytesIO(raw)) as z:
    ok(z.testzip() is None);ok(part in z.namelist());ok('[Content_Types].xml' in z.namelist())
    for name in z.namelist():
     if name.endswith(('.xml','.rels')):ET.fromstring(z.read(name))
  check(method.upper()+': independently validated ZIP CRC and XML package',office)
 check('DOCX re-import preserves document text',lambda:ev("async()=>{const html=await S.Office.readDocx(S.Office.docx(D.store.data.apps.folio));return html.includes('possibility')&&html.includes('Three things')}"))
 check('XLSX re-import preserves formulas and values',lambda:ev("async()=>{const m=await S.Office.readXlsx(S.Office.xlsx(D.store.data.apps.gridsheet));return m.cells.D7==='=SUM(D2:D5)'&&m.cells.A2==='Prototype'}"))
 check('PPTX re-import preserves all slide titles',lambda:ev("async()=>{const m=await S.Office.readPptx(S.Office.pptx(D.store.data.apps.keydeck));return m.slides.length===3&&m.slides[0].title.includes('More room')}"))
 check('ZIP reader rejects CRC corruption',lambda:ev("async()=>{const a=S.ZIP.create({'test.txt':'hello'});a[38]^=1;try{await S.ZIP.read(a);return false}catch{return true}}"))
 check('ZIP reader rejects path traversal',lambda:ev("async()=>{try{await S.ZIP.read(S.ZIP.create({'../bad.txt':'no'}));return false}catch{return true}}"))
 def deck():
  open_app('keydeck');n=len(model('keydeck')['slides']);action('keydeck','deck-add');ok(len(model('keydeck')['slides'])==n+1);field('keydeck','title','An editable new slide');ok(next(s for s in model('keydeck')['slides'] if s['id']==model('keydeck')['selected'])['title']=='An editable new slide');action('keydeck','project-undo');ok(next(s for s in model('keydeck')['slides'] if s['id']==model('keydeck')['selected'])['title']!='An editable new slide')
 check('Keydeck adds slides, edits content and undoes changes',deck)
 check('Keydeck SVG and standalone deck are substantive exports',lambda:ev("(()=>{const a=D.shell.getInstance('keydeck').api;return a.svg().includes('<svg')&&a.htmlDeck().includes('ArrowRight')})()"))
 def ink():
  r=open_app('inkpad');page.wait_for_timeout(150);canvas=r.locator('.ink-viewport canvas').first;box=canvas.bounding_box();ok(box);x=box['x']+box['width']*.3;y=box['y']+box['height']*.4
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+90,y+25,steps=12);page.mouse.up();page.wait_for_timeout(120);ok(model('inkpad')['layers'][1]['imageData'].startswith('data:image/png'));n=len(model('inkpad')['layers']);action('inkpad','ink-layer-add');ok(len(model('inkpad')['layers'])==n+1);action('inkpad','project-undo');ok(len(model('inkpad')['layers'])==n)
 check('Inkpad pressure-path painting persists pixels and supports layer undo',ink)
 def picture_share():
  action('inkpad','ink-share');page.wait_for_timeout(300);ok(ev('D.shell.getState().secondary==="instagram"'));ok(model('instagram')['posts'][0].get('dataURL','').startswith('data:image/jpeg'))
 check('Inkpad shares a composed image into Instagram',picture_share)
 check('2048 merges each tile only once per move',lambda:ev("(()=>{const r=S.Games.merge([2,2,2,2,...Array(12).fill(0)],'left');return JSON.stringify(r.board.slice(0,4))==='[4,4,0,0]'&&r.score===8})()"))
 def games():
  open_app('arcade');ev('D.shell.getInstance("arcade").api.play()');page.wait_for_timeout(250);ok(ev('D.shell.getInstance("arcade").api.playing'));ev('D.shell.home()');ok(ev('!D.shell.getInstance("arcade").api.playing'));ev('D.shell.open("arcade");D.shell.getInstance("arcade").api.setGame("snake");D.shell.getInstance("arcade").api.play()');page.wait_for_timeout(220);ok(ev('D.store.data.apps.arcade.game==="snake"'));ev('D.shell.actions.lock()');ok(ev('!D.shell.getInstance("arcade").api.playing'));ev('D.shell.actions.unlock()')
 check('Arcade games simulate, switch, and suspend on Home/Lock',games)
 # Files, backups and state continuity.
 def files():
  open_app('draftline');action('draftline','project-save');ok(ev('async()=> (await S.files.list()).some(r=>r.app==="draftline")'));ev('async()=>{await S.files.putMany([{id:"fixture-a",name:"a.bin",type:"application/octet-stream",data:new Uint8Array([1,2,3])},{id:"fixture-b",name:"b.txt",type:"text/plain",data:"hello"}]);}');ok(ev('async()=> (await S.files.get("fixture-a")).data[2]===3'))
 check('Files cabinet saves projects and atomically merges binary records',files)
 check('Full backup ZIP round trip includes session and file bytes',lambda:ev('async()=>{const a=await D.simulator.backup(false),v=await D.simulator.decodeBackup(a);return v.records.some(r=>r.id==="fixture-a"&&r.data[2]===3)&&JSON.parse(v.session).apps.draftline.entities.length>0}'))
 def categories():
  ev('D.shell.home()');page.locator('#home-view [data-category="Create"]').click();ok(page.locator('#home-view [data-category-app]:visible').count()==9);page.locator('#home-view [data-category="All"]').click();ok(page.locator('#home-view [data-category-app]:visible').count()==20)
 check('Launcher category filtering preserves twenty installed apps',categories)
 def palette():
  ev('D.simulator.commandPalette()');page.locator('.command-search').fill('Polyform');page.locator('.command-search').press('Enter');page.wait_for_timeout(100);ok(ev('D.shell.getState().primary==="polyform"'))
 check('Spotlight searches and launches creative apps using keyboard',palette)
 def split():
  ev('D.shell.pair("draftline","scenelab");D.simulator.set("stack","vertical")');page.wait_for_timeout(100);h=page.locator('.split-handle');h.focus();h.press('ArrowDown');ok(abs(ev('D.shell.getState().splitRatio')-.52)<.001);ok(ev('document.querySelector("#workspace").dataset.stack==="vertical"'));ev('D.simulator.set("stack","horizontal")')
 check('Vertical Split View has directional keyboard resizing',split)
 def retain():
  for id in creative:
   open_app(id);ev('id=>window.oldRoot=D.shell.getInstance(id).root',id)
   for posture in ['book','tabletop','closed','open']:
    ev('p=>D.shell.setPosture(p)',posture);page.wait_for_timeout(40);ok(ev('id=>D.shell.getInstance(id).root===window.oldRoot&&oldRoot.isConnected',id),id+' '+posture)
 check('Ten creative apps preserve instances through forty posture changes',retain)
 def compact():
  page.set_viewport_size({'width':393,'height':852});ev('D.shell.touch()')
  for id in creative:
   open_app(id)
   for pane in ['primary','secondary']:
    page.locator(f'#workspace [data-app={id}] [data-pane={pane}]').click();ok(ev('document.documentElement.scrollWidth<=innerWidth'))
  ev('D.shell.touch()');page.set_viewport_size({'width':1600,'height':1100})
 check('All creative app panes remain reachable in direct-touch mode',compact)
 def schema():
  for id,key,value in [('pulse','bpm',0),('gridsheet','rows',10000),('polyform','segments',20000),('inkpad','width',90000),('arcade','game','bad'),('cutroom','width',0)]:
   ok(ev('a=>{const v=JSON.parse(D.store.export());v.apps[a.id][a.key]=a.value;try{D.store.validate(v);return false}catch{return true}}',{'id':id,'key':key,'value':value}))
 check('Creative schemas reject invalid dimensions, rates and enumerations',schema)
 check('HTML sanitizer removes active content and unsafe URLs',lambda:ev("(()=>{const s=S.sanitize('<h1>Hello</h1><script>alert(1)</script><img src=x onerror=alert(1)><a href=javascript:alert(1)>bad</a>');return s.includes('Hello')&&!/script|onerror|javascript:/i.test(s)})()"))
 check('Scenario validator rejects executable or unknown event kinds',lambda:ev("(()=>{try{D.simulator.validateScenario({format:'duo-scenario',version:1,session:D.store.export(),events:[{kind:'eval',script:'alert(1)'}]});return false}catch{return true}})()"))
 def scenario():
  open_app('draftline');n=len(model('draftline')['entities']);ev('D.simulator.startScenario()');page.locator('[data-app=draftline] [data-action=duplicate]').click();ev('D.simulator.stopScenario()');ok(len(model('draftline')['entities'])==n+1);ev('async()=>await D.simulator.replay(D.simulator.getScenario())');ok(len(model('draftline')['entities'])==n+1)
 check('Scenario recorder replays CAD mutation from saved starting state',scenario)
 def video_render():
  open_app('cutroom')
  result=ev("""async()=>{const a=D.shell.getInstance('cutroom'),m=D.store.data.apps.cutroom;m.clips=m.clips.slice(0,2);m.clips.forEach(c=>{c.in=0;c.out=.65;c.transition='none'});m.width=640;m.height=360;m.time=0;a.api.render();let timer;try{const blob=await Promise.race([a.api.renderVideo(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Render timeout')),15000))]);if(!blob)return false;const v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(blob);document.body.append(v);await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('Output decode failed'));v.load()});await v.play();await new Promise(r=>setTimeout(r,180));const result=blob.size>1000&&v.videoWidth===640&&v.videoHeight===360&&v.currentTime>0;v.pause();URL.revokeObjectURL(v.src);v.remove();return result;}finally{clearTimeout(timer);a.actions.stop()}}""")
  ok(result)
 check('Cutroom records a real edited film that decodes and plays',video_render)
 check('Final models remain valid after editing, transfers and undo',lambda:ev('!!D.store.validate(JSON.parse(D.store.export()))'))
 check('No unexpected JavaScript exceptions',lambda:ok(not errors, '\n'.join(errors)))
 report={'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'results':results,'pageErrors':errors,'environment':ev('({secureContext:isSecureContext,webGPU:!!navigator.gpu,renderer:D.gpu.mode,persistentStorage:D.store.persistent,userAgent:navigator.userAgent})')}
 (R/'tests/creative-report.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k] for k in ['passed','failed','pageErrors']},indent=2),flush=True);b.close()
 raise SystemExit(bool(report['failed']))
