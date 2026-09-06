#!/usr/bin/env node
/* 작업 969 — 10 이용권 «불릿형» 카드의 **리본 띠 높이** 게이트.
 *
 *   node tools/verify969.js
 *
 * ── 969 가 지킨 것 ────────────────────────────────────────────────────────
 * 966 1회차가 «원점이 두 그림에서 같은 자리를 가리키는가» 를 검산하려고 검정 테 교차 **여덟 칸**을
 * 재다 곁에서 찍었다 — **두 리본이 나란히 1.06 짧다**:
 *     ref 리본1 273.00 − 195.88 = **77.12**   우리 272.05 − 196.00 = **76.05**  (선언 76)
 *     ref 리본2 138.70 −  61.59 = **77.11**   우리 138.05 −  62.00 = **76.05**
 * ⚑ **아랫변은 두 줄 다 제자리다**(Δ +0.12 / +0.41) ⇒ 결손은 «자리» 가 아니라 **«높이»** 이고,
 *   `bottom:196/62` 은 한 글자도 안 건드린 채 **윗변만** 1px 올라가는 것이 수리의 전부다(선언 76 → 77).
 *
 * 이 자가 막는 길:
 *   [0] 선언 — 불릿 두 줄 다 77 · 배너는 67 (667 [D5] «형마다 두 값» 을 접지 않았다)
 *   [1] 화소 — 두 띠 높이가 **매 실행 다시 잰 ref** ±0.5 (상수로 안 굳혔다)
 *   [2] 아랫변 0줄 — 되돌림 사본과 **같은 값**이다 (띠를 통째로 내려서 «높이» 를 흉내내는 길)
 *   [3] 틈 — 966 이 «리본 몫» 으로 남긴 +1.43 이 ref ±0.5 로 닫혔다
 *   [4] 배너형은 한 화소도 안 움직였다 (885 10회차가 «맞다» 로 못박은 대조군)
 *   [5] 제비꼬리가 **파생**이다 — `::after` 가 자기 리본 테두리 상자를 그대로 덮는다(손 상수 0)
 *   [6] 두 프레임(2280 · 1600)에서 같은 값
 *   [R] 되돌림 시험 — `height:76px` 사본을 **실제로 먹여** [1][3] 이 빨개지는지 본다
 *   [R2] 되돌림 시험 2 — 꼬리에 옛 손 상수 `height:76px` 를 되먹이면 **배너 꼬리가 자기 띠보다
 *        9px 길어진다**(사본이 왜 부패였는지의 실물 증거 · [5] 가 빨개진다)
 *
 * ⚠ Pillow/numpy(python)가 없으면 화소 절이 «환경» 으로 건너뛴다(937 교훈 · 종료 코드 3).
 *   준비: pip3 install pillow numpy   ·   npm i --no-save playwright pngjs   (913 — 반드시 «한 번에»)
 * ⚠ 사본은 저장소 «안» 에 둔다 — /tmp 는 assets/** 가 404 라 찍힌 픽셀이 달라진다(905 [R] 선례).
 */
const path = require('path');
const fs = require('fs');
const { py: py937 } = require('./pydep937');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'shots');

const NOW = 77;                  /* 969 의 제품 = 이 한 값 */
const WAS = 76;                  /* 되돌림 사본이 쓰는 값 */
const BAN = 67;                  /* 배너형 — 안 건드린 값(667 [D5]) */
const TOL = 0.5;                 /* 923 10회차·966 이 «맞다» 로 쓴 대역 그대로 */
const FRAMES = [2280, 1600];     /* 9:19 기준 + 9:13.3(짧은 기기) — 지시서 [2] */

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};
const p2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'n/a' : (+v).toFixed(2));

