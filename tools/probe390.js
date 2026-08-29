#!/usr/bin/env node
/* 390 재현기 — «공용 모달의 띠 상수가 실제로 쓸 수 있는 띠가 아니다» 를 자로 찍는다.
 *
 * 실행: node tools/probe390.js  [--json <경로>]
 *
 * 왜 probe351 만으로는 모자란가(338 규칙 «처방 전에 재현»):
 *   `probe351` D7 은 «침범했다/안 했다» 와 겹침 px 만 낸다 — 고치려면 **누가 띠를 정하는가**
 *   (어느 선언의 어느 값이 그 상변·하변을 만들었는가)를 알아야 하는데 D7 은 그것을 안 낸다.
 *   그래서 이 자는 오버레이별로 **패딩(선언) → 상자(결과) → 띠(금지구역)** 셋을 나란히 찍는다.
 *
 * 띠의 정의(351 4회차가 못박은 값 — verify351 §2·§4·§5 와 같은 축):
 *   위  = HUD 잉크 끝 `.pedge` 하변 (2280·1600 모두 **142**)
 *   아래 = 하단 탭바 상변 (`#tabbar`. 1600 에서 **1420** = 1600 − 180)
 *   ⚠ 기준선을 못 찾으면 «침범 없음» 이 아니라 **판정 불가**로 찍는다(LESSONS 351-④).
 *
 * 판정(1600 에서만 — 2280 은 Δ0 대조군이다):
 *   T  상자 상변 ≥ pedge 하변      · B  상자 하변 ≤ 탭바 상변
 *   ⚠ 반대급부도 같이 찍는다 — 「띠를 넓혀 상자를 눌러 본문을 자르는」 것을 막으려면
 *      **상자 높이**와 **본문 넘침(scrollH − clientH)** 을 같이 봐야 한다(351-③ «이중 차감»).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

/* 재는 화면 — 390 의 스코프(공용 `#modal` · 21 도감 `#collw`)와 **대조군**을 같이 둔다.
   대조군이 없으면 «전부 움직였다» 와 «고쳐야 할 것만 움직였다» 가 안 갈린다. */
const SCREENS = [
  { label: 'quest:22',  box: '#modal .mbox',      body: '#modal .mbody', o: { sel: '.side .ibtn[data-pop="quest"]' },  note: '공용 #modal — 상한에 걸린 큰 상자(D7 대상)' },
  { label: 'plain:pop', box: '#modal .mbox',      body: '#modal .mbody', o: { fn: "popup('안내','<p>한 줄</p>')" },   note: '공용 #modal — 상한에 안 걸린 작은 상자(가운데 정렬)' },
  { label: 'skill:08',  box: '#modal.sk8 .mbox',  body: '#modal.sk8 .mbody', o: { fn: 'showSkillDetail(SKILLS[0].id)' }, note: '.sk8 — 자기 상단 패딩 132 를 갖는다' },
  { label: 'mail:69',   box: '#modal.ml69 .mbox', body: '#modal.ml69 .mbody', o: { mn: 'mail' },                      note: '.ml69 — 351 4회차가 이미 갈라 둔 자리(Δ0 이어야 한다)' },
  { label: 'attend:70', box: '#modal.at70 .mbox', body: '#modal.at70 .mbody', o: { sel: '.side .ibtn[data-pop="attend"]' }, note: '.at70 — 자기 상단 패딩 159 를 갖는다' },
  { label: 'coll:21',   box: '#collw .cl',        body: '#collw .cl-body',    o: { sel: '.side .ibtn[data-pop="coll"]' }, note: '#collw — 자기 오버레이(translateY −42)' },
];

/* ⚠ page.evaluate 는 인자를 **하나**만 넘긴다 — 배열로 받아 푼다. */
const READ = ([sel, bodySel]) => {
  const A = document.getElementById('app').getBoundingClientRect();
  const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
    return { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.top), h: Math.round(r.height) }; };
  const box = R(sel);
  /* 오버레이 = 상자의 부모 중 padding 을 선언한 것(= 띠를 만드는 선언). */
  const el = document.querySelector(sel);
  let pad = null, ov = null;
  if (el) {
    const host = el.closest('#modal') || el.closest('#collw') || el.parentElement;
    if (host) {
      const cs = getComputedStyle(host);
      pad = { t: Math.round(parseFloat(cs.paddingTop)), b: Math.round(parseFloat(cs.paddingBottom)), l: Math.round(parseFloat(cs.paddingLeft)) };
      ov = host.id ? '#' + host.id : host.className;
    }
  }
  /* ⚑ **상자가 곧 바깥선이 아니다** — `.ml69` 의 ✕ 는 57px, 21 도감의 깃발 서브탭은 149px
     상자 밖으로 나온다. 상자만 재는 자는 «띠 안» 이라고 초록을 주면서 그 부품이 탭바 밑에
     묻히는 것을 못 본다(1회차에 실제로 그랬다). ⇒ 오버레이 **자손 전체의 union**(딤 자신 제외)을
     같이 낸다. 딤은 `inset:0` 이라 늘 프레임 전체라서 빼야 union 이 뜻을 갖는다.
     ⚠ **raw 로 재면 유령이 쏟아진다**(LESSONS 351-⑧) — 21 도감 목록은 스크롤 그릇 안에서
     3601px 까지 뻗지만 그릇 밖에는 한 픽셀도 안 그려진다. ⇒ `probe351` 과 **같은 클리핑 접기**를
     태워 «지금 실제로 그려지는» 상자만 union 한다. */
  const drawnOf = (n) => {
    const r = n.getBoundingClientRect();
    const d = { y1: r.top, y2: r.bottom };
    for (let p = n.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowY === 'visible' && cs.overflowX === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    return d;
  };
  let ink = null;
  if (el) {
    const host = el.closest('#modal') || el.closest('#collw');
    if (host) {
      let y1 = Infinity, y2 = -Infinity;
      host.querySelectorAll('*').forEach((n) => {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
        const r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const d = drawnOf(n);
        if (d.y2 - d.y1 < 2) return;                 /* 클리핑 뒤에 아무것도 안 남았다 */
        y1 = Math.min(y1, d.y1); y2 = Math.max(y2, d.y2);
      });
      if (isFinite(y1)) ink = { top: Math.round(y1 - A.top), bot: Math.round(y2 - A.top) };
    }
  }
  const bd = bodySel ? document.querySelector(bodySel) : null;
  const pedge = document.querySelector('.pedge');
  const tabs = document.getElementById('tabbar');
  return {
    frameH: Math.round(A.height),
    shortf: document.getElementById('app').classList.contains('shortf'),
    ov, pad, box, ink,
    over: bd ? bd.scrollHeight - bd.clientHeight : null,
    /* ⚠ 못 찾으면 null 을 그대로 낸다 — 부르는 쪽이 «판정 불가» 로 빨개진다(351-④). */
    pedgeBot: pedge ? Math.round(pedge.getBoundingClientRect().bottom - A.top) : null,
    tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top - A.top) : null,
  };
};

