/* 99 스킬 시전음 게이트 — node tools/verify99.js → 마지막 줄 VERIFY99 PASS
   지시서 [3]-(가) 기계적/기능 검증(비평가 없음).
   §A 테이블·파일   SK_CAST_SFX 가 SKILLS 27종(193 이후) 중 지속형 2종(orbit·aura)을 뺀 25종을 덮는지 ·
                    7계열 파일 ogg/mp3 존재 · SFX ≤50KB · CREDITS.md 등재 ·
                    AU_SFX/AU_GAIN 등재 · 게인 0.25~0.35 · SK_SFX_GAP = 90ms
   §B 매핑 실동작    적이 있는 전투에서 27종을 각각 castSkill() 강제 호출 →
                    스텁이 «계열 매핑대로» 정확히 1회 불렸는지(지속형 2종은 0회)
   §C 실패 케이스    적을 비우고 대상 필요 스킬을 호출 → return false · 시전음 0회
   §D 공용 간격      90ms 안에 연속 호출하면 1회만 발화(계열이 달라도)
   §E 전투 실측      전투 60초(실시간) 동안 스킬 시전음 발화 ≤ 11회/s (= 1000/90) */
const fs = require('fs'), path = require('path'), http = require('http');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const AUD = path.join(ROOT, 'assets', 'audio');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let fails = [], checks = 0;
const ck = (name, ok, info) => { checks++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : '')); if(!ok) fails.push(name); };

function grab(re, what){
  const m = HTML.match(re);
  if(!m){ ck('소스에서 ' + what + ' 를 찾지 못함', false); return null; }
  return m[1];
}
const mapSrc  = grab(/const SK_CAST_SFX = (\{[\s\S]*?\n\});/, 'SK_CAST_SFX');
const gapSrc  = grab(/const SK_SFX_GAP = (\d+);/, 'SK_SFX_GAP');
const sfxSrc  = grab(/const AU_SFX = (\[[\s\S]*?\]);/, 'AU_SFX');
const gainSrc = grab(/const AU_GAIN = (\{[\s\S]*?\n\});/, 'AU_GAIN');
const skSrc   = grab(/const SKILLS = (\[[\s\S]*?\n\]);/, 'SKILLS');
if(!mapSrc || !gapSrc || !sfxSrc || !gainSrc || !skSrc){ console.log('VERIFY99 FAIL'); process.exit(1); }
const SK_CAST_SFX = eval('(' + mapSrc + ')'), SK_SFX_GAP = +gapSrc,
      AU_SFX = eval(sfxSrc), AU_GAIN = eval('(' + gainSrc + ')'), SKILLS = eval(skSrc);

const HOLD = ['orbit', 'aura'];                       /* cd 0 지속 스킬 — castSkill 을 거치지 않는다 */
const FAMS = [...new Set(Object.values(SK_CAST_SFX))];
/* 대상이 없으면 실패하는 스킬(지시서 ③) — 버프·장판은 대상 없이도 성공한다 */
/* 193 — 신설 8종은 전부 «대상이 없으면 발동 실패» 다(버프가 사라져 예외가 줄었다).
   장판형이던 화염병도 표적 방향으로 던지므로 대상이 필요하다. */
const NEEDS_TARGET = ['slash', 'multi', 'shuri', 'ice', 'boom', 'drain', 'boomer', 'holy',
                      'stone', 'arrow', 'gale', 'lance', 'nova',
                      'curve', 'whirl', 'rico', 'spiral', 'bounce', 'drone', 'flask', 'laser'];

/* ---------------- §A ---------------- */
console.log('§A 테이블·파일');
const ids = SKILLS.map(s => s.id);
ck('SKILLS 27종(193)', ids.length === 27, String(ids.length));   /* 193 — 버프 5종 폐기 + 공격 8종 신설 */
const uncovered = ids.filter(i => !HOLD.includes(i) && !SK_CAST_SFX[i]);
const strayHold = HOLD.filter(i => SK_CAST_SFX[i]);
ck('SK_CAST_SFX 가 지속형 2종을 뺀 ' + (ids.length - HOLD.length) + '종을 전부 덮음',
   uncovered.length === 0, uncovered.join(','));
ck('지속형(orbit·aura)에는 매핑 없음', strayHold.length === 0, strayHold.join(','));
const stray = Object.keys(SK_CAST_SFX).filter(i => !ids.includes(i));
ck('매핑에 없는 스킬 id 없음', stray.length === 0, stray.join(','));
ck('계열 5~7종', FAMS.length >= 5 && FAMS.length <= 7, FAMS.length + '종: ' + FAMS.join(','));
ck('SK_SFX_GAP = 90ms', SK_SFX_GAP === 90, String(SK_SFX_GAP));

