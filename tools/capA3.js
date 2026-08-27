/* 작업 A3 상단 HUD — 캡처 하네스 (1080×2280, 2026-08-25 기준 해상도)
   실행: node tools/capA3.js <회차>
     → docs/review/A3-r<회차>.png        (프레임 전체 1080×2280)
     → docs/review/A3-r<회차>-hud.png    (HUD 밴드만 1080×160 = ref y 84~244)

   레퍼런스 `docs/ref/02-기본-메인-화면.jpg`(1080×2340) 와 같은 «상태» 로 맞춘다:
     · 하단 패널 닫힘(순수 전투 화면)
     · 닉네임 `U_1787501115822` · 골드 `39.20A` · 다이아 `1,300` (레퍼런스 문자열 그대로)
     · 칭호 자리는 우리 게임의 «계급»(브론즈) — 레퍼런스의 «칭호 없음» 과는 데이터 차이다
   세로 변환: 캡처 y = 레퍼런스 y − 84 (HUD 는 화면 위쪽 고정 요소라 하나뿐) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const r = process.argv[2] || '1';
const out = path.resolve(__dirname, '../docs/review/A3-r' + r + '.png');
const outHud = path.resolve(__dirname, '../docs/review/A3-r' + r + '-hud.png');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  /* 58 연출 모듈의 재화 파티클(#fxl)이 HUD 위를 지나가 채점을 오염시킨다(02·53 이 같은 사고).
     그리고 «파티클» 만 끄면 부족하다 — S.gold/S.dia 를 세팅하는 순간 `fxWatch()` 가 증가를 감지해
     알약 자체에 **펀치(scale) 트랜스폼**을 건다. 실제로 6회차 첫 캡처는 `.cGold` 가 211×48 이 아니라
     **257×58.5(×1.22)** 로 찍혔고, 그대로 재면 «재화 숫자 잉크 +20%» 라는 유령 지적이 나온다.
     알약 컨테이너의 애니메이션·트랜스폼만 죽인다(아이콘 scaleX·숫자 translate 는 레이아웃 값이라 살린다). */
  await p.addStyleTag({ content: '#fxl{display:none!important}' +
    '#top .cbox{animation:none!important;transition:none!important;transform:none!important}' +
    '#top .prof,#top .pcol,#top .pnick,#top .ptitle,#top .pcp{animation:none!important;transition:none!important}' });

  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.stage = 37; S.best = 37;
    S.gold = 39200; S.dia = 1300;
    S.nick = 'U_1787501115822';
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  /* 전투력은 게임 진행도에서 나오는 값이라 기본 세이브에서는 3자리(471)다. 레퍼런스는 `1.33B` 5글자라
     글자 «자당 폭» 이 아니라 «문자열 폭» 으로 비교하면 유령 지적이 나온다 — 화면이 실제로 쓰는 포매터로
     레퍼런스와 같은 문자열이 나오는 값(1,330,000)을 넣어 표시만 맞춘다(우리 포맷 그대로다).
     ⚠ 작업 238(2026-08-27): 이 줄은 오래 `fmt(1330000)` 이었는데, 150·188 이 표기 규약을 갈면서
     «전투력 = `fmtB`(알파벳 단위)» 로 바뀌어 `fmt` 는 **`1,330,000`(9글자)** 를 냈다. 화면은 18328 줄에서
     `fmtB` 로 찍는데 하네스만 `fmt` 로 덮어써서, `inkA3.py` 의 전투력 창(pad 10 = 104px)이 9글자를
     **잘라 재고** 그 잘린 폭을 «scaleX 가 13% 넓다» 로 읽었다 — 실제 CSS 는 한 곳도 안 틀렸다.
     **화면이 쓰는 포매터와 반드시 같은 것을 쓴다**(`fmtB`). 표기 규약이 또 바뀌면 여기도 같이 바꿀 것. */
  await p.waitForTimeout(1600);   /* 펀치·스태거가 완전히 가라앉을 때까지 */
  /* `renderUI()` 가 0.35초마다 `cpN` 을 다시 쓰고 60 롤링이 매 프레임 덮으므로,
     캡처 직전에 두 갱신 경로를 세운 뒤에 넣는다 */
  /* `A3_REFSTR=1` — **측정 전용** 모드. 칭호·재화 문자열을 레퍼런스와 **똑같은 글자**로 바꾼다.
     우리 게임은 칭호 대신 계급(「브론즈」)을 쓰고 숫자 단위를 알파벳으로 통일했으므로(작업 111)
     평소 캡처는 「브론즈」·「39.2A」·「1.30A」다. 글자 수가 다르면 잉크 **폭**을 레퍼런스와 비교할 수 없어
     `tools/inkA3.py` 의 sx 배수가 오염된다 — 이 모드는 폭 역산에만 쓰고 채점 캡처로는 쓰지 않는다.
     `renderUI`/`drawHud` 를 세운 **뒤에** 넣어야 0.35초 갱신에 덮이지 않는다. */
  await p.evaluate((refstr) => {
    window.renderUI = () => {}; window.drawHud = () => {};
    const e = document.getElementById('cpN'); if (e) e.textContent = fmtB(1330000);
    if (refstr) {
      const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
      set('rankN', '칭호 없음'); set('goldN', '39.20A'); set('diaN', '1,300');
    }
  }, process.env.A3_REFSTR === '1');
  await p.waitForTimeout(120);
  await p.screenshot({ path: out });
  await p.screenshot({ path: outHud, clip: { x: 0, y: 0, width: 1080, height: 160 } });

  const box = await p.evaluate(() => {
    const g = sel => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    return {
      top: g('#top'), plate: g('.plate'), pedge: g('.pedge'), pface: g('.pface'),
      pnick: g('.pnick'), ptitle: g('.ptitle'), pcp: g('.pcp'), pcpI: g('.pcp i'), pcpB: g('.pcp b'),
      curs: g('.curs'), cGold: g('.cGold'), cGoldI: g('.cGold i'), cGoldB: g('.cGold b'),
      cDia: g('.cDia'), cDiaI: g('.cDia i'), cDiaB: g('.cDia b'),
      text: { nick: (document.getElementById('nickN') || {}).textContent,
              rank: (document.getElementById('rankN') || {}).textContent,
              cp: (document.getElementById('cpN') || {}).textContent,
              gold: (document.getElementById('goldN') || {}).textContent,
              dia: (document.getElementById('diaN') || {}).textContent },
    };
  });
  await b.close();
  /* 238 — 캡처 옆에 «이 png 가 무엇을 담고 있는지» 를 사이드카로 남긴다.
     `tools/inkA3.py --gate` 는 잉크 폭을 **글자 수가 같을 때만** 비교할 수 있는데, 사이드카가 없으면
     게이트는 «잘못된 캡처» 와 «CSS 결함» 을 구별하지 못한다 — 238 이 정확히 그 사고였다
     (A3_REFSTR 없이 찍은 캡처의 「브론즈」·「39.2A」 글자 수 차이가 «폭 −29.6%/−19.0% 결함» 으로 등재됐다).
     사이드카가 있으면 게이트가 먼저 문자열을 대조해서 **어느 쪽 잘못인지 이름을 대고** 빨개진다. */
  const side = out.replace(/\.png$/, '.json');
  require('fs').writeFileSync(side, JSON.stringify({
    refstr: process.env.A3_REFSTR === '1', errors: errs.length, text: box.text, box,
  }, null, 1));
  console.log('CAPA3 r' + r + ' →', path.basename(out), '/', path.basename(outHud), '/', path.basename(side));
  console.log('errors:', errs.length ? errs : 0);
  console.log(JSON.stringify(box, null, 1));
})();
