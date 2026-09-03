#!/usr/bin/env node
/* 작업 681 게이트 — 「공용 `.fx-spark` 봉투: **탄생 박자**와 **퇴장 계조**」
 * (666 4·5회차 비평 2인이 «단 하나» 로 남긴 곡선 · LESSONS 666-⑨ 가 등재로 넘긴 자리)
 *
 *   node tools/verify681.js
 *
 *   [A] 선언   — 곡선이 «작게 태어나 커지고», 어디서도 1 을 안 넘고, 끝 크기가 .5 아래로 안 내려간다
 *                (수명 380ms · 52% 경계 · 이동 계수 .78 은 **불변** — 남의 자들이 그 위에 서 있다)
 *   [B] 봉투   — 브라우저가 **실제로 그린** 상자·알파로 잰다(탄생 · 꼬리 · 잉크 · 퇴장 폭)
 *   [C] 불변   — 전용 봉투 `fxRlic`(753)·수명·발화는 한 값도 안 바뀌었다
 *   [R] 되돌림 — 옛 곡선을 얹으면 [B] 의 탄생·꼬리 항이 **빨개진다**(무르게 푼 수리가 아님 · 334·368 규약)
 *
 * ⚠ 자를 두 벌로 안 적는다 — 표본기·요약은 `tools/envelope681.js` 를 `probe681` 과 **같이** 쓴다.
 * ⚠ 문턱의 출처는 전부 실측이다(수리 전 ↔ 수리 후, `probe681`):
 *     출생 크기 100% ↔ 34% · α≤0.35 꼬리 96.9ms ↔ 27.9ms · 290ms 잉크 0.17 ↔ 0.53 · 340ms 0.03 ↔ 0.24.
 *   문턱은 그 사이에 놓되 프레임 흔들림에 안 뒤집히는 자리로 잡았다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { SAMPLE, summarize, gridSteps, SPREAD, spreadOf } = require('./envelope681');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const STEPS = Number(process.env.V681_STEPS || 20);
/* 비평가가 실제로 보는 여덟 장의 시각(`cap681` 의 STOPS). [B12] 는 **이 격자에서만** 뜻이 있다. */
const STOPS = [0, 20, 45, 70, 110, 175, 250, 320];

/* 수리 전 곡선(= 되돌림 시험의 재료). `probe681` 과 같은 문자열이다. */
const OLD = '@keyframes fxSpark{0%{transform:translate(0,0) scale(1);opacity:1}'
  + '52%{transform:translate(calc(var(--dx)*.78),calc(var(--dy)*.78)) scale(1);opacity:1}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.62);opacity:0}}';

/* ⚑ 6회차 — [R7] 전용 재료. **5회차 곡선**이다(수리 전 곡선이 아니다).
   [B12] 가 «무르게 푼 자» 가 아님을 보이려면 되돌릴 상대가 **바로 앞 회차**여야 한다 —
   수리 전 곡선은 0~52% 가 통째로 평평해서 어떤 격자에서도 빨개지므로 이 항을 못 가른다. */
const PREV5 = '@keyframes fxSpark{0%{transform:translate(0,0) scale(.26);opacity:.6;animation-timing-function:linear}'
  + '11%{transform:translate(calc(var(--dx)*.18),calc(var(--dy)*.18)) scale(.86);opacity:1;animation-timing-function:linear}'
  + '18%{transform:translate(calc(var(--dx)*.28),calc(var(--dy)*.28)) scale(1);opacity:1;animation-timing-function:linear}'
  + '33%{transform:translate(calc(var(--dx)*.48),calc(var(--dy)*.48)) scale(.92);opacity:.97;animation-timing-function:linear}'
  + '44%{transform:translate(calc(var(--dx)*.61),calc(var(--dy)*.61)) scale(.87);opacity:.93;animation-timing-function:linear}'
  + '56%{transform:translate(calc(var(--dx)*.73),calc(var(--dy)*.73)) scale(.81);opacity:.88;animation-timing-function:linear}'
  + '70%{transform:translate(calc(var(--dx)*.85),calc(var(--dy)*.85)) scale(.73);opacity:.73;animation-timing-function:linear}'
  + '86%{transform:translate(calc(var(--dx)*.945),calc(var(--dy)*.945)) scale(.62);opacity:.38;animation-timing-function:linear}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.5);opacity:0}}';

/* 위상 지터를 재는 벽시계 — [B13]·[R8] 이 같이 쓴다. 250·320ms 는 캡처 격자의 늦은 두 장이고
   7회차 비평 2인이 «동시 전멸» 을 실측한 바로 그 두 시각이다. */
const PHASE_T = [175, 250, 320];
/* ⚑ 9회차 — «보이는 꺼짐» 이 언제인지는 늦은 쪽을 촘촘히 봐야 보인다([B16]).
   PHASE_T 를 앞에 두고 한 번에 재서 «태우고 재기» 를 한 벌 더 돌지 않는다(SAMPLE 이 노드를 걷는다). */
const LIFE_T = [...PHASE_T, 335, 345, 355, 365, 375, 379];
/* 실효 소멸 하한 — `verify666` [G1]「수명 < 제 예정의 0.9배 = 조기 소멸」과 **같은 계수**를
   보이는 채널에도 적용한다(380 × 0.9 = 342ms). 손 상수가 아니라 남의 자에서 빌린 값이다. */
const DIE_MIN = 380 * 0.9;

/* 격자 판정 한 벌 — [B12] 와 [R7] 이 **같은 자**를 쓴다(402 «두 벌 금지»). */
function gridVerdict(g) {
  const post = g.steps.filter(x => x.from >= STOPS[g.peak]);
  const rise = g.steps.find(x => x.to === STOPS[g.peak]);
  return {
    peakT: STOPS[g.peak],
    rise: rise ? rise.d : 0,
    first: post.length ? post[0].d : 0,
    worst: post.length ? Math.max(...post.map(x => x.d)) : 0,   /* 가장 얕은 하강(= 0 에 가까운 쪽) */
    line: g.steps.map(x => x.from + '→' + x.to + ' ' + (x.d >= 0 ? '+' : '') + (x.d * 100).toFixed(1) + '%').join(' · '),
  };
}

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const blk = (t) => console.log('\n[' + t);
const p2 = n => Math.round(n * 100) / 100;

