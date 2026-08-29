/* 작업 155 회귀 게이트 — 룰렛 보상 «다이아만, 100~1000» (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify155.js   → 마지막 줄이 `VERIFY155 n/n PASS` 여야 한다.

   본다:
     §1 보상표     ROULETTE 8칸이 전부 `dia` 하나뿐이다(goldMul·rel·gold·frag 키 0개) ·
                   값이 100~1000 안에 있고 오름차순 · w 는 비증가(낮은 값일수록 큰 w) ·
                   w 합 100(= 백분율) · 기대값 340/회 · 하루 5회 1,700.
     §2 죽은 코드   골드/유물조각/대박 전용 팔레트가 없다(ROUL_SEGC = 2색 배열) ·
                   roulLabel 이 goldMul/rel 을 더 안 본다 · 그래도 ATTEND 의 goldMul 은 살아 있다.
     §3 원판 렌더   세그먼트 8개 · 라벨 = fmt(dia) · 색 2종 교대 · 진짜 포인터 클릭으로 회전이 시작된다.
     §4 실지급     8칸 전수 — 각 칸이 «그 칸의 dia 만큼» 정확히 지급하고 골드·유물조각은 불변,
                   S.dia 가 localStorage 에도 반영된다.
     §5 당첨 칸    8칸 전수 — 최종 회전각으로 포인터(북) 아래 칸을 역산해 지급된 칸과 대조하고
                   `.hit` 하이라이트도 같은 칸이다 (LESSONS 29-① «부호 버그는 캡처로 안 잡힌다»).
     §6 횟수       하루 5회 — 마지막 1회를 쓰면 0/5 · 버튼 «내일 다시 충전됩니다» · 재시도는 지급 0.
     §7 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 룰렛만 남기고 상태를 초기화한다. localStorage.clear()+reload 는 옛 페이지의 자동 save() 가
   되써서 안 통한다(LESSONS 73-①) — 메모리 S 를 DEF() 로 되돌린다. */
const reset = (p, spins) => p.evaluate((spins) => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  S.daily.date = today(); S.daily.spins = spins;
  rouRot = 0; rouSpinning = false;
  uiDirty = true; renderUI();
}, spins);

/* idx 칸이 나오도록 Math.random 을 한 번만 고정한다(가중치 누적의 «칸 한가운데» 를 노린다) */
const spinIdx = (p, idx) => p.evaluate((idx) => {
  const tot = ROULETTE.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (let i = 0; i < idx; i++) acc += ROULETTE[i].w;
  const r = (acc + ROULETTE[idx].w / 2) / tot;              /* 그 칸의 한가운데 */
  const real = Math.random;
  Math.random = () => { Math.random = real; return r; };
  const b = { dia: S.dia, gold: S.gold, relic: S.relic, spins: S.daily.spins };
  spinRoulette();
  return b;
}, idx);

