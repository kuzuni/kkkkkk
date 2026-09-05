#!/usr/bin/env node
/* 305 프로브 — verify95 [E] 관성(fling) 이 «4회 중 1회» FAIL 하던 자리를 재현·회귀 감시한다.
 *
 *   node tools/probe305.js [반복수=10]        판정 — 실패 0 이어야 한다
 *   node tools/probe305.js [반복수] --old     수정 전 제스처(playwright page.mouse) 재현 — 흔들린다
 *   node tools/probe305.js [반복수] --dead    되돌림 시험 — 관성을 죽인 사본. **빨개져야 한다**
 *
 * ── 946 2회차 (2026-09-05) — 판정 축을 «벽시계 450ms» 에서 «총 이동» 으로 옮겼다 ──────────
 * 옛 축은 `t0`(뗀 «직후» 왕복으로 읽은 scrollTop) → 450ms 대기 → `t1` 로 `t1 − t0 > 20` 이었다.
 * 그 축은 두 가지를 **전제**한다: ⓐ 왕복이 «즉시» 다 ⓑ 450ms 안에 프레임 예산이 건강하다.
 * `par 7` 부하에서는 둘 다 깨진다(946 1회차 실측: 왕복 lag **34~1469ms** · 3초 rAF 표본
 * 23~119장 ↔ 한가할 때 64~117ms · 113~123장). 그래서 관성이 멀쩡히 굴러도 자가 빨개졌다
 * (56 표본 중 ⓐ 미달 17건인데 그 중 12건은 총 이동이 멀쩡했다).
 * ⇒ 이 자는 이제 **아무것도 전제하지 않는 축**으로 판정한다:
 *     기준선 = pointerup **그 순간 페이지 안에서 동기로** 찍은 scrollTop (왕복 없음)
 *     끝값   = rAF 궤적의 **마지막 값** (프레임이 몇 장 오든 «관성이 데려간 곳»)
 *     판정   = 끝값 − 기준선 > 20px
 * 벽시계 창을 안 쓰므로 프레임이 굶어도 축이 같이 굶지 않는다.
 *
 * ── 갈래 ㉠ «관성 미발화» 는 **따로 센다** ────────────────────────────────────────────
 * 제품의 `end` 는 `!r || !dsDragged` 와 `performance.now() - r.t < 90` 셋을 통과할 때만
 * `dsFling(r)` 을 건다. 그 셋이 부하에서 갈리는 것은 «스톱워치가 늦게 눌렸다» 와 **뿌리가 다르고
 * 처방도 다르다** — 한 칸에 뭉개면 진짜 회귀를 덮는 무른 수리가 된다(946 1회차 ㉠㉡).
 * 그래서 미발화는 총 이동 축과 별도로 세고, 그 자리에서 **왜** 안 걸렸는지까지 찍는다.
 *
 * ⚑ **제품의 `dsRec`/`dsDragged`/`dsGlide` 는 밖에서 읽힌다**(946 2회차 실측).
 *   여기 옛 주석은 «모듈 지역 `let` 이라 밖에서 못 읽는다» 고 적어 두었으나 그것은 틀렸다 —
 *   고전 스크립트의 최상위 `let` 은 **전역 어휘 환경**에 들어가서 `window.dsRec` 로는 안 보이고
 *   (`'dsRec' in window` = false) **이름으로는 닿는다**(`page.evaluate(() => dsRec)` = object).
 *   덕분에 «마지막 move → up» 간격을 대역(우리 리스너의 시각)이 아니라 **제품이 실제로 재는 값**
 *   (`performance.now() - dsRec.t`)으로 찍는다. 제품이 안 센 move(드래그 확정 전 임계 미만)를
 *   우리 리스너는 세므로 둘은 부하에서 갈릴 수 있다.
 */
const path = require('path');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const N = parseInt(process.argv[2] || '10', 10);
/* --old = 305 수정 전 제스처. 호출마다 왕복을 기다리는 page.mouse 라 «마지막 move → up» 이
   84~134ms 로 벌어지고, 제품의 관성 창(90ms)을 걸쳐 흔들린다. 재현용으로만 남긴다. */
