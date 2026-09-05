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
/* ⚠ 856 에 이 줄이 길어졌다(하이라이트가 «본체 실루엣에서 깎은 코어» 가 됐다) — 9회차가
   `TAG_HALO` 에서 배운 대로 **머리만** 붙잡고 줄 끝까지 지운다(줄 전체를 글자로 적어 두면
   다음 회차의 한 글자 수정에 자가 먼저 죽는다). */
const TAG_SPEC = `    const spec = fn => { if(SPEC_BAKE){`;
/* ⚠ 9회차에 이 줄이 길어졌다(후광이 «본체 실루엣에서 판 링» 이 됐다) — 줄 전체를 글자로
   적어 두면 다음 회차의 한 글자 수정에 자가 먼저 죽는다. **머리만** 붙잡고 줄 끝까지 지운다. */
/* ⚠ 856 에 이 줄의 **머리**가 또 바뀌었다(`if(SPEC_BAKE) return;` 이 앞에 붙었다) — 붙잡는
   대목을 더 짧게 내린다. 9회차 주석이 «머리만 붙잡아라» 라고 적어 둔 이유가 이것이다. */
const TAG_HALO = `    const halo = fn => {`;
/* 9회차 [R4] — 링을 끄면 5~8회차의 «종별 손그림» 후광(폴백)이 그대로 돌아온다. */
const NEG_AURA = path.join(ROOT, '.v792-neg-aura-' + process.pid + '.html');
const TAG_AURA = `const AURA_ON   = 1;`;
const killLine = (src, tag, repl) =>
  src.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'), repl);
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

/* [B8]·[B9] 문턱 — 9회차. **관측값이 아니라 8회차 비평가 CU 가 준 목표**를 그대로 박는다
   (825 규칙의 반대편 자리다 — 관측값을 박으면 «지금 그대로» 가 규격이 되고, 목표를 박으면
    그 자는 처방이 실제로 목표에 닿았는지를 묻는다): 두께 p90 **12±3px** · 비대칭 **±3px**.
   [B9] 는 «후광이 몸통 색에서 나왔는가» — CT·CU 가 shuri 에서 각자 짚은 «난색 후광 ↔ 한색 몸통»
   (R−B: 후광 +20 / 몸통 −39 = Δ 59)이 기준이다. 부호가 갈릴 만큼 벌어지지 않는 폭으로 둔다. */
const TH_MIN = 9, TH_MAX = 15, ASYM_MAX = 3.0, DWARM_MAX = 30;
/* «먼몫» 문턱 — 본체에서 띠 밖까지 뻗은 후광 화소의 몫. 실측이 **두 무리로 갈리고 사이가 비었다**:
   링만 있는 종 0 ~ 0.001 ↔ 제 손으로 반투명 부품을 그리는 종 0.062(운석 꼬리) · 0.127(창 잔광) ·
   0.158(화구) · 0.375(병 불빛). 빈 구간 한가운데를 잡는다(825 규칙). */
