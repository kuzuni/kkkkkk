/* 게이트 592 — «적이 죽을 때 나는 골드 코인 연출을 뺀다» (저장소 주인 지시 2026-08-31)
 *
 * 지키는 규칙 한 줄:
 *   **전장에서 적을 죽여 떨어지는 골드는 «연출 없이» 들어온다** — 코인도, `+n` 도, 알약 점등도 없다.
 *   보상(`S.gold`)·사망 파티클(`burst`)은 **한 값도 안 바뀐다.**
 *   ⚑ 654 정오표 — 종전 이 줄은 «스테이지 클리어 보너스 연출도 안 바뀐다» 였다. 654 에서 주인이
 *     범위를 넓혀 그 연출도 껐으므로([A2]·[5b] 를 333 처방대로 뒤집었다), 지금 이 자를 통과하는
 *     제품은 «클리어 보너스 코인도 0» 인 제품이다. 그 축의 본체는 `tools/verify654.js` 다.
 *
 * 왜 «발원 표시를 안 찍는다» 로는 안 되는가(`tools/probe592.js` 재현 근거):
 *   표시가 없는 증가분은 `fxSrc` 가 «마지막으로 누른 버튼»(창 1200ms)을 **추측**으로 집어 UI 발로
 *   만든다 — 그러면 코인이 사라지기는커녕 #fxl(z60 · 모든 팝업 **위**)로 올라간다(158·518·578 이
 *   세 번 겪은 자리). 그래서 «연출 없는 몫»(`fxSilent` → `fxMute`)을 fxWatch 델타에서 먼저 뺀다.
 *
 * [1] 전장 자동 전투에서 킬 드랍 코인 0 · `+n` 0 · 알약 점등(fx-lit) 0
 * [2] 그동안 `S.gold` 는 정상 증가(연출만 사라졌지 보상은 그대로)
 * [3] 적 사망 파티클(`burst`, 적 색)은 수리 전과 동일 — 「같이 지우면 적이 소리 없이 사라진다」
 * [4] 보스 킬 `big` 분기(46개·330)도 동일
 * [5] 스테이지 클리어·파도 전멸 보너스 코인은 **기본값에서 0**(654 이관 — 종전은 «그대로») · 스위치를 켜면 다시 난다
 * [6] HUD 골드 숫자가 초당 수십 킬에서 떨리지 않는다(홀드 0 · 역행 0 · 끝에 수렴)
 * [7] 죽은 코드 0 — 남은 소비처가 0 인 전투 발 선언이 소스에 없다
 * [8] `#fxlc` 동시 노드 수 전·후 표
 * [R] 되돌림 — 스위치를 되돌리면(`FX_COMBAT_FX.kill = true`) 수리 전 그림이 그대로 돌아온다
 *
 * 실행: node tools/verify592.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ── 씬: 메인 화면(팝업 0)에서 «적을 실제로 죽이고» 그 창에 태어난 것을 센다 ──────────
   ⚠ 주변 전투에 맡기지 않고 **제품의 킬 경로**(`killEnemy`)를 직접 부른다 — 8초를 기다려도
   킬 수가 시행마다 갈리면 «0 이 나온 이유» 가 «안 죽어서» 인지 «연출을 껐기» 때문인지 못 가른다.
   적이 모자라면 제품의 스폰 경로(`queueMobs`)로 채운다(손으로 만든 가짜 적을 넣지 않는다 —
   `e.T`·`e.gold` 가 없으면 `burst`·드랍이 통째로 안 돌아 [3] 이 헛초록이 된다). */
