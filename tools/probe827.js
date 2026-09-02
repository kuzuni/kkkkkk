#!/usr/bin/env node
/* 작업 827 재현기 — 「22 퀘스트 리스트(`.qs-pn`)도 마지막 행을 글리프 한복판에서 자른다 —
 *                     뷰포트 높이가 행 피치 200px 의 배수가 아니다」(754 9회차 비평 CP·CQ 등재)
 *
 *   node tools/probe827.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 812(20 종합스탯)가 같은 얼굴의 결손을 닫으며 남긴 교훈이
 *   이 자의 설계다(`docs/review/812-종합스탯리스트끊김스냅.md` §6):
 *
 *     «여기서 배운 것은 «피치 배수로 스냅» 이 아니라 **«레퍼런스가 남기는 양으로 스냅»** 이다.
 *      ref 가 딱 떨어지게 끊는 화면이면 그때는 배수 스냅이 답이다.»
 *
 *   ⇒ 그래서 이 자는 세 가지를 같이 찍는다:
 *     [1] **레퍼런스 자신이 이 리스트를 어떻게 끊는가** — 측정표 22 §3·§4·§9 의 산수
 *     [2] 프레임 5종에서 `.qs-pn` 뷰포트 높이 · 온전한 행 수 · **마지막 행의 남은 높이**
 *     [3] 그릇을 움직일 때 **어디서 여백을 빼는가** — 패널 하변 ↔ [모두 받기] 상변 간격
 *         (827 등재문의 경고: `.qs-pn` 은 top·bottom 둘 다 절대값이고 아래에 버튼·토글이 걸려 있다)
 *
 * ⚠ 이 자는 **판정하지 않는다**(초록/빨강은 «관측에 성공했는가» 다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

const FRAMES = (process.env.SWEEP
  ? Array.from({ length: 23 }, (_, i) => 1600 + i * 10)
  : [1600, 1653, 1700, 1750, 1800, 1841, 1920, 2280, 2600]);
const PITCH = 200;                      /* 측정표 22 §4 «세로 pitch 200» (행 179 + gap 21) */
const ROWH = 179;                       /* 측정표 22 §4 «행 height 179» */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const r1 = v => +(+v).toFixed(1);

/* 리스트를 «설계 px» 으로 읽는다 — `fit()` 이 뷰포트에 맞춰 스케일하므로 화면 px 을 그대로 쓰면 안 된다 */
const READ = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  const sc = app.width / 1080;
  const el = document.querySelector('.qs-pn');
  if (!el) return null;
  const body = document.querySelector('.q22 .mbody');
  const all = document.querySelector('.qs-all');
  const tg = document.querySelector('.qs-tg');
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const rows = [...el.querySelectorAll('.qs-r')];
  const rr = rows.length ? rows[0].getBoundingClientRect() : null;
  const px = v => +((v) / sc).toFixed(2);
  const n1 = v => +(+v).toFixed(1);
  const br = body ? body.getBoundingClientRect() : null;
  return {
    frameH: +(app.height / sc).toFixed(1),
    bodyH: br ? px(br.height) : null,
    top: br ? px(r.y - br.y) : null,
    h: px(r.height),
    padTop: n1(parseFloat(cs.paddingTop) || 0),
    padBot: n1(parseFloat(cs.paddingBottom) || 0),
    rows: rows.length,
    rowH: rr ? px(rr.height) : null,
    scrollH: n1(el.scrollHeight),
    clientH: n1(el.clientHeight),
    /* [3] 그릇 하변 ↔ 아래 이웃 상변 (설계 px) */
    gapAll: all ? px(all.getBoundingClientRect().y - r.bottom) : null,
    allTop: all && br ? px(all.getBoundingClientRect().y - br.y) : null,
    tgTop: tg && br ? px(tg.getBoundingClientRect().y - br.y) : null,
    /* [5] 행 안에서 «내용» 이 실제로 끝나는 자리 — 행 상단 기준 최하변 (설계 px) */
    inner: rr ? [...rows[0].children].map(c => {
      const b = c.getBoundingClientRect();
      return { cls: c.className, top: px(b.y - rr.y), bot: px(b.bottom - rr.y) };
    }) : [],
    /* 마지막으로 «보이는» 행에서 클립선 아래로 잘려 나간 자식 — 실제 잘림의 정체 */
    clipped: (() => {
      const clip = r.bottom;
      const outs = [];
      rows.forEach((row, i) => {
        const rb = row.getBoundingClientRect();
        if (rb.y >= clip) return;                 /* 아예 안 보이는 행 */
        [...row.children].forEach(c => {
          const b = c.getBoundingClientRect();
          if (b.bottom > clip + 0.5 && b.y < clip) outs.push({ row: i + 1, cls: c.className, cut: px(b.bottom - clip), h: px(b.height) });
        });
      });
      return outs;
    })(),
  };
};

