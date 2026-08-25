#!/usr/bin/env node
/* 작업 65 검증 — «룰렛 회전 중 팝업 흔들림 제거»
 *
 *   node tools/verify65.js
 *
 * 지시서 [3]-(가) 기계적 작업 검증: 비평가 없이 픽셀/수치로만 본다.
 * 회전 중 연속 프레임에서 아래가 전부 Δ0 이어야 통과다.
 *   1. `.mbox` bbox (x/y/w/h)                — 모달 박스 정지
 *   2. `#modal` 딤 배경색 · 박스 transform·scale·translate·rotate·filter
 *   3. 룰렛 컨테이너 `.rlt` bbox              — 원판 자리 정지
 *   4. `#rouBtn` / `#rouClose` bbox           — 버튼 정지
 *   5. `#app` bbox                            — 배경(프레임) 정지
 * 그리고 `#rouDisc` 의 회전각은 반대로 **계속 변해야** 한다(원판만 돈다).
 * 마지막으로 8칸 전수로 «포인터 아래 칸 = 당첨 칸» 을 역산 대조한다(29 교훈 1 회귀).
 */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const FRAMES = Number(process.env.V65_FRAMES || 40);
const GAP = Number(process.env.V65_GAP || 90);

const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);
const r2 = (n) => Math.round(n * 100) / 100;

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  /* 전투 캔버스는 스캔을 오염시킨다(28 교훈 3) — 배경 흔들림 판정과 무관하게 내려 둔다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 룰렛을 넉넉히 돌릴 수 있게 횟수를 채우고 연다 */
  await page.evaluate(() => { S.daily.spins = 30; openRoulette(); });
  await page.waitForTimeout(500);            /* 60 열기 애니(300ms)가 끝난 뒤부터 잰다 */

  const probe = () => {
    const g = (sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: r.x, y: r.y, w: r.width, h: r.height,
               tf: cs.transform, sc: cs.scale, tr: cs.translate, ro: cs.rotate,
               fi: cs.filter, op: cs.opacity };
    };
    const disc = document.getElementById('rouDisc');
    return {
      mbox: g('#modal .mbox'),
      dim: (() => { const m = document.getElementById('modal'); if (!m) return null;
                    const cs = getComputedStyle(m);
                    return { bg: cs.backgroundColor, tf: cs.transform, sc: cs.scale, tr: cs.translate }; })(),
      rlt: g('.rlt'), btn: g('#rouBtn'), cls: g('#rouClose'), app: g('#app'),
      disc: disc ? getComputedStyle(disc).transform : null,
      spinning: typeof rouSpinning !== 'undefined' ? rouSpinning : null,
    };
  };

  const before = await page.evaluate(probe);
  if (!before.mbox) { fail('룰렛 모달이 열리지 않았다 (.mbox 없음)'); }

  /* 실제 사용자처럼 버튼을 «누른다» — 60 쥬시의 누름 애니까지 같이 태워야 의미가 있다 */
  await page.click('#rouBtn');
  const shots = [];
  for (let i = 0; i < FRAMES; i++) {
    /* 회전 중 «비활성 버튼 다시 누르기» 도 섞는다 — 60 은 여기에 jz-sh(좌우 6px 흔들림) 를 건다 */
    if (i === 6 || i === 14) await page.click('#rouBtn', { force: true }).catch(() => {});
    if (i === 10 || i === 18) await page.click('#rouClose', { force: true }).catch(() => {});
    shots.push(await page.evaluate(probe));
    await page.waitForTimeout(GAP);
  }
  const spun = shots.filter((s) => s.spinning);
  console.log(`\n샘플 ${shots.length}프레임 (간격 ${GAP}ms) · 회전 중 프레임 ${spun.length}개`);
  if (spun.length < 8) fail(`회전 중 프레임이 ${spun.length}개뿐 — 샘플이 부족하다`);

  /* ── 1~5. 정지해야 하는 것들 ── */
  const STATIC = [
    ['.mbox (모달 박스)', 'mbox'], ['.rlt (원판 컨테이너)', 'rlt'],
    ['#rouBtn (돌리기 버튼)', 'btn'], ['#rouClose (닫기 버튼)', 'cls'], ['#app (배경 프레임)', 'app'],
  ];
  const base = spun[0] || shots[0];
  for (const [name, key] of STATIC) {
    let worst = 0, worstAt = -1, note = '';
    for (let i = 0; i < spun.length; i++) {
      const a = base[key], b = spun[i][key];
      if (!a || !b) { note = '요소 없음'; continue; }
      for (const k of ['x', 'y', 'w', 'h']) {
        const d = Math.abs(b[k] - a[k]);
        if (d > worst) { worst = d; worstAt = i; note = `${k} ${r2(a[k])} → ${r2(b[k])}`; }
      }
      for (const k of ['tf', 'sc', 'tr', 'ro', 'fi']) {
        if (b[k] !== a[k]) { fail(`${name}: 회전 중 ${k} 가 변한다 (${a[k]} → ${b[k]}, 프레임 ${i})`); }
      }
    }
    if (worst > 0.01) fail(`${name}: bbox Δ${r2(worst)}px (프레임 ${worstAt}, ${note})`);
    else ok(`${name}: 회전 중 bbox Δ0 · 변형 없음`);
  }
  /* 딤 */
  let dimBad = false;
  for (let i = 0; i < spun.length; i++) {
    const a = base.dim, b = spun[i].dim;
    for (const k of ['bg', 'tf', 'sc', 'tr'])
      if (a[k] !== b[k]) { fail(`#modal 딤: ${k} 가 변한다 (${a[k]} → ${b[k]}, 프레임 ${i})`); dimBad = true; break; }
    if (dimBad) break;
  }
  if (!dimBad) ok('#modal 딤: 색·변형 정지');

  /* ── 원판은 반대로 «계속 돌아야» 한다 ── */
  const rots = spun.map((s) => s.disc);
  const uniq = new Set(rots).size;
  if (uniq < Math.max(4, Math.floor(spun.length * 0.6)))
    fail(`#rouDisc 가 실제로 돌지 않는다 — 회전 중 ${spun.length}프레임에서 서로 다른 transform 이 ${uniq}개뿐`);
  else ok(`#rouDisc: 회전 중 ${uniq}/${spun.length} 프레임이 서로 다른 각도 (원판만 돈다)`);

  /* ── 오버슈트는 «원판에만» — 지나쳤다가 되감아 target 에 정확히 앉는지 ── */
  const os = await page.evaluate(async () => {
    S.daily.spins = 5; rouRot = 0; rouSpinning = false; openRoulette();
    const disc = document.getElementById('rouDisc');
    const seen = [];
    const grab = () => { const m = /rotate\(([-\d.]+)deg\)/.exec(disc.style.transform || '');
                         seen.push(m ? parseFloat(m[1]) : NaN); };
    roulSpinTo(3, 'x');
    /* ⚠ 29 교훈 2 — 마지막 프레임에서 rouRot 이 mod 360 으로 «정규화» 되며 2368→202.5 로 점프한다.
       (화면상 완전히 동일하다) 되감기 폭은 **회전 중 프레임만**으로 재야 오판이 없다. */
    await new Promise((r) => {
      const tick = () => { if (!rouSpinning) return r(); grab(); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const seg = 360 / ROULETTE.length, want = ((-(3 * seg + seg / 2)) % 360 + 360) % 360;
    return { max: Math.max(...seen), last: ((rouRot % 360) + 360) % 360, want,
             backDeg: Math.max(...seen) - seen[seen.length - 1] };
  });
  if (!(os.backDeg > 1 && os.backDeg < 15))
    fail(`원판 오버슈트 되감기 ${r2(os.backDeg)}° — 1~15° 범위를 벗어난다`);
  else ok(`원판 오버슈트: ${r2(os.backDeg)}° 지나쳤다 되감음 (반칸 22.5° 안)`);
  if (Math.abs(os.last - os.want) > 0.02) fail(`되감기 후 최종 각도 ${r2(os.last)}° ≠ 목표 ${r2(os.want)}°`);
  else ok(`되감기 후 최종 각도가 목표와 일치 (${r2(os.last)}°)`);

  /* ── 29 교훈 1 회귀 — 8칸 전수로 «포인터 아래 칸 = 당첨 칸» 역산 대조 ── */
  const wheel = await page.evaluate(async () => {
    const out = [];
    const n = ROULETTE.length, seg = 360 / n;
    for (let i = 0; i < n; i++) {
      S.daily.spins = 5; rouRot = 0; rouSpinning = false;
      openRoulette();
      roulSpinTo(i, 'x');
      await new Promise((r) => setTimeout(r, ROUL_MS + ROUL_BACK_MS + 260));
      /* 최종 회전각에서 북(0deg) 아래에 오는 칸을 역산한다 */
      const rot = ((rouRot % 360) + 360) % 360;
      const under = Math.floor(((((-rot) % 360) + 360) % 360) / seg) % n;
      out.push({ want: i, under, hit: !!document.querySelector('#rouDisc .rlt-seg.hit') });
    }
    return out;
  });
  const wrong = wheel.filter((w) => w.want !== w.under);
  if (wrong.length) fail(`당첨 칸 역산 불일치 ${wrong.length}/8 — ` +
    wrong.map((w) => `want ${w.want} → 포인터 아래 ${w.under}`).join(', '));
  else ok('당첨 칸 역산: 8칸 전수 일치 (포인터 아래 칸 = 당첨 칸)');

  if (errs.length) errs.slice(0, 5).forEach((e) => fail(e));
  else ok('콘솔 에러 0건');

  await browser.close();
  console.log('');
  if (fails.length) { console.log(`VERIFY65 FAIL (${fails.length}건)`); process.exit(1); }
  console.log('VERIFY65 PASS');
}
main().catch((e) => { console.error(e); process.exit(2); });
