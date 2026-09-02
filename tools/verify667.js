/* 667 검증 — 10 상점 «이용권» 카드의 **레퍼런스 대조로 굳어진 기하**
   실행: node tools/verify667.js   (1080×2280 · 헤드리스)

   ⚑ **왜 이 자가 이제야 생기는가** — 667 등재문이 «게이트: verify667 — ref Δ 축(치수·모서리) +
   «+4h 문구 0건» · 되돌림» 을 요구했는데 1~6회차는 **자를 안 만들고** 회차마다 비평·`scan667.py`
   (자유 측정 도구)로만 확인했다. 그래서 여섯 회차가 값을 일곱 번 고치는 동안 **되돌아가도
   아무도 안 짖는 상태**였다. 이 자는 그 회차들이 «ref 를 재서 고른 값» 만 못박는다.
   레이아웃이 «닮았나» 는 여전히 비평가가 본다 — 여기 있는 것은 **되돌아가면 빨개져야 하는 값**뿐이다.

   ⚠ 기대값은 제품 상수(`NTC_LEN`·`NTC_PITCH`…)에서 **파생하지 않고 여기 다시 적는다** —
   파생시키면 그 표가 통째로 바뀌어도 «기대 = 실측» 으로 통과하는 공허한 게이트가 된다
   (verify151 머리말의 같은 규약). 각 값 옆에 **어느 회차가 무엇을 재서 골랐는지**를 적어 둔다.

   [A] 우변 물결 노치 — 개수·상자·링·앵커·피치, 그리고 **두 형의 스캘럽 모양이 다르다**는 것
   [B] 노치 구멍은 «뚫은 두 면» 만의 것이 아니다 — `.art` 도 같은 마스크를 받는다 (6회차)
   [C] 배너형 몸통은 **단색**, 불릿형만 마름모 격자 (6회차 · 2인 일치 + 화소 히스토그램)
   [D] 형마다 두 값인 자리 — 헤더 밴드 높이 · 리본 띠 높이 (3·4회차)
   [E] «+4h» 계열 문구 0건 (199 결3 ⓑ — 이용권은 ×배율 상품이다)
   [R] 되돌림 시험 — 위 셋을 되돌리면 정말로 빨개지는가 (279: 죽은 되돌림 시험은 죽은 게이트보다 나쁘다)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); }
};
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);

/* ── 기대값 (회차별 근거) ─────────────────────────────────────────────────
   배너형 = 카드1(광고 제거) · 불릿형 = 카드2·3(불릿 4행)
   · 노치 깊이 40 = 5회차 ⓐ (ref 실루엣 19.6 ref px × k)
   · 노치 길이 배너 81 / 불릿 114 = 7회차 (문턱 2~20 스윕에서 부호가 안 뒤집히는 값) ·
     불릿 114 는 5회차 ⓑ 의 `pitch/2` 와 같은 값이다 — 그 규칙이 참인 자리는 안 건드렸다
   · 피치 배너 139 / 불릿 227 = 4회차 (ref 파랑 140·141 · 초록 229·225)
   · 맨 아래 노치 중심 ↔ 카드 하변 배너 130 / 불릿 160 = 5회차 ⓒ
   · 헤더 밴드 96 / 102 = 4회차 · 리본 띠 67 / 76 = 3회차 */
const EXP = {
  ban: { h: 534, ntcN: 3, sH: 81, pitch: 139, cen0: 130, hdb: 96, rb: 67, art: { w: 390, h: 357 } },
  bl:  { h: 690, ntcN: 2, sH: 114, pitch: 227, cen0: 160, hdb: 102, rb: 76, art: { w: 462, h: 303 } }
};
const NTC_DEP = 40;                 /* 링 `s` 가로 반지름 — 상자 폭 80 = 2×40 */
const RING = 10, RIM = 12;          /* `s` 검정 테 · `u` 밝은 림 (4회차 ②) */

/* 자가 재는 «스팬» 과 CSS 길이의 관계 — 7회차 검산식.
   프로파일의 경계는 링 `s` 의 **안쪽** 타원(반지름 30 × (len/2 − 10))이라
   문턱 τ 에서 span = 2·(len/2 − RING)·√(1 − (τ/(NTC_DEP − RING))²) 이다. */
