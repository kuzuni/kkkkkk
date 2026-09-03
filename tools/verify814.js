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
      /* 카드 글자 두 줄의 잉크 상자 — [B7] 이 «입자가 그 위에 앉는가» 를 잰다 */
      glyphRows: inksOf(sel).map((k) => ({ txt: k.txt, x: k.x, y: k.y, r: k.r, b: k.b })),
      /* 스파크가 «누른 카드» 를 가리키는가 — 개수만 세면 «아무 데서나 터져도 초록» 이다(702·verify93 [7-c2]) */
      /* ⚑ 4회차 — «카드 본체가 반응하지 않는다»(3회차 CR6)를 **제품 쪽에서** 못박는 재료다.
         그 지적은 죽은 프레임을 잰 것이었고(`probe814b` [3-c]) 실제로는 플래시가 카드 상자를
         통째로 덮는다. 픽셀 증거는 `probe814b` 가 들고, 여기서는 **상자가 호스트와 같은가**를
         묻는다 — 누군가 플래시 앵커를 다른 노드로 옮기면 픽셀 자를 안 돌려도 여기가 빨개진다. */
      flashAt: L ? [...L.querySelectorAll('.fx-flash')].map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height, an: getComputedStyle(e).animationName };
      }) : [],
      sparkAt: L ? [...L.querySelectorAll('.fx-spark')].map((e) => {
        const r = e.getBoundingClientRect();
        /* 5회차 — «경로» 는 픽셀로 뒤쫓지 않고 **부품이 적어 둔 이동 벡터**(`--dx`/`--dy`)에서 읽는다.
           그 두 값이 곧 CSS 가 수명 동안 옮기는 양이고, 캡처 프레임의 매칭 오차를 안 탄다. */
        const px = (k) => parseFloat(e.style.getPropertyValue(k)) || 0;
        /* ⚠ 크기는 **찍힌 rect 가 아니라 부품이 적은 상자**(`style.width`)로 읽는다 — rect 는
           `@keyframes fxSpark` 의 scale 을 타서 재는 순간마다 달라진다(5회차 1차 시도가 실제로
           «최대 5.7px» 라는 헛초록을 냈다: 그 자는 알을 다시 34 로 키워도 초록이었다). */
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, s: Math.max(r.width, r.height),
                 bw: parseFloat(e.style.width) || 0, dx: px('--dx'), dy: px('--dy') };
      }) : [],
      /* ⚑ 6회차 — [B14] 가 쓰는 재료. «몇 알이 벽에 붙었나» 를 세면 각도 난수를 타서 흔들리므로
         (825·836 계열 문턱 플레이키) **호스트가 신고한 값과 카드 상자**를 읽어 산수로 판정한다.
         셋 다 «없으면 1» 이라 다른 화면에서는 종전과 같은 답이 나온다. */
      bvar: (() => {
        const cs = getComputedStyle(sel);
        const num = (k) => { const v = parseFloat(cs.getPropertyValue(k)); return (v > 0 && v <= 1) ? v : 1; };
        return { rx: num('--burst-rx'), ry: num('--burst-ry'), sz: num('--burst-sz') };
      })(),
      fs: getComputedStyle(document.documentElement).getPropertyValue('--fx-plus-fs').trim()
    };
  });

  /* ⚑ 3회차 — **선언한 키프레임이 실제로 렌더되는가**를 제품에게 직접 묻는다.
     비평가 둘이 캡처 픽셀에서 «0% 의 .84 트로프가 8프레임 어디에도 없다» 를 각자 냈는데,
     그 판정은 크롭 좌표·안티에일리어스에 기댄 추론이다. 자는 추론하지 말고 **계산된 transform**
     을 읽는다 — 그러면 다음 사람이 같은 물음을 픽셀로 다시 싸울 필요가 없다. */
  const K = await p.evaluate(() => {
    const l = document.querySelector('#bCos .sk-card.sel .sk-clv');
    if (!l) return { none: true };
    const an = l.getAnimations();
    an.forEach((a) => a.pause());
    const sc = (t) => {
      an.forEach((a) => { try { a.currentTime = t; } catch (_) {} });
      const cs = getComputedStyle(l);
      const m = /matrix\(([-\d.]+)/.exec(cs.transform || '');
      return { s: m ? +parseFloat(m[1]).toFixed(3) : null, c: cs.color,
        own: cs.getPropertyValue('--clv-c').trim() };
    };
    const f0 = sc(0), fp = sc(100), fe = sc(340);
    an.forEach((a) => { try { a.play(); } catch (_) {} });
    return { names: an.map((a) => a.animationName), f0, fp, fe };
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
  return { D, P, C, K, errs };
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
  const { D, P, C, K, errs } = await run(process.env.V814_SRC || 'index.html', 2280);

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
  /* 3회차 — 이름이 `fxCvSwapS`(작은 호스트 판)로 갈렸다. 이름 문자열이 아니라 **둘 다 걸렸는가**를 묻는다. */
  ok(/fxCvSwap/.test(D.popAnim) && /fxCvLit/.test(D.popAnim),
    '[B4] 팝과 앰버가 **한 선언으로 같이** 걸린다 (' + D.popAnim + ') — 단축 속성이 앞을 덮으면 여기가 빨개진다');
  ok(/fxCvLit/.test(D.popAnim), '[B5] ★ 그 줄이 58 20회차의 앰버로 물든다 — «방금 갱신됐다» 를 두 축으로 말한다');
  {
    const m = D.sparkAt.map((a) => a.s / 2);
    const out = D.sparkAt.filter((a, i) => a.cx < D.sel.x - m[i] || a.cx > D.sel.r + m[i] || a.cy < D.sel.y - m[i] || a.cy > D.sel.b + m[i]);
    console.log('  · 스파크 자리 — 잰 ' + D.sparkAt.length + '알 · 카드 상자 밖 ' + out.length + '알 (카드 '
      + r0(D.sel.w) + '×' + r0(D.sel.h) + ')');
    ok(D.sparkAt.length >= 3 && out.length === 0,
      '[B6] ★ 그 버스트가 **누른 카드 상자 안**에서 뜬다 — 밖 ' + out.length + '알 / 잰 ' + D.sparkAt.length + '알 (verify93 [7-c2] 와 같은 축)');
    /* ⚑ 2회차 — 비평가 CR4 가 «6/10 알이 글자 띠에 착지해 «13/500» 글리프의 28.1% 를 지운다» 를
       실측했다. 814 가 문구를 치운 바로 그 줄이라 이 자의 축이다 — 619 4회차 `strict` 로 막는다. */
    const hits = (rows) => D.sparkAt.filter((a) => rows.some((k) =>
      a.cx + a.s / 2 > k.x && a.cx - a.s / 2 < k.r && a.cy + a.s / 2 > k.y && a.cy - a.s / 2 < k.b));
    /* ⚑ 지키는 것은 **값 줄 둘**(«Lv. n» · «n/500»)이다. 세 번째 줄 «착용 중» 은 값이 아니라
       상태 라벨이고, 세 줄이 카드 높이의 45% 를 먹어 셋을 다 비우는 링은 기하적으로 없다
       (자유 띠가 26px·37px 뿐 — 711 §3 이 적어 둔 그 수치다). 58 의 축도 «새 **값**을 읽을 수
       있는가» 이고, 두 비평가(CR3·CR4)가 실측한 것도 그 두 줄이다. 셋째 줄은 아래에 «몇 알이
       걸치는가» 를 **찍어만** 둔다 — 숨기지 않는다. */
    const valRows = D.glyphRows.filter((k) => /^Lv\.|\/\d+$/.test(k.txt));
    const onVal = hits(valRows), onAll = hits(D.glyphRows);
    console.log('  · 값 줄(' + valRows.map((k) => '«' + k.txt + '»').join(' · ') + ') 위에 앉은 알 '
      + onVal.length + '/' + D.sparkAt.length + ' · 상태 라벨 «착용 중» 포함 ' + onAll.length + '알');
    ok(onVal.length === 0, '[B7] ★ 입자가 **값 줄 두 곳** 위에 안 앉는다 — ' + onVal.length + '알 (링 세로 눌림 `--burst-ry`)');
    /* ⚑ 5회차 — 3회차가 «값 줄 위 0알» 을 산 **대가**를 여기서 지킨다. 4회차 비평 2인이 각자
       실측했다: 알갱이 이동 19.43 → 5.74px(−70%) · 그림 띠 점유 12.3 → 22.4%(+82%) — 링을
       글자 사이에 넣느라 알을 그림 위에 포갠 것이다. `--burst-sz` 로 알을 줄이자 셋이 같이 풀린다.
       ⚠ 두 항은 **[B7] 과 한 벌**이다 — 알을 다시 키우면 [B7] 이 빨개지고, 링을 다시 누르면
         여기가 빨개진다. 한쪽만 있으면 다음 사람이 같은 왕복을 또 한다. */
    const szMax = D.sparkAt.length ? Math.max(...D.sparkAt.map((a) => a.bw)) : 0;
    const tr = D.sparkAt.map((a) => Math.hypot(a.dx, a.dy));
    const trAvg = tr.length ? tr.reduce((x, y) => x + y, 0) / tr.length : 0;
    console.log('  · 알 지름 최대 ' + r0(szMax) + 'px (신고 `--burst-sz` 뒤 상한 24) · 이동 벡터 평균 '
      + trAvg.toFixed(1) + 'px · 최소 ' + (tr.length ? Math.min(...tr).toFixed(1) : '—'));
    ok(szMax > 0 && szMax <= 25,
      '[B12] ★ 알이 그림 띠에 맞게 작다 — 최대 지름 ' + r0(szMax) + 'px ≤ 25 (그림 띠 세로 83px 의 30% 이하 · 점유는 면적이라 ×0.49)');
    /* ⚠ **비평가의 «이동 −70%» 를 이 자로는 재현하지 못했다**(5회차 §R-c 실측: 3회차 판 10.6px ↔
       이번 판 11.6px = **+9%**). 두 사람이 잰 것은 «두 프레임 사이 중심 이동» 이라 `@keyframes fxSpark`
       의 scale 이 만드는 겉보기 이동이 섞이고, 이 자가 재는 것은 **부품이 적어 둔 이동 벡터** 다.
       그래서 이 항은 «회수했다» 를 주장하지 않고 **바닥을 지킨다** — 다음 사람이 링을 더 누르면
       (세로 반경이 곧 이동량이라) 여기가 먼저 빨개진다. 겉보기 이동은 채점 캡처의 몫이다. */
    ok(trAvg >= 8, '[B13] 그 버스트의 **이동 벡터 바닥** — 평균 ' + trAvg.toFixed(1)
      + 'px ≥ 8 (3회차 판 10.6px · 이동량 상수 `FXB_K` 는 한 값도 안 건드렸다 — 가둠이 열린 만큼만 늘었다)');
    /* ⚑⚑ 6회차 — **가로 링이 가둠 벽 «안» 에서 끝나는가.** 5회차 채점의 2인 공통 «단 하나» 다:
       CR10 «10알 중 6알이 두 기둥(띠 폭의 23%에 60%)» · CR9 «10알 중 6알이 수평 ±30° 안 ·
       우측 3알 간격 14.1px < 융합 문턱 18.9px» · CR10 «좌단 알이 폭의 38% 액자에 잘린다».
       뿌리는 «알이 크다» 도 «이동이 짧다» 도 아니라 **끝점이 벽 밖이라 clamp 가 한 열에 눌러붙이는 것**이다.
       ⚠ **«몇 알이 붙었나» 를 세지 않는다** — 각도가 난수(위상 굴림 + 지터 ±0.18)라 실행마다
         갈리는 문턱 항이 된다(825·836·344·574 계열). 대신 **기하로 판정한다**: 최악 개체
         (`jt` 상한 1.18 · `rr` 상한 1.00)의 끝점 + 알 반경이 벽을 못 넘으면 눌림은 **구조적으로 0** 이다.
       산수(부품과 같은 식): `rx = (w/2 + FXB_M)·rxs` · 벽 = `w/2 − (알반경 + FXB_INPAD)`.
       ⚠ 3·5회차 검산이 둘 다 `jt` 를 빼먹어 «맞다» 고 적고도 실제로는 넘었다(LESSONS 814-⑩) —
         그래서 이 자는 `jt` 를 **식 안에** 넣어 둔다. */
    {
      const FXB_M = 6, FXB_INPAD = 4, JT = 1.18;
      const rxE = (D.sel.w / 2 + FXB_M) * D.bvar.rx;      /* 부품의 `rx` (요소 대상 · fo 없음) */
      const rad = szMax / 2;
      const wall = D.sel.w / 2 - (rad + FXB_INPAD);       /* 부품의 가둠 `inM` 과 같은 식 */
      const tip = rxE * JT;
      console.log('  · 가로 — rx ' + rxE.toFixed(1) + 'px(신고 ' + D.bvar.rx + ') · 최악 끝점 '
        + tip.toFixed(1) + 'px(jt 1.18) · 가둠 벽 ' + wall.toFixed(1) + 'px · 잉크 끝 '
        + (tip + rad).toFixed(1) + 'px · 카드 반폭 ' + (D.sel.w / 2).toFixed(1) + 'px');
      ok(tip <= wall && tip + rad <= D.sel.w / 2,
        '[B14] ★ 가로 링이 **가둠 벽 안**에서 끝난다 — 최악 끝점 ' + tip.toFixed(1) + 'px ≤ 벽 '
        + wall.toFixed(1) + 'px (넘으면 clamp 가 그 알들을 한 열에 눌러붙인다 · 잉크 '
        + (tip + rad).toFixed(1) + ' ≤ 반폭 ' + (D.sel.w / 2).toFixed(1) + ' = 액자 절단 0)');
    }
  }
  {
    /* 4회차 — 3회차 CR6 «테두리·내부 Δ ≤ 0.2/255 = 카드 본체가 0px 반응한다» 의 자리.
       `probe814b` 가 픽셀로 갈랐다(그 지적은 **수거된 뒤의 프레임**을 잰 것이고, 봉우리에서
       테두리 띠 +182/255 · 속 +46.6/255 다). 여기서는 그 반응의 **주어**를 지킨다 —
       플래시 상자가 누른 카드와 같은 자리인가. 상자가 남의 노드로 옮겨 가면 픽셀 자를 안 돌려도
       이 항이 먼저 빨개진다. ⚠ 상자는 호스트 rect 그대로다(`inset` 인자를 안 주는 호출이라
       `pin` = 0 · 훈련 홀드 자리만 안으로 들인다). */
    const f = D.flashAt[0];
    const dc = f ? Math.max(Math.abs((f.x + f.w / 2) - (D.sel.x + D.sel.w / 2)),
                            Math.abs((f.y + f.h / 2) - (D.sel.y + D.sel.h / 2))) : Infinity;
    const ds = f ? Math.max(Math.abs(f.w - D.sel.w), Math.abs(f.h - D.sel.h)) : Infinity;
    console.log('  · 플래시 상자 ' + (f ? r0(f.w) + '×' + r0(f.h) + ' (' + f.an + ') · 중심 Δ' + dc.toFixed(1)
      + 'px · 크기 Δ' + ds.toFixed(1) + 'px' : '없음') + ' / 카드 ' + r0(D.sel.w) + '×' + r0(D.sel.h));
    ok(!!f && dc <= 2 && ds <= 2 && /fxFlash/.test(f.an),
      '[B11] ★ 그 플래시가 **누른 카드 본체**를 덮는다 — 중심 Δ' + (f ? dc.toFixed(1) : '—')
      + 'px · 크기 Δ' + (f ? ds.toFixed(1) : '—') + 'px (≤ 2). 3회차 CR6 «카드가 0px 반응한다» 는 '
      + '**수거된 뒤의 프레임**을 잰 것이다 — 픽셀 증거는 `node tools/probe814b.js`');
  }

  console.log('\n[B-K] 선언한 키프레임이 실제로 렌더되는가(추론 말고 계산값으로)');
  if (K.none) { ok(false, '[B8] 값 줄 호스트를 못 찾았다'); }
  else {
    console.log('  · t=0 scale ' + K.f0.s + ' · ' + K.f0.c + ' | t=100 scale ' + K.fp.s + ' | t=340 scale ' + K.fe.s + ' · ' + K.fe.c);
    ok(K.f0.s !== null && Math.abs(K.f0.s - 0.84) < 0.01,
      '[B8] ★ 0% 트로프가 **실제로 렌더된다** — t=0 scale ' + K.f0.s + '(선언 .84 · `both` 가 앞을 채운다)');
    ok(K.fp.s >= 1.17, '[B9] 정점이 호스트 비례 진폭이다 — t=100 scale ' + K.fp.s + ' ≥ 1.17 (58 22회차 1.07 은 48.5px 글리프의 값)');
    /* ⚠ «제 색» 은 흰색이 아니다 — 착용 중(dim)·미보유(lk) 카드는 #ACACAC 다. 그래서 이 항은
       상수와 비교하지 않고 **호스트가 선언한 `--clv-c`** 와 비교한다(색을 변수 뒤로 옮긴 이유가
       바로 이것이다 — 앰버가 «어디로» 돌아갈지를 카드 상태가 정한다). */
    const hex = (K.fe.own || '').replace('#', '').toLowerCase();
    const rgb = hex.length === 6 ? [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') : null;
    ok(Math.abs(K.fe.s - 1) < 0.01 && !!rgb && K.fe.c.replace(/\s+/g, ' ') === 'rgb(' + rgb + ')',
      '[B10] 끝나면 제 자리·**호스트가 선언한 제 색**으로 돌아온다 — scale ' + K.fe.s + ' · ' + K.fe.c + ' = --clv-c ' + K.fe.own);
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
        '      cosLvPop();                                    /* 814 — 값이 바뀐 줄이 «방금 갱신됐다» 를 말한다 */\n', ''],
      /* ⚑ 5회차 — 3회차 판(«알은 그대로 두고 링만 누른다»)으로 되돌린다. 그 판이 4회차 2인 공통
         지적의 원본이므로, [B12]·[B13] 이 그 판에서 **실제로 빨개져야** 이 회차가 무른 수리가 아니다. */
      ['R-c', '3회차 판으로 되돌린다 (알 크기 신고를 빼고 링만 .29 로 누른 상태)',
        '#bCos .sk-card{--burst-ry:.315;--burst-sz:.5;--burst-rx:.60}', '#bCos .sk-card{--burst-ry:.29}'],
      /* ⚑ 6회차 — 5회차 판(«알은 줄였지만 가로 링은 벽 밖 그대로»)으로 되돌린다. 그 판이 5회차
         2인 공통 지적의 원본이므로 [B14] 가 그 판에서 **실제로 빨개져야** 이 회차가 무른 수리가 아니다. */
      ['R-d', '5회차 판으로 되돌린다 (가로 신고를 빼고 세로·알만 누른 상태)',
        '#bCos .sk-card{--burst-ry:.315;--burst-sz:.5;--burst-rx:.60}', '#bCos .sk-card{--burst-ry:.344;--burst-sz:.7}']
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
        else if (tag === 'R-c') {
          const nz = N.D.sparkAt.length ? Math.max(...N.D.sparkAt.map((a) => a.bw)) : 0;
          const nt = N.D.sparkAt.map((a) => Math.hypot(a.dx, a.dy));
          const ntAvg = nt.length ? nt.reduce((x, y) => x + y, 0) / nt.length : 0;
          console.log('    · 3회차 판 — 알 지름 최대 ' + r0(nz) + 'px · 이동 벡터 평균 ' + ntAvg.toFixed(1) + 'px');
          ok(nz > 25, '[R-c] 주입하면 [B12] 가 빨개진다 — 알 지름 ' + r0(nz) + 'px (> 25). '
            + '⚠ 이동 벡터는 ' + ntAvg.toFixed(1) + 'px 로 이번 판(11.6)과 큰 차가 없다 — '
            + '4회차 비평가의 «−70%» 는 **겉보기 이동**(프레임 간 중심 매칭)이고 이 자의 축이 아니다');
        }
        else if (tag === 'R-d') {
          /* [B14] 와 **같은 식**으로 잰다(자를 두 벌 만들지 않는다) — 5회차 판은 가로 신고가 없어
             `rx` 가 90 이고 알 반경이 12 라 끝점 106.2 > 벽 68 이다. */
          const nz = N.D.sparkAt.length ? Math.max(...N.D.sparkAt.map((a) => a.bw)) : 0;
          const nRx = (N.D.sel.w / 2 + 6) * N.D.bvar.rx, nTip = nRx * 1.18, nWall = N.D.sel.w / 2 - (nz / 2 + 4);
          console.log('    · 5회차 판 — rx ' + nRx.toFixed(1) + 'px(신고 ' + N.D.bvar.rx + ') · 최악 끝점 '
            + nTip.toFixed(1) + 'px · 가둠 벽 ' + nWall.toFixed(1) + 'px');
          ok(nTip > nWall, '[R-d] 주입하면 [B14] 가 빨개진다 — 최악 끝점 ' + nTip.toFixed(1)
            + 'px > 벽 ' + nWall.toFixed(1) + 'px (= 5회차 판이 실제로 벽 밖이었다 · 초과 '
            + (nTip - nWall).toFixed(1) + 'px)');
        }
        else ok(!N.D.pop, '[R-b] 주입하면 [B3] 이 빨개진다 (팝 ' + (N.D.pop ? '걸림' : '없음') + ') — 이 수리는 «지운 것» 이 아니라 «옮긴 것» 이다');
      } finally { try { fs.unlinkSync(path.join(ROOT, tmp)); } catch (_) {} }
    }
  }

  ok(errs.length === 0, '[H] 콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));
  console.log('\nVERIFY814 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
