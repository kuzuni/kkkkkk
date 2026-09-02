#!/usr/bin/env node
/* 작업 797 게이트 — 배수 바 네 자리의 «칸 수명»
 *
 *   node tools/verify797.js
 *
 * 등재문(PROGRESS 797 · review 701 §5): 668·700 의 배수 바 둘(`#sumMulBar` 12 결과 팝업(713) ·
 * `#rwMulBar` 89 유물)이 렌더마다 `bar.innerHTML = mulBarHTML(...)` 로 칸을 통째로 갈아 끼워
 * **누른 그 칸이 손가락 밑에서 죽는다**(터치의 암묵적 포인터 캡처가 끊긴다 — 64 교훈 1 · 262 ⓑ ·
 * LESSONS 50-①). 701 이 단련·룬 두 자리에서 이미 고쳐 뒀고(`verify491` [2-a]), 그 두 자리는
 * 491 의 스캔 범위(23 훈련 팝업) 밖이라 안 잡혔을 뿐이었다.
 *
 * `probe797` 이 수리 전 트리에서 그것을 그대로 확인했다 —
 *   재렌더 한 번에 살아남은 칸: 상점 **0/4** · 유물 **0/4** · (대조군) 단련 4/4 · 룬 4/4.
 *
 * 처방은 «자리마다 베끼기» 가 아니라 **칠하는 법을 한 함수로 모으기**(`paintMulBar`)다 —
 * 네 자리가 갈라질 자리 자체가 없어진다(700 §2 «칸 모양이 갈라질 방법이 없다» 의 수명 축 확장).
 *
 * 절 다섯 — 한 층만 물으면 헛초록이 난다(519 교훈):
 *   §1 소스 — 칠하는 법이 한 벌이고 네 자리가 그것을 읽는다(`innerHTML` 대입은 그 한 곳뿐)
 *   §2 실행 — 네 자리 **전수**에서 ⓐ 재렌더 뒤 칸이 같은 객체 ⓑ 누른 채 재렌더에도 그 칸이 산다
 *   §3 값   — 살려 둔 대가로 표시가 굳지 않는다(켜진 칸 = 현재 배수 · 잉크 ol4/ol3 · 말은 SUM_MULS 파생)
 *   §4 이관 — 488 [E1]·[E2] 의 관측점(`summonRelicBatch`)이 실제로 그 홀드가 지나는 이름이다
 *   §R 되돌림 — 옛 «매번 innerHTML» 사본에서는 §2 가 **빨개진다**(무르게 풀지 않았다는 증명)
 *   §Z 콘솔 에러 0
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.v797-neg-${process.pid}.html`);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

/* 네 자리. `open` 은 그 화면을 띄우고, `rerender` 는 그 화면이 **평소에 스스로 부르는** 렌더다
   (자를 위해 새 경로를 만들지 않는다 — 368 «제품에게 물어라»). */
const SITES = [
  { id: 'sumMulBar', n: '12 결과 팝업(713)',
    open: () => { const B = (typeof gmBan === 'function' && gmBan()) || 'weapon'; doSummon(B, 10); },
    rerender: () => syncSummonBtns(), cur: () => sumMul, set: m => { sumMul = m; } },
  { id: 'rwMulBar', n: '89 유물 소환(700)',
    open: () => openRelw(),
    rerender: () => renderRelw(), cur: () => relMul, set: m => { relMul = m; } },
  { id: 'tpMulBar', n: '23 단련(701)',
    open: () => { openTrain(); setTrSub('temper'); renderTrain(); },
    rerender: () => renderTrain(), cur: () => trMul, set: m => { trMul = m; } },
  { id: 'rnMulBar', n: '23 룬(701)',
    open: () => { openTrain(); setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); },
    rerender: () => renderTrain(), cur: () => trMul, set: m => { trMul = m; } },
];

async function boot(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
    S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart();   /* 73 ③ */
  });
  return { ctx, page, errs };
}
async function reset(page) {
  await page.evaluate(() => {
    try { closeSummonResult(); } catch (_) {}
    try { closeRelw(); } catch (_) {}
    try { closeTrain(); } catch (_) {}
    try { closeModal(); } catch (_) {}
    S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
  });
  await page.waitForTimeout(180);
}

