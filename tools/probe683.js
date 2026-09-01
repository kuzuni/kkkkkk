/* 작업 683 재현 프로브 — «유물 소환 시 «획득한 그 유물» 자리에 해당 유물 파티클이 떠야 한다»
 *
 *   node tools/probe683.js
 *
 * 338·341·350·363·372·429·654·655·682 규칙 — **처방을 따르기 전에 등재문의 주장이 참인지
 * 제품에게 직접 묻는다.** 주인 원문: «유물소환했을때 해당 유물쪽에 해당 유물 파티클떠야함.
 * 그리고 연속소환일때도 그런식으로 되게».
 *
 * 등재문의 주장은 둘이다:
 *   ⓐ 지금은 **획득한 유물 카드 자리에 파티클이 없다**(666 이 회당 연출을 통째로 버튼으로 옮겼다).
 *   ⓑ 연속(홀드) 소환에서도 같아야 한다.
 *
 * ⚑ 이 자가 세는 것은 «코드» 가 아니라 **찍힌 노드가 어디서 태어났는가**다.
 *   `rwSummonFx(it, first)` 를 감싸 **버스트 단위로** 새로 붙은 `.fx-spark` 를 그 자리에서 훑고
 *   (682 와 같은 이유로 MutationObserver 를 안 쓴다 — 감싸기는 동기라 버스트 경계가 정확하다),
 *   그 순간의 **10칸 카드 bbox 전부**(`fxRect`)를 같이 찍어 «어느 칸에서 태어난 알인가» 를 가른다.
 *   좌표계는 노드에 적힌 `style.left/top` 과 `fxRect` 가 **둘 다 프레임 px** 라 보정이 없다
 *   (619 12회차·682 와 같은 자리).
 *
 * 절:
 *   [1] 첫 발 — 획득 카드에서 태어난 알 수 (**수리 전 0 이 정상** = 등재문 ⓐ 가 참)
 *   [2] 연속(홀드) — 버스트마다 획득 카드 알 ≥ 1 (**수리 전 전부 0** = 등재문 ⓑ 가 참)
 *   [3] 미획득 카드 오염 — 획득하지 않은 아홉 칸에서 태어난 알은 0 이어야 한다(수리 전·후 같은 답)
 *   [4] 지불 버스트는 버튼에서 난다 — 666 규약(수리 전·후 **같은 답** = 구조 축)
 *   [5] 텍스트 0건 — 666 이 걷어낸 «이름 Lv.n» 델타가 되살아나지 않았는가(수리 전·후 같은 답)
 *   [6] 콘솔 에러 0
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464·498·520·654·682 규약).
 *   구조 축([3]·[4]·[5]·[6])은 수리 전·후 같은 답이고, **[1-a]·[2-a] 는 «등재문이 참인가» 를
 *   묻는 자리라 수리 전에 빨간 것이 정상**이다(수리 후 초록).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const HOLD = 3200;
const PAD = 6;            /* 카드 bbox 판정 여유(px) — 탄생 타원은 테두리 «바깥» 이라 조금 넘친다 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 버스트 단위 관찰자 — `rwSummonFx` 를 감싼다.
   한 번의 감싸기에서 ① 이번에 당첨된 유물 id ② 그 순간 10칸의 bbox ③ 새로 난 알들을 같이 받는다. */
