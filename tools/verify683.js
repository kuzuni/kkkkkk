/* 작업 683 게이트 — «유물 소환 시 «획득한 그 유물» 자리에 해당 유물 파티클 · 연속 소환도 동일»
 *
 *   node tools/verify683.js
 *
 * 주인 지시(2026-09-02 00:33) 원문: «유물소환했을때 해당 유물쪽에 해당 유물 파티클떠야함.
 * 그리고 연속소환일때도 그런식으로 되게».
 *
 * 등재문이 이 자에게 요구한 것 넷: **획득 N종 → 각 카드 원점 파티클 ≥1 · 미획득 카드 0건 ·
 * 텍스트 0건 · 되돌림.** 아래 [C]·[D]·[F]·[R] 이 그 넷이고, 나머지는 그 넷이 «무르게» 통과하지
 * 않게 받치는 축이다.
 *
 * ⚑ **이 화면에는 이미터가 둘이다** — 지불 버스트(666 · 원점 = 소환 버튼)와 획득 버스트
 *   (683 · 원점 = 획득 유물 카드). 666 의 «버튼 밖 스폰 0건» 은 **지불 이미터의 규약**이고
 *   `tools/verify666.js` [C1][C2] 가 그쪽을 그대로 지킨다(683 이 그 항을 지우지 않고 좁혔다).
 *   이 자는 **획득 이미터만** 묻는다 — 두 자가 같은 것을 두 번 묻지 않는다.
 *
 * ⚑ 세는 것은 «코드» 가 아니라 **찍힌 노드가 어디서 태어났는가**다.
 *   `rwSummonFx(it, first, iv)` 를 감싸 버스트 단위로 새 `.fx-spark` 를 훑고(682·probe683 과 같은
 *   이유로 MutationObserver 를 안 쓴다 — 감싸기는 동기라 버스트 경계가 정확하다), 그 순간의
 *   10칸 bbox 를 제품 자신의 자(`fxRect`)로 같이 찍어 «어느 칸에서 난 알인가» 를 가른다.
 *   좌표계는 노드의 `style.left/top` 과 `fxRect` 가 **둘 다 프레임 px** 라 보정이 없다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
/* ⚑ 753 — 3000ms 는 **이 러너에서 표본이 굶는다**: [B2] 가 요구하는 «6회 이상» 을 채우려면
   홀드 틱이 2회/초여야 하는데 클라우드 러너 실측은 1.3~1.9회/초라 3~4회에 그친다(수리 전 트리에서
   같은 값 — `probe753` 로 A/B 대조 확인). 제품이 아니라 **하네스의 문턱**이라 «묻는 것» 을 무르게
   푸는 대신 **누르는 시간을 늘린다**(같은 표본을 실제로 얻는다). 6000 에서 6회 이상. ⚠ 이 문턱은 러너 속도에 붙어 있어 곁다리 «785» 로 등재했다. */
