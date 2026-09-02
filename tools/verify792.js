/* 작업 792 게이트 — «스킬 발동 이펙트 연출 규격 통일»
 *
 *   node tools/verify792.js
 *
 * 710 은 «중복 0»(분간)을 닫았고 비평가 ①은 8 로 안정됐다. 남은 감점 ②(통일감)·③(덩치)의
 * 실체를 재현(`tools/probe792.js`)이 수치로 갈랐다 — 17종이 네 «렌더링 문법» 을 섞어 쓰는데
 * 그 넷은 **층의 있고 없음**으로 갈린다. 수리 전 실측(같은 자로 잰 것):
 *   · ① 후광이 없는 종 **5**  (bounce .018 · stone .035 · rico .038 · spiral .044 · shuri .056)
 *   · ③ 하이라이트가 없는 종 **14** (17종 중 spec 을 가진 것은 rico·spiral·lance 뿐)
 *   · 후광 비율 밴드 **45.02** (ice .738 ÷ bounce .018)
 *
 * ── 792 가 못박는 문법 (한 줄) ────────────────────────────────────────────
 *   모든 투사체는 **① 후광(저알파) · ② 본체(`b.col` 불투명) · ③ 하이라이트(근백색 코어)**
 *   세 층을 **전부** 갖는다. 하드 외곽선은 쓰지 않는다(외곽선처럼 보이는 것은 ①이나 ③이 흡수).
 *
 * 절:
 *   [A] 층 — 17종 전부가 ①과 ③을 갖는다.
 *   [B] 밴드 — 412 «한 세트»: 후광 비율이 한 밴드(≤ 4.0 · 수리 전 45.02) · 하이라이트 1~25% ·
 *               후광이 실루엣을 삼키지 않는다 · **본체가 배경보다 밝다**(2회차 비평 2인 공통).
 *   [C] 선언 — 층을 부르는 이름이 `shotBody` 안에 한 벌만 있다(`halo`/`spec`/`SPEC`).
 *               종마다 다른 흰색을 손으로 적으면 «한 색» 이라는 문법이 곧 무너진다(402 «사본을 지운다»).
 *   [D] 되감기 금지 — 792 가 후광을 얹느라 710 이 닫은 ①(분간)을 되돌리지 않았다.
 *               ⚠ 1회차에 이것이 실제로 잡았다 — 둥근 공 후광이 화염구와 겹쳐 0.796 → **0.840** 이었다.
 *   [R] 되돌림 시험 — 층을 무력화한 사본에서 [A] 가 **실제로** 빨개진다.
 *
 * 자와 재현을 둘 다 두는 이유는 710·412 와 같다 — 자는 «선언» 을, 재현은 «찍힌 픽셀» 을 지킨다.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* 되돌림 사본 — 층 호출을 무력화한다(= 792 이전 세계: 층이 빠진 채로 떨어진다).
   ⚠ 저장소 루트에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가 통째로 404 다
     (360·367·438·439·453·467·471·541·710 선례). 이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648). */
const NEG_SPEC = path.join(ROOT, '.v792-neg-spec-' + process.pid + '.html');
const NEG_HALO = path.join(ROOT, '.v792-neg-halo-' + process.pid + '.html');
const TAG_SPEC = `    const spec = fn => { ctx.save(); fn(); ctx.restore(); };`;
const TAG_HALO = `    const halo = fn => { const s = haloSprite(sh, fn); if(s){ ctx.drawImage(s.c, s.ox, s.oy, s.w, s.h); } else { ctx.save(); fn(); ctx.restore(); } };`;
/* 5회차 — 페이드 자체를 끄는 세 번째 사본. `HALO_FADE = 0` 이면 굽기는 그대로 돌되 탭이 한 개(중앙)라
   **평탄 판**이 나온다 = 4회차까지의 세계. [B6] 이 그것을 실제로 잡는지 [R3] 이 못박는다. */
const NEG_FADE = path.join(ROOT, '.v792-neg-fade-' + process.pid + '.html');
const TAG_FADE = `const HALO_FADE = 1;`;

