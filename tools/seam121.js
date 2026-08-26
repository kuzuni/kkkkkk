/* 작업 121 — «무늬 타일 이음매» 프로브 (5회차 신설).
   실행: node tools/seam121.js

   4회차 비평가 E·F 가 독립적으로 같은 지적을 냈다: «무늬 타일이 자기 주기의 정수배가 아니라
   타일 경계마다 간격 하나가 −4.1%(골드) / −7.9%(레이드)». 그런데 둘 다 **골드·레이드만** 쟀다 —
   다이아·유물석은 안개 레이어(::after·::before 의 radial)가 줄무늬를 덮어 눈으로 못 센 것이다.

   여기서는 흐름 레이어(`::before`)만 남기고 나머지를 전부 지운 뒤 **가로 스캔라인 1줄**에서
   줄무늬 봉우리 중심을 잡아 **연속 피치**를 잰다. 타일 경계에서 피치가 한 번 튀면 그 값이 이음매 오차다.

   해석 모델(스크립트가 검산한다): 각도 θ 의 repeating-linear-gradient 는 축 방향 주기 P 를 갖고,
   가로축에서는 P/|sinθ| 로 보인다. 타일 폭 W 가 그 정수배가 아니면 타일마다 **끝 간격 하나**가
   frac(W·sinθ/P) 배로 짧아진다 — 그게 «이음매». */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* 테마 이름표. **각도·축주기·타일폭은 하드코딩하지 않는다** — 5회차에 값을 고치고 나서 이 표만
   옛 값으로 남아 «안 고쳐졌다» 고 보고했다. 아래 readTheme() 이 실제 CSS 변수에서 읽는다. */
const TH = { gold: '골드 던전', dia: '다이아 던전', rel: '유물석', raid: '컨텐츠(레이드)' };

/* --bgm1 / --bgz1 을 계산값에서 그대로 읽어 (각도, 축주기, 타일폭) 을 뽑는다.
   --bgm1 이 여러 겹이면 repeating-linear-gradient 겹을 **전부** 돌려준다(다이아는 교차 2겹). */
/* ⚠ 7회차 — **정규식으로 겹을 뜯던 것을 괄호 세는 스캐너로 바꿨다.**
   옛 정규식은 중첩 괄호를 «한 겹» 까지만 견뎠다. 7회차에 무늬 안에 `color-mix()` 를 쓰기 시작하자
   유물석만 조용히 «repeating-linear-gradient 없음 — 건너뜀» 으로 빠졌다 —
   `--bgc` 자체가 `color-mix(in srgb,var(--pt) 45%,#C79BFF)` 라 계산값이 **두 겹 중첩**이 되기 때문이다
   (골드·다이아·레이드는 `--bgc` 가 단색이라 한 겹이어서 계속 통과했다).
   게이트가 «FAIL» 이 아니라 «건너뜀» 으로 조용히 커버리지를 잃는 것이 제일 나쁘다 — 초록불인데
   안 보고 있는 상태가 된다. 괄호 깊이를 세면 몇 겹이 중첩되든 안 놓친다. */
function parseTheme(bgm1, bgz1) {
  const W = parseFloat(bgz1);
  const out = [];
  const KEY = 'repeating-linear-gradient(';
  let i = 0;
  while ((i = bgm1.indexOf(KEY, i)) !== -1) {
    let d = 1, j = i + KEY.length;
    for (; j < bgm1.length && d > 0; j++) {
      if (bgm1[j] === '(') d++;
      else if (bgm1[j] === ')') d--;
    }
    const body = bgm1.slice(i + KEY.length, j - 1);
    i = j;
    const am = body.match(/^\s*([-0-9.]+)deg/);
    if (!am) continue;
    /* 각도 뒤의 «색 스톱» 만 본다. 색 함수 안에 든 숫자(예: color-mix 의 55%)는 px 가 아니라 걸리지 않지만,
       혹시 모를 오염을 막으려고 괄호 안쪽은 통째로 지우고 px 를 센다. */
    const flat = body.replace(/\([^()]*\)/g, '').replace(/\([^()]*\)/g, '');
    const px = [...flat.matchAll(/([-0-9.]+)px/g)].map(x => parseFloat(x[1]));
    if (px.length) out.push({ a: parseFloat(am[1]), P: Math.max(...px) });
  }
  return { W, layers: out };
}