async function burstAndSample(page) {
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = h.querySelector('.cb') || h; const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const env = await page.evaluate(SAMPLE, STEPS);
  return env ? summarize(env) : null;
}

/* ⚑ 6회차 — **캡처 격자에서 한 번 더** 태워 잰다([B12]·[R7]).
   같은 버스트를 재활용할 수 없다 — `SAMPLE` 은 끝에 노드를 걷어 내기 때문이다(페이지를 망가뜨린
   채 끝내지 않는다는 그 자의 규약). 그래서 «태우고 → 격자에서 재고» 를 한 벌 더 돈다. */
/* ⚑ 8회차 — 위상 지터는 **벽시계**로만 보인다(`SAMPLE` 은 일부러 위상을 맞춘다). 한 벌 더 태운다. */
async function burstAndPhase(page, zeroDelay) {
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = h.querySelector('.cb') || h; const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(40);
  /* [R8] 재료 — 지연을 0 으로 눕히면 알들이 다시 «한 시계» 를 쓴다(제품 파일은 안 건드린다) */
  /* [R8] 재료(8회차) — 지연을 눕힌다. [R9] 재료(9회차) — **알별 생명 시계 두 변수를 1 로 눕힌다**.
     둘 다 제품 파일은 한 줄도 안 건드리고 «그 채널이 없었다면» 을 페이지에서만 만든다. */
  if (zeroDelay) await page.evaluate(() => {
    const L = document.getElementById('fxl'); if (!L) return;
    [...L.querySelectorAll('.fx-spark')].forEach(n => { n.style.animationDelay = '0s';
      n.style.setProperty('--fxk', '1'); n.style.setProperty('--fxxr', '1'); });
  });
  const sp = await page.evaluate(SPREAD, LIFE_T);
  return sp ? { n: sp.n, delays: sp.delays, rows: spreadOf(sp), raw: sp.rows } : null;
}

/* ⚑ 9회차 — 알마다 «보이는 꺼짐»(실효 α ≤0.02)이 처음 오는 시각. 표본 사이는 선형으로 읽는다.
   ⚠ 아직 안 꺼진 알은 마지막 표본 시각이 아니라 **수명 380ms** 로 센다(그 알은 끝까지 산다). */
function dieTimes(raw) {
  const rows = raw.slice().sort((a, b) => a.T - b.T);
  const n = rows[0] ? rows[0].ops.length : 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    let t = 380;
    for (let k = 1; k < rows.length; k++) {
      const a = rows[k - 1].ops[i], b = rows[k].ops[i];
      if (a > 0.02 && b <= 0.02) {
        t = rows[k - 1].T + (rows[k].T - rows[k - 1].T) * ((a - 0.02) / Math.max(1e-9, a - b));
        break;
      }
    }
    out.push(t);
  }
  return out;
}

