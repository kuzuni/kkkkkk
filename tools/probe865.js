/* 작업 865 재현 — «`lance`(천벌의 창) 밑동이 **어느 층에도 안 든다**» 를 찍힌 픽셀로 잰다
 *
 *   node tools/probe865.js                 (기본 = 제품 트리)
 *   P865_SRC=/경로/사본.html node tools/probe865.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설부터 재현한다. 등재문은 856 3회차 비평 2인
 * (DB·DC)이 **독립으로 같은 것**을 1순위로 적은 관측이다:
 *   DB — 「x=790/800/810/820 획 두께 26·28·28·28px · 그 구간 min채널 최대 139~147
 *         (코어 평탄값 253) ⇒ 코어 0.00px」·「두께 28px·알파 0.41 의 평평한 반투명 판」
 *   DC — 「슬래브 43×28px · (174,139,174)/(164,128,169) · 창이 아니라 **UI 조각**」
 *
 * ── 무엇을 «층 미배정» 으로 정의하는가 ─────────────────────────────────────
 * 792 가 못박은 문법은 «모든 발은 ①후광 · ②본체 · ③하이라이트 세 층을 전부 갖는다» 이고,
 * 9·10회차가 ①과 ③을 **본체 실루엣에서 굽는 자산**으로 옮겼다. 그래서 층의 소속은
 * 눈이 아니라 **제품이 쓰는 문턱 두 개**로 판정할 수 있다:
 *   ② 본체  = 실루엣 문턱 α ≥ 0.5   (`auraSprite` ②가 굳히는 값)
 *   ① 후광  = 그 실루엣에서 구운 링 — 두께가 `AURA_W`(로컬 3.9px)라 본체에서 **띠 안**이다
 *   ③ 코어  = 근백색(r,g,b ≥ 232) — `SPEC` 색의 알파 .94 에서 나온다
 * ⇒ **셋 중 어디에도 안 드는 잉크** = α < 0.5 이면서 본체에서 띠(`CBAND` 18 기기px) 밖이고
 *    근백색도 아닌 화소. 링만 있는 종은 구성상 이 값이 0 이다(`verify792` [B8s] 의 «먼몫» 과
 *    같은 자를 쓴다 — 같은 것을 두 자가 따로 정의하면 그것이 곧 다음 어긋남이다 · 402).
 *
 * 알파는 «추정» 하지 않고 **푼다** — 같은 발을 한 겹·두 겹 그려
 *   α = 1 − (r2 − r1)/(r1 − b)   (verify792 의 층 분해와 같은 자·같은 상수)
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.resolve(process.env.P865_SRC || path.join(ROOT, 'index.html'));
/* 되돌림 사본 — **저장소 루트**에 둔다(/tmp 면 상대 경로 assets/** 가 통째로 404 다 · 792 선례).
   이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648) · 끝나면 지운다(810). */
const OLD = path.join(ROOT, '.p865-old-' + process.pid + '.html');

/* verify792 와 **같은 값**을 쓴다(두 자가 같은 것을 본다) */
const A_BODY = 0.5;    /* 실루엣 문턱 — `auraSprite` ② 가 굳히는 값 */
const CBAND  = 18;     /* 본체에서 «띠» 로 치는 거리(기기px) — 링 두께(3.9 로컬 × 4)보다 넓다 */
const NEARW  = 232;    /* 근백색 문턱 — ③층 */

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

