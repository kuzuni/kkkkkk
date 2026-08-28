/* 작업 335 — 03 던전 팝업 «서브탭 블록» 기하 실측 (레이아웃 폴리시)
 *
 *   node tools/m335.js
 *
 * 72 의 ①~④ 를 6 에 묶고 있는 것이 이 블록이라는 것이 17회차 4인 비평가 일치 판정이다
 * (`docs/review/72-던전카드썸네일.md` §32). 그 감점 다섯 줄이 각각 **어느 CSS 값**에서 나오는지
 * 를 «캡처를 눈으로 보고» 가 아니라 getBoundingClientRect 로 못박아 두는 자다.
 *
 * 좌표계: 프레임 1080x2280. 레퍼런스(1080x2340) 와의 변환은 **y_frame = y_ref − 84** 하나뿐이다
 * (ROUTINE [2]). 그래서 아래 표의 «ref» 칸은 측정표 03 §4 실측치에서 84 를 뺀 값이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* ⚠ **앵커가 둘이다.** 이것이 72 15~17회차 비평가 넷이 이 블록에서 «+34px 하향» 같은 유령을 본 이유다.
   ROUTINE [2] 의 «y − 84» 는 **상단 앵커 요소**의 변환이고, 하단에 붙는 요소(탭바·서브탭 바)는
   ref 2340 ↔ cap 2280 이므로 **cap_y = ref_y − 60** 이다(측정표 12 §10 이 이미 쓰고 있는 규약).
   비평가에게는 «−84» 만 알려 주므로 하단 앵커 요소는 자동으로 +24 어긋나 보인다 — 감점이 아니다.
   두 앵커의 차 24px 은 **카드 리스트 하단 ↔ 바 상변 이음매**에 고이고, 그것만이 실재하는 결함이었다.

   측정표 docs/measure/03-던전팝업.md §4 · 부록A (ref 1080x2340) */
