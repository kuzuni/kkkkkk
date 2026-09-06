/* 작업 981 게이트 — «같은 프리미티브를 각도·크기만 바꿔 쓴다»(① 분간의 마지막 뿌리)
 *
 *   node tools/verify981.js
 *
 * ── 이 자가 [D1] 옆에 서는 이유 (981 의 첫 숙제였다) ────────────────────
 * `verify792` [D1] 은 **그리는 자리 그대로** 두 실루엣을 겹친다. 그 자는 710 이 얹은 회귀 축
 * («후광을 얹느라 실루엣이 서로 붙지 않았나»)이고, 지금도 옳고, 건드리지 않는다.
 * 하지만 ①(분간)이 묻는 것은 다른 질문이다 — `shotBody` 의 모든 가지가 `ctx.rotate(b.a)`
 * (또는 `b.spin`)로 실루엣을 **진행 방향에 매단다**. 같은 종이 화면에서 온갖 각도로 나타나므로
 * «각도만 다른 두 종» 은 플레이어에게 같은 그림이다. 그래서 [D1] 이 다섯 회차 내내 초록인 동안
 * 비평가 ①은 3~6점을 줬다(792 4·6·8·10회차 — 네 번 연속 «792 밖» 판정).
 * ⇒ 이 자는 **회전·미러·크기를 지운 뒤** 남는 겹침을 잰다. 재는 법은 `probe981` 에서 가져다 쓴다
 *   (자와 재현에 따로 적으면 그것이 곧 사본이다 — 402).
 *
 * ── 1회차가 고친 것 ────────────────────────────────────────────────────
 * 등재문은 네 쌍을 지목했는데 재현이 **셋만 확인하고 하나를 기각**했다(`spear↔arrow` 0.390 —
 * 처음부터 잘 갈려 있다). 그리고 등재문이 못 본 것이 본체였다: 뿌리는 «육각을 나눠 쓴다» 가
 * 아니라 **«볼록하다»** 이고, 볼록한 여섯(stone·boom·rico·bounce·flask·meteor)이 0.72~0.87 로
 * 한 무리였다. 1회차는 그 무리의 이음매인 `rock` 에 **오목한 노치**를 파서 셋을 갈랐다
 * (0.872/0.813/0.800 → 0.697/0.719/0.697).
 *
 * 절:
 *   [A] 축 — 17종을 픽셀로 재고, 두 질문이 실제로 갈린다.
 *   [B] 래칫 — 최악 쌍과 «비평가 불만선 위» 쌍 수. **다음 회차가 내린다**(회차마다 좁힌다).
 *   [C] 1회차가 닫은 자리 — `rock` 이 볼록 무리와 갈렸다 + 그 오목이 **선언**에 있다.
 *   [D] 되감기 금지 — 792 [D1](정렬 전 IoU)·[E1](덩치 밴드)을 이 작업이 안 흔들었다.
 *   [R] 되돌림 시험 — 옛 `rr` 표로 되돌린 사본에서 [C1] 이 **실제로** 빨개진다.
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 * LESSONS 348 — 되돌림 시험은 «전부» 를 기대하지 마라(영원히 빨간 게이트가 된다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const P = require('./probe981');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* ── 문턱 ─────────────────────────────────────────────────────────────
   ⚑ **관측값을 그대로 박지 않는다**(825) — 여기 값들은 두 종류다:
     · `COMPLAIN` 0.60 은 **비평가가 준 선**이다. 792 10회차에 CV·CW 가 ①을 3~6점으로 누르며
       적은 쌍이 0.664 · 0.628 · 0.58 · 0.51 이었다 — 그 무리의 아래쪽이 0.60 근처다.
       «이 선 위에 있는 쌍» 을 세는 것이 곧 «비평가가 다시 지적할 쌍» 이다.
     · `IOU_RATCHET`·`OVER_RATCHET` 은 **래칫**이다(문턱이 아니다). 회차가 닫은 만큼만 잠근다 —
       한 번에 목표(0.60)를 걸면 이 자는 열 회차 내내 빨간 채로 아무것도 안 지킨다(348).
       ⚠ **올리지 마라.** 회차가 값을 못 내렸으면 그것은 그 회차가 못 한 것이지 자의 결함이 아니다. */
