#!/usr/bin/env node
/* 작업 705 게이트 — 19 프로필 · 20 종합스탯 팝업 정리 4종 (주인 지시 2026-09-02 02:25)
 *
 *   node tools/verify705.js
 *
 * 주인 원문 4항과 이 자의 절이 1:1 이다.
 *   [A] ① «햄지» 견본 문구 폐지 — 라벨은 **강화 표 `UPG` 파생** · 값은 **살아 있는 상태 파생**(손 상수 0)
 *   [B] ② 종합스탯 아이콘 = **현재 착용 코스튬**(방패 이모지 아님) — 갈아입으면 따라온다
 *   [C] ③ 두 팝업이 **한 상자** — 프레임 높이 4종에서 `.pf` bbox = `.spc` bbox (Δ0)
 *   [D] ④ 상단 게이머 아이디 = «업데이트 예정» (그리고 닉네임·55 설정은 **안 건드렸다**는 짝 항)
 *   [R] 되돌림 시험 — 넷을 각각 수리 전으로 되돌린 사본에서 **실제로 빨개지는가**
 *
 * ⚑ 왜 [R] 이 있는가 — [A]~[D] 는 «지금 그런가» 만 묻는다. 되돌림이 없으면 «그 줄이 통째로
 *   사라져도 초록» 인 게이트가 된다(333·368 처방). 넷 다 되돌리는 길을 자 안에 적어 둔다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const eq = (m, got, want, tol) => ok(tol == null ? got === want : Math.abs(got - want) <= tol,
  m, `실측 ${got} / 기대 ${want}${tol ? ' ±' + tol : ''}`);

/* 두 상자를 «같은 자» 로 읽는다 — `fit()` 스케일을 나눠 **설계 px** 으로 되돌린다(probe705 와 한 벌) */
const BOX = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  const sc = app.width / 1080;
  const b = sel => { const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +((r.x - app.x) / sc).toFixed(1), y: +((r.y - app.y) / sc).toFixed(1),
             w: +(r.width / sc).toFixed(1), h: +(r.height / sc).toFixed(1) }; };
  return { pf: b('.pf'), spc: b('.spc'), tabs: b('.spc-tabs'), body: b('.spc-body'), tgl: b('.pf-tgl') };
};
const ROWS = () => [...document.querySelectorAll('#spcList .spc-row')]
  .map(r => [r.querySelector('.nm').textContent.trim(), r.querySelector('.vl').textContent.trim()]);

/* 열림 애니가 끝날 때까지 — 애니 중에 재면 스케일이 섞인다(probe705 초판이 그래서 헛것을 찍었다) */
const settle = async (page, sel) => {
  let prev = '', same = 0;
  for (let i = 0; i < 40 && same < 3; i++) {
    const cur = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return 'none';
      const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(','); }, sel);
    same = cur === prev ? same + 1 : 0; prev = cur;
    await page.waitForTimeout(60);
  }
};

/* 19 → 토글 → 20 (실사용 경로). 진입은 **화면으로** 확인한다(LESSONS 356-⑬) */
async function openBoth(page) {
  await page.evaluate(() => openProfile());
  await settle(page, '.pf');
  const a = await page.evaluate(BOX);
  await page.evaluate(() => { const e = document.querySelector('.pf-tgl>.lb'); if (e) e.click(); });
  await settle(page, '.spc');
  const on = await page.evaluate(() => !!document.querySelector('#specw.on') && !document.querySelector('#pfw.on'));
  const b = await page.evaluate(BOX);
  return { pf: a.pf, tgl: a.tgl, spc: b.spc, tabs: b.tabs, body: b.body, on };
}

async function newPage(browser, h, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof openProfile === 'function' && typeof openSpec === 'function');
  await page.waitForTimeout(800);
  if (css) await page.addStyleTag({ content: css });
  return { ctx, page, errs };
}

