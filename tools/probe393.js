/* 작업 393 재현기 — `verify216` §4 음성항(«fmt 로 되돌리면 21자에서 침범») 이 왜 안 재현되나.
   실행: node tools/probe393.js  → 마지막 줄이 `PROBE393 n/n PASS`.

   338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 세우거나 기각한다.
   등재문 가설 ⓐ «자가 죽은 표본을 붙들고 있다» · ⓑ «되돌림 주입문이 21자를 안 만든다».

   여기서 묻는 것:
     ⓐ 되돌림이 실제로 만드는 문자열은 몇 자인가 (ⓑ 를 가르는 질문)
     ⓑ 그 자리의 기하는 어디서 오나 — 잉크폭 · 슬롯 좌단 · padding · 클램프 바닥
     ⓒ 클램프 바닥(base × FITMIN)이 언제 바뀌었나 — `.dnc .sp>i{font-size}` 를 41 로 되돌리면
        등재문의 −8.1 이 돌아오는가 (= 342 3회차가 뿌리인가)
     ⓓ 지금 트리에서 «살아 있는 침범 표본» 은 몇 자부터인가 (334 처방 — 갈아 끼울 자리) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => { S.best = 999; document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(600);

  /* verify216 의 geo 와 같은 정의 + 부품을 하나씩 더 찍는다 */
  const geo = () => p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd');
    const sp = c.querySelector('.sp.tk'), i = sp.querySelector('i'), th = c.querySelector('.th');
    const cr = c.getBoundingClientRect(), sc = cr.width / 980;
    const rg = document.createRange(); rg.selectNodeContents(i);
    const ink = rg.getBoundingClientRect();
    const padR = parseFloat(getComputedStyle(sp).paddingRight) || 0;
    /* ⚠ getComputedStyle 은 **살아 있는 객체**다 — 인라인을 지우고 나서 읽으면 지운 뒤 값이 나온다.
       먼저 «지금 값» 을 문자열로 떠 놓고, 그 다음에 인라인을 지워 base 를 재고, 원상 복구한다. */
    const cs = getComputedStyle(i);
    const fsNow = parseFloat(cs.fontSize) || 0;
    const inline = i.style.fontSize || '';
    i.style.fontSize = '';
    const base = parseFloat(getComputedStyle(i).fontSize) || 0;
    i.style.fontSize = inline;
    return {
      txt: i.textContent,
      len: i.textContent.length,
      digits: i.textContent.replace(/[^0-9]/g, '').length,
      fs: +fsNow.toFixed(2),
      base: +base.toFixed(2),
      inline,
      inkW: +((ink.width) / sc).toFixed(1),
      inkR: +((ink.right - cr.left) / sc).toFixed(1),
      thL: +((th.getBoundingClientRect().left - cr.left) / sc).toFixed(1),
      padR: +padR.toFixed(1),
      gap: +((th.getBoundingClientRect().left - ink.right) / sc - padR).toFixed(1),
      floor: +(fsNow <= base * FITMIN + 0.01),
      FITMIN, RD_SPGAP,
    };
  });
  const setDps = async (v) => { await p.evaluate((x) => {
    S.raidBest = { r60: { dmg: x * 60, dps: x } }; setDunSub('raid');
  }, v); await p.waitForTimeout(120); };
  const revert = () => p.evaluate(() => {
    window.__rrp393 = window.__rrp393 || renderRaidPage;
    const src = window.__rrp393.toString().replace('fmtB(b.dps)', 'fmt(b.dps)');
    window.renderRaidPage = new Function('return (' + src + ')')();
    return /fmt\(b\.dps\)/.test(String(window.renderRaidPage));
  });
  const unrevert = () => p.evaluate(() => { window.renderRaidPage = window.__rrp393; });

  console.log('[ⓐ] 되돌림이 만드는 문자열 — 등재문의 «21자» 가 지금도 21자인가 (가설 ⓑ 검정)');
  await revert();
  await setDps(9.9e15);
  const g21 = await geo();
  console.log(`      «${g21.txt}»  ${g21.len}자 (숫자 ${g21.digits}) · fs ${g21.fs} (base ${g21.base})`);
  ok(g21.len === 21 && g21.digits === 16,
     `되돌림 문자열은 여전히 21자(숫자 16 + 쉼표 5) — 가설 ⓑ «주입문이 짧아졌다» 기각`);

  console.log('[ⓑ] 기하 분해 — 여백은 어디서 오나');
  console.log(`      잉크 우단 ${g21.inkR} · 슬롯 좌단 ${g21.thL} · padding-right ${g21.padR}`
            + ` ⇒ 여백 ${g21.gap} (RD_SPGAP ${g21.RD_SPGAP})`);
  console.log(`      잉크 폭 ${g21.inkW} · 클램프 바닥 ${(g21.base * g21.FITMIN).toFixed(2)}px · 바닥에 섰나 ${g21.floor ? '예' : '아니오'}`);
  ok(g21.gap > 0, `지금 트리에서는 21자가 침범하지 않는다 — 여백 ${g21.gap}px > 0 (등재문 −8.1 과 반대)`);
  ok(g21.floor === 1, `그런데도 클램프는 바닥에 서 있다 (fs ${g21.fs} = base × ${g21.FITMIN})`
                    + ` — «클램프가 덜 눌렀다» 가 아니라 «바닥이 내려갔다»`);

  console.log('[ⓒ] 뿌리 — `.dnc .sp>i{font-size}` 를 342 이전 41 로 되돌리면 −8.1 이 돌아오는가');
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'p393';
    /* ⚠ !important 를 쓰면 안 된다 — fitNum 이 미는 **인라인** 폰트까지 무력화돼
       «클램프가 아예 없는 판» 을 재게 된다(1회차에 그래서 −252px 이 나왔다).
       같은 특이성의 뒤 규칙이면 base(인라인이 비었을 때의 값)만 41 로 바뀌고 클램프는 그대로 산다. */
    st.textContent = '.dnc .sp>i{font-size:41px}';
    document.head.appendChild(st);
  });
  /* fitNum 은 «같은 문자열·같은 그릇이면 다시 안 잰다» 는 캐시가 있다 — base 를 바꿨으니 비운다 */
  await p.evaluate(() => { document.querySelectorAll('#dunList .dnc.rd .sp.tk>i').forEach((i) => {
    i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB; }); raidFitNums(); });
  await p.waitForTimeout(120);
  const g41 = await geo();
  console.log(`      base ${g41.base} · fs ${g41.fs} (바닥 ${(g41.base * g41.FITMIN).toFixed(2)}) · 잉크 폭 ${g41.inkW} · 여백 ${g41.gap}`);
  ok(g41.gap < 0, `base 41 에서는 21자가 실제로 침범한다 — 여백 ${g41.gap}px < 0`);
  ok(Math.abs(g41.gap - (-8.1)) <= 2.5,
     `그 값이 등재문 실측 −8.1 과 ±2.5px 안에서 같다 (실측 ${g41.gap}) ⇒ 뿌리는 342 3회차의 41 → 38`);
  await p.evaluate(() => { const e = document.getElementById('p393'); if (e) e.remove(); });

  console.log('[ⓓ] 살아 있는 침범 표본 — 지금 base 38 에서는 몇 자부터 침범하나 (334 처방)');
  const rows = [];
  for (const v of [9.9e15, 9.9e17, 9.9e18, 9.9e19, 9.9e20, 9.9e21, 9.9e24, 9.9e29, 9.9e39]) {
    await setDps(v);
    const g = await geo();
    rows.push(g);
    console.log(`      ${String(g.len).padStart(3)}자 «${g.txt.slice(0, 14)}…» fs ${g.fs} 잉크 ${g.inkW} 여백 ${g.gap}`);
  }
  const firstBad = rows.find((r) => r.gap < 0);
  ok(!!firstBad, firstBad
    ? `되돌림에서 침범이 실제로 재현되는 가장 짧은 표본 = ${firstBad.len}자 (여백 ${firstBad.gap}px)`
    : '되돌림에서 어떤 자릿수도 침범하지 않는다 — 음성항 자체가 성립하지 않는다');
  const gapMono = rows.every((r, k) => k === 0 || r.gap <= rows[k - 1].gap + 0.6);
  ok(gapMono, '자릿수가 늘수록 여백이 단조 감소한다 — 바닥에 선 뒤로는 글자 수가 곧 폭이다');

  console.log('[ⓔ] 되돌림 해제 — 제품(fmtB)은 전 구간 안전하다');
  await unrevert();
  await setDps(9.9e39);
  const back = await geo();
  ok(back.gap >= back.RD_SPGAP && back.len <= 6,
     `원복 «${back.txt}» ${back.len}자 · 여백 ${back.gap}px ≥ ${back.RD_SPGAP}`);

  console.log('[ⓕ] §R 폭 클램프(`fitNum`)를 무력화하면 무엇이 빨개지나 — 그리고 제품 주석 대조');
  /* 393 의 수리는 «침범 표본을 옮긴 것» 이다. 옮기면서 «클램프가 사라져도 초록» 이 되지 않았음을
     보이려면, 클램프를 실제로 떼 보고 자의 어느 항이 그것을 잡는지 세어야 한다(334 처방).
     ⚑ 여기서 곁다리가 하나 나왔다 — 제품 주석(index.html ~25352)은 «아레나 전적 알약은 여기
     클램프가 지킨다» 고 적어 뒀는데, 떼 보면 **여백이 한 픽셀도 안 바뀐다**. */
  const arnMeas = () => p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd.arn2');
    const sp = c.querySelector('.sp.tk'), i = sp.querySelector('i'), th = c.querySelector('.th');
    const cr = c.getBoundingClientRect(), sc = cr.width / 980;
    const rg = document.createRange(); rg.selectNodeContents(i);
    return { txt: i.textContent, inline: i.style.fontSize || '',
      gap: +((th.getBoundingClientRect().left - rg.getBoundingClientRect().right) / sc
        - (parseFloat(getComputedStyle(sp).paddingRight) || 0)).toFixed(1) };
  });
  await p.evaluate(() => { S.arena = { w: 99999, l: 99999 }; setDunSub('raid'); });
  await p.waitForTimeout(200);
  const arnOn = await arnMeas();
  console.log(`      클램프 있는 판: 아레나 전적 «${arnOn.txt}» 여백 ${arnOn.gap} · 인라인 ${arnOn.inline || '없음'}`);
  await p.evaluate(() => { window.__fit393 = window.fitNum; window.fitNum = function(){}; });
  /* verify216 [5] 와 같은 표본을 세운다 — 전적이 «0-0» 이면 애초에 클램프가 할 일이 없다 */
  await p.evaluate(() => { S.arena = { w: 99999, l: 99999 };
    document.querySelectorAll('#dunList .dnc.rd .sp>i').forEach((i) => {
      i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB; }); setDunSub('raid'); });
  await p.waitForTimeout(200);
  const arnOff = await arnMeas();
  console.log(`      클램프 없는 판: 아레나 전적 «${arnOff.txt}» 여백 ${arnOff.gap} · 인라인 ${arnOff.inline || '없음'}`);
  ok(arnOff.gap === arnOn.gap && !arnOn.inline,
     `⚑ 곁다리 — 클램프를 떼도 아레나 전적 여백이 ${arnOn.gap} → ${arnOff.gap} 로 **한 픽셀도 안 바뀐다**`
     + ` (클램프가 애초에 개입한 적이 없다 — 인라인 없음) ⇒ 제품 주석 «아레나 전적 알약은 여기`
     + ` 클램프가 지킨다» 는 거짓이고, verify216 [5] 는 클램프 제거를 못 잡는다`);
  await revert();
  await setDps(9.9e15);
  const negOff = await geo();
  ok(negOff.gap < 0 && !negOff.inline,
     `클램프가 실제로 일하는 자리는 «되돌림 판» 뿐이다 — 떼면 21자가 인라인 없이 여백 ${negOff.gap}px`
     + ` (클램프가 있으면 +13.8) ⇒ §4 의 «침범이 실제로 난다» 요구는 여전히 진짜 자다`);
  await unrevert();
  await p.evaluate(() => { window.fitNum = window.__fit393; });

  console.log(`\nPROBE393 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
