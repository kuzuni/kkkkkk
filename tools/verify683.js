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
const { holdUntil } = require('./holdburst');     /* 785 — 홀드 표본 문턱 공용 부품 */

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
/* ⚑⚑ 785 — **문턱을 시간에서 떼어냈다.** 753 은 «표본이 굶는다» 를 «누르는 시간을 3000 → 6000ms»
   로 풀었고, 그것은 같은 축(러너 틱 속도)을 한 칸 민 것이었다 — 기계가 더 느려지면 다시 빨개진다.
   ⇒ 이제 **표본 수가 문턱이고 시간은 «상한» 일 뿐**이다: `holdUntil` 이 [B2] 의 6회가 찰 때까지
   누르고 상한에서 끊는다(공용 부품 `tools/holdburst.js` — `verify666`·`verify682`·`verify619` 가 같이 읽는다).
   ⚠ **문턱은 한 칸도 안 내렸다**(334 규약) — 내렸으면 그 위에 선 [D4]·[H2] 가 헛초록이 된다.
   재현·A/B 는 `node tools/probe785.js`(느린 기계 CPU ×8 에서 고정 3000ms = 3·4·3회 ↔ `holdUntil` = 7·8·9회). */
const NEED = Number(process.env.V683_NEED || 6);          /* [B2] 문턱 = 표본 수 */
const HOLD_MAX = Number(process.env.V683_HOLD_MAX || 30000);  /* 상한(데드라인 아님) */
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
  /* ⚑⚑ 14회차 이관(333 처방 — 지우지 않고 **방향만** 뒤집었다) — 채움과 테의 극성이 맞바뀌었다
     (검은 채움 + 흰 테 → **흰 채움**(`brightness(0) invert(1)`) + **어두운 테**). 이 항이 지키는
     뜻은 그대로다: «양끝을 다 갖는가 · 여덟 겹인가 · 색을 마지막에 얹는가». 색 이름을 상수로
     박지 않고 **채움색 ↔ 테색이 서로 반대편 끝인지**를 산수로 묻는다 — 그래야 다음 회차가 색을
     조정해도 이 항이 «값»이 아니라 «뜻»으로 남는다. */
  const mFilt = code.match(/\.fx-spark\.fx-rlic\{[\s\S]{0,400}?filter:([^}]+)\}/);
  const filt = mFilt ? mFilt[1] : '';
  /* ⚠ 글로우 겹(`var(--c,#FFE07A)`)에도 «#» 이 있다 — **폴백 색을 테로 세면 안 된다**(자 1판이
     그래서 «테 9겹 · Δ32» 로 빨갰다). `var(` 를 품은 겹은 테가 아니라 글로우다. */
  const rimShadow = (filt.match(/drop-shadow\([^)]*\)/gi) || []).filter(t => !/var\(/i.test(t));
  const rimHex = rimShadow.map(t => (t.match(/#([0-9A-F]{3,6})/i) || [])[1]).filter(Boolean);
  const lum6 = h => { const x = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const v = i => parseInt(x.slice(i, i + 2), 16);
    return 0.2126 * v(0) + 0.7152 * v(2) + 0.0722 * v(4); };
  /* 테 = 글로우(`var(--c)`) 를 뺀 단색 겹들. 그 색이 한 가지이고 채움과 반대편 끝이어야 한다. */
  const rimSet = Array.from(new Set(rimHex.map(h => h.toUpperCase())));
  const rimN = rimHex.length;
  const inv = /brightness\(0\)\s+invert\(1\)/.test(filt);          /* 채움 = 흰색 */
  const fillL = inv ? 255 : 0;
  const rimL = rimSet.length ? Math.max.apply(null, rimSet.map(lum6)) : null;
  ok(/\.fx-spark\.fx-rlic\{/.test(code) && /var\(--c/.test(filt) && /brightness\(0\)/.test(filt)
     && rimN >= 8 && rimSet.length === 1 && rimL !== null && Math.abs(fillL - rimL) >= 195
     && filt.lastIndexOf('var(--c') > filt.lastIndexOf(rimShadow[rimShadow.length - 1] || '#'),
     'A7 ★ `.fx-rlic` 가 **여덟 겹 단색 테 + 그 반대편 끝의 채움**으로 양끝을 다 갖고, 칸 글로우 색을 **마지막에** 얹는다',
     mFilt ? ('테 ' + rimN + '겹 #' + rimSet.join('/') + '(L ' + (rimL === null ? '—' : Math.round(rimL))
              + ') · 채움 ' + (inv ? '흰색(invert)' : '검정') + '(L ' + fillL + ') · Δ'
              + (rimL === null ? '—' : Math.round(Math.abs(fillL - rimL)))
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
  /* 785 — 손으로 적던 홀드는 공용 부품으로 갔다(`tools/holdburst.js`). 누르는 방법은 그대로
     (CDP 터치 + 80ms 마다 흔들기)이고 **끊는 조건만** «시간» 에서 «표본 수» 로 바뀌었다. */

  /* 공용 스파크 수명은 **제품에서 읽는다** — 자에 값을 두 벌로 적으면 402 «표 두 벌» 부패가 난다 */
  const SPARK_MS = (await ev(p, () => (typeof FXSPARK_MS === 'number') ? FXSPARK_MS : 0)) || 0;
  const armed = await ev(p, WATCH);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);
  const HB = await holdUntil(p, { at: await box('#rwBasin'), need: NEED, maxMs: HOLD_MAX,
                                  count: () => window.__v683.bursts.length, mode: 'touch', cdp });
  const BS = (await ev(p, () => window.__v683.bursts)) || [];

  blk('B] 전제 — 관찰자·홀드가 실제로 돌았다');
  ok(armed === true, 'B1 `rwSummonFx` 를 감쌌다');
  /* 785 — 문턱(6)은 그대로, 누르는 방법만 «시간» → «표본이 찰 때까지». 상한에서 끊겼으면
     `HB.reached` 가 false 이고 그때만 이 항이 빨개진다(느린 기계에서 조용히 굶지 않는다). */
  ok(BS.length >= NEED, 'B2 홀드가 여러 번 소환한다(전제 · 666 [B1] 과 같은 종류 · 785 공용 부품)',
     BS.length + '회 · ' + HB.note);
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
  /* ⚑⚑ 681 이관(2026-09-02) — 셋째 항이 **공용 곡선의 옛 글자**(`0%{… scale(1);opacity:1}`)를 그대로
     읽고 있었다. 그 자리는 681 이 «탄생 박자 없음·빈 껍데기 꼬리» 로 등재해 둔 곡선이고, 이 주석
     스스로 «681 이 따로 등재했다» 고 적어 두었다 — 즉 **이 항은 남의 작업이 끝나면 반드시 빨개지는
     래칫**이었다(333 처방: 자리를 비우지 말고 방향을 고쳐 적는다).
     묻는 뜻은 한 글자도 안 바뀐다: 이 알이 **공용 봉투를 안 탄다**. 다만 그것을 «공용 곡선이 옛날
     그대로인가» 로 묻지 않고 **«둘이 서로 다른 봉투인가»** 로 묻는다 —
       ① 전용 `fxRlic` 이 위 세 계수 그대로 있고(= [C6] 봉투 산수와 같은 값)
       ② 공용 `fxSpark` 가 여전히 **존재**하며(없으면 `animation-name` 갈아 끼우기가 헛일이다)
       ③ 그 둘의 선언이 **같지 않다**(공용이 바뀌어도 이 알은 안 따라간다).
     ⇒ 681 이 공용 곡선을 어떻게 고치든 이 항은 «이 알만 다른 봉투» 를 계속 지킨다. */
  /* ⚑⚑ 994 이관(333 — 지우지 않고 **α 를 «자리» 가 아니라 «봉우리» 로 묻는다**) — 994 가 태생 α 를
     겹침 창(0% `.10` → 10% `.55`)에 맞추면서 이 정규식의 `opacity:\.55` 가 **0% 자리에서 사라졌다**.
     이 항이 지키려는 것은 ① 전용 봉투의 **transform 계수 셋**([C6] 산수와 같은 값) ② 공용 곡선과
     **다른 봉투**라는 것 둘이고, 태생 α 의 «자리» 는 그 어느 쪽도 아니다. ⇒ 램프 키프레임을
     선택항으로 받고, **봉우리 α(.55 · 753 9회차 2인 독립 일치)를 래칫으로** 따로 묻는다([C8b]).
     ⚠ transform 계수(translate .55 / 1 · scale 1 → .72 → .45)는 한 글자도 안 무르게 하지 않았다. */
  const mRlic = code.match(/@keyframes fxRlic\{0%\{transform:translate\(0,0\) scale\(1\);opacity:([.\d]+)\}\s*(?:(\d+)%\{opacity:([.\d]+)\}\s*)?35%\{transform:translate\(calc\(var\(--dx\)\*\.55\),calc\(var\(--dy\)\*\.55\)\) scale\(\.72\);opacity:\.45\}\s*100%\{transform:translate\(var\(--dx\), ?var\(--dy\)\) scale\(\.45\);opacity:0\}\}/);
  const mSpk = code.match(/@keyframes fxSpark\{([\s\S]*?\})\}/);   /* 블록의 끝은 `}}` 다(681) */
  const sameEnv = !!(mRlic && mSpk) && mSpk[1].replace(/\s+/g, '') === mRlic[0].replace(/^@keyframes fxRlic\{/, '').replace(/\}$/, '').replace(/\s+/g, '');
  ok(!!mRlic && /\.fx-spark\.fx-rlic\{[\s\S]{0,400}?animation-name:fxRlic/.test(code) && !!mSpk && !sameEnv,
     'C8 ★ 획득 알이 **전용 봉투(`fxRlic`)** 를 탄다 — 불투명 구간 안에서 이미 줄어들고, 공용 `fxSpark` 와 **서로 다른 봉투**다',
     mRlic ? ('0%s1/α' + mRlic[1] + (mRlic[2] ? ' · ' + mRlic[2] + '%α' + mRlic[3] : '')
              + ' · 35%t.55/s.72/α.45 · 100%t1/s.45/α0 · 공용과 별개 ' + (!sameEnv)) : '전용 곡선을 못 찾았다');
  /* ⚑ 994 신설 [C8b] — **봉우리 α 래칫.** 753 9회차에 비평가 둘이 **독립으로 같은 수(0.55)** 를 적어
     준 값이고(«알이 아이콘과 같은 모양·크기·자리라 태어나는 순간 칸이 통째로 단색 실루엣이 된다»),
     994 는 그 값을 **옮기지 않고** 도달 시각만 겹침 창(≤12% = 45.6ms) 안으로 미뤘다. 이 항이
     ① 봉우리가 여전히 .55 이고 ② 램프가 있으면 그 창 안에서 끝난다는 것을 매 실행 지킨다
     (램프가 없으면 태생 α 자체가 봉우리다 — 994 이전 트리에서도 그대로 초록이다). */
  const a0 = mRlic ? parseFloat(mRlic[1]) : null;
  const aR = mRlic && mRlic[3] ? parseFloat(mRlic[3]) : null;
  const aPk = mRlic ? Math.max(a0, aR == null ? 0 : aR) : null;
  const rampAt = mRlic && mRlic[2] ? parseInt(mRlic[2], 10) : null;
  ok(aPk === 0.55 && (rampAt === null || (rampAt > 0 && rampAt <= 12)),
     'C8b ★ **봉우리 α 는 .55 그대로다**(753 9회차 2인 독립 일치) — 994 는 값을 안 옮기고 도달 시각만 '
     + '«아이콘과 겹쳐 있는 창»(≤12% = 45.6ms) 안으로 미뤘다',
     mRlic ? ('태생 α ' + a0 + (rampAt === null ? ' (램프 없음)' : ' → ' + rampAt + '% 에 ' + aR)
              + ' · 봉우리 ' + aPk) : '전용 곡선을 못 찾았다');
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
     자는 **찍힌 픽셀**로 잰다(350 처방).
     ⚠ 문턱을 «절대 대비» 가 아니라 **«정착 대비 비율»** 로 잡은 이유: 라벨 색·서체는 아트 대기라
       절대값이 아트 교체 때 움직인다. 비율은 그때도 뜻이 산다(676-② «상수로 적으면 부패한다»).

     ⚑⚑⚑ **788(2026-09-02) — 이 절의 자가 «라벨이 아닌 것» 을 재고 있었다. 두 군데를 고쳤다.**
       ⓐ **대상 칸이 표본마다 달랐다.** 옛 `labelShot()` 은 표본마다 `summonRelic(true)` 로 **무작위**
          유물을 뽑았는데, 상자·마스크는 «정착» 프레임 **하나**에서 떠서 모든 표본에 같은 좌표로 적용됐다
          ⇒ 정착과 표본이 다른 칸이면 **연출이 안 걸린 남의 라벨**을 재고 그대로 초록이 됐다.
          `probe788` 실측: 같은 칸 표본이 **0/8 · 1/8 · 2/8** 이고 [H2] 백분율이 **21 · 30 · 36 · 100%**
          로 갈렸다(폭 64~79%p). ⇒ 대상 칸을 `RW_H_ID` 로 고정하고 **실제 경로(`summonRelic`)로 보유**시킨다
          (스텁 없음 · `off` 딤이 프레임마다 달라지면 라벨 색이 통째로 바뀐다). 고친 뒤 폭 **0%p**.
       ⓑ **상자가 라벨보다 훨씬 넓었다.** `.rw-c>u` 는 `left:-40px;right:-40px;top:123px` 이라 상자
          223×~40 중 **좌우 40px 기둥과 아래 ~10px 이 카드 밖**이다(카드 151×151). 옛 마스크는 그 상자의
          휘도 상·하위 12% 를 골랐으므로 어두운 쪽에 **카드 밖 배경**이 섞였고, 플래시의 흰 테·바깥
          글로우가 그 배경을 밝히면 «테↔채움» 이 아니라 «배경↔채움» 이 좁아졌다. `probe788` [6] 실측
          (봉우리 t20): 채움 워시만 끄면 2.75→**2.84**(거의 안 움직인다) · 흰 테만 끄면 **4.75** ·
          바깥 글로우만 끄면 **3.55** ⇒ 옛 값의 상당 부분이 배경이었다.
          ⇒ 이제 **글리프 화소만** 고른다 — 같은 프레임에서 **라벨 글자만 지운 사본**을 한 장 더 찍어
          **차분**으로 화소 집합을 만든다(제품에게 «어디가 글자인가» 를 직접 묻는다 · [G] 가 알 잉크에
          쓰는 방법과 같다 · 손 상수 0개).
       ⚑ **고치고 나니 남은 빨강이 진짜였다** — 글리프만 골라도 정착 **21:1** 이 봉우리에서 **2.16~2.43:1**
          로 내려간다(칸 고정 · 알갱이 숨김 = [H1] 과 같은 조건). 뿌리는 **자리**다: 라벨이 카드 하변
          **밖으로** 걸쳐 있어(`top:123` + 글자 높이 ↔ 카드 151) 카드 모양 플래시의 **흰 테 9px 와 바깥
          글로우**가 라벨 띠를 정면으로 지난다. 그 둘은 `.fx-flash` 공용 CSS(09·12·17·코스튬·장비가
          같이 쓴다)라 **이 행에서 안 고친다**(LESSONS 666-⑨) — **795 로 등재**했다. */
  blk('H] 카드 정보 — 연출 중 «Lv.n» 대비가 정착 대비 얼마나 남는가');
  const RW_H_ID = 'rl0';                    /* 788 — 대상 칸 고정(표 첫 칸 = 최저 등급이라 반드시 뽑힌다) */
  /* 788 전제 — **실제 경로로** 보유시킨다. 스텁으로 `S.own` 을 직접 쓰면 «세이브가 만들 수 없는 상태»
     를 재게 된다(336 규약과 같은 꼴 — 자가 만든 상태는 자가 지어낸 값이다). */
  const hOwn = await ev(p, ID => {
    for (let i = 0; i < 4000 && !has(ID); i++) summonRelic(true);
    renderRelw();
    return has(ID) ? { lv: oLv(ID) } : null;
  }, RW_H_ID);
  ok(!!hOwn, 'H0 전제 — 대상 칸(' + RW_H_ID + ')을 `summonRelic()` 실경로로 보유시켰다(788 — 칸 고정)',
     hOwn ? ('Lv.' + hOwn.lv) : '보유 실패');
  /* `blank` 를 주면 **라벨 글자만 지운** 사본을 찍는다(배경·플래시는 그대로) — 잉크 마스크의 재료다 */
  const labelShot = async (t, longFlash, noGain, blank, noKeep, noFade) => {
    const st = await ev(p, async ({ T, LONG, NOGAIN, ID, BLANK, NOKEEP, NOFADE }) => {
      const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
      if (!window.__v683to) { window.__v683to = window.setTimeout; window.__v683ri = window.requestAnimationFrame; }
      window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
      if (NOGAIN) { const t = document.createElement('style'); t.id = '__v683nogain';
        t.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(t); }
      else { const o = document.getElementById('__v683nogain'); if (o) o.remove(); }
      /* 되돌림용 — `iv` 를 떨궈 5회차 이전의 «긴 플래시»(340ms)로 되돌린다.
         ⚑ 795 — `NOKEEP` 는 **넷째 인자만** 떨군다(= 라벨 패치 없음 · 상자·길이는 그대로).
           두 축을 갈라 재려고 나눴다: `LONG` 은 길이 축(넷을 다 떨구므로 패치도 같이 꺼진다) ·
           `NOKEEP` 는 795 축. 안 나누면 [H3] 이 «길이 ↔ 패치» 를 섞어 재게 된다. */
      if (window.__v683ff) { window.fxFlash = window.__v683ff; window.__v683ff = null; }
      if (LONG || NOKEEP) { window.__v683ff = window.fxFlash;
        window.fxFlash = LONG ? function (el) { return window.__v683ff.call(this, el); }
                              : function (el, iv, inset) { return window.__v683ff.call(this, el, iv, inset); }; }
      /* 788 ⓐ — **뽑지 않는다.** 위 [H0] 이 이미 보유시킨 고정 칸에 연출만 건다
         (`rwSummonFx` 는 «어느 칸에 그리는가» 만 `it` 에서 읽는다 — 제품 경로 그대로다). */
      const it = RELICS.filter(r => r.id === ID)[0]; if (!it) return null;
      if (NOFADE) { if (!window.__v683ktt) window.__v683ktt = window.fxKeepTxtTop;
        window.fxKeepTxtTop = () => null; }
      else if (window.__v683ktt) { window.fxKeepTxtTop = window.__v683ktt; window.__v683ktt = null; }
      if (T >= 0) rwSummonFx(it, true, null);
      /* ⚑⚑ 683 12회차 — `NOFADE` 는 **12회차 제품을 되돌린 사본**이다(`fxFlashFade` 가 건 마스크를 뗀다).
         아래 [H2][H3][H4] 는 «패치·길이 축이 살아 있는가» 를 묻는 되돌림 항인데, 12회차가 플래시를
         라벨 띠에서 아예 빼 버리자 **세 항의 전제 자체가 사라져** 배수가 1 로 붙었다(헛빨강 — 862 가
         겪은 것의 재판). 문턱을 내리는 대신(334) **재는 사본**을 12회차 이전으로 되돌린다(333 처방):
         그러면 두 축은 원래 묻던 것을 그대로 묻고, «12회차가 그 축을 흡수했다» 는 새 사실은
         아래 [H5][H6] 이 따로 못박는다(둘이 짝이라 어느 쪽이 죽어도 빨개진다). */
      try { document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
        else { a.pause(); try { a.finish(); } catch (_) {} }
      }); } catch (e) {}
      const el = document.querySelector('[data-rw="' + it.id + '"]');
      const u = el.querySelector('u'), b = u.getBoundingClientRect();
      /* 글리프는 231px 상자 «가운데» 에만 있다(`.rw-c>u` 는 좌우 −40 으로 넓힌 정렬용 상자) —
         상자째 재면 카드 배경·카드 «밖» 까지 섞이므로 아래에서 차분으로 **글자 화소만** 고른다. */
      if (BLANK) { window.__v683lab = u.textContent; u.textContent = ''; }
      return { id: it.id, lab: u.textContent,
               box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } };
    }, { T: t, LONG: !!longFlash, NOGAIN: !!noGain, ID: RW_H_ID, BLANK: !!blank, NOKEEP: !!noKeep, NOFADE: !!noFade });
    if (!st) return null;
    const png = (await p.screenshot()).toString('base64');
    if (blank) await ev(p, ID => { const el = document.querySelector('[data-rw="' + ID + '"]');
      const u = el && el.querySelector('u');
      if (u && window.__v683lab != null) { u.textContent = window.__v683lab; window.__v683lab = null; } }, RW_H_ID);
    return { box: st.box, png };
  };
  /* ⚠⚠ **자를 다섯 번째로 고쳐 썼다.** 첫 판은 «라벨 상자의 밝기 폭(p92−p8)» 이었는데 흰 워시가
     상자 안 어두운 화소와의 폭을 **넓혀** 정착 173 < 연출 228 이 나왔다 — «씻길수록 좋다» 는
     뒤집힌 축이다(같은 병을 [G] 에서 이미 두 번 앓았다). 비평가가 실제로 잰 것은 **비율**이고
     대상은 **글자 화소**다. 788 이 그 «글자 화소» 를 비로소 글자에서만 뜨게 했다(위 ⓑ). */
  /* ⚠ **표본 시각을 하나로 잡으면 안 된다** — 플래시는 «떴다 지는» 곡선이라 t=0(페이드 인 직전)과
     충분히 늦은 시각은 **둘 다 워시가 없다**. 첫 판에 0·130ms 만 재서 «정착과 똑같다»(9.4:1)가
     나왔는데 그것은 좋아서가 아니라 **봉우리를 비켜서** 였다. ⇒ 봉투를 훑어 **가장 나쁜 순간**을 쓴다. */
  const LT = [0, 20, 40, 60, 90, 130, 200, 260];
  const LT_LIVE = 130;        /* 788 — 플래시 창(`RW_FLASH_MS` 120ms) 밖이 시작되는 표본 시각 */
  /* 788 — 잉크 마스크 + 대비비. 상자 안에서 «글자가 있는 프레임 ↔ 글자만 지운 프레임» 의 차분이
     곧 글리프 화소이고, 그 안에서만 채움(위 25%)·테(아래 25%)를 가른다. */
  const INK = async ({ a, blank, shots, box }) => {
    const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(box.x, box.y, box.w, box.h).data; };
    const A = await px(a), Z = await px(blank);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const ink = [];
    for (let i = 0; i < A.length; i += 4) if (Math.abs(lum(A, i) - lum(Z, i)) >= 24) ink.push(i);
    if (ink.length < 200) return { ink: ink.length, per: [], base: 0 };
    const iv = ink.map(i => lum(A, i)).sort((x, y) => x - y);
    const loT = iv[Math.floor(iv.length * 0.25)], hiT = iv[Math.floor(iv.length * 0.75)];
    const fill = ink.filter(i => lum(A, i) >= hiT), stroke = ink.filter(i => lum(A, i) <= loT);
    if (!fill.length || !stroke.length) return { ink: ink.length, per: [], base: 0 };
    const ratio = d => {
      const mf = fill.reduce((s, i) => s + rl(d, i), 0) / fill.length;
      const ms = stroke.reduce((s, i) => s + rl(d, i), 0) / stroke.length;
      const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
      return (hi + 0.05) / (lo + 0.05);
    };
    const per = [];
    for (const sh of shots) per.push({ t: sh.t, r: ratio(await px(sh.png)) });
    const worst = per.reduce((m, o) => (o.r < m.r ? o : m), per[0]);
    const live = per.filter(o => o.t < 130), late = per.filter(o => o.t >= 130);
    return { ink: ink.length, nf: fill.length, ns: stroke.length, base: ratio(A), per, worst,
             peak: live.sort((x, y) => x.r - y.r)[0] || worst,
             late: late.sort((x, y) => x.r - y.r)[0] || worst };
  };
  const labelRatio = async (noGain, noKeep, noFade) => {
    const settled = await labelShot(-1, false, noGain, false, noKeep, noFade);
    if (!settled) return null;
    const blank = await labelShot(-1, false, noGain, true, noKeep, noFade);
    if (!blank) return null;
    const shots = [];
    for (const t of LT) { const sh = await labelShot(t, false, noGain, false, noKeep, noFade); if (sh) shots.push({ t, png: sh.png }); }
    if (!shots.length) return null;
    return await ev(p, INK, { a: settled.png, blank: blank.png, shots, box: settled.box });
  };
  const LR = await labelRatio(true);      /* 플래시 축만 — 알갱이는 숨긴다(아래 머리말) */
  const LRg = await labelRatio(false);    /* 알갱이까지 — ⏸ 대기 항(아래) */
  /* ⚑ 795 — **라벨 패치를 걷은 사본**(길이·상자·세기는 그대로). [H4] 되돌림과 [H3] 의 «같은 조건»
     기준선을 둘 다 이 한 벌로 잰다 — 패치가 없으면 옛 씻김(2.2~2.5:1)이 그대로 돌아온다. */
  /* ⚑ 683 12회차 이관 — 이 사본은 이제 **패치 걷음 + 12회차 페이드 되돌림**이다(위 `NOFADE` 머리말).
     ⚠ 페이드를 안 되돌리면 «패치를 걷어도 21:1» 이라 [H2][H3][H4] 가 세 항 다 헛빨강이 된다. */
  const LR0 = await labelRatio(true, true, true);
  /* 12회차 — «페이드가 그 축을 흡수했는가» 를 묻는 짝(패치만 걷고 **페이드는 그대로**). [H5] 가 본다. */
  const LR0f = await labelRatio(true, true, false);
  const r2 = v => Math.round(v * 100) / 100;
  info('«Lv.n» 채움↔테 WCAG 대비비', LR ? ('정착 ' + r2(LR.base) + ':1 · '
       + LR.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · ')
       + ' (글리프 화소 ' + LR.ink + ' — 채움 ' + LR.nf + ' · 테 ' + LR.ns + ')') : '측정 실패');
  /* ⚑⚑ **축이 셋이라 항도 셋이다.** 5회차 비평가 둘이 «Lv.n 이 240ms 안 읽힌다» 의 원인을 둘로 갈랐고
       (ⓐ 플래시 · ⓑ 알갱이), 788 이 거기에 셋째를 갈라 넣었다(ⓒ 플래시의 **세기** — 공용 부품):
       ⓐ **길이** = 683 5회차가 340 → 120ms 로 고친 축 ⇒ 아래 **[H1]·[H2]** 가 하드로 묻는다.
       ⓑ **알갱이**(링 하단 호가 라벨을 훑는다) ⇒ ⏸ 대기 항(683 보류 사유).
       ⓒ **세기**(흰 테 9px + 바깥 글로우가 라벨 띠를 지난다) ⇒ `.fx-flash` **공용** CSS 라
          이 행이 못 고친다 ⇒ **[H4] 래칫**(더 나빠지면 빨강) + ⏸ 목표값 + **795 등재**.
     ⚠ 셋을 한 항으로 묶으면 이 자는 **영원히 빨간 게이트**가 된다(680: «영원히 빨간 게이트는 같은
       빨강을 몇 번이고 다시 등재하게 만든다»). 그렇다고 문턱을 내리면 334 가 금지한 «무르게 푼 수리»다
       ⇒ **문턱은 한 칸도 안 내리고**(목표 3:1 은 ⏸ 로 매 실행 찍는다) **축을 갈랐다.** */
  /* ⚑⚑ **795 마감 — [H4] 를 [H1] 에 합치고 문턱을 3 으로 올렸다**(788 이 그렇게 적어 둔 그대로).
     788 이 축을 셋으로 가른 것은 ⓒ(세기)를 이 행이 못 고쳐서였다. 795 가 그것을 닫았으므로
     («덮는 대신 라벨을 플래시 위에 되그린다» — index.html `FXKEEP_TXT`) 판정을 **봉투 전체**
     (`worst`)로 되돌린다. 이제 «영원히 빨간 게이트» 가 아니다: 실측 t0~t260 전 구간 21:1.
     ⚠ **문턱을 내려서 닫은 게 아니다** — 올렸다(래칫 2.0 → 하드 3.0 · 334 규약). */
  /* ⚑⚑ **683 12회차 마감 — `noGain` 을 뗐다(788 이 «그때가 마감» 이라고 적어 둔 그 조건이다).**
     788 이 축을 셋으로 가르면서 ⓑ(알갱이)를 ⏸ 로 남긴 이유는 값이 **4.12:1 = 정착의 36%** 였기
     때문이고, 그 꼬리표는 «이 값이 3:1 을 넘으면 [H1] 의 `noGain` 을 떼고 한 항으로 합쳐라» 라고
     마감 조건을 적어 두었다. 11회차(z 한 칸 = 알 몫)와 12회차(글자 띠 α = 판 몫)가 그 둘을 차례로
     닫아 **알갱이까지 켠 실측이 21:1 = 정착의 100%** 다 ⇒ 합친다.
     ⚠ **문턱은 한 칸도 안 내렸다 — 조였다**(334): 재는 사본이 «알갱이 숨김» → **«전부 켬»** 이다. */
  ok(!!LRg && LRg.base > 4 && LRg.worst && LRg.worst.r >= 3,
     'H1 ★ **봉투 전체 · 알갱이까지 켠 사본** — 연출이 도는 내내(t 0~260ms) «Lv.n» 이 한 번도 3:1 아래로 안 내려간다 (795 로 [H4] 합침 · 12회차로 ⏸ 알갱이 축 합침)',
     LRg ? ('최악 t' + LRg.worst.t + ' ' + r2(LRg.worst.r) + ':1 · t≥' + LT_LIVE + ' 최악 '
           + r2(LRg.late.r) + ':1 (정착 ' + r2(LRg.base) + ':1 = '
           + Math.round(LRg.worst.r / LRg.base * 100) + '%)') : '측정 실패');
  /* ⚑⚑ 795 이관 — **«길이» 축은 패치를 걷은 사본(`LR0`)에서 잰다.** 패치가 라벨을 되그리는 순간
     라벨 대비는 플래시가 얼마나 오래 살든 21:1 이라, 이 항을 `LR` 로 두면 **플래시가 340ms 로
     되돌아가도 초록**인 헛초록이 된다(328~330 이 배운 «누른 항을 묻는 항이 없으면 안 된다»).
     ⇒ 축은 그대로 두고(«창 밖은 깨끗하다») **재는 사본만** 갈아 끼웠다(333 처방). */
  ok(!!LR0 && LR0.late && LR0.base > 0 && LR0.late.r >= LR0.base * 0.8,
     'H2 ★ **플래시 «길이» 축**(패치 걷은 사본) — 130ms 뒤로는 정착의 80% 이상으로 회복한다',
     LR0 ? ('패치 걷음 t≥130 최악 ' + r2(LR0.late.r) + ':1 / ' + r2(LR0.base) + ':1 = '
            + Math.round(LR0.late.r / LR0.base * 100) + '%') : '측정 실패');
  /* ⚑ 788 — **래칫이다(완료 표지가 아니다).** 목표는 3:1 이고 지금은 2.16~2.43:1 이다(칸 고정 · 글리프
     화소 · 알갱이 숨김). 뿌리는 `.fx-flash` 의 **흰 테 9px + 바깥 글로우**가 카드 하변 밖으로 걸친
     라벨 띠를 지나는 것이고, 그 CSS 는 09·12·17·코스튬·장비 공용이라 **795** 가 잡는다.
     이 항이 지키는 것은 «더 나빠지지 않는다» 하나뿐이다 — 795 가 닫으면 문턱을 3 으로 올리고
     [H4] 를 [H1] 에 합치는 것이 마감이다. ⚠ **문턱을 이 자리에서 내리지 마라**(334). */
  /* ⚑⚑ 795 되돌림 시험 — **[H1] 이 «원래부터 참인 것» 을 굳힌 항이 아님을 못박는다**(338 함정).
     라벨 패치(`fxFlash` 넷째 인자)만 걷으면 흰 테 9px + 바깥 글로우가 라벨 띠를 도로 지나
     봉우리가 3:1 아래로 내려가야 한다. 안 내려가면 [H1] 은 헛초록이다(패치가 죽어도 초록).
     ⚠ 이 항이 «패치를 걷는» 것 하나만 바꾼다는 게 핵심이다 — 길이·상자·세기는 그대로다. */
  /* ⚑⚑ **862 이관 — 문턱을 «절대 3:1» 에서 «지금의 1/3» 로 옮겼다(333 처방 · 내린 것이 아니다).**
     862 가 `.fx-flash` 의 상자를 **호스트 액자 띠 안쪽**으로 들이고 흰 테를 그 띠로 눌러
     («흰 테 ≤ 액자 띠») 라벨 띠를 덜 지나게 됐다 — 그래서 **패치를 걷은 사본의 봉우리 자체가
     2.16~2.43 → 3.23:1 로 올라갔다.** 절대값에 매인 이 항은 그 순간 «제품이 좋아진 것» 을
     빨강으로 읽는다(680 «영원히 빨간 게이트» 의 거울상 — 헛빨강).
     ⇒ 이 항이 지키려는 것은 «패치가 일을 하는가» 하나이므로 **배수**로 묻는다: 걷으면 지금의
       1/3 아래로 내려가야 한다(실측 3.23 ↔ 21 = **6.5배**). 패치를 통째로 지우면 두 값이 같아져
       배수 1 → 즉시 빨강이라 헛초록이 안 된다. ⚠ 절대값은 아래 꼬리표로 매 실행 그대로 찍는다. */
  ok(!!LR && !!LR0 && LR0.worst && LR.worst && LR0.worst.r < LR.worst.r / 3,
     'H4 ★ 되돌림(**795 축 — 라벨 패치**) — 패치를 걷으면 봉우리가 지금의 1/3 아래로 내려간다(862 이관 — 옛 문턱 «3:1 아래»)',
     (LR0 && LR0.worst ? ('패치 걷음 t' + LR0.worst.t + ' ' + r2(LR0.worst.r) + ':1') : '측정 실패')
     + ' ↔ 지금 ' + r2(LR && LR.worst ? LR.worst.r : 0) + ':1'
     + ' · 갈래(probe788 [6]): 흰 테만 끄면 5.88 · 바깥 글로우만 끄면 3.58 · 채움 워시만 끄면 3.14');
  /* ⚑ 12회차 — 옛 ⏸ 꼬리표(«알갱이 축은 실패로 안 센다»)는 위 [H1] 에 **합쳐서 없앴다**.
     값은 계속 찍는다 — 마감했다고 안 보이게 하면 다음 회차가 추이를 못 읽는다(680 «영원히 빨간
     게이트» 의 반대편 사고: 닫힌 축은 조용해져서 되돌아가도 아무도 모른다). */
  if (LRg && LRg.worst)
    info('알갱이까지 켠 «Lv.n» 봉투(5회차 4.12:1 → 11·12회차로 닫힘)',
      LRg.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · ')
      + ' (정착 ' + r2(LRg.base) + ':1 = ' + Math.round(LRg.worst.r / LRg.base * 100) + '%)');
  /* ⚑ 되돌림 — 5회차의 손잡이(`RW_FLASH_MS`)를 걷어 옛 340ms 플래시로 되돌리면 이 자가 빨개져야 한다.
     안 그러면 [H1] 은 «원래부터 참인 것» 을 굳힌 항이다(338 이 등재문 처방에서 배운 바로 그 함정).
     788 — 재는 자리도 «길이» 축으로 옮겼다: 옛 플래시는 `LT_LIVE`(130ms) 에도 **아직 살아 있어서**
     [H1] 이 지키는 «창 밖은 깨끗하다» 를 정면으로 깬다(옛 자는 t=40 한 점만 봐서 세기와 섞였다). */
  /* 12회차 — 이 대조군도 **페이드를 되돌린 사본**이다(위 `NOFADE` 머리말 · [H3] 의 짝이 [H6] 이다). */
  const longSettled = await labelShot(-1, true, true, false, false, true);
  const longBlank = await labelShot(-1, true, true, true, false, true);
  const longShots = [];
  for (const t of LT.filter(t => t >= LT_LIVE)) { const sh = await labelShot(t, true, true, false, false, true); if (sh) longShots.push({ t, png: sh.png }); }
  const longShotsF = [];
  for (const t of LT.filter(t => t >= LT_LIVE)) { const sh = await labelShot(t, true, true, false, false, false); if (sh) longShotsF.push({ t, png: sh.png }); }
  const LRlong = (longSettled && longBlank && longShots.length)
    ? await ev(p, INK, { a: longSettled.png, blank: longBlank.png, shots: longShots, box: longSettled.box }) : null;
  /* ⚑ 795 — 대조군을 `LR` 에서 **`LR0`(패치 걷은 사본)** 로 바꿨다. `LONG` 스텁은 인자를 전부
     떨구므로 패치도 같이 꺼진다 — 그러면 «옛 플래시(패치 없음) ↔ 지금(패치 있음)» 이 되어
     **길이와 패치 두 축을 섞어 재는** 비교가 된다. 둘 다 패치를 걷어야 길이만 남는다. */
  /* ⚑ 862 이관 — [H4] 와 같은 이유로 «절대 3:1» 을 «지금의 1/3» 로 옮겼다(실측 3.46 ↔ 21 = 6.1배).
     축은 그대로다: **옛 길이로 되돌리면 창 밖이 더는 깨끗하지 않다.** */
  /* ⚑⚑ 683 12회차 — **[H4] 의 짝.** 위 [H4] 는 «페이드가 없었다면 패치가 하던 일» 을 지킨다.
     이 항은 **지금 제품에서 그 축이 닫혔다**는 새 사실을 못박는다 — 페이드가 살아 있으면
     패치를 걷어도 라벨은 안 씻긴다(배수 ≈ 1). 둘이 짝이라 어느 쪽이 죽어도 빨개진다:
     페이드를 지우면 [H5] 가, 패치를 지우면 [H4] 가 빨강이다(328~330 «누른 항을 묻는 항»). */
  ok(!!LR && !!LR0f && LR0f.worst && LR.worst && LR0f.worst.r >= LR.worst.r / 1.5,
     'H5 ★ **12회차가 «패치 ↔ 플래시» 축을 흡수했다** — 페이드가 살아 있으면 패치를 걷어도 봉우리가 안 무너진다(배수 ≥ 1/1.5)',
     (LR0f && LR0f.worst ? ('페이드 살림·패치 걷음 t' + LR0f.worst.t + ' ' + r2(LR0f.worst.r) + ':1') : '측정 실패')
     + ' ↔ 지금 ' + r2(LR && LR.worst ? LR.worst.r : 0) + ':1');
  ok(!!LR0 && !!LRlong && LRlong.late && LR0.late && LRlong.late.r < LR0.late.r / 3,
     'H3 ★ 되돌림(**«길이» 축** · 양쪽 다 패치 걷음) — `RW_FLASH_MS` 를 걷어 옛 340ms 플래시로 되돌리면 «창 밖» 이 더는 깨끗하지 않다(862 이관 — 옛 문턱 «3:1 아래»)',
     (LRlong && LRlong.late ? ('옛 플래시 t≥' + LT_LIVE + ' ' + r2(LRlong.late.r) + ':1') : '측정 실패')
     + ' ↔ 지금(패치 걷음) ' + r2(LR0 && LR0.late ? LR0.late.r : 0) + ':1');
  /* ⚑⚑ 683 12회차 — **[H3] 의 짝.** 길이 축도 페이드가 흡수했다: 옛 340ms 플래시로 되돌려도
     («창 밖» 인 t≥130 에서도 플래시가 아직 살아 있어도) 라벨 띠에는 α 가 0 이라 안 씻긴다.
     ⚠ 이것이 «길이를 되돌려도 된다» 는 말은 아니다 — 길이는 ①타이밍 축의 값이고(5회차 지시),
       여기서 닫힌 것은 «길이가 **라벨 가독성** 을 통해 ④ 를 깎던 경로» 하나다. */
  const LRlongF = (longSettled && longBlank && longShotsF.length)
    ? await ev(p, INK, { a: longSettled.png, blank: longBlank.png, shots: longShotsF, box: longSettled.box }) : null;
  ok(!!LR0f && !!LRlongF && LRlongF.late && LR0f.late && LRlongF.late.r >= LR0f.late.r / 1.5,
     'H6 ★ **12회차가 «길이 ↔ 라벨» 경로도 흡수했다** — 페이드가 살아 있으면 옛 340ms 플래시로 되돌려도 창 밖이 안 더러워진다',
     (LRlongF && LRlongF.late ? ('옛 플래시(페이드 살림) t≥' + LT_LIVE + ' ' + r2(LRlongF.late.r) + ':1') : '측정 실패')
     + ' ↔ 페이드 살림·패치 걷음 ' + r2(LR0f && LR0f.late ? LR0f.late.r : 0) + ':1');
  await ev(p, () => {
    if (window.__v683ff) { window.fxFlash = window.__v683ff; window.__v683ff = null; }
    { const o = document.getElementById('__v683nogain'); if (o) o.remove(); }
    if (window.__v683to) { window.setTimeout = window.__v683to; window.requestAnimationFrame = window.__v683ri;
      window.__v683to = null; window.__v683ri = null; }
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  });

  /* ── [F] 불변 — 등재문 요구 ③ · 지불 이미터 ──────────────────────── */
  /* ── [J] 12회차 — 플래시가 «되그려야 하는 글자» 띠에서 α 를 뺀다 ────────────────
     11회차까지 남아 있던 ④ 의 마지막 자리(«플래시 판이 라벨 밑판을 밝힌다» — 채점 2인 1순위가
     두 회차 연속 일치)를 닫은 자리다. 회수·되돌림·대가의 **값**은 `probe683d` [4][5] 가 재고
     (그 자가 마스크·기준선을 들고 있다), 이 절은 그 처방이 **어떤 모양으로 서 있어야 하는가**를
     묶는다 — 손 상수로 굳지 않았는가 · 스코프가 이 화면 밖으로 안 새는가 · 자리가 잉크 윗변인가. */
  blk('J] 글자 앞에서 멈추는 상자 — 손잡이의 모양 · 스코프 · 자리 · 닫힌 액자 (12·13회차)');
  ok(/function fxKeepTxtTop\(el\)\{/.test(src) && /function fxFlashClampH\(el, top, h\)\{/.test(src),
     'J1 손잡이가 이름 있는 함수 둘이다(`fxKeepTxtTop`·`fxFlashClampH`) — 호출부에 산수를 안 적는다');
  ok(/function fxKeepTxtTop[\s\S]{0,600}querySelectorAll\(FXKEEP_TXT\)/.test(src),
     'J2 ★ 신고 목록을 **795 의 `FXKEEP_TXT` 에서 되읽는다** — «되그릴 잉크» 목록이 둘로 갈리지 않는다 '
     + '(갈리면 한쪽만 늘어나는 날 조용히 어긋난다)');
  ok(/function fxFlashClampH[\s\S]{0,500}FXFLASH_PEAK/.test(src),
     'J3 ★ 봉우리 보정에 이미 있는 `FXFLASH_PEAK` 를 쓴다 — 상자는 **중심 기준**으로 1.06 배 커지므로 '
     + '보정을 안 하면 봉우리에서 아래변이 잉크를 ≈3px 밟는다(손 상수 0개)');
  ok(!/fxFlashFade/.test(src) && !/maskImage/.test(src),
     'J4 ★ **마스크를 안 쓴다** — 12회차의 α 감산은 «아래 레일이 0장인 ㄷ 자 액자» 를 만들었고 '
     + '채점 2인이 각자 그것을 새 결손으로 잡았다(13회차 정정)');
  const fade = await ev(p, () => {
    const L = document.getElementById('fxl'); if (!L) return null;
    while (L.firstChild) L.removeChild(L.firstChild);
    const card = document.querySelector('.rw-c[data-rw]'); const icon = card && card.querySelector('i');
    if (!card || !icon) return null;
    const rd = host => { fxFlash(host, 340, false, true);
      const f = L.querySelector('.fx-flash');
      const q = fxRect(host);
      const o = f ? { top: parseFloat(f.style.top), h: parseFloat(f.style.height),
                      mask: getComputedStyle(f).maskImage || getComputedStyle(f).webkitMaskImage || 'none',
                      hostH: q ? q.h : null, hostY: q ? q.y : null } : null;
      while (L.firstChild) L.removeChild(L.firstChild); return o; };
    const A = rd(card), B = rd(icon);
    const keep = window.fxKeepTxtTop; window.fxKeepTxtTop = () => null;
    const A0 = rd(card); window.fxKeepTxtTop = keep;
    return { A, A0, B, kt: (typeof fxKeepTxtTop === 'function') ? fxKeepTxtTop(card) : null,
             peak: (typeof FXFLASH_PEAK === 'number') ? FXFLASH_PEAK : 1 };
  });
  const r2b = v => (v == null ? '—' : Math.round(v * 100) / 100);
  info('신고 호스트(유물 카드) 상자', fade && fade.A
    ? ('h ' + r2b(fade.A.h) + ' ↔ 신고 없음 ' + r2b(fade.A0 && fade.A0.h) + ' · 호스트 ' + r2b(fade.A.hostH)
       + ' · 마스크 ' + fade.A.mask) : '측정 실패');
  info('형제 호스트(아이콘 상자)', fade && fade.B ? ('h ' + r2b(fade.B.h) + ' ↔ 호스트 ' + r2b(fade.B.hostH)) : '측정 실패');
  ok(!!fade && !!fade.A && !!fade.A0 && fade.A.h < fade.A0.h - 1,
     'J5 신고 잉크를 **가진** 호스트에서만 상자가 짧아진다',
     fade && fade.A ? (r2b(fade.A.h) + ' < 신고 없음 ' + r2b(fade.A0.h)) : '측정 실패');
  ok(!!fade && !!fade.B && fade.B.hostH != null && Math.abs(fade.B.h - fade.B.hostH) <= 0.01,
     'J6 ★ **스코프의 짝** — 그 잉크가 없는 호스트는 상자가 호스트 rect 그대로다. 09·12·17·코스튬·장비·'
     + '훈련·단련·룬이 한 픽셀도 안 바뀌는 근거가 이 항이다(`verify619` [K6] 와 같은 축)',
     fade && fade.B ? (r2b(fade.B.h) + ' ↔ ' + r2b(fade.B.hostH)) : '측정 실패');
  const bot = fade && fade.A ? fade.A.top + fade.A.h / 2 + (fade.A.h / 2) * fade.peak : null;
  ok(bot != null && fade.kt != null && Math.abs(bot - fade.kt) <= 1.0,
     'J7 ★ 아래변이 **봉우리(`scale 1.06`)에서 신고 잉크 윗변에 정확히 닿는다**(±1px) — 그 아래면 글자를 '
     + '계속 밝히고, 너무 위면 플래시를 필요 이상으로 깎는다',
     bot != null && fade.kt != null ? ('봉우리 아래변 ' + r2b(bot) + ' ↔ 잉크 윗변 ' + r2b(fade.kt)) : '측정 실패');
  ok(!!fade && !!fade.A && !/gradient/.test(String(fade.A.mask)),
     'J8 ★ **액자가 닫혀 있다** — 마스크 0건이라 네 변이 다 그려진다(12회차 «ㄷ 자» 결손의 회귀 게이트)',
     fade && fade.A ? String(fade.A.mask) : '측정 실패');
  /* ⚑⚑ **16회차 — 액자는 호스트 중심에 선다(대칭).** 13~15회차는 아래변만 올려 상자를 짧게 했고,
     그러자 위 여백 6 ↔ 아래 여백 27(Δ21px) · 중심 10.5px 위가 됐다. 비평가 **넷이 세 회차 연속**
     그것을 짚었다(§13-5-2 21px · §15-5 2번 20px — 두 진단이 1px 안에서 같다).
     ⚠ §15-5 2번의 가설(«노드 상자 ↔ 잉크 bbox»)은 `probe683f` [2] 가 **기각**했다(3.73px 뿐) —
       임자는 «라벨 잉크가 카드 하변 20px 위에서 시작한다» 이고, 아래는 더 못 내려가므로
       **위를 그만큼 들이는 것**이 유일한 길이다. [J7] 은 그 위에서도 그대로 성립한다
       (분모가 `1+PEAK` → `PEAK` 로 바뀐 것은 «윗변 고정» 이 «중심 고정» 이 됐기 때문이다). */
  const gT = fade && fade.A && fade.A.hostY != null ? fade.A.top - fade.A.hostY : null;
  const gB = fade && fade.A && fade.A.hostY != null
    ? (fade.A.hostY + fade.A.hostH) - (fade.A.top + fade.A.h) : null;
  info('신고 호스트 여백 — 위 ↔ 아래', gT == null ? '측정 실패' : (r2b(gT) + ' ↔ ' + r2b(gB)));
  ok(gT != null && Math.abs(gT - gB) <= 1.0,
     'J9 ★ **액자가 호스트 중심에 선다** — 위·아래 여백이 1px 안에서 같다(CT·CU·CV·CW 4인이 3회차 연속 짚은 비대칭이 닫힌다)',
     gT != null ? ('Δ(위−아래) ' + r2b(gT - gB) + 'px') : '측정 실패');
  ok(gT != null && fade.A0 && Math.abs((fade.A0.top - fade.A.hostY) - (fade.A0.h ? ((fade.A.hostY + fade.A.hostH) - (fade.A0.top + fade.A0.h)) : NaN)) <= 1.0,
     'J10 ★ **스코프의 짝** — 신고 잉크가 없는 사본도 위·아래가 같다(그쪽은 애초에 안 짧아지므로 «띠 = 띠» 다) = 이 손이 그 호스트를 한 픽셀도 안 건드렸다',
     fade && fade.A0 ? ('위 ' + r2b(fade.A0.top - fade.A.hostY) + ' ↔ 아래 ' + r2b((fade.A.hostY + fade.A.hostH) - (fade.A0.top + fade.A0.h))) : '측정 실패');

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
