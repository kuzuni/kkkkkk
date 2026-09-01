/* 98 오디오 볼륨 정규화 게이트 — node tools/verify98.js → 마지막 줄 VERIFY98 PASS
   지시서 [3]-(가) 기계적/기능 검증(비평가 없음).
   §A AU_GAIN 키 = AU_SFX 전체 · 값 범위 · AU_BGM_GAIN 범위 · AU_MIN.coin
   §B 실측(tools/aud98.js: peak · 최대 100ms 창 RMS) + 20log10(게인) 이 목표 ±3 dB
      — 단 피크 실링(−1 dBFS)에 걸린 파일은 «목표보다 작다» 만 확인한다(더 올리면 클리핑)
   §C BGM 게인이 SFX 평균(전투 반복음 제외)보다 8 dB 이상 아래 · 클리핑 0건
   §D 런타임: ctx 경로에서 sfx 전종 예외 0 · 소스마다 게인 노드 · el 폴백 volume = vol/100×게인 ·
      설정 토글·볼륨 회귀(auApply) 없음 · 콘솔 에러 0
   §E 전투 60초(가속) 동안 sfx('coin') 실제 발화 ≤ 7회/s
      + 637(2026-09-01) — 592 가 ⑴ 킬 드랍 코인을 끈 뒤로 그 창의 표본은 **0 이 설계값**이다.
        그래서 ⓐ 킬은 났는데 호출 0(592 축) · ⓑ 스위치를 켜면 다시 운다(되돌림 시험) ·
        ⓒ 592 가 남긴 ⑵⑶(클리어·파도 보너스)에서는 여전히 울고 그 창에서 억제 상한을 잰다 */
process.env.W98 = process.env.W98 || '100';
const fs = require('fs'), path = require('path');
const { measure, launch, serve } = require('./aud98.js');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let fails = [], checks = 0;
const ck = (name, ok, info) => { checks++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : '')); if(!ok) fails.push(name); };
const dB = g => 20 * Math.log10(g);

/* 목표 창 RMS(dBFS) — index.html 98 절 주석과 같은 분류 */
const TARGET = { tap:-18, open:-18, close:-18, err:-18, toggle:-18, rstop:-18,
                 flip:-20, rtick:-20, train:-20,
                 claim:-16, up:-16, rare:-16, victory:-16, revive:-16,
                 hit:-26, coin:-26, clear:-26,
                 bossin:-18, bosskill:-18, death:-18,
                 /* 99 스킬 시전음 — «전투 반복음» 분류(초당 수 회 겹친다) */
                 skwhoosh:-26, skthrow:-26, skice:-26, skzap:-26, skcast:-26, skbubble:-26, skchime:-26 };
const LOOP = ['hit', 'coin', 'clear',         /* 전투 반복음 — §C 평균에서 뺀다 */
              'skwhoosh', 'skthrow', 'skice', 'skzap', 'skcast', 'skbubble', 'skchime'];
const CEIL = -1, TOL = 3;

/* ---------- 소스에서 테이블 뽑기 ---------- */
function grab(re, what){
  const m = HTML.match(re);
  if(!m){ ck('소스에서 ' + what + ' 를 찾지 못함', false); return null; }
  return m[1];
}
const sfxSrc = grab(/const AU_SFX = (\[[\s\S]*?\]);/, 'AU_SFX');
const gainSrc = grab(/const AU_GAIN = (\{[\s\S]*?\n\});/, 'AU_GAIN');
const bgmgSrc = grab(/const AU_BGM_GAIN = ([0-9.]+);/, 'AU_BGM_GAIN');
const minSrc = grab(/const AU_MIN = (\{[\s\S]*?\});/, 'AU_MIN');
if(!sfxSrc || !gainSrc || !bgmgSrc || !minSrc){ console.log('VERIFY98 FAIL'); process.exit(1); }
const AU_SFX = eval(sfxSrc), AU_GAIN = eval('(' + gainSrc + ')'),
      AU_BGM_GAIN = parseFloat(bgmgSrc), AU_MIN = eval('(' + minSrc + ')');

