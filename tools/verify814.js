/* 작업 814 게이트 — «50 코스튬 강화 성공 연출이 호스트 카드의 값 줄을 덮지 않는다»

   등재문(711 §3): 델타 잉크가 dy 114.5 에서 출발하는데 그 자리에 호스트 자신의 «n/500»(dy 138..159)이
   있어 6/21 진행도 · 교집합 1275.4px² · 세로 100% · 0~155ms 를 덮었다.
   처방(제품 3자리): 문구를 빼고 **값이 바뀐 줄**(`.sk-clv`)이 22회차 팝으로 말한다 — 520 이 홀드 회당
   피드백에 이미 쓴 그 꼴이다(«문구만 없애고 맥박은 그대로»).

   ⚑ 이 자의 절반은 **음성항**이다. 「텍스트가 없다」만 단언하면 이 자는 «연출을 통째로 지워도 초록» 인
     자가 된다([3]-(다) 「연출 없음은 무조건 0점」). 그래서 같은 클릭에서 **남아 있어야 하는 것**을
     같이 묻는다 — 흰 플래시 · 크림 스파크 · 값 줄 팝 · 그리고 **값 자체가 올랐는가**.
   ⚑ 공용 부품(`fxDelta`·`--fx-plus-fs`·여정 80px/.62s)은 한 픽셀도 안 건드렸다는 것도 이 자가 지킨다 —
     안 지키면 다음 사람이 «코스튬이 조용하니 훈련도 조용하게» 로 58 을 통째로 되돌린다.

   실행: node tools/verify814.js  ·  §R 생략: node tools/verify814.js --no-neg */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const neg = !process.argv.includes('--no-neg');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const r0 = (n) => (n === null || n === undefined ? '—' : Math.round(n * 10) / 10);

