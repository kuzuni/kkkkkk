#!/usr/bin/env node
/* 작업 798 게이트 — 「«밀어서 더 보기» 는 **가려진 행이 있을 때만** 붙는다」
 *
 *   node tools/verify798.js
 *
 * 등재문(798, sess-0543-16639 워커 C 의 719 [F] 곁다리 관측): 한 줄(2칸)짜리 판인데
 * `#upCards` 가 `scrollHeight 171~173 > clientHeight 166` 이라 782 의 «격자에게 묻는다» 가
 * 참으로 떨어져 **안 가려진 판에도** 그 말이 붙는다.
 *
 * 재현(`probe798`)이 등재문보다 넓은 것을 찍었다 — **1~6칸이 전부** 그렇고 **합성 경로(719)도**
 * 같다(6/10 → 수리 후 10/10). 뿌리는 «격자가 넘친다» 가 아니라 **문턱**이다:
 *   · 6칸 이하는 `#upw.many .upr-cards` 의 `height`/`overflow-y` 가 안 걸려 격자가 «내용대로» 선다.
 *   · `.upr-lv` 의 검정 스트로크(5.5px)가 칸 밖으로 새어 `scrollHeight` 만 4~7px 크게 읽힌다.
 *   · 그 4~7px 이 `gh` 가 미리 얹어 두는 `UPR_SLACK`(8px) 과 **같은 양**이다(둘 다 같은 스트로크다).
 * ⇒ 처방 ⓐ(등재문 1순위): 문턱을 `+1` → **`+ UPR_SLACK`**. 처방 ⓑ(격자 클라이언트를 실제로 줄이기)는
 *   6칸 이하 레퍼런스 배치(`verify726` [C] Δ0px)를 흔들므로 안 골랐다.
 *
 * 지킬 것:
 *   [A] 한 줄 판(1~6칸) × 세 시트(장비·스킬·펫) × 프레임 2종 — «밀어서» **0건**
 *   [B] 과교정 잠금 — **정말 가려진** 판은 계속 말한다(전종 @1600) · 안 넘치는 `many` 판은 계속 조용하다
 *   [C] ★ 문턱이 «슬랙 < 문턱 < 한 행» 사이에 있다 — 실측 최대 넘침과 한 행 피치를 둘 다 재서 가둔다
 *   [D] 선언 한 벌 — 제품의 문턱이 **`UPR_SLACK` 파생**이다(손 상수로 8 을 적으면 빨강)
 *   [E] 합성 경로(719 `opt.tail`)도 같은 판정을 쓴다 — 껍데기가 한 벌인지
 *   [R] 되돌림 — 문턱을 `+1` 로 되돌린 사본에서 [A] 가 **실제로** 빨개진다
 *
 * ⚑ 왜 [C] 가 있는가 — [A] 만 있으면 «문턱을 999 로 키우기» 로도 초록이 된다(그러면 [B] 의
 *   진짜 넘침만 겨우 살고 «한 행이 가려진» 경계는 통째로 죽는다). [C] 가 문턱의 **양쪽**을 잡는다.
 * ⚑ 왜 [D] 가 있는가 — 825(문턱 플레이키) 계열의 교훈: 같은 수를 두 곳에 적으면 한쪽만 늙는다.
 *   `UPR_SLACK` 이 «스트로크가 칸 밖으로 새는 양» 이고 문턱이 재는 것도 그 양이라 **같은 선언**이어야 한다.
 * ⚠ `goTab('hero')` 는 이미 열린 탭을 다시 누르면 패널을 닫는다(A1) — 조건 없이 부르지 말 것(726 교훈).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 표본 — verify726·probe782 와 같은 꼴(앞 n 종만 조각을 채우고 나머지는 눌러 둔다) */
const SEED = ({ kind, n, frag }) => {
  const list = kind === 'skill' ? SKILLS : kind === 'pet' ? PETS : wpnList();
  const ids = list.slice(0, n).map(it => it.id);
  ids.forEach(id => { S.own[id] = { n: frag, l: 1 }; });
  list.slice(n).forEach(it => { if (S.own[it.id]) S.own[it.id].n = 0; });
  save();
  return { want: ids.length, listLen: list.length };
};

/* ⚠ 행·넘침은 `offsetTop`/`scrollHeight` 로만 읽는다 — `getBoundingClientRect` 는 60 쥬시 등장
   연출의 scale 이 섞여 같은 줄이 갈라진다(probe782 1회차 교훈). */