(async () => {
  /* ---------- §A ---------- */
  console.log('§A 테이블');
  const missing = AU_SFX.filter(n => AU_GAIN[n] == null);
  const extra = Object.keys(AU_GAIN).filter(n => !AU_SFX.includes(n));
  ck('AU_GAIN 키 = AU_SFX 전체 (' + AU_SFX.length + '종)', missing.length === 0 && extra.length === 0,
     (missing.length ? '누락 ' + missing.join(',') : '') + (extra.length ? ' 잉여 ' + extra.join(',') : ''));
  const bad = Object.entries(AU_GAIN).filter(([, v]) => !(typeof v === 'number' && v > 0 && v <= 4));
  ck('게인 값이 (0, 4] 실수', bad.length === 0, bad.map(x => x[0]).join(','));
  ck('AU_BGM_GAIN 0.05~0.60', AU_BGM_GAIN >= 0.05 && AU_BGM_GAIN <= 0.60, String(AU_BGM_GAIN));
  ck('AU_MIN.coin ≥ 150ms', (AU_MIN.coin | 0) >= 150, String(AU_MIN.coin));
  ck('목표표가 AU_SFX 전체를 덮음', AU_SFX.every(n => TARGET[n] != null));

  /* ---------- §B 실측 ---------- */
  console.log('§B 실측 게인 검증 (창 RMS ' + process.env.W98 + 'ms)');
  const urls = AU_SFX.map(n => ({ name:n, rel:'assets/audio/' + n + '.ogg' }))
    .concat(Object.values({ main:'bgm_main', boss:'bgm_boss' }).map(f => ({ name:f, rel:'assets/audio/' + f + '.mp3' })));
  const M = await measure(urls);
  const errf = AU_SFX.filter(n => !M[n] || M[n].err);
  ck('전 파일 디코드 성공', errf.length === 0, errf.join(','));
  if(errf.length){ console.log('VERIFY98 FAIL'); process.exit(1); }

  console.log('   ' + 'name'.padEnd(10) + 'wrms'.padStart(8) + 'gain'.padStart(8) + 'post'.padStart(8) + '목표'.padStart(7) + '  판정');
  let sum = 0, cnt = 0, clip = [];
  for(const n of AU_SFX){
    const m = M[n], post = m.wrms + dB(AU_GAIN[n]), pa = m.peak + dB(AU_GAIN[n]);
    const limited = pa >= CEIL - 0.05;                 /* 피크 실링에 걸린 파일 */
    const ok = limited ? post <= TARGET[n] + TOL : Math.abs(post - TARGET[n]) <= TOL;
    if(pa > 0) clip.push(n + ' ' + pa.toFixed(2) + 'dBFS');
    if(!LOOP.includes(n)){ sum += post; cnt++; }
    ck('   ' + n.padEnd(10) + m.wrms.toFixed(2).padStart(8) + AU_GAIN[n].toFixed(3).padStart(8)
       + post.toFixed(2).padStart(8) + String(TARGET[n]).padStart(7) + (limited ? '  피크실링' : ''), ok,
       ok ? '' : 'Δ ' + (post - TARGET[n]).toFixed(2) + 'dB');
  }
  ck('클리핑(피크 > 0 dBFS) 0건', clip.length === 0, clip.join(' / '));

  /* ---------- §C BGM 밸런스 ---------- */
  console.log('§C BGM 밸런스');
  const avg = sum / cnt;
  for(const f of ['bgm_main', 'bgm_boss']){
    const post = M[f].rms + dB(AU_BGM_GAIN);           /* BGM 은 연속음 → 전체 RMS 로 본다 */
    ck(f + ' post ' + post.toFixed(2) + ' ≤ SFX평균(' + avg.toFixed(2) + ') − 8', post <= avg - 8,
       '차 ' + (avg - post).toFixed(2) + 'dB');
  }

  /* ---------- §D·§E 런타임 ---------- */
  console.log('§D 런타임 (ctx 경로)');
  const { srv, port } = await serve();
  const br = await launch(['--autoplay-policy=no-user-gesture-required', '--mute-audio']);
  const pg = await br.newPage();
  const cerr = [];
  pg.on('console', m => { if(m.type() === 'error') cerr.push(m.text()); });
  pg.on('pageerror', e => cerr.push(String(e.message || e)));
  await pg.setViewportSize({ width:1080, height:2280 });
  await pg.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil:'load' });
  await pg.waitForTimeout(1200);
  await pg.mouse.click(540, 1200);                     /* auInit — 첫 제스처 */
  await pg.waitForTimeout(1500);

  const r = await pg.evaluate(async (names) => {
    const out = { mode: auMode, buf: 0, err: [], nodes: 0, ramp: null };
    out.buf = names.filter(n => auBuf[n]).length;
    /* 소스마다 게인 노드를 거치는지 — createGain 호출 수를 센다.
       세는 동안에도 게임은 살아 있어서 재화 도착음(93 의 «팅») 같은 자기 발화가 창에 섞일 수 있다.
       지켜야 할 성질은 «20종이 전부 게인 노드를 거쳤나» 이므로 == 이 아니라 ≥ 로 본다
       (== 로 두면 통과/실패가 실행마다 갈리는 결정적이지 않은 게이트가 된다 — 실측 20/21 교대). */
    const og = auCtx.createGain.bind(auCtx);
    let made = 0; auCtx.createGain = function(){ made++; return og(); };
    for(const n of names){
      try{ auLast[n] = 0; sfx(n); }catch(e){ out.err.push(n + ': ' + e.message); }
      await new Promise(r => setTimeout(r, 5));
    }
    out.nodes = made;
    /* 99 이후 전투 중 스킬 시전음이 배경에서 끼어들 수 있다(루프 사이 await 구간).
       → 루프는 «최소 개수» 로 보고, 정확히 1개인지는 끼어들 수 없는 동기 단일 호출로 확인한다. */
    const m0 = made; auLast.tap = 0; sfx('tap'); out.oneNode = made - m0;
    auCtx.createGain = og;
    /* 설정 회귀 — 볼륨/토글이 즉시 반영되는가 */
    const v0 = S.opt.vol, s0 = S.opt.sfx, b0 = S.opt.bgm;
    S.opt.vol = 40; auApply(); out.master40 = +auMaster.gain.value.toFixed(3);
    S.opt.vol = 100; auApply(); out.master100 = +auMaster.gain.value.toFixed(3);
    S.opt.sfx = false; auApply(); out.sfxOff = auSfxG.gain.value;
    S.opt.sfx = true; auApply(); out.sfxOn = auSfxG.gain.value;
    S.opt.bgm = false; auApply(); out.bgmOff = auBgmG.gain.value;
    S.opt.bgm = true; auApply(); out.bgmOn = auBgmG.gain.value;
    S.opt.vol = v0; S.opt.sfx = s0; S.opt.bgm = b0; auApply();
    out.bgmGain = AU_BGM_GAIN;
    /* coin 최소 간격 — 20ms 간격으로 40회 두들겨 «호출 대비 실제 발화» 를 잰다.
       setTimeout 은 실제로 20ms 보다 길게 걸리므로 경과 시간을 재서 발화율로 환산한다. */
    let fired = 0;
    const before = auLast.coin;
    auLast.coin = 0;
    const t0 = performance.now();
    for(let i = 0; i < 40; i++){
      const b = auLast.coin; sfx('coin'); if(auLast.coin !== b) fired++;
      await new Promise(r => setTimeout(r, 20));
    }
    const el = (performance.now() - t0) / 1000;
    auLast.coin = before;
    out.coinCalls = 40; out.coinFired = fired; out.coinSec = +el.toFixed(2);
    return out;
  }, AU_SFX);

  ck('auMode = ctx', r.mode === 'ctx', r.mode);
  ck('버퍼 ' + AU_SFX.length + '종 로드', r.buf === AU_SFX.length, r.buf + '/' + AU_SFX.length);
  ck('sfx() ' + AU_SFX.length + '종 예외 0', r.err.length === 0, r.err.join(' / '));
  ck('소스마다 게인 노드 (createGain ' + r.nodes + '회 ≥ ' + AU_SFX.length + ')', r.nodes >= AU_SFX.length);
  ck('동기 단일 sfx() → 게인 노드 정확히 1개', r.oneNode === 1, String(r.oneNode));
  ck('볼륨 40 → master 0.4', Math.abs(r.master40 - 0.4) < 0.01, String(r.master40));
  ck('볼륨 100 → master 1.0', Math.abs(r.master100 - 1) < 0.01, String(r.master100));
  ck('SFX 토글 → sfxG 0/1', r.sfxOff === 0 && r.sfxOn === 1);
  ck('BGM 토글 → bgmG 0/1', r.bgmOff === 0 && r.bgmOn === 1);
  ck('AU_BGM_GAIN 런타임 반영', Math.abs(r.bgmGain - AU_BGM_GAIN) < 1e-9);
  console.log('§E coin 발화 억제');
  const hz = r.coinFired / r.coinSec;
  ck('연속 두들기기 ' + r.coinCalls + '회/' + r.coinSec + 's → 발화 ' + r.coinFired + '회, ' + hz.toFixed(2) + '회/s ≤ 7',
     hz <= 7);

  /* ⚑ 637 (2026-09-01) — 여기 있던 음성 대조항 «전투 중 coin 이 실제로 울리긴 함» 은
     **592**(저장소 주인 지시 «적죽을때 골드 이펙트 뜨는거 빼줘 안쓸래 그거»)가 ⑴ 킬 드랍의
     전투 발원 표시를 끄면서 **설계상 거짓**이 됐다 — `probe637` 실측: 전투 20초에 킬 23회인데
     `sfx('coin')` **호출 0 · 발화 0**, 같은 창에서 `FX_COMBAT_FX.kill` 만 되돌리면 **22회 발화**.
     ⇒ 제품 회귀가 아니라 **자가 낡은 것**이다.
     ⚠ 항을 그냥 지우면 바로 위 «≤ 7회/s» 가 **표본 0 으로 영원히 초록**이 된다(«못 봐서 0» —
     LESSONS 634-③). 333 처방대로 **자리를 비우지 않고** 뜻을 셋으로 갈라 갈아 끼운다:
       ⓐ 킬 창의 0 은 «설계값» 이다 — 킬은 실제로 났는데(표본 살아 있음) 호출이 0 이다(592 축).
       ⓑ 그 0 이 «꺼져서 0» 이지 «못 봐서 0» 이 아님을 **되돌림 시험**이 못박는다.
       ⓒ 592 가 **일부러 남긴** ⑵⑶(스테이지 클리어·파도 전멸 보너스)에서는 coin 이 **여전히 운다** —
          옛 항의 «연출 회귀 아님» 이라는 뜻은 이 살아 있는 표본이 이어받고, 억제 상한도 여기서 잰다. */
  /* 창 하나를 재는 계측기 — 아래 세 표본(현행 킬 창 · 되돌림 창 · ⑵⑶ 보너스 창)이 **같은 자**를 쓴다.
     사본을 세 벌 적으면 한 벌만 고쳐지는 자리가 생긴다(LESSONS 90-① · 402 «표 두 벌»).
       sec    — 창 길이(초)
       killFx — `FX_COMBAT_FX.kill` 을 이 값으로 두고 잰다(null 이면 제품 기본값 그대로)
       armMs  — >0 이면 ⑶ 파도 전멸 분기를 밟게 눈금을 한 칸 앞에 세운다(아래 주석) */
  const coinWindow = (sec, killFx, armMs) => pg.evaluate(([sec, killFx, armMs]) => new Promise(done => {
    const origSfx = window.sfx;
    const saveKill = FX_COMBAT_FX.kill, saveFarm = S.bossFarm;
    const kills0 = S.totalKills;
    if(killFx != null) FX_COMBAT_FX.kill = killFx;
    let calls = 0, fired = 0, armT = null;
    if(armMs){
      /* ⑵⑶ 표본 — 파도 전멸(③)은 `killed >= ENEMY_COUNT` 에서만 선다. 기본 속도로는 50킬에
         40초가 넘어 창 하나에 «설까 말까» 라 표본이 운이 된다(344·372 플레이키). 눈금을 한 칸
         앞에 세워 **제품의 그 분기 그대로** 밟게 한다 — 보너스 계산·발원 표시·골드 증가·소리는
         한 줄도 흉내내지 않는다. */
      S.bossFarm = true;
      armT = setInterval(() => { if(killed < ENEMY_COUNT - 1) killed = ENEMY_COUNT - 1; }, armMs);
    }
    window.sfx = function(n){
      if(n !== 'coin') return origSfx.apply(this, arguments);
      calls++; const b = auLast.coin; const rv = origSfx.apply(this, arguments);
      if(auLast.coin !== b) fired++; return rv;
    };
    const t0 = performance.now();
    setTimeout(() => {
      window.sfx = origSfx; if(armT) clearInterval(armT);
      FX_COMBAT_FX.kill = saveKill; S.bossFarm = saveFarm;
      done({ calls, fired, kills: S.totalKills - kills0, sec: +((performance.now() - t0) / 1000).toFixed(2) });
    }, sec * 1000);
  }), [sec, killFx, armMs]);

  /* 실제 전투 60초 — 옛 «실사용 조건» 창 그대로다(길이·측정 방법 불변) */
  const live = await coinWindow(60, null, 0);
  const lhz = live.fired / live.sec;
  ck('전투 60초 — fxFly 호출 ' + live.calls + '회 → 실제 발화 ' + live.fired + '회 ('
     + lhz.toFixed(2) + '회/s) ≤ 7회/s', lhz <= 7);
  /* ⓐ 592 축 — 그 창의 0 은 «표본이 없어서» 가 아니다: 킬은 실제로 났다 */
  ck('전투 60초 — 킬이 실제로 났다(표본이 비지 않았다)', live.kills > 0, live.kills + '킬');
  ck('⚑ 592 — 킬 드랍은 coin 을 안 울린다 (호출 ' + live.calls + ' · 발화 ' + live.fired + ')',
     live.calls === 0 && live.fired === 0);

  /* ⓑ 되돌림 시험 — 스위치를 켠 창에서는 **같은 자**가 발화를 본다 */
  const rev = await coinWindow(20, true, 0);
  ck('되돌림 시험 — `FX_COMBAT_FX.kill` 을 켜면 그 창에서 coin 이 다시 운다 («못 봐서 0» 이 아니다)',
     rev.fired > 0, rev.fired + '회 발화 / ' + rev.kills + '킬');

  /* ⓒ 살아 있는 음성 대조 — 592 가 **일부러 남긴** ⑵⑶ 보너스 경로 */
  const bonus = await coinWindow(20, null, 1500);
  const bhz = bonus.fired / bonus.sec;
  ck('592 가 남긴 ⑵⑶(클리어·파도 보너스)에서는 coin 이 여전히 운다(연출 회귀 아님)',
     bonus.fired > 0, bonus.fired + '회 발화 / ' + bonus.calls + '회 호출');
  ck('그 살아 있는 경로도 억제 상한 안 — ' + bhz.toFixed(2) + '회/s ≤ 7회/s', bhz <= 7);

  /* el 폴백 volume 계산식 */
  ck('el 폴백 volume = vol/100 × 게인',
     /el\.volume = Math\.max\(0, Math\.min\(1, \(S\.opt\.vol \| 0\) \/ 100 \* vg\)\)/.test(HTML));
  ck('el 폴백 BGM tgt() 에 AU_BGM_GAIN',
     /const tgt = \(\) => Math\.max\(0, Math\.min\(1, \(S\.opt\.vol \| 0\) \/ 100 \* AU_BGM_GAIN\)\)/.test(HTML));
  ck('콘솔 에러 0', cerr.length === 0, cerr.slice(0, 3).join(' / '));

  await br.close(); srv.close();
  console.log('\n' + (checks - fails.length) + '/' + checks + (fails.length ? ' — 실패: ' + fails.join(' | ') : ''));
  console.log(fails.length ? 'VERIFY98 FAIL' : 'VERIFY98 PASS');
  process.exit(fails.length ? 1 : 0);
})();
