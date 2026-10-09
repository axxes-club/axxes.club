const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const express=require('express');const {mountAppSite}=require('../app-site.cjs');
const pub=path.join(__dirname,'..','public');const appDir=path.join(pub,'app');
const catalog=require('../scripts/app-catalog.json');
const read=f=>fs.readFileSync(f,'utf8');
const pages={'/':read(path.join(pub,'app.html')),'/products':read(path.join(pub,'app-products.html'))};
for(const p of catalog)pages['/products/'+p.slug]=read(path.join(appDir,'products',p.slug+'.html'));
const one=(html,re)=>{const m=html.match(re);return m&&m[1]};

test('every page has unique SEO metadata, one h1 and valid structured data',()=>{
  const titles=new Set(),descs=new Set();
  for(const [route,html] of Object.entries(pages)){
    const title=one(html,/<title>([^<]+)<\/title>/),desc=one(html,/<meta name="description" content="([^"]+)"/);
    assert.ok(title&&title.length<=75,route+' title');assert.ok(desc&&desc.length>=70&&desc.length<=160,route+' description');
    assert.ok(!titles.has(title)&&!descs.has(desc),route+' duplicate title/description');titles.add(title);descs.add(desc);
    assert.equal(one(html,/<link rel="canonical" href="([^"]+)"/),'https://axxes.app'+route,route+' canonical');
    assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,route+' h1 count');
    assert.ok(one(html,/<meta property="og:image" content="https:\/\/axxes.app\/assets\/og\/([a-z0-9-]+)\.png"/),route+' og:image');
    const ld=JSON.parse(one(html,/<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
    assert.equal(ld['@context'],'https://schema.org');
    if(route.startsWith('/products/'))assert.ok(ld['@graph'].some(n=>n['@type']==='SoftwareApplication'&&n.url==='https://axxes.app'+route),route+' SoftwareApplication');
  }
});

test('sitemap, robots and share images cover every page',()=>{
  const sitemap=read(path.join(appDir,'sitemap.xml'));
  for(const route of Object.keys(pages))assert.ok(sitemap.includes(`<loc>https://axxes.app${route}</loc>`),'sitemap '+route);
  assert.match(read(path.join(appDir,'robots.txt')),/^Sitemap: https:\/\/axxes\.app\/sitemap\.xml$/m);
  for(const html of Object.values(pages)){const img=one(html,/assets\/og\/([a-z0-9-]+)\.png/);assert.ok(fs.existsSync(path.join(appDir,'assets','og',img+'.png')),'og image '+img)}
});

test('internal links resolve and unpromoted products never appear',()=>{
  const ok=new Set([...Object.keys(pages),'/favicon.ico','/apple-touch-icon.png','/site.webmanifest']);
  for(const [route,html] of Object.entries(pages)){
    for(const [,href] of html.matchAll(/href="(\/[^"#?]*)/g)){
      if(href.startsWith('/assets/'))assert.ok(fs.existsSync(path.join(appDir,href)),route+' -> '+href);
      else assert.ok(ok.has(href),route+' links to unknown '+href);
    }
    for(const banned of ['vitrine.axxes','>Vitrine<','matter.axxes','kr8s.axxes','cloud.axxes.app','payments.axxes.app','AXXES Pay<','>Keel<','>Binnacle<'])assert.ok(!html.includes(banned),route+' promotes '+banned);
  }
});

test('server: product routes, real 404s, caching and noindex off the canonical host',async()=>{
  const app=express();mountAppSite(app,pub);app.get('*',(q,r)=>r.send('club catch-all'));
  const server=http.createServer(app).listen(0);const port=server.address().port;
  const get=(p,host='axxes.app')=>new Promise((res,rej)=>http.get({port,path:p,headers:{host}},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:b}))}).on('error',rej));
  try{
    let r=await get('/app/products/folders');assert.equal(r.status,200);assert.match(r.body,/<h1>/);assert.equal(r.headers['x-robots-tag'],undefined);
    assert.equal((await get('/app/products/nope')).status,404);
    assert.equal((await get('/app/products/..%2Fapp.html')).status,404);
    assert.equal((await get('/app/missing.txt')).status,404);
    r=await get('/app/robots.txt');assert.equal(r.status,200);assert.match(r.body,/Sitemap:/);
    r=await get('/app/assets/fonts/Geist-Variable.woff2');assert.equal(r.status,200);assert.match(r.headers['cache-control'],/immutable/);
    assert.equal((await get('/app/products/folders','axxes.club')).headers['x-robots-tag'],'noindex');
    assert.equal((await get('/app.html','axxes.club')).headers['x-robots-tag'],'noindex');
    assert.equal((await get('/','axxes.club')).body,'club catch-all');
  }finally{server.close()}
});
