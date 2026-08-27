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
const SLOW = 4200;   /* knight 를 뺀 아틀라스의 **최대** 지연(ms) — 첫 접속의 «나머지가 아직 오는 중» 구간.
                        넉넉히 잡는 이유: 로드마다 브라우저가 100~1500ms 씩 흔들려서, 로딩 화면이
                        짧게 살면 표본 한두 장이 «이미 끝난 뒤» 에 찍힌다(빈 무대로 나온다). */
/* ★ 지연을 파일마다 **어긋나게** 준다. 3회차까지는 knight 를 뺀 전부를 같은 값으로 늦춰서
   진행바가 표본 7장 내내 «1/8» 로 얼어 있었고, 비평가 두 명이 그걸 «진행 상태가 안 읽힌다» 로
   감점했다 — 실제 네트워크에서는 파일이 하나씩 도착한다. 하네스가 그 사실을 못 흉내 낸 것이다.
   실제 크기 비율에 맞춰(zombie·elves 가 크고 bird·dragon 이 작다) 도착 순서를 벌린다. */
const STAGGER = { 'bird.png': .10, 'stormlord-dragon96x64.png': .18, 'buch-dungeon-tileset.png': .28,
                  'explosion.png': .42, 'robo.png': .62, 'elves-craft-pixel.png': .82, 'zombie.png': 1 };
const FAST = 140;    /* knight 지연 — 캐릭터가 등장할 수 있게 되는 시점 */
const OFF = [30, 150, 280, 410, 540, 660, 1050, null];   /* 1~6 = 등장 640ms · 7 = 선 뒤 대기 · null = 전환 */   /* 1~6 = 등장 640ms · 7 = 선 뒤 대기 · null = 전환 */   /* 1~6 = 등장 420ms · 7 = 선 뒤 대기 · null = 전환 */
const N = OFF.length;

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const shots = [];

  /* 배경 플레이트 — knight 를 아주 늦춰 «캐릭터 없는 같은 화면» 을 한 장 남긴다.
     scan163.py 가 이것과 차분해서 캐릭터 잉크만 뽑는다. 배경이 radial-gradient 라
     «단색 배경과 다른 픽셀» 로는 못 가른다(2회차에 실제로 bbox 가 배경까지 삼켰다).
     ★ **표본보다 먼저, 그리고 자기 컨텍스트에서** 찍는다 — 표본을 8장 찍은 뒤에 같은 컨텍스트로
     열면 png 가 브라우저 캐시에서 나와 `page.route` 의 지연이 안 먹고, 플레이트가 «게임 화면» 으로
     찍힌다(4회차에 실제로 그렇게 나왔고 스캐너가 «화면 전체가 다르다» 로 잡아냈다). */
  {
    const pctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await pctx.newPage();
    await page.route('**/*.png', async (route) => {
      await new Promise(r => setTimeout(r, /knight\.png$/.test(route.request().url()) ? 9000 : SLOW));
      await route.continue();
    });
    page.goto(URL, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `163-${TAG}-bg.png`) });
    const ok = await page.evaluate(() => !document.getElementById('loading').classList.contains('off'))
      .catch(() => false);
    console.log('  bg 배경 플레이트 → docs/shots/163-' + TAG + '-bg.png' + (ok ? '' : '  ⚠ 로딩 화면이 아니다!'));
    await pctx.close();
  }


  for (let i = 0; i < N; i++) {
    /* ★ 표본 한 장마다 «찍은 뒤에» 상태를 다시 확인하고, 로딩 화면이 이미 지났으면 다시 찍는다.
       `page.screenshot()` 이 폰트·안정화를 기다리느라 혼잡할 때 수백 ms~3s 늦게 캡처되는 일이 있어
       2·3회차에 표본 한두 장이 **게임 화면**으로 찍혔다(스캐너가 «화면 전체가 다르다» 로 잡아냈다).
       DOM 을 캡처 «전» 에 읽으면 로딩 화면이라고 나오므로, 순서를 뒤집어야 잡힌다. */
    let st = null, tries = 0;
    while (tries++ < 3) {
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push(String(e)));
      await page.route('**/*.png', async (route) => {
        const n = route.request().url().split('/').pop();
        const d = /knight\.png$/.test(n) ? FAST / SLOW : (STAGGER[n] !== undefined ? STAGGER[n] : 1);
        await new Promise(r => setTimeout(r, Math.round(SLOW * d)));
        await route.continue();
      });
      page.goto(URL, { waitUntil: 'load' }).catch(() => {});
      await page.waitForFunction(() => {
        const cv = document.getElementById('ldHero');
        return !!(cv && cv.classList.contains('on'));
      }, null, { timeout: 20000 });
      if (OFF[i] === null) {
        await page.waitForFunction(() => document.getElementById('loading').classList.contains('out'),
          null, { polling: 'raf', timeout: 20000 });
      } else {
        await page.waitForFunction((off) => performance.now() - LD.runAt() >= off, OFF[i],
          { polling: 'raf', timeout: 20000 });
      }
      await page.screenshot({ path: path.join(OUT, `163-${TAG}-${i + 1}.png`) });
      st = await page.evaluate(() => {
        const el = document.getElementById('loading'), cv = document.getElementById('ldHero');
        return { cls: el.className, op: +getComputedStyle(el).opacity,
                 el: Math.round(performance.now() - LD.runAt()),
                 x: cv ? cv.style.transform : '', num: (document.getElementById('ldNum') || {}).textContent };
      }).catch(() => null);
      await page.close();
      /* 마지막 «전환» 표본만 .out 을 허용한다. 나머지는 로딩 화면이 온전히 떠 있어야 한다 */
      const okShot = st && !/\boff\b/.test(st.cls) && (OFF[i] === null || !/\bout\b/.test(st.cls));
      if (okShot) break;
      console.log(`  (${i + 1}번 재촬영 — 캡처가 늦어 «${st ? st.cls : '?'}» 상태였다)`);
    }
    shots.push({ i: i + 1, t: OFF[i] === null ? '전환' : OFF[i], real: st ? st.el : -1, ...(st || {}) });
  }

  shots.forEach(s => console.log(`  ${s.i}  등장+${String(s.t).padStart(4)}ms(실제 ${String(s.real).padStart(4)})  op=${(s.op || 0).toFixed(2)}  ${s.x || '(캐릭터 없음)'}  ${s.num || ''}  [${s.cls || ''}]`));
  console.log('  → docs/shots/163-' + TAG + '-1..' + N + '.png   콘솔 에러', errs.length);
  if (errs.length) console.log(errs.slice(0, 3));
  await browser.close();
})();
