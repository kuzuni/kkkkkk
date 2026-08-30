#!/usr/bin/env node
/* 채점 캡처 — 작업 471 비평 루프 (주인 지시: 비평가 2명 독립 · 둘 다 ≥9/10)
 *
 *   node tools/cap471.js [회차]
 *
 * 주인 보강대로 채점 축은 하나다 — «전 화면 레드닷이 기준 그림과 같은 코너 걸침인가 ·
 * 잘린 점 0 · 호스트별 일관성». 그러려면 **나란히 놓아야 한다**(411 이 남긴 교훈:
 * 따로 보면 셋 다 그럴듯하다). 그래서 자리마다 «호스트 + 닷» 만 잘라 한 장에 격자로 붙인다.
 *
 * 출력 — `docs/review/471-r<n>-대조.png` (한 장) · 좌표·라벨은 stdout 의 표.
 * ⚠ `docs/review/*.png` 는 .gitignore 로 막혀 있다(커밋하지 마라 — 증거는 review .md 의 수치다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review', '471-r' + R + '-대조.png');

/* 자리 = probe471 과 **같은 순서·같은 진입**(자매 자 드리프트 방지). 여기서는 «잘라 낼 상자» 만 더 준다. */
const STEPS = [
  ['HUD 탭바', async p => {}, '#tabbar .tab.alert .bdg', '.tab'],
  ['HUD 사이드', async p => {}, '.ibtn.on .bdg', '.ibtn'],
  ['▦ 메뉴 버튼', async p => {}, '#menub .bdg', '#menub'],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 화면을 차례로 열며 «호스트 상자 + 여백 46» 을 잘라 모은다. 진입은 verify299/probe471 과 같은 목록. */
  const shots = [];
  const grab = async (label, hostSel, note) => {
    const box = await page.evaluate((s) => {
      const h = document.querySelector(s);
      if (!h) return null;
      h.getAnimations({ subtree: true }).forEach(a => { try { a.pause(); a.currentTime = (a.effect.getTiming().duration || 0); } catch (_) {} });
      /* ⚑ 3회차 비평(BR) — 04·15 가 «세로 인셋비 0.82(기준의 1.9배)» 로 읽혔다. 제품 실측은 11px 이다.
         뿌리는 **닷의 맥박 애니메이션을 «끝 프레임» 에 세운 것**이다(위 줄) — 무한 반복 키프레임의
         100% 는 base 가 아니라 커진·밀린 상태라 시트의 점이 자 값과 다른 자리에 찍힌다.
         `probe471` 은 같은 자리를 `animation:'none'`(= base)으로 잰다 ⇒ **두 자가 다른 것을 보고 있었다**
         (385 «자매 자 드리프트»). 시트 쪽을 자에 맞춘다. */
      h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.style.animation = 'none'; });
      let r = h.getBoundingClientRect();
      /* ⚑ 3회차 — 스크롤 그릇 밖으로 밀려난 자리(35 패스 보상 칸)는 «상자 없음» 으로 조용히 빠져
         **빈 칸이 채점에 실렸다**(1회차 비평이 빈 칸 셋을 «가장 나쁜 자리» 로 꼽았던 그 사고).
         자리는 있는데 안 보이는 것뿐이니 **끌어와서 찍는다.** */
      if (r.width && (r.bottom < 0 || r.top > innerHeight)) {
        try { h.scrollIntoView({ block: 'center' }); } catch (_) {}
        r = h.getBoundingClientRect();
      }
      if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, hostSel);
    if (!box) { console.log('  (건너뜀) ' + label + ' — 상자 없음'); return; }
    /* ⚑ 2회차 비평(BP) 이 드러낸 **이 자의 결함** — 1·2회차 시트는 칸마다 «호스트 전체 + 여백» 을 잘라
       `k = min((CELL-24)/w, CELL/h, 1.6)` 로 **칸마다 다른 배율**로 붙였다. 그래서 980px 짜리 카드는
       0.48배, 100px 짜리 아이콘은 1.6배로 실려 **같은 11px 이 시트에서 5px 과 35px 으로 보인다.**
       비평가가 «03 은 21px 안쪽» 이라고 적은 것이 그것이다(제품 실측은 11.0).
       «나란히 놓고 비교» 하려면 **모든 칸이 같은 배율·같은 크기의 창**이어야 한다.
       ⇒ 호스트 전체가 아니라 **우상단 코너를 중심으로 한 고정 창(제품 240×240px)** 을 잘라
          모든 칸을 같은 배율로 붙인다. 코너 걸침만 보는 채점이라 이 창이면 충분하고, 칸끼리
          «몇 px 안쪽인가» 를 눈으로 직접 견줄 수 있다. */
    const WIN = 240;
    const cxr = box.x + box.w, cyr = box.y;
    const clip = { x: Math.max(0, Math.min(1080 - WIN, cxr - WIN * 0.62)),
                   y: Math.max(0, Math.min(2280 - WIN, cyr - WIN * 0.38)),
                   width: WIN, height: WIN };
    const buf = await page.screenshot({ clip });
    /* ⚑ 3회차 비평(BR)이 잡은 **이 자의 두 번째 결함** — 십자선을 «창의 0.62/0.38 자리» 에
       고정으로 그리고 있었다. 창이 **화면 변에서 잘리면**(`Math.min(1080-WIN, …)`) 코너는
       그 자리에 안 온다: `#menub`(우변 1036)·03 던전 카드(우변 1030)는 창이 x840 에 물려
       코너가 창 안 196·190 에 오는데 십자선은 148.8 에 그려졌다 ⇒ 사람 눈에는 점이 코너에서
       **67·57px 밖으로 떨어진 것**으로 보인다(BR 실측과 정확히 일치 — 제품은 둘 다 11px 이다).
       ⇒ 십자선 자리를 **창 안의 실제 코너 좌표**로 같이 실어 보낸다. */
    shots.push({ label, note, b64: buf.toString('base64'), w: clip.width, h: clip.height,
      fx: (cxr - clip.x) / clip.width, fy: (cyr - clip.y) / clip.height });
    console.log('  ' + label.padEnd(28) + Math.round(box.w) + '×' + Math.round(box.h)
      + ' @ (' + Math.round(box.x) + ',' + Math.round(box.y) + ')' + (note ? '  ' + note : ''));
  };

  const ev = f => page.evaluate(f).catch(() => {});
  const wait = ms => page.waitForTimeout(ms);
  /* ⚑ 1회차 비평(BM·BN 2인 독립 일치) — **세 칸이 빈 채로 채점에 나갔다**(05 던전 카드 · 16 [일괄 강화] ·
     17 스킬 카드). 둘 다 그 셋을 «가장 나쁜 자리» 로 꼽았는데 결함은 제품이 아니라 **이 자였다** —
     그 닷들은 조건이 맞을 때만 노드가 찍히는데 캡처가 조건을 안 만들었다. 351lib 이 여러 회차에 걸쳐
     배운 것과 같은 사고(«조용한 실패가 채점에 그대로 실린다»)라 같은 처방을 쓴다:
     **호스트를 점등 상태로 만들고, 노드가 없으면 만들어 준다. 못 만들면 소리 내어 건너뛴다.** */
  const arm = (hostSel, cls) => page.evaluate(([s, c]) => {
    const hs = [...document.querySelectorAll(s)];
    hs.forEach(h => {
      h.classList.add('alert');
      if (!h.querySelector(':scope > .' + c)) {
        const e = document.createElement('s'); e.className = c; h.appendChild(e);
      }
    });
    return hs.length;
  }, [hostSel, cls || 'updot']).then(n => { if (!n) console.log('  ⚠ arm 실패 — ' + hostSel + ' 0개'); })
    .catch(() => console.log('  ⚠ arm 예외 — ' + hostSel));

  console.log('CAP471 — ' + R + '회차 대조 캡처\n');
  await ev(() => { document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('01 탭바 «상점» 칸', '#tabbar .tab:last-child', '예외 — 프레임 변');
  await grab('02 사이드 아이콘', '.side .ibtn.on', '');
  await ev(() => { document.getElementById('menub').classList.add('alert'); });
  await wait(150);
  await grab('03 ▦ 메뉴 버튼', '#menub', '');

  await ev(async () => { openDungeon(); });
  await wait(500);
  await ev(() => { document.querySelectorAll('#dunw .stab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('04 03 던전 서브탭', '#dunw .stab', '');
  await arm('#dunw .dns-list .dnc', 'dot');
  await wait(200);
  await grab('05 03 던전 카드', '#dunw .dnc', '');
  await ev(() => { if (typeof closeDungeon === 'function') closeDungeon(); });
  await wait(200);

  await ev(async () => { QUESTS.forEach(q => { S.quest[q.id].base = 0; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9; openQuest('rep'); });
  await wait(600);
  await grab('06 22 [모두 받기] ★기준', '#qAll', '주인이 «맞다» 고 지목한 모양');
  await grab('07 22 행 [보상 받기]', '.qs-b', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.att = { n: 3, date: '' }; openAttend(); });
  await wait(500);
  await grab('08 70 출석 «오늘 카드»', '#mbox [data-att]', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await wait(600);
  await grab('09 13 광고 [받기] 버튼', '#shopList .cn-cd .bt[data-cnad]', '479 — 카드에서 버튼으로');
  await ev(() => { document.querySelectorAll('#shopCats .stab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('10 10 상점 서브탭', '#shopCats .stab', '주인 스크린샷 ① «반달» 자리');
  await ev(async () => { openShopPage(null, 'summon'); });
  await wait(500);
  /* ⚑ 4회차 비평 — BS·BT **둘 다 이 칸을 «채점 불능»** 으로 돌려보냈다. 창을 **카드** 코너에
     맞춰 잘랐는데 328 규약상 이 닷이 붙는 곳은 **버튼(`.cbtn.b1`) 코너**라, 십자선은 닷에서
     70/158 제품px 떨어진 자리에 찍히고 닷 자신은 창 아래로 밀려났다(BS: «닷 중심이 창 밖 16.5
     시트px»). 3회차에 «창이 화면 변에 물리는» 결함을 고쳤는데 이 칸은 **호스트가 뒤바뀐 채**였다.
     ⇒ 크롭·십자선을 그 닷이 실제로 겨누는 **버튼** 코너에 맞춘다(노드가 카드 자식인 것은 그대로). */
  await grab('11 10 «10회 소환» 버튼', '#shopList .shp-card .cbtn.b1',
    '예외 — 노드는 카드 자식이되 좌표는 이 버튼 코너 기준(328)');
  await ev(() => closeShopPage());
  await wait(200);

  await ev(async () => { S.bless.exp = { atk: 0, hp: 0, rate: 0 }; openBless(); });
  await wait(500);
  await grab('12 34 축복 «받기» 알약', '.bls-c .tm', '');
  await ev(() => closeBless());
  await wait(200);

  await ev(async () => { S.daily.spins = 1; openRoulette(); });
  await wait(500);
  await grab('13 29 [룰렛 돌리기]', '#rouBtn', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.relic = 1e6; openRelw(); });
  await wait(500);
  await grab('14 89 유물 수반', '#rwBasin', '예외 — 상자 코너가 투명(림에 맞춤)');
  await ev(() => closeRelw());
  await wait(200);

  await ev(async () => { goTab('hero', true); heroSubGo('eq'); });
  await wait(600);
  await arm('#bEq .eqsl,.eqsl');
  await wait(250);
  await grab('15 06 장비 슬롯', '.eqsl', '');
  await ev(async () => { heroSubGo('sk'); });
  await wait(600);
  await arm('#bSk .sk-btn');
  await arm('#bSk .sk-card');
  await wait(250);
  await grab('16 07 [일괄 강화] 버튼', '#bSk .sk-btn', '');
  await grab('17 07 스킬 카드', '#bSk .sk-card', '4회차 — 점유물([+])을 좌상단으로 옮기고 코너를 닷에게 줬다');

  await ev(async () => { openPass('stage'); });
  await wait(600);
  await arm('#psTk .ps-bx');
  await wait(250);
  await grab('18 35 패스 보상 칸', '#psTk .ps-bx', '');
  await grab('19 35 패스 하단 탭', '#psBar .pt', '예외 — 프레임 변');
  await ev(() => closePass());

  /* 한 장으로 붙인다 — 나란히 안 놓으면 어긋남이 안 보인다(411 교훈) */
  const sheet = await page.evaluate(async (items) => {
    const imgs = await Promise.all(items.map(async it => {
      const im = new Image();
      await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + it.b64; });
      return { im, label: it.label, note: it.note, fx: it.fx, fy: it.fy };
    }));
    /* 모든 칸이 같은 창(240×240 제품px, dsf2 라 480×480)이라 **배율도 하나**다 */
    const COL = 4, CELL = 470, PADT = 54;
    const rows = Math.ceil(imgs.length / COL);
    const c = document.createElement('canvas');
    c.width = COL * CELL; c.height = rows * (CELL + PADT);
    const g = c.getContext('2d');
    g.fillStyle = '#101014'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((o, i) => {
      const cx = (i % COL) * CELL, cy = Math.floor(i / COL) * (CELL + PADT);
      g.fillStyle = '#EDEAE3'; g.font = 'bold 22px sans-serif'; g.textBaseline = 'top';
      g.fillText(o.label, cx + 12, cy + 8);
      if (o.note) { g.fillStyle = '#9AA0AA'; g.font = '18px sans-serif'; g.fillText(o.note, cx + 12, cy + 32); }
      /* ⚠ 칸마다 다른 배율을 쓰면 «나란히» 가 거짓말이 된다(2회차 비평이 그것에 걸렸다).
         창이 전부 같은 크기이므로 배율은 **한 값**이다. */
      const k = (CELL - 24) / o.im.width;
      const w = o.im.width * k, h = o.im.height * k;
      g.drawImage(o.im, cx + (CELL - w) / 2, cy + PADT + (CELL - h) / 2, w, h);
      /* 창 한복판에 호스트 코너가 오도록 잘랐다 — 십자선을 그려 «코너» 를 눈에 보이게 한다 */
      g.strokeStyle = 'rgba(120,200,255,.55)'; g.lineWidth = 1;
      const ox = cx + (CELL - w) / 2, oy = cy + PADT + (CELL - h) / 2;
      /* ⚠ 0.62/0.38 고정이 아니라 **찍을 때 잰 실제 코너 자리**를 쓴다(창이 화면 변에 물리면
         코너가 그 자리에 안 온다 — 3회차 비평 BR 이 이것을 «점이 67px 밖으로 떨어졌다» 로 봤다). */
      /* ⚑ 4회차 비평 — BS «01 은 십자선 세로선이 240창 안에 없어 가로를 아예 못 잰다».
         호스트가 **프레임 우변에 플러시**면 코너 x = 1080 이고 창은 `1080 - WIN` 에 물려
         코너가 창 안 좌표 **240**(= 창 밖 첫 픽셀)에 떨어진다. 오른쪽에는 더 잘라 올 픽셀이
         아예 없으므로 창을 옮겨서는 못 고친다 — **선을 창의 마지막 열에 그린다**(오차 0.5px 미만,
         그 사실을 라벨에 적는다). 안 그리면 그 칸은 «채점 불능» 이 되어 점수를 두 번 깎는다. */
      const clampF = v => Math.max(0.002, Math.min(0.998, v));
      const fx = clampF(o.fx === undefined ? 0.62 : o.fx), fy = clampF(o.fy === undefined ? 0.38 : o.fy);
      g.beginPath();
      g.moveTo(ox + w * fx, oy); g.lineTo(ox + w * fx, oy + h);
      g.moveTo(ox, oy + h * fy); g.lineTo(ox + w, oy + h * fy);
      g.stroke();
    });
    return c.toDataURL('image/png');
  }, shots);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('\n대조 시트 저장 — ' + OUT + ' (' + shots.length + '자리)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