/* 해석값 — 가로 주기와 이음매 간격 비율 */
function model(a, P, W) {
  const hp = P / Math.abs(Math.sin(a * Math.PI / 180));
  const k = W / hp;                       /* 타일 안에 든 주기 개수 */
  const frac = k - Math.floor(k);         /* 끝에 남는 토막 */
  /* k 가 정수면 토막이 없다 = 이음매 없음. 부동소수 때문에 frac 이 0 쪽·1 쪽 어디로도 떨어질 수 있어
     둘 다 «1(온전)» 로 읽는다. 그 사이의 값만 진짜 토막이다. */
  const seam = (frac < 1e-3 || frac > 1 - 1e-3) ? 1 : frac;
  return { hp, k, seam };                 /* seam=1 이면 이음매 없음 */
}

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    S.guide.idx = 99; S.best = 999;
    ['relic1', 'relic2', 'relic3'].forEach(k => { S.dun[k] = 99; });
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => renderDunPage());
  await p.waitForTimeout(400);

  /* 흐름 레이어만 남긴다 — ::after(입자·안개)와 바닥 그라디언트·썸네일·글자를 전부 지우고,
     ::before 를 불투명하게 올려 봉우리 중심이 또렷하게 잡히도록 한다. 애니메이션은 위상 0 에 고정. */
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'p121seam';
    st.textContent = `
      #dunw .dnc>*:not(.bgm){visibility:hidden !important}
      #dunw .dnc>.bgm{background:#000 !important;inset:0 !important;border-radius:0 !important}
      #dunw .dnc>.bgm::after{display:none !important}
      #dunw .dnc>.bgm::before{opacity:1 !important;animation:none !important}`;
    document.head.appendChild(st);
  });
  await p.waitForTimeout(200);

  console.log('[seam] 흐름 레이어(::before) 가로 스캔라인 피치 — 타일 경계에서 한 간격이 짧아지면 그게 이음매\n');
  console.log('  테마            해석 가로주기   타일폭  타일당주기  이음매간격(해석)   실측 피치(중앙값)  실측 이음매   판정');

  const readCards = () => p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const cls = [...el.classList].find(c => c.indexOf('bgm-') === 0) || '';
    return {
      key: cls.replace('bgm-', ''), x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      bgm1: cs.getPropertyValue('--bgm1'), bgz1: cs.getPropertyValue('--bgz1'),
    };
  }));

  const seen = new Set(), fixed = new Set(Object.keys(TH));
  const shown = [];                  /* 처방 표에 쓰려고 실제로 잰 카드를 모아 둔다 */
  let bad = 0;

  /* 던전 탭 6장 + **컨텐츠(레이드) 탭**. 레이드 테마(.bgm-raid)는 서브탭을 바꿔야 DOM 에 나온다 —
     4회차 비평가가 «−7.9%» 로 잰 테마라 여기서 빠지면 교정을 확인할 수 없다.
     ⚠ 좌표는 탭이 **떠 있는 동안** 찍어야 한다 — 탭을 되돌린 뒤 스크린샷하면 엉뚱한 카드를 재게 된다.
     그래서 탭마다 «읽기 → 그 자리에서 스캔» 을 끝낸다. */
  for (const sub of ['dun', 'raid']) {
    if (sub === 'raid') { await p.evaluate(() => setDunSub('raid')); await p.waitForTimeout(900); }
    const cards = await readCards();
    await scan(cards);
  }

  async function scan(cards) {
  for (const c of cards) {
    if (!TH[c.key] || seen.has(c.key)) continue;
    seen.add(c.key);
    const name = TH[c.key];
    const t = parseTheme(c.bgm1, c.bgz1);
    if (!t.layers.length) { console.log('  ' + name.padEnd(20) + '  (repeating-linear-gradient 없음 — 건너뜀)'); continue; }
    /* 겹이 여럿이면 가장 나쁜(이음매가 1 에서 가장 먼) 겹으로 판정한다 */
    const ms = t.layers.map(l => ({ ...model(l.a, l.P, t.W), a: l.a, P: l.P }));
    const m = ms.reduce((w, v) => (Math.abs(v.seam - 1) > Math.abs(w.seam - 1) ? v : w));
    const W = t.W, a = m.a, P = m.P;

    /* 카드 세로 중앙 한 줄을 그대로 읽는다. 그림자·프레임을 피해 좌우 10px 씩 버린다. */
    const buf = await p.screenshot({ clip: { x: c.x + 10, y: c.y + Math.round(c.h / 2), width: c.w - 20, height: 1 } });
    const px = await p.evaluate(async d => {
      const img = new Image(); img.src = d;
      await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = 1;
      cv.getContext('2d').drawImage(img, 0, 0);
      const g = cv.getContext('2d').getImageData(0, 0, img.width, 1).data;
      const out = [];
      for (let i = 0; i < img.width; i++) out.push((g[i * 4] + g[i * 4 + 1] + g[i * 4 + 2]) / 3);
      return out;
    }, 'data:image/png;base64,' + buf.toString('base64'));

    /* 봉우리 = 국소 최대 구간의 중심. 문턱은 (min+max)/2 로 자동. */
    const lo = Math.min(...px), hi = Math.max(...px), th = (lo + hi) / 2;
    const peaks = [];
    let run = null;
    for (let i = 0; i < px.length; i++) {
      if (px[i] >= th) { if (!run) run = [i, i]; else run[1] = i; }
      else if (run) { peaks.push((run[0] + run[1]) / 2); run = null; }
    }
    if (run) peaks.push((run[0] + run[1]) / 2);
    const pit = [];
    for (let i = 1; i < peaks.length; i++) pit.push(peaks[i] - peaks[i - 1]);
    pit.sort((x, y) => x - y);
    const med = pit.length ? pit[Math.floor(pit.length / 2)] : 0;
    const worst = pit.length ? pit[0] : 0;            /* 가장 짧은 간격 = 이음매 후보 */
    const ratio = med ? worst / med : 1;
    const okAnalytic = Math.abs(m.seam - 1) < 0.02;
    if (!okAnalytic) bad++;
    console.log('  ' + (name + ' (' + c.key + ')').padEnd(20)
      + String(m.hp.toFixed(2)).padStart(8)
      + String(W).padStart(9)
      + String(m.k.toFixed(4)).padStart(11)
      + String((m.seam * 100).toFixed(1) + '%').padStart(15)
      + String(med.toFixed(1)).padStart(16)
      + String((ratio * 100).toFixed(1) + '%').padStart(13)
      + (okAnalytic ? '   ok' : '   ⚠ 이음매'));
    shown.push(c);
  }
  }

  console.log('\n  * «이음매간격(해석)» 은 타일 끝 토막이 온전한 한 주기의 몇 %인가다 — 100% 여야 이음매가 없다.');
  console.log('  * «실측 이음매» 는 스캔라인에서 가장 짧은 간격 / 중앙값. 카드 폭(966px)이 타일 2~5개뿐이라');
  console.log('    표본이 적고 좌우 끝이 잘려 해석값보다 관대하게 나온다 — 판정은 해석값으로 한다.');
  console.log('\n  → 이음매 있는 테마 ' + bad + '개');

  /* 처방 계산기 — 타일 폭·속도를 그대로 두고 «축주기» 만 정수배에 맞추는 값 */
  console.log('\n[처방] 타일폭(--bgz1)·이동거리(--bgw1)를 건드리지 않고 축주기만 맞추는 값');
  console.log('  (타일폭을 바꾸면 --bgw1 = 이동거리라 카드 속도가 같이 변한다 — 4회차 ② «카드 간 격차» 를 흔든다)');
  for (const c of shown) {
    if (!TH[c.key] || !fixed.has(c.key)) continue;
    fixed.delete(c.key);
    const t = parseTheme(c.bgm1, c.bgz1);
    t.layers.forEach((l, li) => {
      const mm = model(l.a, l.P, t.W);
      const n = Math.max(1, Math.round(mm.k));
      const Pfix = t.W * Math.abs(Math.sin(l.a * Math.PI / 180)) / n;
      const tag = TH[c.key] + (t.layers.length > 1 ? ' #' + (li + 1) : '');
      console.log('  ' + tag.padEnd(18) + String(l.a).padStart(5) + '°  축주기 ' + l.P.toFixed(1).padStart(6) + ' → '
        + Pfix.toFixed(2).padStart(7) + 'px  (' + ((Pfix / l.P - 1) * 100).toFixed(2).padStart(6) + '%)  타일당 ' + n + '주기'
        + (Math.abs(mm.seam - 1) < 0.02 ? '   ok' : '   ⚠'));
    });
  }

  await p.evaluate(() => { const s = document.getElementById('p121seam'); if (s) s.remove(); });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
