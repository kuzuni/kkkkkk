/* 작업 167 회귀 게이트 — 23 훈련 «단계 돌파 ↑ 화살표» 손가락 안내 (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify167.js   → 마지막 줄이 `VERIFY167 n/n PASS` 여야 한다.

   주인 지시 원문: «훈련 다 상한치여서 화살표 눌러 상한 뚫어야 할 때 화살표에 손가락으로 누르라고 표시 좀».
   그래서 이 게이트가 묻는 것은 «손가락 DOM 이 있냐» 가 아니라 **«상한일 때만 · 화살표에 · 계속 · 안 가리고»** 다.

   본다:
     [A] 점등 — 3종 상한(trainReady) + 팝업 열림에서만 손가락이 뜬다.
     [B] 음성항(181 교훈 ⑥ «없앴다로도 통과하는 게이트를 쓰지 마라») — 한 종만 상한 미만이어도 안 뜬다.
         상한이어도 팝업이 닫혀 있으면 안 뜬다.
     [C] 대상 — 손이 `#trUp` 을 가리키고 링이 그 bbox 를 두른다(틈 0px).
     [D] 수명 — 113 의 8초(GM_HAND_MS)를 **넘겨서도** 살아 있다(조건형이라 안 죽는다).
         113 의 이동형 손은 여전히 8초에 죽는다(회귀).
     [E] 소멸 — ① ↑ 를 눌러 단계 돌파 ② 팝업 닫기. 둘 다에서 사라진다.
         그리고 «상한을 다시 채우면 다시 뜬다»(자기소멸이지 일회용이 아니다 — 166 ③).
     [F] 재부착 안정 — 0.35초 재렌더가 여러 번 돌아도 손 노드는 **같은 노드 그대로**다
         (매 틱 새로 만들면 «톡톡» 애니메이션이 되감겨 멈춘 것처럼 보인다).
     [G] 74 «탭 유실» 회귀 — 손·링이 화살표의 탭을 가로채지 않는다(실제 클릭이 먹는다).
     [H] 가림 — 손이 **화살표 글리프 자신**을 덮지 않는다(113 교훈 4). 화소 차분으로 잰다.
     [I] 113 우선 — 가이드 미션 이동이 167 의 손을 가져간다(방금 누른 쪽이 이긴다).
     [J] 콘솔 에러 0 (그리고 `gmHandIs` 가 TDZ 로 죽지 않는다 — 로드 직후 훈련 팝업 열기).
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const zlib = require('zlib');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 훈련 3종을 «상한» 으로 세운다. lack 을 주면 그 한 종만 1 모자라게 둔다(음성항용). */
const setTrain = (p, lack) => p.evaluate((lack) => {
  gmHandOff(); gmCloseAll(); closeModal();
  document.getElementById('statw').classList.remove('on');   /* 17 스탯업 연출이 남아 있으면 클릭을 먹는다 */
  Object.assign(S, DEF());
  S.trainStage = 1;
  TRAIN_STATS.forEach(k => S.lv[k] = trainCap() - (k === lack ? 1 : 0));
  S.gold = 1e12;
  uiDirty = true; renderUI();
}, lack || null);

