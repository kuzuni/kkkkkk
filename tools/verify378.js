/* 작업 378 게이트 — «끝 칸이 활성이면 그 면의 검정을 셸 테두리에 넘긴다».
 *
 *   node tools/verify378.js
 *
 * 잡는 것 하나:
 *   활성 알약이 셸 **안쪽 변에 닿는 면**에서 알약의 «검정 7» 이 셸 테두리 6 에 겹쳐
 *   검정이 **13px** 이 됐다. ref 는 그 자리에 검정을 겹치지 않는다 — 셸 테두리가 알약의
 *   그 변을 겸한다(352 §8 실측 · 측정표 07 §9 «위·아래 테두리는 바 테두리와 공유» 의 좌·우판).
 *
 * ⚑ **«지우기» 가 아니다.** 셸 변에 **안 닿는** 면은 ref 에도 검정 7 이 있다
 *    (측정표 07 §9 «좌우 테두리 7px #000000 (292~298 / 544~550)»). 그래서 이 게이트는
 *    **세 갈래를 다 문다** — 닿는 면(검정 0) · 안 닿는 알약 면(검정 7) · 안 닿는 바 변(셸 림).
 *    한 갈래만 물면 «검정이 통째로 사라져도 초록» 이 된다(LESSONS 328·334).
 *
 * ⚑ **찍힌 픽셀로 본다**(350 처방) — `box-shadow` 선언만 보면 자식이 덮은 자리를 못 본다.
 * ⚑ **§R 되돌림 시험** — 378 이전 선언을 도로 주입하면 닿는 면이 **13px 로 돌아가야** 한다.
 *    이게 없으면 «원래 6px 이던 것을 게이트로 굳힌 것» 과 구분이 안 된다(338 교훈).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품(한 틱) */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '378.png');

/* 437 이관 (2026-08-30) — 셸 테두리는 6 → **7** 이다. 여기 문턱이 ±1 이라 6 인 채로도 초록이어서
   437 이 갱신을 안 하고 지나갔다(그 상태의 게이트는 «테두리가 6 으로 되돌아가도» 초록이다). */
const SHELL_B = 7;          /* 셸 테두리 — 이 검정 하나가 닿는 면의 전부다 */
/* 450 이관 (2026-08-30) — 셸 **안쪽 어두운 립** 1.5px. 상·좌·우 세 면에만 있고, 활성 알약이
   닿는 면에서는 알약이 덮는다 ⇒ 이 게이트의 세 갈래가 그대로 «립의 있고 없음» 을 가른다:
     [2] 닿는 면 = SHELL_B (립은 알약 밑) · [4] 안 닿는 바 변 = SHELL_B + LIP · [3] 알약 면 = PILL_B.
   ⚠ 립 경계가 반화소라 검정 런 다음에 **보간 한 칸**(#382F25)이 낀다 — 림을 찾을 때 한 칸 건너뛴다. */
const LIP = 1.5;
const PILL_B = 7;           /* 안 닿는 알약 면의 검정 */
const BEVEL = '#634F37';    /* 알약 베벨 (352 6회차) */
const PILL_FACE = '#4B3E2D';
const RIM = '#705F4B';      /* 셸 안쪽 밝은 림 (352 ⓓ) */
const SHELL_FACE = '#61523D';

/* 378 이전 선언 — §R 되돌림 시험이 도로 주입한다.
   ⚑ 409 이관 (2026-08-29) — 검정은 이제 밴드가 아니라 `::after` 의 **등폭 링**이고, 끝 칸에서
   그 면을 비우는 손잡이가 하나 더 생겼다(`--pill-mask` = 링이 붙는 기둥). 되돌림은 **두 손잡이를
   같이** 되돌려야 «378 이전 그림»이다 — 하나만 되돌리면 «밴드는 왔는데 링은 없는» 적 없던 상태를
   되살린 뒤 그 위에서 채점하게 된다. */
const OLD_CSS = '.stabs.sp2>.stab.on:nth-of-type(1),.stabs.sp3>.stab.on:nth-of-type(1),'
  + '.stab.on.stab-c1{--pill-l:inset 7px 0 0 #000,inset 14px 0 0 #634F37;'
  + '--pill-mask:linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))}'
  + '.stabs.sp2>.stab.on:nth-of-type(2),.stabs.sp3>.stab.on:nth-of-type(3),'
  + '.stab.on.stab-c4{--pill-r:inset -7px 0 0 #000,inset -14px 0 0 #634F37;'
  + '--pill-mask:linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))}';

