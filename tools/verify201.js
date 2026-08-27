/* 작업 201 회귀 게이트 — 19 프로필 개편 (2026-08-27, T2 저장소 주인 지시).
   실행: node tools/verify201.js   → 마지막 줄이 `VERIFY201 n/n PASS` 여야 한다.

   주인 지시 3항:
     ① «초상화»·«프레임» 탭 폐기 — 칭호만
     ② 칭호는 **승급 성공 시에만 1개씩** 지급 (구세이브에 이미 열린 칭호는 회수 금지)
     ③ 프로필 썸네일 = **현재 입은 코스튬**

   본다:
     §1 ① 탭   `.pf-tab` 은 «칭호» 한 칸뿐이고 `.t2`/`.t3` 는 마크업·CSS·소스에서 사라졌다.
               남은 칸과 콘텐츠 패널의 기하는 측정표 19 §5-2 그대로다(삭제가 남의 앵커를
               밀지 않았는가 — LESSONS 189-①).
     §2 ② 지급 신규 세이브 = 브론즈 1칸만 보유. `endPromo(true)` 1회당 **정확히 1개**가 늘고,
               그 칸이 «장착 중» 이 된다. 실패(`endPromo(false)`)·재도전은 0개다(멱등).
     §3 ② 파생 금지 — `S.rank` 를 손으로 올려도 칭호는 안 열리고(지급 경로는 endPromo 하나),
               `S.rank` 를 내려도 이미 받은 칭호는 **회수되지 않는다**.
     §4 ② 소급 `titles` 키가 없는 구세이브(rank 3)를 넣고 reload → 4칸이 열린다.
               구 구현(`i <= S.rank` 파생)에서 이미 보이던 칸이 하나도 안 잠긴다 = 회수 금지.
               저장 KEY 는 올리지 않는다(44 교훈 2 — 구조가 아니라 값만 늘었다).
     §5 ③ 초상 19 `#pfPor` · 02 헤더 `#porCv` 둘 다 스프라이트가 그려지고 폴백 이모지는 숨는다.
               잉크가 액자 안에 있고 액자 중심에 앉는다. 배율은 **정수 2**(픽셀 아트 흐림 방지).
     §6 ③ 추종 코스튬을 갈아입으면 두 자리가 **같이** 바뀌고, 색이 50 시트 캔버스와 픽셀 동일하다
               (= 전투 렌더의 `tinted()` 와 같은 경로 — 174 «그림 = 실제 외형»).
     §7 폴백   아틀라스가 없을 때 빈 캔버스를 남기지 않고 이모지로 되돌아간다(192 교훈).
     §8 화면비 4종(1600·1920·2280·2600)에서 §1·§5 가 동일 · 프레임 밖 이탈 0 · 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 캔버스 잉크 — 픽셀 수 · bbox · 평균색 · 지문. 두 자리를 «같은 자» 로 읽는다. */
const INK = `(function(sel){
  const cv = document.querySelector(sel);
  if(!cv) return null;
  const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0,r=0,g=0,b=0,sig=0;
  for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++){
    const q=(y*cv.width+x)*4;
    if(d[q+3]<8) continue;
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    n++; r+=d[q]; g+=d[q+1]; b+=d[q+2];
    sig=(sig*31 + d[q]*7 + d[q+1]*3 + d[q+2]) % 1000000007;
  }
  return n ? { w:cv.width, h:cv.height, px:n, x0, y0, x1, y1,
               r:Math.round(r/n), g:Math.round(g/n), b:Math.round(b/n), sig,
               av:cv.dataset.cosav, sc:cv.dataset.cossc, shown:cv.style.display !== 'none' } : null;
})`;

