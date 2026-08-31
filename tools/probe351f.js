#!/usr/bin/env node
/* 351 F축 — «묻는 시점» 감사 (15회차 신설, 2026-08-30)
 *
 * ─ 왜 이 자가 있나 ────────────────────────────────────────────────────────────
 * 351 루프는 **같은 사고를 다섯 번** 냈다 — 자가 어떤 화면을 «한 번도 연 적이 없는데»
 * 조용히 «결함 없음» 으로 읽혔다:
 *
 *   | 회차 | 놓친 화면 | 뿌리 |
 *   |---|---|---|
 *   |  8 | `shopcat:*` 3화면      | `drive()` 에 갈래가 없었다            → `OPENER_KEYS` 로 막았다 |
 *   | 10 | `cur:relic`            | 대상이 호스트 밖이라 상자가 0×0        → `drive()` 가 호스트를 찾는다 |
 *   | 12 | `ptab:box`·`tower2`    | 손으로 적은 표가 제품에 뒤처졌다        → 제품에게 묻는다 |
 *   | 13 | `colltab:*` 6화면      | 문(`[data-opencoll]`)이 죽은 셀렉터    → 살아 있는 문 + 0개면 throw |
 *   | 14 | `eqslot:*` 3화면       | **셀렉터도 갈래도 살아 있는데 «호스트를 열기 전» 에 물었다** |
 *
 * 앞 넷은 «무엇을 묻는가» 의 사고라 각자 처방이 섰다. **14회차 것만 성질이 다르다** —
 * 물음도 갈래도 멀쩡했고 틀린 것은 **시점**이었다(`#eqCards` 는 08 영웅 시트를 열어야
 * 채워지는 빈 그릇이라 부팅 직후엔 언제나 `[]`). 14회차는 그 한 줄을 고쳤지만
 * «그런 그릇이 또 있는가» 를 세는 축은 없다고 적어 넘겼다. 이 자가 그 축이다.
 *
 * ─ 무엇을 재나 ───────────────────────────────────────────────────────────────
 * `probe351lib.ASK_GROUPS` 의 질문마다 **답을 두 번 센다**:
 *   ① 부팅 직후(자가 실제로 묻는 시점)  ② 호스트를 하나씩 연 뒤
 * ②가 ①보다 많으면 그 질문은 **«늦게 물어야 하는데 일찍 묻고 있다»** 는 뜻이고,
 * 늘어난 값들이 곧 «자가 한 번도 만든 적 없는 오프너» 다.
 *
 * ⚠ 목록을 여기 옮겨 적지 않는다 — 선택자는 `probe351lib` 의 `ASK_GROUPS` 한 곳에만 있고
 *    수집(`collectOpeners`)과 이 감사가 **같은 문자열**을 읽는다. 따로 적는 순간
 *    385 «자매 자 드리프트» 이자 402 «표는 손으로 적는 목록이라 뒤처진다» 가 된다.
 * ⚠ 이미 «늦게 묻도록» 고쳐 둔 질문(`askedAfter` 가 적힌 것)은 늘어나는 것이 **정상**이다 —
 *    오히려 안 늘어나면 그 처방이 무의미해졌다는 뜻이라 그것도 같이 찍는다.
 *
 * ─ 실행 ──────────────────────────────────────────────────────────────────────
 *   node tools/probe351f.js            (종료 코드 0 = 새는 질문 없음 · 2 = 있음)
 *   node tools/probe351f.js --json docs/review/351-r15-F.json
 *   node tools/probe351f.js --selftest (되돌림 시험 — `eqslot` 의 `askedAfter` 를 무시하고
 *                                       부팅 직후에만 세어, 14회차의 사고가 재현되는지 본다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const lib = require('./probe351lib');

const JSON_OUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
const SELFTEST = process.argv.includes('--selftest');

/* 호스트 = «누르면 화면이 갈리는 최상위 진입점». 이 목록도 제품에게 묻는다(표를 안 적는다).
   ⚑ 19회차(2026-08-31) — **한 칸짜리 호스트만 열면 두 칸 뒤의 질문은 영원히 «안 늘어난다».**
   `costab`(`#bCos [data-costab]`)이 그랬다: 진입이 «영웅 탭 → 시트 안 코스튬 탭» 2단계라
   아래 세 계열을 한 번씩 눌러 봐야 0 이고, 그래서 이 자는 그것을 «처방이 무의미해졌다»(dead)로
   찍었다 — 실제로는 **감사가 그 자리에 닿지 못한 것**이다. 그러면 14회차의 사고(늦게 물어야 하는데
   일찍 묻는다)가 2단계 자리에서 나면 이 자가 못 본다 = 이 자 자신이 여섯 번째 사고의 사각이 된다.
   ⇒ 목록을 손으로 늘리지 않는다(402) — **`ASK_GROUPS` 가 이미 자기 진입 경로를 `askedAfter` 에
      선언해 두었으므로 그것을 그대로 호스트로 읽는다**(선언이 곧 출처 · 385 드리프트 0). */
async function hosts(page) {
  const out = [];
  const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t)).catch(() => []);
  tabs.forEach((t) => out.push({ label: 'tab:' + t, steps: [`.tab[data-t="${t}"]`] }));
  const pops = await page.$$eval('.side .ibtn[data-pop]', (els) => els.map((e) => e.dataset.pop)).catch(() => []);
  pops.forEach((p) => out.push({ label: 'side:' + p, steps: [`.side .ibtn[data-pop="${p}"]`] }));
  if (await page.$('#menub')) out.push({ label: 'menu', steps: ['#menub'] });
  const seen = new Set(out.map((h) => h.steps.join(' → ')));
  for (const g of lib.ASK_GROUPS) {
    if (!g.askedAfter) continue;
    const steps = g.askedAfter.split('→').map((s) => s.trim()).filter(Boolean);
    const sig = steps.join(' → ');
    if (!steps.length || seen.has(sig)) continue;
    seen.add(sig);
    out.push({ label: 'askedAfter:' + g.key, steps });
  }
  return out;
}

