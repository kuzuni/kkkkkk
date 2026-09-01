#!/usr/bin/env node
/* 196 기능 체크 — «버튼을 실제로 눌렀을 때 무엇이 바뀌는가»
 *
 *   node tools/func196.js
 *
 * ROUTINE.md «기능 완성 규칙»(2026-08-25, 저장소 주인 지시 — T2 에 적용):
 *   완료 조건은 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고, 결과가 저장(S)·HUD·다른 화면에
 *   반영됨» 이다. 그래서 이 스크립트는 상태를 직접 세팅하지 않고 **10 상점의 버튼을 진짜로 클릭**해서
 *   그 전후를 잰다(verify196 은 함수 단위, 이쪽은 «손가락» 단위다).
 *
 * 확인 대상 버튼 3개(카드마다):
 *   b1 «10회 소환»(무료/광고) · b2 «10회 소환»(다이아) · b3 «30회 소환»(다이아)
 * 각 버튼에 대해 — 다이아 차감 · 소환 경험치 +n · 카드 Lv/진행바 갱신 · 저장(reload 보존) ·
 * 11 확률 팝업(다른 화면) 반영 까지 본다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const rows = [];
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(700);

  /* 가이드 미션이 상자를 막지 않게 끝내 두고(73 ③), 다이아를 넉넉히 준다 */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; gmStart(); S.dia = 5e6; openShopPage(null, 'sum'); });
  await page.waitForTimeout(500);

  /* 버튼 하나를 «진짜로» 누르고 전후를 잰다 */
  const press = async (box, sel) => {
    const before = await page.evaluate(b => ({
      dia: S.dia, lv: sumLv(b), exp: sumExp(b), need: sumNeedExp(sumLv(b)),
      cnt: S.cnt['sum' + b[0].toUpperCase() + b.slice(1)] || 0
    }), box);
    await page.evaluate(([b, s]) => {
      const el = document.querySelector('#shopList .cbtn' + s + '[data-shsum="' + b + '"]');
      if (!el) throw new Error('버튼 없음: ' + b + s);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, [box, sel]);
    await page.waitForTimeout(400);
    const after = await page.evaluate(b => {
      const card = [...document.querySelectorAll('#shopList .shp-card')][SHOP_BOXES.findIndex(x => x.b === b)];
      if (typeof closeSummonResult === 'function') closeSummonResult();
      return { dia: S.dia, lv: sumLv(b), exp: sumExp(b),
               lvTxt: card.querySelector('.clv>i').textContent,
               barTxt: card.querySelector('.cbar>b').textContent,
               barW: card.querySelector('.cbar .trk>i').style.width };
    }, box);
    await page.waitForTimeout(250);
    return { before, after };
  };

  /* 소환 «경험치 총량» = (lv 로 올라간 만큼 소모한 need 합) + 남은 exp — 레벨업을 건너도 안 새게 센다 */
  const gained = async (box, before, after) => page.evaluate(([b, bf, af]) => {
    let g = af.exp - bf.exp;
    for (let lv = bf.lv; lv < af.lv; lv++) g += sumNeedExp(lv);
    return g;
  }, [box, before, after]);

  console.log('\n[1] b2 «10회 소환»(다이아) — 무기 상자');
  {
    const { before, after } = await press('weapon', '.b2');
    const g = await gained('weapon', before, after);
    ok(before.dia - after.dia === 1000, '  다이아 −1,000', (before.dia - after.dia).toLocaleString());
    ok(g === 10, '  소환 경험치 +10', '+' + g);
    ok(after.lvTxt === 'Lv.' + after.lv, '  카드 Lv 표기 = 공용 소환 레벨(496)', after.lvTxt);
    ok(after.barTxt === after.exp + '/' + before.need, '  진행바가 «exp/need» 로 즉시 갱신',
      after.barTxt + ' (need ' + before.need + ')');
    rows.push({ btn: '무기 b2 10회', chg: '다이아 −1,000 · exp +10 · 바 ' + after.barTxt });
  }

  console.log('\n[2] b3 «30회 소환»(다이아) — 스킬 상자');
  {
    const { before, after } = await press('skill', '.b3');
    const g = await gained('skill', before, after);
    ok(before.dia - after.dia === 3000, '  다이아 −3,000', (before.dia - after.dia).toLocaleString());
    ok(g === 30, '  소환 경험치 +30', '+' + g);
    ok(/^\d+\/\d+$/.test(after.barTxt), '  진행바가 «exp/need» 로 갱신', after.barTxt);
    ok(parseFloat(after.barW) >= 0 && parseFloat(after.barW) <= 100, '  채움률 0~100%', after.barW);
    rows.push({ btn: '스킬 b3 30회', chg: '다이아 −3,000 · exp +30 · 바 ' + after.barTxt + ' (' + after.barW + ')' });
  }

  console.log('\n[3] b1 «10회 소환»(무료/광고) — 펫 상자');
  {
    const { before, after } = await press('pet', '.b1');
    const g = await gained('pet', before, after);
    ok(before.dia === after.dia, '  무료 소환은 다이아 불변', String(after.dia - before.dia));
    ok(g === 10, '  소환 경험치 +10', '+' + g);
    rows.push({ btn: '펫 b1 무료 10회', chg: '다이아 0 · exp +10' });
  }

  /* 496 — 곡선이 표에서 식(need = 200 + 210·n)으로 바뀌어 경계값이 50 → 410 이다.
     경계 자체를 «need − 10 에서 10 연 한 번» 으로 잡던 모양은 그대로 두고 **수를 제품에서 읽는다**
     — 그래야 곡선이 또 바뀌어도 이 절이 안 썩는다(196 시절엔 40·50·200 이 손으로 박혀 있었다). */
  const NEED1 = await page.evaluate(() => sumNeedExp(1));
  const NEED2 = await page.evaluate(() => sumNeedExp(2));
  console.log('\n[4] 레벨업 경계 — Lv1 need ' + NEED1 + ' 을 채우는 마지막 한 번');
  {
    /* 714 — 레벨·경험치가 배너 칸이다. 카드 다섯을 같은 값으로 놓고 잰다 */
    await page.evaluate(() => { BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = sumNeedExp(1) - 10; }); renderShopPage(); });
    const { before, after } = await press('amulet', '.b2');
    ok(before.exp === NEED1 - 10 && before.lv === 1,
      '  누른 직전 Lv1 · exp ' + (NEED1 - 10) + '/' + NEED1, before.lv + '/' + before.exp);
    ok(after.lv === 2 && after.exp === 0, '  10연 한 번으로 Lv2 · 잔여 0', after.lv + '/' + after.exp);
    ok(after.lvTxt === 'Lv.2' && after.barTxt === '0/' + NEED2,
      '  카드가 «Lv.2 · 0/' + NEED2 + '»(식 값)로 갱신', after.lvTxt + ' ' + after.barTxt);
    rows.push({ btn: '목걸이 b2 (경계)', chg: 'Lv1 ' + (NEED1 - 10) + '/' + NEED1 + ' → Lv2 0/' + NEED2 });
  }

  console.log('\n[5] 다른 화면 반영 — 11 확률 팝업 · 저장');
  {
    const prb = await page.evaluate(() => {
      S.sum.weapon.lv = 16; openProbInfo('weapon');          /* 레벨 인자 없이 = 그 배너의 현재 소환 Lv */
      const lv = document.getElementById('prbLv').textContent;
      const heads = [...document.querySelectorAll('#prbList .prb-gh i')].map(e => e.textContent);
      S.sum.weapon.lv = SUM_MAXLV; openProbInfo('weapon');
      const lvMax = document.getElementById('prbLv').textContent;
      const headsMax = [...document.querySelectorAll('#prbList .prb-gh i')].map(e => e.textContent);
      closeProbInfo();
      return { lv, heads, lvMax, headsMax };
    });
    ok(prb.lv === '16', '  소환 Lv16 이면 팝업이 «16» 단계로 열린다', prb.lv);
    ok(prb.lvMax === 'MAX', '  만렙이면 «MAX»', prb.lvMax);
    ok(prb.headsMax.some(h => /불멸/.test(h)) && prb.headsMax.some(h => /초월/.test(h)),
      '  만렙 팝업에 초월·불멸 등급이 실제로 뜬다(해금 사다리 재배치 효과)',
      prb.headsMax.join(' / '));
    ok(!prb.heads.some(h => /불멸/.test(h)), '  Lv16 에서는 아직 불멸 없음(해금 = 만렙−1)', prb.heads.join(' / '));
    rows.push({ btn: '11 확률 팝업', chg: 'Lv16 → ' + prb.heads.length + '등급 · MAX → ' + prb.headsMax.length + '등급(초월·불멸 포함)' });

    const saved = await page.evaluate(() => { S.sum.weapon.lv = 7; S.sum.weapon.exp = 123; save();
                                              return { lv: S.sum.weapon.lv, exp: S.sum.weapon.exp }; });
    await page.reload();
    await page.waitForTimeout(1100);
    const kept = await page.evaluate(() => ({ lv: S.sum.weapon.lv, exp: S.sum.weapon.exp }));
    ok(kept.lv === saved.lv && kept.exp === saved.exp, '  reload 후 소환 Lv·exp 보존(저장 반영)',
      JSON.stringify(kept));
    rows.push({ btn: '저장 · reload', chg: 'Lv7 exp123 → ' + JSON.stringify(kept) });
  }

  ok(errs.length === 0, '[6] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\n기능 체크 표');
  rows.forEach(r => console.log('  · ' + r.btn.padEnd(18) + ' → ' + r.chg));

  await browser.close();
  console.log('\nFUNC196 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
