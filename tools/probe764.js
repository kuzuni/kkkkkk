#!/usr/bin/env node
/* 작업 764 재현 — `verify429` [F2] 가 «닫힘 연출이 아직 채우고 있는 프레임» 을 잰다.
 *
 * 등재문(PROGRESS 764)의 가설: `showItem()` **직후** `readParts()` 가 애니메이션 프레임을
 * 잡아 `.sk-db` 가 750×290 대신 ×0.9401 **등방**으로 읽힌다 — 값 `705.07×272.63`.
 *
 * 이 자는 «게이트가 빨개지나» 가 아니라 **그 배율을 무엇이 만드는가** 를 직접 본다
 * (291·353 이 세운 방식 — 병 자체를 보고, 게이트의 빨강은 그 증상으로만 센다).
 *
 * 찾은 것 — 가설은 맞고 **자리가 하나 옮겨졌다**: 배율은 «지금 여는» 연출(`jzBoxIn` 0% = scale .92)
 * 이 아니라 **직전 닫기가 아직 채우고 있는** `jzBoxOut`(`to{scale:.94}` · `both`) 이다.
 *   `.94` × 750 = **705.0** · `.94` × 290 = **272.6** — 등재문의 값과 소수점까지 같다.
 * 그래서 «등방» 이었고, F1(유물↔펫 **상대** 비교)은 둘 다 같이 눌려 초록이었다.
 *
 * 왜 실행마다 갈리나 — `jzClose()` 가 `.jz-c` 를 **애니메이션이 끝날 때** 떼는데(41189),
 * 게이트의 [D] 블록은 **동기** `page.evaluate` 라 그 안에서는 프레임이 한 장도 안 흐른다.
 * 그러니 [D] 가 시작된 **시각**만이 값을 정한다:
 *   · 직전 닫기로부터 0~40ms  → `jzBoxOut` 0% (scale 1) → 750  (초록)
 *   · 직전 닫기로부터 50~170ms → 채우는 중 (scale 1 → .94) → 747…705  (빨강)
 *   · 180ms 이상               → 연출이 끝나 클래스가 걷혔다 → 750  (초록)
 * 부하가 [C] 꼬리와 [D] 사이의 왕복을 그 창 안으로 밀어 넣을 때만 빨개진다 = «플레이키».
 *
 *   [1] 위상 스윕 — `showItem()` 뒤 ms 별 `.sk-db` 실측(배율원을 이름으로 찍는다)
 *   [2] 게이트 모양 — «닫고 g ms 뒤 [D] 와 같은 동기 블록» 을 g 를 훑으며 (병)
 *   [2'] 위상 «고정» — 시계가 아니라 애니 `currentTime` 으로 골을 밟는다 (962)
 *   [3] 처방 — 같은 g 에서 **정착(`jzBox…` 끝나기를 기다림) 뒤** 재면 전 구간 750 (약)
 *   [R] 되돌림 — `__settleBoxOff` 를 켜면 [3] 의 창이 도로 열린다
 *
 * ── 작업 962 (2026-09-06) — [2-c] 가 4회에 1~2회 빨갰다 ────────────────────────────
 * 옛 [2-c] 는 **고정 간격 `GAPS` 스윕의 최저값 < 710** 을 물었다. 그런데 그 최저값은
 * 골(`jzBoxOut` 종점 = scale .94)을 **표본이 밟았을 때만** 나온다 — `.12s` 짜리 곡선을
 * 20~40ms 걸음으로 훑으니 마지막 10ms 를 몇 ms 차로 비껴가면 최저가 713~731 로 얕아진다
 * (실측 957 1회차: 수리 전 사본 4회 중 2회 빨강 · 이 트리 4회 중 1회 빨강. 빨간 판에서도
 * [2-a]·[2-b] 는 초록 = **병은 재현되는데 깊이만 못 잰다**).
 * ⚠ 문턱을 730 으로 늘리는 수리는 금지다 — 그러면 «닫힘 연출이 통째로 사라져도» 초록이다.
 * ⇒ **재는 자리를 바꾼다**(950 위상 스윕이 쓴 축): 닫힘이 시작되면 `jzBoxOut` 애니를 잡아
 *   `pause()` + `currentTime = dur × f` 로 위상을 **세우고** 그 자리에서 [D] 와 같은 동기
 *   블록을 돌린다. 골(f=1)은 이제 luck 이 아니라 **정의상** 밟힌다.
 * ⇒ 기대값도 손으로 안 적는다(861 처방) — `a.effect.getKeyframes()` 의 마지막 `scale`
 *   («0.94» = 제품 `@keyframes jzBoxOut{to{scale:.94}}` 자신)과 f=0 의 실측 폭에서 **파생**한다.
 *   그래서 제품이 .94 를 .90 으로 바꾸면 이 자는 «틀렸다» 가 아니라 **따라간다**.
 * ⚑ 무르게 푼 것이 아님은 [2-d]·[2-e] 가 못박는다 — 종점 배율이 1 이 되면(연출 폐지) [2-d] 가,
 *   곡선이 아니라 상수가 되면 [2-e](단조 감소)가 빨개진다. 시계 스윕의 최저값은 **판정에서
 *   빼고 관찰로만** 찍는다(ROUTINE [4] §5 «50~200 구간은 관찰» 과 같은 꼴).
 *
 * 실행: node tools/probe764.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const GAPS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 200, 300];
/* 962 [R] — 되돌림 팔은 «창이 열려 있는» 구간만 훑는다(0·20·40·200·300 은 창 밖이라 대조가 안 된다) */
const R_GAPS = [60, 80, 100, 120, 140, 160];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 게이트 [D] 와 같은 상태 — 유물 전종을 소환 경로로 보유시킨다 */
  await page.evaluate(() => {
    closeModal();
    S.relic = 1e7;
    for (let i = 0; i < 400 && RELICS.some((r) => !has(r.id)); i++) summonRelic(true);
    const pet = PETS[0].id; S.own[pet] = S.own[pet] || { n: 0, l: 1 };
  });

  /* ── [1] 위상 스윕 — 배율원을 이름으로 ───────────────────────────── */
  console.log('[1] 위상 스윕 — showItem() 뒤 ms 별 `.sk-db` (기대 750×290)');
  const sweep = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const read = () => {
      const el = document.querySelector('#mbox .sk-db');
      const r = el.getBoundingClientRect();
      const anims = (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => a.playState === 'running' && /^jzBox/.test(a.animationName || ''))
        .map((a) => a.animationName + '@' + Math.round(a.currentTime || 0));
      return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), anims };
    };
    const rows = [];
    for (const ms of [0, 8, 16, 32, 64, 96, 128, 160, 200, 240]) {
      closeModal(); await wait(120);
      showItem(RELICS[0].id);
      if (ms) await wait(ms);
      rows.push(Object.assign({ ms }, read()));
    }
    closeModal();
    return rows;
  });
  for (const r of sweep) {
    console.log('   t+' + String(r.ms).padStart(3) + 'ms  ' + r.w + '×' + r.h
      + (r.anims.length ? '   ' + r.anims.join(',') : ''));
  }
  ok(sweep.some((r) => Math.abs(r.w - 750) > 1 && r.anims.some((a) => /^jzBox/.test(a))),
    '1-a 배율을 만드는 것은 `jzBox…` 연출이다(이름으로 확인)',
    sweep.filter((r) => Math.abs(r.w - 750) > 1).map((r) => 't+' + r.ms + ' ' + r.w).join(' · ') || '없음');

  /* ── [2] 게이트 모양 (병) · [3] 정착 뒤 (약) ─────────────────────── */
  /* 962 — 이 몸통은 [R](§box 를 끈 팔)도 그대로 쓴다. 되돌림 팔이 «같은 자» 여야 대조가 뜻을 갖는다. */
  const gapSweep = async (gaps, boxOff) => {
    const out = [];
    for (const gap of gaps) {
      const v = await page.evaluate(async ({ g, off }) => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const had = window.__settleBoxOff;
        window.__settleBoxOff = !!off;                 /* 962 [R] — `PW_SETTLEBOX=0` 과 같은 스위치 */
        /* 게이트 [C] 꼬리 — 팝업을 한 번 열었다 닫는다 */
        closeModal(); await wait(400);
        showItem(RELICS[0].id); await wait(400);
        closeModal();
        await wait(g);
        /* ---- 여기부터 [D] 와 같은 «동기» 블록 (프레임이 한 장도 안 흐른다) ---- */
        closeModal();
        showItem(RELICS[0].id);
        const raw = document.querySelector('#mbox .sk-db').getBoundingClientRect();
        const cls = document.getElementById('modal').className;
        /* ---- 처방: `verify429` 가 실제로 쓰는 정착과 **같은 본체** ----
           ⚠ «한 번 기다리고 2 rAF» 로는 못 닫는다 — 닫힘이 끝나는 그 프레임에 **열림이 붙어서**
           이번엔 `jzBoxIn` 0%(scale .92 = 690)를 잡는다. 그래서 «두 프레임 연속으로 돌 것이
           없을 때만» 끝낸다.
           ⚑ **작업 957** — 950 이 그 규칙을 공용 §box(`window.settleBox`)로 올렸고 이 자리도 그것을
           부른다. 이 재현기가 «처방이 창을 닫는다»([3-a])로 재는 대상이 곧 **공용 부품 자신**이다.
           되돌림: `PW_SETTLEBOX=0` 이면 §box 가 즉시 돌아와 [3-a] 가 다시 빨개진다([R]). */
        const hasBox = typeof window.settleBox === 'function';
        if (hasBox) await window.settleBox();
        else await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const fixed = document.querySelector('#mbox .sk-db').getBoundingClientRect();
        closeModal();
        window.__settleBoxOff = had;
        return { raw: +raw.width.toFixed(2), fixed: +fixed.width.toFixed(2), cls, hasBox };
      }, { g: gap, off: boxOff });
      out.push(Object.assign({ gap }, v));
      console.log('   gap ' + String(gap).padStart(3) + 'ms → 정착 전 ' + String(v.raw).padStart(6)
        + '  ·  정착 후 ' + String(v.fixed).padStart(6)
        + (/jz-c/.test(v.cls) ? '   (`.jz-c` 가 아직 붙어 있다)' : ''));
    }
    return out;
  };

  console.log('\n[2][3] «닫고 g ms 뒤 [D] 와 같은 동기 블록» — 정착 전(병) ↔ 정착 후(약)');
  const rows = await gapSweep(GAPS, false);
  const bad = rows.filter((r) => Math.abs(r.raw - 750) > 1);
  ok(bad.length > 0, '2-a 정착 전에는 750 이 아닌 창이 있다(= 플레이키의 정체)',
    bad.length ? bad.map((r) => 'g' + r.gap + ' ' + r.raw).join(' · ') : '재현 실패 — 창이 안 잡혔다');
  ok(bad.every((r) => /jz-c/.test(r.cls)), '2-b 그 창에서는 예외 없이 `.jz-c`(닫힘 연출)가 붙어 있다',
    bad.map((r) => 'g' + r.gap).join(',') || '—');
  console.log('   (관찰) 시계 스윕의 최저 ' + (bad.length ? Math.min(...bad.map((r) => r.raw)) : '—')
    + ' — 표본이 골을 밟았느냐에 달린 값이라 **판정에 안 쓴다**(962). 깊이는 아래 [2\'] 가 잰다.');

  /* ── [2'] 위상 «고정» — 시계가 아니라 애니 currentTime 으로 골을 밟는다 (962) ── */
  console.log('\n[2\'] 위상 고정 — `jzBoxOut` 을 pause() 하고 currentTime 을 세운 뒤 [D] 와 같은 동기 블록');
  const PH = [0, 0.25, 0.5, 0.75, 1];
  const ph = await page.evaluate(async (fs) => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const rows = [];
    for (const f of fs) {
      closeModal(); await wait(400);
      showItem(RELICS[0].id); await wait(400);
      closeModal();                                   /* 닫힘 시작 — 애니가 붙기를 기다린다 */
      let a = null;
      for (let i = 0; i < 30 && !a; i++) {
        await raf();
        a = (document.getAnimations ? document.getAnimations() : [])
          .find((x) => x.animationName === 'jzBoxOut');
      }
      if (!a) { rows.push({ f, err: '`jzBoxOut` 애니가 안 붙었다' }); continue; }
      const dur = a.effect.getTiming().duration;
      const kf = a.effect.getKeyframes();              /* 861 — 기대값은 제품 키프레임에서 파생 */
      const endSc = parseFloat(kf[kf.length - 1].scale);
      a.pause();
      a.currentTime = dur * f;
      /* ---- 여기부터 [D] 와 같은 «동기» 블록 (프레임이 한 장도 안 흐른다) ---- */
      showItem(RELICS[0].id);
      const r = document.querySelector('#mbox .sk-db').getBoundingClientRect();
      const cls = document.getElementById('modal').className;
      /* ---- 동기 블록 끝 ---- */
      a.play();
      rows.push({ f, dur, endSc, w: +r.width.toFixed(2), cls });
      closeModal(); await wait(300);
    }
    return rows;
  }, PH);
  for (const r of ph) {
    console.log('   f=' + String(r.f).padEnd(4) + (r.err ? r.err
      : 'currentTime ' + (r.dur * r.f).toFixed(0).padStart(3) + 'ms → ' + String(r.w).padStart(6)
        + (/jz-c/.test(r.cls) ? '   (`.jz-c`)' : '')));
  }
  const phOk = ph.filter((r) => !r.err);
  const base = phOk.length ? phOk[0].w : 0;             /* f=0 = 배율 없음(키프레임 0% 가 `none`) */
  const endSc = phOk.length ? phOk[0].endSc : NaN;
  const want = base * endSc;
  const trough = phOk.length ? phOk[phOk.length - 1].w : NaN;
  ok(phOk.length === PH.length && Math.abs(trough - want) <= 0.5,
    '2-c 골(위상 f=1)의 값 = `jzBoxOut` 종점 배율 × 무배율 폭 — 시계가 아니라 위상으로 밟는다',
    phOk.length !== PH.length ? '애니를 못 잡은 위상이 있다'
      : '실측 ' + trough + ' ↔ 파생 ' + base + '×' + endSc + ' = ' + want.toFixed(2));
  ok(endSc > 0 && endSc < 1,
    '2-d 그 종점 배율은 1 보다 작다(= 닫힘 연출이 실제로 줄인다 — 문턱을 늘려 무르게 풀 수 없다)',
    'scale ' + endSc + ' · 골이 무배율보다 ' + (base - want).toFixed(2) + 'px 좁다');
  ok(phOk.length === PH.length && phOk.every((r, i) => i === 0 || r.w <= phOk[i - 1].w + 0.01),
    '2-e 위상이 커질수록 폭이 단조 감소한다(= 상수가 아니라 그 곡선을 재고 있다)',
    phOk.map((r) => r.w).join(' → '));

  ok(rows.every((r) => Math.abs(r.fixed - 750) <= 1),
    '3-a 정착 뒤에는 g 전 구간에서 750 이다(처방이 창을 닫는다)',
    rows.map((r) => r.fixed).filter((w) => Math.abs(w - 750) > 1).join(',') || 'Δ≤1px · ' + GAPS.length + '개 전부');

  /* ── [R] 되돌림 시험 — 창을 닫는 것이 «정착» 임을 그 장치를 끄고 못박는다 (962) ──
     [3-a] 는 «정착 뒤 750» 만 말한다. 그 초록이 «정착이 일해서» 인지 «애초에 창이 없어서» 인지는
     장치를 꺼 봐야 갈린다(`verify957` [R] 과 같은 꼴). 같은 `gapSweep` 몸통을 §box 만 끈 채 돌린다.
     ⚠ 판정은 «어느 g 가 빨간가» 가 아니라 **«정착 전 = 정착 후»** 다 — 그래야 표본이 골을
     밟았느냐와 무관하다(962 가 [2-c] 에서 걷어낸 것과 같은 함정). */
  console.log('\n[R] 되돌림 — 같은 몸통을 §box 꺼진 채로(= `PW_SETTLEBOX=0`)');
  const revRows = await gapSweep(R_GAPS, true);
  const revBad = revRows.filter((r) => Math.abs(r.fixed - 750) > 1);
  ok(revRows.every((r) => r.hasBox),
    'R-0 `window.settleBox`(§box)가 심겨 있다 — 없으면 이 절은 아무것도 못 말한다',
    revRows.every((r) => r.hasBox) ? '있다' : '없다 — `PW_SETTLE=0` 으로 돌리지 마라');
  ok(revBad.length > 0, 'R-a §box 를 끄면 창이 도로 열린다(정착 «후» 에도 750 아닌 g 가 있다)',
    revBad.map((r) => 'g' + r.gap + ' ' + r.fixed).join(' · ') || '없음');
  /* ⚠ «정착 후 = 정착 전» 으로 물으면 이 항 자신이 플레이키다 — 창이 이미 닫힌 g 에서는
     `showItem()` 이 부른 MO 가 마이크로태스크로 `jzOpen` 을 붙여 **여는** 연출 0%(scale .92 = 690)를
     잡는 판이 있다(실측 g160: 750 → 690). 그것은 «정착이 고쳤다» 가 아니라 **다른 창**이다.
     ⇒ 되돌림이 물을 것은 하나 — **§box 를 끈 팔은 나쁜 값을 750 으로 되돌리지 «못한다»**. */
  const healed = revRows.filter((r) => Math.abs(r.raw - 750) > 1 && Math.abs(r.fixed - 750) <= 1);
  ok(healed.length === 0,
    'R-b 그 팔에서는 정착이 나쁜 값을 750 으로 되돌리지 못한다(= [3-a] 의 초록은 정착의 몫이다)',
    healed.length ? '되돌아간 g: ' + healed.map((r) => 'g' + r.gap + ' ' + r.raw + '→' + r.fixed).join(' · ')
      : revRows.map((r) => r.raw + '→' + r.fixed).join(' · '));

  ok(errs.length === 0, '4-a 페이지 에러 0', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE764 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
