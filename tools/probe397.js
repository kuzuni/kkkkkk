#!/usr/bin/env node
/* 작업 397 — «스캐너가 정말 그 화면에 도착하는가» 재현기 (측정 전용)
 *
 *   node tools/probe397.js            # scan356 SCREENS 의 단계별 도착 판정
 *   node tools/probe397.js --json
 *
 * 397 등재문의 주장은 «scan356 이 36 출석 패스를 한 번도 본 적이 없다» 였다.
 * 338·341·350 규칙대로 처방을 따르기 전에 **직접 물어서** 확인한다 —
 * 등재문은 자리 하나(SCREENS 55행)를 지목했지만, 스캐너의 단계는
 *   `page.evaluate(q => { const el = document.querySelector(q); if (el) el.click(); })`
 * 라 **셀렉터가 안 맞으면 조용히 아무 일도 안 일어난다**(예외도 안 난다).
 * 그래서 «못 가는 화면» 은 등재문이 지목한 하나가 아닐 수 있다 = 이 자가 세는 것.
 *
 * 각 단계마다 두 가지를 찍는다:
 *   resolved — 그 셀렉터가 DOM 에 있었는가 (없으면 그 단계는 **무음 실패**)
 *   moved    — 누른 뒤 화면이 실제로 바뀌었는가 (#app 의 보이는 노드 서명 변화)
 * 두 화면의 서명이 «닮았으면» «다른 이름의 같은 화면» 을 두 번 스캔한 것이다.
 *
 * ⚑ 448(2026-08-30) — **세 축 중 «서명 중복» 과 «moved» 두 축이 무음이었다.**
 *   서명을 해시로 내던 탓에 노드 1250개 중 둘(`nickN`·`cdv`)만 흔들려도 두 화면이 갈렸고,
 *   **같은 화면을 두 번 연 것조차** 다른 해시였다 = 두 축이 어떤 자리에서도 안 울렸다.
 *   ⇒ 해시를 버리고 다중집합 자카드로 «얼마나 닮았나» 를 재고(SIM_T),
 *      매 실행 **양성 대조**(가장 조용한 화면을 다른 이름으로 한 번 더 열어 중복으로 잡히는지)와
 *      **음성 여유**(중복 아닌 쌍 중 가장 닮은 것이 임계값에서 얼마나 떨어졌나)를 같이 찍는다.
 *      그리고 잡음이 SIM_T 보다 큰 화면은 «못 봤다» 고 **고지**한다 — 조용한 0 을 다시 만들지 않으려고.
 *   되돌림 시험은 아래 `P397_EXTRA` 주입구로 돈다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚠ 356 13회차 — 구동기는 `scan356.STEP` 한 벌이다(자기 손으로 다시 적으면 `js:<식>` 단계를
   조용히 건너뛴다 · `verify356` [R12] 가 지킨다). */
const { SCREENS, STEP } = require('./scan356');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const JSON_OUT = process.argv.includes('--json');

/* 화면 서명 — «보이는 노드의 선택자 + 상자» 를 **줄의 목록으로** 낸다.
   텍스트는 안 쓴다(카운트다운·수치가 매 프레임 달라 서명이 흔들린다).
 *
 * ⚑ 448(2026-08-30) — **여기서 해시를 내던 것이 «서명 중복» 축을 통째로 죽여 놓았다.**
 *   443 수리 전 트리에서 `35 패스(보물상자)` 는 무음 실패로 `35 패스(스테이지)` 와
 *   **같은 화면**을 열었는데 자는 «서명이 같은 화면 0묶음» 이라고 찍었다.
 *   재현으로 그 이유를 찍어 보니 1250 노드 중 **딱 둘**이 흔들린다:
 *     nickN  194,12,183,32 ↔ 193,12,184,32   (닉네임 글자 폭 — 매 로드 달라진다)
 *     cdv    43,1981,88,77 ↔ 43,2002,88,56   (시간이 흐르면 자란다)
 *   해시는 «1비트만 달라도 완전히 다른 값» 이라 이 둘만으로 두 화면이 갈렸고,
 *   **같은 화면을 두 번 연 것조차 서로 다른 해시**였다(A vs A2 도 nickN 하나로 갈렸다)
 *   = 이 축은 이 자리 하나가 아니라 **모든 자리에서** 무음이었다.
 *   ⇒ 해시를 버리고 목록을 그대로 들고 있다가 아래 `sim()` 으로 «얼마나 닮았나» 를 잰다. */
