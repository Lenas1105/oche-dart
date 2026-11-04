const CACHE_NAME='oche-dart-offline-v7-3-20261104';
const CORE=['./','./index.html','./styles.css?v=7.3','./app.js?v=7.3','./tap.wav','./manifest.webmanifest',
            './icon.svg','./apple-touch-icon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(
  fetch(event.request).then(response=>{
   if(response.ok){const clone=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,clone)).catch(()=>{});}
   return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||
   (event.request.mode==='navigate'?caches.match('./index.html'):Promise.reject(new Error('Ressource offline nicht im Cache')))))
 );
});