/* [R1] 수리 전 자리잡기 — `#specw` 중앙정렬(flex) + 상하 패딩 + `.spc` 자체 크기 */
const REVERT_BOX = `
  #specw.on{display:flex!important;align-items:center;justify-content:center;
    padding:126px 0 234px!important}
  .spc{position:relative!important;left:auto!important;top:auto!important;
    width:896px!important;height:1395px!important;max-height:100%!important;
    transform:translateY(42px)!important}`;

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  /* 주석을 걷어낸 «제품 문자열» — 369 선례(«주석 밖 0건»). 레퍼런스를 설명하는 주석은 남아 있어도 되고,
     남아 있어야 «왜 그런 이름이었나» 를 다음 세션이 읽는다. 금지된 것은 **화면에 찍히는** 그 글자다. */
  const bare = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });

  /* ── [A] ① 라벨·값 ─────────────────────────────────────────────── */
  console.log('=== [A] ① «햄지» 폐지 — 라벨은 표 파생 · 값은 상태 파생 ===');
  const A = await newPage(browser, 2280);
  const a0 = await openBoth(A.page);
  ok(a0.on, '[A0 전제] 실사용 경로로 20 종합스탯에 들어갔다(19 는 닫혔다)');
  const rows0 = await A.page.evaluate(ROWS);
  eq('[A1] 행 수 13(레퍼런스 격자 유지 — 측정표 20 §7-1)', rows0.length, 13);
  eq('[A2] 화면에 «햄지» 라벨 0행', rows0.filter(r => /햄지/.test(r[0] + r[1])).length, 0);
  eq('[A3] 제품 문자열(주석 밖)에 «햄지» 0건', (bare.match(/햄지/g) || []).length, 0);
  ok(!/'\d+%'/.test((code.match(/function renderSpec\(\)[\s\S]*?\n\}/) || [''])[0]),
     '[A4] `renderSpec` 안에 손으로 적은 «n%» 값 0건',
     ((code.match(/function renderSpec\(\)[\s\S]*?\n\}/) || [''])[0].match(/'\d+%'/g) || []).join(' · ') || '없음');
  eq('[A5] 빈 라벨·빈 값 0행', rows0.filter(r => !r[0] || !r[1]).length, 0);
  eq('[A6] NaN·undefined·null 0건', (JSON.stringify(rows0).match(/NaN|undefined|null/g) || []).length, 0);

  /* 값이 «살아 있는가» — 상태를 실제로 바꿔 본다(표시 전용 상수면 한 줄도 안 움직인다) */
  const moved = await A.page.evaluate(() => {
    const R = () => [...document.querySelectorAll('#spcList .spc-row')].map(r => r.querySelector('.vl').textContent.trim());
    const before = R();
    S.lv.atk = (S.lv.atk | 0) + 500; S.lv.hp = (S.lv.hp | 0) + 500; S.lv.crit = (S.lv.crit | 0) + 20;
    S.lv.cdmg = (S.lv.cdmg | 0) + 20; S.lv.pierce = (S.lv.pierce | 0) + 3; S.lv.def = (S.lv.def | 0) + 10;
    S.lv.gold = (S.lv.gold | 0) + 10; S.lv.regen = (S.lv.regen | 0) + 100;
    markDirty(); renderSpec();
    const after = R();
    return { before, after, n: before.filter((v, i) => v !== after[i]).length };
  });
  ok(moved.n >= 8, '[A7] 강화하면 값이 따라 움직인다(살아 있는 파생)',
     moved.n + '행 변화 / 13 — ' + moved.before.slice(0, 4).join(',') + ' → ' + moved.after.slice(0, 4).join(','));
  /* 음성항 — «이동 속도» 는 358 규약대로 **어떤 상태에서도 증가 0** 이다(축을 다시 이어붙이면 빨개진다).
     725 이관 — 표기가 «0%» 에서 «×1배»(= 증가 없음)로 갔다. 묻는 뜻은 한 글자도 안 바뀐다. */
  const mv = (await A.page.evaluate(ROWS)).find(r => /이동 속도/.test(r[0]));
  ok(!!mv && mv[1] === '×1배', '[A8] 358 규약 — «이동 속도» 는 그 상태에서도 증가 없음(×1배)', mv && mv.join(' = '));

  /* 라벨이 «표에서» 오는가 — 표를 바꾸면 화면이 따라온다(손 리터럴이면 안 따라온다) */
  const lab = await A.page.evaluate(() => {
    const keep = U.atk.name;
    U.atk.name = '★표파생시험★'; renderSpec();
    const hit = [...document.querySelectorAll('#spcList .spc-row')]
      .some(r => r.querySelector('.nm').textContent.trim() === '★표파생시험★');
    U.atk.name = keep; renderSpec();
    const back = document.querySelector('#spcList .spc-row .nm').textContent.trim();
    return { hit, back, keep };
  });
  ok(lab.hit, '[A9] 라벨은 `UPG` 표를 읽는다 — 표를 바꾸면 화면이 따라온다', '주입 반영 ' + lab.hit);
  eq('[A10] 원복하면 표의 이름으로 돌아온다', lab.back, lab.keep);

  /* ── [B] ② 아이콘 = 현재 코스튬 ────────────────────────────────── */
  console.log('\n=== [B] ② 종합스탯 아이콘 = 현재 착용 코스튬 ===');
  const B = await A.page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect(), sc = app.width / 1080;
    const box = document.querySelector('.spc-ava').getBoundingClientRect();
    const cv = document.getElementById('spcPor');
    const em = document.querySelector('.spc-ava .por-em');
    return { x: +((box.x - app.x) / sc).toFixed(1), y: +((box.y - app.y) / sc).toFixed(1),
             w: +(box.width / sc).toFixed(1), h: +(box.height / sc).toFixed(1),
             cw: cv && cv.width, ch: cv && cv.height, sc3: cv && cv.dataset.cossc,
             shown: !!cv && cv.style.display !== 'none',
             emOff: !em || getComputedStyle(em).display === 'none',
             av: cv && cv.dataset.cosav, cur: cosCur() };
  });
  ok(B.shown, '[B1] 코스튬 캔버스가 실제로 그려졌다(이모지 폴백 아님)', 'display = ' + (B.shown ? '보임' : '없음'));
  ok(B.emOff, '[B2] 방패 이모지 폴백은 꺼져 있다', B.emOff ? '꺼짐' : '**켜짐 — 아직 방패다**');
  eq('[B3] 아트 자리(측정표 20 §5) Δ0 — x', B.x, 451, 1);
  eq('[B3] 아트 자리 Δ0 — y', B.y, 510, 1);
  eq('[B3] 아트 자리 Δ0 — w×h', B.w + '×' + B.h, '179×180');
  eq('[B4] 캔버스 = knight idle0 잉크(44×46)의 정수 3배(356 등방)', B.cw + '×' + B.ch, '132×138');
  eq('[B5] 그린 코스튬 = 지금 착용분', B.av, B.cur);
  const swap = await A.page.evaluate(() => {
    const ids = AVATARS.map(a => a.id);
    const other = ids.find(id => id !== cosCur());
    S.avatar = other; S.avatars = Object.assign({}, S.avatars, { [other]: 1 });
    renderSpec();
    const av1 = document.getElementById('spcPor').dataset.cosav;
    S.avatar = 'av0'; renderSpec();
    return { other, av1, av0: document.getElementById('spcPor').dataset.cosav };
  });
  eq('[B6] 코스튬을 갈아입으면 아이콘이 따라온다', swap.av1, swap.other);
  eq('[B7] 되돌리면 아이콘도 되돌아온다', swap.av0, 'av0');

  /* ── [D] ④ 문구 (같은 페이지에서 이어 본다) ─────────────────────── */
  console.log('\n=== [D] ④ 상단 게이머 아이디 = «업데이트 예정» ===');
  const D = await A.page.evaluate(() => {
    openProfile(); renderProfile();
    const pf = document.getElementById('pfGid').textContent.trim();
    openSpec();
    const tf = sel => { const el = document.querySelector(sel);
      return el ? getComputedStyle(el).transform : 'n/a'; };
    return { pf, spc: document.getElementById('spcGid').textContent.trim(),
             nick: document.getElementById('spcNick').textContent.trim(), sNick: S.nick,
             cf: (typeof spcGamerId === 'function') ? spcGamerId() : null,
             /* ⚠ 두 자리의 마크업이 다르다 — 19 는 `<div id=pfGid><i>…`, 20 은 `<i id=spcGid>` 자신이
                그 `<i>` 다(`.spc-gid>i` 가 걸리는 노드). 선택자를 베끼면 `n/a` 로 헛빨강이 난다. */
             tfPf: tf('#pfGid>i'), tfSpc: tf('#spcGid') };
  });
  eq('[D1] 20 종합스탯 상단 줄', D.spc, '업데이트 예정');
  eq('[D2] 19 프로필 상단 줄(한 팝업 = 한 문구)', D.pf, '업데이트 예정');
  ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(D.pf + D.spc), '[D3] 그 자리에 uuid 가 되살아나지 않았다', D.pf + ' / ' + D.spc);
  eq('[D4] 닉네임은 **안 건드렸다** — 여전히 S.nick 이다', D.nick, D.sNick);
  ok(/^[0-9a-f]{8}-/.test(D.cf || ''), '[D5] 55 설정·고객지원이 쓰는 `spcGamerId` 는 그대로 산다(스코프 밖 불변)', D.cf);
  eq('[D6] 죽은 파생 함수 `pfGamerId` 는 선언째 사라졌다(399 처방)',
     (bare.match(/pfGamerId/g) || []).length, 0);
  eq('[D7] 문구는 상수 한 곳에서만 온다(`SPC_TBD`)', (bare.match(/'업데이트 예정'/g) || []).length, 1);
  /* [D8] 1회차 비평(B)이 잡은 자리 — 두 줄에는 **라틴 uuid 폭 회수** 보정(`scaleX 1.14`·`1.155`)이
     걸려 있었다. 문자열이 한글이 된 지금 그 값은 회수가 아니라 **왜곡**이다(380·689 라틴 폴백 규약의 반대 자리). */
  eq('[D8] 19 상단 줄에 라틴 폭 보정이 안 걸려 있다', D.tfPf, 'none');
  eq('[D8] 20 상단 줄에도 안 걸려 있다', D.tfSpc, 'none');
  ok(A.errs.length === 0, '[D9] 콘솔 에러 0건', A.errs.slice(0, 3).join(' | ') || '없음');
  await A.ctx.close();

  /* ── [C] ③ 두 팝업이 한 상자 ───────────────────────────────────── */
  console.log('\n=== [C] ③ 탭을 눌러도 상자가 안 튄다 — 프레임 4종 ===');
  const HS = [2600, 2280, 1920, 1600];
  const seen = {};
  for (const H of HS) {
    const P = await newPage(browser, H);
    const r = await openBoth(P.page);
    seen[H] = r;
    const d = (r.pf && r.spc) ? Math.max(Math.abs(r.spc.x - r.pf.x), Math.abs(r.spc.y - r.pf.y),
                                         Math.abs(r.spc.w - r.pf.w), Math.abs(r.spc.h - r.pf.h)) : 999;
    ok(d <= 0.5, `[C-${H}] 19 프로필 ↔ 20 종합스탯 bbox Δ0`,
       r.pf && r.spc ? `19 ${r.pf.x},${r.pf.y} ${r.pf.w}×${r.pf.h}  =  20 ${r.spc.x},${r.spc.y} ${r.spc.w}×${r.spc.h}` : '못 읽음');
    ok(P.errs.length === 0, `[C-${H}] 콘솔 에러 0건`, P.errs.slice(0, 2).join(' | ') || '없음');
    await P.ctx.close();
  }
  /* 기준 프레임의 절대값 — «둘이 같다» 만 보면 **둘 다 엉뚱한 자리로 가도 초록**이다 */
  const s = seen[2280].spc;
  eq('[C1] 2280 절대 자리 x(측정표 19·20)', s.x, 92, 1);
  eq('[C1] 2280 절대 자리 y', s.y, 431, 1);
  eq('[C1] 2280 절대 크기 w', s.w, 896, 1);
  eq('[C1] 2280 절대 크기 h', s.h, 1396, 1);
  /* 351 계약 — 탭 줄 상변 1692 는 폴리시가 못 박아 둔 절대값이다(705 가 상자를 옮겨도 Δ0) */
  eq('[C2] 2280 탭 줄 상변 = 1692 (351 §8-b 계약)', seen[2280].tabs.y, 1692, 1);
  ok(seen[1600].tabs.y + seen[1600].tabs.h <= seen[1600].body.y + seen[1600].body.h + 1,
     '[C3] 1600 탭 줄이 크림 본문 안에 남는다(351 §8-e 자매)',
     `탭 하변 ${(seen[1600].tabs.y + seen[1600].tabs.h).toFixed(1)} ≤ 본문 ${(seen[1600].body.y + seen[1600].body.h).toFixed(1)}`);
  /* [C4] — `verify351` [8-f] 이관의 **짝**이다. 351 은 20 만 열어서 «탭 줄이 앱 탭바를 문다» 를 봤는데,
     705 뒤로 그 자리는 19 프로필의 하단 토글 줄과 **같은 자리**다(같은 상자를 같은 규칙으로 재니까).
     그러니 물어야 할 것은 «탭바를 무는가» 가 아니라 «19 와 같은 줄에 서는가» 이고, 그 답은
     두 팝업을 다 열어 본 이 자만 낼 수 있다. 프레임 4종 전부에서 본다. */
  HS.forEach(H => {
    const r = seen[H];
    ok(r.tgl && r.tabs && Math.abs(r.tabs.y - r.tgl.y) <= 1,
       `[C4-${H}] 20 탭 줄이 19 하단 토글 줄과 같은 자리`,
       r.tgl && r.tabs ? `19 토글 ${r.tgl.y} ↔ 20 탭 ${r.tabs.y}` : '못 읽음');
  });

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────── */
  console.log('\n=== [R] 되돌림 — 수리 전으로 되돌리면 실제로 빨개지는가 ===');
  /* ⚑ **이관(2026-09-02, 작업 754 3회차 · 333 처방 — 지우지 않고 «어느 프레임에서 갈리는가» 를 옮겼다)**
     이 항은 1920 에서 «Δ > 100» 을 물었다. 그 문턱은 705 당시 **19 가 상단 앵커**(`top:clamp(…,431px,…)`)
     라서 성립했다 — 되돌린 20(flex 중앙)과 상단에 못 박힌 19 가 1920 에서 180px 갈렸던 것이다.
     754 가 그 공유 축을 **중앙**으로 옮기자(`.pf, .spc{top:calc(50% − 709px + --pfsh/2)}`) 두 모델이
     1920 에서 **같은 자리로 수렴한다**(실측 Δ 1.0px) — 되돌려도 안 빨개지는 자, 즉 헛초록이 된다.
     ⚠ 705 의 주장이 틀렸던 게 아니다. 되레 [C] 는 더 세게 참이 됐다 — 수리 뒤 19·20 은 프레임
       5종 전부에서 **Δ 0.0px** 다(옛 축에서는 2280 에서만 0 급이었다).
     ⇒ 갈리는 자리는 **1600** 으로 옮겼다. 옛 껍데기는 패딩으로 프레임에서 360px 을 먹어
       `max-height:100%` 가 **56px 먼저** 물린다(되돌림 h1240 ↔ 현행 h1296). 실측 —
         1600 Δ **56.0** · 1841 1.0 · 1920 1.0 · 2280 1.0 · 2600 1.0
       그래서 문턱은 «> 20»(되돌림 56 ↔ 현행 0 사이, 양쪽에 여유). 짝으로 **음성항**을 같이 세워
       «되돌림 없이는 0» 을 못박는다 — 문턱만 낮추면 무르게 푼 수리가 되기 때문이다. */
  {
    const dOf = (r) => Math.max(Math.abs(r.spc.x - r.pf.x), Math.abs(r.spc.y - r.pf.y),
                                Math.abs(r.spc.w - r.pf.w), Math.abs(r.spc.h - r.pf.h));
    const P = await newPage(browser, 1600, REVERT_BOX);
    const r = await openBoth(P.page);
    ok(dOf(r) > 20, '[R1] `#specw` 를 flex+패딩으로 되돌리면 **1600** 에서 상자가 튄다(= [C] 가 빨개진다)',
       `Δ ${dOf(r).toFixed(1)}px (19 h${r.pf.h} ↔ 20 h${r.spc.h} — 패딩 360 이 max-height 를 먼저 문다)`);
    await P.ctx.close();
    const Q = await newPage(browser, 1600);           /* 음성항 — 되돌림 없이 같은 자리에서 재면 0 이어야 한다 */
    const q = await openBoth(Q.page);
    ok(dOf(q) <= 1, '[R1b 음성항] 되돌림을 안 심으면 같은 1600 에서 Δ 0 (문턱을 낮춰 통과시킨 게 아니다)',
       `Δ ${dOf(q).toFixed(1)}px`);
    await Q.ctx.close();
  }
  {
    const P = await newPage(browser, 2280);
    await openBoth(P.page);
    /* ⚠ 캔버스를 손으로 `display:none` 하는 것은 되돌림이 **아니다**(초판이 그렇게 짰다가 헛빨강을 냈다) —
       `porPaint` 는 «칠하기에 실패했을 때» 폴백을 켜므로, 되돌림은 **칠하기를 실패시키는 것**이다.
       아틀라스를 잠깐 뺏어 다시 그리게 하면 수리 전 그림(🛡️)이 그 자리에 돌아온다. */
    const r = await P.page.evaluate(() => {
      const keep = ATLAS.knight.image;
      ATLAS.knight.image = null; renderSpec();
      const cv = document.getElementById('spcPor'), em = document.querySelector('.spc-ava .por-em');
      const out = { shown: cv.style.display !== 'none',
                    emOn: !!em && getComputedStyle(em).display !== 'none',
                    emTxt: em ? em.textContent.trim() : '' };
      ATLAS.knight.image = keep; renderSpec();
      out.backShown = cv.style.display !== 'none';
      out.backEm = !!em && getComputedStyle(em).display !== 'none';
      return out;
    });
    ok(!r.shown && r.emOn, '[R2] 칠하기를 실패시키면 수리 전 방패 이모지가 그 자리에 돌아온다(= [B1]·[B2] 가 빨개진다)',
       `캔버스 ${r.shown ? '보임' : '꺼짐'} · 폴백 «${r.emTxt}» ${r.emOn ? '보임' : '꺼짐'}`);
    ok(r.backShown && !r.backEm, '[R2b] 아틀라스를 돌려주면 다시 코스튬이 선다(자가 한쪽으로 굳지 않았다)',
       `캔버스 ${r.backShown ? '보임' : '꺼짐'} · 폴백 ${r.backEm ? '보임' : '꺼짐'}`);
    /* 라벨을 손 리터럴로 되돌리면 [A9] 의 «표 파생» 이 깨진다 */
    const r2 = await P.page.evaluate(() => {
      const keep = U.atk.name;
      const list = document.getElementById('spcList');
      list.innerHTML = '<div class="spc-row"><span class="nm"><i>햄지 공격력</i></span><span class="vl">100%</span></div>';
      const bad = [...list.querySelectorAll('.spc-row')].filter(r => /햄지/.test(r.textContent)).length;
      renderSpec();
      const back = [...list.querySelectorAll('.spc-row')].filter(r => /햄지/.test(r.textContent)).length;
      return { bad, back, keep };
    });
    ok(r2.bad === 1 && r2.back === 0,
       '[R3] «햄지 100%» 를 주입하면 [A2] 가 세는 값이 실제로 1 이 된다(그리고 다시 그리면 0)',
       `주입 ${r2.bad} → 재렌더 ${r2.back}`);
    await P.ctx.close();
  }

  await browser.close();
  console.log('\nVERIFY705 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