/* 실제 [강화] 클릭 경로를 굴리고 «남은 것 · 없어진 것» 을 한 번에 걷는다 */
async function run(file, h) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.join(ROOT, file));
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    window.fxBye = () => {};      /* 재는 동안만 — 한 프레임이 660ms 보다 오래 걸린다(711 머리말) */
    /* HUD 재화 플로터(`fxSeen` 차분)는 이 자의 축이 아니다 — 주입한 1e12 가 «+999,999,000» 을 띄우면
       «텍스트 플로터 0장» 이 그 한 장 때문에 빨개진다(그 장은 카드 위가 아니라 HUD 알약 위다).
       기준선을 지금 값으로 맞춰 그 축을 재우고, 이 자는 **델타 부품(.fx-delta)만** 센다. */
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(350);

  const D = await p.evaluate(() => {
    const R = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
    const inksOf = (el) => {
      const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(t);
        const r = g.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push({ txt: t.nodeValue.trim().slice(0, 14), x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right });
      }
      return out;
    };
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    all[0].click();
    const id = cosSel;
    const lv0 = cosLvOf(id);
    const before = inksOf(document.querySelector('#bCos .sk-card.sel'));
    document.querySelector('#bCos [data-cosup]').click();

    /* 클릭 직후 상태 — 재렌더가 이미 끝나 있다(핸들러가 동기로 renderUI 한다) */
    const sel = document.querySelector('#bCos .sk-card.sel');
    const selR = R(sel), selInks = inksOf(sel);
    const L = document.getElementById('fxl');
    /* ⚠ **한 순간이 아니라 수명 전체**를 재야 한다 — 등재문의 1275.4px² 는 여정의 **최댓값**이고
       클릭 직후 한 장만 재면 같은 결함이 199.6px² 로 읽힌다(§R-a 가 그것을 잡았다).
       델타가 있으면 애니를 정지시켜 진행도 21칸을 직접 준다(711 머리말). */
    const dels = [...document.querySelectorAll('.fx-delta')];
    const plus = dels.map((d) => {
      const rg = document.createRange(); rg.selectNodeContents(d);
      const k = rg.getBoundingClientRect();
      return { txt: (d.textContent || '').slice(0, 12), cls: d.className, x: k.left, y: k.top, w: k.width, h: k.height, b: k.bottom, r: k.right };
    });
    const frames = [];
    if (dels.length) {
      const anims = dels.flatMap((d) => d.getAnimations());
      anims.forEach((a) => a.pause());
      for (let i = 0; i <= 20; i++) {
        const t = (620 * i) / 20;
        anims.forEach((a) => { try { a.currentTime = t; } catch (_) {} });
        frames.push({ t, inks: dels.map((d) => {
          const rg = document.createRange(); rg.selectNodeContents(d);
          const k = rg.getBoundingClientRect();
          return { x: k.left, y: k.top, w: k.width, h: k.height, b: k.bottom, r: k.right,
            op: parseFloat(getComputedStyle(d).opacity) };
        }) });
      }
    }
    const clv = sel.querySelector('.sk-clv');
    return {
      lv0, lv1: cosLvOf(id), id,
      sel: selR, selInks, before,
      plus, frames,
      delta: document.querySelectorAll('.fx-delta').length,
      flash: L ? L.querySelectorAll('.fx-flash').length : 0,
      spark: L ? L.querySelectorAll('.fx-spark').length : 0,
      pop: !!(clv && clv.classList.contains('fx-cvswap')),
      popAnim: clv ? getComputedStyle(clv).animationName : '—',
      /* 스파크가 «누른 카드» 를 가리키는가 — 개수만 세면 «아무 데서나 터져도 초록» 이다(702·verify93 [7-c2]) */
      sparkAt: L ? [...L.querySelectorAll('.fx-spark')].map((e) => {
        const r = e.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, s: Math.max(r.width, r.height) };
      }) : [],
      fs: getComputedStyle(document.documentElement).getPropertyValue('--fx-plus-fs').trim()
    };
  });

  /* 팝업 자리(08 세부) — 같은 말인가 */
  const P = await p.evaluate(() => {
    for (const d of document.querySelectorAll('.fx-plus')) d.remove();
    showCosDetail(cosSel);
    /* 팝업 [강화] 는 `.sk-u`(262 — 꾹 누르기 대상이라 `bindUpHold` 가 잡는다) */
    const btn = [...document.querySelectorAll('#mbox button')].find((x) => /강화/.test(x.textContent) && !x.disabled);
    if (!btn) return { none: true };
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    btn.click();
    return new Promise((res) => setTimeout(() => {
      const L = document.getElementById('fxl');
      res({
        plus: [...document.querySelectorAll('.fx-delta')].map((d) => (d.textContent || '').slice(0, 12)),
        flash: L ? L.querySelectorAll('.fx-flash').length : 0,
        spark: L ? L.querySelectorAll('.fx-spark').length : 0
      });
    }, 120));
  });

  /* 공용 부품 무손상 — 직접 부르면 여전히 글자를 세운다(다른 씬은 종전 그대로) */
  const C = await p.evaluate(() => {
    for (const d of document.querySelectorAll('.fx-plus')) d.remove();
    const host = document.querySelector('#bCos [data-cosit]');
    fxDelta(host, '+2.2');
    const d = document.querySelector('.fx-delta');
    const out = { made: !!d, txt: d ? d.textContent : '', fs: d ? getComputedStyle(d).fontSize : '—',
      dur: d ? getComputedStyle(d).animationDuration : '—' };
    if (d) d.remove();
    return out;
  });

  await b.close();
  return { D, P, C, errs };
}

/* 델타(텍스트 플로터) 잉크 ↔ 호스트 카드 글자 잉크의 교집합 */
function inter(plus, inks) {
  let a = 0;
  for (const q of plus) for (const k of inks) {
    const ox = Math.max(0, Math.min(q.r, k.r) - Math.max(q.x, k.x));
    const oy = Math.max(0, Math.min(q.b, k.b) - Math.max(q.y, k.y));
    a += ox * oy;
  }
  return a;
}