const OLD = process.argv.includes('--old');
/* --dead = 되돌림 시험. `dsFling` 을 무력화한 사본에서 이 자가 **반드시** 빨개져야 한다.
   안 그러면 «관성이 통째로 사라져도 초록» 인 자가 된다(946 1회차가 인계한 필수 조건). */
const DEAD = process.argv.includes('--dead');
const TRACE_MS = 2500;          /* 궤적 길이 — 판정은 «마지막 값» 이라 프레임 수와 무관하다 */

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const rows = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1, hasTouch: false });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await page.waitForTimeout(1000);
    await page.evaluate(() => { S.gold = 1e15; S.dia = 1e9; S.relic = 1e6; uiDirty = true; renderUI(); });
    await page.waitForTimeout(500);
    const info = await page.evaluate(({ TR, DEAD }) => {
      openPass(); uiDirty = true; try { renderUI(); } catch (_) {}
      window.__box = () => [...document.querySelectorAll('.ps-list')]
        .filter((e) => { const q = e.getBoundingClientRect(); return q.width > 4 && q.height > 4; })
        .find((e) => e.scrollHeight - e.clientHeight > 1) || null;
      window.__top = () => { const b = window.__box(); return b ? b.scrollTop : -1; };
      /* dsFling 을 감싸 «불렸는가 · 그때 v 는 얼마였는가» 를 기록한다.
         `function dsFling(){}` 은 최상위 함수 선언이라 window 속성이기도 해서 이 덮어쓰기가 먹는다. */
      window.__fl = null;
      const orig = window.dsFling;
      window.dsFling = DEAD
        /* 되돌림 시험 — 관성을 죽인 사본. 호출 사실은 남기되 굴리지는 않는다. */
        ? function (r) { window.__fl = { v: r.v, acc: r.acc, dead: 1 }; }
        : function (r) { window.__fl = { v: r.v, acc: r.acc }; return orig.apply(this, arguments); };
      /* 제품이 실제로 보는 값을 마지막 move 에서 훔쳐 둔다 — 우리 리스너는 제품 리스너 **뒤**에
         돈다(둘 다 window 캡처인데 제품이 먼저 등록됐다). 그래서 이 시점의 dsRec 은 갱신된 뒤다. */
      window.__lm = 0; window.__nmv = 0; window.__last = null;
      addEventListener('pointermove', () => {
        window.__lm = performance.now(); window.__nmv++;
        try { window.__last = dsRec ? { t: dsRec.t, v: dsRec.v } : null; } catch (_) { window.__last = 'unreadable'; }
        try { window.__lastDrag = dsDragged; } catch (_) {}
      }, true);
      window.__up = null; window.__trace = [];
      addEventListener('pointerup', () => {
        const now = performance.now();
        const b = window.__box();
        let glide = null, dragged = null;
        try { glide = dsGlide; } catch (_) {}
        try { dragged = dsDragged; } catch (_) {}
        window.__up = {
          t: now,
          /* 기준선 — 왕복이 아니라 **여기서 동기로** 찍는다. 제품의 end 는 이미 돌았고
             관성은 rAF 예약만 된 상태라, 이 값이 «드래그만의 끝» 이다. */
          s: b ? b.scrollTop : -1,
          el: b,
          proxyGap: window.__lm ? now - window.__lm : null,           /* 우리 리스너 기준 */
          prodGap: window.__last && window.__last !== 'unreadable' ? now - window.__last.t : null, /* 제품 기준 */
          readable: window.__last !== 'unreadable',
          dragged, glide,
        };
        const rec = () => {
          const t = performance.now() - now;
          const bb = window.__box();
          window.__trace.push([t, bb ? bb.scrollTop : -1, bb === window.__up.el ? 1 : 0]);
          if (t < TR) requestAnimationFrame(rec);
        };
        requestAnimationFrame(rec);
      }, true);
      const el = window.__box();
      if (!el) return { err: '컨테이너 없음' };
      el.scrollTop = 0;
      const r = el.getBoundingClientRect();
      /* 제품의 관성 상수를 **이름으로** 읽어 온다(최상위 `const` 도 전역 어휘 환경에 있다).
         자가 «얼마나 굴러야 하는가» 를 손으로 적지 않고 제품에서 파생시키기 위한 것이다 —
         제품이 DS_DAMP 를 바꾸면 자의 문턱이 **자동으로 따라온다**. */
      let K = null;
      try { K = { damp: DS_DAMP, vmin: DS_VMIN, vmax: DS_VMAX }; } catch (_) {}
      return { max: el.scrollHeight - el.clientHeight, x: Math.round(r.x + r.width / 2),
               y: Math.round(r.y + Math.min(r.height * 0.65, r.height - 60)), K };
    }, { TR: TRACE_MS, DEAD });
    if (info.err) { rows.push({ i, err: info.err }); await ctx.close(); continue; }
    /* verify95 [E] 와 완전히 같은 제스처 */
    if (OLD) {
      await page.mouse.move(info.x, info.y);
      await page.mouse.down();
      for (let k = 1; k <= 6; k++) { await page.mouse.move(info.x, info.y - k * 60); await page.waitForTimeout(8); }
      await page.mouse.up();
    } else {
      /* 같은 CDP 세션에 마지막 move 와 up 을 연달아 보낸다 — 순서는 보장되고 간격은 1ms 미만이 된다 */
      const cdp = await ctx.newCDPSession(page);
      const mev = (type, y, buttons) => cdp.send('Input.dispatchMouseEvent',
        { type, x: info.x, y, button: 'left', buttons, clickCount: 1, pointerType: 'mouse' });
      await mev('mousePressed', info.y, 1);
      for (let k = 1; k <= 5; k++) { await mev('mouseMoved', info.y - k * 60, 1); await page.waitForTimeout(8); }
      await Promise.all([mev('mouseMoved', info.y - 360, 1), mev('mouseReleased', info.y - 360, 0)]);
    }
    /* 옛 축(왕복 t0)도 계속 찍는다 — 판정에는 안 쓰지만 «부하가 스톱워치를 얼마나 밀었나» 의 계기판이다 */
    const t0 = await page.evaluate(() => window.__top());
    const lag = await page.evaluate(() => (window.__up ? performance.now() - window.__up.t : null));
    await page.waitForTimeout(TRACE_MS + 200);
    const d = await page.evaluate(() => ({
      nmv: window.__nmv, fl: window.__fl,
      up: window.__up ? { t: window.__up.t, s: window.__up.s, proxyGap: window.__up.proxyGap,
                          prodGap: window.__up.prodGap, readable: window.__up.readable,
                          dragged: window.__up.dragged, glide: window.__up.glide } : null,
      trace: window.__trace,
    }));
    await ctx.close();
    if (!d.up) { rows.push({ i, err: 'pointerup 미도달' }); continue; }
    /* 제품이 «이 속도면 얼마나 굴린다» 고 스스로 약속한 거리 — 60fps(dt 16.67ms) 기준
       Σ v·dt·damp^n = v·16.67/(1 − damp). 손 상수가 아니라 제품 상수에서 파생된다.
       이 값이 문턱(20px)에 못 미치면 «관성이 죽었다» 가 아니라 **제스처가 그만큼 느렸다** 는 뜻이다. */
    const K = info.K || { damp: 0.95, vmin: 0.02, vmax: 4.0 };
    const vv = d.fl ? Math.min(Math.abs(d.fl.v), K.vmax) : null;
    const pred = vv == null ? null : (vv * 16.67) / (1 - K.damp);
    const tr = d.trace;
    const endS = tr.length ? tr[tr.length - 1][1] : d.up.s;
    /* 옛 축의 재현 — 계기판으로만 쓴다. «450ms 지점» 은 벽시계 450ms 안에 **실제로 온** 마지막
       rAF 표본이고, 한 장도 안 왔으면 옛 축은 그 자리에서 «못 쟀다» 였다(그것이 곧 굶은 얼굴이다).
       ⚠ 여기에 끝값을 갖다 쓰면 안 된다 — 그러면 옛 축이 아니라 새 축을 두 번 세는 것이다. */
    const in450 = tr.filter((p) => p[0] <= 450);
    const s450 = in450.length ? in450[in450.length - 1][1] : null;
    /* 관성이 걸렸는가 — 래퍼 호출 기록과 제품의 rAF 핸들(dsGlide) 둘 다 본다.
       --dead 사본은 래퍼는 불리지만 굴리지 않으므로 glide 는 0 이다. */
    const fling = !!d.fl;
    rows.push({ i, nmv: d.nmv, v: d.fl ? d.fl.v : null, fling, glide: d.up.glide,
      proxyGap: d.up.proxyGap, prodGap: d.up.prodGap, readable: d.up.readable, dragged: d.up.dragged,
      lag, t0, relS: d.up.s, endS, frames: tr.length, n450: in450.length, swap: tr.some(p => p[2] === 0), pred,
      totalD: endS - d.up.s, oldD: t0 == null || s450 == null ? null : s450 - t0 });
  }
  await browser.close();

  const n = (x) => (x == null ? '—' : Math.round(x));
  /* ── 표본을 세 갈래로 가른다(946 2회차) ──────────────────────────────────────────
     제품 결함 / **무효**(자가 못 잰 표본) / 통과. 가운데를 «실패» 로 세면 부하에서
     자가 다시 흔들리는데, 그 흔들림은 **제품이 자기 규칙을 지킨 결과**다:
     제품의 end 는 `performance.now() - r.t < 90` 일 때만 관성을 건다. 부하에서 제스처의
     마지막 move 가 up 보다 90ms 넘게 앞서면 **관성이 없는 것이 정답**이고, 그 표본으로는
     관성을 판정할 수 없다(verify95 [E] 가 예전부터 «게이트 계측» 으로 자기를 지목하던 그 자리).
     ⚠ 무르게 푸는 것이 아니다 — 이 갈래는 **제품 코드와 무관한 조건**(gap)으로만 열리고,
     `dsFling` 호출을 통째로 지워도 한가할 때 gap 은 1~2ms 라 ㉠-3(진짜 갈래)으로 떨어진다.
     `--dead` 되돌림 시험이 그것을 매 실행 못박는다. */
  const KIND = { OK: 'ok', BAD: 'bad', VOID: 'void' };
  const kind = (r) => {
    if (r.err) return KIND.BAD;
    if (!r.fling) return (typeof r.prodGap === 'number' && r.prodGap >= 90) ? KIND.VOID : KIND.BAD;
    /* ㉢ — 제품이 이 속도로 약속하는 거리 자체가 문턱 아래면, 20px 을 못 넘은 것은
       관성의 결함이 아니라 **자가 만든 제스처가 그만큼 느렸다**는 뜻이다(부하에서 마지막 move 의
       벽시계 dt 가 늘어나 `v = dy/dt` 가 눌린다 — 실측 0.055~0.068 ↔ 한가할 때 0.8~1.9). */
    if (r.pred != null && r.pred <= 20) return KIND.VOID;
    return r.totalD > 20 ? KIND.OK : KIND.BAD;
  };
  const why = (r) => {
    if (r.err) return `ERR ${r.err}`;
    if (!r.fling) {
      if (typeof r.prodGap === 'number' && r.prodGap >= 90) return `무효 ㉠-2(제품 창 밖 ${Math.round(r.prodGap)}ms — 제품 규칙대로 관성 없음)`;
      if (r.dragged === false) return '㉠-1 미발화(드래그 미확정)';
      return '㉠-3 미발화(창 안인데 안 걸림)';
    }
    if (r.pred != null && r.pred <= 20) return `무효 ㉢(v ${r.v.toFixed(3)} 이면 제품 약속이 ${r.pred.toFixed(1)}px — 문턱 20 아래)`;
    return r.totalD > 20 ? 'PASS' : `㉡ 총이동 ${Math.round(r.totalD)}px (제품 약속 ${r.pred == null ? '—' : r.pred.toFixed(0)}px)`;
  };
  console.log('\n| # | move | 제품gap(ms) | 대역gap | ds-drag | fling | glide | v(px/ms) | 약속px | 뗀 곳 | 왕복 t0(lag) | 끝값 | 프레임 | 총이동 | 판정 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.err) { console.log(`| ${r.i} |${' — |'.repeat(13)} ERR ${r.err} |`); continue; }
    console.log(`| ${r.i} | ${r.nmv} | ${r.readable ? n(r.prodGap) : '못읽음'} | ${n(r.proxyGap)} | ${r.dragged ? '○' : '✗'} | `
      + `${r.fling ? '○' : '✗'} | ${r.glide ? '○' : '✗'} | ${r.v == null ? '—' : r.v.toFixed(3)} | ${r.pred == null ? '—' : r.pred.toFixed(0)} | ${n(r.relS)} | `
      + `${n(r.t0)}(${n(r.lag)}) | ${n(r.endS)} | ${r.frames} | ${n(r.totalD)} | ${why(r)} |`);
  }
  const done = rows.filter((r) => !r.err);
  const voids = rows.filter((r) => kind(r) === KIND.VOID);
  const bads = rows.filter((r) => kind(r) === KIND.BAD);
  const oks = rows.filter((r) => kind(r) === KIND.OK);
  const bad = bads.length;
  if (done.length) {
    const lags = done.map((r) => r.lag).filter((x) => x != null);
    const frs = done.map((r) => r.frames);
    const oldBad = done.filter((r) => !(r.oldD != null && r.oldD > 20)).length;
    const starved = done.filter((r) => r.n450 === 0).length;
    console.log(`\n  표본 ${rows.length} · 판정 ${oks.length + bads.length}(통과 ${oks.length} · 실패 ${bads.length}) · **무효 ${voids.length}**(제품 창 밖 — 관성을 판정할 수 없는 표본)`
      + ` · 컨테이너 교체 ${done.filter((r) => r.swap).length}`);
    if (lags.length) console.log(`  왕복 lag ${Math.min(...lags).toFixed(0)}~${Math.max(...lags).toFixed(0)}ms · rAF 표본 ${Math.min(...frs)}~${Math.max(...frs)}장`
      + `  (한가하면 lag 60~120ms · 표본 ~80장)`);
    console.log(`  ↪ 계기판 — **옛 축**(왕복 t0 → 벽시계 450ms 지점)으로 세면 미달 ${oldBad}/${done.length} 건이고,`
      + ` 그 중 ${starved} 건은 450ms 창에 rAF 표본이 **한 장도 안 왔다**. 판정에는 안 쓴다(946 2회차).`);
  }
  /* 판정할 수 있는 표본이 하나도 없으면 «실패» 가 아니라 «못 쟀다» 다 — 939 종료 코드 규약의 3. */
  const nothing = !OLD && oks.length + bads.length === 0;
  console.log(OLD
    ? `\nPROBE305(--old) — ${rows.length}회 중 실패 ${bad}회 (재현용 · 흔들리는 것이 정상)`
    : nothing
      ? `\nPROBE305 못 쟀다 — 표본 ${rows.length} 이 전부 제품 창 밖(무효)이라 관성을 판정할 수 없다. 반복수를 늘려 다시 돌려라`
      : DEAD
        ? (bad === oks.length + bads.length
          ? `\nPROBE305(--dead) 되돌림 시험 PASS — 관성을 죽이니 판정 표본 ${bad}/${bad} 전부 빨갛다(축이 관성을 실제로 본다)`
          : `\nPROBE305(--dead) 되돌림 시험 FAIL — 관성이 죽었는데 ${oks.length}건이 초록이다(축이 관성을 안 본다)`)
        : bad ? `\nPROBE305 FAIL — 판정 ${oks.length + bads.length}회 중 ${bad}회 (${bads.map((r) => why(r).split('(')[0].trim()).join(' · ')})`
              : `\nPROBE305 PASS — ${oks.length}/${oks.length}${voids.length ? ` (무효 ${voids.length} 제외)` : ''}`);
  if (OLD) return;
  if (nothing) process.exit(3);
  /* --dead 는 «판정 표본이 전부 빨간 것» 이 통과다 — 부호를 뒤집어 낸다 */
  process.exit(DEAD ? (bad === oks.length + bads.length ? 0 : 1) : (bad ? 1 : 0));
})().catch((e) => { console.error(e); process.exit(2); });
