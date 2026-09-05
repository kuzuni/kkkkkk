#!/usr/bin/env node
/* 재현 902 — 「`tools/verify583.js` [C-big] 이 플레이키하다」 (2026-09-04 등재, sess-2328-8832 워커 B)
 *
 *   node tools/probe902.js
 *
 * 등재문: 무변경 트리 4회에 2회 빨갛다(45/45 · 44/45 · 43/45 · 45/45 · 45/45).
 *   «`[C-big]` 이 «표본으로 뽑은 아이콘 상자» 를 «해석적으로 유도한 구슬 상한» 에 댄다» 는 가설과
 *   «같이 흔들린 `[D-train-o]` 는 다른 병으로 보인다(평균 반경 축) — 갈래를 재현으로 먼저 가를 것».
 *
 * ⚠ 338 규칙 — **처방을 따르기 전에 재현한다.** 이 자는 고치는 자가 아니라 «무엇이 흔들리는가» 만
 *   묻는다. 갈래는 셋이다:
 *     ⓐ 제품이 흔들린다(알이 실제로 작아진다)          → 제품 수리
 *     ⓑ 자가 «같은 값» 을 **다른 자**로 두 번 재서 갈린다 → 자 수리
 *     ⓒ [D-train-o] 도 같은 뿌리다                      → 한 수리로 둘 다 닫힌다
 *
 * 재는 법:
 *   [1] 갈림의 자리  — `[C-big]` 의 두 값(`ic(34)`·`pl(34)`)을 **같은 상자**에서 유도한다.
 *                      둘 다 해석적이므로 표본 운은 «어느 상자를 골랐는가» 로만 들어온다.
 *   [2] 구조 스윕    — 눌림 진폭 구간(±10%)을 0.05px 격자로 훑어 «역전(ic = pl − 1)» 이
 *                      **구간의 몇 %** 인지 센다. 표본 운과 무관한 **결정적** 재현이다.
 *   [3] 실수 사슬    — 같은 스윕을 `Math.round` 없이 돌린다. 여기서도 역전이 나면 갈래 ⓐ(제품)이고,
 *                      0 이면 갈래 ⓑ(자의 정수 양자화)다.
 *   [4] 갈림 상한    — 정수 두 값의 차가 **1px 을 넘는 상자**가 스윕에 있는가(있으면 양자화가 아니다).
 *   [D] 다른 병      — 첫 무리의 **개별 입자 반경**과 **구성원 수**를 같이 따라간다.
 *                      개별 반경이 안 줄어드는데 평균이 줄면 그것은 «모이는 비행» 이 아니라
 *                      **생존 편향**(멀리 간 알이 먼저 죽는다)이다 = [C-big] 과 다른 뿌리.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const n1 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(1);
const n2 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(2);

/* verify583 [C] 의 `mk()` 와 **같은 사슬**이다 — 재현이므로 손으로 다시 적지 않고 모양을 그대로 옮긴다.
   달라지는 것은 «정수를 굳히는가» 하나뿐이라, 그 스위치(`rnd`)만 밖으로 뺐다. */
const chain = (K, a, q, rnd) => {
  const R = rnd ? Math.round : (x => x);
  const hsc = Math.min(Math.max(Math.sqrt(q.w * q.h) / 410, 1), K.DMAX / K.SZMAX);
  const cap = Math.max(K.SZMIN, a.fits * Math.min(q.w, q.h));
  const fitIC = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * a.szs * K.CIC_SC));
  const fitPl = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * a.szs));
  return { hsc, cap, fitIC, fitPl,
           ic: v => Math.max(K.SZMIN, R(R(R(v * hsc * a.szs) * K.CIC_SC) * fitIC)),
           pl: v => Math.max(K.SZMIN, R(R(v * hsc * a.szs) * fitPl)) };
};

const SITES = [
  { k:'train',  n:'23 훈련 카드', sub:'train',  cur:'gold',
    host:'#trCards [data-tr="atk"]', btn:'#trCards [data-tr="atk"]' },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',   cur:'rstone',
    host:'#trRunes .tr-rn',        btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', n:'단련 [투자]',  sub:'temper', cur:'tstone',
    host:'#trTemper .tr-tp',       btn:'#trTemper .tr-tp .tb' }
];
const REP = 3;                                   /* 자리마다 홀드 창을 몇 번 여는가 */

