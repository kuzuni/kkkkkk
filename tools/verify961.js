/* 작업 961 — 10 이용권 배지 **윗줄** 검정 획 선언 8 → 10.
 *
 * 무엇을 지키는 자인가 —
 *   895 1회차가 «배지 두 줄의 잉크» 를 자로 재기 시작했고, 아랫줄은 2회차에 닫혔다(fs 31 · 획 7).
 *   **윗줄 획만** 열린 채였는데 이유가 «결손이 없어서» 가 아니라 **«자가 갈려서»** 였다 —
 *     GH(비평) ref 6.54 ↔ 우리 6.58 = **0% «맞다»** · GI(비평) −15% · `scan895` ⓐ(교차점) **−20.3%**
 *   셋이 전부 «교차점» 계열이라 서로를 못 가렸다(932 2회차 ⓕ-2 의 진단).
 *   932 8회차가 계열이 다른 **넷째 자** = `scan932` ⓑ(질량 적분)를 **같은 광선·같은 표본** 위에 얹어
 *   **−17.3%** 를 냈고(그 추정기는 `verify932` [R3] 이 «참값을 ±2% 로 되찾는다» 로 검산해 둔 것이다),
 *   ⇒ GH 의 «맞다» 가 기각되고 «윗줄 획은 얇다» 가 확정됐다. [1-k] 의 환산비 0.534 로 선언에 옮기면
 *   ⓐ 10.10 · ⓑ 9.73 = **둘 다 10**(현행 8).
 *
 * ⚑ 그 10 은 **계산값**이라 그대로 안 썼다(338 규칙 — 처방 전에 재현한다).
 *   `probe961` 이 선언 8·9·10·11·12 를 실제로 굴려 그려진 획을 화소로 쟀다:
 *
 *     선언 |  ⓐ 교차점 Δ | ⓑ 질량 Δ | 두 줄 빈 띠 Δ | 노랑 AABB Δ | 아랫줄 획 Δ
 *        8 |    −20.3%  |  −17.3%  |     −3.0%    |    +1.4%    |   −1.3%
 *        9 |    −10.2%  |   −6.8%  |     −3.0%    |    +1.4%    |   −1.3%
 *     **10**|   **−0.3%**| **+2.8%**|   **−3.0%**  |  **+1.4%**  | **−1.3%**
 *       11 |     +9.1%  |  +12.3%  |     −3.0%    |    +1.4%    |   −1.3%
 *       12 |    +18.4%  |  +22.6%  |     −3.0%    |    +1.4%    |   −1.3%
 *
 *   ⇒ **두 자가 같은 칸(10)을 골랐다.** 계산과 그림이 같은 답이다.
 *
 * ⚠ **대가는 0px 이고, 그것이 «못 쟀다» 가 아니라 «구조적으로 안 움직인다» 임을 §3 이 못박는다.**
 *   961 등재문의 걱정 ②(«획이 두꺼워지면 두 줄 빈 띠·노랑 AABB 가 따라 움직이는가»)의 답이다 —
 *   `paint-order:stroke fill` 이라 획은 노랑 채움 **뒤**에 깔리고, §C 의 두 축은 **노랑 마스크**로
 *   재므로 선언이 무엇이든 같은 값이 나온다. 그래서 §3 은 «대역 안» 만 묻지 않고
 *   **«8 주입본과 한 자도 안 다르다»** 를 같이 묻는다(대역만 물으면 무르게 통과한다).
 *   ⚑ 그러나 «§C 가 못 보는 대가» 는 따로 있다 — **검정이 빈 띠를 얼마나 채우는가** 다.
 *   §3-c 가 그 몫을 ref 와 나란히 재서, 획을 키우다 두 줄이 ref 보다 더 붙어 버리는 것을 막는다.
 *
 * ⚠ 아랫줄 7 은 **건드리지 않았다** — 895 1회차가 5 로 내렸다가 2회차에 되돌린 자리다.
 *   §4 가 그 독립을 화소로 못박는다(한 줄만 만졌는데 다른 줄이 움직이면 자가 두 줄을 섞은 것이다).
 *
 * 이관: `verify833` [1-k](선언 8/7 → 10/7) · `verify895` [B3]([B3] 이 양성으로 들고 있던 잔차를
 *       «닫힌 축» 으로) · `verify895` [B5](대역 −14~−21% → −4~+8%). [B6] 은 ref 만 읽어 무수정.
 *
 * 실행: node tools/verify961.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { py } = require('./pydep937');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, msg, got) => {
  if (c) { pass++; console.log('  ok  ' + msg + (got ? ' — ' + got : '')); }
  else { fail++; console.log('FAIL  ' + msg + (got ? ' — ' + got : '')); }
};
const blk = (t) => console.log('\n' + t);
const pc = (o, r) => ((o / r - 1) * 100);
const p2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

async function shot(page, out, css) {
  await page.evaluate((c) => {
    const old = document.getElementById('r961'); if (old) old.remove();
    if (c) { const s = document.createElement('style'); s.id = 'r961'; s.textContent = c; document.head.appendChild(s); }
  }, css || '');
  await page.waitForTimeout(120);
  const geo = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (r) => ({ x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
                          w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    return { frameH: +A.height.toFixed(1), cards: [...document.querySelectorAll('.pvc')].map((c) => {
      const o = box(c.getBoundingClientRect()); o.id = c.dataset.pv;
      const b = c.querySelector('.bdg'); o.bdg = b ? box(b.getBoundingClientRect()) : null;
      return o;
    }) };
  });
  await page.locator('#app').screenshot({ path: out });
  return geo;
}

function scan(tool, png, geo) {
  const gj = png.replace(/\.png$/, '.json');
  fs.writeFileSync(gj, JSON.stringify(geo));
  const out = py(['tools/' + tool, '--cap', path.relative(ROOT, png),
    '--geo', path.relative(ROOT, gj), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const line = out.split('\n').find((l) => l.startsWith('JSON '));
  if (!line) throw new Error(tool + ' 이 JSON 을 못 냈다:\n' + out);
  return JSON.parse(line.slice(5));
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v961-'));

  /* ── §1 선언 ────────────────────────────────────────────────────────────
     그림보다 먼저 «무엇이라고 적혀 있는가» 를 묻는다. 소스와 계산값 둘 다 본다 —
     한쪽만 보면 특이성 함정(#shopw ID 급 규칙)이 조용히 삼킨 선언을 «들어갔다» 로 읽는다. */
  blk('§1 선언 — 윗줄 10 · 아랫줄 7');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const upDecl = src.match(/\.pvc>\.bdg>i\{[^}]*\}/s);
  const loDecl = src.match(/\.pvc>\.bdg>b\{[^}]*\}/s);
  ok(!!upDecl && /-webkit-text-stroke:10px #000/.test(upDecl[0]),
    `[1-a] 제품 소스의 윗줄 선언이 **10px** (961 — 8 에서 옮겼다)`,
    upDecl ? (upDecl[0].match(/-webkit-text-stroke:[^;]*/) || ['—'])[0] : '선언을 못 찾았다');
  ok(!!loDecl && /-webkit-text-stroke:7px #000/.test(loDecl[0]),
    `[1-b] 아랫줄 선언은 **7px 불변** — 895 2회차가 5 → 7 로 되돌려 굳힌 자리다(건드리지 마라)`,
    loDecl ? (loDecl[0].match(/-webkit-text-stroke:[^;]*/) || ['—'])[0] : '선언을 못 찾았다');

  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    S.dia = 3e5; S.gold = 1e9; S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; x.classList.remove('fresh'); });
    openShopTab('pass');
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
  });
  await page.waitForTimeout(150);

  /* ⚠ 계산값도 같이 묻는다 — `#shopw i,…{…}`(ID 급 1,0,1)가 `.pvc>.bdg>i`(0,3,1)를 이기는 자리라
     선언이 들어가고도 안 먹은 전례가 이 배지에만 둘이다(885 4회차 `transform-origin` · 933 `font-weight`). */
  const cs = await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).webkitTextStrokeWidth) : null; };
    return { up: g('.pvc>.bdg>i'), lo: g('.pvc>.bdg>b') };
  });
  ok(cs.up === 10 && cs.lo === 7,
    `[1-c] **계산된** 획도 10/7 — 선언이 ID 급 규칙에 안 먹힌다(이 배지에서 두 번 난 함정의 되돌림 시험)`,
    `${cs.up} · ${cs.lo}`);

  /* ── §2 그려진 획 — 두 자로 같이 묻는다 ───────────────────────────────
     선언이 옳아도 그림이 옳다는 뜻은 아니다. 932 8회차가 세운 두 자(ⓐ 교차점 · ⓑ 질량 적분)를
     **같은 광선** 위에서 같이 돌려, 계열이 다른 둘이 같이 초록일 때만 통과시킨다. */
  const png = path.join(dir, 'now.png');
  const g0 = await shot(page, png);
  const m = scan('scan895.py', png, g0);
  const m9 = scan('scan932.py', png, g0);
  blk('§2 그려진 획 — ⓐ 교차점 · ⓑ 질량 적분이 같이 닫혔는가');
  ok(m.cards >= 2, `[2-a] 배지가 보이는 카드를 둘 이상 재고 있다`, `${m.cards}장`);
  /* ⚑ ref 는 자의 고정점이다 — 여기가 움직이면 아래 판정은 전부 다른 그림 이야기다. */
  ok(Math.abs(m.ref_s_up - 5.393) <= 0.1 && Math.abs(m9.ref_mass_up - 5.197) <= 0.1,
    `[2-b] ref 윗줄 획 실측이 재현된다 — ⓐ 5.393 · ⓑ 5.197 (932 8회차 값 · 자의 고정점)`,
    `${m.ref_s_up} · ${m9.ref_mass_up}`);
  ok(Math.abs(pc(m.our_s_up, m.ref_s_up)) <= 5,
    `[2-c] ⓐ(교차점) 잔차가 ref ±5% 안 — 수리 전 −20.3%`,
    `ref ${m.ref_s_up} ↔ 우리 ${m.our_s_up} (${pc(m.our_s_up, m.ref_s_up).toFixed(1)}%)`);
  ok(m9.d_mass_up >= -4 && m9.d_mass_up <= 8,
    `[2-d] ⓑ(질량 적분) 잔차가 −4~+8% 안 — 수리 전 −17.3% (계열이 다른 자가 같이 닫혔다)`,
    `ref ${m9.ref_mass_up} ↔ 우리 ${m9.our_mass_up} (${m9.d_mass_up}%)`);
  /* ⚠ 두 자가 **같은 광선**을 쓰는지부터가 이 절의 전제다(932 8회차 [B4] 와 같은 항) —
     셋째 자가 제 창을 따로 잡았다면 [2-c]·[2-d] 는 비교가 아니라 우연히 나란한 두 수다. */
  ok(Math.abs(m9.our_cross_up - m.our_s_up) <= 0.05 && Math.abs(m9.ref_cross_up - m.ref_s_up) <= 0.05,
    `[2-e] 두 자가 **같은 광선**을 쓴다 — ⓑ 의 자로 ⓐ 를 다시 내면 §2 의 값과 붙는다`,
    `ⓐ 우리 ${m9.our_cross_up} ↔ ${m.our_s_up} · ref ${m9.ref_cross_up} ↔ ${m.ref_s_up}`);
  ok(errs.length === 0, `[2-f] 콘솔 에러 0건`, `${errs.length}`);

  /* ── §3 대가 — §C 두 축이 **구조적으로** 안 움직인다 ───────────────────
     ⚑ «대역 안» 만 묻지 않는다. 선언 8 을 주입한 사본과 **한 자도 안 다른가**를 같이 물어야
     «획을 키웠는데 마침 대역 안이었다» 와 «획은 이 축에 애초에 닿지 않는다» 가 갈린다. */
  const png8 = path.join(dir, 's8.png');
  const g8 = await shot(page, png8, '#shopw .pvc>.bdg>i{-webkit-text-stroke:8px #000}');
  const m8 = scan('scan895.py', png8, g8);
  const m98 = scan('scan932.py', png8, g8);
  blk('§3 대가 — 두 줄 빈 띠 · 노랑 AABB (961 등재문 ②)');
  ok(Math.abs(pc(m.our_gap, m.ref_gap)) <= 8,
    `[3-a] 두 줄 «빈 띠» 가 ref ±8% 안 (verify895 [C1] 과 같은 자·같은 대역)`,
    `ref ${m.ref_gap} ↔ 우리 ${m.our_gap} (${pc(m.our_gap, m.ref_gap).toFixed(1)}%)`);
  ok(Math.abs(pc(m.our_bh, m.ref_bh)) <= 4,
    `[3-b] 노랑 AABB 높이가 ref ±4% 안 (verify895 [C2] 와 같은 자·같은 대역)`,
    `ref ${m.ref_bh} ↔ 우리 ${m.our_bh} (${pc(m.our_bh, m.ref_bh).toFixed(1)}%)`);
  /* ⚑⚑ 이 항이 §3 의 본체다 — 선언을 2px 되돌려도 두 축이 **같은 값**이면 그 대가는 0 이 아니라
     **구조적으로 없다**(`paint-order:stroke fill` + 노랑 마스크). 걱정 ② 의 답이 여기 있다. */
  ok(Math.abs(m.our_gap - m8.our_gap) <= 0.01 && Math.abs(m.our_bh - m8.our_bh) <= 0.01,
    `[3-d] 선언 8 주입본과 **한 자도 안 다르다** — 획은 노랑 채움 뒤에 깔리고 §C 는 노랑 마스크로 잰다(대가가 «작다» 가 아니라 «구조적으로 없다»)`,
    `빈 띠 ${m.our_gap} ↔ ${m8.our_gap} · AABB ${m.our_bh} ↔ ${m8.our_bh}`);
  /* ⚑ 그러나 §C 가 **못 보는** 대가가 하나 있다 — 검정이 빈 띠를 얼마나 채우는가.
     두 줄의 바깥 획이 합쳐 빈 띠를 넘으면 두 줄의 검정이 붙는다. ref 도 거의 붙어 있으므로
     («ref 9.12 / 빈 띠 9.28 = 0.983») 목표는 «0 으로 만들기» 가 아니라 **ref 와 같은 정도**다. */
  const fillOur = (m.our_s_up + m.our_s_lo) / m.our_gap;
  const fillRef = (m.ref_s_up + m.ref_s_lo) / m.ref_gap;
  const fill8 = (m8.our_s_up + m8.our_s_lo) / m8.our_gap;
  ok(Math.abs(fillOur - fillRef) <= 0.10,
    `[3-c] 검정이 «빈 띠» 를 채우는 몫이 ref ±0.10 안 — §C 의 노랑 자가 못 보는 대가를 여기서 잰다 (선언 8 이면 ${p2(fill8)})`,
    `ref ${p2(fillRef)} ↔ 우리 ${p2(fillOur)}`);

  /* ── §4 아랫줄 독립 ─────────────────────────────────────────────────── */
  blk('§4 아랫줄 — 한 줄만 만졌다');
  ok(Math.abs(pc(m.our_s_lo, m.ref_s_lo)) <= 10,
    `[4-a] 아랫줄 획이 ref ±10% 안 그대로 (verify895 [B1] 과 같은 대역 — 895 2회차가 닫은 축)`,
    `ref ${m.ref_s_lo} ↔ 우리 ${m.our_s_lo} (${pc(m.our_s_lo, m.ref_s_lo).toFixed(1)}%)`);
  ok(Math.abs(m.our_s_lo - m8.our_s_lo) <= 0.05,
    `[4-b] 윗줄 선언을 되돌려도 아랫줄 획은 안 움직인다 — 두 줄이 독립 손잡이(자가 줄을 안 섞는다)`,
    `${m.our_s_lo} ↔ ${m8.our_s_lo}`);
  ok(Math.abs(pc(m.our_t_lo, m.ref_t_lo)) <= 4 && Math.abs(pc(m.our_t_up, m.ref_t_up)) <= 8.5,
    `[4-c] 두 줄의 **잉크 두께**(노랑)는 895 가 닫은 자리 그대로 — 획은 채움을 안 민다`,
    `아래 ${pc(m.our_t_lo, m.ref_t_lo).toFixed(1)}% · 위 ${pc(m.our_t_up, m.ref_t_up).toFixed(1)}%`);

  /* ── §R 되돌림 시험 ─────────────────────────────────────────────────
     «무르게 푼 수리가 아니다» — 옛 값(8)과 한 칸 이웃(9·11)을 주입해 §2 가 실제로 빨개지는지 본다.
     ⚠ 주입은 `#shopw` 급으로 한다(0,3,1 로 적으면 안 먹고 시험이 조용히 초록이 된다). */
  blk('§R 되돌림 시험 — 옛 값·이웃 칸으로 돌리면 빨개지는가');
  ok(pc(m8.our_s_up, m8.ref_s_up) <= -15 && m98.d_mass_up <= -14,
    `[R1] 선언을 **8** 로 되돌리면 두 자가 같이 −15% 넘게 얇아진다 (932 8회차가 등재한 −20.3% · −17.3% 의 재현)`,
    `ⓐ ${pc(m8.our_s_up, m8.ref_s_up).toFixed(1)}% · ⓑ ${m98.d_mass_up}%`);
  const png9 = path.join(dir, 's9.png');
  const g9 = await shot(page, png9, '#shopw .pvc>.bdg>i{-webkit-text-stroke:9px #000}');
  const m_9 = scan('scan895.py', png9, g9);
  ok(Math.abs(pc(m_9.our_s_up, m_9.ref_s_up)) > 5,
    `[R2] **한 칸 이웃(9)** 도 대역 밖 — 대역 ±5% 가 «10 을 고른다» 는 뜻이지 «대충 두꺼우면 된다» 가 아니다`,
    `${pc(m_9.our_s_up, m_9.ref_s_up).toFixed(1)}%`);
  const png11 = path.join(dir, 's11.png');
  const g11 = await shot(page, png11, '#shopw .pvc>.bdg>i{-webkit-text-stroke:11px #000}');
  const m_11 = scan('scan895.py', png11, g11);
  const m9_11 = scan('scan932.py', png11, g11);
  ok(pc(m_11.our_s_up, m_11.ref_s_up) > 5 && m9_11.d_mass_up > 8,
    `[R3] 반대편 이웃(11)도 대역 밖 — 과교정 쪽으로도 문이 닫혀 있다 (895 1회차가 아랫줄에서 한 번 넘어간 방향)`,
    `ⓐ ${pc(m_11.our_s_up, m_11.ref_s_up).toFixed(1)}% · ⓑ ${m9_11.d_mass_up}%`);
  /* ⚑ **[3-d] 의 되돌림 시험** — 11 에서도 §C 두 축이 같은 값이어야 «구조적» 이 참이다.
     한 칸에서만 안 움직이는 것은 우연일 수 있다. */
  ok(Math.abs(m_11.our_gap - m.our_gap) <= 0.01 && Math.abs(m_11.our_bh - m.our_bh) <= 0.01,
    `[R4] 11 에서도 §C 두 축이 같은 값 — [3-d] 의 «구조적» 이 한 칸의 우연이 아니다`,
    `빈 띠 ${m_11.our_gap} · AABB ${m_11.our_bh}`);

  await shot(page, path.join(dir, 'clean.png'));   // 주입 원복
  await b.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nVERIFY961 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
