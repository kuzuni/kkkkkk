/* 작업 892 재현 자 — 89 유물 소환 「유물 소환」 라벨(.rw-basin>b) 잉크 폭.
 *
 * ── 왜 또 자인가 ────────────────────────────────────────────────────────────
 * 같은 잉크 하나를 두고 저장소 안의 두 자가 **다른 답**을 낸다:
 *   · 측정표 89 §「유물 소환」  ref 잉크 **65×15 ref px = 144×33**  ⇒ 우리 141 은 **−2.1%**
 *   · 859·813 9회차 채점 2인    ref 잉크 **67×16 ref px = 148.9×35.6** ⇒ 우리 141 은 **−5.3%**
 * 892 등재문은 뒤엣것을 썼고 860 은 앞엣것으로 «남는 −2.1% 는 서체 몫» 이라 닫았다.
 * 두 값의 차이는 **ref 쪽에서 각 축 1 ref px** 이고, 1 ref px = 2.222 프레임 px 다.
 *
 * ⚑ 이 자가 하는 일은 «누가 옳은가» 가 아니라 **«두 그림에 같은 자를 댔는가»** 다(887 규약).
 *   레퍼런스는 **486 폭으로 축소된** 그림이고 우리 캡처는 **1080 네이티브**다.
 *   문턱 하나를 두 해상도에 그대로 대면 같은 것을 재지 못한다 — 축소가 흰 잉크를
 *   이웃 화소로 번지게 해서(낮은 문턱) bbox 를 부풀리고, 높은 문턱에서는 가는 획을
 *   잃어 bbox 를 줄인다. 그래서 이 자는 **우리 캡처를 ref 와 같은 486 폭으로 내려서**
 *   같은 문턱 사다리를 두 그림에 나란히 댄다.
 *
 * 하는 일: 상태 주입 → #relw 열기 → 프레임 전체와 라벨 띠를 1080 네이티브로 캡처해
 *          docs/shots/ 에 떨군다(캡처는 커밋하지 않는다 — .gitignore). 화소 판정은
 *          `tools/scan892.py` 가 한다(자를 둘로 나눈 이유: 파이썬 쪽이 ref 를 읽는다).
 *          DOM 상자·서체 선언(font-size/letter-spacing/실제 렌더 서체)도 같이 찍는다 —
 *          «자간·서체 폭·글리프 advance 중 어디가 −5.3% 인가» 를 가르는 재료다(등재문).
 *
 * 쓰는 법:  node tools/probe892.js            # 2280 프레임
 *           P892_H=1920 node tools/probe892.js
 * [3]-(가) 자로 재는 수치 — 비평가 없음. 338 규칙(처방 전 재현).
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const H = Number(process.env.P892_H || 2280);
const OUT = path.join(ROOT, 'docs', 'shots');

(async () => {
  const browser = await launch(chromium);
  try {
    fs.mkdirSync(OUT, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(700);

    const geom = await page.evaluate(async () => {
      RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      openRelw();
      void document.body.offsetHeight;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const sig = () => [...document.querySelectorAll('#relw .rw-c')]
        .map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(1)},${q.top.toFixed(1)}`; }).join('|');
      let prev = '', same = 0, w = 0;
      while (w < 4000) { await wait(60); w += 60; const s = sig(); same = (s === prev && s) ? same + 1 : 0; prev = s; if (same >= 3) break; }

      const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
      const b = document.querySelector('#relw .rw-basin>b');
      const q = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      // 글리프 advance — 상자가 아니라 «글자가 실제로 차지하는 폭» (Range 로 잰다)
      const rng = document.createRange(); rng.selectNodeContents(b);
      const rr = rng.getBoundingClientRect();
      // 실제로 쓰인 서체(폴백 사슬 중 어느 것이 그렸는가)
      let used = '';
      try {
        const fs2 = document.fonts ? [...document.fonts].map(f => f.family).join(',') : '';
        used = fs2;
      } catch (e) { used = '(n/a)'; }
      return {
        sc, appLeft: ar.left, appTop: ar.top,
        box: { l: (q.left - ar.left) / sc, t: (q.top - ar.top) / sc, w: q.width / sc, h: q.height / sc },
        adv: { l: (rr.left - ar.left) / sc, t: (rr.top - ar.top) / sc, w: rr.width / sc, h: rr.height / sc },
        css: {
          fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing, wordSpacing: cs.wordSpacing, transform: cs.transform,
          stroke: cs.webkitTextStrokeWidth, text: b.textContent
        },
        fontsLoaded: used
      };
    });

    // 프레임 전체 (ref 와 같은 축소를 먹이려면 «프레임 전체» 를 같은 배율로 내려야 한다)
    const framePath = path.join(OUT, `892-frame-${H}.png`);
    await page.screenshot({ path: framePath, clip: { x: 0, y: 0, width: 1080, height: H } });

    // 라벨 띠 (네이티브 자용)
    const bx = geom.box;
    const clip = {
      x: Math.max(0, Math.round(bx.l) - 20), y: Math.max(0, Math.round(bx.t) - 12),
      width: Math.min(1080, Math.round(bx.w) + 40), height: Math.round(bx.h) + 24
    };
    const bandPath = path.join(OUT, `892-label-${H}.png`);
    await page.screenshot({ path: bandPath, clip });

    console.log('=== 작업 892 재현 (frameH ' + H + ') ===');
    console.log('페이지 오류:', errs.length, errs.slice(0, 3));
    console.log('\n[DOM] .rw-basin>b');
    console.log('  상자(border-box) l=' + bx.l.toFixed(1) + ' t=' + bx.t.toFixed(1) +
                ' w=' + bx.w.toFixed(1) + ' h=' + bx.h.toFixed(1));
    console.log('  글리프 advance   l=' + geom.adv.l.toFixed(1) + ' t=' + geom.adv.t.toFixed(1) +
                ' w=' + geom.adv.w.toFixed(2) + ' h=' + geom.adv.h.toFixed(2));
    console.log('\n[CSS] ' + JSON.stringify(geom.css, null, 2).replace(/\n/g, '\n      '));
    console.log('\n[캡처] ' + path.relative(ROOT, framePath) + '  ·  ' + path.relative(ROOT, bandPath));
    console.log('  라벨 띠 clip: x=' + clip.x + ' y=' + clip.y + ' w=' + clip.width + ' h=' + clip.height);
    console.log('\n⇒ 화소 판정은 `python3 tools/scan892.py` 가 한다(ref 를 같이 읽는다).');

    // scan892 가 읽을 좌표를 같이 떨군다
    fs.writeFileSync(path.join(OUT, `892-geom-${H}.json`),
      JSON.stringify({ H, box: bx, adv: geom.adv, clip, css: geom.css }, null, 2));
  } finally { await browser.close(); }
})();
