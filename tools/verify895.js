/* 작업 895 — 10 이용권 배지 «2000% / 가치» 두 줄의 **잉크 두께**(그리고 그 짝인 길이·검정 획).
 *
 * 무엇을 지키는 자인가 —
 *   885 4회차가 각도·간격을 닫으면서 남긴 몫이 «우리 글자가 ref 보다 두껍다» 하나였는데,
 *   그 값은 **회차 기록에 손으로 적힌 수**였고 재현할 자가 저장소에 없었다(338 규칙 위반 자리).
 *   895 1회차가 자(`tools/scan895.py`)를 세워 ref 와 우리를 **같은 방법**으로 재니
 *   결손이 «두 줄 다 두껍다» 가 아니라 **«아랫줄 하나가 통째로 크다»** 였다:
 *
 *     축(우리 px 환산 · ref×K=2.0628)  | ref    | 수리 전 | Δ       | 수리 후 | Δ
 *     두께(베이스라인 수직) 윗줄        |  30.20 | 32.07  | +6.2%   | 32.03 | +6.0%
 *     두께               아랫줄        |  23.26 | 27.22  | **+17.0%** | 23.14 | **−0.5%**
 *     길이(베이스라인 방향) 아랫줄      |  52.32 | 58.96  | **+12.7%** | 51.46 | **−1.7%**
 *     검정 획             아랫줄        |   2.06 |  3.00  | **+45.4%** |  2.00 | **−3.0%**
 *     두 줄 빈 띠                       |   9.28 |  8.94  | −3.7%   |  9.00 | −3.0%
 *     노랑 AABB 높이                    |  90.76 | 94.00  | +3.6%   | 92.00 | +1.4%
 *
 *   ⇒ 손잡이는 **아랫줄 `font-size` 36 → 31 · `-webkit-text-stroke` 7 → 5** 둘뿐이고,
 *      셋(두께·길이·획)을 **같이** 닫는다. 상자 값(`top`)은 그 그림을 따라 0.5px 옮겼다([1-o] 이관).
 *
 * ⚠ **윗줄은 손대지 않았고 그것이 답이다.** 윗줄 잔차(두께 +6.0% · 길이 +3.0%)는 손잡이가 없다 —
 *    833 3회차가 윗줄 **글리프 폭**은 이미 ref +1.5% 로 맞다고 재 놓았으므로(그 자리의 답은
 *    `letter-spacing` 이었다 = `verify833` [1-g]·[1-h]), fs 나 배율로 «높이» 를 좇으면 맞아 있던
 *    폭을 틀리게 만든다. 남은 것은 **«좁고 높은 서체»** 라는 서체 축이고 지시서 [3] 이 감점에서 뺀 자리다.
 *    ⇒ [P2] 가 그 잔차를 **양성으로 못박는다** — 누가 윗줄 fs 를 건드리면 그 항이 먼저 빨개진다.
 *
 * 자는 `python3 tools/scan895.py --json` 이다(verify12 선례 — 화소는 파이썬이 재고 이 자는 판정만 한다).
 *
 * 실행: node tools/verify895.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { execFileSync } = require('child_process');
const { py } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»
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

/* 캡처 한 장 = 「index.html 을 열고 이용권 탭에 착지해 #app 을 찍는다」.
   cap151.js 와 같은 순서를 쓴다(유휴 루프·전투 캔버스·등장 애니메이션 정지 — LESSONS 28-③·51-③). */
