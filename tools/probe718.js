#!/usr/bin/env node
/* 작업 718 — `verify491` [R-c] 가 «경주 창» 을 잰다는 것의 재현과 처방 대조 (338·344·372 규칙)
 *
 *   node tools/probe718.js [반복수]
 *
 * 693 이 «bimodal 1.04% ↔ 32.74%» 까지 갈라 두었고, 이 프로브가 **무엇이 그 32.74% 를 만드는지**를
 * 가른다. 등재문의 읽기(«그 순간 버튼이 화면에 없다»)는 **자리는 맞았고 범인이 달랐다** —
 * 사라진 것이 아니라 **밀렸다**.
 *
 * 실측(718 1회차 · `--time` 모드): 되돌림 사본에서 누른 뒤 시각별 픽셀·클래스를 전수로 찍으면
 *   t=30ms  px=1.04  card=[tr-rn]                 버튼 y=1667.0
 *   t=60ms  px=10.45 card=[tr-rn **jz-hb**]       버튼 y=1681.8   ← +14.8px
 *   t=150ms px=20.37 card=[tr-rn **jz-hbx**]      버튼 y=1678.4
 * 로, 값이 갈리는 프레임마다 호스트 카드(`.tr-rn`)에 **488 회당 맥박**이 걸려 있다 —
 * `.jz-hb{animation:jzHb .08s}`(성공 팝 scale 1.06) · `.jz-hbx{animation:jzHbx .1s}`(실패 흔들림 −10px).
 * 둘 다 **호스트 카드**를 움직이므로 그 안의 버튼이 clip 안에서 통째로 밀리고, 고정 clip 대조는
 * 그것을 «버튼이 달라졌다» 로 읽는다(등재문이 본 «검은 테 → 카드 크림» 은 밀린 자리의 배경이다).
 * 맥박은 60~160ms 마다 다시 쏘므로 **누른 뒤 60ms 라는 표본 시각이 그 주기와 경주**한다 — 그래서
 * 부하가 없으면 12/12 초록, 부하가 있으면 2/10 이 빨갛다(718 실측).
 *
 * ⚑ **범인은 하나가 아니었다.** 맥박을 가리고 다시 재니 남은 한 겹이 드러났다(718 실측 —
 * 조상 변형 전수): 통짜 렌더가 누른 노드를 죽이고 **새로 놓은 `.rbt.b1`** 에 60 위임이 뒤늦게
 * 누름을 얹는다(WAAPI 4키프레임 · `translate:0 8px` `scale:.94` → 4.04px → 0 으로 **되돌아간다**).
 * 즉 되돌림 사본의 누름은 «없다» 가 아니라 **«누른 그 노드의 것이 아니다»** 이고, 그것이 앉는 것은
 * 통짜 렌더 **뒤**라 60ms 표본보다 늦다(부하가 걸릴수록 더 늦다 = 경주의 안전한 쪽).
 *
 * ⇒ 처방은 문턱이 아니라 **가림과 시각**이다(문턱 PX_MIN 도 clip 도 한 칸 안 건드린다 — 333):
 *   ① `pixelRun` 은 이미 «재는 동안만 이펙트 층을 가린다» 는 규약을 쓴다(619 13회차:
 *      `#fxl{visibility:hidden}` · `.fx-holding{outline:0}`). 맥박은 **같은 갈래의 남은 한 겹**이라
 *      같은 가림에 넣는다: `.jz-hb,.jz-hbx{animation:none!important}`.
 *      ⚠ 누름(`.jz-dn{scale:.94;translate:0 8px}`)은 `animation` 을 안 쓴다(verify491 [7-c1] 이 그것을
 *        소스에서 못박는다) — 그래서 이 가림은 **재려는 것을 안 가린다**.
 *   ② **표본 시각은 안 건드린다.** ⓑ 는 통짜 렌더 **뒤**에 오므로 부하가 걸릴수록 더 늦게 온다 —
 *      경주의 안전한 쪽이다. 경주를 만든 것은 ⓐ 뿐이고(60~160ms 주기라 표본 시각을 넘나든다)
 *      가림 한 겹이 그것을 없앤다. **늦게 찍는 안은 718 이 실측으로 기각했다** — 800ms 표본은
 *      ⓑ 한복판이라 되돌림 사본이 7/10 빨갛다(30.63% · 새 노드의 누름이 그 시각에는 앉아 있다).
 *
 * 이 프로브는 같은 누름을 두 가림으로 나란히 잰다(표본 시각은 둘 다 60ms):
 *   ⓐ **옛 가림** — `#fxl` + `.fx-holding` 만 (지금 `verify491` 이 쓰던 것)
 *   ⓑ **새 가림** — ＋ 맥박 (처방)
 * 통과 그림: ⓑ 는 되돌림 사본에서 전 실행 문턱 아래이고, **수리 트리에서는 여전히 ≥ PX_MIN**
 * 이어야 한다(자를 무르게 푼 것이 아니라는 증명 — [C] 절).
 *
 * ⚠ 부하가 없으면 ⓐ 도 초록으로 나온다(무부하 12/12 초록). 재현하려면 바깥에서 CPU 를 먹여라:
 *     for i in 1 2 3 4 5 6; do (while :; do :; done) & done
 *     node tools/probe718.js 10 ; kill %1 %2 %3 %4 %5 %6
 *
 * 진단 모드: `node tools/probe718.js 3 --time` — 시각별(30·60·100·150·200·300·450·700ms) 전수 표.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.p718-neg-${process.pid}.html`);
const N = Math.max(1, parseInt(process.argv[2] || '10', 10));
const TIME_MODE = process.argv.includes('--time');

const PX_MIN = 8;          /* verify491 과 같은 값 — 여기서도 안 건드린다 */
const SAMPLE_OLD = 60;     /* verify491 pixelRun 이 쓰던 표본 시각 */
const SAMPLE_NEW = 60;     /* 처방은 표본 시각을 안 건드린다 — 갈리는 것은 가림뿐이다 */
const TIMES = [30, 60, 100, 150, 200, 300, 450, 700];