const spanAt = (len, tau) => 2 * (len / 2 - RING) * Math.sqrt(1 - Math.pow(tau / (NTC_DEP - RING), 2));

const read = page => page.evaluate(() => [...document.querySelectorAll('.pvc')].map(c => {
  const cb = c.getBoundingClientRect();
  const box = e => e ? { w: +e.getBoundingClientRect().width.toFixed(1), h: +e.getBoundingClientRect().height.toFixed(1) } : null;
  const q = s => box(c.querySelector(s));
  return {
    id: c.dataset.pv, ban: c.classList.contains('ban1'), h: +cb.height.toFixed(1),
    bgImg: getComputedStyle(c.querySelector('.bg')).backgroundImage,
    artMask: getComputedStyle(c.querySelector('.art')).maskImage,
    artMaskSize: getComputedStyle(c.querySelector('.art')).maskSize,
    frMask: getComputedStyle(c.querySelector('.fr')).maskImage,
    bgMask: getComputedStyle(c.querySelector('.bg')).maskImage,
    hdb: q('.hdb'), rb1: q('.rb1'), rb2: q('.rb2'), art: q('.art'),
    txt: c.innerText,
    ntc: [...c.querySelectorAll('.ntc')].map(n => {
      const nb = n.getBoundingClientRect();
      return {
        w: +nb.width.toFixed(1), h: +nb.height.toFixed(1),
        sW: +n.querySelector('s').getBoundingClientRect().width.toFixed(1),
        sH: +n.querySelector('s').getBoundingClientRect().height.toFixed(1),
        uW: +n.querySelector('u').getBoundingClientRect().width.toFixed(1),
        uH: +n.querySelector('u').getBoundingClientRect().height.toFixed(1),
        cen: +(cb.bottom - (nb.top + nb.height / 2)).toFixed(1)
      };
    })
  };
}));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(700);

  const cards = await read(page);
  ok('[전제] 이용권 카드 3장이 그려진다', cards.length === 3, cards.length + '장');
  const ban = cards.find(c => c.ban), bls = cards.filter(c => !c.ban);
  ok('[전제] 배너형 1장 · 불릿형 2장', !!ban && bls.length === 2);

  /* ── [A] 노치 ───────────────────────────────────────────────────────── */
  console.log('\n[A] 우변 물결 노치');
  const chk = (c, k) => {
    const E = EXP[k], t = k === 'ban' ? '배너' : '불릿';
    ok(`A1 ${t}(${c.id}) 카드 높이 ${E.h}`, near(c.h, E.h, 1), c.h);
    ok(`A2 ${t}(${c.id}) 노치 ${E.ntcN}자리 — 개수는 상수가 아니라 «피치 × 카드 높이» 가 정한다`,
      c.ntc.length === E.ntcN, c.ntc.length + '자리');
    ok(`A3 ${t}(${c.id}) 링 «s» 세로 = ${E.sH}  (7회차 — 문턱 스윕에서 ref 와 부호가 안 갈리는 값)`,
      c.ntc.every(n => near(n.sH, E.sH, 1)), c.ntc.map(n => n.sH).join('/'));
    ok(`A4 ${t}(${c.id}) 링 «s» 가로 = ${2 * NTC_DEP}  (깊이 ${NTC_DEP} 의 두 배 · 중심이 카드 우변 위)`,
      c.ntc.every(n => near(n.sW, 2 * NTC_DEP, 1)), c.ntc.map(n => n.sW).join('/'));
    ok(`A5 ${t}(${c.id}) 상자는 링보다 위·아래로 ${RIM} 씩 넓다 (밝은 림 «u» 의 호가 안 잘리게)`,
      c.ntc.every(n => near(n.h, E.sH + 2 * RIM, 1) && near(n.uH, E.sH + 2 * RIM, 1)),
      c.ntc.map(n => n.h + '/' + n.uH).join(' '));
    ok(`A6 ${t}(${c.id}) 맨 아래 노치 **중심** ↔ 카드 하변 = ${E.cen0}`,
      near(c.ntc[c.ntc.length - 1] && c.ntc[0].cen, E.cen0, 1.5), c.ntc[0] && c.ntc[0].cen);
    const cens = c.ntc.map(n => n.cen).sort((a, b) => a - b);
    const gaps = cens.slice(1).map((v, i) => +(v - cens[i]).toFixed(1));
    ok(`A7 ${t}(${c.id}) 피치 = ${E.pitch} (되풀이 무늬 — 자리마다 같다)`,
      gaps.length > 0 && gaps.every(g => near(g, E.pitch, 1.5)), gaps.join('/') || '자리 1개');
  };
  chk(ban, 'ban'); bls.forEach(c => chk(c, 'bl'));

  /* ⚑ 7회차의 본체 — **두 형은 스캘럽 모양이 다르다.** 5회차 ⓑ 의 «길이 = 피치의 절반» 은
     불릿형에서만 참이었고, 그 규칙을 배너형에 그대로 쓴 것이 «깊고 좁다» 의 뿌리였다.
     ref 실측(문턱을 맞춘 뒤): 배너 깊이 30.9 ↔ 스팬 ≈60 = **1.94배(거의 반원)** ·
     불릿 33.0 ↔ 95 = **2.88배(납작한 호)**. 이 항이 빨개지면 둘이 다시 한 규칙으로 접힌 것이다. */
  const ratio = len => spanAt(len, 6) / (NTC_DEP - RING);
  ok('A8 배너형 스캘럽은 «거의 반원»(스팬 ÷ 깊이 ≈ 2)', near(ratio(EXP.ban.sH), 1.94, 0.18), ratio(EXP.ban.sH).toFixed(2));
  ok('A9 불릿형 스캘럽은 «납작한 호»(≈ 2.9) — 두 형이 한 규칙으로 접히면 빨강',
    near(ratio(EXP.bl.sH), 2.88, 0.22) && ratio(EXP.bl.sH) - ratio(EXP.ban.sH) > 0.6,
    ratio(EXP.bl.sH).toFixed(2));

  /* ── [B] 마스크가 세 칠면에 다 걸린다 ───────────────────────────────── */
  console.log('\n[B] 노치 구멍 — «뚫은 두 면» 만의 것이 아니다 (6회차)');
  const isNtcMask = s => /radial-gradient/.test(s || '');
  cards.forEach(c => {
    ok(`B1 ${c.id} 몸통 «.bg» 가 노치 마스크를 받는다`, isNtcMask(c.bgMask));
    ok(`B2 ${c.id} 검정 테 «.fr» 이 노치 마스크를 받는다`, isNtcMask(c.frMask));
    /* 이것이 6회차가 잡은 자리다 — `.art` 는 `.bg`·`.fr` 의 **형제**라 마스크 밖이었고,
       불릿형은 판 우변이 카드 우변에서 16px 뿐이라 40 깊이의 구멍을 24px 메우고 있었다. */
    ok(`B3 ${c.id} 일러스트 자리 «.art» 도 **같은** 노치 마스크를 받는다`, isNtcMask(c.artMask));
    /* 좌표 사본 0개 — `mask-size` 가 카드 상자여야 같은 타원이 같은 자리에 온다(402 «사본을 지운다») */
    ok(`B4 ${c.id} «.art» 마스크 크기 = 카드 상자(978 × ${c.h}) — 좌표를 손으로 다시 안 적었다`,
      new RegExp('978px ' + Math.round(c.h) + 'px').test(c.artMaskSize), c.artMaskSize.split(',')[0]);
  });

  /* ── [C] 몸통 무늬 ──────────────────────────────────────────────────── */
  console.log('\n[C] 몸통 무늬 — 배너형은 단색, 불릿형만 마름모 격자 (6회차)');
  ok('C1 배너형 몸통에 격자가 **없다** (ref 파랑은 색 히스토그램이 한 톤뿐 · 우리도 두 번째 톤 0)',
    !/conic-gradient/.test(ban.bgImg), ban.bgImg.slice(0, 40));
  bls.forEach(c => ok(`C2 불릿형(${c.id}) 몸통에는 마름모 격자가 **있다** (ref 초록 46.7% ↔ 우리 49.9%)`,
    /conic-gradient/.test(c.bgImg)));

  /* ── [D] 형마다 두 값인 자리 ────────────────────────────────────────── */
  console.log('\n[D] 형마다 두 값 — 헤더 밴드 · 리본 띠 (3·4회차)');
  const two = (c, k) => {
    const E = EXP[k], t = k === 'ban' ? '배너' : '불릿';
    ok(`D1 ${t}(${c.id}) 헤더 밴드 높이 ${E.hdb}`, near(c.hdb.h, E.hdb, 1), c.hdb.h);
    ok(`D2 ${t}(${c.id}) 리본 띠 높이 ${E.rb} (두 줄 다)`,
      near(c.rb1.h, E.rb, 1) && near(c.rb2.h, E.rb, 1), c.rb1.h + '/' + c.rb2.h);
    ok(`D3 ${t}(${c.id}) 일러스트 자리 ${E.art.w}×${E.art.h}`,
      near(c.art.w, E.art.w, 1) && near(c.art.h, E.art.h, 1), c.art.w + '×' + c.art.h);
  };
  two(ban, 'ban'); bls.forEach(c => two(c, 'bl'));
  ok('D4 두 형의 헤더 밴드가 **서로 다르다**(한 값으로 접히면 빨강)', EXP.ban.hdb !== EXP.bl.hdb);
  ok('D5 두 형의 리본 띠가 **서로 다르다**', EXP.ban.rb !== EXP.bl.rb);

  /* ── [E] «+4h» 0건 ─────────────────────────────────────────────────── */
  console.log('\n[E] 199 결3 ⓑ — 이용권은 «×배율» 상품이다');
  const all = cards.map(c => c.txt).join(' | ');
  ok('E1 카드 문구에 «4시간»·«+4h» 계열이 0건 (등재문: 옛 «+4h» 로 되그리면 199 와 충돌한다)',
    !/4시간|\+ ?4h|4h 증가/i.test(all), (all.match(/4시간|\+ ?4h/gi) || []).join(',') || '0건');

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 위 셋을 되돌리면 정말 빨개지는가');
  const after = await page.evaluate(() => {
    const c1 = document.querySelector('.pvc.ban1'), c2 = document.querySelector('.pvc:not(.ban1)');
    /* R1 — 7회차 이전(«길이 = 피치의 절반» 을 배너형에도 쓴 상태)으로 되돌린다 */
    c1.querySelectorAll('.ntc').forEach(n => { n.style.height = '94px'; n.querySelector('s').style.height = '70px'; });
    /* R2 — 6회차 이전(«.art 는 마스크 밖의 형제») 으로 되돌린다 */
    c2.querySelector('.art').style.maskImage = 'none';
    c2.querySelector('.art').style.webkitMaskImage = 'none';
    /* R3 — 6회차 이전(배너 몸통에도 격자) 으로 되돌린다 */
    c1.querySelector('.bg').style.backgroundImage =
      'conic-gradient(from 45deg,rgba(0,0,0,.088) 0 25%,#0000 0 50%,rgba(0,0,0,.088) 0 75%,#0000 0)';
    const g = e => getComputedStyle(e);
    return {
      sH: c1.querySelector('.ntc>s').getBoundingClientRect().height,
      ntcH: c1.querySelector('.ntc').getBoundingClientRect().height,
      artMask: g(c2.querySelector('.art')).maskImage,
      bgImg: g(c1.querySelector('.bg')).backgroundImage
    };
  });
  ok('R1 배너 링 세로를 70(= 피치/2)으로 되돌리면 [A3] 이 빨개진다',
    !near(after.sH, EXP.ban.sH, 1) && !near(after.ntcH, EXP.ban.sH + 2 * RIM, 1), after.sH + '/' + after.ntcH);
  ok('R2 «.art» 의 마스크를 떼면 [B3] 이 빨개진다', !isNtcMask(after.artMask), after.artMask);
  ok('R3 배너 몸통에 격자를 되살리면 [C1] 이 빨개진다', /conic-gradient/.test(after.bgImg));

  ok('[전제] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' / '));
  console.log('\nVERIFY667 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