async function shot(page, out, css) {
  await page.evaluate((c) => {
    const old = document.getElementById('r895'); if (old) old.remove();
    if (c) { const s = document.createElement('style'); s.id = 'r895'; s.textContent = c; document.head.appendChild(s); }
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

function measure(png, geo) {
  const gj = png.replace(/\.png$/, '.json');
  fs.writeFileSync(gj, JSON.stringify(geo));
  const out = py(['tools/scan895.py', '--cap', path.relative(ROOT, png),
    '--geo', path.relative(ROOT, gj), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const line = out.split('\n').find((l) => l.startsWith('JSON '));
  if (!line) throw new Error('scan895 가 JSON 을 못 냈다:\n' + out);
  return JSON.parse(line.slice(5));
}

/* 932 8회차 — 셋째 자(질량 적분 ⓑ). `measure()` 가 이미 쓴 기하 JSON 을 그대로 먹는다. */
function measure932(png, geo) {
  const gj = png.replace(/\.png$/, '.json');
  if (!fs.existsSync(gj)) fs.writeFileSync(gj, JSON.stringify(geo));
  const out = py(['tools/scan932.py', '--cap', path.relative(ROOT, png),
    '--geo', path.relative(ROOT, gj), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const line = out.split('\n').find((l) => l.startsWith('JSON '));
  if (!line) throw new Error('scan932 가 JSON 을 못 냈다:\n' + out);
  return JSON.parse(line.slice(5));
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v895-'));
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

  /* ── §전제 ─────────────────────────────────────────────────────────────
     자가 무엇을 보고 있는지부터 못박는다. 이 절이 빨가면 아래 판정은 전부 무의미하다. */
  const g0 = await shot(page, path.join(dir, 'now.png'));
  const m = measure(path.join(dir, 'now.png'), g0);
  blk('§전제 — 자가 ref 를 제대로 물고 있는가');
  ok(m.cards >= 2, `[P0] 배지가 보이는 카드를 둘 이상 재고 있다`, `${m.cards}장`);
  /* ⚑ ref 값은 **자의 고정점**이다 — 창(REF_WIN)이나 마스크를 건드리면 여기가 먼저 움직인다. */
  ok(Math.abs(m.ref_t_up - 30.20) <= 0.6 && Math.abs(m.ref_t_lo - 23.26) <= 0.6,
    `[P1] ref 두께 실측이 재현된다 (윗줄 30.20 · 아랫줄 23.26 — 895 1회차 값)`,
    `${m.ref_t_up} · ${m.ref_t_lo}`);
  /* ⚑⚑ **윗줄 잔차를 «없다» 고 적지 않는다.** 두께가 +5~7% 로 남아 있는 것이 이 회차의 판단이고
     (폭은 이미 맞아서 손잡이가 없다 — 서체 축), 누가 윗줄 fs 를 건드리면 이 항이 먼저 빨개진다.
     ⚠ 이 항은 «맞다» 가 아니라 «이 값에서 멈춰 있다» 를 지킨다. */
  ok(pc(m.our_t_up, m.ref_t_up) >= 3.5 && pc(m.our_t_up, m.ref_t_up) <= 8.5,
    `[P2] 윗줄 두께 잔차가 **그대로 +6% 안**(손잡이 없음 — 글리프 폭이 이미 맞아 fs 로 좇으면 833 [1-g]·[1-h] 를 되돌린다)`,
    `${pc(m.our_t_up, m.ref_t_up).toFixed(1)}%`);
  ok(errs.length === 0, `[P3] 콘솔 에러 0건`, `${errs.length}`);

  /* ── §A 아랫줄 두께 — 이 작업의 본체 ───────────────────────────────── */
  blk('§A 아랫줄 «두께» — 수리 전 +17.0%');
  ok(Math.abs(pc(m.our_t_lo, m.ref_t_lo)) <= 4,
    `[A1] 아랫줄 잉크 두께(베이스라인 수직)가 ref ±4% 안`,
    `ref ${m.ref_t_lo} ↔ 우리 ${m.our_t_lo} (${pc(m.our_t_lo, m.ref_t_lo).toFixed(1)}%)`);
  /* ⚑ 두께만 맞추고 길이가 어긋나면 «눌러 놓은 것» 이다 — 두 축을 **같이** 묻는다.
     한 손잡이(fs)로 닫혔다는 것이 이 항의 뜻이고, 세로 배율로 좇으면 여기가 빨개진다. */
  ok(Math.abs(pc(m.our_l_lo, m.ref_l_lo)) <= 5,
    `[A2] 같은 아랫줄의 **길이**도 ref ±5% 안 — 두께를 세로 배율로 좇지 않았다는 증거`,
    `ref ${m.ref_l_lo} ↔ 우리 ${m.our_l_lo} (${pc(m.our_l_lo, m.ref_l_lo).toFixed(1)}%)`);
  const rat = (m.our_t_lo / m.our_l_lo) / (m.ref_t_lo / m.ref_l_lo);
  ok(Math.abs(rat - 1) <= 0.06,
    `[A3] 아랫줄 «두께 ÷ 길이» 종횡이 ref 와 ±6% 안 — 등방으로 줄였다(356 규약)`, `${rat.toFixed(3)}`);

  /* ── §B 검정 획 ─────────────────────────────────────────────────────
     ⚠⚠ **이 절은 2회차가 통째로 다시 썼다.** 1회차는 «아랫줄 획 +45.4% ⇒ 7 → 5px» 로 판정했는데
     그 근거가 **자의 결함**이었다 — 획 걸음이 정수라 ref(우리보다 K=2.0628 배 작다)에서 값이
     **2.06 씩 바닥으로 깎였다**(1회차의 ref 2.063·4.126 = 정수 1·2 × K). 비평 GH·GI 가 각자
     다른 자로 같은 곳을 짚었고, 자를 부분 화소로 고치자 ref 아랫줄이 **3.73** 이 되어
     필요한 선언이 **6.99 ≈ 7** — 원래 값 — 로 나왔다. ⇒ 5 를 7 로 되돌렸다. */
  blk('§B 검정 획 — 2회차가 자를 부분 화소로 고치고 1회차의 과교정을 되돌렸다');
  ok(Math.abs(pc(m.our_s_lo, m.ref_s_lo)) <= 10,
    `[B1] 아랫줄 검정 획(밖으로 나온 몫)이 ref ±10% 안 (1회차 5px 일 때 −28.3%)`,
    `ref ${m.ref_s_lo} ↔ 우리 ${m.our_s_lo} (${pc(m.our_s_lo, m.ref_s_lo).toFixed(1)}%)`);
  /* ⚑⚑ **자가 정수로 세지 않는다는 것 자체를 항으로 세운다.** 이것이 1회차를 틀리게 한 결함이고,
     누가 걸음을 되돌리면(정수 세기) ref 값이 다시 K 의 배수로 굳어 이 항이 먼저 빨개진다.
     ⚠ «K 의 배수와 충분히 떨어져 있는가» 로 묻는다 — 값 자체를 적으면 자를 못 지킨다. */
  const near = (x) => Math.abs(x / 2.0628 - Math.round(x / 2.0628));
  ok(near(m.ref_s_lo) > 0.08 && near(m.ref_s_up) > 0.08,
    `[B2] 자가 ref 획을 **정수 화소로 세지 않는다** — 두 값이 K 의 배수에서 떨어져 있다 (1회차 결함의 되돌림 시험)`,
    `아래 ${m.ref_s_lo}(÷K=${(m.ref_s_lo / 2.0628).toFixed(3)}) · 위 ${m.ref_s_up}(÷K=${(m.ref_s_up / 2.0628).toFixed(3)})`);
  /* ⚑⚑ **961 이관 — 이 항은 «잔차가 그대로 있다» 에서 «잔차가 닫혔다» 로 뒤집혔다(333 처방).**
     2회차가 이 자리를 **양성으로** 등재한 이유는 «자가 갈렸다» 였다 —
     GH «ref 6.54 ↔ 우리 6.58 = 맞다» · GI «−15%» · 이 자 ⓐ «−20.3%» 셋이 전부 «교차점» 계열이라
     서로를 못 가렸고, 선언 8 은 `verify833` [1-k] 가 못박고 있었다.
     932 8회차가 계열이 다른 넷째 자(§B' ⓑ 질량 적분 −17.3%)로 GH 를 기각해 갈림을 닫았고,
     **961 이 선언을 8 → 10 으로 옮겼다**(`probe961` 이 8~12 를 굴려 화소로 확인 — 두 자가 같은 칸).
     ⇒ 이제 이 항은 **닫힌 축을 지킨다**: 누가 선언을 8 로 되돌리면 −20.3% 로, 9 면 −10.2%,
     11 이면 +9.1% 로 나가 이 항이 먼저 짖는다(대역 ±5% 는 그 세 칸을 전부 뺀다). */
  ok(Math.abs(pc(m.our_s_up, m.ref_s_up)) <= 5,
    `[B3] 윗줄 획 잔차가 **ref ±5% 안** — 961 이 선언 8 → 10 으로 닫았다 (8 이면 −20.3% · 9 면 −10.2% · 11 이면 +9.1%)`,
    `ref ${m.ref_s_up} ↔ 우리 ${m.our_s_up} (${pc(m.our_s_up, m.ref_s_up).toFixed(1)}%)`);

  /* ── §B' 셋째 자 — 932 8회차가 «자 갈림» 을 닫았다 ──────────────────
     ⚑⚑ [B3] 이 열어 둔 갈림(GH «맞다» / GI −15% / ⓐ −20.3%)의 뿌리는 **셋이 전부 «교차점» 계열**이라
     서로를 못 가린다는 것이었다(932 2회차 ⓕ-2). ⇒ 계열이 다른 넷째 관측 = **질량 적분 ⓑ**
     (`tools/scan932.py` · `scan667c.dark_mass` 의 연속 걸음판)를 **같은 광선·같은 표본** 위에 얹었다.
     같은 광선을 쓰므로 갈림이 «창이 달라서» 가 아니라 **«추정기가 달라서»** 임이 [B4] 로 못박힌다. */
  const m9 = measure932(path.join(dir, 'now.png'), g0);
  blk("§B' 셋째 자 (질량 적분 ⓑ) — 932 8회차가 «자 갈림» 을 닫았다");
  /* ⚑ 먼저 «같은 자리인가» 부터다 — 셋째 자가 제 창을 따로 잡았다면 아래 판정은 비교가 아니다. */
  ok(Math.abs(m9.ref_cross_up - m.ref_s_up) <= 0.05 && Math.abs(m9.our_cross_up - m.our_s_up) <= 0.05,
    `[B4] 셋째 자가 **같은 광선**을 쓴다 — 그 위에서 ⓐ 를 다시 내면 §B 의 값과 붙는다 (갈림의 원인이 창이 아니라 추정기임의 증거)`,
    `ⓐ ref ${m9.ref_cross_up} ↔ ${m.ref_s_up} · 우리 ${m9.our_cross_up} ↔ ${m.our_s_up}`);
  /* ⚑⚑ **GH(«맞다» = 0%)가 기각된 자리다.** ⓑ 는 저장소 자신의 물리 시험이 «참값을 ±2% 로 되찾는다»
     고 못박은 추정기고(`verify932` [R3]), 그 자가 −17% 를 낸다. ⇒ «윗줄 획은 얇다» 는 확정이고
     크기는 GI(−15%)와 ⓐ(−20.3%) **사이**다. 대역은 그 둘을 양 끝으로 잡는다. */
  /* ⚠ «ⓑ 가 ⓐ 를 그대로 되뇌지 않는가» 를 같이 묻는다 — 무르게 적은 ⓑ 는 ⓐ 와 붙어 버리고,
     그러면 이 절은 갈림을 «닫았다» 고 적으면서 실제로는 아무것도 안 가른 것이 된다.
     ⚑ 갈리는 쪽은 **ref 뿐**이다(우리 쪽은 둘이 0.001 로 붙는다) — 해상도가 낮은 그림에서만
     번짐이 비대칭이라 교차점이 밀린다는 뜻이고, 그것이 곧 ⓑ 를 고른 이유다. */
  /* ⚑⚑ **961 이관 — 잔차 대역을 «−14~−21%» 에서 «닫힌 자리» 로 옮겼다(333 처방).**
     932 8회차가 이 값을 낸 시점의 선언은 8 이었고, 그 −17.3% 가 곧 **961 의 근거**였다.
     선언을 10 으로 옮긴 지금 같은 자가 **+2.75%** 를 낸다 ⇒ 옛 대역을 그대로 두면
     «근거였던 수» 를 «지켜야 할 수» 로 착각해 수리 자체를 되돌리라고 짖는다.
     ⚠ 두 짝 항은 **그대로 살렸다** — ⓑ 가 ⓐ 를 되뇌지 않는다(ref 에서 둘이 0.1 이상 갈린다)는
     이 절의 존재 이유고, 선언과 무관하다(갈리는 쪽은 ref 뿐 — 아래 ⚑).
     되돌림: 선언 8 이면 −17.3% · 9 면 −6.8% · 11 이면 +12.3% 로 대역(−4~+8%) 밖이다. */
  ok(m9.d_mass_up >= -4 && m9.d_mass_up <= 8
     && Math.abs(m9.ref_mass_up - m9.ref_cross_up) >= 0.1,
    `[B5] ⓑ 질량 적분이 윗줄 잔차를 **−4~+8%** 로 낸다 — 961 이 선언을 10 으로 옮겨 닫은 자리 (8 이던 시절의 −17.3% 가 그 근거였다) · **GH «맞다»(0%)는 여전히 기각** (그리고 ⓑ 가 ⓐ 를 되뇌지 않는다)`,
    `ref ${m9.ref_mass_up} ↔ 우리 ${m9.our_mass_up} (${m9.d_mass_up}%) · ref 에서 ⓐ−ⓑ ${(m9.ref_cross_up - m9.ref_mass_up).toFixed(3)} · 우리 ${(m9.our_cross_up - m9.our_mass_up).toFixed(3)}`);
  /* ⚑ **세 자가 갈려도 «선언» 으로 옮기면 한 값에 모인다.** [1-k] 의 환산비 0.534(아랫줄 3.73 ⇒ 7)를
     그대로 쓰면 ⓐ 10.10 · ⓑ 9.73 — 둘 다 **10** 이다. 이것이 932 8회차가 낸 답이고,
     **961 이 선언을 8 → 10 으로 실제로 옮겼다**(`verify833` [1-k] 이관 · `probe961` 화소 스윕).
     ⚠ 이 항은 «10 으로 바꿔라» 가 아니라 «두 자의 환산이 한 칸에 모인다» 를 지킨다 —
     그래서 **ref 만 읽고 우리 선언은 안 본다**(선언이 움직여도 초록이어야 한다).
     자를 무르게 고쳐 둘이 갈라지면 여기가 먼저 빨개진다. */
  const dcl = (v) => v / 0.534;
  ok(Math.abs(dcl(m9.ref_cross_up) - dcl(m9.ref_mass_up)) <= 0.75
     && Math.round(dcl(m9.ref_cross_up)) === 10 && Math.round(dcl(m9.ref_mass_up)) === 10,
    `[B6] ⓐ·ⓑ 를 [1-k] 의 환산비(0.534)로 선언에 옮기면 **둘 다 10** 이다 (961 이 선언을 8 → 10 으로 옮겼다 — 이 항은 ref 만 읽는다)`,
    `ⓐ ${dcl(m9.ref_cross_up).toFixed(2)} · ⓑ ${dcl(m9.ref_mass_up).toFixed(2)}`);

  /* ── §C 아랫줄을 줄인 대가 ──────────────────────────────────────────
     크기를 줄이면 그 줄의 잉크가 상자 안에서 위로 뜬다 — 그래서 [1-o] 의 상자 값이 따라왔다.
     그 이관이 실제로 그림에서 값을 치렀는지 여기서 화소로 확인한다. */
  blk('§C 아랫줄을 줄인 대가 — 두 줄 사이가 안 벌어졌는가');
  ok(Math.abs(pc(m.our_gap, m.ref_gap)) <= 8,
    `[C1] 두 줄 «빈 띠» 가 ref ±8% 안 (상자를 안 옮기면 −13.8% 로 벌어진다)`,
    `ref ${m.ref_gap} ↔ 우리 ${m.our_gap} (${pc(m.our_gap, m.ref_gap).toFixed(1)}%)`);
  ok(Math.abs(pc(m.our_bh, m.ref_bh)) <= 4,
    `[C2] 노랑 AABB 높이가 ref ±4% 안 (수리 전 +3.6% — 885 4회차가 «남은 몫은 전부 잉크 두께» 라고 넘긴 그 값)`,
    `ref ${m.ref_bh} ↔ 우리 ${m.our_bh} (${pc(m.our_bh, m.ref_bh).toFixed(1)}%)`);
  ok(Math.abs(m.our_deg - m.ref_deg) <= 1.5,
    `[C3] 기울기는 안 움직였다 (885 4회차가 닫은 축 — ±1.5° 안)`,
    `ref ${m.ref_deg}° ↔ 우리 ${m.our_deg}°`);

  /* ── §R 되돌림 시험 ─────────────────────────────────────────────────
     «무르게 푼 수리가 아니다» 를 못박는 절이다. 옛 값을 도로 주입해 §A·§B 가 실제로 빨개지는지 본다.
     ⚠ `#shopw` 급 특이성으로 주입한다 — `.pvc>.bdg>b`(0,3,1)로 적으면 5926행 ID 급 규칙에
        져서 **한 픽셀도 안 먹고 시험이 조용히 초록**이 된다(885 4회차가 실제로 진 함정). */
  blk('§R 되돌림 시험 — 옛 값으로 돌리면 빨개지는가');
  const gR = await shot(page, path.join(dir, 'rev.png'),
    '#shopw .pvc>.bdg>b{font-size:36px;-webkit-text-stroke:5px #000;top:102.175px}');
  const r = measure(path.join(dir, 'rev.png'), gR);
  ok(pc(r.our_t_lo, r.ref_t_lo) > 10,
    `[R1] fs 를 36 으로 되돌리면 아랫줄 두께가 다시 +10% 넘게 커진다`,
    `${pc(r.our_t_lo, r.ref_t_lo).toFixed(1)}%`);
  ok(pc(r.our_l_lo, r.ref_l_lo) > 8,
    `[R2] 같은 되돌림에서 길이도 같이 커진다 — 두 축이 한 손잡이에 매달려 있다는 증거`,
    `${pc(r.our_l_lo, r.ref_l_lo).toFixed(1)}%`);
  ok(pc(r.our_s_lo, r.ref_s_lo) < -15,
    `[R3] 획을 **1회차의 5px** 로 내리면 검정 획이 다시 −15% 넘게 얇아진다 (1회차 과교정의 되돌림 시험)`,
    `${pc(r.our_s_lo, r.ref_s_lo).toFixed(1)}%`);
  /* ⚑ **획만 되돌리는 시험** — fs 와 획이 서로를 가리지 않는다는 것(둘은 독립 손잡이다).
     `paint-order:stroke fill` 이라 획은 노랑 «채움» 을 안 건드린다 ⇒ 두께는 초록이어야 한다. */
  const gR2 = await shot(page, path.join(dir, 'rev2.png'),
    '#shopw .pvc>.bdg>b{-webkit-text-stroke:5px #000}');
  const r2 = measure(path.join(dir, 'rev2.png'), gR2);
  ok(pc(r2.our_s_lo, r2.ref_s_lo) < -15 && Math.abs(pc(r2.our_t_lo, r2.ref_t_lo)) <= 4,
    `[R4] 획**만** 옮기면 §B 만 빨갛고 §A 는 초록 — 두 손잡이가 서로를 안 가린다 (\`paint-order:stroke fill\` 이라 획은 노랑 채움을 안 건드린다)`,
    `획 ${pc(r2.our_s_lo, r2.ref_s_lo).toFixed(1)}% · 두께 ${pc(r2.our_t_lo, r2.ref_t_lo).toFixed(1)}%`);
  /* ⚑ **세로 배율로 좇았으면 어땠는가** — 등재문 후보 ⓑ 를 실제로 그려 [A2]·[A3] 이 무는지 본다.
     ⓑ 는 두께만 맞추고 길이를 안 건드리므로 종횡이 깨진다(356 «확대는 등방» 의 반대편). */
  const gR3 = await shot(page, path.join(dir, 'rev3.png'),
    '#shopw .pvc>.bdg>b{font-size:36px;transform:rotate(15deg) scaleY(0.85)}');
  const r3 = measure(path.join(dir, 'rev3.png'), gR3);
  const rat3 = (r3.our_t_lo / r3.our_l_lo) / (r3.ref_t_lo / r3.ref_l_lo);
  ok(Math.abs(rat3 - 1) > 0.06,
    `[R5] 후보 ⓑ(세로 배율)로 좇으면 «두께 ÷ 길이» 종횡이 깨진다 — fs 를 고른 근거`,
    `종횡 ${rat3.toFixed(3)} (수리본 ${rat.toFixed(3)})`);

  await shot(page, path.join(dir, 'clean.png'));   // 주입 원복
  await b.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nVERIFY895 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
