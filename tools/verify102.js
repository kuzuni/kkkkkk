/* 작업 102 게이트 — 소환 버튼의 «충분 / 부족» 색 상태 검산.
   실행: node tools/verify102.js

   버그: 12 소환 결과 팝업(#sumw)의 버튼 3개와 10 상점 소환 탭(#shopw)의 30회 버튼이
        **재화가 충분해도** 회색 면 + 빨간 가격이었다. 회색·빨강은 «못 사는 상태» 표시여야 한다.

   레퍼런스 근거(측정표 10 §2, 12 §5 — 이 파일 상단 주석이 유일한 색 기준):
     · 10 레퍼런스는 다이아 1,000 상태다 → **같은 프레임**에 10회(1,000)=노랑 면 + 흰 가격,
       30회(3,000)=회색 면 + 빨강(#EB6D68) 가격. 즉 색은 버튼 순번이 아니라 **구매 가능 여부**다.
     · 12 레퍼런스는 무료 0/1 · 다이아 0 상태라 버튼 3개가 전부 은색 + #FC716C 였다(= 전부 부족).
   → «부족» 픽셀은 옛 값을 그대로 유지하고(Δ0), «충분» 상태만 새로 칠했다.

   판정 색(computed):
     충분  12: 가격 rgb(255,255,255) · 알약 그라디언트(#C39313→#C38607, 무료는 시안) · 면 노랑/시안
           10: 가격 rgb(255,255,255) · --f1 #FCEF31(무료는 #3DD5EC)
     부족  12: 가격 rgb(252,113,108) · 알약 rgb(115,115,115) · 면 은색(#D3D3D3 림)
           10: 가격 rgb(235,109,104) · --f1 #A8A8A8
*/
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const RED12 = 'rgb(252, 113, 108)';   /* #FC716C */
const RED10 = 'rgb(235, 109, 104)';   /* #EB6D68 */
const WHITE = 'rgb(255, 255, 255)';
const GRAYPAN = 'rgb(115, 115, 115)'; /* #737373 */

const R = [];
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const ne = (n, got, bad) => R.push({ n, got: String(got), want: '≠ ' + bad, pass: String(got) !== String(bad) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });
const near = (n, got, want, tol) => R.push({ n, got: String(got), want: want + '±' + tol, pass: Math.abs(got - want) <= tol });

/* ── 136 — «기하 불변» 을 읽기 전에 기하가 멈추기를 기다린다 ───────────────────
   증상: `10 기하 불변` 3항목이 실행마다 뜨고 지는 FAIL(4회 중 3회, 77/80)이었다.
     FAIL 526,425,208,127 (want 525.7,425.7,212.2,129.5)   ← 정수 쪽이 «부족», 소수 쪽이 «충분»
   PROGRESS 136 은 원인을 «122 의 링 펄스(`.cbtn.b1:not(.lack)`)가 충분 쪽에만 걸려서» 로 적었지만
   그 펄스는 `box-shadow` 만 움직이므로 `getBoundingClientRect` 를 1px 도 못 바꾼다. 실제 원인은
   **60 `jzStagger` 의 카드 등장 연출**이다 — `.jz-st{animation:jzSt .2s}` 의 키프레임이
   `scale:.94 → 1.02 → 1` 이라 카드가 도는 동안 그 안의 버튼 rect 가 통째로 배율을 먹는다.
   측정한 세 버튼이 «같은 원점(app 기준 x540·y385 = 첫 카드 중심)» 을 두고 같은 배율로 어긋난 것이
   증거고, 진단에서 `DIV.shp-card jz-st | jzSt@249/running` 을 직접 잡았다.
   왜 «충분» 쪽만 흔들렸나: 충분 패스는 `openShopPage()` 가 팝업을 **새로 열어** 스태거가 돌지만,
   부족 패스는 이미 열린 팝업이라 스태거가 다시 안 돈다. `.lack` 과는 무관하다 —
   두 패스의 «연출 위상» 이 달랐을 뿐이다.
   따라서 이건 제품 결함이 아니라 **게이트가 재는 시점의 결함**이고, 고칠 자리는 여기다
   (LESSONS 120: «애니메이션 붙는 화면은 고정 대기 대신 기하 정지 폴링»).
   고정 대기(400ms)를 늘리는 처방은 쓰지 않는다 — 스태거 종료는 60+240+i·25ms 지만 실측 시작
   시각이 부하에 따라 150ms 넘게 밀려서, 어떤 상수를 골라도 언젠가 다시 깨진다.
   무한 루프 연출(jz122Ring·jz122Breathe 등)은 rect 를 안 움직이므로 폴링이 그대로 수렴한다.
   만약 앞으로 rect 를 움직이는 무한 연출이 붙으면 이 폴링이 `수렴 실패` 로 **드러내 준다**. */