/* 호스트 — verify352/probe378 과 같은 진입 경로. 끝 칸을 강제로 활성으로 만들어 잰다.
   ⚠ 23 훈련(#trSubs)은 renderUI() 가 매 틱 `.on` 을 상태에서 다시 그려 주입이 되돌려진다 —
      **자연 활성 칸이 이미 끝 칸(칸1)** 이므로 그 자리만 잰다(강제 없음). */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }, [0, 3]],
  ['06 장비', '#eqTabs', () => heroSubGo('eq'), [0, 3]],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }, [0, 2]],
  ['10 상점', '#shopCats', () => openShopPage(), [0, 2]],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, [null]],
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d === undefined ? '' : ' — ' + d)); }
  else { fail++; console.log('  FAIL ' + n + (d === undefined ? '' : ' — ' + d)); } };
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const chan = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const close = (a, b, tol) => chan(a).every((v, i) => Math.abs(v - chan(b)[i]) <= tol);

function runs(cols) {
  const out = [];
  for (const c of cols) {
    if (out.length && close(out[out.length - 1].hex, c, 6)) { out[out.length - 1].n++; continue; }
    out.push({ hex: c, n: 1 });
  }
  return out;
}
const fmt = rs => rs.slice(0, 4).map(r => r.hex + '×' + r.n).join(' → ');
/* 검정 런 — 바깥 가장자리 1px 보간(#0F0D0B)은 검정으로 세지 않되 앞에 붙는 것은 허용한다 */
const blackRun = rs => {
  const i = rs.findIndex(r => close(r.hex, '#000000', 8));
  return i < 0 ? { n: 0, at: -1, next: rs[0] } : { n: rs[i].n, at: i, next: rs[i + 1] };
};

async function readRow(page, y, xs) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, yy, xx]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(xx.map(x => {
        const d = g.getImageData(x, yy, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, y, xs]);
}

/* 967 — `SETON` 은 **선언째 지웠다**(402 «사본을 지운다» · 963 «남기면 다음 세션이 다시 두 evaluate 로 쓴다»).
   심는 손잡이는 공용 부품 `__stab967.set`(`tools/stab967.js`) 하나이고, 그것은 아래 `READBACK`
   **안에서** 불린다 — 그래서 «켜기 → 읽기» 가 구조적으로 한 틱이다(967 · 963 이관). */

/* ⚑ 967 — `i` 를 넘기면 켜기를 겸한다(생략 = 읽기만 · 자연 활성 호스트가 그렇게 쓴다). */
const READBACK = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  if (i != null && window.__stab967.set(sel, i) === -2) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const idx = cells.findIndex(c => c.classList.contains('on'));
  if (idx < 0) return null;
  const bb = bar.getBoundingClientRect(), ob = cells[idx].getBoundingClientRect();
  return {
    bar: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
    cell: { x: ob.x, w: ob.width },
    border: parseFloat(getComputedStyle(bar).borderLeftWidth),
    n: cells.length, idx,
    label: (cells[idx].querySelector('i') || {}).textContent || '',
    shadow: getComputedStyle(cells[idx]).boxShadow,
  };
};

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* 한 (호스트, 칸) 을 재서 면별 런렝스를 돌려준다. 캡처는 **한 장**이고 그 앞뒤로 되읽기를 한다 —
   여러 장 찍으면 renderUI() 가 그 사이에 `.on` 을 되돌려 «다른 칸 그림» 을 재게 된다. */