const COMPLAIN = 0.60;
const IOU_RATCHET = 0.71;     /* 4회차 실측 0.697(`bounce↔flask`) — 3회차 0.714(`curve↔boomer`) — 2회차 0.725 —
                                 1회차 0.848 · 수리 전 0.872.
                                 ⚑ 4회차가 초승달을 «뿔이 선 손톱달» 로 갈라 `curve` 쌍 넷을 통째로 내렸다.
                                 ⚠ **이제 최악은 초승달이 아니다** — 남은 둘은 `ball↔bottle` 0.697(둥근 몸통 둘)과
                                 `rock↔fire` 0.697 이고, 그 둘이 5회차의 과녁이다. */
const OVER_RATCHET = 14;      /* 4회차 실측 13 · 3회차 16 · 2회차 18 — 1회차 20 이었고 그 사이 **982 1회차가 24 로 올렸다**
                                 (성긴 실루엣을 부풀린 대가로 서로 닮았다. 내 변경 전 HEAD 에서 이 항이
                                 이미 빨갰고, 수리 전 트리 실행으로 그것을 못박았다 — 회차 기록 §2회차 ①).
                                 ⚠ 아래 옛 주석의 «여유 1칸» 은 그대로다.
                                 1회차가 내린 것은 «최악 쌍»([B1] 0.872 → 0.848)이지 이 개수가 아니다:
                                 rock 의 세 쌍은 0.87/0.81/0.80 → 0.70/0.72/0.70 으로 내려왔지만
                                 셋 다 아직 0.60 위이고, 대신 `rock↔ball` 이 0.661 로 새로 들어왔다.
                                 ⚠ 여유 **1칸**을 둔다 — 목록의 바닥이 0.605 라 0 칸이면 값이 0.005 만
                                 흔들려도 자가 스스로 빨개진다(792-⑤ · 825 «내가 만든 플레이키»). */
const ROCK_MAX = 0.75;        /* [C1] — 1회차가 `rock` 에서 실제로 닫은 자리(실측 0.719 → 2회차 0.697) */
/* [C3] — 2회차가 닫은 세 자리. 값은 «그 종이 낀 쌍의 최악» 이고, 실측 위에 여유를 한 칸 둔다.
   ⚠ 문턱이 아니라 **래칫**이다 — 다음 회차가 더 내리면 같이 내려 적어라(348 · 올리지는 마라). */
const R2_MAX = { gem: 0.66,        /* 실측 0.618 (수리 전 0.787 — `fire` 와) */
                 rockfall: 0.70,   /* 실측 0.649 (수리 전 0.831 — `gem` 과) */
                 cross: 0.66,      /* 3회차 실측 0.642 ↔ `fire` (수리 전 0.725 ↔ `star`) */
                 bottle: 0.72,     /* 실측 0.697 (수리 전 0.848 — `ball` 과 · 전 136쌍 최악이었다) */
                 moon: 0.68 };     /* 4회차 실측 0.645 ↔ `lance` (수리 전 0.714 ↔ `bmr` · 전 136쌍 최악이었다).
                                      ⚠ 이 종은 **0.60 위 목록에서 넷이 한꺼번에** 빠진 자리다
                                      (bmr .714 · arc .693 · spear .608 · ball .607 → 전부 0.60 아래). */
const D1_MAX = 0.90;          /* 792 [D1] 과 같은 값 — 되감기 금지 축 */
const DIAG_TOL = 0.25;        /* 792 [E1] 과 같은 값 */

/* 되돌림 사본 — 981 이전의 «볼록한 육각» 으로 되돌린다.
   ⚠ 저장소 루트에 둔다(/tmp 면 상대 경로 assets/** 가 404 — 792 주석 참조).
     이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648). */
