#!/usr/bin/env node
/* 작업 512 — 「보상 연출이 «받은 재화» 를 안 따라간다」 **재현**(338 규칙 — 처방 전에 먼저 묻는다).
 *
 *   node tools/probe512.js
 *
 * 등재문의 주장은 셋이다. 이 프로브는 셋을 각각 **따로** 잰다 —
 *   [A] 표 — `FXCUR` 키가 몇 개인가, `CUR_ICON`(재화 아이콘 표) 대비 무엇이 빠져 있는가(정적).
 *   [B] 색 — `giveReward` 를 지나는 보상에서 실제로 **찍힌 버스트 색**(`--c`)이 무엇인가.
 *          «룰렛은 155 이후 전 칸 dia» 이므로 dia 색이어야 하는데 상수 크림이면 등재문 확인.
 *   [C] 0건 — 유물조각·강화석·룬강화석·단련석·마일리지를 실제로 지급하면 연출 노드가 몇 개 뜨는가.
 *          (fly = 비행 코인 · plus = `+n` 플로터 · spark = 버스트)
 *   [D] 실경로 — 룰렛 [돌리기] 를 진짜로 눌러 `roulFinish` 까지 간 뒤의 버스트 색(181 규약 자리).
 *
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(338·344 규칙).
 *
 * ── 1회차(수리 전) 실측 — 등재문이 그대로 확인됐다 ─────────────────────────
 *   [A] FXCUR 2종(gold·dia) ↔ CUR_ICON 비티켓 7종 ⇒ relic·stone·rstone·tstone·mile 이 표 밖
 *   [B] dia 500 · gold 50000 · 룰렛 실경로 — 버스트가 전부 **#FFE9A8**(상수 크림) 하나
 *   [C] relic/stone/rstone/tstone/mileage — fly 0 · +n 0 (버스트만, 그것도 크림)
 *   ⚠ 1회차 첫 실행은 **배경 전투 골드**가 섞여 relic 씬에 fly 4·«+4.1» 이 찍혔다.
 *      `window.step = () => {}` 로 전투만 멈춘 뒤 값이 위처럼 깨끗해졌다 —
 *      «내가 지급한 재화의 연출» 을 재려면 그 한 줄이 필요하다.
 *   아래 판정은 **수리 후 기대치**다(1회차 값은 각 줄 꼬리에 적어 뒀다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };

(async () => {
  /* ── [A] 정적 — 표 두 벌의 어긋남 ──────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  const fxcurBlk = (src.match(/const FXCUR = \{[\s\S]*?\n\};/) || [''])[0];
  const fxcurKeys = [...fxcurBlk.matchAll(/^\s{2}(\w+)\s*:?\s*\{/gm)].map(m => m[1]);
  const curIconBlk = (src.match(/const CUR_ICON = \{[\s\S]*?\n\};/) || [''])[0];
  const curIconKeys = [...curIconBlk.matchAll(/^\s{2}(\w+)\s*:/gm)].map(m => m[1]);
  const nonTicket = curIconKeys.filter(k => !/^tk/.test(k));
  console.log('\n=== [A] 표 ===');
  console.log('  FXCUR 키      : ' + fxcurKeys.join(', ') + '  (' + fxcurKeys.length + ')');
  console.log('  CUR_ICON 비티켓: ' + nonTicket.join(', ') + '  (' + nonTicket.length + ')');
  console.log('  FXCUR 에 없는 재화: ' + nonTicket.filter(k => !fxcurKeys.includes(k)).join(', '));
  /* 연출 색 리터럴 — fxBurst/fxReward 호출부에 직접 박힌 #RRGGBB */
  const litLines = src.split('\n').map((l, i) => ({ n: i + 1, l }))
    .filter(o => /fx(Burst|Reward)\s*\(/.test(o.l) && /#[0-9A-Fa-f]{6}/.test(o.l) && !/^\s*[*/]/.test(o.l));
  console.log('  연출 색 리터럴 자리: ' + (litLines.length ? litLines.map(o => o.n).join(', ') : '없음'));
  litLines.forEach(o => console.log('      ' + o.n + ': ' + o.l.trim().slice(0, 90)));

  /* ── 브라우저 ──────────────────────────────────────────────────── */
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof giveReward === 'function');
  await p.waitForTimeout(900);

  const r = await p.evaluate(async () => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    const wait = async n => { for (let i = 0; i < n; i++) await raf(); };
    /* ⚠ 배경 전투가 돌면 킬 골드가 매 프레임 들어와 «내가 지급한 재화» 의 연출과 섞인다
       (1회차에 실제로 그랬다 — relic 씬에 fly 4·+n «+4.1» 이 찍혔는데 전부 배경 골드였다).
       전투만 멈추고 fxTick(연출 루프)은 그대로 돌린다. */
    window.step = () => {};
    await wait(30);

    /* 연출 노드는 fxTick 이 금방 지우므로 «생성 순간» 에 잡는다(probe518 방식) */
    const seen = [];
    const mo = new MutationObserver(recs => {
      for (const rec of recs) for (const n of rec.addedNodes) {
        if (n.nodeType !== 1 || !n.classList) continue;
        const c = n.className || '';
        if (/fx-(fly|spark|plus|lit)/.test(c)) {
          seen.push({ cls: c, col: n.style.getPropertyValue('--c') || n.style.color || '', tx: n.textContent || '' });
        }
      }
    });
    const arm = () => { seen.length = 0; mo.observe(document.body, { childList: true, subtree: true }); };
    const disarm = () => { mo.disconnect(); return seen.slice(); };
    const tally = got => ({
      fly: got.filter(g => /fx-fly/.test(g.cls)).length,
      spark: got.filter(g => /fx-spark/.test(g.cls)).length,
      plus: got.filter(g => /fx-plus/.test(g.cls)).length,
      sparkCols: [...new Set(got.filter(g => /fx-spark/.test(g.cls)).map(g => g.col.trim()))],
      plusCols: [...new Set(got.filter(g => /fx-plus/.test(g.cls)).map(g => g.col.trim()))],
      plusTx: [...new Set(got.filter(g => /fx-plus/.test(g.cls)).map(g => g.tx.trim()))]
    });
    const clear = () => document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());

    const out = { scenes: [], fxcur: Object.keys(FXCUR), cols: {} };
    for (const k in FXCUR) out.cols[k] = FXCUR[k].col;

    /* ── [B]·[C] 재화별 지급 씬 — 전부 `giveReward` 한 경로 ──────── */
    const scene = async (label, rew, extra) => {
      clear(); await wait(3);
      /* 발원은 화면 한복판 고정(좌표 발원이면 fxSrc 경합이 없다) */
      if (typeof fxAt === 'function') fxAt({ x: 540, y: 1200 });
      arm();
      if (rew) giveReward(rew);
      if (extra) extra();
      await wait(30);
      const got = disarm();
      return Object.assign({ label }, tally(got));
    };

    out.scenes.push(await scene('dia 500 (룰렛 칸과 같은 보상)', { dia: 500 }));
    out.scenes.push(await scene('gold 50000', { gold: 50000 }));
    out.scenes.push(await scene('relic 5 (유물조각)', { rel: 5 }));
    out.scenes.push(await scene('stone 5 (강화석)', { stone: 5 }));
    out.scenes.push(await scene('rstone 5 (룬강화석)', { rstone: 5 }));
    out.scenes.push(await scene('tstone 5 (단련석)', { tstone: 5 }));
    out.scenes.push(await scene('mileage 5 (마일리지)', null, () => { S.mileage = (S.mileage || 0) + 5; }));
    out.scenes.push(await scene('gold+dia 동시', { gold: 10000, dia: 100 }));

    /* ── [D] 실경로 — 룰렛을 진짜로 돌린다(181 지급 자리) ─────────── */
    out.roul = await (async () => {
      if (typeof openRoulette !== 'function' || typeof roulFinish !== 'function') return null;
      openRoulette(); await wait(5);
      const idx = ROULETTE.findIndex(x => x && x.dia);
      clear(); await wait(2);
      arm();
      roulFinish(idx < 0 ? 0 : idx);
      await wait(30);
      const got = disarm();
      return Object.assign({ idx, seg: JSON.stringify(ROULETTE[idx < 0 ? 0 : idx]) }, tally(got));
    })();

    /* 표 두 벌 — 알약(도착지) 실측 */
    out.pills = {};
    for (const k in FXCUR) {
      const C = FXCUR[k];
      const byPill = C.pill ? !!document.querySelector(C.pill) : false;
      out.pills[k] = { pill: C.pill || null, exists: byPill, pcb: C.pcb || null };
    }
    return out;
  });

  console.log('\n=== [B]·[C] 재화별 «지급 → 연출» ===');
  console.log('  FXCUR 색: ' + JSON.stringify(r.cols));
  r.scenes.forEach(s => {
    console.log('  · ' + s.label.padEnd(28) + ' fly ' + String(s.fly).padStart(2)
      + ' · spark ' + String(s.spark).padStart(2) + ' · +n ' + String(s.plus).padStart(2)
      + '  spark색 ' + (s.sparkCols.join('/') || '—') + '  +n색 ' + (s.plusCols.join('/') || '—')
      + (s.plusTx.length ? '  ' + s.plusTx.join('/') : ''));
  });
  if (r.roul) {
    console.log('\n=== [D] 룰렛 실경로(roulFinish) ===');
    console.log('  칸 ' + r.roul.idx + ' ' + r.roul.seg);
    console.log('  fly ' + r.roul.fly + ' · spark ' + r.roul.spark + ' · +n ' + r.roul.plus
      + '  spark색 ' + (r.roul.sparkCols.join('/') || '—') + '  +n색 ' + (r.roul.plusCols.join('/') || '—'));
  }

  console.log('\n=== 판정 ===');
  const dia = r.scenes.find(s => /^dia/.test(s.label));
  const gold = r.scenes.find(s => /^gold 5/.test(s.label));
  const diaCol = (r.cols.dia || '').toLowerCase();
  const goldCol = (r.cols.gold || '').toLowerCase();
  const has = (s, c) => !!(s && s.sparkCols.some(x => x.toLowerCase() === c));
  ok(r.fxcur.length === 7, '[A] FXCUR 가 전 재화 7종을 담는다(1회차: 2종)', r.fxcur.join('/'));
  ok(has(dia, diaCol) && !dia.sparkCols.some(c => c.toLowerCase() === goldCol),
    '[B] dia 보상 버스트가 dia 색이고 금색이 안 섞인다(1회차: #FFE9A8 하나)', dia && dia.sparkCols.join('/'));
  ok(has(gold, goldCol), '[B] gold 보상 버스트는 골드 색', gold && gold.sparkCols.join('/'));
  [['relic 5', 'relic'], ['stone 5', 'stone'], ['rstone 5', 'rstone'],
   ['tstone 5', 'tstone'], ['mileage 5', 'mile']].forEach(([nm, k]) => {
    const s = r.scenes.find(x => x.label.indexOf(nm) === 0), col = (r.cols[k] || '').toLowerCase();
    ok(s && s.fly === 0 && s.plus === 1 && has(s, col),
      '[C] ' + nm + ' — 알약이 없으니 비행 0 · 버스트+`+n` 은 제 색으로(1회차: 셋 다 0건)',
      s ? 'fly ' + s.fly + ' · +n ' + s.plus + ' · ' + s.sparkCols.join('/') : '씬 없음');
  });
  const both = r.scenes.find(s => /동시/.test(s.label));
  ok(both && has(both, diaCol) && has(both, goldCol),
    '[C] 두 재화 동시 지급은 색을 섞지 않고 묶음을 나눈다', both && both.sparkCols.join('/'));
  if (r.roul) ok(r.roul.sparkCols.some(c => c.toLowerCase() === diaCol) && r.roul.fly > 0,
    '[D] 룰렛 실경로(roulFinish)도 dia 색(1회차: #FFE9A8)', r.roul.sparkCols.join('/'));
  ok(errs.length === 0, '콘솔 오류 0건', errs.slice(0, 3).join(' | '));

  console.log('\n' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