(async () => {
  console.log('[0] 소스 — 지금 높이를 정하는 선언');
  const code = fs.readFileSync(SRC, 'utf8');
  const decl = (code.match(/\.qs-pn\{[^}]*\}/) || [''])[0].replace(/\s+/g, ' ');
  ok(!!decl, '0a `.qs-pn` 선언', decl.slice(0, 200));
  ok(/top:65px/.test(decl) && /bottom:316px/.test(decl),
     '0b 높이가 **top·bottom 두 절대값**으로 정해진다 — 피치와 무관하다',
     (decl.match(/top:[^;]+/) || [''])[0] + ' · ' + (decl.match(/bottom:[^;]+/) || [''])[0]);
  const rdecl = (code.match(/\.qs-r\{[^}]*\}/) || [''])[0].replace(/\s+/g, ' ');
  ok(/height:179px/.test(rdecl) && /margin-bottom:21px/.test(rdecl),
     '0c 행 피치 = 179 + 21 = **200px**', rdecl.slice(0, 120));

  console.log('\n[1] 레퍼런스 자신은 이 자리를 어떻게 끊는가 (측정표 22 §3·§4·§9)');
  const mt = fs.readFileSync(path.resolve(__dirname, '../docs/measure/22-퀘스트팝업.md'), 'utf8');
  ok(/628\s*\.\.\s*1626|628 ~ 1626/.test(mt), '1a 측정표가 리스트 패널을 **ref y628–1626(h999)** 로 적는다',
     '§3 · §9');
  ok(/1461\s*~\s*1626/.test(mt), '1b 측정표가 **5행 = ref y1461–1626** 로 적는다', '§4');
  const refPadTop = 661 - 628;                    /* §3 «패널 내부 padding 상 33» = §4 1행 상단 661 */
  const refContent = 1626 - 628 - refPadTop;      /* 하단 패딩 없음 — 5행이 패널 하변에 그대로 잘린다 */
  const refFull = Math.floor(refContent / PITCH);
  const refRem = refContent - refFull * PITCH;    /* 마지막 행에서 «보이는» 높이 */
  const refCut = ROWH - refRem;                   /* 잘려 나간 높이 */
  ok(refPadTop === 33, '1c ref 상단 패딩', `661 − 628 = ${refPadTop}px`);
  ok(true, '1d ref 콘텐츠 높이', `1626 − 628 − ${refPadTop} = ${refContent}px`);
  ok(true, '1e ⚑ **ref 의 마지막(5) 행 남은 높이**',
     `${refContent} − 200×${refFull} = **${refRem}px** ⇒ 잘림 ${refCut}px  (측정표 §4 «~13px 잘림 · h166» 과 일치)`);
  ok(refRem > 0 && refRem < ROWH, '1f ⚑ **레퍼런스도 마지막 행을 자른다** — «자름 0» 은 ref 가 아니다',
     `${refRem}px 노출 / 행 ${ROWH}px`);
  ok(refContent % PITCH !== 0, '1g ⚑ **ref 자신이 «피치의 배수» 가 아니다** — 배수 스냅은 ref 를 지운다',
     `${refContent} mod ${PITCH} = ${refContent % PITCH}`);

  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  console.log('\n[2] 우리 — 프레임 5종의 뷰포트 높이와 남은 높이');
  const out = [];
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof openQuest === 'function');
    await page.waitForTimeout(600);
    await page.evaluate(() => { openQuest(); });
    await page.waitForTimeout(400);
    const m = await page.evaluate(READ);
    await ctx.close();
    if (!m) { ok(false, `2-${H} 리스트를 못 읽었다`); continue; }
    const content = r1(m.h - m.padTop);
    const full = Math.floor(content / PITCH);
    const rem = r1(content - full * PITCH);
    const cut = r1(ROWH - rem);
    out.push({ H, ...m, content, full, rem, cut });
    ok(true, `2-${H} 본문 ${m.bodyH} · 뷰포트 h ${m.h} · 온전한 행 ${full} · **남은 높이 ${rem}px(잘림 ${cut}px)**`,
       Math.abs(rem - refRem) <= 1 ? 'ref 와 같은 끊김' : 'ref ' + refRem + 'px 과 ' + r1(rem - refRem) + 'px 어긋난다');
  }

  console.log('\n  프레임 | 본문 h | 뷰포트 h | 온전한 행 | 남은 높이 | 잘림 | ref(166/13) 대비');
  out.forEach(o => console.log('  ' + String(o.H).padStart(6) + ' | ' + String(o.bodyH).padStart(6)
    + ' | ' + String(o.h).padStart(8) + ' | ' + String(o.full).padStart(9) + ' | ' + String(o.rem).padStart(9)
    + ' | ' + String(o.cut).padStart(4)
    + ' | ' + (Math.abs(o.rem - refRem) <= 1 ? '  Δ0 (ref 와 같은 끊김)' : '  Δ' + r1(o.rem - refRem))));

  const rems = out.map(o => o.rem);
  ok(true, '3a 남은 높이가 프레임마다 **다르다**(= 그릇 높이가 피치에 안 물려 있다)',
     rems.join(' · ') + (new Set(rems).size > 1 ? '  ← 프레임 의존' : '  (한 값)'));
  const off = out.filter(o => Math.abs(o.rem - refRem) > 1);
  ok(true, '3b ref 끊김(' + refRem + 'px)에서 벗어난 프레임',
     off.length ? off.map(o => `${o.H}(${o.rem}px · 잘림 ${o.cut}px)`).join(' · ') : '없음');

  console.log('\n[4] 여백은 어디서 빼는가 — 패널 하변 ↔ [모두 받기] 상변');
  out.forEach(o => ok(true, `4-${o.H} 간격 ${o.gapAll}px`,
    `패널 top ${o.top} · [모두 받기] top ${o.allTop} · 토글 top ${o.tgTop}`));
  const gaps = out.map(o => o.gapAll);
  ok(true, '4z ⚑ **그릇을 늘릴 여유는 이 간격뿐이다**', `최소 ${Math.min(...gaps)}px · 최대 ${Math.max(...gaps)}px`);

  console.log('\n[5] «글리프 한복판» 인가 — 행 안에서 내용이 실제로 끝나는 자리');
  const inner = out[0].inner || [];
  inner.forEach(c => ok(true, `5a ${c.cls}`, `행 상단 기준 ${c.top} ~ **${c.bot}**`));
  const inkBot = inner.length ? Math.max(...inner.map(c => c.bot)) : null;
  ok(inkBot !== null, '5b ⚑ **행의 내용 최하변**', `${inkBot}px / 행 ${ROWH}px ⇒ 아래 ${r1(ROWH - inkBot)}px 는 «빈 둥근 모서리» 다`);
  ok(true, '5c ⇒ 잘림이 내용을 먹기 시작하는 문턱', `남은 높이 < ${inkBot}px 부터`);
  out.forEach(o => {
    const eat = r1(inkBot - o.rem);
    ok(true, `5-${o.H} 남은 높이 ${o.rem} → 내용 잠식 ${eat > 0 ? '**' + eat + 'px**' : '0px(빈 모서리만 잘린다)'}`,
       o.clipped.length ? o.clipped.map(c => `${c.row}행 .${String(c.cls).split(' ')[0]} −${c.cut}px`).join(' · ') : '잘린 자식 없음');
  });

  await browser.close();
  console.log(`\n=== probe827: ${pass}/${pass + fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
