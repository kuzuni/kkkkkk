/* 게이트 654 — «보스 격파 직후 골드 획득 이펙트가 또 뜬다» (저장소 주인 보고 2026-09-01 23:05)
 *
 * 지키는 규칙 한 줄:
 *   **전투·보스·클리어 계열에서 들어오는 골드는 «연출 없이» 들어온다** — 코인도, `+n` 도,
 *   알약 점등도, 보상 버스트도 없다. 보상(`S.gold`)은 한 값도 안 줄고,
 *   **비전투 수령(우편·출석·룰렛·오프라인·광고)의 512 연출은 그대로 산다.**
 *
 * 592 와의 관계 — 592 는 「⑴ 킬 드랍」 하나만 껐고 ⑵⑶ 은 «켜져 있는 것이 정답» 이라고
 * 단언까지 해 뒀다(`verify592` [A2]·[5b]). 654 는 주인 지시로 그 방향이 뒤집힌 자리라
 * 333 처방대로 **그 항들을 지우지 않고 반대로 갈아 끼웠다** — 지금 «켜져 있으면 빨강» 이다.
 *
 * [A] 정적 — 스위치 표가 «한 표» 이고 네 항이 전부 꺼져 있다 · 무음 부품이 제자리
 * [B] **전수(스코프 구멍 방지)** — 골드를 늘리는 자리와 `giveReward` 호출부를 소스에서 전부 뽑아
 *     «전투·클리어 계열(무음)» / «비전투 수령(512 유지)» 분류표와 **정확히** 맞는지 본다.
 *     새 자리가 분류 없이 생기면 그 순간 빨개진다(610 꼴 구멍 방지).
 *     ⚑ **804 — 분류는 «이름» 이 아니라 «방향» 이다.** 697(상점 구매 즉시 지급)이 `grantNow` 에
 *     골드 자리를 하나 더 만들어 [B3] 이 «미분류» 로 빨개졌다. 표에 이름만 적어 초록으로
 *     되돌리면 그 자리가 나중에 무음으로 바뀌어도 표는 조용하다(328~330 «누른 항» 교훈) ⇒
 *     표에 **무음이어야 하는가**를 같이 적고 [B3m] 이 소스와 대조한다. 되돌림은 [R5]·[R6].
 * [8] 경계 둘째 — 697 `grantNow` 는 `giveReward` 를 **한 번도 안 지난다**. [6](우편)이 초록이어도
 *     이 자리가 무음일 수 있어 찍힌 코인으로 따로 못박는다.
 * [1] 스테이지 보스 격파 → 클리어 보너스 — 코인 0 · 골드는 정상 증가
 * [2] 파도 전멸 보너스 — 코인 0 · 골드는 정상 증가
 * [3] 던전 «황금 동굴» 클리어 보상 — 코인 0 **그리고 보상 버스트도 0**(#FFE9A8 = 512 가 지목한 그 금색)
 * [4] 소탕(같은 보상·같은 클리어 화면) — 코인 0
 * [5] 아레나 결과 — 골드 코인 0 이지만 **다이아·강화석 연출은 산다**(무음은 골드 한 축뿐)
 * [6] 경계 — 비전투 수령(우편·룰렛·출석)은 512 연출 **그대로**(여기까지 0 이면 범위를 넘긴 것이다)
 * [7] HUD — 무음 골드도 숫자는 붙잡히지 않고 바로 오른다(fxHold 0)
 * [R] 되돌림 — `stageClear`·`waveBonus`·`clearGold` 를 **각각** 켜면 그 자리의 코인이 다시 난다
 *     (= 위 0 들이 «어차피 안 나는 것» 이 아니라 이 수리가 만든 값이라는 증거. 동시에
 *      592 원장의 `combat` 기계가 죽은 코드가 아니라 «스위치의 반대쪽» 이라는 증거이기도 하다.)
 *
 * 실행: node tools/verify654.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ── 씬 공용 ────────────────────────────────────────────────────────────────
   «관찰을 켠다 → 사건을 일으킨다 → 창이 닫힐 때까지 본다» 하나로 전부 잰다.
   ⚠ `fxRewT`(512 보상 버스트 시각)도 같이 읽는다 — 코인만 세면 [3] 의 «금색 버스트» 를 놓친다. */
