/* 작업 959 게이트 — «`#bossSkip` 의 상자는 잉크만 하다 = 투명 여백이 탭을 먹지 않는다»
 *
 *   node tools/verify959.js
 *
 * 결함(등재 959 · 재현 `tools/probe959.js`): 699 가 «연출 스킵» 토글을 화면 중앙에 놓을 때
 * 정렬 손잡이로 `left:0;right:0` + `justify-content:center` 를 썼다. 남는 자리를 가운데로 미는
 * 방식이라 **상자는 프레임 전폭 1080**(잉크 239.4)이고, 좌우 **421.3 / 419.3px** 의 투명 여백이
 * 그 y 띠를 통째로 덮는다. 이 토글은 `pointer-events` 가 살아 있는 «누르는 것» 이라
 * 그 여백이 **탭을 먹는다** — 좌측 사이드 «퀘스트» 칸을 누르면 퀘스트 팝업 대신
 * «연출 스킵» 설정이 뒤집혔다(`verify74` 「사이드 아이콘」 191/200 의 정체).
 *
 * 수리: 정렬을 «남는 자리를 가운데로» 에서 **«상자를 잉크만큼»**(`width:fit-content` + auto 마진)
 * 으로 바꿨다. 같은 부품의 다른 호스트 `#rouSkip` 이 이미 그 꼴이다.
 *
 * 재는 것 여섯:
 *   [A] 기하   — 상자 ≈ 잉크(투명 여백 ≤ 3px) · 중심 x540 축 · 잉크 자리 Δ0(699 값 보존)
 *   [B] 규약   — 자리 규칙은 한 벌뿐이고 `.sh` 는 `display` 만 만진다(= 상자가 상태와 무관하다)
 *                + `left:50%`/`translateX` 로 되돌리지 않았다(`.sm-sk:active` 의 `scale` 과 다툰다)
 *   [C] 덮임 0 — 사이드 아이콘 전수 + 그 y 띠 전폭의 «누르는 것» 이 하나도 안 먹힌다
 *   [D] 기능   — 699 가 만든 토글은 그대로 눌린다(잉크 탭 → `S.opt.fxSkip` 뒤집힘 · 다른 호스트 동기화)
 *   [E] 되돌림 시험 — 런타임에 옛 손잡이(`justify-content:center` + `width:auto`)를 도로 먹이면
 *                **이 자가 빨개진다**. 없으면 «무르게 푼 수리» 와 구분이 안 된다(334 규약).
 *   [F] 형제   — 같은 부품 `.sm-sk` 의 다른 호스트에도 같은 함정이 없다(소스 스윕 + 열 수 있는 것 실측)
 *
 * 110 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const blk = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('  FAIL ' + name + ' — 예외: ' + e.message); } };

/* 699 가 세운 값 — 수리는 **상자 폭**만 바꾼다. 잉크가 움직이면 그건 다른 작업이다. */
const INK = { cx: 541.05, w: 239.44, top: 500, h: 56 };   /* 1080×2280 · `fm` 상태 실측(probe959) */

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [B] 규약 — 소스 텍스트 ───────────────────────────────────────────────── */
  console.log('\n[B] 규약 — 자리 규칙 한 벌 · `.sh` 는 display 만');
  const posRule = (src.match(/#bossSkip\s*\{[^}]*\}/g) || []);
  const shRule = (src.match(/#bossSkip\.sh\s*\{[^}]*\}/g) || []);
  ok(posRule.length === 1, '`#bossSkip{…}` 자리 규칙은 한 벌 (실측 ' + posRule.length + '벌)');
  ok(shRule.length === 1 && /^\s*#bossSkip\.sh\s*\{\s*display\s*:[^;}]*;?\s*\}$/.test(shRule[0]),
    '`.sh` 는 `display` 만 만진다 ⇒ 상자는 표시 상태(bf/fm)와 무관하다 — ' + (shRule[0] || '(없음)'));
  const pos = posRule[0] || '';
  ok(/width\s*:\s*fit-content/.test(pos), '`width:fit-content` — 상자를 잉크만큼 (' + (pos.match(/width\s*:[^;}]*/) || ['없음'])[0] + ')');
  ok(/margin-inline\s*:\s*auto|margin\s*:[^;}]*auto/.test(pos), 'auto 마진으로 중앙 — ' + (pos.match(/margin[^;}]*/) || ['없음'])[0]);
  ok(!/justify-content\s*:\s*center/.test(pos),
    '`justify-content:center` 로 되돌아가지 않았다 — 그것이 전폭 상자를 만든 손잡이다');
  ok(!/left\s*:\s*50%/.test(pos) && !/translateX/.test(pos),
    '`left:50%`+`translateX` 로 풀지 않았다 — `.sm-sk:active{transform:scale(.96)}` 가 같은 속성을 덮어써 누르는 순간 튄다');

  /* ── [F] 형제 — 같은 부품의 다른 호스트에 같은 함정이 없는가(소스 스윕) ───────── */
  console.log('\n[F] 형제 호스트 — `.sm-sk` 를 쓰는 자리 전수(소스)');
  const hosts = [...new Set((src.match(/id="(\w+)"[^>]*class="[^"]*sm-sk|class="sm-sk"[^>]*id="(\w+)"/g) || [])
    .map(s => (s.match(/id="(\w+)"/) || [])[1]).filter(Boolean))];
  console.log('       호스트: ' + hosts.join(' · '));
  ok(hosts.length >= 3, '`.sm-sk` 호스트 ' + hosts.length + '곳 (514 «부품 한 벌 · 호스트 여럿»)');
  for (const h of hosts) {
    const r = (src.match(new RegExp('#' + h + '\\s*\\{[^}]*\\}')) || [''])[0];
    if (!r) { ok(false, '#' + h + ' 자리 규칙을 못 찾았다'); continue; }
    const wide = /left\s*:\s*0/.test(r) && /right\s*:\s*0/.test(r) && !/width\s*:\s*fit-content/.test(r);
    ok(!wide, '#' + h + ' — `left:0;right:0` 로 상자를 늘려 놓고 `fit-content` 가 없는 자리가 아니다');
  }

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof drawHud === 'function');
  await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x, y) => {
    const started = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await new Promise(r => setTimeout(r, 90));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await started.catch(() => {});
  };

  await page.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__hit = ''; window.__land = '';
    const desc = el => { if (!el) return '(null)'; let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id; if (typeof el.className === 'string' && el.className.trim())
      s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
    window.__desc = desc;
    document.addEventListener('click', e => {
      window.__land = desc(e.target);
      const b = e.target && e.target.closest && e.target.closest('.side .ibtn[data-pop]');
      if (b) window.__hit = b.dataset.pop;
    }, true);
    /* 제품 경로로 켠다 — 손으로 `.sh` 를 붙이면 «내가 만든 상태» 를 재게 된다 */
    S.bossFarm = true; drawHud();
  });

  /* 한 번에 재는 자 — [E] 되돌림 시험이 같은 자를 두 번 쓴다 */
  const geo = () => page.evaluate(() => {
    const el = document.getElementById('bossSkip');
    const b = el.getBoundingClientRect();
    let l = Infinity, r = -Infinity, t = Infinity, bt = -Infinity;
    el.querySelectorAll(':scope > *').forEach(c => {
      const q = c.getBoundingClientRect();
      l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); bt = Math.max(bt, q.bottom);
    });
    const side = [];
    document.querySelectorAll('#sideL .ibtn, #sideR .ibtn').forEach(e2 => {
      const q = e2.getBoundingClientRect();
      const x = q.left + q.width / 2, y = q.top + q.height / 2;
      const top = document.elementFromPoint(x, y);
      side.push({ pop: e2.dataset.pop || '?', x, y, top: window.__desc(top),
                  covered: !(top && top.closest && top.closest('.ibtn')) });
    });
    const band = [];
    document.querySelectorAll('button, [onclick], [data-pop], .ibtn, .tab, .bbtn, #menub, .clk').forEach(e2 => {
      if (e2.closest('#bossSkip')) return;
      const q = e2.getBoundingClientRect();
      if (!q.width || !q.height) return;
      const x = q.left + q.width / 2, y = q.top + q.height / 2;
      if (y < b.top || y > b.bottom) return;
      const top = document.elementFromPoint(x, y);
      if (top && top.closest && top.closest('#bossSkip')) band.push({ el: window.__desc(e2), x, y });
    });
    return { sh: el.classList.contains('sh'),
             box: { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width },
             ink: { l, r, t, b: bt, w: r - l, h: bt - t, cx: (l + r) / 2 },
             padL: l - b.left, padR: b.right - r, side, band };
  });

  /* ── [A] 기하 ───────────────────────────────────────────────────────────── */
  console.log('\n[A] 기하 — 상자는 잉크만 하다 · 잉크 자리는 699 값 그대로');
  let g = null;
  await blk('[A]', async () => {
    g = await geo();
    console.log('       상자 x ' + g.box.l.toFixed(1) + '..' + g.box.r.toFixed(1) + ' (w ' + g.box.w.toFixed(1) + ')'
      + ' · 잉크 x ' + g.ink.l.toFixed(1) + '..' + g.ink.r.toFixed(1) + ' (w ' + g.ink.w.toFixed(1) + ')'
      + ' ⇒ 여백 좌 ' + g.padL.toFixed(1) + ' · 우 ' + g.padR.toFixed(1));
    ok(g.sh === true, '제품 `drawHud()` 가 `.sh` 를 켰다(`fm` = 보스 재도전 대기)');
    ok(g.padL <= 3 && g.padR <= 3, '투명 여백 좌 ' + g.padL.toFixed(1) + ' · 우 ' + g.padR.toFixed(1) + 'px ≤ 3');
    ok(Math.abs(g.ink.cx - INK.cx) <= 1.5, '잉크 중심 x ' + g.ink.cx.toFixed(2) + ' ≈ ' + INK.cx + ' (버튼 중심선 x540 축)');
    ok(Math.abs(g.ink.w - INK.w) <= 1.5, '잉크 폭 ' + g.ink.w.toFixed(2) + ' ≈ ' + INK.w + ' (699 Δ0)');
    ok(Math.abs(g.ink.t - INK.top) <= 0.5 && Math.abs(g.ink.h - INK.h) <= 0.5,
      '잉크 y ' + g.ink.t.toFixed(1) + '..' + (g.ink.t + g.ink.h).toFixed(1) + ' (699 띠 396..452 = 프레임 ' + INK.top + '..' + (INK.top + INK.h) + ')');
    ok(Math.abs(g.box.w - g.ink.w) <= 3, '상자 폭 ' + g.box.w.toFixed(1) + ' ≈ 잉크 폭 ' + g.ink.w.toFixed(1));
  });

  /* ── [C] 덮임 0 ─────────────────────────────────────────────────────────── */
  console.log('\n[C] 덮임 0 — 사이드 아이콘 전수 + 그 y 띠 전폭');
  await blk('[C]', async () => {
    g.side.forEach(c => console.log('       ' + (c.covered ? '✗ 가려짐' : '· 맨 위 ') + ' ' + c.pop
      + ' (' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ') 최상위=' + c.top));
    ok(g.side.length >= 6, '사이드 아이콘 ' + g.side.length + '칸 (`#sideR` 은 작업 49 에서 삭제 — 좌 6칸)');
    ok(g.side.every(c => !c.covered), '가려진 칸 0건');
    ok(g.band.length === 0, '띠 전폭에서 `#bossSkip` 에 먹힌 «누르는 것» 0건'
      + (g.band.length ? ' — ' + g.band.map(b => b.el).join(' · ') : ''));
  });

  /* ── [D] 기능 — 699 보존 ─────────────────────────────────────────────────── */
  console.log('\n[D] 기능 — 699 토글은 그대로 눌린다');
  await blk('[D]', async () => {
    const b0 = await page.evaluate(() => !!S.opt.fxSkip);
    await tap(g.ink.cx, g.ink.t + g.ink.h / 2);
    await page.waitForTimeout(140);
    const r = await page.evaluate(() => ({ skip: !!S.opt.fxSkip,
      allOn: [...document.querySelectorAll('.sm-sk')].map(e => e.classList.contains('on')),
      knob: [...document.querySelectorAll('.sm-sk .sm-skk>em')].map(e => e.textContent) }));
    ok(r.skip !== b0, '잉크 중심 탭 → `S.opt.fxSkip` ' + b0 + '→' + r.skip);
    ok(r.allOn.every(v => v === r.skip), '`fxSyncSkip` — `.sm-sk` 전 호스트가 같은 값 (' + r.allOn.join(',') + ')');
    ok(r.knob.every(v => v === (r.skip ? 'ON' : 'OFF')), '노브 라벨 ' + [...new Set(r.knob)].join(',') + ' = 상태와 일치');
    /* 원복 — 뒤 블록이 같은 조건에서 돌아야 한다 */
    await page.evaluate(() => { S.opt.fxSkip = !S.opt.fxSkip; fxSyncSkip(); });
    /* 사이드 칸이 실제로 자기 핸들러에 닿는가 — 74 와 같은 자(칸당 3발, 유실 축은 눌러 둔다) */
    const cell = g.side.find(c => Math.abs(c.y - (g.ink.t + g.ink.h / 2)) < 40) || g.side[2];
    let hit = false;
    for (let k = 0; k < 3 && !hit; k++) {
      await page.evaluate(() => { window.__hit = ''; window.__land = ''; window.__closeAll && window.__closeAll(); });
      await tap(cell.x, cell.y);
      await page.waitForTimeout(140);
      hit = await page.evaluate(p => window.__hit === p, cell.pop);
      await page.evaluate(() => { try { closeModal(); } catch (_) {} try { closeQuest(); } catch (_) {} S.bossFarm = true; drawHud(); });
      await page.waitForTimeout(140);
    }
    ok(hit, '띠와 겹치는 사이드 칸 «' + cell.pop + '» 탭이 그 칸의 핸들러에 닿는다(74 의 191/200 자리)');
    const after = await page.evaluate(() => !!S.opt.fxSkip);
    ok(after === b0, '그 탭이 «연출 스킵» 을 건드리지 않았다 (' + b0 + '→' + after + ')');
  });

  /* ── [E] 되돌림 시험 ─────────────────────────────────────────────────────── */
  console.log('\n[E] 되돌림 시험 — 옛 손잡이를 도로 먹이면 이 자가 빨개지는가');
  await blk('[E]', async () => {
    await page.evaluate(() => {
      const st = document.createElement('style');
      st.id = '__r959';
      st.textContent = '#bossSkip{width:auto!important;margin-inline:0!important;justify-content:center!important}';
      document.head.appendChild(st);
      S.bossFarm = true; drawHud();
    });
    await page.waitForTimeout(120);
    const r = await geo();
    ok(r.padL > 300 && r.padR > 300, '되돌리면 투명 여백이 좌 ' + r.padL.toFixed(1) + ' · 우 ' + r.padR.toFixed(1) + 'px 로 돌아온다');
    ok(r.side.some(c => c.covered), '되돌리면 가려진 칸이 되살아난다 ('
      + r.side.filter(c => c.covered).map(c => c.pop).join(',') + ') = 이 자는 정말 그 축을 잰다');
    ok(Math.abs(r.ink.cx - INK.cx) <= 1.5, '되돌려도 **잉크 중심은 같다** — 이 결함은 눈에 안 보였다(그래서 오래 남았다)');
    await page.evaluate(() => { const e = document.getElementById('__r959'); if (e) e.remove(); });
  });

  /* ── [F-런타임] 열 수 있는 형제 호스트 실측 ──────────────────────────────── */
  console.log('\n[F-런타임] 열 수 있는 형제 호스트 실측');
  await blk('[F-런타임]', async () => {
    const r = await page.evaluate(() => {
      const out = [];
      const meas = id => {
        const el = document.getElementById(id);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return null;
        let l = Infinity, rr = -Infinity;
        el.querySelectorAll(':scope > *').forEach(c => { const q = c.getBoundingClientRect(); l = Math.min(l, q.left); rr = Math.max(rr, q.right); });
        return { id, boxW: b.width, inkW: rr - l, padL: l - b.left, padR: b.right - rr };
      };
      const push = id => { const m = meas(id); if (m) out.push(m); };
      push('bossSkip');
      try { openConf(); push('cfSkip'); closeConf(); } catch (_) {}
      try { openRoulette(); push('rouSkip'); closeRoulette(); } catch (_) {}
      return out;
    });
    r.forEach(m => console.log('       #' + m.id + ' 상자 ' + m.boxW.toFixed(1) + ' · 잉크 ' + m.inkW.toFixed(1)
      + ' ⇒ 여백 좌 ' + m.padL.toFixed(1) + ' · 우 ' + m.padR.toFixed(1)));
    ok(r.length >= 2, '실측한 호스트 ' + r.length + '곳');
    ok(r.every(m => m.padL <= 3 && m.padR <= 3), '전 호스트 투명 여백 ≤ 3px — 같은 함정이 형제에 없다');
  });

  await browser.close();
  console.log('');
  if (errs.length) console.log('  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  console.log((fail ? 'VERIFY959 FAIL' : 'VERIFY959 PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
