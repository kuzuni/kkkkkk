#!/usr/bin/env node
/* 717 재현 — 103 채팅 리스트에 «메시지 등장 애니» 가 붙는다, 그런데 **하단 4개만 빠진다**
 *            (주인 지시 2026-09-02 03:40 «채팅부분 보니까 하단에 4개 빼고 애니메이션 뜨던데»)
 *
 *   node tools/probe717.js
 *
 * ⚑ 338 규칙 — 처방을 따르기 전에 **실제로 도는 애니메이션**으로 재현부터 한다.
 *   등재문의 가설은 «뷰포트 안 초기 표시분은 즉시, 그 외/스크롤 유입분은 등장 애니» 였다.
 *   이 프로브는 그 가설을 확인하거나 **기각**한다 — 재현이 가리키는 다른 갈래는
 *   60 쥬시의 카드 스태거 `jzStagger()` 가 `jzStagGo(kids, Math.min(kids.length, 20))`
 *   으로 **앞 20칸만** 애니를 걸고, 채팅은 `CHAT_SEED` 가 24행이라 **끝 4행이 남는다** 는 것이다.
 *   («뷰포트» 도 «스크롤 유입» 도 아니고 **상수 20** 이면 갈래가 완전히 다르다.)
 *
 *   [1] 재현    — 수리 전 트리에서 `#chList` 자식 24행 중 애니가 붙은 행 수와 **그 자리**
 *   [2] 재현    — 붙은 행이 실제로 «투명 → 불투명 · 축소 → 원래» 프레임을 갖는다(연출 실재)
 *   [3] 수리 후 — 현재 트리에서 `#chList` 자식 애니 **0건**
 *   [4] 수리 후 — 열기 직후 전 구간(0~800ms) opacity 1 · scale 1 (전이 0건)
 *   [5] 불변    — 행 수·본문·스크롤 바닥 상태는 두 트리에서 같다(표시 내용 불변)
 *   [6] 유입    — 새 메시지 전송(chSend) 뒤에도 애니 0건
 *   [7] 되돌림  — 행에서 `jz-x` 표시를 떼고 다시 열면 애니가 **되살아난다**
 *                 (게이트가 «이미 참인 것» 을 굳힌 게 아니라는 증거 · 338 교훈)
 *
 * ⚠ 수리 전 트리는 `git show <PRE>:index.html` 로 꺼낸다. 얕은 클론이라 그 커밋이 없으면
 *   756 공용 부품이 먼저 판고, 그래도 안 되면 [1]·[2] 를 «⏸ 보류(환경)» 으로 둔다(실패 아님).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const G756 = require('./gitrev756');           /* 756 — 얕은 클론에서 고정 SHA 를 데려오는 공용 부품 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const CUR = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PRE = process.env.PROBE717_PRE || '694f1ec';   /* claim(717) — 수리 직전 트리 */

let pass = 0, fail = 0, skip = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const na = (name, detail) => { console.log('⏸ SKIP ' + name + (detail ? ' — ' + detail : '')); skip++; };

const open = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof openChat === 'function' && typeof chSend === 'function'
    && typeof CHAT_SEED !== 'undefined' && document.getElementById('chList'));
  /* ⚠ 부팅 직후에는 60 쥬시가 부팅 화면에 아직 전이를 걸고 있다 — 가라앉힌 뒤에 연다(350 교훈). */
  await page.waitForTimeout(1200);
  return { page, errs };
};

/* 한 번 «열고» 그 직후 프레임들을 훑는다.
   ⚑ 자는 클래스 이름이 아니라 **실제로 등록된 애니메이션**(`Element.getAnimations()`)을 센다 —
     클래스만 세면 이름이 바뀌는 순간 헛초록이 된다(60-3 «이름 충돌» 교훈). */
async function sample(page){
  return page.evaluate(async () => {
    const L = document.getElementById('chList');
    /* 닫혀 있으면 열고, 열려 있으면 한 번 닫았다가 다시 연다 — 「열림 전이」를 반드시 한 번 태운다 */
    if (document.getElementById('chw').classList.contains('on')) { closeChat(); await new Promise(r => setTimeout(r, 420)); }
    openChat();
    await new Promise(r => requestAnimationFrame(r));            /* 스태거는 MO 마이크로태스크 뒤에 붙는다 */
    await new Promise(r => requestAnimationFrame(r));

    const kids = [...L.children];
    const anim = kids.map(el => el.getAnimations().map(a => (a.animationName || '')).filter(Boolean));
    const jzd  = kids.map(el => el.style.getPropertyValue('--jzd') || '');
    const cls  = kids.map(el => el.className);
    const text = kids.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim());

    /* 0~800ms 를 40ms 눈금으로 훑어 «전이 프레임» 을 센다 — 계산 스타일이 아니라 그리는 값이다 */
    const moved = kids.map(() => 0);
    const minOp = kids.map(() => 1), minSc = kids.map(() => 1);
    const t0 = performance.now();
    while (performance.now() - t0 < 800) {
      for (let i = 0; i < kids.length; i++) {
        const cs = getComputedStyle(kids[i]);
        const op = parseFloat(cs.opacity);
        /* `scale:` 독립 속성 — 미설정이면 'none' */
        const sc = cs.scale === 'none' ? 1 : parseFloat(String(cs.scale).split(' ')[0]);
        if (op < 0.999 || Math.abs(sc - 1) > 0.001) moved[i]++;
        if (op < minOp[i]) minOp[i] = op;
        if (sc < minSc[i]) minSc[i] = sc;
      }
      await new Promise(r => setTimeout(r, 40));
    }
    const l = document.getElementById('chList');
    return { n: kids.length, anim, jzd, cls, text, moved, minOp, minSc,
             atBottom: Math.abs(l.scrollTop + l.clientHeight - l.scrollHeight) < 4 };
  });
}

