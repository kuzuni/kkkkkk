/* 작업 240 회귀 게이트 — 19 프로필 탭 라벨 「칭호」의 속공간 (2026-08-27, T1 버그).
   실행: node tools/verify240.js   → 마지막 줄이 `VERIFY240 n/n PASS` 여야 한다.

   버그: `.pf-tab` 이 `--st-body`(.16 → fs38 에서 **6.08px**)를 두르는데, 「칭」의 **작은 받침 ㅇ** 이
   그 두께에 76% 막혀 있었다 — 격리 렌더 4.6 px² · **화면(드롭 포함) 3.4 px²**, 둘 다 하한 8.0 미만.
   126 은 이 자리를 내내 «초상화» 의 큰 ㅇ 하나로 재고 있었고(30.4), 201 이 그 칸을 폐기하면서 드러났다.
   처방: 이 자리 전용 토큰 `--st-pft`(.115 → fs38 에서 **4.37px**). 드롭(dy 1.9 · dx 1.06)은 손대지 않는다.

   ⚑ 787 이관(2026-09-02, sess-1643-19449) — **fs 를 38 → 42 로 올리면서 이 자의 상수 넷이 빨개졌다.**
     비평 2인이 독립으로 «탭 라벨 잉크 ref 64×42 vs 우리 61×38 = −9.5%» 를 냈고 상자·중심 x 는 완전 일치라
     라벨만 키운 것이다. 빨개진 넷은 **전부 fs 38 에서 파생된 절대 px** 였다:
       스트로크 4.37(= 38×.115) · 음성항 6.08(= 38×.16) · 라벨 x 261.42 · 라벨 자연폭 57.14.
     ⇒ 333 처방대로 **자리를 비우지 않고 «뜻» 으로 갈아 끼웠다** — 이 자가 지키려던 것은 «4.37px» 이라는
       숫자가 아니라 «이 자리의 스트로크는 `--st-pft` 비율이다 · 스트로크가 레이아웃을 못 민다» 이다:
       · 스트로크 → **실측 fs × .115** 와 대조(fs 를 읽어서 기대값을 만든다)
       · 음성항  → **실측 fs × .16**
       · 라벨 x   → «탭 상자 중심과 라벨 중심이 같다»(스트로크가 밀면 이게 깨진다)
       · 라벨 폭  → «자연폭 ÷ fs = 1.5037»(fs 를 바꿔도 글리프 advance 비는 안 변한다)
     속공간 하한 8 px² 과 음성 대조는 **한 줄도 안 무르게** 두었다 — 실제로 13.3 px² 로 더 넓어졌다.

   본다:
     §1 화면   드롭까지 켠 «실제로 보이는» 속공간이 하한 8.0 px² 이상이고, 고치기 전(3.4)의 2배 이상.
     §2 음성   토큰을 옛 값(.16)으로 되돌리면 **다시 8 미만으로 떨어진다** — 이 게이트가 «값을 지키는»
               게이트임을 스스로 증명한다. 이게 없으면 나중에 잣대가 헐거워져도 초록만 뜬다(189-③ «헛초록»).
     §3 드롭   오프셋 = «스트로크 절반 + 보이는 몫» 이므로, 실측 오프셋에서 sw/2 를 빼면 126 20회차가
               세 비평가로 확정한 dy **+1.9** · dx **+1.06** 이 그대로 나와야 한다(스트로크만 바꿨다는 증명).
     §4 기하   19 는 ①~④ 8점 통과 화면이다. 스트로크는 레이아웃에 안 잡히므로 탭 칸·라벨·콘텐츠 패널이
               측정표 19 §4·§5-1 (ref y − 84) 에서 **한 픽셀도** 움직이면 안 된다.
     §5 격리   `--st-pft` 는 `.pf-tab` 한 블록에서만 쓰이고(스트로크 1 + 드롭 2 = 3곳), 그 블록에
               `--st-body` 는 한 곳도 남지 않는다. 다른 자리의 `--st-body` 는 .16 그대로다.
     §6 화면비 1600·1920·2280·2600 네 프레임에서 §1 이 그대로 · 콘솔 에러 0.

   ⚠ 왜 «화면» 으로 재는가: `tools/m126counter.js` 는 **격리 렌더**라 드롭 섀도를 안 들고 간다
      (이웃 글자·오버레이가 판정을 뒤집기 때문이고, 그 판단은 옳다). 그래서 이 자리는 격리로는
      4.6 인데 화면으로는 3.4 였다 — 드롭이 구멍을 한 번 더 메운다. 두 잣대가 **둘 다** 있어야 한다:
      격리는 m126counter 가(17.8), 화면은 여기가(9.6) 본다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const SEL = '#pfw .pf-tab.t1>i';
const FLOOR = 8.0;      /* m126counter.js 와 같은 하한 — 이 디자인이 «열려 있다» 고 인정한 절대 면적 */
const BEFORE = 3.4;     /* 240 착수 전 화면 실측 */

