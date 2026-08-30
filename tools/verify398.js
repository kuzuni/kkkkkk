#!/usr/bin/env node
/* 게이트 — 작업 398 「35 스테이지 패스 보상을 전부 다이아로」
 *          + 작업 399 「70 출석 보상 28칸을 전부 다이아로」 (저장소 주인 지시 2026-08-29, 한 문장·한 벌)
 *
 *   node tools/verify398.js
 *
 * 주인 원문: «패스 보상 출석보상 전부 다이아로 줘라»
 *
 * ⚑ 선례를 그대로 따른다 — 155(룰렛 «다이아만»)·156(퀘스트 다이아 전용)이 세운 꼴은
 *   «지금 dia 인가» 가 아니라 **«다른 재화가 되살아나면 빨개지는가»** 다. 그래서 이 자는
 *   표(PASS_CUR·ATTEND)와 **지급 경로**(passClaim·passClaimAll·claimAttend) 양쪽에 같은 질문을 한다.
 *
 * §1 패스(398) — 두 탭 전 칸이 dia 하나 · 지급도 dia 하나 · 표기 자릿수(클램프 자리)
 * §2 출석(399) — 28칸이 dia 하나 · 죽은 축(goldMul·rel·🔥) 0 · 실지급
 * §3 죽은 분기가 자리를 안 남겼다 — giveReward.goldMul · atRewards 다갈래 · .ln2/.ln3
 * §R 되돌림 시험 — 골드·유물조각 칸을 되살린 사본은 **반드시 빨개진다**(무르게 푼 자가 아님을 못박는다)
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «데이터 → 지급/표기» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { revertMeasure } = require('./revert398');   /* 539 — §R 되돌림은 재현기(probe539)와 한 벌이다 */
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

const open = async (ctx, errs, url) => {
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url || URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof passRw === 'function' && typeof ATTEND !== 'undefined');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return page;
};

