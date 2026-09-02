/* 작업 514 게이트 — 16 룰렛 «연출 스킵» 토글 (363 부품의 공용 승격).
   실행: node tools/verify514.js

   주인 지시(2026-08-31, **세 번째**): «룰렛에 연출스킵 토글넣어라» · «룰렛부분 연출스킵 토글 넣기»
                                    · (재촉) «룰렛 연출스킵 토긓 넣으라 햇는데 넣엇나»

   ── 재현이 먼저였다(LESSONS 338 ①) ──────────────────────────────────────────
   `tools/probe514.js`(수리 전): 회전 시작 → 결과 문구까지 **3913.1ms** · 그 사이 **155 프레임**이
   결과가 없는 화면이다. 등재문의 ⓐ(약 3.9초 고정 · 스킵 경로 없음)가 그대로 확인됐고,
   ⓑ(부품·상태가 이미 363 에 있다 — `.sm-sk` CSS 규칙 10개)와 ⓒ(회전 중 닫아도 지급 1회)도 같이 확인됐다.
   수리 후 같은 명령: 스킵 ON 이면 **42.3ms · 결과 없는 프레임 0**.

   ── 이 게이트가 재는 것 (등재문 ⑴~⑺) ────────────────────────────────────────
     §1 자리   — 토글이 룰렛 팝업 안에 있고 [룰렛 돌리기] 버튼과 **우단이 같다** · 겹침 0
                 · 12 소환 토글(`#sumSkip`)의 자리는 **한 칸도 안 움직였다**(부품 승격의 대가 0)
     §2 OFF    — 1회전 길이가 종전과 같다(3.9초 ±오차) = 스킵이 «항상 켜진» 것이 아니다
     §3 ON     — 클릭 → **300ms 안에** 결과 문구가 뜨고 `S.dia` 증가가 이미 끝나 있다
     §4 같은 값 — 같은 시드에서 뽑히는 칸이 ON/OFF 로 **한 칸도 안 바뀐다**(스킵이 확률을 안 바꾼다)
                 + 스킵으로 받은 액수가 뽑힌 칸의 액수와 정확히 같다
     §5 이탈   — 회전 도중 팝업을 닫아도 지급 1회(181 회귀) · 회전 **한복판**에 켜면 그 자리에서 끝난다
     §6 상태   — 12 소환 토글과 **한 벌**이다(한쪽을 켜면 다른 쪽도 ON) · 구 세이브 `sumSkip` 승계
     §R 되돌림 — ⓐ 스킵 분기를 무력화하면 §3 이 도로 3.9초가 된다 ⓑ 토글 노드를 지우면 §1 이 성립 안 한다

   ⚠ §3 은 «빨라졌다» 를 재는 항이라 **혼자 두면 헛초록이 쉽다**(무엇이든 빠르면 통과한다).
     그래서 §2 가 같은 자를 OFF 에 대고 3.9초를 요구하고, §R-ⓐ 가 «빠른 이유가 스킵 분기인가» 를 못박는다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const ok = (n, got, want, tol) => {
  const num = typeof got === 'number' && typeof want === 'number';
  const d = num ? +(got - want).toFixed(2) : 0;
  R.push({ n, got, want, d, pass: num ? Math.abs(d) <= (tol || 0) : got === want });
};
const errs = [];

/* index.html 의 상수와 한 벌 — 여기서 다시 적는 값은 «지시서가 정한 것» 뿐이다 */
const SPIN_MS = 3600 + 260;   // ROUL_MS + ROUL_BACK_MS
const FAST_MS = 300;          // 등재문 ⑵ «300ms 안에»

