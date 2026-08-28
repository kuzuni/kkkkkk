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
const HOLD_SLOW = 12000;  /* held 페이지(위상 표본) 전용 — 이 페이지는 끝까지 부팅하면 안 된다 */
const FAST = 140;    /* knight 지연 — 캐릭터가 등장할 수 있게 되는 시점 */
const OFF = [45, 65, 120, 265, 380, 466, 500, 620, null];   /* ★ 9회차 — 시작 위상이 f2 로 옮겨지고(이동 933px)
   등장이 560ms 가 되면서 위상을 다시 잡았다. 실제 칸 경계(제품 상수에서 역산):
     f2 0~39.6 · **f3 체공 39.6~89.7** · f4 89.7~154.5 · f5 154.5~198.8 · f6 198.8~239.8 ·
     **f7 체공 239.8~289.8** · f0 289.8~354.7 · f1 354.7~400.3 · f2 400.3~441.6 ·
     **f3 체공 441.6~491.7 = 마지막 도약** · 착지 491.7 · 정착 491.7~560(도착)
   표본: 45 진입 직후(빈 무대가 40ms 로 끝난다) · **65 첫 도약 정점** · 120 f4 접지 ·
   **265 둘째 도약 정점** · 380 f1 접지 · **466 마지막 도약 정점** · **500 착지 직후(스쿼시 최대)** · null 전환 합성.
   ★ 500 은 8회차 비평 N 이 «564.8~640ms 가 표본에 아예 없다 — 다음 회차엔 반드시 넣어라» 고 요구한 창이다
   (그 구간이 9회차에는 «착지 → 스쿼시 → 정착» 으로 바뀌었고, 9회차의 핵심 변경이 바로 거기다).
   ★ **11회차에 620(= 도착 뒤 60ms, 선 자세 idle)을 넣었다.** 10회차 비평 Q·R 이 **둘 다** 같은 것을 요구했다 —
   Q «표본 8장 중 t ≥ 560 인 것이 하나도 없다. **브리핑 표본 집합이 이 결함을 구조적으로 못 보게 되어 있다** —
   11회차 캡처에 t=600(정지) 한 장을 넣어야 한다», R «표본 8장은 t ≤ 500 만 담고 있어 보이지 않는다».
   그 «안 보이던 자리» 에 10회차의 최대 결함(그림자 +160px 항구 좌초)이 통째로 숨어 있었고,
   첫 접속에서는 아틀라스 8개 중 6개가 등장 종료 뒤에 도착하므로 **실제로 가장 오래 보이는 화면**이다. */
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


  /* ★ 6회차 — 표본을 **제품 시계에서 떼어** 찍는다.
     5회차까지는 「등장 +30ms 를 찍어라」 하고 그 시각에 `page.screenshot()` 을 걸었는데,
     이 러너에서 캡처 한 장이 300~400ms 를 먹어서 실제로는 **+437ms 짜리 그림**이 나왔다
     (6회차 첫 시도 로그: 요청 30·150·280·410·540·660 → 실제 437·452·564·899·1046·1010 —
     뒤 넉 장이 전부 «이미 서 있는» 같은 그림이었다). 그 8장으로 ① 타이밍을 채점하면
     비평가는 연출이 아니라 **러너 지연**을 채점하게 된다(3·4회차 «하네스가 두 사람을 나란히 틀리게 했다»).
     그래서 이제 `LD.hold()` 로 rAF 재예약을 끊고 `LD.paint(t)` 로 원하는 위상을 **제품 코드가** 그리게 한 뒤
     시간 압박 없이 찍는다. 하네스는 이징·프레임 선택을 **다시 구현하지 않는다** — 그 순간 브리핑이 거짓이 된다.
     한 페이지에서 연속으로 찍으므로 진행바는 그동안 실제로 도착한 아틀라스를 반영한다(멈춰 있지 않다). */
  {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    /* ★ 7회차 — 이 페이지는 **부팅하면 안 된다.** 아틀라스가 다 도착하면 오버레이가 꺼져서
       (7회차 첫 캡처에서 2~7번이 전부 `thru off` = 게임 화면으로 찍혔다) 표본이 통째로 헛것이 된다.
       그래서 held 페이지에서만 지연을 크게 잡되(HOLD_SLOW), 같은 STAGGER 비율을 써서
       **캡처가 도는 3초 동안 진행바는 계속 차오르게** 한다(1/8 → 3/8). 마지막 파일은 끝내 안 온다. */
    await page.route('**/*.png', async (route) => {
      const n = route.request().url().split('/').pop();
      const d = /knight\.png$/.test(n) ? FAST / HOLD_SLOW : (STAGGER[n] !== undefined ? STAGGER[n] : 1);
      await new Promise(r => setTimeout(r, Math.round(HOLD_SLOW * d)));
      await route.continue();
    });
    page.goto(URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForFunction(() => {
      const cv = document.getElementById('ldHero');
      return !!(cv && cv.classList.contains('on'));
    }, null, { timeout: 30000 });
    await page.evaluate(() => LD.hold());
    for (let i = 0; i < N; i++) {
      if (OFF[i] === null) continue;                    /* 전환 표본은 아래에서 실시간으로 */
      const st = await page.evaluate((off) => {
        LD.paint(off);                                  /* ★ 그리는 것은 제품 코드다 */
        const el = document.getElementById('loading'), cv = document.getElementById('ldHero');
        return { cls: el.className, op: +getComputedStyle(el).opacity, el: off,
                 x: cv ? cv.style.transform : '', num: (document.getElementById('ldNum') || {}).textContent };
      }, OFF[i]);
      await page.screenshot({ path: path.join(OUT, `163-${TAG}-${i + 1}.png`) });
      const after = await page.evaluate(() => document.getElementById('loading').className);
      if (/\boff\b/.test(st.cls) || /\boff\b/.test(after))
        console.log(`  ⚠ ${i + 1}번이 로딩 화면이 아니다(«${after}») — HOLD_SLOW 를 늘려라`);
      shots.push({ i: i + 1, t: OFF[i], real: OFF[i], ...st });
    }
    await page.close();
  }

  /* 전환(마지막) 표본만 실시간이다 — «게임으로 녹아드는» 순간은 멈춘 시계로는 못 만든다 */
  for (let i = 0; i < N; i++) {
    if (OFF[i] !== null) continue;
    /* ★ 6회차 — «전환» 한 장은 **합성**이다(브리핑에 그대로 적는다).
       제품 페이드는 130ms 인데 이 러너의 캡처 한 장이 300~400ms 라 실시간으로는 중간을 못 잡는다 —
       5·6회차 모두 세 번 재촬영하고도 전부 `off`(이미 게임 화면)였다. CSS 전이만 늘리는 것도 안 된다:
       `display:none` 을 붙이는 타이머는 **JS 의 LD_FADE** 를 쓰므로 전이가 끝나기 전에 화면이 꺼진다.
       그래서 «게임이 부팅된 뒤 오버레이를 불투명도 0.5 로 되살려» 그 합성을 만든다.
       이 표본이 답하는 것은 «녹는 속도» 가 아니라 5회차 인계 ③ — **로딩 캐릭터와 게임 캐릭터의
       크기·발 기준선·휘도 낙차**다. 그 셋은 정지 합성으로 정확히 보인다. */
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    page.goto(URL, { waitUntil: 'load' }).catch(() => {});          /* 지연 없음 = 게임까지 부팅 */
    await page.waitForFunction(() => document.getElementById('loading').classList.contains('off'),
      null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);                                  /* 게임 첫 프레임들이 그려질 시간 */
    const st = await page.evaluate(() => {
      const el = document.getElementById('loading'), cv = document.getElementById('ldHero');
      /* ★ 7회차 — 이 합성은 **핸드오프 트윈의 중간**이다. 부팅이 이미 트윈을 걸어 놨으므로
         전이를 끄고 `LD.hand(.5)` 로 **제품 코드에게** 절반 지점을 그리게 한다(하네스가 다시 구현하지 않는다). */
      /* ⚠ 순서가 중요하다 — 7회차에 이 두 줄이 뒤바뀌어 있어서 `display:none` 인 오버레이에서 `LD.hand(.5)`
         가 돌았고, offset 체인이 0 이라 **델타 자리에 절대좌표가 들어가** 발 기준선이 프레임 밖 (1147, 2485)
         으로 향하는 표본이 나왔다. 비평가 K·L 이 둘 다 그 한 장을 «무효» 로 판정했다.
         (제품 쪽에도 `if (!cv.offsetParent) return false` 가드를 넣었다 — 같은 오용을 두 번 하지 않도록.) */
      el.classList.remove('off', 'out');
      el.classList.add('thru');
      cv.style.transition = 'none';
      LD.hand(.5);
      el.style.transition = 'none'; el.style.opacity = '.5';
      return { cls: el.className, op: +getComputedStyle(el).opacity, el: Math.round(LD.RUN + 400),
               x: cv ? cv.style.transform : '', num: (document.getElementById('ldNum') || {}).textContent };
    });
    await page.screenshot({ path: path.join(OUT, `163-${TAG}-${i + 1}.png`) });
    await page.close();
    shots.push({ i: i + 1, t: '전환', real: st ? st.el : -1, ...(st || {}) });
  }
  shots.sort((a, b) => a.i - b.i);

  shots.forEach(s => console.log(`  ${s.i}  등장+${String(s.t).padStart(4)}ms(실제 ${String(s.real).padStart(4)})  op=${(s.op || 0).toFixed(2)}  ${s.x || '(캐릭터 없음)'}  ${s.num || ''}  [${s.cls || ''}]`));
  console.log('  → docs/shots/163-' + TAG + '-1..' + N + '.png   콘솔 에러', errs.length);
  if (errs.length) console.log(errs.slice(0, 3));
  await browser.close();
})();
