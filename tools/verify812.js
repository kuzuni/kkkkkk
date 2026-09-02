#!/usr/bin/env node
/* 작업 812 게이트 — 「20 종합스탯 리스트가 마지막 행을 **레퍼런스와 같은 양**으로 끊는다」
 *
 *   node tools/verify812.js
 *
 * 등재문(812, 754 4회차 비평 CB·CC 독립 일치): 스크롤 뷰포트 높이가 행 피치(60)의 배수가 아니라
 * 마지막 행이 글리프 한복판에서 잘린다 — «더 있다» 는 신호가 아니라 «잘린 자국» 으로 읽힌다.
 * 처방 갈래 셋이 적혀 있었다: ⓐ 피치 배수 스냅 · ⓑ 하단 페이드 마스크 · ⓒ 스크롤바 노출.
 *
 * 재현(`probe812`)이 **셋 다 밟지 않은 한 겹 아래**를 찍었다:
 *   · **레퍼런스도 마지막 행을 자른다** — 측정표 20 §7-1 정오표(ref bbox y977–1736 h760 ·
 *     1행 밴드 시작 y1000 · 피치 60) ⇒ 13행이 `1736 − (1000+60×12)` = **16px 노출**된 채 클리핑.
 *     5회차에 비평가 I·J 가 «13행 슬라이버 누락» 으로 독립 지적한 그 자리다 = 지우면 ref 를 지운다.
 *   · 우리 실측 남은 높이: 1600 **38px**(피치의 63%) · 1841·1920·2280·2600 **17px**(= ref).
 *     ⇒ 결손은 «자른다» 가 아니라 **«자르는 양이 프레임마다 다르다»** 이고, 벗어나는 프레임은
 *     **1600 하나**다(등재문의 «1841 15px» 은 705·754 가 `.spc-body` 를 옮기기 전의 낡은 값).
 * ⇒ 채택 = ⓐ 의 **정정판**: 피치 배수가 아니라 «패딩 + 온전한 행 n개 + **ref 슬라이버**» 로 내림 스냅.
 *   ⓑ·ⓒ 는 ref 에 없는 잉크를 더한다(ref 는 페이드도 스크롤바도 없다 — 측정표 §7-1·본문).
 *
 * 지킬 것:
 *   [A] 프레임 5종 전부 남은 높이 = **ref 슬라이버(16~17px)** — «한 값» 이자 «ref 값»
 *   [B] 기준 프레임(2280)은 뷰포트 h **760 · top 443.5 Δ0px** — 레퍼런스 자리를 안 옮겼다
 *   [C] 과교정 잠금 — 스냅이 **내림**이라 그릇이 커지지 않는다: 리스트 하변 ≤ 탭 줄 상변(겹침 0),
 *       그리고 버린 양이 한 행(60px) 미만이다(«한 행을 통째로 버리는 스냅» 금지)
 *   [D] 스크롤로 **끝까지 닿는다** — 마지막 행이 실제로 전부 보이는 자리까지 스크롤된다(잘림 ≠ 소실)
 *   [E] 선언 한 벌 — 슬라이버가 `--spc-slv` **한 곳**에서 온다(같은 수를 두 곳에 적으면 한쪽만 늙는다)
 *   [R] 되돌림 시험 — ① 옛 한 줄 사본은 1600 에서 38px 로 돌아간다 ·
 *       ② 등재문 ⓐ 를 **문자 그대로**(`floor(H/60)·60`) 쓴 사본은 기준 프레임 2280 이 ref 에서 벗어난다
 *
 * ⚑ 왜 [B] 가 있는가 — [A] 만 있으면 «전 프레임을 640 으로 못 박기» 로도 초록이 된다(그러면 기준
 *   프레임이 ref 에서 120px 짧아진다). [B] 가 반대편을 잡는다.
 * ⚠ 19·20 은 «선언 한 벌» 을 읽는 한 팝업의 두 탭이다(705) — 이 자를 고칠 때 `verify705`·`verify754` §6 회귀.
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
const r1 = v => +v.toFixed(1);

/* 화면비 5종 = 프레임 5종 (verify754 와 같은 목록 — `fit()` 이 1600..2600 으로 clamp 한다) */
const FRAMES = [
  { id: '9:13.3+', h: 1600 },
  { id: 'shortf−', h: 1841 },
  { id: '9:16',    h: 1920 },
  { id: '9:19',    h: 2280 },   /* 기준 해상도 */
  { id: 'clamp↑',  h: 2600 },
];
const PITCH = 60;      /* 측정표 20 §7-2 «행 피치 60px» */
const REF_H = 760;     /* 측정표 20 §7-1 정오표 — ref 리스트 bbox h760 */
const REF_TOP = 443.5; /* `.spc-body` local top (abs 893 = ref 977 − 84) */
const REF_SLV_LO = 16, REF_SLV_HI = 17;   /* ref 실측 16 · 우리 기준 프레임 실측 17(반올림 한 겹) */
const TOL = 1.5;

