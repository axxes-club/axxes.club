// Generates every axxes.app page and crawler file from scripts/app-catalog.json and the
// homepage template (public/app.html). Run after editing either: node scripts/build-app-catalog.cjs
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const pub=path.join(root,'public');const appDir=path.join(pub,'app');
const catalog=require('./app-catalog.json');
const ORIGIN='https://axxes.app';
const INDEXNOW_KEY='5f0c3e9a8b7d4c21a6e1f2d3b4c5a697';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const groups=[...new Set(catalog.map(p=>p.group))];
const bySlug=Object.fromEntries(catalog.map(p=>[p.slug,p]));

// Owner decisions 2026-10-09 (Vitrine added the same day): these are never advertised on App marketing surfaces.
const notPromoted=[['Matter','matter.axxes'],['Krates','kr8s.axxes'],['AXXES Cloud','cloud.axxes.app'],['AXXES Payments','payments.axxes.app'],['Vitrine','vitrine.axxes']];
const required=['name','slug','group','kind','status','category','icon','description','outcome','url','tagline','seoTitle','metaDescription','intro','capabilities','goodFor','related'];
if(new Set(catalog.map(p=>p.name)).size!==catalog.length)throw Error('Duplicate products');
if(new Set(catalog.map(p=>p.slug)).size!==catalog.length)throw Error('Duplicate slugs');
for(const p of catalog){
  if(notPromoted.some(([n,host])=>p.name===n||String(p.url||'').includes(host)))throw Error(`${p.name} is not promoted on App pages`);
  if(/AXXES\.club/i.test(p.name)||p.url==='https://axxes.club'||p.url==='https://members.axxes.club')throw Error('Entertainment portal is outside the App catalog');
  for(const k of required)if(p[k]===undefined||p[k]===''||(Array.isArray(p[k])&&!p[k].length))throw Error(`${p.name}: missing ${k}`);
  if(p.status==='In development')throw Error(`${p.name} is not ready; unreleased products are not promoted`);
  if(!/^[a-z0-9-]+$/.test(p.slug))throw Error(`${p.name}: bad slug`);
  if(p.seoTitle.length>65)throw Error(`${p.name}: seoTitle over 65 characters`);
  if(p.metaDescription.length<70||p.metaDescription.length>160)throw Error(`${p.name}: metaDescription must be 70-160 characters`);
  for(const r of p.related)if(!bySlug[r]||r===p.slug)throw Error(`${p.name}: unknown related product ${r}`);
}

// ---- shared head pieces --------------------------------------------------
let home=fs.readFileSync(path.join(pub,'app.html'),'utf8');
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0)throw Error('Template marker missing: '+a);return [i,j+b.length]};
const style=home.slice(...between(home,'<style>','</style>'));
const finder=home.slice(...between(home,'<script defer>','</script>'));
const header=home.slice(...between(home,'<header>','</header>'));
const sprite=home.slice(...between(home,'<svg width="0" height="0"','</svg>'));