const settle = (p, sels) => p.evaluate(async ss => {
  const rd = () => ss.map(s => {
    const e = document.querySelector(s);
    if (!e) return s + ':없음';
    const b = e.getBoundingClientRect();
    return [b.left, b.top, b.width, b.height].map(v => v.toFixed(3)).join(',');
  }).join('|');
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const t0 = performance.now();
  let prev = rd(), same = 0;
  while (performance.now() - t0 < 4000) {
    await raf();
    const cur = rd();
    if (cur === prev) { if (++same >= 4) return { ok: true, ms: Math.round(performance.now() - t0) }; }
    else { same = 0; prev = cur; }
  }
  return { ok: false, ms: Math.round(performance.now() - t0), last: prev };
}, sels);

const B12 = ['#sumBF', '#sumB10', '#sumB30'];
const B10 = ['#shopList .shp-card .cbtn.b1', '#shopList .shp-card .cbtn.b2', '#shopList .shp-card .cbtn.b3'];

/* 페이지에서 실행되는 수집기 — 12 팝업 */
const probe12 = () => {
  const st = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
  const has = (sel, c) => document.querySelector(sel).classList.contains(c);
  const one = id => ({
    lack: has('#' + id, 'lack'),
    disabled: document.getElementById(id).disabled,
    cost: st('#' + id + ' .cost', 'color'),
    fat: getComputedStyle(document.querySelector('#' + id + ' .cost i')).getPropertyValue('--fat').trim(),
    pan: st('#' + id + ' .pan', 'backgroundColor'),
    panImg: st('#' + id + ' .pan', 'backgroundImage'),
    lab: st('#' + id + ' .lab', 'color'),
    face: st('#' + id, 'backgroundImage'),
    r: (() => { const a = document.getElementById('app').getBoundingClientRect(),
                      b = document.getElementById(id).getBoundingClientRect();
      return [+(b.left - a.left).toFixed(1), +(b.top - a.top).toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)].join(','); })()
  });
  return { bf: one('sumBF'), b10: one('sumB10'), b30: one('sumB30') };
};

/* 페이지에서 실행되는 수집기 — 10 상점 소환 탭(첫 카드) */
const probe10 = () => {
  const card = document.querySelector('#shopList .shp-card');
  const one = sel => {
    const e = card.querySelector(sel), cs = getComputedStyle(e);
    const u = e.querySelector('.cost') || e.querySelector('.sub');
    const a = document.getElementById('app').getBoundingClientRect(), b = e.getBoundingClientRect();
    return {
      lack: e.classList.contains('lack'), rich: e.classList.contains('rich'),
      f1: cs.getPropertyValue('--f1').trim(), ring: cs.getPropertyValue('--ring').trim(),
      p1: cs.getPropertyValue('--p1').trim(),
      txt: getComputedStyle(u).color,
      lab: getComputedStyle(e.querySelector('.lab')).color,
      r: [+(b.left - a.left).toFixed(1), +(b.top - a.top).toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)].join(',')
    };
  };
  return { b1: one('.cbtn.b1'), b2: one('.cbtn.b2'), b3: one('.cbtn.b3'),
           scroll: document.getElementById('shopList').scrollTop };
};