(async () => {
  console.log('\n=== probe902 — [C-big] 플레이키의 뿌리 · [D-train-o] 갈래 가르기 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; openTrain(); });
  await p.waitForTimeout(400);

  const K = await p.evaluate(() => ({ CIC_SC: FX_CIC_SC, FITS: FXB_FITS,
    SZMIN: FXB_SZMIN, SZMAX: FXB_SZMAX, DMAX: FXB_DMAX }));
  console.log('상수 — FX_CIC_SC ' + K.CIC_SC + ' · FXB_FITS ' + K.FITS
    + ' · FXB_SZMIN ' + K.SZMIN + ' · FXB_SZMAX ' + K.SZMAX + ' · FXB_DMAX ' + K.DMAX + '\n');

  const OB = {};                                  /* 자리별 관측 — 상자 표본 · 입자 궤적 */
  for (const s of SITES) {
    await p.evaluate(s => { setTrSub(s.sub); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; }, s);
    await p.waitForTimeout(220);
    const AX = await p.evaluate(s => {
      const h = document.querySelector(s.host); if (!h) return null;
      const sel = (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim();
      const t = (sel && h.querySelector(sel)) || h;
      const st = getComputedStyle(t);
      const sz = parseFloat(st.getPropertyValue('--burst-sz'));
      const ft = parseFloat(st.getPropertyValue('--burst-fit'));
      return { szs: (sz > 0 && sz <= 1) ? sz : 1, fits: (ft > 0 && ft <= FXB_FITS) ? ft : FXB_FITS };
    }, s);
    const boxes = [], waves = [];
    for (let rep = 0; rep < REP; rep++) {
      await p.evaluate(() => { const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; });
      await p.waitForTimeout(160);
      const bb = await (await p.$(s.btn)).boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.mouse.down();
      const got = await p.evaluate(s => new Promise(res => {
        const box = [], seq = []; const t0 = performance.now(); let wave = null, ids = null;
        const iv = setInterval(() => {
          const h = document.querySelector(s.host);
          const bs = h ? (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim() : '';
          const bh = (h && bs && h.querySelector(bs)) || h;
          const hr = bh ? bh.getBoundingClientRect() : null;
          const fr = bh ? fxRect(bh) : null;
          if (fr) box.push({ w: fr.w, h: fr.h });
          let live = [...document.querySelectorAll('#fxl .fx-cic')];
          /* verify583 [D] 와 **같은 규칙**으로 첫 무리를 굳힌다(619 17회차) */
          if (!wave && live.length) {
            wave = new Set(live); ids = new Map();
            live.forEach((n, i) => ids.set(n, i));
          }
          if (wave) live = live.filter(n => wave.has(n));
          if (hr) {
            const ox = hr.x + hr.width / 2, oy = hr.y + hr.height / 2;
            seq.push({ t: Math.round(performance.now() - t0), n: live.length, tot: wave ? wave.size : 0,
                       r: live.map(n => { const q = n.getBoundingClientRect();
                         return { i: ids.get(n),
                                  d: Math.hypot(q.x + q.width / 2 - ox, q.y + q.height / 2 - oy) }; }) });
          }
          if (performance.now() - t0 > 720) { clearInterval(iv); res({ box, seq }); }
        }, 40);
      }), s);
      await p.mouse.up();
      await p.waitForTimeout(320);
      boxes.push(...got.box.filter(q => q.w > 0 && q.h > 0));
      waves.push(got.seq.filter(x => x.n > 0));
    }
    OB[s.k] = { AX, boxes, waves };
    await p.waitForTimeout(250);
  }
  await b.close();

  /* ── [1] 갈림의 자리 — 표본 상자들이 실제로 낳는 두 값 ─────────────────── */
  console.log('[1] 표본 상자 — `[C-big]` 의 두 값을 **같은 상자**에서 유도한다');
  const SUM = {};
  for (const s of SITES) {
    const o = OB[s.k]; if (!o || !o.boxes.length) { ok(false, '[1-' + s.k + '] 상자 표본이 있다'); continue; }
    const key = q => n2(q.w) + '×' + n2(q.h);
    const uniq = [...new Map(o.boxes.map(q => [key(q), q])).values()];
    const rows = uniq.map(q => {
      const c = chain(K, o.AX, q, true), x = chain(K, o.AX, q, false);
      return { q, ic: c.ic(34), pl: c.pl(34), icR: x.ic(34), plR: x.pl(34), fitPl: c.fitPl };
    });
    const inv = rows.filter(r => r.ic < r.pl);
    SUM[s.k] = { rows, inv, uniq };
    console.log('  · ' + s.n + ' — 상자 ' + uniq.length + '종 · 표본 ' + o.boxes.length + '개'
      + ' · --burst-sz ' + n2(o.AX.szs) + ' · --burst-fit ' + n2(o.AX.fits));
    for (const r of rows.slice(0, 6)) {
      console.log('      ' + key(r.q) + '  →  아이콘 ' + r.ic + ' / 구슬 ' + r.pl
        + '   (실수 ' + n2(r.icR) + ' / ' + n2(r.plR) + ' · fitPl ' + n2(r.fitPl) + ')'
        + (r.ic < r.pl ? '   ← 역전' : ''));
    }
    if (rows.length > 6) console.log('      … ' + (rows.length - 6) + '종 생략');
  }
  const invSites = SITES.map(s => s.k).filter(k => SUM[k] && SUM[k].inv.length);
  ok(Object.keys(SUM).length === SITES.length,
     '[1] 세 자리 전부에서 상자 표본을 얻었다',
     SITES.map(s => s.k + ' ' + (SUM[s.k] ? SUM[s.k].uniq.length : 0) + '종').join(' · '));
  console.log('  · 표본 안에서 역전이 난 자리: ' + (invSites.join('·') || '없음')
    + '  ← 이 실행의 운(다음 [2] 가 운을 뺀다)');

  /* ── [2] 구조 스윕 — 표본 운을 뺀 결정적 재현 ──────────────────────────── */
  console.log('\n[2] 구조 스윕 — 눌림 진폭 ±10% 를 0.05px 격자로 훑는다(표본 운 없음)');
  const sweep = (o, rnd) => {
    const base = o.boxes.reduce((m, q) => (q.w > m.w ? q : m), o.boxes[0]);
    const out = { n: 0, inv: 0, gap2: 0, worst: 0 };
    /* ⚠ 실수 사슬은 **부동소수 잔차**를 판정에 넣으면 안 된다 — 가둠이 무는 자리에서 두 값은
       대수적으로 «정확히 같은 식»(cap·34/SZMAX)이라 차가 −4.4e−16 꼴로 나온다. 그것을 «역전» 으로
       세면 [3] 이 자기 잔차를 보고 빨개진다(1회차에 실제로 그랬다). 1e−9 아래는 0 으로 읽는다. */
    const EPS = rnd ? 0 : 1e-9;
    for (let f = 0.90; f <= 1.1000001; f += 0.05 / base.w) {
      const q = { w: base.w * f, h: base.h * f };
      const c = chain(K, o.AX, q, rnd);
      const d = c.ic(34) - c.pl(34);
      out.n++; if (d < -EPS) out.inv++; if (d < -1 - EPS) out.gap2++;
      out.worst = Math.min(out.worst, d);
    }
    return out;
  };
  const SW = {}, SWR = {};
  for (const s of SITES) {
    const o = OB[s.k]; if (!o || !o.boxes.length) continue;
    SW[s.k] = sweep(o, true); SWR[s.k] = sweep(o, false);
    const w = SW[s.k], z = v => (Math.abs(v) < 1e-9 ? 0 : v);
    console.log('  · ' + s.n + ' — 정수 사슬: 역전 ' + w.inv + '/' + w.n
      + ' (' + (100 * w.inv / w.n).toFixed(1) + '%) · 최악 차 ' + w.worst + 'px'
      + '   |   실수 사슬: 역전 ' + SWR[s.k].inv + '/' + SWR[s.k].n
      + ' · 최악 차 ' + n2(z(SWR[s.k].worst)) + 'px');
  }
  const swKeys = Object.keys(SW);
  ok(swKeys.length === SITES.length && swKeys.some(k => SW[k].inv > 0),
     '[2] ★ **재현** — 무변경 트리에서 눌림 구간의 일부가 «아이콘 알 < 구슬 알» 을 낳는다(= `[C-big]` 이 빨개지는 조건)',
     swKeys.map(k => k + ' ' + (100 * SW[k].inv / SW[k].n).toFixed(1) + '%').join(' · '));

  /* ── [3] 실수 사슬 — 갈래 ⓐ(제품) / ⓑ(자) 를 가른다 ────────────────────── */
  console.log('\n[3] 갈래 — `Math.round` 를 뺀 같은 사슬에서도 역전이 나는가');
  const rInv = swKeys.filter(k => SWR[k].inv > 0);
  ok(swKeys.length > 0 && rInv.length === 0,
     '[3] ★ **갈래 ⓑ 확인** — 정수를 굳히지 않은 사슬에서는 역전이 **한 톨도 없다**'
     + '(= 병은 제품이 아니라 «자가 두 값을 다른 횟수로 반올림한다» 다)',
     swKeys.map(k => k + ' 최악 ' + n2(Math.abs(SWR[k].worst) < 1e-9 ? 0 : SWR[k].worst) + 'px').join(' · ')
     + (rInv.length ? ' · 역전 ' + rInv.join('·') : ''));

  /* ── [4] 갈림 상한 — 양자화 한 칸을 넘는 자리가 있는가 ──────────────────── */
  console.log('\n[4] 갈림 상한 — 정수 두 값의 차가 1px 을 넘는 상자가 있는가');
  const gap2 = swKeys.filter(k => SW[k].gap2 > 0);
  ok(swKeys.length > 0 && gap2.length === 0,
     '[4] ★ 갈림은 **양자화 한 칸(1px)** 을 절대 안 넘는다 — 사슬의 `Math.round` 가 한 번 더 도는 값이라 상한이 0.5·fitK 다',
     swKeys.map(k => k + ' 최악 ' + SW[k].worst + 'px').join(' · '));

  /* ── [D] 다른 병 — [D-train-o] 의 평균 반경 축 ──────────────────────────── */
  /* ⚑ [D-o] 가 재는 `d0 → d1` 은 «첫 표본 **전원**의 평균» 과 «창 끝 **생존자**의 평균» 이라
     **두 축이 섞여 있다** — ① 알이 실제로 이동한 거리 ② 창 안에서 누가 죽었는가(생존 편향).
     둘을 가르는 자는 하나뿐이다: 창 끝까지 **살아남은 알만** 골라 그 알들의 처음 반경(`d0s`)과
     끝 반경(`d1`)을 비교하는 것. `d1 ≥ d0s` 인데 `d1 < d0` 이면 그 하락은 **이동이 아니라 구성**이다. */
  console.log('\n[D] 갈래 가르기 — [D-train-o] 는 «모이는 비행» 인가, **표본 구성**인가');
  let netIn = 0, censor = 0, dRows = 0, negRuns = 0, runs = 0, mixRows = 0;
  for (const s of SITES) {
    const o = OB[s.k]; if (!o) continue;
    for (const seq of o.waves) {
      if (seq.length < 2) continue;
      runs++; dRows++;
      const dz = seq[seq.length - 1];
      const first = new Map(seq[0].r.map(x => [x.i, x.d]));
      const d0 = seq[0].r.reduce((a, x) => a + x.d, 0) / seq[0].n;
      const d1 = dz.r.reduce((a, x) => a + x.d, 0) / dz.n;
      const surv = dz.r.filter(x => first.has(x.i));
      const d0s = surv.length ? surv.reduce((a, x) => a + first.get(x.i), 0) / surv.length : null;
      /* 알짜 이동 — 생존자 하나하나의 «끝 − 처음». 안으로 온 알이 있으면 그것이 «모이는 비행» 이다. */
      const inward = surv.filter(x => x.d < first.get(x.i) - 2).length;
      netIn += inward; censor += (seq[0].n - dz.n);
      if (d0s !== null && d0s < d0 - 2) mixRows++;
      if (d1 < d0 - 2) negRuns++;
      console.log('  · ' + s.n + ' — 평균 반경 ' + n1(d0) + ' → ' + n1(d1) + 'px'
        + '  |  생존자만: ' + n1(d0s) + ' → ' + n1(d1) + 'px'
        + ' · 첫 무리 ' + seq[0].n + '알 → 창 끝 ' + dz.n + '알(생존 ' + surv.length + ')'
        + ' · 안으로 온 알 ' + inward + (d1 < d0 - 2 ? '   ← [D-o] 문턱 아래' : ''));
    }
  }
  /* ⚠ **«개별 알은 바깥으로만 간다» 는 거짓이다** — 1회차에 그렇게 물었다가 빨갰다(창 9개에 2알).
     660 의 산포는 등방 랜덤이라 되돌아오는 성분이 있고, 게다가 첫 무리의 구성원이 창 안에서 죽는다.
     ⇒ [D-o] 를 흔드는 축은 **둘 다 «어느 알을 보고 있는가»** 이고, [C-big] 을 흔드는 축(상자 하나의
       반올림)과는 **재는 대상이 다르다**. 그것이 «다른 병» 의 뜻이다. */
  ok(dRows > 0 && (censor + netIn) > 0,
     '[D1] ★ [D-o] 의 두 끝값은 **입자 표본**에서 나오고 그 표본은 창마다 바뀐다 — 구성원 소실 · 되돌아오는 알',
     '소실 ' + censor + '알 · 되돌아온 알 ' + netIn + '알 / 창 ' + dRows + '개'
     + ' · 생존자 처음 평균이 전원 평균보다 2px 이상 낮은 창 ' + mixRows + '개');
  /* [C-big] 은 그 축을 **한 알도 안 본다** — 두 값 다 상자에서 해석적으로 유도된다(위 [1]·[2]).
     소스에 직접 대고 못박는다: 그 블록이 읽는 것은 `CH[…]` 뿐이고 입자 폭(`onx`·`onm`)이 아니다. */
  const gsrc = fs.readFileSync(path.resolve(__dirname, 'verify583.js'), 'utf8');
  /* ⚠ 앵커는 **머리말이 아니라 항 자신**이다 — `[C-big]` 은 파일 머리 요약에도 적혀 있어
     그쪽에 걸면 파일 앞머리 2천 자를 잘라 와 엉뚱한 것을 읽는다(1회차 실측). `★` 가 붙은
     `ok()` 문자열만 항이다. */
  const iB = gsrc.indexOf('[C-big] ★'), iF = gsrc.indexOf('[C-big-f] ★');
  const cbig = (iB > 0 && iF > iB)
    ? gsrc.slice(Math.max(0, gsrc.lastIndexOf('const ks = SITES.map', iB)), iF + 400) : '';
  ok(cbig.length > 0 && /CH\[/.test(cbig) && !/\bonx\b|\bonm\b|r\.tr/.test(cbig),
     '[D2] ★ 반대로 `[C-big]` 은 **입자를 한 알도 안 본다** — 상자에서 유도한 두 수만 읽는다 ⇒ 한 수리로 둘을 못 닫는다',
     cbig.length ? '블록 ' + cbig.length + '자 · 입자 폭 참조 0' : '블록을 못 찾았다');
  console.log('  ⇒ [D-train-o] 의 뿌리는 **입자 표본**(구성 · 산포)이고 [C-big] 의 뿌리는 **상자 하나의 정수 양자화**다 — 같이 흔들렸을 뿐 다른 병이다.');
  console.log('  · 이 실행에서 [D-o] 문턱(d1 ≥ d0 − 2) 아래로 내려간 창: ' + negRuns + '/' + runs);

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  ok(errs.length === 0, '[Z] 콘솔 에러 0');
  console.log('\nPROBE902 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