const KILLS = `async ({ killfx, n, stall }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  if (killfx) FX_COMBAT_FX.kill = true;
  /* 603 §R — «표시값이 정말로 안 따라잡으면» 이 축이 빨개지는가. 롤 길이를 60초로 늘려
     제품의 수렴을 멈춰 세운다(제품 파일은 안 건드린다 — 자가 자기 대조군을 만든다). */
  if (stall) fxRollDur.gold = 60;
  S.bossFarm = true;                                  /* 273 «파밍 대기» — 새 보스전이 서지 않는다 */
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  await new Promise(r => setTimeout(r, 900));
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  fxTapEl = null;                                     /* 앞선 탭 추측이 남아 있으면 발원이 흐려진다 */

  const born = [];
  const layerOf = el => el.closest('#fxl') ? 'fxl' : (el.closest('#fxlc') ? 'fxlc' : '?');
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const nd of rec.addedNodes) {
      if (nd.nodeType !== 1 || !nd.classList) continue;
      if (nd.classList.contains('fx-fly') || nd.classList.contains('fx-plus') || nd.classList.contains('fx-lit'))
        born.push({ cls: nd.className, layer: layerOf(nd) });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  const g0 = S.gold, k0 = S.totalKills;
  const partCol = new Set();
  let killed2 = 0, partMax = 0, lcMax = 0, held = 0, frames = 0, lagMax = 0, dips = 0;
  let prevDisp = fxDisp.gold;
  /* 603 — «따라잡았는가» 를 **한 순간이 아니라 창 전체**로 잰다.
     뿌리(probe603): 이 씬은 S.bossFarm 으로 새 보스전만 막고 **주변 자동 전투는 그대로 돈다** —
     꼬리 창에도 킬이 3회쯤 더 떨어지고, 롤링은 목표가 바뀔 때마다 처음부터 다시 도는 0.32초 트윈이다.
     그래서 «마지막 프레임의 남은 차이» 는 제품이 아니라 **마지막 킬이 언제 떨어졌는지**를 잰다
     (probe603 12회: 마지막 수입이 320ms 안이면 예외 없이 빨강 8회 · 밖이면 예외 없이 초록 4회).
     대신 재는 것: **수입이 끊긴 뒤 못 따라잡고 있는 시간의 최대치**(maxStale). 제품이 멈춰 있으면
     이 값이 창 길이만큼 커지고, 정상이면 롤 길이 안에 머문다. */
  let prevGold = S.gold, tLastGain = performance.now(), tPrev = performance.now();
  let maxStale = 0, convFrames = 0, frameMax = 0, tailGains = 0, tailMs = 0, maxGap = 0;
  const sample = (tail) => {
    frames++;
    const now = performance.now();
    frameMax = Math.max(frameMax, now - tPrev); tPrev = now;
    /* maxGap = 창 안의 가장 긴 «수입이 없는» 구간. 표시값과 무관한 값이라 [6c] 의 전제로 쓴다 —
       이것이 허용치보다 짧으면 [6c] 는 애초에 빨개질 수 없다(헛초록). */
    if (S.gold > prevGold + 1e-9) { maxGap = Math.max(maxGap, now - tLastGain); tLastGain = now; prevGold = S.gold; if (tail) tailGains++; }
    partMax = Math.max(partMax, parts.length);
    for (const q of parts) if (q && q.c) partCol.add(q.c);
    lcMax = Math.max(lcMax, document.getElementById('fxlc').childElementCount);
    if (fxHold.gold > now) held++;
    const lag = S.gold - fxDisp.gold;
    lagMax = Math.max(lagMax, lag);
    if (lag > 1e-9) maxStale = Math.max(maxStale, now - tLastGain); else convFrames++;
    if (fxDisp.gold < prevDisp - 1e-9) dips++; prevDisp = fxDisp.gold;
  };
  /* «초당 수십 킬» 구간 — 한 프레임에 여러 마리씩 죽인다(592 ⑥ 이 재려는 그 구간이다) */
  for (let i = 0; i < 40 && killed2 < n; i++) {
    if (enemies.length < 3) queueMobs();
    for (let j = 0; j < 4 && killed2 < n && enemies.length; j++) { killEnemy(enemies[0]); killed2++; }
    await raf();
    sample(false);
  }
  /* 묶음이 뒤늦게 발사될 수 있으므로(디바운스 45ms · 누적 900ms) 충분히 더 돈다 */
  const tTail = performance.now();
  for (let i = 0; i < 90; i++) { await raf(); sample(true); }
  tailMs = Math.round(performance.now() - tTail);
  mo.disconnect();
  return {
    dips, endLag: +Math.max(0, S.gold - fxDisp.gold).toFixed(6),
    sinceLastGain: Math.round(performance.now() - tLastGain),
    maxStaleMs: Math.round(maxStale), convFrames, frames, frameMaxMs: Math.round(frameMax),
    maxGapMs: Math.round(Math.max(maxGap, performance.now() - tLastGain)),
    tailGains, tailMs,
    /* 롤 길이는 **제품에게 묻는다** — 자에 상수를 적으면 표가 두 벌이 된다(402·338). */
    rollMs: Math.round((fxRollDur.gold || FXROLL) * 1000),
    killed: killed2, realKills: S.totalKills - k0, gold: +(S.gold - g0).toFixed(3),
    fly:  born.filter(b => /fx-fly/.test(b.cls)).length,
    flyL: [...new Set(born.filter(b => /fx-fly/.test(b.cls)).map(b => b.layer))],
    plus: born.filter(b => /fx-plus/.test(b.cls)).length,
    lit:  born.filter(b => /fx-lit/.test(b.cls)).length,
    partMax, partCols: [...partCol].sort(), lcMax,
    heldPct: +(100 * held / Math.max(1, frames)).toFixed(1), lagMax: Math.round(lagMax)
  };
}`;

