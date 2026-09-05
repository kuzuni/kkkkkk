#!/usr/bin/env node
/* 작업 947 — `probe866.py --cap` 의 «바깥» 비교가 자 둘을 견주던 것.
 *
 *   node tools/verify947.js
 *
 * ── 무엇이 결손이었나 ──────────────────────────────────────────────────────
 * 알약 **속**은 932 4회차가 양쪽을 다 부분 화소로 갈아 Δ +1.9% 인데, **바깥**은 ref 쪽만
 * 부분 화소(`measure_pill` + `out_f`)이고 우리 쪽은 `diff_box` 의 **정수 상자** 그대로라
 * Δ +4.8% 였다. 945 가 ref 쪽 캡 인공물을 걷어내자 그 +0.8 의 우연한 상쇄가 사라지면서
 * 남아 있던 갈림이 드러났다 — **제품이 아니라 자의 갈림**이다.
 *
 * ── 재현이 등재문 처방 ⓐ 를 기각했다 ──────────────────────────────────────
 * 등재문은 «`flat()` 에 쓴 것과 같은 `_cross` 교차점» 을 1순위로 적었는데, 차분 경계는
 * **램프가 아니라 계단**이다 — 바깥 화소의 차분은 «조금 다름» 이 아니라 **정확히 0**
 * (두 사본이 같은 화소다)이라 문턱을 지나갈 이웃이 없다. 그 자리에 `_cross` 를 얹으면
 * f = 1 − th/dv 가 되어 **경계 화소가 진할수록 밖으로 민다** = 소속도의 거의 반대다.
 * 합성 시험대에서 그 걸음은 **정수 자보다도 더 틀린다**(진실 100.40 → 101.87).
 * ⇒ 차분 마스크에서 부분 화소를 얻는 축은 **소속도** 하나다(`probe866.cov_f`).
 *
 * ── 자가 묻는 것 ───────────────────────────────────────────────────────────
 *   [A] 재현 — 차분 경계가 계단이고, `_cross`(ⓐ)는 틀리고 소속도는 진실을 되찾는가
 *   [B] 격자가 실제로 정보를 버리는가 (정수 자는 100.0/100.3/100.5 를 한 칸으로 뭉갠다)
 *   [C] `--int` 는 한 글자도 안 다쳤는가 (옛 정수 값 그대로 · 부분 화소는 그보다 크지 않다)
 *   [D] 945 규약 — 끝 행의 둥근 어깨에서 재지 않는가 (`v_band` 중앙값 ↔ 최댓값)
 *   [E] 부르는 쪽이 고르는가 — 수반(ⓐⓑⓒⓓ)은 ref 도 정수 세기라 **정수 자 그대로** 둔다
 *   [F] 과녁은 안 옮겼는가 (`verify866` 상수 넷 — 945 [D1] 규약 그대로)
 *   [G] 실캡처가 있으면 갈림이 닫혔는가 — **없으면 SKIP**(빨강이 아니다 · 953 교훈)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { py } = require('./pydep937');

let pass = 0, fail = 0, skip = 0;
const ok = (t, c, got) => {
  if (c) { pass++; console.log('  PASS ' + t + (got ? ' — ' + got : '')); }
  else { fail++; console.log('  FAIL ' + t + (got ? ' — ' + got : '')); }
};
const sk = (t, why) => { skip++; console.log('  SKIP ' + t + (why ? ' — ' + why : '')); };

/* ── 합성 시험대를 돌린다 ─────────────────────────────────────────────────── */
let bench;
try {
  bench = String(py(['tools/verify947.py'],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch (e) {
  if (e && e.status === 2) {
    console.log('VERIFY947 SKIP — 파이썬 의존 없음 · pip3 install pillow numpy');
    process.exit(2);
  }
  throw e;
}
const syn = bench.split('\n').filter((l) => l.startsWith('SYN ')).map((l) => {
  const o = {};
  l.slice(4).trim().split(/\s+/).forEach((kv) => {
    const [k, v] = kv.split('=');
    o[k] = +v;
  });
  return o;
});
const src = fs.readFileSync(path.join(ROOT, 'tools/probe866.py'), 'utf8');

/* ── [A] 재현 — 차분 경계는 계단이다 ─────────────────────────────────────── */
console.log('\n[A] 차분 경계는 램프가 아니라 계단 — 처방 ⓐ(`_cross`)가 여기서 무엇을 하는가');
{
  const m = bench.match(/STEP outside=([0-9.,]+)/);
  const out = m ? m[1].split(',').map(Number) : [];
  ok('[A1] ★ 마스크 바깥 화소의 차분이 **정확히 0** 이다 — 문턱을 지나갈 이웃이 없다',
    out.length === 4 && out.every((v) => v === 0), out.join(' / '));
  ok('[A0] 합성 표본을 일곱 개 읽었다', syn.length === 7, syn.length + '개');

  const dc = syn.map((s) => s.cross_w - s.truth_w);
  const di = syn.map((s) => s.int_w - s.truth_w);
  const dv = syn.map((s) => Math.abs(s.cov_w - s.truth_w));
  ok('[A2] ★ `_cross`(ⓐ)는 **정수 자보다도 더 틀린다** — 진실보다 1.3px 넘게 밖으로 민다',
    dc.length === 7 && dc.every((v) => v > 1.3) && dc.every((v, i) => v > di[i]),
    'cross ' + dc.map((v) => v.toFixed(2)).join('/') + '  ↔ int ' + di.map((v) => v.toFixed(2)).join('/'));
  ok('[A3] ★ 소속도는 진실을 ±0.1px 안에서 되찾는다 (합성 일곱 표본 전부)',
    dv.length === 7 && dv.every((v) => v <= 0.1), '최대 ' + Math.max(...dv).toFixed(3));
  ok('[A4] 세로도 같다 — 소속도 ±0.1 · `_cross` 는 1.3 넘게 밖',
    syn.every((s) => Math.abs(s.cov_h - s.truth_h) <= 0.1)
    && syn.every((s) => s.cross_h - s.truth_h > 1.3),
    '세로 최대 ' + Math.max(...syn.map((s) => Math.abs(s.cov_h - s.truth_h))).toFixed(3));
  ok('[A5] 그 처방을 자가 **적어 두고 있다** (다음 워커가 같은 처방을 다시 집지 않게)',
    /_cross` 를 못 쓴다/.test(src) && /소속도/.test(src));
}

/* ── [B] 격자가 버리는 것 ────────────────────────────────────────────────── */
console.log('\n[B] 정수 격자가 실제로 정보를 버리는가 (이 번호가 없애는 것은 격자뿐이다)');
{
  const q = [100.0, 100.3, 100.5, 100.7].map((t) => syn.find((s) => s.truth_w === t));
  ok('[B1] ★ 정수 자는 100.0·100.3·100.5 셋을 **같은 칸(101)** 으로 뭉갠다',
    q.every(Boolean) && q[0].int_w === 101 && q[1].int_w === 101 && q[2].int_w === 101
    && q[3].int_w === 102, q.map((s) => s && s.int_w).join(' '));
  ok('[B2] ★ 소속도 자는 그 넷을 **따로** 읽는다 (0.3 걸음이 그대로 보인다)',
    q.every(Boolean) && q[0].cov_w < q[1].cov_w && q[1].cov_w < q[2].cov_w
    && q[2].cov_w < q[3].cov_w, q.map((s) => s && s.cov_w.toFixed(2)).join(' < '));
}

/* ── [C] 옛 정수 자는 그대로 ─────────────────────────────────────────────── */
console.log('\n[C] `--int` 가 한 글자도 안 다쳤는가');
{
  ok('[C1] ★ `SUB=False` 면 부분 화소 값이 정수 상자와 **정확히 같다** (합성 일곱 표본)',
    syn.every((s) => s.intmode_w === s.box_w && s.intmode_h === s.box_h),
    syn.map((s) => `${s.intmode_w}/${s.box_w}`).join(' '));
  ok('[C2] ★ 부분 화소 값은 정수 상자보다 **크지 않다** — α ≤ 1 이라 최악이 옛 값이다',
    syn.every((s) => s.probe_w <= s.box_w + 1e-9 && s.probe_h <= s.box_h + 1e-9),
    '최대 초과 ' + Math.max(...syn.map((s) => Math.max(s.probe_w - s.box_w, s.probe_h - s.box_h))).toFixed(3));
  ok('[C3] 정수 상자 키(`w`·`h`·`foot`·`l`·`r`)는 그대로 있다 — 부르는 자가 고를 수 있어야 한다',
    /'w': max\(r\[2\] for r in rows\.values\(\)\)/.test(src) && /'foot': rows\[ys\[-1\]\]\[2\]/.test(src));
}

/* ── [D] 945 규약 — 둥근 어깨에서 재지 않는다 ────────────────────────────── */
console.log('\n[D] ★ 되돌림 — 끝 행 통계를 «최댓값» 으로 되돌리면 둥근 어깨가 자를 밀어내는가');
{
  const n = syn.find((s) => s.notch === 4);
  ok('[D1] ★ 그 표본에서 최댓값 걸음은 0.4px 넘게 틀리고, `v_band` 중앙값은 ±0.05 다',
    n && Math.abs(n.covmax_h - n.truth_h) > 0.4 && Math.abs(n.cov_h - n.truth_h) <= 0.05,
    n ? `최댓값 ${n.covmax_h.toFixed(2)} · 중앙값 ${n.cov_h.toFixed(2)} (진실 ${n.truth_h})` : '(표본 없음)');
  ok('[D2] 그 갈림은 **어깨가 있을 때만** 난다 — 반듯한 상자에서는 두 걸음이 같다',
    syn.filter((s) => !s.notch).every((s) => Math.abs(s.covmax_h - s.cov_h) < 1e-9));
  ok('[D3] 자가 실제로 `v_band` 를 부른다 (945 가 세운 창을 그대로 쓴다 — 사본 0)',
    /def edge_f\([\s\S]{0,900}?v_band\(a, z\)/.test(src));
}

/* ── [E] 부르는 쪽이 고른다 ─────────────────────────────────────────────── */
console.log('\n[E] 수반은 정수 자 그대로인가 (한쪽만 갈면 거기에 새 비대칭이 생긴다 — 932 4회차)');
{
  ok('[E1] ★ 수반 `ob` 는 `sub` 없이, 알약 `oq` 만 `sub=True` 로 부른다',
    /ob = diff_box\(cp, nb,[\s\S]{0,200}?\)\n/.test(src)
    && !/ob = diff_box\([\s\S]{0,200}?sub=True/.test(src)
    && /oq = diff_box\([\s\S]{0,220}?sub=True\)/.test(src));
  ok('[E2] 인쇄줄이 둘을 갈라 적는다 — 수반은 `%d`, 알약 바깥은 `%.2f` + 자 이름',
    /수반 잉크 %\.0f\.\.%\.0f ⇒ 높이 \*\*%d\*\*/.test(src)
    && /바깥 \*\*%\.2fx%\.2f\*\*/.test(src)
    && /부분 화소 — 소속도/.test(src) && /옛 정수 걸음 — --int/.test(src));
  ok('[E3] 왜 수반은 안 갈았는지 자가 들고 있는다 (ref 쪽도 행 수·화소 개수다)',
    /수반 ⓐⓑⓒⓓ 는 정수 자다/.test(src));
}

/* ── [F] 과녁은 안 옮겼다 ───────────────────────────────────────────────── */
console.log('\n[F] `verify866` 의 과녁 — 947 도 한 줄 안 옮겼다 (945 [D1] 규약)');
{
  const v = fs.readFileSync(path.join(ROOT, 'tools/verify866.js'), 'utf8');
  const num = (re) => { const m = v.match(re); return m ? +m[1] : NaN; };
  const pw = num(/pillW:\s*([0-9.]+)/), ph = num(/pillH:\s*([0-9.]+)/);
  const iw = num(/pillIW:\s*([0-9.]+)/), ih = num(/pillIH:\s*([0-9.]+)/);
  const rg = num(/ring:\s*([0-9.]+)/);
  ok('[F1] ★ 과녁 넷 + 테가 904 의 값 그대로 (260.0×53.3 · 251.1×44.4 · 4.44)',
    pw === 260.0 && ph === 53.3 && iw === 251.1 && ih === 44.4 && rg === 4.44,
    `${pw}×${ph} · ${iw}×${ih} · 테 ${rg}`);
}

/* ── [G] 실캡처가 있으면 대조 · 없으면 SKIP ─────────────────────────────── */
console.log('\n[G] 실캡처(있을 때만) — 속 ↔ 바깥의 갈림이 닫혔는가');
{
  const cap = path.join(ROOT, 'docs/review/probe866-cap.png');
  const geo = path.join(require('os').tmpdir(), 'probe866-geo.json');
  if (!fs.existsSync(cap) || !fs.existsSync(geo)) {
    /* 캡처 PNG 는 커밋 금지 자산이다 — 없는 클론에서 빨개지면 그것이 953 의 자리다. */
    sk('[G1] 캡처가 없다 — `node tools/probe866.js --keep` 뒤에 다시 부르면 잰다',
      '커밋 금지 자산이라 빨강이 아니다(953)');
  } else {
    const out = String(py(['tools/probe866.py', '--cap', cap, '--geo', geo],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    const g = (re) => { const m = out.match(re); return m ? m.slice(1).map(Number) : []; };
    const inn = g(/알약 속 \*\*[0-9.]+x[0-9.]+\*\* \(ref [0-9.]+x[0-9.]+ · Δ 폭 ([+-][0-9.]+)% · 세로 ([+-][0-9.]+)%\)/);
    const outr = g(/바깥 \*\*[0-9.]+x[0-9.]+\*\* \(ref [0-9.]+x[0-9.]+ · Δ 폭 ([+-][0-9.]+)% · 세로 ([+-][0-9.]+)%\)/);
    ok('[G1] 두 Δ 쌍을 읽었다', inn.length === 2 && outr.length === 2,
      `속 ${inn.join('/')} · 바깥 ${outr.join('/')}`);
    ok('[G2] ★ 속과 바깥이 **같은 방향·같은 크기**로 읽힌다 (Δ 차 ≤ 1.5%p) — 갈림이 닫혔다',
      inn.length === 2 && outr.length === 2
      && Math.abs(outr[0] - inn[0]) <= 1.5 && Math.abs(outr[1] - inn[1]) <= 1.5,
      inn.length === 2 && outr.length === 2
        ? `폭 차 ${(outr[0] - inn[0]).toFixed(1)}%p · 세로 차 ${(outr[1] - inn[1]).toFixed(1)}%p` : '');
    ok('[G3] 세로 Δ 가 옛 +4.8% 보다 작다 — 정수 격자가 들고 있던 몫이 빠졌다',
      outr.length === 2 && outr[1] < 3.0, outr.length === 2 ? `세로 Δ ${outr[1]}%` : '');
  }
}

console.log('\nVERIFY947 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS')
  + (skip ? ` (SKIP ${skip})` : ''));
process.exit(fail ? 1 : 0);