const read = p => p.evaluate(() => {
  const bb = n => { if (!n) return null; const q = n.getBoundingClientRect();
    return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const gap = (a, b) => {
    if (!a || !b) return 1e9;
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    return Math.round(Math.hypot(dx, dy));
  };
  const hand = document.getElementById('fxHand'), ring = document.getElementById('fxHandR');
  const up = document.getElementById('trUp');
  return {
    hand: !!hand, ring: !!ring,
    tag: gmHand ? gmHand.tag : null,
    msInf: !!(gmHand && gmHand.ms === Infinity),
    target: gmHand && gmHand.el ? (gmHand.el.id || gmHand.el.className) : null,
    ready: trainReady(), open: document.getElementById('trw').classList.contains('on'),
    upOn: up ? up.classList.contains('on') : null,
    stage: S.trainStage,
    gapHand: gap(bb(hand && hand.querySelector('i')), bb(up)),
    gapRing: gap(bb(ring), bb(up)),
    ringWrapsUp: (() => { const a = bb(ring), b = bb(up); if (!a || !b) return false;
      return a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h; })(),
    pe: hand ? getComputedStyle(hand).pointerEvents : null,
    rpe: ring ? getComputedStyle(ring).pointerEvents : null
  };
});

/* PNG 를 라이브러리 없이 읽는다(probe167b 와 같은 경로). 크로미움 스크린샷 = 컬러타입 2 또는 6. */
function readPNG(buf) {
  let w = 0, h = 0, ct = 0, bd = 0; const idat = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(o + 8); h = buf.readUInt32BE(o + 12); bd = buf[o + 16]; ct = buf[o + 17]; }
    if (type === 'IDAT') idat.push(buf.slice(o + 8, o + 8 + len));
    o += 12 + len;
  }
  if (bd !== 8) throw new Error('bit depth ' + bd);
  const bpp = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, px = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(px, y * stride); prev = cur;
  }
  return { w, h, bpp, px };
}
const diffPct = (A, B, r) => {
  let n = 0, tot = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    if (x < 0 || y < 0 || x >= A.w || y >= A.h) continue;
    const i = (y * A.w + x) * A.bpp, j = (y * B.w + x) * B.bpp;
    tot++;
    if (Math.abs(A.px[i] - B.px[j]) > 12 || Math.abs(A.px[i + 1] - B.px[j + 1]) > 12
      || Math.abs(A.px[i + 2] - B.px[j + 2]) > 12) n++;
  }
  return tot ? +(n / tot * 100).toFixed(1) : 0;
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  /* 185 교훈 ② — «빨간 게이트는 아무도 안 본다». 구현이 통째로 없을 때 30초 뒤 스택트레이스로
     죽으면 무엇이 없는지 안 보인다. 없으면 **한 줄로 말하고** FAIL 로 내려간다. */
  try {
    await p.waitForFunction(() => typeof trHandSync === 'function' && typeof fxHand === 'function',
      null, { timeout: 8000 });
  } catch (_) {
    const have = await p.evaluate(() => ({ fxHand: typeof fxHand, trHandSync: typeof trHandSync }));
    ok(false, '167 구현이 없다 — fxHand:' + have.fxHand + ' · trHandSync:' + have.trHandSync);
    console.log('\nVERIFY167 ' + pass + '/' + (pass + fail) + ' FAIL');
    await browser.close();
    process.exit(1);
  }
  await p.waitForTimeout(400);

  console.log('[A] 점등 — 3종 상한 + 팝업 열림');
  await setTrain(p);
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(700);
  let s = await read(p);
  ok(s.ready === true, '전제: trainReady() 참 (3종 전부 상한)');
  ok(s.upOn === true, '전제: ↑ 버튼이 `.on` (누를 수 있는 상태)');
  ok(s.hand && s.ring, '손가락 + 펄스 링이 떴다');
  ok(s.tag === 'tr167', '167 의 손이다 (주인표 tr167 — 113 이동형과 구분)');

  console.log('[B] 음성항 — 조건이 아니면 안 뜬다');
  await setTrain(p, 'hp');
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(700);
  s = await read(p);
  ok(s.ready === false, '전제: 체력만 상한 −1 → trainReady() 거짓');
  ok(!s.hand && !s.ring, '한 종이라도 상한 미달이면 손가락이 안 뜬다');
  await setTrain(p);                        /* 상한 복구, 팝업은 닫힌 채 */
  await p.waitForTimeout(700);
  s = await read(p);
  ok(s.ready === true && s.open === false, '전제: 상한이지만 훈련 팝업이 닫혀 있다');
  ok(!s.hand, '팝업이 닫혀 있으면 상한이어도 안 뜬다');

  console.log('[C] 대상 — 화살표를 가리킨다');
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(700);
  s = await read(p);
  ok(s.target === 'trUp', '가리키는 대상이 `#trUp` 이다 (실측: ' + s.target + ')');
  ok(s.gapHand === 0, '손 bbox 가 화살표에 닿는다 — 틈 ' + s.gapHand + 'px');
  ok(s.ringWrapsUp, '링이 화살표 bbox 를 **감싼다**');
  ok(s.gapRing === 0, '링과 화살표 사이 틈 0px');

  console.log('[D] 수명 — 113 의 8초를 넘겨서도 산다');
  ok(s.msInf, 'gmHand.ms === Infinity (조건형)');
  const GM = await p.evaluate(() => GM_HAND_MS);
  await p.waitForTimeout(GM + 1200);
  s = await read(p);
  ok(s.hand && s.tag === 'tr167', GM + 'ms(113 의 자동 소멸 시각)+1.2초 뒤에도 살아 있다');
  /* 113 회귀 — 이동형 손은 여전히 8초에 죽는다 */
  await p.evaluate(() => { gmHandOff(); gmCloseAll(); fxHand('#tabbar'); });
  await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!document.getElementById('fxHand')), '113 회귀: 인자 없는 fxHand() 는 뜬다');
  await p.waitForTimeout(GM + 400);
  ok(await p.evaluate(() => !document.getElementById('fxHand')), '113 회귀: 인자 없는 손은 여전히 ' + GM + 'ms 에 죽는다');

  console.log('[E] 소멸 — 누르면 · 닫으면, 그리고 다시 차면 다시 뜬다');
  await setTrain(p);
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(700);
  ok((await read(p)).hand, '전제: 손가락이 떠 있다');
  await p.click('#trUp');
  await p.waitForTimeout(700);
  s = await read(p);
  ok(s.stage === 2, '↑ 클릭이 실제로 단계를 돌파했다 (1 → ' + s.stage + ')');
  await p.evaluate(() => document.getElementById('statw').classList.remove('on'));   /* 17 연출 걷기 */
  ok(!s.hand && !s.ring, '단계 돌파 뒤 손가락이 사라진다 (ready 가 거짓이 됐다)');
  /* 다시 상한까지 채우면 다시 떠야 한다 — 일회용 배지가 아니다 */
  await p.evaluate(() => { TRAIN_STATS.forEach(k => S.lv[k] = trainCap()); uiDirty = true; renderUI(); });
  await p.waitForTimeout(700);
  s = await read(p);
  ok(s.ready && s.hand && s.tag === 'tr167', '2단계 상한을 다시 채우면 손가락이 **다시** 뜬다');
  await p.evaluate(() => closeTrain());
  await p.waitForTimeout(400);
  ok(!(await read(p)).hand, '팝업을 닫으면 손가락도 걷힌다');

  console.log('[F] 재부착 — 0.35초 재렌더가 여러 번 돌아도 같은 노드');
  await setTrain(p);
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.__h0 = document.getElementById('fxHand'); });
  await p.evaluate(() => { for (let i = 0; i < 6; i++) renderTrain(); });
  await p.waitForTimeout(1400);            /* renderUI 주기(0.35s) 4번 이상 */
  const same = await p.evaluate(() => window.__h0 === document.getElementById('fxHand') && !!window.__h0);
  ok(same, '재렌더 6회 + 주기 4틱을 지나도 손 노드가 교체되지 않는다');

  console.log('[G] 74 회귀 — 탭을 가로채지 않는다');
  s = await read(p);
  ok(s.pe === 'none' && s.rpe === 'none', '손·링 둘 다 pointer-events:none');
  const atCenter = await p.evaluate(() => {
    const r = document.getElementById('trUp').getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width * 0.8, r.top + r.height * 0.8);
    return e ? (e.id || e.className) : null;
  });
  ok(String(atCenter).indexOf('fxHand') < 0, '손 한복판에서 elementFromPoint 가 손을 돌려주지 않는다 (실측: ' + atCenter + ')');
  const before = await p.evaluate(() => S.trainStage);
  await p.evaluate(() => document.getElementById('statw').classList.remove('on'));
  await p.click('#trUp');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => S.trainStage) === before + 1, '손이 떠 있는 자리를 실제로 클릭하면 단계가 오른다');

  await p.evaluate(() => document.getElementById('statw').classList.remove('on'));
  console.log('[H] 가림 — 화살표 «글리프» 를 덮지 않는다 (113 교훈 4)');
  await setTrain(p);
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(900);
  const box = await p.evaluate(() => {
    const q = document.querySelector('#trUp>svg').getBoundingClientRect();
    const u = document.getElementById('trUp').getBoundingClientRect();
    return { svg: { x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) },
             up:  { x: Math.round(u.left), y: Math.round(u.top), w: Math.round(u.width), h: Math.round(u.height) } };
  });
  const A = readPNG(await p.screenshot());
  await p.evaluate(() => { const h = document.getElementById('fxHand'), r = document.getElementById('fxHandR');
    if (h) h.style.visibility = 'hidden'; if (r) r.style.visibility = 'hidden'; });
  await p.waitForTimeout(150);
  const B = readPNG(await p.screenshot());
  const dSvg = diffPct(A, B, box.svg), dUp = diffPct(A, B, box.up);
  ok(dSvg <= 3, '↑ 글리프 화소가 손 때문에 바뀌는 비율 ' + dSvg + '% ≤ 3% (가리키는데 못 읽으면 안내가 아니다)');
  ok(dUp >= 5, '음성항: 버튼 안 어딘가에는 손이 실제로 걸쳐 있다 ' + dUp + '% ≥ 5% (연출을 지워도 통과하는 게이트 금지)');

  console.log('[I] 113 우선 — 가이드 미션 이동이 손을 가져간다');
  await p.evaluate(() => { const h = document.getElementById('fxHand'), r = document.getElementById('fxHandR');
    if (h) h.style.visibility = ''; if (r) r.style.visibility = ''; });
  await p.evaluate(() => fxHand('#tabbar'));
  await p.waitForTimeout(300);
  s = await read(p);
  ok(s.hand && s.tag === '' && s.target !== 'trUp', '113 이 부르면 167 의 손을 대신한다 (주인표 «' + s.tag + '»)');
  await p.waitForTimeout(GM + 900);        /* 113 이 8초를 채우고 죽으면 */
  s = await read(p);
  ok(s.hand && s.tag === 'tr167', '113 의 손이 죽으면 167 이 다음 틱에 조용히 되찾는다');

  console.log('[J] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0건 — ' + (errs.length ? errs.slice(0, 3).join(' / ') : '없음'));

  console.log('\nVERIFY167 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
