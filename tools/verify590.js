/* 590 게이트 — «펫(동료) 크기 ×2» (저장소 주인 지시 2026-08-31)
 *
 * 실행: node tools/verify590.js
 *
 * ── 이 자가 무엇을 지키는가 ────────────────────────────────────────────────────
 *  [A] 선언  — 배수는 **`PET_DRAW_SC` 한 상수에만** 산다(`PET_SP[].scale` 표를 손으로 곱하지 않았다)
 *  [B] 크기  — 펫 3종(bird·robo·dragon)의 **찍힌 픽셀**이 «상수 1 사본» 의 정확히 ×2 (±2%)
 *  [C] 541 불변 — 플레이어·잡몹·보스·아레나가 한 픽셀도 안 움직인다(`unitSc` 시그니처 포함)
 *  [D] 481 불변 — `PET_CD`·펫 피해식이 한 글자도 안 바뀐다(크기는 전투 파라미터가 아니다)
 *  [E] 587 불변 — `PET_SP[].faceRight` 표(587 이 «아틀라스 축» 으로 승격할 그 표)를 안 건드렸다
 *  [F] 겹침  — 3마리 장착 한 바퀴에서 플레이어가 덮이는 비율이 **수리 전보다 나쁘지 않다**
 *      (③ «가리면 크기를 되깎지 말고 자리를 벌려라» 의 자 — 궤도 상수가 이 항을 지킨다)
 *  [G] 411·492 불변 — 26/50 시트의 카드·슬롯 썸네일(`PET_TH`)은 이 행의 범위 밖이다
 *  [R] 되돌림 시험 — `PET_DRAW_SC` 를 1 로 되돌린 사본은 **표 값 그대로의 크기**로 돌아온다
 *      (이 절이 없으면 «어쨌든 커졌다» 를 통과시키는 무른 게이트가 된다)
 *
 * ⚠ 기준선을 손으로 적지 않는다(541 규약) — 매 실행 «상수를 1 로 되돌린 사본» 을 만들어
 *   **같은 자로** 재고 현재 트리를 그 값과의 «비» 로 채점한다. 아트가 바뀌어도 게이트가 안 거짓말한다.
 *   ⚠ 단 [F] 겹침만은 사본이 «수리 전 궤도» 여야 뜻이 있으므로 궤도 리터럴도 같이 되돌린다.  */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measure } = require('./size590lib');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v590-neg.html');

const rows = [], fails = [];
const ok = (t, d) => rows.push(['✓', t, d === undefined ? '' : String(d)]);
const bad = (t, d) => { rows.push(['✗', t, String(d)]); fails.push(t + ' — ' + d); };
const eq = (t, got, want) => String(got) === String(want) ? ok(t, String(got))
                                                          : bad(t, `실측 ${got} / 기대 ${want}`);
const near = (t, got, want, tolPct) => {
  if (got === null || want === null || !isFinite(got) || !isFinite(want)) return bad(t, `잴 수 없었다(${got}/${want})`);
  const d = want === 0 ? (got === 0 ? 0 : 1e9) : Math.abs(got - want) / Math.abs(want) * 100;
  return d <= tolPct ? ok(t, `${got} (기대 ${(+want).toFixed(2)} · Δ${d.toFixed(2)}%)`)
                     : bad(t, `${got} / 기대 ${want} — Δ${d.toFixed(2)}% > ${tolPct}%`);
};
const le = (t, got, cap, unit) => (got !== null && isFinite(got) && got <= cap)
  ? ok(t, `${got}${unit || ''} ≤ ${cap}${unit || ''}`)
  : bad(t, `${got}${unit || ''} > ${cap}${unit || ''}`);

const src = fs.readFileSync(SRC, 'utf8');