const READ = () => {
  const grid = document.getElementById('upCards');
  const cels = [...grid.querySelectorAll('.upr-cel')];
  const cnt = document.getElementById('upCnt');
  const tops = new Set(cels.map(c => c.offsetTop));
  return {
    n: cels.length,
    rowsDrawn: tops.size,
    sh: grid.scrollHeight, ch: grid.clientHeight,
    many: document.getElementById('upw').classList.contains('many'),
    cntTxt: (cnt.textContent || '').trim(),
    /* 6칸 이하는 `.upr-cnt{display:none}` 이라 눈에는 안 보인다 — 잠복 결함이므로 **문자열**로 묻는다 */
    says: /밀어서/.test(cnt.textContent || ''),
    slack: typeof UPR_SLACK !== 'undefined' ? UPR_SLACK : null,
    rowH: typeof UPR_ROW_H !== 'undefined' ? UPR_ROW_H : null,
    gap: typeof UPR_GAP !== 'undefined' ? UPR_GAP : null,
    cols: typeof UPR_COLS !== 'undefined' ? UPR_COLS : null
  };
};

const OPEN = async (page, kind) => {
  if (kind === 'skill') {
    await ev(page, () => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo('sk'); uiDirty = true; renderUI(); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.querySelector('#bSk [data-skup]').click(); });
  } else if (kind === 'pet') {
    await ev(page, () => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo('pet'); uiDirty = true; renderUI(); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.querySelector('#bPet [data-ptup]').click(); });
  } else {
    await ev(page, () => { openWeapon('wpn'); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.getElementById('wpnBtnUp').click(); });
  }
  await page.waitForTimeout(450);
};