(async () => {
  const br = await launch(chromium);
  const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE);
  await p.waitForTimeout(900);
  /* 캔버스가 스캔·캡처를 오염시키지 않게 내린다(LESSONS 28-3) */
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 73 가이드 소환 미션이 지정 상자 외 소환을 막는다 — 그 상자로 연다 */
  const BK = await p.evaluate(() => (typeof gmBan === 'function' && gmBan()) || 'weapon');

  /* ── ① 12 소환 결과 팝업 ─────────────────────────────────────────── */
  const open12 = async (dia, free) => p.evaluate(([b, dia, free]) => {
    S.dia = dia; S.relic = dia;
    S.daily.freeSum[b] = free;
    const res = []; for (let i = 0; i < 10; i++) res.push(summonOne(b));
    showSummonResult(b, 10, res, false);
    return { c10: summonCost(b, 10), c30: summonCost(b, 30) };
  }, [BK, dia, free]);

  /* 충분 — 다이아 99,999 · 무료 1회 남음 */
  const cost = await open12(99999, 1);
  await p.waitForTimeout(500);
  const s12r = await settle(p, B12);                 /* 136 */
  const rich12 = await p.evaluate(probe12);
  eq('12 충분 · 무료 lack 없음', rich12.bf.lack, false);
  eq('12 충분 · 10회 lack 없음', rich12.b10.lack, false);
  eq('12 충분 · 30회 lack 없음', rich12.b30.lack, false);
  eq('12 충분 · 무료 disabled=false', rich12.bf.disabled, false);
  eq('12 충분 · 10회 disabled=false', rich12.b10.disabled, false);
  eq('12 충분 · 30회 가격 흰색', rich12.b30.cost, WHITE);
  eq('12 충분 · 10회 가격 흰색', rich12.b10.cost, WHITE);
  eq('12 충분 · 무료 횟수 흰색', rich12.bf.cost, WHITE);
  ne('12 충분 · 10회 가격 ≠ 빨강', rich12.b10.cost, RED12);
  eq('12 충분 · 굵기 레이어(--fat) 흰색', rich12.b10.fat === '' || rich12.b10.fat === '#fff', true);
  ne('12 충분 · 10회 알약 ≠ #737373', rich12.b10.pan, GRAYPAN);
  yes('12 충분 · 10회 알약 금색 그라디언트', /195, 147, 19/.test(rich12.b10.panImg));
  yes('12 충분 · 무료 알약 시안 그라디언트', /15, 143, 174/.test(rich12.bf.panImg));
  yes('12 충분 · 10회 면 노랑(#FEC01D)', /254, 192, 29/.test(rich12.b10.face));
  yes('12 충분 · 무료 면 시안(#18B1D3)', /24, 177, 211/.test(rich12.bf.face));
  yes('12 충분 · 면에 은색(#989898) 없음', !/152, 152, 152/.test(rich12.b10.face));
  eq('12 충분 · 라벨 #F8F8F8', rich12.b10.lab, 'rgb(248, 248, 248)');
  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '../docs/review/102-12-rich.png') });

  /* 부족 — 다이아 0 · 무료 0회 */
  await p.evaluate(() => closeSummonResult());
  await open12(0, 0);
  await p.waitForTimeout(500);
  const s12l = await settle(p, B12);                 /* 136 */
  const lack12 = await p.evaluate(probe12);
  eq('12 부족 · 무료 lack', lack12.bf.lack, true);
  eq('12 부족 · 10회 lack', lack12.b10.lack, true);
  eq('12 부족 · 30회 lack', lack12.b30.lack, true);
  eq('12 부족 · 10회 disabled', lack12.b10.disabled, true);
  eq('12 부족 · 10회 가격 #FC716C', lack12.b10.cost, RED12);
  eq('12 부족 · 30회 가격 #FC716C', lack12.b30.cost, RED12);
  eq('12 부족 · 무료 횟수 #FC716C', lack12.bf.cost, RED12);
  eq('12 부족 · 굵기 레이어(--fat) #FC716C', lack12.b10.fat, '#FC716C');
  eq('12 부족 · 10회 알약 #737373', lack12.b10.pan, GRAYPAN);
  eq('12 부족 · 무료 알약 #737373(회귀)', lack12.bf.pan, GRAYPAN);
  yes('12 부족 · 면 은색(#989898) — 레퍼런스 그대로', /152, 152, 152/.test(lack12.b10.face));
  yes('12 부족 · 면 림 #D3D3D3 — 레퍼런스 그대로', /211, 211, 211/.test(lack12.b10.face));
  eq('12 부족 · 라벨 #DFDFDF — 레퍼런스 그대로', lack12.b10.lab, 'rgb(223, 223, 223)');
  yes('12 기하 정지 폴링 수렴(충분 ' + s12r.ms + 'ms · 부족 ' + s12l.ms + 'ms)', s12r.ok && s12l.ok);   /* 136 */
  eq('12 기하 불변 · 무료 버튼', lack12.bf.r, rich12.bf.r);
  eq('12 기하 불변 · 10회 버튼', lack12.b10.r, rich12.b10.r);
  eq('12 기하 불변 · 30회 버튼', lack12.b30.r, rich12.b30.r);
  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '../docs/review/102-12-lack.png') });

  /* 경계 — 다이아 = 10연 값 정확히(1,000): 10회는 충분, 30회는 부족 = 레퍼런스 10 과 같은 조합 */
  await p.evaluate(() => closeSummonResult());
  await open12(cost.c10, 1);
  await p.waitForTimeout(400);
  const edge12 = await p.evaluate(probe12);
  near('12 경계 · 10연 비용', cost.c10, 1000, 0);
  near('12 경계 · 30연 비용', cost.c30, 3000, 0);
  eq('12 경계(dia=1,000) · 10회 충분', edge12.b10.lack, false);
  eq('12 경계(dia=1,000) · 30회 부족', edge12.b30.lack, true);
  eq('12 경계 · 10회 가격 흰색', edge12.b10.cost, WHITE);
  eq('12 경계 · 30회 가격 빨강', edge12.b30.cost, RED12);

  /* ── ② 10 상점 소환 탭 ───────────────────────────────────────────── */
  await p.evaluate(() => closeSummonResult());

  const open10 = async (dia, free) => p.evaluate(([dia, free]) => {
    S.dia = dia;
    Object.keys(S.daily.freeSum).forEach(k => { S.daily.freeSum[k] = free; });
    openShopPage();
  }, [dia, free]);

  await open10(99999, 2);
  await p.waitForTimeout(400);
  const s10r = await settle(p, B10);                 /* 136 — 여기서 jzSt 스태거가 아직 돌고 있었다 */
  const rich10 = await p.evaluate(probe10);
  eq('10 충분 · 10회 rich', rich10.b2.rich, true);
  eq('10 충분 · 30회 rich', rich10.b3.rich, true);
  eq('10 충분 · 30회 lack 없음', rich10.b3.lack, false);
  eq('10 충분 · 10회 면 #FCEF31', rich10.b2.f1, '#FCEF31');
  eq('10 충분 · 30회 면 #FCEF31', rich10.b3.f1, '#FCEF31');
  eq('10 충분 · 30회 알약 #C39313', rich10.b3.p1, '#C39313');
  eq('10 충분 · 30회 가격 흰색', rich10.b3.txt, WHITE);
  eq('10 충분 · 10회 가격 흰색(회귀)', rich10.b2.txt, WHITE);
  eq('10 충분 · 30회 라벨 흰색', rich10.b3.lab, WHITE);
  eq('10 무료 남음 · 무료 버튼 시안', rich10.b1.f1, '#3DD5EC');
  eq('10 무료 남음 · 무료 lack 없음', rich10.b1.lack, false);
  eq('10 무료 남음 · 남은 횟수 흰색', rich10.b1.txt, WHITE);
  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '../docs/review/102-10-rich.png') });

  await open10(0, 0);
  await p.waitForTimeout(400);
  const s10l = await settle(p, B10);                 /* 136 */
  const lack10 = await p.evaluate(probe10);
  eq('10 부족 · 10회 lack', lack10.b2.lack, true);
  eq('10 부족 · 30회 lack', lack10.b3.lack, true);
  eq('10 부족 · 10회 rich 없음', lack10.b2.rich, false);
  eq('10 부족 · 30회 면 #A8A8A8 — 레퍼런스 그대로', lack10.b3.f1, '#A8A8A8');
  eq('10 부족 · 30회 알약 #747474 — 레퍼런스 그대로', lack10.b3.p1, '#747474');
  eq('10 부족 · 30회 가격 #EB6D68 — 레퍼런스 그대로', lack10.b3.txt, RED10);
  eq('10 부족 · 30회 라벨 #DADADA — 레퍼런스 그대로', lack10.b3.lab, 'rgb(218, 218, 218)');
  eq('10 부족 · 10회 가격 #EB6D68', lack10.b2.txt, RED10);
  eq('10 무료 소진 · 무료 lack', lack10.b1.lack, true);
  eq('10 무료 소진 · 무료 면 회색', lack10.b1.f1, '#A8A8A8');
  eq('10 무료 소진 · 남은 횟수 빨강', lack10.b1.txt, RED10);
  yes('10 기하 정지 폴링 수렴(충분 ' + s10r.ms + 'ms · 부족 ' + s10l.ms + 'ms)', s10r.ok && s10l.ok);   /* 136 */
  eq('10 기하 불변 · 10회 버튼', lack10.b2.r, rich10.b2.r);
  eq('10 기하 불변 · 30회 버튼', lack10.b3.r, rich10.b3.r);
  eq('10 기하 불변 · 무료 버튼', lack10.b1.r, rich10.b1.r);
  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '../docs/review/102-10-lack.png') });

  /* ── 136 음성 테스트 — 폴링이 «값을 굳혀» 진짜 어긋남까지 삼키지 않는지 ──
     기하 정지 폴링을 넣으면 «항상 통과하는 게이트» 가 될 위험이 있다. 일부러 3px 틀어 놓고
     같은 경로가 그것을 잡아내는지, 되돌리면 원래 값으로 돌아오는지 두 방향 모두 확인한다. */
  await p.evaluate(() => { document.querySelector('#shopList .shp-card .cbtn.b2').style.marginLeft = '3px'; });
  await settle(p, B10);
  const bent10 = await p.evaluate(probe10);
  await p.evaluate(() => { document.querySelector('#shopList .shp-card .cbtn.b2').style.marginLeft = ''; });
  await settle(p, B10);
  const back10 = await p.evaluate(probe10);
  ne('136 음성 · 3px 어긋남을 잡는다', bent10.b2.r, lack10.b2.r);
  near('136 음성 · 어긋남이 정확히 3px(반올림 아님)',
       (+bent10.b2.r.split(',')[0]) - (+lack10.b2.r.split(',')[0]), 3, 0.01);
  eq('136 음성 · 되돌리면 원래 기하', back10.b2.r, lack10.b2.r);

  /* 경계 — 다이아 1,000 = 레퍼런스 10 의 상태. 10회 노랑 / 30회 회색이 같은 프레임에 나와야 한다 */
  await open10(1000, 2);
  await p.waitForTimeout(400);
  const edge10 = await p.evaluate(probe10);
  eq('10 경계(dia=1,000) · 10회 노랑', edge10.b2.f1, '#FCEF31');
  eq('10 경계(dia=1,000) · 30회 회색', edge10.b3.f1, '#A8A8A8');
  eq('10 경계 · 10회 가격 흰색', edge10.b2.txt, WHITE);
  eq('10 경계 · 30회 가격 빨강', edge10.b3.txt, RED10);

  /* ── ③ 살아 있는 갱신 — 상점이 열린 채 재화가 변해도 색이 따라온다(재렌더 없이) ── */
  const live = await p.evaluate(async () => {
    const list = document.getElementById('shopList');
    list.scrollTop = 220;                       /* 카드 4장이라 최대 스크롤은 100 미만 — 끝까지 내린 값이 기준이다 */
    const set = list.scrollTop;
    const node = document.querySelector('#shopList .cbtn.b2');
    S.dia = 0; uiDirty = true;
    await new Promise(r => setTimeout(r, 900));
    const now = document.querySelector('#shopList .cbtn.b2');
    return { lack: now.classList.contains('lack'), sameNode: now === node, set, scroll: list.scrollTop };
  });
  eq('10 라이브 · 다이아 0 → lack 전환', live.lack, true);
  eq('10 라이브 · 카드 노드 재생성 없음', live.sameNode, true);
  yes('10 라이브 · 스크롤 위치가 0 이 아님(측정 유효)', live.set > 0);
  near('10 라이브 · 스크롤 유지(리셋 0 아님)', live.scroll, live.set, 0);

  const live2 = await p.evaluate(async () => {
    S.dia = 99999; uiDirty = true;
    await new Promise(r => setTimeout(r, 900));
    const n = document.querySelector('#shopList .cbtn.b3');
    return { rich: n.classList.contains('rich'), lack: n.classList.contains('lack') };
  });
  eq('10 라이브 · 다이아 복구 → rich 전환', live2.rich, true);
  eq('10 라이브 · lack 해제', live2.lack, false);

  /* ── ④ 기능 — 충분 상태에서 실제로 눌리고 재화가 깎이는가 ────────── */
  const fn = await p.evaluate(async ([b]) => {
    S.dia = 99999;
    Object.keys(S.daily.freeSum).forEach(k => { S.daily.freeSum[k] = 0; });
    openShopPage(b);
    await new Promise(r => setTimeout(r, 250));
    const before = S.dia;
    const btn = document.querySelector('#shopList .cbtn.b2[data-shsum="' + b + '"]');
    const wasRich = btn.classList.contains('rich');
    btn.click();
    await new Promise(r => setTimeout(r, 350));
    const spent = before - S.dia;
    /* 소환 결과 팝업이 열렸으면 그 버튼 상태도 재화를 따라야 한다 */
    const sw = document.getElementById('sumw').classList.contains('on');
    const b10 = document.getElementById('sumB10').classList.contains('lack');
    if (sw) closeSummonResult();
    return { wasRich, spent, sw, b10 };
  }, [BK]);
  eq('기능 · 클릭 전 10회 버튼 rich', fn.wasRich, true);
  near('기능 · 10연 실제 차감', fn.spent, 1000, 0);
  eq('기능 · 결과 팝업 열림', fn.sw, true);
  eq('기능 · 결과 팝업 10회 버튼 여전히 충분(잔액 98,999)', fn.b10, false);

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 80) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const bad = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY102 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
