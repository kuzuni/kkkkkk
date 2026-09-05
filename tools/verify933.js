/* 작업 933 — 10 이용권 배지 노랑 «획» 이 가늘다: **손잡이가 없다는 것**을 지키는 자.
 *
 * 등재문(895 1회차 채점 2인 곁다리)은 이렇게 적혀 있었다 —
 *   «AABB 는 ±3% 로 맞는데 잉크 면적이 −17~27% 라 글자가 속 빈 것으로 읽힌다.
 *    크기(fs·배율)는 닫힌 자리(833 [1-g]·[1-h])이므로 남는 축은 `font-weight` 다.
 *    ⚠ 아랫줄은 이미 `font-weight:400` 이고 윗줄은 `<i>` 기본값이라 둘의 굵기가 다르다 — 먼저 그 짝을 재라.»
 *
 * 338 규칙대로 처방 전에 자(`tools/scan933.py`)를 세우고 재현했더니 **셋이 갈렸다**:
 *
 *   ⓐ **«둘의 굵기가 다르다» 는 사실이 아니다.** 5936행 `#shopw i,…,b,…{font-weight:900}` 이 ID 급이라
 *      `.pvc>.bdg>b{font-weight:400}`(0,3,1)을 이긴다 ⇒ **두 줄 다 900 으로 그려지고 있었다.**
 *      (그 죽은 선언은 933 이 지웠다 — 그림 Δ0px.)
 *   ⓑ **`font-weight` 는 손잡이가 아니다.** 20행 `@font-face` 가 한 벌(Jua)로 `font-weight:400 900` 을
 *      주장해 브라우저가 «그 굵기의 얼굴이 이미 있다» 고 보고 **합성 볼드를 안 건다** —
 *      `probe933` v1(900 주입)이 현행과 **화소 동일**이다.
 *   ⓒ **«면적이 −17~27%» 도 재현되지 않는다.** 부분 화소 자 둘로 재면 잉크 면적은 윗줄 **−1.8%** ·
 *      아랫줄 **−7.4%** 로 이미 맞다(채점자 GH 가 적은 2243→2068 = −7.8% 와 같은 크기다 — GI 의
 *      «커버리지 −17.4/−27.2%» 쪽이 이상치다). **진짜인 것은 «획» 하나** — 획 p25 −23.7/−33.2% ·
 *      획 2A/P −15.5/−24.8% 이고 **둘레가 +16.2/+23.2%** 다. 즉 잉크의 양이 아니라 **분포**가 다르다:
 *      ref 는 «짧고 굵은» 획, 우리는 «길고 가는» 획 = 895 ⓓ 가 이미 등재한 **서체 축**(좁고 높은 글자꼴).
 *
 * ⇒ 유일하게 살아 있는 길(같은 woff2 를 «400 만» 주장하는 둘째 얼굴로 실어 **합성 볼드**를 강제)은
 *    단이 없고(700 ≡ 900) **짝인 축을 전부 반대쪽으로 넘긴다**:
 *      획 2A/P 윗줄 −15.5% → **+7.8%**(지나침) · 잉크 면적 −1.8% → **+26.1%** · 커버리지 +2.0% → **+30.5%**
 *      줄 두께 +6.0% → **+10.3%**(⇒ `verify895` **[P2] 빨강**) · 두 줄 빈 띠 −3.0% → **−24.6%**(885 7회차가
 *      닫은 ③ 여백) · 노랑 AABB 폭 +2.1% → +3.3% · 높이 +1.4% → +3.6%(933 전제 «±3%» 를 깬다).
 *    ⇒ **한 오차를 같은 크기의 반대 오차로 바꾸는 거래**라 채택하지 않는다(위임 규약 — 되돌림은 §R 그대로).
 *
 * 이 자가 지키는 것은 «맞다» 가 아니라 **«여기서 멈춰 있다 · 그 이유는 이것이다»** 다.
 * 누가 굵기를 다시 손잡이로 삼으면 §B 가, 합성 볼드를 켜면 §R 이 먼저 짖는다.
 *
 * 자는 `python3 tools/scan933.py --json`(획·면적) 과 `tools/scan895.py --json`(두께·빈 띠·AABB) 둘이다.
 *
 * 실행: node tools/verify933.js
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

/* 합성 볼드를 실제로 켜는 CSS — §R 이 대가를 재는 데 쓴다(제품에는 없다). */
const FACE = "@font-face{font-family:'GameKR933';src:url('assets/fonts/Jua-subset.woff2') format('woff2');font-weight:400;font-style:normal}";
const SEL = '#shopw .pvc>.bdg>i,#shopw .pvc>.bdg>b';
const CSS_BOLD = `${FACE} ${SEL}{font-family:'GameKR933';font-weight:700}`;

