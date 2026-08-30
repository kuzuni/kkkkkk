/* 작업 483 재현 프로브 — «23 훈련 — 스탯을 사도 훈련 경험치(진행바)가 안 오른다»
 *
 *   node tools/probe483.js
 *
 * 338 규칙 — 등재문의 처방을 따르기 전에 **«어느 조건에서 안 오르나» 를 제품에게 직접 묻는다.**
 * 등재문(PROGRESS 483)이 세운 가설 5개를 한 자로 전부 굴린다:
 *   ⓐ 326 누적합 경계 — 구 세이브의 `S.trainStage` 가 `S.lv.*` 보다 앞서 있어
 *      `trainBase()`(= trainCapAt(단계−1)) 가 실제 lv 보다 커서 `trainLvRel` 이 0 에 붙는다.
 *   ⓑ 키 불일치 — `TRAIN_STATS` id ↔ `U[id]`/`S.lv` 키가 갈렸다.
 *   ⓒ 갱신 누락 — 구매는 되는데 진행바가 같은 프레임에 안 따라온다.
 *   ⓓ room 0 — x10/x30/MAX 가 `room` 으로 잘려 실제로 0개 사진다.
 *   ⓔ 단계 ↑ 직후 0 으로 «되돌아간 것처럼» 보이는 정상 동작.
 *
 * ⚠ 이 프로브는 **수리 전 트리에서 ⓐ 가 빨갛게(= 재현) 나오는 것이 정답**이다.
 *    수리 뒤에는 같은 명령이 전부 초록이 된다(§A 의 기대값은 «오른다» 로 적혀 있다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 주인 스크린샷(2026-08-30 23:20)을 글자 그대로 옮긴 «326 이전» 세이브.
   9단계 · 카드 Lv 921 / 983 / 926 — 구 규칙(단계당 스탯 100 고정, cap(9)=900)으로 자란 값이다. */
const OLD_SAVE = {
  gold: 1e30, dia: 1e9, best: 60, trainStage: 9,
  lv: { atk: 921, hp: 983, regen: 926 },
  buyQty: 1, autoBuy: false, a105: 1,
};

async function open(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainProg === 'function');
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 루프를 세워 값이 흔들리지 않게 */
  await page.waitForTimeout(600);
  return { ctx, page };
}
const evOf = (page) => async (fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
};

