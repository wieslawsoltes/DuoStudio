#!/usr/bin/env python3
"""Generate first-party PWA files. No third-party network dependency or fonts."""
from pathlib import Path
import json, hashlib, struct, zlib
R=Path(__file__).resolve().parents[1];out=R/'dist'
def png(size):
    # Original paired-display glyph on a rounded dark square, encoded without Pillow.
    raw=bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            u,v=x/size,y/size;c=(22,25,41,255)
            for left,top in [(0.22,0.25),(0.51,0.19)]:
                if left<u<left+.26 and top<v<top+.56:
                    d=min(u-left,left+.26-u,v-top,top+.56-v)
                    c=(214,195,249,255) if d<.016 else (65+int(38*v),54+int(28*v),94+int(45*v),255)
            raw.extend(c)
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
def build():
    for n in (192,512): (out/f'icon-{n}.png').write_bytes(png(n))
    manifest={'id':'./','name':'Duo Studio · Creative OS','short_name':'Duo Studio','start_url':'./?touch=1','scope':'./','display':'standalone','background_color':'#101321','theme_color':'#101321','description':'An independent twenty-app creative studio and folding-device simulator.','icons':[{'src':f'icon-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in (192,512)]}
    (out/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2)+'\n')
    key=hashlib.sha256((out/'index.html').read_bytes()).hexdigest()[:16]
    worker="""/* Offline installation is opt-in from Device lab. Scope is this project only. */
'use strict';
const CACHE='duo-studio-__VERSION__';
const FILES=['./','./index.html','./duo-studio.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('duo-studio-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 const path=u.pathname.slice(scope.pathname.length);
 if(e.request.mode==='navigate'&&['','index.html','duo-studio.html'].includes(path)){
  e.respondWith((async()=>{try{const response=await fetch(e.request);if(response.ok){const c=await caches.open(CACHE);await c.put(new URL('./index.html',scope).href,response.clone());}return response;}catch{const response=await caches.match(new URL('./index.html',scope).href);return response||Response.error();}})());
 }else if(['manifest.webmanifest','icon-192.png','icon-512.png'].includes(path)){
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));
 }
});
""".replace('__VERSION__',key)
    (out/'sw.js').write_text(worker)
if __name__=='__main__':build()