async function measure(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1100);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev((K) => {
    /* ⚑⚑ 855 — 시계와 주사위를 둘 다 묶는다(probe792·verify792 와 같은 자리·같은 처방).
       안 묶으면 플레이어가 선 자리가 회차마다 달라 측정 상자가 다른 격자에 얹힌다. */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;
    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;                      /* 855 — 오라 반지름이 벽시계로 뛴다 */

    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const clearFx = () => { for (const n in FXMAP) FXMAP[n].length = 0; };

    let foe = null;
    const putFoe = () => {
      if (!foe) { let g = 0; while (enemies.length === 0 && g++ < 600) step(1 / 60); foe = enemies[0]; }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = 300 - ox; foe.y = 300 - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };

    /* «그 스킬이 실제로 만든 첫 발» 의 규격 — 손으로 적지 않는다(710 [C] 와 같은 방법) */
    let sp = null;
    for (const s of SKILLS) {
      if (s.id !== 'lance') continue;
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      if (done && shots.length) {
        const b = shots[0];
        sp = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
               tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      clearFx();
    }
    if (!sp) return { err: 'lance 발을 못 만들었다' };

    putFoe(); clearFx();
    /* 855 — 상자를 **빈 자리**로(플레이어 +180). 뿌리·산수는 probe792 같은 자리 주석이 본문. */
    /* ⚑ 936 — **재는 자리를 못박는다**(928 처방의 나머지 여집합 · 형제 자 8곳).
       상자는 `player.x` 에 매달려 있는데 플레이어는 ① `page.goto` 뒤 실시간 루프 ② `putFoe()` 가
       «적이 나올 때까지» 도는 `step()` 을 타고 **판마다 다른 자리**에 선다. 그러면 상자가 잡는
       그림의 몫이 달라진다 — 수리 전 실측(프로세스 3판): `verify710` 잉크 화소 shuri 5072 /
       5913 / 6287(±12%) · lance 4771 / 5427 / 6068. 못박으면 판을 넘어 같은 값이 나온다.
       ⚠ 자리는 제품의 «집»(`spawnStage()` 가 쓰는 `WORLD.w/2, WORLD.h/2`)에서 판다 — 자에
         좌표를 손으로 적으면 그것이 곧 사본이다(402).
       ⚠ **재는 것은 한 칸도 안 바뀐다** — 상자 크기·문턱·발 놓는 자리(`CX − ox`)는 그대로고,
         바뀌는 것은 «어느 자리에서 재는가» 뿐이다. */
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const base = grab();

    /* 각도 0 — 창은 가로로 눕는다(밑동이 «뒤쪽 = −x» 에 선다) */
    const mk = () => ({ k: sp.k, sh: sp.sh, sa: 0, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                        dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                        spin: sp.spin === undefined ? undefined : 0, r: sp.r,
                        tx: sp.tx === undefined ? undefined : CX - ox,
                        ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
    clearFx(); shots.push(mk());           const a0 = grab();     /* r1 — 한 겹 */
    clearFx(); shots.push(mk(), mk());     const a2 = grab();     /* r2 — 두 겹 */
    performance.now = _now;

    const n = bw * bh;
    const ink = new Uint8Array(n), body = new Uint8Array(n), near = new Uint8Array(n);
    const av = new Float32Array(n);
    for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
      let c = 0, best = 0;
      for (let k = 0; k < 3; k++) { const v = Math.abs(a0[i + k] - base[i + k]); if (v > best) { best = v; c = k; } }
      if (best <= 8) continue;
      ink[p] = 1;
      const d1 = a0[i + c] - base[i + c], d2 = a2[i + c] - a0[i + c];
      let al = 1 - d2 / d1; if (!isFinite(al)) al = 1;
      al = al < 0 ? 0 : (al > 1 ? 1 : al);
      av[p] = al;
      if (al >= K.A_BODY) body[p] = 1;
      if (a0[i] >= K.NEARW && a0[i + 1] >= K.NEARW && a0[i + 2] >= K.NEARW) near[p] = 1;
    }

    /* 본체까지의 거리(체임퍼 · verify792 [B8s] 와 같은 자) */
    const INF = 1e9, dt = new Float32Array(n), D1 = 1, D2 = 1.41421356;
    for (let p = 0; p < n; p++) dt[p] = body[p] ? 0 : INF;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const p = y * bw + x; let v = dt[p];
      if (x > 0 && dt[p - 1] + D1 < v) v = dt[p - 1] + D1;
      if (y > 0 && dt[p - bw] + D1 < v) v = dt[p - bw] + D1;
      if (x > 0 && y > 0 && dt[p - bw - 1] + D2 < v) v = dt[p - bw - 1] + D2;
      if (x < bw - 1 && y > 0 && dt[p - bw + 1] + D2 < v) v = dt[p - bw + 1] + D2;
      dt[p] = v;
    }
    for (let y = bh - 1; y >= 0; y--) for (let x = bw - 1; x >= 0; x--) {
      const p = y * bw + x; let v = dt[p];
      if (x < bw - 1 && dt[p + 1] + D1 < v) v = dt[p + 1] + D1;
      if (y < bh - 1 && dt[p + bw] + D1 < v) v = dt[p + bw] + D1;
      if (x < bw - 1 && y < bh - 1 && dt[p + bw + 1] + D2 < v) v = dt[p + bw + 1] + D2;
      if (x > 0 && y < bh - 1 && dt[p + bw - 1] + D2 < v) v = dt[p + bw - 1] + D2;
      dt[p] = v;
    }

    /* 본체(②)의 뒤끝 — 창은 a=0 이라 «밑동» 은 −x 쪽이다 */
    let bMinX = 1e9;
    for (let p = 0; p < n; p++) if (body[p]) { const x = p % bw; if (x < bMinX) bMinX = x; }
    /* 등재문의 «슬래브 43×28px» 과 같은 자리 — 본체 뒤로 나온 잉크(근백색 제외)의 bbox.
       ⚠ 이 상자에는 링이 뒤로 두르는 몫(설계 두께 `AURA_W`×`HALO_SS` = 15.6기기px)도 같이 든다.
       판만 따로 세는 것은 아래 «층 미배정» 이다 — 두 수는 서로 다른 질문에 답한다. */
    let tx0 = 1e9, ty0 = 1e9, tx1 = -1, ty1 = -1, tcnt = 0;
    for (let p = 0; p < n; p++) {
      if (!ink[p] || body[p] || near[p]) continue;
      const x = p % bw, y = (p - x) / bw;
      if (x >= bMinX) continue;
      tcnt++;
      if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
      if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
    }

    /* 층 미배정 = 잉크인데 ②도 ③도 아니고, ①(링)이 닿는 띠 밖 */
    let nInk = 0, nBody = 0, nSoft = 0, nNear = 0;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, cnt = 0, minMax = 0;
    const hist = new Int32Array(20);
    const cols = [];
    for (let p = 0; p < n; p++) {
      if (!ink[p]) continue;
      nInk++;
      if (near[p]) nNear++;
      if (body[p]) { nBody++; continue; }
      nSoft++;
      if (near[p] || dt[p] <= K.CBAND) continue;
      cnt++;
      const x = p % bw, y = (p - x) / bw;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      let bi = Math.floor(av[p] / 0.05); if (bi > 19) bi = 19; if (bi < 0) bi = 0;
      hist[bi]++;
      const i = p * 4;
      const mn = Math.min(a0[i], a0[i + 1], a0[i + 2]);
      if (mn > minMax) minMax = mn;
      if (cols.length < 4000) cols.push([a0[i], a0[i + 1], a0[i + 2]]);
    }
    let hmax = 0, hi = 0; for (let i = 0; i < 20; i++) if (hist[i] > hmax) { hmax = hist[i]; hi = i; }
    /* 대표색 — 판의 중앙값(비평가 DC 가 적은 (174,139,174)/(164,128,169) 와 대조) */
    const med = k => { const a = cols.map(c => c[k]).sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 0; };

    return {
      SC, HALO_SS: (typeof HALO_SS === 'undefined' ? null : HALO_SS),
      AURA_W: (typeof AURA_W === 'undefined' ? null : AURA_W),
      ink: nInk, body: nBody, soft: nSoft, near: nNear,
      slab: cnt,
      tail: tcnt, tw: tx1 < 0 ? 0 : (tx1 - tx0 + 1), th: ty1 < 0 ? 0 : (ty1 - ty0 + 1),
      w: x1 < 0 ? 0 : (x1 - x0 + 1), h: y1 < 0 ? 0 : (y1 - y0 + 1),
      flat: cnt ? +(hmax / cnt).toFixed(3) : 0,
      aMode: +((hi + 0.5) * 0.05).toFixed(3),
      minMax,
      col: [med(0), med(1), med(2)],
      fFar: nSoft ? +(cnt / nSoft).toFixed(3) : 0
    };
  }, { A_BODY, CBAND, NEARW });

  await ctx.close();
  return { out, errs };
}

