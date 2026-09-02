#!/usr/bin/env node
/* 게이트 678 — 「죽은 `fxSpend` 계열을 **선언째** 걷었다」 (2026-09-02 · 등재 sess-1348-13644 워커 D)
 *
 *   node tools/verify678.js
 *
 * 무엇을 걷었나 — 583 이 세운 «강화에 쓰는 화폐» **알갱이 비행** 한 벌:
 *   `fxSpend` · `fxSpendFrom` · `fxSpendT` · `FX_SPEND_GAP/DUR/LAG/JX/JY` · CSS `.fx-fly.fx-spd`
 * 왜 걷었나 — 660(= 658 · 주인 «골드가 훈련 버튼쪽으로 가는 연출 없애기. 존나 후지다»)이 유일한
 *   호출부 둘(`upFx`·`fxUpOk`)을 걷어 **소비처가 0** 이 됐다. 660 회차가 선언을 안 걷은 것은 판단이
 *   아니라 선점 규약이었다(그때 `docs/claims/619.lock` 이 살아 있었고 619 가 바로 그 함수를 고치는 중).
 *
 * ⚠⚠ 이 자의 본체는 **«지웠다» 가 아니라 «무엇을 안 지웠나»** 다(LESSONS 9263-② · 11024-③).
 *   죽은 코드를 걷는 작업의 실제 사고는 «지우는 김에» 가 **공용 부품을 데려가는** 것이다:
 *     · 크기·개수 축 543(`FX3_FLYS`·`FX3_LAND`·`FX3_BSPITCH`·`fxGrainSc`) — 획득 비행이 계속 쓴다
 *     · 몸·착지 CSS(`.fx-fly`·`.fx-land`) · 출발 자리 `fxPill()` — 획득이 계속 쓴다
 *     · `FXPAL.upNow` — 소비처는 0 이지만 **표에 남긴다**(512 «색은 표에서만»)
 *   그래서 [B] 가 [A] 와 같은 무게다.
 *
 *   [A] 걷힘   — 죽은 식별자·CSS 규칙이 **코드에서** 0건(주석 산문은 안 센다)
 *   [B] 남김   — 공용 축·몸·팔레트 칸이 그대로 있다(과잉 삭제 0)
 *   [C] 런타임 — 전역 `fxSpend` 가 없고, 세 자리 강화 연출은 그대로 난다 · 콘솔 에러 0
 *   [R] 되돌림 — 선언·CSS 를 **사본에** 되붙이면 [A] 가 빨개진다(이 자가 그것을 실제로 본다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 주석을 걷은 «코드만» 의 사본 — 이 파일은 머리말이 산문이라 식별자를 그대로 세면
   **자기 설명이 자기를 빨갛게 만든다**(658 1회차가 «따옴표 안 fx-spd» 로 3곳을 세던 함정과 같은 벌). */
const codeOf = s => s
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