const settle = async (p) => {
  await p.waitForFunction(() => rouSpinning === false, null, { timeout: 12000 });
  await p.waitForTimeout(60);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof ROULETTE !== 'undefined' && typeof spinRoulette === 'function');
  await p.waitForTimeout(600);

  /* ── §1 보상표 ────────────────────────────────────────────────── */
  console.log('§1 보상표 — 다이아만 · 100~1000');
  const R = await p.evaluate(() => ({
    rows: ROULETTE.map(r => ({ dia: r.dia || 0, w: r.w, keys: Object.keys(r).filter(k => k !== 'ic' && k !== 't' && k !== 'w') })),
    free: ROUL_FREE, ad: (typeof ROUL_AD !== 'undefined' ? ROUL_AD : 0),
    tot: (typeof ROUL_TRY !== 'undefined' ? ROUL_TRY : ROUL_FREE)
  }));
  eq('§1 칸 수', R.rows.length, 8);
  ok(R.rows.every(r => r.keys.length === 1 && r.keys[0] === 'dia'),
     '§1 8칸 전부 보상 키가 `dia` 하나뿐 (goldMul·rel·gold·frag 0개)',
     R.rows.map(r => r.keys.join('+')).join(' / '));
  ok(R.rows.every(r => r.dia >= 100 && r.dia <= 1000),
     '§1 값이 전부 100~1000 안', R.rows.map(r => r.dia).join(','));
  ok(R.rows.every((r, i) => i === 0 || r.dia > R.rows[i - 1].dia),
     '§1 값이 오름차순 사다리', R.rows.map(r => r.dia).join(','));
  ok(R.rows.every((r, i) => i === 0 || r.w <= R.rows[i - 1].w),
     '§1 낮은 값일수록 가중치가 크다(w 비증가)', R.rows.map(r => r.w).join(','));
  const wsum = R.rows.reduce((s, r) => s + r.w, 0);
  eq('§1 w 합(= 백분율)', wsum, 100);
  const ev = R.rows.reduce((s, r) => s + r.dia * r.w, 0) / wsum;
  ok(ev >= 100 && ev <= 1000, `§1 기대값 ${ev} 다이아/회 (100~1000 안)`);
  /* 367 이관 — 155 가 «하루 5회» 로 쓰던 상수가 `ROUL_FREE`(이제 앞의 무료분 3) 에서
     `ROUL_TRY`(총량 5) 로 갈렸다. 155 의 성질은 «하루 기대값» 이므로 **총량**을 봐야 하고,
     그 총량이 367 뒤에도 5로 불변이라는 것이 이 절이 지킬 것이다. 갈린 두 항도 같이 못박는다 —
     항을 눌러 초록으로 되돌리기만 하면 «367 이 통째로 사라져도 초록» 이 된다(328·330 교훈). */
  eq('§1 하루 총 횟수(ROUL_TRY)', R.tot, 5);
  eq('★ §1 367 — 그 중 무료(ROUL_FREE)', R.free, 3);
  eq('★ §1 367 — 그 중 광고(ROUL_AD)', R.ad, 2);
  ok(R.free + R.ad === R.tot, '§1 무료 + 광고 = 총량 (재고가 한 벌이라는 산술)',
     R.free + ' + ' + R.ad + ' = ' + R.tot);
  console.log(`  · 기대값 ${ev}/회 × ${R.tot}회 = ${ev * R.tot} 다이아/일 (367 이 총량을 안 바꿨으므로 불변)`);

  /* ── §2 죽은 코드 없음 ───────────────────────────────────────── */
  console.log('§2 골드·유물조각 전용 코드가 남지 않았다');
  const segc = await p.evaluate(() => ({
    isArr: Array.isArray(ROUL_SEGC), n: Array.isArray(ROUL_SEGC) ? ROUL_SEGC.length : Object.keys(ROUL_SEGC).length,
    label: roulLabel.toString(),
    /* 399(2026-08-29, 주인 지시 «패스 보상 출석보상 전부 다이아로 줘라») — 종전 이 자리는
       «ATTEND 의 goldMul 은 살아 있어야 한다(giveReward 분기는 죽은 코드가 아니다)» 였다.
       출석 28칸이 전부 dia 가 되면서 그 분기가 **실제로 죽어** 같이 걷어냈다. 자리를 비우지 않고
       (333 처방) 룰렛과 **같은 성질**을 출석에도 묻는다 — «다른 재화가 되살아나면 빨개진다». */
    attendKeys: [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => k !== 'ic' && k !== 't')))].sort(),
    attendN: ATTEND.length,
    /* 소스 문자열이 아니라 **동작**으로 묻는다 — 주석에 남은 «goldMul» 글자에 걸리면 안 되고,
       분기가 진짜 죽었는지는 «goldMul 만 든 보상을 줘도 골드가 안 는다» 가 답이다. */
    goldMulDead: (() => { const g0 = S.gold, out = giveReward({ goldMul: 60 }); const r = { g: S.gold - g0, out }; S.gold = g0; return r; })()
  }));
  ok(segc.isArr && segc.n === 2, '§2 ROUL_SEGC = 칸 구분용 2색 배열', `${segc.isArr ? 'array' : 'object'}/${segc.n}`);
  ok(!/goldMul|\br\.rel\b|유물조각/.test(segc.label), '§2 roulLabel 이 goldMul·rel 을 더 안 본다', segc.label.replace(/\s+/g, ' '));
  ok(segc.attendN === 28 && segc.attendKeys.join(',') === 'dia',
     '§2 출석 28칸도 보상 키가 dia 하나뿐 (399 — goldMul·rel·gold 가 되살아나면 빨강)',
     segc.attendN + '칸 · [' + segc.attendKeys.join(',') + ']');
  ok(segc.goldMulDead.g === 0 && segc.goldMulDead.out === '',
     '§2 giveReward 의 goldMul 분기가 죽었다 (399 — goldMul 만 든 보상은 아무것도 안 준다)',
     'Δgold ' + segc.goldMulDead.g + ' · 표기 «' + segc.goldMulDead.out + '»');
  const roulBlock = SRC.slice(SRC.indexOf('const ROULETTE = ['), SRC.indexOf('const ROUL_FREE'));
  ok(!/goldMul|rel:|🎁/.test(roulBlock), '§2 ROULETTE 배열에 goldMul·rel·🎁 잔재 없음');

  /* ── §3 원판 렌더 ────────────────────────────────────────────── */
  console.log('§3 원판이 배열대로 그려진다');
  await reset(p, 5);
  await p.evaluate(() => openRoulette());
  await p.waitForTimeout(200);
  const disc = await p.evaluate(() => {
    const segs = [...document.querySelectorAll('#rouDisc .rlt-seg')];
    return {
      n: segs.length,
      vals: segs.map(s => s.querySelector('.rlt-vl').textContent.trim()),
      txs: [...new Set(segs.map(s => s.querySelector('.rlt-tx').textContent.trim()))],
      want: ROULETTE.map(r => fmt(r.dia)),
      colors: [...new Set(ROUL_SEGC)],
      bg: $('rouDisc').style.background
    };
  });
  eq('§3 세그먼트 수', disc.n, 8);
  ok(JSON.stringify(disc.vals) === JSON.stringify(disc.want),
     '§3 칸 라벨이 배열 값 그대로', disc.vals.join(',') + ' vs ' + disc.want.join(','));
  ok(disc.txs.length === 1 && disc.txs[0] === '다이아', '§3 칸 이름이 전부 «다이아»', disc.txs.join('/'));
  ok(disc.colors.every(c => disc.bg.toLowerCase().includes(c.toLowerCase()) ||
     disc.bg.includes(c.replace('#', '').toLowerCase())) || /rgb/.test(disc.bg),
     '§3 원판 배경이 ROUL_SEGC 2색으로 생성된다');
  /* 진짜 포인터로 눌러야 60 쥬시 경로까지 지난다(LESSONS 65-②) */
  await p.click('#rouBtn');
  const spinning = await p.evaluate(() => rouSpinning);
  ok(spinning, '§3 실제 클릭으로 회전이 시작된다');
  await settle(p);

  /* ── §4·§5 8칸 전수 — 지급값 · 당첨 칸 역산 ──────────────────── */
  console.log('§4·§5 8칸 전수 — 지급 금액과 당첨 칸');
  let payOk = 0, sideOk = 0, angOk = 0, hitOk = 0, saveOk = 0;
  const seen = [];
  for (let i = 0; i < 8; i++) {
    await reset(p, 5);
    await p.evaluate(() => openRoulette());
    await p.waitForTimeout(120);
    const before = await spinIdx(p, i);
    await settle(p);
    const after = await p.evaluate(() => {
      save();
      const st = JSON.parse(localStorage.getItem(
        Object.keys(localStorage).find(k => /idle_hunter_save/.test(k))) || '{}');
      const segs = [...document.querySelectorAll('#rouDisc .rlt-seg')];
      const rot = ((-rouRot % 360) + 360) % 360;          /* 포인터(북) 아래 각도 */
      return {
        dia: S.dia, gold: S.gold, relic: S.relic, spins: S.daily.spins, saved: st.dia,
        under: Math.floor(rot / (360 / ROULETTE.length)),
        hit: segs.findIndex(s => s.classList.contains('hit')),
        res: ($('rouRes') || {}).textContent || ''
      };
    });
    const want = R.rows[i].dia;
    const got = after.dia - before.dia;
    seen.push(`${i}:${got}`);
    if (got === want) payOk++; else console.log(`    ✗ 칸 ${i} 지급 ${got} ≠ ${want}`);
    if (after.gold === before.gold && after.relic === before.relic) sideOk++;
    else console.log(`    ✗ 칸 ${i} 골드/유물조각이 변했다 (${before.gold}→${after.gold} · ${before.relic}→${after.relic})`);
    if (after.under === i) angOk++; else console.log(`    ✗ 칸 ${i} 포인터 아래 칸이 ${after.under}`);
    if (after.hit === i) hitOk++; else console.log(`    ✗ 칸 ${i} .hit 이 ${after.hit}`);
    if (after.saved === after.dia) saveOk++; else console.log(`    ✗ 칸 ${i} 세이브 ${after.saved} ≠ ${after.dia}`);
  }
  eq('§4 8칸 전부 «그 칸의 dia» 만큼 지급', payOk, 8);
  console.log('  · 지급 실측 ' + seen.join(' · '));
  eq('§4 골드·유물조각은 한 칸도 안 변한다', sideOk, 8);
  eq('§4 S.dia 가 localStorage 에도 반영', saveOk, 8);
  eq('§5 최종 회전각 역산 = 지급된 칸', angOk, 8);
  eq('§5 .hit 하이라이트 = 지급된 칸', hitOk, 8);

  /* ── §6 하루 5회 ─────────────────────────────────────────────── */
  console.log('§6 하루 5회 소진');
  await reset(p, 1);
  await p.evaluate(() => openRoulette());
  await p.waitForTimeout(120);
  await spinIdx(p, 0);
  await settle(p);
  const end = await p.evaluate(() => ({
    spins: S.daily.spins, cnt: ($('rouCnt') || {}).textContent || '',
    /* 367 이관 — 라벨은 `<b>` 안이다(267 규약). ▶AD 뱃지가 버튼 안에 `<b>AD</b>` 를 하나 더
       들여왔으므로 버튼 전체 textContent 를 읽으면 «…충전됩니다AD» 가 된다. */
    dis: $('rouBtn').disabled, txt: ($('rouBtn').querySelector(':scope>b') || $('rouBtn')).textContent.trim(),
    adShown: (function(){ var a = $('rouBtn').querySelector(':scope>.ad');
                          return a ? getComputedStyle(a).display !== 'none' : null; })(), dia: S.dia
  }));
  eq('§6 남은 횟수', end.spins, 0);
  eq('§6 카운터 표시', end.cnt.trim(), '0 / 5');
  ok(end.dis, '§6 버튼이 비활성');
  eq('§6 버튼 문구', end.txt, '내일 다시 충전됩니다');
  ok(end.adShown === false, '★ §6 367 — 소진 상태에는 ▶AD 도 없다 (누를 것이 없다)',
     'AD 표시=' + end.adShown);
  const again = await p.evaluate(() => { const d = S.dia; spinRoulette(); return S.dia - d; });
  eq('§6 소진 후 재시도 지급', again, 0);
  await p.evaluate(() => closeModal());

  /* ── §7 콘솔 ─────────────────────────────────────────────────── */
  console.log('§7 콘솔');
  ok(errs.length === 0, `§7 콘솔 에러 0건 — ${errs.length ? errs.slice(0, 2).join(' | ') : '없음'}`);

  await browser.close();
  console.log(`\nVERIFY155 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