const show = (tag, out) => {
  console.log('  [' + tag + '] 잉크 ' + out.ink + ' (본체 ' + out.body + ' · 후광 ' + out.soft + ')');
  console.log('  [' + tag + '] 본체 뒤로 나온 잉크(밑동) — ' + out.tail + '화소 · bbox ' + out.tw + '×' + out.th + 'px');
  console.log('  [' + tag + '] 층 미배정 판 — 화소 ' + out.slab + ' · bbox ' + out.w + '×' + out.h +
              'px · α최빈 ' + out.aMode + '(몫 ' + out.flat + ') · min채널 최대 ' + out.minMax +
              ' · 대표색 (' + out.col.join(',') + ') · 후광 중 몫 ' + out.fFar);
};

/* ⚑ 자·재현기가 **같은 자**를 쓰게 내보낸다(같은 것을 두 벌 적으면 그것이 곧 다음 어긋남이다 — 402).
   `verify865.js` 가 `measure`·`mkOld`·문턱 셋을 그대로 물어다 쓴다. */
const ANCHOR = `ctx.moveTo(23.4,0); ctx.lineTo(4.7,2.65);`;
const OLDGLOW = `ctx.strokeStyle = 'rgba(255,208,255,.42)'; ctx.lineWidth = 7; ctx.lineCap = 'round';` +
                ` ctx.beginPath(); ctx.moveTo(-23.4,0); ctx.lineTo(6.2,0); ctx.stroke();\n      ` +
                `ctx.beginPath(); `;
