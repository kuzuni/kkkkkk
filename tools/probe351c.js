#!/usr/bin/env node
/* 351c 프로브 — «덮임» 축 둘(E1·E3). 6회차 신설.
 *
 * 실행: node tools/probe351c.js [--only <라벨조각>] [--json <경로>]
 *
 * 왜 또 새 자인가 (5회차가 D7 을 신설한 것과 정확히 같은 이유):
 *   6회차에 비평가 6명(BY·BZ·CA·CB·CC·CD)이 r5 캡처를 채점했는데, 넷 이상이 «각자 1순위» 로
 *   짚은 자리를 `probe351` 이 **한 건도 못 냈다**. 원리적으로 못 본다 —
 *     · D7 의 «고정 내비» 목록이 **`#tabbar` 와 `.pedge` 둘뿐**이다. 좌측 사이드 레일(`.side .ibtn`)·
 *       우상단 `#menub` 은 목록에 없어서, 시트가 그것들을 통째로 덮어도 자는 조용하다.
 *     · D6(포인터)은 딤이 2280 에서도 막으므로 **차분에서 소거된다**(5회차가 D7 을 만든 그 이유).
 *
 * 재는 법의 핵심은 `elementsFromPoint`(복수형)다 — 그 점에 쌓인 스택을 통째로 돌려주므로
 * **딤(alpha<.9)은 통과시키고 불투명 상자만** 셀 수 있다. 채점 규칙 «딤은 감점 아님 / 상자가
 * 고정 내비를 덮으면 감점» 이 그대로 자가 된다.
 *
 *   E1 조작 덮임 — 불투명 상자가 **고정 조작 요소**(사이드 레일 · ▦ 메뉴 · 탭바 탭 · 좌하단 유틸)를 덮는다 (ⓑ·ⓓ)
 *   E3 잉크 충돌 — 배경 없는 **글자줄 둘이 서로 겹쳐** 양쪽 다 못 읽는다                              (ⓒ)
 *
 * ⚑ **첫 판에 유령 546건을 내고 축 하나를 통째로 버렸다 — 그것이 이 자의 교훈이다.**
 *   버린 것은 «불투명 상자가 남의 글자 잉크를 덮는다»(E2, 366건) 였다. 팝업이 열리면 배경 글자는
 *   덮이는 것이 정상이고, **짧은 프레임에서 더 많이 덮이는 것은 «짧다» 의 정의**이지 결함이 아니다
 *   (그래서 차분이 소거해 주지도 않는다 — 2280 에서는 덜 덮으니 1600 쪽에만 남는다).
 *   채점 규칙이 이미 그 선을 그어 뒀다: 감점은 **«고정 내비·고정 조작 요소»** 를 덮을 때뿐이다.
 *   ⇒ 대상을 규칙이 말한 그 목록으로 좁혔다. 546 → 아래 결과.
 *
 * E1 의 판정은 key 차분이 아니라 **같은 조작 요소의 덮임 %를 두 해상도에서 재서 뺀다**(Δ≥25pp).
 *   왜: 덮는 상자가 해상도마다 다른 노드일 수 있어(시트 헤더 ↔ 시트 본문) key 차분이 «다른 결함»
 *   으로 갈라 놓는다. 묻는 것은 «누가 덮었나» 가 아니라 «이 버튼이 1600 에서 더 덮이나» 다.
 * E3 은 key 차분이되, **양쪽 글자줄이 지금 실제로 보이는 것**일 때만 센다(불투명 상자에 덮인
 *   배경 글자끼리의 겹침은 사람에게 안 보인다 — 첫 판 유령 113건의 태반이 그것이었다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

/* 화면 목록·진입·정착·기준 해상도는 probe351 과 **같은 한 벌**을 쓴다(385 «자매 자 드리프트» 예방). */
const { collectOpeners, drive, fresh, settle, TALL, SHORT } = require('./probe351lib');

const DELTA = 25;   /* E1 — 덮임 %가 1600 에서 이만큼(pp) 이상 늘면 결함 */