async function measure(page, sel, i) {
  /* 967 — 켜기와 읽기가 **한 evaluate** 다. 전에는 `SETON` → 200ms → `SETTLE` → `READBACK` 이라
     그 사이가 틱 경계였고, 제품이 그 바를 소유하면 심은 활성이 그 틈에 되돌려진다(963). */
  const g = await page.evaluate(READBACK, [sel, i]);
  if (!g || (i != null && g.idx !== i)) return null;
  const y = Math.round(g.bar.y + g.bar.h / 2);
  const x0 = Math.round(g.bar.x), x1 = Math.round(g.bar.x + g.bar.w) - 1;
  const p0 = Math.round(g.cell.x), p1 = Math.round(g.cell.x + g.cell.w) - 1;
  const all = await readRow(page, y, [
    ...Array.from({ length: 24 }, (_, k) => x0 + k),
    ...Array.from({ length: 24 }, (_, k) => x1 - k),
    ...Array.from({ length: 20 }, (_, k) => p0 + k),
    ...Array.from({ length: 20 }, (_, k) => p1 - k),
  ]);
  /* 967 — 캡처는 틱을 넘길 수밖에 없다(핀도 16ms 창이 남는다) ⇒ **캡처 직후 되읽어** 그 사이
     활성이 안 바뀌었는지 본다. 어긋나면 값을 안 쓰고 null 로 신고한다(부른 쪽이 빨간 점수 줄을 낸다). */
  const g2 = await page.evaluate(READBACK, [sel]);
  if (!g2 || g2.idx !== g.idx) return null;
  const cL = g.bar.x + g.border, cR = g.bar.x + g.bar.w - g.border;
  return {
    g,
    touchL: Math.abs(g.cell.x - cL) <= 0.6,
    touchR: Math.abs(g.cell.x + g.cell.w - cR) <= 0.6,
    barL: runs(all.slice(0, 24)), barR: runs(all.slice(24, 48)),
    pillL: runs(all.slice(48, 68)), pillR: runs(all.slice(68, 88)),
  };
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto('file://' + path.resolve(process.env.V378_SRC || path.join(ROOT, 'index.html')));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });

    /* ---- 1. 선언 — 좌·우 밴드가 «면별 손잡이»(변수) 로 갈라져 있다 ---- */
    console.log('\n[1] 선언 — 알약의 좌·우 밴드가 면별로 갈라져 있다 (box-shadow 는 면별 선언이 없다)');
    const decl = await page.evaluate(() => {
      const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (_) { return []; } })
        .map(r => r.cssText || '').join('\n');
      return {
        vars: /\.stab\.on\s*\{[^}]*--pill-l:[^}]*--pill-r:/.test(css.replace(/\n/g, ' ')),
        /* 409 11회차 이관 (2026-08-31) — 부모 `box-shadow` 첫 항에 **바닥 띠**(`#413122`)가 한 겹
           올라갔다(옆띠가 아래 코너를 감고 올라와 만들던 «밝은 쐐기» 를 덮는다 — 409 §20).
           ⚠ **«var 둘이 있기만 하면 초록» 으로 풀지 않았다** — 조립식을 통째로 못박아,
              면별 손잡이를 빼도 **바닥 띠를 빼도** 빨개진다. */
        uses: /box-shadow:\s*inset 0 -7px 0 #413122,\s*var\(--pill-l\),\s*var\(--pill-r\)/.test(css),
        /* 409 이관 — 검정이 밴드에서 링으로 옮겨 갔으므로 «면별 손잡이» 도 하나 더다.
           이 항이 없으면 링을 통째로 지워도 [1] 이 초록이다(끝 칸 면은 원래 검정 0 이라 [2] 도 안 문다). */
        mask: /--pill-mask:\s*linear-gradient\(90deg,\s*transparent 0 calc\(100% - 30px\)/.test(css)
          && /--pill-mask:\s*linear-gradient\(90deg,\s*#000 0 30px,\s*transparent 30px\)/.test(css),
        endL: /--pill-l:\s*inset 7px 0px 0px #634F37|--pill-l:\s*inset 7px 0 0 #634F37/i.test(css),
        endR: /--pill-r:\s*inset -7px 0px 0px #634F37|--pill-r:\s*inset -7px 0 0 #634F37/i.test(css),
        raw: css.length,
      };
    });
    ok('`.stab.on` 이 좌·우 밴드를 변수 둘로 갖는다', decl.vars);
    ok('`box-shadow` = 바닥 띠 한 겹 + 그 변수 둘 (409 11회차 이관)', decl.uses);
    ok('끝 칸 좌 override — `--pill-l` 이 베벨 7 (검정 0)', decl.endL);
    ok('끝 칸 우 override — `--pill-r` 이 베벨 7 (검정 0)', decl.endR);
    ok('끝 칸 override 가 **검정 링 기둥**도 뺀다 (409 이관 — 손잡이 둘을 같이 옮긴다)', decl.mask);

    /* ---- 2·3·4. 찍힌 픽셀 ---- */
    console.log('\n[2] 찍힌 픽셀 — 셸에 «닿는» 면: 검정 ' + SHELL_B + ' (셸 테두리뿐) → 베벨 ' + BEVEL);
    console.log('[3] 양성 대조 — 셸에 «안 닿는» 알약 면: 검정 ' + PILL_B + ' 그대로 (측정표 07 §9)');
    console.log('[4] 음성 대조 — 알약이 없는 바 변: 셸 검정 ' + SHELL_B + ' + 립 ' + LIP
      + ' → 림 ' + RIM + ' (450 — 립은 알약이 안 덮는 면에만 보인다)\n');
    let touched = 0;
    const snap = {};
    for (const [name, sel, setup, idxs] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { ok(name + ' 진입', false, e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      for (const i of idxs) {
        const m = await measure(page, sel, i);
        if (!m) { ok(name + ' 칸' + (i == null ? '(자연 활성)' : i + 1) + ' 측정', false, '활성 주입이 되돌려졌다'); continue; }
        snap[name + '#' + m.g.idx] = m;
        const tag = name + ' 칸' + (m.g.idx + 1) + '«' + m.g.label + '»';
        for (const [side, touch, bar, pill] of [['좌', m.touchL, m.barL, m.pillL], ['우', m.touchR, m.barR, m.pillR]]) {
          const b = blackRun(bar);
          if (touch) {
            touched++;
            ok('[2] ' + tag + ' ' + side + ' — 닿는 면 검정 = 셸 테두리 ' + SHELL_B + ' (겹침 0)',
              Math.abs(b.n - SHELL_B) <= 1, '검정 ' + b.n + 'px : ' + fmt(bar));
            ok('[2] ' + tag + ' ' + side + ' — 그 다음이 알약 베벨 ' + BEVEL,
              !!b.next && close(b.next.hex, BEVEL, 8), b.next ? b.next.hex + '×' + b.next.n : '없음');
          } else {
            const rimNext = b.next && close(b.next.hex, RIM, 8) ? b.next
              : (b.next && b.next.n <= 1 ? bar[b.at + 2] : null);   /* 450 — 보간 한 칸 건너뛴다 */
            ok('[4] ' + tag + ' ' + side + ' — 알약 없는 바 변: 셸 검정 ' + SHELL_B + ' + 립 ' + LIP
              + ' → 림 ' + RIM,
              Math.abs(b.n - (SHELL_B + LIP)) <= 1 && !!rimNext && close(rimNext.hex, RIM, 8),
              '검정 ' + b.n + 'px : ' + fmt(bar));
            const p = blackRun(pill);
            ok('[3] ' + tag + ' ' + side + ' — 안 닿는 알약 면은 검정 ' + PILL_B + ' 유지',
              p.n + (p.at > 0 ? 1 : 0) >= PILL_B - 1 && p.n <= PILL_B + 1
              && !!p.next && close(p.next.hex, BEVEL, 8),
              '검정 ' + p.n + 'px : ' + fmt(pill));
          }
        }
      }
    }
    ok('닿는 면을 실제로 재긴 했다 (표본 ≥ 8)', touched >= 8, touched + '면');

    /* ---- R. 되돌림 시험 ---- */
    console.log('\n[R] 되돌림 시험 — 378 이전 선언을 도로 주입하면 닿는 면이 13px 로 돌아가야 한다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(800);
    await page.evaluate(SETTLE);
    const before = await measure(page, '#eqTabs', 0);
    ok('R0 전제 — 06 장비 칸1 좌변이 셸에 닿는다', !!before && before.touchL,
      before ? '닿음 ' + before.touchL : '측정 실패');
    ok('R1 지금은 검정 ' + SHELL_B, !!before && Math.abs(blackRun(before.barL).n - SHELL_B) <= 1,
      before ? blackRun(before.barL).n + 'px : ' + fmt(before.barL) : '—');

    const tagId = await page.evaluate(css => {
      const s = document.createElement('style'); s.id = 'v378old'; s.textContent = css;
      document.head.appendChild(s); return true;
    }, OLD_CSS);
    const rev = tagId ? await measure(page, '#eqTabs', 0) : null;
    ok('R2 378 이전 선언을 주입하면 검정이 13px 로 돌아간다 (게이트가 실제로 잡는다)',
      !!rev && blackRun(rev.barL).n >= 12, rev ? blackRun(rev.barL).n + 'px : ' + fmt(rev.barL) : '—');
    /* 되돌려도 «안 닿는 면» 은 그대로여야 한다 — 두 갈래가 서로 독립임을 못박는다 */
    ok('R3 되돌려도 안 닿는 우변(알약 면)의 검정 ' + PILL_B + ' 은 그대로',
      !!rev && Math.abs(blackRun(rev.pillR).n + (blackRun(rev.pillR).at > 0 ? 1 : 0) - PILL_B) <= 1,
      rev ? fmt(rev.pillR) : '—');

    await page.evaluate(() => { const s = document.getElementById('v378old'); if (s) s.remove(); });
    const back = await measure(page, '#eqTabs', 0);
    ok('R4 주입을 걷으면 다시 ' + SHELL_B + 'px', !!back && Math.abs(blackRun(back.barL).n - SHELL_B) <= 1,
      back ? blackRun(back.barL).n + 'px : ' + fmt(back.barL) : '—');

    console.log('\n[5] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 80) : ''));
  } finally { await browser.close(); }

  console.log('\nVERIFY378 ' + pass + '/' + (pass + fail) + '  ' + (fail ? 'FAIL ' + fail : 'ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