const animRows = s => s.anim.map((a, i) => a.length ? i : -1).filter(i => i >= 0);
const movedRows = s => s.moved.map((m, i) => m > 0 ? i : -1).filter(i => i >= 0);
const rangeStr = a => a.length ? (a[0] + '..' + a[a.length - 1] + ' (' + a.length + '행)') : '없음';

(async () => {
  const browser = await launch(chromium);

  /* 수리 전 트리를 임시 파일로 꺼낸다 — 756 규약 ①: 얕으면 **먼저 판다**. */
  let preUrl = null, tmp = null;
  const got = G756.show(PRE, 'index.html');
  if (got.ok) {
    if (got.how) console.log('[i]' + got.how);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe717-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), got.buf);
    preUrl = 'file://' + path.join(tmp, 'index.html').replace(/\\/g, '/');
  }

  /* ── 수리 전 ───────────────────────────────────────────────────────────── */
  let pre = null;
  if (preUrl) {
    const p = await open(browser, preUrl);
    pre = await sample(p.page);
    await p.page.context().close();

    const A = animRows(pre), M = movedRows(pre);
    console.log('[i] 수리 전 — 행 ' + pre.n + ' · 애니 ' + rangeStr(A) + ' · 전이 프레임 ' + rangeStr(M));
    console.log('[i] 수리 전 애니 이름 — ' + [...new Set(pre.anim.flat())].join(', '));

    ok(A.length > 0, '1-a 재현 — 수리 전 `#chList` 자식에 등장 애니가 붙는다',
       '애니 ' + A.length + '행 / 전체 ' + pre.n);
    /* 주인 관측의 정체: «하단 4개» 는 뷰포트도 스크롤도 아니라 **상수 20** 이다 */
    const tail = [];
    for (let i = A.length ? A[A.length - 1] + 1 : 0; i < pre.n; i++) tail.push(i);
    ok(A.length === 20 && pre.n === 24 && tail.length === 4,
       '1-b 재현 — 앞 20행만 걸리고 **끝 4행**이 빠진다(주인 «하단 4개 빼고»)',
       '전체 ' + pre.n + ' · 애니 ' + A.length + ' · 빠진 자리 [' + tail.join(',') + ']');
    ok(A.length && A[0] === 0 && A[A.length - 1] === A.length - 1,
       '1-c 재현 — 빠진 자리는 «뷰포트 밖» 이 아니라 **목록 끝**이다(앞에서부터 20칸)',
       '애니 구간 ' + rangeStr(A));
    ok(pre.jzd.filter(Boolean).length === 20,
       '1-d 재현 — 스태거 지연 `--jzd` 가 꽂힌 행도 20행(같은 자가 건 것)',
       '--jzd 행 ' + pre.jzd.filter(Boolean).length + ' · 첫 값 ' + (pre.jzd[0] || '없음'));

    const minOp = Math.min(...pre.minOp), minSc = Math.min(...pre.minSc);
    ok(M.length > 0 && (minOp < 0.999 || minSc < 0.999),
       '2 재현 — 그 행들이 실제로 «투명→불투명 · 축소→원래» 프레임을 그린다',
       '전이 행 ' + M.length + ' · 최저 opacity ' + minOp.toFixed(3) + ' · 최저 scale ' + minSc.toFixed(3));
  } else {
    na('1-a 재현 — 수리 전 트리(' + PRE + ')에서 앞 20행 애니', G756.skipNote(got));
    na('1-b 재현 — «끝 4행» 이 빠지는 자리', G756.skipNote(got));
    na('1-c 재현 — 빠진 자리가 목록 끝', G756.skipNote(got));
    na('1-d 재현 — `--jzd` 20행', G756.skipNote(got));
    na('2 재현 — 전이 프레임 실재', G756.skipNote(got));
  }

  /* ── 수리 후(현재 트리) ────────────────────────────────────────────────── */
  const c = await open(browser, CUR);
  const cur = await sample(c.page);
  const A2 = animRows(cur), M2 = movedRows(cur);
  console.log('[i] 현재 — 행 ' + cur.n + ' · 애니 ' + rangeStr(A2) + ' · 전이 프레임 ' + rangeStr(M2));

  ok(A2.length === 0, '3 수리 후 — `#chList` 자식에 등록된 애니메이션 0건',
     '애니 ' + A2.length + '행 / 전체 ' + cur.n
     + (A2.length ? ' · 이름 ' + [...new Set(cur.anim.flat())].join(',') : ''));
  ok(M2.length === 0, '4 수리 후 — 열기 직후 0~800ms 전 구간 opacity 1 · scale 1 (전이 0건)',
     '전이 행 ' + M2.length + ' · 최저 opacity ' + Math.min(...cur.minOp).toFixed(3)
     + ' · 최저 scale ' + Math.min(...cur.minSc).toFixed(3));
  ok(cur.jzd.filter(Boolean).length === 0, '4-b 수리 후 — 스태거 지연 `--jzd` 가 한 행도 안 꽂힌다',
     '--jzd 행 ' + cur.jzd.filter(Boolean).length);

  /* [5] 표시 내용 불변 — 행 수·본문·«바닥에서 연다» 가 그대로여야 한다 */
  if (pre) {
    const same = pre.n === cur.n && pre.text.join('') === cur.text.join('');
    ok(same, '5-a 불변 — 행 수·본문이 수리 전과 글자 그대로 같다',
       '행 ' + pre.n + '→' + cur.n + ' · 본문 ' + (same ? '동일' : '다름'));
    ok(pre.atBottom === cur.atBottom && cur.atBottom,
       '5-b 불변 — 여전히 «최신 줄이 바닥» 인 상태로 열린다',
       '수리 전 ' + pre.atBottom + ' → 현재 ' + cur.atBottom);
  } else {
    na('5-a 불변 — 행 수·본문 동일', G756.skipNote(got));
    ok(cur.atBottom, '5-b 불변 — 여전히 «최신 줄이 바닥» 인 상태로 열린다', '현재 ' + cur.atBottom);
  }

  /* [6] 새 메시지 유입 — 전송으로 행이 하나 늘어도 애니 0건 */
  const sent = await c.page.evaluate(async () => {
    const el = document.getElementById('chIn');
    el.value = '유입 시험';
    chSend();
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const kids = [...document.getElementById('chList').children];
    let moved = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 500) {
      for (const k of kids) {
        const cs = getComputedStyle(k);
        const sc = cs.scale === 'none' ? 1 : parseFloat(String(cs.scale).split(' ')[0]);
        if (parseFloat(cs.opacity) < 0.999 || Math.abs(sc - 1) > 0.001) { moved++; break; }
      }
      await new Promise(r => setTimeout(r, 40));
    }
    return { n: kids.length, anim: kids.reduce((s, k) => s + k.getAnimations().length, 0), moved,
             last: (kids[kids.length - 1].textContent || '').includes('유입 시험') };
  });
  ok(sent.anim === 0 && sent.moved === 0, '6-a 유입 — 새 메시지 전송 뒤에도 애니 0건 · 전이 0프레임',
     '행 ' + sent.n + ' · 애니 ' + sent.anim + ' · 전이 프레임 ' + sent.moved);
  ok(sent.last && sent.n === cur.n + 1, '6-b 유입 — 그래도 내 줄은 목록 끝에 실제로 붙는다(기능 불변)',
     '행 ' + cur.n + '→' + sent.n + ' · 끝줄에 본문 ' + sent.last);

  /* [7] 되돌림 시험 — `jz-x` 표시를 떼고 다시 열면 애니가 되살아나야 한다.
        이게 빨가면 [3]·[4] 는 «이미 참인 것» 을 굳힌 헛초록이다(338 교훈). */
  const rev = await c.page.evaluate(async () => {
    closeChat();
    await new Promise(r => setTimeout(r, 420));
    /* 렌더 뒤에 떼야 한다 — openChat 이 innerHTML 을 다시 쓰므로 열고 나서 한 번 더 뗀 뒤 재개폐한다 */
    openChat();
    await new Promise(r => setTimeout(r, 420));
    [...document.getElementById('chList').children].forEach(el => el.classList.remove('jz-x'));
    closeChat();
    await new Promise(r => setTimeout(r, 420));
    /* jzOpen 은 다시 렌더하지 않는다 — `#chw.on` 만 켜면 현재 DOM 그대로 스태거가 돈다 */
    document.getElementById('chw').classList.add('on');
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const kids = [...document.getElementById('chList').children];
    return { n: kids.length, anim: kids.filter(k => k.getAnimations().length).length };
  });
  ok(rev.anim > 0, '7 되돌림 — `jz-x` 를 떼면 스태거가 되살아난다(게이트가 헛초록이 아니다)',
     '표시 제거 후 애니 ' + rev.anim + '행 / ' + rev.n);

  ok(c.errs.length === 0, '8 콘솔 에러 0건', c.errs.slice(0, 2).join(' | ') || '없음');

  await c.page.context().close();
  await browser.close();
  if (tmp) try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}

  console.log('\nprobe717: ' + pass + '/' + (pass + fail) + (skip ? ' (⏸ 보류 ' + skip + ')' : ''));
  process.exit(fail ? 1 : 0);
})();
