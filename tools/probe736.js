#!/usr/bin/env node
/* 736 재현 — 메인 HUD 장착 스킬 슬롯의 레벨 표기가 «100» 이다(«Lv.100» 이어야 한다)
 *            (T2 «주인 지시» 2026-09-02 04:35 · 716 과 같은 슬롯)
 *
 *   node tools/probe736.js
 *
 * ⚑ 338 규칙 — 처방을 따르기 전에 **찍힌 값**으로 재현부터 한다.
 *   등재문은 이 작업을 «문자열에 «Lv.» 를 붙인다» 로 적었다. 이 재현기가 묻는 것은 두 가지다:
 *
 *   [1] 재현   — 수리 전 트리에서 메인 배지가 **맨 숫자**이고, **같은 스킬의 07 시트 슬롯**은
 *                이미 «Lv. n» 이다 ⇒ 주인이 본 것은 «없는 표기» 가 아니라 **짝인 두 자리의 어긋남**
 *                (689 교훈 ① — «새 표기» 인지 «갈린 표기» 인지부터 재라).
 *   [2] 폭     — 배지는 Ø43.5 원(안쪽 37.5)인데 «Lv. 100» 잉크가 67.36 이다 ⇒ **문자열만 갈면
 *                좌우로 넘친다.** 이 작업은 «한 줄 치환» 이 아니라 **그릇을 같이 넓히는 일**이다.
 *   [3] 서체   — 라틴 «Lv.» 가 폴백 서체로 떨어지는지(380 선례). 689 교훈 ② 대로 **겁내기 전에 잰다**.
 *   [4] 수리 후 — 현재 트리에서 배지가 «Lv. n» 이고, 자릿수 스윕(1·10·100)에서 잉크가 상자 안에
 *                들어가며(좌우 여백 ≥ 6px), 상자가 자릿수에 따라 **출렁이지 않고**(735 규약),
 *                세로 기하(높이·하단 돌출)와 이웃 침범 0 이 그대로다.
 *
 * ⚠ 수리 전 트리는 `git show <PRE>:index.html` 로 꺼낸다(얕은 클론이면 756 공용 부품이 판다).
 *   못 꺼내면 [1]~[3] 은 «보류(환경)» 이고 실패가 아니다 — [4] 는 현재 트리라 언제나 돈다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const G756 = require('./gitrev756');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const CUR = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PRE = process.env.PROBE736_PRE || 'a0c0961';   /* claim(736) — 수리 직전 트리 */

let pass = 0, fail = 0, skip = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const na = (name, detail) => { console.log('⏸ SKIP ' + name + (detail ? ' — ' + detail : '')); skip++; };

const open = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof buildSlots === 'function' && typeof renderSkill === 'function'
    && typeof SK !== 'undefined' && typeof oLv === 'function');
  await page.waitForTimeout(900);              /* 60 쥬시(등장 전이)가 걷힐 때까지 — 716 교훈 */
  return { page, errs };
};

/* 슬롯 0 에 스킬 하나를 레벨 lv 로 장착하고, 그 배지와 **같은 스킬의 07 시트 슬롯**을 나란히 잰다. */
const measure = async (page, lv) => page.evaluate((L) => {
  const px = v => parseFloat(v) || 0;
  const ids = Object.keys(SK);
  const id = ids[0], id2 = ids[1];
  S.own = S.own || {};
  S.own[id] = { l: L, n: 0 };
  S.own[id2] = { l: L, n: 0 };
  S.eqSkill = [id, id2, null, null, null, null, null, null];
  buildSlots();
  const bs = Array.prototype.slice.call(document.querySelectorAll('#slots .lvv2'));
  const b = bs[0];
  const cs = getComputedStyle(b);
  const r = b.getBoundingClientRect();
  const rng = document.createRange(); rng.selectNodeContents(b);
  const ink = rng.getBoundingClientRect();
  const slot = document.querySelectorAll('#slots .slot2')[0].getBoundingClientRect();
  /* 07 시트 — 같은 스킬의 장착 슬롯 라벨(`.sk-slv`) */
  renderSkill();
  const s7 = document.querySelector('#bSk .sk-slot[data-skslot="' + id + '"] .sk-slv');
  return {
    lv: L, id,
    txt: b.textContent,
    txt7: s7 ? s7.textContent : null,
    box: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) },
    ink: { x: +ink.x.toFixed(2), w: +ink.width.toFixed(2) },
    bw: px(cs.borderTopWidth), fs: px(cs.fontSize), ff: cs.fontFamily.split(',')[0].trim(),
    inner: +(r.width - 2 * px(cs.borderTopWidth)).toFixed(2),
    slot: { x: +slot.x.toFixed(2), w: +slot.width.toFixed(2), bottom: +(slot.y + slot.height).toFixed(2) },
    out: +((r.y + r.height) - (slot.y + slot.height)).toFixed(2),
    /* 이웃 배지(슬롯 1) 와의 틈 */
    gap: bs[1] ? +(bs[1].getBoundingClientRect().x - (r.x + r.width)).toFixed(2) : null
  };
}, lv);

