#!/usr/bin/env node
/* 작업 706 게이트 — 「칭호를 다른 것으로 장착할 수 있다」
 *
 *   node tools/verify706.js
 *
 * 706 은 «축을 하나 더 세운» 작업이다 — 보유(`S.titles`)는 201 ② 가 이미 파생에서 떼어냈는데
 * **장착**만 `i === S.rank` 파생으로 남아 있었다(`probe706` [0b]). 그래서 이 자가 지키는 것은
 * «클릭이 먹는가» 하나가 아니라 **두 축이 안 다시 붙는가** 다:
 *
 *   [A] 축 분리   — 칭호를 바꿔도 계급(`rankOf`)·계급 보너스·다음 계급은 Δ0
 *   [B] 장착      — 보유 칭호를 누르면 세 자리(#pfTtl · HUD #rankN · 41 랭킹 내 줄)가 같이 따라온다
 *   [C] 저장      — 재로드 뒤에도 유지된다
 *   [D] 구 세이브 — `titleEq` 없는 세이브는 **계급을 따라간다** = 706 이전과 한 픽셀도 안 다르다
 *                   (⇒ 세이브 이관 «없음» 이 정답이고 KEY 를 안 올린 근거다)
 *   [E] 반려·폴백 — 미보유는 이유를 말하고 안 바꾼다 · 손댄 세이브의 보유 밖 값은 계급으로 접힌다
 *   [F] 승급 상호작용 — «고른 적 없음(null)» 은 승급을 따라 올라가고, **고른 값은 승급이 못 덮는다**
 *   [R] 되돌림    — 장착 판정을 옛 `i === S.rank` 로 되돌린 사본에서는 [B] 가 빨개진다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

const READ = () => {
  const cards = [].slice.call(document.querySelectorAll('#pfCards .pf-card'));
  return {
    n: cards.length,
    eq: cards.findIndex(c => c.classList.contains('eq')),
    own: cards.map(c => c.classList.contains('own') ? 1 : 0),
    ttl: (document.getElementById('pfTtl').textContent || '').trim(),
    hud: (document.getElementById('rankN').textContent || '').trim(),
    names: cards.map(c => { const i = c.querySelector('.pf-bn>i'); return i ? i.textContent.trim() : ''; }),
    badges: cards.filter(c => c.querySelector('.pf-eqb')).length
  };
};

/* 41 랭킹의 «내 줄» 칭호 잉크 */
const MYRANK = () => {
  const el = document.getElementById('rkMyTt');
  return el ? (el.textContent || '').trim() : null;
};

async function boot(browser, mutate) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProfile === 'function');
  await page.waitForTimeout(600);
  if (mutate) await page.evaluate(mutate);
  return { page, ctx, errs };
}

/* 표본 — 계급 2(골드)에 칭호 0~4 보유. «다른 것으로 장착» 이 성립하는 최소 조건. */
const SEED = () => { S.rank = 2; S.titles = { 0:1, 1:1, 2:1, 3:1, 4:1 }; S.titleEq = null;
                     save(); drawHud(); openProfile(); };

/* ⚠ 291·353 함정 — **여는 연출이 끝나기 전에 누르면 안 눌린다.** 팝업 입장 연출(`jzSheetIn`)이
   도는 동안 `getBoundingClientRect()` 는 «축소된 프레임» 의 좌표를 주고, 그 좌표로 마우스를
   내리는 사이에 카드가 제자리로 커져 **클릭이 카드 밖에 떨어진다**. 초판이 실제로 그랬다 —
   [B]·[C]·[R3] 이 «클릭은 했는데 아무 일도 안 일어남» 으로 빨갰고, 계측을 얹어 evaluate 를
   두어 번 더 태우자(= 시간이 더 감) 초록으로 바뀌는 **위상 의존**을 보였다.
   ⇒ 재기 전에 정착시킨다. `pwlaunch` 의 settle291 훅은 **250ms 이상**의 `waitForTimeout` 뒤에만
   도므로(그 자의 MIN_WAIT) 여기 대기는 그 문턱을 넘겨야 한다 — 200 으로 줄이지 마라. */
