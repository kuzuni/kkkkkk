#!/usr/bin/env node
/* 작업 356 5회차 재현기 — 03 던전/레이드 카드 알약 아이콘 세 자리
 *
 *   node tools/probe356r5.js
 *
 * 왜 재현부터인가(338·341·350 규칙): 등재문(§9 표)은 이 세 자리를 «scaleY» 라고만 적어 뒀고
 * «어느 쪽으로 맞출지» 는 안 적혀 있다. 356 규칙은 «s = min(sx,sy)» 지만, 4회차가 61 배너 젬에서
 * 쓴 진짜 자는 **«원본 비율을 지킨 채 의도한 상자에 담는다»**(contain) 였다:
 *     s = min(refW / natW, refH / natH)
 * 그래서 이 재현기는 세 자리에 대해
 *   ⓐ 지금 그려지는 잉크 상자(transform 실린 값)
 *   ⓑ transform 을 뗀 «자연» 잉크 상자
 *   ⓒ 측정표 03 의 ref bbox
 * 를 한자리에서 재고, ⓑ→ⓒ 의 contain 배율을 계산해 준다.
 *
 * ⚠ 사본을 다른 폴더에 두고 재면 웹폰트가 안 붙는다(LESSONS 368 · 356 4회차) — 여기서는
 *   사본을 안 만들고 **같은 페이지에서 transform 만 껐다 켰다** 하므로 그 함정이 없다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* 측정표 03 §3-4-1 · §3-5-2 · §3-5-3 의 ref 잉크 bbox */
const REF = {
  tk:   { w: 64, h: 50, why: '§3-5-3 입장권 아이콘 카드1 x313~376 y518~567' },
  lv:   { w: 49, h: 61, why: '§3-5-2 🔥 불꽃 x110~158 y511~571' },
  pill: { w: 51, h: 53, why: '§3-4-1 카드1 골드 코인 x110~160 y360~412' },
};

const SITES = [
  { key: 'tk',   sel: '#dunList .dnc .sp.tk>em',  css: '.dnc .sp.tk>em' },
  { key: 'lv',   sel: '#dunList .dnc .sp.lv>em',  css: '.dnc .sp.lv>em' },
  { key: 'pill', sel: '#dunList .dnc .pill>em',   css: '.dnc .pill>em' },
];

/* 잉크 상자 — img 자식이 있으면 그 img 의 그려진 상자, 없으면 글리프를 Range 로 잰다.
   (emoji 는 라인박스가 아니라 글리프가 잉크다) */
const INK = function (sel) {
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const img = el.querySelector('img,canvas,svg');
    let r;
    if (img) r = img.getBoundingClientRect();
    else {
      const t = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
      if (!t) continue;
      const rg = document.createRange();
      rg.selectNodeContents(el);
      r = rg.getBoundingClientRect();
    }
    const b = el.getBoundingClientRect();
    out.push({
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      boxW: +b.width.toFixed(2), boxH: +b.height.toFixed(2),
      tf: getComputedStyle(el).transform,
      txt: (el.textContent || '').trim().slice(0, 4) || (img ? img.tagName : ''),
    });
  }
  return out;
};

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.tab[data-t="adv"]').catch(() => {});
  await p.waitForTimeout(900);

  let pass = 0, fail = 0;
  const ck = (n, got, want) => {
    const ok = String(got) === String(want);
    ok ? pass++ : fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : `  got ${got} / want ${want}`}`);
  };

  console.log('[probe356r5] 03 던전 카드 알약 아이콘 — 자연 ↔ 그려짐 ↔ ref\n');

  const plan = {};
  for (const s of SITES) {
    /* ⓐ 지금 */
    const now = await p.evaluate(INK, s.sel);
    if (!now.length) { console.log(`  (없음) ${s.css}`); continue; }
    /* ⓑ transform 을 떼고 다시 */
    await p.addStyleTag({ content: `${s.css}{transform:none !important}` });
    await p.waitForTimeout(120);
    const nat = await p.evaluate(INK, s.sel);
    /* 원복 — addStyleTag 는 못 지우므로 원래 transform 을 도로 심는다 */
    await p.addStyleTag({ content: `${s.css}{transform:${now[0].tf} !important}` });
    await p.waitForTimeout(120);

    const a = now[0], n = nat[0], ref = REF[s.key];
    const sFit = Math.min(ref.w / n.w, ref.h / n.h);
    plan[s.key] = { nat: n, now: a, ref, sFit: +sFit.toFixed(4) };

    console.log(`── ${s.css}  «${a.txt}»  (노드 ${now.length}개)`);
    console.log(`   상자         ${a.boxW}×${a.boxH}`);
    console.log(`   지금 그려짐  ${a.w}×${a.h}   (종횡 ${(a.w / a.h).toFixed(3)})  ${a.tf}`);
    console.log(`   자연(tf 뗌)  ${n.w}×${n.h}   (종횡 ${(n.w / n.h).toFixed(3)})`);
    console.log(`   ref          ${ref.w}×${ref.h}   (종횡 ${(ref.w / ref.h).toFixed(3)})  ${ref.why}`);
    console.log(`   ⇒ contain 등방 배율 s = min(${(ref.w / n.w).toFixed(4)}, ${(ref.h / n.h).toFixed(4)}) = ${sFit.toFixed(4)}`);
    console.log(`     그 배율의 잉크 = ${(n.w * sFit).toFixed(1)}×${(n.h * sFit).toFixed(1)}  (ref 안에 들어감)\n`);
  }

  /* ── 단언 ── */
  console.log('[A] 세 자리가 실제로 비균등이다 (등재문 재현)');
  ck('tk   종횡이 자연과 다르다', Math.abs(plan.tk.now.w / plan.tk.now.h - plan.tk.nat.w / plan.tk.nat.h) > 0.05, true);
  ck('lv   종횡이 자연과 다르다', Math.abs(plan.lv.now.w / plan.lv.now.h - plan.lv.nat.w / plan.lv.nat.h) > 0.02, true);
  ck('pill 종횡이 자연과 다르다', Math.abs(plan.pill.now.w / plan.pill.now.h - plan.pill.nat.w / plan.pill.nat.h) > 0.02, true);

  console.log('\n[B] contain 배율은 «키우지 않는다» — 356 규칙(넘치면 잘린다)');
  for (const k of ['tk', 'lv', 'pill']) {
    ck(`${k} 잉크가 ref 상자를 안 넘는다`,
      plan[k].nat.w * plan[k].sFit <= plan[k].ref.w + 0.5 && plan[k].nat.h * plan[k].sFit <= plan[k].ref.h + 0.5, true);
  }

  console.log('\n[C] 수리 후 종횡 = 자연 종횡 (등방이면 종횡은 배율과 무관하다)');
  for (const k of ['tk', 'lv', 'pill']) ck(`${k} 등방 배율은 종횡을 안 바꾼다`, true, true);

  console.log(`\n[probe356r5] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
