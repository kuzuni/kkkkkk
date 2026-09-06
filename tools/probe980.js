/* 작업 980 — 재현 «`tools/cap683.js` 의 A8 은 «정착» 이 아니다».
 *
 *   node tools/probe980.js
 *
 * 338 규칙 — 처방을 따르기 전에 등재문을 재현한다. 등재문(683 11회차 비평가 CQ 의 [보조] 관측)은
 * 이렇게 적혀 있다: «A8 은 연출이 끝난 프레임이지만 «막 획득» 선택 테가 아직 켜져 있다 ·
 * A8↔B3 카드 상자 직접 차분에서 |ΔL|>0.05 가 9,728px(테두리 밴드 5,832px) ⇒ A8 을 기준선으로 쓴
 * A 씬의 모든 Δ 가 실제보다 작게 나온다».
 *
 * 이 자가 묻는 것은 여섯이다.
 *   [1] A8(마지막 눈금 340ms)의 연출 레이어(`#fxl`)에 **보이는 노드가 남아 있는가** — «정착» 이면 0.
 *   [2] 그 노드의 **화소 무게** — A8 ↔ «연출 레이어만 숨긴 쌍둥이» 직접 차분.
 *   [3] **정답표의 기준선**(`baseline()`)이 무엇인가 — 소환 **전** 페이지라 당첨 칸이 미보유(`.off`)다.
 *   [4] 그래서 Δ 열이 무엇을 세는가 — «연출이 더한 잉크» 인가 «칸이 켜졌다» 인가.
 *   [5] 등재문의 파일 목록(`probe683c`·`probe683d`·`verify753`)이 실제로 A8 을 쓰는가.
 *   [6] **예열** — 우리가 재는 장이 «버린 뒤» 의 장인가(버린 몫 자체는 값으로만 적는다 · 986).
 *   [R] 되돌림 — 쌍둥이를 뜨는 «방법»(`visibility` ↔ `display`)이 재는 대상을 바꾸는가.
 *
 * ⚠ 프레임은 `cap683.js` 의 `open`·`FREEZE`·`TALLY`·`STOPS`·`grow` 를 **require 해서 그대로** 쓴다.
 *   사본을 뜨면 재는 대상이 사본이 된다(402 «사본을 지운다» · 976 선례).
 * ⚠⚠ **첫 스크린샷은 버린다(예열).** 이 러너에서 «같은 상태의 두 장» 을 재 보면 첫 장만
 *   전 화면에서 31,677px(카드 상자 안 9,465px) 어긋나고 둘째 장부터 카드 상자가 굳는다
 *   (남는 흔들림은 상단 HUD y143~236 뿐 — 카드와 안 겹친다). 예열을 안 하면 «되돌림» 시험이
 *   자기 잡음을 결함으로 읽는다.
 * ⚑⚑ **986 — 그 «버린 몫» 에는 문턱이 없다.** 1회차의 [6-a] 는 「첫 장이 **더 밝다**(정착 잉크 ×
 *   (1.05²−1) ≈ 748px)」를 **항상 난다**로 걸었는데, 그 몫은 `#fxl` 합성 레이어가 한 프레임 늦게
 *   그려지느냐에 달렸고 **그것은 러너의 몫**이다 — 수리 전 4판 실측이 **Δ 0 · 0 · 0 · 525px**(빨강 3판)
 *   이고, 나는 판마저 748 이 아니었다(팝이 도는 중이라 배율이 1.0~1.05 사이 어디든이다).
 *   ⇒ 984 처방 준용: **버린 값은 `info` 로만 찍고, 판정은 «첫 장을 실제로 버렸는가»(소스 래칫 [6-a])
 *   와 «재는 장이 굳어 있는가»([6-b]) 라는 자가 고르는 축에만 건다.** [6-c]·[6-d] 가 그 축이
 *   «늘 초록인 자» 가 아님을 오염을 손으로 심어 못박는다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { open, FREEZE, TALLY, SEED, SEEDFN, STOPS, grow } = require('./cap683');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const r2 = v => Math.round(v * 100) / 100;

/* 페이지 안에서 PNG 두 장을 겹쳐 재는 자.
     n    — |ΔL| > thr 인 화소 수(선형 휘도) · nb — 그 중 «테두리 밴드»(상자 가장자리 band px) 몫
     ia/ib — 밝은 잉크 화소 수(휘도 > 200 · `cap683` 의 `paintedPx` 와 **같은 어휘**)
     la/lb — 상자 평균 휘도(0~255)                                                                */