/* 리스트를 «설계 px» 으로 읽는다 — `fit()` 스케일을 되돌린다(probe705·probe812 와 같은 눈).
   ⚠ **높이·피치·겹침은 `clientHeight`/`offsetTop` 으로만 읽는다**(probe782·verify798 교훈) —
   `getBoundingClientRect` 는 `fit()` 스케일과 60 쥬시 등장 연출의 transform 이 섞여
   같은 60px 행이 실행마다 60.0/60.2 로 갈린다(초판이 그래서 4번에 1번 빨갰다).
   rect 는 «자리»(top 443.5 처럼 소수인 값)를 볼 때만 쓴다. */
const READ = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  const sc = app.width / 1080;
  const el = document.getElementById('spcList');
  const tabs = document.querySelector('.spc-tabs');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const t = tabs ? tabs.getBoundingClientRect() : null;
  const cs = getComputedStyle(el);
  const rows = [...el.querySelectorAll('.spc-row')];
  return {
    frameH: +(app.height / sc).toFixed(1),
    top: +((r.y - app.y - (document.querySelector('.spc-body').getBoundingClientRect().y - app.y)) / sc).toFixed(1),
    h: +(r.height / sc).toFixed(1),
    bottom: +((r.y + r.height - app.y) / sc).toFixed(1),
    tabsTop: t ? +((t.y - app.y) / sc).toFixed(1) : null,
    padTop: +(parseFloat(cs.paddingTop) || 0).toFixed(1),
    slv: (cs.getPropertyValue('--spc-slv') || '').trim(),
    rows: rows.length,
    /* ↓ 레이아웃 px (스케일·연출 transform 이 안 섞인다) */
    ch: el.clientHeight,
    pitch: rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : null,
    offTop: el.offsetTop, offBottom: el.offsetTop + el.offsetHeight,
    tabsOff: tabs ? tabs.offsetTop : null,
    scrollH: el.scrollHeight, clientH: el.clientHeight,
  };
};

/* 끝까지 스크롤한 뒤 «마지막 행이 전부 보이는가» 를 묻는다 */
const READ_END = () => {
  const el = document.getElementById('spcList');
  el.scrollTop = el.scrollHeight;
  const rows = [...el.querySelectorAll('.spc-row')];
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const lb = last.getBoundingClientRect(), eb = el.getBoundingClientRect();
  return { visible: +(Math.min(lb.bottom, eb.bottom) - Math.max(lb.top, eb.top)).toFixed(1),
           full: +lb.height.toFixed(1), left: +(el.scrollHeight - el.clientHeight - el.scrollTop).toFixed(1) };
};

