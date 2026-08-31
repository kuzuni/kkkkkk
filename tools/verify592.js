/* 게이트 592 — «적이 죽을 때 나는 골드 코인 연출을 뺀다» (저장소 주인 지시 2026-08-31)
 *
 * 지키는 규칙 한 줄:
 *   **전장에서 적을 죽여 떨어지는 골드는 «연출 없이» 들어온다** — 코인도, `+n` 도, 알약 점등도 없다.
 *   보상(`S.gold`)·사망 파티클(`burst`)·스테이지 클리어 보너스 연출은 **한 값도 안 바뀐다.**
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
 * [5] 스테이지 클리어·파도 전멸 보너스 코인은 **기본값에서 그대로** — 스위치를 끄면 그것도 0
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
const KILLS = `async ({ killfx, n }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  if (killfx) FX_COMBAT_FX.kill = true;
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
  /* «초당 수십 킬» 구간 — 한 프레임에 여러 마리씩 죽인다(592 ⑥ 이 재려는 그 구간이다) */
  for (let i = 0; i < 40 && killed2 < n; i++) {
    if (enemies.length < 3) queueMobs();
    for (let j = 0; j < 4 && killed2 < n && enemies.length; j++) { killEnemy(enemies[0]); killed2++; }
    await raf();
    frames++;
    partMax = Math.max(partMax, parts.length);
    for (const q of parts) if (q && q.c) partCol.add(q.c);
    lcMax = Math.max(lcMax, document.getElementById('fxlc').childElementCount);
    if (fxHold.gold > performance.now()) held++;
    lagMax = Math.max(lagMax, S.gold - fxDisp.gold);
    if (fxDisp.gold < prevDisp - 1e-9) dips++; prevDisp = fxDisp.gold;
  }
  /* 묶음이 뒤늦게 발사될 수 있으므로(디바운스 45ms · 누적 900ms) 충분히 더 돈다 */
  for (let i = 0; i < 90; i++) {
    await raf(); frames++;
    partMax = Math.max(partMax, parts.length);
    for (const q of parts) if (q && q.c) partCol.add(q.c);
    lcMax = Math.max(lcMax, document.getElementById('fxlc').childElementCount);
    if (fxHold.gold > performance.now()) held++;
    lagMax = Math.max(lagMax, S.gold - fxDisp.gold);
    if (fxDisp.gold < prevDisp - 1e-9) dips++; prevDisp = fxDisp.gold;
  }
  mo.disconnect();
  return {
    dips, endLag: +Math.max(0, S.gold - fxDisp.gold).toFixed(6),
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
const CLEAR = `async ({ off }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  if (off) FX_COMBAT_FX.stageClear = false;            /* «스위치를 끄면 그것도 0» 을 재는 갈래 */
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
  ok(/stageClear\s*:\s*true/.test(tbl) && /waveBonus\s*:\s*true/.test(tbl),
     '[A2] ⑵ 스테이지 클리어 · ⑶ 파도 전멸은 **켜져 있다**(주인이 지목한 것은 ⑴ 하나다)');
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
  ok(k.endLag === 0, '[6c] 창이 끝날 때 표시값이 실제 보유량을 따라잡았다 — 남은 차이 ' + k.endLag);
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
  ok(cl.fly > 0 && cl.layers.includes('fxlc'),
     '[5b] 그 코인은 **기본값에서 그대로 난다**(전투 발 · #fxlc) — ' + cl.fly + '개 ' + JSON.stringify(cl.layers)
     + ' (592 가 «적이 죽을 때» 만 껐다는 증거 — 여기까지 0 이면 범위를 넘긴 것이다)');
  await c1.ctx.close();

  const c2 = await boot(b);
  const cl2 = await c2.p.evaluate(eval('(' + CLEAR + ')'), { off: true });
  console.log('  [i] 클리어 보너스(스위치 끔) — ' + JSON.stringify(cl2));
  ok(cl2.gold > 0 && cl2.fly === 0,
     '[5c] 같은 표의 `stageClear` 를 끄면 그 코인도 0 이 된다(스위치가 «한 자리» 라는 증거) — 골드 +'
     + cl2.gold + ' · 코인 ' + cl2.fly);
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
  const errs = rv.errs.concat(cur.errs, c1.errs, c2.errs);
  await rv.ctx.close();

  ok(errs.length === 0, '[X] 콘솔 에러 0건 — ' + JSON.stringify(errs.slice(0, 3)));

  await b.close();
  const tag = 'VERIFY592 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS');
  console.log('\n' + tag);
  process.exit(fail ? 1 : 0);
})();
