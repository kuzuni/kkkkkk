/* 작업 682 재현 프로브 — «유물 소환 버스트가 3방향 고정으로 퍼진다 — 랜덤 산포여야 함»
 *
 *   node tools/probe682.js
 *
 * 338·341·350·363·372·429·654·655 규칙 — **처방을 따르기 전에 등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * 주인 원문: «유물소환 연속으로 하니까 3방향으로 입자 퍼지더라 랜덤이 아니라. 그거 수정해야할듯».
 *
 * 등재문의 주장은 하나다 — **연속 소환에서 입자 방향이 매번 같은 소수의 갈래로만 간다**
 * (= 방향이 랜덤 샘플이 아니라 고정 각).
 *
 * ⚑ 이 자가 세는 것은 «코드» 가 아니라 **찍힌 노드에 적힌 방향**이다.
 *   `rwSummonFx` 를 감싸 **버스트 단위로** 새로 붙은 `.fx-spark` 를 그 자리에서 훑는다
 *   (MutationObserver 를 안 쓰는 이유: 콜백이 마이크로태스크라 «어느 버스트의 알인가» 가 뭉갠다.
 *    감싸기는 동기라 버스트 경계가 정확하다).
 *   방향은 노드에 적힌 `--dx/--dy`(프레임 px)에서 읽는다 — 화면 좌표계가 아니라
 *   **제품이 스스로 적어 둔 이동 벡터**라 배율·스크롤 보정이 필요 없다(619 12회차 규약과 같은 자리).
 *   각도는 수학 관례(위쪽 = +90°)로 뒤집어 찍는다: `atan2(−dy, dx)`.
 *
 * 절:
 *   [1] 첫 발(RW_FX_N0 = 10알) — 방향 목록·서로 다른 방향 수
 *   [2] 연속(홀드) — 버스트마다 방향 목록. **버스트 간 «방향 시퀀스 동일성»** 이 이 작업의 축이다
 *   [3] 갈래 수 — 15° 격자로 뭉쳐 «몇 방향으로 퍼지는가»(주인이 센 그 수)
 *   [4] 상향 반구(666 4회차 `RW_FX_UP`) 가 지켜지는가 — 아래로 가는 알 0건이어야 한다
 *   [5] 대조군 — 660 계열(단련 버튼, `strict` 경로)도 같은 병인가(등재문 «부품 확인 필수»)
 *   [6] 콘솔 에러 0
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464·498·520·654 규약).
 *   구조 축([4]·[6])은 수리 전·후 같은 답이고, 갈리는 것은 [1]~[3]·[5] 의 **수치**라 `info` 로 찍는다.
 *   단 [2-a]/[3-a] 는 «등재문이 참인가» 를 묻는 자리라 **수리 전에 빨간 것이 정상**이다.
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
const GRID = 15;                                   /* 갈래를 세는 격자(도) — 사람이 «같은 방향» 으로 읽는 폭 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 버스트 단위 관찰자 — `rwSummonFx`(유물) 와 `fxBurst`(대조군) 를 각각 감싼다.
   ⚠ 감싸기는 **동기**라 «이 버스트가 낳은 알» 이 정확히 갈린다. */
