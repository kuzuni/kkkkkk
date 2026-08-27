/* 작업 229 진단 — `#sideL` 행 y·pitch 실측 (읽기 전용, 제품 무변경)
 *
 * 묻는 것: verify71 의 EXP 표(176/337/471/605/739 · «라벨행 pitch 균등 134»)와
 *          A2 측정표 §1-1·§1-2 의 «ref 셀 top»(260/421/556/686/820/958) 중
 *          어느 쪽이 제품 실측과 맞는가.
 * 지시서 [2]: 프레임 y = ref y − 84 (상태바). 가로는 1:1.
 *
 * 사용: node tools/probe229.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* A2 측정표 §1-1·§1-2 «셀 top»(ref 1080×2340 좌표) */
const REF_TOP = { attend: 260, roul: 421, quest: 556, promo: 686, coll: 820, bless: 958 };
const SB = 84;                                     /* 상태바(안전영역) */
/* verify71 이 굳혀 둔 옛 표 — «라벨행 pitch 균등 134» 가정 */
const OLD = { attend: 176, roul: 337, quest: 471, promo: 605, bless: 739 };

(async () => {
  const browser = await launch(chromium);
  const out = [];
  for (const h of [1600, 1920, 2280, 2600]) {
    const page = await browser.newPage({ viewport: { width: 1080, height: h } });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
      const cs = getComputedStyle(app);
      return {
        rows: [...document.querySelectorAll('#sideL .ibtn')].map(b => ({
          k: b.dataset.pop,
          solo: b.classList.contains('solo'),
          y: +((b.getBoundingClientRect().top - ar.top) / sc).toFixed(2),
          h: +(b.getBoundingClientRect().height / sc).toFixed(2),
        })),
        vars: { ih: cs.getPropertyValue('--ih').trim(), igap: cs.getPropertyValue('--igap').trim(),
                itop: cs.getPropertyValue('--itop').trim() },
        N: (typeof SIDE === 'object') ? SIDE.N : null,
      };
    });
    out.push({ h, r });
    await page.close();
  }
  await browser.close();

  for (const { h, r } of out) {
    console.log(`\n===== 뷰포트 1080×${h}  (SIDE.N=${r.N} · --ih ${r.vars.ih} · --igap ${r.vars.igap} · --itop ${r.vars.itop})`);
    console.log('행'.padEnd(8) + 'y실측'.padStart(9) + 'ref−84'.padStart(9) + 'Δref'.padStart(7)
              + '옛EXP'.padStart(8) + 'Δ옛'.padStart(7) + 'pitch'.padStart(8));
    r.rows.forEach((row, i) => {
      const ref = REF_TOP[row.k] != null ? REF_TOP[row.k] - SB : null;
      const old = OLD[row.k] != null ? OLD[row.k] : null;
      const pitch = i === 0 ? null : +(row.y - r.rows[i - 1].y).toFixed(2);
      console.log(
        (row.k + (row.solo ? '*' : '')).padEnd(8)
        + String(row.y).padStart(9)
        + String(ref == null ? '-' : ref).padStart(9)
        + String(ref == null ? '-' : (row.y - ref).toFixed(2)).padStart(7)
        + String(old == null ? '없음' : old).padStart(8)
        + String(old == null ? '-' : (row.y - old).toFixed(2)).padStart(7)
        + String(pitch == null ? '-' : pitch).padStart(8));
    });
    /* §1-2 의 실측 pitch 표 (ref 좌표계 — 프레임과 1:1, 상태바는 상수라 차분에서 소거된다) */
    const refPitch = [161, 135, 131, 133, 138];
    const got = r.rows.slice(1).map((x, i) => +(x.y - r.rows[i].y).toFixed(2));
    console.log('  §1-2 ref pitch  : ' + refPitch.join(' / '));
    console.log('  실측 pitch      : ' + got.join(' / '));
    console.log('  «균등 134» 가정 : ' + refPitch.map((_, i) => i === 0 ? 161 : 134).join(' / '));
  }
})().catch(e => { console.error(e); process.exit(1); });