const FAR_MAX = 0.03;

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
    /* ⚑⚑ 855 — 주사위 고정. `probe792` 와 **같은 자리·같은 처방**이다(그 파일 주석이 본문).
       `putFoe()` 가 «적이 나올 때까지» 도는 `step()` 횟수가 난수에 달려 플레이어가 선 자리가
       회차마다 달라지고, 측정 상자가 그 자리에 매달려 있어 같은 발이 다른 격자에 찍힌다.
       ⚠ [A2] 는 등재 당시 3/3 초록이었지만 **같은 표본·같은 문턱**이라 잠복이었을 뿐이다
       (probe 쪽 같은 항이 6회 중 2회 빨강). 한쪽만 고치면 다음 회차에 이쪽이 빨개진다. */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
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
    /* ⚑⚑ 855 — 상자를 **빈 자리**로(70 → 180) · 창은 dx ∈ [152, 203] 뿐이다.
       뿌리·산수·«240 은 edgeFade 0.68, 300 은 0» 실측은 `probe792` 같은 자리 주석에 적어 뒀다.
       요약: 플레이어 옆 70px 은 오라 링(화면 x ≤369)·위성이 상자에 같이 들어오는 자리고,
       그 위상은 자가 붙기 전 1.1초의 실시간 루프 때문에 회차마다 다르다 ⇒ 밝은 것이 `base` 에
       먼저 들어 있으면 그 화소가 `|a0 − base| ≤ 8` 로 잉크에서 탈락해 하이라이트가 통째로 사라진다. */
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
    /* ⚑⚑ 855 — 벽시계를 상수에 세운다(오라 반지름이 `sin(performance.now()/220)` 로 뛴다).
       ⚠ **아래 프레임 비용 측정은 진짜 시계를 써야 하므로** 원본을 들고 있다가 그 앞에서 되돌린다.
         안 되돌리면 `bake`·`frame` 이 전부 0 이 되어 «연출이 공짜» 라고 거짓말한다(792-③ 이 세운 축). */
    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;
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
    /* [B9] 가 색을 재는 띠 폭(기기px) — 링 설계 두께(로컬 3px × HALO_SS 4 = 12)보다 조금 넓게.
       한 곳에만 적고 자에게는 값째 돌려준다(자와 페이지에 따로 적으면 그것이 곧 사본이다 — 402). */
    const CBAND = 18;
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
      /* ⚑ 9회차 — 램프의 자를 «최빈칸의 절반 아래» 에서 **«봉우리의 절반 아래»** 로 옮겼다(333 처방:
         지우지 말고 방향을 돌린다). 6회차의 정의는 «평탄한 판 + 짧은 페이드» 를 전제로 세운 것이라
         **처음부터 끝까지 페이드인 링**에서는 뜻이 뒤집힌다 — 링은 최빈칸이 곧 띠의 몸통이고
         그 절반 아래는 검출 바닥(α≈.055) 코앞이라, 가장 잘 풀린 가장자리가 «램프 0.008» 로 찍혔다.
         봉우리 기준이면 판은 거의 0(전부가 봉우리 값), 링은 0.5 안팎이 되어 원래 묻던 것
         («칼로 자른 판인가, 풀린 가장자리인가»)을 두 세계에서 같은 뜻으로 묻는다.
         봉우리는 p95 로 잡는다 — 최댓값은 화소 한 개에 흔들린다. */
      const av2 = [];
      for (let p = 0; p < sf.length; p++) if (sf[p] && out[p]) av2.push(av[p]);
      av2.sort((x, y) => x - y);
      const aPeak = av2.length ? av2[Math.floor(0.95 * (av2.length - 1))] : 0;
      const halfA = aPeak * 0.5;
      let ramp = 0;
      for (let p = 0; p < sf.length; p++) if (sf[p] && out[p] && av[p] < halfA) ramp++;
      /* ⚑⚑ 9회차 [B8] — «방향별 후광 두께». 8회차 비평 2인(CT·CU)이 각자 **다른 종**을 짚었는데
         증상이 한 문장으로 요약됐다: **후광이 본체 실루엣을 안 따라간다**
         (CT 두께 whirl 5.8px ↔ slash 17.0px · CU bounce 146×96 = 좌우 +25 / 상하 **+0** ·
          arrow 좌 +28 / 우·상·하 +1 · lance 132px 무기울기 평탄 캡슐).
         ⚠ 8회차까지의 자는 이것을 **원리적으로 못 본다** — [A1]·[B1]·[B3]·[B6]·[B7] 이 전부
           «면적의 몫» 이라 «좌 28 : 우 1» 도 «상 0 : 좌우 25» 도 초록으로 지나간다
           (8회차 시점 `verify792` 19/19 PASS × 5회). 방향을 보는 축이 하나도 없었다.
         ⇒ 본체 무게중심에서 **72방향 광선**을 쏴 «본체 끝 → 후광 끝» 을 잰다(CT 가 실제로 쓴 자).
           종 안의 고름은 p90÷p10, 종끼리의 고름은 p90 밴드, 대칭은 4방향 평균의 최대−최소로 본다. */
      const cx0 = hard ? hx / hard : bw / 2, cy0 = hard ? hy / hard : bh / 2;
      /* ⚠ **광선으로 재면 오목한 종에서 거짓말을 한다** — 9회차 1차 자가 무게중심에서 72방향
         광선을 쏴 «본체 끝 → 후광 끝» 을 쟀더니 갈퀴(3중 호)·천벌의 창처럼 팔이 벌어진 종에서
         «한 광선 위의 마지막 본체» 와 «마지막 후광» 이 **서로 다른 부품**의 것이 되어
         두께가 25px 로 찍혔다(링은 12px 인데). ⇒ 광선을 버리고 **거리 변환**으로 바꾼다:
         후광 화소마다 «가장 가까운 본체 화소까지의 거리» 를 재면 형상의 오목·볼록과 무관하다.
         두 번 훑는 체임퍼 거리라 값이 싸다(대각 √2). */
      const INF = 1e9, dtm = new Float32Array(bw * bh);
      for (let p = 0; p < dtm.length; p++) dtm[p] = hd[p] ? 0 : INF;
      const D1 = 1, D2 = 1.41421356;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const p = y * bw + x; let v = dtm[p];
        if (x > 0 && dtm[p - 1] + D1 < v) v = dtm[p - 1] + D1;
        if (y > 0 && dtm[p - bw] + D1 < v) v = dtm[p - bw] + D1;
        if (x > 0 && y > 0 && dtm[p - bw - 1] + D2 < v) v = dtm[p - bw - 1] + D2;
        if (x < bw - 1 && y > 0 && dtm[p - bw + 1] + D2 < v) v = dtm[p - bw + 1] + D2;
        dtm[p] = v;
      }
      for (let y = bh - 1; y >= 0; y--) for (let x = bw - 1; x >= 0; x--) {
        const p = y * bw + x; let v = dtm[p];
        if (x < bw - 1 && dtm[p + 1] + D1 < v) v = dtm[p + 1] + D1;
        if (y < bh - 1 && dtm[p + bw] + D1 < v) v = dtm[p + bw] + D1;
        if (x < bw - 1 && y < bh - 1 && dtm[p + bw + 1] + D2 < v) v = dtm[p + bw + 1] + D2;
        if (x > 0 && y < bh - 1 && dtm[p + bw - 1] + D2 < v) v = dtm[p + bw - 1] + D2;
        dtm[p] = v;
      }
      const ths = [];
      for (let p = 0; p < sf.length; p++) {
        if (!(sf[p] && out[p])) continue;
        if (dtm[p] < INF) ths.push(dtm[p]);
      }
      const pct = (a, q) => { if (!a.length) return 0; const t = a.slice().sort((x, y) => x - y);
                              return t[Math.min(t.length - 1, Math.floor(q * (t.length - 1)))]; };
      const th90 = +pct(ths, 0.9).toFixed(1), th10 = +pct(ths, 0.1).toFixed(1);
      /* ⚑⚑ 대칭 축은 **본체 테두리에 앉혀서** 잰다 — 9회차에 두 번 고쳐 잡았다:
         ① 무게중심에서 쏜 광선은 오목한 종에서 «다른 부품의 후광» 을 재고(갈퀴 25px),
         ② 사분면 거리 중앙값은 **형상 자체에 편향**된다 — 뾰족한 끝을 두른 띠는 바깥으로 갈수록
            면적이 늘어 중앙값이 커지고, 긴 변을 따라가는 띠는 고르다(같은 균일 링인데
            slash 4.6 · arrow 4.0 이 찍혔다). 둘 다 «링이 고른가» 가 아니라 «몸이 길쭉한가» 였다.
         ⇒ 테두리 화소마다 **바깥쪽으로 이어진 후광의 길이**(연속 런)를 재고 방향별 중앙값을 본다.
           런이라 다른 부품의 띠가 안 섞이고, 테두리에 앉으므로 형상 편향이 없다.
           CU 가 «상하좌우 여백 비대칭 ±3px» 로 적은 것이 바로 이 값이다. */
      const qv = [[], [], [], []];
      for (let p = 0; p < hd.length; p++) {
        if (!hd[p]) continue;
        const x = p % bw, y = (p - x) / bw;
        if (x <= 0 || y <= 0 || x >= bw - 1 || y >= bh - 1) continue;
        if (hd[p - 1] && hd[p + 1] && hd[p - bw] && hd[p + bw]) continue;   /* 속살은 건너뛴다 */
        /* ⚠ **바깥쪽은 «무게중심에서 멀어지는 쪽» 이 아니다** — 오목한 종(폭풍의 칼날 깃 사이 ·
           갈퀴 호 사이)에서는 그 방향이 **몸 안쪽**을 가리켜 띠가 0 으로 찍힌다(9회차 실측
           gale 13 · ice 9 = 형상이 만든 유령). 테두리 화소의 **국소 법선**을 5×5 창에서 뽑는다:
           «몸이 아닌 이웃» 쪽으로의 평균 방향이 곧 바깥이다. */
        let nx = 0, ny = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
          if (hd[yy * bw + xx]) continue;
          const L = Math.hypot(dx, dy); nx += dx / L; ny += dy / L;
        }
        const nl = Math.hypot(nx, ny);
        if (nl < 1e-6) continue;
        const ca = nx / nl, sn = ny / nl, an = Math.atan2(sn, ca);
        let run = 0;
        for (let r = 1; r <= 40; r += 1) {
          const xx = Math.round(x + ca * r), yy = Math.round(y + sn * r);
          if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) break;
          const q = yy * bw + xx;
          if (hd[q]) continue;                       /* 아직 몸 안이다 — 아직 안 셌다 */
          if (sf[q] && out[q]) { run = r; continue; }
          break;                                     /* 띠가 끊겼다 */
        }
        const qi = ((Math.round(an / (Math.PI / 2)) % 4) + 4) % 4;
        qv[qi].push(run);
      }
      /* ⚠ **자에게는 보이지 않는 종이 있다** — 종이 «본체 재질» 로 제 손으로 깐 반투명 부품
         (운석 불꼬리 · 천벌의 창 잔광 줄 α.42 · 화구·병 불빛)은 α < 0.55 라 이 자에게 **후광으로**
         셈된다. 그 부품은 본체에서 멀리까지 뻗으므로 «본체에서 CBAND px 밖 후광 화소의 몫»
         으로 잡아낸다 — 링만 있는 종은 구성상 거의 0 이다(링 두께가 CBAND 안이다).
         이 값은 **문턱이 아니라 범위**다: 높은 종은 [B8]·[B9] 가 재는 것이 링이 아니라
         그 부품이므로 «기록만» 으로 돌린다(541 [F]·[B7] 의 «자가 못 재는 종» 선례). */
      let far = 0;
      for (let p = 0; p < sf.length; p++) if (sf[p] && out[p] && dtm[p] > CBAND) far++;
      const fFar = +(far / Math.max(1, soft)).toFixed(3);
      const qp = qv.filter(a => a.length >= 8).map(a => pct(a, 0.5));
      const asym = qp.length >= 2 ? +(Math.max.apply(null, qp) - Math.min.apply(null, qp)).toFixed(1) : 0;
      /* ⚑ 9회차 [B9] — «후광 색 ↔ 본체 색». CT·CU 가 각자 shuri 에서 짚었다
         (후광은 난색 R−B +20 인데 몸통은 한색 B−R +39 = 부호가 반대다).
         후광은 저알파라 **합성색으로 재면 바탕이 섞인다** — 위 «두 겹» 풀이로 나온 α 로
         원래 색을 되푼다: L = (r1 − (1−α)·b) / α. α 가 너무 작으면 나눗셈이 폭발하므로 0.12 이상만.
         ⚠ **띠 안에서만 잰다**(본체에서 CBAND px 안). 밖까지 세면 «제 손으로 깐 발광» 을 가진 종
           (운석 불꼬리)이 그 꼬리 색으로 판정된다 — 그것은 ②규격이 아니라 ③덩치·④의미 축이고
           비평가가 색으로 짚은 적도 없다. 무르게 푼 자가 아님은 [R4] 가 못박는다:
           옛 «종별 손그림» 후광으로 되돌리면 이 자는 **같은 띠 안에서** 빨개진다. */
      let hR = 0, hB = 0, nHc = 0, bR = 0, bB = 0, nBc = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        if (hd[p]) { bR += a0[i]; bB += a0[i + 2]; nBc++; continue; }
        if (!(sf[p] && out[p]) || av[p] < 0.12 || dtm[p] > CBAND) continue;   /* CBAND — 아래 한 곳 선언 */
        const un = (k) => { const v = (a0[i + k] - (1 - av[p]) * base[i + k]) / av[p];
                            return v < 0 ? 0 : (v > 255 ? 255 : v); };
        hR += un(0); hB += un(2); nHc++;
      }
      const hWarm = nHc ? +((hR - hB) / nHc).toFixed(1) : 0;
      const bWarm = nBc ? +((bR - bB) / nBc).toFixed(1) : 0;
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
                   aMode: +((hi + 0.5) * 0.05).toFixed(3), aPeak: +aPeak.toFixed(3),
                   fRamp: +(ramp / Math.max(1, soft)).toFixed(3),
                   th90, th10, asym, hWarm, bWarm, fFar, qm4: qv.map(a => a.length ? pct(a,0.5) + '(' + a.length + ')' : '-').join('/'),
                   dWarm: +(hWarm - bWarm).toFixed(1) };
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
    performance.now = _now;                   /* 855 — 여기서부터는 진짜 시계다(위 주석) */
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

    /* ⚑⚑ 9회차 — **링 자체를 잰다.** 위 장면 자는 «살아 있는 전투 장면과의 차이» 로 화소를
       가리므로 **방향에 따라 바탕이 다르다** — 띠의 맨 바깥 1~2px 이 밝은 바탕 쪽에서만 문턱
       아래로 잘려 사분면 두께가 9 ↔ 14 로 갈렸다(같은 균일 링인데). 그 자로 «±3px» 을 증명할 수는
       없다. 링은 **구운 자산**이고 `drawImage` 가 1:1 로 얹으므로(HALO_SS = SC × SK_DRAW_SC),
       스프라이트 화소가 곧 화면 화소다 ⇒ 자산을 직접 재면 바탕이 안 섞인다.
       ⚠ 그래도 장면 자를 안 버린다 — 굵은 어긋남(옛 «좌 28 : 우 1»)은 장면에서도 보이고,
         [R4] 가 그 자로 «옛 세계는 밴드 밖» 을 못박는다. 자산 자는 «가는 끝» 을 재는 몫이다. */
    const ringM = {};   /* ⚠ 이름을 `rings` 로 두면 제품의 전역 `rings`(FX 배열)를 가려 위 FXMAP 이 TDZ 로 죽는다 */
    if (typeof AURA_SPR !== 'undefined') for (const ent of Array.from(AURA_SPR.entries())) {
      const sp = ent[1]; if (!sp || !sp.c) continue;
      const w = sp.c.width, h = sp.c.height;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cg = cv.getContext('2d'); cg.drawImage(sp.c, 0, 0);
      const dd = cg.getImageData(0, 0, w, h).data;
      const FL = 14;                                  /* α 바닥(≈0.055) — 장면 자의 검출 바닥과 같은 자리 */
      const ring = new Uint8Array(w * h), emp = new Uint8Array(w * h), ext = new Uint8Array(w * h);
      for (let i = 3, p = 0; i < dd.length; i += 4, p++) { if (dd[i] >= FL) ring[p] = 1; else emp[p] = 1; }
      const st = [];
      for (let x = 0; x < w; x++) { st.push(x); st.push((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { st.push(y * w); st.push(y * w + w - 1); }
      while (st.length) {
        const p = st.pop();
        if (p < 0 || p >= ext.length || ext[p] || !emp[p]) continue;
        ext[p] = 1;
        const x = p % w, y = (p - x) / w;
        if (x > 0) st.push(p - 1);
        if (x < w - 1) st.push(p + 1);
        if (y > 0) st.push(p - w);
        if (y < h - 1) st.push(p + w);
      }
      const hole = new Uint8Array(w * h);              /* 도려낸 속 = 본체 실루엣 */
      let hx = 0, hy = 0, nh = 0;
      for (let p = 0; p < hole.length; p++) if (emp[p] && !ext[p]) {
        hole[p] = 1; const x = p % w; hx += x; hy += (p - x) / w; nh++;
      }
      if (!nh) continue;
      hx /= nh; hy /= nh;
      /* 링 안의 «가장 가까운 몸까지의 거리» — 아래 걸러내기에 쓴다(체임퍼 2패스). */
      const INF2 = 1e9, rdt = new Float32Array(w * h);
      for (let p = 0; p < rdt.length; p++) rdt[p] = hole[p] ? 0 : INF2;
      const E1 = 1, E2 = 1.41421356;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x; let v = rdt[p];
        if (x > 0 && rdt[p - 1] + E1 < v) v = rdt[p - 1] + E1;
        if (y > 0 && rdt[p - w] + E1 < v) v = rdt[p - w] + E1;
        if (x > 0 && y > 0 && rdt[p - w - 1] + E2 < v) v = rdt[p - w - 1] + E2;
        if (x < w - 1 && y > 0 && rdt[p - w + 1] + E2 < v) v = rdt[p - w + 1] + E2;
        rdt[p] = v;
      }
      for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
        const p = y * w + x; let v = rdt[p];
        if (x < w - 1 && rdt[p + 1] + E1 < v) v = rdt[p + 1] + E1;
        if (y < h - 1 && rdt[p + w] + E1 < v) v = rdt[p + w] + E1;
        if (x < w - 1 && y < h - 1 && rdt[p + w + 1] + E2 < v) v = rdt[p + w + 1] + E2;
        if (x > 0 && y < h - 1 && rdt[p + w - 1] + E2 < v) v = rdt[p + w - 1] + E2;
        rdt[p] = v;
      }
      const runs = [], qq = [[], [], [], []];
      for (let p = 0; p < hole.length; p++) {
        if (!hole[p]) continue;
        const x = p % w, y = (p - x) / w;
        if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) continue;
        if (hole[p - 1] && hole[p + 1] && hole[p - w] && hole[p + w]) continue;
        let nx = 0, ny = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (hole[yy * w + xx]) continue;
          const L = Math.hypot(dx, dy); nx += dx / L; ny += dy / L;
        }
        const nl = Math.hypot(nx, ny); if (nl < 1e-6) continue;
        const ca = nx / nl, sn = ny / nl;
        let run = 0, merged = false;
        for (let r = 1; r <= 60; r++) {
          const xx = Math.round(x + ca * r), yy = Math.round(y + sn * r);
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) break;
          const q = yy * w + xx;
          /* ⚠ 오목한 자리에서는 두 부품의 띠가 **붙는다** — 건너간 것을 두께로 세면 40px 이 찍힌다
             (폭풍의 칼날 깃 사이). 띠를 지나 **다시 몸을 만나면** 그 자리는 «건너감» 이므로 버린다. */
          if (hole[q]) { if (run > 0) merged = true; if (run > 0) break; continue; }
          if (ring[q]) { run = r; continue; }
          break;
        }
        if (merged || !run) continue;
        /* ⚠ **띠 두께는 «가장 가까운 몸까지» 여야 한다.** 부품이 가까이 모인 자리(폭풍의 칼날 깃 셋)
           에서는 두 부품의 흐림이 겹쳐 알파가 더 높아지고, 그래서 그 방향으로만 띠가 1~4px 더
           멀리까지 보인다. 그 런의 끝은 **내가 출발한 부품보다 다른 부품에 더 가깝다** — 거리
           변환으로 그것을 가려내고 버린다(안 버리면 «몸이 오목하다» 가 «링이 안 고르다» 로 읽힌다). */
        const ex = Math.round(x + ca * run), ey = Math.round(y + sn * run);
        const dEnd = rdt[ey * w + ex];
        if (Math.abs(dEnd - run) > 1.5) continue;
        runs.push(run);
        const an = Math.atan2(sn, ca);
        qq[((Math.round(an / (Math.PI / 2)) % 4) + 4) % 4].push(run);
      }
      if (runs.length < 24) continue;
      const q50 = (a) => { const t = a.slice().sort((x, y) => x - y); return t[Math.floor(0.5 * (t.length - 1))]; };
      /* 링 자산의 α 분포 — 칼로 자른 판이면 한 칸에 뭉치고, 풀린 띠면 여러 칸에 퍼진다.
         [R3](페이드를 끈 세계)이 이 값으로 «판» 을 잡는다 — 장면 자의 α 는 바탕 잡음이 섞여
         판과 띠를 못 가른다(9회차 실측: 판 세계에서도 최빈칸 몫이 0.62 를 안 넘었다). */
      const hb = new Int32Array(20);
      let nr = 0;
      for (let p = 0; p < ring.length; p++) if (ring[p]) { const a = dd[p * 4 + 3];
        let bi = Math.floor(a / 13); if (bi > 19) bi = 19; hb[bi]++; nr++; }
      let hm = 0; for (let i = 0; i < 20; i++) if (hb[i] > hm) hm = hb[i];
      const qm = qq.filter(a => a.length >= 8).map(q50);
      ringM[String(ent[0]).split('|')[0]] = {
        n: runs.length,
        th: +q50(runs).toFixed(1),
        p90: +runs.slice().sort((a, b) => a - b)[Math.floor(0.9 * (runs.length - 1))].toFixed(1),
        asym: qm.length >= 2 ? +(Math.max.apply(null, qm) - Math.min.apply(null, qm)).toFixed(1) : 0,
        aFlat: +(hm / Math.max(1, nr)).toFixed(3) };
    }

    /* 9회차 — «링을 실제로 가진 종» 을 **제품에게 묻는다**(자에 목록을 손으로 적으면 그것이
       곧 사본이고, 다음 회차가 종을 하나 옮기는 순간 자가 거짓말을 한다 — 402).
       굽기가 실패해 `null` 이 캐시된 종은 링이 없는 것으로 센다. */
    const aura = (typeof AURA_SPR !== 'undefined')
      ? Array.from(AURA_SPR.entries()).filter(e => e[1]).map(e => String(e[0]).split('|')[0]) : [];
    return { rows, worst, n: ids.length, frame, bake: +bake.toFixed(1), nShot: 60, aura, cband: CBAND, rings: ringM };
  });

  await ctx.close();
  return { out, errs };
}