const WATCH = () => {
  window.__p682 = { rw: [], ctl: [] };
  const L = () => document.getElementById('fxl');
  const scan = (seen) => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      if (!/fx-spark/.test(nd.className + '')) continue;
      const dx = parseFloat(nd.style.getPropertyValue('--dx'));
      const dy = parseFloat(nd.style.getPropertyValue('--dy'));
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
      out.push({ dx, dy, x: parseFloat(nd.style.left), y: parseFloat(nd.style.top) });
    }
    return out;
  };
  const wrap = (name, bucket) => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function () {
      const l = L(), seen = new Set(l ? l.children : []);
      const r = o.apply(this, arguments);
      const got = scan(seen);
      if (got.length) window.__p682[bucket].push(got);
      return r;
    };
  };
  wrap('rwSummonFx', 'rw');
  wrap('fxBurst', 'ctl');
};
const RESET = () => { window.__p682.rw = []; window.__p682.ctl = [];
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

/* ── 각도 계산(노드에서 나온 순수 수치라 러너에서 한다) ── */
const deg = b => b.map(p => Math.atan2(-p.dy, p.dx) * 180 / Math.PI);   /* 위쪽 = +90° */
const round1 = v => Math.round(v * 10) / 10;
/* 갈래 수 — «몇 방향으로 퍼지는가»(주인이 센 그 수).
   ⚠ 격자 **반올림**으로 세면 안 된다 — 13° 떨어진 두 알이 칸 경계를 사이에 두면 «다른 갈래» 로 읽힌다.
     정렬해 이웃 간격이 GRID 미만이면 한 덩이로 **묶는다**(사람 눈이 하는 일과 같다). */
const lanes = as => {
  if (!as.length) return 0;
  const s = [...as].sort((a, b) => a - b);
  let n = 1;
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] >= GRID) n++;
  return n;
};
/* 한 버스트 안 두 알의 최소 각 간격 — 겹쳐 접혔는지를 가장 짧게 말하는 수치 */
const minGap = as => {
  if (as.length < 2) return 999;
  const s = [...as].sort((a, b) => a - b);
  let g = 999;
  for (let i = 1; i < s.length; i++) g = Math.min(g, s[i] - s[i - 1]);
  return g;
};
/* 두 버스트의 «방향 시퀀스» 가 같은가 — 정렬해 원소별 최대 차가 tol 미만이면 같은 그림이다 */
const same = (a, b, tol) => {
  if (a.length !== b.length) return false;
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
  return x.every((v, i) => Math.abs(v - y[i]) < tol);
};

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

  await ev(p, WATCH);

  /* ── 89 유물 소환을 **먼저** 잰다 ──
     ⚠ 순서가 축이다(이 자의 1회차 실패) — 23 훈련 시트를 열고 `closeTrain()` 으로 닫아도
       그 자리에 시트 잔재가 남아 `elementFromPoint(#rwBasin 중심)` 이 **`td`** 를 돌려준다
       (= 터치가 수반에 안 닿아 버스트가 0). 대조군은 **새로 로드한 페이지**에서 잰다. */
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const RW = await ev(p, () => window.__p682.rw.map(b => b.map(q => ({ dx: q.dx, dy: q.dy, x: q.x, y: q.y }))));

  /* ── 대조군([5]) — 660 계열(단련 버튼). 페이지를 새로 받아 시트 잔재를 끊는다 ── */
  const CTL = await (async () => {
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    await ev(p, WATCH);
    const okOpen = await ev(p, () => { try { openTrain(); setTrSub('temper'); S.tstone = 1e12; renderTrain(); }
      catch (_) { return false; } return !!document.querySelector('.tr-tp .tb'); });
    if (!okOpen) return null;
    await p.waitForTimeout(400);
    await ev(p, RESET);
    await holdTouch(await box('.tr-tp .tb'), 900);
    return ev(p, () => window.__p682.ctl.map(b => b.map(q => ({ dx: q.dx, dy: q.dy }))));
  })();

  const B = (RW || []).map(deg);

  blk('[1] 첫 발 — 방향 목록');
  if (!B.length) { ok(false, '[1-a] 유물 버스트가 잡혔다(전제)', '0 버스트'); }
  else {
    ok(true, '[1-a] 유물 버스트가 잡혔다(전제)', B.length + '버스트 · 알 ' + B.reduce((s, b) => s + b.length, 0) + '개');
    info('첫 발 ' + B[0].length + '알 방향(°)', B[0].map(round1).sort((a, b2) => a - b2).join(', '));
    info('첫 발 갈래 수(' + GRID + '° 격자)', String(lanes(B[0])));
  }

  blk('[2] 연속 버스트 — 방향 시퀀스가 버스트마다 다른가');
  const rep = B.slice(1);                             /* 첫 발은 알 수가 달라 따로 본다 */
  if (rep.length >= 2) {
    rep.slice(0, 8).forEach((b, i) => info('버스트 #' + (i + 2) + ' (' + b.length + '알)', b.map(round1).sort((a, c) => a - c).join(', ')));
    let dup = 0, cmp = 0;
    for (let i = 1; i < rep.length; i++) { cmp++; if (same(rep[i - 1], rep[i], 15)) dup++; }
    info('연속 쌍 비교', cmp + '쌍 중 «같은 방향 시퀀스(±15°)» ' + dup + '쌍');
    ok(dup === 0, '[2-a] 연속 버스트의 방향 시퀀스가 서로 다르다(등재문이 거짓이면 초록)',
       dup + '/' + cmp + '쌍 동일');
  } else info('반복 버스트가 2개 미만 — 홀드가 안 걸렸다', String(rep.length));

  blk('[3] 갈래 수 — «몇 방향으로 퍼지는가»(주인이 센 그 수)');
  if (rep.length) {
    const ln = rep.map(lanes);
    const avg = ln.reduce((s, v) => s + v, 0) / ln.length;
    info('버스트별 갈래 수', ln.join(', '));
    info('버스트별 최소 각 간격(°)', rep.map(b => round1(minGap(b))).join(', '));
    /* 알 n 개면 방향도 n 갈래여야 «랜덤 산포» 다. 접혀서 겹치면 그보다 준다. */
    const short = rep.filter(b => lanes(b) < b.length).length;
    info('평균 갈래 / 알 수', avg.toFixed(2) + ' / ' + (rep[0] ? rep[0].length : 0));
    ok(rep.length > 0 && short === 0, '[3-a] 갈래 수 = 알 수인 버스트가 전부다(겹쳐 접히지 않는다)',
       '모자란 버스트 ' + short + '/' + rep.length + ' · 평균 갈래 ' + avg.toFixed(2));
    /* 전 버스트 합산은 «갈래» 로 세면 안 된다 — 알이 많으면 이웃 간격이 GRID 아래로 붙어
       클러스터가 통째로 하나가 된다(뜻이 없다). 반구를 30° 칸 6개로 나눠 **덮인 칸 수**로 본다:
       고정 각이면 늘 같은 칸만 채워지고, 산포면 6칸이 고르게 찬다. */
    const all = [].concat(...rep);
    const bins = new Array(6).fill(0);
    all.forEach(a => { const k = Math.min(5, Math.max(0, Math.floor(((a % 360) + 360) % 360 / 30))); bins[k]++; });
    info('전 버스트 합산 30° 칸 분포(0~180°)', bins.join(' / ') + ' — 덮인 칸 ' + bins.filter(v => v).length + '/6');
  }

  blk('[4] 상향 반구(666 4회차 RW_FX_UP) — 아래로 가는 알 0건');
  const down = (RW || []).reduce((s, b) => s + b.filter(q => q.dy > 0.05).length, 0);
  const tot = (RW || []).reduce((s, b) => s + b.length, 0);
  ok(down === 0, '[4-a] 아래로 향하는 알 0건(666 규약 유지)', down + '/' + tot + '알');

  blk('[5] 대조군 — 660 계열(단련 버튼 · strict 경로)도 같은 병인가');
  if (CTL && CTL.length >= 2) {
    const C = CTL.map(deg);
    C.slice(0, 5).forEach((b, i) => info('단련 버스트 #' + (i + 1) + ' (' + b.length + '알)', b.map(round1).sort((a, c) => a - c).join(', ')));
    let dup = 0, ex = 0, cmp = 0;
    for (let i = 1; i < C.length; i++) { cmp++; if (same(C[i - 1], C[i], 15)) dup++; if (same(C[i - 1], C[i], 3)) ex++; }
    info('연속 쌍 비교', cmp + '쌍 중 «±15° 동일» ' + dup + '쌍 · «±3° 동일» ' + ex + '쌍');
    info('평균 갈래 수', (C.reduce((s, b) => s + lanes(b), 0) / C.length).toFixed(2));
    /* ⚠ 여기서 ±15° 를 쓰면 안 된다 — 660 의 호스트는 **요소**(단련 `.tb` 340×74)라 링이 대상의
       종횡비를 따른다(619 21회차). 세로 반축이 작아 각이 원래 좌우로 눌려 있고, 그것은 설계다.
       «고정인가» 를 묻는 자리이므로 **±3°**(= 위상이 한 글자도 안 돈다)로 본다. */
    ok(ex === 0, '[5-a] 660 계열은 버스트마다 위상이 돈다(공용 부품 판정 · ±3°)', ex + '/' + cmp + '쌍 동일');
  } else info('대조군 버스트가 2개 미만 — 판정 보류', String(CTL ? CTL.length : 0));

  blk('[6] 콘솔 에러');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nPROBE682 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