/* ── 씬: 보스 킬(`big` 분기 — 46개·330) ─────────────────────────────────────
   `isBossKind(e.tk)` 가 참인 적 하나를 제품 경로로 세우고 죽인다. */
const BOSSKILL = `async ({ killfx }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  if (killfx) FX_COMBAT_FX.kill = true;
  /* ⚠ 보스를 죽이면 475 가 넣어 둔 1초 뒤에 ⑵ 스테이지 클리어 보너스가 **같은 창에서** 코인을 쏜다
     (1회차에 그 4개를 «킬 드랍» 으로 잘못 셌다). 이 항이 묻는 것은 ⑴ 하나이므로 ⑵⑶ 을 꺼서 축을 가른다 —
     ⑵ 가 살아 있다는 것은 [5b] 가 따로 못박는다. */
  FX_COMBAT_FX.stageClear = false; FX_COMBAT_FX.waveBonus = false;
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  await new Promise(r => setTimeout(r, 700));
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  fxTapEl = null;
  startBoss();
  for (let i = 0; i < 240 && !enemies.some(e => isBossKind(e.tk)); i++) await raf();
  const b = enemies.find(e => isBossKind(e.tk));
  if (!b) return { no: true };
  const born = [];
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const nd of rec.addedNodes)
      if (nd.nodeType === 1 && nd.classList && (nd.classList.contains('fx-fly') || nd.classList.contains('fx-plus')))
        born.push(nd.className);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  const p0 = parts.length, g0 = S.gold;
  killEnemy(b);
  const dp = parts.length - p0;                        /* big ? 46 : 13 — 그 프레임에 바로 들어간다 */
  for (let i = 0; i < 90; i++) await raf();
  mo.disconnect();
  return { dp, gold: +(S.gold - g0).toFixed(3), fly: born.filter(c => /fx-fly/.test(c)).length };
}`;