/* ── 한 판 찍기 — 966 과 **같은 경로**(openShopTab('pass') · 애니 정지 · #app 크롭) ────── */
async function shoot(browser, file, geoFile, fh, url, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    S.dia = 3e5; S.gold = 1e9;
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; });
    openShopTab('pass');
  });
  await page.waitForTimeout(900);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
    document.getElementById('shopList').scrollTop = 0;
  });
  await page.waitForTimeout(200);
  const geo = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (r) => ({ x: +(r.left - A.left).toFixed(3), y: +(r.top - A.top).toFixed(3),
      w: +r.width.toFixed(3), h: +r.height.toFixed(3) });
    const g = { frameH: +A.height.toFixed(1) };
    g.cards = [...document.querySelectorAll('.pvc')].map((c) => {
      const o = box(c.getBoundingClientRect());
      o.id = c.dataset.pv; o.cls = [...c.classList];
      const q = (s) => (c.querySelector(s) ? box(c.querySelector(s).getBoundingClientRect()) : null);
      o.rb1 = q('.rb1'); o.rb2 = q('.rb2'); o.hdb = q('.hdb'); o.pvl = q('.pvl');
      o.lines = [...c.querySelectorAll('.pvb')].map((l) => box(l.getBoundingClientRect()));
      /* 리본 두 줄의 선언(computed) 높이 + 제비꼬리 `::after` 의 «칠해진» 높이 */
      o.rbs = ['rb1', 'rb2'].map((k) => {
        const rb = c.querySelector('.' + k); if (!rb) return null;
        const cs = getComputedStyle(rb), af = getComputedStyle(rb, '::after');
        const b = rb.querySelector('b');
        return { k, h: parseFloat(cs.height), box: box(rb.getBoundingClientRect()),
          afH: af.content === 'none' ? null : parseFloat(af.height),
          afDecl: af.content === 'none' ? null : (af.top + '/' + af.bottom),
          plate: b ? box(b.getBoundingClientRect()) : null };
      });
      return o;
    });
    return g;
  });
  fs.writeFileSync(geoFile, JSON.stringify(geo));
  const el = await page.$('#app');
  await (el || page).screenshot({ path: file });
  await ctx.close();
  return geo;
}

