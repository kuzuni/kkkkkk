#!/usr/bin/env node
/* 작업 725 게이트 — 「효과 표기는 «%» 가 아니라 «×N배» 다, 프로젝트 전부」
 *
 *   node tools/verify725.js
 *
 * 주인 원문(2026-09-02 04:10): «% 말고 x102배 이런식으로 표기 되게 해줘야할거같음.
 * 보유효과나 장착효과나 이프로젝트 전부다».
 *
 * 지킬 것(PROGRESS 725 등재문의 게이트 문면 그대로):
 *   [S] 선언 — 표기 규칙이 **한 벌**이다: `fmtMul`/`fmtEff`/`fmtMulStep` 이 있고,
 *       사본이던 `wpct`·`wpct2`·`pctB` 는 선언째 없다(402 «사본을 지운다»).
 *   [A] 포매터 규약 — 유효숫자·쉼표·접기·해상도. ⚑ **해상도 항이 이 자의 핵심**이다:
 *       등재문의 «소수 2자리 고정» 을 쓰면 +4.0% 와 +4.4% 가 둘 다 «×1.04배» 로 뭉개져
 *       «강화해도 숫자가 안 바뀐다» 가 된다. 여기서 그 붕괴를 음성 대조로 못박는다.
 *   [B] 자리 전수 — 효과를 말하는 자리 **11곳**이 «×N배» 를 들고 «%» 를 안 든다.
 *   [C] 표기 = 실배율 파생 — 그 자리들의 글자가 **제품의 모델값**에서 나온 `fmtEff` 와 글자까지 같다.
 *   [D] 경계 — **확률**(치명타 확률·룬 성공 확률)과 **진행도**(게이지 width)는 «%» 를 그대로 쓴다.
 *       ⚠ 이 항이 없으면 «% 를 다 없앴다» 가 초록이 되면서 확률까지 배율로 둔갑해도 안 잡힌다.
 *   [E] 잘림 0(655 규약) — 자릿수가 커졌다. 최악 표본(전 종 만렙)에서 그 자리의 잉크가
 *       그릇을 안 넘는다(scrollWidth ≤ clientWidth + 1).
 *   [R] 되돌림 — `fmtEff` 를 옛 «+n%» 로 되돌린 사본에서 [B]·[C] 가 **실제로** 빨개진다.
 *
 * ⚑ 왜 [C] 가 [B] 와 따로인가 — [B] 는 «×배 라고 적혀 있다» 만 묻는다. 값이 굳어 있어도(상수를
 *   박아 놔도) 초록이다(LESSONS 307-④). [C] 가 모델과 글자를 맞춰야 «파생» 이 잠긴다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 넉넉한 표본을 만들고 «효과를 말하는 자리» 를 한 번에 걷는다.
   ⚠ 값은 손으로 적지 않는다 — 같은 evaluate 안에서 제품의 모델 함수로 기대값을 같이 만든다([C]). */