/* 화면 속공간 — 계산된 타이포그래피(+ 드롭 섀도)를 실효 배경색 위에 격리 렌더하고,
   «배경색인데 검정에 갇힌» 섬 중 가장 큰 것의 면적을 원본 px² 로 낸다.
   섬 «개수» 가 아니라 «최대 면적» 인 이유는 m126counter.js 서두 참고(두꺼울수록 가짜 주머니가 는다). */
const HOLE = `(async function(sel, ratio){
  const el = document.querySelector(sel);
  if (!el) return null;
  const tab = el.parentElement;
  const fsz = parseFloat(getComputedStyle(el).fontSize);
  if (ratio) {                                   /* §2 음성 대조용 — 옛 토큰 값으로 되돌려 본다 */
    const sw = fsz * ratio;
    tab.style.webkitTextStroke = sw + 'px #000';
    tab.style.textShadow = '0 ' + (sw/2 + 1.9) + 'px 0 #000,' + (sw/2 + 1.06) + 'px 0 0 #000';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  let bg = null;
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) { bg = c; break; }
  }
  bg = bg || 'rgb(0,0,0)';
  const m = bg.match(/\\d+/g).map(Number);
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect(), S = 6;
  const W = Math.ceil(r.width * S) || 1, H = Math.ceil(r.height * S) || 1;
  const sp = document.createElement('span');
  sp.textContent = (el.textContent || '').trim();
  sp.style.cssText = 'display:inline-block;white-space:nowrap;background:' + bg + ';'
    + 'font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';'
    + 'letter-spacing:' + cs.letterSpacing + ';color:' + cs.color + ';line-height:' + cs.lineHeight + ';'
    + '-webkit-text-stroke:' + cs.webkitTextStrokeWidth + ' ' + cs.webkitTextStrokeColor + ';'
    + 'paint-order:' + (cs.paintOrder || 'normal') + ';text-shadow:' + cs.textShadow + ';';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">'
    + '<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"'
    + ' style="transform:scale(' + S + ');transform-origin:0 0;background:' + bg + '">'
    + new XMLSerializer().serializeToString(sp) + '</div></foreignObject></svg>';
  const img = new Image();
  await new Promise((okk, ng) => { img.onload = okk; img.onerror = ng;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.fillStyle = bg; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, W, H).data;
  const face = new Uint8Array(W * H);
  for (let k = 0, q = 0; k < d.length; k += 4, q++)
    if (Math.abs(d[k]-m[0]) < 20 && Math.abs(d[k+1]-m[1]) < 20 && Math.abs(d[k+2]-m[2]) < 20) face[q] = 1;
  const seen = new Uint8Array(W * H), st = [];
  const push = q => { if (face[q] && !seen[q]) { seen[q] = 1; st.push(q); } };
  for (let x = 0; x < W; x++) { push(x); push((H-1)*W + x); }
  for (let y = 0; y < H; y++) { push(y*W); push(y*W + W - 1); }
  while (st.length) { const q = st.pop(), x = q % W, y = (q / W) | 0;
    if (x > 0) push(q-1); if (x < W-1) push(q+1); if (y > 0) push(q-W); if (y < H-1) push(q+W); }
  const s2 = new Uint8Array(W * H); let top = 0;
  for (let q = 0; q < W * H; q++) {
    if (!face[q] || seen[q] || s2[q]) continue;
    let c = 0; const stk = [q]; s2[q] = 1;
    while (stk.length) { const z = stk.pop(), x = z % W, y = (z / W) | 0; c++;
      const nb = [x > 0 ? z-1 : -1, x < W-1 ? z+1 : -1, y > 0 ? z-W : -1, y < H-1 ? z+W : -1];
      for (const t of nb) if (t >= 0 && face[t] && !seen[t] && !s2[t]) { s2[t] = 1; stk.push(t); } }
    if (c > top) top = c;
  }
  const out = { hole: +(top / (S*S)).toFixed(1), sw: +parseFloat(cs.webkitTextStrokeWidth).toFixed(2),
                sh: cs.textShadow, fs: +fsz.toFixed(1) };
  tab.style.webkitTextStroke = ''; tab.style.textShadow = '';
  return out;
})`;

