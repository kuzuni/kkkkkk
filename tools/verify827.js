#!/usr/bin/env node
/* 작업 827 게이트 — 「22 퀘스트 리스트가 마지막 행을 **레퍼런스와 같은 양**으로 끊는다」
 *
 *   node tools/verify827.js
 *
 * 등재문(827, 754 9회차 비평 CP·CQ 독립 일치): 뷰포트 높이가 행 피치 200px 의 배수가 아니라
 * 마지막 행을 글리프 한복판에서 자른다 — 1600 에서 −32~33px · 1841~2600 에서 −13px.
 * «812(20 종합스탯)와 같은 계열» 로 등재됐고 «812 와 한 세션» 을 권했다.
 *
 * 재현(`probe827`)이 등재문을 **두 군데 정정**했다(338 규칙):
 *   ① **1841~2600 의 −13px 은 결손이 아니라 레퍼런스 그 자체다.** 측정표 22 §3·§4 —
 *      패널 ref y628–1626(h999) · 상단 패딩 33 · 5행 y1461–1626 = **h166 · 잘림 13px**.
 *      ref 콘텐츠 965 자신이 200 의 배수가 아니다 ⇒ **«피치 배수 스냅» 은 ref 를 지운다**
 *      (812 §6 가 «ref 가 남기는 양으로 스냅하라» 고 넘긴 그대로다).
 *   ② **등재문이 잰 5프레임이 결손의 밑바닥을 가리고 있었다.** 1600 은 남은 높이 147 로
 *      내용을 **2px**(`.qs-b` 하변)만 먹는다 — 행 안에서 내용은 상단 기준 **149px** 에서 끝나고
 *      그 아래 30px 는 빈 둥근 모서리다. 진짜 «글리프 한복판» 은 **그 사이 프레임**에 있었다:
 *        1653 남은 0/잘림 179 · **1700 남은 47 — 보상 보석 −96px · [보상 받기] −102px** ·
 *        1750 남은 97 — −46/−52px · 1800 남은 147 — −2px.
 *      `.shortf` 안에서 본문이 연속으로 눌리므로 남은 높이가 0~199 를 **한 바퀴 돈다**.
 * ⇒ 채택 = 812 의 ⓐ′ 정정판 + **빌림**: 「패딩 33 + 온전한 행 n개 + ref 슬라이버 166」 로 스냅하되,
 *   모자란 만큼은 토글 아래 죽은 여백 43px 에서 **빌리고**(`--qs-brw` · 12px 은 남긴다),
 *   빌려서 못 닿으면 한 칸 내려 스냅하고 버리는 만큼은 패널↔[모두 받기] 간격이 받는다.
 *   ⚠ **키우는 길은 막혀 있다** — 짧은 프레임의 `#app.shortf #modal{padding:142px/180px}` 은
 *   금지구역 바닥값이라(390·351) 상자가 이미 상한에 붙어 있다. 그래서 «빌림» 은 상자 **안**에서만 한다.
 *
 * 지킬 것:
 *   [A] 프레임 9종(경계 5 + 사이 4) 전부 남은 높이 = **ref 슬라이버 166 · 잘림 13** — 한 값이자 ref 값
 *   [B] 기준 프레임(2280) Δ0px — 패널 h 999 · 간격 21 · [모두 받기]·토글 ref 자리 (`verify22` 와 같은 자)
 *   [C] 과교정 잠금 — ① 내용 잠식 0px ② 버리는 양 < 한 행(200) ③ 토글 아래 여백 ≥ 12px
 *       ④ 패널·버튼·토글이 본문(`overflow:hidden`) 밖으로 안 나간다 (LESSONS 20-④ 재발 방지)
 *   [D] 잘림 ≠ 소실 — 끝까지 스크롤하면 마지막 행이 **전부** 보인다
 *   [E] 선언 한 벌 — 슬라이버가 `--qs-slv` **한 곳**에서 오고 `round()` 폴백(`bottom:316px`)이 남아 있다
 *   [R] 되돌림 3종 — 무르게 푼 수리가 아님을 못박는다
 *
 * ⚑ 왜 [B] 가 있는가 — [A] 만 있으면 «전 프레임을 799 로 못 박기» 로도 초록이 된다(그러면 기준
 *   프레임이 ref 에서 200px 짧아진다). [B] 가 반대편을 잡는다. 812 [B] 와 같은 이유다.
 * ⚠ 이 자를 고칠 때 회귀: `verify22`(패널 999·간격 21·토글 1801) · `verify322`(행 버튼 레드닷 클립) ·
 *   `verify95`(스크롤 그릇) · `verify754` §6(그릇 앵커) · `verify799`(업적 퀘스트 행).
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
const r1 = v => +(+v).toFixed(1);

/* 경계 5종(verify754 와 같은 목록)에 **사이 4종**을 더한다 — 결손이 거기 살고 있었다(probe827 [2]) */
const FRAMES = [
  { id: '9:13.3+', h: 1600 },
  { id: '사이',     h: 1653 },
  { id: '사이',     h: 1700 },
  { id: '사이',     h: 1750 },
  { id: '사이',     h: 1800 },
  { id: 'shortf−', h: 1841 },
  { id: '9:16',    h: 1920 },
  { id: '9:19',    h: 2280 },   /* 기준 해상도 */
  { id: 'clamp↑',  h: 2600 },
];
const PITCH = 200;      /* 측정표 22 §4 «세로 pitch 200» */
const ROWH = 179;       /* 측정표 22 §4 «행 height 179» */
const REF_SLV = 166;    /* 측정표 22 §4 «5행 h166» — ref 가 마지막 행에 남기는 양 */
const REF_CUT = ROWH - REF_SLV;   /* 13px */
const INK_BOT = 149;    /* 행 안에서 내용이 끝나는 자리(`.qs-b` 하변) — probe827 [5] 실측 */
const BASE_H = 999;     /* 기준 프레임 패널 높이 (측정표 §3 h999) */
const BASE_GAP = 20;    /* 패널 하변 ↔ [모두 받기] 상변 (ref 21 · 구현 실측 20) */
const TG_MIN = 12;      /* 토글 아래 남겨야 하는 여백 — `--qs-brwmax:31px` 의 짝(43 − 31) */
const TOL = 1.5;