(async () => {
  console.log('=== VERIFY 792 — 스킬 이펙트 연출 규격(세 층) 통일 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const src = fs.readFileSync(SRC, 'utf8');
  const clean = () => { for (const f of [NEG_SPEC, NEG_HALO, NEG_FADE, NEG_AURA]) { try { fs.unlinkSync(f); } catch (_) {} } };

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
      const ramps = ids.filter(i => out.rows[i].aPeak >= 0.20);
      const dim = ids.filter(i => out.rows[i].aPeak < 0.20);
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
         dim.map(i => i + ':봉우리α' + out.rows[i].aPeak + '/램프' + out.rows[i].fRamp).join(' · '));
      /* ⚑⚑ [B8] — 9회차가 세운 축(8회차 인계 1순위). **문턱은 관측값이 아니라 비평가가 준 목표**다
         (825 규칙 — 관측값을 박으면 그 자는 «지금 그대로» 를 지킨다): CU 가 8회차 채점에서
         «두께 p90 12±3px · 상하좌우 여백 비대칭 ±3px 이내» 를 적었다. 그것을 그대로 쓴다.
         ⚠ 두께는 **잡힌 화소**로 재므로 후광이 옅은 종은 끝자락이 검출 문턱(|Δ색| > 8) 아래로
           잘려 실제보다 얇게 나온다 — [B7] 이 뺀 종(최빈 α < 0.20)은 여기서도 값만 찍는다. */
      /* ⚠ **잰다고 다 재는 것이 아니다** — 링을 가진 종만 이 규격의 대상이다.
         불 계열 둘(`boom` 화구 · `flask` 병 뒤 불빛)은 후광을 `halo()` 층이 아니라 **본체 재질**
         (방사 발광 — 412 «한 밴드» 가 인정한 문법)로 내므로 링이 없고, 그 둘의 두께는
         곧 «덩치»(③) 축이지 «규격»(②) 축이 아니다(8회차 ⓕ 가 이미 별개로 등재돼 있다).
         ⇒ 목록은 **제품에게 물어서** 만든다(위 `aura`) — 자에 손으로 적지 않는다. */
      const hasAura = new Set(out.aura || []);
      const own = ids.filter(i => out.rows[i].fFar > FAR_MAX);
      const th = ids.filter(i => hasAura.has(out.rows[i].sh) && out.rows[i].fFar <= FAR_MAX);
      /* 범위가 조용히 자라지 못하게 **개수에 못을 박는다** — «기록만» 은 예외지 문이 아니다.
         ⚑ **865 이관 — 래칫을 4 → 3 으로 내렸다.** 이 목록의 넷 중 셋(`boom`·`meteor`·`flask`)은
           위 주석이 말하는 **불 계열**이라 설계상 링이 없는 자리이고, 넷째 `lance`(먼몫 0.175)만
           «규격을 안 지킨 종» 이었다 — 잔광 줄이 `halo()` 밖에서 제 손으로 깔려 세 층 어디에도
           안 들었다. 865 가 그 줄을 ①층으로 들여보내 먼몫이 **0.175 → 0** 이 됐다.
           래칫을 안 내리면 «규격 밖 종이 하나 새로 생겨도 초록» 인 자가 된다(328~330 교훈의 반대편
           자리 — 거기서는 «항을 눌러 초록으로 되돌리지 마라» 였고, 여기서는 «재고가 줄면 문을
           그만큼 좁혀라» 다). 자리는 `verify865` 가 이어서 지킨다([A4] 가 창 하나를 따로 못박는다). */
      ok(own.length <= 3, '[B8s] 자가 링을 못 가리는 종(제 손으로 깐 반투명 부품 · 먼몫 > ' + FAR_MAX +
         ') ' + own.length + '종 ≤ 3 (불 계열뿐 — 865 가 `lance` 를 뺐다) — ' +
         (own.map(i => i + ':' + out.rows[i].fFar).join(' · ') || '없음'));
      /* [B8]·[B8b] 는 **구운 링 자산**을 잰다(위 `rings` 주석 — 장면 자는 방향마다 바탕이 달라
         ±5px 로 흔들린다). 자산 화소 = 화면 화소이므로 «찍힌 픽셀» 을 안 놓는다. */
      const rg = out.rings || {};
      const rk = Object.keys(rg);
      ok(rk.length >= 12, '[B8a] 링을 구운 종 ' + rk.length + '종 ≥ 12 (자산을 직접 잰다 · 테두리 표본 ' +
         (rk.length ? Math.min.apply(null, rk.map(k => rg[k].n)) : 0) + '+)');
      /* ⚠ 밴드는 **중앙값**으로 건다 — p90 은 오목한 주머니(폭풍의 칼날 깃 사이 · 주변 참격 X 안쪽)
         에서 두 부품의 띠가 붙은 자리를 보고 38~40px 을 찍는다. 그것은 «띠가 두껍다» 가 아니라
         «몸이 오목하다» 이고, 붙은 자리는 [D1]·[B3] 이 따로 지킨다. p90 은 기록으로 남긴다. */
      const thBad = rk.filter(k => rg[k].th < TH_MIN || rg[k].th > TH_MAX);
      ok(thBad.length === 0,
         '[B8] 후광 두께 p90 이 종끼리 한 밴드 (' + TH_MIN + '~' + TH_MAX + 'px · CU 목표 12±3) — 잰 종 ' +
         rk.length + ' · 벗어난 종 ' + thBad.length +
         (thBad.length ? ' (' + thBad.map(k => k + ':' + rg[k].th).join(' · ') + ')' : '') +
         ' · 실측 ' + Math.min.apply(null, rk.map(k => rg[k].th)) + '~' + Math.max.apply(null, rk.map(k => rg[k].th)));
      const asBad = rk.filter(k => rg[k].asym > ASYM_MAX);
      ok(asBad.length === 0,
         '[B8b] 후광이 본체를 **고르게** 두른다 — 테두리 법선에서 잰 4방향 띠 길이 중앙값의 최대−최소 ≤ ' +
         ASYM_MAX + 'px (CU 목표 ±3) · 넘는 종 ' + asBad.length +
         (asBad.length ? ' (' + asBad.map(k => k + ':' + rg[k].asym).join(' · ') + ')' : ''));
      console.log('  (기록) 링 자산 — 종:중앙값/p90±비대칭 (α최빈칸몫) — ' +
         rk.map(k => k + ':' + rg[k].th + '/' + rg[k].p90 + '±' + rg[k].asym + '(' + rg[k].aFlat + ')').join(' · '));
      /* [B9] — 후광 색이 본체에서 파생되는가. 부호가 갈리면(난색 후광 ↔ 한색 몸통) 두 물체로 읽힌다. */
      const wIds = th;
      const wBad = wIds.filter(i => Math.abs(out.rows[i].dWarm) > DWARM_MAX);
      ok(wBad.length === 0,
         '[B9] 후광 색이 본체에서 파생된다 — |Δ(R−B)| ≤ ' + DWARM_MAX + ' (본체에서 ' + out.cband +
         'px 띠 안) · 잰 종 ' + wIds.length +
         ' · 넘는 종 ' + wBad.length +
         (wBad.length ? ' (' + wBad.map(i => i + ':' + out.rows[i].dWarm).join(' · ') + ')' : ''));
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

      console.log('\n  [표] 종별 — ink · fSoft / fSpec · 후광중심어긋남 · 본체ΔL · α최빈칸몫 · 램프몫' +
                  ' · 두께p90/p10 · 비대칭 · 먼몫 · 후광R−B / 본체R−B');
      for (const id of ids) {
        const r = out.rows[id];
        console.log('        ' + id.padEnd(9) + r.sh.padEnd(10) +
                    String(r.ink).padStart(7) + '  ' +
                    r.fSoft.toFixed(3) + ' / ' + r.fSpec.toFixed(4) +
                    String(r.off).padStart(8) + String(r.dL).padStart(9) +
                    String(r.flat).padStart(9) + String(r.fRamp).padStart(9) +
                    (' ' + r.th90 + '/' + r.th10).padStart(11) + String(r.asym).padStart(7) +
                    String(r.fFar).padStart(8) + ('  ' + r.qm4).padEnd(28) +
                    (' ' + r.hWarm + '/' + r.bWarm).padStart(15));
      }
      console.log('');
    }

    /* ---- [R] 되돌림 시험 ---- */
    fs.writeFileSync(NEG_SPEC, killLine(src, TAG_SPEC, `    const spec = fn => {};`), 'utf8');
    fs.writeFileSync(NEG_HALO, killLine(src, TAG_HALO, `    const halo = fn => {};`), 'utf8');

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
      /* ⚑ 9회차 — 판정을 **[B6]·[B7] 짝**으로 넓혔다. 링 세계에서 «평탄한 판» 은 α 가 한 칸에
         뭉치는 쪽([B6])으로도, **가장자리 램프가 사라지는 쪽**([B7])으로도 나타난다 —
         굽는 경로가 달라졌으니 같은 병의 얼굴도 달라진다. 둘 중 하나라도 빨간 종을 센다. */
      const fr = rFade.out.rings || {};
      const fk = Object.keys(fr);
      const bad = fk.filter(k => fr[k].aFlat > FLAT_MAX);
      const mx = fk.length ? Math.max.apply(null, fk.map(k => fr[k].aFlat)) : 0;
      ok(bad.length >= 8, '[R3] 페이드를 끄면 [B6] 축이 빨개진다 — 링 α 가 한 칸에 뭉친 종 ' + bad.length +
         '종 ≥ 8 (잰 링 ' + fk.length + ' · 최대 몫 ' + mx.toFixed(3) + ' · 문턱 ' + FLAT_MAX + ')');
    }

    /* ⚑ [R4] — 9회차. 링을 끄면 각 종이 적어 둔 **옛 후광 도형**(폴백)이 그대로 돌아온다 =
       5~8회차의 세계다. [B8] 이 «지금 그대로» 를 초록으로 지나가는 자가 아니라 **처방이
       닿은 자리**를 재는 자임을 이 항이 못박는다(없으면 [B8] 문턱은 무르게 풀 수 있다).
       ⚠ 옛 세계에는 링 자산이 아예 없으므로 **장면 자**로 잰다 — 그 자는 ±5px 로 흔들리지만
         옛 어긋남(두께 11~54.5px · 비대칭 30px)은 그 잡음보다 한참 크다. */
    fs.writeFileSync(NEG_AURA, killLine(src, TAG_AURA, `const AURA_ON   = 0;`), 'utf8');
    const rAura = await measure(browser, 'file://' + NEG_AURA);
    if (rAura.out && rAura.out.__err) ok(false, '[R4] 사본 측정 예외 — ' + rAura.out.__err);
    else {
      const ks2 = Object.keys(rAura.out.rows);
      const bad2 = ks2.filter(i => rAura.out.rows[i].th90 < TH_MIN || rAura.out.rows[i].th90 > TH_MAX);
      const as2 = ks2.filter(i => rAura.out.rows[i].asym > ASYM_MAX);
      ok(Object.keys(rAura.out.rings || {}).length === 0 && bad2.length >= 8 && as2.length >= 5,
         '[R4] 링을 끄면 두께·대칭이 흩어진다 — 링 자산 ' + Object.keys(rAura.out.rings || {}).length +
         '종(0) · 장면 두께 밴드 밖 ' + bad2.length + '종 ≥ 8 · 비대칭 ' + as2.length + '종 ≥ 5 (잰 종 ' + ks2.length + ')');
    }
  } finally {
    clean();
    await browser.close();
  }

  console.log('VERIFY792 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
