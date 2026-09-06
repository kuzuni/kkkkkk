/* 작업 994 — **`probe683d` [5-a] 의 재현되는 잔여(T=0ms · 정착 +5%p)를 성분으로 가르는 자.**
 *
 *   node tools/probe994.js
 *
 * ── 무엇을 묻는가 ─────────────────────────────────────────────────────────
 * 992 가 `probe683d` 의 흔들림(±4%p)을 씨앗으로 죽이고 **수리 전 트리와 대조**한 뒤 남긴 문장이
 * 이 자의 물음이다(992 §4 · PROGRESS 994 등재문):
 *
 *   「HEAD 의 [5-a] 빨강은 **T=0ms 한 프레임**(씨앗 폭 **0%p** · 28% ↔ 정착 23%)이 혼자 만든다
 *    = 동전 던지기가 아니라 **재현되는 잔여**이고, 그 임자는 683(제품)이다.」
 *
 * 그래서 이 자는 문턱을 건드리지 않고 **누가 그 5%p 를 만드는가**를 성분으로 묻는다:
 *   [2] 성분 — 알을 숨기면? 어두운 테만 걷으면? 글로우만 걷으면? 알을 투명하게만 하면?
 *       (`opacity:0` = «자리는 그대로, 그림만 없음» 이라 «알이 있어서 나쁜가» 를 한 항으로 가른다)
 *   [3] 시간 축 — 겹침이 언제 사라지는가(T0·8·16·24·40·80). 제품 수리는 그 창 안에서만 산다.
 *   [4] 되돌림 시험 — 14회차 키프레임(태생 α .55)을 주입한 사본이 다시 28% 로 무너지는가.
 *   [5] 753 보존 — 알은 여전히 **1개**이고 상자가 아이콘과 같은 자리·같은 크기인가(태생 프레임).
 *
 * ⚑⚑ **994 가 낸 답** — 임자는 «어두운 테» 도 «글로우» 도 아니라 **흰 채움**이다.
 *   테를 투명으로 해도 28% · 글로우를 빼도 28% · **알을 `opacity:0` 으로 하면 23% = 정착**.
 *   떨어진 화소 8/157 은 전부 라벨 잉크 윗행(y1024~1033)이고 그 국소 배경이 **0.028 → 0.22**
 *   (선형)로 씻긴다. 알은 753 대로 아이콘과 **같은 글리프·크기·자리**에서 태어나므로 t=0 에는
 *   상자(158)가 카드(151)를 덮고 아래변 1044.8 이 라벨 잉크 윗변(1024)을 밟는다.
 *   겹침은 ease-out 이 알을 밀어내며 **24ms 안에** 사라진다(T24~T80 = 정착).
 *   ⇒ 처방은 753 9회차와 **같은 손잡이(알파)를 그 창에만** 거는 것이다: 태생 `.10` → `10%`(38ms) `.55`.
 *     봉우리 .55(9회차 2인 독립 일치)·35%(.45)·100%(0)·**transform 전 구간**은 한 값도 안 바뀐다.
 *
 * ⚠ 자의 규약은 `probe683d` 것을 그대로 쓴다 — 같은 것을 재려면 같은 자리를 얼려야 한다:
 *   ① 부팅 시점 씨앗 난수기(992) ② 정착에서 **한 번만** 뜬 고정 잉크 마스크(10회차 생존자 편향 규약)
 *   ③ 문턱이 눈금 폭과 같은 자리는 **씨앗 3판의 중앙값**(58 규약).
 *
 * 종료 코드: 0 통과 · 1 FAIL (환경 없음은 `pwlaunch` 가 코드 2 로 낸다)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ID = 'rl0';
const TOL = 0.03;                       /* 눈금 폭 = `probe683d` [4]·[5] 와 같은 3%p (넓히지 않았다) */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; } };
const r2 = v => (v == null ? '—' : Math.round(v * 100) / 100);
const pc = v => (v == null ? '—' : Math.round(v * 100) + '%');

/* 992 — 부팅 시점에 심는 씨앗 난수기(mulberry32). `__p4seed(n)` 으로 스트림을 되감는다. */
const SEEDER = () => {
  let s = 1;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__p4seed = n => { s = ((n >>> 0) || 1); };
};