const SIG = function () {
  const app = document.getElementById('app');
  if (!app) return null;
  const out = [];
  for (const el of app.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    out.push((el.id || el.className || el.tagName) + ':' + Math.round(r.x) + ',' + Math.round(r.y)
      + ',' + Math.round(r.width) + ',' + Math.round(r.height));
  }
  return out;
};

/* 표시용 해시 — 판정에는 안 쓴다(위 주석). 사람이 눈으로 줄을 구별하라고 남긴다. */
function sigHash(arr) {
  if (!arr) return 'noapp';
  const s = arr.join(';');
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return String(h >>> 0) + '/' + arr.length;
}

/* 다중집합 자카드 — 같은 줄이 여러 번 나오는 것(형제 카드들)까지 세도록 개수로 접는다. */
function sim(a, b) {
  if (!a || !b) return 0;
  const bag = (x) => { const m = new Map(); for (const v of x) m.set(v, (m.get(v) || 0) + 1); return m; };
  const A = bag(a), B = bag(b);
  let inter = 0, uni = 0;
  for (const k of new Set([...A.keys(), ...B.keys()])) {
    const x = A.get(k) || 0, y = B.get(k) || 0;
    inter += Math.min(x, y); uni += Math.max(x, y);
  }
  return uni ? inter / uni : 1;
}

/* 임계값 — **손으로 고른 값이 아니라 잰 값이다**(448 보정, 44화면 전수 · 각 2회 실행).
 *     참-같은 쌍 최저 유사도  0.9968   (패스 stage ↔ box 무음실패 · stage ↔ stage 재실행)
 *     참-다른 쌍 최고 유사도  0.9721   (35 패스 «시련의 탑» ↔ «절망의 탑» — 형제 탭이라 가장 닮았다)
 *   ⇒ 0.9721 < SIM_T ≤ 0.9968 이 틈이고 그 한복판이 0.985 다(양쪽 여유 +1.3pp / −1.2pp).
 *
 * ⚠ **버려진 후보 셋을 여기 적어 둔다 — 재는 데 든 값이 아까워서가 아니라, 다시 고르지 말라고.**
 *   ⓐ «선택자만»(rect 를 통째로 뺀다): 참-다른 **5쌍**이 정확히 일치했다
 *      (`A1 탭바 열림`↔`06 장비` · `21 도감(스킬)`↔`21 도감(무기)` · `33 재화 정보` 3쌍) = 반대 방향 헛빨강.
 *   ⓑ «rect 를 8px 격자로 뭉갠다»: 참-같은 쌍이 **여전히 안 잡힌다**(nickN 194↔198 · cdv y 1981↔2002 는 격자를 넘는다).
 *   ⓒ «화면 자신의 흔들림으로 나눈 상대비» c/min(n_i,n_j): 참-다른 최고 **1.0102** > 참-같은 최저 **1.0008** 로
 *      **틈이 뒤집힌다**(흔들리는 화면은 분모가 무너져 아무나 «같은 화면» 이 된다). */
const SIM_T = 0.985;
/* 뭉갤 수 있는 키의 굵기 상한 — 이 이하로 나오는 키만 «희소» 로 본다(아래 파생 주석). */
const RARE_MAX = 4;

/* 한 화면을 연다. diag=true 면 단계마다 resolved/moved 를 같이 찍는다. */
async function visit(browser, steps, diag) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const st = [];
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    let sig = await page.evaluate(SIG);
    for (const s of steps) {
      const found = await STEP(page, s);
      await page.waitForTimeout(420);
      const now = await page.evaluate(SIG);
      /* ⚑ 448 — `moved` 도 같은 뿌리로 무음이었다. 예전 자는 서명 해시를 **정확 비교**해서,
         아무 일도 안 일어나고 420ms 만 흘러도(`cdv` 가 자란다) «움직였다» 고 찍었다
         = «눌렀는데 안 바뀐 단계» 축이 언제나 «없음» 이었다. 같은 자(SIM_T)로 판다. */
      if (diag) st.push({ sel: s, resolved: found, moved: sim(now, sig) < SIM_T, sim: +sim(now, sig).toFixed(4) });
      sig = now;
    }
    await page.waitForTimeout(250);
    const out = { sig: await page.evaluate(SIG), steps: st };
    await ctx.close();
    return out;
  } catch (e) {
    await ctx.close();
    return { sig: null, steps: st, err: String(e.message || e).split('\n')[0] };
  }
}

