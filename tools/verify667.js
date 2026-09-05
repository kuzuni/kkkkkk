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
/* 896 1회차 — «칠해진 검정인가». `rgb(r,g,b)` · `rgba(r,g,b,a)` 둘 다 받는다.
   투명(alpha 0)도 «검정 아님» 으로 읽어야 한다 — 색만 검정이고 안 보이는 립이 이 항의 표적이다. */
const isBlack = (css) => {
  const m = String(css || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return false;
  const v = m[1].split(',').map(s => parseFloat(s));
  const a = v.length > 3 ? v[3] : 1;
  return a >= 0.9 && Math.max(v[0], v[1], v[2]) <= 40;
};

/* ── 기대값 (회차별 근거) ─────────────────────────────────────────────────
   배너형 = 카드1(광고 제거) · 불릿형 = 카드2·3(불릿 4행)
   · 노치 깊이 **두 형 다 41** = 923 2회차 (833 8회차의 40/43 을 이관했다 — 그 근거였던
     `scan667.py` 의 ref 파랑 30.9 ↔ 초록 33.0 은 원본에서 **15 ↔ 16 화소 = 한 칸**이고,
     한 칸이 우리 2.06px 이라 그 자로는 두 형을 못 가른다. 부분화소 자 셋은 ref 두 형을
     31.36~31.67 로 같게 읽는다 ⇒ 보이는 깊이 31 = 반지름 41)
   · 노치 길이 배너 81 / 불릿 114 = 7회차 (문턱 2~20 스윕에서 부호가 안 뒤집히는 값) ·
     불릿 114 는 5회차 ⓑ 의 `pitch/2` 와 같은 값이다 — 그 규칙이 참인 자리는 안 건드렸다
   · 피치 배너 139 / 불릿 227 = 4회차 (ref 파랑 140·141 · 초록 229·225)
   · 맨 아래 노치 중심 ↔ 카드 하변 배너 130 / 불릿 160 = 5회차 ⓒ
   · 헤더 밴드 96 / 102 = 4회차 · 리본 띠 67 / 76 = 3회차 */
const EXP = {
  ban: { h: 534, ntcN: 3, sH: 81, pitch: 139, cen0: 130, hdb: 96, rb: 67, art: { w: 390, h: 357 } },
  bl:  { h: 690, ntcN: 2, sH: 114, pitch: 227, cen0: 160, hdb: 102, rb: 76, art: { w: 445, h: 281 } }
};
/* ⚑ 923 2회차 — 링 `s` 가로 반지름. **두 형이 한 값**이다(상자 폭 = 2×반지름).
   833 8회차의 «형마다 두 값(40/43)» 은 `scan667.py` 가 **정수 화소**로 낸 ref 15 ↔ 16 화소,
   곧 **한 칸**(우리 2.06px) 차이였다. 부분화소 자 셋(scan923.py · 923 1회차 채점 GJ·GK)이
   ref 두 형을 31.36~31.67 로 **같게** 읽는다 ⇒ 한 값 41(보이는 깊이 31). 상세는 index.html `NTC_DEP` 주석. */
const NTC_DEP = { ban: 41.65, bl: 41.65 };   /* 923 3회차 — 폴리곤은 상자 폭 반올림에 안 매인다(2회차 잔차 −0.49 를 닫았다) */
const RING = 10, RIM = 12;          /* `s` 검정 테 · `u` 밝은 림 (4회차 ②) */

/* 자가 재는 «스팬» 과 CSS 길이의 관계 — 7회차 검산식.
   프로파일의 경계는 링 `s` 의 **안쪽** 타원(반지름 dep − RING × (len/2 − 10))이라
   문턱 τ 에서 span = 2·(len/2 − RING)·√(1 − (τ/(dep − RING))²) 이다.
   ⚠ 833 8회차 — `dep` 가 형마다 달라져 **인자로 받는다**(한 값으로 굳으면 두 형 중 하나가 틀린다). */
const spanAt = (len, tau, dep) => 2 * (len / 2 - RING) * Math.sqrt(1 - Math.pow(tau / (dep - RING), 2));

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
      /* ⚑ 923 3회차 — 노치 «모양» 이 상자에서 **폴리곤**으로 옮겨졌다(옛 «작은 상자 + border-radius»
         폐기). 그래서 «그려질 길이·깊이» 는 상자 크기가 아니라 폴리곤 좌표에서 읽는다:
           span = 바깥 곡선의 세로 스팬(= 노치 길이) · apex = 카드 우변에서 가장 깊은 점. */
      const pol = (el, eo) => {
        const cp = getComputedStyle(el).clipPath;
        if (cp.indexOf('polygon') !== 0) return null;
        const xs = [...cp.matchAll(/calc[(]\s*100%\s*([+-])\s*([\d.]+)px\s*[)]/g)]
          .map(m => (m[1] === '-' ? +m[2] : -m[2]) + eo);
        const ys = [...cp.matchAll(/(?:calc[(][^)]*[)]|100%|-?[\d.]+px)\s+(-?[\d.]+)px/g)].map(m => +m[1]);
        if (!xs.length || !ys.length) return null;
        return { apex: +Math.max(...xs).toFixed(2), span: +(Math.max(...ys) - Math.min(...ys)).toFixed(1) };
      };
      const sp = pol(n.querySelector('s'), 0), up = pol(n.querySelector('u'), 10);
      return {
        w: +nb.width.toFixed(1), h: +nb.height.toFixed(1),
        sW: +n.querySelector('s').getBoundingClientRect().width.toFixed(1),
        sH: +n.querySelector('s').getBoundingClientRect().height.toFixed(1),
        uW: +n.querySelector('u').getBoundingClientRect().width.toFixed(1),
        uH: +n.querySelector('u').getBoundingClientRect().height.toFixed(1),
        sSpan: sp && sp.span, sApex: sp && sp.apex, uApex: up && up.apex,
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
    /* ⚑ 923 3회차 이관 — 잣대만 바뀌었다(뜻은 7회차 그대로). 옛 항은 링 상자의 높이를 물었는데
       3회차부터 그 상자는 노치 상자를 통째로 덮으므로(모양은 폴리곤) **폴리곤 바깥 곡선의 세로 스팬**
       을 묻는다. 그것이 «그려질 노치 길이» 다 — 상자를 물면 늘 len+24 라 항이 늘 초록인 벙어리가 된다. */
    ok(`A3 ${t}(${c.id}) 노치 폴리곤 세로 스팬 = ${E.sH}  (7회차 — 문턱 스윕에서 ref 와 부호가 안 갈리는 값)`,
      c.ntc.every(n => near(n.sSpan, E.sH, 1)), c.ntc.map(n => n.sSpan).join('/'));
    /* ⚑ 923 2회차 이관 — 이 항은 **두 번째로 방향이 바뀐다**(333 처방 · 자리는 그대로 둔다).
       5회차 «두 형이 같은 80» → 833 8회차 «두 값 80/86» → 지금 «두 형이 같은 82».
       8회차를 되돌리는 것이 아니라 **자를 갈아 끼운 것**이다: 8회차의 근거(`scan667.py` 정수 자)는
       ref 두 형을 15 ↔ 16 화소로 읽는데 그 한 칸이 우리 2.06px 이라 두 형을 그보다 곱게 못 가른다.
       부분화소 자 셋이 ref 두 형을 31.4 언저리로 **같게** 읽는다 ⇒ 반지름 41 · 보이는 깊이 31. */
    ok(`A4 ${t}(${c.id}) 검정 폴리곤 꼭지 = ${NTC_DEP[k]}  (카드 우변에서 가장 깊은 점`
      + ` ⇒ 보이는 깊이 ${NTC_DEP[k] - RING} = ref 두 형 31.40·31.67 — 부분화소 자 셋 일치)`,
      c.ntc.every(n => near(n.sApex, NTC_DEP[k], 0.1)), c.ntc.map(n => n.sApex).join('/'));
    /* 짝 항 — 상자·밝은 림도 같은 한 값에서 파생된다(값을 세 곳에 따로 적으면 여기가 빨개진다).
       ⚑ 923 3회차 — 림 상자는 «카드 우변 10px 안쪽» 이라 상자보다 10 좁고(833 10회차를 상자로 옮겼다),
       림의 폴리곤 꼭지는 여전히 d+12 다. */
    ok(`A4b ${t}(${c.id}) 상자 폭 = 반지름 + ${RIM} · 림 «u» 상자 = 그 −10 · 림 꼭지 = 반지름 + ${RIM} (넷이 «--ntc-d» 한 값 파생)`,
      c.ntc.every(n => near(n.w, NTC_DEP[k] + RIM, 1) && near(n.uW, NTC_DEP[k] + RIM - 10, 1)
        && near(n.uApex, NTC_DEP[k] + RIM, 0.1)),
      c.ntc.map(n => n.w + '/' + n.uW + '/' + n.uApex).join(' '));
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
  /* 833 8회차 — 깊이가 형마다 갈렸으므로 분모도 그 형의 것을 쓴다(한 값으로 재면 불릿이 3.07 로 부푼다). */
  const ratio = k => spanAt(EXP[k].sH, 6, NTC_DEP[k]) / (NTC_DEP[k] - RING);
  ok('A8 배너형 스캘럽은 «거의 반원»(스팬 ÷ 깊이 ≈ 2)', near(ratio('ban'), 1.94, 0.18), ratio('ban').toFixed(2));
  ok('A9 불릿형 스캘럽은 «납작한 호»(≈ 2.9) — 두 형이 한 규칙으로 접히면 빨강',
    near(ratio('bl'), 2.88, 0.22) && ratio('bl') - ratio('ban') > 0.6,
    ratio('bl').toFixed(2));

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

  /* ── [F] 8회차 — 배너 칸 안 자리 · 금색 판 «--gx» · 일러스트 자리 ─────
     세 자리 다 «비평 두 사람이 서로 다른 것을 재서 갈렸던» 자리다(6·7회차). 8회차가 자로 닫았고
     ref 값은 전부 **같은 방법을 ref 와 우리 캡처에 한 번씩** 돌려서 얻었다(k = 978/474.12 = 2.0628). */
  console.log('\n[F] 8회차 — 배너 글자 칸 · 금색 판 자리 · 일러스트 자리');
  const F = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc').forEach(c => {
      const cb = c.getBoundingClientRect();
      const rel = e => { const r = e.getBoundingClientRect();
        return { l: +(r.left - cb.left).toFixed(1), t: +(r.top - cb.top).toFixed(1),
          w: +r.width.toFixed(1), h: +r.height.toFixed(1), cx: +(r.left + r.width / 2 - cb.left).toFixed(1) }; };
      const o = { id: c.dataset.pv, ban: c.classList.contains('ban1') };
      const ban = c.querySelector('.ban');
      if (ban) { const bb = rel(ban); o.banBox = bb; o.banI = rel(ban.querySelector('i'));
        o.split = +(bb.l + bb.w * 0.36).toFixed(1); }
      o.rb = [...c.querySelectorAll('.rb')].map(r => rel(r.querySelector('b')).cx);
      o.art = rel(c.querySelector('.art'));
      const pvl = c.querySelector('.pvl');
      o.pvl = pvl ? Object.assign(rel(pvl), { z: getComputedStyle(pvl).zIndex }) : null;
      o.artZ = getComputedStyle(c.querySelector('.art')).zIndex;
      out.push(o);
    });
    return out;
  });
  const fban = F.find(c => c.ban), fbls = F.filter(c => !c.ban);

  /* F1·F2 — 배너 글자는 «노랑 칸» 의 것이다.
     ref(파랑 배너 224 ref px · 분할선 81): 글자 잉크 90..218 ⇒ 좌 여백 9 · 잉크 중심 154.
     우리(462 · 분할선 166.3 = 카드-로컬 216.3): 8회차 전 상자 좌단 199 로 **크림 칸을 17px 물고** 있었고
     잉크 좌단이 분할선을 2px 넘었다. */
  ok('F1 배너 글자 상자 좌단이 크림/골드 «분할선» 오른쪽에 있다 (ref 는 분할선 +9 ref px 에서 시작한다)',
    fban.banI.l > fban.split, '좌단 ' + fban.banI.l + ' ↔ 분할선 ' + fban.split);
  /* ⚑ 833 9회차 이관(333 처방 — 방향을 갈아 끼웠다. 지우지 않았다).
     8회차의 365.5 는 «넘치는 줄» 을 전제로 «넘침의 절반을 미리 갚은» 자리였는데, 그 갚은 자리가
     ref 가 아니었다 — 833 8회차 채점에서 DF·DG 가 «잉크가 노란 칸 안에서 +11.6/+11.7 오른쪽» 을
     2인 일치로 냈고, 833 9회차의 화소 자(`tools/scan833c.py` · ref·우리를 한 정의로 잰다 ·
     문턱 235/246/250 에서 부호·값 불변)가 **+10.1** 로 확인했다(ref «잉크중심 − 칸중심» −2.1 ↔ 우리 +8.0).
     ⇒ 9회차는 상자를 열어 **넘침을 0 으로** 만들고(`left:161;right:4` · 실폭 283 > advance 264.7)
     상자 중심을 **359.5**(= 노랑 칸 중심 361.5 + ref 편차 −2.1)에 두었다 — 이제 상자 중심 = 잉크 중심이다.
     되돌림은 `verify833` [R13]·[R13b] 가 잰다. */
  ok('F2 배너 글자 상자 중심 359.5 = 잉크 중심 (833 9회차 · ref 노랑 칸 중심 −2.1 · 옛 값 365.5)',
    near(fban.banI.cx, 359.5, 1.5), fban.banI.cx);

  /* F3·F4 — 금색 판 «--gx». 자 = 금색 채움 #D47D14(±14) bbox 중심, ref·캡처 같은 방법.
     ref 파랑 170.57 / 213.57 ref px ⇒ 카드-로컬 351.9 / 440.6 (8회차가 g1 17→26 · g2 24→34 로 맞췄다)
     ref 초록 191.07 / 218.6 ⇒ 394.1 / 451.0 (8회차 무변경 — 이미 1.4px 안이었다) */
  ok('F3 배너형 금색 판 중심 = 352.5 / 441.5  (ref 환산 351.9 / 440.6 · 8회차 --gx 26 / 34)',
    near(fban.rb[0], 352.5, 2) && near(fban.rb[1], 441.5, 2), fban.rb.join(' / '));
  ok('F4 불릿형 금색 판 중심 = 395.5 / 451.5  (ref 환산 394.1 / 451.0 — 8회차가 **안 건드린** 자리)',
    fbls.every(c => near(c.rb[0], 395.5, 2) && near(c.rb[1], 451.5, 2)),
    fbls.map(c => c.rb.join('/')).join(' · '));

  /* F8·F9 — 리본2 «제비꼬리». `right:-6` 이 패딩 상자 기준이라 삼각형 우변이 띠 바깥선과 같은 자리에 오고,
     빨강에 파고드는 **깊이 = width − 테 6** 이다. ref 는 파랑·초록 둘 다 **3 ref px**(= 6.2)이고
     **리본1 에는 제비꼬리가 없다**(ref 도 라운드 코너뿐 · 측정표 §7-1). */
  const F89 = await page.evaluate(() => {
    const c = document.querySelector('.pvc.ban1');
    const b = [...document.querySelectorAll('.pvc')].find((x) => !x.classList.contains('ban1'));
    const g = (sel, el) => getComputedStyle(el, sel);
    return {
      rb2W: g('::after', c.querySelector('.rb2')).width,
      rb2Bd: g(null, c.querySelector('.rb2')).borderRightWidth,
      rb1Ct: g('::after', c.querySelector('.rb1')).content,
      rb1W: g('::after', c.querySelector('.rb1')).width,
      rb1Bd: g(null, c.querySelector('.rb1')).borderRightWidth,
      blRb1Ct: g('::after', b.querySelector('.rb1')).content
    };
  });
  const rb2w = parseFloat(F89.rb2W), rb2bd = parseFloat(F89.rb2Bd);
  const rb1w = parseFloat(F89.rb1W), rb1bd = parseFloat(F89.rb1Bd);
  ok('F8 리본2 제비꼬리 깊이 = 폭 − 테 = 6  (ref 3 ref px = 6.2 · 8회차 · 26 → 12)',
    near(rb2w - rb2bd, 6, 1), `폭 ${F89.rb2W} − 테 ${F89.rb2Bd} = ${(rb2w - rb2bd).toFixed(1)}`);
  /* ⚑ 885 1회차 — 이 항은 «리본1 엔 제비꼬리가 없다» 로 굳어 있었고 **틀렸다**(333 처방으로 방향을 뒤집는다).
     자 = 빨강 채움(255,86,93) 행별 우단 프로파일 · 문턱 60·90·130 스윕에서 부호 불변:
       ref 파랑 rb1 **3~4 ref px** (최심이 **가운데** 36~52% 높이 = 라운드 코너면 끝이 깊어야 한다) ·
       ref 파랑 rb2 3~4 · ref 초록 rb2 4 · **ref 초록 rb1 1(평평)**.
     ⇒ «형마다 두 값» 이 하나 더 있는 것이지 «없는 부품» 이 아니다. 833 8회차 비평 DF 4순위와 같은 값. */
  ok('F9 배너형 리본**1** 에도 제비꼬리가 있다 — 깊이 = 폭 − 테 = 6, 리본2 와 **한 값** (ref 파랑 rb1 3~4 ref px · 885)',
    F89.rb1Ct !== 'none' && F89.rb1Ct !== 'normal' && near(rb1w - rb1bd, 6, 1),
    `${F89.rb1Ct} · 폭 ${F89.rb1W} − 테 ${F89.rb1Bd}`);
  ok('F9b 불릿형 리본1 에는 **없다** — ref 초록 rb1 은 깊이 1 ref px 로 평평하다(같은 자·같은 스윕 · 885)',
    F89.blRb1Ct === 'none' || F89.blRb1Ct === 'normal', F89.blRb1Ct);

  /* F5~F7 — 일러스트 «자리». 6·7회차 비평 세 사람이 «판 좌단이 82~99px 어긋난다 / ref 에는 그 판이 없다»
     로 세 번 갈렸다. 자로 재면 **상자는 ref 환산과 0.4px 안**이고, 어긋나 보인 것은
     ref 쪽에서 «보이는 잉크»(= ★판이 끝나는 자리부터)를 재고 우리 쪽에서 «상자» 를 잰 탓이다 —
     ref 도 우리도 ★판이 일러스트 **위**에 그려지고(측정표 §5-2 «판이 티켓 위에 그려진다»)
     겹침 폭도 같다(ref 41.5 ref px = 85.6 ↔ 우리 86). */
  /* ⚑ 885 1회차 이관 — **세로 두 값이 바뀌었다**(333 처방 — 자리를 안 비우고 값만 옮긴다).
     옛 값(t 135 · h 303)은 측정표 §9 의 «ref 224×147» 에서 나왔는데, 그 표의 세로가 −7.5% 다:
     비평 DL 276.4 · DM 280.7 · `tools/scan885.py --art` 280.5 (우리 px 환산 · 셋 다 독립) ↔ 옛 303.
     상변도 셋 다 «우리가 9px 위»(DL 142.3 · DM 144.2 · scan885 140.3) ⇒ t 142 · h 281.
     ⚑ **885 2회차 이관 — 폭·좌단도 닫혔다**(1회차가 «정의로 갈렸다» 며 남긴 축). `scan885 --edge` 가
     ref 알약 띠 4줄 «사이의 틈» 에서 티켓 잉크(검정 외곽선 + 청백)를 x 256~272 에 찍었고 띠 행에서는
     사라졌다 ⇒ 일러스트는 띠 **뒤**로 이어지고, DL 의 «좌단 296» 은 모서리가 아니라 **가림선**이다.
     ⇒ 좌단 500 → **517**(ref 516.8) · 폭 462 → **445**(ref 445.6) · **우변 962 불변**(ref 962.4). */
  ok('F5 불릿형 일러스트 자리 = ref 환산 (**517**,142) **445**×281  (네 값 모두 자 실측 — 885 1회차 세로 · 2회차 폭·좌단)',
    fbls.every(c => near(c.art.l, 517, 1) && near(c.art.t, 142, 1) && near(c.art.w, 445, 1) && near(c.art.h, 281, 1)),
    fbls.map(c => `${c.art.l},${c.art.t} ${c.art.w}x${c.art.h}`).join(' · '));
  /* ⚠ 이 항이 [F5] 의 «유령 방지» 짝이다 — 폭·좌단을 «보이는 잉크» 로 다시 읽으면 판 좌단이 곧바로
     ★판 우단으로 끌려간다(그 자리가 DL 의 −86 이다). 판은 ★판 **뒤로 이어져야** 하므로 겹침이 0 이 되면
     빨갛다. 없으면 다음 회차가 같은 유령을 또 좇는다. */
  ok('F5b 판 좌단은 ★판 우단에 **안 붙는다** — 겹침 > 40 (판이 알약 뒤로 이어진다 · ref 틈 증거)',
    fbls.every(c => c.pvl && (c.pvl.l + c.pvl.w - c.art.l) > 40),
    fbls.map(c => c.pvl && (c.pvl.l + c.pvl.w - c.art.l).toFixed(1)).join('/'));
  ok('F6 ★판(.pvl)이 일러스트(.art) **위**에 그려진다 — ref §5-2 와 같은 순서 (z 1 ↔ auto)',
    fbls.every(c => c.pvl && c.pvl.z === '1' && fban.artZ === 'auto'),
    fbls.map(c => c.pvl && c.pvl.z).join('/') + ' ↔ art ' + fbls[0].artZ);
  /* ⚑ 885 2회차 이관 — 겹침은 **파생값**이다(★판 우단 − 판 좌단). 판 좌단이 517 로 옮겨졌으니
     이 값도 같이 옮긴다. ref 는 67.0(띠 우단 583.9 − 일러스트 좌단 516.8 · `scan885 --edge`)이고
     우리 69.0 의 +2.0 은 **우리 알약이 ref 보다 2.1 넓은 것**(그 자체는 DL·DM 둘 다 «정상» 으로 닫았다)
     이 그대로 넘어온 것이다 — 겹침을 67 로 맞추려 판을 옮기면 알약의 오차를 판에 떠넘기게 된다. */
  ok('F7 ★판 ↔ 일러스트 겹침 = 69  (ref 67.0 + 우리 알약 폭 잔차 2.1 — «판이 일러스트를 왼쪽에서 덮는» 폭)',
    fbls.every(c => near(c.pvl.l + c.pvl.w - c.art.l, 69, 1.5)),
    fbls.map(c => (c.pvl.l + c.pvl.w - c.art.l).toFixed(1)).join('/'));

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 위 셋을 되돌리면 정말 빨개지는가');
  const after = await page.evaluate(() => {
    const c1 = document.querySelector('.pvc.ban1'), c2 = document.querySelector('.pvc:not(.ban1)');
    /* R1 — 7회차 이전(«길이 = 피치의 절반» 을 배너형에도 쓴 상태)으로 되돌린다 */
    /* ⚑ 923 3회차 — 길이는 이제 상자가 아니라 **폴리곤**이 들고 있다. 그래서 되돌림도 제품 자신의
       함수로 «길이 70 짜리 폴리곤» 을 만들어 카드에 실어야 한다(상자만 줄이면 [A3] 이 안 움직인다). */
    const rev = pvNtcPoly(70, NTC_DEP, 'ban');
    c1.style.setProperty('--ntc-ps', rev.ps);
    c1.style.setProperty('--ntc-pu', rev.pu);
    c1.querySelectorAll('.ntc').forEach(n => { n.style.height = '94px'; });
    /* R2 — 6회차 이전(«.art 는 마스크 밖의 형제») 으로 되돌린다 */
    c2.querySelector('.art').style.maskImage = 'none';
    c2.querySelector('.art').style.webkitMaskImage = 'none';
    /* R3 — 6회차 이전(배너 몸통에도 격자) 으로 되돌린다 */
    c1.querySelector('.bg').style.backgroundImage =
      'conic-gradient(from 45deg,rgba(0,0,0,.088) 0 25%,#0000 0 50%,rgba(0,0,0,.088) 0 75%,#0000 0)';
    const g = e => getComputedStyle(e);
    const rcp = getComputedStyle(c1.querySelector('.ntc>s')).clipPath;
    const rys = [...rcp.matchAll(/(?:calc[(][^)]*[)]|100%|-?[\d.]+px)\s+(-?[\d.]+)px/g)].map(m => +m[1]);
    return {
      sH: rys.length ? +(Math.max(...rys) - Math.min(...rys)).toFixed(1) : null,
      ntcH: c1.querySelector('.ntc').getBoundingClientRect().height,
      artMask: g(c2.querySelector('.art')).maskImage,
      bgImg: g(c1.querySelector('.bg')).backgroundImage
    };
  });
  ok('R1 배너 링 세로를 70(= 피치/2)으로 되돌리면 [A3] 이 빨개진다',
    !near(after.sH, EXP.ban.sH, 1) && !near(after.ntcH, EXP.ban.sH + 2 * RIM, 1), after.sH + '/' + after.ntcH);
  ok('R2 «.art» 의 마스크를 떼면 [B3] 이 빨개진다', !isNtcMask(after.artMask), after.artMask);
  ok('R3 배너 몸통에 격자를 되살리면 [C1] 이 빨개진다', /conic-gradient/.test(after.bgImg));

  /* R4·R5 — 8회차의 두 수리를 되돌린다 */
  const after8 = await page.evaluate(() => {
    const c1 = document.querySelector('.pvc.ban1');
    const cb = c1.getBoundingClientRect();
    const rel = e => { const r = e.getBoundingClientRect();
      return { l: +(r.left - cb.left).toFixed(1), cx: +(r.left + r.width / 2 - cb.left).toFixed(1) }; };
    c1.querySelector('.ban>i').style.left = '150px';            /* 8회차 전 */
    c1.querySelectorAll('.rb').forEach((r, i) => r.style.setProperty('--gx', (i ? 24 : 17) + 'px'));
    const ban = c1.querySelector('.ban');
    return { banI: rel(ban.querySelector('i')),
      split: +(rel(ban).l + ban.getBoundingClientRect().width * 0.36).toFixed(1),
      rb: [...c1.querySelectorAll('.rb')].map(r => rel(r.querySelector('b')).cx) };
  });
  /* ⚑ 이관(2026-09-03, 작업 833 6회차 · 333 처방 — 지우지 않고 **방향을 바꿔** 갈아 끼웠다).
     6회차가 배너 라벨에 `scaleX(.9)` 를 걸어 잉크를 261 → 235 로 줄였다. 그래서 «left:150 으로
     되돌리면 잉크가 크림 칸을 문다» 는 **더 이상 참이 아니다** — 좁아진 잉크는 left:150 에서도
     좌단이 230.9 로 분할선(216.3) 오른쪽에 남는다(빨간 것은 자가 아니라 **문장**이었다).
     8회차 수리가 지금도 지키는 것은 **자리(중심)** 다: left:150 이면 상자 중심이 365.5 → 350 으로
     15px 밀려 [F2] 가 빨개진다. ⇒ 축을 [F1] 에서 [F2] 로 옮기고, 분할선 값은 «참고» 로 계속 찍는다
     (그 수가 다시 216 왼쪽으로 가면 옛 결함이 되살아난 것이다). */
  /* ⚑ 833 9회차 — [F2] 의 목표가 359.5 로 바뀌었으므로 이 되돌림이 겨누는 값도 같이 옮긴다
     (left:150 이면 중심이 354 = 목표에서 5.5px 밀린다 · 옛 판에서는 365.5 → 350 이었다). */
  ok('R4 배너 글자 상자를 left:150 으로 되돌리면 [F2] 가 빨개진다 (상자 중심이 359.5 → 354 로 밀린다)',
    !near(after8.banI.cx, 359.5, 1.5),
    '중심 ' + after8.banI.cx + ' · (참고) 좌단 ' + after8.banI.l + ' ↔ 분할선 ' + after8.split);
  ok('R5 «--gx» 를 17/24 로 되돌리면 [F3] 이 빨개진다 (판 중심이 ref 에서 9~10px 밀린다)',
    !near(after8.rb[0], 352.5, 2) && !near(after8.rb[1], 441.5, 2), after8.rb.join(' / '));
  const after8b = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.pvc>.rb2::after{width:26px}';   /* 8회차 전 */
    document.head.appendChild(st);
    const c = document.querySelector('.pvc.ban1');
    return { w: getComputedStyle(c.querySelector('.rb2'), '::after').width,
      bd: getComputedStyle(c.querySelector('.rb2')).borderRightWidth };
  });
  ok('R6 제비꼬리 폭을 26 으로 되돌리면 [F8] 이 빨개진다 (깊이 20 = ref 3 ref px 의 3.3배)',
    !near(parseFloat(after8b.w) - parseFloat(after8b.bd), 6, 1),
    (parseFloat(after8b.w) - parseFloat(after8b.bd)).toFixed(1));

  /* ── [G] 9회차 — 리본 좌단 · 수량 상자 ─────────────────────────────────
     ⚑ 두 자리 다 **비평 2인 일치**였고 둘 다 «상자» 의 결함이었다(글자·색은 0줄 변경).
     · G1~G2 = BB [5] «리본 좌단이 카드 밖으로» — ref 를 같은 자로 다시 재니 **돌출 0.00**
       (네 리본 · n=18~21행)이라 BB 가 맞고 **측정표 §7-1 «1.6» 이 틀렸다**(정오표).
     · G3~G5 = BB [4]·BC [8][16] «수량이 판 중심에서 오른쪽» — 원인은 side bearing 이 아니라
       **advance > 상자폭** 이었다(넘치면 text-align:center 가 왼끝에서 시작해 오른쪽으로만 넘친다).
       쏠림 = (advance − 상자폭)/2 이 실측과 소수점까지 맞았다 ⇒ **안 넘치게** 만드는 것이 처방이다. */
  const g9 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      const cb = c.getBoundingClientRect();
      ['rb1', 'rb2'].forEach((k) => {
        const rb = c.querySelector('.' + k); if (!rb) return;
        const r = rb.getBoundingClientRect();
        const b = rb.querySelector('b').getBoundingClientRect();
        const u = rb.querySelector('u');
        const ur = u.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(u);
        out.push({
          id: c.dataset.pv, k, txt: u.textContent,
          prot: +(cb.left - r.left).toFixed(2),
          rbR: +(r.right - cb.left).toFixed(1),
          bCx: +(b.left + b.width / 2 - cb.left).toFixed(1),
          uCx: +(ur.left + ur.width / 2 - cb.left).toFixed(1),
          /* ⚑ 이관(2026-09-03, 작업 833 7회차) — 상자 폭은 **offsetWidth**(레이아웃 값)로 잰다.
             수량에 shrink-to-fit 등방 배율(--uq)이 걸리면서 getBoundingClientRect 는 «변환 뒤»
             bbox 라 139 가 110.5 로 읽혔다 — 상자가 좁아진 것이 아니라 자가 다른 것을 본 것이다.
             advance 는 반대로 **변환 뒤** 값이어야 [G3]«넘치는가» 가 눈에 보이는 것을 잰다. */
          uW: u.offsetWidth, uWSeen: +ur.width.toFixed(1),
          adv: +rg.getBoundingClientRect().width.toFixed(2)
        });
      });
    });
    return out;
  });
  ok('[G1] 리본 좌단이 카드 바깥선과 한 줄이다 — 돌출 0 (ref 네 리본 실측 0.00 · BB [5])',
    g9.every(r => near(r.prot, 0, 0.6)), g9.map(r => r.prot).join(' / '));
  /* ⚑ 833 3회차 이관 — 이 항이 못박던 것은 «521» 이라는 값이 아니라 **9회차가 좌단만
     움직였다**(판·제비꼬리 Δ0)는 것이다. 833 3회차가 리본2 우단을 ref 실측 529.2 로
     옮기면서(521 → 530 · 자 `tools/scan833b.py`) 그 값이 바뀌었으므로, 333 처방대로
     **자리를 비우지 않고 방향만 갈아 끼운다**:
       · 리본2 는 833 3회차 자리(530).
     ⚑ **833 9회차 재이관** — 리본1(424)도 그 자리를 떠났다. 3회차가 «리본1 은 ref 도 갈리니
     안 건드린다» 로 넘긴 것을 9회차가 형별로 갈라 보니 **배너형만 ref 430.2 ↔ 424.0 = −6.2**
     였다(8회차 채점 DF·DG 2인 일치 −5.9 · 자 `scan833b.py`) ⇒ 배너 w1 424 → **430**.
     «판·꼬리 Δ0» 는 이 항이 아니라 [F3]·[F8] 이 직접 잰다(833 이 `--gx` 를 같은 Δ 만큼
     키워 판 중심을 붙박았고 — 3회차 g2 +9 · 9회차 g1 +6 — 그래서 [F3] 이 무수정으로 초록이다). */
  ok('[G2] 리본1 우단 430(833 9회차 · ref 430.2) · 리본2 530(833 3회차 · ref 529.2) — 좌단·판·꼬리 Δ0',
    g9.filter(r => r.id === 'noads').map(r => r.rbR).every((v, i) => near(v, [430, 530][i], 1.5)),
    g9.filter(r => r.id === 'noads').map(r => r.rbR).join(' / '));
  ok('[G3] 수량 글자가 제 상자를 안 넘는다 (advance ≤ 상자폭) — 넘치면 가운데 정렬이 죽는다',
    g9.every(r => r.adv <= r.uW), g9.map(r => `${r.txt} ${r.adv}≤${r.uW}`).join(' · '));
  ok('[G4] 수량 상자 중심 = 금색 판 중심 (넓히면서 중심을 지켰다)',
    g9.every(r => near(r.uCx, r.bCx, 0.6)), g9.map(r => (r.uCx - r.bCx).toFixed(1)).join(' / '));
  ok('[G5] 수량 상자 폭은 두 형 공통 한 값 139 — «999,999»(advance 137.48)까지 받는다',
    g9.every(r => near(r.uW, 139, 0.6)), g9.map(r => r.uW).join(' / '));

  /* [G6] — 배너형 금색 판의 «세로». 자는 **중심 대 중심**이다(테 두께가 상쇄된다).
     ref: 배너 +3.50 / +3.00 ref px 위 = +7.2 / +6.2 · 불릿 +1.50 / −0.50 = +3.1 / −1.0(갈린다).
     ⇒ 배너만 목표 +6.7(±1.5) 로 못박고, **불릿은 «안 건드렸다» 를 그대로 못박는다**(+5.5). */
  const pv = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      ['rb1', 'rb2'].forEach((k) => {
        const rb = c.querySelector('.' + k); if (!rb) return;
        const r = rb.getBoundingClientRect(), b = rb.querySelector('b').getBoundingClientRect();
        out.push({ ban: c.classList.contains('ban1'),
          d: +((r.top + r.height / 2) - (b.top + b.height / 2)).toFixed(2) });
      });
    });
    return out;
  });
  ok('[G6] 배너형 금색 판 중심이 리본 중심보다 6.7 위다 (ref +7.2/+6.2 — 중심 대 중심 자)',
    pv.filter(r => r.ban).every(r => near(r.d, 6.7, 1.5)),
    pv.filter(r => r.ban).map(r => r.d).join(' / '));
  ok('[G6b] 불릿형은 안 건드렸다 — +5.5 그대로 (ref 가 +3.1/−1.0 로 갈려 목표가 안 선다)',
    pv.filter(r => !r.ban).every(r => near(r.d, 5.5, 0.6)),
    pv.filter(r => !r.ban).map(r => r.d).join(' / '));

  /* ── 10회차 — «검정 외곽 두께» 축 (자: tools/scan667c.py — 밝은 host 위 검정 질량)
     ref(환산): 리본 검정 테 불릿 8.45~8.65 · 배너 7.11~7.21 / 속 60.0·59.7 · 53.9·53.8
                크림 캡은 **카드 바깥선에서 곧바로** 시작하고 빨강은 카드선 +23.7 에서 시작한다.
     ⚠ 9회차 가설과 부호가 반대다(우리가 **얇았다**) — 그래서 [G7] 은 «속이 ref 보다 크지 않은가» 가
     아니라 **보이는 검정 두께 그 자체**를 묻는다. 손잡이가 border 가 아니라 inset 그림자이므로
     둘을 더한 값을 잰다(그림자를 지우면 R9 가 빨개진다). */
  const g10 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      const cb = c.getBoundingClientRect();
      ['rb1', 'rb2'].forEach((k) => {
        const rb = c.querySelector('.' + k); if (!rb) return;
        const s = getComputedStyle(rb), r = rb.getBoundingClientRect();
        const bd = parseFloat(s.borderTopWidth);
        /* Chromium 은 «rgb(0, 0, 0) 0px 0px 0px 2px inset» 로 돌려준다 — 네 번째 길이가 spread 다 */
        const m = /inset/.test(s.boxShadow)
          ? s.boxShadow.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/) : null;
        const ins = m ? parseFloat(m[4]) : 0;
        const cap = getComputedStyle(rb, '::before');
        out.push({ ban: c.classList.contains('ban1'), h: +r.height.toFixed(1),
          ink: +(bd + ins).toFixed(2), inner: +(r.height - 2 * (bd + ins)).toFixed(2),
          /* 캡은 절대배치라 «패딩 상자 + left» 가 그 화면 x 다 (테 두께가 한 번 들어간다) */
          /* 885 8회차 — 캡 왼끝은 이제 **검정 립**(border-left)이고 크림은 그 오른쪽부터다.
             둘을 따로 낸다: capL = 립 좌단 · creamL = 크림 좌단 · redL = 상자 우단(= 위 줄의 빨강). */
          lipW: parseFloat(cap.borderLeftWidth) || 0,
          /* 896 1회차 — 두께만 읽으면 «칠하지 않은 립» 이 통과한다(아래 [G8a]) */
          lipC: cap.borderLeftColor,
          capL: +(r.left + bd + parseFloat(cap.left) - cb.left).toFixed(2),
          creamL: +(r.left + bd + parseFloat(cap.left) + (parseFloat(cap.borderLeftWidth) || 0) - cb.left).toFixed(2),
          redL: +(r.left + bd + parseFloat(cap.left) + (parseFloat(cap.borderLeftWidth) || 0)
                  + parseFloat(cap.width) - cb.left).toFixed(2) });
      });
    });
    return out;
  });
  ok('[G7] 리본 검정 테(보이는 두께 = 테 + inset)가 불릿 8 · 배너 7 — ref 8.45~8.65 / 7.11~7.21',
    g10.every((r) => near(r.ink, r.ban ? 7 : 8, 0.6)), g10.map((r) => r.ink).join(' / '));
  ok('[G7b] 그래서 리본 «속»(빨강)이 불릿 60 · 배너 53 — ref 59.7~60.2 / 53.8~53.9',
    g10.every((r) => near(r.inner, r.ban ? 53 : 60, 1)), g10.map((r) => r.inner).join(' / '));
  /* ⚑⚑ 885 4회차 이관 — **ref 를 어디서 읽느냐로 두 값이 갈렸고, 이 항이 그 한가운데였다.**
     667 10회차는 ref 를 «행으로 읽어» 크림이 카드 바깥선(x12)에서 시작하고 빨강이 x24 라고 적었다
     (정수 읽기 · 문턱 스윕 없음). 885 4회차의 채점 2인이 **각자 다른 자로 같은 자리를 다시 쟀고
     둘 다 «우리 왼끝이 오른쪽에 있다» 로 모였다**:
       · ET  색 무관 **부분화소** 끝단(tol 6/8/12 에서 변화 < 0.05px · 네 리본 전부 10.03±0.02) —
             ref 카드 좌변 11.51 ⇒ 크림이 카드선보다 **3.05 우리px 바깥**
       · EU  빨강 마스크 **4단 사다리** — ref 빨강 시작이 카드선 **+18.6~20.6 우리px**
     ⇒ 두 읽기가 2 ref-px 어긋나는데, **스윕을 한 쪽이 이쪽**이다(A3-ⓑ). 그래서 값을 이쪽으로 옮기되
       **두 읽기를 다 담는 창**으로 적는다 — 이 항이 지키는 것은 «몇 px 이냐» 가 아니라
       **«캡이 리본 왼쪽 테를 덮어 검정이 0 이고, 빨강이 너무 오른쪽에서 시작하지 않는다»** 이고,
       그 뜻은 두 읽기 어느 쪽에서도 같다(9회차까지의 +33 은 두 창 어디에도 안 들어온다).
     ⚠ 2 ref-px 의 갈림 자체는 **896 으로 등재**했다 — 세 번째 부분화소 자로 닫을 자리다.
     ⚑⚑ **885 8회차 — 896 이 닫혔고, 이 항의 전제(«리본 왼끝에 검정 0»)가 뒤집혔다.**
     7회차 채점 2인(EZ·FA)이 «리본 있는 행 ↔ 없는 행» 을 나란히 읽어 **리본에만 있는 검정 2열**을
     찾았고(카드 프레임은 그보다 오른쪽 x11.4~16.3), 셋째 자 `tools/scan885f.py` 가 네 리본 전부에서
     재현했다 — **리본 왼끝은 «검정 립» 이고 크림은 카드선 안쪽 +0.18 에서 시작한다.**
     그리고 ET(−3.05)와 EU(+18.6~20.6)가 갈린 이유도 같은 자가 냈다:
       ⓐ ET 의 −3.05 는 **크림이 아니라 립**의 좌단이었다(scan885f: 립 좌단 −2.8~−3.7).
       ⓑ EU 의 +18.6~20.6 은 **캡 «아래» 줄**의 빨강이다(캡이 기울어 있다 — 위 28.85 · 중 25.2 · 아래 20.9).
     ⇒ 두 항을 «두 읽기를 다 담는 창» 에서 **각자의 축으로** 갈랐다(333 처방 — 자리를 안 비웠다). */
  ok('[G8] 리본 왼끝 **검정 립**이 카드선 밖 −2.5~−4 에서 시작한다 (ref scan885f: −2.8~−3.7 · ET 가 잰 −3.05 가 이것이다)',
    g10.every((r) => r.lipW >= 2 && r.capL <= -2.5 && r.capL >= -4.5),
    g10.map((r) => `${r.capL}(립${r.lipW})`).join(' / '));
  /* ⚑⚑ 896 1회차 — **[G8] 은 립의 «두께와 자리» 만 읽는다.** 896 은 8회차에 «리본 왼끝은 검정 립»
     으로 닫혔는데, 그 답 중 «검정» 을 지키는 항이 저장소에 **하나도 없었다**: 립을 크림(#FFFCF3)으로
     칠하거나 아예 투명으로 만들어도 [G8]·[G8c]·[G8b]·`verify833` [17-f] 가 **넷 다 초록**이다
     (1회차에 세 판을 나란히 돌려 실측 — review 896 §3). 색은 이 자가 맡는다(833 은 두께만 —
     좌단·립의 임자가 여기라 사본을 만들지 않는다. 402 «사본을 지운다»).
     ⚠ **선언을 읽는다** — 이 자는 «되돌아가면 빨개져야 하는 값» 만 담는 DOM 자이고, 같은 자리의
     «찍힌 잉크» 축은 셋째 부분화소 자 `tools/scan885f.py` 가 임자다(896 1회차가 그 자로 ref·우리를
     다시 재서 8회차 표를 재현했다 — 립 잉크 ref 3.2~4.4 ↔ 우리 2.86 우리px). */
  ok('[G8a] 그 립은 **불투명한 검정**이다 — 색을 빼면 «검정 립» 이라는 896 의 답이 그림에서만 사라진다',
    g10.every((r) => isBlack(r.lipC)), g10.map((r) => r.lipC).join(' / '));
  ok('[G8c] 그 립 오른쪽에서 **크림이 카드선 안쪽 −0.5~+1** 에서 시작한다 (ref scan885f +0.18 · 채점 EZ +0.23 · FA +0.31)',
    g10.every((r) => r.creamL >= -0.5 && r.creamL <= 1.0), g10.map((r) => r.creamL).join(' / '));
  ok('[G8b] 그래서 빨강이 **위 줄에서** 카드선 +28~32 에서 시작한다 (ref scan885f 위 28.85 / 중 25.2 / 아래 20.9 — EU 의 +18.6~20.6 은 아래 줄이다)',
    g10.every((r) => r.redL >= 28 && r.redL <= 32), g10.map((r) => r.redL).join(' / '));

  /* R9·R10 — 10회차의 두 수리를 되돌린다 */
  const after10 = await page.evaluate(() => {
    const st = document.createElement('style');
    /* 10회차 전: inset 그림자 없음 · 캡이 테 안쪽에서 27px */
    st.textContent = '.pvc>.rb{box-shadow:none}.pvc.ban1>.rb{box-shadow:none}'
      + '.pvc>.rb::before{left:0;top:0;bottom:auto;width:27px;height:64px}'
      + '.pvc.ban1>.rb::before{height:56px}';
    document.head.appendChild(st);
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      const cb = c.getBoundingClientRect();
      ['rb1', 'rb2'].forEach((k) => {
        const rb = c.querySelector('.' + k); if (!rb) return;
        const s = getComputedStyle(rb), r = rb.getBoundingClientRect();
        const cap = getComputedStyle(rb, '::before');
        const bd = parseFloat(s.borderTopWidth);
        out.push({ ban: c.classList.contains('ban1'),
          inner: +(r.height - 2 * bd).toFixed(2),
          redL: +(r.left + bd + parseFloat(cap.left) + parseFloat(cap.width) - cb.left).toFixed(2) });
      });
    });
    return out;
  });
  ok('R9 inset 그림자를 지우면 [G7b] 이 빨개진다 (속이 64/55 = ref 보다 +6.7% 로 돌아간다)',
    after10.every((r) => near(r.inner, r.ban ? 55 : 64, 0.6)), after10.map((r) => r.inner).join(' / '));
  ok('R10 캡을 «left:0 · 27px» 로 되돌리면 [G8b] 이 빨개진다 (빨강 시작이 +33 으로 돌아간다)',
    after10.every((r) => near(r.redL, 33, 0.6)), after10.map((r) => r.redL).join(' / '));

  /* R7·R8 — 9회차의 두 수리를 되돌린다 */
  const after9 = await page.evaluate(() => {
    const st = document.createElement('style');
    /* 9회차 전: 리본이 카드 밖으로 3px · 수량 상자 = 판 폭 */
    st.textContent = '.pvc>.rb{left:-3px}.pvc>.rb>u{right:var(--gx);width:91px}'
      + '.pvc.ban1>.rb>u{right:var(--gx);width:79px}';
    document.head.appendChild(st);
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      const cb = c.getBoundingClientRect();
      ['rb1', 'rb2'].forEach((k) => {
        const rb = c.querySelector('.' + k); if (!rb) return;
        const u = rb.querySelector('u');
        const rg = document.createRange(); rg.selectNodeContents(u);
        out.push({ prot: +(cb.left - rb.getBoundingClientRect().left).toFixed(2),
          /* [G5] 와 같은 이관(833 7회차) — 상자는 레이아웃 값으로 잰다(변환은 상자를 안 줄인다) */
          uW: u.offsetWidth,
          adv: +rg.getBoundingClientRect().width.toFixed(2) });
      });
    });
    return out;
  });
  ok('R7 «.rb{left:-3px}» 로 되돌리면 [G1] 이 빨개진다 (리본이 카드 바깥선을 3px 넘는다)',
    after9.every(r => !near(r.prot, 0, 0.6)), after9.map(r => r.prot).join(' / '));
  ok('R8 수량 상자를 판 폭(91/79)으로 되돌리면 [G3] 이 빨개진다 (넘침이 되살아난다)',
    after9.some(r => r.adv > r.uW),
    after9.map(r => `${r.adv}>${r.uW}?`).join(' · '));

  /* R11 — 896 1회차. [G8a] 가 정말로 무는지 **립을 지워** 확인한다(279: 죽은 되돌림 시험은
     죽은 게이트보다 나쁘다). 두 판을 다 본다 — 크림으로 칠한 판(색만 바뀜)과 투명 판(안 그려짐).
     ⚠ 여기까지 오면 앞 되돌림들이 얹은 style 이 살아 있지만 그것들은 색을 안 건드린다. */
  const lipRe = await page.evaluate(() => {
    const rd = () => [...document.querySelectorAll('.pvc>.rb')]
      .map((rb) => getComputedStyle(rb, '::before').borderLeftColor);
    const put = (css) => { const st = document.createElement('style');
      st.textContent = '.pvc>.rb::before{' + css + '}'; document.head.appendChild(st); };
    put('border-left-color:#FFFCF3'); const cream = rd();
    put('border-left-color:transparent'); const clear = rd();
    return { cream, clear };
  });
  ok('R11 립을 «크림»으로 칠하면 [G8a] 가 빨개진다 (두께·자리는 그대로라 [G8][G8c][G8b] 는 초록이다 — 그래서 이 항이 필요했다)',
    lipRe.cream.length >= 4 && lipRe.cream.every(c => !isBlack(c)), lipRe.cream.join(' / '));
  ok('R11b 립을 «투명»으로 만들어도 [G8a] 가 빨개진다 (색만 검정이고 안 그려지는 립을 안 놓친다)',
    lipRe.clear.length >= 4 && lipRe.clear.every(c => !isBlack(c)), lipRe.clear.join(' / '));

  ok('[전제] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' / '));
  console.log('\nVERIFY667 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