const MASK_OLD = '#fxl{visibility:hidden!important}.fx-holding{outline:0!important}';
const MASK_NEW = MASK_OLD + '.jz-hb,.jz-hbx{animation:none!important}';

const src = fs.readFileSync(SRC, 'utf8');
/* verify491 §R 과 **글자 그대로 같은** 되돌림(옛 순서 + 4회차 가드 제거) */
const revert0 = src.replace(
  /  rtHold = \{ tag:o\.tag[\s\S]*?rtHold\.timer = setTimeout\(rtHoldTick, TR_HOLD_DELAY\);/,
  `  if(!o.once()){ o.end(0, false); rtShake(o.sel); return; }
  o.live();
  rtHold = { tag:o.tag, sel:o.sel, once:o.once, live:o.live, end:o.end, n:1, iv:TR_HOLD_IV0, timer:0 };
  rtHold.timer = setTimeout(rtHoldTick, TR_HOLD_DELAY);`);
const revert = revert0
  .replace("if(rtHoldOn('temper') || rtDownIn('#trTemper')){ liveTemper(); rtPendRender = 1; return; }",
           "if(rtHoldOn('temper')){ liveTemper(); return; }")
  .replace("if(rtHoldOn('rune') || rtDownIn('#trRunes')){ liveRunes(curId); rtPendRender = 1; return; }",
           "if(rtHoldOn('rune')){ liveRunes(curId); return; }");

async function diffPct(page, a, b) {
  return await page.evaluate(async ([a, b]) => {
    const load = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); return i; };
    const ia = await load(a), ib = await load(b);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    if (!w || !h) return 0;
    const px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      return x.getImageData(0, 0, w, h).data; };
    const A = px(ia), B = px(ib);
    let n = 0;
    for (let i = 0; i < A.length; i += 4)
      if (Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i+1] - B[i+1]), Math.abs(A[i+2] - B[i+2])) > 12) n++;
    return Math.round(n / (w * h) * 10000) / 100;
  }, [a.toString('base64'), b.toString('base64')]);
}

