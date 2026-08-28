/* 작업 58 34회차 — 33회차가 넘긴 3건을 «고치기 전에» 수치로 세우는 probe.

   33회차 리뷰 «33회차가 34회차로 넘기는 것» 3건이 대상이다.
     ① 씬 C 델타 앵커(32차 2인 공통6) — 카드 라벨과의 세로 겹침·가로 간격·공존 시간
     ② 씬 A 전투 발 스케일(공통3) · 종단 이징(공통1) — 아이콘 실폭 vs UI 발, 마지막 40% 의 시간 몫
     ③ 씬 B 머묾 «부유» 의 최근접 중심거리(공통5 잔여) — 33회차가 «19.6px 까지 내려간다» 로 남긴 것

   ⚠ 재는 방식은 «화면과 같은 것»(getBoundingClientRect) 하나로 통일한다 — 33회차까지 여러 번
     «자가 다르면 일치해도 틀린다»(122 20회차 · A1 10회차) 에 데였다. 마스크·CSS 값이 아니라
     실제 배치 상자를 재고, 어떤 상자를 쟀는지 출력에 같이 적는다.

   실행: node tools/p58ao.js            (세 씬 전부)
        node tools/p58ao.js upg        (한 씬만 — upg | gain | quest) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const WANT = process.argv[2] ? [process.argv[2]] : ['upg', 'gain', 'quest'];
const STEP = 10;                                     /* ms — 캡처 간격 함정(32회차)을 피하는 해상도 */
const SPAN = { upg: 760, gain: 700, quest: 1600 };

async function open(seed) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
  await p.goto(URL);
  await p.waitForTimeout(1100);
  return { b, p, errs };
}

async function setup(p, scene) {
  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, scene);
  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(400); }
  else if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(400); }
  else await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => {
      const g = document.getElementById('goldN'), d = document.getElementById('diaN');
      return (g ? g.textContent.trim() : '') + '|' + (d ? d.textContent.trim() : '')
        + '|' + document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length;
    });
    if (st === prev && st.endsWith('|0')) break;
    prev = st; await p.waitForTimeout(80);
  }
}

const TRG = {
  gain: `() => { const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
    const p = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y); fxAt(p, 'combat'); S.gold += 128000; }`,
  quest: `() => { const b = document.getElementById('qAll'); if (b) b.click(); }`,
  upg: `() => { const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
    if (!c) return; c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }`,
};