/* 보상 객체에서 «재화 키» 만 뽑는다 — ic(아이콘)·t(라벨)·g(등급)·n(수량)은 재화가 아니다 */
const CURKEYS = "(r => Object.keys(r).filter(k => !['ic', 't', 'g', 'n', 'k'].includes(k)))";

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 1000, relic: 100, best: 200, att: { n: 9, date: '' } })]);
  const page = await open(ctx, errs);

  try {
    /* ══ §1 패스(398) — 두 탭 전 칸이 다이아 하나 ═══════════════════════════ */
    console.log('§1 패스(398) — 스테이지·출석 두 탭 전 칸이 다이아 하나');
    const pw1 = await page.evaluate(() => {
      const out = {};
      out.curN = PASS_CUR.length;
      out.curKeys = [...new Set(PASS_CUR.map(c => c.k))].sort();
      const cells = [];
      for (const t of Object.keys(PASS_TABS)) {
        const T = PASS_TABS[t];
        const prev = passTab; passTab = t;
        for (let i = 0; i < T.n; i++) for (let c = 0; c < T.cols; c++) {
          const r = passRw(i, c);
          cells.push({ t, i, c, k: r.k, n: r.n, txt: won(r.n) });
        }
        passTab = prev;
      }
      out.n = cells.length;
      out.keys = [...new Set(cells.map(c => c.k))].sort();
      out.bad = cells.filter(c => c.k !== 'dia').slice(0, 4);
      out.nonPos = cells.filter(c => !(c.n > 0)).length;
      out.maxTxt = cells.reduce((a, c) => (c.txt.length > a.length ? c.txt : a), '');
      out.range = { min: Math.min(...cells.map(c => c.n)), max: Math.max(...cells.map(c => c.n)) };
      /* 곡선이 «단계가 오를수록 커진다» 를 잃지 않았는가(무료 칸 기준 단조 증가) */
      const prevTab = passTab; passTab = 'stage';
      const free = []; for (let i = 0; i < PASS_TABS.stage.n; i++) free.push(passRw(i, 0).n);
      passTab = prevTab;
      out.mono = free.every((v, i) => i === 0 || v > free[i - 1]);
      out.free0 = free[0]; out.freeLast = free[free.length - 1];
      out.total = cells.reduce((s, c) => s + (c.t === 'stage' ? c.n : 0), 0);
      return out;
    });
    console.log(`  · 패스 칸 ${pw1.n}개 · 스테이지 패스 한 벌 합계 ${pw1.total.toLocaleString()} 다이아`
      + ` (무료 ${pw1.free0} → ${pw1.freeLast})`);
    ok(pw1.curN === 1 && pw1.curKeys.join(',') === 'dia',
      '§1 PASS_CUR 이 다이아 한 종류 (골드·유물조각이 되살아나면 빨강)', pw1.curN + '종 [' + pw1.curKeys.join(',') + ']');
    ok(pw1.keys.join(',') === 'dia', '§1 두 탭 전 칸(' + pw1.n + '칸)의 보상 키가 dia 하나뿐',
      '[' + pw1.keys.join(',') + ']' + (pw1.bad.length ? ' · 예: ' + JSON.stringify(pw1.bad) : ''));
    ok(pw1.nonPos === 0, '§1 수량이 전부 1 이상 (빈 칸 없음)', pw1.nonPos + '칸 이상');
    ok(pw1.mono, '§1 스테이지 패스 무료 칸 곡선이 단조 증가 (단계가 오를수록 커진다)',
      pw1.free0 + ' → ' + pw1.freeLast);
    /* 클램프 자리 — 골드 칸(9자)이 사라져 .ln2/.ln3 을 지웠다. 그 대가로 «7자를 넘으면 빨강» 을 여기 둔다.
       199 가 곡선을 키워 7자를 넘기면 이 항이 빨개진다 = «폭 클램프를 다시 만들라» 는 신호다(396 교훈). */
    ok(pw1.maxTxt.length <= 7, '§1 ★ 최장 표기가 7자 이하 (폭 클램프를 지운 자리를 대신 지킨다)',
      '«' + pw1.maxTxt + '» ' + pw1.maxTxt.length + '자');

    /* 실지급 — 무료 칸 하나 · [일괄 받기] 한 번 */
    const claim = await page.evaluate(async () => {
      S.pass.got = {}; S.pass.prem = {};
      openPass('stage');
      await new Promise(r => setTimeout(r, 120));
      const b = { g: S.gold, d: S.dia, r: S.relic };
      const rw = passRw(3, 0);
      passClaim(3, 0);
      const one = { dg: S.gold - b.g, dd: S.dia - b.d, dr: S.relic - b.r, want: rw.n };
      const b2 = { g: S.gold, d: S.dia, r: S.relic };
      let wantAll = 0, n = 0;
      for (let i = 0; i < PASS_TABS.stage.n; i++) {
        if (S.best < (i + 1) * PASS_TABS.stage.step) break;
        if (!S.pass.got['stage:' + i + ':0']) { wantAll += passRw(i, 0).n; n++; }
      }
      passClaimAll();
      const all = { dg: S.gold - b2.g, dd: S.dia - b2.d, dr: S.relic - b2.r, want: wantAll, n };
      closePass();
      return { one, all };
    });
    ok(claim.one.dd === claim.one.want && claim.one.dg === 0 && claim.one.dr === 0,
      '§1 passClaim — 다이아만 +' + claim.one.want,
      `Δdia ${claim.one.dd} · Δgold ${claim.one.dg} · Δrelic ${claim.one.dr}`);
    ok(claim.all.n > 0 && claim.all.dd === claim.all.want && claim.all.dg === 0 && claim.all.dr === 0,
      '§1 passClaimAll — ' + claim.all.n + '칸이 다이아 합계 +' + claim.all.want + ' 하나로 들어온다',
      `Δdia ${claim.all.dd} · Δgold ${claim.all.dg} · Δrelic ${claim.all.dr}`);

    /* ══ §2 출석(399) — 전 칸이 다이아 하나 ═══════════════════════════════
       513(주인 지시 2026-08-31) — 표가 28칸 → **7칸 무한 순환**이 됐다. 이 절이 묻는 것은
       «칸 수» 가 아니라 «재화 갈래가 하나인가» 이므로 **길이를 표에 묻고**(상수 재박기 금지 · 328 교훈)
       나머지 항은 그대로 둔다. 28일차 5,000 을 보던 «눈금» 항은 순환 최종(7일차) 축으로 갈아 끼웠다. */
    console.log('§2 출석(399·513) — ATTEND 7칸 순환이 다이아 하나');
    const at = await page.evaluate(() => {
      const keys = [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => !['ic', 't'].includes(k))))].sort();
      return {
        n: ATTEND.length, keys,
        dias: ATTEND.map(r => r.dia),
        emoji: ATTEND.filter(r => typeof r.ic === 'string' && !/^</.test(r.ic)).map(r => r.ic),
        labels: [...new Set(ATTEND.map(r => r.t))],
        shown: [...new Set(ATTEND.map(r => atRewards(r).length))],
        total: ATTEND.reduce((s, r) => s + r.dia, 0)
      };
    });
    console.log('  · 한 바퀴(' + at.n + '일) 합계 ' + at.total.toLocaleString() + ' 다이아 (일반 ' + at.dias[1]
      + '…' + at.dias[5] + ' · 순환 최종(7일차) ' + at.dias[6] + ')');
    ok(at.n === 7 && at.keys.join(',') === 'dia', '§2 ATTEND 7칸 순환(513)의 보상 키가 dia 하나뿐 (rel·gold·goldMul·frag 0건)',
      at.n + '칸 · [' + at.keys.join(',') + ']');
    ok(at.dias.every(v => v > 0), '§2 전 칸 수량 > 0 (빈 칸 없음)');
    ok(at.emoji.length === 0, '§2 화폐 자리에 이모지가 없다 — 🔥 폐지(125 규약)',
      at.emoji.join(' ') || '없음');
    ok(at.labels.length === 1 && at.labels[0] === '다이아', '§2 라벨도 한 갈래 «다이아»', at.labels.join(','));
    ok(at.shown.length === 1 && at.shown[0] === 1, '§2 카드 표기 칸이 전부 1칸 (atRewards 한 갈래)',
      '[' + at.shown.join(',') + ']');
    /* 513 — «28일차» 축이 사라져 눈금이 «일반 < 순환 최종» 두 단이 됐다(칸이 없어졌지 강조가 없어진 게 아니다) */
    ok(at.dias[6] > at.dias[5],
      '§2 눈금이 살아 있다 — 일반 < 순환 최종(7일차) (재화가 하나여도 마지막 칸 강조가 남는다)',
      at.dias[5] + ' < ' + at.dias[6]);

    const atPay = await page.evaluate(async () => {
      S.att.n = 9; S.att.date = '';                 /* 513 순환 — 다음 칸 = 9 % 7 = #2 = 3일 차 */
      const want = ATTEND[9 % ATTEND.length].dia, b = { g: S.gold, d: S.dia, r: S.relic };
      claimAttend(null);
      await new Promise(r => setTimeout(r, 60));
      return { want, dg: S.gold - b.g, dd: S.dia - b.d, dr: S.relic - b.r };
    });
    ok(atPay.dd === atPay.want && Math.round(atPay.dg) === 0 && atPay.dr === 0,
      '§2 claimAttend — 다이아만 +' + atPay.want,
      `Δdia ${atPay.dd} · Δgold ${Math.round(atPay.dg)} · Δrelic ${atPay.dr}`);

    /* ══ §3 죽은 분기가 자리를 안 남겼다 ══════════════════════════════════ */
    console.log('§3 죽은 분기 정리');
    const dead = await page.evaluate(() => {
      const g0 = S.gold, out = giveReward({ goldMul: 60 }), dg = S.gold - g0; S.gold = g0;
      return { dg, out, ln: [...document.styleSheets].length };
    });
    ok(dead.dg === 0 && dead.out === '',
      '§3 giveReward 의 goldMul 분기가 죽었다 (399 — 쓰는 표가 0 개였다)',
      'Δgold ' + dead.dg + ' · 표기 «' + dead.out + '»');
    const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(!/\.ps-bx>b\.ln[23]/.test(SRC), '§3 .ln2/.ln3(8자·10자 압축) 짝이 CSS 에서 사라졌다');
    ok(!/\.at-if\.rl\{/.test(SRC), '§3 .at-if.rl(유물조각 보라 프레임) 짝이 CSS 에서 사라졌다');
    /* 남은 .ln1 은 살아 있는 짝이다 — 36 프리미엄 1일차 «30,000» 이 실제로 붙인다 */
    const ln1 = await page.evaluate(async () => {
      openPass('att');
      await new Promise(r => setTimeout(r, 150));
      const n = document.querySelectorAll('#psTk .ps-bx>b.ln1').length;
      const n23 = document.querySelectorAll('#psTk .ps-bx>b.ln2,#psTk .ps-bx>b.ln3').length;
      closePass();
      return { n, n23 };
    });
    ok(ln1.n > 0, '§3 남은 .ln1 은 실제로 붙는 짝이다 (36 프리미엄 «30,000»)', ln1.n + '노드');
    ok(ln1.n23 === 0, '§3 .ln2/.ln3 클래스를 붙이는 코드도 남지 않았다', ln1.n23 + '노드');

    const errs2 = errs.filter(e => !/favicon|net::ERR/i.test(e));
    ok(errs2.length === 0, '§3 콘솔 에러 0건', errs2.slice(0, 2).join(' | ') || '없음');
    await ctx.close();

    /* ══ §R 되돌림 시험 — 골드·유물조각을 되살린 사본은 반드시 빨개진다 ══
     *
     * 539(2026-08-30) — **소스 문자열을 통짜로 들고 있던 사본 편집을 폐기하고 «페이지 주입» 으로 옮겼다.**
     *   옛 방식은 `index.html` 의 세 조각(PASS_CUR 선언 3줄 · passRw 한 줄 · ATTEND 루프 본문 2줄)을
     *   **문자 그대로** 들고 있다가 치환했다. 그래서 그 루프를 만지는 작업이 올 때마다 자가 부패했다 —
     *   498(첫날 환영 다이아)이 `const dia = …` 에 `i === 1 ? ATT_D1_DIA :` 를 끼워 넣자 [전제] 가
     *   `✗ATTEND` 로 빨개졌고(20/21), **§R 본체는 통째로 안 돌았다** = 398·399 가 되돌아가도 못 잡는 상태.
     *   513 이 앵커를 «현재 본문» 으로 갱신해 초록을 되찾았지만 그것은 **같은 부패를 다시 예약**하는 것이다
     *   (499·517 이 같은 루프를 계속 만진다).
     *   ⇒ 이제 파일을 **한 글자도 안 만진다**. 제품을 그대로 띄운 뒤 표(PASS_CUR·ATTEND)를 그 자리에서
     *   399 이전 값으로 되돌려 붓고, **판정은 제품 함수(passRw·won)가 하게** 둔다(368·527 선례).
     *   ⚠ 수식·배수를 베끼지 않는다 — 옛 `PASS_CUR[(i + c) % 3]` 은 «표를 그만큼 돌려 놓고
     *   지금 제품(PASS_CUR[0])을 부르는 것» 과 같은 값이라, 회전만 시키고 계산은 제품에게 맡긴다.
     *   그래서 제품이 표를 안 읽게 바뀌면 [전제] 의 passRw 항이 **초록이 아니라 빨강**으로 답한다. */
    console.log('§R 되돌림 시험 — 옛 3재화를 되살린 사본(페이지 주입)');
    const ctx2 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await ctx2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify({ gold: 1e6, dia: 1000, relic: 100, best: 200 })]);
    const e2 = [];
    const p2 = await open(ctx2, e2);
    const rv = await p2.evaluate(revertMeasure);
    /* [전제] 는 남긴다 — 539 이전에 부패를 유일하게 알려 준 항이 이것이다. 묻는 것만 바뀌었다:
       «소스에서 세 문자열을 찾았나» → «되돌림 주입이 세 축에 실제로 물렸나». */
    const land = [rv.curN === 3, rv.rwReads, rv.atRel];
    ok(land.every(Boolean), '§R [전제] 되돌림 주입이 세 축에 물렸다',
      land.map((f, i) => (f ? '○' : '✗') + ['PASS_CUR', 'passRw', 'ATTEND'][i]).join(' '));
    ok(rv.passKeys.length > 1 && rv.passKeys.includes('gold'),
      '§R 패스 — 되살린 사본은 §1 이 빨개진다(키가 여럿)', '[' + rv.passKeys.join(',') + ']');
    ok(rv.maxTxt.length > 7,
      '§R 패스 — 되살린 사본은 «7자 이하» 항도 빨개진다(골드 칸이 9자다)', '«' + rv.maxTxt + '»');
    ok(rv.atKeys.length > 1 && rv.atKeys.includes('rel'),
      '§R 출석 — 되살린 사본은 §2 가 빨개진다(rel 부활)', '[' + rv.atKeys.join(',') + ']');
    await ctx2.close();
  } finally {
    await browser.close();
  }
  const total = pass + fail;
  console.log(fail ? `\nVERIFY398 ${pass}/${total} FAIL` : `\nVERIFY398 ${pass}/${total} PASS`);
  process.exitCode = fail ? 1 : 0;
})();
