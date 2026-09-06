/* 작업 683 — **14회차 재현자**: 네 비평가(CR·CS·CT·CU)가 두 회차에 걸쳐 같은 한 줄로 처방한
 * «④ 알을 screen/가산 합성으로» 를 **처방보다 먼저** 잰다(338 규칙).
 *
 *   node tools/probe683e.js
 *
 * ── 무엇을 묻는가 ─────────────────────────────────────────────────────────
 * §13-5-3 1번의 처방문은 **두 문장**이다. 자는 그 둘을 갈라 각각 참·거짓을 묻는다:
 *
 *   [2] «(14회차 이전) 알이 밑 글리프를 어둡게 한다» — CT 「글리프 휘도 −84.4%」 · CU 「−79.2% ·
 *       잉크:판 10.66:1 → 2.07:1 극성 반전」 을 **같은 마스크**로 재현한다.
 *       마스크는 정착 프레임에서 **한 번만** 뜬다(10회차 생존자 편향 규약 · `probe683c` §10-3).
 *   [3] «`mix-blend-mode:screen` 을 걸면 낫는가» — **안 낫는다(그리고 이유가 처음 생각과 다르다).**
 *       ⚠ 이 자의 1판은 «Δ0 = 아무 일도 안 일어난다» 를 예상했는데 **실측이 그 가설을 기각했다** —
 *       screen 사본은 잉크를 t0 에 +38.2 만큼 **밝히긴 한다**. 그 밝힘의 출처는 카드가 아니라
 *       `#fxl` **안**의 플래시 판이다(그룹 안끼리만 섞인다). 격리 자체는 [3-a] 가 직접 못박는다 —
 *       레이어 안에 «검은 판 + screen» 을 넣어도 카드 위에서 **rgb 0,0,0 그대로**다.
 *       그래서 최악 프레임의 **극성이 안 고쳐진다**(screen 1.22:1 «반전» ↔ 현행 2.02:1 «반전»).
 *   [4] 그러면 무엇이 그 뜻을 이루는가 — **채움의 극성을 뒤집는 것**(FLIP: 밝은 채움 + 어두운 테).
 *       알은 «그 글리프와 같은 모양·같은 자리»(753 주인 확정)라 **채움은 잉크 위에, 테는 판 위에**
 *       내려앉는다. 채움이 밝으면 잉크가 밝아지고 테가 어두우면 판이 어두워져 **극성이 구조적으로
 *       보존된다**. 5회차가 세운 «세 바탕(≈40 · 140~200 · 238~254)» 논증도 양끝을 그대로 갖는다.
 *
 * 세 사본은 전부 **주입 CSS 한 장**으로 만든다(제품을 안 건드리고 잰다).
 *
 * 종료 코드: 0 통과 · 1 FAIL (환경 없음은 `pwlaunch`/`png913` 이 코드 2 로 낸다)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚑⚑ **997 이관 — 이 자는 «자기 자신» 을 견주고 있었다.** `VARIANT.BASE` 가 «아무것도 안 덮음» 이라
   14회차가 FLIP 을 **제품에 심은 순간** BASE ≡ FLIP 이 됐다(실측: [2-a] 잉크 −50% 를 물었는데
   정착 대비 **+5.2%** · [4-b] «FLIP 이 현행보다 밝다» 가 t0 Δ0.0). 자가 죽은 게 아니라
   **견줄 상대가 사라진** 것이다 — 그래서 사본을 «13회차 상태»(검은 채움 + 여덟 방향 흰 테)로
   **주입해서** 적는다. 값은 손으로 안 적고 **제품 사슬에서 파생**시킨다(402 «표 두 벌» 금지 ·
   `verify753` [B2c] 가 같은 파생을 쓴다 — 되돌리는 자리는 둘뿐: `invert(1)` 을 빼고 테 색을 흰색으로).
   ⚠ SCREEN 도 같이 옮겼다 — 처방문의 물음은 «13회차 알에 screen 을 걸면 낫는가» 이므로
     사본은 **13회차 사슬 + `mix-blend-mode:screen`** 이어야 한다(제품 위에 걸면 FLIP 이 이미
     극성을 고쳐 둔 뒤라 [5-c] 가 «screen 도 정상» 으로 헛빨강이 된다).
   ⚠ 문턱은 한 칸도 안 넓혔다(333 처방 — 재는 나무만 그 물음이 사는 나무로 옮겼다). */