const credits = fs.readFileSync(path.join(AUD, 'CREDITS.md'), 'utf8');
for(const f of FAMS){
  const o = path.join(AUD, f + '.ogg'), m = path.join(AUD, f + '.mp3');
  const has = fs.existsSync(o) && fs.existsSync(m);
  const sz = has ? Math.max(fs.statSync(o).size, fs.statSync(m).size) : 0;
  ck('  ' + f + ' — ogg+mp3 존재 · ≤50KB · CREDITS 등재 · AU_SFX · 게인 0.25~0.35',
     has && sz <= 50 * 1024 && credits.includes(f) && AU_SFX.includes(f)
     && AU_GAIN[f] >= 0.25 && AU_GAIN[f] <= 0.35,
     (has ? (sz / 1024).toFixed(1) + 'KB gain ' + AU_GAIN[f] : '파일 없음'));
}
ck('castSkill 이 성공 시에만 sfxCast 를 부름',
   /function castSkill\(s\)\{\s*const ok = castSkillRaw\(s\);\s*if\(ok\) sfxCast\(s\.id\);/.test(HTML.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/function castSkill\(s\) \{/, 'function castSkill(s){')) ||
   /const ok = castSkillRaw\(s\);[\s\S]{0,120}if\(ok\) sfxCast\(s\.id\);/.test(HTML));

/* ---------------- 서버 ---------------- */
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png', '.ogg':'audio/ogg',
               '.mp3':'audio/mpeg', '.json':'application/json', '.jpg':'image/jpeg' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!p.startsWith(ROOT) || !fs.existsSync(p)){ res.writeHead(204); res.end(); return; }
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for(const p of cands){ try{ if(fs.existsSync(p)) return { executablePath: p }; }catch(_){} }
  return {};
}

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const PORT = srv.address().port;
  const ARGS = { args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] };
  let browser;
  try{ browser = await launch(chromium, ARGS); }
  catch(e){
    const o = launchOpts(); if(!o.executablePath) throw e;
    browser = await launch(chromium, Object.assign({}, ARGS, o));
  }
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const cerr = [];
  page.on('console', m => { if(m.type() === 'error') cerr.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => cerr.push(String(e.message || e).slice(0, 140)));
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.mouse.click(540, 1200);                        /* auInit */
  await page.waitForTimeout(1200);
  /* 적이 실제로 살아 있는 전투 상태를 기다린다 */
  const spawned = await page.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0,
    null, { timeout: 20000 }).then(() => true).catch(() => false);
  ck('§B 전투에 적 스폰됨', spawned);

  /* ---------------- §B 매핑 실동작 ---------------- */
  console.log('§B 27종 castSkill() 강제 호출 → 계열 매핑');
  const r = await page.evaluate((arg) => {
    const { ids, hold } = arg;
    const orig = window.sfx;
    const out = { got: {}, ret: {}, thrown: [] };
    let cur = [];
    window.sfx = function(n){ cur.push(n); };               /* 스텁 — 실제 재생 안 함 */
    for(const id of ids){
      const s = SK[id];
      cur = [];
      skSfxLast = 0;                                        /* 공용 간격 초기화 */
      for(const k in sbufT) sbufT[k] = 0;                   /* 버프 중복 방지 로직 우회 */
      /* 대상이 필요한 스킬을 위해 플레이어 옆에 적이 있도록 살짝 붙인다 */
      if(enemies.length){ const e = enemies[0]; e.born = 1; e.x = player.x + 60; e.y = player.y; }
      try{ out.ret[id] = !!castSkill(s); }
      catch(err){ out.thrown.push(id + ':' + (err && err.message || err)); out.ret[id] = null; }
      out.got[id] = cur.slice();
    }
    window.sfx = orig;
    return out;
  }, { ids: SKILLS.map(s => s.id), hold: HOLD });

  ck('  castSkill 예외 0', r.thrown.length === 0, r.thrown.join(' / '));
  for(const id of SKILLS.map(s => s.id)){
    const want = SK_CAST_SFX[id] || null;
    const got = (r.got[id] || []).filter(n => FAMS.includes(n));
    if(want === null){
      ck('  ' + id.padEnd(7) + ' 지속형 → 시전음 0회', got.length === 0, got.join(','));
    }else if(r.ret[id] === false){
      ck('  ' + id.padEnd(7) + ' (이번 호출은 발동 실패) → 시전음 0회', got.length === 0, got.join(','));
    }else{
      ck('  ' + id.padEnd(7) + ' → ' + want, got.length === 1 && got[0] === want,
         got.length ? got.join(',') : '울리지 않음');
    }
  }
  const fired = SKILLS.map(s => s.id).filter(id => SK_CAST_SFX[id] && r.ret[id] === true);
  ck('  실제로 발동에 성공한 스킬 ≥ 18종(매핑 검증 표본)', fired.length >= 18, fired.length + '종');
  const famHit = new Set(fired.map(id => SK_CAST_SFX[id]));
  ck('  계열 ' + FAMS.length + '종 전부 최소 1회 검증', famHit.size === FAMS.length,
     FAMS.filter(f => !famHit.has(f)).join(','));

  /* ---------------- §C 실패 케이스 ---------------- */
  console.log('§C 발동 실패 시 무음');
  const f2 = await page.evaluate((need) => {
    const orig = window.sfx;
    const out = { ret: {}, snd: {} };
    let cur = [];
    window.sfx = function(n){ cur.push(n); };
    const keep = enemies.slice();
    enemies.length = 0;                                     /* 대상 전멸 */
    for(const id of need){
      cur = []; skSfxLast = 0;
      out.ret[id] = castSkill(SK[id]);
      out.snd[id] = cur.slice();
    }
    enemies.push(...keep);
    window.sfx = orig;
    return out;
  }, NEEDS_TARGET);
  const badRet = NEEDS_TARGET.filter(id => f2.ret[id] !== false);
  const badSnd = NEEDS_TARGET.filter(id => (f2.snd[id] || []).length > 0);
  ck('  대상 없음 → castSkill false (' + NEEDS_TARGET.length + '종)', badRet.length === 0, badRet.join(','));
  ck('  대상 없음 → 시전음 0회', badSnd.length === 0, badSnd.join(','));

  /* ---------------- §D 공용 최소 간격 ---------------- */
  console.log('§D 공용 최소 간격 ' + SK_SFX_GAP + 'ms');
  /* 전투가 계속 돌아 배경에서도 시전음이 나가므로, 스텁 호출수가 아니라
     sfxCast() 의 반환값(«이번 호출이 실제로 울렸는가»)으로 판정한다. */
  const gap = await page.evaluate(async (g) => {
    const orig = window.sfx;
    window.sfx = function(){};                          /* 이 구간만 무음 */
    skSfxLast = 0;
    const a = sfxCast('slash'), b = sfxCast('bolt'), c = sfxCast('poison');   /* 즉시 연속 — 계열 다름 */
    const noMap = sfxCast('orbit');                     /* 지속형 — 매핑 없음 */
    await new Promise(r => setTimeout(r, g + 40));
    skSfxLast = performance.now() - (g + 10);           /* 간격이 지난 상태로 강제 */
    const d = sfxCast('bolt');
    window.sfx = orig;
    return { a, b, c, d, noMap };
  }, SK_SFX_GAP);
  ck('  연속 3회 호출(계열 무관) → 첫 회만 발화',
     gap.a === true && gap.b === false && gap.c === false, JSON.stringify([gap.a, gap.b, gap.c]));
  ck('  간격이 지난 뒤에는 다시 발화', gap.d === true, String(gap.d));
  ck('  매핑 없는 id(orbit) 는 발화하지 않음', gap.noMap === false, String(gap.noMap));

  /* ---------------- §E 전투 60초 실측 ---------------- */
  console.log('§E 전투 60초 시전음 발화율');
  const live = await page.evaluate(() => new Promise(done => {
    const orig = window.sfx;
    const fam = {};
    let fired = 0;
    window.sfx = function(n){
      if(/^sk(whoosh|throw|ice|zap|cast|bubble|chime)$/.test(n)){ fired++; fam[n] = (fam[n] || 0) + 1; }
      return orig(n);
    };
    const t0 = performance.now();
    setTimeout(() => {
      window.sfx = orig;
      done({ fired, fam, sec: +((performance.now() - t0) / 1000).toFixed(2) });
    }, 60000);
  }));
  const hz = live.fired / live.sec;
  ck('  60초 발화 ' + live.fired + '회 (' + hz.toFixed(2) + '회/s) ≤ 11회/s', hz <= 11);
  ck('  전투 중 시전음이 실제로 울린다(연출 회귀 아님)', live.fired > 0,
     JSON.stringify(live.fam));
  ck('  콘솔 에러 0', cerr.length === 0, cerr.slice(0, 3).join(' | '));

  await browser.close(); srv.close();
  console.log('');
  console.log((checks - fails.length) + '/' + checks + (fails.length ? ' — 실패: ' + fails.join(' | ') : ''));
  console.log(fails.length ? 'VERIFY99 FAIL' : 'VERIFY99 PASS');
  process.exit(fails.length ? 1 : 0);
})();