const WATCH = () => {
  window.__p683 = { bursts: [], txt: 0 };
  const L = () => document.getElementById('fxl');
  const scan = seen => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      const cls = nd.className + '';
      if (!/fx-spark/.test(cls)) continue;
      const x = parseFloat(nd.style.left), y = parseFloat(nd.style.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      out.push({ x, y, cls, txt: (nd.textContent || '').trim() });
    }
    return out;
  };
  /* 그 순간의 카드 bbox — 제품 자신의 자(fxRect)로 잰다(배율·프레임 보정이 그 안에 있다) */
  const cards = () => {
    const g = document.getElementById('rwGrid'), out = {};
    if (!g || typeof fxRect !== 'function') return out;
    for (const el of g.querySelectorAll('[data-rw]')) {
      const r = fxRect(el);
      if (r) out[el.getAttribute('data-rw')] = r;
    }
    return out;
  };
  const o = window.rwSummonFx;
  if (typeof o !== 'function') return false;
  window.rwSummonFx = function (it, first) {
    const l = L(), seen = new Set(l ? l.children : []);
    const rc = cards();
    const r = o.apply(this, arguments);
    const got = scan(seen);
    window.__p683.bursts.push({ id: it && it.id, first: !!first, cards: rc, born: got });
    return r;
  };
  return true;
};
const RESET = () => { window.__p683.bursts = [];
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

/* 점이 사각형 안인가(여유 PAD) */
const inR = (p, r, pad) => !!r && p.x >= r.x - pad && p.x <= r.x + r.w + pad
                                && p.y >= r.y - pad && p.y <= r.y + r.h + pad;

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const cdp = await p.context().newCDPSession(p);
  const box = async sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const tap = async c => {
    if (!c) return;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(220);
  };
  const holdTouch = async (c, ms) => {
    if (!c) return;
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
  };

  const wrapped = await ev(p, WATCH);
  blk('[0] 전제 — 관찰자·화면');
  ok(wrapped === true, '[0-a] `rwSummonFx` 를 감쌌다');
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  const opened = await ev(p, () => {
    const g = document.getElementById('rwGrid');
    return { on: !!document.getElementById('relw').classList.contains('on'),
             cells: g ? g.querySelectorAll('[data-rw]').length : 0 };
  });
  ok(!!opened && opened.on, '[0-b] 89 유물 페이지가 열렸다');
  ok(!!opened && opened.cells === 10, '[0-c] 격자 10칸', opened && String(opened.cells));

  /* ── [1] 첫 발 ── */
  await ev(p, RESET);
  await tap(await box('#rwBasin'));
  const B1 = await ev(p, () => window.__p683.bursts);
  blk('[1] 첫 발 — 획득 카드에서 태어난 알');
  const b1 = (B1 || [])[0];
  ok(!!b1, '[1-pre] 첫 발 버스트가 잡혔다', b1 ? ('알 ' + b1.born.length) : '없음');
  if (b1) {
    const own = b1.born.filter(q => inR(q, b1.cards[b1.id], PAD)).length;
    info('당첨 유물', b1.id + ' · 이번 버스트 알 ' + b1.born.length + '개');
    ok(own >= 1, '[1-a] 획득 카드 원점 알 ≥ 1 (수리 전 0 이 정상 — 등재문 ⓐ)', String(own));
  }

  /* ── [2] 연속(홀드) ── */
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const B2 = await ev(p, () => window.__p683.bursts);
  blk('[2] 연속(홀드) — 버스트마다 획득 카드 알');
  const bs = (B2 || []).filter(b => b.born.length || b.id);
  ok(bs.length >= 4, '[2-pre] 홀드로 버스트 4회 이상', String(bs.length));
  let hit = 0, tot = 0, ids = new Set();
  for (const b of bs) {
    tot++;
    if (b.id) ids.add(b.id);
    if (b.born.some(q => inR(q, b.cards[b.id], PAD))) hit++;
  }
  info('버스트', tot + '회 · 서로 다른 당첨 유물 ' + ids.size + '종');
  ok(tot > 0 && hit === tot, '[2-a] 모든 버스트가 획득 카드에서 난다 (수리 전 0 이 정상 — 등재문 ⓑ)',
     hit + '/' + tot);

  /* ── [3] 미획득 카드 오염 ── */
  blk('[3] 미획득 카드 오염 — 구조 축(수리 전·후 같은 답)');
  let bad = 0, badIds = new Set();
  for (const b of bs.concat(b1 ? [b1] : [])) {
    for (const q of b.born) {
      for (const k of Object.keys(b.cards)) {
        if (k === b.id) continue;
        if (inR(q, b.cards[k], 0)) { bad++; badIds.add(k); }
      }
    }
  }
  ok(bad === 0, '[3-a] 획득하지 않은 카드에서 태어난 알 0건', bad + '건' + (badIds.size ? ' · ' + [...badIds].join(',') : ''));

  /* ── [4] 지불 버스트는 버튼에서 — 666 규약(구조 축) ── */
  blk('[4] 지불 버스트 원점 = 버튼 — 666 규약(수리 전·후 같은 답)');
  const basin = await ev(p, () => (typeof fxRect === 'function') ? fxRect(document.getElementById('rwBasin')) : null);
  ok(!!basin, '[4-pre] 버튼 bbox 를 읽었다', basin ? Math.round(basin.w) + '×' + Math.round(basin.h) : '');
  if (basin) {
    /* 지불 알 = 카드 어느 칸에도 안 속하는 알. 그것들은 예외 없이 버튼 대역이어야 한다.
       ⚠ 666 4회차의 상향 원뿔 + `RW_FX_FLY` 로 **위로** 멀리 나므로 «출발점» 만 본다. */
    let payTot = 0, payIn = 0;
    for (const b of bs.concat(b1 ? [b1] : [])) {
      for (const q of b.born) {
        const onCard = Object.keys(b.cards).some(k => inR(q, b.cards[k], PAD));
        if (onCard) continue;
        payTot++;
        if (inR(q, basin, 40)) payIn++;
      }
    }
    info('지불 알', payTot + '개');
    ok(payTot > 0 && payIn === payTot, '[4-a] 카드 밖 알은 전부 버튼 대역에서 난다', payIn + '/' + payTot);
  }

  /* ── [5] 텍스트 0건 — 666 이 걷어낸 델타(구조 축) ── */
  blk('[5] 텍스트 0건 — 666 규약(수리 전·후 같은 답)');
  const txt = await ev(p, () => {
    const L = document.getElementById('fxl'); if (!L) return -1;
    let n = 0;
    for (const nd of L.children) if (/fx-plus|fx-txt/.test(nd.className + '')) n++;
    return n;
  });
  ok(txt === 0, '[5-a] 숫자·이름 플로터 0건', String(txt));

  /* ── [6] 콘솔 ── */
  blk('[6] 콘솔');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nPROBE683 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
