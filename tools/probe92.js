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
    window.__anims = document.getAnimations().filter((a) => /^(mlOut|mlOutIn|mlTint|mlAcc|mlIco|mlBtn|mlSum|mlTtl|jzDn|jzUp)$/.test(a.animationName));
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
        /* 내용 잉크 = 제목/요약/썸네일/버튼/기한/액센트의 «보이는» 면적 합.
           ★ 20회차 — **알파를 곱한다.** 18·19회차는 렌더 bbox 만 더해서, 요소가 opacity 0 이 돼도
           레이아웃 상자는 그대로라 잉크가 **한 번도 0 이 되지 않았다.** 그래서 «빈 판 0개» 라고
           보고하는 동안 비평가 넷(Ψ·Χ·Ρ·Τ)이 사람 눈으로 93~130ms 짜리 빈 판을 보고 있었다.
           클립도 반영한다 — 카드 밖으로 나간 부분은 안 보이므로 교집합 면적만 센다. */
        const el = r.querySelector(':scope>.ml-in'); if (!el) return 0;
        const box = el.getBoundingClientRect();
        return [...r.querySelectorAll('.ml-t,.ml-s,.ml-i,.ml-b,.ml-d,.ml-ac')]
          .reduce((a, e) => {
            const q = e.getBoundingClientRect();
            const h = Math.max(0, Math.min(q.bottom, box.bottom) - Math.max(q.top, box.top));
            const w = Math.max(0, Math.min(q.right, box.right) - Math.max(q.left, box.left));
            return a + (+getComputedStyle(e).opacity) * w * h;
          }, 0);
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
            /* ★ 18회차 신설 — «읽히는데 잘린» 검출. 5~10회차가 축을 바꿔 가며 네 번 재발시킨
               결함인데, 지금까지 계측기가 **한 번도 안 재고 있었다**(10회차가 등방 축소로 «구조적으로
               불가능» 하게 만들면서 지표도 같이 사라졌다). 18회차는 다시 클리핑을 쓰므로 되살린다.
               정의: 요소의 «로컬 하변»(레이아웃 좌표, 클립과 무관)이 카드 높이를 넘은 순간의
               실효 α(= 요소 자신의 α × 행 α). 이 값이 0.2 를 넘는 표본이 있으면 그 프레임에
               «읽을 수 있는데 잘린» 요소가 있는 것이다. */
            cut: (() => {
              /* ★ 19회차 — **클립선을 고쳤다.** 18회차는 «카드 높이 h» 를 클립선으로 썼는데,
                 내용을 실제로 가리는 선은 **h − 안쪽 빛 테두리 − 림 플래시** 다. 비평가 Χ 가
                 렌더된 픽셀에서 «own≈30ms 에 「800」 숫자가 5px(26%) 잘린 채 알파 0.21» 을 잡았고,
                 이 계측기는 h 로만 재서 «최대 실효 α 0.100 ✓» 라고 통과시키고 있었다.
                 16회차 교훈(«계측기가 「1px 남았으니 통과」 로 읽던 것은 비평가가 옳았다»)의 재발이다.
                 inset 그림자 두 개의 spread 중 **큰 쪽**이 그 시각에 안쪽을 덮는 두께다. */
              const insets = getComputedStyle(el).boxShadow.split(/,(?=\s*(?:inset|rgb))/)
                .filter((x) => /inset/.test(x))
                .map((x) => { const m = /(-?[\d.]+)px\s*$/.exec(x.trim()); return m ? parseFloat(m[1]) : 0; });
              const chrome = insets.length ? Math.max(...insets) : 0;
              const clipLine = el.offsetHeight - chrome;
              /* `.ml-ac`(좌측 액센트 띠)는 넣지 않는다 — top:5/bottom:5 로 **프레임에 붙어 같이
                 줄어드는** 골격이라 내용이 아니고, 정의상 항상 «클립선에 걸린» 것으로 잡힌다. */
              return [...r.querySelectorAll('.ml-t,.ml-s,.ml-i,.ml-b,.ml-d')].map((e) => {
                const bot = e.offsetTop + e.offsetHeight;
                return bot > clipLine + 0.5
                  ? { n: e.className.split(' ')[0], depth: bot - clipLine,
                      ea: (+getComputedStyle(e).opacity) * (+getComputedStyle(r).opacity) }
                  : null;
              }).filter(Boolean);
            })(),
            /* 내용 왜곡 계측용 — 제목 잉크 상자의 «렌더» w/h. `overflow:hidden` 은 이 값을 안 자른다
               (레이아웃 상자 그대로 돌려준다) → **스케일만** 잡히고 클립은 안 잡힌다. 우리가 원하는 것이다. */
            cw: (() => { const e = r.querySelector('.ml-t'); return e ? e.getBoundingClientRect().width : 0; })(),
            ch: (() => { const e = r.querySelector('.ml-t'); return e ? e.getBoundingClientRect().height : 0; })(),
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
  /* ★ 18회차 — «종횡비 왜곡» 의 **정의를 바꿨다**(수치를 통과시키려는 게 아니라 재던 대상이 바뀌었다).
     10~17회차의 이 지표는 «`.ml-in` 의 w/h ÷ 정지 시 w/h» 였다. 그건 «상자와 내용을 한 몸으로
     **등방 축소**한다» 는 전제 위에서만 «왜곡» 을 뜻한다 — 상자 종횡비가 변하면 곧 내용도 눌린 것이니까.
     18회차는 상자를 일부러 세로로만 접으므로(폭 784 고정) 상자 종횡비는 **설계상** 5.33 → ∞ 로 간다.
     옛 정의를 그대로 쓰면 «왜곡 275» 라는 무의미한 수가 나온다 — 접힘 그 자체를 왜곡이라 부르는 것이다.
     내용은 **한 번도 스케일되지 않으므로**(클립만 한다) 진짜 왜곡은 정의상 0 이고, 그것을 직접 잰다:
     내용 요소의 렌더 w/h 를 정지 시 w/h 와 비교한다. 상자 접힘 비율은 아래 «접힘» 으로 따로 낸다. */
  const contentBase = rows[0].out[0].cw;
  const aspect = rows.map((r) => {
    const o = r.out[0];
    if (!o || !o.cw || !contentBase) return null;
    return (o.cw / o.ch) / (contentBase / rows[0].out[0].ch);
  });

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
  /* ★ 18회차 — «빈 판» 은 **개수만으로는 뜻이 없다**. 세로 접힘에서는 내용이 다 꺼진 뒤 남는 것이
     «판» 이 아니라 폭 784 짜리 «닫히는 띠» 라서, 같은 표본 수라도 그때의 **높이**가 전혀 다른 것을
     말한다. 등방 축소 시절의 «빈 판» 은 296×66 짜리 정체불명의 조각이었고(Σ D-1 실측),
     세로 접힘의 그것은 784×44 → 784×0 으로 닫히는 행이다. 그래서 높이를 같이 낸다. */
  const blankH = moving.filter((i) => rows[i].out.every((o) => o.ink < 1))
    .reduce((m, i) => Math.max(m, ...rows[i].out.map((o) => o.ih)), 0);
  console.log(`«빈 판» 표본        ${blank}개 (그때 카드 최대 높이 ${blankH.toFixed(1)}px · 폭 ${rows[0].out[0].iw.toFixed(0)}px 고정)`);
  /* ★ 18회차 신설 — 이 회차 설계의 **불변식**이다. 4단 내용 소거(mlIco·mlBtn·mlSum·mlTtl)가
     «클립이 하변에 닿기 전에 그 요소를 껐는가» 를 직접 검사한다. 0.2 초과면 설계가 깨진 것이다. */
  let cutMax = 0, cutWho = '—';
  rows.forEach((r) => r.out.forEach((o) => (o.cut || []).forEach((c) => {
    if (c.ea > cutMax) { cutMax = c.ea; cutWho = `${c.n} t=${r.t}ms 깊이 ${c.depth.toFixed(0)}px`; }
  })));
  console.log(`«읽히는데 잘림» 최대 실효α ${cutMax.toFixed(3)} (${cutWho}) — 상한 0.200 ${cutMax <= 0.2 ? '✓' : '✗'}`);
  /* ★ 20회차 신설 — **«보이는 빈 판»**. Ρ·Τ 가 19회차에 둘 다 «8점을 막는 단 하나» 로 지목한 것이라
     이제부터 게이트로 건다. 정의: 내용 잉크가 0 인데 카드 알파가 **0.1 을 넘는** 표본의 총 시간.
     18·19회차의 «빈 판 표본» 은 α>0.02 라 «사실상 안 보이는 프레임» 까지 세고 있었고, 그래서
     0 개라고 보고하면서도 사람 눈에는 110ms 짜리 판이 보였다.
     반대편 지표도 같이 낸다 — «빈 구멍»(α=0 인데 슬롯이 아직 닫히는 중). 두 값은 **한 창의 양 끝**이라
     한쪽만 줄이면 반드시 다른 쪽이 늘어난다(17회차 Σ·Φ 는 «빈 구멍» 을, 19회차 Ρ·Τ 는 «빈 판» 을 쳤다). */
  /* ⚠ **행마다 따로 센다.** 스태거가 있으므로 «2행의 알파» 와 «4행의 슬롯» 을 섞으면 창이 부풀어
     오른다(첫 구현이 그랬다 — 70ms 짜리를 100ms 로 보고했다). 각 행의 자기 알파 × 자기 슬롯이다. */
  const perRow = (n) => rows.map((r) => r.out[n]).filter(Boolean);
  const nOut = rows[0].out.length;
  let bandMs = 0, holeMs = 0;
  for (let n = 0; n < nOut; n++) {
    const a = perRow(n);
    bandMs = Math.max(bandMs, a.filter((o) => o.a > 0.1 && o.ink < 1).length * STEP);
    holeMs = Math.max(holeMs, a.filter((o) => o.a <= 0.1 && o.rh > 0.5).length * STEP);
  }
  console.log(`«보이는 빈 판»(α>0.1 · 잉크 0)   ${bandMs}ms`);
  console.log(`«빈 구멍»(α≤0.1 · 슬롯 안 닫힘)  ${holeMs}ms   ← 이 둘은 한 창의 양 끝이다`);
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
  /* ★ 18회차 — 융착이 «보이는» 창을 α>0.2 로 좁혔다. 세로 접힘에서는 카드가 죽기 직전(α<0.2, h<10px)에
     **이웃 행의 바깥 링 6px 이 사라져 가는 1px 짜리 틈 위로 겹친다** — 거터가 산술적으로 음수가 된다.
     그건 융착이 아니라 «이미 없는 행 자리를 이웃 테두리가 채우는 것» 이고, 이웃끼리의 구분선은
     멀쩡하다. 17회차까지의 α>0.02 창은 등방 축소라 카드 하변이 원점 쪽으로 빨리 물러나 이 구간이
     안 잡혔을 뿐이다. 두 값을 다 낸다 — 낮은 쪽을 숨기지 않는다. */
  const gutSolid = moving.filter((i) => alpha[i] > 0.2).map((i) => rows[i].out[0].gutter).filter((v) => v !== null);
  console.log(`중심 이동(보이는 구간) 가로 ${dxMax.toFixed(1)}px · 세로 ${dyMax.toFixed(1)}px → 가로:세로 ${dyMax > 0.05 ? (dxMax / dyMax).toFixed(2) : '—'}:1`);
  console.log(`우변 이탈 최대(보이는) ${mabs((o) => c0.r - o.right).toFixed(1)} px`);
  console.log(`행간 거터 최소(α>0.2)  ${gutSolid.length ? Math.min(...gutSolid).toFixed(2) : '—'} px  (정지 시 ${gut.length ? gut[0].toFixed(2) : '—'})`);
  console.log(`행간 거터 최소(α>0.02) ${gut.length ? Math.min(...gut).toFixed(2) : '—'} px  (플래시 밖 ${gutOut.length ? Math.min(...gutOut).toFixed(2) : '—'}) — 꼬리에서 이웃 링이 덮는 구간 포함`);
  /* ★ 19회차 신설 — **«도색 외곽»** 상자를 직접 낸다. 18회차의 세 결함(폭 −10px · 상변 5px 역행 ·
     거터 5→10px)은 전부 «링을 줄이면 박스가 사방으로 인셋된다» 는 한 원인에서 나왔는데,
     이 계측기는 링 «안쪽» 상자(`.ml-in` rect)만 재고 있어서 셋 다 0 으로 보고하고 있었다.
     비평가 둘이 같은 픽셀 좌표로 잡아 준 것을 계측기가 이제 스스로 잡는다. */
  const solid = moving.filter((i) => alpha[i] > 0.2).map((i) => rows[i].out[0]).filter(Boolean);
  const oW = (a) => a.map((o) => o.iw + 2 * (o.ring || 0));
  const oT = (a) => a.map((o) => o.cy - o.ih / 2 - (o.ring || 0));
  const spread = (a) => (a.length ? (Math.max(...a) - Math.min(...a)) : 0);
  console.log(`도색 외곽 폭  α>0.2  ${spread(oW(solid)).toFixed(2)} px 변동   ·  α>0.02  ${spread(oW(vis)).toFixed(2)} px`);
  console.log(`도색 외곽 상변 α>0.2  ${spread(oT(solid)).toFixed(2)} px 이동   ·  α>0.02  ${spread(oT(vis)).toFixed(2)} px  (0 = 역행 없음)`);
  const foldMax = vis.reduce((m, o) => Math.max(m, base.h / Math.max(o.ih, 0.01)), 1);
  console.log(`상자 접힘 최대(설계)   세로 1/${foldMax.toFixed(1)} · 가로 1/1.00 (폭 ${vis[0].iw.toFixed(0)}px 전 표본 고정)`);
  console.log(`console errors: ${errs.length}`);
  await b.close();
})();
