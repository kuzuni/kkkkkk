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
     [4] 음성항 — 표기만 `fmt` 로 되돌리면 **실제로 침범이 재현**된다(자가 진짜로 잰다는 증거).
                  393(2026-08-29): 자릿수를 상수로 안 박고 **제품에게 물어서** 침범이 시작되는
                  표본을 찾는다 — 등재문의 «21자 −8.1» 은 342 3회차가 `.dnc .sp>i` 를 41 → 38 로
                  내려 클램프 바닥이 22.55 → 20.90 이 되면서 **여백 +13.8 로 안전해진** 죽은 표본이다.
                  [4-c] 가 그 인과(base 를 41 로 되돌리면 21자가 다시 −8.1)를 못박는다.
                  396(2026-08-29): [4-c] 한 항만으로는 **클램프가 통째로 사라져도 초록**이다
                  (클램프 없는 판도 −252px 라 «침범한다» 는 그대로 참) ⇒ [4-c2] 가 그 판이
                  «바닥까지 눌러도 넘친다» 인지 «아예 안 눌렀다» 인지를 가른다.
     [R] 되돌림 시험 — 폭 클램프(`fitNum`)를 실제로 떼면 서명이 바뀐다(396 신설):
                  인라인이 사라지고 fs 가 base 로 돌아가며 여백이 무너진다. 이 자에서 «클램프가
                  일한다» 를 **직접** 묻는 유일한 절이다 — §1·§2·§3 은 제품 표기가 `fmtB` 라
                  클램프가 애초에 안 걸리고, §5 는 개입한 적이 없다(`probe396` [ⓒ]).
     [5] 아레나 — 같은 부품(`.dnc.rd`)을 쓰는 이웃 카드도 침범 0 (216 이 이 자리를 안 흔들었다)
                  ⚠ «기하» 항이지 «클램프» 항이 아니다(396 — 클램프는 여기 개입한 적이 없다)
     [6] 04 세부 — 같은 기록을 쓰는 세부 팝업 표기도 알파벳 단위다(표기층이 한 벌이다)

   396(2026-08-29) 등재문 정정 — «`raidFitNums` 를 통째로 지워도 216 은 35/35» 는 **사실이 아니다**.
   제품을 실제로 no-op 으로 변이시켜 재니 **34/35**(§4 둘째 항 하나가 잡는다)였다. 다만 그 한 항의
   문구가 «표본이 바닥에 서 있다» 라 원인을 안 말하고, 나머지 절(§1~§3·§4-c·§5)은 전부 둔감했다.
   ⇒ 고친 것은 [4-c2] 와 [R] 이고 제품 `index.html` 은 0줄이다. 재현기 `tools/probe396.js`. */
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
    /* 393 — 바닥은 «base × FITMIN» 이고 base 는 **CSS 가 정한다**(342 가 41 → 38 로 내렸다).
       41 을 박아 두면 자가 또 굳는다 ⇒ 인라인을 잠깐 비워 base 를 제품에게 묻고 원상 복구한다.
       ⚠ getComputedStyle 은 살아 있는 객체다 — «지금 값» 을 먼저 숫자로 떠 놓고 비울 것. */
    const fsNow = parseFloat(getComputedStyle(i).fontSize) || 0;
    const inline = i.style.fontSize || '';
    i.style.fontSize = '';
    const base = parseFloat(getComputedStyle(i).fontSize) || 0;
    i.style.fontSize = inline;
    return {
      txt: i.textContent,
      fs: +fsNow.toFixed(2),
      base: +base.toFixed(2),
      inline,
      gap: +((th.getBoundingClientRect().left - ink.right) / sc - padR).toFixed(1),
      minGap: typeof RD_SPGAP === 'number' ? RD_SPGAP : 16,
      floor: +(fsNow <= base * FITMIN + 0.01),
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

  console.log('[4] 음성 대조 — 표기만 150 시절 `fmt` 로 되돌리면 침범이 재현된다');
  const patched = await p.evaluate(() => {
    /* 카드 렌더의 그 한 자리만 «옛 표기» 로 바꿔친다 (renderRaidPage 는 전역이라 치환이 먹는다) */
    window.__rrp216 = renderRaidPage;
    const src = renderRaidPage.toString().replace('fmtB(b.dps)', 'fmt(b.dps)');
    window.renderRaidPage = new Function('return (' + src + ')')();
    return /fmt\(b\.dps\)/.test(String(window.renderRaidPage));
  });
  ok(patched, '되돌림 패치 적용 (DPS = fmt «숫자 그대로»)');

  /* 393 — **자릿수를 상수로 박지 않는다.** 등재문 시절의 «21자» 는 클램프 바닥이 22.55px
     (base 41)이던 때의 표본이고, 342 3회차가 base 를 38 로 내리면서 바닥이 20.90 이 되자
     같은 21자가 여백 +13.8px 로 **안전해졌다** — 자만 옛 표본을 붙들어 33/34 로 빨갰다.
     ⇒ 침범이 시작되는 자릿수를 **제품에게 물어서** 찾는다(368 처방 «자리를 상수에서 빼라»).
     기대값을 «≥0» 으로 뒤집는 무른 수리와 다른 점: 여기서 요구하는 것은 여전히
     **실제 침범이 일어난다**는 것이라, 클램프가 통째로 사라져도 초록이 되지 않는다(334 처방). */
  let neg = null;
  for (let e = 15; e <= 30 && !neg; e++) {
    await setDps(9.9 * Math.pow(10, e));
    const g = await geo('#dunList .dnc.rd');
    if (g.gap < 0) neg = g;
  }
  ok(!!neg, neg
    ? `되돌림에서 침범이 시작되는 가장 짧은 표본 = ${neg.txt.length}자 «${neg.txt.slice(0, 12)}…»`
      + ` 여백 ${neg.gap}px < 0 = 침범 재현`
    : '되돌림 1e15~1e30 전 구간에서 침범이 한 번도 안 난다 — 음성항이 공허하다(자가 안 재고 있다)');
  ok(neg && neg.floor === 1,
     `그 표본은 FITMIN 바닥(${neg ? neg.fs : '?'}px)에 서 있다 — «클램프가 덜 눌렀다» 가 아니라 바닥까지 눌러도 넘친다`);

  /* [4-c] 왜 등재문의 «21자 −8.1» 이 죽었는지를 자에 새겨 둔다(`probe393` 이 못박은 인과).
     base 를 342 이전 41 로만 되돌리면 바닥이 22.55 로 올라가 **그 21자가 다시 침범한다** —
     즉 표본을 옮긴 이유는 «제품이 안전해져서» 지 «자를 무르게 풀어서» 가 아니다.
     ⚠ `!important` 로 넣으면 fitNum 의 인라인까지 눌러 «클램프 없는 판» 을 재게 된다. */
  await setDps(9.9e15);                       /* 위 스캔이 두고 간 값이 아니라 «등재문의 21자» 로 되돌린다 */
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'v216b';
    st.textContent = '.dnc .sp>i{font-size:41px}';
    document.head.appendChild(st);
    document.querySelectorAll('#dunList .dnc.rd .sp.tk>i').forEach((i) => {
      i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB;   /* fitNum 캐시 비우기 */
    });
    raidFitNums();
  });
  await p.waitForTimeout(120);
  const old41 = await geo('#dunList .dnc.rd');
  ok(old41.gap < 0 && old41.txt.length === 21,
     `[4-c] base 를 342 이전 41 로 되돌리면 등재문의 21자가 다시 침범한다 — 여백 ${old41.gap}px`
     + ` (등재문 실측 −8.1 · 바닥 ${old41.fs}px) ⇒ 표본이 옮겨진 뿌리는 342 의 41 → 38`);
  /* 396 — 위 한 항만 두면 **클램프가 통째로 사라져도 초록**이다(`probe396` [ⓑ]: 클램프 없는 판도
     같은 자리가 −252px 라 «침범한다» 는 그대로 참이다). 이 판이 «클램프가 바닥까지 눌렀는데도
     넘친다» 인지 «클램프가 아예 일을 안 했다» 인지를 갈라야 항이 공허해지지 않는다. */
  ok(old41.floor === 1 && !!old41.inline,
     `[4-c2] 그 −8.1 은 «클램프가 바닥까지 눌러도 넘친다» 다 — 인라인 ${old41.inline || '없음'} ·`
     + ` fs ${old41.fs} = base ${old41.base} × ${old41.base ? +(old41.fs / old41.base).toFixed(2) : '?'}`
     + ` (클램프를 떼면 이 항이 빨개진다 — fs 가 base 41 그대로다)`);
  await p.evaluate(() => {
    const e = document.getElementById('v216b'); if (e) e.remove();
    document.querySelectorAll('#dunList .dnc.rd .sp.tk>i').forEach((i) => {
      i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB;
    });
    window.renderRaidPage = window.__rrp216;
  });
  await setDps(9.9e15);
  const back = await geo('#dunList .dnc.rd');
  ok(back.gap >= back.minGap && ALPHA.test(back.txt),
     `되돌림 해제 후 원복 «${back.txt}» 여백 ${back.gap}px`);

  /* ------------------------------------------------------------------ */
  console.log('[R] 되돌림 시험 — 폭 클램프(`fitNum`)를 떼면 이 자가 잡는가 (396)');
  /* 396 (2026-08-29): 이 자의 어느 절도 «클램프가 실제로 일한다» 를 직접 묻지 않았다 —
     §1·§2·§3 은 제품 표기가 `fmtB`(최대 6자)라 클램프가 애초에 안 걸리는 자리고(그래서 클램프가
     없어도 같은 값), §4-c 는 클램프가 없으면 **더 크게** 침범하므로 오히려 초록이며, §5 는
     `probe393` [ⓕ]·`probe396` [ⓒ] 가 «인라인이 붙은 적이 없다»(여백 22.4 → 22.4 Δ0)로 못박았다.
     ⇒ 클램프 제거를 잡던 것은 §4 둘째 항 하나뿐이었고(실측 34/35), 그 항의 문구는
     «표본이 바닥에 서 있다» 라 빨개져도 «클램프가 사라졌다» 로 안 읽힌다.
     여기서는 클램프를 실제로 떼고 **서명**(인라인이 붙나 · 바닥에 서나 · 여백이 무너지나)을 묻는다.
     ⚠ 제품 파일은 안 건드린다 — 전역 `fitNum` 을 잠깐 갈아 끼우고 캐시(dataset.fitT/fitB)와
     이미 눌러 둔 인라인을 같이 비워야 «클램프가 없는 판» 이 된다(probe393 [ⓕ] 방식).
     ⚠ 표본은 §4 가 제품에게 물어 찾은 «살아 있는 침범 표본»(22자·9.9e16)이다 — 상수로 안 박는다. */
  const revert216 = () => p.evaluate(() => {
    const src = window.__rrp216.toString().replace('fmtB(b.dps)', 'fmt(b.dps)');
    window.renderRaidPage = new Function('return (' + src + ')')();
  });
  const clampSet = (off) => p.evaluate((x) => {
    if (!window.__fit216) window.__fit216 = window.fitNum;
    window.fitNum = x ? function () {} : window.__fit216;
    document.querySelectorAll('#dunList .dnc .sp>i').forEach((i) => {
      i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB;
    });
  }, off);
  await revert216();
  await setDps(9.9e16);
  const rOn = await geo('#dunList .dnc.rd');
  ok(!!rOn.inline && rOn.floor === 1,
     `[R-a] 전제 — 이 표본에서 클램프가 실제로 일한다: 인라인 ${rOn.inline || '없음'} ·`
     + ` fs ${rOn.fs} = 바닥(base ${rOn.base} × FITMIN) · 여백 ${rOn.gap}px`
     + ` (이 항이 빨개지면 `+ '`raidFitNums()`' + ` 호출이 사라진 것이다)`);
  await clampSet(true);
  await setDps(9.9e16);
  const rOff = await geo('#dunList .dnc.rd');
  ok(!rOff.inline && Math.abs(rOff.fs - rOff.base) < 0.01,
     `[R-b] 클램프를 떼면 인라인이 사라지고 fs 가 base 그대로다 (${rOff.fs} = ${rOff.base})`);
  ok(rOff.gap <= rOn.gap - 100,
     `[R-c] 그때 여백이 ${rOn.gap}px → ${rOff.gap}px 로 ${(rOn.gap - rOff.gap).toFixed(1)}px 무너진다`
     + ` = 클램프가 이 자리를 실제로 지키고 있었다`);
  await clampSet(false);
  await setDps(9.9e16);
  const rBack = await geo('#dunList .dnc.rd');
  ok(!!rBack.inline && rBack.gap === rOn.gap,
     `[R-d] 클램프를 되돌리면 같은 값으로 원복한다 — 여백 ${rBack.gap}px · 인라인 ${rBack.inline || '없음'}`);

  /* [R-e] 클램프가 «이기는» 띠 — 되돌림 표기에는 바닥에 닿기 **전에** 클램프가 글자를 그릇 안에
     넣어 버리는 자릿수 구간이 있다. 그 띠에서 여백은 우연한 값이 아니라 `RD_SPGAP` 에 정확히
     착지해야 한다(클램프가 겨냥한 값이 그것이니까). 여기가 room 계산(`RD_SPGAP` + padding-right +
     fit() 배율)을 재는 유일한 자리다 — §2 는 제품 표기가 `fmtB` 라 클램프가 아예 안 걸려서 못 본다.
     ⚠ 띠의 자릿수는 상수로 안 박는다(368 처방) — 제품에게 물어서 «인라인이 붙고 바닥은 아닌»
     표본만 골라 낸다. 허용 오차 ±0.6px 는 `fitNum` 이 `w <= box + 0.5` 에서 멈추기 때문이다. */
  const band = [];
  for (let e = 8; e <= 16; e++) {
    await setDps(9.9 * Math.pow(10, e));
    const g = await geo('#dunList .dnc.rd');
    if (g.inline && !g.floor) band.push(g);
  }
  ok(band.length >= 3,
     `[R-e1] 되돌림에서 «클램프가 이기는» 표본이 ${band.length}종 (바닥 전에 그릇 안으로 들어온다)`);
  const offBand = band.filter((g) => Math.abs(g.gap - g.minGap) > 0.6);
  ok(band.length >= 3 && offBand.length === 0,
     `[R-e2] 그 띠의 여백이 전부 RD_SPGAP ${band[0] ? band[0].minGap : '?'}px 에 ±0.6 안으로 착지한다`
     + ` (${band.map((g) => `${g.txt.length}자 ${g.gap}`).join(' · ')})`
     + (offBand.length ? ` — 벗어난 표본 ${offBand.map((g) => `${g.txt.length}자 ${g.gap}`).join(',')}` : ''));

  await p.evaluate(() => { window.renderRaidPage = window.__rrp216; });
  await setDps(9.9e15);

  console.log('[5] 아레나 카드 — 같은 `.dnc.rd` 부품의 전적 알약도 침범 0');
  /* ⚠ 396 — 이 절은 «기하» 항이지 «클램프» 항이 아니다. 아레나 전적은 클램프가 개입한 적이
     없으므로(`probe396` [ⓒ]) 여기를 클램프의 증거로 읽지 마라 — 그 증거는 위 §R 이다. */
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
