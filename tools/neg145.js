#!/usr/bin/env node
/* 145 음성 게이트 — «게이트를 느슨하게 고쳤더니 이제 아무것도 못 잡는다» 를 막는다
 *
 *   node tools/neg145.js
 *
 * 145 는 게이트 두 개의 «거짓 빨강» 을 고쳤다. 두 수정 다 판정을 **느슨한 쪽**으로 옮긴 것이라
 * (주석 제외 · 한 시점 → 구간 폴링) 자칫하면 «무조건 통과» 가 된다. 그래서 고친 자리마다
 * **일부러 위반을 심어 넣고 여전히 빨개지는지** 확인한다. 회귀 확인은 이 파일로 한다.
 *
 *   [A] verify125 B1 — 주석 속 경로는 통과, «실행되는 코드» 의 경로 복제는 여전히 FAIL.
 *   [B] fnchk125 «부족 알약 플래시» — 연출이 살아 있으면 true, jzBadPill 을 무력화하면 false.
 *
 * [B] 는 브라우저가 필요하다. 없으면 [A] 만 돌고 그렇게 보고한다.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* verify125 와 «같은» 전처리 — 주석을 같은 길이의 공백으로 지운다(오프셋 1:1) */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
                    .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));

/* verify125 B1 의 판정 본체를 그대로 옮겨 온 것 — 임의의 소스에 대해 «블록 밖 건수» 를 센다 */
function outsideCount(src) {
  const T = strip(src);
  const decl = T.indexOf('const CUR_ICON = {'), declEnd = T.indexOf('};', decl);
  const paths = [];
  let i = -1;
  while ((i = T.indexOf('assets/ui/cur-', i + 1)) >= 0) paths.push(i);
  return paths.filter(p => !(p > decl && p < declEnd)).length;
}

(async () => {
  /* ---- [A] B1 이 주석은 봐주되 진짜 복제는 잡는가 ---- */
  const CODE_DUP = SRC.replace('<body', "<script>var __dup145='assets/ui/cur-gold.svg';</script>\n<body");
  const HTML_CMT = SRC.replace('<body', "<!-- 설명용: assets/ui/cur-gold.svg -->\n<body");
  ok(outsideCount(SRC) === 0, 'A1 현재 index.html 은 블록 밖 0건(주석 1건은 무죄)', outsideCount(SRC) + '건');
  ok(outsideCount(CODE_DUP) === 1, 'A2 «진짜 코드 경로 복제» 는 여전히 잡힌다', outsideCount(CODE_DUP) + '건');
  ok(outsideCount(HTML_CMT) === 0, 'A3 HTML 주석 속 경로는 안 잡힌다', outsideCount(HTML_CMT) + '건');

  /* ---- [B] 플래시 폴링이 «연출 없음» 도 통과시키지는 않는가 ---- */
  let pw, launch;
  try { ({ pw, launch } = require('./pwlaunch')); } catch (_) {}
  let chromium = null;
  try { chromium = pw ? pw().chromium : null; } catch (_) {}
  if (!chromium) {
    console.log('[i] playwright 없음 — [B] 는 건너뛴다');
  } else {
    const browser = await launch(chromium);
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    /* fnchk125 의 «부족 알약» 판정과 같은 절차 — kill=true 면 연출만 빼고 똑같이 돌린다 */
    const probe = async (kill) => {
      const page = await ctx.newPage();
      await page.goto(URL);
      await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
      await page.waitForTimeout(400);
      const r = await page.evaluate(async (kill) => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        if (kill) window.jzBadPill = function () {};
        closeModal(); closeShopPage();
        await sleep(350);
        S.dia = 0;
        openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
        const btn = document.querySelector('#shopList .bt.buy[data-ex]');
        btn && btn.click();
        await sleep(90);
        let bad = false;
        for (let i = 0; i < 30 && !bad; i++) {
          bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
          if (!bad) await sleep(20);
        }
        return bad;
      }, kill);
      await page.close();
      return r;
    };
    ok(await probe(false) === true,  'B1 연출이 살아 있으면 플래시를 잡는다', 'bad=true');
    ok(await probe(true) === false, 'B2 jzBadPill 을 무력화하면 여전히 빨개진다', 'bad=false');
    await browser.close();
  }

  console.log('\nNEG145 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