const SCAN = function () {
  const app = document.getElementById('app');
  if (!app) return { defects: [], cov: {} };
  const A = app.getBoundingClientRect();
  const out = [];
  const seen = new Set();

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  const pathOf = (el) => {
    const bits = [];
    for (let e = el; e && e !== document.body && bits.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { bits.unshift('#' + e.id); break; }
      const c = (e.className && typeof e.className === 'string') ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      bits.unshift(c ? s + '.' + c : s);
    }
    return bits.join('>');
  };
  const push = (kind, el, detail) => {
    const key = kind + '|' + pathOf(el) + '|' + detail.k;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, path: pathOf(el), key, ...detail });
  };

  /* 클리핑을 접은 «지금 실제로 그려지는» 상자 — D7 이 유령 때문에 배운 것과 같다.
     ⚠ 여기서는 스크롤 그릇을 «건너뛰지 않는다». 이 자가 묻는 것은 «지금 화면에서 덮였나» 이고,
     스크롤로 올려서 볼 수 있는지는 ⓐ(D5)의 질문이지 ⓑⓒ 의 질문이 아니다. */
  const drawnRect = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    d.w = d.x2 - d.x1; d.h = d.y2 - d.y1;
    return d;
  };
  const alphaOf = (el) => {
    const m = (getComputedStyle(el).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map((s) => parseFloat(s));
    return p.length > 3 ? p[3] : 1;
  };
  const related = (a, b) => a === b || a.contains(b) || b.contains(a);

  /* 이 점에서 el 위에 **불투명하게** 얹힌 것이 있는가.
     `elementsFromPoint` 는 위→아래 순서로 스택을 준다 ⇒ el 을 만나기 전에 나온 것이 «위» 다. */
  const coverAt = (el, x, y) => {
    for (const h of document.elementsFromPoint(x, y)) {
      if (related(h, el)) return null;                  /* 자기(또는 부모/자식)를 만났다 = 위엔 없다 */
      if (h.classList && h.classList.contains('dim')) continue;   /* 딤은 규칙상 감점 아님 */
      if (alphaOf(h) >= 0.9) return h;
    }
    return null;
  };
  const coverPct = (el, r) => {
    if (!(r.w > 3 && r.h > 3)) return null;
    let hit = 0, tested = 0; const who = new Map();
    for (const fx of [0.12, 0.3, 0.5, 0.7, 0.88]) for (const fy of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const x = r.x1 + r.w * fx, y = r.y1 + r.h * fy;
      if (x < A.left + 0.5 || x > A.right - 0.5 || y < A.top + 0.5 || y > A.bottom - 0.5) continue;
      tested++;
      const h = coverAt(el, x, y);
      if (h) { hit++; who.set(h, (who.get(h) || 0) + 1); }
    }
    if (tested < 8) return null;
    let by = null, best = 0;
    for (const [h, n] of who) if (n > best) { best = n; by = h; }
    return { pct: Math.round(100 * hit / tested), by: by ? pathOf(by) : null, tested };
  };

  /* ── E1 — 불투명 상자가 «고정 조작 요소» 를 덮는다 (덮임 %를 그대로 돌려준다) ─────────
     D7 의 nav 목록에 없어서 통째로 안 보이던 자리다. 대상은 «화면이 바뀌어도 늘 같은 자리에
     있는 조작 요소». 판정(Δ)은 두 해상도를 다 잰 뒤 러너가 한다. */
  const CONTROLS = '.side .ibtn, #menub, #tabbar .tab, #botleft .ubtn';
  const cov = {};
  for (const el of app.querySelectorAll(CONTROLS)) {
    if (!vis(el)) continue;
    const r = drawnRect(el);
    /* 프레임 밖으로 밀려나 «그려지지 않는» 버튼은 덮임이 아니라 잘림이다(D1·D4 몫). */
    if (!(r.w > 3 && r.h > 3)) continue;
    const c = coverPct(el, r);
    if (!c) continue;
    const k = pathOf(el) + '#' + (el.dataset.pop || el.dataset.t || el.dataset.util || el.id || '');
    cov[k] = { pct: c.pct, by: c.by };
  }

  /* ── E3 — 배경 없는 «글자줄 둘» 이 서로 겹쳐 양쪽 다 못 읽는다 ──────────────────────
     E1 은 «불투명 상자» 를 전제한다. 배경이 아예 없는 글자줄 둘이 포개지면 스택에 불투명한 것이
     없어 조용하고, 그러면서 사람 눈에는 가장 심하게 깨진다(하단 앵커 문구가 상단 앵커 카드
     안으로 빨려 들어가는 자리). ⇒ 잉크 상자끼리 직접 잰다.
     ⚠ **양쪽이 지금 실제로 보이는 것일 때만 센다** — 팝업 뒤에 가려진 배경 글자끼리의 겹침을
       세면 첫 판처럼 유령이 쏟아진다(그건 사람에게 안 보인다). */
  const textLeaves = [];
  for (const el of app.querySelectorAll('*')) {
    if (!vis(el)) continue;
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    if (!t.trim()) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 11) continue;
    const r = drawnRect(el);
    if (!(r.w > 8 && r.h > 8) || r.w * r.h > 300000) continue;
    if (alphaOf(el) >= 0.9) continue;                    /* 배경이 있으면 그것은 상자다(E1 의 몫) */
    /* 지금 보이나 — 중심이 불투명한 남에게 덮여 있으면 뺀다 */
    if (coverAt(el, (r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2)) continue;
    textLeaves.push({ el, r, txt: t.trim().slice(0, 14) });
  }
  for (let i = 0; i < textLeaves.length; i++) {
    for (let j = i + 1; j < textLeaves.length; j++) {
      const a = textLeaves[i], b = textLeaves[j];
      if (related(a.el, b.el)) continue;
      const ox = Math.min(a.r.x2, b.r.x2) - Math.max(a.r.x1, b.r.x1);
      const oy = Math.min(a.r.y2, b.r.y2) - Math.max(a.r.y1, b.r.y1);
      if (ox <= 0 || oy <= 0) continue;
      const small = Math.min(a.r.w * a.r.h, b.r.w * b.r.h);
      if (small <= 0) continue;
      const pct = Math.round(100 * ox * oy / small);
      if (pct < 30) continue;
      push('E3', a.el, { k: 'ovl:' + pathOf(b.el), pct, txt: a.txt + ' ↔ ' + b.txt });
    }
  }

  return { defects: out, cov };
};