/* ⚑ **994 이관** — 이 자는 `currentTime` 을 태생 프레임(t0)부터 재는데 994 가 태생 α 를 `.10` 으로
   낮춰(10% 에 `.55`) **태생 프레임의 씻김이 거의 사라졌다**. 사본 셋 전부에 되돌림 키프레임을
   같이 건다(`probe683d` [2]·[3] · `probe683c` [3-a] · `verify753` [B2] 가 그렇게 이관됐다 ·
   곡선은 공용 부품 `tools/kf994.js` 가 제품에서 파생한다 — 봉우리를 누가 옮겨도 사본이 따라온다). */
const KF14 = require('./kf994').kfPre994();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ID = 'rl0';
const STOPS = [0, 40, 80, 130];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; } };
const r2 = v => (v == null ? '—' : Math.round(v * 100) / 100);

/* 세 사본 — 제품 CSS 를 덮어쓰는 주입 한 장(`__p5v`).
   **BASE·SCREEN 은 실행 시각에 제품 사슬에서 파생**한다(아래 «13회차 사슬» 절 · 997). */
const VARIANT = {
  BASE:   null,
  SCREEN: null,
  /* FLIP — 채움 흰색(`brightness(0) invert(1)`) + 여덟 방향 **어두운** 테 + 같은 글로우.
     겹 수·두께·글로우 순서는 5회차 것을 한 값도 안 바꾼다(바뀌는 것은 «어느 쪽이 밝은가» 뿐). */
  FLIP:   '.fx-spark.fx-rlic{filter:brightness(0) invert(1)'
        + ' drop-shadow(0 2px 0 #140D04) drop-shadow(0 -2px 0 #140D04)'
        + ' drop-shadow(2px 0 0 #140D04) drop-shadow(-2px 0 0 #140D04)'
        + ' drop-shadow(1.4px 1.4px 0 #140D04) drop-shadow(-1.4px -1.4px 0 #140D04)'
        + ' drop-shadow(1.4px -1.4px 0 #140D04) drop-shadow(-1.4px 1.4px 0 #140D04)'
        + ' drop-shadow(0 0 6px var(--c,#FFE07A))}'
};

