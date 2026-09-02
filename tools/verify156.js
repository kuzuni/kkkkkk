/* 작업 156 — «보상 표기 ≠ 실지급 ≠ 이펙트» 회귀 게이트.
 *   node tools/verify156.js
 *
 * 등재된 버그: 22 반복 퀘스트 행(`qrow`)은 다이아 배지 하나만 그리는데 `claimQuest` 가
 * `S.gold += rw.g` 로 골드까지 줬다. 58 연출은 «실제로 늘어난 재화» 를 정직하게 쏘므로
 * (fxWatch → fxAcc → fxFly) 다이아만 적힌 보상에서 골드 코인이 같이 날아갔다.
 * 주인 지시(2026-08-27): **이펙트를 숨기는 게 아니라 골드 지급 자체를 없앤다** — 표기·지급·이펙트 3자 일치.
 *
 * 그래서 이 게이트는 세 겹으로 본다:
 *   [A] 표(정적)   — QUESTS[].rw 가 다이아(c) 전용인가. 골드 키(g/gold/goldMul)가 되살아나면 FAIL.
 *   [B] 지급(동기) — claim* 호출 «직전/직후» 를 같은 tick 에서 재서 ΔS.gold 가 정확히 0 인가.
 *                    (자동 전투가 매 프레임 골드를 넣으므로 «await 없이» 재는 것이 핵심이다)
 *   [C] 이펙트     — fxFly 가 실제로 어떤 재화를 쐈는가. 전투를 `step` 스텁으로 얼려 UI 발만 남긴 뒤
 *                    진짜 클릭 경로(버튼 탭)로 확인한다. 다이아 1종만 나와야 한다.
 *
 * 함께 보는 것: 표기와 지급이 «둘 다 여러 재화» 인 정직한 경로(출석 7일차 = 다이아+유물+골드)는
 * 그대로 3종이 나와야 한다 — 골드를 무조건 죽이는 과교정이 아님을 [D] 로 못 박는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0; const fails = [];
const ok   = (m) => { pass++; console.log('  ok   ' + m); };
const fail = (m) => { fails.push(m); console.log('  FAIL ' + m); };
const eq   = (label, got, want) => (got === want ? ok(`${label} = ${got}`)
                                                : fail(`${label} = ${got} — 기대 ${want}`));

/* 퀘스트 5종이 전부 «수령 가능» 한 세이브 */
const SAVE = { totalKills: 100000, best: 300, summons: 5000, upgrades: 30000, gold: 5e7, dia: 12000 };

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  try {
    const { ctx, page, errs } = await open(browser);

    /* ---- [A] 보상표가 다이아 전용인가 ---- */
    console.log('[A] QUESTS 보상표 — 다이아 전용');
    /* ⚑ 799 이관 — 보상이 «단계 함수 `rw(s)`» 에서 **정액 `dia`** 로 바뀌었다(등차 목표에서는
       칸마다 난도 증분이 같으니 보상도 같다). 156 이 지키는 성질은 그대로다 — «표에 골드 키가
       없다 · 행 배지가 읽는 값이 수다». 재는 자리만 옮긴다(333 처방). */
    const tbl = await page.evaluate(() => QUESTS.map(q => ({
      id: q.id, keys: Object.keys(q).filter(k => /^(g|gold|goldMul|rw)$/.test(k)).sort(),
      c0: questRw(q) })));
    tbl.forEach(q => {
      const gold = q.keys.filter(k => /^(g|gold|goldMul)$/.test(k));
      if (gold.length) fail(`QUESTS.${q.id} 에 골드 키 ${JSON.stringify(gold)} 가 남아 있다`);
      else ok(`QUESTS.${q.id} 보상 키에 골드가 없다 (다이아 ${q.c0})`);
    });
    /* 행 표기(qrow)가 읽는 것은 rw().c 다 — 값이 유한하지 않으면 배지가 NaN 이 된다 */
    tbl.forEach(q => Number.isFinite(q.c0) ? pass++
      : fail(`QUESTS.${q.id} 의 행 배지 값(questRw)이 수가 아니다: ${q.c0}`));

    /* ---- [B] 지급 — 같은 tick 안에서 Δ 를 잰다 ---- */
    console.log('[B] 수령 지급 — ΔS.gold 가 0 인가 (동기 측정)');
    const claim = await page.evaluate(() => {
      const out = {};
      /* 그때까지 쌓인 전투 골드를 먼저 흘려보내 fxSeen 을 «지금» 에 맞춘다 */
      fxFlush(); fxWatch(performance.now());
      const shot = (fn) => {
        const g0 = S.gold, d0 = S.dia;
        fn();
        return { dg: S.gold - g0, dd: S.dia - d0 };
      };
      const q = QUESTS.find(x => x.id === 'summon');
      /* 799 이관 — 보상이 «단계 함수 rw(s)» 에서 «정액 × 밀린 칸» 으로 바뀌었다. 행 배지가 읽는
         것과 **같은 함수**(`questRw`)를 쓴다 — 156 이 지키는 성질이 «표기 = 지급» 이라 여기서
         다른 식을 손으로 적으면 그 성질을 재는 것이 아니라 내가 적은 식을 재게 된다. */
      out.want1 = Math.round(questRw(q));
      out.one   = shot(() => claimQuest(q));
      out.all   = shot(() => claimAllQuests());                 /* 남은 반복 + 일일 전부 */
      const dq = DQUESTS.find(x => !S.daily.q[x.id]);
      out.daily = dq ? shot(() => claimDQuest(dq)) : null;
      return out;
    });
    eq('claimQuest ΔS.gold', claim.one.dg, 0);
    eq('claimQuest ΔS.dia', claim.one.dd, claim.want1);
    eq('claimAllQuests ΔS.gold', claim.all.dg, 0);
    claim.all.dd > 0 ? ok(`claimAllQuests ΔS.dia = ${claim.all.dd} (> 0)`)
                     : fail(`claimAllQuests ΔS.dia = ${claim.all.dd} — 아무것도 안 줬다`);
    if (claim.daily) eq('claimDQuest ΔS.gold', claim.daily.dg, 0);
    await ctx.close();

    /* ---- [C] 이펙트 — 진짜 클릭 경로에서 어떤 재화가 날아가는가 ---- */
    console.log('[C] 이펙트 — 퀘스트 [보상 받기] 탭 시 fxFly 재화');
    const c = await open(browser);
    const fxRec = await c.page.evaluate(async () => {
      window.step = () => {};                       /* 전투 정지 — UI 발 연출만 남긴다 */
      await new Promise(r => setTimeout(r, 120));
      fxFlush(); fxWatch(performance.now());        /* 얼리기 전에 쌓인 전투 골드를 배출 */
      const rec = [];
      const orig = window.fxFly;
      window.fxFly = (from, cur, n) => { rec.push({ cur, n }); return orig(from, cur, n); };
      document.querySelector('.side .ibtn[data-pop="quest"]').click();
      await new Promise(r => setTimeout(r, 500));
      const btn = document.querySelector('#mbox .qs-b:not([disabled])');
      const badge = btn ? btn.closest('.qs-r').querySelector('.qs-i .ifq').textContent : null;
      if (btn) btn.click();
      await new Promise(r => setTimeout(r, 1800));
      window.fxFly = orig;
      return { rec, badge, has: !!btn };
    });
    if (!fxRec.has) fail('[C] 수령 가능한 퀘스트 행이 없다 — 세이브를 확인할 것');
    else {
      const curs = [...new Set(fxRec.rec.map(r => r.cur))].sort();
      eq('fxFly 재화 종류', JSON.stringify(curs), JSON.stringify(['dia']));
      const dia = fxRec.rec.filter(r => r.cur === 'dia').reduce((s, r) => s + r.n, 0);
      const want = Number(String(fxRec.badge).replace(/[^0-9]/g, ''));
      eq('날아간 다이아 = 행 배지 표기', dia, want);
    }
    await c.ctx.close();

    /* ---- [D] 과교정 방지 — 여러 재화를 «표기대로» 주는 경로는 그대로 여러 재화 ----
       399(2026-08-29): 옛 표본은 «출석 7일차(다이아+유물조각+골드)» 였는데 주인 지시로 출석 28칸이
       **전부 다이아**가 돼 다재화 표본으로서 죽었다. 자리를 비우지 않고(333 처방) **살아 있는 다재화
       경로**로 갈아 끼운다 — 아레나 승리 보상 `arenaReward(true)` = 골드 + 다이아 + 강화석 3종.
       ⚠ 비행(fxFly)은 `FXCUR` 에 알약이 있는 **골드·다이아 둘뿐**이다(강화석은 HUD 알약이 없다) —
       «표기 3 = 이펙트 3» 이 아니라 «표기한 재화는 하나도 빠짐없이 지급되고, 알약이 있는 것은 전부 난다» 가
       이 절이 지키는 성질이다. */
    console.log('[D] 아레나 승리 보상 — 표기 3종이면 3종 다 지급 (과교정 아님)');
    const d = await open(browser);
    const arRec = await d.page.evaluate(async () => {
      window.step = () => {};
      await new Promise(r => setTimeout(r, 120));
      fxFlush(); fxWatch(performance.now());
      const rec = [];
      const orig = window.fxFly;
      window.fxFly = (from, cur, n) => { rec.push(cur); return orig(from, cur, n); };
      const rw = arenaReward(true);
      const g0 = S.gold, d0 = S.dia, s0 = S.stone;
      const txt = giveReward(rw);                    /* 아레나 결과 토스트가 그대로 쓰는 표기다 */
      const paid = { dg: S.gold - g0, dd: S.dia - d0, ds: S.stone - s0 };
      /* 512 이관 — «지났다» 와 «실제로 날았다» 는 다른 사건이다. 뜬 비행 노드를 재화별로 센다. */
      const flew = new Set();
      for (let i = 0; i < 40; i++) {
        await new Promise(r => requestAnimationFrame(() => r()));
        fxFlies.forEach(f => flew.add(f.cur));
      }
      await new Promise(r => setTimeout(r, 1200));
      window.fxFly = orig;
      return { rec: [...new Set(rec)].sort(), flew: [...flew].sort(), shown: txt.split(' · ').length,
               keys: Object.keys(rw).sort(), paid, want: rw };
    });
    eq('아레나 승리 보상 표기 조각 수', arRec.shown, 3);
    eq('아레나 승리 보상 재화 3종', JSON.stringify(arRec.keys), JSON.stringify(['dia', 'gold', 'stone']));
    arRec.paid.dg > 0 && arRec.paid.dd === arRec.want.dia && arRec.paid.ds === arRec.want.stone
      ? ok(`아레나 승리 — 표기 3종이 전부 지급됐다 (골드 +${Math.round(arRec.paid.dg)} · 다이아 +${arRec.paid.dd} · 강화석 +${arRec.paid.ds})`)
      : fail(`아레나 승리 지급이 표기와 어긋난다 — Δgold ${Math.round(arRec.paid.dg)} · Δdia ${arRec.paid.dd}(기대 ${arRec.want.dia}) · Δstone ${arRec.paid.ds}(기대 ${arRec.want.stone})`);
    /* ⚑ 512 이관 — 표가 전 재화로 넓어지면서 강화석도 `fxFly` 를 **지나게** 됐다(종전에는 `FXCUR` 에
       없어서 `fxWatch` 가 아예 안 봤다). 항을 «둘» 에서 «셋» 으로 눌러 초록으로 만들면 이 절이 지키던
       성질(«알약이 있는 것만 난다»)이 통째로 사라지므로, 328~330 처방대로 **묻는 항을 하나 더 세운다** —
       ⓐ 표기한 재화는 하나도 빠짐없이 연출 경로를 지난다 · ⓑ 실제로 «나는» 것은 알약이 있는 둘뿐이다
       (강화석은 도착지가 없어 512 ③ 대로 버스트 + `+n` 까지만). */
    eq('아레나 승리 — 표기 3종이 전부 fxFly 를 지난다(512)', JSON.stringify(arRec.rec), JSON.stringify(['dia', 'gold', 'stone']));
    eq('아레나 승리 — 실제로 «나는» 것은 알약이 있는 둘뿐', JSON.stringify(arRec.flew), JSON.stringify(['dia', 'gold']));

    /* ---- [E] 399 — 출석은 이제 «한 재화» 쪽 표본이다(표기 1 = 지급 1 = 이펙트 1) ---- */
    console.log('[E] 출석 7일차 — 표기 1종이면 지급·이펙트도 1종 (399)');
    const atRec = await d.page.evaluate(async () => {
      window.step = () => {};
      fxFlush(); fxWatch(performance.now());
      const rec = [];
      const orig = window.fxFly;
      window.fxFly = (from, cur, n) => { rec.push(cur); return orig(from, cur, n); };
      S.att.n = 6; S.att.date = '';                 /* 다음 칸 = 7일차 */
      const shown = atRewards(ATTEND[6]).length, want = ATTEND[6].dia;
      const g0 = S.gold, d0 = S.dia, r0 = S.relic;
      claimAttend(null);
      const paid = { dg: S.gold - g0, dd: S.dia - d0, dr: S.relic - r0 };
      await new Promise(r => setTimeout(r, 1500));
      window.fxFly = orig;
      return { rec: [...new Set(rec)].sort(), shown, want, paid };
    });
    eq('출석 7일차 카드 표기 칸 수', atRec.shown, 1);
    eq('출석 7일차 ΔS.dia = 표기대로', atRec.paid.dd, atRec.want);
    atRec.paid.dr === 0 && Math.round(atRec.paid.dg) === 0
      ? ok('출석 7일차 — 유물조각·골드는 한 톨도 안 준다(399)')
      : fail(`출석 7일차가 다이아 말고 다른 것을 줬다 — Δrel ${atRec.paid.dr} · Δgold ${Math.round(atRec.paid.dg)}`);
    eq('출석 7일차 fxFly 재화', JSON.stringify(atRec.rec), JSON.stringify(['dia']));

    const dErrs = d.errs.filter(e => !/favicon|net::ERR/i.test(e));
    eq('콘솔 에러', dErrs.length, 0);
    if (dErrs.length) dErrs.slice(0, 3).forEach(e => console.log('       ' + e));
    await d.ctx.close();

    const total = pass + fails.length;
    console.log(fails.length ? `\nVERIFY156 ${pass}/${total} FAIL` : `\nVERIFY156 ${pass}/${total} PASS`);
    process.exitCode = fails.length ? 1 : 0;
  } finally {
    await browser.close();
  }
})();