async function countAll(page) {
  return page.evaluate((groups) => {
    const o = {};
    for (const g of groups) {
      let vals = [];
      try {
        vals = [...document.querySelectorAll(g.sel)]
          .map((e) => e.getAttribute('data-' + g.attr))
          .filter((v) => v != null);
      } catch (_) { vals = []; }
      o[g.key] = [...new Set(vals)].sort();
    }
    return o;
  }, groups());
}

function groups() {
  return lib.ASK_GROUPS.map((g) => ({ key: g.key, sel: g.sel, attr: g.attr }));
}

(async () => {
  const b = await launch(chromium);
  const { ctx, page } = await lib.fresh(b, ...lib.TALL);

  const boot = await countAll(page);
  const HS = await hosts(page);
  await ctx.close();

  /* 호스트마다 새 문맥에서 연다 — 앞 호스트가 연 화면이 다음 답에 섞이면 그 자체가
     14회차의 뿌리(«앞 질문이 뒤 질문의 화면을 바꾼다»)를 자가 다시 저지르는 것이다. */
  const best = {};           /* key → { n, vals, host } */
  for (const g of lib.ASK_GROUPS) best[g.key] = { n: boot[g.key].length, vals: boot[g.key], host: '(부팅 직후)' };

  for (const h of HS) {
    const { ctx: c2, page: p2 } = await lib.fresh(b, ...lib.TALL);
    /* 19회차 — 호스트는 «한 칸» 이 아니라 경로다. 두 번째 칸부터는 방금 그려진 노드라
       `click()` 의 가시성 판정에 걸리므로 `evaluate` 안에서 눌러야 한다(LESSONS 50-①). */
    for (let s = 0; s < h.steps.length; s++) {
      if (s === 0) await p2.click(h.steps[0], { timeout: 3000, force: true }).catch(() => {});
      else await p2.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, h.steps[s]).catch(() => {});
      await p2.waitForTimeout(s === h.steps.length - 1 ? 500 : 400);
    }
    const c = await countAll(p2);
    for (const g of lib.ASK_GROUPS) {
      if (c[g.key].length > best[g.key].n) best[g.key] = { n: c[g.key].length, vals: c[g.key], host: h.label };
    }
    await c2.close();
  }
  await b.close();

  const rows = lib.ASK_GROUPS.map((g) => {
    const bootN = boot[g.key].length;
    const bestN = best[g.key].n;
    const grew = bestN > bootN;
    const handled = !!g.askedAfter && !SELFTEST;
    const missed = grew && !handled
      ? best[g.key].vals.filter((v) => !boot[g.key].includes(v)) : [];
    return {
      key: g.key, sel: g.sel, askedAfter: g.askedAfter || null,
      boot: bootN, bootVals: boot[g.key],
      best: bestN, bestHost: best[g.key].host, grew, handled, missed,
    };
  });

  const leaks = rows.filter((r) => r.grew && !r.handled);
  const dead = rows.filter((r) => r.askedAfter && !SELFTEST && !r.grew);

  console.log('\n[351-F] «묻는 시점» 감사 — 질문 %d개 × 호스트 %d개 (1080×%d)',
    rows.length, HS.length, lib.TALL[1]);
  /* ⚠ node 의 console.log 포맷은 `%-8s` 같은 **정렬 지정자를 모른다**(%s·%d 만 안다) —
     그대로 쓰면 서식 문자열이 글자 그대로 찍히고 값이 뒤에 붙는다. padEnd/padStart 로 짠다. */
  const col = (k, sel, a, b, note) =>
    `  ${String(k).padEnd(8)} ${String(sel).padEnd(34)} ${String(a).padStart(6)} ${String(b).padStart(6)}  ${note}`;
  console.log(col('key', 'selector', '부팅', '최대', '늘어난 자리'));
  for (const r of rows) {
    const mark = r.grew ? (r.handled ? '✓' : '⚠') : ' ';
    console.log(mark + col(r.key, r.sel, r.boot, r.best,
      r.grew ? `${r.bestHost} 에서 +${r.best - r.boot}${r.handled ? ' (askedAfter 로 이미 처리됨)' : ' ← 새는 자리'}` : '—').slice(1));
  }

  if (dead.length) {
    console.log('\n  ⓘ `askedAfter` 가 적혀 있는데 안 늘어난 질문 %d건 — 처방이 무의미해졌는지 확인하라:', dead.length);
    dead.forEach((r) => console.log('     · %s (%s)', r.key, r.askedAfter));
  }

  if (JSON_OUT) require('fs').writeFileSync(JSON_OUT, JSON.stringify({ rows, hosts: HS.map((h) => h.label) }, null, 1));

  if (leaks.length) {
    console.log('\n  ⚠ 새는 질문 %d건 — 이 질문들은 «호스트를 연 뒤» 물어야 한다:', leaks.length);
    leaks.forEach((r) => console.log('     · %s : 부팅 %d → %s 에서 %d  (못 만든 오프너: %s)',
      r.key, r.boot, r.bestHost, r.best, r.missed.join(', ')));
    console.log('\n[351-F] FAIL — 8·10·12·13·14회차와 같은 사고가 %d자리 남아 있다.', leaks.length);
    process.exit(2);
  }
  console.log('\n[351-F] PASS — 부팅 직후에 묻는 질문 %d개 중 «호스트를 열면 늘어나는» 것 0건.',
    rows.filter((r) => !r.askedAfter).length);
})();