(async () => {
  const browser = await launch(chromium);

  /* ══════════════════════════════════════════════════════════════════════
     §A ⓐ 326 누적합 경계 — 주인 세이브 그대로
     ══════════════════════════════════════════════════════════════════════ */
  {
    const { ctx, page } = await open(browser, OLD_SAVE);
    const ev = evOf(page);
    console.log('\n' + '='.repeat(72) + '\n  §A ⓐ 326 누적합 경계 — 주인 세이브(9단계 · Lv 921/983/926)\n' + '='.repeat(72));

    blk('A1 로드 직후 — 단계·상한·기저·진행');
    const st = await ev(() => {
      openTrain && openTrain();
      return {
        stage: trainStage(), cap: trainCap(), base: trainBase(),
        lv: TRAIN_STATS.map(id => lv(id)),
        rel: TRAIN_STATS.map(id => trainLvRel(id)),
        prog: trainProg(), max: trainMax(),
        txt: ($('trProg') || {}).textContent,
        fill: ($('trFill') || { style: {} }).style.width,
      };
    });
    if (st.__err) { console.log('  ❌ ' + st.__err); fail++; }
    else {
      console.log('  단계 ' + st.stage + ' · cap ' + st.cap + ' · base ' + st.base);
      console.log('  lv  ' + st.lv.join(' / ') + '   →  rel ' + st.rel.join(' / '));
      console.log('  진행 ' + st.prog + '/' + st.max + '  («' + st.txt + '» · fill ' + st.fill + ')');
      /* 기대값은 «수리 후» 로 적는다 — 수리 전 트리에서는 여기가 빨갛다(= 재현). */
      ok(st.base <= Math.min.apply(null, st.lv),
        'base(' + st.base + ') ≤ 최소 lv(' + Math.min.apply(null, st.lv) + ') — 단계가 레벨보다 앞서 있지 않다');
      /* ⚠ «진행 > 0» 을 묻지 않는다 — 단계 업 직후 0 은 183 규약상 정상이다.
         이 세이브가 이미 산 레벨이 «이번 단계 몫» 안에 들어와 있는지를 묻는다. */
      ok(st.prog > 0 && st.prog < st.max,
        '이미 산 레벨이 이번 단계 눈금 안에 있다 (' + st.prog + '/' + st.max + ')');
    }

    blk('A2 x1 구매 → 진행바가 같은 프레임에 +1  ← 등재문의 완료 조건');
    const buy = await ev(() => {
      S.buyQty = 1;                       /* 골드는 세이브가 들고 온 1e30 그대로 — «살 수 있나» 도 같이 묻는다 */
      const b0 = { prog: trainProg(), lv: lv('atk'), txt: ($('trProg') || {}).textContent, w: $('trFill').style.width };
      trainBuy('atk'); renderTrainLive();
      const b1 = { prog: trainProg(), lv: lv('atk'), txt: ($('trProg') || {}).textContent, w: $('trFill').style.width };
      return { b0, b1 };
    });
    if (buy.__err) { console.log('  ❌ ' + buy.__err); fail++; }
    else {
      console.log('  전 : lv ' + buy.b0.lv + ' · prog ' + buy.b0.prog + ' · «' + buy.b0.txt + '» · ' + buy.b0.w);
      console.log('  후 : lv ' + buy.b1.lv + ' · prog ' + buy.b1.prog + ' · «' + buy.b1.txt + '» · ' + buy.b1.w);
      ok(buy.b1.lv === buy.b0.lv + 1, '레벨은 오른다 (' + buy.b0.lv + ' → ' + buy.b1.lv + ')');
      ok(buy.b1.prog === buy.b0.prog + 1, '진행도 +1 (' + buy.b0.prog + ' → ' + buy.b1.prog + ')');
      ok(buy.b1.txt !== buy.b0.txt, '진행바 «문구» 가 같은 프레임에 바뀐다');
      ok(buy.b1.w !== buy.b0.w, '진행바 «폭» 이 같은 프레임에 바뀐다');
    }

    blk('A3 얼마나 더 사야 1 이 오르나 — 결손의 크기');
    const gap = await ev(() => {
      const need = TRAIN_STATS.map(id => Math.max(0, trainBase() - lv(id)));
      return { need, sum: need.reduce((a, b) => a + b, 0), room: TRAIN_STATS.map(id => trainCap() - lv(id)) };
    });
    if (gap.__err) { console.log('  ❌ ' + gap.__err); fail++; }
    else {
      console.log('  base 까지 남은 레벨 : ' + gap.need.join(' / ') + '  (합 ' + gap.sum + ')');
      console.log('  cap 까지 남은 방(room) : ' + gap.room.join(' / ') + '  ← 구매는 되는데 진행바는 안 움직인다');
      ok(gap.sum === 0, '«진행이 0 에 붙어 있는 구간» 이 0 레벨이다 (지금 ' + gap.sum + ')');
    }

    /* ── A4 등재문 기본안(«레벨을 base 까지 무료로 올림») 을 값으로 기각한다 ──
       338 규칙 — 처방 후보도 «찍힌 값» 으로 고른다. 이 절은 제품을 안 건드리고 곡선만 묻는다. */
    blk('A4 기각 근거 — 「레벨을 base 까지 올리면」 다음 한 레벨의 값');
    const cost = await ev(() => {
      const u = U.atk, at = l => u.cost(l);
      const rows = [308, 921, 983, 1000, 3600, 4500].map(l => ({ l, c: at(l) }));
      return { rows, ratio: at(3600) / at(921), gold: S.gold };
    });
    if (cost.__err) { console.log('  ❌ ' + cost.__err); fail++; }
    else {
      cost.rows.forEach(r => console.log('  Lv ' + String(r.l).padStart(4) + ' → 다음 레벨 ' + r.c.toExponential(3) + ' 골드'));
      console.log('  Lv 921 → 3600 배율 : ×' + cost.ratio.toExponential(3) + '   (세이브 보유 골드 ' + cost.gold.toExponential(3) + ')');
      ok(cost.ratio > 1e30,
        '기본안은 «못 사는 값» 을 만든다 — 진행바가 «0 에 굳음» → «살 수가 없어 안 움직임» 으로 바뀔 뿐');
    }
    await ctx.close();
  }

  /* ══════════════════════════════════════════════════════════════════════
     §B ⓑ 키 불일치 · ⓒ 갱신 누락 · ⓓ room 0 — 새 세이브(정상 경로)
     ══════════════════════════════════════════════════════════════════════ */
  {
    const { ctx, page } = await open(browser, { gold: 1e30, dia: 1e9, best: 60, a105: 1 });
    const ev = evOf(page);
    console.log('\n' + '='.repeat(72) + '\n  §B 새 세이브 — ⓑ 키 · ⓒ 갱신 · ⓓ room\n' + '='.repeat(72));

    blk('B1 ⓑ 키 불일치 — TRAIN_STATS ↔ U[id] ↔ S.lv');
    const keys = await ev(() => ({
      stats: TRAIN_STATS.slice(),
      u: TRAIN_STATS.map(id => !!U[id]),
      uid: TRAIN_STATS.map(id => U[id] && U[id].id),
      lvk: Object.keys(S.lv),
    }));
    if (keys.__err) { console.log('  ❌ ' + keys.__err); fail++; }
    else {
      console.log('  TRAIN_STATS ' + JSON.stringify(keys.stats) + ' · U[id].id ' + JSON.stringify(keys.uid));
      console.log('  S.lv 키 ' + JSON.stringify(keys.lvk));
      ok(keys.u.every(Boolean) && keys.stats.every((s, i) => keys.uid[i] === s),
        'ⓑ 없음 — 세 이름이 한 벌이다(TRAIN_STATS = U[id].id)');
    }

    blk('B2 ⓒ 갱신 — 새 세이브 1단계에서 x1 구매 → 진행 +1(같은 프레임)');
    const c = await ev(() => {
      openTrain && openTrain();
      S.buyQty = 1; S.gold = 1e30;
      const t0 = ($('trProg') || {}).textContent, p0 = trainProg();
      trainBuy('atk'); renderTrainLive();
      return { p0, t0, p1: trainProg(), t1: ($('trProg') || {}).textContent, stage: trainStage(), base: trainBase(), cap: trainCap() };
    });
    if (c.__err) { console.log('  ❌ ' + c.__err); fail++; }
    else {
      console.log('  단계 ' + c.stage + ' · base ' + c.base + ' · cap ' + c.cap + ' : «' + c.t0 + '» → «' + c.t1 + '»');
      ok(c.p1 === c.p0 + 1, 'ⓒ 없음 — 새 세이브에서는 진행 +1 이 같은 프레임에 반영된다');
    }

    blk('B3 ⓓ room — x10 을 cap 근처에서 눌렀을 때');
    const d = await ev(() => {
      S.buyQty = 10; S.gold = 1e30;
      S.lv.atk = trainCap() - 3;                       /* 방 3칸만 남긴다 */
      const bi = trainBuyInfo('atk'), p0 = trainProg();
      trainBuy('atk'); renderTrainLive();
      return { n: bi.n, full: bi.full, p0, p1: trainProg(), lv: lv('atk'), cap: trainCap() };
    });
    if (d.__err) { console.log('  ❌ ' + d.__err); fail++; }
    else {
      console.log('  x10 · room 3 → 실제 구매 ' + d.n + '개 · 진행 ' + d.p0 + ' → ' + d.p1 + ' · lv ' + d.lv + '/' + d.cap);
      ok(d.n === 3 && d.p1 === d.p0 + 3, 'ⓓ 없음 — room 만큼 사지고 진행도 그만큼 오른다');
    }

    blk('B4 ⓔ 단계 ↑ 직후 — 0/새 max 는 «정상»(183 규약)');
    const e = await ev(() => {
      TRAIN_STATS.forEach(id => S.lv[id] = trainCap());
      const before = { prog: trainProg(), max: trainMax(), ready: trainReady(), stage: trainStage() };
      trainUp(); if (typeof closeModal === 'function') closeModal();
      renderTrainLive();
      return { before, after: { prog: trainProg(), max: trainMax(), stage: trainStage() }, txt: ($('trProg') || {}).textContent };
    });
    if (e.__err) { console.log('  ❌ ' + e.__err); fail++; }
    else {
      console.log('  ' + e.before.stage + '단계 ' + e.before.prog + '/' + e.before.max
        + '  →  ' + e.after.stage + '단계 ' + e.after.prog + '/' + e.after.max + ' («' + e.txt + '»)');
      ok(e.after.stage === e.before.stage + 1 && e.after.prog === 0,
        'ⓔ 정상 동작 — 단계 업 직후 정확히 0/새 max (183)');
    }

    blk('B5 홀드(297/349) 경로도 같은 자를 지나나');
    const h = await ev(async () => {
      S.buyQty = 1; S.gold = 1e30;
      const p0 = trainProg();
      const card = document.querySelector('#trw [data-tr="atk"]');
      if (!card) return { no: 1 };
      trHoldStart('atk', card);
      await new Promise(r => setTimeout(r, 900));
      if (typeof trHoldStop === 'function') trHoldStop(false);
      return { p0, p1: trainProg(), txt: ($('trProg') || {}).textContent };
    });
    if (h.__err) { console.log('  ❌ ' + h.__err); fail++; }
    else if (h.no) { console.log('  ❌ 카드 노드를 못 찾았다'); fail++; }
    else {
      console.log('  홀드 0.9초 : 진행 ' + h.p0 + ' → ' + h.p1 + ' («' + h.txt + '»)');
      ok(h.p1 > h.p0 + 1, '홀드 연속 구매도 진행바에 그대로 쌓인다 (Δ' + (h.p1 - h.p0) + ')');
    }
    await ctx.close();
  }

  /* ══════════════════════════════════════════════════════════════════════
     §C 경계 스윕 — «단계 n 인데 lv 가 구 규칙(100n)» 인 세이브 전부
     ══════════════════════════════════════════════════════════════════════ */
  {
    console.log('\n' + '='.repeat(72) + '\n  §C 구 규칙 세이브 스윕 — 단계 2~10\n' + '='.repeat(72));
    const rows = [];
    for (const n of [2, 3, 4, 5, 6, 9, 10]) {
      const oldLv = 100 * n;                      /* 326 이전 규칙에서 «막 n 단계를 뚫은» 레벨 */
      const { ctx, page } = await open(browser, {
        gold: 1e30, dia: 1e9, best: 60, a105: 1, trainStage: n,
        lv: { atk: oldLv, hp: oldLv, regen: oldLv },
      });
      const ev = evOf(page);
      const r = await ev(() => {
        openTrain && openTrain();
        S.buyQty = 1;
        const before = { stage: trainStage(), base: trainBase(), cap: trainCap(), lv: lv('atk'),
                         prog: trainProg(), max: trainMax() };
        trainBuy('atk'); renderTrainLive();
        return Object.assign(before, { lv2: lv('atk'), prog2: trainProg(), txt: ($('trProg') || {}).textContent });
      });
      if (r.__err) { console.log('  ❌ 단계 ' + n + ' : ' + r.__err); fail++; }
      else {
        rows.push(Object.assign(r, { old: n, oldLv }));
        console.log('  구 단계 ' + String(n).padStart(2) + ' lv ' + String(oldLv).padStart(4)
          + ' → 단계 ' + String(r.stage).padStart(2)
          + ' · base ' + String(r.base).padStart(4) + ' cap ' + String(r.cap).padStart(4)
          + ' · 진행 ' + r.prog + '/' + r.max
          + '  ─구매→ ' + r.prog2 + '/' + r.max + ' («' + r.txt + '»)');
      }
      await ctx.close();
    }
    blk('C1 스윕 판정 — 구매 한 번에 진행이 오르나(완료 조건)');
    const stuck = rows.filter(r => !(r.lv2 === r.lv + 1 && r.prog2 === r.prog + 1));
    console.log('  구매해도 진행이 안 오르는 단계 : ' + (stuck.length ? stuck.map(r => r.old).join(', ') : '없음'));
    ok(stuck.length === 0, '구 규칙 세이브 어느 단계에서도 «사도 안 오름» 이 없다 (지금 ' + stuck.length + '개)');
    blk('C2 단계는 «내리기만» 한다 — 이관이 단계를 선물하지 않는다');
    const up = rows.filter(r => r.stage > r.old);
    ok(up.length === 0, '이관 뒤 단계가 올라간 세이브 0건 (지금 ' + up.length + '건)');
  }

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('PROBE483 ' + (fail ? 'FAIL — ' + fail + '건' : 'PASS') + '  (' + pass + '/' + (pass + fail) + ')');
  console.log('='.repeat(72));
  process.exit(fail ? 1 : 0);
})();