const HARVEST = (maxed) => {
  const L = maxed ? 100 : 20, N = maxed ? 1e6 : 50;
  S.dia = 1e12; S.gold = 1e12; S.stone = 1e9; S.rstone = 1e9; S.rank = 3;
  const eqs = wpnList();
  (maxed ? eqs : eqs.slice(0, 6)).forEach(it => { S.own[it.id] = { n: N, l: L }; });
  (maxed ? SKILLS : SKILLS.slice(0, 6)).forEach(it => { S.own[it.id] = { n: N, l: L }; });
  (maxed ? PETS : PETS.slice(0, 4)).forEach(it => { S.own[it.id] = { n: N, l: L }; });
  (maxed ? RELICS : RELICS.slice(0, 3)).forEach(it => { S.own[it.id] = { n: N, l: maxed ? 500 : 5 }; });
  (maxed ? AVATARS : AVATARS.slice(0, 4)).forEach(a => { S.avatars[a.id] = 1; });
  if (maxed) Object.keys(S.cosLv || {}).forEach(k => { S.cosLv[k] = COS_MAXLV; });
  S.rune = { r1: maxed ? RUNE_MAXLV : 50, r2: 0, r3: 0 };
  S.temper = Object.assign({}, S.temper, { atk: maxed ? 500 : 20 });
  S.bless = { lv: maxed ? 51 : 3, prog: 1, exp: { atk: 0, hp: 0, rate: 0 } };
  markDirty();

  const T = s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
  /* ⚠ 숨은 노드는 sw·cw 가 둘 다 0 이라 «안 넘친다» 가 공짜로 초록이 된다 —
     «정말 보고 잰 것인지» 를 같이 돌려줘서 자가 헛돌면 [E0] 이 잡게 한다. */
  const box = s => { const e = document.querySelector(s); if(!e) return null;
    return { sw: e.scrollWidth, cw: e.clientWidth, vis: !!e.offsetParent && e.clientWidth > 0 }; };

  /* ⚠ [E] 는 **보이는 상태**에서만 뜻이 있다 — 숨은 노드는 scrollWidth·clientWidth 가 둘 다 0 이라
     «안 넘친다» 가 공짜로 초록이 된다. 그래서 시트·팝업을 실제로 연 뒤에 잰다. */
  /* ⚠ A1 — 이미 열린 탭을 다시 누르면 패널이 **닫힌다**(verify726 머리말의 그 함정).
     이 자는 HARVEST 를 두 번 부르므로 조건 없이 goTab 을 부르면 두 번째 판이 통째로 숨는다. */
  if (!(curTab === 'hero' && panelOpen)) goTab('hero');
  heroSubGo('sk'); renderSkill();
  const bxSk = box('#bSk .sk-tot em');        /* ⚠ 시트는 한 번에 하나만 보인다 — 열려 있는 그 순간에 잰다 */
  heroSubGo('pet');  renderPet();
  const bxPt = box('#bPet .sk-tot em');
  heroSubGo('cos');  renderCos();
  const bxCs = box('#bCos .sk-tot em');
  heroSubGo('sk'); renderSkill();
  openWeapon(null, 'weapon'); renderWpn();
  openBless(); renderBless();
  renderSpec();
  renderTrain(); setTrSub('rune');
  const rn = T('.tr-rn>.rd');
  setTrSub('temper');
  const tp = T('.tr-tp .td');
  setTrSub('train');

  /* 08 세부 팝업 — 스킬 한 칸 */
  closeModal(); showSkillDetail(SKILLS[0].id);
  const sk = T('#mbox .sk-ow'), skDb = T('#mbox .sk-db');
  const skOwBox = box('#mbox .sk-ow .v') || box('#mbox .sk-ow');
  closeModal();

  /* ⚠ `openWeapon(null, …)` 은 482 규약대로 «제일 좋은 것» 을 고른다 — 기대값은 **그려진 그 칸**에서
     만들어야 한다(eqs[0] 로 적으면 자가 다른 칸을 재고 빨개진다). */
  const cur = wpnCur();
  const spec = [...document.querySelectorAll('#spcList .spc-row')].map(e => e.textContent.trim());

  return {
    /* [B]·[C] 자리 — txt 는 화면 글자, want 는 **모델에서 만든** 기대 문자열 */
    rows: [
      { k: '05 장비 보유 효과',   txt: T('#wpnOwnV'), want: fmtEff(ownVal(cur)) },
      { k: '05 장비 장착 효과',   txt: T('#wpnEqV'),  want: fmtEff(equipVal(cur)) },
      { k: '05 장비 총 보유 효과', txt: T('#wpnTotal'), want: fmtEff(wpnTotalOwn()) },
      { k: '07 스킬 총 보유 효과', txt: T('#bSk .sk-tot em'),
        want: fmtEff(SKILLS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0)) },
      { k: '26 펫 총 보유 효과',  txt: T('#bPet .sk-tot em'),
        want: fmtEff(PETS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0)) },
      { k: '50 코스튬 총효과',    txt: T('#bCos .sk-tot em'),
        want: fmtEff(cosOwnSum('atk') + cosLvVal('atk')) },
      { k: '34 축복 카드',        txt: T('#blsCards .vl'), want: fmtEff(blessEff('atk')) },
      { k: '34 축복 골드 보너스',  txt: T('#blsBnV'),      want: fmtEff(blessGoldEff()) },
      { k: '23 룬 카드',          txt: rn, want: fmtEff(runeVal('r1', 'atk')) },
      { k: '23 단련 카드',        txt: tp, want: fmtEff(temperVal('atk')) },
      { k: '08 스킬 세부 보유 효과', txt: sk, want: fmtEff(ownValAt(SKILLS[0], oLv(SKILLS[0].id))) }
    ],
    /* [D] 경계 — 확률·진행도는 % 그대로 */
    critRow: spec.find(s => s.indexOf(U.crit.name) === 0) || '',
    runeRate: (() => { renderTrain(); setTrSub('rune');
      const e = document.querySelector('.tr-rn .rrt, .tr-rn>.rrate, .tr-rn .rate');
      const t = document.querySelector('.tr-rn').textContent; setTrSub('train');
      return e ? e.textContent.trim() : t; })(),
    barW: (() => { renderBless(); const e = document.getElementById('blsFill'); return e ? e.style.width : ''; })(),
    /* [E] 잘림 — 그릇을 넘는가 */
    boxes: [
      { k: '#wpnOwnV', b: box('#wpnOwnV') }, { k: '#wpnEqV', b: box('#wpnEqV') },
      { k: '#wpnTotal', b: box('#wpnTotal') }, { k: '#blsBnV', b: box('#blsBnV') },
      { k: '#bSk .sk-tot em', b: bxSk },
      { k: '#bPet .sk-tot em', b: bxPt },
      { k: '#bCos .sk-tot em', b: bxCs },
      { k: '08 .sk-ow', b: skOwBox }
    ],
    spec, skDb
  };
};