(async () => {
  /* ─────────── [A] 선언 — 배수가 사는 곳은 한 군데인가 ─────────── */
  eq('[A1] `PET_DRAW_SC = 2` 가 541 상수 셋 옆에 선언돼 있다',
     /const\s+PET_DRAW_SC\s*=\s*2\s*;/.test(src), true);
  eq('[A2] `PET_SP` 표 값은 **원본 그대로**(0.34 · 0.16 · 0.62 — 손으로 2배 하지 않았다)',
     /bird:\s*\{[^}]*scale:\s*0\.34[^}]*\}/.test(src)
     && /robo:\s*\{[^}]*scale:\s*0\.16[^}]*\}/.test(src)
     && /dragon:\s*\{[^}]*scale:\s*0\.62[^}]*\}/.test(src), true);
  {
    /* 그리기 입구가 «표 값 × 상수» 인가 — 표를 곱하거나 상수를 빼먹으면 여기서 걸린다 */
    const m = src.match(/drawFrameC\([^\n]*?fr,\s*p\.x,\s*p\.y,\s*([^,]+),\s*p\.flip/);
    eq('[A3] 펫 그리기 입구가 `p.sp.scale*PET_DRAW_SC` 로 곱한다',
       m ? m[1].replace(/\s/g, '') : '(못 찾음)', 'p.sp.scale*PET_DRAW_SC');
  }
  eq('[A4] 그림자도 몸과 같이 커진다(541 이 플레이어에서 정한 규약)',
     /drawShadow\(p\.x,\s*p\.y\s*\+\s*26\*PET_DRAW_SC,\s*9\*PET_DRAW_SC\)/.test(src), true);
  eq('[A5] `unitSc` 시그니처 불변 — 펫을 억지로 끼워 넣지 않았다',
     /const unitSc = tk => tk === 'arena' \? PLAYER_DRAW_SC : \(SOLO_CHASER\[tk\] \? 1 : MOB_DRAW_SC\);/.test(src), true);
  eq('[A6] 궤도 리터럴 3개가 상수로 나와 있다(`PET_ORB_X`·`PET_ORB_Y`·`PET_ORB_UP`)',
     /const\s+PET_ORB_X\s*=\s*\d+/.test(src) && /const\s+PET_ORB_Y\s*=\s*\d+/.test(src)
     && /const\s+PET_ORB_UP\s*=\s*\d+/.test(src), true);
  eq('[A7] 펫 따라다니기가 그 상수를 읽는다(리터럴 62/30/46 이 안 남았다)',
     /Math\.cos\(a\)\*PET_ORB_X,\s*ty\s*=\s*player\.y\s*-\s*PET_ORB_UP\s*\+\s*Math\.sin\(a\)\*PET_ORB_Y/.test(src), true);
  eq('[A8] 근거 주석 — «크기를 되깎지 말고 자리를 벌린다» 가 왜 그 값인지가 적혀 있다',
     /590 ③[\s\S]{0,900}커진 잉크의 절반만큼만/.test(src), true);

  /* ─────────── 측정 — «상수 1 · 수리 전 궤도» 사본과 현재 트리를 같은 자로 ─────────── */
  fs.writeFileSync(NEG, src
    .replace(/const\s+PET_DRAW_SC\s*=\s*2\s*;/, 'const PET_DRAW_SC    = 1;')
    .replace(/const\s+PET_ORB_X\s*=\s*\d+\s*;/, 'const PET_ORB_X  = 62;')
    .replace(/const\s+PET_ORB_Y\s*=\s*\d+\s*;/, 'const PET_ORB_Y  = 30;')
    .replace(/const\s+PET_ORB_UP\s*=\s*\d+\s*;/, 'const PET_ORB_UP = 46;'));

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  const run = async file => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(path.basename(file) + ': ' + e));
    await page.goto('file://' + file);
    await page.waitForTimeout(1500);
    const m = await measure(page);
    await ctx.close();
    return m;
  };

  const now = await run(SRC);
  const neg = await run(NEG);
  await browser.close();
  try { fs.unlinkSync(NEG); } catch (_) {}

  /* ─────────── [B] 크기 — 찍힌 픽셀이 정확히 ×2 ─────────── */
  eq('[B0] 지금 트리의 `PET_DRAW_SC`', now.consts.PET_DRAW_SC, 2);
  for (const sp of ['bird', 'robo', 'dragon']) {
    const a = now.pets[sp], b = neg.pets[sp];
    near(`[B] ${sp} — 찍힌 배율`, a.sc, b.sc * 2, 0.5);
    near(`[B] ${sp} — 그려진 잉크 높이 (${b.drawnH} → ${a.drawnH})`, a.drawnH, b.drawnH * 2, 2);
    near(`[B] ${sp} — 그려진 잉크 폭   (${b.drawnW} → ${a.drawnW})`, a.drawnW, b.drawnW * 2, 2);
  }
  eq('[B4] 원본 프레임 잉크는 그대로다(아트를 안 건드렸다 — 커진 것은 배율뿐)',
     ['bird', 'robo', 'dragon'].every(sp => now.pets[sp].inkW === neg.pets[sp].inkW
                                         && now.pets[sp].inkH === neg.pets[sp].inkH), true);

  /* ─────────── [C] 541 불변 ─────────── */
  eq('[C1] `PLAYER_DRAW_SC` 1.5', now.consts.PLAYER_DRAW_SC, 1.5);
  eq('[C2] `MOB_DRAW_SC` 1.2', now.consts.MOB_DRAW_SC, 1.2);
  eq('[C3] `SK_DRAW_SC` 2', now.consts.SK_DRAW_SC, 2);
  eq('[C4] `unitSc` 세 갈래 — arena 1.5 · zombie 1.2 · **boss 1**',
     `${now.consts.unitSc.arena}/${now.consts.unitSc.zombie}/${now.consts.unitSc.boss}`, '1.5/1.2/1');
  eq('[C5] 플레이어 찍힌 배율이 «사본과 같다»(펫 상수가 새는지)', now.player.sc, neg.player.sc);
  eq('[C6] 플레이어 그려진 잉크 w×h 불변',
     `${now.player.drawnW}×${now.player.drawnH}`, `${neg.player.drawnW}×${neg.player.drawnH}`);
  eq('[C7] `player.r` 불변(판정은 이 행의 범위 밖)', now.player.r, neg.player.r);

  /* ─────────── [D] 481 불변 — 펫은 «그림» 만 커진다 ─────────── */
  eq('[D1] `PET_CD` 표 불변', JSON.stringify(now.consts.petCd), JSON.stringify(neg.consts.petCd));
  eq('[D2] 펫 피해식 불변 — `petDmg` 가 여전히 «플레이어 공격력 그대로»(481)',
     /const petDmg\s*=/.test(src) && !/petDmg[^\n]*PET_DRAW_SC/.test(src), true);
  eq('[D3] `PET_DRAW_SC` 가 판정·밸런스 자리에 안 샌다(그리기·그림자 2곳 + 선언 1곳뿐)',
     (src.match(/PET_DRAW_SC/g) || []).length, 5);

  /* ─────────── [E] 587 불변 ─────────── */
  eq('[E1] `PET_SP[].faceRight` 표 불변(587 이 승격할 그 표 — 이 행은 안 건드린다)',
     JSON.stringify(now.consts.faceRight), JSON.stringify(neg.consts.faceRight));
  eq('[E2] 펫 flip 이 여전히 `faceRight` 를 지난다',
     /p\.flip\s*=\s*p\.sp\.faceRight\s*\?/.test(src), true);

  /* ─────────── [F] 겹침 — 수리 전보다 나쁘지 않다 ─────────── */
  ok('[F0] 수리 전 프로필(사본) — 최대 · 평균 · 한 마리',
     `${(neg.overlap.maxCov * 100).toFixed(1)}% · ${(neg.overlap.meanCov * 100).toFixed(1)}% · ${(neg.overlap.maxOne * 100).toFixed(1)}%`);
  le('[F1] 3마리 한 바퀴 — 플레이어가 덮이는 **최대** 가 수리 전 이하',
     +(now.overlap.maxCov * 100).toFixed(1), +(neg.overlap.maxCov * 100).toFixed(1), '%');
  le('[F2] 같은 축 — **평균**이 수리 전 이하',
     +(now.overlap.meanCov * 100).toFixed(1), +(neg.overlap.meanCov * 100).toFixed(1), '%');
  le('[F3] 한 마리가 혼자 덮는 최대가 수리 전 이하',
     +(now.overlap.maxOne * 100).toFixed(1), +(neg.overlap.maxOne * 100).toFixed(1), '%');
  le('[F4] 40% 넘게 덮이는 프레임 수가 수리 전 이하', now.overlap.frames40, neg.overlap.frames40, '프레임');
  /* [전제] 이 축이 «무엇이든 통과» 가 아님을 못박는다 — 크기만 키우고 자리를 안 벌리면 빨갛다.
     사본은 «상수 1 + 수리 전 궤도» 이고, 지금 트리는 «상수 2 + 벌린 궤도» 다.
     아래 항은 «상수 2 + 수리 전 궤도» 였다면 [F1] 이 100% 로 빨개진다는 것을 궤도 값으로 말한다. */
  eq('[F5][전제] 궤도를 실제로 벌렸다(수리 전 62/30/46 그대로면 이 자는 뜻이 없다)',
     `${now.overlap.orb.x}/${now.overlap.orb.y}/${now.overlap.orb.up}` !== '62/30/46', true);
  ok('[F6] 지금 궤도 · 25% 초과 프레임',
     `${now.overlap.orb.x}/${now.overlap.orb.y}/${now.overlap.orb.up} · ${now.overlap.frames25}/${now.overlap.n}`);

  /* ─────────── [G] 411·492 불변 ─────────── */
  eq('[G1] `PET_TH`(26/50 시트 카드·슬롯 썸네일) 불변 — 이 행은 전장만 만진다',
     JSON.stringify(now.sheet.petThumb), JSON.stringify(neg.sheet.petThumb));

  /* ─────────── [R] 되돌림 시험 ─────────── */
  for (const sp of ['bird', 'robo', 'dragon']) {
    near(`[R] ${sp} — 상수를 1 로 되돌린 사본은 표 값 그대로의 배율`,
         neg.pets[sp].sc, neg.consts.table[sp], 0.5);
  }
  eq('[R4] 그 사본의 `PET_DRAW_SC`', neg.consts.PET_DRAW_SC, 1);

  errs.length ? bad('[콘솔] 페이지 예외 0건', errs.join(' | ')) : ok('[콘솔] 페이지 예외 0건');

  console.log('\n=== verify590 — 펫 크기 ×2(배수는 상수 하나 · 판정 0줄 · 플레이어를 더 가리지 않는다) ===');
  for (const r of rows) console.log(`${r[0]} ${r[1]}${r[2] ? '  →  ' + r[2] : ''}`);
  const pass = rows.filter(r => r[0] === '✓').length;
  console.log(`\n${pass}/${rows.length} 통과`);
  if (fails.length) { console.log('\n실패:'); for (const f of fails) console.log(' · ' + f); }
  process.exit(fails.length ? 1 : 0);
})().catch(e => { try { fs.unlinkSync(NEG); } catch (_) {} console.error(e); process.exit(1); });
