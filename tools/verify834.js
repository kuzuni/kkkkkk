#!/usr/bin/env node
/* 834 검증 — 19 프로필 · 20 종합스탯의 칭호 칩은 **한 출처**에서 그린다
 *
 *   node tools/verify834.js
 *
 * 결손(PROGRESS 834): 20 은 칩을 마크업에 손으로 적어 두고(«칭호 없음») 갱신하는 코드가 없어
 *   칭호를 장착하고 탭만 갈아타면 19 는 «골드», 20 은 «칭호 없음» 이었다. 처방은 값 복사가 아니라
 *   **19 가 이미 쓰는 갱신 경로를 20 도 읽게** 하는 것이다(705 ② «그림 출처가 둘이 되지 않게»).
 *
 * 검사 항목:
 *   [A] 두 화면의 칩 문자열이 같다 — 칭호 8종 전수(보유시키고 하나씩 장착해 두 탭을 다 연다)
 *   [B] 출처가 하나다 — 두 칩 모두 `titleOf().n` 과 같고, 그리는 함수는 `paintTitleChips` 하나다
 *   [C] 손 문자열이 살아 있지 않다 — 제품 코드에 칩 라벨을 직접 적는 두 번째 자리가 없다
 *   [D] 706 폴백 보존 — 고른 적 없거나 보유 밖이면 두 화면 다 «계급» 을 보여준다
 *   [E] 갱신 시점 — 20 을 연 뒤 19 에서 칭호를 바꾸고 다시 열면 따라온다(한 번 맞은 값이 굳지 않는다)
 *   [F] 787 이 닫은 이웃 축 보존 — 칩 **기하**(`.spc-rib` 318×56)는 이 작업이 한 픽셀도 안 건드렸다
 *   [R] 되돌림 시험 — 갱신 경로를 끊으면 [A] 가 실제로 빨개진다(무르게 푼 수리가 아님을 못박는다)
 *   [G] 콘솔·페이지 에러 0
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다'); process.exit(2);
})();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (m, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + m + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + m + (detail ? '  — ' + detail : '')); }
};

function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--no-sandbox'] }, launchOpts()));
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward(); });

  /* ⚠ 소스 단언은 **주석을 걷어낸 뒤** 한다 — 이 저장소는 «무엇을 왜 고쳤는가» 를 주석으로 남기는
     규약이라(834 주석도 지운 손 문자열을 그대로 인용한다) 원문에 대고 «그 낱말이 없다» 를 물으면
     «이력을 적었다» 는 이유로 빨개진다. 코드에서 살아 있는지만 본다. */
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const code = src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

  /* ---- [A] 칭호 8종 전수 — 두 화면이 같은 말을 한다 ---- */
  console.log('[A] 두 화면의 칩 문자열이 같다 (칭호 전수)');
  const sweep = await page.evaluate(() => {
    step = () => {};
    S.rank = 0;                                    /* 폴백과 장착값이 갈리는 자리에 세운다 */
    S.titles = {}; RANKS.forEach((_, i) => { S.titles[i] = 1; });
    const out = [];
    RANKS.forEach((r, i) => {
      S.titleEq = null; save();
      openProfile();
      titleEquip(i);
      const t19 = $('pfTtl').textContent;
      document.querySelector('.pf-tgl>.lb').click();          /* 19 → 20 */
      const t20 = $('spcTtl') ? $('spcTtl').textContent : null;
      $('spcProfTab').click();                                /* 20 → 19 */
      closeProfile();
      out.push({ n: r.n, t19, t20 });
    });
    return out;
  });
  sweep.forEach(r => ok('[A' + r.n + '] 19 «' + r.t19 + '» = 20 «' + r.t20 + '»',
    r.t19 === r.n && r.t20 === r.n));

  /* ---- [B] 출처가 하나다 ---- */
  console.log('[B] 출처가 하나다 — 두 칩이 `titleOf().n` 이고 그리는 함수는 하나다');
  const b = await page.evaluate(() => {
    S.titleEq = 3; save(); openProfile();
    const want = titleOf().n;
    const t19 = $('pfTtl').textContent;
    document.querySelector('.pf-tgl>.lb').click();
    const t20 = $('spcTtl').textContent;
    $('spcProfTab').click(); closeProfile();
    return { want, t19, t20, fn: typeof paintTitleChips };
  });
  ok('[B1] `paintTitleChips` 가 제품 함수로 있다', b.fn === 'function', b.fn);
  ok('[B2] 19 칩 = `titleOf().n`', b.t19 === b.want, b.t19 + ' ↔ ' + b.want);
  ok('[B3] 20 칩 = `titleOf().n`', b.t20 === b.want, b.t20 + ' ↔ ' + b.want);
  const painters = (code.match(/paintTitleChips\s*\(\s*\)\s*\{/g) || []).length;
  ok('[B4] 그리는 함수 선언은 딱 하나', painters === 1, '선언 ' + painters + '개');
  ok('[B5] 두 렌더러가 그 한 곳을 부른다 (`renderProfile`·`renderSpec`)',
    /renderProfile\s*\(\s*\)\s*\{[\s\S]{0,900}?paintTitleChips\(\)/.test(code)
    && /renderSpec\s*\(\s*\)\s*\{[\s\S]{0,900}?paintTitleChips\(\)/.test(code));

  /* ---- [C] 손 문자열이 살아 있지 않다 ---- */
  console.log('[C] 칩 라벨을 직접 적는 두 번째 자리가 없다');
  const handWrite = (code.match(/(textContent|innerHTML)\s*=\s*['"][^'"]*칭호 없음/g) || []);
  ok('[C1] 코드가 «칭호 없음» 을 칩에 써 넣지 않는다', handWrite.length === 0, handWrite.join(' | ') || '0건');
  /* ⚠ 마크업의 «칭호 없음» 은 **폴백 초기값**이라 남는다 — 지우면 스크립트가 죽었을 때 빈 칩이 된다.
     대신 그 자리가 갱신 경로에 물려 있는지(id)를 묻는다. 이 항이 이번 버그의 본체다. */
  ok('[C2] 20 의 칩이 갱신 경로에 물려 있다 (`.spc-rib` 안에 `id="spcTtl"`)',
    /class="spc-rib"[\s\S]{0,120}id="spcTtl"/.test(src));
  ok('[C3] 19 의 칩도 그대로 물려 있다 (`#pfTtl`)', /id="pfTtl"/.test(src));

  /* ---- [D] 706 폴백 보존 ---- */
  console.log('[D] 706 폴백 — 고른 적 없거나 보유 밖이면 두 화면 다 «계급»');
  const d = await page.evaluate(() => {
    const read = () => {
      openProfile(); const a = $('pfTtl').textContent;
      document.querySelector('.pf-tgl>.lb').click();
      const c = $('spcTtl').textContent;
      $('spcProfTab').click(); closeProfile();
      return [a, c];
    };
    S.rank = 4; S.titles = { 0:1, 1:1, 2:1, 3:1, 4:1 }; S.titleEq = null; save();
    const none = read();                                   /* 고른 적 없음 → 계급 */
    S.titleEq = 7; save();                                 /* 보유 밖(챌린저) → 계급으로 조용히 폴백 */
    const out = read();
    return { none, out, rank: RANKS[4].n };
  });
  ok('[D1] 고른 적 없음 — 19 = 계급 «' + d.rank + '»', d.none[0] === d.rank, d.none[0]);
  ok('[D2] 고른 적 없음 — 20 = 계급 «' + d.rank + '»', d.none[1] === d.rank, d.none[1]);
  ok('[D3] 보유 밖 — 19 = 계급 «' + d.rank + '»', d.out[0] === d.rank, d.out[0]);
  ok('[D4] 보유 밖 — 20 = 계급 «' + d.rank + '»', d.out[1] === d.rank, d.out[1]);

  /* ---- [E] 갱신 시점 ---- */
  console.log('[E] 값이 굳지 않는다 — 20 을 본 뒤 칭호를 바꾸면 다음에 따라온다');
  const e = await page.evaluate(() => {
    S.rank = 0; S.titles = { 0:1, 1:1, 2:1 }; S.titleEq = 2; save();
    openProfile(); document.querySelector('.pf-tgl>.lb').click();
    const first = $('spcTtl').textContent;                  /* «골드» */
    $('spcProfTab').click();
    titleEquip(1);                                          /* «실버» */
    document.querySelector('.pf-tgl>.lb').click();
    const second = $('spcTtl').textContent;
    $('spcProfTab').click(); closeProfile();
    return { first, second };
  });
  ok('[E1] 처음 = «골드»', e.first === '골드', e.first);
  ok('[E2] 바꾼 뒤 = «실버»', e.second === '실버', e.second);

  /* ---- [F] 787 이 닫은 이웃 축 보존 (기하 Δ0) ---- */
  console.log('[F] 칩 기하는 한 픽셀도 안 움직였다 (787 이 맞춰 놓은 값)');
  const f = await page.evaluate(() => {
    openSpec();
    const r = document.querySelector('#specw .spc-rib').getBoundingClientRect();
    const s = getComputedStyle(document.querySelector('#specw .spc-rib'));
    closeSpec();
    return { w: Math.round(r.width), h: Math.round(r.height), left: s.left, top: s.top };
  });
  ok('[F1] `.spc-rib` 318×56', f.w === 318 && f.h === 56, f.w + '×' + f.h);
  ok('[F2] 자리 left 269 · top 249', f.left === '269px' && f.top === '249px', f.left + ' / ' + f.top);

  /* ---- [H] 최장 라벨 — 라벨이 «데이터 파생» 이 된 대가를 여기서 치른다 ---- */
  console.log('[H] 최장 칭호도 그릇 안에 든다 (736 «최장 라벨을 담는가» 와 같은 자)');
  const h = await page.evaluate(() => {
    S.titles = {}; RANKS.forEach((_, i) => { S.titles[i] = 1; });
    const worst = { n: '', slack20: 1e9, slack19: 1e9 };
    RANKS.forEach((r, i) => {
      S.titleEq = i; save(); openProfile();
      const e19 = $('pfTtl').getBoundingClientRect(), b19 = $('pfTtl').parentElement.getBoundingClientRect();
      document.querySelector('.pf-tgl>.lb').click();
      const e20 = $('spcTtl').getBoundingClientRect();
      const b20 = document.querySelector('#specw .spc-rib > b').getBoundingClientRect();
      const s20 = Math.min(e20.left - b20.left, b20.right - e20.right);
      const s19 = Math.min(e19.left - b19.left, b19.right - e19.right);
      if (s20 < worst.slack20) { worst.n = r.n; worst.slack20 = +s20.toFixed(1); worst.slack19 = +s19.toFixed(1); }
      $('spcProfTab').click(); closeProfile();
    });
    return worst;
  });
  ok('[H1] 20 — 최장 칭호 «' + h.n + '» 가 밴드를 안 넘는다', h.slack20 > 0, '여유 ' + h.slack20 + 'px');
  ok('[H2] 19 — 같은 칭호가 알약을 안 넘는다', h.slack19 > 0, '여유 ' + h.slack19 + 'px');

  /* ---- [R] 되돌림 시험 ---- */
  console.log('[R] 되돌림 — 갱신 경로를 끊으면 [A] 가 실제로 빨개진다');
  const r = await page.evaluate(() => {
    const orig = window.paintTitleChips;
    window.paintTitleChips = function(){ const el = $('pfTtl'); if(el) el.textContent = titleOf().n; };  /* 19 만 그리던 시절 */
    S.rank = 0; S.titles = { 0:1, 1:1, 2:1 }; S.titleEq = null; save();
    document.querySelector('#specw .spc-rib > b > i').textContent = '칭호 없음';   /* 마크업 폴백으로 되돌린다 */
    openProfile(); titleEquip(2);
    const t19 = $('pfTtl').textContent;
    document.querySelector('.pf-tgl>.lb').click();
    const t20 = $('spcTtl').textContent;
    $('spcProfTab').click(); closeProfile();
    window.paintTitleChips = orig;
    return { t19, t20 };
  });
  ok('[R1] 끊으면 두 화면이 갈린다 (수리 전 그림)', r.t19 === '골드' && r.t20 === '칭호 없음',
    '19 «' + r.t19 + '» ↔ 20 «' + r.t20 + '»');
  const back = await page.evaluate(() => {
    renderSpec();
    return $('spcTtl').textContent;
  });
  ok('[R2] 되살리면 즉시 초록으로 돌아온다', back === '골드', back);

  /* ---- [G] 에러 ---- */
  console.log('[G] 콘솔·페이지 에러');
  ok('[G1] 에러 0건', errs.length === 0, errs.join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY834 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
