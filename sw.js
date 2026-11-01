/* 인터넷이 없어도 열리게: 페이지·글꼴을 휴대폰에 저장해 두고 씀.
   인터넷이 되면 열 때마다 version.txt(아주 작은 파일)를 먼저 확인해서, 바뀌었으면 새 페이지를 받아서 바로 보여 줌 */
const CORE = 'hm-core-v1', FONT = 'hm-font-v1';
const FILES = ['./index.html', './version.txt', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  // 이미 저장된 페이지가 있으면 그대로 두고(새 버전 확인은 열 때 함), 처음이면 받아 둠
  e.waitUntil(caches.open(CORE).then(async c => { if(!(await c.match('./index.html'))) await c.addAll(FILES); }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
function timed(p, ms){ return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
async function latest(){
  // 새 버전이 있으면 받아서 저장하고 돌려줌. 없거나 인터넷이 안 되면 null
  const c = await caches.open(CORE);
  const nv = await timed(fetch('./version.txt', {cache:'no-store'}), 3500);
  if(!nv.ok) return null;
  const v = (await nv.clone().text()).trim(), old = await c.match('./version.txt');
  if(old && (await old.text()).trim() === v) return null;
  const page = await fetch('./index.html', {cache:'no-store'});
  if(!page.ok) return null;
  await c.put('./index.html', page.clone()); await c.put('./version.txt', nv);
  return page;
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.mode === 'navigate' && u.origin === location.origin){
    e.respondWith((async () => {
      try{ const fresh = await latest(); if(fresh) return fresh; }catch(err){}
      const hit = await caches.match('./index.html');
      if(hit) return hit;
      try{ return await fetch(e.request); }catch(err){ return new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">인터넷이 연결되면 한 번 열어 주세요. 그다음부터는 인터넷 없이도 열려요.</p>', {headers:{'Content-Type':'text/html; charset=utf-8'}}); }
    })());
    return;
  }
  if(u.origin === location.origin && /\/build\.txt$/.test(u.pathname)){ e.respondWith(fetch(e.request)); return; }
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdn\.jsdelivr\.net$/.test(u.hostname)){
    e.respondWith(caches.open(FONT).then(async c => {
      const hit = await c.match(e.request); if(hit) return hit;
      try{ const r = await fetch(e.request); if(r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }catch(err){ return Response.error(); }
    }));
    return;
  }
  if(u.origin === location.origin) e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(h => h || fetch(e.request)));
});