const org={'@type':'Organization','@id':ORIGIN+'/#org',name:'AXXES',url:ORIGIN+'/',logo:ORIGIN+'/assets/icon-512.png',slogan:'Everything reconciles.'};
function seo({title,description,pathname,image,jsonld,noindex}){
  const url=ORIGIN+pathname;
  return `<!--seo-->
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex?'<meta name="robots" content="noindex">':`<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website"><meta property="og:site_name" content="AXXES"><meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/assets/og/${image}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${ORIGIN}/assets/og/${image}.png">
${jsonld?`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':jsonld}).replace(/</g,'\\u003c')}</script>`:''}
<!--/seo-->`;
}
const head=(meta)=>`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${meta}
${HEAD_COMMON}
${style}
${finder}
</head>`;
const HEAD_COMMON=home.slice(...between(home,'<!--common-->','<!--/common-->'));
const crumbs=(items)=>({'@type':'BreadcrumbList',itemListElement:items.map(([name,p],i)=>({'@type':'ListItem',position:i+1,name,item:ORIGIN+p}))});
const app=p=>({'@type':'SoftwareApplication','@id':ORIGIN+'/products/'+p.slug+'#app',name:p.name,description:p.metaDescription,url:ORIGIN+'/products/'+p.slug,sameAs:p.url,applicationCategory:p.category,operatingSystem:'Web',publisher:{'@id':ORIGIN+'/#org'}});
const ico=(p,size='')=>`<span class="ico ${size} ${{folders:'alt2',atelier:'alt',pulse:'alt',lanes:'alt',nexus:'alt2',relay:'alt'}[p.icon]||''}"><svg><use href="#g-${p.icon}"/></svg></span>`;
const status=p=>p.status==='Beta'?'Beta':p.status;

// ---- footer (every page) -------------------------------------------------
const footer=`<footer class="sitemap"><div class="footer-top"><a class="brand" href="/">AXXES<span>.app</span></a><p>A family of products, services and brands. Find your next step.</p><a href="/products">Explore the full catalog →</a></div><nav class="sitemap-grid" aria-label="All products">${groups.map(g=>`<div><h3>${esc(g)}</h3>${catalog.filter(p=>p.group===g).map(p=>`<a href="/products/${p.slug}">${esc(p.name)} <small>${esc(p.kind)}${p.status==='Beta'?' · Beta':''}</small></a>`).join('')}</div>`).join('')}</nav><div class="legend">Product · an app for a specific task &nbsp; Service · a shared capability &nbsp; Brand · its own experience<br>Beta · still evolving</div><div class="footer-bottom"><a href="/products">Products, services & brands</a><a href="https://handshake.axxes.club/profile">Manage account</a><span>AXXES — everything reconciles.</span></div></footer>`;

// ---- homepage --------------------------------------------------------------
const homeTitle='AXXES: documents, files, websites and payments, together';
const homeDesc='AXXES is a family of apps for documents, spreadsheets, file storage, websites, analytics and payments, built as one system on one account.';
home=home.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/,seo({title:homeTitle,description:homeDesc,pathname:'/',image:'home',jsonld:[org,{'@type':'WebSite','@id':ORIGIN+'/#site',name:'AXXES',url:ORIGIN+'/',publisher:{'@id':ORIGIN+'/#org'}},{'@type':'ItemList',name:'AXXES apps',itemListElement:catalog.map((p,i)=>({'@type':'ListItem',position:i+1,url:ORIGIN+'/products/'+p.slug,name:p.name}))}]}));
home=home.replace(/<footer[\s\S]*?<\/footer>/,footer);
for(const[n,host]of notPromoted)if(home.includes(host))throw Error(`public/app.html links to ${n}, which is not promoted`);
fs.writeFileSync(path.join(pub,'app.html'),home);

// ---- /products -----------------------------------------------------------
const tail=`${footer}</body></html>\n`;
const catalogMain=`<main><nav class="crumbs" aria-label="Breadcrumb"><a href="/">AXXES</a><span>/</span><span aria-current="page">Products</span></nav><section class="hero catalog-hero"><span class="eyebrow">The whole picture</span><h1>Products, services.<br>Possibilities.</h1><p>AXXES brings together apps for documents, files, websites, payments and building on all of it. Explore the products, shared services and independent brands in the AXXES family.</p><p class="catalog-note">Availability is shown on every card, so you can see what is ready and what is still in beta.</p><nav class="catalog-jumps" aria-label="Catalog sections">${groups.map(g=>`<a href="#${slug(g)}">${esc(g)} ↓</a>`).join('')}</nav></section>${groups.map(g=>`<section class="apps catalog-group" id="${slug(g)}"><h2>${esc(g)}</h2><div class="grid">${catalog.filter(p=>p.group===g).map(p=>`<a class="card product" href="/products/${p.slug}">${ico(p,'lg')}<div class="product-meta">${esc(p.kind)} <span>${esc(status(p))}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="outcome"><span class="eyebrow">What you can do</span><p>${esc(p.outcome)}</p></div><span class="product-link">Learn about ${esc(p.name)} →</span></a>`).join('')}</div></section>`).join('')}</main>`;
fs.writeFileSync(path.join(pub,'app-products.html'),head(seo({title:'AXXES products, services and brands',description:'Every AXXES app in one place: documents, files, project boards, team chat, websites, analytics, payments, developer tools and independent brands.',pathname:'/products',image:'products',jsonld:[org,crumbs([['AXXES','/'],['Products','/products']]),{'@type':'CollectionPage',name:'AXXES products, services and brands',url:ORIGIN+'/products',mainEntity:{'@type':'ItemList',itemListElement:catalog.map((p,i)=>({'@type':'ListItem',position:i+1,item:app(p)}))}}]}))+`\n<body>\n${sprite}\n${header}\n${catalogMain}\n${tail}`);

// ---- /products/<slug> ----------------------------------------------------
fs.mkdirSync(path.join(appDir,'products'),{recursive:true});
const expected=new Set(catalog.map(p=>p.slug+'.html'));
for(const f of fs.readdirSync(path.join(appDir,'products')))if(!expected.has(f))fs.unlinkSync(path.join(appDir,'products',f));
for(const p of catalog){
  const pathname='/products/'+p.slug;const host=new URL(p.url).hostname;
  const main=`<main class="pp"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">AXXES</a><span>/</span><a href="/products">Products</a><span>/</span><span aria-current="page">${esc(p.name)}</span></nav>
<section class="pp-hero">${ico(p,'xl')}<div><span class="eyebrow">${esc(p.group)} · ${esc(p.kind)}${p.status==='Beta'?' · Beta':''}</span><h1><span class="pp-name">${esc(p.name)}</span><span class="pp-tag">${esc(p.tagline)}</span></h1><p class="pp-intro">${esc(p.intro)}</p><div class="actions"><a class="button" href="${esc(p.url)}" rel="noopener">Open ${esc(p.name)} <span aria-hidden="true">↗</span></a><a class="button ghost" href="/products">All products</a></div><p class="pp-host">${esc(host)}${p.status==='Beta'?' · Beta: still evolving':''}</p></div></section>
<section class="pp-section" aria-labelledby="can"><h2 id="can">What you can do with ${esc(p.name)}</h2><ul class="pp-caps">${p.capabilities.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></section>
<section class="pp-section pp-split" aria-labelledby="for"><div><h2 id="for">Who it’s for</h2><ul class="pp-for">${p.goodFor.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div><div class="pp-why"><h2>Part of one system</h2><p>${esc(p.name)} signs in with your AXXES account and shares records with the rest of the family, so your files, pages, payments and numbers agree with each other.</p><p class="pp-outcome"><strong>In practice:</strong> ${esc(p.outcome)}</p></div></section>
<section class="pp-section" aria-labelledby="with"><h2 id="with">Works well with</h2><div class="grid">${p.related.map(r=>bySlug[r]).map(r=>`<a class="card" href="/products/${r.slug}">${ico(r,'lg')}${r.status==='Beta'?'<span class="chip">Beta</span>':''}<h3>${esc(r.name)}</h3><p>${esc(r.tagline)}</p></a>`).join('')}</div></section></main>`;
  const html=head(seo({title:p.seoTitle+' | AXXES',description:p.metaDescription,pathname,image:p.slug,jsonld:[org,crumbs([['AXXES','/'],['Products','/products'],[p.name,pathname]]),{...app(p),mainEntityOfPage:ORIGIN+pathname,featureList:p.capabilities,audience:{'@type':'Audience',audienceType:p.goodFor.join(', ')}}]}))+`\n<body>\n${sprite}\n${header}\n${main}\n${tail}`;
  fs.writeFileSync(path.join(appDir,'products',p.slug+'.html'),html);
}

// ---- 404, crawler files, manifest ----------------------------------------
fs.writeFileSync(path.join(appDir,'404.html'),head(seo({title:'Page not found | AXXES',description:'This page does not exist on axxes.app. Find every AXXES product in the catalog.',pathname:'/404',image:'home',noindex:true}))+`\n<body>\n${sprite}\n${header}\n<main class="pp"><section class="pp-hero" style="display:block;text-align:center"><span class="eyebrow">404</span><h1><span class="pp-name">Nothing here.</span><span class="pp-tag">The page you asked for doesn’t exist.</span></h1><div class="actions" style="justify-content:center"><a class="button" href="/products">Browse all products</a><a class="button ghost" href="/">Home</a></div></section></main>\n${tail}`);
const today=new Date().toISOString().slice(0,10);
const urls=['/','/products',...catalog.map(p=>'/products/'+p.slug)];
fs.writeFileSync(path.join(appDir,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.map(u=>{const img=u==='/'?'home':u==='/products'?'products':u.split('/').pop();return `  <url><loc>${ORIGIN}${u}</loc><lastmod>${today}</lastmod><image:image><image:loc>${ORIGIN}/assets/og/${img}.png</image:loc></image:image></url>`}).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(appDir,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
fs.writeFileSync(path.join(appDir,INDEXNOW_KEY+'.txt'),INDEXNOW_KEY);
fs.writeFileSync(path.join(appDir,'site.webmanifest'),JSON.stringify({name:'AXXES',short_name:'AXXES',description:homeDesc,start_url:'/',display:'browser',background_color:'#07070a',theme_color:'#07070a',icons:[{src:'/assets/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/assets/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/assets/favicon.svg',sizes:'any',type:'image/svg+xml'}]},null,2)+'\n');
fs.writeFileSync(path.join(__dirname,"app-pages.json"),JSON.stringify({origin:ORIGIN,indexNowKey:INDEXNOW_KEY,urls,images:['home','products',...catalog.map(p=>p.slug)]},null,2)+'\n');
console.log(`Generated axxes.app: home, catalog, ${catalog.length} product pages, 404, sitemap (${urls.length} URLs), robots, manifest`);