(async () => {
  const br = await launch(chromium);
  const rows = [];
  let bad = 0, undecidable = 0;

  for (const s of SCREENS) {
    const one = { label: s.label, note: s.note };
    for (const [key, h] of [['tall', 2280], ['short', 1600]]) {
      const { ctx, page } = await fresh(br, 1080, h);
      await settle(page);
      /* 제품의 자기 진입점을 그대로 쓴다(`popup`·`showSkillDetail` 은 08·승급·약관이 쓰는 경로다). */
      if (s.o.fn) { await page.evaluate(s.o.fn).catch(() => {}); await page.waitForTimeout(450); }
      else await drive(page, s.o);
      one[key] = await page.evaluate(READ, [s.box, s.body]).catch(() => null);
      await ctx.close();
    }
    rows.push(one);
  }

  console.log('[390] 공용 모달 «띠» — 오버레이별 패딩 → 상자 → 금지구역\n');
  for (const r of rows) {
    console.log(`  ${r.label.padEnd(11)} ${r.note}`);
    for (const k of ['tall', 'short']) {
      const d = r[k];
      /* ⚠ «안 열렸다» 를 «침범» 으로 읽으면 안 된다 — display:none 은 0×0 상자를 돌려주고
         그 상자의 상변 0 은 HUD(142) 를 «142px 파고든» 것처럼 보인다(LESSONS 351-⑤ 진입 서명). */
      if (!d || !d.box || d.box.h === 0) { console.log(`    ${k.padEnd(6)} — 상자가 안 열렸다 (판정 불가)`); undecidable++; continue; }
      console.log(`    ${k.padEnd(6)} f${d.frameH}${d.shortf ? ' .shortf' : '        '} ${String(d.ov).padEnd(7)} pad ${String(d.pad ? d.pad.t : '?').padStart(3)}/${String(d.pad ? d.pad.b : '?').padStart(3)}` +
        `  상자 ${String(d.box.top).padStart(4)}..${String(d.box.bot).padStart(4)} (h${String(d.box.h).padStart(4)})` +
        `  잉크 ${d.ink ? String(d.ink.top).padStart(4) + '..' + String(d.ink.bot).padStart(4) : '   —'}  본문넘침 ${d.over === null ? '?' : d.over}`);
      if (k !== 'short') continue;
      if (typeof d.pedgeBot !== 'number' || typeof d.tabsTop !== 'number') {
        console.log('           ⚠ 기준선을 못 찾았다 — 판정 불가'); undecidable++; continue;
      }
      /* 판정은 **상자가 아니라 잉크**로 한다 — 상자 밖으로 나온 부품(✕ · 깃발탭)이 실재한다. */
      const I = d.ink || d.box;
      const tIn = d.pedgeBot - I.top;   /* >0 이면 HUD 를 파고들었다 */
      const bIn = I.bot - d.tabsTop;    /* >0 이면 탭바를 파고들었다 */
      if (tIn > 0 || bIn > 0) {
        bad++;
        console.log(`           ✖ 침범(잉크 ${I.top}..${I.bot}) — HUD(${d.pedgeBot}) ${tIn > 0 ? '+' + tIn + 'px' : 'ok'} · 탭바(${d.tabsTop}) ${bIn > 0 ? '+' + bIn + 'px' : 'ok'}`);
      } else {
        console.log(`           ✔ 띠 안(잉크 ${I.top}..${I.bot}) — HUD 여유 ${-tIn}px · 탭바 여유 ${-bIn}px`);
      }
    }
    console.log('');
  }
  console.log(`[390] 1600 침범 ${bad}건 · 판정 불가 ${undecidable}건`);
  if (JSONOUT) require('fs').writeFileSync(JSONOUT, JSON.stringify(rows, null, 2));
  await br.close();
  process.exit(bad + undecidable ? 1 : 0);
})();