const NEG_ROCK = path.join(ROOT, '.v981-neg-rock-' + process.pid + '.html');
const NEG_CVX  = path.join(ROOT, '.v981-neg-cvx-'  + process.pid + '.html');   /* [R2] — 오목을 지운 볼록 사본 */
const NEG_SEG  = path.join(ROOT, '.v981-neg-seg-'  + process.pid + '.html');   /* [R3] — 참격 고리를 4토막으로 되돌린 사본 */
const NEG_FAT  = path.join(ROOT, '.v981-neg-fat-'  + process.pid + '.html');   /* [R4] — 초승달을 도로 살찌운 사본 */
/* ⚠ 줄 전체가 아니라 **머리**만 붙잡는다(792 9회차 교훈 — 줄이 길어지면 자가 먼저 죽는다). */
const TAG_ROCK = `      const rr = [`;
const OLD_ROCK = `      const rr = [9.8,7.7,9.4,6.9,10.0,8.1];`;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 한 판을 재고 쌍 표를 만든다 — 재는 법은 전부 `probe981` 것이다 */
async function pairsOf(browser, url) {
  const out = await P.measure(browser, url);
  if (!out || out.__err) return { __err: (out && out.__err) || '결과 없음' };
  const ids = Object.keys(out.rows);
  const norm = {};
  for (const id of ids) norm[id] = P.normalize(out.rows[id].body, out.bw);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const A = norm[ids[i]], B = norm[ids[j]];
    if (!A || !B) continue;
    const r = P.alignedIoU(A, B);
    const raw = +P.iouOf(P.raster(A.pts, 1, 0, 0), P.raster(B.pts, 1, 0, 0)).toFixed(4);
    pairs.push({ sa: out.rows[ids[i]].sh, sb: out.rows[ids[j]].sh, iou: r.iou, raw });
  }
  pairs.sort((x, y) => y.iou - x.iou);
  return { pairs, rows: out.rows, ids, bw: out.bw, n: ids.length };
}
const withSh = (pairs, sh) => pairs.filter(p => p.sa === sh || p.sb === sh);

/* 본체가 **감싼 배경**(구멍) 화소 수 — 테두리에서 배경을 물채우고 남는 배경이 구멍이다.
   ⚑ 3회차가 «참격 고리» 로 얻은 것이 이것이다: 17종 중 구멍을 가진 종이 없어서, 구멍은
     회전·미러·크기를 지워도 안 사라지는 **가장 센 축**이다([R3] 이 그 값을 찍는다). */
