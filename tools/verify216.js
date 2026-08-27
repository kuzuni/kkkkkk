/* 작업 216 게이트 — 03 «컨텐츠» 탭 레이드 카드의 «최고 DPS» 알약이 썸네일 슬롯을 침범하지 않는다.
   실행: node tools/verify216.js  → 마지막 줄이 `VERIFY216 n/n PASS` 여야 한다.

   등재문(213 곁가지, 2026-08-27): «최고 DPS 가 1e16(21자)을 넘으면 폭 클램프 바닥(FITMIN .55)에
   걸려 썸네일을 다시 침범한다». 그 21자는 **DPS 를 `fmt`(150 «숫자 그대로»)로 찍던 시절**의 자릿수다.
   188(주인 정정)이 «데미지·체력·DPS» 를 `fmtB`(알파벳 단위)로 떼어 가면서 표기가 최대 6자
   («9.90AA»)가 됐고, 그래서 이 행은 등재문이 예고한 대로 «188 이 들어오면 저절로 닫히는» 행이 됐다.
   → `index.html` 변경 0줄. 이 게이트는 **그 닫힘이 다시 열리지 않게** 못 박는 자다.

   보는 것:
     [1] 표기층 — DPS 자리가 «알파벳 단위» 모양이다(자릿수가 값과 함께 자라지 않는다)
     [2] 기하   — 9자~61자(1e8~1e308) 전 구간에서 알약 우단 ~ 슬롯 좌단 여백 ≥ RD_SPGAP
     [3] 클램프 — 알파벳 표기는 그릇에 여유가 있어 `fitNum` 이 아예 개입하지 않는다(인라인 fs 없음)
                  = FITMIN 바닥에 서 있지 않다(등재문이 말한 «바닥에 걸려» 상태가 아니다)
     [4] 음성항 — 표기만 `fmt` 로 되돌리면 21자에서 **실제로 침범이 재현**된다(자가 진짜로 잰다는 증거)
     [5] 아레나 — 같은 부품(`.dnc.rd`)을 쓰는 이웃 카드도 침범 0 (216 이 이 자리를 안 흔들었다)
     [6] 04 세부 — 같은 기록을 쓰는 세부 팝업 표기도 알파벳 단위다(표기층이 한 벌이다) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

/* 등재문이 세어 둔 자릿수 계단(«숫자 그대로» 기준 자수) + 그 너머 */
const CASES = [
  ['9자 (1.0e8)', 1e8], ['13자 (9.9e9)', 9.9e9], ['17자 (9.9e12)', 9.9e12],
  ['19자 (9.9e14)', 9.9e14], ['21자 (9.9e15)', 9.9e15], ['25자 (9.9e19)', 9.9e19],
  ['31자 (9.9e25)', 9.9e25], ['61자 (9.9e55)', 9.9e55], ['309자 (9.9e307)', 9.9e307],
];
/* 알파벳 단위 표기 모양: «100B» · «9.90C» · «99.0F» · «9.90AA»(두 글자 접미사) */
const ALPHA = /^\d{1,3}(\.\d{1,2})?[A-Z]{0,2}$/;

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* 잠긴 카드는 딤 아래라 기록 알약이 자리를 잡지 않는다 — 해금하고 «컨텐츠» 탭으로 */
  await p.evaluate(() => { S.best = 999; document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(600);

  /* 카드 한 장의 «기록 알약 vs 썸네일 슬롯» 을 프레임 px 로 잰다. raidFitNums 와 같은 정의:
     알약 우단 = 잉크 우단 + padding-right, 여백 = 슬롯 좌단 − 알약 우단. */
  const geo = (sel) => p.evaluate((s) => {
    const c = document.querySelector(s);
    const sp = c.querySelector('.sp.tk'), i = sp.querySelector('i'), th = c.querySelector('.th');
    const cr = c.getBoundingClientRect(), sc = cr.width / 980;
    const rg = document.createRange(); rg.selectNodeContents(i);
    const ink = rg.getBoundingClientRect();
    const padR = parseFloat(getComputedStyle(sp).paddingRight) || 0;
    return {
      txt: i.textContent,
      fs: +parseFloat(getComputedStyle(i).fontSize).toFixed(2),
      inline: i.style.fontSize,
      gap: +((th.getBoundingClientRect().left - ink.right) / sc - padR).toFixed(1),
      minGap: typeof RD_SPGAP === 'number' ? RD_SPGAP : 16,
      floor: +(parseFloat(getComputedStyle(i).fontSize) <= 41 * FITMIN + 0.01),
    };
  }, sel);
  const setDps = async (v) => { await p.evaluate((x) => {
    S.raidBest = { r60: { dmg: x * 60, dps: x } }; setDunSub('raid');
  }, v); await p.waitForTimeout(120); };

  console.log('[1] 표기층 — DPS 자리는 알파벳 단위(188)라 자릿수가 값과 함께 자라지 않는다');
  const seen = [];
  for (const [nm, v] of CASES) {
    await setDps(v);
    const g = await geo('#dunList .dnc.rd');
    seen.push({ nm, v, g });
    ok(ALPHA.test(g.txt) && g.txt.length <= 6, `${nm} → «${g.txt}» (${g.txt.length}자 ≤ 6 · 알파벳 단위)`);
  }

  console.log('[2] 기하 — 알약 우단 ~ 썸네일 슬롯 좌단 여백 ≥ RD_SPGAP (침범 0)');
  seen.forEach(({ nm, g }) => ok(g.gap >= g.minGap,
    `${nm} 여백 ${g.gap}px ≥ ${g.minGap}px`));

  console.log('[3] 클램프 — 그릇에 여유가 있어 fitNum 이 개입하지 않는다 (FITMIN 바닥이 아니다)');
  seen.forEach(({ nm, g }) => ok(!g.inline && !g.floor,
    `${nm} font-size ${g.fs}px · 인라인 ${g.inline || '없음'} · 바닥 아님`));

  console.log('[4] 음성 대조 — 표기만 150 시절 `fmt` 로 되돌리면 21자에서 침범이 재현된다');
  const patched = await p.evaluate(() => {
    /* 카드 렌더의 그 한 자리만 «옛 표기» 로 바꿔친다 (renderRaidPage 는 전역이라 치환이 먹는다) */
    window.__rrp216 = renderRaidPage;
    const src = renderRaidPage.toString().replace('fmtB(b.dps)', 'fmt(b.dps)');
    window.renderRaidPage = new Function('return (' + src + ')')();
    return /fmt\(b\.dps\)/.test(String(window.renderRaidPage));
  });
  ok(patched, '되돌림 패치 적용 (DPS = fmt «숫자 그대로»)');
  await setDps(9.9e15);
  const neg = await geo('#dunList .dnc.rd');
  ok(neg.txt.replace(/,/g, '').length >= 16 && neg.gap < 0,
     `되돌림 21자 «${neg.txt.slice(0, 12)}…» 여백 ${neg.gap}px < 0 = 침범 재현 (등재문 실측 −8.1)`);
  ok(neg.floor === 1, `되돌림 판은 FITMIN 바닥(${neg.fs}px)에 서 있다 — 등재문이 말한 그 상태`);
  await p.evaluate(() => { window.renderRaidPage = window.__rrp216; });
  await setDps(9.9e15);
  const back = await geo('#dunList .dnc.rd');
  ok(back.gap >= back.minGap && ALPHA.test(back.txt),
     `되돌림 해제 후 원복 «${back.txt}» 여백 ${back.gap}px`);

  console.log('[5] 아레나 카드 — 같은 `.dnc.rd` 부품의 전적 알약도 침범 0');
  await p.evaluate(() => { S.arena = { w: 99999, l: 99999 }; setDunSub('raid'); });
  await p.waitForTimeout(200);
  const arn = await geo('#dunList .dnc.rd.arn2');
  ok(arn.gap >= 0, `아레나 전적 «${arn.txt}» 여백 ${arn.gap}px ≥ 0`);

  console.log('[6] 04 세부 팝업 — 같은 기록을 쓰는 표기도 알파벳 단위 한 벌이다');
  await setDps(9.9e15);
  const dgd = await p.evaluate(() => {
    document.querySelector('#dunList .dnc.rd[data-rcard="r60"]').click();
    return new Promise((res) => setTimeout(() => res($('dgdAmt').textContent), 500));
  });
  ok(/^[\d.]+[A-Z]{0,2} \(DPS [\d.]+[A-Z]{0,2}\)$/.test(dgd) && !dgd.includes(','),
     `세부 팝업 기록 «${dgd}» (쉼표 표기 없음)`);

  console.log('[7] 콘솔 에러');
  ok(errs.length === 0, `콘솔 에러 ${errs.length}건`);
  errs.slice(0, 5).forEach((e) => console.log('    ERR', e));

  console.log(`\nVERIFY216 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
