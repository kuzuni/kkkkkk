/* 252 게이트 — node tools/verify252.js → 마지막 줄 VERIFY252 PASS
   «12 소환 결과 카드가 첫 장부터 순서대로(DOM = 뽑은 순서) 작았다가 커지며 등장한다»
   (저장소 주인 보고 2026-08-27 — 수정 전에는 58 이 지연을 **등급 오름차순**으로 매겨
    칸이 제자리를 건너뛰며 튀어 «랜덤처럼» 읽혔다.)

   [A] 선언   — 카드별 인라인 animation-delay 가 `i * SUM_POP_STEP` 로 DOM 순 **엄격 증가**
   [B] 과교정 — 등급 순서와 «우연히 같아서» 통과하지 않는다: 등급이 뒤섞인 표본에서
                «delay 오름차순 ≠ 등급 오름차순» 이어야 한다(옛 코드를 되돌리면 여기서 빨개진다)
   [C] 실측   — 실효 scale×opacity 시간축에서 **실제 등장 시각**이 DOM 순으로 단조 증가
   [D] 곡선   — 이긴 애니메이션이 `fxPop`(0 → 1.2 → 1 «작았다가 커진다») 이고 끝나면 scale 1
   [E] 총길이 — 10칸 마지막 카드 지연 = 0.495s(58 과 동일 — verify12·verify84 픽셀 회귀 보존)
   [F] 회귀   — 재화 버스트/소리 트리거가 쓰는 dly 가 카드 수만큼 있고 음수·NaN 0건
   [G] 콘솔 에러 0 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let fails = [], checks = 0;
const ck = (name, ok, info) => {
  checks++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : ''));
  if (!ok) fails.push(name);
};

/* 같은 아이템은 개수로 합쳐지므로 «서로 다른 n 종» 을 뽑아 칸 수를 못 박는다.
   등급이 섞이게 g 가 2종 이상 나올 때까지 다시 뽑는다([B] 가 그걸 요구한다). */