/* 사본 — 제품은 한 줄도 안 건드리고 **주입 CSS 한 장**으로 만든다(`probe683e` 와 같은 규약). */
const RIM0 = '.fx-spark.fx-rlic{filter:brightness(0) invert(1) drop-shadow(0 0 6px var(--c,#FFE07A)) !important}';
const GLOW0 = '.fx-spark.fx-rlic{filter:brightness(0) invert(1)'
  + ' drop-shadow(0 2px 0 #140D04) drop-shadow(0 -2px 0 #140D04)'
  + ' drop-shadow(2px 0 0 #140D04) drop-shadow(-2px 0 0 #140D04)'
  + ' drop-shadow(1.4px 1.4px 0 #140D04) drop-shadow(-1.4px -1.4px 0 #140D04)'
  + ' drop-shadow(1.4px -1.4px 0 #140D04) drop-shadow(-1.4px 1.4px 0 #140D04) !important}';
const CLEAR = '.fx-spark.fx-rlic{opacity:0 !important}';
/* ↩ 14회차 상태(태생 α .55 · 램프 없음) — [4] 되돌림 시험이 쓰는 사본 */
const R14 = '@keyframes fxRlic{0%{transform:translate(0,0) scale(1);opacity:.55}'
  + '35%{transform:translate(calc(var(--dx)*.55),calc(var(--dy)*.55)) scale(.72);opacity:.45}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.45);opacity:0}}';

