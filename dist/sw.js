/* Offline installation is opt-in from Device lab. Scope is this project only. */
'use strict';
const CACHE='duo-studio-757c5d8e91fe6723';
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
