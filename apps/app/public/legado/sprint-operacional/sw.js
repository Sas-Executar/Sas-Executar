const BASE='/legado/sprint-operacional';
const CACHE='executar-foco-legado-v1';
const SHELL=[BASE+'/',BASE+'/index.html',BASE+'/app.css',BASE+'/data.js',BASE+'/app.js',BASE+'/manifest.webmanifest',BASE+'/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('executar-foco-legado-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match(BASE+'/index.html'))));
});
