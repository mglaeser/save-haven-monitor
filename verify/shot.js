// Local screenshot harness (dev-only, not part of the gate): serve the repo root and capture the
// API-connected view at several desktop viewports so the layout can be inspected as pixels. The
// embedded API base (DR-015: on loopback that is http://localhost:8000) is answered from the frozen
// acceptance fixtures via route interception — no live network, no query parameter.
const http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
// Same browser resolution as acceptance/lib/harness.js: an explicit ACCEPT_CHROMIUM, else the
// pre-installed /opt/pw-browsers build, else whatever playwright resolves on its own.
function chromiumPath(){
  if(process.env.ACCEPT_CHROMIUM)return process.env.ACCEPT_CHROMIUM;
  const r='/opt/pw-browsers';
  if(fs.existsSync(r)){const hit=fs.readdirSync(r).find(d=>d.startsWith('chromium-'));if(hit)return path.join(r,hit,'chrome-linux','chrome');}
  return undefined;
}
const API_BASE='http://localhost:8000';
const API_FIX={'/api/v1/score':'api-score.fixture.json','/api/v1/score/history':'api-history.fixture.json',
  '/api/v1/status':'api-status.fixture.json','/api/v1/dashboard/feed':'api-feed.fixture.json'};
async function mockApi(pg){
  await pg.route(API_BASE+'/**',(route)=>{
    const f=API_FIX[new URL(route.request().url()).pathname];
    if(!f)return route.fulfill({status:404,contentType:'application/json',body:'{"detail":"not found"}'});
    return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},
      body:fs.readFileSync(path.join(ROOT,'acceptance','golden',f))});
  });
}
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const srv=http.createServer((rq,rs)=>{
  let p=decodeURIComponent(rq.url.split('?')[0]); if(p==='/')p='/index.html';
  const f=path.join(ROOT,p);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.writeHead(404);return rs.end('nf');}
  rs.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(rs);
});
(async()=>{
  await new Promise(r=>srv.listen(8099,r));
  const b=await chromium.launch({executablePath:chromiumPath(),args:['--no-sandbox','--disable-dev-shm-usage']});
  const OUT=process.argv[2]||'/tmp/shots';
  fs.mkdirSync(OUT,{recursive:true});
  const VPS=[[1440,900],[1920,1080],[1280,800]];
  for(const [w,h] of VPS){
    const pg=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
    const errs=[];
    pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
    await mockApi(pg);
    await pg.goto('http://127.0.0.1:8099/',{waitUntil:'networkidle'});
    await pg.waitForTimeout(1400);
    await pg.screenshot({path:path.join(OUT,'fold-'+w+'x'+h+'.png')});           // above the fold only
    // how tall is the overview section, and does the atlas start below the fold?
    const m=await pg.evaluate(()=>{
      const s=document.querySelector('section[aria-labelledby="bg-hero-h"]');
      if(!s)return{found:false};
      const r=s.getBoundingClientRect();
      return{found:true,top:Math.round(r.top),height:Math.round(r.height),vh:window.innerHeight,
        docH:Math.round(document.documentElement.scrollHeight),
        overflowX:document.documentElement.scrollWidth>window.innerWidth,
        panels:s.querySelectorAll('.bgr').length};
    });
    console.log('  '+w+'x'+h+'  section h='+m.height+' vh='+m.vh+' top='+m.top+
      ' fills='+(m.found&&m.height>=m.vh-4?'YES':'NO')+' xOverflow='+m.overflowX+' panels='+m.panels+
      (errs.length?'  ERRORS: '+errs.slice(0,2).join(' | '):''));
    await pg.close();
  }
  // the 168x168 JS-Widget, same palette and type as the app
  const wp=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:2});
  await mockApi(wp);
  await wp.goto('http://127.0.0.1:8099/widget.html',{waitUntil:'networkidle'});
  await wp.waitForTimeout(600);
  const el=await wp.$('.wrap');
  if(el) await el.screenshot({path:require('path').join(process.argv[2]||'/tmp/shots','widget.png')});
  console.log('  widget.png captured');
  await wp.close();
  await b.close(); srv.close();
})().catch(e=>{console.error('FAILED: '+e.message);process.exit(1);});
