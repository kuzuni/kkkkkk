#!/usr/bin/env node
/* 작업 705 재현기 — 「19 프로필 · 20 종합스탯 팝업 정리 4종」(주인 지시 2026-09-02 02:25)
 *
 *   node tools/probe705.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 넷을 적어 두었고, 이 자는 제품을 한 줄도 안 고치고
 *   각 항이 «정말 그런가» 와 «얼마나 그런가» 를 숫자로 찍는다:
 *     ① «햄지» 견본 문구 — 화면에 몇 줄인가 · 그중 **손으로 적은 값**(데이터 파생이 아닌 것)은 몇 줄인가
 *     ② 종합스탯 아이콘 — 지금 무엇이 그려지는가(🛡️ 이모지 / 코스튬 스프라이트) · 코스튬을 갈아입으면 따라오는가
 *     ③ 두 팝업 상자 — **프레임 높이별** bbox 를 나란히 재서 «탭을 눌렀을 때 몇 px 튀는가» 를 찍는다
 *        (주인 원문 «프로필로 자꾸 클릭하면 위치가 바뀜»)
 *     ④ 상단 Gamer Id — 지금 무엇이 찍히는가
 *
 * ⚠ 이 자는 **판정하지 않는다**(초록/빨강은 «관측에 성공했는가» 다). 처방의 모양을 정하는 것은 아래 숫자다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 두 팝업의 상자를 «같은 눈» 으로 읽는다 — 자와 재현기가 같은 셀렉터를 쓴다 */
const BOX = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  /* ⚠ 프레임은 `fit()` 이 뷰포트에 맞춰 **스케일**한다 — 화면 px 을 그대로 쓰면 설계 px 과 안 맞는다.
     그래서 «앱 좌상단 기준 / 스케일 나눗셈» 으로 **설계 px** 으로 되돌려 읽는다(두 상자를 같은 자로). */
  const sc = app.width / 1080;
  const b = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +((r.x - app.x) / sc).toFixed(1), y: +((r.y - app.y) / sc).toFixed(1),
             w: +(r.width / sc).toFixed(1), h: +(r.height / sc).toFixed(1) };
  };
  return { pf: b('.pf'), spc: b('.spc'), sc: +sc.toFixed(4), frameH: +(app.height / sc).toFixed(1) };
};

/* 열림 애니메이션이 끝날 때까지 기다린다 — 애니 중에 재면 스케일이 섞여 폭까지 어긋나 보인다
   (초판이 그래서 «두 상자의 폭이 5.5px 다르다» 는 헛것을 찍었다). */