const SHOT = async ({ T, NOGAIN, RID, BLANK, SEED, CSS }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__p9to) { window.__p9to = window.setTimeout; window.__p9ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  const st = document.getElementById('__p9nogain'); if (st) st.remove();
  if (NOGAIN) { const t = document.createElement('style'); t.id = '__p9nogain';
    t.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(t); }
  const c0 = document.getElementById('__p9css'); if (c0) c0.remove();
  if (CSS) { const t = document.createElement('style'); t.id = '__p9css'; t.textContent = CSS; document.head.appendChild(t); }
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  if (window.__p9seed) window.__p9seed(SEED == null ? 1 : SEED);
  if (T >= 0) rwSummonFx(it, true, null);
  try { document.getAnimations().forEach(a => {
    const tg = a.effect && a.effect.target;
    if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
    else { a.pause(); try { a.finish(); } catch (_) {} }
  }); } catch (e) {}
  const el = document.querySelector('[data-rw="' + RID + '"]');
  const u = el.querySelector('u'), b = u.getBoundingClientRect(), c = el.getBoundingClientRect();
  if (BLANK) { window.__p9lab = u.textContent; u.textContent = ''; }
  /* 753 보존 항([5])이 볼 것 — 알의 수·상자·불투명도, 그리고 아이콘 글리프의 상자 */
  let egg = null, n = 0;
  if (L) { for (const nd of L.children) if (/fx-rlic/.test(nd.className + '')) n++;
    const e = L.querySelector('.fx-spark.fx-rlic');
    if (e) { const q = e.getBoundingClientRect(), g = getComputedStyle(e);
      egg = { x: +q.x.toFixed(1), y: +q.y.toFixed(1), w: +q.width.toFixed(1), h: +q.height.toFixed(1),
              op: +g.opacity, fs: parseFloat(g.fontSize), tr: g.transform }; } }
  const ic = el.querySelector('i'), ics = ic ? getComputedStyle(ic) : null;
  return { lab: u.textContent, egg, n,
    icon: ic ? { fs: parseFloat(ics.fontSize), lh: parseFloat(ics.lineHeight) } : null,
    box: { x: Math.round(Math.max(b.x, c.x)), y: Math.round(b.y),
           w: Math.round(Math.min(b.x + b.width, c.x + c.width) - Math.max(b.x, c.x)), h: Math.round(b.height) },
    card: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } };
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.addInitScript(SEEDER);                    /* ⚠ `goto` **앞에** — 설정 루프까지 결정적이어야 한다(992) */
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RID => { for (let i = 0; i < 4000 && !has(RID); i++) summonRelic(true); renderRelw();
    return has(RID) ? oLv(RID) : null; }, ID);

  const shot = async o => {
    const st = await ev(p, SHOT, Object.assign({ RID: ID, T: 0 }, o));
    if (!st) return null;
    const png = (await p.screenshot()).toString('base64');
    if (o.BLANK) await ev(p, RID => { const el = document.querySelector('[data-rw="' + RID + '"]');
      const u = el && el.querySelector('u'); if (u && window.__p9lab != null) { u.textContent = window.__p9lab; window.__p9lab = null; } }, ID);
    return { st, png };
  };

  /* 구역별 CL 축(획 ↔ 국소 배경 3~4px 중앙값) — `probe683c`·`probe683d` 와 **같은 산수**다. */
  const CL = async (aPng, zPng, box, cut, mask) => ev(p, async ({ a, z, bx, ct, mk }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A = await px(a), Z = await px(z);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = d => (i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A), lz = lum(Z);
    let ink, fill;
    if (mk && mk.ink && mk.ink.length) { ink = mk.ink; fill = mk.fill; }
    else {
      ink = [];
      for (let i = 0; i < A.length; i += 4) if (Math.abs(la(i) - lz(i)) >= 24) ink.push(i);
      if (ink.length < 120) return { ink: ink.length };
      const iv = ink.map(la).sort((x, y) => x - y);
      const hiT = iv[Math.floor(iv.length * 0.75)];
      fill = ink.filter(i => la(i) >= hiT);
    }
    const isInk = new Uint8Array(bx.w * bx.h);
    for (const i of ink) isInk[i / 4] = 1;
    const rowY = i => bx.y + (((i / 4) / bx.w) | 0);
    const rows = [];
    const bgOf = (d, keepPx, tag) => {
      const rr = rl(d), out = [];
      for (const i of fill) { if (!keepPx(i)) continue;
        const q = i / 4, x = q % bx.w, y = (q / bx.w) | 0; const cand = [];
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const m = Math.abs(dx) + Math.abs(dy); if (m < 3 || m > 4) continue;
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bx.w || ny >= bx.h) continue;
          const j = (ny * bx.w + nx); if (isInk[j]) continue; cand.push(rr(j * 4));
        }
        if (!cand.length) continue;
        cand.sort((u, v) => u - v);
        const bg = cand[cand.length >> 1], fg = rr(i);
        const hi = Math.max(bg, fg), lo = Math.min(bg, fg);
        const cr = (hi + 0.05) / (lo + 0.05);
        out.push(cr);
        if (tag) rows.push({ x: bx.x + x, y: bx.y + y, cr, bg });
      }
      out.sort((u, v) => u - v);
      return out.length ? { n: out.length, med: out[out.length >> 1],
                            under45: out.filter(v => v < 4.5).length / out.length } : null;
    };
    return { ink: ink.length, nf: fill.length,
             inC: bgOf(A, i => rowY(i) < ct, true), outC: bgOf(A, i => rowY(i) >= ct),
             rows, mask: mk ? null : { ink, fill } };
  }, { a: aPng, z: zPng, bx: box, ct: cut, mk: mask || null });

  const settled = await shot({ T: -1, NOGAIN: true });
  const blank = await shot({ T: -1, NOGAIN: true, BLANK: true });
  if (!settled || !blank) { console.log('\n캡처 실패 — 중단'); await browser.close(); process.exit(1); }
  const BOX = settled.st.box, CARD = settled.st.card, CUT = CARD.y + CARD.h;
  const base = await CL(settled.png, blank.png, BOX, CUT);
  const MK = base && base.mask;
  const inS = base && base.inC ? base.inC.under45 : null;
  const outS = base && base.outC ? base.outC.under45 : null;

  const grab = async o => { const s = await shot(o); return s ? await CL(s.png, blank.png, BOX, CUT, MK) : null; };
  const SEEDS = [1, 2, 3];
  const mid = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  const grabM = async o => {                        /* 992 §3-2 — 문턱이 눈금 폭과 같은 자리는 세 판의 중앙값 */
    const rs = [];
    for (const s of SEEDS) rs.push(await grab(Object.assign({}, o, { SEED: s })));
    const gs = rs.filter(Boolean); if (!gs.length) return null;
    const z = k => { const q = gs.map(r => r[k]).filter(Boolean);
      return q.length ? { n: q[0].n, med: mid(q.map(v => v.med)), under45: mid(q.map(v => v.under45)) } : null; };
    const sp = gs.map(r => r.inC && r.inC.under45).filter(x => x != null);
    return { inC: z('inC'), outC: z('outC'), one: gs[0],
             spread: sp.length ? Math.max.apply(null, sp) - Math.min.apply(null, sp) : null };
  };

  /* ── [1] 기하 — 알이 정말 라벨 잉크를 덮는가(태생 프레임) ── */
  blk('1] 기하 — 태생 프레임의 알 상자 ↔ 카드 ↔ 라벨');
  const live = await shot({ T: 0 });
  const E = live && live.st.egg;
  info('카드 상자', JSON.stringify(CARD) + ' → 하변 y=' + CUT);
  info('라벨 상자(카드 폭으로 좁힘)', JSON.stringify(BOX) + ' → 상변 y=' + BOX.y);
  info('알 상자(T=0)', E ? JSON.stringify(E) : '없음');
  info('정착 기준선', base && base.inC ? ('안 ' + pc(inS) + ' (n' + base.inC.n + ') · med ' + r2(base.inC.med)
    + ' · 밖 ' + pc(outS)) : '측정 실패');
  ok(!!E && E.y + E.h > BOX.y,
     '1-a 태생 프레임의 알 상자가 **라벨 상자 윗변을 넘어선다** — 753 «크기 = 아이콘 동일» 의 구조적 귀결이다',
     E ? ('알 하변 ' + (E.y + E.h).toFixed(1) + ' ↔ 라벨 상변 ' + BOX.y) : '측정 실패');
  ok(!!E && E.h > CARD.h,
     '1-b 그 상자는 **카드보다 크다**(글리프 advance 가 칸을 넘는다) — 그래서 아래로도 넘친다',
     E ? ('알 ' + E.h + ' ↔ 카드 ' + CARD.h) : '측정 실패');

  /* ── [2] 성분 — 5%p 를 만드는 것은 테인가 글로우인가 채움인가 ──
     ⚠ **성분은 «수리 전»(14회차 키프레임 사본) 위에서 가른다.** 수리 후 트리에서 재면 남은 폭이
       1%p 라 어느 성분을 걷어도 눈금 안에서 같아 보인다 — 진단이 «고쳐 놓고 나서» 흐려지는 것은
       338·654 가 여러 번 겪은 자리다(자는 수리와 무관한 축을 잡아야 한다). */
  blk('2] 성분 — T=0ms 잔여의 임자 (수리 전 사본 위에서 · 씨앗 3판 중앙값)');
  const cur0 = await grabM({ T: 0 });
  const b14 = await grabM({ T: 0, CSS: R14 });
  const nog0 = await grabM({ T: 0, CSS: R14, NOGAIN: true });
  const rim0 = await grabM({ T: 0, CSS: R14 + RIM0 });
  const glw0 = await grabM({ T: 0, CSS: R14 + GLOW0 });
  const clr0 = await grabM({ T: 0, CSS: R14 + CLEAR });
  const U = r => (r && r.inC ? r.inC.under45 : null);
  info('수리 전(14회차 · 태생 α .55)', pc(U(b14)) + '  ↔ 수리 후 ' + pc(U(cur0)) + ' ↔ 정착 ' + pc(inS));
  info('수리 전 + 알 숨김(display:none)', pc(U(nog0)));
  info('수리 전 + 어두운 테 0(테를 투명으로)', pc(U(rim0)));
  info('수리 전 + 글로우만 뺌', pc(U(glw0)));
  info('수리 전 + 알 투명(opacity:0 — 자리는 그대로)', pc(U(clr0)));
  ok(U(b14) != null && inS != null && U(b14) >= inS + 0.04,
     '2-a **재현 — 수리 전 태생 프레임은 정착보다 4%p 이상 나쁘다**(992 §4 가 «683 의 몫» 으로 넘긴 그 잔여)',
     '수리 전 ' + pc(U(b14)) + ' ↔ 정착 ' + pc(inS));
  ok(U(clr0) != null && inS != null && Math.abs(U(clr0) - inS) <= TOL,
     '2-b **알을 투명하게 하면 정착이다** — 이 프레임에서 라벨을 씻는 것은 «알이 그리는 그림» 하나다',
     '투명 ' + pc(U(clr0)) + ' ↔ 정착 ' + pc(inS));
  ok(U(rim0) != null && U(b14) != null && Math.abs(U(rim0) - U(b14)) <= TOL,
     '2-c **어두운 테는 임자가 아니다** — 테를 통째로 투명으로 해도 수리 전 값 그대로다(14회차 극성의 «테» 쪽 무혐의)',
     '테 0 ' + pc(U(rim0)) + ' ↔ 수리 전 ' + pc(U(b14)));
  ok(U(glw0) != null && U(b14) != null && Math.abs(U(glw0) - U(b14)) <= TOL,
     '2-d **글로우도 임자가 아니다** — 6px 글로우를 빼도 수리 전 값 그대로다 ⇒ 남는 것은 **흰 채움**뿐이다',
     '글로우 뺌 ' + pc(U(glw0)) + ' ↔ 수리 전 ' + pc(U(b14)));
  ok(U(nog0) != null && U(clr0) != null && Math.abs(U(nog0) - U(clr0)) <= TOL,
     '2-e 자기검산 — «숨김»(레이아웃에서 뺌)과 «투명»(자리는 둠)이 **같은 그림**이다(알은 자리로 남의 그림을 안 바꾼다)',
     '숨김 ' + pc(U(nog0)) + ' ↔ 투명 ' + pc(U(clr0)));

  /* ── [3] 시간 축 — 겹침 창과 수리의 사거리 ── */
  blk('3] 시간 축 — 전 프레임이 정착에 닿는다(`probe683d` [5-a] 와 같은 문턱 +3%p)');
  const TT = [0, 8, 16, 24, 40, 80];
  const row = [];
  for (const T of TT) { const r = await grabM({ T });
    row.push({ T, u: U(r), out: r && r.outC ? r.outC.under45 : null, sp: r ? r.spread : null });
    info('T=' + String(T).padStart(2) + 'ms 카드 «안» <4.5',
         pc(row[row.length - 1].u) + ' ↔ 정착 ' + pc(inS) + '  (씨앗 3판 폭 ' + pc(row[row.length - 1].sp) + ')'); }
  ok(inS != null && row.every(r => r.u != null && r.u <= inS + TOL),
     '3-a **회수 — 태생 프레임까지 정착에 닿는다**(여섯 프레임 전부 정착 +3%p 안). '
     + '992 가 «683 의 몫» 으로 넘긴 T=0 의 +5%p 가 이 행 안에서 닫혔다',
     row.map(r => r.T + 'ms ' + pc(r.u)).join(' · ') + ' ↔ 정착 ' + pc(inS));
  ok(outS != null && row.every(r => r.out != null && Math.abs(r.out - outS) <= 0.08),
     '3-b **대가 0** — 카드 «밖» 구역(하변 아래)은 이 변경으로도 안 나빠진다',
     row.map(r => r.T + 'ms ' + pc(r.out)).join(' · ') + ' ↔ 정착 밖 ' + pc(outS));

  /* ── [4] 되돌림 시험 — «언제나 초록인 자» 가 아니다 ── */
  blk('4] 되돌림 시험 — 14회차 키프레임(태생 α .55)을 되돌린 사본');
  const rev0 = await grabM({ T: 0, CSS: R14 });
  const rev8 = await grabM({ T: 8, CSS: R14 });
  info('되돌림 T=0ms', pc(U(rev0)) + ' ↔ 현행 ' + pc(row[0].u) + ' ↔ 정착 ' + pc(inS));
  info('되돌림 T=8ms', pc(U(rev8)) + ' ↔ 현행 ' + pc(row[1].u));
  ok(U(rev0) != null && inS != null && U(rev0) > inS + TOL,
     '4-a 되돌린 사본은 **다시 문턱 밖이다** — 이 자는 제품을 되돌리면 빨개진다',
     '되돌림 ' + pc(U(rev0)) + ' ↔ 문턱 ' + pc(inS + TOL));
  ok(U(rev0) != null && row[0].u != null && U(rev0) >= row[0].u + 0.03,
     '4-b 수리량이 눈금 폭 이상이다 — 태생 프레임에서 3%p 이상 회수한다',
     '되돌림 ' + pc(U(rev0)) + ' → 현행 ' + pc(row[0].u));

  /* ── [5] 753 보존 — 바뀐 것은 «첫 두 프레임의 세기» 뿐이다 ── */
  blk('5] 753 보존 — 개수 · 상자 · 봉우리 α · transform');
  const s0 = live && live.st, s40 = (await shot({ T: 40 })), s133 = (await shot({ T: 133 }));
  const E40 = s40 && s40.st.egg, E133 = s133 && s133.st.egg;
  const rv40 = (await shot({ T: 40, CSS: R14 })), RV40 = rv40 && rv40.st.egg;
  info('알 개수(태생)', s0 ? String(s0.n) : '—');
  info('아이콘 글리프', s0 && s0.icon ? ('font-size ' + s0.icon.fs + ' · line-height ' + s0.icon.lh) : '—');
  info('알 α — T0 / T40 / T133(35%)', [E, E40, E133].map(e => (e ? e.op : '—')).join(' / '));
  /* ⚠ **행렬을 통째로 견주면 안 된다** — 이동 성분은 `rwGainW`(황금비 위상, index.html 36589)가
     버스트마다 도는 값이라 **두 번째 스폰은 각도가 다르다**(씨앗을 심어도 이 위상은 전역 누적이다 ·
     992 §2 가 `rwFxW` 에서 같은 것을 짚었다). 축소 곡선은 그 위상과 무관하므로 **배율만** 견준다. */
  const scOf = t => { const m = /matrix\(([-0-9.]+)/.exec(t || ''); return m ? +(+m[1]).toFixed(6) : null; };
  info('transform — 현행 T40 ↔ 되돌림 T40', (E40 ? E40.tr : '—') + '  ↔  ' + (RV40 ? RV40.tr : '—'));
  ok(s0 && s0.n === 1, '5-a 753 ③ — 획득 1회당 알은 여전히 **정확히 1개**다', s0 ? (s0.n + '개') : '측정 실패');
  ok(!!E && !!s0 && s0.icon && Math.abs(E.w - Math.round(s0.icon.fs * 1.25)) <= 1 && Math.abs(E.w - E.h) <= 1,
     '5-b 753 ② — 상자는 여전히 «아이콘 font-size × RW_GAIN_BOX» 정사각이다(크기·자리 규약 Δ0)',
     E ? (E.w + '×' + E.h + ' ↔ 아이콘 fs ' + s0.icon.fs + ' × 1.25 = ' + Math.round(s0.icon.fs * 1.25)) : '측정 실패');
  ok(!!E && E.op > 0, '5-c 알은 태생 프레임에도 **있다** — «첫 프레임을 지운» 것이 아니라 세기를 겹침 창에 맞춘 것이다',
     E ? ('α ' + E.op) : '측정 실패');
  ok(!!E40 && !!RV40 && scOf(E40.tr) != null && scOf(E40.tr) === scOf(RV40.tr),
     '5-d ★ **축소 곡선은 한 값도 안 바뀌었다** — 되돌린 사본과 T=40ms 의 배율이 소수 여섯째 자리까지 같다 '
     + '(새 키프레임이 `opacity` 만 적으므로 transform 의 구간은 여전히 0%→35%→100% 다)',
     E40 ? (scOf(E40.tr) + ' ↔ ' + scOf(RV40.tr)) : '측정 실패');
  ok(!!E133 && Math.abs(E133.op - 0.45) <= 0.01,
     '5-e 35% 지점(133ms)의 α 는 종전 값 그대로다(.45) — 램프는 **태생 창** 밖으로 안 샌다',
     E133 ? String(E133.op) : '측정 실패');
  ok(!!E40 && E40.op >= 0.5,
     '5-f 봉우리(.55)는 753 9회차 2인 일치 값 그대로다 — t=40ms 에 이미 그 세기다(`verify683` [G] 가 재는 시각)',
     E40 ? String(E40.op) : '측정 실패');

  ok(errs.length === 0, 'Z1 콘솔 에러 0', errs.length ? errs.slice(0, 3).join(' | ') : '없음');

  console.log('\nPROBE994 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
