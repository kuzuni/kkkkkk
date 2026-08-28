/* 작업 58 — 41회차(5차 폴리시 라운드 개시) 프로브.
   40회차가 «정답표에는 있는데 화면에 없는» 프레임 표를 2인 공통으로 냈다:
     노드가 DOM 에 살아 있는데 그림에는 없다 = **DOM 수명 > 가시 수명**.
   40차는 그 원인을 «퇴장이 페이드가 아니라 투명한 채 기다리기» 로 추정만 했다.
   이 프로브는 그것을 **수치로** 센다 — 연출 노드마다
     ① DOM 수명(appendChild → 제거)  ② 가시 수명(불투명도 ≥ VIS 인 표본의 처음~끝)
     ③ 앞꼬리(태어나서 처음 보일 때까지)  ④ 뒷꼬리(마지막으로 보인 뒤 제거될 때까지)
   를 재고 클래스별로 집계한다. ③④ 가 «안 보이는데 표에는 있는» 구간이다.

   ⚠ 얼리지 않는다(cap58b 와 다르다). 이 프로브가 재는 것은 «시간에 따른 불투명도» 라
     시간을 세우면 잴 것이 없어진다. 대신 rAF 마다 표본을 뜨고 MutationObserver 대신
     레이어의 appendChild 만 감싼다(cap58b 와 같은 이유 — 전역 관찰자는 타이밍을 흔든다).

   실행: node tools/p58au.js [씬목록] [--json]
         node tools/p58au.js gain,quest,upg                 (기본값) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const WANT = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'gain,quest,upg')
  .split(',').map(s => s.trim()).filter(Boolean);
const JSONOUT = process.argv.includes('--json');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const VIS = 0.06;                                    /* 이 아래는 «안 보인다» 로 센다(8비트로 1~2 계조) */
const RUN = { gain: 1600, quest: 2600, upg: 1600 };  /* 씬별 관측 길이(ms) */

const TRIGGERS = {
  gain: () => {
    const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
    const p = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
    fxAt(p, 'combat');
    S.gold += 128000;
  },
  quest: () => { const b = document.getElementById('qAll'); if (b) b.click(); },
  upg: () => {
    const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
    if (!c) return;
    c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  },
};

async function setupScene(p, scene) {
  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.__step = window.step, window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true;
    if (typeof renderUI === 'function') renderUI();
  }, scene);

  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(400); }
  else if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(400); }
  else {
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 })
      .catch(() => {});
  }
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => {
      const g = document.getElementById('goldN'), d = document.getElementById('diaN');
      return (g ? g.textContent.trim() : '') + '|' + (d ? d.textContent.trim() : '')
        + '|' + document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length;
    });
    if (st === prev && st.endsWith('|0')) break;
    prev = st;
    await p.waitForTimeout(80);
  }
}