const settle = async (page, sel) => {
  let prev = '', same = 0;
  for (let i = 0; i < 40 && same < 3; i++) {
    const cur = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return 'none';
      const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(','); }, sel);
    same = cur === prev ? same + 1 : 0; prev = cur;
    await page.waitForTimeout(60);
  }
  return prev;
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  console.log('[0] 소스 — 무엇이 손으로 적혀 있는가');
  const hamji = (code.match(/햄지/g) || []).length;
  ok(hamji > 0, '0a 소스의 «햄지» 문자열 수', String(hamji));
  const spcBlock = (code.match(/function renderSpec\(\)[\s\S]*?\n\}/) || [''])[0];
  const litRows = (spcBlock.match(/'[^']*',\s*'[^']*%'/g) || []);
  ok(true, '0b `renderSpec` 안에서 **값이 리터럴**인 행', litRows.length ? litRows.join(' · ') : '없음');
  const avaMk = (code.match(/<div class="spc-ava">[\s\S]{0,400}?<\/div><\/div>/) || [''])[0].replace(/\s+/g, ' ');
  ok(!!avaMk, '0c 종합스탯 아이콘 마크업', avaMk.slice(0, 120));
  ok(/porPaint/.test(code), '0d 코스튬 초상 공용 부품 `porPaint` 가 있다(19 가 이미 쓴다)',
     /porPaint\(\$\('pfPor'\)\)/.test(code) ? '19 #pfPor 가 부른다' : '못 찾음');

  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });

  /* ── ③ 먼저 — 프레임 높이별 두 상자 ────────────────────────────────── */
  console.log('\n[1] ③ 두 팝업 상자 — 프레임 높이별 bbox 와 «탭 전환 튐»');
  const HS = [2600, 2280, 1920, 1600];
  const rows = [];
  for (const H of HS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof openProfile === 'function' && typeof openSpec === 'function');
    await page.waitForTimeout(700);
    /* 실사용 경로 — HUD 초상 → 19 → 하단 토글 «종합 스탯» → 20 */
    await page.evaluate(() => openProfile());
    await settle(page, '.pf');
    const a = await page.evaluate(BOX);
    await page.evaluate(() => { const e = document.querySelector('.pf-tgl>.lb'); if (e) e.click(); });
    await settle(page, '.spc');
    const b = await page.evaluate(BOX);
    await ctx.close();
    const pf = a.pf, spc = b.spc;
    const d = (pf && spc) ? { dx: +(spc.x - pf.x).toFixed(1), dy: +(spc.y - pf.y).toFixed(1),
                              dw: +(spc.w - pf.w).toFixed(1), dh: +(spc.h - pf.h).toFixed(1) } : null;
    rows.push({ H, pf, spc, d });
    ok(!!(pf && spc), `1-${H} 두 상자를 다 읽었다`,
       pf && spc ? `19 ${pf.x},${pf.y} ${pf.w}×${pf.h}  →  20 ${spc.x},${spc.y} ${spc.w}×${spc.h}` : '실패');
    if (d) ok(true, `1-${H} **탭 전환 튐**`,
       `Δx ${d.dx} · Δy ${d.dy} · Δw ${d.dw} · Δh ${d.dh}` + (Math.max(Math.abs(d.dx), Math.abs(d.dy), Math.abs(d.dw), Math.abs(d.dh)) <= 1 ? '  (Δ0 급)' : '  ← **튄다**'));
  }
  console.log('\n  프레임 |     19 프로필(.pf)      |    20 종합스탯(.spc)    |   Δ(20 − 19)');
  rows.forEach(r => {
    const f = o => o ? String(o.x).padStart(6) + ',' + String(o.y).padStart(6) + ' ' + String(o.w).padStart(4) + '×' + String(o.h).padStart(4) : '   —   ';
    console.log('  ' + String(r.H).padStart(6) + ' | ' + f(r.pf) + ' | ' + f(r.spc) + ' | '
      + (r.d ? `x${String(r.d.dx).padStart(6)} y${String(r.d.dy).padStart(6)} w${String(r.d.dw).padStart(5)} h${String(r.d.dh).padStart(5)}` : '—'));
  });

  /* ── ①②④ — 기준 프레임에서 화면을 읽는다 ─────────────────────────── */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof openSpec === 'function');
  await page.waitForTimeout(800);
  /* 19 를 먼저 열어야 `#pfGid` 가 채워진다(그 자리는 `renderProfile` 이 쓴다) — 실사용 경로와 같다 */
  await page.evaluate(() => openProfile());
  await page.waitForTimeout(200);
  await page.evaluate(() => openSpec());
  await page.waitForTimeout(300);

  console.log('\n[2] ① 종합스탯 13행 — 라벨과 값');
  const sp = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('#spcList .spc-row')].map(r =>
      [r.querySelector('.nm').textContent.trim(), r.querySelector('.vl').textContent.trim()]),
    gid: (document.getElementById('spcGid').textContent || '').trim(),
    pfGid: (document.getElementById('pfGid').textContent || '').trim(),
    live: { dmg: stat.dmg, hp: stat.maxHp, regen: stat.regen, rate: stat.rate,
            crit: stat.crit, cdmg: stat.cdmg, gold: stat.goldMul, cp: cp(),
            dps: stat.dps, pierce: stat.pierce, def: stat.defMul }
  }));
  sp.rows.forEach((r, i) => console.log('   ' + String(i + 1).padStart(2) + '. ' + r[0].padEnd(22) + ' = ' + r[1]));
  const ham = sp.rows.filter(r => /햄지/.test(r[0])).length;
  ok(sp.rows.length > 0, '2a 행을 읽었다', sp.rows.length + '행');
  ok(true, '2b 그중 «햄지» 라벨', ham + '행 / ' + sp.rows.length);
  const fixed = sp.rows.filter(r => /^(100%|0%)$/.test(r[1])).length;
  ok(true, '2c **상태와 무관한 고정값** 행', fixed + '행 (' + sp.rows.filter(r => /^(100%|0%)$/.test(r[1])).map(r => r[0]).join(' · ') + ')');
  console.log('   살아 있는 축: cp ' + Math.round(sp.live.cp) + ' · dps ' + sp.live.dps.toFixed(1)
    + ' · 관통 ' + sp.live.pierce + ' · 방어 ' + sp.live.def.toFixed(3) + ' · 공속 ' + sp.live.rate.toFixed(3));

  console.log('\n[3] ② 종합스탯 아이콘 — 지금 무엇이 그려지는가');
  const ava = await page.evaluate(() => {
    const el = document.querySelector('.spc-ava');
    const cv = el && el.querySelector('canvas');
    const em = el && el.querySelector('i,em');
    const b = el ? el.getBoundingClientRect() : null;
    return { html: el ? el.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 120) : null,
             canvas: !!cv, text: em ? em.textContent.trim() : '', w: b ? +b.width.toFixed(1) : 0, h: b ? +b.height.toFixed(1) : 0 };
  });
  ok(!!ava.html, '3a `.spc-ava` 내용', ava.html);
  ok(true, '3b 캔버스(코스튬 스프라이트)인가', ava.canvas ? '예' : '**아니오 — 문자 «' + ava.text + '»**');
  ok(true, '3c 상자 크기(아트 자리)', ava.w + '×' + ava.h);
  /* 코스튬을 갈아입혀 본다 — 따라오면 «이미 파생», 안 따라오면 «고정 그림» */
  /* ⚠ `toDataURL` 은 못 쓴다 — file:// 아틀라스를 그린 캔버스는 **오염(tainted)** 이라 SecurityError 다.
     대신 `porPaint` 가 칠할 때 적어 두는 «무엇을 그렸는가» 표식(`dataset.cosav`)을 읽는다. */
  const follow = await page.evaluate(() => {
    const snap = () => { const el = document.querySelector('.spc-ava'); const cv = el && el.querySelector('canvas');
      return cv ? (cv.dataset.cosav + (cv.style.display === 'none' ? '(안 그려짐)' : '')) : (el ? el.textContent.trim() : 'n/a'); };
    const before = snap();
    const ids = (typeof AVATARS !== 'undefined' ? AVATARS : []).map(a => a.id);
    const other = ids.find(id => id !== (typeof cosCur === 'function' ? cosCur() : ''));
    if (other) { S.avatar = other; S.avatars = Object.assign({}, S.avatars, { [other]: 1 }); save(); }
    if (typeof renderSpec === 'function') renderSpec();
    return { before, after: snap(), other: other || 'n/a', cur: typeof cosCur === 'function' ? cosCur() : 'n/a' };
  });
  ok(true, '3d 코스튬을 갈아입히면 아이콘이 따라오는가',
     follow.before === follow.after ? '**안 따라온다** (' + follow.before + ')' : follow.before + ' → ' + follow.after);
  ok(true, '3e 갈아입힌 코스튬', follow.other + ' · cosCur = ' + follow.cur);

  console.log('\n[4] ④ 상단 Gamer Id');
  ok(true, '4a 20 종합스탯 `#spcGid`', sp.gid);
  ok(true, '4b 19 프로필 `#pfGid`', sp.pfGid);

  console.log('\n[5] 콘솔');
  ok(errs.length === 0, '5a 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nPROBE705 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