function holePx(px, bw) {
  const bh = Math.round(px.length / bw), seen = new Uint8Array(px.length), st = [];
  const push = p => { if (!seen[p] && !px[p]) { seen[p] = 1; st.push(p); } };
  for (let x = 0; x < bw; x++) { push(x); push((bh - 1) * bw + x); }
  for (let y = 0; y < bh; y++) { push(y * bw); push(y * bw + bw - 1); }
  while (st.length) {
    const p = st.pop(), x = p % bw, y = (p - x) / bw;
    if (x > 0) push(p - 1); if (x < bw - 1) push(p + 1);
    if (y > 0) push(p - bw); if (y < bh - 1) push(p + bw);
  }
  let h = 0;
  for (let p = 0; p < px.length; p++) if (!px[p] && !seen[p]) h++;
  return h;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  console.log('VERIFY981 — 회전·미러 정렬 후 실루엣 겹침 (① 분간)');

  /* ── [C2] 선언 ── (픽셀을 재기 전에, 자에게 물어 둘 수 있는 것부터) */
  const m = src.match(/const rr = \[([^\]]+)\];/);
  const rr = m ? m[1].split(',').map(Number) : [];
  const ratio = rr.length ? +(Math.min.apply(null, rr) / Math.max.apply(null, rr)).toFixed(3) : 1;
  ok(rr.length === 6 && ratio <= 0.50,
     '[C2] `rock` 의 오목이 **선언**에 있다 — 반지름 최소÷최대 ' + ratio + ' ≤ 0.50 (981 이전 0.690)');

  /* ── [C4] 2회차의 선언 세 줄 — 픽셀을 재기 전에 물어 둘 수 있는 것 ── */
  const ek = (src.match(/const E_S = [\d.]+, E_A = ([\d.]+), E_K = (\d+)/) || []);
  const mk = (src.match(/const M_K = (\d+), M_A = ([\d.]+)/) || []);
  ok(ek.length === 3 && mk.length === 3 && +ek[2] === 5 && +mk[1] === 6,
     '[C4a] 두 결정의 **뿔 수가 서로 다르고**, 넷도 아니다 — `rico` k=' + (ek[2] || '?') +
     ' · `meteor` k=' + (mk[1] || '?') + ' (4 는 표창 `shuri` 의 대칭이고, 같은 k 끼리는 서로 붙는다)');
  ok(+(ek[1] || 0) >= 0.4 && +(mk[2] || 0) >= 0.4,
     '[C4b] 둘 다 **오목**이 선언에 있다 — 변조 a: rico ' + (ek[1] || '?') + ' · meteor ' + (mk[2] || '?') +
     ' ≥ 0.4 (a=0 은 볼록이고, 볼록은 무엇이든 화구와 붙는다 — [R2] 가 그것을 찍는다)');
  const tail = (src.match(/g2\.addColorStop\(0,'rgba\(255,180,80,\.(\d+)\)'/) || [, '99']);
  ok(+('0.' + tail[1]) <= 0.50,
     '[C4c] 운석 불꼬리가 **본체 문턱(α .55) 아래**다 — 선언 α 0.' + tail[1] +
     ' ≤ 0.50 (올리면 쐐기가 깎은 자리를 도로 메운다 · 알파는 겹치면 1−(1−a)(1−b) 로 **더해진다**)');

  /* ── [C6] 4회차의 선언 한 줄 — 초승달이 «뿔이 서 있는가» 를 픽셀 전에 산수로 묻는다 ──
     뿔이 서려면 **파낸 원이 바깥 원보다 커야** 한다(작으면 두 호의 끝이 안 만나 `closePath()` 가
     직선으로 뭉툭하게 막는다 = 옛 «굽은 막대»). 그리고 분간을 지탱하는 것은 **등두께**다 —
     후보 탐색표(`node tools/try981.js --fam cres --vs moon`)가 0.15 에서 최악 0.58~0.60,
     0.45 로 살찌우면 **0.758** 을 낸다([R4] 가 그것을 제품으로 찍는다). */
  {
    const mm = src.match(/const M_R = ([\d.]+), M_CXK = ([\d.]+), M_RAK = ([\d.]+)/);
    const cxk = mm ? +mm[2] : 0, rak = mm ? +mm[3] : 0;
    const back = mm ? +(1 - (rak - cxk)).toFixed(3) : 9;   /* 등(바깥 원호) 쪽 두께 · 바깥 반지름 = 1 */
    ok(!!mm && rak > 1 && Math.abs(1 - rak) < cxk && cxk < 1 + rak && back > 0 && back <= 0.22,
       '[C6] 초승달에 **뿔이 서 있다** — 파낸 원 ' + (rak || '?') + '배 > 1(바깥 원) · 두 원이 만난다 · ' +
       '등두께 ' + back + ' ≤ 0.22 (살찌우면 굽은 띠 무리로 되돌아간다 — [R4])');
  }

  /* ── 본 측정 ── */
  const cur = await pairsOf(browser, 'file://' + SRC);
  if (cur.__err) { ok(false, '[측정] 블록 예외 — ' + cur.__err); }
  else {
    const pairs = cur.pairs;
    const worst = pairs[0];
    const over = pairs.filter(p => p.iou > COMPLAIN);
    const rawMax = pairs.reduce((a, p) => Math.max(a, p.raw), 0);
    const gain = pairs.reduce((a, p) => Math.max(a, p.iou - p.raw), 0);

    ok(cur.n === 17, '[A1] 투사체를 내는 17종을 픽셀로 쟀다 (실측 ' + cur.n + ')');
    ok(gain >= 0.15,
       '[A2] 이 자와 [D1] 이 **다른 질문**을 잰다 — 쌍별 정렬 상승분 최댓값 ' + gain.toFixed(3) + ' ≥ 0.15');

    ok(worst.iou <= IOU_RATCHET,
       '[B1] 래칫 — 최악 쌍 ' + worst.sa + '↔' + worst.sb + ' ' + worst.iou.toFixed(3) +
       ' ≤ ' + IOU_RATCHET + ' (목표는 비평가 선 ' + COMPLAIN + ' · 다음 회차가 내린다)');
    ok(over.length <= OVER_RATCHET,
       '[B2] 래칫 — 비평가 불만선 ' + COMPLAIN + ' 위 쌍 ' + over.length + '개 ≤ ' + OVER_RATCHET +
       ' / 전 ' + pairs.length + '쌍 (다음 회차가 내린다)');
    console.log('       (기록) 0.60 위 쌍 — ' + over.map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · '));

    const rk = withSh(pairs, 'rock');
    const rkBad = rk.filter(p => p.iou > ROCK_MAX);
    ok(rkBad.length === 0,
       '[C1] 1회차가 닫은 자리 — `rock` 이 볼록 무리와 갈렸다: rock 이 낀 ' + rk.length +
       '쌍 전부 ≤ ' + ROCK_MAX + ' (981 이전 boom 0.872 · meteor 0.813 · rico 0.800) · 넘는 쌍 ' +
       rkBad.length + (rkBad.length ? ' (' + rkBad.map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · ') + ')' : ''));

    /* ── [C3] 앞 회차들이 닫은 자리 ── (2회차 gem·rockfall·bottle · 3회차 cross · 4회차 moon) */
    for (const sh of Object.keys(R2_MAX)) {
      const ps = withSh(pairs, sh);
      const bad = ps.filter(p => p.iou > R2_MAX[sh]);
      ok(bad.length === 0,
         '[C3-' + sh + '] 앞 회차가 닫은 자리 — ' + sh + ' 가 낀 ' + ps.length + '쌍 전부 ≤ ' +
         R2_MAX[sh] + ' · 최악 ' + (ps[0] ? ps[0].sa + '↔' + ps[0].sb + ':' + ps[0].iou.toFixed(3) : '-') +
         (bad.length ? ' · 넘는 쌍 ' + bad.map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · ') : ''));
    }

    /* ── [C5] 3회차가 얻은 축 — 참격 고리는 **구멍을 감싼다** ── */
    {
      const cid = cur.ids.find(i => cur.rows[i].sh === 'cross');
      const hp = cid ? holePx(cur.rows[cid].body, cur.bw) : 0;
      const others = cur.ids.filter(i => cur.rows[i].sh !== 'cross')
                            .map(i => ({ sh: cur.rows[i].sh, h: holePx(cur.rows[i].body, cur.bw) }))
                            .filter(o => o.h >= 300);
      ok(hp >= 300,
         '[C5] `cross`(주변 참격)의 본체가 **구멍을 감싼다** — 갇힌 배경 ' + hp + '화소 ≥ 300' +
         ' (구멍을 가진 다른 종 ' + others.length + '개' +
         (others.length ? ': ' + others.map(o => o.sh + ':' + o.h).join(' · ') : '') + ')');
    }

    ok(rawMax <= D1_MAX,
       '[D1] 되감기 금지 — 정렬 **전** IoU 최댓값 ' + rawMax.toFixed(3) + ' ≤ ' + D1_MAX +
       ' (792 [D1]·710 [C1] 과 같은 값 — 이 작업이 그 축을 안 흔들었다)');

    /* [D2] — 792 [E1] 덩치 밴드.
       ⚑⚑ **989 이관 — 여기서 «본체 마스크로 산수만 옮겨 오던» 사본을 걷어냈다.**
       989 가 [E1] 의 눈금을 **본체 → 본체 + 종이 제 손으로 깐 반투명 부품**(공용 링 제외)으로
       옮기자, 이 자리의 사본은 «792 의 판정» 이 아니라 **792 가 버린 자**를 지키게 됐다 —
       989 뒤 실제로 밖 4종(whirl·arrow·bounce·gale)으로 빨개졌고 그 넷은 981 도 989 도
       한 획 안 건드린 종이다. 산수만 베끼면 원본이 눈금을 갈 때 이렇게 거짓말한다(402).
       ⇒ **792 의 자에게 직접 묻는다**(`verify982` 가 쓰는 그 measure 를 그대로 부른다).
       ⚠ 값을 다시 계산하지 않으므로 문턱·눈금이 또 바뀌어도 이 항은 저절로 따라온다. */
    const V792 = require('./verify792');
    const e1 = await V792.measure(browser, 'file://' + SRC);
    const e1ids = e1.out && e1.out.rows ? Object.keys(e1.out.rows) : [];
    const dgs = e1ids.map(i => e1.out.rows[i].own).sort((a, b) => a - b);
    const dMed = dgs.length ? dgs[Math.floor((dgs.length - 1) / 2)] : 0;
    const dLo = dMed * (1 - DIAG_TOL), dHi = dMed * (1 + DIAG_TOL);
    const dBad = e1ids.filter(i => e1.out.rows[i].own < dLo || e1.out.rows[i].own > dHi);
    ok(e1ids.length === 17 && dBad.length === 0,
       '[D2] 되감기 금지 — **792 의 자에게 직접 물었다**: 덩치 대각(본체 + 제 손 부품)이 [E1] 밴드' +
       '(중앙값 ' + dMed + ' 의 ±' + Math.round(DIAG_TOL * 100) + '%) 안 · 잰 종 ' + e1ids.length +
       ' · 밖 ' + dBad.length + '종' +
       (dBad.length ? ' (' + dBad.map(i => i + ':' + e1.out.rows[i].own).join(' · ') + ')' : ''));

    console.log('       (기록) 정렬 IoU 상위 6 — ' +
      pairs.slice(0, 6).map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · '));
  }

  /* ── [R] 되돌림 시험 ── */
  if (!src.includes(TAG_ROCK)) {
    ok(false, '[R0] 되돌림 앵커 `' + TAG_ROCK.trim() + '` 를 못 찾았다 — 자를 고쳐라(사본이 낡았다)');
  } else {
    ok(true, '[R0] 되돌림 앵커를 찾았다');
    fs.writeFileSync(NEG_ROCK, src.replace(new RegExp(TAG_ROCK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'), OLD_ROCK), 'utf8');
    try {
      const neg = await pairsOf(browser, 'file://' + NEG_ROCK);
      if (neg.__err) { ok(false, '[R1] 되돌림 사본 측정 예외 — ' + neg.__err); }
      else {
        const rkN = withSh(neg.pairs, 'rock').filter(p => p.iou > ROCK_MAX);
        /* ⚠ «전부» 를 기대하지 않는다(348) — 되돌리면 **적어도 두 쌍**이 문턱 위로 올라온다.
           수리 전 실측은 셋(boom 0.872 · meteor 0.813 · rico 0.800)이지만 셋을 못박으면
           다음 회차가 그중 하나를 다른 이유로 내렸을 때 이 자가 «수리가 풀렸다» 고 거짓말한다. */
        /* ⚑ 이관(2026-09-06, 2회차) — 기대를 «2쌍» 에서 «1쌍 + 최악이 실제로 뛴다» 로 바꿨다.
           1회차의 셋(boom·meteor·rico)은 **되돌린 rock 이 볼록 무리와 붙는다** 는 뜻이었는데,
           2회차가 그 무리에서 `meteor`·`rico` 를 빼내 갔다(둘 다 이제 오목이다). 그래서 rock 을
           되돌려도 남은 볼록 상대가 `boom` 하나뿐이라 «2쌍» 은 **영원히 못 맞추는 수**가 됐다
           (348 — 옆 회차가 움직인 것을 «수리가 풀렸다» 로 읽으면 자가 거짓말한다).
           대신 **폭**을 묻는다: 되돌린 판의 rock 최악이 지금 판보다 0.10 이상 높아야 한다.
           그 물음은 무리에 몇이 남았든 «오목이 일하고 있다» 를 그대로 찍는다. */
        const rkNow = withSh(cur.pairs || [], 'rock')[0];
        const rkNeg = withSh(neg.pairs, 'rock')[0];
        const jump = (rkNeg && rkNow) ? rkNeg.iou - rkNow.iou : 0;
        ok(rkN.length >= 1 && jump >= 0.10,
           '[R1] 되돌림 시험 — 옛 `rr`(볼록 육각)로 되돌리면 [C1] 이 실제로 빨개진다: 문턱 ' +
           ROCK_MAX + ' 위 rock 쌍 ' + rkN.length + '개 ≥ 1 · rock 최악이 ' +
           (rkNow ? rkNow.iou.toFixed(3) : '?') + ' → ' + (rkNeg ? rkNeg.iou.toFixed(3) : '?') +
           ' (+' + jump.toFixed(3) + ' ≥ 0.10) (' +
           rkN.map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · ') + ')');
        /* [B2] 래칫의 «수리 전» 짝 — 이 줄이 없으면 다음 워커는 20 이 무엇에서 내려온 값인지 모른다. */
        console.log('       (기록) 되돌린 판의 ' + COMPLAIN + ' 위 쌍 ' +
           neg.pairs.filter(p => p.iou > COMPLAIN).length + '개 · 최악 ' + neg.pairs[0].iou.toFixed(3) +
           ' (' + neg.pairs[0].sa + '↔' + neg.pairs[0].sb + ')');
      }
    } finally { try { fs.unlinkSync(NEG_ROCK); } catch (_) {} }
  }

  /* ── [R2] 2회차의 되돌림 시험 — «볼록해서 붙는다» 를 그대로 찍는다 ──
     한 글자만 바꾼다: 두 종의 변조 a 를 0 으로(= 오목을 지운 **볼록 타원**). 형상·크기·각도는
     그대로이므로 이 판이 빨개지면 원인은 «오목» 하나뿐이다(2회차의 주장 전체가 이 한 줄에 있다). */
  if (!/E_A = 0\.\d/.test(src) || !/M_A = 0\.\d/.test(src)) {
    ok(false, '[R2-0] 되돌림 앵커(`E_A = 0.x` · `M_A = 0.x`)를 못 찾았다 — 자를 고쳐라(사본이 낡았다)');
  } else {
    fs.writeFileSync(NEG_CVX, src.replace(/E_A = 0\.\d+/, 'E_A = 0').replace(/M_A = 0\.\d+/, 'M_A = 0'), 'utf8');
    try {
      const neg = await pairsOf(browser, 'file://' + NEG_CVX);
      if (neg.__err) { ok(false, '[R2] 되돌림 사본 측정 예외 — ' + neg.__err); }
      else {
        const back = neg.pairs.filter(p => p.iou > 0.80 &&
          ['gem', 'rockfall'].some(s => p.sa === s || p.sb === s));
        ok(back.length >= 2,
           '[R2] 되돌림 시험 — 오목(a)을 0 으로 지우면 두 종이 **볼록 무리로 되돌아간다**: ' +
           '0.80 위 쌍 ' + back.length + '개 ≥ 2 (' +
           back.slice(0, 4).map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · ') + ')');
      }
    } finally { try { fs.unlinkSync(NEG_CVX); } catch (_) {} }
  }

  /* ── [R3] 3회차의 되돌림 시험 — «구멍이 축이다» ──
     ⚑⚑ **처음에 세운 [R3] 은 다른 것을 물었고, 그 자가 내 설명을 기각했다.** 3회차는 «토막을 셋으로
     둬서 4각 대칭을 깼다» 를 이유로 적었는데, 토막만 4 로 되돌린 사본에서 `star↔cross` 는
     0.406 → **0.414**(+0.008)로 **꿈쩍도 안 했다**. 즉 표창과 갈린 것은 대칭 수가 아니라 **구멍**이다
     (토막 수는 «회전감» 이라는 뜻의 몫이고 분간의 축이 아니다 — 제품 주석도 그렇게 고쳤다).
     ⇒ 되돌림을 **획을 굵혀 고리를 메우는** 쪽으로 다시 세운다. 한 값(획 폭)만 바꾼다. */
  if (!/ringArcs\(5\.5 \+ 2\*pad\)/.test(src)) {
    ok(false, '[R3-0] 되돌림 앵커(`ringArcs(5.5 + 2*pad)`)를 못 찾았다 — 자를 고쳐라(사본이 낡았다)');
  } else {
    fs.writeFileSync(NEG_SEG, src.replace('ringArcs(5.5 + 2*pad)', 'ringArcs(17 + 2*pad)'), 'utf8');
    try {
      const neg = await pairsOf(browser, 'file://' + NEG_SEG);
      if (neg.__err) { ok(false, '[R3] 되돌림 사본 측정 예외 — ' + neg.__err); }
      else {
        const nid = neg.ids.find(i => neg.rows[i].sh === 'cross');
        const nh = nid ? holePx(neg.rows[nid].body, neg.bw) : -1;
        const nWorst = withSh(neg.pairs, 'cross')[0];
        ok(nh < 300 && nWorst && nWorst.iou > R2_MAX.cross,
           '[R3] 되돌림 시험 — 획을 굵혀 **구멍을 메우면** [C5]·[C3-cross] 가 실제로 빨개진다: ' +
           '구멍 ' + nh + '화소 (< 300) · cross 최악 ' +
           (nWorst ? nWorst.sa + '↔' + nWorst.sb + ' ' + nWorst.iou.toFixed(3) : '?') + ' > ' + R2_MAX.cross +
           ' (메운 고리는 곧 볼록 원반이고, 볼록은 무엇이든 화구와 붙는다 — 2회차 ②의 그 법칙)');
      }
    } finally { try { fs.unlinkSync(NEG_SEG); } catch (_) {} }
  }

  /* ── [R4] 4회차의 되돌림 시험 — «얇은 손톱달이 일하고 있다» ──
     한 값만 바꾼다: 파낸 원을 2.25 → **1.95** 배로(= 등두께 0.15 → **0.45** 로 살찐 옛 꼴).
     형상 가족·크기·자리·층은 그대로이므로 이 판이 빨개지면 원인은 «등두께» 하나뿐이다.
     ⚑ 왜 이 값인가 — 후보 탐색표가 `cres d1.40 r1.95` 를 **0.758 ↔ arc** 로 찍는다(수리 전 0.714 보다도
       높다). 즉 «굽은 띠 무리» 는 이 종이 얇지 않은 한 반드시 되돌아온다.
     ⚠ 뿔 각·잉크 무게중심은 이 한 값에서 **파생**되므로(제품이 `Math.acos` 로 낸다) 사본이
       스스로 닫힌다 — 되돌림 사본에 손으로 적을 상수가 하나도 없다(368·861 처방). */
  if (!/M_RAK = 2\.25/.test(src)) {
    ok(false, '[R4-0] 되돌림 앵커(`M_RAK = 2.25`)를 못 찾았다 — 자를 고쳐라(사본이 낡았다)');
  } else {
    fs.writeFileSync(NEG_FAT, src.replace('M_RAK = 2.25', 'M_RAK = 1.95'), 'utf8');
    try {
      const neg = await pairsOf(browser, 'file://' + NEG_FAT);
      if (neg.__err) { ok(false, '[R4] 되돌림 사본 측정 예외 — ' + neg.__err); }
      else {
        const nWorst = withSh(neg.pairs, 'moon')[0];
        const nOver = withSh(neg.pairs, 'moon').filter(p => p.iou > COMPLAIN);
        const nowWorst = withSh(cur.pairs || [], 'moon')[0];
        const jump = (nWorst ? nWorst.iou : 0) - (nowWorst ? nowWorst.iou : 0);
        ok(!!nWorst && nWorst.iou > R2_MAX.moon && nOver.length >= 2 && jump >= 0.05,
           '[R4] 되돌림 시험 — 초승달을 **도로 살찌우면**(등두께 0.15 → 0.45) [C3-moon] 이 실제로 빨개진다: ' +
           'moon 최악 ' + (nowWorst ? nowWorst.iou.toFixed(3) : '?') + ' → ' +
           (nWorst ? nWorst.sa + '↔' + nWorst.sb + ' ' + nWorst.iou.toFixed(3) : '?') +
           ' (+' + jump.toFixed(3) + ' ≥ 0.05 · 문턱 ' + R2_MAX.moon + ') · ' +
           COMPLAIN + ' 위 moon 쌍 ' + nOver.length + '개 ≥ 2 (' +
           nOver.slice(0, 4).map(p => p.sa + '↔' + p.sb + ':' + p.iou.toFixed(3)).join(' · ') + ')');
      }
    } finally { try { fs.unlinkSync(NEG_FAT); } catch (_) {} }
  }

  await browser.close();
  console.log('\nVERIFY981 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  try { fs.unlinkSync(NEG_ROCK); } catch (_) {}
  try { fs.unlinkSync(NEG_CVX); } catch (_) {}
  try { fs.unlinkSync(NEG_FAT); } catch (_) {}
  try { fs.unlinkSync(NEG_SEG); } catch (_) {}
  console.log('VERIFY981 오류 — ' + e.message); process.exit(1);
});