const SEED = (n) => `(async () => {
  S.dia = 1e9;
  let res = [], seen = new Set();
  for (let i = 0; i < 12000 && res.length < ${n}; i++) {
    const r = summonOne('weapon');
    if (seen.has(r.it.id)) continue;
    seen.add(r.it.id); res.push(r);
  }
  return res;
})()`;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const R = await p.evaluate(async (seedSrc) => {
    const res = await eval(seedSrc);
    showSummonResult('weapon', res.length, res, false);
    const cards = [...document.getElementById('sumGridIn').children];

    /* ⚠ 표본 채취를 **맨 먼저** 시작한다. 처음 판에서는 선언값(decl) 수집을 먼저 했더니
       `petPaint()` 의 캔버스 10장이 380ms 를 먹어 첫 표본이 그만큼 늦게 찍혔고,
       그 사이에 이미 등장한 앞 칸 4개가 «같은 t» 로 뭉쳐 [C3] 간격이 335ms 로 잘렸다.
       (LESSONS 221-① «게이트가 빨간 이유는 재는 법이 틀렸다도 있다» — 실제로 그랬다.)
       인라인 delay·animation-name·--jzd 는 애니메이션이 끝나도 안 바뀌므로 뒤에서 읽어도 같다. */
    const t0 = performance.now();
    const trace = [];
    for (let k = 0; k < 60; k++) {                    /* 20ms × 60 — 10칸 마지막이 495+340 = 835ms 에 끝난다 */
      trace.push({
        t: performance.now() - t0,
        row: cards.map(el => {
          const cs = getComputedStyle(el);
          const m = new DOMMatrixReadOnly(cs.transform);
          return Math.hypot(m.a, m.b) * Number(cs.opacity);
        }),
        /* 252 — `.jz-st` 는 **잠깐 붙었다 떨어진다**(jzStagLife). 한 시점만 보면 못 잡으므로
           창 전체에서 «이긴 animation-name» 과 스태거 클래스를 같이 찍는다. */
        nm: cards.map(el => getComputedStyle(el).animationName),
        st: cards.map(el => el.classList.contains('jz-st') ? 1 : 0),
      });
      await new Promise(r => setTimeout(r, 20));
    }
    const t1st = trace[0].t;                          /* 첫 표본이 얼마나 늦게 찍혔나 — [C0] 이 감시한다 */

    const decl = cards.map((el, i) => {
      const cs = getComputedStyle(el);
      return {
        i, g: res[i] ? res[i].it.g : -1,
        delay: parseFloat(el.style.animationDelay) || 0,
        name: cs.animationName,
        jzd: el.style.getPropertyValue('--jzd') || '',
      };
    });
    const finalScale = cards.map(el => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return Math.hypot(m.a, m.b);
    });
    return { decl, trace, finalScale, t1st, step: typeof SUM_POP_STEP === 'number' ? SUM_POP_STEP : null };
  }, SEED(10));

  const n = R.decl.length;
  const delays = R.decl.map(d => d.delay);
  const grades = R.decl.map(d => d.g);

  /* ── [A] 선언 ── */
  ck('[A1] 칸 10개(서로 다른 무기 10종)', n === 10, n + '칸');
  ck('[A2] SUM_POP_STEP 상수 노출 = 0.055', R.step === 0.055, String(R.step));
  const stepOk = delays.every((v, i) => Math.abs(v - i * 0.055) < 1e-6);
  ck('[A3] 인라인 delay = i × 0.055 (DOM 순 엄격 증가)', stepOk,
     delays.map(v => v.toFixed(3)).join(' '));

  /* ── [B] 과교정 잠금 — 등급 순서와 구분되는 표본인지부터 확인 ── */
  const uniqG = [...new Set(grades)];
  const gradeOrder = R.decl.slice().sort((x, y) => x.g - y.g || x.i - y.i).map(d => d.i).join(',');
  const domOrder = R.decl.map(d => d.i).join(',');
  ck('[B1] 표본에 등급이 2종 이상 섞여 있다(구분력 확보)', uniqG.length >= 2,
     'g=' + uniqG.join(','));
  ck('[B2] «등급 오름차순» 과 «DOM 순» 이 서로 다르다 — 옛 코드로 되돌리면 [A3]·[C2] 가 빨개진다',
     gradeOrder !== domOrder, '등급순 ' + gradeOrder + ' vs DOM ' + domOrder);

  /* ── [C] 실측 등장 시각 ── */
  ck('[C0] 첫 표본이 40ms 안에 찍혔다 (앞 칸이 «같은 t» 로 뭉쳐 [C3] 을 속이지 않는다)',
     R.t1st < 40, R.t1st.toFixed(1) + 'ms');
  const first = [];
  for (let c = 0; c < n; c++) {
    let t = null;
    for (const s of R.trace) if (s.row[c] > 0.05) { t = s.t; break; }
    first.push(t);
  }
  ck('[C1] 전 칸이 표본 창(1.2s) 안에서 등장', first.every(t => t !== null),
     first.map((t, i) => 'i' + i + ':' + (t === null ? '—' : Math.round(t))).join(' '));
  const mono = first.every((t, i) => i === 0 || (t !== null && first[i - 1] !== null && t >= first[i - 1] - 1e-9));
  ck('[C2] 실제 등장 시각이 DOM 순으로 단조 증가 («순서대로 다다다다닥»)', mono,
     first.map(t => t === null ? '—' : Math.round(t)).join(' '));
  const spread = first[n - 1] - first[0];
  ck('[C3] 첫 칸 ~ 끝 칸 간격이 0.35~1.10s (한꺼번에 뜨지도, 늘어지지도 않는다)',
     spread > 350 && spread < 1100, Math.round(spread) + 'ms');

  /* ── [D] 곡선 ── */
  const names = [...new Set(R.trace.flatMap(s => s.nm))];
  ck('[D1] 창 **전체**에서 이긴 animation-name 이 언제나 fxPop 뿐 («작았다가 커진다» 0→1.2→1)',
     names.length === 1 && names[0] === 'fxPop', names.join(','));
  const stagFrames = R.trace.filter(s => s.st.some(v => v)).length;
  ck('[D2] `.jz-st`(60 카드 스태거)가 이 그리드에 **한 프레임도** 안 붙는다 — 등장 연출 2개 겹침 차단',
     stagFrames === 0 && R.decl.every(d => d.jzd === ''),
     'jz-st 프레임 ' + stagFrames + '/' + R.trace.length + ' · --jzd=[' + R.decl.map(d => d.jzd).join(',') + ']');
  /* 두 번 등장(«팝 → 사라짐 → 다시 팝») 잠금: 실효값이 0.05 를 넘은 뒤 다시 0.05 밑으로 내려가면 안 된다 */
  const redo = [];
  for (let c = 0; c < n; c++) {
    let seen = false, back = false;
    for (const s of R.trace) { if (s.row[c] > 0.05) seen = true; else if (seen) back = true; }
    if (back) redo.push('i' + c);
  }
  ck('[D2b] 한 번 나타난 카드가 다시 사라지지 않는다 (수정 전에는 jz-st 가 떨어지며 fxPop 이 재시작됐다)',
     redo.length === 0, redo.length ? '재등장 ' + redo.join(',') : '0건');
  const over = R.trace.some(s => s.row.some(v => v > 1.05));
  ck('[D3] 도중에 1.0 을 넘겨 부풀었다가(오버슛) 돌아온다', over, '최대 ' +
     Math.max(...R.trace.map(s => Math.max(...s.row))).toFixed(3));
  ck('[D4] 끝나면 전 칸 scale 1 (정지 레이아웃 불변 — verify12·verify84 회귀)',
     R.finalScale.every(v => Math.abs(v - 1) < 0.01), R.finalScale.map(v => v.toFixed(3)).join(' '));

  /* ── [E] 총길이 ── */
  ck('[E1] 10칸 마지막 카드 지연 = 0.495s (58 과 동일 — 총 길이 불변)',
     Math.abs(delays[n - 1] - 0.495) < 1e-6, delays[n - 1].toFixed(3) + 's');

  /* ── [F] dly 소비처 회귀 ── */
  ck('[F1] delay 가 카드 수만큼 · 음수/NaN 0건 (버스트·flip 소리 트리거가 이 배열을 쓴다)',
     delays.length === n && delays.every(v => Number.isFinite(v) && v >= 0),
     delays.length + '개');

  ck('[G] 콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));

  await b.close();
  const ok = fails.length === 0;
  console.log((ok ? 'VERIFY252 PASS' : 'VERIFY252 FAIL') + ' (' + (checks - fails.length) + '/' + checks + ')');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); console.log('VERIFY252 FAIL (예외)'); process.exit(1); });