/* 설계 px 으로 읽는다 — `fit()` 스케일을 되돌린다(probe827 과 같은 눈).
   ⚠ 높이·피치는 `clientHeight`/`offsetTop` 으로 읽는다(probe782·verify798 교훈) —
   rect 는 «자리» 를 볼 때만 쓴다. */
const READ = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  const sc = app.width / 1080;
  const el = document.querySelector('.qs-pn');
  if (!el) return null;
  const body = document.querySelector('.q22 .mbody');
  const all = document.querySelector('.qs-all');
  const tg = document.querySelector('.qs-tg');
  const cs = getComputedStyle(el);
  const bcs = getComputedStyle(body);
  const px = v => +(v / sc).toFixed(2);
  const br = body.getBoundingClientRect(), r = el.getBoundingClientRect();
  const rows = [...el.querySelectorAll('.qs-r')];
  const out = {
    frameH: +(app.height / sc).toFixed(1),
    bodyH: px(br.height),
    top: px(r.y - br.y),
    h: el.clientHeight,                       /* 테두리 0 · box-sizing:border-box */
    padTop: +(parseFloat(cs.paddingTop) || 0).toFixed(1),
    slv: (bcs.getPropertyValue('--qs-slv') || '').trim(),
    brw: (bcs.getPropertyValue('--qs-brw') || '').trim(),
    rows: rows.length,
    pitch: rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : null,
    rowH: rows.length ? rows[0].offsetHeight : null,
    allTop: px(all.getBoundingClientRect().y - br.y),
    allH: px(all.getBoundingClientRect().height),
    tgTop: px(tg.getBoundingClientRect().y - br.y),
    tgBot: px(tg.getBoundingClientRect().bottom - br.y),
    gapAll: px(all.getBoundingClientRect().y - r.bottom),
    gapTg: px(tg.getBoundingClientRect().y - all.getBoundingClientRect().bottom),
    scrollH: el.scrollHeight, clientH: el.clientHeight,
    /* 본문(overflow:hidden) 밖으로 나간 것 — LESSONS 20-④ */
    outside: ['.qs-pn', '.qs-all', '.qs-tg'].filter(s => {
      const b = document.querySelector(s).getBoundingClientRect();
      return b.bottom > br.bottom + 0.5 || b.y < br.y - 0.5;
    }),
    /* 클립선 아래로 잘려 나간 «내용» — 0 이어야 한다 */
    eaten: (() => {
      const clip = r.bottom; let worst = 0, who = '';
      rows.forEach((row, i) => {
        const rb = row.getBoundingClientRect(); if (rb.y >= clip) return;
        [...row.children].forEach(c => {
          const b = c.getBoundingClientRect();
          if (b.bottom > clip + 0.5 && b.y < clip) {
            const cut = (b.bottom - clip) / sc;
            if (cut > worst) { worst = cut; who = (i + 1) + '행 .' + String(c.className).split(' ')[0]; }
          }
        });
      });
      return { px: +worst.toFixed(1), who };
    })(),
  };
  out.content = out.h - out.padTop;
  out.full = Math.floor(out.content / 200);
  out.rem = out.content - out.full * 200;
  return out;
};