/* 재렌더 한 번 뒤 칸이 «같은 객체» 인가 — 도장을 노드에 찍는다(셀렉터로 되찾으면 재렌더가 놓은
   **새 노드**를 같은 것으로 착각한다 — probe491 1회차 함정). */
async function identity(page, s) {
  await reset(page);
  return page.evaluate(S2 => {
    const s = eval('(' + S2 + ')');
    s.open();
    const bar = document.getElementById(s.id); if (!bar) return { miss: true };
    const before = [...bar.children];
    before.forEach((c, i) => { c.__v797 = i; });
    s.rerender();
    const after = [...bar.children];
    return { miss: false, n0: before.length, n1: after.length,
             kept: after.filter(c => c.__v797 !== undefined).length,
             same: after.length === before.length && after.every((c, i) => c.__v797 === i) };
  }, `{id:${JSON.stringify(s.id)},open:${s.open},rerender:${s.rerender}}`);
}

/* 누른 채로 그 화면의 평소 렌더가 돌면 «누른 그 칸» 이 사는가 — 491 [2-a] 와 같은 물음.
   ⚠ 도장은 **칸 자신**(`[data-mul]`)에 찍는다. `jzTarget()` 의 쥬시 호스트는 자리마다 조상일 수
     있고(그 조상은 재렌더에도 안 죽는다) 그것을 재면 헛초록이 난다 — probe797 1회차가 실제로 그랬다. */