async function page(b, vp) {
  const c = await b.newContext({ viewport: vp || { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(HTML);
  await p.waitForTimeout(900);
  return { c, p };
}

/* 룰렛을 «돌릴 수 있는» 상태로 열고 한 판 돌린 뒤, 결과 문구가 뜬 시각을 돌려준다.
   시간은 페이지 안에서 rAF 로 잰다 — 바깥 waitForTimeout 으로 재면 드라이버 왕복이 섞인다. */
const SPIN = (ms) => `(async () => {
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  S.daily.spins = 5; S.dia = 0;
  openRoulette(); await raf();
  const t0 = performance.now();
  document.getElementById('rouBtn').click();
  let blank = 0, t = -1;
  while(performance.now() - t0 < ${ms}){
    await raf();
    const got = (document.getElementById('rouRes').textContent || '').indexOf('획득') >= 0;
    if(got){ t = performance.now() - t0; break; }
    blank++;
  }
  return { t, blank, dia: S.dia, rot: rouRot, spinning: rouSpinning, pend: rouPend };
})()`;

/* §R-ⓐ 용 «514 이전» 사본 — 소스에서 `roulSpinTo` 를 떼어 514 가 더한 세 자리만 지운다.
   지우는 자리: ① `if(fxSkipOn()){ … }` 조기 종료 블록 ② `step` 의 `if(cut()){ fin(); return; }`
   ③ `back` 의 같은 줄. (`cut()` 선언 자체는 남겨 둔다 — 아무도 안 부르면 죽은 함수라 영향이 없고,
    지우는 자리를 «호출부» 로 좁혀야 이 사본이 «514 이전» 과 정확히 같은 시간축이 된다.) */
const PRE = (() => {
  const src = require('fs').readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const a = src.indexOf('function roulSpinTo(idx){');
  const z = src.indexOf('\nfunction roulFinish(idx){', a);
  let fn = src.slice(a, z);
  let found = 0;
  const cut = 'if(cut()){ fin(); return; }\n';
  while (fn.indexOf(cut) >= 0) { fn = fn.replace(new RegExp('[ ]*' + cut.replace(/[(){}.]/g, m => '\\' + m)), ''); found++; }
  const s0 = fn.indexOf('  if(fxSkipOn()){');
  if (s0 >= 0) { const e0 = fn.indexOf('\n  }\n', s0); fn = fn.slice(0, s0) + fn.slice(e0 + 5); found++; }
  return { src: fn, found };
})();

(async () => {
  const b = await launch(chromium);

  /* ───────────────────────── §1 자리 ───────────────────────── */
  {
    const { c, p } = await page(b);
    const g = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.daily.spins = 5; openRoulette(); await raf();
      const r = s => { const e = document.querySelector(s); if(!e) return null; const b = e.getBoundingClientRect();
        return { x:+b.x.toFixed(2), y:+b.y.toFixed(2), w:+b.width.toFixed(2), h:+b.height.toFixed(2),
                 r:+b.right.toFixed(2), b:+b.bottom.toFixed(2) }; };
      const sk = r('#rouSkip'), bt = r('#rouBtn'), mb = r('#mbox'), dc = r('.rlt');
      return { sk, bt, mb, dc,
        inBody: !!document.querySelector('#mbox > #rouSkip'),
        inWell: !!document.querySelector('.mwell #rouSkip'),
        btInWell: !!document.querySelector('.mwell #rouBtn'),
        cls: document.getElementById('rouSkip').className,
        role: document.getElementById('rouSkip').getAttribute('role'),
        parts: ['#rouSkip>i.sm-fat','#rouSkip .sm-skt','#rouSkip .sm-skk','#rouSkip .sm-skk>em']
               .map(s => !!document.querySelector(s)).filter(Boolean).length };
    })()`);
    ok('1-1 토글 노드가 룰렛 팝업 안에 있다', !!g.sk, true);
    ok('1-2 부품은 363 것 그대로다(.sm-sk)', g.cls, 'sm-sk');
    ok('1-3 부품 4조각(라벨·트랙·노브·글자)이 다 있다', g.parts, 4);
    ok('1-4 role=switch', g.role, 'switch');
    /* 자리 — 버튼과 우단이 같다(363 이 «그리드 우단» 에 맞춘 것과 같은 규칙) */
    ok('1-5 버튼과 우단이 같다', +(g.sk.r - g.bt.r).toFixed(2), 0, 1.5);
    ok('1-6 버튼 아래에 있다(겹침 0)', g.sk.y >= g.bt.b - .5, true);
    ok('1-7 본문(#mbox) 안을 안 벗어난다', g.sk.b <= g.mb.b + .5 && g.sk.x >= g.mb.x - .5, true);
    ok('1-8 원판과 안 겹친다', g.sk.y >= g.dc.b - .5, true);
    /* ⚠ showModal 의 «꼬리 빼내기» 함정 — 토글을 HTML 문자열 끝에 넣었으면 버튼이 패널 안에 갇힌다 */
    ok('1-9 토글은 본문 직계 자식이다', g.inBody, true);
    ok('1-10 토글이 베이지 패널(.mwell) 안이 아니다', g.inWell, false);
    ok('1-11 [룰렛 돌리기] 는 여전히 패널 밖이다', g.btInWell, false);
    await c.close();
  }

  /* ── §1-b 12 소환 토글은 한 칸도 안 움직였다(부품을 승격한 대가가 0 이라는 증거) ── */
  {
    const { c, p } = await page(b);
    /* ⚠ 화면 좌표를 그대로 쓰면 «팝업이 몇 배로 그려졌는가» 가 섞인다(12 팝업은 프레임에 맞춰 줄어든다).
       그래서 **부품 자신의 높이**로 배율을 되돌려 «패널 우변에서 36 · 하변에서 28» 이라는
       363 의 선언값을 직접 묻는다 — 이러면 프레임·배율이 어떻든 같은 값이 나온다. */
    const s = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.dia = 1e9; doSummonFree('weapon', 10, true); await raf(); await raf();
      const e = document.getElementById('sumSkip').getBoundingClientRect();
      const pn = document.querySelector('.sm-panel').getBoundingClientRect();
      const k = e.height / 56;
      return { k:+k.toFixed(4), right:+((pn.right - e.right) / k).toFixed(1),
               bot:+((pn.bottom - e.bottom) / k).toFixed(1), w:+(e.width / k).toFixed(1) };
    })()`);
    /* 363 이 못박은 선언값 그대로(index.html `#sumSkip{right:36px;bottom:28px}`) */
    ok('1-12 #sumSkip 패널 우변에서 36', s.right, 36, 0.6);
    /* 713 이관(2026-09-02) — 패널 아래 띠가 83 → 98 로 넓어졌다(배수 토글이 그 왼쪽에 앉는다).
       363 이 세운 규칙(«토글은 띠 한가운데»)은 그대로이고 값만 15 + (98 − 56)/2 = 36 이었다.
       ⚑ 747 이관(2026-09-02) — 띠가 112 가 되고 여유 14 가 **전부 바 아래**로 갔다. 규칙은
       «배수 바와 세로 중심이 같다»(713 에서 «띠 한가운데» 와 같은 값이었다)로 읽어 값이 따라간다:
       29 + (98 − 56)/2 = **50** ⇒ 중심 78 로 바와 같다(`verify713` [B1]·[A7]).
       ⚠ 514 가 지키는 것은 «12 토글의 자리가 부품 승격으로 안 움직였다» 이지 상수 36 자체가 아니다 —
         움직인 것은 747(12 호스트의 띠)이고 16 룰렛 쪽 자리는 여기서도 Δ0 이다(1-16 이하). */
    ok('1-13 #sumSkip 패널 하변에서 50 (747 — 배수 바와 같은 중심)', s.bot, 50, 0.6);
    ok('1-14 #sumSkip 폭 241.5 (363 값 불변)', s.w, 241.5, 1);
    ok('1-15 배율이 실제로 1 이 아니다(자가 배율을 되돌리고 있다)', s.k > 0 && s.k <= 1.001, true);
    await c.close();
  }

  /* ───────────────────────── §2 OFF — 종전 길이 ───────────────────────── */
  {
    const { c, p } = await page(b);
    await p.evaluate('S.opt.fxSkip = false');
    const r = await p.evaluate(SPIN(8000));
    ok('2-1 OFF 는 결과가 3.9초쯤에 나온다', Math.abs(r.t - SPIN_MS) <= 400, true);
    ok('2-2 OFF 실측 ms (참고)', r.t > 0, true);
    ok('2-3 OFF 는 «결과 없는» 프레임이 많다(≥60)', r.blank >= 60, true);
    ok('2-4 OFF 도 지급은 끝나 있다', r.dia > 0, true);
    ok('2-5 끝나면 회전 상태가 꺼진다', r.spinning, false);
    ok('2-6 끝나면 미지급 칸이 없다', r.pend, -1);
    await c.close();
  }

  /* ───────────────────────── §3 ON — 300ms 안에 ───────────────────────── */
  {
    const { c, p } = await page(b);
    await p.evaluate('S.opt.fxSkip = true');
    const r = await p.evaluate(SPIN(8000));
    ok('3-1 ON 은 300ms 안에 결과가 뜬다', r.t >= 0 && r.t <= FAST_MS, true);
    ok('3-2 ON 은 «결과 없는» 프레임이 0 이다', r.blank, 0);
    ok('3-3 ON 도 지급이 끝나 있다', r.dia > 0, true);
    ok('3-4 ON 도 회전 상태를 안 남긴다', r.spinning, false);
    ok('3-5 ON 도 미지급 칸을 안 남긴다', r.pend, -1);
    /* 결과 «표시» 는 남는다 — 363 이 못박은 «과정만 접는다» 규약 */
    const shown = await p.evaluate(`(() => ({
      hit: document.querySelectorAll('#rouDisc .rlt-seg.hit').length,
      res: (document.getElementById('rouRes').textContent || '').indexOf('획득') >= 0,
      lab: (document.querySelector('#rouBtn>b').textContent || '').indexOf('돌아가는 중') < 0 }))()`);
    ok('3-6 당첨 칸 하이라이트가 남는다', shown.hit, 1);
    ok('3-7 획득 문구가 남는다', shown.res, true);
    ok('3-8 버튼이 «돌아가는 중…» 에 안 갇힌다', shown.lab, true);
    /* 원판은 «정답 칸에 멈춘 그림» 이어야 한다 — 포인터(북)가 당첨 칸 중심에 온다 */
    const aim = await p.evaluate(`(() => {
      const n = ROULETTE.length, seg = 360 / n;
      const idx = [...document.querySelectorAll('#rouDisc .rlt-seg')].findIndex(s => s.classList.contains('hit'));
      const c = idx * seg + seg / 2;
      const want = ((-c % 360) + 360) % 360;
      return +(Math.abs(((rouRot % 360) + 360) % 360 - want)).toFixed(2); })()`);
    ok('3-9 원판이 당첨 칸에 정확히 앉는다(각도 오차)', aim, 0, 0.02);
    await c.close();
  }

  /* ───────────────────────── §4 같은 값 ───────────────────────── */
  {
    const { c, p } = await page(b);
    /* 같은 시드(선형 합동)로 100회를 뽑아 ON/OFF 의 «뽑힌 칸» 을 통째로 대조한다.
       뽑기는 `spinRoulette` 안에 있고 스킵은 `roulSpinTo` 안에 있으므로, 둘이 갈리면 여기서 잡힌다. */
    const cmp = await p.evaluate(`(() => {
      const orig = roulSpinTo, rnd = Math.random;
      const seed = () => { let s = 20260831; Math.random = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; };
      const run = (skip) => { S.opt.fxSkip = skip; S.daily.spins = 1e6;
        const got = []; roulSpinTo = i => got.push(i); seed();
        for(let k = 0; k < 100; k++) spinRoulette();
        return got; };
      const on = run(true), off = run(false);
      roulSpinTo = orig; Math.random = rnd;
      return { same: JSON.stringify(on) === JSON.stringify(off), n: on.length,
               uniq: new Set(on).size, sum: on.reduce((a, i) => a + ROULETTE[i].dia, 0) }; })()`);
    ok('4-1 같은 시드에서 뽑힌 칸이 ON/OFF 로 같다', cmp.same, true);
    ok('4-2 표본 100회', cmp.n, 100);
    ok('4-3 표본이 한 칸에 몰리지 않았다(≥5종)', cmp.uniq >= 5, true);
    /* 지급액 — 스킵으로 실제로 받은 값이 «뽑힌 칸의 값» 과 정확히 같다 */
    const paid = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.opt.fxSkip = true; S.daily.spins = 20; S.dia = 0;
      openRoulette(); await raf();
      let want = 0;
      for(let k = 0; k < 20; k++){
        document.getElementById('rouBtn').click(); await raf();
        const i = [...document.querySelectorAll('#rouDisc .rlt-seg')].findIndex(s => s.classList.contains('hit'));
        want += ROULETTE[i].dia;
      }
      return { got: S.dia, want, left: S.daily.spins }; })()`);
    ok('4-4 스킵 20회 지급액 = 뽑힌 칸 합계', paid.got, paid.want);
    ok('4-5 스킵 20회에 횟수도 정확히 20 깎인다', paid.left, 0);
    await c.close();
  }

  /* ───────────────────────── §5 이탈·한복판 ───────────────────────── */
  {
    const { c, p } = await page(b);
    /* 181 회귀 — 회전 도중 팝업을 닫아도 지급은 정확히 한 번 */
    const leave = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.opt.fxSkip = false; S.daily.spins = 5; S.dia = 0;
      openRoulette(); await raf();
      document.getElementById('rouBtn').click();
      await new Promise(r => setTimeout(r, 400));
      document.getElementById('modal').classList.remove('on');   /* 455 잠금과 무관하게 «사라짐» 을 만든다 */
      await new Promise(r => setTimeout(r, 5000));
      return { dia: S.dia, pend: rouPend, spinning: rouSpinning }; })()`);
    ok('5-1 회전 중 닫아도 지급이 일어난다', leave.dia > 0, true);
    ok('5-2 지급은 정확히 한 번(칸 값 하나와 일치)',
      await p.evaluate(`ROULETTE.some(r => r.dia === ${leave.dia})`), true);
    ok('5-3 미지급 칸이 안 남는다', leave.pend, -1);
    ok('5-4 회전 상태가 안 남는다', leave.spinning, false);
    /* 363 «켜는 즉시» 규약 — 회전 한복판에 토글을 누르면 그 자리에서 끝난다 */
    const mid = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.opt.fxSkip = false; S.daily.spins = 5; S.dia = 0;
      openRoulette(); await raf();
      const t0 = performance.now();
      document.getElementById('rouBtn').click();
      await new Promise(r => setTimeout(r, 600));            /* 감속 한복판 */
      const midSpin = rouSpinning;
      document.getElementById('rouSkip').click();            /* 켜는 즉시 */
      let t = -1;
      while(performance.now() - t0 < 8000){
        await raf();
        if((document.getElementById('rouRes').textContent || '').indexOf('획득') >= 0){ t = performance.now() - t0; break; }
      }
      const idx = [...document.querySelectorAll('#rouDisc .rlt-seg')].findIndex(s => s.classList.contains('hit'));
      const seg = 360 / ROULETTE.length, cc = idx * seg + seg / 2;
      const want = ((-cc % 360) + 360) % 360;
      return { midSpin, t, dia: S.dia, aim: +(Math.abs(((rouRot % 360) + 360) % 360 - want)).toFixed(2),
               on: S.opt.fxSkip }; })()`);
    ok('5-5 누르기 전에는 실제로 돌고 있었다', mid.midSpin, true);
    ok('5-6 한복판에 켜면 1초 안에 끝난다', mid.t > 0 && mid.t < 1000, true);
    ok('5-7 «다음 회전부터» 가 아니다(3.9초 전에 끝났다)', mid.t < SPIN_MS - 300, true);
    ok('5-8 끊어도 원판은 당첨 칸에 앉는다', mid.aim, 0, 0.02);
    ok('5-9 끊어도 지급은 한 번', await p.evaluate(`ROULETTE.some(r => r.dia === ${mid.dia})`), true);
    ok('5-10 토글은 켜진 채로 남는다', mid.on, true);
    await c.close();
  }

  /* ───────────────────────── §6 상태가 하나 ───────────────────────── */
  {
    const { c, p } = await page(b);
    const one = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.daily.spins = 5; openRoulette(); await raf();
      document.getElementById('rouSkip').click(); await raf();
      const afterRou = S.opt.fxSkip;
      const stored = JSON.parse(localStorage.getItem(KEY)).opt.fxSkip;
      closeModal();
      S.dia = 1e9; doSummonFree('weapon', 10, true); await raf(); await raf();
      const sumCls = document.getElementById('sumSkip').className;
      const sumTx = document.querySelector('#sumSkip .sm-skk>em').textContent;
      document.getElementById('sumSkip').click(); await raf();
      const afterSum = S.opt.fxSkip;
      closeSummonResult();
      S.daily.spins = 5; openRoulette(); await raf();
      const rouTx = document.querySelector('#rouSkip .sm-skk>em').textContent;
      return { afterRou, stored, sumCls, sumTx, afterSum, rouTx,
               keys: Object.keys(S.opt).filter(k => /skip/i.test(k)) }; })()`);
    ok('6-1 룰렛에서 켜면 상태가 켜진다', one.afterRou, true);
    ok('6-2 저장까지 간다', one.stored, true);
    ok('6-3 12 소환 토글이 «켬» 으로 열린다', one.sumCls, 'sm-sk on');
    ok('6-4 12 소환 토글 글자도 ON', one.sumTx, 'ON');
    ok('6-5 12 에서 끄면 상태가 꺼진다', one.afterSum, false);
    ok('6-6 룰렛 토글도 OFF 로 열린다', one.rouTx, 'OFF');
    ok('6-7 스킵 상태 키는 하나뿐이다', one.keys.join(','), 'fxSkip');
    /* 구 세이브 승계 — 363 세이브(`sumSkip`)가 새 키로 살아 돌아온다.
       ⚠ reload 로 재면 못 잰다(`beforeunload → save()` 가 지운 키를 되살린다 — LESSONS 363 ①).
         `load()` 를 직접 부르고 `S.opt` 를 읽는다. */
    const mig = await p.evaluate(`(() => {
      const raw = JSON.parse(localStorage.getItem(KEY));
      const put = o => localStorage.setItem(KEY, JSON.stringify(o));
      const rd = mut => { const d = JSON.parse(JSON.stringify(raw)); mut(d); put(d); load(); return S.opt.fxSkip; };
      const a = rd(d => { delete d.opt.fxSkip; d.opt.sumSkip = true; });
      const n = rd(d => { delete d.opt.fxSkip; d.opt.sumSkip = false; });
      const both = rd(d => { d.opt.fxSkip = false; d.opt.sumSkip = true; });
      const none = rd(d => { delete d.opt.fxSkip; delete d.opt.sumSkip; });
      const key = KEY;
      put(raw); load();
      return { a, n, both, none, key }; })()`);
    ok('6-8 구 세이브 sumSkip:true → fxSkip:true 로 승계', mig.a, true);
    ok('6-9 구 세이브 sumSkip:false → false', mig.n, false);
    ok('6-10 새 키가 이미 있으면 새 키가 이긴다', mig.both, false);
    ok('6-11 둘 다 없는 세이브 → 기본값 false', mig.none, false);
    const key = await p.evaluate('KEY');
    await c.close();
    /* 부팅 왕복 — 이관이 «메모리에서만» 사는 값이 아님을 못박는다.
       ⚠ 같은 페이지에서 localStorage 를 고치고 reload 하면 못 잰다 — `beforeunload → save()` 가
         메모리의 S 를 통째로 다시 써서 구 키를 도로 덮는다(LESSONS 363 ①, 실측으로 확인).
         **새 컨텍스트에 초기 스크립트로 구 세이브를 심고 처음부터 띄운다.** */
    {
      const c2 = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      await c2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
        [key, JSON.stringify({ opt: { sumSkip: true, vol: 100 } })]);
      const p2 = await c2.newPage();
      await p2.goto(HTML); await p2.waitForTimeout(900);
      ok('6-12 구 세이브로 부팅해도 켜진 채 온다', await p2.evaluate('S.opt.fxSkip'), true);
      ok('6-13 KEY 는 안 올렸다', await p2.evaluate('KEY'), key);
      ok('6-14 그 세이브의 다른 opt 도 살아 있다', await p2.evaluate('S.opt.vol'), 100);
      await c2.close();
    }
  }

  /* ───────────────────────── §R 되돌림 ───────────────────────── */
  {
    const { c, p } = await page(b);
    /* ⓐ **514 이전 사본**을 만들어 같은 클릭을 먹인다 — «빠른 이유가 스킵 분기인가» 를 가르는 자리.
       판정식(`fxSkipOn`)은 `const` 라 못 덮는다(실측: Assignment to constant variable). 그래서
       398 §R 과 같은 길로 간다 — 소스에서 `roulSpinTo` 를 떼어 **514 가 더한 세 자리만** 지운 사본을
       페이지에 물린다. [전제] 항이 그 세 자리가 실제로 소스에 있는지부터 묻는다(자리가 사라지면 빨강). */
    ok('R-0 [전제] 514 가 더한 자리 3곳을 소스에서 찾았다', PRE.found, 3);
    /* ⚠ 사본은 **문자열 표현식이 아니라 함수**로 넘긴다 — playwright 는 첫 인자가 문자열이면
       뒤의 인자를 안 넘겨 준다(실측: `src` 가 undefined 로 들어와 사본이 통째로 죽고, 그러면
       이 항이 «-1» 로 빨개진다. 되돌림 시험이 조용히 무력해지는 자리라 여기 적어 둔다). */
    const off = await p.evaluate(async (src) => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      const orig = roulSpinTo;
      roulSpinTo = eval('(' + src + ')');
      S.opt.fxSkip = true; S.daily.spins = 5; S.dia = 0;
      openRoulette(); await raf();
      const t0 = performance.now();
      document.getElementById('rouBtn').click();
      let t = -1;
      while (performance.now() - t0 < 8000) {
        await raf();
        if ((document.getElementById('rouRes').textContent || '').indexOf('획득') >= 0) { t = performance.now() - t0; break; }
      }
      roulSpinTo = orig;
      return t;
    }, PRE.src);
    ok('R-1 스킵 분기를 죽이면 도로 3.9초다', Math.abs(off - SPIN_MS) <= 400, true);
    ok('R-2 그 값이 300ms 를 크게 넘는다 (= §3 이 헛초록이 아니다)', off > FAST_MS * 3, true);
    /* ⓑ 토글 노드를 지우면 §1 이 성립하지 않는다 */
    const gone = await p.evaluate(`(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      S.daily.spins = 5; openRoulette(); await raf();
      document.getElementById('rouSkip').remove(); await raf();
      return { node: !!document.getElementById('rouSkip'),
               inPop: document.querySelectorAll('#modal .sm-sk').length }; })()`);
    ok('R-3 노드를 지우면 §1-1 이 거짓이 된다', gone.node, false);
    ok('R-4 팝업 안 토글 수 0', gone.inPop, 0);
    await c.close();
  }

  await b.close();

  const w = Math.max(...R.map(r => [...r.n].reduce((a, ch) => a + (ch.charCodeAt(0) > 127 ? 2 : 1), 0)));
  R.forEach(r => {
    const vis = [...r.n].reduce((a, ch) => a + (ch.charCodeAt(0) > 127 ? 2 : 1), 0);
    console.log((r.pass ? '  ok ' : '  FAIL ') + r.n + ' '.repeat(Math.max(1, w - vis + 2))
      + 'got=' + String(r.got).padEnd(20) + 'want=' + String(r.want));
  });
  if (errs.length) console.log('콘솔 에러 ' + errs.length + ' — ' + errs.slice(0, 3).join(' | '));
  const p = R.filter(r => r.pass).length;
  console.log('VERIFY514 ' + p + '/' + R.length + (p === R.length && !errs.length ? ' PASS' : ' FAIL'));
  process.exit(p === R.length && !errs.length ? 0 : 1);
})();