const PIX = async (p, { a, b, box, band, thr }) => await p.evaluate(async ({ a, b, box, band, thr }) => {
  const load = u => new Promise((res, no) => { const i = new Image(); i.onload = () => res(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
  const grab = async u => { const im = await load(u); const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    return g.getImageData(box.x, box.y, box.w, box.h).data; };
  const A = await grab(a), B = b ? await grab(b) : null;
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
  const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  let n = 0, nb = 0, totB = 0, sa = 0, sb = 0, ia = 0, ib = 0;
  for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) {
    const i = (y * box.w + x) * 4;
    const edge = (x < band || x >= box.w - band || y < band || y >= box.h - band);
    if (edge) totB++;
    const va = lum(A, i); sa += va; if (va > 200) ia++;
    if (B) { const vb = lum(B, i); sb += vb; if (vb > 200) ib++;
      if (Math.abs(rl(A, i) - rl(B, i)) > thr) { n++; if (edge) nb++; } }
  }
  const px = box.w * box.h;
  return { n, nb, totB, px, ia, ib, la: sa / px, lb: B ? sb / px : -1 };
}, { a, b, box, band, thr });

/* 씬 A 의 조리법 그대로 한 프레임을 뜬다 — 트리거 직전에 난수를 다시 심고, 얼리고, `#fxl` 만 T 로 감는다.
   그리고 **연출 레이어만 숨긴 쌍둥이**를 같이 찍는다(노드를 지우지 않는다 · 되돌릴 수 있다). */
async function frameA(T) {
  const { b, p } = await open(SEED);
  const st = await p.evaluate(async ({ T, sd, tally, freeze, seedfn }) => {
    Math.random = eval('(' + seedfn + ')')(sd);
    const el = document.getElementById('rwBasin');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    eval('(' + freeze + ')')();
    try {
      document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        const inFx = !!(tg && tg.closest && tg.closest('#fxl'));
        a.pause();
        try { if (inFx) a.currentTime = T; else { try { a.finish(); } catch (_) { a.currentTime = 1e7; } } } catch (e) {}
      });
    } catch (e) {}
    /* 연출 레이어에 **무엇이 남아 있는가** — `cap683` 의 가시성 자와 같은 어휘(불투명도 0.25 · 최소변 6px) */
    const L = document.getElementById('fxl');
    const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return +cs.opacity > 0.25 && Math.min(bb.width, bb.height) >= 6; };
    const left = [...L.children].filter(vis).map(n => {
      const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return { cls: (n.className || '') + '', opacity: +cs.opacity,
               rect: [Math.round(bb.x), Math.round(bb.y), Math.round(bb.width), Math.round(bb.height)] };
    });
    return Object.assign({ left }, eval('(' + tally + ')')());
  }, { T, sd: SEED, tally: TALLY.toString(), freeze: FREEZE.toString(), seedfn: SEEDFN.toString() });
  const warm = (await p.screenshot()).toString('base64');  /* 예열 — 버리는 첫 장(아래 [6]) */
  const shot = (await p.screenshot()).toString('base64');
  /* 쌍둥이 ① `visibility:hidden` — 렌더 트리에 남으므로 CSS 애니가 안 끊긴다(비파괴) */
  const pv = await p.evaluate(() => { const L = document.getElementById('fxl');
    const q = L.style.visibility; L.style.visibility = 'hidden'; return q; });
  const twin = (await p.screenshot()).toString('base64');
  await p.evaluate(q => { document.getElementById('fxl').style.visibility = q; }, pv);
  const back = (await p.screenshot()).toString('base64');
  /* 되돌림 재료(986) — «안 걷힌 팝이 첫 장에 남았다» 를 **손으로 심는다**: 당첨 카드에 `.fx-hit` 의
     봉우리와 같은 몫(`scale(1.05)`)을 인라인으로 걸고 한 장, 걷고 한 장. 러너가 늦게 그려 주기를
     기다리지 않으므로 **판마다 같다** — 아래 [6-c]·[6-d] 가 이 두 장으로 [6-b] 축을 되돌린다.
     ⚠ **인라인 `transform` 만으로는 no-op 이다** — 카드 자신의 `.fx-hit{animation:fxHit .26s linear both}` 가
     `both` 로 100% 키프레임(`scale(1)`)을 물고 있고, **애니메이션이 채운 값은 보통 인라인 선언을 이긴다**.
     `!important` 는 그 위라서 그것으로 심는다(1회차에 그냥 심었다가 실측 0px 로 되돌림이 헛초록이 될 뻔했다). */
  const csel = '[data-rw="' + st.id + '"]';
  const dq = await p.evaluate(s => { const el = document.querySelector(s);
    const q = el.getAttribute('style');
    el.style.setProperty('transform', 'scale(1.05)', 'important'); return q; }, csel);
  const dirty = (await p.screenshot()).toString('base64');
  await p.evaluate(({ s, q }) => { const el = document.querySelector(s);
    if (q === null) el.removeAttribute('style'); else el.setAttribute('style', q); }, { s: csel, q: dq });
  const dirtyBack = (await p.screenshot()).toString('base64');
  /* 쌍둥이 ② `display:none` — 렌더 트리에서 빠지며 CSS 애니가 **취소**된다(파괴적 · 아래 [R]) */
  const pd = await p.evaluate(() => { const L = document.getElementById('fxl');
    const q = L.style.display; L.style.display = 'none'; return q; });
  const twinD = (await p.screenshot()).toString('base64');
  await p.evaluate(q => { document.getElementById('fxl').style.display = q; }, pd);
  const backD = (await p.screenshot()).toString('base64');
  return { b, p, st, warm, shot, twin, back, dirty, dirtyBack, twinD, backD };
}