const SCENE = `async ({ scene, on }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const sleep = t => new Promise(r => setTimeout(r, t));
  const wipe = () => document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());

  /* 되돌림 스위치 — 씬마다 «그 자리 하나만» 켠다(어느 항이 어느 그림을 만드는지 갈리게) */
  if (on) FX_COMBAT_FX[on] = true;

  S.bossFarm = true;                    /* 273 — 대기 상태: 새 보스전이 저절로 서지 않는다 */
  wipe(); await sleep(1200); wipe();

  const born = [];
  const layerOf = el => el.closest('#fxl') ? 'fxl' : (el.closest('#fxlc') ? 'fxlc' : '?');
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const n of rec.addedNodes) {
      if (n.nodeType !== 1 || !n.classList) continue;
      if (n.classList.contains('fx-fly') || n.classList.contains('fx-plus') || n.classList.contains('fx-lit'))
        born.push({ cls: n.className, layer: layerOf(n) });
    }
  });

  const g0 = S.gold, d0 = S.dia, s0 = S.stone;
  const rew0 = fxRewT;                  /* 512 — 마지막 보상 버스트 시각 */
  let holdF = 0, lagMax = 0;

  /* ⚠ **발원 힌트를 반드시 세워 둔다.** 비워 두면 fxSrc 가 null 을 돌려주고, 그러면
     fxReward 는 «터뜨릴 자리가 없어서» 조용해진다 — 그 0 은 이 수리가 만든 값이 아니라
     하네스가 만든 값이라 [3b] 가 통째로 헛초록이 된다(1회차에 실제로 그랬다).
     실제 플레이에서도 클리어 직전에 누른 버튼(입장·소탕)이 이 자리에 남아 있다. */
  const arm = () => {
    fxTapEl = document.getElementById('top'); fxTapT = fxClk();
    wipe(); mo.observe(document.body, { childList: true, subtree: true });
  };

  if (scene === 'stage') {
    startBoss();
    for (let i = 0; i < 240 && !enemies.some(e => e.tk === 'boss'); i++) await raf();
    const b = enemies.find(e => e.tk === 'boss');
    if (!b) return { err: '보스가 서지 않았다' };
    arm(); killEnemy(b);
  } else if (scene === 'wave') {
    S.bossFarm = true; bossOn = false; stageWin = false;
    arm(); killed = ENEMY_COUNT;
  } else if (scene === 'dun') {
    const d = DUNGEONS.find(x => x.id === 'gold');
    arm(); finishDunRun({ d, f: 1, auto: false }, true);
  } else if (scene === 'sweep') {
    const d = DUNGEONS.find(x => x.id === 'gold');
    S.dun[d.id] = 3; S.dunTk[d.id] = 5;          /* 소탕 전제: 2층 이상 클리어 + 입장권 */
    arm(); sweepDungeon(d);
  } else if (scene === 'arena') {
    arm(); giveReward(arenaReward(true), fxClearMute());
  } else if (scene === 'mail') {
    arm(); giveReward({ gold: 123456 });          /* 비전투 수령 — 512 경계 표본 */
  } else if (scene === 'grant') {
    /* 804 — 697 «상점 구매 즉시 지급» 의 골드 자리. giveReward 를 **한 번도 안 지나는**
       두 번째 유음 경로라 [6](우편)만으로는 못 덮는다. 여기서 0 이 나오면 654 의 무음이
       상점 구매까지 번진 것이다. (⚠ 이 절은 template literal 안이라 백틱 금지) */
    arm(); grantNow({ g: 123456 });
  }

  const t0 = performance.now();
  while (performance.now() - t0 < 6000) {
    await raf();
    const now = performance.now();
    if (fxHold.gold > now) holdF++;
    if (fxDisp && fxDisp.gold != null) lagMax = Math.max(lagMax, S.gold - fxDisp.gold);
  }
  mo.disconnect();

  const fly = born.filter(b => /fx-fly/.test(b.cls));
  return {
    gold: Math.round(S.gold - g0), dia: Math.round(S.dia - d0), stone: Math.round(S.stone - s0),
    fly: fly.length, flyL: [...new Set(fly.map(b => b.layer))],
    plus: born.filter(b => /fx-plus/.test(b.cls)).length,
    lit:  born.filter(b => /fx-lit/.test(b.cls)).length,
    burst: fxRewT > rew0,                          /* 512 보상 버스트가 터졌는가 */
    holdF, lagMax: Math.round(lagMax)
  };
}`;