/* 프레임 좌표(1080 기준) — #app 의 스케일을 되돌려 «측정표와 같은 자» 로 읽는다 */
const RECT = `(function(sel){
  const e = document.querySelector(sel); if (!e) return null;
  const r = e.getBoundingClientRect(), f = document.getElementById('app').getBoundingClientRect();
  const sc = f.width / 1080;
  return { x:+((r.x-f.x)/sc).toFixed(2), y:+((r.y-f.y)/sc).toFixed(2),
           w:+(r.width/sc).toFixed(2), h:+(r.height/sc).toFixed(2) };
})`;

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(800);
  await p.click('#profBtn');
  await p.waitForTimeout(700);

  /* ── §1 화면 속공간 ── */
  console.log('§1 화면 속공간 (드롭 포함)');
  const now = await p.evaluate(`(${HOLE})('${SEL}', 0)`);
  ok(!!now, '탭 라벨 「칭호」를 찾았다', SEL);
  ok(now && now.hole >= FLOOR, `화면 속공간 ${now && now.hole} px² ≥ 하한 ${FLOOR}`);
  ok(now && now.hole >= BEFORE * 2, `고치기 전(${BEFORE}) 대비 2배 이상 — ${now && now.hole}`);
  /* 787 이관 — 기대값을 «실측 fs × 토큰» 으로 만든다(fs 를 바꿔도 뜻이 살아 있다) */
  const FS = await p.evaluate(`(() => { const e = document.querySelector('${SEL}');
    return e ? parseFloat(getComputedStyle(e).fontSize) : null; })()`);
  ok(FS > 0, `탭 라벨 fs 실측 ${FS}px`);
  near(`스트로크 = fs${FS} × .115`, now.sw, +(FS * 0.115).toFixed(2), 0.05);

  /* ── §2 음성 대조 ── */
  console.log('§2 음성 대조 — 옛 값(.16)으로 되돌리면 다시 막힌다');
  const old = await p.evaluate(`(${HOLE})('${SEL}', 0.16)`);
  near(`되돌린 스트로크 = fs${FS} × .16`, old.sw, +(FS * 0.16).toFixed(2), 0.05);
  ok(old.hole < FLOOR, `옛 값에서는 ${old.hole} px² < 하한 ${FLOOR} (잣대가 살아 있다)`);
  ok(now.hole > old.hole, `새 값이 옛 값보다 넓다 (${old.hole} → ${now.hole})`);
  const back = await p.evaluate(`(${HOLE})('${SEL}', 0)`);
  eq('되돌린 인라인 스타일을 걷어냈다', back.sw, now.sw);

  /* ── §3 드롭의 «보이는 몫» ── */
  console.log('§3 드롭 — 오프셋 − 스트로크 절반 = 126 20회차 확정값');
  const off = (now.sh.match(/(-?[\d.]+)px/g) || []).map(parseFloat);
  /* computed: "rgb(0,0,0) 0px DYpx 0px, rgb(0,0,0) DXpx 0px 0px" */
  const dy = off[1], dx = off[3];
  near('드롭 dy 보이는 몫 +1.9', +(dy - now.sw / 2).toFixed(2), 1.9, 0.06);
  near('드롭 dx 보이는 몫 +1.06', +(dx - now.sw / 2).toFixed(2), 1.06, 0.06);

  /* ── §4 기하 회귀 (측정표 19 §4·§5-1, ref y − 84) ── */
  console.log('§4 기하 — 스트로크는 레이아웃을 못 밀어야 한다');
  const g = await p.evaluate(`({ tab:(${RECT})('#pfw .pf-tab.t1'), lab:(${RECT})('${SEL}'),
                                 grid:(${RECT})('#pfw .pf-grid'), pf:(${RECT})('#pfw .pf') })`);
  eq('탭 칸 x (ref 176)', g.tab.x, 176);
  eq('탭 칸 y (ref 917 − 84 = 833)', g.tab.y, 833);
  eq('탭 칸 w (ref 228)', g.tab.w, 228);
  eq('탭 칸 h (활성 71)', g.tab.h, 71);
  /* 787 이관 — «스트로크가 레이아웃을 못 민다» 를 fs 에 안 묶인 꼴로 적는다.
     ① 라벨 중심 = 탭 칸 중심(스트로크가 한쪽으로 밀면 즉시 깨진다)
     ② 자연폭 ÷ fs = 글리프 advance 비(fs 를 바꿔도 안 변한다. 38 에서 57.14 → 1.5037) */
  near('라벨 중심 = 탭 칸 중심', +(g.lab.x + g.lab.w / 2).toFixed(2), +(g.tab.x + g.tab.w / 2).toFixed(2), 0.6);
  near('자연폭 ÷ fs (글리프 advance 비)', +(g.lab.w / FS).toFixed(4), 1.5037, 0.004);
  eq('콘텐츠 패널 y (ref 985 − 84 = 901)', g.grid.y, 901);
  eq('콘텐츠 패널 w', g.grid.w, 780);
  eq('콘텐츠 패널 h', g.grid.h, 544);
  eq('팝업 껍데기 w', g.pf.w, 896);

  /* ── §5 토큰 격리 ── */
  console.log('§5 토큰 격리');
  const tok = SRC.match(/--st-pft:\s*([.\d]+);/);
  ok(!!tok, '`--st-pft` 가 :root 에 정의돼 있다');
  eq('토큰 값', tok && tok[1], '.115');
  const uses = (SRC.match(/var\(--st-pft\)/g) || []).length;
  eq('`--st-pft` 사용처 (스트로크 1 + 드롭 2)', uses, 3);
  /* `.pf-tab{ … }` 블록 하나만 떼어 그 안에서만 쓰이는지 본다 */
  const bi = SRC.indexOf('\n  .pf-tab{');
  const be = SRC.indexOf('}', SRC.indexOf('text-shadow:0 calc(var(--st-pft)', bi));
  const block = SRC.slice(bi, be + 1);
  eq('전부 `.pf-tab` 블록 안', (block.match(/var\(--st-pft\)/g) || []).length, 3);
  eq('그 블록에 남은 `--st-body`', (block.match(/var\(--st-body\)/g) || []).length, 0);
  const body = SRC.match(/--st-body:\s*([.\d]+);/);
  eq('`--st-body` 는 .16 그대로 (남의 자리를 안 건드렸다)', body && body[1], '.16');
  ok((SRC.match(/var\(--st-body\)/g) || []).length > 20,
     `다른 자리의 --st-body 사용처가 그대로 살아 있다 (${(SRC.match(/var\(--st-body\)/g) || []).length}곳)`);

  /* ── §6 화면비 4종 ── */
  console.log('§6 화면비 4종');
  for (const h of [1600, 1920, 2280, 2600]) {
    await p.setViewportSize({ width: 1080, height: h });
    await p.waitForTimeout(350);
    await p.evaluate(() => { openProfile(); void document.body.offsetHeight; });
    await p.waitForTimeout(200);
    const r = await p.evaluate(`(${HOLE})('${SEL}', 0)`);
    ok(r && r.hole >= FLOOR, `[${h}] 화면 속공간 ${r && r.hole} px² ≥ ${FLOOR}`);
    near(`[${h}] 스트로크 = fs${FS} × .115`, r.sw, +(FS * 0.115).toFixed(2), 0.05);
  }
  eq('콘솔 에러', errs.length, 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY240 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