async function shot(page, out, css) {
  await page.evaluate((c) => {
    const old = document.getElementById('r933'); if (old) old.remove();
    if (c) { const s = document.createElement('style'); s.id = 'r933'; s.textContent = c; document.head.appendChild(s); }
  }, css || '');
  try { await page.evaluate(() => document.fonts.ready); } catch (e) { /* 폰트 준비는 최선노력 */ }
  await page.waitForTimeout(160);
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
  fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(geo));
  return geo;
}

function scan(tool, png) {
  const out = py([tool, '--cap', path.relative(ROOT, png),
    '--geo', path.relative(ROOT, png.replace(/\.png$/, '.json')), '--json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const line = out.split('\n').find((l) => l.startsWith('JSON '));
  if (!line) throw new Error(tool + ' 가 JSON 을 못 냈다:\n' + out);
  return JSON.parse(line.slice(5));
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v933-'));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
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

  /* ── §전제 — 자가 무엇을 보고 있는가 ───────────────────────────────── */
  const g0 = await shot(page, path.join(dir, 'now.png'));
  const m0 = scan('tools/scan933.py', path.join(dir, 'now.png'));
  blk('§전제 — 자가 ref 를 제대로 물고 있는가');
  ok(m0.cards >= 2, '[P0] 배지가 보이는 카드를 둘 이상 재고 있다', `${m0.cards}장`);
  /* ref 값은 자의 고정점이다 — 창(REF_WIN)이나 문턱을 건드리면 여기가 먼저 움직인다. */
  ok(Math.abs(m0.ref_up_run - 7.84) <= 0.25 && Math.abs(m0.ref_lo_run - 6.20) <= 0.25,
    '[P1] ref 획 p25 실측이 재현된다 (윗줄 7.84 · 아랫줄 6.20)', `${m0.ref_up_run} · ${m0.ref_lo_run}`);
  ok(Math.abs(m0.ref_up_ap - 5.79) <= 0.2 && Math.abs(m0.ref_lo_ap - 4.52) <= 0.2,
    '[P2] ref 획 2A/P 실측이 재현된다 (윗줄 5.79 · 아랫줄 4.52)', `${m0.ref_up_ap} · ${m0.ref_lo_ap}`);
  ok(errs.length === 0, '[P3] 콘솔 에러 0건', `${errs.length}`);

  /* ── §A 선언 — «둘의 굵기가 다르다» 는 사실이 아니었다 ───────────── */
  blk('§A 선언 — 두 줄의 굵기는 처음부터 같았다(등재문 ⓐ 기각)');
  const fw = await page.evaluate(() => {
    const g = (s) => getComputedStyle(document.querySelector(s)).fontWeight;
    return { i: g('.pvc>.bdg>i'), b: g('.pvc>.bdg>b') };
  });
  ok(fw.i === fw.b, '[A1] 윗줄·아랫줄의 **그려진** 굵기가 같다(짝이 어긋나 있지 않다)', `${fw.i} ↔ ${fw.b}`);
  ok(fw.i === '900', '[A2] 그 값은 5936행 `#shopw i,…{font-weight:900}`(ID 급)이 정한 **900** 이다', fw.i);
  /* ⚑ 되살아나면 또 «둘이 다르다» 로 읽힌다 — 죽은 선언을 다시 심는 것 자체를 막는다.
     되살리려면 `#shopw` 급으로 적어라(그래도 그림은 안 변한다 — §B). */
  const bdgRule = (html.match(/\.pvc>\.bdg>b\{[^}]*\}/s) || [''])[0];
  ok(!/font-weight/.test(bdgRule),
    '[A3] `.pvc>.bdg>b` 규칙에 **죽은 `font-weight` 선언이 없다**(ID 급에 지는 자리 — 933 이 지웠다)',
    bdgRule ? '규칙 있음' : '규칙 못 찾음');
  ok(/@font-face\{[^}]*GameKR[^}]*font-weight:400 900/s.test(html.replace(/\s+/g, ' ')),
    '[A4] `@font-face` 가 한 벌로 **400~900 을 전부 주장**한다(합성 볼드가 안 걸리는 뿌리)', '400 900');

  /* ── §B 손잡이가 죽어 있다 — 굵기를 올려도 화소가 안 움직인다 ────── */
  blk('§B `font-weight` 는 손잡이가 아니다(등재문 ⓑ 기각)');
  await shot(page, path.join(dir, 'fw900.png'), `${SEL}{font-weight:900}`);
  const m900 = scan('tools/scan933.py', path.join(dir, 'fw900.png'));
  ok(Math.abs(m900.our_up_run - m0.our_up_run) < 0.02 && Math.abs(m900.our_up_area - m0.our_up_area) < 1,
    '[B1] 굵기 900 을 주입해도 윗줄 획·면적이 **한 화소도 안 움직인다**',
    `획 ${m0.our_up_run}→${m900.our_up_run} · 면적 ${m0.our_up_area}→${m900.our_up_area}`);
  await shot(page, path.join(dir, 'fw400.png'), `${SEL}{font-weight:400}`);
  const m400 = scan('tools/scan933.py', path.join(dir, 'fw400.png'));
  ok(Math.abs(m400.our_lo_run - m0.our_lo_run) < 0.02 && Math.abs(m400.our_lo_area - m0.our_lo_area) < 1,
    '[B2] 400 으로 **내려도** 마찬가지다 — 한 벌뿐인 얼굴이라 굵기가 그림을 안 정한다',
    `획 ${m0.our_lo_run}→${m400.our_lo_run} · 면적 ${m0.our_lo_area}→${m400.our_lo_area}`);

  /* ── §C 실측 등재(양성) — 무엇이 진짜 남아 있는가 ─────────────────── */
  blk('§C 남은 잔차는 «면적» 이 아니라 «획» 이다(등재문 ⓒ 정정 · 서체 축)');
  ok(Math.abs(pc(m0.our_up_area, m0.ref_up_area)) <= 6,
    '[C1] 윗줄 **잉크 면적은 이미 맞다**(±6%) — «면적 −17~27%» 는 재현되지 않았다',
    `${pc(m0.our_up_area, m0.ref_up_area).toFixed(1)}%`);
  ok(Math.abs(pc(m0.our_lo_area, m0.ref_lo_area)) <= 12,
    '[C2] 아랫줄 잉크 면적도 ±12% 안(−7.4% — GH 가 적은 −13.2% 와 같은 크기)',
    `${pc(m0.our_lo_area, m0.ref_lo_area).toFixed(1)}%`);
  /* ⚑ 이 두 항은 «맞다» 가 아니라 «이 값에서 멈춰 있다» 를 지킨다 — 서체가 오기 전에는 안 닫힌다. */
  ok(pc(m0.our_up_ap, m0.ref_up_ap) <= -8 && pc(m0.our_up_ap, m0.ref_up_ap) >= -23,
    '[C3] 윗줄 획(2A/P)이 **−15% 안팎에서 멈춰 있다**(서체 축 · 895 ⓓ 와 같은 자리)',
    `${pc(m0.our_up_ap, m0.ref_up_ap).toFixed(1)}%`);
  ok(pc(m0.our_lo_ap, m0.ref_lo_ap) <= -15 && pc(m0.our_lo_ap, m0.ref_lo_ap) >= -34,
    '[C4] 아랫줄 획(2A/P)은 **−25% 안팎**(아랫줄이 더 심하다는 채점 2인의 방향과 같다)',
    `${pc(m0.our_lo_ap, m0.ref_lo_ap).toFixed(1)}%`);
  /* ⚑ «면적은 맞는데 획이 가늘다» 가 성립하려면 둘레가 그만큼 길어야 한다 — 산수를 항으로 세운다.
     이 항이 이 회차의 결론(«잉크의 양이 아니라 분포») 을 혼자 못박는다. */
  ok(pc(m0.our_up_per, m0.ref_up_per) >= 8 && pc(m0.our_lo_per, m0.ref_lo_per) >= 12,
    '[C5] 대신 **잉크 둘레가 길다**(윗줄 +16% · 아랫줄 +23%) = «길고 가는 획» — 양이 아니라 분포다',
    `${pc(m0.our_up_per, m0.ref_up_per).toFixed(1)}% · ${pc(m0.our_lo_per, m0.ref_lo_per).toFixed(1)}%`);

  /* ── §R 되돌림 — 합성 볼드를 켜면 무엇이 깨지는가 ─────────────────── */
  blk('§R 합성 볼드(둘째 얼굴)를 켜 보면 — 채택하지 않은 근거');
  await shot(page, path.join(dir, 'bold.png'), CSS_BOLD);
  const mb = scan('tools/scan933.py', path.join(dir, 'bold.png'));
  const sb = scan('tools/scan895.py', path.join(dir, 'bold.png'));
  ok(pc(mb.our_up_run, mb.ref_up_run) > -10,
    '[R1] 합성 볼드는 **획을 실제로 닫는다**(윗줄 −23.7% → −4%대) — 손잡이가 아예 없는 것은 아니다',
    `${pc(mb.our_up_run, mb.ref_up_run).toFixed(1)}%`);
  ok(pc(mb.our_up_area, mb.ref_up_area) >= 15,
    '[R2] 그런데 **잉크 면적이 +26% 로 넘어간다**(맞아 있던 축을 깬다)',
    `${pc(mb.our_up_area, mb.ref_up_area).toFixed(1)}%`);
  ok(pc(mb.our_up_ap, mb.ref_up_ap) > 0,
    '[R3] 획 2A/P 도 ref 를 **지나친다**(−15.5% → +8%대) — 단이 없어 «조금만» 굵힐 수 없다',
    `${pc(mb.our_up_ap, mb.ref_up_ap).toFixed(1)}%`);
  ok(pc(sb.our_t_up, sb.ref_t_up) > 8.5,
    '[R4] 줄 두께가 +10% 로 올라 `verify895` **[P2](+3.5~8.5%) 가 빨개진다**',
    `${pc(sb.our_t_up, sb.ref_t_up).toFixed(1)}%`);
  ok(pc(sb.our_gap, sb.ref_gap) < -15,
    '[R5] 두 줄 **빈 띠가 −25%** 로 닫힌다(885 7회차가 맞춰 놓은 ③ 여백 축)',
    `${pc(sb.our_gap, sb.ref_gap).toFixed(1)}%`);
  ok(pc(sb.our_bw, sb.ref_bw) > 3 || pc(sb.our_bh, sb.ref_bh) > 3,
    '[R6] 노랑 AABB 가 ±3% 밖으로 나간다 — 933 등재문의 전제(«AABB 는 맞다»)가 깨진다',
    `폭 ${pc(sb.our_bw, sb.ref_bw).toFixed(1)}% · 높이 ${pc(sb.our_bh, sb.ref_bh).toFixed(1)}%`);

  await shot(page, path.join(dir, 'back.png'), '');
  const mz = scan('tools/scan933.py', path.join(dir, 'back.png'));
  ok(Math.abs(mz.our_up_run - m0.our_up_run) < 0.02 && Math.abs(mz.our_up_area - m0.our_up_area) < 1,
    '[R7] 주입을 걷으면 현행으로 정확히 돌아온다(시험이 그림을 남기지 않았다)',
    `${mz.our_up_run} · ${mz.our_up_area}`);

  await b.close();
  console.log(`\nVERIFY933 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
