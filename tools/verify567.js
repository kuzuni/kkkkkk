#!/usr/bin/env node
/* 작업 567 — 홀드 «이탈» 판정은 **연출을 벗긴 배치 자리**로 한다 (게이트)
 *
 *   node tools/verify567.js
 *
 * 무엇을 막는가 — 60 쥬시의 두 변형이 홀드 중인 버튼을 **손가락 밑에서** 움직인다:
 *   `jz-dn`  누르고 있는 **동안** `scale .94 · translate 0 8px` 을 `both` 로 유지
 *   `jz-hb`  488 회당 맥박 — 호스트 카드에 `transform: scale(--hb-s)` 를 60~160ms 마다 다시 건다
 * `elementFromPoint` 는 «그려진» 기하를 맞히므로, 손가락이 가만히 있어도 그 좌표가
 * «버튼 밖» 으로 읽히는 프레임이 생긴다 ⇒ 연속 강화가 **무작위로 끊긴다**.
 * (`verify349` [B] ±45px 항이 같은 트리에서 4회 ↔ 12~13회로 갈리던 뿌리 · 재현은 `tools/probe567.js`)
 *
 * 절: [A] 전제 — 재는 자리가 실재하고 연출 둘이 정말 걸린다
 *     [B] 판정 — 배치 자리 «안» 이면 «안», 진짜 밖이면 «밖»(이탈은 여전히 정지 사유다)
 *     [R] 되돌림 시험 — 옛 꼴(그려진 자리만 본다)은 같은 점에서 «밖» 이라고 답한다
 *     [F] `fit()` 은 안 벗긴다 — 벗기는 것은 `jz-` 조상뿐
 *     [S] 소스 래칫 — 홀드 3형제가 **같은 손**을 쓴다
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { install } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.V567_FILE || 'index.html';
const SRC = path.resolve(__dirname, '..', FILE);
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };
const n1 = v => Math.round(v * 10) / 10;

const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';
const CARD = '#trRunes .tr-rn[data-rune="r1"]';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await install(p, { arm: true });

  await p.evaluate(() => {
    window.__clear540();
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; S.dia = 1e9;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await p.waitForTimeout(450);

  console.log('[A] 전제 — 자리가 실재하고 연출 둘이 정말 걸린다 (341 «전제» 절)');
  const base = await p.evaluate(o => {
    const btn = document.querySelector(o.MAT), card = document.querySelector(o.CARD);
    if (!btn || !card) return null;
    const r = btn.getBoundingClientRect();
    return { rest: { x: r.x, y: r.y, w: r.width, h: r.height },
             hasFn: typeof jzRestRect === 'function' && typeof jzHoldOver === 'function' };
  }, { MAT, CARD });
  ok(!!base, '호스트가 실재한다 — 룬 [강화] 버튼과 그 카드', base ? MAT : '⚠ 유령 셀렉터');
  if (!base) { console.log('VERIFY567 ' + pass + '/' + (pass + fail) + ' FAIL'); await browser.close(); process.exit(1); }
  ok(base.hasFn, '공용 손 `jzRestRect`/`jzHoldOver` 가 제품에 있다');
  ok(Math.abs(base.rest.w - 420) < 2 && Math.abs(base.rest.h - 112) < 2,
    '배치 자리 = 420×112', n1(base.rest.w) + '×' + n1(base.rest.h) + ' @ ' + n1(base.rest.x) + ',' + n1(base.rest.y));

  /* 위상을 **손으로 세운다** — 홀드 중 최악 프레임(누름 끝 × 맥박 처음)을 결정적으로 만든다.
     값은 전부 제품 선언에서 읽으므로 이 자에 상수를 안 적는다(.94·8px·--hb-s 를 손으로 안 쓴다). */
  const worst = async fn => p.evaluate(o => {
    const btn = document.querySelector(o.MAT), card = document.querySelector(o.CARD);
    const at = (el, end) => el.getAnimations().forEach(a => {
      a.pause();
      const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
      a.currentTime = end ? (typeof d === 'number' ? d : 0) : 0;
    });
    btn.classList.add('jz-dn'); card.classList.add('jz-hb');
    void btn.offsetWidth; void card.offsetWidth;
    at(btn, true); at(card, false);
    const pr = btn.getBoundingClientRect();
    const painted = { x: pr.x, y: pr.y, w: pr.width, h: pr.height };
    const cx = o.cx, top45 = o.top45, above = o.above;
    /* 옛 꼴 — 그려진 기하만 본다(567 이전의 세 리스너가 그대로 쓰던 판정) */
    const oldAt = (x, y) => { const t = document.elementFromPoint(x, y); return !!(t && t.closest && t.closest(o.MAT)); };
    const res = {
      painted,
      oldTop45: oldAt(cx, top45), newTop45: jzHoldOver(btn, cx, top45),
      oldAbove: oldAt(cx, above), newAbove: jzHoldOver(btn, cx, above),
      restW: (q => q && q.width)(jzRestRect(btn)),
      restY: (q => q && q.y)(jzRestRect(btn)),
      /* 벗긴 뒤 인라인이 **원래대로** 돌아오는가 — 카드에 이미 인라인이 있는 자리라(`--rt`)
         «비어 있다» 로는 못 잰다. 남의 인라인(`transform` 을 `!important` 로 미리 박아 둔 것 포함)을
         한 톨도 안 바꾸는지 before/after 로 묻는다. */
      inlineSame: (() => {
        card.style.setProperty('transform', 'translateY(3px)', 'important');
        const b0 = btn.getAttribute('style') || '', c0 = card.getAttribute('style') || '';
        jzRestRect(btn);
        const same = (btn.getAttribute('style') || '') === b0 && (card.getAttribute('style') || '') === c0
          && getComputedStyle(card).transform.indexOf('3') > 0;
        card.style.removeProperty('transform');
        return same;
      })()
    };
    btn.getAnimations().forEach(a => a.cancel()); card.getAnimations().forEach(a => a.cancel());
    btn.classList.remove('jz-dn'); card.classList.remove('jz-hb');
    return res;
  }, fn);

  const R = base.rest, cx = R.x + R.w / 2, cyc = R.y + R.h / 2;
  const top45 = cyc - 45;              /* verify349 [B] ±45px 표본의 «맨 위» */
  const above = R.y - 6;               /* 진짜 밖 — 배치 자리 위 6px */
  const W = await worst({ MAT, CARD, cx, top45, above });

  console.log('[B] 판정 — 배치 자리 «안» 은 «안», 진짜 밖은 «밖»');
  ok(top45 > R.y && top45 < R.y + R.h,
    '전제 — 표본점 y ' + n1(top45) + ' 은 배치 자리 «안» 이다(위 가장자리에서 ' + n1(top45 - R.y) + 'px)',
    '배치 ' + n1(R.y) + '..' + n1(R.y + R.h));
  ok(W.newTop45 === true,
    '★ 최악 프레임(누름 .94+8px × 맥박 --hb-s)에서도 그 점은 «안» 이다',
    '그려진 상변 ' + n1(W.painted.y) + ' · 배치 상변 복원 ' + n1(W.restY));
  ok(W.newAbove === false,
    '★ 배치 자리 «밖»(y ' + n1(above) + ')은 여전히 «밖» 이다 — 이탈은 정지 사유로 남는다');
  ok(W.restW != null && Math.abs(W.restW - R.w) < 1,
    '`jzRestRect` 가 돌려주는 폭이 배치 폭과 같다(연출을 정말 벗겼다)', n1(W.restW) + ' vs ' + n1(R.w));
  ok(W.inlineSame === true,
    '★ 벗긴 뒤 인라인이 **원래대로** 돌아온다 — `!important` 로 박아 둔 남의 `transform` 까지 그대로');

  console.log('[R] 되돌림 시험 — 옛 꼴(그려진 자리만)은 같은 점에서 «밖» 이라고 답한다');
  ok(W.oldTop45 === false,
    '★ 옛 꼴은 그 점을 «밖» 으로 읽는다 — 처방을 도로 빼면 정말 빨개진다',
    '그려진 상변 ' + n1(W.painted.y) + ' > 표본 ' + n1(top45));
  ok(W.oldAbove === false, '옛 꼴도 진짜 밖은 «밖» — 새 꼴이 무르게 푼 것이 아니다(둘이 갈리는 곳은 한 자리뿐)');
  ok(W.painted.h < R.h - 3 && W.painted.y > R.y + 8,
    '전제 — 최악 프레임에서 버튼이 실제로 줄고 아래로 밀렸다',
    n1(W.painted.w) + '×' + n1(W.painted.h) + ' @ ' + n1(W.painted.x) + ',' + n1(W.painted.y));

  console.log('[F] `fit()` 의 #app scale 은 안 벗긴다 — 벗기는 것은 `jz-` 조상뿐');
  const fitKeep = await p.evaluate(o => {
    const app = document.getElementById('app');
    const before = app.style.transform;
    app.style.transform = 'scale(0.5)';                 /* fit() 이 실제로 쓰는 축 */
    const btn = document.querySelector(o.MAT);
    const r = btn.getBoundingClientRect(), q = jzRestRect(btn);
    app.style.transform = before;
    return { painted: r.width, rest: q.width, appJz: /(^|\s)jz-/.test(app.className || '') };
  }, { MAT });
  ok(!fitKeep.appJz, '#app 은 `jz-` 호스트가 아니다(벗기기 대상이 아니라는 전제)');
  ok(Math.abs(fitKeep.rest - fitKeep.painted) < 1,
    '★ #app 이 0.5 로 줄면 배치 자리도 같이 줄어든다 — `fit()` 은 «진짜 기하» 라 안 벗긴다',
    '그려진 ' + n1(fitKeep.painted) + ' · 벗긴 ' + n1(fitKeep.rest));

  console.log('[S] 소스 래칫 — 홀드 3형제가 같은 손을 쓴다');
  const src = fs.readFileSync(SRC, 'latin1');
  const holds = ['upHoldStop', 'trHoldStop', 'rtHoldStop'];
  const movers = src.split(/addEventListener\('pointermove'/).slice(1);
  holds.forEach(h => {
    const blk = movers.find(b => b.slice(0, 420).indexOf(h) >= 0);
    ok(!!blk && blk.slice(0, 420).indexOf('jzHoldOver') >= 0,
      h.replace('Stop', '') + ' 의 «이탈» 리스너가 `jzHoldOver` 를 거친다');
  });
  ok((src.match(/function jzRestRect\(/g) || []).length === 1, '`jzRestRect` 는 한 벌이다(부품 두 벌 금지)');
  ok(src.indexOf("setProperty(k, 'none', 'important')") > 0,
    '벗기기는 `!important` 로 덮는다 — 인라인은 애니메이션에 진다');

  console.log('\n콘솔 에러 ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  ok(errs.length === 0, '콘솔 에러 0건');
  await browser.close();
  console.log('VERIFY567 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