/* 프로필 칭호 칸 — 보유·장착·자물쇠 */
const CARDS = `(function(){
  return [...document.querySelectorAll('#pfCards .pf-card')].map(c => ({
    own: c.classList.contains('own'), eq: c.classList.contains('eq'), lk: !!c.querySelector('.pf-lk'),
    n: (c.querySelector('.pf-bn>i')||{}).textContent
  }));
})`;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => window.ATLAS && window.ATLAS.knight && window.ATLAS.knight.image
    && window.ATLAS.knight.image.complete, null, { timeout: 30000 });
  await p.waitForTimeout(1200);

  /* ── §1 ① 탭 폐기 ── */
  console.log('§1 ① «초상화»·«프레임» 탭 폐기 — 칭호만');
  const d1 = await p.evaluate(() => {
    openProfile();
    void document.body.offsetHeight;
    const tabs = [...document.querySelectorAll('#pfw .pf-tab')];
    const g = e => ({ left: e.offsetLeft, top: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight });
    return {
      n: tabs.length,
      labels: tabs.map(t => t.textContent.trim()),
      on: tabs.filter(t => t.classList.contains('on')).length,
      t2: document.querySelectorAll('#pfw .pf-tab.t2, #pfw .pf-tab.t3').length,
      tab: g(tabs[0]),
      grid: g(document.querySelector('#pfw .pf-grid')),
      cards: document.querySelectorAll('#pfCards .pf-card').length
    };
  });
  eq('`.pf-tab` 칸 수', d1.n, 1);
  ok(d1.labels.join('') === '칭호', '남은 라벨 = «칭호» (' + d1.labels.join(',') + ')');
  eq('활성(on) 탭', d1.on, 1);
  eq('`.t2`/`.t3` 잔존 노드', d1.t2, 0);
  /* 189-③ «헛초록» 대비 — 마크업에서만 지우고 CSS 규칙을 남기면 다음 사람이 살아 있다고 믿는다 */
  eq('소스에 남은 `.pf-tab.t2` CSS 규칙', (SRC.match(/\.pf-tab\.t[23]\s*\{/g) || []).length, 0);
  eq('소스에 남은 «초상화»·«프레임» 탭 마크업', (SRC.match(/pf-tab t[23]/g) || []).length, 0);
  /* 측정표 19 §5-2 — 탭 y402 h69(활성 71) · left 84 w228 / 패널 (58,470) 780×544 */
  ok(d1.tab.left === 84 && d1.tab.w === 228 && d1.tab.top === 402 && d1.tab.h === 71,
    `탭 기하 그대로 (${d1.tab.left},${d1.tab.top}) ${d1.tab.w}×${d1.tab.h}`);
  ok(d1.grid.left === 58 && d1.grid.top === 470 && d1.grid.w === 780 && d1.grid.h === 544,
    `콘텐츠 패널 기하 그대로 (${d1.grid.left},${d1.grid.top}) ${d1.grid.w}×${d1.grid.h}`);
  eq('칭호 칸 수 = 계급 수', d1.cards, await p.evaluate(() => RANKS.length));

  /* ── §2 ② 승급 성공 1회 = 칭호 1개 ── */
  console.log('§2 ② 칭호는 승급 성공 시에만 1개씩');
  const d2 = await p.evaluate((CARDS) => {
    const cards = eval(CARDS);
    const out = {};
    /* 신규 상태로 되돌린다 */
    S.rank = 0; S.titles = { 0:1 }; renderProfile();
    out.start = cards(); out.startKeys = Object.keys(S.titles).length;
    /* 실패는 아무것도 주지 않는다 */
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(false); closeModal();
    out.afterLose = Object.keys(S.titles).length;
    /* 성공 1회 */
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true); closeModal();
    out.afterWin1 = Object.keys(S.titles).length; out.rank1 = S.rank;
    renderProfile(); out.cards1 = cards();
    /* 성공 2회 */
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true); closeModal();
    out.afterWin2 = Object.keys(S.titles).length; out.rank2 = S.rank;
    renderProfile(); out.cards2 = cards();
    /* 멱등 — 같은 계급 칭호를 다시 지급해도 안 는다 */
    out.regrant = grantRankTitle(S.rank);
    out.afterRegrant = Object.keys(S.titles).length;
    /* 등재 밖 index 는 칭호가 없다(RANKS 가 곧 칭호 목록) */
    out.grantOob = grantRankTitle(RANKS.length);
    return out;
  }, CARDS);
  eq('신규 세이브 보유 칭호', d2.startKeys, 1);
  eq('신규 세이브 — 열린 칸', d2.start.filter(c => c.own).length, 1);
  eq('신규 세이브 — 잠긴 칸(자물쇠)', d2.start.filter(c => c.lk).length, d1.cards - 1);
  eq('승급 실패 뒤 보유 칭호', d2.afterLose, 1);
  eq('승급 성공 1회 뒤 보유 칭호', d2.afterWin1, 2);
  eq('승급 성공 1회 뒤 열린 칸', d2.cards1.filter(c => c.own).length, 2);
  eq('승급 성공 1회 뒤 «장착 중» 칸', d2.cards1.filter(c => c.eq).length, 1);
  ok(d2.cards1[d2.rank1] && d2.cards1[d2.rank1].eq, `장착 칭호 = 현재 계급 (${d2.cards1[d2.rank1] && d2.cards1[d2.rank1].n})`);
  eq('승급 성공 2회 뒤 보유 칭호', d2.afterWin2, 3);
  eq('승급 성공 2회 뒤 열린 칸', d2.cards2.filter(c => c.own).length, 3);
  eq('같은 칭호 재지급(멱등)', d2.regrant, false);
  eq('재지급 뒤 보유 칭호', d2.afterRegrant, 3);
  eq('RANKS 밖 index 지급 거부', d2.grantOob, false);
  /* 팝업이 «획득!» 이라고 적은 것을 실제로 준다(ROUTINE 기능 완성 규칙) — 표기와 지급이 한 몸 */
  ok(/gotTtl \? '칭호 <b>'/.test(SRC), '승급 성공 팝업의 «칭호 획득» 표기가 실제 지급 결과(gotTtl)를 따른다');

  /* ── §3 ② 파생 금지 · 회수 금지 ── */
  console.log('§3 ② 파생 금지 — 계급을 손으로 움직여도 칭호는 따라가지 않는다');
  const d3 = await p.evaluate((CARDS) => {
    const cards = eval(CARDS);
    const out = {};
    S.rank = 0; S.titles = { 0:1 };
    S.rank = RANKS.length - 1;                     /* 계급만 최고로 — 지급 훅을 안 지났다 */
    renderProfile(); out.rankUp = cards().filter(c => c.own).length;
    /* 승급으로 3개까지 받은 뒤 계급을 내려도 회수되지 않는다 */
    S.rank = 0; S.titles = { 0:1 };
    for (let i = 0; i < 3; i++) { promo = { t:60, max:60, rank: nextRank() }; endPromo(true); closeModal(); }
    out.got = Object.keys(S.titles).length;
    S.rank = 1; renderProfile();
    out.afterDemote = cards().filter(c => c.own).length;
    out.eqAfterDemote = cards().findIndex(c => c.eq);
    return out;
  }, CARDS);
  eq('계급만 최고로 올렸을 때 열린 칸', d3.rankUp, 1);
  eq('승급 3회로 받은 칭호', d3.got, 4);
  eq('계급을 1 로 내린 뒤에도 열린 칸(회수 금지)', d3.afterDemote, 4);
  eq('«장착 중» 은 현재 계급을 따라간다', d3.eqAfterDemote, 1);

  /* ── §4 ② 구세이브 소급 ── */
  console.log('§4 ② 구세이브 소급 — titles 키가 없어도 이미 열려 있던 칸은 안 잠긴다');
  const SKEY = await p.evaluate(() => KEY);
  /* ⚠ localStorage 를 evaluate 로 «써 놓고 reload» 하면 안 된다 — 그 사이에 게임 루프의 자동 저장이
     메모리의 S 로 덮어써서 내가 심은 구세이브가 사라진다(실측: rank 3 을 심었는데 reload 후 1).
     `addInitScript` 는 **페이지 스크립트보다 먼저** 돌므로 그 경주가 아예 없다. */
  const rawOld = await p.evaluate(() => {
    /* 구 구현은 칭호를 «i <= S.rank» 로 파생해 보여 줬다 = rank 3 이면 4칸이 열려 있었다 */
    S.rank = 3; save();
    const d = JSON.parse(localStorage.getItem(KEY));
    delete d.titles;
    return JSON.stringify(d);
  });
  eq('넣은 구세이브에 titles 키', 'titles' in JSON.parse(rawOld), false);
  eq('넣은 구세이브의 계급', JSON.parse(rawOld).rank, 3);
  await p.addInitScript(([k, raw]) => { try { localStorage.setItem(k, raw); } catch (e) {} }, [SKEY, rawOld]);
  await p.reload();
  await p.waitForFunction(() => window.ATLAS && window.ATLAS.knight && window.ATLAS.knight.image
    && window.ATLAS.knight.image.complete, null, { timeout: 30000 });
  await p.waitForTimeout(1200);
  const d4 = await p.evaluate((CARDS) => {
    const cards = eval(CARDS);
    openProfile();
    return { rank: S.rank, keys: Object.keys(S.titles).length, own: cards().filter(c => c.own).length,
             lk: cards().filter(c => c.lk).length, key: KEY };
  }, CARDS);
  eq('reload 후 계급', d4.rank, 3);
  eq('reload 후 보유 칭호(소급)', d4.keys, 4);
  eq('reload 후 열린 칸 = 구 구현과 같다', d4.own, 4);
  eq('reload 후 잠긴 칸', d4.lk, d1.cards - 4);
  eq('저장 KEY 는 올리지 않았다(44 교훈 2)', d4.key, 'idle_hunter_save_v4');

  /* ── §5 ③ 초상 = 착용 코스튬 ── */
  console.log('§5 ③ 프로필 초상 = 현재 착용 코스튬');
  const d5 = await p.evaluate((INK) => {
    const ink = eval(INK);
    openProfile(); drawHud();
    const box = sel => { const e = document.querySelector(sel); return { w: e.clientWidth, h: e.clientHeight }; };
    return { pf: ink('#pfPor'), hud: ink('#porCv'),
             pfArt: box('#pfw .pf-por>.art'), hudArt: box('#top .pface>i'),
             pfEm: getComputedStyle(document.querySelector('#pfw .por-em')).display,
             hudEm: getComputedStyle(document.querySelector('#top .por-em')).display,
             av: cosCur() };
  }, INK);
  ok(!!d5.pf && d5.pf.px > 500, '19 팝업 초상에 스프라이트가 그려진다 (' + (d5.pf && d5.pf.px) + 'px)');
  ok(!!d5.hud && d5.hud.px > 500, '02 헤더 초상에 스프라이트가 그려진다 (' + (d5.hud && d5.hud.px) + 'px)');
  eq('19 폴백 이모지', d5.pfEm, 'none');
  eq('02 폴백 이모지', d5.hudEm, 'none');
  eq('두 자리가 같은 코스튬', d5.pf.av, d5.hud.av);
  eq('19 배율(정수)', d5.pf.sc, '2');
  eq('02 배율(정수)', d5.hud.sc, '2');
  /* 캔버스 88×92 = knight idle0 잉크(44×46)의 정수 2배 — 잉크가 캔버스를 정확히 채운다 */
  ok(d5.pf.w === 88 && d5.pf.h === 92, `캔버스 ${d5.pf.w}×${d5.pf.h} = 잉크 44×46 의 2배`);
  ok(d5.pf.x1 - d5.pf.x0 + 1 <= 88 && d5.pf.y1 - d5.pf.y0 + 1 <= 92, '잉크가 캔버스를 안 넘는다');
  near('19 잉크 가로 중심 = 캔버스 중심', (d5.pf.x0 + d5.pf.x1 + 1) / 2, 44, 2);
  /* 아트 자리 안에 들어가는가(액자 밖으로 안 튄다) */
  ok(d5.pf.w <= d5.pfArt.w && d5.pf.h <= d5.pfArt.h,
    `19 캔버스가 아트 자리(${d5.pfArt.w}×${d5.pfArt.h}) 안`);
  ok(d5.hud.w <= d5.hudArt.w && d5.hud.h <= d5.hudArt.h,
    `02 캔버스가 초상화 카드 안(${d5.hudArt.w}×${d5.hudArt.h})`);
  /* 이모지 잉크(19 ≈104px · 02 ≈66px) 대역을 벗어나 «아트 자리» 가 커지거나 작아지지 않았는가 */
  ok(d5.pf.sig === d5.hud.sig, '두 자리가 픽셀까지 같은 그림이다');
  /* 실사용 — 캔버스가 초상화 «버튼»(#profBtn) 위에 얹혔으므로 진짜 포인터 클릭이 아직 통하는지
     본다(LESSONS 65-② · 74 탭 유실). 캔버스는 이벤트를 막지 않아야 한다. */
  await p.evaluate(() => closeProfile());
  await p.waitForTimeout(200);
  /* ⚠ 시계로 기다리면 안 된다 — 19 를 닫아도 60 쥬시의 «닫힘» 연출이 도는 동안 `#pfw` 가
     그 점을 계속 덮고 있어서(실측: 400ms 뒤에도 elementFromPoint = pfw) 클릭이 오버레이로 간다.
     **그 점의 최상위 요소가 초상화 버튼 안으로 들어올 때까지** 기다린다(smoke 의 jz 대기와 같은 규칙). */
  await p.waitForFunction(() => {
    const cv = document.getElementById('porCv'); if (!cv) return false;
    const r = cv.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!(e && e.closest && e.closest('#profBtn'));
  }, null, { timeout: 5000 });
  await p.click('#top .pface canvas');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('pfw').classList.contains('on')),
    '헤더 초상 캔버스를 진짜로 클릭하면 19 프로필이 열린다(캔버스가 클릭을 안 먹는다)');

  /* ── §6 ③ 코스튬을 갈아입으면 같이 바뀐다 ── */
  console.log('§6 ③ 코스튬 추종 — 50 시트·전투와 같은 색');
  const d6 = await p.evaluate((INK) => {
    const ink = eval(INK);
    const before = { pf: ink('#pfPor'), hud: ink('#porCv') };
    const t = AVATARS.find(a => a.tint);
    S.avatars[t.id] = 1;
    const worn = wearAvatar(t.id);
    renderProfile(); drawHud();
    const after = { pf: ink('#pfPor'), hud: ink('#porCv') };
    /* 50 시트가 그리는 같은 코스튬 캔버스와 픽셀 비교 — 같은 경로인가 */
    const cv = document.createElement('canvas'); cv.width = 88; cv.height = 92;
    drawHeroTo(cv, { avatar: t.id, scale: 2, lite: true });
    const d = cv.getContext('2d').getImageData(0,0,88,92).data;
    let n=0,r=0,sig=0;
    for(let i=0;i<d.length;i+=4){ if(d[i+3]<8) continue; n++; r+=d[i];
      sig=(sig*31 + d[i]*7 + d[i+1]*3 + d[i+2]) % 1000000007; }
    return { worn, id: t.id, tint: t.tint, before, after, sheet: { px:n, r:Math.round(r/n), sig } };
  }, INK);
  eq('코스튬 착용', d6.worn, true);
  eq('19 초상이 새 코스튬을 가리킨다', d6.after.pf.av, d6.id);
  eq('02 초상이 새 코스튬을 가리킨다', d6.after.hud.av, d6.id);
  ok(d6.after.pf.sig !== d6.before.pf.sig, `19 초상 픽셀이 실제로 바뀐다 (틴트 ${d6.tint})`);
  ok(d6.after.hud.sig !== d6.before.hud.sig, '02 초상 픽셀이 실제로 바뀐다');
  eq('19 초상 = 50 시트 캔버스와 픽셀 동일', d6.after.pf.sig, d6.sheet.sig);
  eq('02 초상 = 50 시트 캔버스와 픽셀 동일', d6.after.hud.sig, d6.sheet.sig);
  eq('잉크 픽셀 수는 그대로(색만 바뀐다)', d6.after.pf.px, d6.before.pf.px);

  /* ── §7 폴백 ── */
  console.log('§7 폴백 — 아틀라스가 없으면 빈 캔버스가 아니라 이모지');
  const d7 = await p.evaluate(() => {
    const keep = ATLAS.knight.image;
    ATLAS.knight.image = null;
    porPaint(document.getElementById('pfPor'));
    porPaint(document.getElementById('porCv'));
    const out = {
      pfCv: document.getElementById('pfPor').style.display,
      hudCv: document.getElementById('porCv').style.display,
      pfEm: getComputedStyle(document.querySelector('#pfw .por-em')).display,
      hudEm: getComputedStyle(document.querySelector('#top .por-em')).display,
      pfEmTxt: document.querySelector('#pfw .por-em').textContent.trim()
    };
    ATLAS.knight.image = keep;
    porPaint(document.getElementById('pfPor'));
    porPaint(document.getElementById('porCv'));
    out.backEm = getComputedStyle(document.querySelector('#pfw .por-em')).display;
    out.backCv = document.getElementById('pfPor').style.display;
    return out;
  });
  eq('아틀라스 없음 — 19 캔버스 숨김', d7.pfCv, 'none');
  eq('아틀라스 없음 — 02 캔버스 숨김', d7.hudCv, 'none');
  ok(d7.pfEm !== 'none' && d7.hudEm !== 'none', `폴백 이모지가 뜬다 (${d7.pfEmTxt})`);
  eq('아틀라스 복귀 — 이모지 다시 숨김', d7.backEm, 'none');
  ok(d7.backCv !== 'none', '아틀라스 복귀 — 캔버스 다시 표시');

  /* ── §8 화면비 4종 · 이탈 · 콘솔 ── */
  console.log('§8 화면비 4종 · 프레임 밖 이탈 · 콘솔');
  for (const h of [1600, 1920, 2280, 2600]) {
    await p.setViewportSize({ width: 1080, height: h });
    await p.waitForTimeout(350);
    const r = await p.evaluate(() => {
      openProfile(); drawHud();
      void document.body.offsetHeight;
      const app = document.getElementById('app').getBoundingClientRect();
      const out = { tabs: document.querySelectorAll('#pfw .pf-tab').length, esc: 0 };
      /* 201 이 만들거나 옮긴 요소만 잰다. ⚠ `#pfw .pf`(패널 껍데기)는 **일부러 뺐다** —
         top431 + h1396 = 1827 이라 9:16(frameH 1600)에서 바닥 227px 이 원래부터 프레임 밖이고
         (`.pf-btn` +55 · `.pf-tgl` +187), 이는 201 과 무관한 19 구간의 결함이라 **작업 241 로 등재**했다.
         남의 결함을 내 게이트가 «측정 대상» 으로 안고 가면 빨강이 내 것처럼 보이고,
         반대로 문턱을 그 값에 맞춰 열어 주면 진짜 회귀를 못 본다(233-①). */
      ['#pfw .pf-tab', '#pfw .pf-grid', '#pfPor', '#porCv'].forEach(s => {
        document.querySelectorAll(s).forEach(e => {
          const q = e.getBoundingClientRect();
          if (q.left < app.left - 0.5 || q.right > app.right + 0.5
           || q.top < app.top - 0.5 || q.bottom > app.bottom + 0.5) out.esc++;
        });
      });
      /* 241 의 현재 값을 «표에» 남긴다(233-③) — 고쳐지면 0 이 되고, 나빠지면 여기서 먼저 보인다 */
      const pf = document.querySelector('#pfw .pf').getBoundingClientRect();
      out.pfOver = Math.round(Math.max(0, pf.bottom - app.bottom));
      const cv = document.getElementById('pfPor');
      const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
      out.ink = n;
      return out;
    });
    eq(`[${h}] 탭 1칸`, r.tabs, 1);
    eq(`[${h}] 201 구간 요소의 프레임 밖 이탈`, r.esc, 0);
    ok(r.ink > 500, `[${h}] 초상 스프라이트가 그려져 있다 (${r.ink}px)`);
    console.log('      · [' + h + '] 참고 — .pf 바닥 프레임 밖 ' + r.pfOver + 'px (201 무관 · 작업 241 등재분)');
  }
  eq('콘솔/런타임 에러', errs.length, 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY201 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
