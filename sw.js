/* 인터넷이 없어도 열리게: 처음 열 때 페이지·글꼴을 휴대폰에 저장해 두고, 다음부터는 저장된 걸로 엶.
   인터넷이 되면 version.txt(아주 작은 파일)만 확인해서, 바뀌었을 때만 새 페이지를 받아 둠 */
const CORE = 'hm-core-v1', FONT = 'hm-font-v1';
const FILES = ['./index.html', './version.txt', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CORE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
async function refresh(){
  try{
    const c = await caches.open(CORE), nv = await fetch('./version.txt', {cache:'no-store'});
    if(!nv.ok) return;
    const v = await nv.clone().text(), old = await c.match('./version.txt');
    if(old && (await old.text()) === v) return;
    const page = await fetch('./index.html', {cache:'no-store'});
    if(page.ok){ await c.put('./index.html', page); await c.put('./version.txt', nv); }
  }catch(err){}
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.mode === 'navigate' && u.origin === location.origin){
    e.respondWith((async () => {
      const hit = await caches.match('./index.html');
      if(hit){ e.waitUntil(refresh()); return hit; }
      try{ return await fetch(e.request); }catch(err){ return new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">인터넷이 연결되면 한 번 열어 주세요. 그다음부터는 인터넷 없이도 열려요.</p>', {headers:{'Content-Type':'text/html; charset=utf-8'}}); }
    })());
    return;
  }
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdn\.jsdelivr\.net$/.test(u.hostname)){
    e.respondWith(caches.open(FONT).then(async c => {
      const hit = await c.match(e.request); if(hit) return hit;
      try{ const r = await fetch(e.request); if(r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }catch(err){ return Response.error(); }
    }));
    return;
  }
  if(u.origin === location.origin) e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(h => h || fetch(e.request)));
});
