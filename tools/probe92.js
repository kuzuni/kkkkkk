/* 작업 92 — [읽음 전체 삭제] 접힘 연출 **시간축 계측기** (14회차 신설).
   13회차까지의 실측치(합산 상승 피크 · 단차 · 알파 기울기 · 종횡비 · 잘림 · 빈 판 · 보이는 잉크)는
   회차마다 손으로 재고 있었다. 같은 규칙으로 반복해서 재야 «내가 고친 축이 남의 축을 깼는지» 가 보인다.

   방식은 `cap92fx.js` 와 동일 — Web Animations API 로 정지시키고 `currentTime` 을 10ms 씩 옮긴다
   (고정 간격 waitForTimeout 은 100~200ms 짜리 screenshot 비용 때문에 짧은 연출을 못 잰다).
   화면을 찍지 않으므로 표본을 촘촘히 잡아도 싸다.

   실행: node tools/probe92.js [끝ms=340] [간격ms=10]

   내는 값 (전부 «화면 px» 기준):
     · 합산 상승 속도  — 마지막 «남는 행» 의 top 이 위로 오는 속도(= 삭제 행들의 pitch 수축 합)
     · 단차            — 이웃 표본 사이 속도차의 최대(끊김·재가속 검출. 부호 +는 재가속)
     · 알파 기울기     — 삭제 행 opacity 의 |Δ|/ms 최대 (절벽 검출)
     · 종횡비          — .ml-in 의 렌더 w/h ÷ 정지 시 w/h (1.000 이면 왜곡 0)
     · 잘림            — .ml-in 렌더 bbox 가 자기 행(.ml-r) bbox 를 넘는 상·하·우 px
     · 카드 vs 슬롯    — .ml-in 렌더 높이 − .ml-r 높이 (0 이면 «카드=슬롯»)
     · 빈 판           — α>0.02 인데 내용 잉크가 0 인 표본 수
     · 보이는 잉크     — Σ(α × .ml-in 렌더 면적) / 정지 시 면적, %
     · 링 화면 두께    — box-shadow 바깥 링 선언값 × scale (이웃 3행의 6px 과 비교) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const END = +(process.argv[2] || 340);
const STEP = +(process.argv[3] || 10);

const f2 = (v) => (v === null || v === undefined ? '  —  ' : v.toFixed(2).padStart(6));
const f3 = (v) => (v === null || v === undefined ? '   —   ' : v.toFixed(3).padStart(7));

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* cap92fx 와 **같은 상황**을 만든다 — 5통 중 2·4번째만 수령(목록 «중간» 이 접힌다) */
  await p.evaluate(() => { S.mail[MAILS[1].id] = 1; S.mail[MAILS[3].id] = 1; save(); openMail(); });
  await p.waitForTimeout(400);
  for (let i = 0; i < 60; i++) {
    const done = await p.evaluate(() => {
      const ident = (t) => t === 'none' || /^matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)$/.test(t);
      for (let e = document.querySelector('.mbox'); e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (!ident(cs.transform) || (cs.scale && cs.scale !== 'none' && cs.scale !== '1')) return false;
        if (parseFloat(cs.opacity) < 0.999) return false;
      }
      return true;
    });
    if (done) break;
    await p.waitForTimeout(50);
  }
  await p.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    if (typeof window.step === 'function') window.step = () => {};
  });
  await p.waitForTimeout(120);

  /* 정지 상태(기준) */
  const base = await p.evaluate(() => {
    const ins = [...document.querySelectorAll('.ml-r>.ml-in')].map((e) => e.getBoundingClientRect());
    return { w: ins[0].width, h: ins[0].height, n: ins.length };
  });

  await p.evaluate(() => {
    window.__raw = window.setTimeout;
    window.setTimeout = function (fn, ms) { if (ms >= 300 && ms <= 800) { window.__held = fn; return 0; } return window.__raw.apply(window, arguments); };
  });
  const bb = await p.evaluate(() => { const r = document.getElementById('mailDel').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(bb.x, bb.y); await p.mouse.down(); await p.mouse.up();
  await p.evaluate(() => {
    window.setTimeout = window.__raw;
    void document.body.offsetHeight;
    document.querySelectorAll('.ml-r.out').forEach((r) => void getComputedStyle(r).animationName);
    window.__anims = document.getAnimations().filter((a) => /^(mlOut|mlOutIn|jzDn|jzUp)$/.test(a.animationName));
    window.__anims.forEach((a) => a.pause());
  });
  if (!(await p.evaluate(() => window.__anims.length))) { console.log('✗ 애니메이션을 못 잡았다 — 중단'); await b.close(); process.exit(1); }

  const rows = [];
  for (let t = 0; t <= END; t += STEP) {
    const s = await p.evaluate((ms) => {
      window.__anims.forEach((a) => { a.currentTime = ms; });
      const all = [...document.querySelectorAll('.ml-r')];
      const out = all.filter((r) => r.classList.contains('out'));
      const live = all.filter((r) => !r.classList.contains('out'));
      const inOf = (r) => r.querySelector(':scope>.ml-in');
      const ink = (r) => {
        /* 내용 잉크 = 제목/요약/썸네일/버튼의 렌더 bbox 합(0 이면 «빈 판») */
        return [...r.querySelectorAll('.ml-t,.ml-s,.ml-i,.ml-b,.ml-d')]
          .reduce((a, e) => { const q = e.getBoundingClientRect(); return a + q.width * q.height; }, 0);
      };
      const ringOf = (r) => {
        const el = inOf(r); if (!el) return null;
        const sh = getComputedStyle(el).boxShadow;
        /* 바깥 링 = inset 이 아닌 첫 그림자의 spread(4번째 길이값) */
        const m = /rgba?\([^)]*\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(sh.split(', inset')[0]);
        const tr = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform);
        const sc = tr ? parseFloat(tr[1].split(',')[0]) : 1;
        return m ? parseFloat(m[4]) * sc : null;
      };
      return {
        lastLiveTop: live.length ? live[live.length - 1].getBoundingClientRect().top : null,
        out: out.map((r) => {
          const rr = r.getBoundingClientRect(); const el = inOf(r); const ir = el.getBoundingClientRect();
          /* 16회차 신설 — ⓐ «지배적 움직임» 은 bbox 가 아니라 **중심의 이동**이 정의다(Z «가로:세로 5.6:1»).
             ⓑ 행간 거터 = 다음 살아있는 행의 «링 윗면» − 이 카드의 «링 아랫면». 융착 검출(Λ ③감점2). */
          let nx = r.nextElementSibling;
          while (nx && !nx.classList.contains('ml-r')) nx = nx.nextElementSibling;
          const nEl = nx ? nx.querySelector(':scope>.ml-in') : null;
          const nr = nEl ? nEl.getBoundingClientRect() : null;
          const myRing = ringOf(r) || 0;
          const nRing = nx ? (ringOf(nx) || 0) : 0;
          return { rh: rr.height, ih: ir.height, iw: ir.width, a: +getComputedStyle(r).opacity,
            cx: ir.left + ir.width / 2, cy: ir.top + ir.height / 2, right: ir.right, left: ir.left,
            gutter: nr ? (nr.top - nRing) - (ir.bottom + myRing) : null,
            over: { t: rr.top - ir.top, b: ir.bottom - rr.bottom, r: ir.right - rr.right },
            ink: ink(r), ring: ringOf(r) };
        })
      };
    }, t);
    rows.push({ t, ...s });
  }

  /* ── 파생 지표 ────────────────────────────────────────── */
  const rise = rows.map((r, i) => (i === 0 ? 0 : (rows[i - 1].lastLiveTop - r.lastLiveTop) / STEP));
  const step = rise.map((v, i) => (i < 2 ? 0 : v - rise[i - 1]));
  const alpha = rows.map((r) => (r.out[0] ? r.out[0].a : 0));
  const dA = alpha.map((v, i) => (i === 0 ? 0 : Math.abs(alpha[i - 1] - v) / STEP));
  const baseArea = base.w * base.h;
  const inkVis = rows.map((r) => r.out.reduce((a, o) => a + o.a * o.iw * o.ih, 0) / (baseArea * r.out.length || 1) * 100);
  const aspect = rows.map((r) => (r.out[0] && r.out[0].ih > 0.5 ? (r.out[0].iw / r.out[0].ih) / (base.w / base.h) : null));

  console.log(`기준 카드 ${base.w.toFixed(1)}×${base.h.toFixed(1)} · 삭제 대상 ${rows[0].out.length}행 · 표본 ${rows.length}개 (0~${END}ms / ${STEP}ms)\n`);
  const c0 = { x: rows[0].out[0].cx, y: rows[0].out[0].cy, r: rows[0].out[0].right };
  console.log('   t │ 남는행 h  │ 상승속도 단차  │  알파  기울기 │ 종횡비 │ 잘림 상/하/우 │ 카드−슬롯 │ 잉크%  │ 링px │ 중심Δ가로 세로 │ 우변Δ │ 거터');
  console.log('─'.repeat(148));
  rows.forEach((r, i) => {
    const o = r.out[0];
    const gap = o ? o.ih - o.rh : 0;
    console.log(
      `${String(r.t).padStart(4)} │ ${r.out.map((x) => x.rh.toFixed(0).padStart(3)).join(' ')} │ ${f2(rise[i])} ${f2(step[i])} │ ${f2(alpha[i])} ${f3(dA[i])} │ ${aspect[i] === null ? '  —   ' : aspect[i].toFixed(3)} │ ` +
      `${o ? [o.over.t, o.over.b, o.over.r].map((v) => (v > 0.5 ? v.toFixed(0) : '0').padStart(3)).join(' ') : ''} │ ${f2(gap).padStart(9)} │ ${f2(inkVis[i])} │ ${o && o.ring !== null ? o.ring.toFixed(2) : '—'} │ ` +
      `${f2(o ? o.cx - c0.x : null)} ${f2(o ? o.cy - c0.y : null)} │ ${f2(o ? c0.r - o.right : null)} │ ${f2(o && o.gutter !== null ? o.gutter : null)}`);
  });

  const mx = (a, from = 0) => a.slice(from).reduce((m, v) => (v > m ? v : m), -Infinity);
  const moving = rows.map((r, i) => i).filter((i) => alpha[i] > 0.02);
  const blank = moving.filter((i) => rows[i].out.every((o) => o.ink < 1)).length;
  const clip = rows.reduce((m, r) => Math.max(m, ...r.out.map((o) => Math.max(o.over.t, o.over.b, o.over.r))), 0);
  const gapMax = rows.reduce((m, r) => Math.max(m, ...r.out.map((o) => Math.abs(o.ih - o.rh))), 0);
  const inkIdx = inkVis.findIndex((v, i) => i > 0 && v < 1.5);
  const tailMs = inkIdx < 0 ? 0 : END - rows[inkIdx].t;

  console.log('\n── 요약 ' + '─'.repeat(60));
  console.log(`합산 상승 피크      ${mx(rise).toFixed(3)} px/ms`);
  console.log(`상승 단차 최대      ${mx(step.map(Math.abs)).toFixed(3)} px/ms  (재가속 최대 ${mx(step).toFixed(3)})`);
  console.log(`알파 기울기 최대    ${mx(dA).toFixed(5)} /ms`);
  console.log(`종횡비 왜곡 최대    ${Math.max(...aspect.filter((v) => v !== null).map((v) => Math.abs(v - 1))).toFixed(4)}  (0 = 왜곡 없음)`);
  console.log(`잘림 최대(상·하·우) ${clip.toFixed(1)} px`);
  console.log(`카드−슬롯 최대차    ${gapMax.toFixed(2)} px`);
  console.log(`«빈 판» 표본        ${blank}개`);
  console.log(`보이는 잉크 1.5% 도달 t=${inkIdx < 0 ? '-' : rows[inkIdx].t}ms → 뒤쪽 ${tailMs}ms (${(tailMs / END * 100).toFixed(1)}%)`);
  console.log(`정지 구간(속도 0)   ${rise.filter((v, i) => i > 0 && Math.abs(v) < 0.02).length * STEP}ms`);
  /* 16회차 신설 — 보이는 구간(α>0.02)에서만 잰다. «안 보이는 프레임의 이탈» 은 채점 대상이 아니다. */
  const vis = moving.map((i) => rows[i].out[0]).filter(Boolean);
  const mabs = (f) => vis.reduce((m, o) => Math.max(m, Math.abs(f(o))), 0);
  const dxMax = mabs((o) => o.cx - c0.x), dyMax = mabs((o) => o.cy - c0.y);
  /* 거터는 «플래시 창»(0~130ms, 바깥 링이 6→10→6px) 안에서는 설계상 눌린다(15회차: 17−10−6 = 1px 이 상한).
     융착 검출은 플래시 밖에서 봐야 의미가 있으므로 두 값을 따로 낸다. */
  const gut = vis.map((o) => o.gutter).filter((v) => v !== null);
  const gutOut = moving.filter((i) => rows[i].t >= 140).map((i) => rows[i].out[0].gutter).filter((v) => v !== null);
  console.log(`중심 이동(보이는 구간) 가로 ${dxMax.toFixed(1)}px · 세로 ${dyMax.toFixed(1)}px → 가로:세로 ${dyMax > 0.05 ? (dxMax / dyMax).toFixed(2) : '—'}:1`);
  console.log(`우변 이탈 최대(보이는) ${mabs((o) => c0.r - o.right).toFixed(1)} px`);
  console.log(`행간 거터 최소(보이는) ${gut.length ? Math.min(...gut).toFixed(2) : '—'} px  (정지 시 ${gut.length ? gut[0].toFixed(2) : '—'} · 플래시 밖 ${gutOut.length ? Math.min(...gutOut).toFixed(2) : '—'})`);
  console.log(`console errors: ${errs.length}`);
  await b.close();
})();
