#!/usr/bin/env python3
"""Normal-origin lane: storage, offline PWA, and GPU adapter/compilation/execution.
The local restricted environment cannot navigate URLs; run this lane in GitHub Actions.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import argparse, json, os, threading, time
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--chromium',default=os.getenv('CHROMIUM','/usr/bin/chromium'));p.add_argument('--url');a=p.parse_args()
server=None
if not a.url:
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(R/'dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start()
url=a.url or f'http://127.0.0.1:{server.server_port}/'
report={'passed':0,'failed':0,'results':[]};errors=[]
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan'])
  context=b.new_context(viewport={'width':1600,'height':1100});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url,wait_until='load');page.wait_for_function('window.Duo?.simulator')
  def ev(js,arg=None):return page.evaluate(js,arg)
  def check(name,fn):
   try:
    if fn() is False:raise AssertionError(name)
    report['passed']+=1;report['results'].append({'test':name,'passed':True});print('PASS',name,flush=True)
   except Exception as e:report['failed']+=1;report['results'].append({'test':name,'passed':False,'error':str(e)});print('FAIL',name,str(e),flush=True)
  check('Hosted HTML initializes in secure context',lambda:ev('isSecureContext&&Duo.apps.size===20'))
  def persist():
   ev('async()=>{Duo.shell.open("folio");Duo.store.data.apps.folio.title="Hosted persistence sentinel";Duo.store.data.prefs.sim={battery:42,stack:"vertical"};Duo.store.flush();await Duo.Studio.files.put({id:"persistent-fixture",name:"fixture.bin",type:"application/octet-stream",data:new Uint8Array([19,71,202])});}')
   page.reload();page.wait_for_function('window.Duo?.simulator');return ev('async()=>Duo.store.data.apps.folio.title==="Hosted persistence sentinel"&&Duo.simulator.signals.battery===42&&(await Duo.Studio.files.get("persistent-fixture")).data[2]===202&&Duo.Studio.files.persistent')
  check('Session, device fixtures and IndexedDB bytes survive reload',persist)
  # Actual browser adapter evidence, not presence of shader strings.
  adapter=ev('async()=>{const a=await navigator.gpu?.requestAdapter();return a?{vendor:a.info?.vendor,architecture:a.info?.architecture,device:a.info?.device,description:a.info?.description}:null}')
  report['adapter']=adapter
  if adapter is not None:
   def gpu():
    ev('Duo.shell.pair("scenelab","polyform")');page.wait_for_timeout(1500)
    state=ev('({wallpaper:Duo.gpu.mode,scene:Duo.shell.getInstance("scenelab").api.renderer.backend,reason:Duo.shell.getInstance("scenelab").api.renderer.reason})');report['gpu']=state
    if state['scene']!='WebGPU' or state['wallpaper']!='WebGPU':raise AssertionError(str(state))
    return ev('async()=>{const v=Duo.shell.getInstance("scenelab").api.renderer;v.device.pushErrorScope("validation");v.draw();await v.device.queue.onSubmittedWorkDone();const e=await v.device.popErrorScope();if(e)throw Error(e.message);return v.triangleCount>100;}')
   check('WebGPU compiles and executes modeling and wallpaper pipelines',gpu)
   def loss():
    ev('Duo.shell.getInstance("scenelab").api.renderer.device.destroy()');page.wait_for_timeout(300);return ev('Duo.shell.getInstance("scenelab").api.renderer.backend==="Canvas 2D"')
   check('Explicit GPU device loss falls back without losing scene',loss)
  else:
   report['gpu']={'skipped':'No adapter in this browser/runner. GPU execution not asserted.'};print('SKIP WebGPU: no adapter',flush=True)
  def pwa():
   page.goto(url);page.wait_for_function('window.Duo?.simulator')
   ev('async()=>{await navigator.serviceWorker.register(new URL("./sw.js",location.href),{scope:"./"});await navigator.serviceWorker.ready;}')
   page.wait_for_function('!!navigator.serviceWorker.controller');context.set_offline(True)
   page.reload();page.wait_for_function('window.Duo?.simulator');result=ev('Duo.apps.size===20&&Duo.store.data.apps.folio.title==="Hosted persistence sentinel"');context.set_offline(False);return result
  check('Installed PWA boots all twenty apps completely offline',pwa)
  check('No unexpected page exceptions',lambda:not errors);report['pageErrors']=errors
  report['environment']=ev('({userAgent:navigator.userAgent,secureContext:isSecureContext,storage:Duo.store.persistent})');b.close()
finally:
 if server:server.shutdown()
 (R/'tests/hosted-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
raise SystemExit(bool(report['failed']))