async function run(scene) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
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
  }, 20260828);
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await setupScene(p, scene);

  const out = await p.evaluate(async ({ trg, ms, VIS }) => {
    /* 레이어의 appendChild 를 감싸 «태어난 시각» 을 찍는다(cap58b 와 같은 방식). */
    const nodes = [];
    for (const id of ['fxl', 'fxlc']) {
      const L = document.getElementById(id);
      if (!L) continue;
      const _ac = L.appendChild.bind(L);
      L.appendChild = (n) => {
        const r = _ac(n);
        try {
          if (n && n.nodeType === 1) nodes.push({ el: n, cls: (n.className || n.tagName || '?') + '', born: performance.now(), samples: [] });
        } catch (e) {}
        return r;
      };
    }
    // eslint-disable-next-line no-new-func
    const fire = new Function('return (' + trg + ')')();
    const t0 = performance.now();
    fire();
    await new Promise((res) => {
      const step = () => {
        const now = performance.now();
        for (const rec of nodes) {
          if (rec.gone != null) continue;
          if (!rec.el.isConnected) { rec.gone = now; continue; }
          let op = 0, w = 0, h = 0;
          try {
            const cs = getComputedStyle(rec.el);
            op = parseFloat(cs.opacity);
            if (cs.visibility === 'hidden' || cs.display === 'none') op = 0;
            const r = rec.el.getBoundingClientRect();
            w = r.width; h = r.height;
            /* 화면 밖으로 나간 것도 «안 보인다» 다. */
            if (r.right <= 0 || r.bottom <= 0 || r.left >= 1080 || r.top >= 2280) op = 0;
          } catch (e) { op = 0; }
          rec.samples.push({ t: now, op, w, h, x: (rec.el.getBoundingClientRect().left), y: (rec.el.getBoundingClientRect().top) });
        }
        if (now - t0 >= ms) return res();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const end = performance.now();
    /* 40차 2인 공통ㅈ «버스트 반경 확장 0%» 를 재는 자 — 보이는 `.fx-spark` 들의 합집합 bbox 를
       시간축으로 낸다. 두 비평가가 «링 bbox» 로 쟀으므로 같은 양을 쓴다. */
    const ring = [];
    {
      const sp = nodes.filter(n => /fx-spark/.test(n.cls));
      const ts = new Set();
      sp.forEach(n => n.samples.forEach(s2 => ts.add(Math.round(s2.t - t0))));
      for (const t of [...ts].sort((a2, b3) => a2 - b3)) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, k = 0;
        for (const n of sp) {
          const s2 = n.samples.find(z => Math.round(z.t - t0) === t);
          if (!s2 || s2.op < VIS) continue;
          k++; x0 = Math.min(x0, s2.x); y0 = Math.min(y0, s2.y);
          x1 = Math.max(x1, s2.x + s2.w); y1 = Math.max(y1, s2.y + s2.h);
        }
        if (k) ring.push({ t, n: k, w: Math.round(x1 - x0), h: Math.round(y1 - y0) });
      }
    }
    window.__ring = ring;
    return nodes.map((rec) => {
      const gone = rec.gone != null ? rec.gone : end;
      const vis = rec.samples.filter(s => s.op >= VIS);
      const first = vis.length ? vis[0].t : null, last = vis.length ? vis[vis.length - 1].t : null;
      return {
        cls: rec.cls,
        born: Math.round(rec.born - t0),
        dom: Math.round(gone - rec.born),
        removed: rec.gone != null,
        visLife: vis.length ? Math.round(last - first) : 0,
        head: vis.length ? Math.round(first - rec.born) : Math.round(gone - rec.born),
        tail: vis.length ? Math.round(gone - last) : 0,
        n: rec.samples.length,
      };
    });
  }, { trg: TRIGGERS[scene].toString(), ms: RUN[scene] || 1600, VIS });

  const ring = await p.evaluate(() => window.__ring || []);
  await b.close();
  return { scene, errs, out, ring };
}

(async () => {
  const all = {};
  for (const sc of WANT) {
    const r = await run(sc);
    all[sc] = r;
    const byCls = {};
    for (const n of r.out) {
      const k = n.cls.split(' ')[0];
      (byCls[k] = byCls[k] || []).push(n);
    }
    console.log('\n=== 씬 ' + sc + ' — 노드 ' + r.out.length + '개 · 콘솔에러 ' + r.errs.length);
    console.log('| 클래스 | 개수 | DOM수명 중앙 | 가시수명 중앙 | 앞꼬리(안보임) 중앙/최대 | 뒷꼬리(안보임) 중앙/최대 | 안보임 비율 |');
    console.log('|---|---|---|---|---|---|---|');
    const med = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    for (const k of Object.keys(byCls).sort()) {
      const g = byCls[k];
      const dom = g.map(x => x.dom), vl = g.map(x => x.visLife);
      const hd = g.map(x => x.head), tl = g.map(x => x.tail);
      const dark = g.map(x => (x.dom ? Math.round(100 * (x.head + x.tail) / x.dom) : 0));
      console.log('| `' + k + '` | ' + g.length + ' | ' + med(dom) + ' | ' + med(vl)
        + ' | ' + med(hd) + ' / ' + Math.max(...hd)
        + ' | ' + med(tl) + ' / ' + Math.max(...tl)
        + ' | ' + med(dark) + '% |');
    }
    if (r.ring && r.ring.length) {
      const f = r.ring[0], mx = r.ring.reduce((a5, b5) => (b5.w * b5.h > a5.w * a5.h ? b5 : a5), r.ring[0]);
      const lg = r.ring[r.ring.length - 1];
      console.log('버스트 링 bbox — t' + f.t + ' ' + f.w + '×' + f.h + '(' + f.n + '개)'
        + ' → 최대 t' + mx.t + ' ' + mx.w + '×' + mx.h + '(' + mx.n + '개)'
        + ' → 마지막 t' + lg.t + ' ' + lg.w + '×' + lg.h + '(' + lg.n + '개)'
        + ' · 확장 ' + (f.w ? (100 * (mx.w / f.w - 1)).toFixed(1) : '?') + '% × '
        + (f.h ? (100 * (mx.h / f.h - 1)).toFixed(1) : '?') + '%');
    }
    if (r.errs.length) console.log('⚠ 콘솔 에러: ' + r.errs.slice(0, 3).join(' / '));
  }
  if (JSONOUT) console.log('\nJSON ' + JSON.stringify(all));
})().catch((e) => { console.error(e); process.exit(1); });