/* 되돌림 사본 — `fmtEff` 를 옛 «+n%» 로 되돌린다(호출부는 한 곳도 안 건드린다).
   ⚑ 이 한 줄이면 [B]·[C] 가 통째로 빨개져야 한다 — 안 빨개지면 자가 헛것이다. */
function revert(src) {
  const a = "const fmtEff  = v  => fmtMul(1 + v);";
  const b = "const fmtEff  = v  => (v*100).toFixed(v < 0.1 ? 1 : 0) + '%';";
  return { src: src.indexOf(a) >= 0 ? src.split(a).join(b) : src, hit: src.indexOf(a) >= 0 };
}

(async () => {
  console.log('\n=== verify725 — 효과 표기 «%» → «×N배» ===');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderWpn === 'function');
  await page.waitForTimeout(600);

  /* ── [S] 선언 — 표기 규칙 한 벌 ─────────────────────────────── */
  blk('S 선언 — 규칙은 한 곳에만 있다');
  const src = fs.readFileSync(SRC, 'utf8');
  const S1 = await ev(page, () => ({
    mul: typeof fmtMul === 'function', eff: typeof fmtEff === 'function',
    step: typeof fmtMulStep === 'function',
    wpct: typeof wpct !== 'undefined', wpct2: typeof wpct2 !== 'undefined',
    pctB: typeof pctB !== 'undefined', pct: typeof pct === 'function'
  }));
  ok(!!S1 && S1.mul && S1.eff && S1.step, 'S1 `fmtMul`·`fmtEff`·`fmtMulStep` 셋이 있다', JSON.stringify(S1));
  ok(!!S1 && !S1.wpct && !S1.wpct2 && !S1.pctB,
    'S2 사본 `wpct`·`wpct2`·`pctB` 는 선언째 없다(402 — 표가 두 벌이면 조용히 갈라진다)',
    S1 ? 'wpct:' + S1.wpct + ' wpct2:' + S1.wpct2 + ' pctB:' + S1.pctB : '');
  ok(!!S1 && S1.pct, 'S3 `pct` 는 **남는다** — 확률이 아직 % 를 쓴다(경계 ④)');
  ok(/const RANK_BONUS = 0\.25;/.test(src),
    'S4 계급 보너스가 상수 한 곳에서 온다(손 상수 «+25%» 사본 0개)');
  /* ⚠ 주석에도 «+25%» 라는 낱말이 여럿 있다(옛 회차 기록) — 무는 것은 **표시 문자열**이다.
     옛 두 자리의 리터럴 모양을 그대로 묻는다: `<b>+25%</b>` 와 «능력치 10% 증가'». */
  ok(!/<b>\+25%<\/b>/.test(src) && !/능력치 10% 증가'/.test(src) && !/rank\*0\.25|rank \* 0\.25/.test(src),
    'S5 표시 문자열의 손 상수(«<b>+25%</b>» · «능력치 10% 증가» · `S.rank*0.25`)가 0건');

  /* ── [A] 포매터 규약 ──────────────────────────────────────── */
  blk('A 포매터 규약 — 유효숫자 · 쉼표 · 접기 · 해상도');
  const A = await ev(page, () => ({
    a: fmtMul(1.08), b: fmtMul(12.4), c: fmtMul(102), d: fmtMul(1024),
    e: fmtEff(0.081), one: fmtEff(0), neg: fmtMul(0.75),
    fold: fmtMul(2e6), step: fmtMulStep(0.02),
    r1: fmtEff(0.040), r2: fmtEff(0.044)
  }));
  ok(A && A.a === '×1.08배' && A.b === '×12.4배' && A.c === '×102배' && A.d === '×1,024배',
    'A1 등재문 예시 넷이 그대로 나온다(×1.08 · ×12.4 · ×102 · ×1,024)', A && [A.a, A.b, A.c, A.d].join(' '));
  ok(A && A.one === '×1배' && A.neg === '×0.75배',
    'A2 효과 0 = «×1배» · 감소 배율도 같은 말투(«×0.75배»)', A && A.one + ' / ' + A.neg);
  ok(A && /^×[\d.]+[A-Z]배$/.test(A.fold),
    'A3 백만 배를 넘으면 472 선례대로 접는다(그릇을 넘는 자릿수만)', A && A.fold);
  ok(A && A.step === '+0.02배', 'A4 «다음 1레벨» 은 증분이라 «+n배»(×를 붙이면 거짓말)', A && A.step);
  /* ⚑ 해상도 — 이 항이 없으면 «소수 2자리 고정» 으로 되돌아가도 초록이다 */
  ok(A && A.r1 !== A.r2,
    'A5 ★ 해상도 — +4.0% 와 +4.4% 가 **다른 글자**다(옛 pct 의 0.1%p 를 안 잃는다)',
    A && A.r1 + ' vs ' + A.r2);

  /* ── [B][C][D] 자리 전수 + 파생 + 경계 ─────────────────────── */
  blk('B/C/D 자리 전수 — «×N배» · 모델 파생 · 확률/진행도는 % 유지');
  const H = await ev(page, HARVEST, false);
  ok(!!H, 'B0 표본을 걷었다');
  if (H) {
    for (const r of H.rows) {
      ok(!!r.txt && /×[\d.,A-Z]+배/.test(r.txt), 'B «' + r.k + '» 가 ×N배 를 든다', r.txt);
      ok(!!r.txt && !/%/.test(r.txt), 'B «' + r.k + '» 에 % 가 0건', r.txt);
      ok(!!r.txt && r.txt.indexOf(r.want) >= 0,
        'C «' + r.k + '» 표기 = 모델 파생(fmtEff)', r.txt + ' ⊃ ' + r.want);
    }
    /* [D] 경계 */
    ok(/%/.test(H.critRow), 'D1 치명타 «확률» 은 % 를 그대로 쓴다(경계 ④)', H.critRow);
    ok(/%/.test(H.runeRate), 'D2 룬 강화 «성공 확률» 도 % 그대로', String(H.runeRate).slice(0, 80));
    ok(/%$/.test(H.barW), 'D3 진행도(게이지 width)는 % 그대로', H.barW);
    /* 20 종합스탯 — «증가» 세 행이 배율, 확률 행은 % */
    const inc = H.spec.filter(s => /증가|이동 속도/.test(s));
    ok(inc.length >= 3 && inc.every(s => /×[\d.,A-Z]+배/.test(s)),
      'D4 20 종합스탯 «증가» 행이 전부 ×N배', inc.join(' / '));
  }

  /* ── [E] 잘림 0 — 최악 표본 ───────────────────────────────── */
  blk('E 잘림 0(655 규약) — 전 종 만렙 최악 표본');
  const W = await ev(page, HARVEST, true);
  if (W) {
    const seen = W.boxes.filter(b => b.b && b.b.vis);
    ok(seen.length >= 4, 'E0 ★ 정말 «보이는» 자리를 쟀다 — ' + seen.length + '/' + W.boxes.length
      + ' (숨은 노드는 sw=cw=0 이라 공짜 초록이 된다)',
      W.boxes.filter(b => !(b.b && b.b.vis)).map(b => b.k).join(','));
    for (const b of seen) {
      ok(b.b.sw <= b.b.cw + 1, 'E «' + b.k + '» 잉크가 그릇을 안 넘는다', b.b.sw + ' / ' + b.b.cw);
    }
    ok(W.rows.every(r => r.txt && /×[\d.,A-Z]+배/.test(r.txt)),
      'E9 최악 표본에서도 열한 자리가 전부 ×N배', W.rows.filter(r => !r.txt || !/배/.test(r.txt)).map(r => r.k).join(',') || '전부 초록');
    /* ⚠ «최악» 이 정말 최악인지 — 표본이 작으면 [E] 는 아무것도 안 재는 자가 된다.
       한 자리라도 자릿수가 자란 값(정수부 4자리 이상 또는 접힘 표기)이 나와야 한다. */
    const big = W.rows.map(r => (String(r.txt).match(/×([\d.,]+[A-Z]?)배/) || [])[1] || '')
                      .filter(v => /[A-Z]/.test(v) || v.replace(/[.,].*$/, '').length >= 4);
    ok(big.length >= 1, 'E10 ★ 최악 표본이 정말 자릿수를 키웠다(4자리 이상 또는 접힘)',
      big.slice(0, 3).join(' / ') || W.rows.map(r => r.txt).slice(0, 3).join(' | '));
  }

  ok(errs.length === 0, 'Z 콘솔·페이지 에러 0건', errs.slice(0, 2).join(' | '));

  /* ── [R] 되돌림 ───────────────────────────────────────────── */
  blk('R 되돌림 — fmtEff 를 옛 «+n%» 로 되돌린 사본은 빨개진다');
  const rv = revert(src);
  ok(rv.hit, 'R0 되돌릴 한 줄(`fmtEff` 선언)을 찾았다');
  const tmp = path.join(path.dirname(SRC), '.verify725-old.html');
  fs.writeFileSync(tmp, rv.src);
  try {
    const p2 = await ctx.newPage();
    await p2.goto('file://' + tmp.replace(/\\/g, '/'));
    await p2.waitForFunction(() => typeof S !== 'undefined' && typeof renderWpn === 'function');
    await p2.waitForTimeout(400);
    const O = await ev(p2, HARVEST, false);
    const bad = O ? O.rows.filter(r => !r.txt || /%/.test(r.txt)) : [];
    ok(bad.length >= 8, 'R1 되돌린 사본에서는 [B] 가 여러 자리에서 빨개진다 — ' + bad.length + '자리',
      bad.slice(0, 3).map(r => r.k + ':' + r.txt).join(' | '));
    /* ⚠ 사본 안에서 만든 `want` 는 되돌린 포매터로 같이 만들어지므로 **자기 자신과는 늘 맞는다**.
       [C] 가 정말 빨개지는지 보려면 **성한 페이지의 기대 문자열**과 맞춰야 한다(자가 헛돌지 않게). */
    const goodWant = H ? H.rows.map(r => r.want) : [];
    const mism = O ? O.rows.filter((r, i) => !r.txt || r.txt.indexOf(goodWant[i]) < 0) : [];
    ok(mism.length >= 8, 'R2 되돌린 사본에서는 [C] 도 같이 빨개진다 — ' + mism.length + '자리',
      mism.slice(0, 2).map((r, i) => r.k + ':' + r.txt).join(' | '));
    await p2.close();
  } finally { try { fs.unlinkSync(tmp); } catch (e) {} }

  console.log('\nVERIFY725 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
