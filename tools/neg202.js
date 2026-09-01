/* 작업 202 — 되돌림 시험(음성항). `node tools/neg202.js`
 *
 * 게이트가 «항등식»(무엇을 해도 초록)이 아님을 증명한다. 세 처방을 하나씩 **파일에서** 되돌린 사본을
 * 만들고 **새로 열어서** 잰다 — 살아 있는 페이지에 CSS 를 주입하면 이미 끝난 레이아웃·정렬이 다시
 * 풀리지 않아 «거짓 초록» 이 난다(LESSONS 191 · 219 · 230 선례).
 *
 *   N1  `:is(#bSk,#bPet,#bCos) .stab>.bdg{display:none}` 짝 제거
 *        → 07·26·50 시트 안 서브탭 배지가 `.alert` 없이도 켜진다(166 ⓔ 와 같은 특이성 함정 부활)
 *   N2  `.wm-b1:not(.off)` 를 202 이전 청록(#44DAEF)으로 되돌림
 *        → 05 [장착] 이 초록이 아니다 (verify171 §6 · verify202 §2 가 잡는다)
 *   N3  07 일괄 강화 핸들러의 `uiDirty = true; renderUI();` 제거
 *        → 누른 «직후» 레드닷·버튼색이 안 따라온다 (verify202 §4)
 *
 * 셋이 **서로 다른 절**을 때려야 한다. 하나가 다른 것의 결과로 같이 빨개지면 항등식이다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP  = path.join(ROOT, `.v202-neg-${process.pid}.html`);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

const PAIR_OFF = '  :is(#bSk,#bPet,#bCos) .stab>.bdg{display:none}\n' +
                 '  :is(#bSk,#bPet,#bCos) .stab.alert>.bdg{display:block}\n';
const CYAN_NOW = ".wm-b1:not(.off){color:#fff;background:linear-gradient(180deg,#8FDC33 0 11px,#63B41C 101px,";
const CYAN_OLD = ".wm-b1:not(.off){color:#fff;background:linear-gradient(180deg,#44DAEF 0 11px,#17AECD 101px,";
const TICK_NOW = "    uiDirty = true; renderUI();\n    if(!openUpAll(r.ups))   /* 09 결과 연출.";
const TICK_OFF = "    if(!openUpAll(r.ups))   /* 09 결과 연출.";

/* 갈아 끼운 사본을 새로 열고 콜백으로 잰다 */
async function withSrc(src, fn) {
  fs.writeFileSync(TMP, src);
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + TMP.replace(/\\/g, '/'));
  await page.waitForTimeout(900);
  try { return await fn(page); } finally { await browser.close(); }
}
const measure = page => page.evaluate(() => {
  SKILLS.forEach(it => { S.own[it.id] = { l: 1, n: 1e12 }; });
  EQUIPS.forEach(it => { S.own[it.id] = { l: 1, n: 0 }; });
  COLL_SETS.forEach(st => { S.coll[st.key] = COLL_MAX_STEP; });
  const wl = EQUIPS.filter(e => e.slot === 'weapon');
  S.eqSlot.weapon = wl[1] ? wl[1].id : null;
  markDirty(); uiDirty = true; save(); goTab('hero'); heroSubGo('sk'); renderUI();
  /* ⓐ 시트 안 서브탭 배지 — `.alert` 를 «떼고» 본다(규약: 떼면 사라져야 한다) */
  const cell = [...document.querySelectorAll(':is(#bSk,#bPet,#bCos) .stab[data-upk="pet"]')][0];
  cell.classList.remove('alert');
  const leak = cell && getComputedStyle(cell.querySelector('.bdg')).display !== 'none';
  /* ⓑ 05 [장착] 면 색 */
  openWeapon(wl[0].id, 'weapon');
  const eqBg = getComputedStyle(document.getElementById('wpnBtnEq')).backgroundImage;
  closeWeapon();
  /* ⓒ 07 일괄 강화 «직후» 같은 흐름에서 읽는다 */
  renderUI();
  document.querySelector('#bSk [data-skup]').click();
  const late = document.querySelector('.tab[data-t="hero"]').classList.contains('alert');
  const btn  = getComputedStyle(document.querySelector('#bSk [data-skup]')).backgroundImage;
  return { leak, eqBg, late, btnGray: btn.includes('rgb(168, 168, 168)') };
});

(async () => {
  console.log('\n[기준선] 안 갈아 낀 사본');
  const base = await withSrc(SRC, measure);
  ok(!base.leak,  '[기준선] ⓐ `.alert` 를 떼면 시트 배지가 사라진다');
  ok(base.eqBg.includes('rgb(143, 220, 51)'), '[기준선] ⓑ 05 [장착] 초록');
  ok(!base.late,  '[기준선] ⓒ 일괄 강화 직후 탭 레드닷 즉시 꺼짐');
  ok(base.btnGray, '[기준선] ⓒ 일괄 강화 직후 버튼 즉시 회색');

  console.log('\n[N1] 특이성 복구 짝 제거 — 166 ⓔ 함정 부활');
  const s1 = SRC.replace(PAIR_OFF, '');
  ok(s1 !== SRC, '[N1] 치환 성공(대상 코드가 실제로 있다)');
  const n1 = await withSrc(s1, measure);
  ok(n1.leak, '[N1] ⓐ `.alert` 가 없는데도 시트 배지가 켜져 있다 ← 이 짝이 없으면 상시 점등');
  ok(n1.eqBg.includes('rgb(143, 220, 51)') && !n1.late && n1.btnGray,
    '[N1] ⓑⓒ 는 초록 그대로 — 서로 다른 절이다(항등식 아님)');

  console.log('\n[N2] 05 [장착] 을 202 이전 청록으로 되돌림');
  const s2 = SRC.replace(CYAN_NOW, CYAN_OLD);
  ok(s2 !== SRC, '[N2] 치환 성공');
  const n2 = await withSrc(s2, measure);
  ok(n2.eqBg.includes('rgb(68, 218, 239)') && !n2.eqBg.includes('rgb(143, 220, 51)'),
    '[N2] ⓑ 05 [장착] 이 청록으로 돌아간다 ← verify171 §6 · verify202 §2 가 잡는다');
  ok(!n2.leak && !n2.late && n2.btnGray, '[N2] ⓐⓒ 는 초록 그대로 — 서로 다른 절이다');

  console.log('\n[N3] 07 일괄 강화의 즉시 재렌더 제거');
  const s3 = SRC.replace(TICK_NOW, TICK_OFF);
  ok(s3 !== SRC, '[N3] 치환 성공');
  const n3 = await withSrc(s3, measure);
  ok(n3.late || !n3.btnGray,
    '[N3] ⓒ 누른 직후 레드닷/버튼색이 안 따라온다 (레드닷 ' + (n3.late ? '켜진 채' : '꺼짐')
      + ' · 버튼 ' + (n3.btnGray ? '회색' : '초록인 채') + ') ← 0.35s 틱을 기다리게 된다');
  ok(!n3.leak && n3.eqBg.includes('rgb(143, 220, 51)'), '[N3] ⓐⓑ 는 초록 그대로 — 서로 다른 절이다');

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG202 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
