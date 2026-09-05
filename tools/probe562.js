#!/usr/bin/env node
/* 562 재현 — «드래그했는데 click 이 발화한다»(verify95 [B]) 를 제품에게 직접 묻는다.
 *
 *   node tools/probe562.js
 *
 * 왜 이 자인가(338 규칙): 등재문은 «연속 4회 전부 빨강 = 굳은 실패» 라고 적었는데
 * 같은 트리에서 내가 돌리면 **연속 4회 전부 초록**이다. 둘 다 참일 수 있는 축이
 * 하나 있다 — **제스처가 얼마나 오래 걸렸는가**. 74 의 «네이티브 click 삼키기» 는
 *     if(tapRec && performance.now() - tapRec.t < 3000)      (index.html 37342)
 * 로 **pointerdown 으로부터 3초** 안에서만 삼킨다. verify95 의 드래그는 12스텝 ×
 * hold 12ms 라 «한가한 기계» 에서는 1.3초에 끝나지만, 기계가 밀리면 스텝마다의
 * CDP 왕복이 늘어 **3초를 넘긴다** — 넘긴 순간 네이티브 click 이 안 삼켜지고 빨개진다.
 * ⇒ [B] 의 빨강/초록은 **제품이 아니라 기계 속도**가 정한다. 그래서 이 자는
 *    «빨강인가» 가 아니라 **제스처 길이축**을 찍는다.
 *
 *   [A] 빠른 드래그 (verify95 [B] 와 같은 12스텝 × 12ms)        — click 0 이 정상
 *   [B] 느린 드래그 (down↔up 이 3초를 넘는다)                    — 여기서 새면 3초 문턱이 뿌리다
 *   [C] 문턱 좌우 — 같은 궤적·같은 거리, **머문 시간만** 2.4초 / 3.6초로 갈라 본다
 *       (스텝 수를 늘려 갈면 «거리·속도» 가 같이 변해 축이 둘이 된다 — 여기서는 대기만 늘린다)
 *   [D] 샌 click 이 **네이티브**인가 (합성기 것이면 뿌리가 dsDragged 쪽이다)
 *   [E] 실제 피해 — 40px 만 끌고 3초 넘게 머물다 떼면 **누르고 있던 버튼이 눌린다**
 *       (사람이 상점에서 흔히 하는 동작: 버튼을 누른 채 목록을 조금 밀며 망설이다 뗀다)
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const SRC = path.join(path.resolve(__dirname, '..'), 'index.html');
const URL = 'file://' + SRC;

let bad = 0, n = 0;
const ok = (m) => { n++; console.log('  ✓ ' + m); };
const no = (m) => { n++; bad++; console.log('  ✗ ' + m); };
const sec = (t) => console.log('\n' + t);

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */

  /* 한 페이지 = 한 제스처. 앞 제스처의 tapRec·dsDragged 가 안 섞이게 매번 새로 연다. */
  const fresh = async (url = URL) => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1, hasTouch: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      S.gold = 1e15; S.dia = 1e9; S.relic = 1e6;
      uiDirty = true; renderUI();
      /* 계측 — click 을 «누가 보냈는가»·«어디에 닿았는가» 까지 남긴다(합성기는 ev.__tap = 1 을 단다) */
      window.__log = [];
      document.addEventListener('click', (e) => {
        const t = e.target;
        window.__log.push({ tap: !!e.__tap, trusted: e.isTrusted,
                            tgt: (t.tagName + '.' + (t.className || '')).slice(0, 40),
                            onBtn: !!(t.closest && t.closest('.cbtn')) });
      }, true);
      window.__state = () => ({ dsDragged, recAge: tapRec ? Math.round(performance.now() - tapRec.t) : -1 });
    });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      openShopPage();
      uiDirty = true; try { renderUI(); } catch (_) {}
      const l = [...document.querySelectorAll('.shp-list')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 4 && q.height > 4; });
      const el = l.find((e) => e.scrollHeight - e.clientHeight > 1) || l[0];
      if (!el) return { err: '컨테이너 없음' };
      el.scrollTop = 0;
      const r = el.getBoundingClientRect();
      const b = document.querySelector('.shp-list .cbtn');
      const bq = b && b.getBoundingClientRect();
      return { max: el.scrollHeight - el.clientHeight,
               x: Math.round(r.x + r.width / 2), y: Math.round(r.y + Math.min(r.height * 0.65, r.height - 60)),
               bx: bq ? Math.round(bq.x + bq.width / 2) : 0, by: bq ? Math.round(bq.y + bq.height / 2) : 0,
               bw: bq ? Math.round(bq.width) : 0, bh: bq ? Math.round(bq.height) : 0 };
    });
    await page.waitForTimeout(350);
    return { ctx, page, info };
  };

  /* verify95 의 drag() 와 같은 모양 — 스텝을 다 밟은 뒤 **떼기 전에** pause ms 만큼 머문다.
     머무는 동안 포인터는 안 움직이므로 «거리·속도» 는 그대로고 **시간축만** 갈린다. */
  const drag = async (page, x, y, dy, steps, hold, pause = 0) => {
    const t0 = Date.now();
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + (dy * i) / steps); await page.waitForTimeout(hold); }
    if (pause) await page.waitForTimeout(pause);
    await page.mouse.up();
    return Date.now() - t0;
  };

  const run = async (label, dy, steps, hold, pause, atBtn, url = URL) => {
    const { ctx, page, info } = await fresh(url);
    if (info.err) { no(`${label}: ${info.err}`); await ctx.close(); return null; }
    await page.evaluate(() => { window.__log.length = 0; });
    const [x, y] = atBtn ? [info.bx, info.by] : [info.x, info.y];
    const ms = await drag(page, x, y, dy, steps, hold, pause);
    await page.waitForTimeout(400);
    const log = await page.evaluate(() => window.__log);
    const st = await page.evaluate(() => window.__state());
    const top = await page.evaluate(() => {
      const l = [...document.querySelectorAll('.shp-list')].filter((e) => e.getBoundingClientRect().width > 4);
      const el = l.find((e) => e.scrollHeight - e.clientHeight > 1) || l[0];
      return el ? Math.round(el.scrollTop) : -1;
    });
    await ctx.close();
    return { label, ms, log, st, top, info };
  };

  const show = (r) => `제스처 ${r.ms}ms · scrollTop ${r.top} · dsDragged ${r.st.dsDragged} · click ${r.log.length}건`
    + (r.log.length ? ' [' + r.log.map((c) => (c.tap ? '합성' : c.trusted ? '네이티브' : '?')).join(',') + ']' : '');

  sec('[A] 빠른 드래그 260px (12스텝 × 12ms — verify95 [B] 와 같은 값)');
  const a = await run('빠름', -260, 12, 12, 0, false);
  if (a) (a.log.length === 0 ? ok : no)(`${show(a)}  ← click 0 이 정상`);

  sec('[B] 느린 드래그 260px (같은 궤적 · 떼기 전 3.2초 머묾)');
  const b = await run('느림', -260, 12, 12, 3200, false);
  if (b) {
    console.log(`  · ${show(b)}`);
    if (b.log.length === 0) ok('느린 드래그도 click 0 — 3초 문턱 가설 기각');
    else no(`느린 드래그(${b.ms}ms)에서 click ${b.log.length}건 — 74 삼키기 창(3000ms) 밖이라 네이티브가 샜다`);
  }

  sec('[C] 문턱 좌우 — 같은 거리·같은 속도, 머문 시간만 갈라 본다');
  const c1 = await run('짧게 머묾', -260, 12, 12, 600, false);
  if (c1) console.log(`  · 짧은 쪽: ${show(c1)}`);
  const c2 = await run('길게 머묾', -260, 12, 12, 2600, false);
  if (c2) console.log(`  · 긴 쪽:   ${show(c2)}`);
  if (c1 && c2) {
    if (c1.log.length === 0 && c2.log.length > 0)
      ok(`시간축 하나로 갈린다 — ${c1.ms}ms 0건 / ${c2.ms}ms ${c2.log.length}건 (거리·속도 동일)`);
    else if (c1.log.length === 0 && c2.log.length === 0) ok(`양쪽 다 0건 (${c1.ms}ms / ${c2.ms}ms — 시간축이 더는 갈림을 만들지 않는다)`);
    else no(`갈림이 시간축으로 설명되지 않는다 — ${c1.ms}ms ${c1.log.length}건 / ${c2.ms}ms ${c2.log.length}건`);
  }

  sec('[D] 계측 — 샌 click 은 «네이티브» 여야 한다(합성기 것이면 뿌리가 dsDragged 쪽이다)');
  const leaked = [b, c2].filter((r) => r && r.log.length);
  if (!leaked.length) ok('샌 click 없음');
  else {
    const allNative = leaked.every((r) => r.log.every((c) => !c.tap && c.trusted));
    (allNative ? ok : no)(`샌 click ${leaked.reduce((s, r) => s + r.log.length, 0)}건 — `
      + (allNative ? '전부 네이티브(합성기는 dsDragged 로 이미 접었다)' : '합성기가 보낸 것이 섞였다'));
    for (const r of leaked) for (const c of r.log) console.log(`      · ${r.label}: tap=${c.tap} trusted=${c.trusted} target=${c.tgt} 버튼위=${c.onBtn}`);
  }

  sec('[E] 실제 피해 — 상점 [구매] 버튼 위에서 조금만 끌고 3초 넘게 머물다 뗀다');
  /* ⚠ 거리를 두 개로 나눠 본다. click 의 표적은 down·up 두 노드의 **공통 조상**이라,
     많이 밀면(40px) 버튼 안 자식이 갈려 조상이 카드 밖으로 올라가고, 조금만 밀면(12px)
     같은 자식 위에 남아 **버튼이 그대로 표적**이 된다 — 사람의 «망설이는 손» 은 후자다. */
  const es = [];
  for (const [lab, dy, steps] of [['버튼 위 40px', -40, 6], ['버튼 위 12px', -12, 3]]) {
    const r = await run(lab, dy, steps, 12, 3200, true);
    if (!r) continue;
    es.push(r);
    console.log(`  · ${lab}: 버튼 ${r.info.bw}×${r.info.bh} @(${r.info.bx},${r.info.by}) · ${show(r)}`
      + (r.log.length ? ` · 표적 ${r.log.map((c) => c.tgt + (c.onBtn ? '(버튼 안)' : '')).join(' · ')}` : ''));
  }
  const hit = es.flatMap((r) => r.log.filter((c) => c.onBtn));
  if (!hit.length) ok('버튼에 닿은 click 0건 — 새더라도 표적은 조상 노드였다');
  else no(`드래그였는데 **버튼이 눌렸다** — click ${hit.length}건이 .cbtn 안에 닿았다 (${hit.map((c) => c.tgt).join(' · ')})`);

  sec('[F] §R 되돌림 시험 — 수리(dsClkT 가드)를 뺀 사본에서는 같은 제스처가 빨개져야 한다');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    const GUARD = "if(performance.now() - dsClkT < DS_CLK_MS){ e.stopImmediatePropagation(); e.preventDefault(); return; }";
    if (!src.includes(GUARD)) no('index.html 에 562 가드가 없다 — 수리가 사라졌다(§R 을 잴 수 없다)');
    else {
      /* 상대 경로 자산 때문에 사본은 반드시 같은 폴더에 둔다(probe350·verify348 함정) */
      const revPath = path.join(path.dirname(SRC), `.probe562-rev-${process.pid}.html`);
      fs.writeFileSync(revPath, src.replace(GUARD, '/* §R: 562 가드 제거 */'));
      try {
        const r = await run('§R 사본', -260, 12, 12, 3200, false, 'file://' + revPath);
        if (r) {
          console.log(`  · ${show(r)}`);
          (r.log.length > 0 ? ok : no)(r.log.length > 0
            ? `가드를 빼면 같은 제스처(${r.ms}ms)가 click ${r.log.length}건 — 수리가 실제로 그것을 막고 있다`
            : `가드를 빼도 click 0건 — 수리가 «무르다»(다른 것이 막고 있거나 이 제스처가 3초 안이다, ${r.ms}ms)`);
        }
      } finally { try { fs.unlinkSync(revPath); } catch (_) {} }
    }
  }

  await browser.close();
  console.log(`\nPROBE562 ${bad ? 'FAIL' : 'PASS'} — ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