/* 되돌림 시험용 주입구(448) — 448 이 고친 사고를 **다시 만들어** 축이 잡는지 묻는 자리다.
 *   P397_EXTRA='[["35 패스(box=무음실패)",["#menub","#psGo","#psBar [data-ptab=\"box\"]"]]]' node tools/probe397.js
 * 이 줄은 443 수리 전의 무음 실패를 그대로 재현한다(`box` 는 428 이 없앤 탭 키라 클릭이
 * 없던 일이 되고 `35 패스(스테이지)` 와 **같은 화면**이 열린다) — 축이 살아 있으면 중복으로 잡힌다. */
const EXTRA = process.env.P397_EXTRA ? JSON.parse(process.env.P397_EXTRA) : [];

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const LIST = [...SCREENS, ...EXTRA];
  for (const [label, steps] of LIST) {
    const v = await visit(browser, steps, true);
    rows.push({ screen: label, sig: v.sig, steps: v.steps, err: v.err });
  }

  /* ── 2차 통과: «화면 자신의 흔들림»(잡음 바닥 n) ──
     같은 화면을 한 번 더 열어 자기 자신과의 유사도를 잰다. 이것이 SIM_T 아래면
     그 화면은 **중복을 원리적으로 못 본다** — 448 이 고친 것은 «무음» 이지 «전지» 가 아니다.
     그 사실을 숫자로 고지하는 것이 이 통과의 전부다(숨기면 예전 자와 같은 사고가 난다). */
  const noFloor = process.argv.includes('--nofloor');
  const floor = new Array(rows.length).fill(null);
  if (!noFloor) {
    for (let i = 0; i < LIST.length; i++) {
      const v = await visit(browser, LIST[i][1], false);
      floor[i] = rows[i].sig && v.sig ? sim(rows[i].sig, v.sig) : null;
      rows[i].sig2 = v.sig;
    }
  }

  /* ── 흔들리는 노드를 «표» 가 아니라 **파생** 한다(402 규약) ──
     2차 통과가 준 «같은 화면 두 장» 의 대칭차에 들어간 키가 곧 흔들리는 노드다.
     그 키만 **자리를 안 세고 존재만** 센다(지우지 않는다 — 지우면 그 노드가 통째로
     사라져도 서명이 같아진다). 손으로 적은 목록이 아니므로 UI 가 바뀌면 따라온다.
     ⚠ 무르게 만든 만큼 반대쪽을 아래 «음성 여유» 가 매 실행 감시한다.
   ⚠ **희소 가드(RARE_MAX)가 없으면 이 파생은 ⓐ 로 되돌아간다 — 재서 확인했다.**
     가드 없이 «흔들린 키» 를 통째로 뭉갰더니 잡음 바닥은 42/42 로 올라갔지만
     **참-다른 4묶음이 중복으로 잡혔다**(`A1 탭바 열림`==`06 장비` sim 1.0000 ·
     `21 도감(스킬)`==`21 도감(무기)` 1.0000 · `33 재화 정보` 3쌍 0.9878).
     뿌리는 **키의 굵기**다 — `nickN`·`cdv` 는 화면에 한둘뿐이라 뭉개도 잃는 게 없지만,
     `I`(민 `<i>` 아이콘) 같은 키는 수백 개짜리 **덩어리**라 그것을 뭉개면
     «아이콘 격자만 다른 화면들» 이 통째로 같아진다. ⇒ 인스턴스가 RARE_MAX 이하인 키만 뭉갠다. */
  const unstable = new Set();
  const proj = (arr) => (arr ? arr.map((e) => {
    const k = e.slice(0, e.lastIndexOf(':'));
    return unstable.has(k) ? k : e;
  }) : arr);
  if (!noFloor) {
    const bag = (x) => { const m = new Map(); for (const v of x || []) m.set(v, (m.get(v) || 0) + 1); return m; };
    /* 키 굵기 — 어느 화면에서든 인스턴스가 RARE_MAX 를 넘으면 «덩어리» 라 뭉개지 않는다. */
    const thick = new Map();
    for (const r of rows) for (const arr of [r.sig, r.sig2]) {
      if (!arr) continue;
      const per = new Map();
      for (const e of arr) { const k = e.slice(0, e.lastIndexOf(':')); per.set(k, (per.get(k) || 0) + 1); }
      for (const [k, n] of per) thick.set(k, Math.max(thick.get(k) || 0, n));
    }
    for (const r of rows) {
      if (!r.sig || !r.sig2) continue;
      const A = bag(r.sig), B = bag(r.sig2);
      for (const k of new Set([...A.keys(), ...B.keys()])) {
        if ((A.get(k) || 0) === (B.get(k) || 0)) continue;
        const key = k.slice(0, k.lastIndexOf(':'));
        if ((thick.get(key) || 0) <= RARE_MAX) unstable.add(key);
      }
    }
    for (const r of rows) { r.sig = proj(r.sig); r.sig2 = proj(r.sig2); }
    for (let i = 0; i < rows.length; i++) floor[i] = rows[i].sig && rows[i].sig2 ? sim(rows[i].sig, rows[i].sig2) : null;
  }

  /* ── 대조군(양성) ──
     «축이 지금 살아 있는가» 를 매 실행 스스로 증명한다. 가장 조용한 화면(잡음 바닥 최고)을
     **다른 이름으로 한 번 더** 열어서, 그것을 중복으로 못 잡으면 축이 죽은 것이다.
     448 이 잡은 사고가 정확히 «축이 죽었는데 0묶음이라 초록으로 읽혔다» 이므로,
     이 대조군이 빨간 채로 «중복 없음» 을 찍는 일은 다시는 없어야 한다. */
  let ctrl = null;
  if (!noFloor) {
    let bi = -1, bv = -1;
    floor.forEach((v, i) => { if (v !== null && v > bv) { bv = v; bi = i; } });
    if (bi >= 0) {
      const v = await visit(browser, LIST[bi][1], false);
      v.sig = proj(v.sig);
      const c = v.sig ? Math.max(sim(rows[bi].sig, v.sig), sim(rows[bi].sig2, v.sig)) : 0;
      ctrl = { screen: rows[bi].screen, floor: bv, c, pass: c >= SIM_T };
    }
  }
  await browser.close();

  /* ── 서명 중복 = 같은 화면을 두 번 센 것 ──
     정확 일치가 아니라 «SIM_T 이상 닮았는가» 로 판다(위 SIM_T 주석의 잰 값). */
  const simOf = (i, j) => {
    const cands = [sim(rows[i].sig, rows[j].sig)];
    if (rows[i].sig2) cands.push(sim(rows[i].sig2, rows[j].sig));
    if (rows[j].sig2) cands.push(sim(rows[i].sig, rows[j].sig2));
    if (rows[i].sig2 && rows[j].sig2) cands.push(sim(rows[i].sig2, rows[j].sig2));
    return Math.max(...cands);
  };
  const pairs = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    if (!rows[i].sig || !rows[j].sig) continue;
    pairs.push({ i, j, c: simOf(i, j) });
  }
  const hit = pairs.filter((p) => p.c >= SIM_T);
  /* 묶기(합집합) */
  const par = rows.map((_, i) => i);
  const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
  for (const p of hit) par[find(p.i)] = find(p.j);
  const groups = new Map();
  for (const p of hit) { const r = find(p.i); if (!groups.has(r)) groups.set(r, new Set()); groups.get(r).add(p.i); groups.get(r).add(p.j); }
  const dup = [...groups.values()].map((s) => [...s].map((i) => rows[i].screen));

  /* 음성 여유 — 중복으로 안 잡힌 쌍 중 가장 닮은 것이 임계값에서 얼마나 떨어져 있나.
     이 여유가 0 에 붙으면 다음 UI 변경 한 번에 헛빨강이 난다. */
  const rest = pairs.filter((p) => p.c < SIM_T).sort((a, b) => b.c - a.c);
  const near = rest[0] || null;

  const covered = floor.filter((v) => v !== null && v >= SIM_T).length;
  const blind = rows.map((r, i) => [r.screen, floor[i]]).filter(([, v]) => v !== null && v < SIM_T).sort((a, b) => a[1] - b[1]);
  const dead = rows.filter((r) => r.steps.some((s) => !s.resolved));
  const inert = rows.filter((r) => r.steps.length && r.steps.every((s) => s.resolved) && !r.steps.some((s) => s.moved));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      simT: SIM_T, rows: rows.map((r, i) => ({ screen: r.screen, hash: sigHash(r.sig), floor: floor[i], steps: r.steps, err: r.err })),
      dup, ctrl, near: near ? { a: rows[near.i].screen, b: rows[near.j].screen, c: near.c } : null,
      dead: dead.map((r) => r.screen), covered, blind, unstable: [...unstable],
    }, null, 1));
    process.exit(ctrl && !ctrl.pass ? 3 : 0);
  }

  console.log(`[probe397] 화면 ${rows.length}개 · 무음 실패 단계를 가진 화면 ${dead.length}개 · 서명 중복 ${dup.length}묶음 (SIM_T ${SIM_T})\n`);
  console.log('— 무음 실패(셀렉터가 DOM 에 없어 클릭이 통째로 없던 일이 된 단계) —');
  if (!dead.length) console.log('  없음');
  for (const r of dead) {
    console.log(`  ${r.screen}`);
    for (const s of r.steps) if (!s.resolved) console.log(`      ✗ ${s.sel}   (resolved=false)`);
  }
  console.log('\n— 눌렀는데 화면이 안 바뀐 단계(서명이 SIM_T 이상 그대로) —');
  const nomove = rows.flatMap((r) => r.steps.filter((s) => s.resolved && !s.moved).map((s) => `  ${r.screen}: ${s.sel}   (sim ${s.sim})`));
  console.log(nomove.length ? nomove.join('\n') : '  없음');
  console.log('\n— 서명이 같은 화면(= 실제로는 같은 자리를 두 번 스캔) —');
  if (!dup.length) console.log('  없음');
  for (const d of dup) console.log('  ' + d.join('  ==  '));
  for (const p of hit) console.log(`      ${rows[p.i].screen}  ↔  ${rows[p.j].screen}   sim ${p.c.toFixed(4)}`);
  if (inert.length) console.log('\n— 단계가 전부 resolve 됐지만 아무 것도 안 움직인 화면 —\n  ' + inert.map((r) => r.screen).join('\n  '));

  /* ── 축이 살아 있는가(448) ── */
  console.log('\n— 중복 축 자기 점검 —');
  if (noFloor) {
    console.log('  ⚠ --nofloor: 잡음 바닥·대조군을 건너뛰었다. «중복 0묶음» 을 근거로 쓰지 마라.');
  } else {
    console.log(ctrl
      ? `  ${ctrl.pass ? '✓' : '✗'} 양성 대조 — «${ctrl.screen}» 를 다른 이름으로 한 번 더 열었을 때 sim ${ctrl.c.toFixed(4)} ${ctrl.pass ? '≥' : '<'} ${SIM_T}`
      : '  ✗ 양성 대조를 못 세웠다(전 화면이 실패했다)');
    console.log(near
      ? `  음성 여유 — 중복 아닌 쌍 중 가장 닮은 것 ${near.c.toFixed(4)} (${rows[near.i].screen} ↔ ${rows[near.j].screen}) · 임계값까지 ${(SIM_T - near.c).toFixed(4)}`
      : '  음성 여유 — 잴 쌍이 없다');
    console.log(`  흔들리는 노드 ${unstable.size}종 — 자리를 안 세고 존재만 센다(파생 · 손으로 적은 목록이 아니다)`);
    if (unstable.size) console.log('      ' + [...unstable].slice(0, 8).map((k) => k.slice(0, 34)).join(' · ') + (unstable.size > 8 ? ` … 외 ${unstable.size - 8}종` : ''));
    console.log(`  중복 축이 실효인 화면 ${covered}/${floor.filter((v) => v !== null).length} (잡음 바닥 ≥ ${SIM_T})`);
    if (blind.length) {
      console.log('  ⚠ 아래 화면은 **자기 자신과도** SIM_T 만큼 안 닮는다 = 이 축이 못 본다(수치는 자기 유사도):');
      for (const [l, v] of blind) console.log(`      ${v.toFixed(4)}  ${l}`);
      console.log('    → 이 화면들의 «중복 없음» 은 «확인했다» 가 아니라 «못 봤다» 다.');
    }
  }
  process.exit(ctrl && !ctrl.pass ? 3 : 0);
})();