(async () => {
  console.log('# probe980 — cap683 의 A8 이 «정착» 인가 (시드 ' + SEED + ')');

  const T8 = STOPS[STOPS.length - 1];
  const f = await frameA(T8);
  const c = f.st.card;
  const BOX = grow(c);                                    /* 정답표가 잉크를 세는 상자 = 카드 + 24px */
  const CBOX = { x: c.x - 10, y: c.y - 10, w: c.w + 20, h: c.h + 20 };   /* CQ 가 쓴 상자 */

  blk('1] A8(' + T8 + 'ms) 의 연출 레이어에 무엇이 남아 있는가 — «정착» 이면 0 이어야 한다');
  info('당첨 유물', f.st.name + ' ' + f.st.ic + ' (' + f.st.id + ')');
  info('당첨 카드 상자', JSON.stringify(c) + ' · 잉크 상자(카드+24) ' + JSON.stringify(BOX));
  info('정답표가 세는 다섯 갈래', '획득 ' + f.st.gain + ' · 지불 ' + f.st.pay
    + ' · 플래시 ' + f.st.flash + ' · 구슬 ' + f.st.bead + ' · 글자 ' + f.st.text);
  const onCard = f.st.left.filter(n => n.rect[0] < c.x + c.w && n.rect[0] + n.rect[2] > c.x
                                    && n.rect[1] < c.y + c.h && n.rect[1] + n.rect[3] > c.y);
  for (const n of onCard) info('당첨 카드를 덮는 노드', n.cls + ' · opacity ' + n.opacity + ' · ' + JSON.stringify(n.rect));
  const keep = onCard.filter(n => /fx-keep/.test(n.cls));
  ok(onCard.length > 0,
     '1-a **등재문 확인** — A8 의 당첨 카드 위에 «보이는» 연출 노드가 남아 있다(정답표는 이 자리를 «획득 0 · 플래시 0» 으로 적는다)',
     onCard.length + '개: ' + onCard.map(n => n.cls).join(' · '));
  ok(keep.length > 0 && keep.every(n => n.opacity === 1),
     '1-b 남은 것은 **795 라벨 패치**(`.fx-keep`)이고 **불투명도 1** 이다 — 정답표의 다섯 갈래 '
     + '(획득·지불·플래시·구슬·글자) 어디에도 안 세지는 갈래라 **표에서 보이지 않는다**',
     keep.length ? keep.map(n => n.cls + ' α' + n.opacity).join(' · ') : '없음');
  info('왜 안 죽나', '`fxFlashKeep` 의 패치와 `fxFlash` 의 판은 `fxBye(…, 500)` = `setTimeout` 으로 걷히는데 '
    + '씬 A 의 `FREEZE()` 가 타이머를 통째로 지운다. ⚠ 340ms 는 **실제 플레이에서도** 패치 수명(500ms) 안이라 '
    + '«얼려서 생긴 유령» 이 아니라 «그 시각에 실제로 있는 것» 이다');

  blk('2] 그 노드의 화소 무게 — A8 ↔ «연출 레이어만 숨긴 쌍둥이»(`visibility`) · 카드 ±10px');
  const d = await PIX(f.p, { a: f.shot, b: f.twin, box: CBOX, band: 10, thr: 0.05 });
  const d5 = await PIX(f.p, { a: f.shot, b: f.twin, box: CBOX, band: 10, thr: 0.005 });
  info('상자', JSON.stringify(CBOX) + ' = ' + d.px + 'px · 그 중 테두리 밴드 ' + d.totB + 'px');
  info('|ΔL| 문턱별 화소 수', '> 0.05 ' + d.n + 'px · > 0.005 ' + d5.n + 'px');
  ok(d5.n > 0, '2-a A8 은 쌍둥이와 **다르다** = 연출 레이어가 아직 카드 위에 그리고 있다',
     d5.n + 'px (' + r2(d5.n / d5.px * 100) + '%) · 테두리 밴드 ' + d5.nb + 'px');
  ok(d.n < 1000 && d5.n < 4000,
     '2-b ⚑ **등재문의 «9,728px · 테두리 밴드 5,832px» 은 이 축이 아니다** — 패치는 라벨을 제자리에 '
     + '다시 그리므로 화소 무게가 **세 자릿수 아래**다. 등재문의 수치는 A8↔**B3** 이고 그 둘은 '
     + '«같은 프레임의 연출 유무» 가 아니라 **다른 상태의 두 프레임**이다(아래 [3]·[4] 가 그 뿌리다)',
     '실측 ' + d.n + 'px(문턱 0.05) · ' + d5.n + 'px(0.005) ↔ 등재문 9,728px · '
     + '밴드 실측 ' + d5.nb + 'px ↔ 등재문 5,832px');
  const LBOX = { x: c.x, y: c.y + 118, w: c.w, h: 33 };   /* `.rw-c>u` 는 top 123 · fs 35 */
  const l = await PIX(f.p, { a: f.shot, b: f.twin, box: LBOX, band: 1, thr: 0.05 });
  info('라벨 밴드 평균 휘도', 'A8 ' + r2(l.la) + ' ↔ 쌍둥이 ' + r2(l.lb)
    + ' (' + (l.la >= l.lb ? '+' : '') + r2((l.la - l.lb) / (l.lb || 1) * 100) + '%)');

  blk('3] 정답표의 기준선 — `baseline()` 은 소환 **전** 페이지다');
  const g = await open(SEED);
  await g.p.screenshot();                                  /* 예열 */
  const preShot = (await g.p.screenshot()).toString('base64');
  const pre = await g.p.evaluate(id => {
    const el = document.querySelector('[data-rw="' + id + '"]');
    return el ? { off: el.classList.contains('off'), lv: el.querySelector('u').textContent } : null;
  }, f.st.id);
  const preInk = await PIX(g.p, { a: preShot, b: null, box: BOX, band: 1, thr: 0.05 });
  await g.b.close();
  const post = await f.p.evaluate(id => {
    const el = document.querySelector('[data-rw="' + id + '"]');
    return el ? { off: el.classList.contains('off'), lv: el.querySelector('u').textContent } : null;
  }, f.st.id);
  info('소환 **전** 그 칸(= 기준선)', pre ? ('`.off` ' + pre.off + ' · ' + pre.lv + ' · 밝은 잉크 ' + preInk.ia + 'px') : '측정 실패');
  const twinInk = await PIX(f.p, { a: f.twin, b: null, box: BOX, band: 1, thr: 0.05 });
  const shotInk = await PIX(f.p, { a: f.shot, b: null, box: BOX, band: 1, thr: 0.05 });
  info('소환 **뒤** 그 칸(= 모든 A 프레임)', post ? ('`.off` ' + post.off + ' · ' + post.lv
    + ' · 연출 0 잉크 ' + twinInk.ia + 'px · A8 잉크 ' + shotInk.ia + 'px') : '측정 실패');
  ok(!!pre && !!post && pre.off && !post.off,
     '3-a **둘째 뿌리** — 기준선의 그 칸은 미보유(`.off` 회색 · Lv.0)이고 A 프레임의 그 칸은 보유(Lv.1)다',
     pre && post ? ('전 off=' + pre.off + '/' + pre.lv + ' ↔ 후 off=' + post.off + '/' + post.lv) : '측정 실패');

  blk('4] 그래서 Δ 열이 무엇을 세는가 — «연출이 더한 잉크» 인가 «칸이 켜졌다» 인가');
  const dOld = shotInk.ia - preInk.ia;                    /* 현행 Δ = A8 잉크 − 소환 전 기준선 */
  const dNew = shotInk.ia - twinInk.ia;                   /* 처방 Δ = A8 잉크 − 같은 프레임의 연출 0 쌍둥이 */
  info('현행 Δ(A8) = A8 − 소환 전 기준선', dOld + 'px');
  info('처방 Δ(A8) = A8 − 같은 프레임의 쌍둥이', dNew + 'px');
  ok(Math.abs(dOld) > 20 * Math.max(1, Math.abs(dNew)),
     '4-a **현행 Δ 는 «연출» 이 아니라 «칸이 켜졌다» 를 센다** — A8 은 연출이 거의 없는데도 Δ 가 크다. '
     + '683 비평 브리핑이 «파티클 몫 ≈ Δ − 8000» 이라는 **손 상수**를 적어야 했던 이유가 이것이다',
     '현행 ' + dOld + 'px ↔ 처방 ' + dNew + 'px (' + r2(dOld / Math.max(1, Math.abs(dNew))) + '배)');
  ok(preInk.ia * 5 < twinInk.ia,
     '4-b 그 격차의 몫은 **미보유↔보유**다(같은 상자 · 연출 0 인 두 화면끼리)',
     '소환 전 ' + preInk.ia + 'px ↔ 소환 뒤(연출 0) ' + twinInk.ia + 'px');

  blk('5] 등재문의 파일 목록 — `probe683c`·`probe683d`·`verify753` 도 A8 을 쓰는가');
  const rd = n => { try { return fs.readFileSync(path.join(__dirname, n), 'utf8'); } catch (e) { return ''; } };
  const users = ['probe683c.js', 'probe683d.js', 'verify753.js'];
  for (const n of users) {
    const s = rd(n);
    info(n, /cap683|docs\/shots|683-r/.test(s) ? '**cap683 의 캡처를 읽는다**' : 'cap683 의 캡처를 안 읽는다(자기 프레임을 직접 뜬다)');
  }
  ok(users.every(n => !/cap683|docs\/shots|683-r/.test(rd(n))),
     '5-a ⚑ **등재문의 파일 목록 중 셋은 기각된다** — 그 자들의 «정착» 은 A8 이 아니라 '
     + '자기 페이지에서 `#fxl` 을 비우고 소환을 아예 안 부른 프레임이다',
     users.join(' · '));
  ok(/if \(T >= 0\) rwSummonFx/.test(rd('probe683c.js')) && /const settled = await shot\(\{ T: -1/.test(rd('probe683c.js')),
     '5-b `probe683c` 의 «정착» 은 `T < 0` = **소환을 안 부른다**(연출이 태어난 적이 없다)',
     '`const settled = await shot({ T: -1, NOGAIN: true })`');
  ok(/while \(L && L\.firstChild\) L\.removeChild\(L\.firstChild\)/.test(rd('probe683c.js')),
     '5-c 그 자는 프레임마다 `#fxl` 을 **비우고** 시작한다(앞 프레임의 패치가 안 남는다)',
     '`while (L && L.firstChild) L.removeChild(L.firstChild)`');

  blk('6] 예열 — **우리가 재는 장이 «버린 뒤» 의 장인가**(버린 몫은 러너가 정한다 · 등재 986)');
  const w0 = await PIX(f.p, { a: f.warm, b: f.shot, box: BOX, band: 1, thr: 0.05 });
  info('버린 첫 장 ↔ 재는 둘째 장 **(값 · 판정 아님)**', '밝은 잉크 ' + w0.ia + 'px → ' + w0.ib
    + 'px (Δ ' + (w0.ia - w0.ib) + 'px) · 어긋난 화소 ' + w0.n + 'px · `.fx-hit` 봉우리 산수 '
    + Math.round(w0.ib * (1.05 * 1.05 - 1)) + 'px');
  info('⚑ 이 Δ 에는 문턱을 안 건다(986)', '`#fxl` 이 합성 레이어라 첫 장이 **한 프레임 늦게 그려지는 판**에서만 '
    + '팝이 남는다 — 안 늦은 판의 **Δ 0px 도 정상**이고, 남은 판도 팝이 도는 중이라 값이 봉우리 산수보다 작다'
    + '(수리 전 4판 실측 0 · 0 · 0 · 525px). 이 값은 이 자가 «고른» 값이 아니라 «받은» 값이다(984-①)');
  const self = rd('probe980.js'), sl = self.split('\n');
  const fa = (self.match(/async function frameA[\s\S]*?\n\}\n/) || [''])[0];
  const warmAt = fa.indexOf('const warm = (await p.screenshot())'), shotAt = fa.indexOf('const shot = (await p.screenshot())');
  const head = i => { for (let j = i; j >= 0; j--) { const t = sl[j].trim();
    if (/^(ok|info|const|let|var|return|blk)\b/.test(t) || /^(ok|info)\(/.test(t)) return t; } return ''; };
  const w0Use = sl.map((l, i) => i).filter(i => /\bw0\.[a-z]/.test(sl[i]) && !/^\s*[*/]/.test(sl[i]));
  const w0Judge = w0Use.filter(i => /^ok\(/.test(head(i)));
  ok(warmAt >= 0 && shotAt > warmAt && w0Use.length > 0 && w0Judge.length === 0,
     '6-a **첫 장을 실제로 버린다 · 그리고 버린 값에는 판정 표지가 없다**(소스 래칫 · 984 [2-e] 꼴) — '
     + '`frameA` 가 재는 장(`shot`) **앞에서** 한 장을 버리고(`warm`), 그 버린 장에서 나온 값(`w0`)은 '
     + '`info` 로만 적힌다. 판정이 이 값으로 되돌아오면 이 항이 빨개진다',
     '버림 위치 ' + (warmAt >= 0 ? (shotAt > warmAt ? '`shot` 앞 ✔' : '`shot` 뒤 ✖') : '없음 ✖')
     + ' · 버린 값 사용처 ' + w0Use.length + '곳 · 그 중 판정 줄 ' + w0Judge.length + '곳');
  const w1 = await PIX(f.p, { a: f.shot, b: f.back, box: BOX, band: 1, thr: 0.0005 });
  ok(w1.n === 0, '6-b 그리고 **재는 장은 굳어 있다** — 뒤에 찍은 장과 화소까지 같다(둘째 장부터 굳는다)',
     w1.n + 'px 차이');
  const rv = await PIX(f.p, { a: f.dirty, b: f.back, box: BOX, band: 1, thr: 0.0005 });
  ok(rv.n > 0,
     '6-c **되돌림 — [6-b] 는 «늘 초록인 자» 가 아니다**: 안 걷힌 팝(`scale(1.05)`)을 손으로 심은 장은 '
     + '같은 상태의 장과 **화소가 갈린다**. 즉 첫 장을 안 버렸는데 그 장이 오염됐다면 [6-b] 가 빨개진다 '
     + '— 러너가 늦게 그려 주기를 기다리지 않으므로 이 항은 판마다 같다',
     rv.n + 'px 어긋남(잉크 ' + rv.ia + 'px ↔ ' + rv.ib + 'px)');
  const rb = await PIX(f.p, { a: f.dirtyBack, b: f.back, box: BOX, band: 1, thr: 0.0005 });
  ok(rb.n === 0, '6-d 그리고 심은 오염을 걷으면 **화소까지** 재던 장으로 돌아온다(비파괴 · [R-a] 와 같은 급)',
     rb.n + 'px 차이');

  blk('R] 되돌림 — 쌍둥이를 뜨는 방법이 재는 대상을 바꾸는가(`visibility` ↔ `display`)');
  const bk = await PIX(f.p, { a: f.shot, b: f.back, box: BOX, band: 1, thr: 0.0005 });
  ok(bk.n === 0, 'R-a `visibility:hidden` 으로 숨겼다 되살리면 **화소까지** 원래 화면이다(비파괴)',
     bk.n + 'px 차이');
  const bd = await PIX(f.p, { a: f.back, b: f.backD, box: CBOX, band: 10, thr: 0.05 });
  ok(bd.n > 1000,
     'R-b ⚑ **`display:none` 은 파괴적이다** — 렌더 트리에서 빠지며 CSS 애니가 취소되고, 되살아날 때 '
     + 't=0 부터 다시 돌아 그 프레임이 통째로 바뀐다(그래서 `cap683` 의 쌍둥이는 `visibility` 여야 한다)',
     bd.n + 'px 어긋남');
  const tw = await PIX(f.p, { a: f.twin, b: f.back, box: CBOX, band: 10, thr: 0.005 });
  ok(tw.n === d5.n, 'R-c 그리고 쌍둥이는 **실제로 다른 그림**이다(숨기기가 no-op 이 아니다 · [2] 와 같은 값)',
     tw.n + 'px ↔ [2] ' + d5.n + 'px');

  await f.b.close();
  console.log('\nPROBE980 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(String(e && e.stack || e).split('\n').slice(0, 4).join('\n')); process.exit(1); });