const SETTLE_MS = 320;
const clickCard = async (page, i) => {
  await page.waitForTimeout(SETTLE_MS);
  const b = await page.evaluate(k => {
    const c = document.querySelectorAll('#pfCards .pf-card')[k];
    if (!c) return null; const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, i);
  if (!b) return false;
  await page.mouse.click(b.x, b.y);
  await page.waitForTimeout(280);
  return true;
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  /* ── [A] 축 분리 ─────────────────────────────────────────────────────── */
  console.log('[A] 축 분리 — 칭호는 «표시», 계급은 «판정». 한 함수로 다시 합치면 여기가 빨개진다');
  ok(/const titleIdx\s*=/.test(code) && /const titleOf\s*=/.test(code),
     'A1 표시 축(`titleIdx`/`titleOf`)이 선언돼 있다');
  ok(/const rankOf\s*=\s*\(\)\s*=>\s*RANKS\[Math\.min\(S\.rank/.test(code),
     'A2 판정 축(`rankOf`)은 계급 그대로다 — 706 이 여기를 안 건드렸다');
  ok(/titleEq/.test(code) && !/KEY\s*=\s*'idle_hunter_save_v[5-9]/.test(code),
     'A3 저장 필드는 늘었는데 KEY 는 안 올랐다(구 세이브 이관 «없음»)',
     (code.match(/const KEY = '([^']+)'/) || [])[1]);
  {
    const { page, ctx, errs } = await boot(browser, SEED);
    await page.waitForTimeout(SETTLE_MS);
    const before = await page.evaluate(() => ({
      rank: S.rank, rankN: rankOf().n, next: nextRank() ? nextRank().n : null,
      bonus: (1 + S.rank * 0.25).toFixed(2), cp: Math.round(cp())
    }));
    await page.evaluate(() => { titleEquip(4); });
    await page.waitForTimeout(SETTLE_MS);
    const after = await page.evaluate(() => ({
      rank: S.rank, rankN: rankOf().n, next: nextRank() ? nextRank().n : null,
      bonus: (1 + S.rank * 0.25).toFixed(2), cp: Math.round(cp())
    }));
    ok(before.rank === after.rank && before.rankN === after.rankN,
       'A4 ★ 칭호를 «다이아» 로 바꿔도 계급은 골드 그대로', before.rankN + ' → ' + after.rankN);
    ok(before.next === after.next, 'A5 다음 계급 Δ0', String(before.next));
    ok(before.bonus === after.bonus, 'A6 계급 보너스 Δ0', '×' + before.bonus);
    ok(before.cp === after.cp, 'A7 전투력 Δ0 — 칭호는 스탯이 아니다', before.cp + ' → ' + after.cp);
    ok(errs.length === 0, 'A8 콘솔 에러 0', errs.slice(0, 3).join(' | ') || '없음');
    await ctx.close();
  }

  /* ── [B] 장착 ─────────────────────────────────────────────────────────── */
  console.log('\n[B] 장착 — 보유 칭호를 «누르면» 세 자리가 같이 따라온다');
  {
    const { page, ctx, errs } = await boot(browser, SEED);
    await page.waitForTimeout(SETTLE_MS);
    const a = await page.evaluate(READ);
    ok(a.n === 8 && a.eq === 2, 'B0 전제 — 8칸 · 처음 장착은 계급(골드)', 'eq = ' + a.eq);
    ok(a.badges === 1, 'B1 «장착 중» 배지는 언제나 1장', '배지 ' + a.badges + '장');

    ok(await clickCard(page, 4), 'B2 4번(다이아) 카드를 눌렀다');
    const b = await page.evaluate(READ);
    ok(b.eq === 4, 'B3 ★ 장착이 4번으로 옮겨갔다', 'eq = ' + b.eq + ' (' + b.names[b.eq] + ')');
    ok(b.badges === 1, 'B4 배지가 두 장이 되지 않았다', '배지 ' + b.badges + '장');
    ok(b.ttl === '다이아', 'B5 팝업 배너(#pfTtl)', b.ttl);
    ok(b.hud === '다이아', 'B6 ★ HUD 칭호(#rankN) — 팝업 밖도 따라온다', b.hud);

    /* 41 랭킹 — 내 줄의 칭호도 «장착한 것» 이다 */
    await page.evaluate(() => { closeProfile(); if (typeof openRank === 'function') openRank(); else renderRank(); });
    await page.waitForTimeout(SETTLE_MS);
    const mt = await page.evaluate(MYRANK);
    ok(mt === '다이아', 'B7 ★ 41 랭킹 «내 줄» 칭호', String(mt));

    /* 아래로도 간다 — 계급보다 낮은 칭호 */
    await page.evaluate(() => { closeRank && closeRank(); openProfile(); });
    await page.waitForTimeout(SETTLE_MS);
    ok(await clickCard(page, 0), 'B8 0번(브론즈) — 계급보다 «낮은» 칭호를 눌렀다');
    const c = await page.evaluate(READ);
    ok(c.eq === 0 && c.ttl === '브론즈' && c.hud === '브론즈',
       'B9 ★ 낮은 칭호도 장착된다(«계급 이상» 으로 조건을 좁히지 않았다)',
       'eq ' + c.eq + ' · 배너 ' + c.ttl + ' · HUD ' + c.hud);
    ok(errs.length === 0, 'B10 콘솔 에러 0', errs.slice(0, 3).join(' | ') || '없음');
    await ctx.close();
  }

  /* ── [C] 저장 ─────────────────────────────────────────────────────────── */
  console.log('\n[C] 저장 — 재로드 뒤에도 유지된다');
  {
    const { page, ctx, errs } = await boot(browser, SEED);
    await page.waitForTimeout(SETTLE_MS);
    await clickCard(page, 3);
    const raw = await page.evaluate(() => { save(); return localStorage.getItem(KEY); });
    ok(/"titleEq":3/.test(raw), 'C1 세이브 문자열에 장착값이 들어갔다', (raw.match(/"titleEq":[^,}]+/) || [])[0]);
    await page.reload();
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProfile === 'function');
    await page.waitForTimeout(600);
    await page.evaluate(() => { openProfile(); });
    await page.waitForTimeout(SETTLE_MS);
    const d = await page.evaluate(READ);
    ok(d.eq === 3, 'C2 ★ 재로드 뒤에도 3번(플래티넘)이 장착', 'eq = ' + d.eq);
    ok(d.hud === '플래티넘', 'C3 재로드 뒤 HUD 도 그대로', d.hud);
    ok(errs.length === 0, 'C4 콘솔 에러 0', errs.slice(0, 3).join(' | ') || '없음');
    await ctx.close();
  }

  /* ── [D] 구 세이브 ────────────────────────────────────────────────────── */
  console.log('\n[D] 구 세이브 — **두 모양**을 실제로 로드한다(이관 «없음» 이 정답인 근거)');
  {
    const KEYV = (code.match(/const KEY = '([^']+)'/) || [])[1];
    ok(!!KEYV, 'D0 세이브 키를 소스에서 읽었다', KEYV);

    /* ⚠ 세이브를 «페이지 안에서 만들고 reload» 하면 **오토세이브가 그 사이에 덮어쓴다** —
       초판이 그래서 «키를 지웠는데 로드가 0 을 봤다» 로 빨갰고, 그 0 이 실은 다음 모양(`null`)의
       버그였다. 여기서는 `addInitScript` 로 **제품 스크립트가 돌기 전에** 심어 경합을 없앤다. */
    const loadWith = async (raw, label) => {
      const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const p2 = await c2.newPage();
      const er = [];
      p2.on('pageerror', e => er.push(e.message));
      await p2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (_) {} }, [KEYV, raw]);
      await p2.goto(URL);
      await p2.waitForFunction(() => typeof S !== 'undefined' && typeof openProfile === 'function');
      await p2.waitForTimeout(600);
      const te = await p2.evaluate(() => S.titleEq);
      await p2.evaluate(() => { openProfile(); });
      await p2.waitForTimeout(SETTLE_MS);
      const r = await p2.evaluate(READ);
      await c2.close();
      return { te, r, er, label };
    };

    /* 계급 3(플래티넘) · 칭호 0~3 보유 — 706 이전 세이브가 딱 이 모양이다(키 자체가 없다) */
    const base = { rank:3, titles:{ 0:1, 1:1, 2:1, 3:1 }, nick:'구세이브' };
    const noKey = await loadWith(JSON.stringify(base), '키 없음');
    ok(noKey.te === null, 'D1 ⑴ 키가 **아예 없는** 세이브 → `null`', String(noKey.te));
    ok(noKey.r.eq === 3 && noKey.r.hud === '플래티넘',
       'D2 ★ ⑴ 계급을 따라간다 = 706 이전 화면과 동일', 'eq ' + noKey.r.eq + ' · HUD ' + noKey.r.hud);

    /* ⑵ 새 빌드가 «한 번도 안 골랐다» 를 저장한 모양 — JSON 왕복으로 `null` 이 되돌아온다.
       `Number(null) === 0` 이라 여기서 0(브론즈)으로 새면 **안 고른 사람 전부**가 브론즈가 된다. */
    const nullKey = await loadWith(JSON.stringify(Object.assign({ titleEq:null }, base)), 'null');
    ok(nullKey.te === null, 'D3 ⑵ `"titleEq":null` 세이브 → 그대로 `null`(★ `Number(null)===0` 함정)',
       String(nullKey.te));
    ok(nullKey.r.eq === 3 && nullKey.r.hud === '플래티넘',
       'D4 ★ ⑵ 도 계급을 따라간다 — 브론즈로 새지 않았다', 'eq ' + nullKey.r.eq + ' · HUD ' + nullKey.r.hud);

    /* ⑶ 손댄 세이브 — 타입이 어긋나도 한 종류(정수 또는 null)로 못박는다 */
    const junk = await loadWith(JSON.stringify(Object.assign({ titleEq:'3' }, base)), '문자열');
    ok(junk.te === null, 'D5 ⑶ 문자열 `"3"` 은 받지 않는다(타입을 한 종류로)', JSON.stringify(junk.te));
    /* ⑷ 저장된 값이 실제로 살아난다 — ⑴~⑶ 이 «항상 null» 이라서 초록인 게 아님을 못박는 음성항 */
    const real = await loadWith(JSON.stringify(Object.assign({ titleEq:1 }, base)), '정수 1');
    ok(real.te === 1 && real.r.eq === 1 && real.r.hud === '실버',
       'D6 ★ 음성항 — 정수 1 은 실제로 실버로 살아난다(자가 «전부 null» 로 무른 게 아니다)',
       'S.titleEq ' + real.te + ' · eq ' + real.r.eq + ' · HUD ' + real.r.hud);
    const allErr = [].concat(noKey.er, nullKey.er, junk.er, real.er);
    ok(allErr.length === 0, 'D7 네 로드 모두 페이지 에러 0', allErr.slice(0, 3).join(' | ') || '없음');
  }

  /* ── [E] 반려·폴백 ────────────────────────────────────────────────────── */
  console.log('\n[E] 반려(664 꼴)와 보유 밖 폴백');
  {
    const { page, ctx, errs } = await boot(browser, SEED);
    await page.waitForTimeout(SETTLE_MS);
    await page.evaluate(() => { window.__t706 = []; const g = window.fxToast;
      window.fxToast = function (...x) { window.__t706.push(String(x[0] || '')); return g.apply(this, x); }; });
    const before = await page.evaluate(READ);
    ok(await clickCard(page, 7), 'E0 7번(챌린저 · 미보유) 카드를 눌렀다');
    const after = await page.evaluate(READ);
    const msgs = await page.evaluate(() => (window.__t706 || []).slice());
    ok(after.eq === before.eq, 'E1 ★ 미보유는 장착이 안 옮겨간다', 'eq ' + before.eq + ' → ' + after.eq);
    ok(await page.evaluate(() => S.titleEq) === null, 'E2 `S.titleEq` 도 안 더럽혀졌다');
    ok(msgs.some(m => /챌린저/.test(m) && /🔒/.test(m)),
       'E3 ★ 이유를 말한다(«아무 일도 안 일어남» 이 아니다)', msgs.join(' / ') || '**0건**');

    /* 손댄 세이브 — 보유 밖 값이 들어와도 계급으로 접힌다 */
    await page.evaluate(() => { S.titleEq = 7; renderProfile(); drawHud(); });
    await page.waitForTimeout(SETTLE_MS);
    const f = await page.evaluate(READ);
    ok(f.eq === 2 && f.hud === '골드', 'E4 ★ 보유 밖 값(7)은 계급(2)으로 접힌다 — 못 가진 칭호가 HUD 에 안 걸린다',
       'eq ' + f.eq + ' · HUD ' + f.hud);
    ok(await page.evaluate(() => S.titleEq) === 7,
       'E5 그래도 값을 **회수하지는 않는다** — 나중에 챌린저를 얻으면 되살아난다', 'S.titleEq = 7');
    await page.evaluate(() => { S.titles[7] = 1; renderProfile(); drawHud(); });
    await page.waitForTimeout(SETTLE_MS);
    const g = await page.evaluate(READ);
    ok(g.eq === 7 && g.hud === '챌린저', 'E6 ★ 실제로 되살아난다', 'eq ' + g.eq + ' · HUD ' + g.hud);
    ok(errs.length === 0, 'E7 콘솔 에러 0', errs.slice(0, 3).join(' | ') || '없음');
    await ctx.close();
  }

  /* ── [F] 승급 상호작용 ────────────────────────────────────────────────── */
  console.log('\n[F] 승급 — «고른 적 없음» 은 따라 올라가고, «고른 값» 은 승급이 못 덮는다');
  {
    const { page, ctx, errs } = await boot(browser, SEED);
    await page.waitForTimeout(SETTLE_MS);
    /* ⑴ null 인 채로 승급 */
    await page.evaluate(() => { S.titleEq = null; S.rank = 3; grantRankTitle(3); drawHud(); renderProfile(); });
    await page.waitForTimeout(SETTLE_MS);
    const a = await page.evaluate(READ);
    ok(a.eq === 3 && a.hud === '플래티넘',
       'F1 ★ 고른 적 없으면 승급이 칭호를 따라 올린다(옛 동작 보존)', 'eq ' + a.eq + ' · HUD ' + a.hud);
    /* ⑵ 고른 뒤 승급 */
    await page.evaluate(() => { titleEquip(0); });
    await page.waitForTimeout(SETTLE_MS);
    await page.evaluate(() => { S.rank = 4; grantRankTitle(4); drawHud(); renderProfile(); });
    await page.waitForTimeout(SETTLE_MS);
    const b = await page.evaluate(READ);
    ok(b.eq === 0 && b.hud === '브론즈',
       'F2 ★ 고른 값은 승급이 못 덮는다 — 유저가 고른 것이 이긴다', 'eq ' + b.eq + ' · HUD ' + b.hud);
    ok(b.own[4] === 1, 'F3 그래도 새 칭호는 **보유** 로는 들어왔다(장착과 보유는 다른 축)', 'own = ' + b.own.join(''));
    ok(errs.length === 0, 'F4 콘솔 에러 0', errs.slice(0, 3).join(' | ') || '없음');
    await ctx.close();
  }

  /* ── [R] 되돌림 ───────────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 장착 판정을 옛 `i === S.rank` 파생으로 되돌리면 [B] 가 빨개진다');
  {
    /* 소스 사본을 만들어 `titleIdx` 를 옛 파생으로 되돌린다(제품 파일은 안 건드린다) */
    const rev = code.replace(
      /const titleIdx = \(\) => \{[\s\S]*?\n\};/,
      'const titleIdx = () => Math.min(S.rank, RANKS.length - 1);');
    const okPatch = rev !== code;
    ok(okPatch, 'R0 되돌림 사본을 만들었다(`titleIdx` → 옛 `S.rank` 파생)');
    const tmp = path.resolve(__dirname, '../.rev706.html');
    fs.writeFileSync(tmp, rev);
    try {
      const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const p2 = await ctx2.newPage();
      await p2.goto('file://' + tmp);
      await p2.waitForFunction(() => typeof S !== 'undefined' && typeof openProfile === 'function');
      await p2.waitForTimeout(600);
      await p2.evaluate(SEED);
      await p2.waitForTimeout(250);
      const before = await p2.evaluate(READ);
      await clickCard(p2, 4);
      const after = await p2.evaluate(READ);
      ok(before.eq === 2 && after.eq === 2,
         'R1 ★ 되돌린 사본은 4번을 눌러도 장착이 안 옮겨간다 = [B3] 이 빨개진다',
         'eq ' + before.eq + ' → ' + after.eq);
      ok(after.hud === '골드', 'R2 HUD 도 안 바뀐다 = [B6] 이 빨개진다', after.hud);
      await ctx2.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

    /* 자를 무르게 잡아 통과한 게 아님 — 같은 자로 원본이 다시 초록이어야 한다 */
    const { page, ctx } = await boot(browser, SEED);
    await page.waitForTimeout(SETTLE_MS);
    await clickCard(page, 4);
    const z = await page.evaluate(READ);
    ok(z.eq === 4 && z.hud === '다이아', 'R3 원본은 같은 자로 다시 초록', 'eq ' + z.eq + ' · HUD ' + z.hud);
    await ctx.close();
  }

  await browser.close();
  console.log('\nverify706: ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
