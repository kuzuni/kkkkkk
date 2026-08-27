/* 작업 113 회귀 게이트 — 가이드 미션 «손가락» 포인터 (2026-08-26, 저장소 주인 지시).
   실행: node tools/verify113.js   → 마지막 줄이 `VERIFY113 n/n PASS` 여야 한다.

   본다:
     §1 데이터 — GUIDE 20개의 hint 유무가 설계대로다(전투 계열만 hint 없음. 154 로 21→20 · 256 으로 6→5).
     §2 이동 뒤 손가락 — 힌트가 있는 미션 14개 전수: gmGo() 후 대상이 실제로 존재하고
        #fxHand·#fxHandR 이 뜨며 손 bbox 가 대상 bbox 와 **40px 이내로 접한다**.
     §3 전투 계열 — hint 없는 미션 6개는 손가락이 뜨지 않는다(이동만).
     §4 74 회귀 — 손가락·링이 아래 버튼의 탭을 가로채지 않는다.
        (오버레이 좌표에서 elementFromPoint 가 대상을 돌려주고, 실제 클릭도 먹는다)
     §5 소멸 — ① 대상 클릭 ② 탭바 이동 ③ 대상이 사라짐 ④ 8초 경과.
     §6 추종 — 스크롤 컨테이너 안의 대상은 가운데로 끌려오고, 스크롤해도 손이 따라온다.
     §7 콘솔 에러 0.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 미션 i 를 «현재 · 미완» 으로 만든다 — verify73 과 같은 방식.
   ⚠ localStorage.clear()+reload 는 옛 페이지의 자동 save() 가 곧바로 되써서 안 통한다(LESSONS 73-①).
     메모리 상태 S 를 DEF() 로 직접 되돌린다. */
const setMission = (p, i, mut) => p.evaluate(([i, mut]) => {
  gmHandOff(); gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  if (mut) eval(mut);
  S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1;
  gmBase(GUIDE[i]);
  uiDirty = true; renderUI(); drawTuto();
}, [i, mut || '']);

/* 배너를 눌러 이동 + 손가락을 띄운 뒤의 상태를 읽는다.
   fxHand 는 대상이 늦게 그려져도 GM_HAND_SEEK(900ms) 안에서 다시 찾으므로 잠깐 기다린다. */