/* 죽은 축의 식별자 — 하나라도 코드에 남아 있으면 «반만 걷은» 것이다 */
const DEAD = [
  { re: /\bfunction\s+fxSpend\s*\(/,     n: '`function fxSpend(`' },
  { re: /\bfunction\s+fxSpendFrom\s*\(/, n: '`function fxSpendFrom(`' },
  { re: /\bfxSpendT\b/,                  n: '`fxSpendT`(WeakMap)' },
  { re: /\bFX_SPEND_(GAP|DUR|LAG|JX|JY)\b/, n: '`FX_SPEND_*` 상수' },
  { re: /\bfxSpend\s*\(/,                n: '`fxSpend()` 호출' },
  { re: /fx-fly fx-spd|['"`]fx-spd['"`]/, n: 'JS 가 붙이는 `fx-spd` 클래스' },
  { re: /\.fx-fly\.fx-spd\s*\{/,         n: 'CSS `.fx-fly.fx-spd{…}`' },
  { re: /--spd-t\s*[:,)]/,               n: 'CSS 변수 `--spd-t`' }
];

/* 걷으면 안 되는 것 — 공용 축(543)·몸·팔레트 */
const KEEP = [
  { re: /\bFX3_FLYS\s*=\s*[\d.]+\s*\*\s*FX_GRAIN_SC/, n: '543 축 `FX3_FLYS`' },
  { re: /\bFX3_LAND\s*=\s*[\d.]+/,                    n: '543 축 `FX3_LAND`' },
  { re: /const\s+FX3_BSPITCH\s*=/,                    n: '543 축 `FX3_BSPITCH`' },
  { re: /const\s+fxGrainSc\s*=/,                      n: '재화별 잉크 보정 `fxGrainSc`' },
  { re: /function\s+fxPill\s*\(/,                     n: '출발 자리 `fxPill`(획득이 쓴다)' },
  { re: /\.fx-land\s*\{\s*animation:fxLand/,          n: 'CSS 착지 `.fx-land`' },
  { re: /@keyframes\s+fxLand/,                        n: '`@keyframes fxLand`' },
  { re: /function\s+upFx\s*\(/,                       n: '그 자리를 대신하는 `upFx`(660 버튼 버스트)' },
  { re: /upNow\s*:\s*'#[0-9A-Fa-f]{6}'/,              n: '`FXPAL.upNow` 칸(512 — 일부러 남겼다)' }
];

(async () => {
  console.log('\n=== verify678 — 죽은 `fxSpend` 계열 선언째 철거 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');
  const code = codeOf(src);

  console.log('[A] 걷힘 — 죽은 식별자·CSS 가 코드에서 0건');
  for (const d of DEAD) {
    const hit = d.re.test(code);
    ok(!hit, '[A] ' + d.n + ' 가 코드에 **없다**', hit ? '남아 있다' : '0건');
  }
  /* ⚠ 산문에는 남아 있어야 한다 — «왜 없는가» 를 다음 세션이 읽을 자리다(LESSONS 11024-③:
     남기기로 했든 걷기로 했든 «이유를 꼬리 주석에» 적어 다음 세션이 다시 안 판다). */
  ok(/⛔ 678/.test(src) && /되살리지 마라/.test(src),
     '[A9] ★ 걷은 자리에 **묘비 주석**(⛔ 678)이 남아 «왜 없는지·되살리지 마라» 를 말한다');

  console.log('\n[B] 남김 — 공용 축을 «지우는 김에» 데려가지 않았다');
  for (const k of KEEP) ok(k.re.test(code) || k.re.test(src), '[B] ' + k.n + ' 는 그대로다');

  console.log('\n[C] 런타임 — 전역이 없고, 그 자리의 연출은 그대로 난다');
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
  await p.waitForTimeout(1000);

  const G = await p.evaluate(() => ({
    spend: typeof window.fxSpend, from: typeof window.fxSpendFrom,
    up: typeof window.upFx, fly: typeof window.fxFly,
    /* CSSOM 에 규칙이 정말 없는가 — 문자열 grep 과 **다른 자**로 한 번 더 묻는다 */
    spdRule: (() => { let n = 0;
      for (const ss of document.styleSheets) {
        let rs; try { rs = ss.cssRules; } catch (_) { continue; }
        for (const r of rs || []) if (r.selectorText && /\.fx-spd\b/.test(r.selectorText)) n++;
      } return n; })()
  }));
  ok(G.spend === 'undefined' && G.from === 'undefined',
     '[C1] ★ 전역 `fxSpend`·`fxSpendFrom` 이 **없다**', G.spend + ' / ' + G.from);
  ok(G.up === 'function' && G.fly === 'function',
     '[C2] 대신 서 있는 것(`upFx`)과 획득 비행(`fxFly`)은 살아 있다', G.up + ' / ' + G.fly);
  ok(G.spdRule === 0, '[C3] ★ CSSOM 에도 `.fx-spd` 규칙이 **0개**다(문자열 grep 과 다른 자)', G.spdRule + '개');

  /* 세 자리 강화가 여전히 연출을 낸다 — «걷었더니 조용해졌다» 가 아니다 */
  const SITES = [
    { k: 'train',  n: '23 훈련 카드', sub: 'train',  sel: '#trCards [data-tr="atk"]' },
    { k: 'rune',   n: '룬 [강화]',    sub: 'rune',   sel: '#trRunes .tr-rn .rbt.b1' },
    { k: 'temper', n: '단련 [투자]',  sub: 'temper', sel: '#trTemper .tr-tp .tb' }
  ];
  await p.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; openTrain(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    window.__G678 = { add: [] };
    const L = document.getElementById('fxl');
    new MutationObserver(rs => { for (const r of rs) for (const n of r.addedNodes)
      if (n.nodeType === 1) window.__G678.add.push({ cls: (n.className || '') + '',
        cur: (n.querySelector && n.querySelector('img.cic')) ? n.querySelector('img.cic').dataset.curIc : null });
    }).observe(L, { childList: true, subtree: true });
  });
  for (const s of SITES) {
    await p.evaluate(k => { setTrSub(k); renderTrain(); }, s.sub);
    await p.waitForTimeout(320);
    await p.evaluate(() => { window.__G678.add.length = 0; });
    const el = await p.$(s.sel);
    const bb = el && await el.boundingBox();
    if (bb) {
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
      await p.waitForTimeout(300);
    }
    const A = await p.evaluate(() => window.__G678.add.slice());
    const spd = A.filter(a => /\bfx-spd\b/.test(a.cls)).length;
    const any = A.length;
    ok(spd === 0 && any > 0,
       '[C4-' + s.k + '] ★ ' + s.n + ' — 걷힌 «비행»(`fx-spd`) 0장이면서 연출 자체는 **난다**',
       '비행 ' + spd + '장 · 전체 ' + any + '장');
  }
  ok(errs.length === 0, '[C9] 콘솔 에러 0', errs.slice(0, 2).join(' | ') || '0건');
  await b.close();

  console.log('\n[R] 되돌림 — 선언·CSS 를 **사본에** 되붙이면 [A] 가 빨개진다');
  /* ⚠ 제품 파일은 안 건드린다. 되붙이는 것은 «지운 것과 같은 모양» 이면 충분하다 —
     이 절이 묻는 것은 «[A] 의 0건이 자가 못 보는 0 인가» 하나다(315·333·368 «전제» 항). */
  const REVERT = code
    + '\nconst FX_SPEND_GAP = 260; const fxSpendT = new WeakMap();'
    + '\nfunction fxSpendFrom(cur, host, toC){ return null; }'
    + "\nfunction fxSpend(cur, host){ const el = document.createElement('b'); el.className = 'fx-fly fx-spd'; return true; }"
    + '\n.fx-fly.fx-spd{transition:transform var(--spd-t,.42s)}';
  const caught = DEAD.filter(d => d.re.test(REVERT)).length;
  ok(caught >= 6,
     '[R1] ★ 되붙인 사본에서 [A] 항목 대부분이 **빨개진다** — 위 0건은 «자가 못 보는 0» 이 아니다',
     DEAD.length + '항 중 ' + caught + '항이 잡힌다');
  ok(KEEP.every(k => k.re.test(REVERT) || k.re.test(src)),
     '[R2] 되붙여도 [B] 는 초록 그대로다 — 두 절이 서로 다른 것을 본다');

  console.log('\nVERIFY678 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