(async () => {
  console.log('VERIFY814 — 50 코스튬 강화 연출이 호스트 카드의 값 줄을 덮지 않는다\n');
  const { D, P, C, errs } = await run(process.env.V814_SRC || 'index.html', 2280);

  console.log('[A] 실제 [강화] 클릭 경로 — 없어진 것');
  console.log('  · 호스트 글자 ' + D.selInks.map((k) => '«' + k.txt + '» dy ' + r0(k.y - D.sel.y) + '..' + r0(k.b - D.sel.y)).join(' · '));
  console.log('  · 텍스트 플로터 ' + D.plus.length + '장' + (D.plus.length ? ' — ' + D.plus.map((q) => '«' + q.txt + '»').join(' · ') : ''));
  const A = D.frames.length
    ? Math.max(...D.frames.map((f) => inter(f.inks.filter((q) => q.op > 0.02), D.selInks)))
    : inter(D.plus, D.selInks);
  ok(D.delta === 0, '[A1] ★ 강화 경로가 텍스트 델타를 안 세운다 (' + D.delta + '장)');
  ok(A === 0, '[A2] ★ 수명 전체에서 호스트 카드 **모든 글자**와 텍스트 잉크 교집합 0px² (' + r0(A) + ') — 등재문 1275.4px² 가 닫혔다');

  console.log('\n[B] 같은 클릭에서 **남아 있어야 하는 것**(음성항 묶음 방지 — 연출 없음은 0점)');
  console.log('  · 흰 플래시 ' + D.flash + '장 · 크림 스파크 ' + D.spark + '알 · 값 줄 팝 ' + (D.pop ? '걸림' : '없음') + '(' + D.popAnim + ')');
  ok(D.flash >= 1, '[B1] 흰 플래시가 남아 있다 (' + D.flash + '장)');
  ok(D.spark >= 1, '[B2] 크림 스파크가 남아 있다 (' + D.spark + '알)');
  ok(D.pop, '[B3] ★ 값이 바뀐 줄(.sk-clv)이 22회차 팝으로 «방금 갱신됐다» 를 말한다');
  ok(/fxCvSwap/.test(D.popAnim), '[B4] 팝은 58 22회차의 그 부품이다 (' + D.popAnim + ')');
  ok(/fxCvLit/.test(D.popAnim), '[B5] ★ 그 줄이 58 20회차의 앰버로 물든다 — «방금 갱신됐다» 를 두 축으로 말한다');
  {
    const m = D.sparkAt.map((a) => a.s / 2);
    const out = D.sparkAt.filter((a, i) => a.cx < D.sel.x - m[i] || a.cx > D.sel.r + m[i] || a.cy < D.sel.y - m[i] || a.cy > D.sel.b + m[i]);
    console.log('  · 스파크 자리 — 잰 ' + D.sparkAt.length + '알 · 카드 상자 밖 ' + out.length + '알 (카드 '
      + r0(D.sel.w) + '×' + r0(D.sel.h) + ')');
    ok(D.sparkAt.length >= 3 && out.length === 0,
      '[B6] ★ 그 버스트가 **누른 카드 상자 안**에서 뜬다 — 밖 ' + out.length + '알 / 잰 ' + D.sparkAt.length + '알 (verify93 [7-c2] 와 같은 축)');
  }

  console.log('\n[C] 연출이 «정보» 를 잃지 않았는가 — 값 자체');
  const b0 = D.before.find((k) => /^Lv\./.test(k.txt)), a0 = D.selInks.find((k) => /^Lv\./.test(k.txt));
  console.log('  · 레벨 ' + D.lv0 + ' → ' + D.lv1 + ' · 카드 라벨 «' + (b0 ? b0.txt : '—') + '» → «' + (a0 ? a0.txt : '—') + '»');
  ok(D.lv1 === D.lv0 + 1, '[C1] 강화가 실제로 됐다 (Lv. ' + D.lv0 + ' → ' + D.lv1 + ')');
  ok(!!a0 && a0.txt === 'Lv. ' + D.lv1, '[C2] ★ 새 값을 **카드 자신이** 말한다 — 플로터가 하던 말이 사라진 게 아니다');
  ok(!!b0 && b0.txt !== a0.txt, '[C3] 그 줄이 실제로 바뀐 줄이다 (팝의 대상이 옳다)');

  console.log('\n[D] 08 세부 팝업 자리 — 같은 행동, 같은 말인가(736 «짝인 두 자리»)');
  console.log('  · 팝업 텍스트 플로터 ' + (P.none ? '—' : P.plus.length + '장' + (P.plus.length ? ' — ' + P.plus.map((t) => '«' + t + '»').join(' · ') : '')) + ' · 플래시 ' + P.flash + ' · 스파크 ' + P.spark);
  ok(!P.none && P.plus.length === 0, '[D1] 팝업 [강화]도 텍스트 플로터 0장 — 격자와 한 어휘');
  ok(P.flash + P.spark > 0, '[D2] 팝업에서도 플래시·스파크는 남아 있다');

  console.log('\n[E] 공용 부품은 한 픽셀도 안 건드렸다 — 다른 씬(훈련·09·12·17·장비)의 몫');
  console.log('  · 직접 호출 `fxDelta(host, «+2.2»)` → «' + C.txt + '» · font ' + C.fs + ' · 수명 ' + C.dur + ' · 토큰 ' + D.fs);
  ok(C.made && C.txt === '+2.2', '[E1] `fxDelta` 자체는 그대로 글자를 세운다 (부품을 지운 게 아니다)');
  ok(C.fs === '34px' && D.fs === '34px', '[E2] 글리프 토큰 `--fx-plus-fs` 34px 그대로 (491 2회차 «세 씬 한 규격»)');
  ok(C.dur === '0.62s', '[E3] 수명 .62s 그대로 (58 30회차 «한 픽셀도 안 바꾼다»)');

  /* ── §R 되돌림 시험(334) — 무르게 푼 수리가 아니다 ───────── */
  if (neg) {
    console.log('\n§R 되돌림 시험 — 옛 호출을 되살리면 [A] 가 실제로 빨개지는가');
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const INJ = [
      ['R-a', '격자 [강화] 를 옛 호출로 되돌린다 (문구 «Lv. n» 부활)',
        'fxUpOk(card, card);                            /* 17 «성공» 과 같은 한 세트(58 톤) — 814: 문구는 뺀다 */',
        "fxUpOk(card, card, 'Lv. ' + cosLvOf(cosSel));"],
      ['R-b', '값 줄 팝만 지운다 (문구도 팝도 없는 상태)',
        '      cosLvPop();                                    /* 814 — 값이 바뀐 줄이 «방금 갱신됐다» 를 말한다 */\n', '']
    ];
    for (const [tag, why, from, to] of INJ) {
      if (src.indexOf(from) < 0) { ok(false, '[' + tag + '] 주입 앵커를 못 찾았다 — 조용한 통과 금지'); continue; }
      const tmp = '.v814-neg-' + process.pid + '-' + tag + '.html';
      fs.writeFileSync(path.join(ROOT, tmp), src.split(from).join(to));
      try {
        const N = await run(tmp, 2280);
        const na = N.D.frames.length
          ? Math.max(...N.D.frames.map((f) => inter(f.inks.filter((q) => q.op > 0.02), N.D.selInks)))
          : inter(N.D.plus, N.D.selInks);
        console.log('  · [' + tag + '] ' + why + ' — 텍스트 플로터 ' + N.D.plus.length + '장 · 교집합 ' + r0(na) + 'px² · 팝 ' + (N.D.pop ? '걸림' : '없음'));
        if (tag === 'R-a') ok(na > 1000 && N.D.delta > 0, '[R-a] 주입하면 [A1]·[A2] 가 빨개진다 (교집합 ' + r0(na) + 'px²)');
        else ok(!N.D.pop, '[R-b] 주입하면 [B3] 이 빨개진다 (팝 ' + (N.D.pop ? '걸림' : '없음') + ') — 이 수리는 «지운 것» 이 아니라 «옮긴 것» 이다');
      } finally { try { fs.unlinkSync(path.join(ROOT, tmp)); } catch (_) {} }
    }
  }

  ok(errs.length === 0, '[H] 콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));
  console.log('\nVERIFY814 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