const open = async (browser, H, patch) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof openProfile === 'function' && typeof openSpec === 'function');
  await page.waitForTimeout(500);
  if (patch) await page.addStyleTag({ content: patch });
  await page.evaluate(() => { openProfile(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { openSpec(); });
  await page.waitForTimeout(350);
  /* 등장 연출이 멎을 때까지 — 애니 중에 재면 스케일이 섞인다(probe705 초판 교훈) */
  for (let i = 0, same = 0, prev = ''; i < 30 && same < 3; i++) {
    const cur = await page.evaluate(() => { const e = document.querySelector('.spc');
      if (!e) return 'none'; const r = e.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(','); });
    same = cur === prev ? same + 1 : 0; prev = cur;
    await page.waitForTimeout(50);
  }
  return { ctx, page };
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });

  /* ── [A]·[B]·[C] 프레임 5종 ─────────────────────────────────────────── */
  blk('A · B · C — 프레임 5종의 «끊는 양» 과 기준 프레임 Δ0');
  const seen = [];
  for (const F of FRAMES) {
    const { ctx, page } = await open(browser, F.h, null);
    const m = await page.evaluate(READ);
    await ctx.close();
    if (!m) { ok(false, `[A] ${F.id}(${F.h}) 리스트를 읽었다`); continue; }
    const rem = r1((m.ch - m.padTop) % PITCH);
    seen.push({ F, m, rem });
    ok(rem >= REF_SLV_LO - 1 && rem <= REF_SLV_HI + 1,
      `[A] ${F.id}(${F.h}) 마지막 행 남은 높이 = ref 슬라이버`,
      `${rem}px (ref ${REF_SLV_LO}~${REF_SLV_HI}) · 뷰포트 ${m.ch} · 온전한 행 ${Math.floor((m.ch - m.padTop) / PITCH)}`);
    ok(m.pitch === PITCH, `[A] ${F.id} 행 피치가 ${PITCH}px 이다 (자가 쓰는 나눗셈의 전제)`, String(m.pitch));
    /* [C] 겹침 0 — 스냅이 «내림» 이라 그릇이 커지지 않는다 */
    ok(m.tabsOff !== null && m.offBottom <= m.tabsOff + TOL,
      `[C] ${F.id} 리스트 하변 ≤ 탭 줄 상변 (겹침 0)`,
      `하변 ${m.offBottom} ≤ 탭 ${m.tabsOff} (여유 ${r1(m.tabsOff - m.offBottom)})`);
  }
  const rems = seen.map(s => s.rem);
  ok(new Set(rems).size === 1, '[A] 다섯 프레임이 **한 값**으로 끊는다 (수리 전 38 · 17 · 17 · 17 · 17)', rems.join(' · '));

  const at2280 = seen.find(s => s.F.h === 2280);
  ok(!!at2280 && Math.abs(at2280.m.ch - REF_H) <= TOL,
    '[B] 기준 프레임(2280) 뷰포트 높이 = ref 760 **Δ0px**', at2280 ? `${at2280.m.ch}` : 'x');
  /* ⚠ 자리도 `offsetTop`(레이아웃 px)으로 묻는다 — rect 로 물으면 팝업 등장 연출이 안 끝난 프레임에서
     443.5 가 445.8 로 읽혀 4번에 1번 빨개졌다(위 READ 주석과 같은 함정, 반올림 0.5 는 TOL 안). */
  ok(!!at2280 && Math.abs(at2280.m.offTop - REF_TOP) <= TOL,
    '[B] 기준 프레임 리스트 top = ref 443.5 **Δ0px** (자리를 안 옮겼다)', at2280 ? `${at2280.m.offTop}` : 'x');
  for (const s of seen.filter(s => s.F.h >= 1841)) {
    ok(Math.abs(s.m.ch - REF_H) <= TOL, `[B] ${s.F.id}(${s.F.h}) 도 760 — 스냅이 ref 프레임을 **안 건드린다**`, String(s.m.ch));
  }
  /* [C] 버리는 양이 한 행 미만 — «한 행을 통째로 버리는 스냅» 금지 */
  const raw1600 = 661;   /* 수리 전 실측(probe812) — 같은 자리의 스냅 «전» 높이 */
  const cut = seen.find(s => s.F.h === 1600);
  ok(!!cut && raw1600 - cut.m.ch < PITCH,
    '[C] 스냅이 버리는 양 < 한 행(60px) — 스크롤 예산을 통째로 깎지 않는다',
    cut ? `1600: ${raw1600} → ${cut.m.ch} (−${r1(raw1600 - cut.m.ch)}px)` : 'x');

  /* ── [D] 스크롤로 끝까지 닿는다 ─────────────────────────────────────── */
  blk('D — 잘림은 «어포던스» 지 «소실» 이 아니다');
  for (const H of [1600, 2280]) {
    const { ctx, page } = await open(browser, H, null);
    const before = await page.evaluate(READ);
    const end = await page.evaluate(READ_END);
    await ctx.close();
    ok(!!end && Math.abs(end.visible - end.full) <= 1,
      `[D] ${H} 끝까지 스크롤하면 마지막 행이 **전부** 보인다`,
      end ? `보임 ${end.visible} / 행 ${end.full} · 남은 스크롤 ${end.left}` : 'x');
    ok(!!before && before.scrollH > before.clientH,
      `[D] ${H} 스크롤 그릇이다 (콘텐츠 ${before ? before.scrollH : '?'} > 뷰포트 ${before ? before.clientH : '?'})`);
  }

  /* ── [E] 선언 한 벌 ─────────────────────────────────────────────────── */
  blk('E — 슬라이버가 «한 곳» 에서 온다');
  const decl = (code.match(/\.spc-list\{[\s\S]*?\}/) || [''])[0];
  ok(/--spc-slv:\s*17px/.test(decl), '[E] `--spc-slv` 가 `.spc-list` 에 **한 번** 선언돼 있다',
     (decl.match(/--spc-slv:[^;]*/) || [''])[0].trim());
  ok((code.match(/--spc-slv:/g) || []).length === 1, '[E] 그 선언이 저장소에 **하나뿐**이다 (사본 0)',
     (code.match(/--spc-slv:/g) || []).length + '건');
  const snap = (code.match(/@supports \(height: round\(down[\s\S]*?\n  \}/) || [''])[0];
  ok(/var\(--spc-slv\)/.test(snap) && (snap.match(/var\(--spc-slv\)/g) || []).length === 2,
     '[E] 스냅 식이 그 변수를 **읽는다**(빼는 쪽·더하는 쪽 둘 다 — 손 상수 17 을 다시 적으면 갈린다)',
     (snap.match(/var\(--spc-slv\)/g) || []).length + '회');
  ok(/round\(down,[\s\S]*?60px\)/.test(snap), '[E] 스냅 단위가 행 피치 60px 이다', 'round(down, …, 60px)');
  ok(/height:min\(760px, calc\(100% - 596px\)\)/.test(decl),
     '[E] `round()` 미지원 엔진 폴백(옛 한 줄)이 남아 있다 — ref 프레임에서는 같은 값이다', '폴백 1줄');

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────────── */
  blk('R — 되돌림: 무르게 푼 수리가 아님을 못박는다');
  {
    /* R1 옛 한 줄 사본 — 1600 이 38px 로 돌아간다 */
    const revert = `.spc-list{height:min(760px, calc(100% - 596px))!important}`;
    const { ctx, page } = await open(browser, 1600, revert);
    const m = await page.evaluate(READ);
    await ctx.close();
    const rem = m ? r1((m.ch - m.padTop) % PITCH) : null;
    ok(rem !== null && rem > REF_SLV_HI + 1,
      '[R1] 옛 한 줄 사본을 주입하면 1600 이 **ref 슬라이버 밖**으로 돌아간다 (자가 실제로 이것을 잡는다)',
      `${rem}px (수리 전 실측 38)`);
  }
  {
    /* R2 등재문 ⓐ 를 문자 그대로 — 피치 «배수» 스냅. 기준 프레임이 ref 에서 벗어난다 */
    const literal = `.spc-list{height:min(760px, round(down, calc(100% - 596px), 60px))!important}`;
    const { ctx, page } = await open(browser, 2280, literal);
    const m = await page.evaluate(READ);
    await ctx.close();
    const rem = m ? r1((m.ch - m.padTop) % PITCH) : null;
    ok(m && Math.abs(m.ch - REF_H) > TOL,
      '[R2] ⓐ 를 **문자 그대로** 쓴 사본은 기준 프레임 2280 이 ref 760 에서 벗어난다 (그래서 안 골랐다)',
      m ? `${m.ch} (ref ${REF_H}) · 남은 높이 ${rem}px` : 'x');
  }
  {
    /* R3 슬라이버를 0 으로 — «자름 0» 은 ref 가 아니다 */
    const zero = `.spc-list{--spc-slv:0px!important}`;
    const { ctx, page } = await open(browser, 2280, zero);
    const m = await page.evaluate(READ);
    await ctx.close();
    const rem = m ? r1((m.ch - m.padTop) % PITCH) : null;
    ok(m && Math.abs(m.ch - REF_H) > TOL,
      '[R3] 슬라이버를 0 으로 두면(= «자름 0») 기준 프레임이 ref 에서 벗어난다 — ref 는 자른다',
      m ? `${m.ch} (ref ${REF_H}) · 남은 높이 ${rem}px` : 'x');
  }

  await browser.close();
  console.log(`\n=== verify812: ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'} ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