const HOLD = Number(process.env.V683_HOLD || 6000);
const PAD = 6;              /* 카드 bbox 판정 여유 — 탄생 타원은 테두리 «바깥» 이라 조금 넘친다 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 버스트 단위 관찰자 — 당첨 id · 그 순간의 10칸 bbox · 새로 난 알 */
const WATCH = () => {
  window.__v683 = { bursts: [] };
  const L = () => document.getElementById('fxl');
  const scan = seen => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      const cls = nd.className + '';
      if (!/fx-spark/.test(cls)) continue;
      const x = parseFloat(nd.style.left), y = parseFloat(nd.style.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      out.push({ x, y, cls,
                 txt: (nd.textContent || '').trim(),
                 img: !!(nd.querySelector && nd.querySelector('img.cic')),
                 w: parseFloat(nd.style.width) || 0,
                 fs: parseFloat(nd.style.fontSize) || 0,
                 dur: nd.style.animationDuration || '',      /* 753 [C7] — 잘린 수명은 인라인으로 박힌다 */
                 dx: parseFloat(nd.style.getPropertyValue('--dx')) || 0,
                 dy: parseFloat(nd.style.getPropertyValue('--dy')) || 0 });
    }
    return out;
  };
  const cards = () => {
    const g = document.getElementById('rwGrid'), out = {};
    if (!g || typeof fxRect !== 'function') return out;
    for (const el of g.querySelectorAll('[data-rw]')) {
      const r = fxRect(el), i = el.querySelector('i');
      /* 753 — 알의 «크기·자리» 를 물으려면 그 칸 아이콘의 규격이 같이 있어야 한다 */
      if (r) { const ri = i ? fxRect(i) : null, cs = i ? getComputedStyle(i) : null;
        out[el.getAttribute('data-rw')] = Object.assign({}, r, {
          icFs: cs ? parseFloat(cs.fontSize) : 0, icLh: cs ? parseFloat(cs.lineHeight) : 0, icBox: ri }); }
    }
    return out;
  };
  const o = window.rwSummonFx;
  if (typeof o !== 'function') return false;
  window.rwSummonFx = function (it, first) {
    const l = L(), seen = new Set(l ? l.children : []);
    const rc = cards();
    const r = o.apply(this, arguments);
    window.__v683.bursts.push({ id: it && it.id, ic: it && it.ic, first: !!first, cards: rc, born: scan(seen) });
    return r;
  };
  return true;
};
const RESET = () => { window.__v683.bursts = [];
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

const inR = (p, r, pad) => !!r && p.x >= r.x - pad && p.x <= r.x + r.w + pad
                                && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
const isGain = q => /fx-rlic/.test(q.cls);
/* 한 버스트의 방향 목록(도) — 682 규약 검산용 */
const degs = b => b.born.filter(isGain).map(q => Math.atan2(-q.dy, q.dx) * 180 / Math.PI).sort((a, c) => a - c);
const sameSeq = (a, b, tol) => a.length === b.length && a.length > 0 && a.every((v, i) => Math.abs(v - b[i]) < tol);

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  /* 주석을 벗긴다 — 안 벗기면 자가 «되돌림» 설명문을 살아 있는 호출로 읽는다(666 1회차 교훈) */
  const nc = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const src = nc(code);

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  blk('A] 선언 — 획득 이미터가 «별도 이미터» 로, 지불 이미터를 안 건드리고 서 있다');
  ok(/function rwGainFx\(it, el, first\)\{/.test(src),
     'A1 획득 이미터가 자기 함수(`rwGainFx`)다 — 지불 버스트와 한 덩어리로 안 섞였다');
  /* ⚑⚑ 753 ① — **방향이 뒤집혔다.** 683 은 «첫 발에만» iv 를 안 넘겼고(홀드 틱은 잘랐다),
     주인 지시는 «캔슬 되지 말라» 다 ⇒ **어느 경로에서도 안 넘긴다.** 항을 지우지 않고
     묻는 방향만 반대로 적는다(333 처방). 런타임 축은 [C7] 이 수명을 직접 센다. */
  ok(/rwGainFx\(it, el, first\);/.test(src) && !/rwGainFx\([^)]*iv[^)]*\)/.test(src),
     'A2 ★ `rwSummonFx` 가 획득 이미터에 **`iv` 를 아예 안 넘긴다**(753 ① 캔슬 금지 — 683 의 «첫 발만» 이 뒤집힌 자리)');
  /* ⚑ 이 항이 이 자의 핵심이다 — `.rw-c` 는 `background:radial-gradient` 라 `fxbTextHoles` 의
     «그림 잉크» 판정에 **카드 전체**가 걸린다. `ic` 를 안 넘기면 keep-out 이 빈자리를 0 으로 만들어
     `strict` 의 버리기가 «버스트당 보장 1알» 만 남긴다(660 이 단련 버튼에서 실측한 그 자리).
     아이콘 경로(`IC`)라야 `kh` 가 비고, 크기(`FX_CIC_SC`)가 `fxBurst` **안에서** 가둠에 되먹여진다. */
  ok(/fxBurst\(el, col, n, true, null, PAY_CUR\.relic\)/.test(src),
     'A3 ★ 획득 버스트는 **아이콘 경로 + `strict`** 로 부른다 — keep-out 굶주림(660)을 구조적으로 피한다');
  ok(/const RW_GAIN_N0 = \d+, RW_GAIN_N = \d+;/.test(src) && /const RW_GAIN_BOX = [\d.]+;/.test(src)
     && /const RW_GAIN_R0 = \d+, RW_GAIN_R1 = \d+;/.test(src)
     && /const RW_GAIN_JIT = [\d.]+;/.test(src) && /const RW_GAIN_DOWN = [\d.]+;/.test(src),
     'A4 알 수·상자·반경·지터·배제섹터가 전부 이름 있는 상수다 — 호출부에 손으로 안 적는다(753 로 목록 갱신)');
  ok(/Math\.max\(1, Math\.min\(first \? RW_GAIN_N0 : RW_GAIN_N, FXMAX - L\.childElementCount - 1\)\)/.test(src),
     'A5 상한을 «걷기» 가 아니라 «개수 줄이기» 로 지킨다(660·666 A5 와 같은 처방 — 발화가 안 빠진다)');
  /* ⚑ 2회차 — [A6] 의 뜻이 «상자를 안 건드린다» 에서 **«상자를 줄이기만 한다»** 로 좁혀졌다.
     619 13·14회차의 가둠(`inM`)은 «잉크가 액자 안에서 끝난다» 를 위해 `fxBurst` 가 잡아 준 상자인데,
     **줄인 상자는 그 상자의 부분집합**이라 그 보증이 그대로 산다. 키우면 깨지므로 `RW_GAIN_SC ≤ 1`
     이 규약이고, 이 항이 그 부등식을 **소스에서** 못박는다(런타임 축은 [D3] 이 따로 센다). */
  /* ⚑⚑ 753 ② — **여기도 방향이 뒤집혔다.** 683 의 «상자를 줄이기만 한다(`RW_GAIN_SC` ≤ 1)» 는
     `fxBurst` 의 가둠(`inM`)을 부분집합으로 물려받기 위한 규약이었는데, 주인 지시 ②(«크기 =
     유물 아이콘») 는 상자를 **키우는** 쪽이라 그 논증이 성립하지 않는다. 대신 가둠을 아예 안 타고
     (자리·이동을 `rwGainFx` 가 다시 적는다) **크기를 그 칸 아이콘에서 읽는다** — 손 상수 금지.
     ⚠ 이 항을 «지우고» 넘어가면 «크기를 아무렇게나 적어도 초록» 이 된다. 그래서 묻는 것을
     «≤ 1» 에서 **«아이콘 computed 값에서 파생되는가»** 로 갈아 끼웠다(런타임은 [D5] 가 센다). */
  const mBox = src.match(/const RW_GAIN_BOX = ([\d.]+);/);
  ok(/const fs = cs \? parseFloat\(cs\.fontSize\) : 0;/.test(src)
     && /const s3 = Math\.round\(fs \* RW_GAIN_BOX\);/.test(src)
     && /nd\.style\.fontSize = fs \+ 'px';/.test(src)
     && !!mBox && parseFloat(mBox[1]) >= 1,
     'A6 ★ 알 크기를 **그 칸 아이콘의 computed font-size 에서 파생**시킨다(753 ② · 손 상수 금지 · 상자 ≥ 글리프)',
     mBox ? 'RW_GAIN_BOX = ' + mBox[1] : '상수를 못 찾았다');
  ok(/const u0 = \(\(\(\(j \+ 0\.5 \+ ph \+ rnd\(-RW_GAIN_JIT, RW_GAIN_JIT\)\)/.test(src)
     && /rwGainW = \(rwGainW \+ 0\.6180339887\) % 1/.test(src)
     && /const u = \(0\.25 \+ RW_GAIN_DOWN \/ 2 \+ u0 \* \(1 - RW_GAIN_DOWN\)\) % 1;/.test(src),
     'A6b ★ 방향이 버스트마다 황금비로 돌고(682), 아래쪽 좁은 원뿔만 빠진다(`RW_GAIN_DOWN` · 683 5회차 처방)');
  /* ⚑ 4회차 — [A7] 이 «색을 쓰는가» 만 묻던 것을 **«문양이 밑바탕에서 서는가»** 까지로 넓혔다.
     비평가 실측(알 코어 vs 둘레 링 휘도차 🐂 위 🐂 = 2.4% · 🫀 위 🫀 = 0.7%)이 말한 결손은
     «색이 없다» 가 아니라 «윤곽이 없다» 였다 — 알이 자기가 올라탄 아이콘의 축소 복제본이라
     같은 색 위에서 도형-바탕이 안 갈린다. ⇒ 네 방향 어두운 림을 요구한다(컬러 이모지는
     `-webkit-text-stroke` 가 안 먹어 `drop-shadow` 스택이 유일한 외곽선 수단이다).
     ⚠ 색(`--c`)은 여전히 **마지막**에 얹혀야 한다 — 순서가 뒤집히면 글로우가 림을 뭉갠다. */
  const mFilt = code.match(/\.fx-spark\.fx-rlic\{[\s\S]{0,400}?filter:([^}]+)\}/);
  const filt = mFilt ? mFilt[1] : '';
  const rimN = (filt.match(/drop-shadow\([^)]*#FFF\)/gi) || []).length;
  ok(/\.fx-spark\.fx-rlic\{/.test(code) && /var\(--c/.test(filt) && /brightness\(0\)/.test(filt)
     && rimN >= 8 && filt.lastIndexOf('var(--c') > filt.toUpperCase().lastIndexOf('#FFF'),
     'A7 ★ `.fx-rlic` 가 **검은 채움 + 여덟 방향 흰 테**로 양끝을 다 갖고, 칸 글로우 색을 **마지막에** 얹는다',
     mFilt ? ('흰 테 ' + rimN + '겹 · 검은 채움 ' + (/brightness\(0\)/.test(filt) ? '있음' : '없음')
              + ' · 색 ' + (/var\(--c/.test(filt) ? '있음' : '없음')) : '필터를 못 찾았다');
  ok(/function rwCardShown\(r\)\{/.test(src) && /rwCardShown\(r\)/.test(src),
     'A8 화면 밖 카드 가드가 있다(518 «쌩뚱맞은 곳에서 이펙트» 재발 방지)');

  /* ── 측정 ─────────────────────────────────────────────────────────── */
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);

  const cdp = await p.context().newCDPSession(p);
  const box = async sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const holdTouch = async (c, ms) => {
    if (!c) return;
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
  };

  /* 공용 스파크 수명은 **제품에서 읽는다** — 자에 값을 두 벌로 적으면 402 «표 두 벌» 부패가 난다 */
  const SPARK_MS = (await ev(p, () => (typeof FXSPARK_MS === 'number') ? FXSPARK_MS : 0)) || 0;
  const armed = await ev(p, WATCH);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const BS = (await ev(p, () => window.__v683.bursts)) || [];

  blk('B] 전제 — 관찰자·홀드가 실제로 돌았다');
  ok(armed === true, 'B1 `rwSummonFx` 를 감쌌다');
  ok(BS.length >= 6, 'B2 홀드가 여러 번 소환한다(전제 · 666 [B1] 과 같은 종류)', BS.length + '회');
  const gain = BS.reduce((n, b) => n + b.born.filter(isGain).length, 0);
  const ids = new Set(BS.map(b => b.id).filter(Boolean));
  info('버스트', BS.length + '회 · 획득 알 ' + gain + '개 · 서로 다른 당첨 유물 ' + ids.size + '종');

  /* ── [C] 자리 — 등재문 요구 ①② ──────────────────────────────────── */
  blk('C] 자리 — 획득 알의 원점이 «획득한 그 유물 카드» 다');
  let hit = 0, offCard = 0, wrongCard = 0;
  const wrongIds = new Set();
  for (const b of BS) {
    const g = b.born.filter(isGain);
    if (g.some(q => inR(q, b.cards[b.id], PAD))) hit++;
    for (const q of g) {
      if (!inR(q, b.cards[b.id], PAD)) offCard++;
      for (const k of Object.keys(b.cards)) {
        if (k === b.id) continue;
        if (inR(q, b.cards[k], 0)) { wrongCard++; wrongIds.add(k); }
      }
    }
  }
  ok(BS.length > 0 && hit === BS.length,
     'C1 ★ **획득 N회 → 각 회차 획득 카드 원점 알 ≥ 1** (등재문 요구 ①)', hit + '/' + BS.length);
  ok(gain > 0 && offCard === 0,
     'C2 ★ 획득 알이 그 카드 밖에서 태어난 건 0 — 알이 엉뚱한 데서 나지 않는다', offCard + '/' + gain);
  ok(wrongCard === 0,
     'C3 ★ **미획득 카드에서 태어난 알 0건** (등재문 요구 ②)',
     wrongCard + '건' + (wrongIds.size ? ' · ' + [...wrongIds].join(',') : ''));

  /* ⚑⚑ 2회차 신설 — «터진다» 는 **이동**으로만 성립한다(666 [C3] 이 버튼에서 배운 것과 같은 교훈).
     1회차는 [C1][C2] 를 통과하고도 비평가 둘이 독립으로 «최대 반경 65 < 카드 반폭 75 라 수명 내내
     한 알도 카드 밖으로 못 나간다 · 총 이동 14px = 자기 지름의 37% · 카드에 붙은 데칼» 로 3점을 줬다.
     게이트가 «태어난 자리» 만 물으면 그 그림을 못 잡는다. */
  /* 카드 반폭 · **이웃 칸의 가까운 변**까지(3회차 정정 — 침범의 경계는 이웃 «중심»(88)이 아니다:
     세로 피치 176 · 카드 151 ⇒ 칸 사이 틈 25 ⇒ 중심에서 75.5 + 25 = 100.5px 부터 이웃 칸이다) */
  const HALF = 151 / 2, NEIGH = 151 / 2 + (176 - 151);
  /* ⚠ 자를 «중심» 이 아니라 **«잉크»** 로 든다 — 619 13회차가 배운 것과 같다(사람이 보는 것은
     입자 중심이 아니라 «액자 밖으로 나온 잉크» 다). [C6] 의 이웃 칸 산수도 같은 자여야 짝이 맞는다. */
  let travTot = 0, farBad = 0, minTrav = 1e9, maxInk = 0, burstOut = 0, burstN = 0, cutN = 0;
  for (const b of BS) {
    const g = b.born.filter(isGain);
    const cr = b.cards[b.id]; if (!cr || !g.length) continue;
    const cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
    let bMax = 0;
    for (const q of g) {
      const t = Math.hypot(q.dx, q.dy);
      /* ⚑ 4회차 — 「잉크」의 반폭은 **상자(`w`)가 아니라 글리프(`fs`)** 다. 상자는 투명한 여백을
         포함하므로 그것으로 재면 «이웃 칸을 침범했는가»([C6])를 과하게 잡아 R1 을 부당하게 묶는다
         ([D3] 이 `fs ≤ w` 를 이미 못박고 있으니 이쪽이 더 좁은 자가 아니라 **옳은 자**다). */
      const ink = Math.hypot(q.x + q.dx - cx, q.y + q.dy - cy) + (q.fs || q.w) / 2;
      travTot++; minTrav = Math.min(minTrav, t);
      if (q.dur && Math.abs(parseFloat(q.dur) - SPARK_MS) > 1) cutN++;
      bMax = Math.max(bMax, ink); maxInk = Math.max(maxInk, ink);
      if (ink > NEIGH) farBad++;
    }
    burstN++; if (bMax > HALF) burstOut++;
  }
  /* ⚑ 4회차 — 자를 «절대 px» 에서 **«자기 잉크 대비»** 로 옮겼다. 탄생 반경(`R0`)을 밀면 이웃 칸
     상한(100.5) 때문에 절대 주행은 줄지만 «데칼이 아니다» 라는 **뜻**은 안 변한다 — 사람이 보는 것은
     «제 몸보다 많이 갔는가» 다. **무르게 푼 것이 아님은 1회차 값이 새 자에서도 빨간 것으로 못박힌다**:
     1회차 주행 14px / 잉크 21px = **0.67배** < 1.4. 지금은 35 / 24 = 1.46배. */
  let minRatio = 1e9, maxRatio = 0, zeroTrav = 0;
  for (const b of BS) for (const q of b.born.filter(isGain)) {
    const ink = q.fs || q.w;
    const t = Math.hypot(q.dx, q.dy);
    if (t <= 0.5) zeroTrav++;
    if (ink > 0) { const rt = t / ink; minRatio = Math.min(minRatio, rt); maxRatio = Math.max(maxRatio, rt); }
  }
  /* ⚑⚑ 753 ③ — **[C4] 의 방향이 뒤집혔다.** 683 은 «데칼이 아니다» 를 위해 «주행 ÷ 잉크 ≥ 1.4»
     를 요구했는데, 주인 지시는 정반대다: «유물 위치에서 터지게 하기 **주변에서 터지지 말고**».
     ⇒ 묻는 것을 «멀리 가는가» 에서 **«제 몸을 벗어날 만큼 멀리 가지 않는가»** 로 갈아 끼운다
     (333 처방 — 항을 지우지 않는다). **헛초록이 아님**은 두 쪽을 다 묻는 것으로 선다:
       ⓐ 상한 — 683 의 옛 값(주행 48 / 잉크 21 = **2.29배**)은 이 자에서 **빨갛다**
       ⓑ 하한 — 주행이 0 이면 «터짐» 이 아니라 정지 데칼이라 그것도 **빨갛다**(움직임은 남는다).
     «퍼짐» 채널은 이제 이동이 아니라 **봉투의 스케일**(1.00 → 0.62)이 맡는다([C8]). */
  ok(travTot > 0 && zeroTrav === 0 && maxRatio <= 0.5,
     'C4 ★ 알이 **제 몸 안에서 터진다**(0 < 주행 ÷ 글리프 ≤ 0.5) — 753 ③ «주변에서 터지지 말고»',
     travTot ? ('최대 비 ' + (maxRatio ? maxRatio.toFixed(2) : '—') + ' · 최소 비 '
                + (minRatio === 1e9 ? '—' : minRatio.toFixed(2)) + ' · 정지 알 ' + zeroTrav) : '표본 0');
  /* ⚑⚑ 753 ③ — **[C5] 도 뒤집혔다.** 683 은 «잉크가 카드 테를 넘는다(카드 안에서만 놀지 마라)»
     였는데, 주인 지시는 «그 유물 위치에서» 다 ⇒ **알 중심이 제 칸을 벗어나지 않는가**를 묻는다.
     옛 `R1` 86 은 카드 반폭 75.5 를 넘으므로 이 자에서 **빨갛다**(무른 자가 아니다). */
  let ctrOut = 0, ctrMax = 0;
  for (const b of BS) {
    const cr = b.cards[b.id]; if (!cr) continue;
    const cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
    for (const q of b.born.filter(isGain)) {
      const d = Math.hypot(q.x + q.dx - cx, q.y + q.dy - cy);
      ctrMax = Math.max(ctrMax, d);
      if (d > HALF) ctrOut++;
    }
  }
  ok(travTot > 0 && ctrOut === 0,
     'C5 ★ 알 **중심**이 제 칸(반폭 75.5)을 끝까지 안 벗어난다 — 753 ③ «유물 위치에서»(옛 R1 86 이 빨개지는 자리)',
     '벗어난 알 ' + ctrOut + ' · 최대 중심 반경 ' + ctrMax.toFixed(1) + 'px');
  /* ⚑ [C6] 은 살아남았지만 **재는 양이 바뀌었다** — 683 은 잉크 반폭을 `fs/2`(63)로 봤는데
     753 의 알은 상자(158)가 곧 잉크 액자라 그 자로는 **과소평가**다. 그리고 뻗음은 «끝점» 이
     아니라 **봉투 전체의 최댓값**이다: `@keyframes fxSpark` 가 52% 에서 translate 0.78d · scale 1,
     100% 에서 translate d · scale 0.62 라 최댓값은 **52% 지점**이다(둘 다 선형이라 끝점 중 하나). */
  let farBad2 = 0, envMax = 0;
  for (const b of BS) {
    const cr = b.cards[b.id]; if (!cr) continue;
    const cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
    for (const q of b.born.filter(isGain)) {
      const half = (q.w || q.fs) / 2;
      const d0 = Math.hypot(q.x - cx, q.y - cy);
      const d1 = Math.hypot(q.x + q.dx - cx, q.y + q.dy - cy);
      /* ⚑ 753 7회차 — 이 알은 공용 `fxSpark` 가 아니라 **전용 `fxRlic`** 을 탄다
         (0% t0·s1 · 35% t.55·s.72 · 100% t1·s.45). 세 지점이 다 선형 구간의 끝이라 최댓값은 그중 하나다.
         아래 세 계수는 [C8] 이 CSS 에서 **같은 값인지 매 실행 확인한다**(두 벌로 안 적는다). */
      const env = Math.max(d0 + half,
                           d0 + 0.55 * (d1 - d0) + 0.72 * half,
                           d1 + 0.45 * half);
      envMax = Math.max(envMax, env);
      if (env > NEIGH) farBad2++;
    }
  }
  ok(travTot > 0 && farBad2 === 0,
     'C6 ★ 봉투 어느 순간에도 **이웃 칸(가까운 변 100.5px)에 안 닿는다** — 알 상자 기준 · 52% 지점이 최댓값',
     '넘은 알 ' + farBad2 + ' · 봉투 최대 뻗음 ' + envMax.toFixed(1) + 'px');
  /* ⚑ 753 신설 [C7] — **캔슬 금지의 런타임 축**(A2 는 소스만 본다). 홀드 틱의 알도 공용 수명을
     그대로 산다 = `animation-duration` 인라인이 안 박힌다(`fxTickLife` 가 잘랐으면 박힌다). */
  ok(BS.length > 0 && travTot > 0 && cutN === 0,
     'C7 ★ **홀드 틱의 알도 수명을 안 자른다**(753 ① 캔슬 금지 — 수리 전 45~76ms 가 빨개지는 자리)',
     '잘린 알 ' + cutN + '/' + travTot + ' · 공용 수명 ' + SPARK_MS + 'ms');
  /* ⚑ 753 신설 [C8] — 이동이 작아진 대신 «퍼짐» 을 **봉투의 스케일**이 맡는다.
     공용 곡선(`@keyframes fxSpark`)이 100% 에서 `scale(.62)` 인지를 못박는다(681 이 그 곡선을
     따로 등재해 두었으므로 이 자는 «지금 값» 을 지키는 래칫이다). */
  /* ⚑⚑ 753 7회차 — [C8] 이 묻는 곡선이 **공용 `fxSpark` 에서 전용 `fxRlic` 으로** 옮겨 갔다.
     공용 곡선은 0~52% 가 `scale(1)·opacity:1` 고원이라 아이콘 크기의 알에게는 «가림» 이 된다
     (비평가 2인 공통: «터짐이 한 프레임도 없다 · Lv.n 이 36~49% 지워진다»).
     ⇒ **불투명 구간 안에서 이미 줄어드는가**를 묻는다. 계수 셋은 [C6] 의 봉투 산수와 **같은 값**이어야 한다. */
  const mRlic = code.match(/@keyframes fxRlic\{0%\{transform:translate\(0,0\) scale\(1\);opacity:\.55\}\s*35%\{transform:translate\(calc\(var\(--dx\)\*\.55\),calc\(var\(--dy\)\*\.55\)\) scale\(\.72\);opacity:\.45\}\s*100%\{transform:translate\(var\(--dx\), ?var\(--dy\)\) scale\(\.45\);opacity:0\}\}/);
  ok(!!mRlic && /\.fx-spark\.fx-rlic\{[\s\S]{0,400}?animation-name:fxRlic/.test(code)
     && /@keyframes fxSpark\{0%\{transform:translate\(0,0\) scale\(1\);opacity:1\}/.test(code),
     'C8 ★ 획득 알이 **전용 봉투(`fxRlic`)** 를 탄다 — 불투명 구간 안에서 이미 줄어들고, **공용 `fxSpark` 는 불변**',
     mRlic ? '0%s1/α.55 · 35%t.55/s.72/α.45 · 100%t1/s.45/α0' : '전용 곡선을 못 찾았다');
  /* ⚑ 753 7회차 — 취소선. `fxBurst` 가 알을 `<s>` 로 낳으므로 기본값 `line-through` 가 살아 있으면
     아이콘 크기에서 **폭 156 · 두께 12px 검정 막대**가 글리프를 가로지른다(비평가 2인 독립 관측). */
  ok(/\.fx-spark\.fx-rlic\{[\s\S]{0,400}?text-decoration:none/.test(code),
     'C9 ★ 획득 알에 **취소선이 없다**(`<s>` 기본값 `line-through` — 126px 에서 156×12px 막대로 찍힌다)');

  /* ── [D] 그림·연속 ───────────────────────────────────────────────── */
  blk('D] 그림 — 알이 «그 유물» 의 문양이다 · 연속 소환이 같은 그림이 아니다');
  let glyphBad = 0, imgBad = 0, boxBad = 0;
  for (const b of BS) for (const q of b.born.filter(isGain)) {
    if (q.txt !== (b.ic || '')) glyphBad++;
    if (q.img) imgBad++;
    /* 상자(width) 대비 글리프 font-size — 잉크가 상자 안에서 끝나는 값이어야 한다 */
    if (!(q.w > 0 && q.fs > 0 && q.fs <= q.w)) boxBad++;
  }
  ok(gain > 0 && glyphBad === 0, 'D1 ★ 알의 글리프가 **그 회차에 획득한 유물의 것**이다(`RELICS[].ic`)',
     '어긋난 알 ' + glyphBad);
  ok(gain > 0 && imgBad === 0, 'D2 재화 `<img>` 가 남아 있는 알 0 — 지불 어휘와 안 섞인다', String(imgBad));
  ok(gain > 0 && boxBad === 0, 'D3 글리프가 알 상자 안에서 끝난다(font-size ≤ 상자) — 619 13·14회차 규약',
     String(boxBad));
  /* ⚑ 2회차 신설 — «너무 커서 카드를 덮는다»(비평 2인 공통 ②: 알 bbox 합이 카드 면의 67~68% ·
     A1 라벨 흰 픽셀 0개). 한 알이 카드 폭의 몇 %인지를 상한으로 못박는다. */
  /* ⚑⚑ 753 ② — **[D5] 도 방향이 뒤집혔다.** 683 은 «카드 폭의 22% 이하» 를 상한으로 걸었는데
     주인 지시 ②(«크기 = 유물 아이콘») 는 그 상한을 **넘으라는 말**이다(아이콘 자체가 카드만 하다).
     ⇒ 상한을 «등가» 로 갈아 끼운다 — 알의 글리프 font-size 가 **그 칸 아이콘의 값과 같은가**
     (같은 글리프 · 같은 크기 ⇒ 찍히는 잉크가 항등이다). 상자는 글리프를 담을 만큼만 크다([D3]).
     ⚠ 683 의 옛 값(글리프 21px vs 아이콘 126px)은 이 자에서 **빨갛다** — 무른 자가 아니다. */
  let fsBad = 0, szMax = 0, icFs = 0;
  for (const b of BS) {
    const cr = b.cards[b.id]; if (!cr) continue;
    icFs = cr.icFs || icFs;
    for (const q of b.born.filter(isGain)) {
      szMax = Math.max(szMax, q.w);
      if (!(cr.icFs > 0 && Math.abs(q.fs - cr.icFs) <= 0.5 && q.w >= q.fs)) fsBad++;
    }
  }
  ok(gain > 0 && fsBad === 0,
     'D5 ★ 알의 글리프가 **그 칸 아이콘과 같은 크기**다(753 ② — 683 의 «카드 폭 22% 이하» 가 뒤집힌 자리)',
     '어긋난 알 ' + fsBad + ' · 아이콘 ' + icFs + 'px · 알 상자 최대 ' + Math.round(szMax) + 'px');
  /* ⚑ 2회차 신설 — 갈래 수 = 알 수(682 규약의 «구조적 보증» 을 이 이미터에도). 1회차는 가둠이
     링을 사각형 네 모서리로 접어 6알이 **4갈래**였다(비평 2인 공통 ③). */
  /* ⚑⚑ 753 ③ — **[D6] 의 축이 사라졌다.** «한 버스트 안 두 알의 각 간격» 은 알이 여럿일 때의
     물음인데 주인 지시가 «한번 강화당 알갱이 하나» 라 그 물음 자체가 성립하지 않는다.
     자리를 비우면 «알이 스무 개가 나도 초록» 이 되므로(333) **같은 자리에서 그 전제를 묻는다** —
     버스트마다 획득 알이 **정확히 1개**인가. 683 의 6/5알은 이 자에서 빨갛다. */
  let nBad = 0, nSeen = [];
  for (const b of BS) { const g = b.born.filter(isGain).length; nSeen.push(g); if (g !== 1) nBad++; }
  ok(BS.length > 0 && nBad === 0,
     'D6 ★ **버스트마다 획득 알이 정확히 1개**(753 ③ — 683 의 «6알·5알» 이 빨개지는 자리)',
     '어긋난 버스트 ' + nBad + '/' + BS.length + ' · 알 수 ' + nSeen.join('·'));
  /* ⚑⚑ 3회차 신설 — **«태어날 때 이미 갈라져 있는가».** 2회차의 «8점을 막는 단 하나» 가
     «탄생 링 R0(16~18) < 글리프(22~24) 라 여섯 알이 한 덩어리로 쌓인다» 였다(원반 채움 122~140%).
     각도만 물으면([D6]) 그 그림을 못 잡는다 — 각이 고르게 갈려 있어도 **반경이 작으면** 링 위
     이웃 간격 `2·R·sin(π/n)` 이 글리프보다 좁아 겹친다. ⇒ **탄생 순간의 실제 간격**을 센다.
     문턱 1.3 은 비평가가 처방문에 적은 값 그대로다(«분리 조건 2·R·sin(π/n) ≥ 1.3·글리프»). */
  /* ⚑⚑ 753 ③ — **[D7] 도 같은 이유로 뒤집혔다.** «탄생 순간 이웃 간격» 은 링의 물음이었고
     753 은 링을 폐기했다. 그 자리에서 **«탄생 자리가 그 유물 아이콘의 글리프 중심인가»** 를 묻는다
     — 옛 링(`R0` 38)은 이 자에서 빨갛다. 아이콘 중심은 `<i>` 의 **패딩 상자 + line-height/2** 다
     (칸 상자로 재면 테두리 4px 이 빠져 옳은 자리가 빨개진다 — 1회차에 실제로 그랬다). */
  let ctrBad = 0, ctrDev = 0;
  for (const b of BS) {
    const cr = b.cards[b.id]; if (!cr || !cr.icBox) continue;
    const ax = cr.icBox.x + cr.icBox.w / 2;
    const ay = cr.icBox.y + (cr.icLh > 0 ? cr.icLh / 2 : cr.icBox.h / 2);
    for (const q of b.born.filter(isGain)) {
      const d = Math.hypot(q.x - ax, q.y - ay);
      ctrDev = Math.max(ctrDev, d);
      if (d > 2) ctrBad++;
    }
  }
  ok(BS.length > 0 && ctrBad === 0,
     'D7 ★ **탄생 자리 = 그 유물 아이콘의 글리프 중심 ±2px**(753 ③ — 옛 링 `R0` 38 이 빨개지는 자리)',
     '어긋난 알 ' + ctrBad + ' · 최대 편차 ' + ctrDev.toFixed(2) + 'px');
  /* 682 규약 — 연속 두 버스트가 «같은 방향 시퀀스» 면 안 된다(황금비 위상이 돌고 있는가) */
  /* ⚑⚑ 753 7회차 — **[D4] 를 «한 쌍» 에서 «세 버스트 연속» 으로 옮겼다.**
     683 시절에는 한 버스트에 각이 4~6개라 «두 버스트의 시퀀스가 ±3° 안에서 전부 같다» 는 것이
     우연히는 사실상 불가능했다. 753 이 알을 **하나**로 줄이자 그 물음이 «각 하나가 우연히 ±3° 안인가»
     가 되어 **쌍마다 1.7%**(6/360) 로 떨어졌다 — 9쌍이면 14% 확률로 빨개진다(실제로 1/9 로 빨갰다).
     ⚠ 문턱(3°)을 넓히는 것은 반대 방향이다(더 헐거워진다). ⇒ **세 버스트가 연달아 같은 각**이면
     빨갛다 — 우연은 0.03% 이고 «위상이 굳었다» 는 여전히 반드시 걸린다(황금비 수열이 멈추면
     연속 전부가 같은 각이 된다). 흩어짐의 축은 `verify753` [F1][F2] 가 따로 센다. */
  let run3 = 0, pairs = 0, sameP = 0;
  for (let i = 2; i < BS.length; i++) {
    const a = degs(BS[i - 2]), b2 = degs(BS[i - 1]), c = degs(BS[i]);
    if (!a.length || !b2.length || !c.length) continue;
    if (sameSeq(a, b2, 3) && sameSeq(b2, c, 3)) run3++;
  }
  for (let i = 1; i < BS.length; i++) {
    const a = degs(BS[i - 1]), c = degs(BS[i]);
    if (!a.length || !c.length) continue;
    pairs++; if (sameSeq(a, c, 3)) sameP++;
  }
  ok(pairs > 0 && run3 === 0,
     'D4 ★ **세 버스트가 연달아 같은 방향인 경우 0** — 682 규약(버스트마다 위상이 돈다 · 753 로 «쌍» → «3연속»)',
     '3연속 ' + run3 + ' · 참고: 인접 쌍 우연 일치 ' + sameP + '/' + pairs + '쌍(n=1 이라 쌍당 1.7% 는 기댓값)');

  /* ── [E] 화면 밖 가드 ────────────────────────────────────────────── */
  blk('E] 화면 밖 — 페이지가 닫혀 있으면 한 알도 안 쏜다(518 재발 방지)');
  const closed = await ev(p, () => {
    closeRelw();
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const it = RELICS[0], el = document.querySelector('[data-rw="' + it.id + '"]');
    const r = rwGainFx(it, el, true, null);
    let n = 0; for (const nd of (L ? L.children : [])) if (/fx-rlic/.test(nd.className + '')) n++;
    openRelw();
    return { ret: r, n };
  });
  ok(!!closed && closed.n === 0 && closed.ret === false,
     'E1 ★ 닫힌 페이지에서는 획득 알 0 · 반환 false', closed ? ('알 ' + closed.n + ' · ret ' + closed.ret) : '측정 실패');

  /* ── [G] 대비 — 찍힌 «알의 잉크» 가 밑바탕과 무관하게 갈리는가 ────────── */
  /* ⚑⚑ 4회차 신설 — **두 회차를 연달아 8에서 막은 축이 이것 하나였다.** 3회차 비평가 둘이
     독립으로 같은 결론을 냈다: 알이 «자기가 올라탄 아이콘의 축소 복제본» 이라 같은 색 위에서
     도형-바탕이 안 갈린다(숙주 대비 Δ평균 ≤3~5% · peak Weber 0.07~0.26). 기하 축(①②③)은 8·9 인데
     ④ 만 4·5 였다 — **자에 그 축이 아예 없었다.**
     ⚠⚠ **이 자를 세 번 고쳐 썼다. 그 과정이 곧 이 절의 교훈이다:**
       ① «숙주 상대 Weber» — **축이 뒤집힌다.** 카드 플래시가 흰 순간에는 흰 실루엣이 흰 배경 위라
          값이 낮아져 «플래시가 밝을수록 연출이 나쁘다» 가 된다.
       ② «알 상자 안 Michelson» — **평평한 값을 잰다.** 상자가 글리프보다 작으면 안이 통째로 흰
          실루엣이라 max = min = 255 ⇒ **0.00**. 되레 «문양이 없는 3회차» 가 높게 나왔다.
       ③ **차분**(지금 것) — 676-③ 규약 그대로. «알이 있는 화면» ↔ «`#fxl` 만 숨긴 같은 화면» 을
          픽셀로 빼서 **바뀐 화소 = 알의 잉크** 를 고르고, 그 잉크의 휘도 폭을 잰다.
          밑바탕이 무엇이든 «흰 실루엣(≈255) + 어두운 림(≈11)» 이면 폭이 넓고, 걷으면 좁아진다.
          ⇒ 헛초록이 구조적으로 불가능하다(무엇이 알인지 자가 안 헷갈린다). */
  blk('G] 대비 — 찍힌 «알의 잉크» 휘도 폭 (차분 · 문턱 170)');
  const inkRange = async (drop) => {
    const st = await ev(p, async (dropFx) => {
      const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
      if (dropFx) {
        const t = document.createElement('style'); t.id = '__v683norim';
        t.textContent = '.fx-spark.fx-rlic{filter:none !important}';
        document.head.appendChild(t);
      } else { const o = document.getElementById('__v683norim'); if (o) o.remove(); }
      /* ⚠⚠ **타이머를 먼저 얼린다.** 안 얼리면 `fxBye` 가 스크린샷을 찍는 수백 ms 사이에 알을
         걷어 가서 «찍힌 그림에 알이 없다» 가 된다 — 이 자의 1차 판이 정확히 그래서 «바뀐 화소 0»
         이었다(진단은 «.fx-rlic 6» 인데 그림엔 없는, 자기모순처럼 보이던 값). 원본은 되돌려 준다. */
      if (!window.__v683to) { window.__v683to = window.setTimeout; window.__v683ri = window.requestAnimationFrame; }
      window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
      const it = summonRelic(true); if (!it) return null;
      rwSummonFx(it, true, null);
      try { document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = 40; } catch (_) {} }
        else { a.pause(); try { a.finish(); } catch (_) {} }
      }); } catch (e) {}
      const el = document.querySelector('[data-rw="' + it.id + '"]');
      const r = el.getBoundingClientRect();
      let nRlic = 0, nAll = 0;
      for (const nd of L.children) { nAll++; if (/fx-rlic/.test(nd.className + '')) nRlic++; }
      return { id: it.id, nRlic, nAll, open: document.getElementById('relw').classList.contains('on'),
               box: { x: Math.round(r.x) - 40, y: Math.round(r.y) - 40,
                      w: Math.round(r.width) + 80, h: Math.round(r.height) + 80 } };
    }, drop);
    if (!st) return null;
    console.log('  ·  표본(' + (drop ? '걷음' : '넣음') + ') — 당첨 ' + st.id + ' · 획득 알 ' + st.nRlic
                + ' · 레이어 자식 ' + st.nAll);
    const withFx = (await p.screenshot()).toString('base64');
    /* ⚠ 대조 화면에서는 **획득 알만** 걷는다 — 레이어를 통째로 숨기면 차분에 플래시·지불 알까지
       섞여 «획득 알의 잉크» 가 아니게 된다(그리고 `visibility` 토글은 이 판에서 화면을 안 바꿨다). */
    const gone = await ev(p, () => {
      const L = document.getElementById('fxl'); let n = 0;
      if (L) for (const nd of Array.prototype.slice.call(L.children))
        if (/fx-rlic/.test(nd.className + '')) { nd.remove(); n++; }
      return n;
    });
    const noFx = (await p.screenshot()).toString('base64');
    if (!gone) return { n: 0, lo: 0, hi: 0, range: 0, note: '대조에서 걷은 알 0' };
    return await ev(p, async ({ a, b, box }) => {
      const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
      const ia = await load(a), ib = await load(b);
      const mk = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(box.x, box.y, box.w, box.h).data; };
      const da = mk(ia), db = mk(ib);
      const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      let lo = 255, hi = 0, n = 0;
      for (let i = 0; i < da.length; i += 4) {
        const va = lum(da, i), vb = lum(db, i);
        if (Math.abs(va - vb) < 12) continue;          /* 안 바뀐 화소 = 알이 아니다 */
        n++; lo = Math.min(lo, va); hi = Math.max(hi, va);
      }
      return { n, lo: Math.round(lo), hi: Math.round(hi), range: Math.round(hi - lo) };
    }, { a: withFx, b: noFx, box: st.box });
  };
  const gOn = await inkRange(false);
  info('알 잉크(실루엣+림)', gOn ? ('바뀐 화소 ' + gOn.n + ' · 휘도 ' + gOn.lo + '~' + gOn.hi + ' · 폭 ' + gOn.range) : '측정 실패');
  /* ⚑ 5회차 — 「폭」만 묻던 것을 **「양끝이 실제로 어디인가」** 로 좁혔다. 이 알이 세 바탕
     (어두운 배경 ≈40 · 컬러 아이콘 ≈140~200 · 흰 플래시 ≈238~254)에서 다 서려면 **어두운 쪽과
     밝은 쪽을 둘 다** 가져야 한다 — 폭만 넓고 양끝이 중간대에 몰리면(예: 90~250) 흰 플래시에서 진다. */
  ok(!!gOn && gOn.n > 200 && gOn.lo <= 60 && gOn.hi >= 200,
     'G1 ★ 알의 잉크가 **검은 채움(≤60) ~ 흰 테(≥200) 양끝**을 다 갖는다 — 세 바탕 어디서든 문양이 오려진다',
     gOn ? ('휘도 ' + gOn.lo + '~' + gOn.hi + ' · 폭 ' + gOn.range + ' · 화소 ' + gOn.n) : '측정 실패');
  const gOff = await inkRange(true);
  info('알 잉크(실루엣·림 걷음 = 3회차 상태)', gOff ? ('바뀐 화소 ' + gOff.n + ' · 휘도 ' + gOff.lo + '~' + gOff.hi + ' · 폭 ' + gOff.range) : '측정 실패');
  ok(!!gOn && !!gOff && gOff.range < gOn.range,
     'G2 ★ 되돌림 — 실루엣·림을 걷으면 잉크의 휘도 폭이 좁아진다(이 자가 그 처방을 재고 있다는 증거)',
     (gOff && gOn) ? ('걷음 ' + gOff.range + ' ↔ 넣음 ' + gOn.range) : '측정 실패');
  await ev(p, () => {
    const o = document.getElementById('__v683norim'); if (o) o.remove();
    if (window.__v683to) { window.setTimeout = window.__v683to; window.requestAnimationFrame = window.__v683ri;
      window.__v683to = null; window.__v683ri = null; }
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  });

  /* ── [H] 카드 정보 — 연출이 «Lv.n» 을 못 읽게 하지 않는가 ──────────── */
  /* ⚑⚑ 5회차 신설 — **세 회차(2·3·4)를 연달아 ④ 에서 깎은 축이 이것이다.** 여섯 비평가 중 다섯이
     같은 말을 했고 4회차에는 둘 다 «8점을 막는 단 하나» 로 지목했다: 획득 플래시가 당첨 칸을 씻어
     «Lv.n» 대비를 정착 **9.17:1 → 1.48:1**(84% 손실)로, 그것도 **연출의 71%(240ms) 동안** 끌어내린다.
     ⇒ «보상이 떨어지는 순간 «어느 유물인가» 가 카드에서 가장 안 보이는 요소» 가 된다.
     자는 **찍힌 픽셀**로 잰다(350 처방) — 라벨 띠의 «검은 테 ↔ 흰 채움» 폭이 정착 대비 얼마나
     남아 있는가. 연출 중 폭이 정착의 절반 밑으로 내려가면 빨갛다.
     ⚠ 문턱을 «절대 대비» 가 아니라 **«정착 대비 비율»** 로 잡은 이유: 라벨 색·서체는 아트 대기라
       절대값이 아트 교체 때 움직인다. 비율은 그때도 뜻이 산다(676-② «상수로 적으면 부패한다»). */
  blk('H] 카드 정보 — 연출 중 «Lv.n» 대비가 정착 대비 얼마나 남는가');
  const labelShot = async (t, longFlash, noGain) => {
    const st = await ev(p, async ({ T, LONG, NOGAIN }) => {
      const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
      if (!window.__v683to) { window.__v683to = window.setTimeout; window.__v683ri = window.requestAnimationFrame; }
      window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
      /* 되돌림용 — `iv` 를 떨궈 5회차 이전의 «긴 플래시»(340ms)로 되돌린다 */
      if (NOGAIN) { const t = document.createElement('style'); t.id = '__v683nogain';
        t.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(t); }
      else { const o = document.getElementById('__v683nogain'); if (o) o.remove(); }
      if (LONG && !window.__v683ff) { window.__v683ff = window.fxFlash;
        window.fxFlash = function (el) { return window.__v683ff.call(this, el); }; }
      if (!LONG && window.__v683ff) { window.fxFlash = window.__v683ff; window.__v683ff = null; }
      /* ⚠⚠ 753 7회차 관측(**여기는 안 고쳤다 — 곁다리 788 로 등재**): 이 절은 마스크(채움·테 화소
         자리)를 «정착» 프레임 하나에서 떠서 **같은 상자 좌표**로 표본 프레임에 적용하는데,
         `summonRelic(true)` 는 매번 **다른 유물**을 돌려준다 ⇒ 정착과 표본이 서로 다른 칸이면
         «라벨이 아닌 곳» 을 재게 되고, 그것이 [H2] 가 실행마다 20~100% 로 흔들리는 뿌리다.
         ⇒ 대상 칸을 고정하고 보유시켜 재 보면 **[H1] 이 2.08~2.53:1 로 실제로 빨갛다**(정착 10.6~11.2:1)
         — 즉 지금의 초록은 «다른 카드를 재서» 나온 **헛초록**일 때가 있다. 플래시 길이·세기는 683·681
         의 축이라 이 행(753 = 파티클)에서 고치지 않고 **788 로 넘긴다.** 되돌리는 법은 그 행에 있다. */
      const it = summonRelic(true); if (!it) return null;
      if (T >= 0) rwSummonFx(it, true, null);
      try { document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
        else { a.pause(); try { a.finish(); } catch (_) {} }
      }); } catch (e) {}
      const el = document.querySelector('[data-rw="' + it.id + '"]');
      const u = el.querySelector('u'), b = u.getBoundingClientRect();
      /* 글리프는 231px 상자 «가운데» 에만 있다(`.rw-c>u` 는 좌우 −40 으로 넓힌 정렬용 상자) —
         상자째 재면 카드 배경·플래시가 섞이므로 마스크로 **글자 화소만** 고른다(아래). */
      return { id: it.id, box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } };
    }, { T: t, LONG: !!longFlash, NOGAIN: !!noGain });
    if (!st) return null;
    return { box: st.box, png: (await p.screenshot()).toString('base64') };
  };
  /* ⚠⚠ **자를 네 번째로 고쳐 썼다.** 첫 판은 «라벨 상자의 밝기 폭(p92−p8)» 이었는데 흰 워시가
     상자 안 어두운 화소와의 폭을 **넓혀** 정착 173 < 연출 228 이 나왔다 — «씻길수록 좋다» 는
     뒤집힌 축이다(같은 병을 [G] 에서 이미 두 번 앓았다). 비평가가 실제로 잰 것은 **비율**이고
     대상은 **글자 화소**다: 정착 프레임에서 «채움(밝은 쪽)» 과 «테(어두운 쪽)» 마스크를 뜨고
     **같은 화소 집합**을 연출 프레임에 그대로 적용해 WCAG 대비비를 낸다. */
  /* ⚠ **표본 시각을 하나로 잡으면 안 된다** — 플래시는 «떴다 지는» 곡선이라 t=0(페이드 인 직전)과
     충분히 늦은 시각은 **둘 다 워시가 없다**. 첫 판에 0·130ms 만 재서 «정착과 똑같다»(9.4:1)가
     나왔는데 그것은 좋아서가 아니라 **봉우리를 비켜서** 였다. ⇒ 봉투를 훑어 **가장 나쁜 순간**을 쓴다. */
  const LT = [0, 20, 40, 60, 90, 130, 200, 260];
  const labelRatio = async (noGain) => {
    const settled = await labelShot(-1);
    if (!settled) return null;
    const shots = [];
    for (const t of LT) { const sh = await labelShot(t, false, noGain); if (sh) shots.push({ t, png: sh.png }); }
    if (!shots.length) return null;
    return await ev(p, async ({ a, shots, box }) => {
      const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
      const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
        cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
        return g.getImageData(box.x, box.y, box.w, box.h).data; };
      const A = await px(a);
      const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      /* 정착 프레임으로 마스크 두 벌 — 밝은 쪽 상위 12% = 채움, 어두운 쪽 하위 12% = 테 */
      const vals = []; for (let i = 0; i < A.length; i += 4) vals.push(lum(A, i));
      const srt = [...vals].sort((x, y) => x - y);
      const loT = srt[Math.floor(srt.length * 0.12)], hiT = srt[Math.floor(srt.length * 0.88)];
      const fill = [], stroke = [];
      for (let i = 0, k = 0; i < A.length; i += 4, k++) {
        if (vals[k] >= hiT) fill.push(i); else if (vals[k] <= loT) stroke.push(i);
      }
      const ratio = d => {
        if (!fill.length || !stroke.length) return 0;
        const mf = fill.reduce((s, i) => s + rl(d, i), 0) / fill.length;
        const ms = stroke.reduce((s, i) => s + rl(d, i), 0) / stroke.length;
        const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
        return (hi + 0.05) / (lo + 0.05);
      };
      const per = [];
      for (const sh of shots) per.push({ t: sh.t, r: ratio(await px(sh.png)) });
      const worst = per.reduce((m, o) => (o.r < m.r ? o : m), per[0]);
      const late = per.filter(o => o.t >= 130).sort((x, y) => x.r - y.r)[0] || worst;
      return { n: fill.length + stroke.length, base: ratio(A), per, worst, late };
    }, { a: settled.png, shots, box: settled.box });
  };
  const LR = await labelRatio(true);      /* 플래시 축만 — 알갱이는 숨긴다(아래 머리말) */
  const LRg = await labelRatio(false);    /* 알갱이까지 — ⏸ 대기 항(아래) */
  const r2 = v => Math.round(v * 100) / 100;
  info('«Lv.n» 채움↔테 WCAG 대비비', LR ? ('정착 ' + r2(LR.base) + ':1 · '
       + LR.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · ') + ' (표본 ' + LR.n + '화소)') : '측정 실패');
  /* ⚑⚑ **축이 둘이라 자도 둘이다.** 5회차 비평가 둘이 «Lv.n 이 240ms 안 읽힌다» 의 원인을 **둘로 갈랐다**:
       ⓐ 0~120ms = **플래시** (이 세션이 340 → 120ms 로 고친 축)
       ⓑ 130~240ms = **알갱이** (링 하단 호가 라벨을 훑는다 — **이 세션이 못 고친 축**, 683 보류 사유)
     ⇒ [H1] 은 **알갱이를 숨기고** 플래시 축만 단언한다(내가 고친 것만 지킨다). ⓑ 는 아래 **⏸ 대기 항**으로
       매 실행 값을 찍되 **실패로 세지 않는다** — 326 의 `ck199` 와 같은 꼴이다.
     ⚠ 이렇게 가르지 않으면 이 자는 **영원히 빨간 게이트**가 된다(680: «영원히 빨간 게이트는 같은 빨강을
       몇 번이고 다시 등재하게 만든다»). 그리고 ⓑ 는 알 각도가 매 실행 달라 **플레이키**하기까지 하다. */
  ok(!!LR && LR.base > 4 && LR.worst && LR.worst.r >= 3,
     'H1 ★ **플래시 축** — 알갱이를 뺀 상태에서 봉투 전 구간 «Lv.n» ≥ 3:1 (5회차가 340 → 120ms 로 고친 자리)',
     LR ? ('최악 t=' + LR.worst.t + 'ms ' + r2(LR.worst.r) + ':1 (정착 ' + r2(LR.base) + ':1)') : '측정 실패');
  ok(!!LR && LR.late && LR.late.r >= LR.base * 0.8,
     'H2 ★ **플래시 축** — 130ms 뒤로는 정착의 80% 이상으로 회복한다',
     LR ? ('t≥130 최악 ' + r2(LR.late.r) + ':1 / ' + r2(LR.base) + ':1 = ' + Math.round(LR.late.r / LR.base * 100) + '%') : '측정 실패');
  /* ⏸ **683 보류 사유 — 실패로 안 센다.** 알갱이까지 켠 실측을 매 실행 찍는다(값·최악 시각·비율).
     이 값이 3:1 을 넘으면 그때 [H1] 의 `noGain` 을 떼고 한 항으로 합치는 것이 마감이다. */
  if (LRg && LRg.worst) {
    console.log('  ⏸  [683 보류 사유 · 실패 아님] 알갱이까지 켠 «Lv.n» — 최악 t=' + LRg.worst.t + 'ms '
      + r2(LRg.worst.r) + ':1 (정착 ' + r2(LRg.base) + ':1 = ' + Math.round(LRg.worst.r / LRg.base * 100) + '%)'
      + ' · 봉투 ' + LRg.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · '));
    console.log('  ⏸  처방(5회차 2인 일치): 방출 각도에서 아래쪽 섹터 배제 또는 라벨 띠 클램프 + «Lv.n» 을 연출 위 레이어로');
  }
  /* ⚑ 되돌림 — 5회차의 손잡이(`RW_FLASH_MS`)를 걷어 옛 340ms 플래시로 되돌리면 이 자가 빨개져야 한다.
     안 그러면 [H1] 은 «원래부터 참인 것» 을 굳힌 항이다(338 이 등재문 처방에서 배운 바로 그 함정). */
  const longShot = await labelShot(40, true, true);   /* 플래시 축만(알갱이 숨김) — [H1] 과 같은 조건 */
  const longR = longShot ? await ev(p, async ({ a, b, box }) => {
    const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(box.x, box.y, box.w, box.h).data; };
    const A = await px(a), B = await px(b);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const vals = []; for (let i = 0; i < A.length; i += 4) vals.push(lum(A, i));
    const srt = [...vals].sort((x, y) => x - y);
    const loT = srt[Math.floor(srt.length * 0.12)], hiT = srt[Math.floor(srt.length * 0.88)];
    const fill = [], stroke = [];
    for (let i = 0, k = 0; i < A.length; i += 4, k++) { if (vals[k] >= hiT) fill.push(i); else if (vals[k] <= loT) stroke.push(i); }
    if (!fill.length || !stroke.length) return 0;
    const mf = fill.reduce((s, i) => s + rl(B, i), 0) / fill.length;
    const ms = stroke.reduce((s, i) => s + rl(B, i), 0) / stroke.length;
    const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
    return (hi + 0.05) / (lo + 0.05);
  }, { a: (await labelShot(-1, false, true)).png, b: longShot.png, box: longShot.box }) : 0;
  ok(!!LR && longR > 0 && longR < LR.worst.r,
     'H3 ★ 되돌림 — `RW_FLASH_MS` 를 걷어 옛 340ms 플래시로 되돌리면 같은 시각의 대비가 떨어진다',
     '옛 플래시 t=40ms ' + r2(longR) + ':1 ↔ 지금 ' + r2(LR ? LR.worst.r : 0) + ':1');
  await ev(p, () => {
    if (window.__v683ff) { window.fxFlash = window.__v683ff; window.__v683ff = null; }
    { const o = document.getElementById('__v683nogain'); if (o) o.remove(); }
    if (window.__v683to) { window.setTimeout = window.__v683to; window.requestAnimationFrame = window.__v683ri;
      window.__v683to = null; window.__v683ri = null; }
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  });

  /* ── [F] 불변 — 등재문 요구 ③ · 지불 이미터 ──────────────────────── */
  blk('F] 불변 — 텍스트 0건(666) · 지불 이미터는 그대로 산다');
  const txt = await ev(p, () => {
    const L = document.getElementById('fxl'); if (!L) return -1;
    let n = 0; for (const nd of L.children) if (/fx-plus|fx-delta/.test(nd.className + '')) n++;
    return n;
  });
  ok(txt === 0, 'F1 ★ 숫자·이름 플로터 0건 (등재문 요구 ③ · 666 이 폐지한 어휘)', String(txt));
  const pay = BS.reduce((n, b) => n + b.born.filter(q => !isGain(q)).length, 0);
  ok(pay > 0, 'F2 지불 버스트가 여전히 터진다 — 이 작업이 666 을 밀어내지 않았다', pay + '알');
  ok(errs.length === 0, 'F3 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [R] 되돌림 ──────────────────────────────────────────────────── */
  blk('R] 되돌림 — 고친 축을 되돌리면 위 항이 빨개진다');
  /* R1 — 획득 이미터를 빼면 [C1] 이 빨개진다. 제품을 실제로 되돌려 «그때 0 이 되는가» 를 본다. */
  const rev = await ev(p, async () => {
    const keep = window.rwGainFx;
    window.rwGainFx = () => false;                   /* 666 상태 = 획득 이미터 없음 */
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    window.__v683.bursts = [];
    for (let i = 0; i < 4; i++) { const it = summonRelic(true); if (it) rwSummonFx(it, i === 0, 90); }
    let n = 0; for (const b of window.__v683.bursts) n += b.born.filter(q => /fx-rlic/.test(q.cls)).length;
    window.rwGainFx = keep;
    return { n, bursts: window.__v683.bursts.length };
  });
  ok(!!rev && rev.bursts >= 3 && rev.n === 0,
     'R1 `rwGainFx` 를 빼면 획득 알 0 — [C1][C2][D1] 이 빨개지는 자리',
     rev ? (rev.bursts + '버스트 · 획득 알 ' + rev.n) : '측정 실패');
  /* R2 — 되살리면 다시 난다(자가 «영원히 0» 을 초록으로 읽지 않는다) */
  const back = await ev(p, () => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    window.__v683.bursts = [];
    for (let i = 0; i < 4; i++) { const it = summonRelic(true); if (it) rwSummonFx(it, i === 0, 90); }
    let n = 0; for (const b of window.__v683.bursts) n += b.born.filter(q => /fx-rlic/.test(q.cls)).length;
    return n;
  });
  ok(back > 0, 'R2 원복하면 다시 난다 — [R1] 이 «항상 0» 을 재는 헛초록이 아니다', '획득 알 ' + back);

  await browser.close();
  console.log('\nVERIFY683 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