/* 710 [C1] 과 **같은 문턱**을 쓴다.
   ⚠ 1회차에 여기를 «710 이 마감 때 찍은 값 0.796» 으로 박았다가 스스로 빨개졌다 —
     `boom↔flask` 쌍은 같은 트리에서 0.775 · 0.796 · 0.809 · 0.810 · 0.815 로 흔들린다.
     뿌리는 제품이 아니라 **자**다: 마스크를 «살아 있는 전투 장면» 과의 차이로 재기 때문에
     그때그때의 바탕이 저알파 후광 화소를 문턱 위로도, 아래로도 밀어낸다.
     한 번 찍힌 관측값을 문턱으로 박으면 그 자는 **설계부터 플레이키**다(PROGRESS 825 가 그 병이다).
   ⇒ 문턱은 710 의 것(0.90)을 그대로 쓰고, «792 가 되감지 않았다» 는 [B3](후광이 실루엣을
     삼키지 않는다)가 **흔들리지 않는 축으로** 대신 지킨다. 실측 폭은 review §2 에 적었다. */
const IOU_MAX = 0.90;

/* [B6] 문턱 — «후광 α 의 최빈 칸(폭 0.05)이 후광 화소의 몇 할을 먹는가».
   1.00 에 가까우면 한 값에서 칼로 잘린 **평탄 판**이고, 낮을수록 가장자리가 풀린 것이다.
   ⚠ 관측값을 그대로 박지 않는다(825 의 병 · 1회차 [D1] 이 실제로 그렇게 빨개졌다) —
     문턱은 «평탄 판(≈1.0)» 과 «푼 것» 사이의 **빈 구간**에 둔다. 실측은 아래 표에 찍힌다. */
const FLAT_MAX = 0.60;

/* [B7] 문턱 — «램프 몫»(최빈 알파의 절반 아래로 내려온 후광 화소의 비율)과 그 밴드.
   5회차(절대 폭)의 실측 밴드가 두 비평가가 각자 잰 7~17배와 같은 자리에 있었다.
   ⚠ 여기도 관측값을 그대로 박지 않는다 — 실측은 표에 찍히고, 문턱은 그 위 여유에 둔다.
   ⚠ 밴드는 **문턱이 아니라 기록**이다 — 이유는 [B7] 자리의 주석. */