async function burstAndGrid(page) {
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = h.querySelector('.cb') || h; const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const env = await page.evaluate(SAMPLE, STOPS);
  return env ? gridVerdict(gridSteps(env)) : null;
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  blk('A] 선언 — 곡선이 탄생 박자를 갖고, 남이 서 있는 값은 안 건드렸다');
  /* ⚠ 블록의 끝은 `}}` 다 — `}\n` 로 끊으면 **첫 키프레임 하나**만 잡힌다(1회차에 그래서 [A] 다섯이
     제품이 멀쩡한데 빨갰다). 여기서 잡는 것은 «키프레임들» 이므로 마지막 `}` 까지 통째로 받는다. */
  const mk = code.match(/@keyframes fxSpark\{([\s\S]*?\})\}/);
  const body = mk ? mk[1].replace(/\s+/g, ' ') : '';
  ok(!!mk, 'A0 공용 곡선 `@keyframes fxSpark` 가 있다');
  /* 키프레임을 «퍼센트 → scale·opacity» 표로 읽는다 — 값을 자에 다시 적지 않기 위해서다 */
  /* ⚠ 마디 끝을 `}` 로 못박지 않는다 — 3회차부터 `;animation-timing-function:linear}` 가 뒤에 붙는다
     (그렇게 적었더니 [A] 세 항이 «제품이 멀쩡한데» 빨갰다. 1회차의 `}\n` 함정과 같은 계열이다). */
  const KF = [...body.matchAll(/(\d+)%\{transform:[^}]*?scale\(([\d.]+)\);opacity:([\d.]+)/g)]
    .map(m => ({ p: +m[1], s: parseFloat(m[2]), a: parseFloat(m[3]) }));
  const kf0 = KF.find(k => k.p === 0);
  ok(!!kf0 && kf0.s < 0.6, 'A1 ★ **작게 태어난다** — 0% 의 scale 이 0.6 미만(수리 전 1)',
     kf0 ? 'scale(' + kf0.s + ')' : '0% 를 못 읽음');
  const kfFull = KF.find(k => k.p > 0 && k.s >= 1);
  /* ⚠ 3회차에 11% → 18% 로 폈다 — 2회차 램프는 «s<70% 가 15.8ms = 60fps 한 프레임» 이라
     정지컷에서만 읽혔다(비평 CI ①). 상한 20% 는 «한 박자» 의 경계다(76ms). */
  ok(!!kfFull && kfFull.p <= 20,
     'A2 ★ **제 크기까지 한 박자** — 최대 크기에 닿는 키프레임이 20% 이내다(수명의 ≤76ms)',
     kfFull ? kfFull.p + '%' : '최대에 닿는 키프레임이 없다');
  ok(KF.length > 0 && KF.every(k => k.s <= 1),
     'A3 ★ 어느 지점도 scale 1 을 **안 넘는다** — 619 13·14회차의 가둠(`sz/2 + FXB_INPAD`)이 그 전제 위에 있다',
     '최대 scale ' + Math.max(...KF.map(k => k.s)));
  /* ⚑ 3회차 이관 — 1·2회차의 A4 는 «52% 가 **글자 그대로** .78d/scale 1/α1» 이었다. 그 항이 지키던
     것은 계수가 아니라 **42회차의 «퇴장 ≥180ms»**(= 알파가 늦어도 수명의 52% 에는 내려가기 시작한다)
     이고, 3회차가 마디 경계의 속도 튐을 없애며 계수를 다시 배분하자 «지키는 뜻은 그대로인데 글자만
     틀린» 항이 됐다. ⇒ 뜻으로 고쳐 적는다(333) — 알파 고원의 끝 시점 + 이동 계수의 단조성. */
  const kfFade = KF.find(k => k.a < 1);
  const coefs = [...body.matchAll(/(\d+)%\{transform:translate\((?:calc\(var\(--dx\)\*([\d.]+)\)|0)/g)]
    .map(m => ({ p: +m[1], c: m[2] ? parseFloat(m[2]) : 0 }));
  const mono = coefs.every((c, i) => i === 0 || c.c > coefs[i - 1].c);
  ok(!!kfFade && kfFade.p <= 52 && mono && /100%\{transform:translate\(var\(--dx\),var\(--dy\)\)/.test(body),
     'A4 ★ **퇴장이 늦어도 52% 에는 시작한다**(42회차 «퇴장 ≥180ms») · 이동 계수는 **단조 증가**하고 100% 에서 정확히 d 다',
     (kfFade ? '알파 고원 끝 ' + kfFade.p + '%' : '알파가 안 내려간다') + ' · 계수 ' + coefs.map(c => c.c).join('→'));
  const kf100 = KF.find(k => k.p === 100);
  ok(!!kf100 && kf100.s >= 0.5 && kf100.a === 0,
     'A5 ★ 끝 크기가 .5 아래로 **안 내려간다** — 16회차 «.38 은 중간 프레임이 12px 로 읽힌다»(구슬 26px 이 같이 탄다)',
     kf100 ? 'scale(' + kf100.s + ')/α' + kf100.a : '100% 가 없다');
  ok(/animation:fxSpark \.38s ease-out forwards/.test(code) && /FXSPARK_MS = 380/.test(code),
     'A6 수명 선언(.38s)·`FXSPARK_MS`(380) **불변** — `verify660` [E2]·`verify666` [G] 가 이 값을 읽는다');
  /* ⚑ 3회차 신설 [A8] — **마디마다 `linear`.** 요소 규칙의 `ease-out` 이 «마디마다» 걸리면
     경계에서 속도가 0 으로 죽었다가 다시 서서 «앞머리가 가장 느린 버스트» 가 된다(2회차 비평 CI 가
     구간속도 0.430 → 0.284 → 0.634%/ms 로 역산). 감속은 계수 자신이 진다. */
  const lin = (body.match(/animation-timing-function:linear/g) || []).length;
  ok(lin >= KF.length - 1,
     'A8 ★ **마디마다 `linear`** — 감속은 계수가 지고 마디 경계에서 속도가 안 튄다(3회차 본체)',
     lin + '/' + (KF.length - 1) + ' 마디');
  ok(/@keyframes fxRlic\{0%\{transform:translate\(0,0\) scale\(1\);opacity:\.55\}/.test(code)
     && /\.fx-spark\.fx-rlic\{[\s\S]{0,400}?animation-name:fxRlic/.test(code),
     'A7 전용 봉투 `fxRlic`(753 유물 획득 알)은 **한 값도 안 바뀌었다** — 이 곡선을 안 탄다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    openTrain();
  });
  await page.waitForTimeout(400);

  const now = await burstAndSample(page);
  const ph = await burstAndPhase(page);

  /* ⚑⚑ 881 이관 — **크기 채널 항([B10] 의 절반 · [B12])이 재는 주어를 바로잡는다.**
     이 자는 훈련 버튼(`#trCards .cb`)에서 재는데, 877 이 그 호스트를 `fxSparkE` 로 갈랐고
     881 이 그 갈래의 **크기 여덟 칸**을 갈았다(요소 대상 알이 사는 동안 절반으로 줄어 판독 하한
     아래로 내려가던 것 — 838 9회차 DJ·DK). 681 이 소유한 것은 **공용 곡선의 봉투**이므로
     그 항들은 «공용 곡선을 타는 판» 에서 재야 한다 — [R] 절이 이미 쓰는 그 라우팅 한 줄
     (`.fx-spark.fx-ease{animation-name:fxSpark,fxSparkX}`)을 **제품 파일은 한 줄도 안 건드리고**
     페이지에만 얹어 표본을 뜬다.
     ⚠ **왜 그냥 문턱을 낮추지 않는가** — 두 요구는 산술적으로 같이 참일 수 없다:
       «봉우리 뒤 이웃 쌍 ≤−12%» 를 다섯 쌍 이으면 0.88⁵ = 0.53 이 곧 «1.0 → 0.5» 다.
       문턱을 낮추면 공용 곡선(09·12·17·장비·코스튬)이 6회차 이전의 «고원» 으로 조용히 되돌아간다.
     ⚠ **알파 축은 실제 출하판에서 그대로 잰다** — [B10] 의 α 절반·[B11]·[B14]~[B16] 은
       `now`(신고가 살아 있는 판)를 계속 쓴다. 요소 대상 갈래에서 «이웃 두 장이 같은 그림이
       아니다» 를 내는 것은 이제 **이동(877 이즈아웃)과 알파(681 4칸)**다 — 그 축들은 아래에서
       [B9]·[B10α]·[B14]~[B16] 이 출하판으로 지킨다. 요소 대상 갈래의 **크기 하한** 소유권은
       `tools/verify881.js` 에 있다(하한 + 되돌림 시험 + 공용 곡선 불변 짝 항). */
  const routed = await page.addStyleTag({ content: '.fx-spark.fx-ease{animation-name:fxSpark,fxSparkX}' });
  const nowShared = await burstAndSample(page);
  const grid = await burstAndGrid(page);
  await page.evaluate(el => el.remove(), routed);

  /* ── [B] 봉투 — 그려진 것으로 잰다 ────────────────────────────────── */
  blk('B] 봉투 — 브라우저가 실제로 그린 상자·알파');
  ok(!!now && now.n >= 8, 'B0 전제 — 공용 봉투를 타는 알이 실제로 태어난다(≥8알)',
     now ? now.n + '알 · 수명 ' + now.dur + 'ms' : '0알');
  if (now) {
    console.log('       · 표본: ' + now.line);
    ok(now.s0 <= 0.45 && now.bornFull === 0,
       'B1 ★ ⓐ **탄생 박자** — 출생 크기가 제 최대의 45% 이하이고, 첫 프레임에 이미 최대인 알이 0 이다(수리 전 100% · 14/14)',
       '출생 ' + p2(now.s0 * 100) + '% · 최대인 알 ' + now.bornFull + '/' + now.n);
    ok(now.peakT > 0 && now.peakT <= 80,
       'B2 ★ 그 박자가 **한 박자**로 끝난다 — 최대 크기 도달 ≤80ms(늦으면 «느리게 부푼다» 가 된다)',
       Math.round(now.peakT) + 'ms');
    /* ⚑⚑ 2회차 — **자를 «시간» 에서 «큰 채로 흐린 시간» 으로 옮겼다.** 1회차 자(«α≤0.35 구간 ≤45ms»)는
       비평 2인이 같이 짚은 «퇴장이 컷으로 읽힌다» 와 **정면으로 부딪힌다** — 그 구간을 짧게 하는 유일한
       길이 «마지막에 몰아서 끄기» 이기 때문이다. 등재문이 말한 결함은 «흐리다» 가 아니라 **«흐린데 아직
       크다»**(660 이 아이콘을 26 → 44~47px 로 키운 뒤의 얼룩)이므로 그 둘을 한 조건으로 묶어 잰다. */
    /* ⚑ 881 이관 — 이 항도 **크기 채널을 물으므로** 공용 곡선 표본에서 잰다(위 표본 자리 머리말).
       요소 대상 갈래에서는 «흐린데 아직 크다» 가 **처방 그 자체**다(DK «축소 대신 알파») — 881 이
       크기를 평평하게 한 것이 곧 «퇴장 램프 동안 알이 큰 채로 옅어진다» 이기 때문이다.
       ⚠ 그래서 자리를 비우지 않고 짝 항 [B3α] 를 붙인다 — 출하판에서 그 구간이 **퇴장 램프 밖으로
         새지 않는지**를 묻는다. 수리 전(=[R2] 대조군)은 α≤0.35 총 96.9ms 로 그 문턱을 못 넘는다. */
    ok(!!nowShared && nowShared.smudge <= 25,
       'B3 ★ ⓑ **«큰 채로 흐린» 구간이 없다**(공용 곡선) — α≤0.35 이면서 크기 ≥60% 인 시간 ≤25ms(수리 전 96.9ms 전부가 그 구간이었다)',
       (nowShared ? p2(nowShared.smudge) + 'ms · α≤0.35 총 ' + p2(nowShared.tail35) + 'ms · 그 구간 최대 크기 '
        + p2(nowShared.faintMaxS * 100) + '%' : '표본 없음'));
    ok(now.tail35 <= 60 && now.smudge <= now.tail35 + 5,
       'B3α ★ 출하판(요소 대상)에서 그 구간이 **퇴장 램프 밖으로 안 샌다** — α≤0.35 총 ≤60ms 이고 «큰 채로 흐린» 시간이 그 안에 든다(수리 전 96.9 / 104.5ms)',
       p2(now.smudge) + 'ms · α≤0.35 총 ' + p2(now.tail35) + 'ms · 그 구간 최대 크기 ' + p2(now.faintMaxS * 100) + '%');
    /* ⚠ 판별 축은 **290ms** 다 — 240ms 는 수리 전에도 0.49 라 문턱을 세워도 두 세계를 못 가른다
       (4회차에 그 항을 세웠다가 실측 0.55 로 문턱에 붙어 «흔들리는 자» 가 될 뻔했다 · 574 선례). */
    /* ⚠ 5회차 — 문턱을 0.28 → **0.25** 로 내렸다. 5회차 곡선의 실측이 0.29 라 0.28 은 «문턱에 붙은 자»
       가 되고(574 가 등재한 플레이키 게이트의 얼굴이다), 두 세계를 가르는 것은 수리 전 0.17 이므로
       0.25 는 그 사이에 넉넉히 선다. 자를 헐겁게 한 것이 아니라 **흔들리지 않는 자리로 옮긴 것**이다. */
    /* ⚑⚑ 7회차 이관(333) — **재는 시각을 290ms 에서 «실제로 찍히는 마지막 장» 320ms 로 옮겼다.**
       이 항이 지키는 뜻은 «캡처 격자의 늦은 프레임이 빈 껍데기가 아니다» 인데, **290ms 는 캡처
       격자에 없는 시각**이다(STOPS = …·250·320). 그 어긋남이 6회차에 값을 치렀다 —
       잉크 = α·s² 라 290ms 문턱을 지키려면 α 를 250ms 까지 높게 끌고 가야 하고, 그러면
       6·7회차 비평 2인이 같이 짚은 «α 가 0~250ms 를 버티다 마지막 130ms 에 한꺼번에 쏟는다» 가
       구조적으로 강제된다. 두 요구가 서로를 지우면 그것은 자를 잘못 세운 신호다(LESSONS 681-④).
       ⇒ 320ms 로 옮기고 문턱은 실측 사이에 세운다 — **수리 전 0.06 ↔ 지금 0.15**, 문턱 0.12.
       ⚠ 290ms 값은 **버리지 않고 매 실행 찍는다**(326 `ck199` 꼴 · 820 ③) — 판정에서 뺀 수가
         먼저 말하는 것이 있다. */
    ok(now.ink(320) >= 0.12,
       'B4 ★ **찍히는 마지막 장(320ms)이 정보량을 지닌다** — 잉크 ≥0.12(수리 전 0.06)',
       '240ms ' + p2(now.ink(240)) + ' · 290ms ' + p2(now.ink(290)) + ' · 320ms ' + p2(now.ink(320))
       + ' · 340ms ' + p2(now.ink(340)));
    /* ⚑ 짝 항 — 꼬리를 줄인다고 «하드컷» 이 되면 42회차(«퇴장 50~90ms 는 동시 전멸로 읽힌다»)로 되돌아간다.
       퇴장 폭 = 알파가 처음 1 아래로 내려간 시각 → 수명 끝. 52% 경계가 지켜지면 182ms 다. */
    ok(now.dur - now.fadeStart >= 180,
       'B5 ★ 그런데 **퇴장은 여전히 계조다** — 알파가 내려가기 시작해 사라지기까지 ≥180ms(42회차 규약)',
       p2(now.dur - now.fadeStart) + 'ms · 페이드 시작 ' + Math.round(now.fadeStart) + 'ms');
    /* 중간 프레임이 실제로 «있는가» — 95ms 격자에서 완전 불투명도 완전 투명도 아닌 표본이 둘 이상 */
    const mid = now.rel.filter(r => r.op > 0.02 && r.op < 0.98).length;
    ok(mid >= 4, 'B6 ★ 퇴장에 **중간 알파 프레임**이 실재한다(≥4표본 — 하드컷이면 0~1이다)',
       mid + '/' + now.rel.length + ' 표본');
    /* ⚑ 2회차 신설 [B7] — **끝에서 급정거하지 않는다.** 비평 2인이 1회차 곡선을 같은 자로 쟀다
       (CF «마지막 40ms 기울기가 직전 60ms 의 2.6배» · CG «2.7배»). 그 축을 그대로 자로 세운다:
       실측 — 1회차 2.8 · 수리 전 0.38 · 2회차 0.77. 문턱 1.5 는 그 사이이고, «컷» 쪽만 잡는다. */
    /* ⚑ 3회차 신설 [B9] — **재가속 0**. 2회차 비평 CI 의 «41.8ms 에 속도 0 → 45~90ms 가 전체
       최고속(직전의 2.2배)» 을 자로 세운 것이다. 실측 — 3회차 1.00 · 수리 전 1.42 · 2회차 곡선 2.2.
       문턱 1.20 은 그 사이이고 표본 격자(19ms) 흔들림에 안 뒤집힌다. */
    /* ⚑ 4회차 신설 [B10] — **가운데가 계속 변한다.** 3회차 비평 2인이 «90~210ms(수명 32%)가
       지각적으로 정지» 를 같이 짚었다(CJ «90·150ms 두 장이 이 축에서 구분 불가» · CK «60fps 환산
       0.17px/frame = 가시 문턱 아래 · 8장 중 3장이 같은 그림»). 그 구간의 **크기·알파 변화량**을 잰다.
       ⚠ 알파만 물으면 못 가른다 — 수리 전에도 그 구간의 α 는 1.00 → 0.90 이었다(크기가 4% 로 굳어
       있었을 뿐이다). 그래서 **둘 다** 요구한다(수리 전 크기 4% · 3회차 5.4% · 4회차 12%). */
    /* ⚑ 881 이관 — **크기 절반은 공용 곡선 표본(`nowShared`)에서, 알파 절반은 출하판(`now`)에서.**
       주어가 갈린 이유는 위 표본 뜨는 자리의 머리말에 있다. 둘 다 요구하는 것은 그대로다
       («알파만 물으면 못 가른다» — 4회차 주석). */
    const dS = nowShared ? nowShared.at(90).s - nowShared.at(210).s : 0;
    const dA = now.at(90).op - now.at(210).op;
    ok(!!nowShared && dS >= 0.08 && dA >= 0.08,
       'B10 ★ **가운데가 정지하지 않는다** — 90 → 210ms 에 크기(공용 곡선)·알파(출하판)가 각각 ≥8% 내려간다(수리 전 크기 4%)',
       '크기 −' + p2(dS * 100) + '% · α −' + p2(dA * 100) + '%');
    /* ⚑ 881 신설 [B10α] — 요소 대상 갈래(출하판)에서 그 «정지 안 함» 을 **알파가 혼자 진다**.
       881 이 크기를 평평하게 만든 대가로 이 축이 유일한 크기 밖 증거가 됐으므로 따로 못박는다 —
       빼면 «알파까지 평평해져도 [B10] 은 공용 곡선에서 초록» 인 헛초록이 된다. */
    ok(dA >= 0.08,
       'B10α ★ **출하판(요소 대상)에서도 가운데가 정지하지 않는다** — 90 → 210ms 알파 ≥8%(크기는 881 이 평평하게 했다)',
       'α −' + p2(dA * 100) + '%');
    ok(now.s0 <= 0.45 && now.at(0).op <= 0.7,
       'B11 ★ **탄생에 알파 온셋이 있다** — 첫 프레임이 «작고 옅다»(출생 α ≤0.7 · 수리 전 1.00)',
       '출생 α ' + p2(now.at(0).op) + ' · 크기 ' + p2(now.s0 * 100) + '%');
    ok(now.reaccel <= 1.20,
       'B9 ★ **이동이 단조 감속한다** — 구간속도의 직전 대비 최대 증가 ≤1.20배(수리 전 1.42 · 2회차 곡선 2.2)',
       p2(now.reaccel) + '배 · 가장 긴 «아무것도 안 변하는» 구간 ' + p2(now.still) + 'ms');
    const aAt = (T) => now.at(T).op;
    const sLast = aAt(now.dur - 40) / 40, sPrev = Math.max(1e-9, (aAt(now.dur - 100) - aAt(now.dur - 40)) / 60);
    ok(sLast / sPrev <= 1.5,
       'B7 ★ **끝에서 급정거하지 않는다** — 마지막 40ms 기울기가 직전 60ms 의 1.5배 이하(1회차 2.8배 = «컷»)',
       p2(sLast / sPrev) + '배 · α(280ms) ' + p2(aAt(now.dur - 100)) + ' → α(340ms) ' + p2(aAt(now.dur - 40)));
  }
  /* ⚑⚑ 6회차 신설 [B12] — **캡처 격자의 이웃이 전부 구분된다.** 5회차 비평 2인이 같이 짚은 것을
     그대로 자로 세운다(CN «70→110ms −4.0% 로 지각 임계 아래 · train-4/5 가 같은 그림» ·
     CO «B 는 70·110 이 0.0% · A 는 105ms 가 한 장»). 문턱의 출처는 그 두 사람이 쓴 **지각 임계 7~8%**
     이고, 봉우리 직후만 «−10% 이상» 으로 더 세운 것은 5회차 §5-1 ⓐ 가 적어 둔 처방 기준이다.
     ⚠ 이 항은 **캡처 격자에서만** 뜻이 있다 — 균등 격자로 보간하면 봉우리가 두 표본 사이로 뭉개져
       같은 곡선이 −10.1% 대신 −6.9% 로 읽힌다(6회차에 실제로 그렇게 나왔다).
     ⚠ 짝 항 [R7] 이 이 자가 무르지 않다는 것을 못박는다 — 되돌릴 상대는 **5회차 곡선**이다. */
  if (grid) {
    console.log('       · 격자 델타: ' + grid.line);
    /* ⚑ 7회차 — 하한을 **8% → 12%** 로 올렸다. 6회차 비평 2인이 각각 «지름 −7.9% 는 임계 대역 안이라
       그 자체로 같은 그림»(CP) · «이웃 쌍의 지름 차 하한을 12% 로 못박아라»(CP 1순위)로 적었고,
       실제로 6회차 곡선은 **선언 −10.5%** 인데 두 사람의 실측이 −7.9% · −6.7% 로 내려앉았다 —
       26~44px 스프라이트에서 1px 이 2.3~3.8% 라 **화소 격자가 −10% 를 −7% 로 반올림한다.**
       ⇒ 선언 문턱은 «눈이 요구하는 값» 이 아니라 «그 값이 화소를 통과한 뒤에도 남는 값» 이어야 한다. */
    /* ⚑ 881 이관 — 이 격자 표본은 **공용 곡선으로 라우팅한 판**에서 뜬다(위 머리말). 문턱은
       한 자리도 안 낮췄다 — 낮추면 09·12·17·장비·코스튬이 6회차 이전 «고원» 으로 되돌아간다. */
    ok(grid.rise >= 0.12 && grid.first <= -0.12 && grid.worst <= -0.12,
       'B12 ★ **봉우리가 표본 한 장이고 그 뒤가 화소를 통과한다**(공용 곡선) — 오르는 마지막 쌍 ≥+12% · 봉우리 뒤 모든 쌍 ≤−12%',
       '봉우리 ' + grid.peakT + 'ms · 진입 +' + p2(grid.rise * 100) + '% · 직후 ' + p2(grid.first * 100)
       + '% · 가장 얕은 하강 ' + p2(grid.worst * 100) + '%');
  } else ok(false, 'B12 ★ 캡처 격자 표본을 못 얻었다');
  /* ⚑ 8회차 — **[B13] 은 판정이 아니라 관측이다(326 `ck199` 꼴 · 820 ③).**
     7회차 비평 2인이 ④ 를 7 로 내린 유일한 축이 «동시 전멸» 이라, 8회차에 알마다 음(−) 애니 지연을
     줘 알파 폭을 250ms 0.03 → 0.13 · 320ms 0.06 → 0.19 로 **실제로 벌렸다**. 그런데 비평은
     7/7 → 6/4 로 내려갔다 — 위상을 흩으면 알마다 봉우리가 **캡처 표본 사이**에 떨어져 [B12] 가
     지키는 «봉우리는 표본 한 장» 이 눈에서는 사라진다(CT 추적 알 45→70ms **+1.4%**). ⇒ 제품은
     되돌렸고, **자와 수는 남긴다** — 다음 회차가 같은 실험을 처음부터 다시 짜지 않도록.
     판정에서 뺀 수가 먼저 말하는 것이 있다. */
  if (ph) {
    const at = T => ph.rows.find(r => Math.round(r.T) === T) || { range: 0, sd: 0, n: 0 };
    console.log('       · [B13o] 위상 산포(관측 — 판정 아님): '
      + ph.rows.map(r => Math.round(r.T) + 'ms 폭 ' + p2(r.range) + '(σ ' + p2(r.sd) + ' · 산 알 ' + r.n + ')').join(' · ')
      + ' · 지연 ' + Math.min(...ph.delays).toFixed(1) + '~' + Math.max(...ph.delays).toFixed(1) + 'ms'
      + '  [8회차 지터판 실측 250ms 0.13 · 320ms 0.19 — 그 판은 ② 를 잃어 되돌렸다]');
  }
  /* ⚑⚑ 9회차 신설 [B14]·[B15]·[B16] — **«동시 전멸» 을 판정으로 세운다.**
     7회차 비평 2인(CR·CS)이 ④ 를 7 로 내린 유일한 축이고, 검수 기준까지 둘이 같이 냈다
     («250ms 산포 ≥0.25 · 320ms ≥0.30»). 문턱은 그 요구가 아니라 **이 채널이 실제로 낼 수 있는
     값과 두 세계 사이**에 세운다 — 7회차 실측 0.031·0.063 ↔ 9회차 0.2~0.3 대.
     ⚠ 8회차의 [B13o] 를 판정으로 승격하지 **않는다** — 그 축(위상)은 ② 를 팔아 ④ 를 샀고
       되돌렸다. 이 셋이 재는 것은 **알파 채널만**이라 [B12](크기 계단)와 같이 설 수 있다. */
  if (ph) {
    const at = T => ph.rows.find(r => Math.round(r.T) === T) || { range: 0, sd: 0, n: 0 };
    ok(at(250).range >= 0.20 && at(320).range >= 0.15,
       'B14 ★ **알들이 한 시계를 안 쓴다** — 살아 있는 알의 실효 알파 폭이 250ms ≥0.20 · 320ms ≥0.15(7회차 0.031 · 0.063)',
       '175ms ' + p2(at(175).range) + ' · 250ms ' + p2(at(250).range) + ' · 320ms ' + p2(at(320).range));
    /* [B4] 의 실효판 짝 — 평균이 아니라 **최댓값**을 묻는다. 알을 일부러 안 고르게 만든 뒤로는
       «그 프레임에 정보량이 있는가» 를 평균이 대답하지 못한다(어두운 알이 밝은 알을 지운다).
       눈이 읽는 것은 살아남은 가장 밝은 알이다. 평균은 아래 줄에 관측으로 같이 찍는다. */
    const s320 = now ? now.at(320).s : 0, o320 = at(320);
    const raw320 = (ph.raw.find(r => Math.round(r.T) === 320) || { ops: [0] }).ops;
    const inkMax = Math.max(...raw320) * s320 * s320;
    ok(inkMax >= 0.12,
       'B15 ★ **찍히는 마지막 장에 정보량을 지닌 알이 남는다** — 실효 잉크 최대 ≥0.12([B4] 의 실효판 짝)',
       '최대 ' + p2(inkMax) + ' · 평균 ' + p2(o320.mean * s320 * s320) + ' · 크기 ' + p2(s320 * 100) + '%');
    const die = dieTimes(ph.raw);
    const dMin = Math.min(...die), dMax = Math.max(...die);
    /* ⚠ **문턱을 손으로 안 적는다.** 이 축은 위아래가 둘 다 남의 자에 못박혀 있다 —
       위는 공용 봉투 자신이 꺼지는 시각(그보다 늦게 꺼질 수는 없다), 아래는 `verify666` [G1]
       의 0.9배 계수(342ms)다. 그 사이가 **구조적으로 쓸 수 있는 창 전부**이므로, 요구는
       «몇 ms» 가 아니라 «그 창의 몇 %» 로 적는다. 손 상수를 적으면 실측이 문턱에 붙는 순간
       («폭 24.96 ≥ 25») 무르게 내리고 싶어지고, 그것이 574 가 등재한 플레이키 게이트의 얼굴이다. */
    const envDie = (() => {
      const r = now ? now.rel : [];
      for (let i = 1; i < r.length; i++) if (r[i].op <= 0.02 && r[i - 1].op > 0.02)
        return r[i - 1].T + (r[i].T - r[i - 1].T) * ((r[i - 1].op - 0.02) / Math.max(1e-9, r[i - 1].op - r[i].op));
      return 380;
    })();
    const win = Math.max(1e-9, envDie - DIE_MIN);
    ok((dMax - dMin) >= 0.70 * win && dMin >= DIE_MIN,
       'B16 ★ **보이는 꺼짐이 한 프레임에 안 몰린다** — 소멸 시각 폭이 «쓸 수 있는 창»의 ≥70%, 단 가장 이른 것도 342ms 이상(`verify666` [G1] 의 0.9배 계수)',
       '폭 ' + p2(dMax - dMin) + 'ms = 창 ' + p2(win) + 'ms(하한 ' + p2(DIE_MIN) + ' ↔ 봉투 소멸 '
       + p2(envDie) + ')의 ' + p2((dMax - dMin) / win * 100) + '% · ' + p2(dMin) + '~' + p2(dMax) + 'ms');
  } else { ok(false, 'B14 ★ 벽시계 표본을 못 얻었다'); ok(false, 'B15 ★'); ok(false, 'B16 ★'); }
  ok(errs.length === 0, 'B8 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  /* ── [C] 불변 — 남의 것을 안 건드렸다 ─────────────────────────────── */
  blk('C] 불변 — 전용 봉투·수명·발화');
  const inv = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const el = document.createElement('s'); el.className = 'fx-spark';
    (document.getElementById('fxl') || document.body).appendChild(el);
    const a = getComputedStyle(el).animationName, d = getComputedStyle(el).animationDuration;
    el.className = 'fx-spark fx-rlic';
    const a2 = getComputedStyle(el).animationName;
    el.remove();
    return { a, d, a2, ms: (typeof FXSPARK_MS !== 'undefined' ? FXSPARK_MS : null) };
  });
  /* ⚑ 9회차 이관(333) — 이 항이 지키던 뜻은 «공용 알이 **공용 크기 봉투**를 0.38s 로 탄다» 이지
     «애니가 하나뿐이다» 가 아니었다. 9회차가 곱해지는 **알파 채널**(`fxSparkX`)을 얹었으므로
     글자 그대로 두면 «채널을 하나 더 얹었다» 는 사실만으로 빨개진다 — 뜻으로 고쳐 적는다.
     ⚠ 그래도 **무르게 풀지 않는다**: 크기 채널이 여전히 `fxSpark` 로 **첫 번째**이고 그 길이가
       0.38s 임을 그대로 못박고(순서가 뒤집히면 `envelope681` 의 `dur` 이 알파 채널을 읽는다),
       둘째 채널의 길이는 «수명의 0.9~1.0배» 안이어야 한다(`verify666` [G1] 계수). */
  const nm = inv.a.split(',').map(s => s.trim()), du = inv.d.split(',').map(s => s.trim());
  const x2 = parseFloat(du[1]) || 0;
  ok(nm[0] === 'fxSpark' && du[0] === '0.38s' && nm[1] === 'fxSparkX'
     && x2 >= 0.38 * 0.9 && x2 <= 0.38,
     'C1 ★ 크기 채널은 그대로 `fxSpark` 0.38s **첫 번째**이고, 알파 채널 `fxSparkX` 가 그 0.9~1.0배로 얹혀 있다',
     inv.a + ' · ' + inv.d);
  ok(inv.a2 === 'fxRlic', 'C2 `.fx-rlic` 는 그대로 전용 봉투를 탄다(753 — 이 작업이 안 건드린다)', String(inv.a2));
  /* ⚑ 9회차 신설 [C4] — **양자화가 선언에 있다.** 알별 인라인 문자열로 흩으면 `verify619` [M3]
     (홀드 동안 rAF 프레임 >20)이 값을 치른다(8회차 실측 22 → 17). 클래스 넷으로 못박고,
     넷이 실제로 **서로 다른 값**을 내는지(하나로 뭉치면 채널이 조용히 꺼진다) 같이 묻는다. */
  const q = await page.evaluate(() => {
    const L = document.getElementById('fxl') || document.body;
    return [0, 1, 2, 3].map(i => {
      const el = document.createElement('s'); el.className = 'fx-spark fxq' + i;
      L.appendChild(el); const cs = getComputedStyle(el);
      const v = { k: parseFloat(cs.getPropertyValue('--fxk')) || 0, d: cs.animationDuration };
      el.remove(); return v;
    });
  });
  const ks = q.map(v => v.k), ds = q.map(v => (v.d.split(',')[1] || '').trim());
  ok(new Set(ks).size === 4 && new Set(ds).size === 4 && Math.min(...ks) >= 0.6,
     'C4 ★ 생명 시계가 **선언의 네 칸**이다 — 밝기·길이가 넷 다 다르고 가장 어두운 알도 0.6 이상(알별 인라인 문자열 0 · [M3])',
     'k ' + ks.join('/') + ' · 알파 길이 ' + ds.join('/'));
  ok(inv.ms === 380, 'C3 `FXSPARK_MS` 380 불변', String(inv.ms));

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  blk('R] 되돌림 — 옛 곡선을 얹으면 [B1]·[B3]·[B4] 가 빨개진다');
  await page.addStyleTag({ content: OLD });
  /* ⚑ 877 이관 — 이 자는 훈련 버튼(`#trCards .cb`)에서 버스트를 재는데, 877 이 그 호스트에
     `--burst-ease` 를 걸어 알이 `fxSparkE`(이즈아웃 이동 곡선)를 쓴다. 위 OLD/PREV5 는
     `@keyframes fxSpark` 만 덮으므로, 되돌림이 훈련 알에 닿게 이즈아웃 갈래를 공용 곡선으로
     되돌린다(크기·알파 채널은 fxSparkE 와 fxSpark 가 한 값도 안 다르므로 [B]-축 측정은 불변이고,
     이동 채널만 OLD/PREV5 로 되돌아가 [R1]~[R7] 이 의도대로 빨개진다). 신고를 안 지우면
     되돌린 사본이 여전히 이즈아웃이라 «되돌려도 안 빨개지는» 헛초록이 된다. */
  await page.addStyleTag({ content: '.fx-spark.fx-ease{animation-name:fxSpark,fxSparkX}' });
  await page.waitForTimeout(60);
  const old = await burstAndSample(page);
  ok(!!old, 'R0 대조군 성립 — 옛 곡선 사본에서도 알이 태어난다', old ? old.n + '알' : 'n/a');
  if (old) {
    ok(old.s0 >= 0.99 && old.bornFull === old.n,
       'R1 되돌리면 **탄생 박자가 사라진다** — [B1] 이 빨개지는 자리',
       '출생 ' + p2(old.s0 * 100) + '% · 최대인 알 ' + old.bornFull + '/' + old.n);
    ok(old.smudge >= 60,
       'R2 되돌리면 **«큰 채로 흐린» 구간이 돌아온다** — [B3] 이 빨개지는 자리',
       p2(old.smudge) + 'ms · α≤0.35 총 ' + p2(old.tail35) + 'ms · 그 구간 최대 크기 ' + p2(old.faintMaxS * 100) + '%');
    ok(old.ink(320) < 0.12,
       'R3 되돌리면 늦은 프레임의 **정보량이 다시 0** 이다 — [B4] 가 빨개지는 자리',
       '240ms ' + p2(old.ink(240)) + ' · 290ms ' + p2(old.ink(290)) + ' · 320ms ' + p2(old.ink(320))
       + ' · 340ms ' + p2(old.ink(340)));
    /* ⚠ 짝 항 — 되돌림이 [B5]·[B6](퇴장 계조)까지 죽이지는 **않는다**. 그 둘은 수리 전에도 참이었고
       (52% 경계는 42회차 것이다) 이 작업이 «지켜야 할 것» 이지 «고친 것» 이 아니다. */
    ok(old.dur - old.fadeStart >= 180,
       'R4 그러나 퇴장 폭(≥180ms)은 되돌려도 참이다 — [B5] 는 «고친 것» 이 아니라 «안 깬 것»',
       p2(old.dur - old.fadeStart) + 'ms');
    ok(old.reaccel > 1.20,
       'R5 되돌리면 **이동이 다시 재가속한다** — [B9] 가 빨개지는 자리(마디마다 걸린 ease-out)',
       p2(old.reaccel) + '배');
    ok((old.at(90).s - old.at(210).s) < 0.08 && old.at(0).op >= 0.99,
       'R6 되돌리면 **가운데가 다시 굳고 출생 알파 온셋이 사라진다** — [B10]·[B11] 이 빨개지는 자리',
       '90→210ms 크기 −' + p2((old.at(90).s - old.at(210).s) * 100) + '% · 출생 α ' + p2(old.at(0).op));
  }

  /* ⚑ 6회차 신설 [R7] — **5회차 곡선**을 얹으면 [B12] 가 빨개진다.
     여기만 되돌릴 상대가 «수리 전» 이 아니라 «바로 앞 회차» 다 — 5회차 곡선은 [B1]~[B11] 을 전부
     통과하고 오직 이 항에서만 무너진다. 그것이 6회차가 «새로 닫은 것» 의 정확한 크기다. */
  await page.addStyleTag({ content: PREV5 });
  await page.waitForTimeout(60);
  const p5 = await burstAndGrid(page);
  ok(!!p5, 'R7-0 대조군 성립 — 5회차 곡선 사본에서도 알이 태어난다');
  if (p5) {
    console.log('       · 5회차 격자 델타: ' + p5.line);
    ok(p5.first > -0.12,
       'R7 되돌리면 **봉우리가 다시 고원이 된다** — [B12] 가 빨개지는 자리(5회차 비평 2인 공통 지적)',
       '봉우리 ' + p5.peakT + 'ms · 직후 ' + p2(p5.first * 100) + '%(6회차 ' + (grid ? p2(grid.first * 100) : '—') + '%)');
  }

  /* ⚑ 8회차 — [R8] 도 관측으로 남긴다(위 [B13o] 와 한 벌). 지연을 0 으로 눕힌 사본의 산포가
     0 이라는 것이, 8회차 지터판의 0.13·0.19 가 **실재했다**는 대조다. 제품은 지금 지연이 없으므로
     이 두 줄은 같은 수(0)를 낸다 — 다음 회차가 지터를 다시 켜면 그때 다시 갈린다. */
  /* ⚑ 9회차 — 같은 «눕히기» 가 이제 [R9] 를 겸한다: `--fxk`·`--fxxr` 를 1 로 되돌리면
     알들이 다시 **한 시계**를 쓴다. [B14]·[B16] 이 무른 자가 아님을 이 대조가 못박는다. */
  const phz = await burstAndPhase(page, true);
  if (phz) {
    const az = T => phz.rows.find(r => Math.round(r.T) === T) || { range: 0 };
    console.log('       · [R8o] 지연을 0 으로 눕힌 사본(관측): 250ms ' + p2(az(250).range)
      + ' · 320ms ' + p2(az(320).range));
    const dz = dieTimes(phz.raw);
    ok(az(250).range < 0.20 && (Math.max(...dz) - Math.min(...dz)) < 5,
       'R9 ★ 생명 시계 두 변수를 1 로 눕히면 **다시 한 시계가 된다** — [B14]·[B16] 이 빨개지는 자리',
       '250ms 폭 ' + p2(az(250).range) + ' · 소멸 폭 ' + p2(Math.max(...dz) - Math.min(...dz)) + 'ms');
  } else ok(false, 'R9 ★ 눕힌 사본 표본을 못 얻었다');

  await browser.close();
  console.log('\nVERIFY681 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
