/* 작업 429 재현 프로브 — «89 유물 페이지 [?] 도움말 + 세부 팝업 공통 2줄 이관»
 *
 *   node tools/probe429.js
 *
 * 338 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * 등재문(PROGRESS 429)의 주장:
 *   ⓐ 유물 세부 팝업 설명은 3줄이고 그 중 2줄(«보유만으로 적용» · «소환할 때마다 Lv +1»)이
 *      **모든 유물에 공통**이다.
 *   ⓑ 89 유물 페이지에는 [?] 도움말이 **없다**.
 *   ⓒ 자리 후보가 둘이다 — ① 41 재화 바(`.pcb`) 왼쪽 빈 구간(`#relw .pcb-g{left:205}` 앞)
 *      ② `.rw-panel` 좌상단 24/19. «비어 있는지» 를 실측해서 고른다.
 *   ⓓ 269 `.cos-help` 는 76×76 r38 · left 24 / top 19 이고, 429 는 **같은 부품 규격**을 쓴다.
 *   ⓔ 공통 2줄을 빼면 `.sk-db`(750×290 고정)에 구멍이 생긴다 — 269·346 이 코스튬에서
 *      이미 같은 구멍을 받아들였는지(= 선례가 실재하는지) 를 같이 잰다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

(async () => {
  const browser = await launch(chromium);

  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(URL);
    await page.waitForTimeout(1000);

    const ev = async (fn, arg) => {
      try { return await page.evaluate(fn, arg); }
      catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
    };

    console.log('\n' + '='.repeat(72) + '\n  프레임 1080×' + H + '\n' + '='.repeat(72));

    /* ── ⓐ 세부 팝업 설명 3줄 ────────────────────────────────────── */
    blk('ⓐ 유물 세부 팝업 설명 — «공통» 줄이 정말 섞여 있나');
    const desc = await ev(() => {
      const out = { rows: [], common: {} };
      /* 보유 상태를 만든다 — 소환 경로를 그대로 쓴다(상태를 손으로 안 짓는다) */
      S.relic = 100000;
      for (let i = 0; i < 30; i++) summonRelic(true);
      for (const r of RELICS.slice(0, 3)) {
        showItem(r.id);
        const p = document.querySelector('#mbox .sk-db p');
        out.rows.push({ id: r.id, n: r.n, html: p ? p.innerHTML : null });
        closeModal();
      }
      /* 미보유 칸 — 안 뽑힌 유물 하나를 찾는다 */
      const none = RELICS.find((r) => !has(r.id));
      if (none) { showItem(none.id); const p = document.querySelector('#mbox .sk-db p');
        out.none = { id: none.id, html: p ? p.innerHTML : null }; closeModal(); }
      const txt = out.rows.map((r) => r.html || '');
      out.common.own = txt.filter((t) => /보유<\/em>만으로/.test(t)).length;
      out.common.lv1 = txt.filter((t) => /소환할 때마다/.test(t)).length;
      out.common.n = txt.length;
      /* 진행바 문구(공통이지만 «진행 상태» 라 남긴다) */
      showItem(out.rows[0].id);
      out.pb = (document.querySelector('#mbox .sk-pb b') || {}).textContent;
      closeModal();
      return out;
    });
    if (desc.__err) { console.log('  ❌ ' + desc.__err); fail++; }
    else {
      desc.rows.forEach((r) => console.log('  ' + r.id + ' ' + r.n + ' : ' + String(r.html).replace(/<br>/g, ' ⏎ ')));
      console.log('  미보유 ' + (desc.none ? desc.none.id + ' : ' + String(desc.none.html).replace(/<br>/g, ' ⏎ ') : '(전부 보유)'));
      console.log('  진행바 문구 : ' + desc.pb);
      /* ⚠ 이 항은 «있다» 가 아니라 «칸마다 안 갈린다» 를 묻는다 — 그래야 수리 전(3/3 = 공통이라
         옮길 수 있다)과 수리 후(0/3 = 옮겨서 사라졌다) **양쪽에서 같은 뜻**으로 읽힌다.
         «있다» 로 적었으면 이 재현 기록이 수리하는 순간 빨개져서 다시 못 돌린다(338 선례). */
      const N = desc.common.n;
      ok(desc.common.own === 0 || desc.common.own === N,
        '«장착 없이 보유만으로 항상 적용됩니다» 는 칸마다 안 갈린다 = 공통 문장 (' + desc.common.own + '/' + N + ')');
      ok(desc.common.lv1 === 0 || desc.common.lv1 === N,
        '«유물을 소환할 때마다 … Lv +1» 도 칸마다 안 갈린다 = 공통 문장 (' + desc.common.lv1 + '/' + N + ')');
      console.log('  ⇒ 지금 상태 : 공통 2줄이 세부 팝업에 ' + (desc.common.own ? '**있다**(수리 전)' : '**없다**(429 이후 — [?] 도움말로 옮겨졌다)'));
    }

    /* ── ⓑ 89 페이지에 [?] 가 있나 ───────────────────────────────── */
    blk('ⓑ 89 유물 페이지 — [?] 도움말 노드가 있나');
    const help = await ev(() => {
      openRelw();
      const w = document.getElementById('relw');
      return {
        rlHelp: w.querySelectorAll('.rl-help').length,
        anyHelp: w.querySelectorAll('[data-rlhelp],[data-coshelp]').length,
        qmark: (w.textContent.match(/\?/g) || []).length,
        fn: typeof relicHelp
      };
    });
    if (help.__err) { console.log('  ❌ ' + help.__err); fail++; }
    else {
      console.log('  `.rl-help` 노드 : ' + help.rlHelp + ' · 도움말 데이터속성 : ' + help.anyHelp
        + ' · 페이지 안 «?» 글자 : ' + help.qmark + ' · `relicHelp` : ' + help.fn);
    }

    /* ── ⓒ 자리 후보 둘 — 실측 ───────────────────────────────────── */
    blk('ⓒ 자리 후보 실측 — ① 재화 바 왼쪽 빈 구간 ② 패널 좌상단');
    const spot = await ev(() => {
      openRelw();
      const R = (s, root) => { const n = (root || document).querySelector(s); if (!n) return null;
        const b = n.getBoundingClientRect();
        return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
      const w = document.getElementById('relw');
      const bar = R('.pcb', w), gIc = R('.pcb-g>i', w), gPill = R('.pcb-g', w), panel = R('.rw-panel', w);
      /* 76원을 놓을 두 후보의 중심에서 무엇이 잡히나(z 결정용) */
      const hit = (x, y) => { const e = document.elementFromPoint(x, y);
        return e ? (e.id ? '#' + e.id : '') + (e.className && e.className.baseVal === undefined
          ? '.' + String(e.className).trim().split(/\s+/).join('.') : '') + '<' + e.tagName.toLowerCase() + '>' : '(없음)'; };
      const c1 = bar ? { x: bar.x + 24 + 38, y: bar.y + (bar.h - 76) / 2 + 38 } : null;
      const c2 = panel ? { x: panel.x + 24 + 38, y: panel.y + 19 + 38 } : null;
      /* 후보 사각형이 다른 것과 겹치나 — 패널 직속 자식 전수 */
      const rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const box2 = c2 ? { x: c2.x - 38, y: c2.y - 38, w: 76, h: 76 } : null;
      const kids = [];
      if (box2) document.querySelectorAll('#relw .rw-panel > *').forEach((n) => {
        const b = n.getBoundingClientRect();
        const r = { x: b.x, y: b.y, w: b.width, h: b.height };
        if (r.w && r.h && rectsOverlap(box2, r))
          kids.push((n.id ? '#' + n.id : '.' + String(n.className).trim().split(/\s+/)[0])
            + ' [' + r.x.toFixed(0) + ',' + r.y.toFixed(0) + ' ' + r.w.toFixed(0) + '×' + r.h.toFixed(0) + ']');
      });
      const box1 = c1 ? { x: c1.x - 38, y: c1.y - 38, w: 76, h: 76 } : null;
      const barKids = [];
      if (box1) document.querySelectorAll('#relw .pcb > *').forEach((n) => {
        const b = n.getBoundingClientRect();
        const r = { x: b.x, y: b.y, w: b.width, h: b.height };
        if (r.w && r.h && rectsOverlap(box1, r))
          barKids.push('.' + String(n.className).trim().split(/\s+/).join('.')
            + ' [' + r.x.toFixed(0) + ',' + r.y.toFixed(0) + ' ' + r.w.toFixed(0) + '×' + r.h.toFixed(0) + ']');
      });
      const fr = document.getElementById('app').getBoundingClientRect();
      return { bar, gIc, gPill, panel, c1, c2, hit1: c1 ? hit(c1.x, c1.y) : null, hit2: c2 ? hit(c2.x, c2.y) : null,
        kids, barKids, frame: { x: +fr.x.toFixed(1), y: +fr.y.toFixed(1), h: +fr.height.toFixed(1) } };
    });
    if (spot.__err) { console.log('  ❌ ' + spot.__err); fail++; }
    else {
      const fy = (v) => (v - spot.frame.y).toFixed(1);
      console.log('  프레임 원점 y=' + spot.frame.y + ' · 높이 ' + spot.frame.h);
      console.log('  .pcb      : 프레임 y ' + fy(spot.bar.y) + '..' + fy(spot.bar.y + spot.bar.h) + ' · h ' + spot.bar.h);
      console.log('  .pcb-g 알약 좌변 ' + spot.gPill.x + ' · 아이콘 좌변 ' + spot.gIc.x + ' ⇒ 바 왼쪽 빈 폭 ' + spot.gIc.x.toFixed(1) + 'px');
      console.log('  .rw-panel : 프레임 y ' + fy(spot.panel.y) + ' · ' + spot.panel.w + '×' + spot.panel.h);
      console.log('  후보① 재화 바 안 (left24, 세로중앙) 중심 = 프레임 (' + spot.c1.x + ', ' + fy(spot.c1.y) + ') → elementFromPoint ' + spot.hit1);
      console.log('    겹치는 바 자식 : ' + (spot.barKids.length ? spot.barKids.join(' · ') : '(없음)'));
      console.log('  후보② 패널 좌상단 (24,19) 중심 = 프레임 (' + spot.c2.x + ', ' + fy(spot.c2.y) + ') → elementFromPoint ' + spot.hit2);
      console.log('    겹치는 패널 자식 : ' + (spot.kids.length ? spot.kids.join(' · ') : '(없음)'));
      ok(spot.gIc.x >= 100, '후보① — 재화 바 왼쪽에 76원이 들어갈 빈 구간이 실제로 있다(' + spot.gIc.x.toFixed(1) + 'px ≥ 100)');
    }

    /* ── ⓓ 269 부품 규격 ─────────────────────────────────────────── */
    blk('ⓓ 269 `.cos-help` 규격 — 429 가 물려받을 값');
    const cos = await ev(() => {
      closeRelw();
      document.querySelector('#tabbar [data-t="hero"]').click();
      const t = document.querySelector('[data-eqtab="cos"]');
      if (t) t.click();
      const n = document.querySelector('#bCos .cos-help');
      if (!n) return { none: true };
      const b = n.getBoundingClientRect(), cs = getComputedStyle(n);
      const i = n.querySelector('i'), ib = i ? i.getBoundingClientRect() : null, ics = i ? getComputedStyle(i) : null;
      const host = n.parentElement.getBoundingClientRect();
      return { w: +b.width.toFixed(1), h: +b.height.toFixed(1), r: cs.borderRadius,
        left: cs.left, top: cs.top, z: cs.zIndex, bg: cs.backgroundImage.slice(0, 60), sh: cs.boxShadow.slice(0, 80),
        lh: cs.lineHeight, fs: ics && ics.fontSize, col: ics && ics.color, tr: ics && ics.transform,
        dx: +(b.x - host.x).toFixed(1), dy: +(b.y - host.y).toFixed(1) };
    });
    if (cos.__err) { console.log('  ❌ ' + cos.__err); fail++; }
    else if (cos.none) { console.log('  ❌ `#bCos .cos-help` 없음'); fail++; }
    else {
      console.log('  크기 ' + cos.w + '×' + cos.h + ' · radius ' + cos.r + ' · left ' + cos.left + ' top ' + cos.top
        + ' · z ' + cos.z + ' · line-height ' + cos.lh);
      console.log('  글자 ' + cos.fs + ' ' + cos.col + ' ' + cos.tr);
      console.log('  그림자 ' + cos.sh);
      ok(cos.w === 76 && cos.h === 76, '269 부품은 76×76 (측정표 값 확인)');
    }

    /* ── ⓔ `.sk-db` 구멍 ────────────────────────────────────────── */
    blk('ⓔ `.sk-db` — 공통 2줄을 빼면 남는 빈 면(269·346 선례와 대조)');
    const hole = await ev(() => {
      const meas = (id, fn) => {
        fn();
        const box = document.querySelector('#mbox .sk-db');
        const p = document.querySelector('#mbox .sk-db p');
        if (!box || !p) return null;
        const bb = box.getBoundingClientRect(), pb = p.getBoundingClientRect();
        const r = { id, boxH: +bb.height.toFixed(1), inkH: +pb.height.toFixed(1),
          lines: Math.round(pb.height / parseFloat(getComputedStyle(p).lineHeight)),
          empty: +(bb.height - (pb.y - bb.y) - pb.height).toFixed(1) };
        closeModal();
        return r;
      };
      const out = [];
      out.push(meas('유물(현행 3줄)', () => showItem(RELICS.find((r) => has(r.id)).id)));
      const av = Object.keys(S.avatars || {})[0];
      out.push(meas('코스튬(269·346 이후)', () => showCosDetail(av || 'av0')));
      const pet = (PETS && PETS[0]) ? PETS[0].id : null;
      if (pet) { S.own[pet] = S.own[pet] || { n: 0, l: 1 }; out.push(meas('펫(대조)', () => showItem(pet))); }
      return out.filter(Boolean);
    });
    if (hole.__err) { console.log('  ❌ ' + hole.__err); fail++; }
    else hole.forEach((r) => console.log('  ' + r.id.padEnd(22) + ' 상자 ' + r.boxH + ' · 글줄 ' + r.lines
      + '줄(' + r.inkH + 'px) · 아래 빈 면 ' + r.empty + 'px'));

    console.log('\n  콘솔 에러 : ' + (errs.length ? errs.slice(0, 3).join(' | ') : '0건'));
    ok(errs.length === 0, '콘솔 에러 0건 (' + H + ')');
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + '─'.repeat(72));
  console.log('probe429 : ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