/* 트리거 후 STEP 간격으로 «화면 상자» 를 통째로 받아 온다. 판정은 전부 node 쪽에서 한다. */
async function trace(p, scene, span) {
  return p.evaluate(async ({ trg, span, step }) => {
    // eslint-disable-next-line no-new-func
    const fire = new Function('return (' + trg + ')')();
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const card = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
    const cardR = card ? box(card) : null;
    /* 카드 안에서 «글자가 실제로 차 있는» 상자 — 델타와 헷갈릴 수 있는 것만 고른다 */
    const labels = card ? [...card.querySelectorAll('.cv,.cn,.cb')].map(e => ({ cls: e.className, ...box(e), txt: (e.textContent || '').trim().slice(0, 14) })) : [];
    const pill = document.querySelector('#goldN') ? box(document.querySelector('#goldN')) : null;
    const frames = [];
    const t0 = performance.now();
    fire();
    let next = 0;
    await new Promise((res) => {
      const f = () => {
        const t = performance.now() - t0;
        if (t >= next) {
          next += step;
          frames.push({
            t: Math.round(t),
            fly: [...document.querySelectorAll('.fx-fly')].map(e => {
              const r = e.getBoundingClientRect();
              return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, lo: !!e.closest('#fxlc') };
            }),
            delta: [...document.querySelectorAll('.fx-delta')].map(e => ({ ...box(e), op: +getComputedStyle(e).opacity })),
            /* 카드 수치 행이 «비어 있는» 동안은 겹칠 상대가 없다(21회차 fx-cvswap) */
            cv: (() => { const e = card && card.querySelector('.cv'); if (!e) return null;
              const st = getComputedStyle(e); return { ...box(e), op: +st.opacity, vis: st.visibility, txt: (e.textContent || '').trim() }; })(),
          });
        }
        if (t >= span) return res();
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    return { frames, cardR, labels, pill };
  }, { trg: TRG[scene], span, step: STEP });
}

const num = (v, d = 1) => (v == null ? '—' : v.toFixed(d));

(async () => {
  for (const scene of WANT) {
    const { b, p, errs } = await open(20340 + scene.length);
    await setup(p, scene);
    const r = await trace(p, scene, SPAN[scene]);
    console.log(`\n=== 씬 ${scene} — 표본 ${r.frames.length}장 · ${STEP}ms 간격 ===`);

    if (scene === 'upg') {
      const C = r.cardR;
      console.log(`  훈련 카드 상자 x${num(C.x, 0)} y${num(C.y, 0)} ${num(C.w, 0)}x${num(C.h, 0)}`);
      for (const l of r.labels) console.log(`    라벨 .${l.cls.split(' ')[0]} 카드기준 y ${num(l.y - C.y, 0)}~${num(l.y + l.h - C.y, 0)} · x ${num(l.x - C.x, 0)}~${num(l.x + l.w - C.x, 0)} «${l.txt}»`);
      const ds = [];
      let coexist = 0, prevT = null;
      for (const f of r.frames) {
        for (const d of f.delta) {
          if (d.op < 0.05) continue;
          ds.push({ t: f.t, top: d.y - C.y, bot: d.y + d.h - C.y, x0: d.x - C.x, x1: d.x + d.w - C.x, h: d.h });
          /* .cv 가 «살아 있는»(글자가 있는) 동안 겹치면 두 수치가 같이 읽힌다 */
          const cv = f.cv;
          if (cv && cv.txt && cv.op > 0.05 && cv.vis !== 'hidden') {
            const ov = Math.min(d.y + d.h, cv.y + cv.h) - Math.max(d.y, cv.y);
            if (ov > 0) { coexist += (prevT == null ? STEP : f.t - prevT); }
          }
        }
        if (f.delta.length) prevT = f.t;
      }
      if (!ds.length) { console.log('  ⚠ 델타 표본 0'); }
      else {
        const top = Math.min(...ds.map(d => d.top)), bot = Math.max(...ds.map(d => d.bot));
        console.log(`  델타 «상자» 카드기준 y ${num(top, 0)}~${num(bot, 0)} (verify93 [7] 회랑 265~400) · 글자높이 ${num(ds[0].h, 0)}`);
        console.log(`  델타 x 카드기준 ${num(Math.min(...ds.map(d => d.x0)), 0)}~${num(Math.max(...ds.map(d => d.x1)), 0)}`);
        const cvL = r.labels.find(l => l.cls.includes('cv'));
        if (cvL) {
          const cvT = cvL.y - C.y, cvB = cvL.y + cvL.h - C.y;
          const ovs = ds.map(d => Math.max(0, Math.min(d.bot, cvB) - Math.max(d.top, cvT)) / d.h * 100);
          console.log(`  .cv 와 세로 겹침 최대 ${num(Math.max(...ovs))}% · 평균 ${num(ovs.reduce((a, x) => a + x, 0) / ovs.length)}%`);
          const gap = Math.max(0, Math.max(cvL.x - C.x, Math.min(...ds.map(d => d.x0))) - Math.min(cvL.x + cvL.w - C.x, Math.max(...ds.map(d => d.x1))));
          console.log(`  .cv 와 가로 간격 ${num(gap, 0)}px (상자 기준)`);
        }
        console.log(`  «두 수치 공존»(.cv 에 글자가 있는 채 세로 겹침) ${coexist}ms`);
      }
    }

    if (scene === 'gain' || scene === 'quest') {
      const P = r.pill;
      const ws = [], path = [];
      for (const f of r.frames) {
        for (const g of f.fly) ws.push(g.w);
        if (f.fly.length) {
          const g = f.fly[0];
          path.push({ t: f.t, x: g.x, y: g.y, d: P ? Math.hypot(P.x + P.w / 2 - g.x, P.y + P.h / 2 - g.y) : 0 });
        }
      }
      if (!ws.length) { console.log('  ⚠ 비행 표본 0'); }
      else {
        const mx = Math.max(...ws), mn = Math.min(...ws);
        const med = ws.slice().sort((a, x) => a - x)[Math.floor(ws.length / 2)];
        console.log(`  비행 아이콘 실폭(rect) 최소 ${num(mn)} · 중앙 ${num(med)} · 최대 ${num(mx)}px  [n=${ws.length}]`);
      }
      /* 종단 — «선두» 를 DOM 순서로 잡으면 아이콘이 지워질 때마다 대상이 바뀐다(32회차 함정의 판박이).
         프레임마다 «알약까지 최소 잔여거리» 하나만 쓴다 — 이 값은 대상이 바뀌어도 단조에 가깝다. */
      const lead = [];
      for (const f of r.frames) {
        if (!f.fly.length || !P) continue;
        lead.push({ t: f.t, d: Math.min(...f.fly.map(g => Math.hypot(P.x + P.w / 2 - g.x, P.y + P.h / 2 - g.y))) });
      }
      if (lead.length > 4) {
        const d0 = lead[0].d, tA = lead[0].t, tB = lead[lead.length - 1].t;
        const thr = d0 * 0.40;
        const hit = lead.find(q => q.d <= thr);
        if (hit) console.log(`  선두 잔여 40%(d≤${num(thr, 0)}) 진입 t${hit.t}ms · 마지막 표본 t${tB}ms → 마지막 40% 거리를 ${num((tB - hit.t) / (tB - tA) * 100)}% 의 시간에`);
        console.log(`  선두 최소 잔여거리 ${num(Math.min(...lead.map(q => q.d)), 0)}px · 마지막 표본 잔여 ${num(lead[lead.length - 1].d, 0)}px`);
        /* 실제 렌더 리듬(≈40ms)에서 «한 프레임에 빠지는 거리» — 9·10·11회차가 UI 발에서 잡은 그 양 */
        let jump = 0;
        for (let i = 0; i < lead.length; i++) {
          const j = lead.findIndex(q => q.t >= lead[i].t + 40);
          if (j > i) jump = Math.max(jump, lead[i].d - lead[j].d);
        }
        console.log(`  경로 전체 프레임 도약(40ms 창 최대) ${num(jump, 0)}px`);
        /* 공통1 이 말하는 것은 «마지막 구간» 이다 — 잔여 30% 안에서만 다시 잰다 */
        let tj = 0;
        const thr3 = d0 * 0.30 + Math.min(...lead.map(q => q.d));
        for (let i = 0; i < lead.length; i++) {
          if (lead[i].d > thr3) continue;
          const j = lead.findIndex(q => q.t >= lead[i].t + 40);
          if (j > i) tj = Math.max(tj, lead[i].d - lead[j].d);
        }
        console.log(`  ⚑ 종단(잔여 30% 이내) 프레임 도약 최대 ${num(tj, 0)}px`);
      }
    }

    if (scene === 'quest') {
      /* 머묾 구간의 최근접 중심거리 — 33회차가 «19.6px 까지 내려간다» 로 남긴 것 */
      let worst = { d: 1e9, t: -1 };
      const per = [];
      for (const f of r.frames) {
        if (f.fly.length < 2) continue;
        let m = 1e9;
        for (let i = 0; i < f.fly.length; i++) for (let j = i + 1; j < f.fly.length; j++) {
          const d = Math.hypot(f.fly[i].x - f.fly[j].x, f.fly[i].y - f.fly[j].y);
          if (d < m) m = d;
        }
        per.push({ t: f.t, m, n: f.fly.length });
        if (m < worst.d) worst = { d: m, t: f.t };
      }
      /* 머묾은 «퍼짐 끝(FX3_SPREAD 220ms) ~ 흡수 시작(+FX3_HOLD_F 120ms)» = 220~340ms 다.
         33회차가 «19.6px» 을 낸 창을 그대로 쓰지 않고 선언 상수에서 뽑는다. */
      const hold = per.filter(q => q.t >= 225 && q.t <= 340);
      console.log('  머묾 창 표본: ' + hold.map(q => `t${q.t}:${q.m.toFixed(1)}`).join(' '));
      if (hold.length) {
        const hm = Math.min(...hold.map(q => q.m));
        console.log(`  머묾(180~620ms) 최근접 중심거리 최소 ${num(hm)}px · 평균 ${num(hold.reduce((a, q) => a + q.m, 0) / hold.length)}px  (FX3_MIND 37)`);
      }
      console.log(`  전 구간 최근접 최소 ${num(worst.d)}px @ t${worst.t}ms`);
    }

    console.log(`  콘솔 에러 ${errs.length}건`);
    await b.close();
  }
})();
