// Renders axxes.app icons and 1200x630 share images with Playwright's Chromium.
// Usage: PLAYWRIGHT_CORE=/path/to/playwright-core CHROMIUM=/path/to/chromium node scripts/render-app-images.cjs
// (run after build-app-catalog.cjs; outputs are committed, so CI never needs a browser)
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const chromium=process.env.CHROMIUM;if(!chromium||!fs.existsSync(chromium))throw Error('Set CHROMIUM to a Chrome/Chromium binary');
const {chromium:pw}=require(process.env.PLAYWRIGHT_CORE||'playwright-core');
const root=path.join(__dirname,'..');const assets=path.join(root,'public/app/assets');const og=path.join(assets,'og');fs.mkdirSync(og,{recursive:true});
const catalog=require('./app-catalog.json');const home=fs.readFileSync(path.join(root,'public/app.html'),'utf8');
const sprite=home.slice(home.indexOf('<svg width="0" height="0"'),home.indexOf('</defs></svg>')+'</defs></svg>'.length);
const fonts=path.join(assets,'fonts');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'axxes-img-'));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// The AXXES.app mark: App-blue tile with a geometric A.
const mark=(rx)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7aa0ff"/><stop offset=".45" stop-color="#3b6ff0"/><stop offset="1" stop-color="#1d47b8"/></linearGradient></defs><rect width="64" height="64" rx="${rx}" fill="url(#g)"/><path fill="#fff" fill-rule="evenodd" d="M28.6 14h6.8L50 50h-7.4l-3.3-8.4H24.7L21.4 50H14zm-1.6 21.6h10l-5-12.9z"/></svg>`;
fs.writeFileSync(path.join(assets,'favicon.svg'),mark(15)+'\n');

let browser;
async function shot(html,file,w,h,transparent){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:file,omitBackground:!!transparent});await page.close();
}
// setContent pages are about:blank and cannot load file:// fonts, so embed them.
const font=n=>fs.readFileSync(path.join(fonts,n+'.woff2')).toString('base64');
const page=(body,w,h)=>`<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:G;src:url(data:font/woff2;base64,${font('Geist-Variable')}) format('woff2');font-weight:100 900}@font-face{font-family:M;src:url(data:font/woff2;base64,${font('GeistMono-Variable')}) format('woff2');font-weight:100 900}*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}</style></head><body>${body}</body></html>`;

(async()=>{browser=await pw.launch({executablePath:chromium});
// Icons: rounded and transparent; Apple touch icon is full-bleed (iOS rounds it).
const icon=(size,rx)=>page(`<div style="width:${size}px;height:${size}px">${mark(rx).replace('<svg ','<svg width="'+size+'" height="'+size+'" ')}</div>`,size,size);
const p32=path.join(tmp,'32.png'),p48=path.join(tmp,'48.png');
for(const [size,out,rx,clear] of [[512,path.join(assets,'icon-512.png'),15,true],[192,path.join(assets,'icon-192.png'),15,true],[180,path.join(assets,'apple-touch-icon.png'),0,false],[32,p32,15,true],[48,p48,15,true]])await shot(icon(size,rx),out,size,size,clear);
// favicon.ico holding PNG images (supported by every current browser and by Google).
const imgs=[[32,fs.readFileSync(p32)],[48,fs.readFileSync(p48)]];const hdr=Buffer.alloc(6+16*imgs.length);hdr.writeUInt16LE(0,0);hdr.writeUInt16LE(1,2);hdr.writeUInt16LE(imgs.length,4);
let off=hdr.length;imgs.forEach(([s,b],i)=>{const e=6+16*i;hdr.writeUInt8(s,e);hdr.writeUInt8(s,e+1);hdr.writeUInt16LE(1,e+4);hdr.writeUInt16LE(32,e+6);hdr.writeUInt32LE(b.length,e+8);hdr.writeUInt32LE(off,e+12);off+=b.length});
fs.writeFileSync(path.join(assets,'favicon.ico'),Buffer.concat([hdr,...imgs.map(x=>x[1])]));

// Share images.
const card=({icon,eyebrow,title,sub,url})=>page(`${sprite}<div style="position:relative;width:1200px;height:630px;background:#07070a;color:#f4f5f8;font-family:G;padding:72px 80px;overflow:hidden">
<div style="position:absolute;left:-200px;top:-260px;width:1100px;height:800px;background:radial-gradient(closest-side,rgba(56,104,230,.55),transparent 70%)"></div>
<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 60% 70% at 30% 30%,#000 10%,transparent 75%)"></div>
<div style="position:relative;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;letter-spacing:-1px">${mark(15).replace('<svg ','<svg width="44" height="44" ')}<span>AXXES<span style="color:#6e95f2">.app</span></span></div>
<div style="position:relative;display:flex;gap:44px;align-items:center;margin-top:84px">${icon?`<div style="flex:none;width:168px;height:168px;border-radius:44px;display:grid;place-items:center;background:linear-gradient(155deg,#7aa0ff,#3b6ff0 45%,#1d47b8);box-shadow:0 2px 0 rgba(255,255,255,.35) inset,0 30px 60px -20px rgba(38,96,217,.9);color:#fff"><svg width="88" height="88"><use href="#g-${icon}"/></svg></div>`:''}
<div><div style="font-family:M;font-size:22px;color:#9bb6f7;letter-spacing:.5px">${esc(eyebrow)}</div><div style="font-size:${title.length>14?78:96}px;font-weight:600;letter-spacing:-4px;line-height:1;margin-top:14px">${esc(title)}</div><div style="font-size:36px;color:#b4b9c6;letter-spacing:-1px;margin-top:18px;max-width:820px;line-height:1.15">${esc(sub)}</div></div></div>
<div style="position:absolute;left:80px;bottom:56px;font-family:M;font-size:22px;color:#8a90a0">${esc(url)}</div></div>`,1200,630);
const jobs=[['home',{eyebrow:'AXXES · apps, services and brands',title:'Everything reconciles.',sub:'Documents, files, websites, payments and an API to build on all of it.',url:'axxes.app'}],
 ['products',{eyebrow:'The AXXES family',title:'Products, services.',sub:'Every AXXES app, service and brand in one place.',url:'axxes.app/products'}],
 ...catalog.map(p=>[p.slug,{icon:p.icon,eyebrow:p.group+(p.status==='Beta'?' · Beta':''),title:p.name,sub:p.tagline,url:'axxes.app/products/'+p.slug}])];
for(const f of fs.readdirSync(og))if(!jobs.some(([n])=>n+'.png'===f))fs.unlinkSync(path.join(og,f));
for(const [name,data] of jobs)await shot(card(data),path.join(og,name+'.png'),1200,630,false);
await browser.close();
fs.rmSync(tmp,{recursive:true,force:true});
console.log(`Rendered favicon.svg, favicon.ico, apple-touch-icon, icon-192/512 and ${jobs.length} share images`);
})().catch(e=>{console.error(e);process.exit(1)});