const probe = (png, geo) => {
  const out = py937([path.join(__dirname, 'probe966.py'), '--ref', '--cap', png, '--geo', geo, '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = out.indexOf('@@JSON@@');
  if (i < 0) throw new Error('probe966 이 JSON 을 안 냈다');
  return JSON.parse(out.slice(i + 8))['x1.0'];
};

/* ⚑ 우리 캡처의 사다리는 «리본 두 장» 모양이 아니다 — 가로창(카드-로컬 100..118)에 라벨·판 잉크가
   끼어들어 21 칸이 나온다(ref 는 9 칸). 그래서 probe966 은 우리 쪽에 이름을 안 붙이고 `rungs` 만 낸다.
   여기서 **DOM 이 아는 자리로 짝을 짓는다** — 자는 여전히 화소다(DOM 은 «어느 칸을 볼지» 만 정한다).
   ±1.2 안에 칸이 없으면 그 축은 «못 쟀다» 로 null 을 내고 그 항이 빨개진다. */
const pickRung = (rungs, want, tol = 1.2) => {
  let best = null, bd = Infinity;
  for (const r of rungs || []) {
    const d = Math.abs(r - want);
    if (d < bd) { bd = d; best = r; }
  }
  return bd <= tol ? best : null;
};
/* 카드 바닥 원점(우리px)으로 잰 리본 네 변 — DOM 상자에서 «찾을 자리» 를 만들고 화소로 값을 낸다.
   ⚑ 969 [7] — 띠 «속»(빨강)까지 재려면 **안쪽 두 변**도 필요하다. 그 자리는 바깥 변에서
   보이는 검정 두께(테 6 + inset 2.5 = 8.5)만큼 안쪽이므로 거기서 칸을 찾는다(값은 여전히 화소). */
const INK = 8.5;
const capRibbons = (cap, card) => {
  const cb = card.y + card.h, R = cap.rungs || [];
  const one = (b) => {
    if (!b) return null;
    const top = pickRung(R, cb - b.y), bot = pickRung(R, cb - (b.y + b.h));
    const inT = top === null ? null : pickRung(R, top - INK);
    const inB = bot === null ? null : pickRung(R, bot + INK);
    return { top, bot, inT, inB,
      h: top !== null && bot !== null ? top - bot : null,
      ink: top !== null && inT !== null && bot !== null && inB !== null
        ? ((top - inT) + (inB - bot)) / 2 : null,
      inner: inT !== null && inB !== null ? inT - inB : null };
  };
  return { rb1: one(card.rb1), rb2: one(card.rb2) };
};
const bullet = (g) => g.cards.filter((c) => !c.cls.includes('ban1') && c.lines.length);
const banner = (g) => g.cards.find((c) => c.cls.includes('ban1'));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  /* ── 되돌림 사본 — 저장소 «안» 에 둔다(assets 상대경로) ───────────────── */
  const RX = path.join(ROOT, 'index.v969rx.html');
  const src = fs.readFileSync(SRC, 'utf8');
  const RX_FIND = `.pvc>.rb{left:0;height:${NOW}px;`;
  const RX_REPL = `.pvc>.rb{left:0;height:${WAS}px;`;
  const canRx = src.includes(RX_FIND);
  if (canRx) fs.writeFileSync(RX, src.replace(RX_FIND, RX_REPL));
  /* [R2] 사본은 파일이 아니라 스타일 한 줄이다 — 옛 «손 상수» 를 그대로 되먹인다 */
  const TAIL_CSS = '.pvc>.rb2::after,.pvc.ban1>.rb1::after{height:76px}';

  const shots = {};
  let browser;
  try {
    browser = await launch(chromium);
    for (const fh of FRAMES) {
      shots[fh] = await shoot(browser, path.join(OUT, `v969-${fh}.png`),
        path.join(OUT, `v969-${fh}.json`), fh, URL, null);
    }
    if (canRx) {
      shots.rx = await shoot(browser, path.join(OUT, 'v969-rx.png'), path.join(OUT, 'v969-rx.json'),
        2280, 'file://' + RX.replace(/\\/g, '/'), null);
    }
    shots.tail = await shoot(browser, path.join(OUT, 'v969-tail.png'), path.join(OUT, 'v969-tail.json'),
      2280, URL, TAIL_CSS);
    await browser.close();
  } catch (e) {
    try { if (browser) await browser.close(); } catch (_) {}
    if (canRx && fs.existsSync(RX)) fs.unlinkSync(RX);
    console.error('VERIFY969 — playwright 없음이거나 자가 죽었다: ' + String(e.message || e).split('\n')[0]);
    console.error('  준비: npm i --no-save playwright pngjs   (913 — 반드시 «한 번에»)');
    process.exit(3);
  }

  /* ── [0] 선언 — 불릿 77 · 배너 67 ───────────────────────────────────── */
  {
    const bs = bullet(shots[2280]).flatMap((c) => c.rbs.filter(Boolean).map((r) => r.h));
    const bn = banner(shots[2280]).rbs.filter(Boolean).map((r) => r.h);
    ok(bs.length >= 4 && bs.every((h) => Math.abs(h - NOW) < 0.01),
      `[0-a] 불릿형 리본 띠 = **${NOW}** (두 줄 다 · 969 의 제품 전부)`, bs.join(' / '));
    ok(bn.length === 2 && bn.every((h) => Math.abs(h - BAN) < 0.01),
      `[0-b] 배너형은 **${BAN}** 그대로 — «형마다 두 값»(667 [D5])을 한 값으로 안 접었다`, bn.join(' / '));
  }

  /* ── [6] 두 프레임이 같은 값 ────────────────────────────────────────── */
  {
    const a = bullet(shots[2280])[0], b = bullet(shots[1600])[0];
    const key = (c) => c.rbs.filter(Boolean).map((r) =>
      `${p2(r.h)}|${p2((c.y + c.h) - r.box.y)}|${p2((c.y + c.h) - (r.box.y + r.box.h))}`).join(' · ');
    ok(key(a) === key(b),
      '[6] 9:19(2280) 과 9:13.3(1600) 이 **같은 띠**다 — 세로 가변에 안 매인다',
      `${key(a)} ↔ ${key(b)}`);
  }

  /* ── [2] 아랫변 0줄 · [4] 배너 대조군 — 되돌림 사본과 대조 ───────────── */
  if (canRx) {
    const now = bullet(shots[2280]), was = bullet(shots.rx);
    const bot = (g) => g.flatMap((c) => c.rbs.filter(Boolean)
      .map((r) => +((c.y + c.h) - (r.box.y + r.box.h)).toFixed(2)));
    const bn = bot(now), bw = bot(was);
    ok(bn.length === bw.length && bn.every((v, i) => Math.abs(v - bw[i]) < 0.01),
      '[2] 리본 **아랫변**이 되돌림 사본과 같다 — `bottom:196/62` 0줄, 윗변만 올렸다',
      `지금 ${bn.join('/')} ↔ 수리 전 ${bw.join('/')}`);
    const top = (g) => g.flatMap((c) => c.rbs.filter(Boolean)
      .map((r) => +((c.y + c.h) - r.box.y).toFixed(2)));
    const tn = top(now), tw = top(was);
    ok(tn.every((v, i) => Math.abs(v - tw[i] - 1) < 0.01),
      '[2-b] 그리고 **윗변은 정확히 1px 올라갔다**(273 · 139 — 아랫변이 안 움직였다는 것의 짝 항)',
      `지금 ${tn.join('/')} ↔ 수리 전 ${tw.join('/')}`);

    const n = banner(shots[2280]), w = banner(shots.rx);
    const same = ['y', 'h'].every((k) => Math.abs(n[k] - w[k]) < 0.01) &&
      n.rbs.every((r, i) => r && w.rbs[i] &&
        Math.abs((r.box.y - n.y) - (w.rbs[i].box.y - w.y)) < 0.01 &&
        Math.abs(r.h - w.rbs[i].h) < 0.01 && Math.abs(r.afH - w.rbs[i].afH) < 0.01);
    ok(same, '[4] 배너형(ban1)은 수리 전후가 **한 화소도 안 다르다**(885 10회차 대조군)',
      n.rbs.filter(Boolean).map((r, i) => `${p2(r.h)}↔${p2(w.rbs[i].h)}`).join(' · '));
  } else {
    ok(false, '[2] 되돌림 사본을 못 만들었다 — 제품 선언이 바뀌었는가', `찾는 문자열: ${RX_FIND}`);
  }

  /* ── [5] 제비꼬리가 «손 상수» 가 아니라 **파생**이다 ────────────────────
     ⚑ 969 전에는 `.rb2::after{height:76px}` + `.ban1 …{height:67px}` 로 띠 높이를 **두 번 더**
     적어 두고 있었다. 띠가 77 이 되는 순간 그 사본이 1px 모자란다(부패). 이제는 `top:-6/bottom:-6`
     이라 자기 리본 테두리 상자를 그대로 덮는다 — 그 «파생» 자체를 단언한다. */
  {
    const rows = shots[2280].cards.flatMap((c) => c.rbs.filter((r) => r && r.afH !== null)
      .map((r) => ({ id: c.id, k: r.k, afH: r.afH, h: r.h })));
    ok(rows.length >= 3 && rows.every((r) => Math.abs(r.afH - r.h) < 0.01),
      '[5-a] 제비꼬리 높이 = **그 리본 테두리 상자 높이** — 형마다 손으로 다시 안 적는다(402)',
      rows.map((r) => `${r.id}.${r.k} ${p2(r.afH)}/${p2(r.h)}`).join(' · '));
    /* 선언 쪽 — 제비꼬리 규칙 **전부**(불릿·배너)를 소스에서 뽑아 «height:<수>» 가 0건인지 센다.
       ⚠ 주석 안의 «height:76px» 에 안 걸리게 **규칙 본문 `{…}` 만** 본다(주석은 `{` 앞에서 끝난다). */
    const css = fs.readFileSync(SRC, 'utf8');
    const decls = (css.match(/\.pvc[^{}\n]*::after\s*(?:,[^{}\n]*)?\{[^}]*\}/g) || [])
      .filter((r) => /\.rb[12]?::after/.test(r));
    ok(decls.length > 0 && !decls.some((r) => /height\s*:\s*[\d.]/.test(r.slice(r.indexOf('{')))),
      '[5-b] 제비꼬리 선언에 «height:<수>» 가 **0건** — 사본을 지웠다(파생이라는 사실을 선언이 말한다)',
      `규칙 ${decls.length}개 · ` + decls.map((r) => r.split('{')[0].trim()).join(' / '));
  }

  /* ── [R2] 옛 손 상수를 되먹이면 배너 꼬리가 자기 띠보다 길어진다 ───────── */
  {
    const t = banner(shots.tail).rbs.filter((r) => r && r.afH !== null);
    const bad = t.filter((r) => Math.abs(r.afH - r.h) > 0.5);
    ok(bad.length > 0 && bad.every((r) => Math.abs(r.afH - r.h - (76 - BAN)) < 0.51),
      `[R2] 꼬리에 옛 손 상수 «height:76px» 를 되먹이면 배너 꼬리가 자기 띠보다 ${76 - BAN}px 길어진다 ⇒ [5] 가 빨개진다`,
      t.map((r) => `${r.k} 꼬리 ${p2(r.afH)} vs 띠 ${p2(r.h)}`).join(' · '));
  }

  /* ── 화소 절 [1][3][R] — probe966 이 ref 를 매 실행 다시 잰다 ────────── */
  let R, N, X;
  try {
    N = probe(path.join(OUT, 'v969-2280.png'), path.join(OUT, 'v969-2280.json'));
    if (canRx) X = probe(path.join(OUT, 'v969-rx.png'), path.join(OUT, 'v969-rx.json'));
    R = N.ref;
  } catch (e) {
    if (canRx && fs.existsSync(RX)) fs.unlinkSync(RX);
    console.error('VERIFY969 — [1][3][R] SKIP: ' + String(e.message || e).split('\n')[0]);
    console.error('  준비: pip3 install pillow numpy   (937 — 저장소 결함이 아니라 컨테이너 의존이다)');
    console.log(`\nVERIFY969 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS (일부 SKIP — 환경)'}`);
    process.exit(fail ? 1 : 3);
  }

  const card0 = bullet(shots[2280])[0];
  const capRb = capRibbons(N.cap, card0);

  /* ── [1] 두 띠 높이가 ref ±0.5 ─────────────────────────────────────── */
  {
    const refOk = R.rungs_shaped && typeof R.rb1_h === 'number' && typeof R.rb2_h === 'number';
    ok(refOk, '[1-0] ref 사다리가 «리본 두 장» 모양이다 — 이름표가 붙었다(자가 스스로 검산한다)',
      refOk ? `rb1 ${p2(R.rb1_h)} · rb2 ${p2(R.rb2_h)} (칸 ${R.rungs.length})` : `모양 아님(칸 ${(R.rungs || []).length})`);
    for (const k of ['rb1', 'rb2']) {
      const got = capRb[k] && capRb[k].h, want = refOk ? R[k + '_h'] : null;
      const d = got !== null && want !== null ? got - want : null;
      ok(d !== null && Math.abs(d) <= TOL,
        `[1-${k}] ${k === 'rb1' ? '리본1' : '리본2'} 띠 높이 = ref ±${TOL}`,
        `ref ${p2(want)} · 우리 ${p2(got)} · Δ ${d >= 0 ? '+' : ''}${p2(d)}`);
    }
  }

  /* ── [7] 띠를 셋으로 갈라도 맞는다 — «테 + 속 + 테» ──────────────────────
     ⚑ 이 항이 969 의 두 번째 값(`inset 2 → 2.5`)이 왜 필요했는지를 못박는다.
     수리 전 76 은 «8.12 + 60.81 + 8.12» 였다 — 총 높이만 1px 올리면 **속이 60.81 → 61.8** 로
     ref(59.91)에서 더 멀어진다(667 [G7b] 가 ±1 대역 끝에서 겨우 초록인 채로 굳는다).
     ⇒ 총 높이와 테를 **같이** 옮겨야 셋이 한꺼번에 닫힌다. 여기서 그 셋을 한 항으로 본다. */
  {
    const refInk = ((R.rb1_top - R.rb1_in_top) + (R.rb1_in_bot - R.rb1_bot) +
      (R.rb2_top - R.rb2_in_top) + (R.rb2_in_bot - R.rb2_bot)) / 4;
    const refIn = ((R.rb1_in_top - R.rb1_in_bot) + (R.rb2_in_top - R.rb2_in_bot)) / 2;
    const mine = ['rb1', 'rb2'].map((k) => capRb[k]).filter((r) => r && r.ink !== null);
    const ink = mine.length ? mine.reduce((a, r) => a + r.ink, 0) / mine.length : null;
    const inner = mine.length ? mine.reduce((a, r) => a + r.inner, 0) / mine.length : null;
    ok(mine.length === 2 && Math.abs(ink - refInk) <= TOL && Math.abs(inner - refIn) <= TOL,
      `[7] 띠 «테 + 속 + 테» 셋이 전부 ref ±${TOL} — 총 높이만 옮기면 속이 넘친다(inset 2 → 2.5 의 근거)`,
      `테 ref ${p2(refInk)} · 우리 ${p2(ink)} (Δ ${p2(ink - refInk)}) · ` +
      `속 ref ${p2(refIn)} · 우리 ${p2(inner)} (Δ ${p2(inner - refIn)})`);
  }

  /* ── [3] 966 이 «리본 몫» 으로 남긴 틈이 닫혔다 ──────────────────────── */
  {
    const d = N.cap.gap - R.gap;
    ok(Math.abs(d) <= TOL,
      `[3] 마지막 알약 아랫변 ↔ 리본1 윗변 틈 = ref ±${TOL} (966 이 남긴 리본 몫 +1.43 이 닫혔다)`,
      `ref ${p2(R.gap)} · 우리 ${p2(N.cap.gap)} · Δ ${d >= 0 ? '+' : ''}${p2(d)}` +
      (X ? ` (수리 전 ${p2(X.cap.gap)} · Δ ${p2(X.cap.gap - R.gap)})` : ''));
  }

  /* ── [R] 되돌림 시험 — 사본은 실제로 빨개진다 ────────────────────────── */
  if (X) {
    const wasRb = capRibbons(X.cap, bullet(shots.rx)[0]);
    const h1 = wasRb.rb1 && wasRb.rb1.h;
    const backH = h1 !== null && Math.abs(h1 - R.rb1_h) > TOL;
    const backGap = Math.abs(X.cap.gap - R.gap) > TOL;
    ok(backH && backGap && X.cap.rb_top < N.cap.rb_top - 0.5,
      '[R] `height:76px` 사본은 [1][3] 이 **빨개진다** — 윗변이 273 → 272 로 내려가고 틈이 다시 벌어진다',
      `수리 전 띠 ${p2(h1)}(ref ${p2(R.rb1_h)} · 대역 밖 ${backH}) · ` +
      `틈 ${p2(N.cap.gap)} → ${p2(X.cap.gap)} · 윗변 ${p2(N.cap.rb_top)} → ${p2(X.cap.rb_top)}`);
    fs.unlinkSync(RX);
  }

  /* ── 곁축 기록(판정 아님) ────────────────────────────────────────────── */
  console.log(`  · (기록) 리본1 윗변 ref ${p2(R.rb1_top)} · 우리 ${p2(capRb.rb1 && capRb.rb1.top)} · ` +
    `아랫변 ref ${p2(R.rb1_bot)} · 우리 ${p2(capRb.rb1 && capRb.rb1.bot)}`);
  console.log(`  · (기록) 리본2 윗변 ref ${p2(R.rb2_top)} · 우리 ${p2(capRb.rb2 && capRb.rb2.top)} · ` +
    `아랫변 ref ${p2(R.rb2_bot)} · 우리 ${p2(capRb.rb2 && capRb.rb2.bot)}`);

  console.log(`\nVERIFY969 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