/* 되돌림 사본을 짓는다 — 865 **이전의 세계**(«`halo()` 뒤 · 본체 앞에서 제 손으로 깐 줄»).
   ⚠ 줄을 통째로 글자로 적지 않는다(792 [R] 주석 — 다음 회차의 한 글자 수정에 자가 먼저 죽는다).
     창날 경로의 첫 두 점만 붙잡고 **그 앞에** 옛 잔광 줄을 끼운다. 닻이 딱 하나가 아니면 `null`. */
const mkOld = (dst) => {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (src.split(ANCHOR).length !== 2) return null;
  fs.writeFileSync(dst, src.replace(ANCHOR, OLDGLOW + ANCHOR), 'utf8');
  return dst;
};
module.exports = { measure, mkOld, ANCHOR, OLDGLOW, A_BODY, CBAND, NEARW, ROOT };
if (require.main !== module) return;

(async () => {
  console.log('=== PROBE 865 — `lance` 밑동이 어느 층에도 안 든다 ===\n');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  /* ⚑ **수리 전 세계를 사본으로 짓는다 — 재현기가 «이미 지나간 상태» 를 제품에게 요구하지 않게.**
     803·819 가 정확히 그 병으로 등재됐다(«이미 고쳐진 트리에 대고 옛 재현을 요구한다»). 이 자는
     대신 사본에서 옛 그림을 재고, 제품 트리에는 **판이 없다**를 묻는다 — 두 세계를 한 실행에서 본다. */
  if (!mkOld(OLD)) {
    ok(false, '[0] 되돌림 닻(창날 경로 첫 두 점)이 소스에 딱 한 번 있다 — 실측 ' +
              (src.split(ANCHOR).length - 1) + '회');
    console.log('\nPROBE865 ' + pass + '/' + (pass + fail) + ' FAIL');
    process.exit(1);
  }

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  let old, now;
  try {
    old = await measure(browser, 'file://' + OLD);
    now = await measure(browser, SRC);
  } finally {
    await browser.close();
    try { fs.unlinkSync(OLD); } catch (e) { /* 810 — 임시 표본은 크래시에도 남기지 않는다 */ }
  }

  const a = old.out, b = now.out;
  if (!a || a.__err || a.err || !b || b.__err || b.err) {
    ok(false, '[0] 재현 하네스가 돌았다 — ' + JSON.stringify({ old: a, now: b }));
  } else {
    console.log('  [상수] SC ' + b.SC + ' · HALO_SS ' + b.HALO_SS + ' · AURA_W ' + b.AURA_W +
                '(로컬) = ' + (b.AURA_W * b.HALO_SS).toFixed(1) + '기기px');
    show('수리 전', a);
    show('제품  ', b);
    console.log('');

    ok(a.slab >= 400,
       '[1] 밑동이 실재했다 — 수리 전 세 층 어디에도 안 드는 잉크 ' + a.slab + '화소 ≥ 400');
    ok(a.tw >= 38 && a.th >= 24,
       '[2] 등재문의 «슬래브 43×28px» 자리다 — 수리 전 본체 뒤 잉크 ' + a.tw + '×' + a.th +
       'px (≥38×24) · ' + a.tail + '화소');
    ok(a.flat >= 0.60,
       '[3] 그 판은 **평탄했다** — α 최빈칸(폭 0.05) 몫 ' + a.flat + ' ≥ 0.60 (칼로 자른 판)');
    ok(a.aMode >= 0.33 && a.aMode <= 0.50,
       '[4] 그 판의 α 가 등재문의 «.42» 다 — 최빈 α ' + a.aMode + ' ∈ [0.33, 0.50]');
    ok(a.minMax < 233,
       '[5] ③층이 아니었다 — 판 안 min채널 최대 ' + a.minMax + ' < 233 (근백색 문턱 · 코어 0.00px)');
    ok(a.fFar > 0.03,
       '[6] ①층(링)도 아니었다 — 본체에서 띠(' + CBAND + 'px) 밖 후광 몫 ' + a.fFar +
       ' > 0.03 (`verify792` [B8s] 문턱 · 링만 있는 종은 구성상 0)');
    ok(b.slab === 0,
       '[7] 제품 트리에는 판이 없다 — 층 미배정 잉크 ' + b.slab + '화소 = 0');
    ok(b.body > 0 && b.soft > 0,
       '[8] 제품이 ①②층을 여전히 갖는다 — 본체 ' + b.body + ' · 후광 ' + b.soft + ' (둘 다 > 0)');
  }
  ok(old.errs.length === 0 && now.errs.length === 0,
     '[G1] 콘솔/페이지 오류 0건 (수리 전 ' + old.errs.length + ' · 제품 ' + now.errs.length + ')');

  console.log('\nPROBE865 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
