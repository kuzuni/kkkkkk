/* 작업 163 캡처 하네스 — 로딩 화면 «플레이어 등장» 연출의 연속 프레임.
   실행: node tools/cap163.js [태그]      → docs/shots/163-<태그>-1..8.png (1080×2280)

   ★ 왜 «네트워크를 흉내» 내는가 — file:// 로 그냥 열면 아틀라스 1.8MB 가 ~450ms 에 다 와서
     로딩 화면이 600ms 대만 산다(`node tools/probe163.js`). 그건 «두 번째 접속» 의 모습이고,
     주인 지시(«첫 접속 로딩 화면»)가 가리키는 것은 **처음 받아 오는** 경우다.
     그래서 knight(캐릭터 아틀라스)만 빨리 주고 나머지 png 는 늦춰서, 실제 첫 접속에서
     사용자가 보는 «달려 들어와 → 서서 기다린다 → 게임으로 녹아든다» 전체를 표본에 담는다.
     연출 자체(LD_RUN·이징·프레임 간격)는 지연과 무관하게 index.html 의 상수 그대로 돈다.

   ★ 표본 시각은 «페이지 시작» 이 아니라 **캐릭터 등장 시작(#ldHero.on)** 기준이고,
     **한 장마다 페이지를 새로 연다.** 이유는 실측이다 — `page.screenshot()` 한 번이 ~130ms 를
     먹어서, 한 페이지에서 연속으로 찍으면 표본 간격의 하한이 130ms 다. 등장이 300ms 인데
     그러면 등장 구간에 1장밖에 안 걸린다(1차 시도에서 실제로 그랬다). 로드마다 한 장씩
     찍으면 원하는 오프셋을 정확히 밟는다 — 애니메이션 위상이 #ldHero.on 에 물려 있어
     로드가 달라도 같은 위상을 잰다(149 «애니메이션이 걸린 요소를 만들자마자 재면 다른 것을 잰다» 의 짝).

   비평가에게 줄 때 알려야 할 것:
     · 8장은 등속 간격이 아니다 — 아래 로그가 장별 실제 시각(등장 시작 기준 +ms)을 찍는다.
     · 캔버스 좌표계는 1080×2280 프레임 그대로(레퍼런스 이미지 없음 — 이 화면은 신설이다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const TAG = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SLOW = 2800;   /* knight 를 뺀 아틀라스 지연(ms) — 첫 접속의 «나머지가 아직 오는 중» 구간.
                        넉넉히 잡는 이유: 로드마다 브라우저가 100~1500ms 씩 흔들려서, 로딩 화면이
                        짧게 살면 표본 한두 장이 «이미 끝난 뒤» 에 찍힌다(빈 무대로 나온다). */
const FAST = 140;    /* knight 지연 — 캐릭터가 등장할 수 있게 되는 시점 */
/* 등장 시작(#ldHero.on) 기준 표본 시각(ms). 1~5 = 등장 300ms 구간 · 6~7 = 선 뒤 대기(idle) · 8 = 전환 */
const OFF = [20, 90, 160, 235, 320, 440, 900, null];   /* 1~6 = 등장 420ms · 7 = 선 뒤 대기 · null = 전환 */
const N = OFF.length;

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const shots = [];

  for (let i = 0; i < N; i++) {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.route('**/*.png', async (route) => {
      const slow = !/knight\.png$/.test(route.request().url());
      await new Promise(r => setTimeout(r, slow ? SLOW : FAST));
      await route.continue();
    });
    page.goto(URL, { waitUntil: 'load' }).catch(() => {});
    await page.waitForFunction(() => {
      const cv = document.getElementById('ldHero');
      return !!(cv && cv.classList.contains('on'));
    }, null, { timeout: 20000 });
    const t0 = Date.now();
    if (OFF[i] === null) {
      /* 마지막 한 장은 «게임으로 녹아드는» 순간이다 — 시각이 아니라 상태(.out)로 잡는다.
         부팅 시각은 아틀라스 지연에 딸려 흔들려서 오프셋으로는 못 밟는다. */
      /* 페이드는 120ms 뿐이라 «감지 → 대기 → 캡처» 로는 못 잡는다(1차 시도에서 .out 을 본 뒤
         55ms 를 더 기다렸더니 이미 display:none 이었다). 감지 즉시 찍는다. */
      await page.waitForFunction(() => document.getElementById('loading').classList.contains('out'),
        null, { polling: 'raf', timeout: 20000 });
    } else {
      const wait = OFF[i] - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
    }
    const shotP = page.screenshot({ path: path.join(OUT, `163-${TAG}-${i + 1}.png`) });
    const st = await page.evaluate(() => {
      const el = document.getElementById('loading'), cv = document.getElementById('ldHero');
      return { cls: el.className, op: +getComputedStyle(el).opacity,
               x: cv ? cv.style.transform : '', num: (document.getElementById('ldNum') || {}).textContent };
    }).catch(() => ({}));
    await shotP;
    shots.push({ i: i + 1, t: OFF[i] === null ? '전환' : OFF[i], real: Date.now() - t0, ...st });
    await page.close();
  }
  shots.forEach(s => console.log(`  ${s.i}  등장+${String(s.t).padStart(4)}ms(실제 ${String(s.real).padStart(4)})  op=${(s.op || 0).toFixed(2)}  ${s.x || '(캐릭터 없음)'}  ${s.num || ''}  [${s.cls || ''}]`));
  console.log('  → docs/shots/163-' + TAG + '-1..' + N + '.png   콘솔 에러', errs.length);
  if (errs.length) console.log(errs.slice(0, 3));
  await browser.close();
})();