const goAndRead = async (p, i, mut) => {
  await setMission(p, i, mut);
  await p.evaluate(() => gmGo());
  await p.waitForTimeout(260);
  return p.evaluate(() => {
    const h = document.getElementById('fxHand'), r = document.getElementById('fxHandR');
    const el = gmHand && gmHand.el;
    const bb = n => { if (!n) return null; const q = n.getBoundingClientRect();
      return { x: q.left, y: q.top, w: q.width, h: q.height }; };
    /* 두 bbox 사이의 «틈»(겹치면 0) */
    const gap = (a, b) => {
      if (!a || !b) return 1e9;
      const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
      const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
      return Math.round(Math.hypot(dx, dy));
    };
    const hb = bb(h), tb = bb(el);
    return {
      name: GUIDE[S.guide.idx].n,
      hasHint: !!GUIDE[S.guide.idx].hint,
      hand: !!h, ring: !!r,
      target: el ? (el.id || el.className || el.tagName) : null,
      inLayer: !!(h && h.parentElement && h.parentElement.id === 'fxl'),
      pe: h ? getComputedStyle(h).pointerEvents : null,
      rpe: r ? getComputedStyle(r).pointerEvents : null,
      gap: gap(hb, tb),
      handBox: hb, tgtBox: tb,
      /* 손이 프레임 밖으로 나가지 않는다 */
      inFrame: (() => { if (!hb) return true; const f = document.getElementById('app').getBoundingClientRect();
        return hb.x >= f.left - 1 && hb.x + hb.w <= f.right + 1 && hb.y >= f.top - 1 && hb.y + hb.h <= f.bottom + 1; })()
    };
  });
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 540, height: 1140 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof GUIDE !== 'undefined' && typeof fxHand === 'function');
  await p.waitForTimeout(300);

  /* ── §1 데이터 ───────────────────────────────────────────────── */
  console.log('§1 GUIDE.hint 설계 대조');
  const meta = await p.evaluate(() => ({
    n: GUIDE.length,
    hint: GUIDE.map(m => !!m.hint),
    names: GUIDE.map(m => m.n),
    ms: GM_HAND_MS, seek: GM_HAND_SEEK
  }));
  /* 154 — «출석 보상 받기»(구 idx 11) 삭제로 21 → 20 개. 아래 인덱스는 전부 그만큼 당겨졌다. */
  ok(meta.n === 20, `미션 20개 (순서·개수 불변) — ${meta.n}`);
  /* 전투로만 달성하는 미션 = 적 처치 · 스테이지 5/15/25/40 · 보스 → 힌트 없음 */
  /* 256 — idx 7 이 «적 100마리 처치»(전투, 가리킬 버튼 없음) → «전투력 5000 도달»(23 훈련의
     공격력 카드를 가리킨다) 로 바뀌었다. 이제 hint 없는 미션은 «스테이지 N 도달·보스» 5개다. */
  const NOHINT = [8, 13, 16, 18, 19];
  const wantHint = meta.hint.map((_, i) => !NOHINT.includes(i));
  ok(JSON.stringify(meta.hint) === JSON.stringify(wantHint),
    `hint 배치 = 전투 계열 ${NOHINT.length}개만 없음 (실제 없음: ${meta.hint.map((h, i) => h ? null : i).filter(x => x !== null).join(',')})`);
  ok(meta.ms === 8000, `자동 소멸 8초 — ${meta.ms}ms`);

  /* ── §2 힌트가 있는 미션 전수 ─────────────────────────────────── */
  console.log('§2 이동 뒤 손가락 — 대상 존재 · bbox 접촉 ≤ 40px');
  /* 일부 미션은 «가리킬 것» 이 있으려면 상태가 필요하다(보유 스킬·장착 장비·도감 강화 대기). */
  const MUT = {
    /* 미장착 보유 스킬 1개 → 07 격자의 그 카드를 가리켜야 한다(잠금 슬롯 폴백이 아니라) */
    1:  "S.own['slash']={l:1,n:0}; S.eqSkill=[];",
    /* 장착된 무기 → 06 의 «찬» 슬롯을 가리켜야 한다(05 세부의 [강화]로 가는 길) */
    12: "const _w=EQUIPS.find(e=>e.slot==='weapon'); S.own[_w.id]={l:1,n:0}; S.eqSlot.weapon=_w.id;",
    /* 세트 전원을 보유시켜 도감 강화 대기(.rdy) 버튼을 만든다 */
    17: "const _s=COLL_SETS[0]; collTab=_s.tab; _s.it.forEach(id=>{S.own[id]={l:1,n:0}});"
  };
  /* 폴백이 아니라 «의도한» 대상을 잡았는지까지 본다(빈 슬롯 폴백은 통과가 아니다) */
  const WANT = {
    1:  ['sk-card',  '07 격자의 미장착 보유 카드'],
    3:  ['empty',    '06 의 빈 부위 슬롯'],
    4:  ['tr-card',  '23 공격력 훈련 카드'],
    15: ['tr-card',  '23 공격력 훈련 카드'],
    12: ['!empty',   '06 의 장착된 부위 슬롯'],
    17: ['rdy',      '21 도감의 강화 가능 버튼']
  };
  const HINTED = [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 14, 15, 17];
  for (const i of HINTED) {
    const s = await goAndRead(p, i, MUT[i]);
    ok(s.hand && s.ring && s.target,
      `미션 ${i} «${s.name}» → 대상 ${s.target} · 손가락 표시`);
    ok(s.hand && s.gap <= 40,
      `미션 ${i} 손 bbox ↔ 대상 bbox 틈 ${s.gap}px ≤ 40`);
    ok(s.inLayer && s.pe === 'none' && s.rpe === 'none',
      `미션 ${i} #fxl 안 · pointer-events:none (74 회귀 방지)`);
    ok(s.inFrame, `미션 ${i} 손가락이 프레임 안에 있다`);
    if (WANT[i]) {
      const [tok, d] = WANT[i];
      const has = tok[0] === '!' ? !String(s.target).includes(tok.slice(1))
                                 : String(s.target).includes(tok);
      ok(has, `미션 ${i} 대상이 ${d} 다 — «${s.target}»`);
    }
  }

  /* ── §3 전투 계열은 미표시 ───────────────────────────────────── */
  console.log('§3 전투 계열 — 이동만, 손가락 없음');
  for (const i of NOHINT) {
    const s = await goAndRead(p, i);
    ok(!s.hasHint && !s.hand, `미션 ${i} «${s.name}» — 손가락 없음`);
  }

  /* ── §4 74 회귀 — 아래 버튼의 탭을 가로채지 않는다 ─────────────── */
  console.log('§4 74 회귀 — 손가락이 탭을 먹지 않는다');
  await goAndRead(p, 4);                                   /* 훈련 — 공격력 카드 버튼 */
  const tap = await p.evaluate(() => {
    const h = document.getElementById('fxHand'), r = document.getElementById('fxHandR');
    const hb = h.getBoundingClientRect(), rb = r.getBoundingClientRect();
    /* 손·링 한복판에서 히트테스트 — pointer-events:none 이면 «아래» 가 잡혀야 한다 */
    const at = (x, y) => { const n = document.elementFromPoint(x, y); return n ? (n.id || n.className || n.tagName) : null; };
    const hitHand = at(hb.left + hb.width / 2, hb.top + hb.height / 2);
    const hitRing = at(rb.left + rb.width / 2, rb.top + rb.height / 2);
    return { hitHand: String(hitHand), hitRing: String(hitRing) };
  });
  ok(!/fxHand/.test(tap.hitHand) && !/fxHand/.test(tap.hitRing),
    `히트테스트가 손가락을 잡지 않는다 (손 위치→${tap.hitHand} · 링 위치→${tap.hitRing})`);
  /* 실제 탭 — 손가락이 덮은 훈련 카드를 눌러 강화가 실제로 걸리는지.
     ⚠ renderTrain() 은 카드 노드를 통째로 갈아끼운다 — 좌표는 «다시 질의해서» 잡아야 한다
       (떨어져 나간 노드의 rect 를 쓰면 엉뚱한 곳을 눌러 «회귀» 로 오진한다. LESSONS 50-①) */
  const before = await p.evaluate(() => { S.gold = 1e12; renderTrain(); return S.upgrades; });
  await p.waitForTimeout(120);
  const box = await p.evaluate(() => {
    const t = document.querySelector('#trCards [data-tr="atk"]').getBoundingClientRect();
    return { x: t.left + t.width / 2, y: t.top + t.height / 2, ok: !!document.getElementById('fxHand') };
  });
  ok(box.ok, '재렌더(renderTrain) 뒤에도 손가락이 새 노드를 다시 잡는다');
  await p.mouse.click(box.x, box.y);
  await p.waitForTimeout(120);
  const after = await p.evaluate(() => S.upgrades);
  ok(after > before, `손가락이 덮은 훈련 버튼이 실제로 눌린다 (${before} → ${after})`);

  /* ── §5 소멸 ─────────────────────────────────────────────────── */
  console.log('§5 소멸 — 대상 클릭 · 탭바 · 대상 소실 · 8초');
  ok(await p.evaluate(() => !document.getElementById('fxHand')),
    '① 대상을 누르면 손가락이 사라진다');

  await goAndRead(p, 9);                                   /* 03 던전 */
  await p.evaluate(() => $('tabbar').querySelector('[data-t]').dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, composed: true })));
  await p.waitForTimeout(80);
  ok(await p.evaluate(() => !document.getElementById('fxHand')),
    '② 탭바를 누르면 손가락이 사라진다');

  await goAndRead(p, 10);                                  /* 룰렛 — 모달 */
  await p.evaluate(() => closeModal());
  await p.waitForTimeout(1100);                            /* SEEK 창(900ms)이 지나야 정리된다 */
  ok(await p.evaluate(() => !document.getElementById('fxHand')),
    '③ 대상이 사라지면(팝업 닫힘) 손가락도 사라진다');

  /* ④ 8초 — 실시간으로 기다리지 않고 born 을 과거로 밀어 다음 프레임에서 판정시킨다 */
  await goAndRead(p, 4);
  ok(await p.evaluate(() => !!document.getElementById('fxHand')), '④-a 손가락이 떠 있다');
  await p.evaluate(() => { gmHand.born -= GM_HAND_MS + 50; });
  await p.waitForTimeout(120);
  ok(await p.evaluate(() => !document.getElementById('fxHand')),
    '④-b 8초가 지나면 손가락이 사라진다');

  /* ── §6 스크롤 추종 ──────────────────────────────────────────── */
  console.log('§6 스크롤 컨테이너 대상 — 끌어오기 + 추종');
  /* 목걸이 상자는 10 상점 리스트의 아래쪽이라 스크롤이 필요하다 */
  const sc = await goAndRead(p, 6);
  ok(sc.hand && sc.gap <= 40, `목걸이 상자(스크롤 필요) — 틈 ${sc.gap}px`);
  const follow = await p.evaluate(async () => {
    const li = $('shopList');
    const g = () => {
      const h = document.getElementById('fxHand').getBoundingClientRect();
      const t = gmHand.el.getBoundingClientRect();
      const dx = Math.max(0, Math.max(h.left - t.right, t.left - h.right));
      const dy = Math.max(0, Math.max(h.top - t.bottom, t.top - h.bottom));
      return Math.round(Math.hypot(dx, dy));
    };
    const a = g(), s0 = li.scrollTop, y0 = gmHand.el.getBoundingClientRect().top;
    li.scrollTop = Math.max(0, li.scrollTop - 220);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { a, b: g(), moved: Math.round(Math.abs(li.scrollTop - s0)),
             tgtMoved: Math.round(Math.abs(gmHand.el.getBoundingClientRect().top - y0)) };
  });
  ok(follow.moved > 50 && follow.tgtMoved > 50,
    `대상이 스크롤 컨테이너 안에 있고 실제로 굴렀다 (스크롤 ${follow.moved}px · 대상 ${follow.tgtMoved}px)`);
  ok(follow.b <= 40, `스크롤 뒤에도 손이 따라온다 (${follow.a}px → ${follow.b}px)`);

  /* ── §7 콘솔 에러 ────────────────────────────────────────────── */
  console.log('§7 콘솔');
  ok(errs.length === 0, `콘솔 에러 0건 — ${errs.slice(0, 3).join(' | ') || '없음'}`);

  await browser.close();
  const n = pass + fail;
  console.log(`\nVERIFY113 ${pass}/${n} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