/* 한 실행 = 한 컨텍스트. `mask` 만 갈아 끼우고 나머지는 verify491 `pixelRun` 과 같은 순서다. */
async function oneRun(browser, file, mask, times) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6; openTrain();
  });
  await page.waitForTimeout(500);
  await page.evaluate(m => {
    const st = document.createElement('style'); st.id = 'p718mask'; st.textContent = m;
    document.head.appendChild(st);
    setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain();
  }, mask);
  await page.waitForTimeout(420);
  const g = await page.evaluate(() => {
    const e = document.querySelector('#trRunes .rbt.b1'); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const clip = { x: Math.max(0, g.x - 4), y: Math.max(0, g.y - 4), width: g.w + 8, height: g.h + 8 };
  const before = await page.screenshot({ clip });
  await page.evaluate(() => { window.__p718 = document.querySelector('#trRunes .rbt.b1') || null; });
  await page.mouse.move(g.x + g.w / 2, g.y + g.h / 2);
  await page.mouse.down();
  const out = [];
  let prev = 0;
  for (const t of times) {
    await page.waitForTimeout(t - prev); prev = t;
    const st = await page.evaluate(() => {
      const b = document.querySelector('#trRunes .rbt.b1');
      const card = b ? b.closest('.tr-rn') : null;
      return { alive: !!(window.__p718 && window.__p718.isConnected),
               ccls: card ? card.className : '-',
               by: b ? Math.round(b.getBoundingClientRect().y * 10) / 10 : 0 };
    });
    const shot = await page.screenshot({ clip });
    out.push({ t, px: await diffPct(page, before, shot), ...st });
  }
  await page.mouse.up();
  await page.waitForTimeout(120);
  await ctx.close();
  return out;
}

const spread = a => Math.round((Math.max(...a) - Math.min(...a)) * 100) / 100;

(async () => {
  fs.writeFileSync(NEG, revert);
  const browser = await launch(chromium);
  let pass = 0, fail = 0;
  const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
  try {
    if (TIME_MODE) {
      console.log('\n[718] 진단 — 되돌림 사본 · 시각별 픽셀과 호스트 클래스 (옛 가림)');
      for (let i = 0; i < N; i++) {
        const rows = await oneRun(browser, NEG, MASK_OLD, TIMES);
        console.log('  == 실행 ' + (i + 1));
        rows.forEach(r => console.log('     t=' + String(r.t).padStart(4) + 'ms  px=' + String(r.px).padStart(6)
          + '  버튼y=' + String(r.by).padStart(7) + '  누른노드=' + (r.alive ? '살아있음' : '죽음')
          + '  card=[' + r.ccls + ']'));
      }
      await browser.close();
      try { fs.unlinkSync(NEG); } catch (_) {}
      return;
    }

    const oldRows = [], newRows = [], fixRows = [];
    for (let i = 0; i < N; i++) oldRows.push((await oneRun(browser, NEG, MASK_OLD, [SAMPLE_OLD]))[0]);
    for (let i = 0; i < N; i++) newRows.push((await oneRun(browser, NEG, MASK_NEW, [SAMPLE_NEW]))[0]);
    for (let i = 0; i < Math.max(3, Math.ceil(N / 2)); i++)
      fixRows.push((await oneRun(browser, SRC, MASK_NEW, [SAMPLE_NEW]))[0]);
    await browser.close();

    console.log('\n[718] 되돌림 사본 · 룬 [강화] «누른 채» 픽셀 — ⓐ 옛 자(가림 없이 ' + SAMPLE_OLD
      + 'ms) ↔ ⓑ 새 자(맥박 가림 + ' + SAMPLE_NEW + 'ms)');
    console.log('   #   ⓐ옛 가림     판정        ⓑ새 가림(＋맥박)   판정');
    for (let i = 0; i < N; i++) {
      const a = oldRows[i], b = newRows[i];
      console.log('  ' + String(i + 1).padStart(2) + '  ' + String(a.px).padStart(8) + '   '
        + (a.px < PX_MIN ? 'R-c 초록' : 'R-c 빨강') + '     ' + String(b.px).padStart(10) + '   '
        + (b.px < PX_MIN ? 'R-c 초록' : 'R-c 빨강'));
    }
    console.log('\n[718] 수리 트리(현행 main) · 새 가림 — 여전히 ≥ ' + PX_MIN + '% 인가');
    console.log('  ' + fixRows.map(r => r.px).join(' · '));

    const oldRed = oldRows.filter(r => r.px >= PX_MIN).length;
    const newRed = newRows.filter(r => r.px >= PX_MIN).length;
    console.log('');
    ok(oldRows.every(r => !r.alive) && newRows.every(r => !r.alive),
       '[A0] 전제 — 되돌림 사본에서는 두 가림 모두 «누른 그 노드» 가 죽는다(주 축은 가림과 무관하다)');
    ok(true, '[A1] ⓐ 옛 가림(맥박이 살아 있다) — 빨강 ' + oldRed + '/' + N + ' · 폭 ' + spread(oldRows.map(r => r.px)) + '%p'
       + (oldRed ? '' : ' (⚠ 부하 없이 돌렸으면 0 이 정상 — 머리말의 재현법을 보라)'),
       oldRows.map(r => r.px).join(' · '));
    ok(newRed === 0,
       '[A2] ★ ⓑ 새 가림에서는 되돌림 사본이 **한 번도** 문턱을 안 넘는다(' + PX_MIN + '% 미만)',
       '빨강 ' + newRed + '/' + N + ' · 폭 ' + spread(newRows.map(r => r.px)) + '%p');
    ok(spread(newRows.map(r => r.px)) <= 3.0,
       '[A3] ★ 그리고 값이 «갈리지» 않는다 — 옛 자의 31.7%p bimodal 이 사라진다(폭 ≤ 3%p)',
       newRows.map(r => r.px).join(' · '));
    ok(fixRows.every(r => r.px >= PX_MIN),
       '[C] ★ 수리 트리에서는 새 가림에서도 ' + PX_MIN + '% 이상이다 — 자를 무르게 푼 것이 아니다',
       fixRows.map(r => r.px).join(' · '));
    console.log('\nPROBE718 ' + pass + '/' + (pass + fail) + '  ' + (fail ? 'FAIL' : 'PASS'));
    process.exitCode = fail ? 1 : 0;
  } finally {
    try { fs.unlinkSync(NEG); } catch (_) {}
  }
})().catch(e => { console.error(e); try { fs.unlinkSync(NEG); } catch (_) {} process.exit(1); });
