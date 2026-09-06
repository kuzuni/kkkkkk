/* 작업 961 — 배지 **윗줄** 검정 획 선언 8 → 10 의 재현기(338 규칙 — 처방 전에 먼저 재현한다).
 *
 * 무엇을 재는가 —
 *   932 8회차가 «윗줄 획이 얇다» 를 자 넷으로 확정하고 «선언은 10» 이라는 답까지 냈지만
 *   그 답은 **환산비 0.534 로 옮긴 계산값**이다(ⓐ 10.10 · ⓑ 9.73). 이 자는 그 계산을 믿지 않고
 *   **실제로 선언을 8·9·10·11·12 로 굴려** 그려진 획이 ref 에 언제 붙는지 화소로 잰다.
 *   ⇒ «10 이 정말 답인가» 와 «그 대가로 §C(빈 띠·노랑 AABB)가 움직이는가» 를 한 표에서 본다.
 *
 * ⚠ 주입은 반드시 `#shopw` 급으로 한다 — `.pvc>.bdg>i`(0,3,1)로 적으면 5926/5936행의 ID 급
 *   규칙과 같은 함정에 빠져 조용히 안 먹는다(885 4회차 · verify895 §R 주석).
 *
 * 실행: node tools/probe961.js [--strokes 8,9,10,11,12]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { py } = require('./pydep937');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const STROKES = arg('--strokes', '8,9,10,11,12').split(',').map(Number);

let pass = 0, fail = 0;
const ok = (c, msg, got) => {
  if (c) { pass++; console.log('  ok  ' + msg + (got ? ' — ' + got : '')); }
  else { fail++; console.log('FAIL  ' + msg + (got ? ' — ' + got : '')); }
};
const pc = (o, r) => ((o / r - 1) * 100);

async function shot(page, out, css) {
  await page.evaluate((c) => {
    const old = document.getElementById('p961'); if (old) old.remove();
    if (c) { const s = document.createElement('style'); s.id = 'p961'; s.textContent = c; document.head.appendChild(s); }
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p961-'));
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

  const rows = [];
  for (const s of STROKES) {
    const png = path.join(dir, `s${s}.png`);
    const geo = await shot(page, png, `#shopw .pvc>.bdg>i{-webkit-text-stroke:${s}px #000}`);
    const a = scan('scan895.py', png, geo);
    const bb = scan('scan932.py', png, geo);
    rows.push({ s, a, b: bb });
  }

  console.log('\n=== 윗줄 검정 획 선언 스윕 (ref 는 자의 고정점 — 선언과 무관하게 같은 값이어야 한다) ===');
  console.log('  선언 |  ⓐ 교차점 우리 ↔ ref  |  Δⓐ    |  ⓑ 질량 우리 ↔ ref   |  Δⓑ    | 빈 띠 Δ | 노랑AABB Δ | 아랫줄 획 Δ');
  for (const r of rows) {
    console.log(`  ${String(r.s).padStart(4)} | ${String(r.a.our_s_up).padStart(7)} ↔ ${String(r.a.ref_s_up).padEnd(7)} | `
      + `${pc(r.a.our_s_up, r.a.ref_s_up).toFixed(1).padStart(6)}% | `
      + `${String(r.b.our_mass_up).padStart(7)} ↔ ${String(r.b.ref_mass_up).padEnd(7)} | `
      + `${String(r.b.d_mass_up).padStart(6)}% | `
      + `${pc(r.a.our_gap, r.a.ref_gap).toFixed(1).padStart(6)}% | `
      + `${pc(r.a.our_bh, r.a.ref_bh).toFixed(1).padStart(6)}% | `
      + `${pc(r.a.our_s_lo, r.a.ref_s_lo).toFixed(1).padStart(6)}%`);
  }

  const at = (s) => rows.find((r) => r.s === s);
  const abs = (x) => Math.abs(x);
  console.log('\n=== 판정 ===');

  /* ⚑ ref 는 자의 고정점이다 — 선언을 굴려도 ref 값이 움직이면 자가 우리 그림을 ref 로 새는 것이다. */
  ok(rows.every((r) => abs(r.a.ref_s_up - rows[0].a.ref_s_up) <= 0.05
                    && abs(r.b.ref_mass_up - rows[0].b.ref_mass_up) <= 0.05),
    `[1] ref 값은 선언 스윕 내내 고정 — 자가 우리 그림에 안 물든다`,
    rows.map((r) => `${r.s}:${r.a.ref_s_up}/${r.b.ref_mass_up}`).join(' · '));

  /* ⚑ «선언을 올리면 그려진 획이 실제로 두꺼워지는가» — 이 항이 빨가면 손잡이 자체가 잘못 잡힌 것이다. */
  ok(rows.every((r, i) => i === 0 || r.a.our_s_up > rows[i - 1].a.our_s_up),
    `[2] 선언이 오르면 ⓐ 가 단조 증가 — 손잡이가 맞다`,
    rows.map((r) => `${r.s}→${r.a.our_s_up}`).join(' · '));
  ok(rows.every((r, i) => i === 0 || r.b.our_mass_up > rows[i - 1].b.our_mass_up),
    `[3] 같은 스윕에서 ⓑ 도 단조 증가 — 계열이 다른 두 자가 같은 방향을 가리킨다`,
    rows.map((r) => `${r.s}→${r.b.our_mass_up}`).join(' · '));

  /* ⚑⚑ 이 자의 본체 — 932 8회차의 계산값(10)이 **그림에서도** 최선인가.
     |Δ| 가 가장 작은 선언을 찾는다. 두 자가 서로 다른 칸을 고르면 그것도 결과다. */
  const bestA = rows.reduce((p, c) => (abs(pc(c.a.our_s_up, c.a.ref_s_up)) < abs(pc(p.a.our_s_up, p.a.ref_s_up)) ? c : p));
  const bestB = rows.reduce((p, c) => (abs(c.b.d_mass_up) < abs(p.b.d_mass_up) ? c : p));
  ok(bestA.s === 10 && bestB.s === 10,
    `[4] 두 자가 **같은 칸(10)** 을 고른다 — 932 8회차의 환산(ⓐ 10.10 · ⓑ 9.73)이 그림에서 재현된다`,
    `ⓐ 최선 ${bestA.s}(${pc(bestA.a.our_s_up, bestA.a.ref_s_up).toFixed(1)}%) · ⓑ 최선 ${bestB.s}(${bestB.b.d_mass_up}%)`);

  /* ⚑ 현행(8)이 왜 결손인가 — 그 자리에서만 두 자가 −14~−21% 를 낸다(932 8회차 실측). */
  const s8 = at(8);
  ok(s8 && s8.b.d_mass_up >= -21 && s8.b.d_mass_up <= -14,
    `[5] 현행 선언 8 에서 ⓑ 잔차가 **−14~−21%** — 932 8회차 등재값의 재현`,
    s8 ? `${s8.b.d_mass_up}%` : '—');

  /* ⚠ 대가 — 획이 두꺼워지면 §C 가 따라 움직이는가(961 등재문 ②). */
  const s10 = at(10);
  ok(s10 && abs(pc(s10.a.our_gap, s10.a.ref_gap)) <= 8,
    `[6] 선언 10 에서도 두 줄 «빈 띠» 가 ref ±8% 안 — 획이 두꺼워져도 §C1 을 안 깬다`,
    s10 ? `${pc(s10.a.our_gap, s10.a.ref_gap).toFixed(1)}% (8 일 때 ${pc(s8.a.our_gap, s8.a.ref_gap).toFixed(1)}%)` : '—');
  ok(s10 && abs(pc(s10.a.our_bh, s10.a.ref_bh)) <= 4,
    `[7] 선언 10 에서도 노랑 AABB 높이가 ref ±4% 안 — \`paint-order:stroke fill\` 이라 채움은 안 밀린다`,
    s10 ? `${pc(s10.a.our_bh, s10.a.ref_bh).toFixed(1)}% (8 일 때 ${pc(s8.a.our_bh, s8.a.ref_bh).toFixed(1)}%)` : '—');
  /* ⚠ 윗줄 획은 아랫줄과 독립 손잡이여야 한다 — 한 줄만 만졌는데 다른 줄이 움직이면 자가 두 줄을 섞은 것이다. */
  ok(rows.every((r) => abs(pc(r.a.our_s_lo, r.a.ref_s_lo) - pc(s8.a.our_s_lo, s8.a.ref_s_lo)) <= 3),
    `[8] 아랫줄 획은 스윕 내내 안 움직인다 — 두 줄이 독립 손잡이(자가 줄을 안 섞는다)`,
    rows.map((r) => `${r.s}:${pc(r.a.our_s_lo, r.a.ref_s_lo).toFixed(1)}%`).join(' · '));

  ok(errs.length === 0, `[9] 콘솔 에러 0건`, `${errs.length}`);

  await shot(page, path.join(dir, 'clean.png'));
  await b.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nPROBE961 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