/* 끝까지 스크롤한 뒤 «마지막 행이 전부 보이는가» */
const READ_END = () => {
  const el = document.querySelector('.qs-pn');
  el.scrollTop = el.scrollHeight;
  const rows = [...el.querySelectorAll('.qs-r')];
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
  await page.waitForFunction(() => typeof openQuest === 'function');
  await page.waitForTimeout(500);
  if (patch) await page.addStyleTag({ content: patch });
  await page.evaluate(() => { openQuest(); });
  await page.waitForTimeout(400);
  return { ctx, page };
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);
  try {
    blk('A] 프레임 9종 — 마지막 행이 ref 와 같은 양으로 끊긴다');
    const M = [];
    for (const f of FRAMES) {
      const o = await open(browser, f.h);
      const m = await o.page.evaluate(READ);
      await o.ctx.close();
      if (!m) { ok(false, `[A] ${f.h} 리스트를 못 읽었다`); continue; }
      M.push({ ...f, ...m, fh: f.h });
      ok(Math.abs(m.rem - REF_SLV) <= TOL,
         `[A] ${String(f.h).padStart(4)} (${f.id}) 남은 높이 ${m.rem}px · 잘림 ${r1(ROWH - m.rem)}px`,
         `ref ${REF_SLV}/${REF_CUT} · 뷰포트 ${m.h} · 온전한 행 ${m.full}`);
    }
    const rems = [...new Set(M.map(m => m.rem))];
    ok(rems.length === 1, '[A] 남은 높이가 **한 값**이다 (프레임 의존이 사라졌다)', rems.join(' · '));
    ok(M.every(m => m.pitch === PITCH && m.rowH === ROWH),
       '[A] 행 피치·높이는 안 건드렸다', `피치 ${[...new Set(M.map(m => m.pitch))].join('/')} · 행 ${[...new Set(M.map(m => m.rowH))].join('/')}`);

    blk('B] 기준 프레임(2280) Δ0px — 레퍼런스 자리를 안 옮겼다');
    const b = M.find(m => m.fh === 2280) || {};
    ok(Math.abs(b.h - BASE_H) <= TOL, '[B] 패널 높이 999', b.h);
    ok(Math.abs(b.top - 65) <= TOL, '[B] 패널 top 65 (ref y628)', b.top);
    ok(Math.abs(b.gapAll - BASE_GAP) <= TOL, '[B] 패널 하변 → [모두 받기] 간격 20 (ref 21)', b.gapAll);
    ok(Math.abs(b.gapTg - 24) <= TOL, '[B] [모두 받기] → 토글 간격 24 (ref 25)', b.gapTg);
    ok(Math.abs(b.tgBot - (b.bodyH - 3 - 43)) <= TOL + 1, '[B] 토글 아래 여백 43 — 빌림 0', `토글 하변 ${b.tgBot} · 본문 ${b.bodyH}`);
    /* ⚠ `--qs-brw` 는 **커스텀 속성이라 계산값이 치환 토큰 그대로**다(퍼센트가 안 풀린다) —
       빌림은 «토글 아래 여백이 43 에서 얼마나 줄었나» 로 **기하에서** 역산한다. */
    ok(Math.abs(r1(43 - (b.bodyH - 3 - b.tgBot))) <= TOL, '[B] 기준 프레임의 빌림은 **0px** (스냅이 제자리)',
       '역산 ' + r1(43 - (b.bodyH - 3 - b.tgBot)) + 'px');

    blk('C] 과교정 잠금');
    const eaten = M.filter(m => m.eaten.px > 0.5);
    ok(eaten.length === 0, '[C1] 클립선이 **내용을 한 픽셀도 안 먹는다** (전 프레임)',
       eaten.length ? eaten.map(m => `${m.h}: ${m.eaten.who} −${m.eaten.px}px`).join(' · ') : `내용 최하변 ${INK_BOT}px < 남은 높이 ${REF_SLV}px`);
    const waste = M.map(m => r1(m.gapAll - BASE_GAP));
    ok(Math.max(...waste) < PITCH, '[C2] 버리는 양(간격 증가)이 **한 행(200px) 미만**이다',
       '최대 ' + Math.max(...waste) + 'px @ 프레임 ' + M[waste.indexOf(Math.max(...waste))].fh);
    const tgSlack = M.map(m => r1(m.bodyH - 3 - m.tgBot));
    ok(Math.min(...tgSlack) >= TG_MIN - TOL, `[C3] 토글 아래 여백이 ${TG_MIN}px 아래로 안 내려간다 (빌림 상한 31px 의 짝)`,
       tgSlack.join(' · '));
    const out = M.filter(m => m.outside.length);
    ok(out.length === 0, '[C4] 패널·[모두 받기]·토글이 본문 밖으로 안 나간다 (LESSONS 20-④)',
       out.length ? out.map(m => m.h + ': ' + m.outside.join(',')).join(' · ') : '전 프레임 0건');
    ok(M.every(m => m.full >= 2), '[C5] 어느 프레임에서도 온전한 행이 2개 이상 남는다',
       [...new Set(M.map(m => m.full))].join(' · '));

    blk('D] 잘림 ≠ 소실 — 끝까지 스크롤하면 마지막 행이 전부 보인다');
    for (const h of [1600, 1700, 2280]) {
      const o = await open(browser, h);
      const e = await o.page.evaluate(READ_END);
      await o.ctx.close();
      ok(e && Math.abs(e.visible - e.full) <= 1 && e.left <= 1,
         `[D] ${h} 마지막 행 전부 보임`, e ? `보임 ${e.visible}/${e.full} · 남은 스크롤 ${e.left}` : '읽기 실패');
    }

    blk('E] 선언 한 벌');
    ok((code.match(/--qs-slv:/g) || []).length === 1, '[E1] `--qs-slv` 가 저장소에 **하나뿐**이다 (사본 0)',
       (code.match(/--qs-slv:[^;]*/) || [''])[0]);
    ok((code.match(/--qs-brwmax:/g) || []).length === 1, '[E2] `--qs-brwmax` 도 하나뿐이다',
       (code.match(/--qs-brwmax:[^;]*/) || [''])[0]);
    ok(/\.qs-pn\{[^}]*bottom:316px/.test(code.replace(/\s+/g, ' ')),
       '[E3] `round()` 미지원 폴백(`bottom:316px`)이 남아 있다', '수리 전과 같은 값');
    ok(/@supports \(height: round\(down/.test(code), '[E4] 스냅이 `@supports` 안에 있다', '');
    ok(/--qs-lh:min\(/.test(code.replace(/\s+/g, '')), '[E5] 빌림이 `min()` 으로 상한을 갖는다 (토글이 본문 밖으로 못 나간다)', '');

    blk('R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다');
    /* R1 옛 한 줄 사본 — 1700 이 «보석·버튼 한복판» 으로 돌아간다 */
    {
      const o = await open(browser, 1700, '.q22 .mbody>.qs-pn{height:auto!important;bottom:316px!important}'
        + '.q22 .mbody>.qs-all{bottom:166px!important}.q22 .mbody>.qs-tg{bottom:43px!important}');
      const m = await o.page.evaluate(READ); await o.ctx.close();
      ok(m && m.eaten.px > 50, '[R1] 옛 한 줄 사본을 주입하면 1700 이 **행 한복판**으로 돌아간다 (자가 실제로 이것을 잡는다)',
         m ? `남은 ${m.rem}px · ${m.eaten.who} −${m.eaten.px}px` : '읽기 실패');
    }
    /* R2 등재문의 «피치 배수» 를 문자 그대로 — 기준 프레임이 ref 에서 벗어난다 */
    {
      const o = await open(browser, 2280, '.q22 .mbody>.qs-pn{height:calc(33px + round(down, calc(100% - 414px), 200px))!important}');
      const m = await o.page.evaluate(READ); await o.ctx.close();
      ok(m && Math.abs(m.h - BASE_H) > 20,
         '[R2] «피치 배수» 를 문자 그대로 쓴 사본은 기준 프레임이 ref 999 에서 벗어난다 (그래서 안 골랐다)',
         m ? `패널 h ${m.h} · 남은 ${m.rem}px (잘림 0 = ref 어포던스 삭제)` : '읽기 실패');
    }
    /* R3 빌림을 끄면 1600 이 한 칸 내려앉아 간격이 벌어진다 */
    {
      const o = await open(browser, 1600, '.q22 .mbody{--qs-brwmax:0px!important}');
      const m = await o.page.evaluate(READ); await o.ctx.close();
      ok(m && m.gapAll > BASE_GAP + 100,
         '[R3] `--qs-brwmax:0` 이면 1600 이 한 칸 내려앉는다 = **빌림이 실제로 일하고 있다**',
         m ? `간격 ${m.gapAll}px (빌림 있을 때 ${BASE_GAP}px) · 남은 ${m.rem}px` : '읽기 실패');
    }
  } finally {
    await browser.close();
  }
  console.log(`\n=== verify827: ${pass}/${pass + fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