const RAMP_MIN = 0.12;

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
  const ev = async (fn) => {
    try { return await page.evaluate(fn); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

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

    /* 종별 «그 스킬이 실제로 만든 첫 발» 의 규격 (710 [C] 와 같은 자리·같은 방법) */
    const specs = {};
    for (const s of SKILLS) {
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      if (done && shots.length) {
        const b = shots[0];
        specs[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                        tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      clearFx();
    }

    putFoe(); clearFx();
    const CX = Math.round(player.x + ox + 70), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const base = grab();

    /* 층 분해 — soft(후광) / hard(본체) / spec(하이라이트)
       ⚑⚑ **알파를 «추정» 하지 말고 «푼다».** 3회차까지 이 자리를 세 번 고쳤고 세 번 다 틀렸다:
         ⓐ 저알파 화소를 그대로 후광으로 세니 돌의 **안쪽 그림자 면**이 후광으로 셌다(비평가 CO 가
            «stone 은 글로우 0px» 이라고 적었을 때 자는 fSoft 0.384 로 초록이었다).
         ⓑ 본체 바깥만 세도, 바탕 대비 Δ 로 «저알파 층» 과 «저대비 본체» 를 못 가른다.
         ⓒ 경계를 60 → 90 으로 옮기자 이번엔 돌의 **본체**가 통째로 후광으로 넘어갔다.
       뿌리는 하나다 — **합성된 화소 하나에서 알파를 알아낼 수 없다**(α·L + (1−α)·b 는 미지수가 둘).
       ⇒ **같은 발을 두 번 겹쳐 그려** 방정식을 하나 더 만든다:
            r1 = α·L + (1−α)·b
            r2 = α·L + (1−α)·r1        (같은 층을 r1 위에 한 번 더)
          두 식에서 (r2 − r1) / (r1 − b) = 1 − α  ⇒  **α = 1 − (r2 − r1)/(r1 − b)**
       바탕 b 가 무엇이든 상관없이 **알파 그 자체**가 나온다. 저대비 본체(α=1)와 저알파 후광(α<1)이
       이제 원리적으로 갈린다. 채널은 |r1 − b| 가 가장 큰 것을 골라 나눗셈의 분모를 키운다.
       ⚠ 이 풀이는 그리기가 **source-over** 일 때만 성립한다 — 투사체 경로에는 `globalCompositeOperation`
         이 한 곳도 없음을 확인했다(있는 자리는 전부 스프라이트 생성기 쪽 19358~19697). */
    const A_BODY = 0.55;              /* α ≥ 이 값이면 «본체», 아래면 «후광» */
    const rows = {}, masks = {};
    for (const id in specs) {
      const sp = specs[id];
      const mk = () => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                          dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                          spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                          tx: sp.tx === undefined ? undefined : CX - ox,
                          ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      clearFx(); shots.push(mk());              const a0 = grab();   /* r1 — 한 겹 */
      clearFx(); shots.push(mk(), mk());        const a2 = grab();   /* r2 — 두 겹 */
      let hard = 0, sp2 = 0;
      const m = new Uint8Array(bw * bh);        /* 잉크 전체 */
      const hd = new Uint8Array(bw * bh);       /* 본체 */
      const sf = new Uint8Array(bw * bh);       /* 후광 */
      const av = new Float32Array(bw * bh);     /* 5회차 — 화소별 α (아래 [B6] «평탄 판» 축의 재료) */
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        m[p] = 1;
        const d1 = a0[i + c] - base[i + c];
        const d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;                   /* α = 1 − (r2 − r1)/(r1 − b) */
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        av[p] = al;
        if (al >= A_BODY) { hd[p] = 1; hard++; } else sf[p] = 1;
        if (a0[i] >= 232 && a0[i + 1] >= 232 && a0[i + 2] >= 232) sp2++;
      }
      /* 본체 바깥 = 테두리에서 «본체가 아닌» 화소를 타고 들어간 영역 */
      const out = new Uint8Array(bw * bh);
      const st = [];
      for (let x = 0; x < bw; x++) { st.push(x); st.push((bh - 1) * bw + x); }
      for (let y = 0; y < bh; y++) { st.push(y * bw); st.push(y * bw + bw - 1); }
      while (st.length) {
        const p = st.pop();
        if (p < 0 || p >= out.length || out[p] || hd[p]) continue;
        out[p] = 1;
        const x = p % bw, y = (p - x) / bw;
        if (x > 0) st.push(p - 1);
        if (x < bw - 1) st.push(p + 1);
        if (y > 0) st.push(p - bw);
        if (y < bh - 1) st.push(p + bw);
      }
      let soft = 0, sx = 0, sy = 0, hx = 0, hy = 0;
      /* ⚑ 5회차 [B6] 의 재료 — 후광 화소의 **α 히스토그램**(폭 0.05).
         «평탄한 알파 판» 은 한 값에서 칼로 잘린 판이라 α 가 **한 칸에 뭉친다**;
         가장자리가 풀린 후광은 그 값에서 0 까지 계단을 밟으므로 여러 칸에 퍼진다.
         CQ 가 눈으로 잰 |∇L|/px 와 같은 것을 보되, **바탕 밝기에 안 흔들리는 축**으로 잰다
         (α 는 위 «두 겹» 풀이로 바탕과 무관하게 나온다 — 825 의 병을 피하는 자리다). */
      const hist = new Int32Array(20);
      for (let p = 0; p < sf.length; p++) {
        const x = p % bw, y = (p - x) / bw;
        if (sf[p] && out[p]) {
          soft++; sx += x; sy += y;
          let bi = Math.floor(av[p] / 0.05); if (bi > 19) bi = 19; if (bi < 0) bi = 0;
          hist[bi]++;
        }
        if (hd[p]) { hx += x; hy += y; }
      }
      let hmax = 0, hi = 0; for (let i = 0; i < 20; i++) if (hist[i] > hmax) { hmax = hist[i]; hi = i; }
      /* ⚑ 6회차 [B7] 의 재료 — «가장자리 램프가 후광의 몇 할인가».
         최빈 칸(= 판의 몸통 알파)의 **절반 아래**로 내려온 화소를 센다. 칼로 자른 판이면 거의 0,
         잘 풀린 가장자리면 상당한 몫이 된다. [B6](한 칸에 뭉쳤나)이 «판인가» 를 묻는다면
         이것은 «푼 폭이 종끼리 고른가» 를 묻는다 — 6회차 비평 2인이 각자 짚은 축이 이것이다
         (CS: 후광두께÷본체폭 stone 9% ↔ boom 64% · CR: falloff 폭 boomer 2px ↔ boom 34px). */
      const halfA = (hi + 0.5) * 0.05 * 0.5;
      let ramp = 0;
      for (let p = 0; p < sf.length; p++) if (sf[p] && out[p] && av[p] < halfA) ramp++;
      const ink = soft + hard;
      /* 후광 ↔ 본체 **중심 어긋남** — 2회차에 비평가 CN·CO 가 2인 공통으로 짚은 축이다
         (곡선탄의 둥근 원반이 코어에서 떨어져 «한 발» 이 아니라 «두 물체» 로 읽혔다).
         «층이 있는가» 만 보면 이것을 못 잡는다 — 떨어져 있어도 층은 있다. */
      const off = (soft && hard)
        ? +Math.hypot(sx / soft - hx / hard, sy / soft - hy / hard).toFixed(2) : 999;
      /* 본체 휘도 − 배경 휘도 — 운석 하나만 **음수**라 «구멍» 으로 읽혔다(CN·CO 2인 공통 1순위). */
      let lb = 0, lg = 0, nb = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        if (!hd[p]) continue;
        lb += 0.299 * a0[i] + 0.587 * a0[i + 1] + 0.114 * a0[i + 2];
        lg += 0.299 * base[i] + 0.587 * base[i + 1] + 0.114 * base[i + 2];
        nb++;
      }
      masks[id] = m;
      rows[id] = { sh: sp.sh, ink, soft, hard, spec: sp2, off,
                   dL: nb ? +((lb - lg) / nb).toFixed(1) : 0,
                   fSoft: +(soft / Math.max(1, ink)).toFixed(4),
                   fSpec: +(sp2 / Math.max(1, ink)).toFixed(4),
                   flat: +(hmax / Math.max(1, soft)).toFixed(3),
                   aMode: +((hi + 0.5) * 0.05).toFixed(3),
                   fRamp: +(ramp / Math.max(1, soft)).toFixed(3) };
      clearFx();
    }

    /* 710 [C1] 과 같은 축 — 후광을 얹느라 실루엣이 서로 붙지 않았는가 */
    const ids = Object.keys(masks);
    let worst = { iou: 0 };
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = masks[ids[i]], B = masks[ids[j]];
      let inter = 0, uni = 0;
      for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
      const iou = uni ? inter / uni : 0;
      if (iou > worst.iou) worst = { a: ids[i], b: ids[j], iou: +iou.toFixed(4) };
    }
    /* ⚑⚑ [P1] — 5회차가 세운 **시간 축**. 4회차의 교훈이 이것이다: 페이드 두 안이 게이트 15/15
       초록에 회귀도 전부 초록인 채 **프레임을 1685배 / 20배** 로 만들었다("자는 그림만 보지
       시간은 안 본다"). 그 실측을 손에 들고 있지 말고 자에 박아 둔다 — 연출은 상시 도는 코드다.
       ⚠ 캐시가 더워진 뒤(정상 상태)를 잰다. 굽는 비용은 아래 `bake` 로 따로 찍는다(기록만). */
    clearFx();
    const kinds = ids.map(i => specs[i]).filter(Boolean);
    const perfShot = (n) => { const sp = kinds[n % kinds.length];
      return { k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox + (n % 9) * 6 - 24, y: CY - oy + (n % 7) * 6 - 18,
               vx: 0, vy: 0, a: 0.4, dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
               spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
               tx: sp.tx === undefined ? undefined : CX - ox,
               ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 }; };
    const t0 = performance.now();
    for (let n = 0; n < 60; n++) shots.push(perfShot(n));
    draw();                                   /* 첫 프레임 = 굽는 프레임 */
    const bake = performance.now() - t0;
    for (let n = 0; n < 8; n++) draw();       /* 워밍업 */
    const ts = [];
    for (let n = 0; n < 24; n++) { const t = performance.now(); draw(); ts.push(performance.now() - t); }
    ts.sort((a, b) => a - b);
    const frame = +ts[Math.floor(ts.length / 2)].toFixed(3);
    clearFx();

    return { rows, worst, n: ids.length, frame, bake: +bake.toFixed(1), nShot: 60 };
  });

  await ctx.close();
  return { out, errs };
}