(async () => {
  const browser = await launch(chromium);
  const results = [];
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    console.log(`[351c] 화면 ${openers.length}개 × 2해상도 — 덮임 축 E1(Δ≥${DELTA}pp) · E3`);

    for (const o of openers) {
      const scan = async ([w, h]) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        await settle(page);
        const r = await page.evaluate(SCAN).catch((e) => ({ defects: [], cov: {}, err: String(e.message || e) }));
        await ctx.close();
        return r;
      };
      const tall = await scan(TALL);
      const short = await scan(SHORT);

      /* E1 — 같은 조작 요소의 덮임 %를 뺀다. 2280 에 없던 요소는 판정하지 않는다
         (기준선이 없으면 «침범 없음» 이 아니라 «판정 불가» — LESSONS 351-④ 의 짝). */
      const regress = [];
      for (const k of Object.keys(short.cov)) {
        if (!(k in tall.cov)) continue;
        const d = short.cov[k].pct - tall.cov[k].pct;
        if (d < DELTA) continue;
        regress.push({ kind: 'E1', path: short.cov[k].by || '?', key: 'E1|' + k,
          k: 'hides:' + k, pct: short.cov[k].pct, was: tall.cov[k].pct, d });
      }
      const tallKeys = new Set(tall.defects.map((d) => d.key));
      for (const d of short.defects) if (!tallKeys.has(d.key)) regress.push(d);

      results.push({ label: o.label, regress });
      const mark = regress.length ? `⚠ ${regress.length}` : '·';
      console.log(`  ${mark.padEnd(5)} ${o.label.padEnd(22)} 조작 ${Object.keys(short.cov).length}개`);
      for (const d of regress.slice(0, 8)) {
        console.log(`        ${d.kind} ${d.path} ${JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !['kind', 'path', 'key'].includes(k))))}`);
      }
    }
  } finally { await browser.close(); }

  const tot = results.reduce((a, r) => a + r.regress.length, 0);
  const bad = results.filter((r) => r.regress.length);
  console.log(`\n[351c] 1600 에서만 생긴 «덮임» ${tot}건 · 화면 ${bad.length}/${results.length}`);
  const byKind = {};
  for (const r of results) for (const d of r.regress) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
  console.log('  종류별: ' + (Object.keys(byKind).length ? Object.entries(byKind).map(([k, v]) => `${k}=${v}`).join(' · ') : '없음'));
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(results, null, 1)); console.log('  JSON → ' + JSONOUT); }
  process.exit(0);
})().catch((e) => { console.error('PROBE351C CRASH', e); process.exit(2); });
