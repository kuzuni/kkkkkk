/* 98 오디오 실측 — node tools/aud98.js [--json]
   assets/audio/*.ogg|mp3 를 재생 없이 decodeAudioData 로 디코드해
   길이 · peak dBFS · full RMS dBFS · 최대 100ms 창 RMS dBFS 를 잰다(W98=<ms> 로 변경).
   (chrome --dump-dom 은 decode 완료를 기다리지 않는다 → playwright page.evaluate 로 await)
   창 RMS 를 게인 산정 기준으로 쓴다: 꼬리 무음이 긴 파일이 full RMS 에서 과소평가돼
   게인을 과하게 올리는 것을 막는다. tools/verify98.js 가 같은 함수를 재사용한다. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const AUD = path.join(ROOT, 'assets', 'audio');
const WIN_MS = +(process.env.W98 || 100);   /* 게인 산정 기준 창 — 98 은 100ms */

const MIME = { '.html':'text/html', '.js':'text/javascript', '.ogg':'audio/ogg',
               '.mp3':'audio/mpeg', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json' };
function serve(){
  return new Promise(ok => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if(!p.startsWith(ROOT) || !fs.existsSync(p)){ res.writeHead(204); res.end(); return; }
      const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      res.end(fs.readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => ok({ srv, port: srv.address().port }));
  });
}

/* 브라우저 안에서 도는 측정 함수 — verify98.js 도 이 문자열을 그대로 쓴다 */
const MEASURE = `async (arg) => {
  const { urls, winMs } = arg;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = {};
  for(const u of urls){
    try{
      const ab = await (await fetch(u.url)).arrayBuffer();
      const b = await new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no));
      const n = b.length, ch = b.numberOfChannels;
      const mono = new Float32Array(n);
      for(let c = 0; c < ch; c++){
        const d = b.getChannelData(c);
        for(let i = 0; i < n; i++) mono[i] += d[i] / ch;
      }
      let peak = 0, sum = 0;
      for(let i = 0; i < n; i++){ const a = Math.abs(mono[i]); if(a > peak) peak = a; sum += mono[i] * mono[i]; }
      const rms = Math.sqrt(sum / Math.max(1, n));
      /* 최대 winMs 창 RMS — 누적합으로 O(n) */
      const w = Math.min(n, Math.max(1, Math.round(b.sampleRate * winMs / 1000)));
      let run = 0, best = 0;
      for(let i = 0; i < n; i++){
        run += mono[i] * mono[i];
        if(i >= w) run -= mono[i - w] * mono[i - w];
        if(i >= w - 1 && run > best) best = run;
      }
      const wrms = Math.sqrt(best / w);
      const dB = v => v > 0 ? 20 * Math.log10(v) : -120;
      out[u.name] = { dur: +(n / b.sampleRate).toFixed(3), rate: b.sampleRate, ch,
                      peak: +dB(peak).toFixed(2), rms: +dB(rms).toFixed(2), wrms: +dB(wrms).toFixed(2) };
    }catch(e){ out[u.name] = { err: String(e && e.message || e) }; }
  }
  try{ ctx.close(); }catch(_){}
  return out;
}`;

/* 번들 브라우저를 못 찾는 환경(클라우드 러너 /opt/pw-browsers) 대비 — smoke.js 와 같은 규칙 */
function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for(const p of cands){ try{ if(fs.existsSync(p)) return { executablePath: p }; }catch(_){} }
  return {};
}
async function launch(args){
  try{ return await chromium.launch({ args }); }
  catch(e){
    const o = launchOpts(); if(!o.executablePath) throw e;
    return await chromium.launch(Object.assign({ args }, o));
  }
}

async function measure(urls){
  const { srv, port } = await serve();
  const br = await launch(['--autoplay-policy=no-user-gesture-required']);
  const pg = await br.newPage();
  await pg.goto('http://127.0.0.1:' + port + '/tools/blank98.html').catch(() => {});
  const res = await pg.evaluate(eval('(' + MEASURE + ')'),
    { urls: urls.map(u => ({ name: u.name, url: 'http://127.0.0.1:' + port + '/' + u.rel })), winMs: WIN_MS });
  await br.close(); srv.close();
  return res;
}

module.exports = { measure, launch, WIN_MS, MEASURE, serve };

if(require.main === module){
  (async () => {
    const files = fs.readdirSync(AUD).filter(f => /\.(ogg|mp3)$/.test(f))
      .filter(f => f.endsWith('.ogg') || f.startsWith('bgm_'));   /* SFX 는 ogg, BGM 은 mp3 */
    const urls = files.map(f => ({ name: f, rel: 'assets/audio/' + f }));
    const r = await measure(urls);
    if(process.argv.includes('--json')){ console.log(JSON.stringify(r, null, 1)); return; }
    console.log('파일'.padEnd(18) + '길이(s)'.padStart(8) + 'peak'.padStart(9) + 'RMS'.padStart(9) + ('RMS' + WIN_MS + 'ms').padStart(11));
    for(const f of files){
      const m = r[f];
      if(!m || m.err){ console.log(f.padEnd(18) + '  ERR ' + (m && m.err || '')); continue; }
      console.log(f.padEnd(18) + String(m.dur).padStart(8) + String(m.peak).padStart(9) + String(m.rms).padStart(9) + String(m.wrms).padStart(11));
    }
  })();
}