(async () => {
  console.log('=== VERIFY 792 — 스킬 이펙트 연출 규격(세 층) 통일 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const src = fs.readFileSync(SRC, 'utf8');
  const clean = () => { for (const f of [NEG_SPEC, NEG_HALO, NEG_FADE]) { try { fs.unlinkSync(f); } catch (_) {} } };

  try {
    /* ---- [C] 선언 ---- */
    const nSpec = (src.match(/\bspec\(\(\)\s*=>/g) || []).length;
    const nHalo = (src.match(/\bhalo\(\(\)\s*=>/g) || []).length;
    ok(src.includes(TAG_SPEC) && src.includes(TAG_HALO),
       '[C1] `shotBody` 가 층 이름 두 개(`halo`/`spec`)를 한 벌로 선언한다');
    ok(src.includes(`const SPEC = 'rgba(255,255,255,.94)';`),
       '[C2] 하이라이트 색이 상수 `SPEC` 한 곳에서만 나온다 (종별 사본 금지 — 402)');
    ok(nSpec >= 13, '[C3] 하이라이트를 부른 자리 ' + nSpec + '곳 ≥ 13 (재현이 «빠졌다» 고 센 종 수)');
    /* 4회차부터 [C4] 는 «몇 자리 고쳤나» 가 아니라 **«모든 후광이 한 곳을 지나는가»** 를 센다 —
       페이드가 `halo()` 한 줄에 살기 때문에, 이 함수를 안 지나는 후광은 그 종만 옛 문법(평탄 판)으로
       떨어진다. 방사 그라디언트로 이미 페이드를 갖는 불 계열 둘(fire·bottle)만 예외다. */
    ok(nHalo >= 14, '[C4] 후광이 전부 `halo()` 를 지난다 — 호출 자리 ' + nHalo +
       '곳 ≥ 14 (예외는 이미 그라디언트인 fire·bottle 둘뿐)');

    /* ---- 본 측정 ---- */
    const { out, errs } = await measure(browser, 'file://' + SRC);
    if (out && out.__err) { ok(false, '[측정] 블록 예외 — ' + out.__err); }
    else {
      const ids = Object.keys(out.rows);
      const noSoft = ids.filter(i => out.rows[i].fSoft < 0.12);
      const noSpec = ids.filter(i => out.rows[i].fSpec < 0.010);
      const fatSpec = ids.filter(i => out.rows[i].fSpec > 0.25);
      const fs2 = ids.map(i => out.rows[i].fSoft);
      const band = +(Math.max.apply(null, fs2) / Math.max(1e-6, Math.min.apply(null, fs2))).toFixed(2);

      ok(out.n === 17, '[A0] 투사체를 내는 종 17종을 픽셀로 쟀다 (실측 ' + out.n + ')');
      ok(noSoft.length === 0, '[A1] ① 후광(soft ≥ 12%) 이 17종 전부에 있다 — 빠진 종 ' +
         noSoft.length + (noSoft.length ? ' (' + noSoft.join(' · ') + ')' : ''));
      ok(noSpec.length === 0, '[A2] ③ 하이라이트(spec ≥ 1%) 가 17종 전부에 있다 — 빠진 종 ' +
         noSpec.length + (noSpec.length ? ' (' + noSpec.join(' · ') + ')' : ''));
      /* 문턱 4.0 의 근거 — **수리 전이 31.27** 이었다(slash 0.726 ÷ rico 0.023).
         같은 트리 반복 실측은 2.66~3.32 로 ±0.35 흔들리므로(바탕이 저알파 화소를 문턱 위아래로 민다)
         3.0 을 박으면 **자가 스스로 플레이키해진다** — 실제로 그렇게 한 번 빨개졌다.
         4.0 은 잡음 폭 밖이면서 수리 전과는 **7.8배** 떨어져 있어 «한 밴드» 라는 주장을 그대로 지킨다. */
      ok(band <= 4.0, '[B1] 412 «한 세트» — 후광 비율 최대÷최소 ' + band +
         ' ≤ 4.0 (수리 전 31.27)');
      ok(fatSpec.length === 0, '[B2] 하이라이트 비율이 25% 를 넘는 종 0 — 실측 ' +
         fatSpec.length + (fatSpec.length ? ' (' + fatSpec.join(' · ') + ')' : '') +
         ' (넘으면 «코어» 가 아니라 그 자체가 본체다)');
      /* [B3] 되감기 금지의 **흔들리지 않는** 축 — 후광은 실루엣을 «두르는» 것이지 «삼키는» 것이 아니다.
         이 항이 실제로 1회차 결함을 잡는다: 둥근 공 후광을 크게 준 순간 후광이 잉크의 61.6% 를 먹고
         화염구와 붙었다(IoU 0.796 → 0.840). 본체 몫을 20% 이상 남기게 하면 그 길이 막힌다. */
      const fatSoft = ids.filter(i => out.rows[i].fSoft > 0.80);
      ok(fatSoft.length === 0, '[B3] 후광이 실루엣을 삼킨 종 0 (fSoft ≤ 0.80 — 본체 몫 20% 이상) — 실측 ' +
         fatSoft.length + (fatSoft.length ? ' (' + fatSoft.join(' · ') + ')' : ''));
      /* [B4]·[B5] — 2회차 비평 2인(CN·CO)이 **각자 독립으로** 1·2순위로 짚은 두 축을 자로 옮긴 것이다.
         눈이 말한 것을 자가 말하게 해야 다음 회차가 같은 지적을 또 받지 않는다(335 규약). */
      /* [B4] 는 **기록만** 이다(541 [F] 의 «기록만» 선례). 문턱을 걸면 안 되는 이유를 적어 둔다 —
         이 축은 «후광이 본체에서 얼마나 밀렸는가» 를 재는데, **밀린 것이 정답인 종**이 있다:
         화살의 속도 줄무늬(38.3) · 폭풍의 칼날의 뒷깃(36.0) · 운석의 불꼬리(24.7)는 전부
         «뒤로 끌리는 꼬리» 가 곧 방향 신호다(710 이 ④ 에서 일부러 세운 것이다).
         문턱을 걸면 그 셋을 «고쳐야 할 결함» 으로 만들고, 고치면 710 의 ④ 를 되감는다.
         ⇒ 값만 찍어 다음 회차가 **눈의 지적을 검산**할 수 있게 둔다(792 등재문의 «유령» 경계). */
      console.log('  (기록) 후광 중심 어긋남 — ' +
         ids.map(i => i + ':' + out.rows[i].off).join(' · '));
      const dark = ids.filter(i => out.rows[i].dL <= 0);
      ok(dark.length === 0, '[B5] 본체가 배경보다 밝다 (ΔL > 0 — 어두우면 «구멍» 으로 읽힌다) — 어두운 종 ' +
         dark.length + (dark.length ? ' (' + dark.map(i => i + ':' + out.rows[i].dL).join(' · ') + ')' : ''));
      /* ⚑⚑ [B6] — 5회차가 세운 축. 4회차 비평 2인(CP·CQ)이 «후광이 평탄한 알파 판» 을
         각자 ② 최저 사유로 짚었는데 **자에 그 축이 없어** 게이트는 15/15 초록이었다.
         눈이 말한 것을 자가 말하게 한다(335 규약) — 안 그러면 다음 회차가 같은 지적을 또 받는다. */
      const flats = ids.map(i => out.rows[i].flat);
      const flatBad = ids.filter(i => out.rows[i].flat > FLAT_MAX);
      ok(flatBad.length === 0, '[B6] 후광이 «평탄한 알파 판» 이 아니다 — α 최빈 칸(폭 0.05) 몫 ≤ ' +
         FLAT_MAX + ' · 실측 최대 ' + Math.max.apply(null, flats).toFixed(3) +
         ' · 넘는 종 ' + flatBad.length + (flatBad.length ? ' (' + flatBad.join(' · ') + ')' : ''));
      /* [B7] — 6회차. «푼 폭» 이 종끼리 고른가. 5회차는 페이드 반지름을 **절대 px** 로 박았고,
         후광 덩치가 종마다 4배 넘게 다르므로 번진 몫이 7~17배로 갈렸다(두 비평가가 각자 실측).
         6회차는 반지름을 √(후광 면적)에 비례시켰다 — 이 항이 그것을 지킨다. */
      /* ⚠ **자가 못 재는 종은 재는 척하지 않는다.** 이 자는 «최빈 알파의 절반 아래» 를 세는데,
         화소 검출 문턱이 |Δ색| > 8 이라 후광이 옅은 종은 그 절반 값이 **검출 바닥 아래**로 내려간다
         (`lance` 후광 α .16 ⇒ 절반 .08 · 검출 한계 ≈ α .055 — 셀 수 있는 띠가 0.025 폭뿐이다).
         그런 종에서 나온 «램프 몫 0.038» 은 그림의 성질이 아니라 **자의 한계**다.
         ⇒ 최빈 α 가 0.20 아래인 종은 이 항에서 빼고 **값만 찍는다**(541 [F]·[B4] 의 «기록만» 선례).
           그 종들은 [B6](한 칸에 뭉쳤나)이 계속 지킨다 — 실제로 lance 0.328 · boom 0.113 로 초록이다.
         ⚠ 빼는 기준은 «불편해서» 가 아니라 «자가 못 봐서» 다. 다음 회차가 이 바닥을 낮추려면
           검출 문턱(8)을 내리는 것이 아니라 **더 밝은 바탕에서 한 번 더 재는** 쪽이 맞다(인계). */
      const ramps = ids.filter(i => out.rows[i].aMode >= 0.20);
      const dim = ids.filter(i => out.rows[i].aMode < 0.20);
      const rv = ramps.map(i => out.rows[i].fRamp);
      const rMin = Math.min.apply(null, rv), rMax = Math.max.apply(null, rv);
      const rBand = +(rMax / Math.max(1e-6, rMin)).toFixed(2);
      /* ⚠ **밴드(최대÷최소)를 문턱으로 걸지 않는다 — 걸어 봤고 자가 스스로 플레이키해졌다.**
         밴드의 «최대» 쪽은 최빈 α 가 0.20 경계에 걸터앉은 종(`boomer` α ≈ 0.20)이 실행마다
         들락날락하면서 정해진다: 그 종이 들어온 실행은 3.34, 빠진 실행은 1.58 이다.
         값이 아니라 **표본이 흔들리는** 자리라 문턱을 어디에 두든 반반으로 빨개진다(825 의 병).
         ⇒ 문턱은 **바닥 하나**(«잰 종이 전부 실제로 램프를 갖는가»)로만 걸고, 밴드는 기록만 한다.
           수리 전후는 review 에 적는다 — 절대 반지름 4.01 ↔ 비례 반지름 1.58~3.34. */
      ok(ramps.length >= 12 && rMin >= RAMP_MIN,
         '[B7] 잰 종이 전부 가장자리 램프를 갖는다 — 잰 종 ' + ramps.length + '(≥12) · 최소 몫 ' +
         rMin.toFixed(3) + ' ≥ ' + RAMP_MIN + ' (최대 ' + rMax.toFixed(3) + ' · 밴드 ' + rBand + ' — 기록만)');
      console.log('  (기록) 자가 못 재는 옅은 후광 ' + dim.length + '종 — ' +
         dim.map(i => i + ':α' + out.rows[i].aMode + '/램프' + out.rows[i].fRamp).join(' · '));
      ok(out.worst.iou <= IOU_MAX,
         '[D1] 710 회귀 짝 — 종별 실루엣 IoU 최댓값 ' + out.worst.iou + ' ≤ ' + IOU_MAX +
         ' (최악 쌍 ' + out.worst.a + '↔' + out.worst.b + ' · 이 쌍은 흔들린다 — 위 주석)');
      /* [P1] 문턱 6.0ms 의 근거 — 실측이 **두 무리로 갈려 있고 그 사이가 텅 비었다**:
         정상 경로 ~1.0ms ↔ 4회차가 되돌린 두 안 20.9ms(3겹) · 1749.8ms(매 프레임 blur).
         빈 구간 한가운데를 문턱으로 삼는다(825 의 «관측값을 문턱으로 박지 마라» 와 같은 규칙).
         60fps 예산 16.7ms 안에서도 투사체는 한 프레임의 일부일 뿐이라 6.0 이면 넉넉히 보수적이다. */
      ok(out.frame <= 6.0, '[P1] 투사체 ' + out.nShot + '발 `draw()` 한 프레임 ' + out.frame +
         'ms ≤ 6.0 (4회차가 되돌린 두 안 20.9ms · 1749.8ms — 연출은 상시 도는 코드다)');
      console.log('  (기록) 후광을 굽는 첫 프레임 ' + out.bake + 'ms — 종당 한 번뿐(캐시)');
      ok(errs.length === 0, '[G1] 콘솔/페이지 오류 0건 (실측 ' + errs.length + ')');

      console.log('\n  [표] 종별 — ink · fSoft / fSpec · 후광중심어긋남 · 본체ΔL · α최빈칸몫 · 램프몫');
      for (const id of ids) {
        const r = out.rows[id];
        console.log('        ' + id.padEnd(9) + r.sh.padEnd(10) +
                    String(r.ink).padStart(7) + '  ' +
                    r.fSoft.toFixed(3) + ' / ' + r.fSpec.toFixed(4) +
                    String(r.off).padStart(8) + String(r.dL).padStart(9) +
                    String(r.flat).padStart(9) + String(r.fRamp).padStart(9));
      }
      console.log('');
    }

    /* ---- [R] 되돌림 시험 ---- */
    fs.writeFileSync(NEG_SPEC, src.replace(TAG_SPEC, `    const spec = fn => {};`), 'utf8');
    fs.writeFileSync(NEG_HALO, src.replace(TAG_HALO, `    const halo = fn => {};`), 'utf8');

    const rSpec = await measure(browser, 'file://' + NEG_SPEC);
    if (rSpec.out && rSpec.out.__err) ok(false, '[R1] 사본 측정 예외 — ' + rSpec.out.__err);
    else {
      const bad = Object.keys(rSpec.out.rows).filter(i => rSpec.out.rows[i].fSpec < 0.010);
      ok(bad.length >= 13, '[R1] 하이라이트를 끄면 [A2] 가 빨개진다 — 빠진 종 ' + bad.length + '종 ≥ 13');
    }

    const rHalo = await measure(browser, 'file://' + NEG_HALO);
    if (rHalo.out && rHalo.out.__err) ok(false, '[R2] 사본 측정 예외 — ' + rHalo.out.__err);
    else {
      const ks = Object.keys(rHalo.out.rows);
      const bad = ks.filter(i => rHalo.out.rows[i].fSoft < 0.12);
      ok(bad.length >= 4, '[R2] 새로 세운 후광을 끄면 [A1] 이 빨개진다 — 빠진 종 ' + bad.length +
         '종 ≥ 4 (잰 종 ' + ks.length + ' · ' + bad.join(' · ') + ')');
    }

    /* [R3] — 페이드만 끈 사본(굽기는 그대로). [B6] 이 **페이드를 재는가**, 아니면
       그저 «굽는 경로를 지나는가» 를 재는가를 가른다. 이 항이 없으면 [B6] 은 무르게 풀 수 있다. */
    fs.writeFileSync(NEG_FADE, src.replace(TAG_FADE, `const HALO_FADE = 0;`), 'utf8');
    const rFade = await measure(browser, 'file://' + NEG_FADE);
    if (rFade.out && rFade.out.__err) ok(false, '[R3] 사본 측정 예외 — ' + rFade.out.__err);
    else {
      const ks = Object.keys(rFade.out.rows);
      const bad = ks.filter(i => rFade.out.rows[i].flat > FLAT_MAX);
      const mx = Math.max.apply(null, ks.map(i => rFade.out.rows[i].flat));
      ok(bad.length >= 8, '[R3] 페이드를 끄면 [B6] 이 빨개진다 — 평탄 판으로 읽힌 종 ' + bad.length +
         '종 ≥ 8 (잰 종 ' + ks.length + ' · 최대 ' + mx.toFixed(3) + ')');
    }
  } finally {
    clean();
    await browser.close();
  }

  console.log('VERIFY792 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
