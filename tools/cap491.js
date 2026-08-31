#!/usr/bin/env node
/* 작업 491 — UI 쥬시니스 비평 루프 «누르는 순간» 캡처 하네스
 *
 *   node tools/cap491.js [회차]        기본 1
 *
 * 1회차 범위는 주인이 이름을 댄 두 곳이다 — 23 훈련 팝업의 «룬» · «단련» 탭.
 * 장면마다 세 장을 같은 clip 으로 찍는다(비평가가 겹쳐 보게):
 *   -idle : 손을 대기 «전»
 *   -down : 누른 채(pointerdown 후 ≥60ms · 손은 아직 안 뗐다)
 *   -hold : 누른 채 ≈800ms(4회차 신설 — 홀드 자멸(≈350ms) 을 넘긴 자리. 여기가 3회차 감점의 자리다)
 *   -up   : 뗀 뒤 140ms(결과가 화면에 남았는가)
 *
 * ⚠ «0/50/150ms 세 장» 이 아니라 «idle/down/up» 인 이유는 `probe491` 이 찍었다 —
 *   누름 상태는 `.jz-dn`(animation … both)이라 **누르고 있는 동안 값이 고정**이고
 *   16ms·50ms 표본이 같은 값이다(둘 다 scale .94). 셋을 다 찍어도 비평가에게는 같은 그림 세 장이라
 *   판단 근거가 늘지 않는다. 대신 «전 / 누른 채 / 뗀 뒤» 로 갈라야 ①즉시반응·②결과잔존이 갈린다.
 *
 * ⚠ 페이지가 둘이면 뒤로 밀린 쪽의 애니메이션이 재워져 시트 좌표가 통째로 어긋난다(probe491 주석) —
 *   여기서는 페이지를 하나만 쓴다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');

const SCENES = [
  { id: 'rune',    tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화] 버튼(홀드)' },
  { id: 'tempup',  tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [투자] 버튼(홀드)' },
  { id: 'tempchg', tab: 'temper', sel: '#trTemper .tp-hd .cg',    n: '단련 [충전] 버튼(홀드)' },
  { id: 'train',   tab: 'train',  sel: '#trCards [data-tr]',      n: '★대조 훈련 카드(64 홀드 — 주인 미지적)' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    /* 전투 캔버스는 매 프레임 달라 «달라진 픽셀» 을 오염시킨다 — 비평 대상이 아니라 가린다 */
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    if (S.temper) S.temper.pts = 500;
    openTrain();
  });
  await page.waitForTimeout(600);

  const made = [];
  for (const s of SCENES) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, s.tab);
    /* ⚠ 6회차 — **장면 사이에 `#fxl` 을 비운다.** 5회차에 «한 발» 수명을 1.3s 로 늘리자 앞 장면의
       플로터가 다음 장면의 `-idle`·`-down` 프레임까지 살아 넘어왔다 — CF 「tempchg `-up` 에
       «+1,000,000» 이 헤더와 **공격력 단련 행**에 하나씩 = +2,000,000 으로 오독된다」가 그것이고,
       그 행 좌표(y258-291)는 **앞 장면(tempup)의 사다리 자리**다. 제품이 아니라 캡처의 잔상이다. */
    await page.evaluate(() => { const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; });
    await page.waitForTimeout(450);
    const box = await page.evaluate(() => {
      const b = document.querySelector('#trw .tr-box').getBoundingClientRect();
      return { x: Math.round(b.x) - 6, y: Math.round(b.y) - 6, width: Math.round(b.width) + 12, height: Math.round(b.height) + 12 };
    });
    /* 8회차 — [충전] 2패스 되돌림에 쓸 «1패스 전» 잔액 */
    const pts0 = await page.evaluate(() => (S.temper && S.temper.pts) || 0);
    const r = await page.evaluate(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, s.sel);
    if (!r) { console.log('  [skip] ' + s.id + ' — 요소 없음 ' + s.sel); continue; }

    const shot = async tag => {
      const f = path.join(OUT, '491-r' + R + '-' + s.id + '-' + tag + '.png');
      await page.screenshot({ clip: box, path: f });
      made.push(path.relative(path.resolve(__dirname, '..'), f));
    };
    /* ⚠ 2회차 — **캡처 한 장이 누름을 늘린다.** `page.screenshot` 은 수백 ms 를 먹으므로 «-down 을 찍고
       손을 떼는» 옛 순서는 실제로 ≈360ms 를 누른 것이 되고, `-up` 프레임은 «누름 뒤 ≈500ms» 다.
       회당 플로터 수명이 .3s 라 그 프레임에는 이미 없다 — 1회차 비평가 둘이 «뗀 뒤 140ms 에 잉크 0» 으로
       읽은 것의 절반이 이 드리프트였다. ⇒ **누름을 두 번 나눠** 찍는다: 1패스는 idle·down, 2패스는
       «짧게 눌렀다 떼고 140ms» 만 재현해 up 을 찍는다. 두 패스의 상태 차이는 «시도 1회» 뿐이다. */
    /* ⚑ 4회차 — 장면이 하나 늘었다: **`-hold`(누른 채 800ms)**. 3회차 감점이 둘 다 «[충전]이 누른 손
       밑에서 꺼진다» 로 수렴했는데 그 일은 홀드가 자멸하는 ≈350ms **뒤**에 일어나므로, 60ms 짜리
       `-down` 한 장으로는 고쳤는지 안 고쳤는지가 그림에 안 나온다(캡처 드리프트로 우연히 보였을 뿐이다).
       ⇒ 자멸 시각을 넘긴 자리를 **약속된 시각**으로 한 장 더 찍는다. */
    /* ⚑ 8회차 — **`-idle` 바로 앞에서 한 번 더 비운다.** 장면 전환 직후에만 비우면 그 뒤 450ms 안에
       앞 장면의 토스트(`fx-toast`)가 새로 앉아 «손대기 전» 프레임에 결과물이 남는다 —
       CH 실측 「흰 «1,000,000» 이 tempup-idle·hold·up · tempchg-idle **4장**에 상단 4px 만 노출된 채
       남아 있다」가 그것이다. `-idle` 은 정의상 «아무것도 날고 있지 않은» 프레임이므로 비우는 것이 맞다. */
    await page.evaluate(() => { const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; });
    await page.waitForTimeout(120);
    await shot('idle');
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await shot('down');
    await page.waitForTimeout(420);            /* -down 캡처가 먹은 시간까지 합쳐 ≈800ms */
    await shot('hold');
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false);
                                if (typeof trHoldStop === 'function') trHoldStop(false); });
    await page.waitForTimeout(400);
    /* ⚑ 6회차 — **2패스 전에 재고를 되돌린다.** 5회차 비평가 둘이 «tempchg 의 `-up` 만 플로터 0px» 을
       독립으로 냈는데(CC 「hold 4,758px → up 0px」 · CD 「940ms 에 소멸」), 재현해 보니 **제품이 아니라
       하네스**였다: [충전]은 1패스에서 «보유분 전부» 를 이미 바꿔서, 2패스의 탭은 재고가 0 이라
       `once()` 가 false 를 돌려 **beat 자체가 안 난다.** 즉 그 0px 은 «수명이 짧다» 가 아니라
       «아무 일도 안 일어난 탭» 을 찍은 것이다(자를 고치는 쪽이 맞다 — `verify491` [6-k] 는 같은 시각에
       α 0.46 을 재고 있었고 둘이 어긋난 이유가 이것이다). 두 패스의 상태 차이는 «시도 1회» 뿐이어야 한다.
       ⚠ **[충전] 에서만 되돌린다.** 6회차에 네 재화를 다 되돌려 봤더니 비평가 CF 가 곧바로 잡았다 —
       룬·투자·훈련은 1패스의 홀드가 레벨·잔액을 실제로 여러 칸 움직이는데 2패스에서 그것을 되돌리면
       `-up` 프레임의 숫자가 `-hold` 보다 **뒤로 간다**(CF 「Lv.7 인데 잔액이 down 비트맵과 0px 동일 =
       스테일 라벨 롤백」). 되돌림이 필요한 것은 «재고를 한 번에 다 쓰는» 이 버튼 하나뿐이다. */
    if (s.id === 'tempchg') {
      /* ⚑ 8회차 — 재고뿐 아니라 **포인트 잔액도** 되돌린다. 6회차는 `S.tstone` 만 되돌려서
         2패스가 «두 번째 충전» 이 되고, `-up` 잔액이 1,000,494 → **2,000,494** 로 한 번 더 늘었다 —
         CG·CH 가 독립으로 「재고 0인데 얻은 것만 또 는다 · 화면의 숫자만 더하면 100만이 설명되지 않는다」로
         ③ 감점했다. 두 패스의 상태 차이는 «시도 1회» 뿐이어야 한다는 규약이 여기서도 답이다. */
      await page.evaluate(p0 => { S.tstone = 1e6; if (S.temper) S.temper.pts = p0; renderTrain(); }, pts0);
      await page.waitForTimeout(300);
    }
    /* 2패스 — 캡처가 끼지 않은 «진짜» 짧은 탭 */
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(140);
    await shot('up');
    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false);
                                if (typeof trHoldStop === 'function') trHoldStop(false); });
    await page.waitForTimeout(250);
    console.log('  ' + s.id.padEnd(8) + ' 버튼 ' + Math.round(r.w) + '×' + Math.round(r.h)
      + ' @(' + Math.round(r.x) + ',' + Math.round(r.y) + ')  ' + s.n);
  }
  console.log('\n' + made.length + '장 — ' + OUT);
  for (const f of made) console.log('  ' + f);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
