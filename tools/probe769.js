#!/usr/bin/env node
/* 재현 — 작업 769 «단련 축 카드의 효과 글줄 열(`.td`)이 예약 폭의 절반만 쓴다»
 *   (2026-09-01 등재 · 686 비평 4인이 두 회차에 걸쳐 전부 지적한 자리)
 *
 *   node tools/probe769.js
 *
 * 338 규칙: **처방 전에 재현한다.** 등재문은 처방 후보 셋(ⓐ 재고 ⓑ 버튼을 넓힌다 ⓒ 그대로)을
 * 적으면서 «먼저 ⓐ 를 재고 결정할 것» 이라고 못박았다 — 이 자는 그 ⓐ 를 찍는다.
 *
 *   [1] 지금 그림 — `.td` 상자(224..616) · 세 축의 실제 잉크 우변 · 잉크 우변 ↔ 버튼 좌변 빈 띠.
 *       등재문의 수치(잉크 우변 446/445/482 · 빈 띠 190~227)를 확인/기각한다.
 *   [2] 예약 폭의 근거를 다시 잰다 — 612 는 «한 줄 잉크 최악 411 > 남는 폭 392» 로 두 줄을 골랐다.
 *       그 411 은 **725 이전(«%» 표기) 의 문자열**에서 나온 수다. 725 가 «×N배» 로 갈아엎었으므로
 *       같은 자릿수 스윕을 **지금 문자열**로 다시 돌려 «한 줄 최악» 과 «두 줄 최악» 을 각각 찍는다.
 *       자릿수 최악의 정의는 612 가 쓰던 것을 그대로 쓴다(Lv 99,999) + 그 위(999,999)도 같이 본다.
 *   [3] 이름 최악 — 축 이름은 «공격력 · 체력 · 체력회복» 셋이라 최장은 `체력회복`(k2)이다.
 *       세 축을 다 재서 «어느 축이 최악인가» 를 코드가 아니라 잉크로 정한다.
 *   [4] 버튼 쪽 예산 — `.tb`(right 26 · w 340)의 라벨 잉크와 좌우 여백. ⓑ 로 갈 때 «버튼 초록 면이
 *       가로로 빈다»(686 §7-ⓒ · 비평 4인 지적)를 **더 키우는** 길인지 여기서 먼저 본다.
 *
 * 이 자는 «무엇이 지금 어떤가» 만 찍는다(합격/불합격 판정은 verify769).
 * ⚠ 수리 전·후 둘 다 초록으로 끝난다 — 상자 폭을 소스에서 읽어 «그 폭이 잉크를 담는가» 로 묻는다
 *   (수리 전에만 초록인 재현자를 두면 다음 세션이 그 빨강을 게이트 부패로 읽는다 — 803 의 자리).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n' + t);
const p1 = n => Math.round(n * 10) / 10;

async function openAt(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e9; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  /* 행 기준 좌표 + «한 줄의 잉크» 를 Range 로 재는 자 — <br> 로 갈린 두 줄을 각각 본다.
     getClientRects() 는 줄박스마다 하나씩 준다(줄 단위 잉크 폭의 유일한 정직한 출처다). */
  await page.evaluate(`window.__lines = (sel, host) => {
    const e = document.querySelector(sel), h = document.querySelector(host);
    if (!e || !h) return null;
    const hb = h.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(e);
    const rs = [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
    const r1 = n => Math.round(n * 10) / 10;
    return rs.map(r => ({ x: r1(r.x - hb.x), x2: r1(r.right - hb.x),
                          y: r1(r.y - hb.y), y2: r1(r.bottom - hb.y), w: r1(r.width) }));
  };`);
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await openAt(browser, 2280);
  const ev = fn => page.evaluate(fn).catch(e => ({ __err: String(e) }));

  /* ══ [1] 지금 그림 ═══════════════════════════════════════════════════ */
  blk('[1] 지금 그림 — `.td` 상자 · 실제 잉크 · 빈 띠');
  const A = await ev(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const row = document.querySelector('.tr-tp.k' + i); if (!row) continue;
      const rb = row.getBoundingClientRect();
      const box = row.querySelector('.td').getBoundingClientRect();
      const btn = row.querySelector('.tb').getBoundingClientRect();
      const ln = window.__lines('.tr-tp.k' + i + ' .td i', '.tr-tp.k' + i);
      const inkX2 = Math.max(...ln.map(l => l.x2));
      const r1 = n => Math.round(n * 10) / 10;
      out.push({ k: i, txt: row.querySelector('.td').textContent,
                 boxX: r1(box.x - rb.x), boxX2: r1(box.right - rb.x), boxW: r1(box.width),
                 btnX: r1(btn.x - rb.x), btnW: r1(btn.width),
                 lines: ln.length, inkX2: r1(inkX2),
                 slackBox: r1(box.right - rb.x - inkX2),      /* 잉크 우변 → 상자 우변 */
                 slackBtn: r1(btn.x - rb.x - inkX2) });       /* 잉크 우변 → 버튼 좌변 = 빈 띠 */
    }
    return out;
  });
  if (A.__err) ok(false, 'evaluate 실패: ' + A.__err);
  else {
    A.forEach(r => console.log('       k' + r.k + '  «' + r.txt + '»  줄 ' + r.lines
      + ' · 잉크 우변 ' + r.inkX2 + ' · 상자 ' + r.boxX + '..' + r.boxX2
      + ' · 버튼 좌변 ' + r.btnX + ' ⇒ 빈 띠 ' + r.slackBtn));
    /* ⚠ 갈래는 **예약 폭**이 가른다 — 612 가 정한 392 면 «수리 전», 769 가 다시 잰 값이면 «수리 후».
       어느 갈래든 초록으로 끝난다(803 의 자리 — 재현기를 «수리 전에만 초록» 으로 두지 않는다). */
    const era392 = A.every(r => r.boxW === 392);
    console.log('       ⇒ 갈래: ' + (era392 ? '«수리 전»(예약 392 · 612 값)' : '«수리 후»(예약 ' + A[0].boxW + ' · 769 재고)'));
    ok(A.every(r => r.boxW === A[0].boxW), '[1-a] 세 행의 `.td` 예약 폭이 한 값이다', A.map(r => r.boxW).join(' · '));
    ok(A.every(r => r.lines === 2), '[1-b] 지금 두 줄이다(612 의 <br> 분할)', A.map(r => r.lines).join(' · '));
    ok(era392 ? A.every(r => r.slackBtn >= 140) : A.every(r => r.slackBtn <= 100),
       '[1-c] 잉크 우변↔버튼 좌변 빈 띠 — ' + (era392 ? '등재문 재현(≥140px)' : '769 뒤 걷혔다(≤100px)'),
       A.map(r => r.slackBtn).join(' · '));
    ok(era392 ? A.every(r => r.slackBox >= 100) : A.every(r => r.slackBox <= 60),
       '[1-d] 그중 상자 «안» 에서 노는 폭(예약 과다분)', A.map(r => r.slackBox).join(' · '));
  }

  /* ══ [2] 자릿수 스윕 — 두 줄 / 한 줄 각각의 최악 잉크 ═══════════════ */
  blk('[2] 자릿수 스윕 — 725 «×N배» 문자열의 실제 최악(612 의 411 은 «%» 시절 값이다)');
  const B = await ev(() => {
    const o = temperObj(); const keep = { ...(o.alloc || {}) };
    const r1 = n => Math.round(n * 10) / 10;
    const LVS = [0, 99, 999, 9999, 99999, 999999];
    const out = [];
    LVS.forEach(lv => {
      TEMPERS.forEach(t => { o.alloc[t.k] = lv; });
      renderTemper();
      for (let i = 0; i < 3; i++) {
        const row = document.querySelector('.tr-tp.k' + i);
        const ln = window.__lines('.tr-tp.k' + i + ' .td i', '.tr-tp.k' + i);
        const box = row.querySelector('.td').getBoundingClientRect(), rb = row.getBoundingClientRect();
        const x0 = box.x - rb.x;
        /* 두 줄일 때: 각 줄 폭 · 한 줄로 폈을 때: 두 줄 폭 + «·» 구분자(612 가 갈랐던 그 자리) */
        const w = ln.map(l => r1(l.x2 - x0));
        out.push({ lv, k: i, name: TEMPERS[i].n, txt: row.querySelector('.td').textContent,
                   lines: ln.length, w, worst2: Math.max(...w) });
      }
    });
    /* 한 줄 가정 — <br> 을 « · » 로 되돌린 사본을 같은 서체·크기로 재 본다(측정 전용 노드) */
    const one = [];
    LVS.forEach(lv => {
      TEMPERS.forEach(t => { o.alloc[t.k] = lv; });
      renderTemper();
      for (let i = 0; i < 3; i++) {
        const row = document.querySelector('.tr-tp.k' + i);
        const src = row.querySelector('.td i');
        const probe = src.cloneNode(true);
        probe.innerHTML = src.innerHTML.replace(/<br\s*\/?>/i, ' · ');
        const host = row.querySelector('.td');
        const hold = document.createElement('span');
        hold.style.cssText = 'position:absolute;left:0;top:-9999px;white-space:nowrap;visibility:hidden';
        hold.appendChild(probe); host.appendChild(hold);
        const wpx = r1(probe.getBoundingClientRect().width);
        host.removeChild(hold);
        one.push({ lv, k: i, w: wpx });
      }
    });
    o.alloc = keep; renderTemper();
    return { out, one };
  });
  if (B.__err) ok(false, 'evaluate 실패: ' + B.__err);
  else {
    B.out.forEach(r => console.log('       Lv' + String(r.lv).padStart(6) + ' k' + r.k
      + '  줄 ' + r.lines + ' · 줄폭 [' + r.w.join(', ') + ']  «' + r.txt + '»'));
    const w2 = Math.max(...B.out.map(r => r.worst2));
    const w1 = Math.max(...B.one.map(r => r.w));
    const w2at = B.out.filter(r => r.lv <= 99999).reduce((m, r) => Math.max(m, r.worst2), 0);
    const w1at = B.one.filter(r => r.lv <= 99999).reduce((m, r) => Math.max(m, r.w), 0);
    console.log('       ⇒ 두 줄 최악 ' + w2at + 'px(Lv≤99,999) · ' + w2 + 'px(Lv≤999,999)');
    console.log('       ⇒ 한 줄 최악 ' + w1at + 'px(Lv≤99,999) · ' + w1 + 'px(Lv≤999,999)');
    const boxW = A.__err ? 392 : A[0].boxW;
    ok(B.out.every(r => r.lines === 2), '[2-a] 스윕 전 구간에서 두 줄을 유지한다');
    ok(w2 <= boxW, '[2-b] ★ 두 줄 최악(스윕 전 구간)이 예약 폭 안에 든다 — 예약이 담아야 할 값',
       w2 + ' ≤ ' + boxW + ' (남는 폭 ' + p1(boxW - w2) + ')');
    ok(w1at > 408, '[2-c] 한 줄로 펴면 남는 폭(≤408 = 632−224)을 넘는다 — 612 의 두 줄 판단은 725 뒤에도 선다',
       w1at + ' vs 408');
  }

  /* ══ [3] 이름 최악 ═══════════════════════════════════════════════════ */
  blk('[3] 축 이름 최악 — 어느 행이 가장 넓은가');
  const C = await ev(() => TEMPERS.map(t => ({ k: t.k, n: t.n, len: t.n.length })));
  if (C.__err) ok(false, 'evaluate 실패: ' + C.__err);
  else {
    console.log('       ' + C.map(c => c.n + '(' + c.len + '자)').join(' · '));
    ok(C.some(c => c.n === '체력회복'), '[3-a] 최장 이름은 «체력회복»(4자) — k2 행이 최악 표본이다');
  }

  /* ══ [4] 버튼 쪽 예산 ═══════════════════════════════════════════════ */
  blk('[4] 버튼 라벨 잉크와 좌우 여백 — ⓑ 로 가면 «초록 면이 빈다»(686 §7-ⓒ)를 더 키우는가');
  const D = await ev(() => {
    const r1 = n => Math.round(n * 10) / 10;
    const row = document.querySelector('.tr-tp.k0');
    const btn = row.querySelector('.tb');
    const bw = r1(btn.getBoundingClientRect().width);
    /* 자연 폭 — 상자에 눌리지 않은 «진짜» 라벨 잉크를 자릿수별로 잰다(상자 안에서 재면
       인라인 줄바꿈·클램프에 눌려 상자 폭과 같은 수가 나온다 — 그 수로는 예산을 못 센다) */
    const host = document.createElement('span');
    host.style.cssText = 'position:absolute;left:0;top:-9999px;white-space:nowrap;visibility:hidden';
    btn.appendChild(host);
    const nat = [];
    for (let d = 1; d <= 13; d++) {
      const pr = document.createElement('i');
      pr.style.whiteSpace = 'nowrap';
      pr.innerHTML = curIc('tstone', TP_CUR_PX) + '<b class="tbn">' + fmt(Number('9'.repeat(d))) + '</b>';
      host.appendChild(pr);
      nat.push({ d, w: r1(pr.getBoundingClientRect().width) });
      host.removeChild(pr);
    }
    btn.removeChild(host);
    const inner = bw - 16;                      /* 검정 링 8px × 2 */
    const budget = nat.filter(x => x.w <= inner).length;
    return { bw, inner, nat, budget };
  });
  if (D.__err) ok(false, 'evaluate 실패: ' + D.__err);
  else {
    console.log('       버튼 ' + D.bw + ' (안쪽 ' + D.inner + ') · 자연 폭 '
      + D.nat.map(x => x.d + '자리 ' + x.w).join(' · '));
    console.log('       ⇒ 자릿수 예산 ' + D.budget + '자리(' + (D.budget + 1) + '자리부터 넘친다)');
    ok(D.budget >= 7, '[4-a] ★ 버튼의 자릿수 예산 — 584 축을 실측으로 다시 센다',
       D.budget + '자리 (상자 ' + D.bw + ')');
    ok(D.nat[0].w < D.inner, '[4-b] 짧은 라벨(1자리)은 상자를 다 못 채운다 — 686 §7-ⓒ «초록 면이 빈다» 의 자리',
       '잉크 ' + D.nat[0].w + ' vs 안쪽 ' + D.inner + ' ⇒ 좌우 각 ' + p1((D.bw - D.nat[0].w) / 2) + 'px');
  }

  await ctx.close();

  /* ══ [5] 짧은 프레임(9:13.3) — 같은 수인가 ═══════════════════════════ */
  blk('[5] 1080×1600 — 카드 기하는 프레임 무관인가');
  const { ctx: c2, page: p2 } = await openAt(browser, 1600);
  const E = await p2.evaluate(() => {
    const r1 = n => Math.round(n * 10) / 10;
    const row = document.querySelector('.tr-tp.k2'); if (!row) return null;
    const rb = row.getBoundingClientRect();
    const box = row.querySelector('.td').getBoundingClientRect();
    const btn = row.querySelector('.tb').getBoundingClientRect();
    return { boxW: r1(box.width), boxX: r1(box.x - rb.x), btnX: r1(btn.x - rb.x), rowW: r1(rb.width) };
  }).catch(e => ({ __err: String(e) }));
  if (!E || E.__err) ok(false, '1600 측정 실패: ' + (E && E.__err));
  else {
    console.log('       1600: 행 ' + E.rowW + ' · `.td` ' + E.boxX + ' w' + E.boxW + ' · 버튼 좌변 ' + E.btnX);
    ok(!A.__err && E.boxW === A[0].boxW && E.boxX === A[0].boxX && E.btnX === A[0].btnX,
       '[5-a] 두 프레임에서 `.td`·`.tb` 가로 기하가 같다(가로는 프레임 무관)',
       '2280: ' + (A.__err ? '?' : A[0].boxX + '/' + A[0].boxW + '/' + A[0].btnX)
       + ' ↔ 1600: ' + E.boxX + '/' + E.boxW + '/' + E.btnX);
  }
  await c2.close();

  await browser.close();
  console.log('\nPROBE769 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