/* 임의 문자열의 잉크 폭 — 배지와 같은 서체·굵기·크기로 잰다(그릇을 정하는 근거값) */
const inkOf = async (page, txt) => page.evaluate((t) => {
  const b = document.querySelector('#slots .lvv2');
  const cs = getComputedStyle(b);
  const d = document.createElement('span');
  d.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;font-weight:' + cs.fontWeight
    + ';font-size:' + cs.fontSize + ';font-family:' + cs.fontFamily;
  d.textContent = t;
  document.body.appendChild(d);
  const rng = document.createRange(); rng.selectNodeContents(d);
  const w = rng.getBoundingClientRect().width;
  const ff = getComputedStyle(d).fontFamily.split(',')[0].trim();
  d.remove();
  return { w: +w.toFixed(2), ff };
}, txt);

(async () => {
  const browser = await launch(chromium);

  /* ── 수리 전 트리 ─────────────────────────────────────────────────────── */
  let preUrl = null, tmp = null;
  const got = G756.show(PRE, 'index.html');
  if (got.ok) {
    if (got.how) console.log('[i]' + got.how);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe736-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), got.buf);
    preUrl = 'file://' + path.join(tmp, 'index.html').replace(/\\/g, '/');
  }

  if (preUrl) {
    const { page } = await open(browser, preUrl);
    const m = await measure(page, 100);
    const li = await inkOf(page, 'Lv. 100');

    console.log('\n[1] 재현 — 수리 전 트리(' + PRE + ')');
    console.log('    메인 배지 «' + m.txt + '» · 07 시트 같은 스킬 «' + m.txt7 + '»');
    ok(!/Lv/.test(m.txt), '[1-a] 메인 배지에 «Lv.» 가 없다', '«' + m.txt + '»');
    ok(/^Lv\./.test((m.txt7 || '').trim()), '[1-b] 07 시트 같은 스킬은 이미 «Lv.» 를 쓴다', '«' + m.txt7 + '»');
    ok(m.txt !== (m.txt7 || '').trim(), '[1-c] 짝인 두 자리가 다른 말을 한다(689 교훈 ①)',
      '«' + m.txt + '» ≠ «' + m.txt7 + '»');

    console.log('\n[2] 폭 — 문자열만 갈면 넘친다');
    console.log('    배지 외곽 ' + m.box.w + ' · 테두리 ' + m.bw + ' ⇒ 안쪽 ' + m.inner
      + ' · 지금 잉크(«' + m.txt + '») ' + m.ink.w + ' · «Lv. 100» 잉크 ' + li.w);
    ok(m.ink.w <= m.inner, '[2-a] 지금 표기는 상자 안', m.ink.w + ' ≤ ' + m.inner);
    ok(li.w > m.inner, '[2-b] «Lv. 100» 은 지금 상자를 넘친다',
      li.w + ' > ' + m.inner + ' (좌우 각 ' + ((li.w - m.inner) / 2).toFixed(2) + 'px)');

    console.log('\n[3] 서체 — 라틴 폴백 여부(380 선례 · 689 교훈 ②)');
    ok(li.ff === m.ff, '[3-a] «Lv. 100» 도 배지와 같은 서체로 렌더된다', li.ff + ' = ' + m.ff);
    ok(/GameKR/i.test(li.ff), '[3-b] 실렌더 서체가 GameKR(서브셋에 ASCII 포함) — 폴백 보정 불요', li.ff);
    await page.context().close();
  } else {
    na('[1]~[3] 수리 전 트리', PRE + ' 를 못 꺼냈다(얕은 클론 · 환경) — 실패 아님');
  }

  /* ── 현재 트리 ────────────────────────────────────────────────────────── */
  const { page, errs } = await open(browser, CUR);
  const rows = [];
  for (const lv of [1, 10, 100]) rows.push(await measure(page, lv));
  const li = await inkOf(page, 'Lv. 100');

  console.log('\n[4] 수리 후 — 현재 트리');
  rows.forEach(r => console.log('    Lv' + String(r.lv).padStart(3) + '  배지 «' + r.txt + '»  상자 '
    + r.box.w + '×' + r.box.h + '  잉크 ' + r.ink.w + '  여백 ' + ((r.inner - r.ink.w) / 2).toFixed(2)
    + '  하단돌출 ' + r.out + '  이웃 틈 ' + r.gap));

  ok(rows.every(r => /^Lv\.\s?\d+$/.test(r.txt.trim())), '[4-a] 배지가 «Lv.» + 레벨(자릿수 스윕 1·10·100)',
    rows.map(r => '«' + r.txt + '»').join(' · '));
  ok(rows.every(r => r.txt.trim() === (r.txt7 || '').trim()),
    '[4-b] 메인 배지 === 07 시트 라벨(같은 스킬 · 같은 말)', rows.map(r => '«' + r.txt + '»/«' + r.txt7 + '»').join(' · '));
  ok(rows.every(r => r.ink.w <= r.inner), '[4-c] 잘림 0 — 잉크가 상자 안',
    rows.map(r => r.ink.w + '≤' + r.inner).join(' · '));
  ok(rows.every(r => (r.inner - r.ink.w) / 2 >= 6), '[4-d] 좌우 여백 ≥ 6px',
    rows.map(r => ((r.inner - r.ink.w) / 2).toFixed(2)).join(' · '));
  ok(rows.every(r => Math.abs(r.box.w - rows[0].box.w) < 0.01 && Math.abs(r.box.h - rows[0].box.h) < 0.01),
    '[4-e] 자릿수가 바뀌어도 상자 Δ0(735 규약 — 출렁임 금지)',
    rows.map(r => r.box.w + '×' + r.box.h).join(' · '));
  ok(rows.every(r => Math.abs(r.out - 9.8) <= 0.5 && Math.abs(r.box.h - 40.1) <= 0.5),
    '[4-f] 세로 기하 불변 — 높이 40.1 · 하단 돌출 9.8(A4 규격)',
    rows[0].box.h + ' / ' + rows[0].out);
  ok(rows.every(r => r.gap === null || r.gap > 0), '[4-g] 이웃 배지 침범 0',
    rows.map(r => r.gap).join(' · '));
  ok(rows.every(r => r.box.x >= r.slot.x && r.box.x + r.box.w <= r.slot.x + r.slot.w),
    '[4-h] 배지가 자기 슬롯 가로 폭 안에 있다(이웃 슬롯 침범 0)',
    rows.map(r => r.box.x.toFixed(1) + '..' + (r.box.x + r.box.w).toFixed(1)
      + ' ⊂ ' + r.slot.x + '..' + (r.slot.x + r.slot.w)).join(' · '));
  ok(li.w <= rows[0].inner, '[4-i] 최장 문자열 «Lv. 100» 기준으로 그릇이 잡혀 있다',
    li.w + ' ≤ ' + rows[0].inner);
  ok(errs.length === 0, '[4-j] 콘솔 에러 0', errs.join(' | ') || '0건');

  await browser.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\nPROBE736 ' + pass + '/' + (pass + fail) + (skip ? ' (보류 ' + skip + ')' : '')
    + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