(async () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  console.log('\n=== verify654 — 전투·보스·클리어 계열 골드 연출 무음 ===');

  /* ── [A] 정적 ─────────────────────────────────────────────────────────── */
  const tbl = (src.match(/const FX_COMBAT_FX\s*=\s*\{[^}]*\}/) || [''])[0];
  ok(/kill\s*:\s*false/.test(tbl) && /stageClear\s*:\s*false/.test(tbl)
     && /waveBonus\s*:\s*false/.test(tbl) && /clearGold\s*:\s*false/.test(tbl),
     '[A1] 스위치 표 네 항이 **전부 꺼져 있다** — ' + tbl);
  ok(/const fxClearMute\s*=\s*\(\)\s*=>\s*FX_COMBAT_FX\.clearGold\s*\?\s*\[\]\s*:\s*\['gold'\]/.test(src),
     '[A2] 무음 목록은 표에서 파생된다(`fxClearMute()`) — 표 한 낱말로 되돌아간다');
  ok(/function giveReward\(r, mute\)/.test(src),
     '[A3] `giveReward` 가 «연출 없이 줄 재화» 를 **부르는 쪽에서** 받는다(전투인지는 호출 문맥만 안다)');
  ok(/if\(mute && mute\.indexOf\(k\) >= 0\)\{ fxSilent\(k, n\); muted\+\+; \}/.test(src),
     '[A4] 무음은 592 와 **같은 기계**(fxSilent → fxMute)를 쓴다 — kinds 에서 빼기만 하면 UI 발로 승격된다');
  ok(/if\(kinds\.length \|\| !muted\) fxReward\(null, kinds\);/.test(src),
     '[A5] 무음 재화«만» 받은 지급은 보상 버스트도 안 터진다(공용 크림 #FFE9A8 = 512 가 지목한 금색)');

  /* ── [B] 전수 — 분류표와 소스가 정확히 맞는가 ─────────────────────────────
     주석을 걷어낸 «실제 코드» 에서 뽑는다(이 파일도, 제품 주석도 같은 문자열을 인용한다). */
  const stripComments = source => {
    let inb = false;
    return source.split('\n').map((ln, i) => {
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
  };
  const codeOnly = stripComments(src);
  const fnAt = idx => {
    for (let k = idx - 1; k >= 0; k--) {
      const m = codeOnly[k].ln.match(/^\s*(?:async\s+)?function\s+(\w+)/);
      if (m) return m[1];
    }
    return '?';
  };
  /* 분류표 — «전투·보스·클리어 계열» 은 무음, 그 밖은 512 유지.
     ⚠ 이 표는 손으로 적은 목록이지만 **소스와 정확히 일치할 때만 초록**이라 402 의 «표가 뒤처진다»
       와는 성질이 다르다 — 던전이 늘어도 지급 경로는 `finishDunRun` 하나다. */
  const MUTED = ['finishDunRun', 'sweepDungeon', 'endArena', 'endRaid'];   /* 전투·클리어 결과 보상 */
  const KEEP  = ['claimAttend', 'roulSpinTo', 'roulFinish'];               /* 비전투 수령(512 유지) */
  const calls = codeOnly.map((o, idx) => ({ i: o.i, fn: fnAt(idx), ln: o.ln }))
    .filter(o => /giveReward\(/.test(o.ln) && !/function giveReward/.test(o.ln));
  const mutedCalls = calls.filter(o => /fxClearMute\(\)/.test(o.ln));
  const keepCalls  = calls.filter(o => !/fxClearMute\(\)/.test(o.ln));
  const uniq = a => [...new Set(a)].sort();
  ok(JSON.stringify(uniq(mutedCalls.map(o => o.fn))) === JSON.stringify(uniq(MUTED)),
     '[B1] `fxClearMute()` 를 지나는 지급은 **전투·클리어 결과 넷뿐**이다 — '
     + JSON.stringify(mutedCalls.map(o => o.fn + '@' + o.i)));
  ok(JSON.stringify(uniq(keepCalls.map(o => o.fn))) === JSON.stringify(uniq(KEEP)),
     '[B2] 나머지 지급은 전부 **비전투 수령**이고 512 연출을 그대로 쓴다 — '
     + JSON.stringify(keepCalls.map(o => o.fn + '@' + o.i))
     + ' (새 호출부가 분류 없이 생기면 이 항이 곧바로 빨개진다)');
  /* 골드를 늘리는 자리 전수 — `giveReward` 안의 한 줄까지 포함해 아홉이다.
     ⚑ **804 — «분류» 는 이름이 아니라 «방향» 이다.** 697(상점 구매 즉시 지급)이 `grantNow` 에
       골드 자리를 하나 더 만들자 [B3] 이 «미분류» 로 빨개졌는데, 이 표에 이름 한 줄만 적어
       초록으로 되돌리는 것은 **누른 항**이다(328~330 교훈) — 그러면 다음에 누가 그 자리를
       무음으로 바꿔도 표는 그대로 초록이라 654 의 경계(«비전투 512 연출은 유지»)가 조용히 죽는다.
       ⇒ 이름 옆에 **무음이어야 하는가**를 적고, [B3m] 이 그것을 소스의 실제 모양과 대조한다.
       `giveReward` 만 `'경로'` 다 — 무음 여부를 부르는 쪽이 정하고 그건 [B1]·[B2] 가 본다. */
  const GOLD = {
    killEnemy:      { mute: true,   why: 'combat(592 무음) — 킬 드랍' },
    step:           { mute: true,   why: 'combat(654 무음) — 클리어 보너스 · 파도 보너스' },
    giveReward:     { mute: '경로', why: '부르는 쪽이 정한다(위 [B1][B2])' },
    claimMail:      { mute: false,  why: '비전투 수령(512 유지)' },
    claimAllMail:   { mute: false,  why: '비전투 수령(512 유지)' },
    renderCoinPage: { mute: false,  why: '비전투(광고 보상)' },
    claimOffline:   { mute: false,  why: '비전투(오프라인 보상)' },
    grantNow:       { mute: false,  why: '비전투(697 상점 구매 즉시 지급) — 512 연출 그대로' },
  };
  /* 자리의 «실제 방향» 은 바로 앞 세 줄의 `fxSilent('gold'` 로 읽는다 — 592·654 의 무음은
     예외 없이 «`fxAt` 대신 `fxSilent`» 한 줄이고, [B4] 가 이미 그 모양을 전투 세 자리에서 쓴다.
     여기서는 그 자를 **전 자리**로 넓혀 «유음이어야 하는 자리에 무음이 없는가» 까지 묻는다. */
  const scanGold = source => {
    const co = stripComments(source);
    const at = idx => { for (let k = idx - 1; k >= 0; k--) { const m = co[k].ln.match(/^\s*(?:async\s+)?function\s+(\w+)/); if (m) return m[1]; } return '?'; };
    return co.map((o, idx) => ({ i: o.i, fn: at(idx), ln: o.ln }))
      .filter(o => /S\.gold\s*\+=/.test(o.ln))
      .map(o => ({ ...o, silent: co.slice(Math.max(0, o.i - 4), o.i).some(x => /fxSilent\('gold'/.test(x.ln)) }));
  };
  const goldSites = scanGold(src);
  const unknown = goldSites.filter(o => !GOLD[o.fn]);
  ok(unknown.length === 0,
     '[B3] `S.gold +=` 자리가 **전부 분류돼 있다** — ' + JSON.stringify(uniq(goldSites.map(o => o.fn)))
     + (unknown.length ? ' · 미분류 ' + JSON.stringify(unknown.map(o => o.fn + '@' + o.i)) : ''));
  /* 방향 대조 — 표가 «무음» 이라 적은 자리는 실제로 무음이고, «유음» 이라 적은 자리는 실제로 유음이다. */
  const mismatch = src2 => scanGold(src2)
    .filter(o => GOLD[o.fn] && GOLD[o.fn].mute !== '경로' && GOLD[o.fn].mute !== o.silent)
    .map(o => o.fn + '@' + o.i + (o.silent ? '(무음)' : '(유음)'));
  const mis = mismatch(src);
  ok(mis.length === 0,
     '[B3m] 분류표의 **방향**이 소스와 맞는다 — 무음 '
     + JSON.stringify(goldSites.filter(o => o.silent).map(o => o.fn + '@' + o.i))
     + ' · 유음 ' + JSON.stringify(goldSites.filter(o => !o.silent && GOLD[o.fn] && GOLD[o.fn].mute !== '경로').map(o => o.fn))
     + (mis.length ? ' · 어긋남 ' + JSON.stringify(mis) : '')
     + ' (이름만 등재하고 방향을 안 적으면 이 항이 없다 — 804)');
  const combatGold = goldSites.filter(o => o.fn === 'killEnemy' || o.fn === 'step');
  ok(combatGold.length === 3 && combatGold.every(o =>
       codeOnly.slice(Math.max(0, o.i - 4), o.i).some(x => /fxSilent\('gold'/.test(x.ln))),
     '[B4] 전투 발 골드 세 자리(killEnemy · 클리어 보너스 · 파도 보너스)가 **전부 바로 앞줄에서 fxSilent** 를 지난다 — '
     + JSON.stringify(combatGold.map(o => o.fn + '@' + o.i)));

  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const run = async (scene, on) => {
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(scene + (on ? '/' + on : '') + ': ' + m.text()); });
    p.on('pageerror', e => errs.push(scene + (on ? '/' + on : '') + ': ' + String(e)));
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.waitForTimeout(900);
    /* ⚠ 문자열 씬은 `eval('(' + … + ')')` 로 **함수로 만들어** 넘긴다(probe592 머리말의 함정) */
    const r = await p.evaluate(eval('(' + SCENE + ')'), { scene, on: on || null });
    await p.close();
    console.log('  [i] ' + scene + (on ? ' /되돌림:' + on : '') + ' — ' + JSON.stringify(r));
    return r;
  };

  /* ── [1]~[5] 본체 ─────────────────────────────────────────────────────── */
  const st = await run('stage');
  ok(!st.err && st.gold > 0, '[1a] 보스 격파 → 클리어 보너스 골드는 **그대로 들어온다** — +' + st.gold);
  ok(!st.err && st.fly === 0 && st.plus === 0 && st.lit === 0,
     '[1b] 그런데 코인 0 · +n 0 · 알약 점등 0 — ' + st.fly + '/' + st.plus + '/' + st.lit
     + ' (주인 보고 «보스 끝났더니 뜨더라» 의 그 자리)');

  const wv = await run('wave');
  ok(wv.gold > 0 && wv.fly === 0 && wv.plus === 0,
     '[2] 파도 전멸 보너스도 무음 — 골드 +' + wv.gold + ' · 코인 ' + wv.fly + ' · +n ' + wv.plus);

  const dn = await run('dun');
  ok(dn.gold > 0 && dn.fly === 0 && dn.plus === 0,
     '[3a] 던전 «황금 동굴» 클리어 보상도 무음 — 골드 +' + dn.gold + ' · 코인 ' + dn.fly);
  ok(dn.burst === false,
     '[3b] **보상 버스트도 안 터진다** — 무음 재화만 받은 지급이라 공용 크림(#FFE9A8)조차 없다 '
     + '(코인만 끄고 이걸 남기면 «보스 끝났더니 금색이 터진다» 가 그대로 남는다)');

  const sw = await run('sweep');
  ok(sw.gold > 0 && sw.fly === 0,
     '[4] 소탕도 같은 무음 — 골드 +' + sw.gold + ' · 코인 ' + sw.fly
     + ' (한쪽만 끄면 «직접 깨면 조용하고 소탕하면 난다» 가 된다)');

  const ar = await run('arena');
  ok(ar.gold > 0 && ar.dia > 0, '[5a] 아레나 결과 보상은 골드·다이아가 다 들어온다 — +' + ar.gold + ' / +' + ar.dia);
  ok(ar.fly > 0 && ar.burst === true,
     '[5b] **무음은 골드 한 축뿐** — 다이아·강화석 연출은 그대로 난다(코인 ' + ar.fly + '개 · 버스트 O). '
     + '여기까지 0 이면 위임 규약의 범위를 넘긴 것이다');

  /* ── [6] 경계 — 비전투 수령의 512 연출은 살아 있다 ────────────────────── */
  const ml = await run('mail');
  ok(ml.fly > 0 && ml.flyL.includes('fxl') && ml.burst === true,
     '[6] 비전투 수령(512)은 **그대로** — 코인 ' + ml.fly + '개 ' + JSON.stringify(ml.flyL) + ' · 버스트 O '
     + '(«전부 끄기» 가 아니라 «전투 계열만» 이라는 경계. verify512 와 서로 반대를 단언하지 않는 자리다)');

  /* ── [8] 경계 둘째 — 697 상점 구매 즉시 지급(`grantNow`)도 512 연출 그대로 ────────
     804 — [B3m] 이 «표가 유음이라 적었다» 를 소스로 말한다면 이 항은 **찍힌 코인**으로 말한다.
     `grantNow` 는 `giveReward` 를 안 지나므로 [6] 이 초록이어도 이 자리가 무음일 수 있다. */
  const gr = await run('grant');
  ok(gr.gold > 0 && gr.fly > 0 && gr.flyL.includes('fxl') && gr.burst === true,
     '[8] 697 상점 구매 즉시 지급도 **512 연출 그대로** — 골드 +' + gr.gold + ' · 코인 ' + gr.fly
     + '개 ' + JSON.stringify(gr.flyL) + ' · 버스트 ' + (gr.burst ? 'O' : 'X')
     + ' (무음은 전투·클리어 계열뿐이라는 경계의 두 번째 표본)');

  /* ── [7] HUD — 무음 골드는 붙잡히지 않는다 ─────────────────────────────── */
  ok(st.holdF === 0 && wv.holdF === 0 && dn.holdF === 0,
     '[7] 무음 골드는 fxHold 에 안 걸린다(숫자가 2초 뒤에 튀지 않는다) — 홀드 프레임 '
     + [st.holdF, wv.holdF, dn.holdF].join('/'));

  /* ── [R] 되돌림 — 항을 하나씩 켜면 그 자리의 코인이 **다시 난다** ──────── */
  const r1 = await run('stage', 'stageClear');
  ok(r1.fly > 0 && r1.flyL.includes('fxlc'),
     '[R1] `stageClear` 를 켜면 클리어 보너스 코인이 다시 난다 — ' + r1.fly + '개 ' + JSON.stringify(r1.flyL)
     + ' (= [1b] 의 0 은 «어차피 안 나는 것» 이 아니라 이 수리가 만든 값이다)');
  const r2 = await run('wave', 'waveBonus');
  ok(r2.fly > 0, '[R2] `waveBonus` 를 켜면 파도 보너스 코인이 다시 난다 — ' + r2.fly + '개');
  const r3 = await run('dun', 'clearGold');
  ok(r3.fly > 0 && r3.burst === true,
     '[R3] `clearGold` 를 켜면 던전 클리어 보상의 코인·버스트가 **둘 다** 돌아온다 — ' + r3.fly + '개 · 버스트 O');
  /* ⚑ [R1]~[R3] 은 592 원장의 두 번째 몫이기도 하다 — `FXFLY_MAX_C`·`fxOrigBurstT`·combat 롤링
     분기가 «소비처 0 인 죽은 코드» 가 아니라 **스위치의 반대쪽**임을 실제 코인 수로 못박는다.
     이 세 항이 빨개지면 그때는 정말 죽은 코드이니 선언째 걷어내야 한다(index.html 35240 원장). */
  ok(r1.flyL.includes('fxlc') && r2.fly > 0,
     '[R4] 되살아난 코인은 **#fxlc(전투 발 · 팝업 아래)** 로 간다 = 592 원장의 combat 기계가 살아 있다');

  /* ── [R5]·[R6] 되돌림 — [B3m] 이 «무르게 푼 항» 이 아님을 못박는다 (804) ────────
     소스 **사본**에 한 줄을 넣거나 빼서 두 방향을 각각 뒤집어 본다(제품 파일은 안 건드린다).
     이름만 등재하는 옛 [B3] 로는 둘 다 초록이었다 — 그것이 이 두 항의 존재 이유다. */
  const injected = src.replace(/^(\s*)(S\.gold \+= g; S\.dia \+= c; S\.relic \+= r;)$/m,
                               "$1fxSilent('gold', g);\n$1$2");
  ok(injected !== src && mismatch(injected).length > 0,
     '[R5] `grantNow` 를 **무음으로 바꾸면** [B3m] 이 즉시 빨개진다 — '
     + JSON.stringify(mismatch(injected))
     + ' (= 697 상점 구매의 512 연출이 조용히 꺼지는 길이 막혀 있다)');
  const removed = src.replace(/^(\s*)else fxSilent\('gold', g\);$/m, '$1else ;');
  ok(removed !== src && mismatch(removed).length > 0,
     '[R6] 반대로 전투 자리(`killEnemy`)의 `fxSilent` 를 **빼면** 그것도 빨개진다 — '
     + JSON.stringify(mismatch(removed))
     + ' (방향 대조가 한쪽으로만 도는 자가 아니다)');

  ok(errs.length === 0, '[X] 콘솔 에러 0건 — ' + JSON.stringify(errs.slice(0, 3)));

  await b.close();
  const tag = 'VERIFY654 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS');
  console.log('\n' + tag);
  process.exit(fail ? 1 : 0);
})();
