/* 작업 A2 좌측 사이드 아이콘 스택 — 캡처 하네스 (1080×2280, 2026-08-25 기준 해상도)
   실행: node tools/capA2.js <회차>
     → docs/review/A2-r<회차>.png       (채점용 전체 화면)
       docs/review/A2-r<회차>-off.png   (#sideL 숨김 — 차분으로 순수 잉크 bbox 를 뜬다)
       docs/review/A2-r<회차>-nolabel.png (라벨만 숨김 — 아이콘 잉크만 잰다)
   3회차 교훈: 임계값 마스크는 드롭섀도를 물어 수 px 틀린다. 크기는 «숨긴 캡처와의 차분» 으로 잰다.
   상태는 레퍼런스 02 와 동일(패널 닫힘 · STAGE 37 · 배너 보상받기). cap02.js 와 같은 절차. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const r = process.argv[2] || '1';
const dir = path.resolve(__dirname, '../docs/review');

const setup = () => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  S.stage = 37; S.best = 37;
  S.gold = 1234567; S.dia = 8900;
  S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0;
  S.totalKills = 500;
  if (panelOpen) { panelOpen = false; syncPanel(); }
  uiDirty = true; renderUI(); drawHud(); drawTuto();
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  /* 58 연출 모듈의 재화 파티클이 스택 위를 지나가 채점을 오염시킨다(02·53 이 같은 사고) */
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  await p.evaluate(setup);
  await p.waitForTimeout(700);
  await p.evaluate(() => { killed = Math.round(stageTotal() * 0.32);
    $('prF').style.width = (killed / stageTotal() * 100) + '%'; });
  await p.waitForTimeout(120);
  /* 차분을 쓰려면 3장이 «사이드 스택 말고는 동일» 해야 한다. 전투 캔버스가 살아 있으면
     프레임마다 적·이펙트가 움직여 차분이 화면 전체로 번진다 → rAF 루프와 setInterval 을 얼린다. */
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i);
  });
  /* CSS 애니메이션은 rAF 로 안 돈다 — 따로 얼려야 4장이 «사이드 스택 말고는 동일» 해진다.
     60 쥬시 모듈이 붙은 뒤 아이콘이 미세하게 흔들려 차분이 라벨 밴드까지 번졌다. */
  await p.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(dir, 'A2-r' + r + '.png') });

  /* DOM 실측 — 프레임 좌표(=캡처 좌표) */
  const box = await p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const g = e => { const b = e.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(1), y: +(b.y - app.y).toFixed(1),
               w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const rows = [...document.querySelectorAll('#sideL .ibtn')].map(e => ({
      pop: e.dataset.pop, cell: g(e),
      si: g(e.querySelector('.si')),
      sl: e.querySelector('.sl') ? g(e.querySelector('.sl')) : null,
      sf: e.style.getPropertyValue('--sf'), sx: e.style.getPropertyValue('--sx'),
      dx: e.style.getPropertyValue('--dx'), dy: e.style.getPropertyValue('--dy')
    }));
    const cs = getComputedStyle(document.getElementById('app'));
    return { appH: +app.height.toFixed(1),
      vars: { ih: cs.getPropertyValue('--ih').trim(), igap: cs.getPropertyValue('--igap').trim(),
              itop: cs.getPropertyValue('--itop').trim(), ilh: cs.getPropertyValue('--ilh').trim() },
              /* 360(2026-08-29) — --isolo/--isgap 은 «출석» 단독 규격과 함께 삭제됐다(빈 문자열이 찍히던 자리) */
      sideL: g(document.getElementById('sideL')),
      menub: g(document.getElementById('menub')),
      stage: g(document.getElementById('stagearea')),
      rows };
  });

  /* 라벨 차분용 — `.bdg` 를 끄기 «전» 에 뜬다. 채점용 1장과 알림닷 상태가 같아야
     full − labeloff 차분에 알림닷이 안 섞인다(4회차에 라벨 잉크 높이가 30 → 47 로 튀었다). */
  await p.addStyleTag({ content: '#sideL .sl{visibility:hidden!important}' });
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(dir, 'A2-r' + r + '-labeloff.png') });
  /* 여기서부터 라벨은 다시 켜지 않는다 — 뒤 장들은 전부 «아이콘만» 이 필요하고,
     껐다 켰다 하면 addStyleTag 순서에 기대게 된다(실제로 한 번 되살아나 아이콘 밴드가 라벨을 물었다). */

  /* 차분용 — 스택 전체 숨김 / 라벨만 숨김.
     [함정] `.bdg`(빨강 알림닷)는 `.si` 밖에 있고 슬롯 우상단으로 튀어나온다(x 114..156 · top −6).
     이걸 켠 채로 차분을 뜨면 **아트 잉크 bbox 가 오른쪽·위로 부풀고**, 알림 상태가 회차마다 달라
     같은 빌드에서도 수치가 흔들린다(4회차에 실제로 5px 씩 흔들렸다). 레퍼런스 02 에는 좌측 알림닷이
     없고 비평가 2인도 마스킹해서 쟀으므로, **측정용 4장에서는 끈다**(채점용 1장은 그대로 둔다). */
  await p.addStyleTag({ content: '#sideL .bdg{display:none!important}' });
  await p.addStyleTag({ content: '#sideL{visibility:hidden!important}' });
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(dir, 'A2-r' + r + '-off.png') });
  await p.addStyleTag({ content: "#sideL{visibility:visible!important}" });
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(dir, 'A2-r' + r + '-nolabel.png') });
  /* 소프트 드롭섀도(0 3px 5px)만 뺀 장 = «아트 + 검정 외곽선».
     4회차 비평가 E·F 가 둘 다 «파랑틴트 드롭섀도는 잉크에서 제외» 로 재서 우리보다 12~14px 작게 나왔다.
     레퍼런스 스프라이트 bbox 의 정의(아트+자체 외곽선)와 맞추려면 이 장으로 재야 한다. */
  await p.addStyleTag({ content: `#sideL .si{filter:
      drop-shadow(var(--o) 0 0 #080a0a) drop-shadow(calc(var(--o)*-1) 0 0 #080a0a)
      drop-shadow(0 var(--o) 0 #080a0a) drop-shadow(0 calc(var(--o)*-1) 0 #080a0a)!important}` });
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(dir, 'A2-r' + r + '-hard.png') });
  /* 외곽선까지 전부 끈 장 — 순수 글리프 잉크 */
  await p.addStyleTag({ content: '#sideL .si{filter:none!important}' });
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(dir, 'A2-r' + r + '-noshadow.png') });

  require('fs').writeFileSync(path.join(dir, 'A2-r' + r + '-box.json'), JSON.stringify(box, null, 1));
  await b.close();
  console.log('CAPA2 r' + r);
  console.log('errors:', errs.length ? errs : 0);
  console.log(JSON.stringify(box, null, 1));
})();