const REF = {
  /* ── 하단 앵커(−60) ── */
  barTop: 2021 - 60,      /* 1961 — 상단 추정(카드5 하단 테두리와 맞붙어 분리 불가) */
  barVisTop: 2029 - 60,   /* 1969 — 픽셀로 확정 가능한 가시 상단 */
  barBottom: 2118 - 60,   /* 2058 */
  barH: 98,
  barX: 151, barW: 794, barRight: 944,
  barCx: 547.5,           /* 화면중심 539.5 대비 +8 (레퍼런스 비대칭) */
  tabbarTop: 2160 - 60,   /* 2100 */
  gapBarToTabbar: 41,
  /* 활성 칸(«던전») — 96 이 칸을 2등분으로 바꿨으므로 «칸 폭» 은 대조 대상이 아니다(정오표).
     높이는 «바 안쪽» 이다: ref 알약은 검정 테두리 2021~2026 / 2112~2117 **사이**를 꽉 채운다
     = 2027~2111 = 85px (`scan335.py` ref @x=734 단면으로 확인). 우리 `.stabs>*{height:85px}` 과 같다. */
  pillH: 85,
  /* ── 상단 앵커(−84) ── */
  card1Top: 241 - 84,     /* 157 */
  card5Bottom: 2030 - 84, /* 1946 */
  /* ── 이음매 ── 레퍼런스는 카드 검정 하변(8px)과 바 검정 상변(6px)이 같은 자리에서 겹친다.
     리스트의 «클립선» 이 바 상변에 닿아 있어야 한다는 뜻이라 대조 대상은 리스트 하단선이다. */
  gapListToBar: 0,
};

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1400);

    /* 03 던전 페이지 진입 — cap72 와 같은 경로(하단 탭 «던전»). 레퍼런스와 같은 2해금·3잠금 상태.
       토스트·연출 파티클은 bbox 를 흔들므로 끈다(LESSONS 30-②). */
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
    await page.waitForTimeout(900);

    const m = await page.evaluate(() => {
      const rr = s => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
                 r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), cx: +((b.x + b.right) / 2).toFixed(1) }; };
      const cs = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; };
      const cards = [...document.querySelectorAll('#dunList .dnc')].map(e => {
        const b = e.getBoundingClientRect();
        return { y: +b.y.toFixed(1), b: +b.bottom.toFixed(1), h: +b.height.toFixed(1) };
      });
      const on = document.querySelector('#dunSub .stab.on');
      return {
        dunw: rr('#dunw'),
        list: rr('#dunList'),
        bar: rr('#dunSub'),
        barPad: cs('#dunSub', 'padding') + ' | border ' + cs('#dunSub', 'borderTopWidth'),
        barH: cs('#dunSub', 'height'),
        tabs: [...document.querySelectorAll('#dunSub .stab')].map(e => {
          const b = e.getBoundingClientRect();
          return { cls: e.className, x: +b.x.toFixed(1), y: +b.y.toFixed(1),
                   w: +b.width.toFixed(1), h: +b.height.toFixed(1), b: +b.bottom.toFixed(1) };
        }),
        onH: on ? +on.getBoundingClientRect().height.toFixed(1) : null,
        /* 레퍼런스는 던전이 5장이라 «카드5» 가 마지막이지만 우리는 8장이라 스크롤한다 —
           마지막 카드가 아니라 **5번째** 를 봐야 레퍼런스와 같은 자리다. */
        cards, card5: cards[4] || null,
        tabbar: rr('#tabbar') || rr('.tabbar') || rr('#appTabs'),
      };
    });

    const line = (k, got, ref, unit) => {
      const d = (got == null || ref == null) ? null : +(got - ref).toFixed(1);
      const flag = d == null ? '  ?' : (Math.abs(d) <= 1 ? '  ✔' : '  ✘');
      console.log(`${flag} ${k.padEnd(34)} 현재 ${String(got).padStart(8)}   ref ${String(ref).padStart(8)}   Δ ${d == null ? '—' : (d > 0 ? '+' : '') + d}${unit || 'px'}`);
    };

    console.log('── 335 실측 (프레임 1080x2280 · ref 는 03 측정표 §4 의 y−84) ──');
    console.log('#dunw   ', JSON.stringify(m.dunw));
    console.log('#dunList', JSON.stringify(m.list));
    console.log('#dunSub ', JSON.stringify(m.bar), '| css height', m.barH);
    console.log('탭 칸   ', JSON.stringify(m.tabs));
    console.log('탭바    ', JSON.stringify(m.tabbar));
    console.log('카드    ', JSON.stringify(m.cards));
    console.log('');
    line('① 바 상변 y  (하단 앵커 −60)', m.bar && m.bar.y, REF.barTop);
    line('   바 하변 y  (하단 앵커 −60)', m.bar && m.bar.b, REF.barBottom);
    line('② 바 높이', m.bar && m.bar.h, REF.barH);
    line('③ 활성 알약 높이 (바 안쪽)', m.onH, REF.pillH);
    line('④ 리스트 하단선 ↔ 바 상변 간격',
      (m.bar && m.list) ? +(m.bar.y - m.list.b).toFixed(1) : null, REF.gapListToBar);
    line('⑤ 바 중심 x', m.bar && m.bar.cx, REF.barCx);
    line('   바 좌변 x', m.bar && m.bar.x, REF.barX);
    line('   바 폭', m.bar && m.bar.w, REF.barW);
    line('   바 하변 ↔ 탭바 상변', (m.bar && m.tabbar) ? +(m.tabbar.y - m.bar.b).toFixed(1) : null, REF.gapBarToTabbar);
    line('   탭바 상변 y  (하단 앵커 −60)', m.tabbar && m.tabbar.y, REF.tabbarTop);
    line('   카드1 상변 y (상단 앵커 −84)', m.cards[0] && m.cards[0].y, REF.card1Top);
    line('   카드5 하변 y (상단 앵커 −84)', m.card5 && m.card5.b, REF.card5Bottom);
  } finally { await browser.close(); }
})();