async function boot(browser, url, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

/* 한 줄 판 스윕 — 한 컨텍스트 안에서 칸수를 갈아 끼우며 읽는다(부팅 비용을 아낀다) */
async function sweepOneRow(browser, url, kind, h) {
  const r0 = await boot(browser, url, h);
  const rows = [];
  for (let n = 1; n <= 6; n++) {
    await ev(r0.page, SEED, { kind, n, frag: 30 });
    await ev(r0.page, () => { closeUpAll(); });
    await OPEN(r0.page, kind);
    const r = await ev(r0.page, READ);
    if (r) rows.push({ n, ...r, over: r.sh - r.ch });
  }
  const errs = r0.errs.slice();
  await r0.ctx.close();
  return { rows, errs };
}

(async () => {
  const browser = await launch(chromium);
  const code = fs.readFileSync(SRC, 'utf8');
  const overs = [];          /* [C] 가 쓸 «한 줄 판 실측 넘침» 표본 */

  /* ── [A] 한 줄 판은 어느 조합에서도 그 말을 안 붙인다 ───────────── */
  blk('A — 한 줄 판(1~6칸) × 세 시트 × 프레임 2종: «밀어서 더 보기» 0건');
  for (const [kind, label] of [['wpn', '장비'], ['skill', '스킬'], ['pet', '펫']]) {
    for (const h of [2280, 1600]) {
      const { rows, errs } = await sweepOneRow(browser, URL, kind, h);
      if (rows.length !== 6) { ok(false, 'A0 ' + label + '@' + h + ' 여섯 판을 읽었다', rows.length + '/6'); continue; }
      rows.forEach(x => overs.push(x.over));
      const drawn1 = rows.every(x => x.rowsDrawn === 1);
      const bad = rows.filter(x => x.says);
      info(label + '@' + h, rows.map(x => 'n' + x.n + ':' + x.sh + '/' + x.ch + '(+' + x.over + ')').join(' '));
      ok(drawn1, 'A1 ' + label + '@' + h + ' — 여섯 판이 전부 «한 줄» 이다(표본이 옳다)',
         rows.map(x => x.rowsDrawn).join(','));
      ok(bad.length === 0,
         'A2 ★ ' + label + '@' + h + ' — 한 줄인데 «밀어서 더 보기» 를 붙인 판 0건',
         bad.length ? '거짓 양성 n=' + bad.map(x => x.n).join(',') : '0건');
      ok(errs.length === 0, 'A3 ' + label + '@' + h + ' 콘솔 에러 0', errs.slice(0, 2).join(' | ') || '없음');
    }
  }

  /* ── [B] 과교정 잠금 ─────────────────────────────────────────────
     문턱을 올리는 수리라 «아예 말 안 하기» 로 도망칠 수 있다. 진짜 가려진 판은 계속 말해야 한다. */
  blk('B — 과교정 잠금: 정말 가려진 판은 계속 말한다 / 안 넘치는 many 판은 계속 조용하다');
  {
    const r0 = await boot(browser, URL, 1600);
    await ev(r0.page, SEED, { kind: 'pet', n: 36, frag: 30 });
    await OPEN(r0.page, 'pet');
    const a = await ev(r0.page, READ);
    await r0.ctx.close();

    const r1 = await boot(browser, URL, 2280);
    await ev(r1.page, SEED, { kind: 'pet', n: 7, frag: 30 });
    await OPEN(r1.page, 'pet');
    const b = await ev(r1.page, READ);
    /* 실동작 — 가려진 판은 밀면 마지막 칸이 격자 안으로 들어온다(«말» 이 참말인지 손으로 확인) */
    await r1.ctx.close();

    if (!a || !b) ok(false, 'B0 읽기'); else {
      info('펫 전종@1600', 'n' + a.n + ' 행' + a.rowsDrawn + ' sh/ch ' + a.sh + '/' + a.ch + ' 말함 ' + a.says);
      info('7칸@2280', 'n' + b.n + ' 행' + b.rowsDrawn + ' sh/ch ' + b.sh + '/' + b.ch + ' 말함 ' + b.says);
      ok(a.rowsDrawn > 1 && a.sh > a.ch + a.rowH,
         'B1 표본이 «한 행 넘게 가려진» 판이다(표본이 옳다)',
         '행 ' + a.rowsDrawn + ' · 넘침 ' + (a.sh - a.ch) + ' > 한 행 ' + a.rowH);
      ok(a.says, 'B2 ★ 정말 가려진 판은 «밀어서 더 보기» 를 계속 말한다', '"' + a.cntTxt + '"');
      ok(b.many && b.rowsDrawn === 2 && b.sh <= b.ch,
         'B3 표본이 «두 줄인데 안 가려진» many 판이다(표본이 옳다)',
         'many ' + b.many + ' · 행 ' + b.rowsDrawn + ' · sh/ch ' + b.sh + '/' + b.ch);
      ok(!b.says, 'B4 ★ 안 넘치는 many 판은 계속 조용하다(782 가 이미 옳던 자리)', '"' + b.cntTxt + '"');
    }
  }

  /* ── [C] ★ 문턱의 양쪽 — 슬랙 < 문턱 < 한 행 ─────────────────────
     이 절이 «문턱을 999 로 키우면 [A] 는 초록» 이라는 무른 수리를 막는다. */
  blk('C — ★ 문턱이 «슬랙» 과 «한 행» 사이에 있다 (양쪽을 다 잡는다)');
  {
    const r0 = await boot(browser, URL, 2280);
    await ev(r0.page, SEED, { kind: 'pet', n: 3, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, READ);
    await r0.ctx.close();
    /* 제품이 쓰는 문턱을 소스에서 뽑는다 — [D] 가 «파생인가» 를 따로 묻고, 여기서는 «값» 을 쓴다 */
    const m = code.match(/scrollHeight\s*>\s*\S+\.clientHeight\s*\+\s*([A-Za-z_$][\w$]*|\d+)/);
    const raw = m ? m[1] : null;
    const thr = raw == null ? null : (/^\d+$/.test(raw) ? +raw : (r && r[({ UPR_SLACK: 'slack', UPR_ROW_H: 'rowH', UPR_GAP: 'gap' })[raw]]));
    const maxOver = overs.length ? Math.max(...overs) : null;
    const pitch = r ? r.rowH + r.gap : null;
    info('제품 문턱', raw + ' ⇒ ' + thr + 'px');
    info('한 줄 판 실측 넘침(최대)', maxOver + 'px  [' + overs.length + '표본: ' + overs.join(',') + ']');
    info('한 행 피치(UPR_ROW_H + UPR_GAP)', pitch + 'px');
    ok(thr != null && maxOver != null && thr >= maxOver,
       'C1 ★ 문턱 ≥ 한 줄 판의 실측 최대 넘침 — 거짓 양성이 구조적으로 안 난다',
       '문턱 ' + thr + ' ≥ 실측 ' + maxOver);
    ok(thr != null && pitch != null && thr < pitch,
       'C2 ★ 문턱 < 한 행 피치 — «한 행만 가려진» 경계를 아직 잡는다(과교정 아님)',
       '문턱 ' + thr + ' < 피치 ' + pitch);
    ok(r && r.slack != null && maxOver != null && maxOver <= r.slack,
       'C3 실측 넘침이 슬랙(' + (r ? r.slack : '?') + 'px) 안이다 = 문턱의 근거가 아직 참이다',
       '실측 최대 ' + maxOver);
  }

  /* ── [D] 선언 한 벌 ──────────────────────────────────────────────
     같은 수를 두 곳에 적으면 한쪽만 늙는다(825 계열 교훈). 문턱이 재는 양과 `UPR_SLACK` 이
     뜻하는 양은 **같은 스트로크**이므로 같은 선언이어야 한다. */
  blk('D — 선언 한 벌: 문턱이 `UPR_SLACK` 파생인가 (손 상수 금지)');
  {
    const m = code.match(/scrollHeight\s*>\s*\S+\.clientHeight\s*\+\s*([A-Za-z_$][\w$]*|\d+)/);
    info('소스에서 읽은 문턱 항', m ? m[1] : '(못 찾음)');
    ok(!!m, 'D1 «격자에게 묻는» 판정이 소스에 그대로 있다(782 의 축을 안 되돌렸다)', m ? m[0] : 'n/a');
    ok(!!m && m[1] === 'UPR_SLACK',
       'D2 ★ 문턱이 `UPR_SLACK` 파생이다 — 숫자를 손으로 적지 않았다', m ? m[1] : 'n/a');
    ok(/const\s+UPR_SLACK\s*=\s*\d+/.test(code),
       'D3 `UPR_SLACK` 선언이 한 곳에 그대로 있다',
       (code.match(/const\s+UPR_SLACK\s*=\s*\d+/) || [''])[0]);
  }

  /* ── [E] 합성 경로(719) ──────────────────────────────────────────── */
  blk('E — 합성 경로(719 `opt.tail`)도 같은 판정을 쓴다');
  {
    const r0 = await boot(browser, URL, 2280);
    const r = await ev(r0.page, () => {
      const two = [{ it: PETS[0].id, from: 1, to: 2 }, { it: PETS[1].id, from: 1, to: 2 }];
      openUpAll(two, { tail: '건 합성' });
      const grid = document.getElementById('upCards'), cnt = document.getElementById('upCnt');
      return { n: grid.querySelectorAll('.upr-cel').length, sh: grid.scrollHeight, ch: grid.clientHeight,
               txt: (cnt.textContent || '').trim(), says: /밀어서/.test(cnt.textContent || ''),
               tail: /합성/.test(cnt.textContent || '') };
    });
    await r0.ctx.close();
    if (!r) ok(false, 'E0 읽기'); else {
      info('합성 2칸', 'n' + r.n + ' sh/ch ' + r.sh + '/' + r.ch + ' · "' + r.txt + '"');
      ok(r.tail, 'E1 합성 낱말이 붙는다(719 경로가 맞다 — 껍데기 한 벌)', r.txt);
      ok(!r.says, 'E2 ★ 합성 경로도 한 줄이면 «밀어서 더 보기» 가 없다', '말함 ' + r.says);
    }
  }

  /* ── [R] 되돌림 — 문턱을 +1 로 되돌린 사본은 [A] 가 실제로 빨개진다 ─
     ⚑ 이 절이 없으면 [A] 는 «어차피 안 붙는다» 로 무르게 초록일 수 있다. 되돌린 사본이
       빨개지는 것을 못박아야 이 자가 정말 «문턱» 을 묻는 자가 된다. */
  blk('R — 되돌림: 문턱을 `+ 1` 로 되돌린 사본에서 [A] 가 빨개진다');
  {
    const rev = code.replace('gEl.scrollHeight > gEl.clientHeight + UPR_SLACK',
                             'gEl.scrollHeight > gEl.clientHeight + 1');
    ok(rev !== code, 'R0 되돌림 사본을 만들었다(문턱 UPR_SLACK → 1)');
    const tmp = path.resolve(__dirname, '..', '.rev798.html');
    fs.writeFileSync(tmp, rev);
    try {
      const rurl = 'file://' + tmp.replace(/\\/g, '/');
      const { rows } = await sweepOneRow(browser, rurl, 'pet', 2280);
      const bad = rows.filter(x => x.says);
      info('되돌린 사본 · 펫@2280', rows.map(x => 'n' + x.n + ':' + (x.says ? '말함' : '조용')).join(' '));
      ok(bad.length > 0,
         'R1 ★ 되돌린 사본에서는 한 줄 판이 «밀어서» 를 붙인다 = [A] 가 무른 초록이 아니다',
         '거짓 양성 n=' + (bad.map(x => x.n).join(',') || '없음 ← 되돌림이 안 먹었다'));
      /* 음성항 — 되돌려도 «진짜 가려진 판» 은 그대로다(되돌림이 다른 축을 건드리지 않았다) */
      const r1 = await boot(browser, rurl, 1600);
      await ev(r1.page, SEED, { kind: 'pet', n: 36, frag: 30 });
      await OPEN(r1.page, 'pet');
      const a = await ev(r1.page, READ);
      await r1.ctx.close();
      ok(a && a.says, 'R2 되돌린 사본도 진짜 가려진 판은 말한다(문턱 말고는 안 바뀌었다)',
         a ? '"' + a.cntTxt + '"' : 'n/a');
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  }

  await browser.close();
  console.log('\nVERIFY798 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
