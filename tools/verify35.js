/* 작업 35 — 패스 페이지 회귀·기능 검증. 좌표 불변식 + «버튼을 누르면 무엇이 바뀌는가» 전수.
 *   node tools/verify35.js
 * 35 를 다시 손대는 세션은 **손대기 전/후로 한 번씩** 돌려 회귀 0 을 확인할 것(LESSONS 25-⑦).
 *
 * 절대값 단정보다 «불변식» 이 덜 틀린다(LESSONS 43-① · 58-⑦):
 *   · 앵커는 측정표의 «ref 절대 y − 84» 에서만 가져온다(프레임 높이 차로 유도하지 않는다).
 *   · 하단바는 bottom 앵커라 프레임이 길어져도 제자리 — 화면비 3종에서 같이 본다.
 *   · 영속성 검사에는 addInitScript 를 쓰지 않는다(LESSONS 50-②) — 페이지 안에서 올리고 reload 한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let bad = 0;
const ok = (m) => console.log('  ✓ ' + m);
const no = (m) => { bad++; console.log('  ✗ ' + m); };
const eq = (label, got, want, tol) => {
  const d = Math.abs(got - want);
  if (d <= (tol === undefined ? 1 : tol)) ok(`${label} = ${got} (기대 ${want})`);
  else no(`${label} = ${got} (기대 ${want}, Δ${d.toFixed(2)})`);
};

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}
const openPassPage = async (page) => {
  await page.evaluate(() => document.getElementById('menub').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('psGo').click());
  /* 60 쥬시의 «열기 팝»(scale) 이 도는 동안 재면 bbox 가 3~4% 작게 읽힌다 —
     연출이 끝난 뒤에 재야 좌표가 결정적이다(LESSONS 64-③ «팝업을 새로 연 직후 rect 는 못 믿는다»). */
  await page.waitForTimeout(1200);
};

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }

  /* ---------- 1. 껍데기 좌표 (측정표 §0-1: frame y = ref y − 84) ---------- */
  console.log('[1] 껍데기 앵커 — 1080×2280');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify({ best: 79, stage: 79, gold: 5e9, dia: 120000, relic: 4000 })]);
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(800);
    await openPassPage(page);
    const g = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      return { hero: r('.ps-hero'), gold: r('.ps-gold'), hdr: r('.ps-hdr'),
               list: r('.ps-list'), bar: r('.ps-bar'), buy: r('.ps-buy'),
               spine: r('.ps-spine'), row0: r('#psTk .ps-r'), on: r('#psBar .pt.on') };
    });
    eq('히어로 top (ref 84 − 84)', g.hero.y, 0);
    eq('히어로 h (ref 84..618)', g.hero.h, 535);
    eq('골드바 top (ref 619 − 84)', g.gold.y, 535);
    eq('골드바 h (ref 619..647)', g.gold.h, 29);
    eq('헤더밴드 top (ref 648 − 84)', g.hdr.y, 564);
    eq('헤더밴드 h (ref 648..795)', g.hdr.h, 148);
    eq('리스트 top (ref 796 − 84)', g.list.y, 712);
    eq('하단바 h (ref 2161..2339)', g.bar.h, 179);
    eq('하단바 bottom = 프레임 바닥', g.bar.y + g.bar.h, 2280);
    eq('구매버튼 x (ref 605)', g.buy.x, 605);
    eq('구매버튼 top (ref 460 − 84)', g.buy.y, 376);
    eq('구매버튼 w × h', g.buy.w, 419); eq('구매버튼 h', g.buy.h, 149);
    eq('스파인 left (ref 520)', g.spine.x, 520);
    eq('스파인 w (ref 520..559)', g.spine.w, 40);
    eq('행 pitch', g.row0.h, 229.85, 0.1);
    eq('활성 탭 w (ref 200..488)', g.on.w, 289);
    eq('활성 탭 x', g.on.x, 200);
    await ctx.close();
  }

  /* ---------- 2. 하단바 칸 폭 재분배 (활성 289 / 비활성 190) ---------- */
  console.log('[2] 하단 패스 탭바 — 활성 칸이 바뀌면 폭이 재분배된다');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(800);
    await openPassPage(page);
    const cells = await page.evaluate(() => [...document.querySelectorAll('#psBar .pt')]
      .map(c => ({ k: c.dataset.ptab, x: Math.round(c.getBoundingClientRect().x), w: Math.round(c.getBoundingClientRect().width), on: c.classList.contains('on') })));
    const want = [[200, 289], [494, 190], [690, 190], [884, 190]];
    cells.forEach((c, i) => {
      eq(`탭 ${c.k} x`, c.x, want[i][0]);
      eq(`탭 ${c.k} w`, c.w, want[i][1]);
    });
    const back = await page.evaluate(() => { const b = document.querySelector('#psBar .bk').getBoundingClientRect(); return [b.x, b.width]; });
    eq('뒤로가기 칸 x', back[0], 0); eq('뒤로가기 칸 w', back[1], 195);
    await ctx.close();
  }

  /* ---------- 3. 기능 — «누르면 무엇이 바뀌는가» ---------- */
  console.log('[3] 기능 체크 (T2 «기능 완성 규칙»)');
  {
    /* ⚠ 영속성 검사가 섞여 있으므로 addInitScript 로 세이브를 심으면 안 된다 —
       reload 때 원본이 재주입돼 «저장 실패» 로 오진한다(LESSONS 50-②).
       상태는 로드된 뒤 페이지 안에서 만든다. 그리고 **자동 강화(S.autoBuy)가 골드를 쓰므로**
       재화 Δ 를 재기 전에 꺼야 한다(안 끄면 지급액보다 몇십 골드 적게 읽힌다). */
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(800);
    await page.evaluate(() => {
      S.best = 79; S.stage = 79; S.gold = 0; S.dia = 0; S.relic = 0;
      S.autoBuy = false; S.pass = { prem: {}, got: {} };
      window.step = () => {};              /* 로직 정지 — 전투가 골드를 벌어 Δ 를 오염시킨다 */
      save();
    });
    await openPassPage(page);

    /* 3-1 해금 판정: 최고 79 → 단계 0..14(스테이지 5..75) 해금, 15(80) 잠금 */
    const lockState = await page.evaluate(() => ({ t14: passOpen(14), t15: passOpen(15), last: passLast() }));
    if (lockState.t14 && !lockState.t15 && lockState.last === 14) ok('해금 판정 — 스테이지 75 해금 / 80 잠금 (last=14)');
    else no('해금 판정 오류: ' + JSON.stringify(lockState));

    /* 3-2 무료 칸 수령 → 재화가 실제로 늘고 ✓ 가 붙는다 */
    const before = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    const rw = await page.evaluate(() => passRw(14, 0));
    await page.evaluate(() => document.querySelector('[data-pt="14:0"]').click());
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic,
      dn: document.querySelector('[data-pt="14:0"]').classList.contains('dn'),
      ck: !!document.querySelector('[data-pt="14:0"] s.ck') }));
    const key = rw.k === 'gold' ? 'g' : (rw.k === 'dia' ? 'd' : 'r');
    eq(`무료 수령 — ${rw.k} 증가량`, after[key] - before[key], rw.n, 0);
    if (after.dn && after.ck) ok('무료 수령 — 칸이 «수령완료(dn)» + ✓ 로 바뀜');
    else no('무료 수령 — 칸 상태가 안 바뀜: ' + JSON.stringify(after));

    /* 3-3 같은 칸 재수령 불가 (Δ0) */
    const b2 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    await page.evaluate(() => document.querySelector('[data-pt="14:0"]').click());
    await page.waitForTimeout(200);
    const a2 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    if (a2.g === b2.g && a2.d === b2.d && a2.r === b2.r) ok('재수령 차단 — Δ0');
    else no('재수령이 또 지급됐다');

    /* 3-4 잠긴 단계(80) 수령 불가 */
    const b3 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    await page.evaluate(() => document.querySelector('[data-pt="15:0"]').click());
    await page.waitForTimeout(200);
    const a3 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    if (a3.g === b3.g && a3.d === b3.d && a3.r === b3.r) ok('미해금 단계(80) 수령 차단 — Δ0');
    else no('미해금 단계가 지급됐다');

    /* 3-5 프리미엄 미활성 → 프리미엄 칸 차단 + 🔒 표시 */
    const lockIcon = await page.evaluate(() => !!document.querySelector('[data-pt="14:1"] s.lk'));
    if (lockIcon) ok('프리미엄 미활성 — 칸에 🔒 표시'); else no('프리미엄 칸에 🔒 가 없다');
    const b4 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    await page.evaluate(() => document.querySelector('[data-pt="14:1"]').click());
    await page.waitForTimeout(250);
    const a4 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    if (a4.g === b4.g && a4.d === b4.d && a4.r === b4.r) ok('프리미엄 미활성 — 수령 차단 Δ0');
    else no('프리미엄이 꺼졌는데 지급됐다');
    await page.evaluate(() => closeModal());

    /* 3-6 프리미엄 활성화 → 구매 버튼이 사라지고 🔒 가 걷히고 수령된다 */
    await page.evaluate(() => window.devPassPrem());
    await page.waitForTimeout(250);
    const shown = await page.evaluate(() => getComputedStyle(document.getElementById('psBuy')).display);
    if (shown === 'none') ok('프리미엄 활성화 — 구매 버튼 숨김'); else no('구매 버튼이 그대로다: ' + shown);
    const rw1 = await page.evaluate(() => passRw(14, 1));
    const b5 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    await page.evaluate(() => document.querySelector('[data-pt="14:1"]').click());
    await page.waitForTimeout(250);
    const a5 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    const k1 = rw1.k === 'gold' ? 'g' : (rw1.k === 'dia' ? 'd' : 'r');
    eq(`프리미엄 수령 — ${rw1.k} 증가량`, a5[k1] - b5[k1], rw1.n, 0);

    /* 3-7 영속성 — reload 해도 수령 기록·프리미엄이 남는다 (addInitScript 금지: LESSONS 50-②) */
    await page.evaluate(() => save());
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    /* 36 이 붙으며 키가 «탭:단계:칸» 으로, prem 이 «탭별 맵» 으로 바뀌었다(index.html load() 마이그레이션) */
    const kept = await page.evaluate(() => ({ prem: !!(S.pass.prem && S.pass.prem.stage), a: !!S.pass.got['stage:14:0'], b: !!S.pass.got['stage:14:1'] }));
    if (kept.prem && kept.a && kept.b) ok('영속성 — reload 후 프리미엄·수령 기록 유지');
    else no('영속성 실패: ' + JSON.stringify(kept));

    /* 3-8 구버전 세이브 마이그레이션 — pass 필드가 없거나 망가져도 NaN·예외가 안 난다 */
    for (const v of [undefined, null, 'x', 7, { prem: 'y' }]) {
      const res = await page.evaluate((val) => {
        const d = JSON.parse(localStorage.getItem('idle_hunter_save_v4'));
        if (val === undefined) delete d.pass; else d.pass = val;
        localStorage.setItem('idle_hunter_save_v4', JSON.stringify(d));
        /* ⚠ load() 는 «세이브 객체» 가 아니라 d.time 을 돌려준다 — 전역 S 를 세운다.
           1차 assert 가 반환값을 세이브로 착각해 «마이그레이션 실패» 로 오진했다(LESSONS 43-①). */
        load();
        return { t: typeof S.pass, prem: typeof S.pass.prem, got: typeof S.pass.got };
      }, v === undefined ? undefined : v);
      if (res.t === 'object' && res.prem === 'object' && res.got === 'object')
        ok('마이그레이션 — pass=' + JSON.stringify(v) + ' → 기본값 흡수');
      else no('마이그레이션 실패 pass=' + JSON.stringify(v) + ': ' + JSON.stringify(res));
    }

    /* 3-9 뒤로가기로 닫힌다 */
    await openPassPage(page);
    await page.evaluate(() => document.querySelector('#psBar [data-pback]').click());
    await page.waitForTimeout(250);
    const closed = await page.evaluate(() => !document.getElementById('psw').classList.contains('on'));
    if (closed) ok('뒤로가기 — 페이지가 닫힌다'); else no('뒤로가기가 안 먹는다');
    await ctx.close();
  }

  /* ---------- 4. 화면비 3종 — 상단 앵커 Δ0 · 하단바 bottom 앵커 ---------- */
  console.log('[4] 화면비 회귀 (LESSONS 63-②)');
  for (const [w, h] of [[1080, 2280], [1080, 1920], [1080, 2520]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(800);
    await openPassPage(page);
    const g = await page.evaluate(() => {
      const app = document.getElementById('app').getBoundingClientRect();
      const sc = app.width / 1080;                    /* fit() 스케일 — 프레임 좌표로 되돌린다 */
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect();
        return { y: (b.y - app.y) / sc, h: b.height / sc, bot: (b.bottom - app.y) / sc }; };
      return { fh: app.height / sc, gold: r('.ps-gold'), hdr: r('.ps-hdr'), bar: r('.ps-bar'), list: r('.ps-list') };
    });
    eq(`${w}×${h} 골드바 top`, Math.round(g.gold.y), 535);
    eq(`${w}×${h} 헤더밴드 top`, Math.round(g.hdr.y), 564);
    eq(`${w}×${h} 하단바 bottom = 프레임 높이`, Math.round(g.bar.bot), Math.round(g.fh));
    if (g.list.h > 200) ok(`${w}×${h} 리스트가 잔차를 흡수 (h ${Math.round(g.list.h)})`);
    else no(`${w}×${h} 리스트가 눌려 사라짐 (h ${Math.round(g.list.h)})`);
    await ctx.close();
  }

  await browser.close();
  console.log(bad ? `\nVERIFY35 FAIL — ${bad}건` : '\nVERIFY35 PASS');
  process.exit(bad ? 1 : 0);
})();
