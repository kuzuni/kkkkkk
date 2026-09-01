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

/* ⚑ 624(2026-09-01) — **장면이 넷에서 셋이 됐다.** 613(단련석 직접 지불)이 «전환» 단계를 통째로
   없애면서 단련 헤더의 [충전] 버튼(`#trTemper .tp-hd .cg` · `data-tpchg`)이 제품에서 사라졌다
   (index.html 10549·13289 주석). 그 자리에 613 이 세운 것은 «보유 줄»(현재 단련석 개수)이라
   **누를 것이 아니다** — idle/down/hold/up 네 장이 전부 같은 그림이 되므로 장면을 갈아 끼우지 않고
   걷어냈다(333 «자리를 비우지 마라» 는 «살아 있는 대체 계약» 이 있을 때의 말이다).
   ⚠ 이 하네스는 **죽지 않았다** — 아래 `if (!r)` 가드가 «[skip] tempchg — 요소 없음» 으로 받아
   조용히 12장만 내놓았다(624 재현). 조용한 것이 문제라서 걷어낸다: 다음 491 세션이
   review 8회차의 «4장면 16장» 을 읽고 12장을 받으면 무엇이 빠졌는지가 그림에 안 나온다.
   [충전] 장면의 3~8회차 기록(홀드 자멸 · 2패스 되돌림 · 578 기준선)은 `docs/review/491-UI쥬시루프.md`
   에 그대로 있다 — 되살릴 일이 생기면 거기서 읽는다. */
const SCENES = [
  { id: 'rune',    tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화] 버튼(홀드)' },
  { id: 'tempup',  tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련] 버튼(홀드)' },
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
    /* ⚑ 624 — `S.temper.pts = 500` 을 여기서 걷어냈다. 613 이 «단련 포인트» 를 선언째 없애
       (index.html 19782 · 20555~20566: 구 세이브의 pts 는 load() 가 단련석으로 되돌리고 필드는
       죽는다) 이 대입은 **아무 판정도 안 읽는 필드**를 세우고 있었다 — save() 도 안 싣는다.
       단련의 지불 수단은 이제 `S.tstone` 하나이고 그건 바로 윗줄이 세운다. */
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    /* 578 — 재고를 «채우는» 것도 제품에게는 획득이다(아래 되돌림 주석과 같은 이유).
       장면이 시작되기 전에 기준선을 맞춰 둔다 — 안 맞추면 1번 장면에 «+1,000,000» 이 얹힌다. */
    if (typeof fxSeen === 'object' && fxSeen)
      for (const k in fxSeen) { const v = fxS(k); if (Number.isFinite(v)) fxSeen[k] = v; }
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
    await page.evaluate(() => { for (const id of ['fxl', 'fxlc']) {
      /* 578 — **두 층을 같이 비운다.** 6·8회차가 `#fxl` 만 비웠는데 발원이 «전투 발» 이거나
         «추측» 이면 같은 `+n` 이 `#fxlc`(z7)로 가므로, 한 층만 비우면 다른 층에 남는다. */
      const L = document.getElementById(id); if (L) L.innerHTML = ''; } });
    await page.waitForTimeout(450);
    const box = await page.evaluate(() => {
      const b = document.querySelector('#trw .tr-box').getBoundingClientRect();
      return { x: Math.round(b.x) - 6, y: Math.round(b.y) - 6, width: Math.round(b.width) + 12, height: Math.round(b.height) + 12 };
    });
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
    await page.evaluate(() => { for (const id of ['fxl', 'fxlc']) {
      /* 578 — **두 층을 같이 비운다.** 6·8회차가 `#fxl` 만 비웠는데 발원이 «전투 발» 이거나
         «추측» 이면 같은 `+n` 이 `#fxlc`(z7)로 가므로, 한 층만 비우면 다른 층에 남는다. */
      const L = document.getElementById(id); if (L) L.innerHTML = ''; } });
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
    /* ⚑ 624 — **2패스 되돌림(6·8회차 · 578)이 통째로 사라졌다.** 그것은 «재고를 한 번에 다 쓰는»
       [충전] 한 장면만을 위한 것이었고(6회차가 네 재화를 다 되돌렸다가 CF 에게 «스테일 라벨 롤백» 으로
       잡힌 뒤 그 버튼 하나로 좁힌 자리다), 613 이 그 버튼을 없앴다.
       ⚠ **살아 있는 승계자가 없다는 것을 짐작이 아니라 재현으로 확인했다**(624 · 셋업 재고 1e6 기준):
       1패스 홀드가 재고를 **조금씩만** 쓰고(룬강화석 −38 · 단련석 −3) **2패스의 짧은 탭이 세 장면
       전부에서 값을 한 번 더 움직인다**(룬강화석 −13 · 단련석 −1 + 단련 Lv 3→4 · 골드 −100 ·
       `temperUpOk` 는 내내 참) — 즉 6회차가 고치려던 «아무 일도 안 일어난 탭을 찍는다» 가
       여기서는 일어나지 않는다. 되돌림을 남겨 두면 그 세 장면에서는 CF 가 잡은 롤백을 **새로** 만든다.
       ⚑ 578 의 교훈(«하네스가 값을 손대면 감시자 기준선을 같이 옮겨 그 손댐이 «획득» 으로 안 읽히게
       한다»)은 죽지 않았다 — 이 파일에서 값을 손대는 자리는 이제 셋업 하나뿐이고 그 바로 아래가
       `fxSeen` 기준선을 맞춘다. `verify578` [F1] 을 그 자리로 갈아 끼웠다(구조 불변항 + 되돌림 시험). */
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