async function pressThroughRender(page, s) {
  await reset(page);
  await page.evaluate(S2 => { eval('(' + S2 + ')').open(); }, `{open:${s.open}}`);
  await page.waitForTimeout(600);        /* 팝업 등장 애니가 앉을 때까지 — 안 기다리면 칸을 못 잡는다 */
  const b = await page.evaluate(id => {
    const bar = document.getElementById(id); if (!bar) return null;
    const c = [...bar.children].find(x => !x.classList.contains('on')) || bar.children[0];
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, s.id);
  if (!b) return { had: false, alive: false };
  await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    window.__h797 = el ? el.closest('[data-mul]') : null;
  }, [b.x, b.y]);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  const r = await page.evaluate(S2 => {
    const s = eval('(' + S2 + ')');
    const h = window.__h797;
    s.rerender();
    return { had: !!h, alive: !!(h && h.isConnected) };
  }, `{rerender:${s.rerender}}`);
  await page.mouse.up();
  await page.waitForTimeout(120);
  return r;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  /* ══ §1 소스 — 칠하는 법이 한 벌인가 ══════════════════════════════ */
  console.log('§1 소스 — 칠하는 법이 한 벌이고 네 자리가 그것을 읽는다');
  ok(/function paintMulBar\(bar, cur\)\{/.test(src),
     '[1-a] 공용 칠하기 `paintMulBar(bar, cur)` 가 선언돼 있다');
  ok(/if\(bar\.children\.length !== SUM_MULS\.length\) bar\.innerHTML = mulBarHTML\(cur\);/.test(src),
     '[1-b] ★ 칸을 만드는 것은 **칸 수가 다를 때뿐**이다(그 뒤로는 노드를 살려 둔다)');
  /* «말» 이 두 벌이 되지 않았는지 — `mulBarHTML` 을 innerHTML 에 대입하는 자리가 그 한 곳뿐이어야 한다.
     ⚠ 이 항이 이 자의 못이다: 자리 하나가 옛 방식으로 되돌아가면(또는 다섯 번째 바가 그 꼴로
        새로 생기면) 여기가 곧바로 빨개진다. */
  const assigns = (src.match(/innerHTML\s*=\s*mulBarHTML\(/g) || []).length;
  ok(assigns === 1, '[1-c] ★ `innerHTML = mulBarHTML(...)` 대입은 저장소 전체에서 **한 곳뿐**이다',
     assigns + '곳');
  for (const [fn, arg] of [['renderSumMulBar', 'sumMul'], ['renderRwMulBar', 'relMul']])
    ok(new RegExp('function ' + fn + '\\(\\)\\{ paintMulBar\\(\\$\\(\'\\w+\'\\), ' + arg + '\\); \\}').test(src),
       '[1-d:' + fn + '] 그 자리는 공용 칠하기를 부른다(자기 몸에 칸을 안 적는다)');
  ok(/\['rnMulBar', 'tpMulBar'\]\.forEach\(id => paintMulBar\(\$\(id\), trMul\)\);/.test(src),
     '[1-e] 훈련 두 자리(701)도 같은 공용 칠하기를 읽는다');
  /* 칸의 «말» 자체는 여전히 SUM_MULS 한 곳에서 온다(700 §2 규약 — 이 수리가 그것을 안 깼다) */
  ok(/const mulBarHTML = cur => SUM_MULS\.map\(/.test(src),
     '[1-f] 칸의 «말» 은 여전히 `SUM_MULS` 한 곳에서 온다');

  const { ctx, page, errs } = await boot(browser, SRC);

  /* ══ §2 실행 — 네 자리 전수 ═══════════════════════════════════════ */
  console.log('§2 실행 — 네 자리 전수: 재렌더 뒤 칸이 같은 객체 · 누른 채 재렌더에도 그 칸이 산다');
  const idn = {}, prs = {};
  for (const s of SITES) {
    const r = idn[s.id] = await identity(page, s);
    ok(!r.miss && r.same,
       '[2-a:' + s.id + '] ★ ' + s.n + ' — 재렌더 뒤에도 칸이 **같은 노드**다',
       r.miss ? '바 없음' : ('kept ' + r.kept + '/' + r.n0 + ' · 칸 ' + r.n0 + '→' + r.n1));
  }
  for (const s of SITES) {
    const r = prs[s.id] = await pressThroughRender(page, s);
    ok(r.had, '[2-b0:' + s.id + '] 표본 — 그 자리의 칸을 실제로 잡았다');
    ok(r.had && r.alive,
       '[2-b:' + s.id + '] ★ ' + s.n + ' — **누른 그 칸**이 재렌더를 지나 살아남는다',
       'alive=' + r.alive);
  }

  /* ══ §3 값 — 살려 둔 대가로 표시가 굳지 않았는가 ═══════════════════ */
  console.log('§3 값 — 켜진 칸 = 현재 배수 · 잉크 ol4/ol3 · 말은 SUM_MULS 파생');
  for (const s of SITES) {
    await reset(page);
    const r = await page.evaluate(S2 => {
      const s = eval('(' + S2 + ')');
      s.open();
      const bar = document.getElementById(s.id); if (!bar) return null;
      const muls = [...bar.children].map(c => +c.dataset.mul);
      const seen = [];
      /* **모든** 배수를 한 바퀴 돌린다 — 노드를 살려 두는 처방이 «맨 처음 그린 상태로 굳는» 것을
         잡으려면 한 번이 아니라 전수여야 한다(수리를 무르게 하는 가장 쉬운 길이 그것이다). */
      for (const m of muls) {
        s.set(m); s.rerender();
        const on = [...bar.children].filter(c => c.classList.contains('on')).map(c => +c.dataset.mul);
        const ol4 = [...bar.children].map(c => c.querySelector('i'))
          .filter(i => i && i.classList.contains('ol4')).length;
        const ol3 = [...bar.children].map(c => c.querySelector('i'))
          .filter(i => i && i.classList.contains('ol3')).length;
        seen.push({ m, on, ol4, ol3 });
      }
      return { muls, seen, MULS: SUM_MULS.slice(),
               txt: [...bar.children].map(c => (c.querySelector('i').textContent || '').trim()) };
    }, `{id:${JSON.stringify(s.id)},open:${s.open},rerender:${s.rerender},cur:${s.cur},set:${s.set}}`);
    if (!r) { ok(false, '[3-' + s.id + '] 바가 없다'); continue; }
    const bad = r.seen.filter(x => !(x.on.length === 1 && x.on[0] === x.m && x.ol4 === 1 && x.ol3 === r.muls.length - 1));
    ok(bad.length === 0,
       '[3-a:' + s.id + '] ★ 배수 ' + r.muls.length + '종 **전수**에서 켜진 칸 하나 = 그 배수 · 잉크 ol4 하나',
       bad.length ? JSON.stringify(bad[0]) : r.seen.map(x => '×' + x.m).join(' '));
    ok(r.muls.join(',') === r.MULS.join(','),
       '[3-b:' + s.id + '] 칸 목록이 `SUM_MULS` 그대로다', '[' + r.muls + ']');
    ok(r.txt.join(' ') === r.MULS.map(m => '×' + m.toLocaleString('en-US')).join(' '),
       '[3-c:' + s.id + '] 칸의 말도 `SUM_MULS` 파생 그대로다(살려 둔 노드에 옛 글자가 굳지 않았다)',
       '"' + r.txt.join(' ') + '"');
  }

  /* ══ §4 이관 — 488 [E1]·[E2] 의 관측점 ════════════════════════════ */
  console.log('§4 이관 — 유물 홀드가 지나는 «1 실행» 이름(verify488 [E1]·[E2])');
  await reset(page);
  await page.evaluate(() => {
    openRelw();
    window.__c797 = { summonRelic: 0, summonRelicBatch: 0, hb: 0 };
    ['summonRelic', 'summonRelicBatch'].forEach(n => {
      const o = window[n];
      window[n] = function () { const r = o.apply(this, arguments); window.__c797[n]++; return r; };
    });
    const ohb = window.hbBeat;
    window.hbBeat = function () { window.__c797.hb++; return ohb.apply(this, arguments); };
  });
  await page.waitForTimeout(300);
  {
    const b = await page.evaluate(() => { const r = document.getElementById('rwBasin').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.waitForTimeout(2200);      /* verify488 의 HOLD 와 같은 눈금 */
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  const c = await page.evaluate(() => window.__c797);
  /* ⚠ 문턱은 «잰 값» 이다(504-④) — 홀드 간격이 가속하므로 2200ms 에서 4~9회로 흔들린다. */
  ok(c.summonRelicBatch >= 4, '[4-a] ★ 홀드는 `summonRelicBatch` 를 여러 번 지난다(488 [E1] 의 전제)',
     c.summonRelicBatch + '회');
  ok(c.hb === c.summonRelicBatch, '[4-b] ★ 맥박 수 = 그 수(488 [E2] 와 같은 축)',
     c.hb + ' / ' + c.summonRelicBatch);
  ok(/await countTries\('summonRelicBatch'\); await reset\(\);/.test(fs.readFileSync(path.join(__dirname, 'verify488.js'), 'utf8')),
     '[4-c] `verify488` 의 [E] 관측점이 그 이름으로 이관돼 있다');
  /* 349 교훈 — 옛 이름이 «죽지 않았고 위임한다» 는 것이 이 이관의 전제다(나란한 두 경로였다면
     둘을 같은 카운터에 더해야 한다). 그 위임을 소스로 못박는다. */
  ok(/function summonRelic\(quiet\)\{ return summonRelicBatch\(1, quiet\); \}/.test(src),
     '[4-d] ★ 옛 이름 `summonRelic` 은 죽지 않았고 코어에 **위임**한다 — 그래서 카운터 하나로 족하다');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ══ §R 되돌림 — 옛 «매번 innerHTML» 사본에서는 §2 가 빨개진다 ═════ */
  console.log('§R 되돌림 — 옛 «매번 innerHTML» 사본');
  const neg = src.replace(
    /  if\(bar\.children\.length !== SUM_MULS\.length\) bar\.innerHTML = mulBarHTML\(cur\);/,
    '  bar.innerHTML = mulBarHTML(cur);');
  ok(neg !== src, '[R-0] 되돌림 사본을 만들었다(칠하기 한 줄만 옛 꼴로)');
  fs.writeFileSync(NEG, neg);
  try {
    const n = await boot(browser, NEG);
    let negBadId = 0, negBadPress = 0;
    for (const s of SITES) {
      const a = await identity(n.page, s);
      if (!a.miss && !a.same) negBadId++;
      const b = await pressThroughRender(n.page, s);
      if (b.had && !b.alive) negBadPress++;
    }
    ok(negBadId === SITES.length,
       '[R-a] ★ 되돌린 사본에서는 **네 자리 전부** 재렌더에 칸이 갈린다(§2-a 가 빨개진다)',
       negBadId + '/' + SITES.length);
    ok(negBadPress === SITES.length,
       '[R-b] ★ 같은 사본에서 **누른 그 칸**도 네 자리 전부 죽는다(§2-b 가 빨개진다)',
       negBadPress + '/' + SITES.length);
    await n.ctx.close();
  } finally {
    try { fs.unlinkSync(NEG); } catch (_) {}
  }

  await browser.close();
  console.log('VERIFY797 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