/* ── 씬: ⑵ 스테이지 클리어 보너스 — 기본값에서 코인이 **그대로 난다** ─────────── */
const CLEAR = `async ({ on }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  if (on) FX_COMBAT_FX.stageClear = true;              /* 654 — «스위치를 켜면 다시 난다» 를 재는 되돌림 갈래 */
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  await new Promise(r => setTimeout(r, 700));
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  fxTapEl = null;
  const born = [];
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const nd of rec.addedNodes)
      if (nd.nodeType === 1 && nd.classList && nd.classList.contains('fx-fly'))
        born.push(nd.closest('#fxlc') ? 'fxlc' : (nd.closest('#fxl') ? 'fxl' : '?'));
  });
  mo.observe(document.body, { childList: true, subtree: true });
  const g0 = S.gold;
  stageWin = true;                                     /* 162 ① — 다음 틱이 «보스 격파 = 클리어» 갈래를 탄다 */
  for (let i = 0; i < 150; i++) await raf();
  mo.disconnect();
  return { gold: +(S.gold - g0).toFixed(3), fly: born.length, layers: [...new Set(born)] };
}`;

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  return { ctx, p, errs };
}

(async () => {
  console.log('\n=== verify592 — «적이 죽을 때 나는 골드 코인» 폐지 ===');
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

  /* ── [A] 정적 — 스위치가 «한 표» 이고 세 자리가 그것을 읽는다 ─────────── */
  const tbl = (src.match(/const FX_COMBAT_FX\s*=\s*\{[^}]*\}/) || [''])[0];
  ok(/kill\s*:\s*false/.test(tbl), '[A1] 스위치 표에서 ⑴ 킬 드랍이 꺼져 있다 — ' + tbl);
  /* ⚑⚑ 654 이관(2026-09-01, 주인 보고 «골드 획득 이펙트 하지말라했는데 보스 끝났더니 뜨더라») —
     이 항은 종전에 «⑵⑶ 은 켜져 있어야 한다» 였다. 592 당시에는 그것이 «주인이 지목한 것은 ⑴ 하나»
     라는 범위를 지키는 못이었지만, 654 에서 주인이 그 범위를 직접 넓혔다.
     333 처방대로 **자리를 비우지 않고 방향만 뒤집는다** — 그냥 지웠으면 «⑵⑶ 이 아무 값이나 돼도
     초록인 게이트» 가 되어 이 표가 표로서 하는 일이 없어진다. 지금은 «켜져 있으면 빨강» 이고,
     «끄면 코인이 0 이 된다»·«다시 켜면 난다» 는 `verify654` [1]·[2]·[R1]·[R2] 가 실제로 잰다. */
  ok(/stageClear\s*:\s*false/.test(tbl) && /waveBonus\s*:\s*false/.test(tbl),
     '[A2] ⑵ 스테이지 클리어 · ⑶ 파도 전멸도 **꺼져 있다**(654 — 주인이 «보스 끝났더니» 로 범위를 넓혔다)');
  /* «한 표» 의 뜻 — `fxAt(…,'combat')` 이 찍히는 자리가 전부 이 표를 지난다.
     새 자리가 표를 안 지나고 생기면 이 항이 곧바로 빨개진다(402 «표가 두 벌» 부패 방지). */
  /* ⚠ 이 파일은 주석에도 `fxAt(…, 'combat')` 을 **인용**한다(위 스위치 설명 자신이 그렇다).
     주석을 안 걷어내면 «자리가 넷» 으로 읽혀 자가 자기 주석에 걸려 빨개진다(1회차에 그랬다).
     ROUTINE [4] 의 «표시 문자열은 줄 가운데 백틱으로» 와 같은 함정이다. */
  const codeOnly = (() => {
    let inb = false;
    return src.split('\n').map((ln, i) => {
      let out = '', j = 0;
      while (j < ln.length) {
        if (inb) { const e = ln.indexOf('*/', j); if (e < 0) { j = ln.length; } else { inb = false; j = e + 2; } }
        else {
          const b = ln.indexOf('/*', j), l = ln.indexOf('//', j);
          if (b >= 0 && (l < 0 || b < l)) { out += ln.slice(j, b); inb = true; j = b + 2; }
          else if (l >= 0) { out += ln.slice(j, l); j = ln.length; }
          else { out += ln.slice(j); j = ln.length; }
        }
      }
      return { i: i + 1, ln: out };
    });
  })();
  const combatSites = codeOnly.filter(o => /fxAt\(.*'combat'\)/.test(o.ln));
  ok(combatSites.length === 3, '[A3] 전투 발원 표시 자리는 셋뿐이다 — ' + combatSites.map(o => o.i).join(', '));
  ok(combatSites.every(o => /FX_COMBAT_FX\.\w+/.test(o.ln)),
     '[A4] 세 자리 **모두** 스위치 표를 읽는다 — ' + combatSites.map(o => o.i + ':' + (/FX_COMBAT_FX/.test(o.ln) ? 'O' : '✗')).join(' '));
  ok(/function fxSilent\(/.test(src) && /const fxMute\s*=\s*fxMap\(0\)/.test(src),
     '[A5] «연출 없는 증가분» 부품(fxSilent → fxMute)이 있다');
  const muteBlk = (src.match(/if\(fxMute\[k\]\)\{[\s\S]{0,600}?\n\s*\}/) || [''])[0];
  ok(/d -= Math\.min\(d, fxMute\[k\]\)/.test(muteBlk),
     '[A6] 그 몫은 **fxWatch 의 델타에서** 빠진다 — fxFly 안에서 되돌리면 홀드가 이미 걸려 HUD 숫자가 2초 뒤에 튄다');
  ok(/fxMute\[k\] = 0;/.test(muteBlk),
     '[A7] 토큰은 한 프레임짜리다(남으면 버린다) — 안 버리면 다음에 «진짜로 받은» 재화의 연출을 지운다');
  /* ⚑ 1회차에 실제로 겪은 자리 — 같은 값을 다른 순서로 더하고 뺀 ulp 잔재(실측 4.09e-14)가
     그대로 «획득» 으로 읽혀 코인 두 개가 났다. 문턱이 상수면 후반 골드(1e25)에서 못 잡는다. */
  ok(/d <= Math\.abs\(v\) \* 1e-9/.test(muteBlk),
     '[A8] 부동소수 잔재는 «획득» 이 아니다 — 문턱이 **보유량에 비례**한다(상수 문턱은 후반 골드에서 못 잡는다)');

  /* ── [7] 죽은 코드 0 — 남은 소비처가 0 인 전투 발 선언이 없다 ────────────
     선언 줄과 주석을 뺀 «실제로 읽는 자리» 를 센다. 0 이면 그 선언은 걷어냈어야 한다. */
  const code = src.split('\n').filter(ln => !/^\s*[/*]/.test(ln));
  const uses = name => code.filter(ln => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(ln)
                                        && !new RegExp('(const|let|function)\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(ln)).length;
  const decl = { FXFLY_MAX_C: uses('FXFLY_MAX_C'), fxOrigBurstT: uses('fxOrigBurstT'), fxLC: uses('fxLC()') };
  ok(decl.FXFLY_MAX_C > 0 && decl.fxOrigBurstT > 0 && decl.fxLC > 0,
     '[7] 전투 발 기계의 선언이 전부 살아 있는 소비처를 가진다(0 이면 선언째 걷어냈어야 한다) — ' + JSON.stringify(decl));

  const b = await launch(chromium);

  /* ── [1]·[2]·[3]·[6]·[8] 본체 — 메인 화면에서 20마리를 죽인다 ─────────── */
  const cur = await boot(b);
  const k = await cur.p.evaluate(eval('(' + KILLS + ')'), { killfx: false, n: 20 });
  console.log('  [i] 현재 — ' + JSON.stringify(k));
  /* ⚠ 주변 자동 전투도 같은 창에서 적을 죽인다 — «정확히 20» 이 아니라 «내가 부른 20 이상» 이 참이다.
     (그 킬들도 같은 경로를 지나므로 [1a] 의 0 은 오히려 더 넓은 표본에서 나온 값이다) */
  ok(k.killed === 20 && k.realKills >= 20, '[0] 20마리를 제품 경로(killEnemy)로 실제로 죽였다(주변 전투 포함 ' + k.realKills + ')');
  ok(k.fly === 0, '[1a] 킬 드랍 코인 0 — ' + k.fly + '개 · 층 ' + JSON.stringify(k.flyL));
  ok(k.plus === 0, '[1b] 그 묶음의 «+n» 플로트도 0 — ' + k.plus);
  ok(k.lit === 0, '[1c] `.cGold` 알약 점등(fx-lit) 프레임 0 — ' + k.lit);
  ok(k.gold > 0, '[2] 그동안 골드는 **정상 증가**(연출만 사라졌지 보상은 그대로) — +' + k.gold);
  ok(k.partMax > 0 && k.partCols.length > 0,
     '[3] 적 사망 파티클(burst · 적 색)은 살아 있다 — 최대 ' + k.partMax + '개 · 색 ' + JSON.stringify(k.partCols));
  /* ⚠ «지연 최대» 는 축이 아니다 — 93 숫자 롤링(`fxDisp` 수렴)은 연출과 무관하게 늘 조금 뒤따라온다.
     592 ③ 이 묻는 «떨림» 은 ⓐ 비행이 숫자를 **붙잡는가**(fxHold) ⓑ 숫자가 **뒤로 가는가**(역행)
     ⓒ 끝에 **따라잡는가** 셋이다. 되돌린 사본에서 ⓐ 가 34% 로 뜨는 것이 이 자의 대조군이다([R3]). */
  ok(k.heldPct === 0, '[6a] 비행이 HUD 숫자를 붙잡는 프레임 0% — ' + k.heldPct + '%');
  ok(k.dips === 0, '[6b] 표시값이 뒤로 가는 프레임 0(떨림) — ' + k.dips);
  /* ⚠ 603 — 여기는 「창이 끝나는 한 프레임」 을 보던 자리였고 그래서 실행마다 흔들렸다.
     같은 질문(«따라잡는가»)을 **창 전체**에 묻는다: 수입이 끊긴 뒤에도 뒤처져 있는 시간의 최대치.
     ⓐ 이 축이 유효한 것은 [6a] 가 «홀드 0%» 를 같은 실행에서 못박기 때문이다(홀드는 «일부러 붙잡는»
        시간이라 그게 있으면 정체는 정상이다). ⓑ 허용치는 롤 길이 + 프레임 두 장이고, 제품이 정말
        멈추면 이 값은 창 길이(~2000ms)로 커진다 = 대여섯 배 밖이다(무르게 넓힌 오차가 아니다 · §R5). */
  /* 허용치 = 롤 길이 + 프레임 두 장. 프레임 몫에 상한(100ms)을 둔 이유: 롤은 dt 누적이 아니라
     **시작 시각 기준** 트윈이라(58 14회차) 프레임이 길어져도 안 늘어난다 — 프레임 몫은 «한 프레임에
     한 번만 재는» 표본 간격을 갚는 것뿐이다. 상한이 없으면 부하가 심한 기계에서 허용치가 같이 부풀어
     «느려질수록 무르게 통과하는» 자가 된다. */
  const rollAllow = k.rollMs + 2 * Math.min(k.frameMaxMs, 100);
  ok(k.maxGapMs > rollAllow,
     '[6c-전제] 창 안에 «수입이 끊긴» 구간이 허용치보다 길게 있다(없으면 아래 항은 빨개질 수 없다) — 최장 공백 '
     + k.maxGapMs + 'ms > ' + rollAllow + 'ms');
  ok(k.maxStaleMs <= rollAllow,
     '[6c] 수입이 끊기면 표시값은 **롤 길이 안에** 반드시 따라잡는다 — 최대 정체 ' + k.maxStaleMs
     + 'ms (허용 ' + k.rollMs + '+2프레임=' + rollAllow + 'ms · 창 ' + k.tailMs + 'ms)');
  ok(k.endLag === 0 || k.sinceLastGain < k.rollMs,
     '[6d] 마지막 프레임이 뒤처져 있다면 그것은 «롤이 아직 도는 중» 일 때뿐이다 — 남은 차이 '
     + k.endLag + ' · 마지막 수입 ' + k.sinceLastGain + 'ms 전 (꼬리 창 수입 ' + k.tailGains + '회)');
  ok(k.convFrames > 0,
     '[6e] 그 창에서 표시값이 실제로 «따라잡은» 프레임이 있다(축이 헛초록이 아니다) — ' + k.convFrames + '/' + k.frames + '프레임');
  ok(k.lcMax === 0, '[8] 그 구간의 `#fxlc` 동시 노드 0 — ' + k.lcMax);

  /* ── [4] 보스 킬 big 분기 ─────────────────────────────────────────────── */
  const bk = await cur.p.evaluate(eval('(' + BOSSKILL + ')'), { killfx: false });
  console.log('  [i] 보스 킬(현재) — ' + JSON.stringify(bk));
  ok(!bk.no && bk.dp === 46, '[4a] 보스 킬 사망 파티클은 `big` 분기 46개 그대로 — ' + bk.dp);
  ok(!bk.no && bk.fly === 0, '[4b] 그런데 코인은 0 — ' + bk.fly);
  ok(!bk.no && bk.gold > 0, '[4c] 보스 드랍 골드는 그대로 들어온다 — +' + bk.gold);
  await cur.ctx.close();

  /* ── [5] ⑵ 스테이지 클리어 보너스 — 기본값에서 그대로 · 스위치를 끄면 0 ── */
  const c1 = await boot(b);
  const cl = await c1.p.evaluate(eval('(' + CLEAR + ')'), { off: false });
  console.log('  [i] 클리어 보너스(기본값) — ' + JSON.stringify(cl));
  ok(cl.gold > 0, '[5a] 스테이지 클리어 보너스 골드가 들어왔다 — +' + cl.gold);
  /* ⚑⚑ 654 이관 — [A2] 와 **같은 뒤집기**다. 종전 [5b] 는 «기본값에서 코인이 그대로 난다» 였고
     그 줄에 «여기까지 0 이면 범위를 넘긴 것이다» 라고까지 적혀 있었는데, 654 에서 주인이 바로 그
     범위를 넓혔다. 방향만 뒤집어 «기본값에서 0» 을 묻는다 — 보상 자체가 줄지 않았다는 것은
     바로 위 [5a] 가 여전히 못박는다(연출만 사라졌지 골드는 그대로). */
  ok(cl.fly === 0,
     '[5b] 그 코인은 **기본값에서 0 이다**(654) — ' + cl.fly + '개 ' + JSON.stringify(cl.layers)
     + ' (주인 보고 «보스 끝났더니 뜨더라» 의 그 자리. 보상은 위 [5a] 대로 그대로 들어온다)');
  await c1.ctx.close();

  const c2 = await boot(b);
  /* 654 — 스위치 인자의 뜻도 같이 뒤집었다(`on` = 되돌림으로 «켠다»). 종전 `off:true` 는
     «기본값 true 를 끈다» 였는데 기본값이 false 가 됐으므로 그 갈래는 더 이상 잴 것이 없다. */
  const cl2 = await c2.p.evaluate(eval('(' + CLEAR + ')'), { on: true });
  console.log('  [i] 클리어 보너스(스위치 켬 = 되돌림) — ' + JSON.stringify(cl2));
  ok(cl2.gold > 0 && cl2.fly > 0 && cl2.layers.includes('fxlc'),
     '[5c] 같은 표의 `stageClear` 를 **켜면** 그 코인이 다시 난다(스위치가 «한 자리» 라는 증거 · [5b] 의 0 이 '
     + '이 수리가 만든 값이라는 증거) — 골드 +' + cl2.gold + ' · 코인 ' + cl2.fly + ' ' + JSON.stringify(cl2.layers));
  await c2.ctx.close();

  /* ── [R] 되돌림 — 스위치를 되돌리면 수리 «전» 그림이 그대로 돌아온다 ────── */
  const rv = await boot(b);
  const rk = await rv.p.evaluate(eval('(' + KILLS + ')'), { killfx: true, n: 20 });
  console.log('  [i] 되돌림 — ' + JSON.stringify(rk));
  ok(rk.fly > 0 && rk.flyL.includes('fxlc'),
     '[R1] `FX_COMBAT_FX.kill = true` 로 되돌리면 킬 드랍 코인이 **다시 난다** — ' + rk.fly + '개 ' + JSON.stringify(rk.flyL)
     + ' (무르게 푼 수리가 아님을 이 항이 못박는다 — 위 [1a] 의 0 은 «죽지 않아서» 가 아니다)');
  ok(rk.plus > 0, '[R2] «+n» 도 다시 뜬다 — ' + rk.plus);
  ok(rk.heldPct > 0 || rk.lagMax > 0,
     '[R3] 되돌리면 HUD 숫자가 다시 붙잡힌다(fxHold) — 홀드 ' + rk.heldPct + '% · 지연 ' + rk.lagMax
     + ' (= [6] 의 0 은 스위치가 만든 값이다)');
  ok(rk.partMax > 0 && JSON.stringify(rk.partCols.slice(0, 3)) !== '[]',
     '[R4] 되돌린 사본의 사망 파티클도 살아 있다 — 최대 ' + rk.partMax + '개 (파티클은 스위치와 무관 = [3] 이 코인 얘기가 아니다)');
  /* ── §R5(603) — [6c] 의 되돌림 시험. 제품의 수렴을 멈춰 세우면 그 축이 **빨개져야** 한다.
     안 그러면 [6c] 는 «표시값이 영영 안 따라잡아도 초록» 인 무른 항이다. 비교 기준은
     이번 실행에서 [6c] 가 실제로 쓴 그 허용치(k.rollMs + 2프레임)를 그대로 쓴다. */
  const sv = await boot(b);
  const st = await sv.p.evaluate(eval('(' + KILLS + ')'), { killfx: false, n: 20, stall: true });
  console.log('  [i] 정체(롤 60초로 세움) — ' + JSON.stringify({
    maxStaleMs: st.maxStaleMs, convFrames: st.convFrames, endLag: st.endLag, tailMs: st.tailMs }));
  const bound = rollAllow;
  /* ⚑ 둘로 나눠 놓은 이유 — [R5] 는 수입 간격과 무관하게 항상 성립하고(정체된 표시값은 창 130프레임
     내내 한 번도 못 따라잡는다), [R6] 은 «공백이 허용치보다 긴 구간이 있었나» 에 매달린다.
     그래서 [R6] 은 그 전제(st.maxGapMs)를 같은 줄에 적어 둔다 — [6c-전제] 와 같은 자다. */
  ok(st.convFrames === 0,
     '[R5] 표시값의 수렴을 멈춰 세우면 창 내내 **한 번도** 따라잡지 못한다([6e] 빨강) — 따라잡은 프레임 '
     + st.convFrames + '/' + st.frames + ' (정상 실행은 ' + k.convFrames + '/' + k.frames + ')');
  ok(st.maxStaleMs > bound,
     '[R6] 그 사본은 [6c] 도 같이 빨개진다 — 정체 ' + st.maxStaleMs + 'ms > 허용 ' + bound
     + 'ms (그 사본의 최장 공백 ' + st.maxGapMs + 'ms · 정상 실행은 ' + k.maxStaleMs + 'ms = 무르게 넓힌 오차가 아니다)');
  const errs = rv.errs.concat(cur.errs, c1.errs, c2.errs, sv.errs);
  await sv.ctx.close();
  await rv.ctx.close();

  ok(errs.length === 0, '[X] 콘솔 에러 0건 — ' + JSON.stringify(errs.slice(0, 3)));

  await b.close();
  const tag = 'VERIFY592 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS');
  console.log('\n' + tag);
  process.exit(fail ? 1 : 0);
})();