/* 프레임 한 장 — `probe683d` 의 SHOT 과 같은 규약(같은 것을 재려면 같은 자리를 얼린다). */
const SHOT = async ({ T, RID, VAR, NOGAIN, KF }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__p5to) { window.__p5to = window.setTimeout; window.__p5ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  /* 994 되돌림 키프레임 — **스폰 전에** 갈아야 한다(키프레임은 애니가 붙을 때 굳는다). */
  const k9 = document.getElementById('__p5kf'); if (k9) k9.remove();
  if (KF) { const t = document.createElement('style'); t.id = '__p5kf';
    t.textContent = KF; document.head.appendChild(t); }
  const old = document.getElementById('__p5v'); if (old) old.remove();
  let css = VAR || '';
  if (NOGAIN) css += '.fx-spark.fx-rlic{display:none !important}';
  if (css) { const t = document.createElement('style'); t.id = '__p5v'; t.textContent = css; document.head.appendChild(t); }
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  if (T >= 0) rwSummonFx(it, true, null);
  try { document.getAnimations().forEach(a => {
    const tg = a.effect && a.effect.target;
    if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
    else { a.pause(); try { a.finish(); } catch (_) {} }
  }); } catch (e) {}
  const el = document.querySelector('[data-rw="' + RID + '"]');
  const i = el.querySelector('i'), c = el.getBoundingClientRect(), b = i.getBoundingClientRect();
  let nR = 0; if (L) for (const nd of L.children) if (/fx-rlic/.test(nd.className + '')) nR++;
  /* 아이콘 상자는 카드 밖으로 −40px 씩 넓다(`.rw-c>i`) — **카드와 겹치는 구간만** 본다 */
  return { nR,
    box: { x: Math.round(Math.max(b.x, c.x)), y: Math.round(Math.max(b.y, c.y)),
           w: Math.round(Math.min(b.right, c.right) - Math.max(b.x, c.x)),
           h: Math.round(Math.min(b.bottom, c.bottom) - Math.max(b.y, c.y)) } };
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RID => { for (let i = 0; i < 4000 && !has(RID); i++) summonRelic(true);
    renderRelw(); return has(RID) ? oLv(RID) : null; }, ID);

  const shot = async o => {
    const st = await ev(p, SHOT, Object.assign({ RID: ID, T: 0, KF: KF14 }, o));
    if (!st) return null;
    return { st, png: (await p.screenshot()).toString('base64') };
  };

  /* ── [0] 13회차 사슬 — 사본을 **제품에서 파생**한다(997) ─────────────────
     되돌리는 자리는 둘뿐이다: ① `invert(1)` 을 뺀다(채움 흰색 → 검정) ② **테** 색을 흰색으로.
     ⚠ 글로우(마지막 겹)는 14회차가 한 값도 안 건드렸으므로 **그대로 둔다** — 그래서 색 치환은
       `lastIndexOf('drop-shadow(')` 앞의 테 구간에만 건다(`verify753` [B2c] 와 같은 가름). */
  blk('0] 사본 — «13회차 상태»(검은 채움 + 여덟 방향 흰 테)를 제품 사슬에서 파생한다 (997)');
  await ev(p, SHOT, { RID: ID, T: 0, KF: KF14 });
  const chain = await ev(p, () => {
    const nd = document.querySelector('#fxl .fx-rlic'); if (!nd) return null;
    const f = getComputedStyle(nd).filter || '';
    const cut = f.lastIndexOf('drop-shadow(');
    return { full: f.replace(/\s+/g, ' ').trim(),
             ring: cut > 0 ? f.slice(0, cut).replace(/\s+/g, ' ').trim() : '',
             tail: cut > 0 ? f.slice(cut).replace(/\s+/g, ' ').trim() : '',
             n: (f.match(/drop-shadow\(/g) || []).length };
  });
  const pre14 = (chain && chain.ring && chain.tail)
    ? (chain.ring.replace(/\binvert\(1\)\s*/i, '').replace(/rgba?\([^)]*\)|#[0-9A-Fa-f]{3,8}/g, '#FFF')
       + ' ' + chain.tail).replace(/\s+/g, ' ').trim()
    : null;
  VARIANT.BASE = pre14 ? '.fx-spark.fx-rlic{filter:' + pre14 + '}' : null;
  VARIANT.SCREEN = pre14 ? VARIANT.BASE + '.fx-spark.fx-rlic{mix-blend-mode:screen}' : null;
  /* ⚠ 판정은 **`pre14`(파생값)가 아니라 실제로 주입되는 `VARIANT.BASE`** 를 읽는다 —
     자 1판이 파생값을 물어서, 사본을 제품과 같게 바꿔 놓은 되돌림 사본에서도 [0] 두 항이
     초록으로 남았다(빨개진 것은 [2]·[4]·[5] 뿐). «무엇을 재는가» 는 **주입되는 문자열**이다. */
  const baseF = VARIANT.BASE ? VARIANT.BASE.replace(/^[^{]*\{\s*filter\s*:/, '').replace(/\}\s*$/, '').trim() : null;
  const ringOf = s => (s && s.lastIndexOf('drop-shadow(') > 0) ? s.slice(0, s.lastIndexOf('drop-shadow(')) : '';
  info('제품 사슬', chain ? (chain.full.slice(0, 96) + (chain.full.length > 96 ? '…' : '')
    + ' · 겹 ' + chain.n) : '측정 실패');
  info('13회차 사본', baseF ? (baseF.slice(0, 96) + (baseF.length > 96 ? '…' : '')) : '파생 실패');
  ok(!!baseF && !/invert\(1\)/i.test(baseF) && /brightness\(0\)/.test(baseF)
     && (ringOf(baseF).match(/#FFF/g) || []).length === 8,
     '0-a ★ 사본이 «검은 채움 + 흰 테 여덟 겹» 이다(값은 제품에서 파생 · 손 상수 0개)',
     baseF ? ('invert ' + (/invert\(1\)/i.test(baseF) ? '있음' : '없음') + ' · 흰 테 '
       + (ringOf(baseF).match(/#FFF/g) || []).length + '겹') : '파생 실패');
  /* ⚑ **이 항이 997 그 자체다** — 사본이 제품과 같아지면(누가 극성을 되돌리거나, 사본 파생이
     조용히 비면) 이 자의 [2]·[4]·[5] 는 전부 «자기 자신» 을 견주게 된다. 그때 빨개진다. */
  ok(!!baseF && !!chain && baseF !== chain.full && /invert\(1\)/i.test(chain.full),
     '0-b ★ **되돌림 감시** — 사본이 제품 사슬과 실제로 다르다(BASE ≢ 제품 · 997 재발 방지)',
     chain ? ('제품 invert ' + (/invert\(1\)/i.test(chain.full) ? '있음' : '**없음**')
       + ' · 사본 ' + (baseF === chain.full ? '**같다**' : '다르다')) : '측정 실패');
  /* screen 사본도 **같은 13회차 사슬** 위에 서야 처방문의 물음이 된다(그 위에 blend 한 줄만 더한다). */
  ok(!!VARIANT.SCREEN && !!baseF && VARIANT.SCREEN.indexOf(baseF) >= 0
     && /mix-blend-mode:\s*screen/.test(VARIANT.SCREEN),
     '0-d ★ screen 사본이 «13회차 사슬 + `mix-blend-mode:screen`» 이다(제품 위가 아니다)',
     VARIANT.SCREEN ? ('13회차 사슬 ' + (VARIANT.SCREEN.indexOf(baseF) >= 0 ? '포함' : '**빠짐**')
       + ' · blend ' + (/mix-blend-mode:\s*screen/.test(VARIANT.SCREEN) ? '있음' : '**없음**')) : '파생 실패');
  info('994 되돌림 키프레임', KF14 ? KF14.replace(/\s+/g, ' ').slice(0, 110) : '없음');
  ok(!!KF14 && !/\d+%\{opacity:[.\d]+\}/.test(KF14),
     '0-c ★ 사본 셋이 «태생 α 램프를 되돌린» 나무에서 돈다(994 이관 · `tools/kf994.js` 파생)',
     KF14 ? ('램프 ' + (/\d+%\{opacity:[.\d]+\}/.test(KF14) ? '남음' : '걷힘')) : '파생 실패');
  if (!pre14) { console.log('\nPROBE683E ' + pass + '/' + (pass + fail) + ' FAIL — 사본을 못 세웠다');
    await browser.close(); process.exit(1); }

  /* ── [1] 잉크·판 마스크 — 정착 프레임에서 **한 번만** 뜬다 ───────────── */
  blk('1] 마스크 — 정착 프레임의 «글리프 잉크 ↔ 그 판»(한 번만 뜬다 · 10회차 규약)');
  const settle = await shot({ T: -1, NOGAIN: true });
  if (!settle) { console.log('  FAIL 정착 프레임을 못 떴다'); process.exit(1); }
  const box = settle.st.box;
  info('아이콘 상자(카드와 겹치는 구간)', box.x + ',' + box.y + ' ' + box.w + '×' + box.h);

  const mask = await ev(p, async ({ a, box }) => {
    const load = u => new Promise((okf, no) => { const im = new Image(); im.onload = () => okf(im); im.onerror = no; im.src = 'data:image/png;base64,' + u; });
    const ia = await load(a);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    c.getContext('2d').drawImage(ia, 0, 0);
    const d = c.getContext('2d').getImageData(box.x, box.y, box.w, box.h).data;
    const lum = i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const vs = []; for (let i = 0; i < d.length; i += 4) vs.push(lum(i));
    const srt = vs.slice().sort((x, y) => x - y);
    const q = f => srt[Math.floor((srt.length - 1) * f)];
    const hi = q(0.80), lo = q(0.30);          /* 잉크 = 상위 20% · 판 = 하위 30% */
    const ink = [], plate = [];
    for (let k = 0; k < vs.length; k++) { if (vs[k] >= hi) ink.push(k); else if (vs[k] <= lo) plate.push(k); }
    window.__p5mask = { ink, plate };
    return { nInk: ink.length, nPlate: plate.length, hi: Math.round(hi), lo: Math.round(lo),
             mInk: Math.round(ink.reduce((s, k) => s + vs[k], 0) / ink.length),
             mPlate: Math.round(plate.reduce((s, k) => s + vs[k], 0) / plate.length) };
  }, { a: settle.png, box });
  info('정착 잉크', mask.nInk + '화소 · 평균 L ' + mask.mInk + '(문턱 ' + mask.hi + ')');
  info('정착 판', mask.nPlate + '화소 · 평균 L ' + mask.mPlate + '(문턱 ' + mask.lo + ')');
  ok(mask.nInk > 300 && mask.nPlate > 300 && mask.mInk > mask.mPlate,
     '1-a ★ 정착에서 잉크가 판보다 밝다(극성의 기준선)',
     '잉크 ' + mask.mInk + ' ↔ 판 ' + mask.mPlate);

  /* WCAG 대비비 — 8bit sRGB 근사(자 안에서 셋을 같은 식으로 재기만 하면 된다) */
  const meas = async (v, T) => {
    const s = await shot({ T, VAR: VARIANT[v] });
    if (!s) return null;
    return await ev(p, async ({ a, box }) => {
      const load = u => new Promise((okf, no) => { const im = new Image(); im.onload = () => okf(im); im.onerror = no; im.src = 'data:image/png;base64,' + u; });
      const ia = await load(a);
      const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
      c.getContext('2d').drawImage(ia, 0, 0);
      const d = c.getContext('2d').getImageData(box.x, box.y, box.w, box.h).data;
      const lum = i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const m = window.__p5mask;
      const avg = arr => arr.reduce((s2, k) => s2 + lum(k * 4), 0) / arr.length;
      const rl = L8 => { const f = ch => { const s2 = ch / 255; return s2 <= 0.04045 ? s2 / 12.92 : Math.pow((s2 + 0.055) / 1.055, 2.4); }; return f(L8); };
      const mi = avg(m.ink), mp = avg(m.plate);
      const hiV = Math.max(rl(mi), rl(mp)), loV = Math.min(rl(mi), rl(mp));
      return { ink: Math.round(mi * 10) / 10, plate: Math.round(mp * 10) / 10,
               ratio: Math.round(((hiV + 0.05) / (loV + 0.05)) * 100) / 100,
               inverted: mi < mp };
    }, { a: s.png, box });
  };

  /* ── [2] 재현 — 현행(BASE)이 밑 글리프를 어둡게 하는가 ────────────────── */
  blk('2] 재현 — 현행 알이 «자기 밑 글리프» 를 어둡게 하는가 (CT −84.4% · CU −79.2%)');
  const base = {};
  for (const T of STOPS) { base[T] = await meas('BASE', T);
    info('t' + T + 'ms', base[T] ? ('잉크 L ' + base[T].ink + '(정착 대비 '
      + Math.round((base[T].ink / mask.mInk - 1) * 1000) / 10 + '%) · 판 L ' + base[T].plate
      + ' · 잉크:판 ' + base[T].ratio + ':1' + (base[T].inverted ? ' · **극성 반전**' : '')) : '측정 실패'); }
  /* ⚠ 누산기가 «t0» 이라 `!a` 로 비면 **0 이 falsy 라 첫 시각이 늘 밀린다**(자 1판이 그래서 t40 을
     최악으로 골랐다 — 실제 최악은 t0 이다). 빈 값은 `null` 로만 판정한다. */
  const worst = STOPS.reduce((a, T) => (base[T] && (a === null || base[T].ink < base[a].ink) ? T : a), null);
  ok(worst !== null && base[worst].ink < mask.mInk * 0.5,
     '2-a ★ 재현됨 — 현행 알이 밑 글리프 잉크를 정착의 절반 아래로 끌어내린다',
     worst === null ? '측정 실패' : ('t' + worst + 'ms 잉크 ' + base[worst].ink + ' ↔ 정착 ' + mask.mInk
       + ' (' + Math.round((base[worst].ink / mask.mInk - 1) * 1000) / 10 + '%)'));
  ok(worst !== null && base[worst].inverted,
     '2-b ★ 재현됨 — 그 프레임에서 잉크가 판보다 **어둡다**(극성 반전 · CU 2.43배)',
     worst === null ? '측정 실패' : ('잉크 ' + base[worst].ink + ' ↔ 판 ' + base[worst].plate));

  /* ── [3] 처방문 그대로 — screen 은 «카드» 에 안 닿고, 대신 «알» 을 지운다 ── */
  blk('3] 처방문 그대로 — screen 이 실제로 하는 일');
  const scr = {}; for (const T of STOPS) { scr[T] = await meas('SCREEN', T);
    info('t' + T + 'ms', (scr[T] && base[T]) ? ('screen 잉크 ' + scr[T].ink + '(현행 ' + base[T].ink
      + ' · Δ' + r2(scr[T].ink - base[T].ink) + ') · 잉크:판 ' + scr[T].ratio + ':1'
      + (scr[T].inverted ? ' · **극성 반전**' : '')) : '측정 실패'); }
  /* 3-a — **격리의 직접 증거**: `#fxl` 안에 검은 판을 하나 넣고 screen 을 걸어 본다.
     그룹 밖(카드)에 닿는다면 카드 색이 그대로 나와야 하는데, 실제로는 **검정이 그대로 남는다**. */
  /* ⚠ **레이어를 먼저 비운다(997)** — 이 항은 «그룹 **밖**(카드)에 닿는가» 하나만 묻는데, 앞 절이
     남긴 알·플래시 판이 같은 그룹 안에 있으면 screen 이 **그것들과** 섞여 표본 화소가 위상마다
     달라진다(실측: 같은 트리 연속 두 판이 rgb 0,0,0 ↔ 44,25,22 — 문턱 24 를 넘나든다).
     비우고 재면 판정이 «격리되어 있으면 검정, 아니면 카드 색» 둘 중 하나로 굳는다. */
  const isoPix = await ev(p, () => {
    const L = document.getElementById('fxl'); if (!L) return null;
    while (L.firstChild) L.removeChild(L.firstChild);
    const el = document.querySelector('[data-rw="rl0"]'); const r = el.getBoundingClientRect();
    const d = document.createElement('div'); d.id = '__p5iso';
    d.style.cssText = 'position:absolute;left:' + Math.round(r.x + 20) + 'px;top:' + Math.round(r.y + 20)
      + 'px;width:24px;height:24px;background:#000;mix-blend-mode:screen';
    L.appendChild(d);
    return { x: Math.round(r.x + 30), y: Math.round(r.y + 30) };
  });
  let isoRGB = null;
  if (isoPix) {
    const png = (await p.screenshot()).toString('base64');
    isoRGB = await ev(p, async ({ a, x, y }) => {
      const load = u => new Promise((okf, no) => { const im = new Image(); im.onload = () => okf(im); im.onerror = no; im.src = 'data:image/png;base64,' + u; });
      const ia = await load(a); const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
      c.getContext('2d').drawImage(ia, 0, 0);
      const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
      const o = document.getElementById('__p5iso'); if (o) o.remove();
      return [d[0], d[1], d[2]];
    }, { a: png, x: isoPix.x, y: isoPix.y });
  }
  ok(!!isoRGB && isoRGB[0] + isoRGB[1] + isoRGB[2] <= 24,
     '3-a ★ 격리 증거 — `#fxl` 안의 «검은 판 + screen» 이 카드 위에서 **그대로 검정**이다(그룹 밖에 안 닿는다)',
     isoRGB ? ('rgb ' + isoRGB.join(',')) : '측정 실패');
  const isol = await ev(p, () => { const L = document.getElementById('fxl'); const cs = getComputedStyle(L);
    return { z: cs.zIndex, pos: cs.position, tr: cs.transform !== 'none', ct: cs.contain }; });
  info('격리의 근거', isol ? ('#fxl — position ' + isol.pos + ' · z-index ' + isol.z
    + ' · transform ' + (isol.tr ? '있음' : '없음') + ' · contain ' + isol.ct) : '측정 실패');
  ok(!!isol && isol.pos !== 'static' && isol.z !== 'auto',
     '3-b ★ 근거 — `#fxl` 이 «위치 지정 + z-index» 라 스택 문맥(= 격리 그룹)이다',
     isol ? (isol.pos + ' · z ' + isol.z) : '측정 실패');

  /* ── [4] 뜻을 이루는 사본 — 채움의 극성을 뒤집는다 ───────────────────── */
  blk('4] FLIP — 밝은 채움 + 어두운 테(겹 수·두께·글로우 순서는 5회차 그대로)');
  const flip = {}; for (const T of STOPS) { flip[T] = await meas('FLIP', T);
    info('t' + T + 'ms', flip[T] ? ('잉크 L ' + flip[T].ink + '(정착 대비 '
      + Math.round((flip[T].ink / mask.mInk - 1) * 1000) / 10 + '%) · 판 L ' + flip[T].plate
      + ' · 잉크:판 ' + flip[T].ratio + ':1' + (flip[T].inverted ? ' · **극성 반전**' : '')) : '측정 실패'); }
  ok(STOPS.every(T => flip[T] && !flip[T].inverted),
     '4-a ★ FLIP 은 어느 시각에도 극성이 안 뒤집힌다(잉크가 판보다 밝다)',
     STOPS.map(T => 't' + T + ' ' + (flip[T] ? (flip[T].inverted ? '반전' : 'ok') : '?')).join(' · '));
  ok(STOPS.every(T => flip[T] && base[T] && flip[T].ink > base[T].ink),
     '4-b ★ FLIP 의 잉크가 전 시각에서 현행보다 밝다',
     STOPS.map(T => 't' + T + ' ' + (flip[T] && base[T] ? (r2(flip[T].ink) + '↔' + r2(base[T].ink)) : '?')).join(' · '));
  ok(worst !== null && flip[worst] && flip[worst].ratio > base[worst].ratio,
     '4-c ★ 최악 프레임의 잉크:판 대비가 FLIP 에서 회복된다',
     worst === null ? '측정 실패' : (r2(base[worst].ratio) + ':1 → ' + r2(flip[worst].ratio) + ':1 (정착 '
       + r2((() => { const f = ch => { const s = ch / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
             const a = f(mask.mInk), b = f(mask.mPlate); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); })())
       + ':1)'));

  /* ── [5] 5회차 논증 보존 — 알 자신의 잉크가 «양끝» 을 그대로 갖는가 ───── */
  blk('5] 5회차 논증 — FLIP 도 «어두운 끝 ≤60 · 밝은 끝 ≥200» 을 둘 다 갖는다');
  const inkSpan = async v => {
    const on = await shot({ T: 40, VAR: VARIANT[v] });
    const off = await shot({ T: 40, VAR: VARIANT[v], NOGAIN: true });
    if (!on || !off) return null;
    return await ev(p, async ({ a, b, box }) => {
      const load = u => new Promise((okf, no) => { const im = new Image(); im.onload = () => okf(im); im.onerror = no; im.src = 'data:image/png;base64,' + u; });
      const ia = await load(a), ib = await load(b);
      const mk = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        c.getContext('2d').drawImage(im, 0, 0);
        return c.getContext('2d').getImageData(box.x - 40, box.y - 40, box.w + 80, box.h + 80).data; };
      const da = mk(ia), db = mk(ib);
      const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      let lo = 255, hi = 0, n = 0;
      for (let i = 0; i < da.length; i += 4) {
        const va = lum(da, i), vb = lum(db, i);
        if (Math.abs(va - vb) < 12) continue;
        n++; lo = Math.min(lo, va); hi = Math.max(hi, va);
      }
      return { n, lo: Math.round(lo), hi: Math.round(hi), range: Math.round(hi - lo) };
    }, { a: on.png, b: off.png, box });
  };
  const sBase = await inkSpan('BASE'), sFlip = await inkSpan('FLIP'), sScr = await inkSpan('SCREEN');
  info('현행 알 잉크', sBase ? (sBase.n + '화소 · 휘도 ' + sBase.lo + '~' + sBase.hi + ' · 폭 ' + sBase.range) : '측정 실패');
  info('FLIP 알 잉크', sFlip ? (sFlip.n + '화소 · 휘도 ' + sFlip.lo + '~' + sFlip.hi + ' · 폭 ' + sFlip.range) : '측정 실패');
  info('screen 알 잉크', sScr ? (sScr.n + '화소 · 휘도 ' + sScr.lo + '~' + sScr.hi + ' · 폭 ' + sScr.range) : '측정 실패');
  ok(!!sFlip && sFlip.n > 200 && sFlip.lo <= 60 && sFlip.hi >= 200,
     '5-a ★ FLIP 도 `verify683` [G1] 의 두 문턱(≤60 · ≥200)을 둘 다 만족한다',
     sFlip ? (sFlip.lo + '~' + sFlip.hi) : '측정 실패');
  /* ⚑ 처방문 그대로(screen)를 **기각하는 근거**는 «알이 지워진다» 가 아니었다(자가 그 가설을
     기각했다 — 어두운 끝 13 · 화소 9007 로 현행과 같은 자리에 그대로 있다). 실측이 낸 근거는
     **극성이 안 고쳐진다** 는 것이다: screen 은 `#fxl` 안의 플래시 판과만 섞여 최악 프레임을
     1.22:1 로 두고(현행 2.02:1 보다 **오히려 나쁘다**) 잉크가 여전히 판보다 어둡다. */
  ok(!!sScr && sScr.n > 200, '5-b ★ screen 사본의 알도 화면에 그대로 있다(«지워진다» 가설은 기각)',
     sScr ? (sScr.lo + '~' + sScr.hi + ' · 화소 ' + sScr.n) : '측정 실패');
  ok(worst !== null && scr[worst] && scr[worst].inverted && flip[worst] && !flip[worst].inverted,
     '5-c ★ 갈림의 답 — 최악 프레임에서 screen 은 **여전히 극성이 뒤집혀 있고** FLIP 은 아니다',
     (worst !== null && scr[worst] && flip[worst])
       ? ('screen ' + scr[worst].ratio + ':1(반전) ↔ FLIP ' + flip[worst].ratio + ':1(정상) · 현행 '
          + base[worst].ratio + ':1(반전)') : '측정 실패');

  console.log('\nPROBE683E ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS')
    + (errs.length ? ' · 콘솔 에러 ' + errs.length : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
