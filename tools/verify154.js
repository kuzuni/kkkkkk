/* 작업 154 회귀 게이트 — 가이드 미션 «출석 보상 받기» 삭제 (2026-08-27, 저장소 주인 재지시).
   실행: node tools/verify154.js   → 마지막 줄이 `VERIFY154 n/n PASS` 여야 한다.

   본다:
     §1 미션표      «출석 보상 받기» 가 없다 · 개수 21→20 · 나머지 20개의 «순서» 가 그대로다.
     §2 버전        GUIDE_V === 5.
     §3 세이브 이관 gv ≤ 4 세이브의 idx 가 «같은 미션» 을 계속 가리킨다(idx ≥ 12 → −1).
                    구 idx 11(출석 진행 중)은 다음 미션(«유물 1회 소환하기»)으로 넘어간다.
                    v3 이관(gv ≤ 2, idx ≥ 6 → +1)과 겹쳐도 어긋나지 않는다.
     §4 던전 게이트 DUN_UI.relic1.gm 이 14 이고, 게이트 미션은 여전히 «스테이지 15 도달하기» 다
                    (그 미션 수령 전 = 잠김 · 수령 후 = 해금 — 번호만 당겨졌지 조건은 불변).
     §5 보상 사다리 dia 가 단조 비감소이고, «다음이 소환 미션» 인 자리의 보상 ≥ 10연 1,000 (73 ②).
     §6 실동작      배너가 새 순서대로 뜨고(라벨·문구), 수령하면 idx 가 오르고 다이아가 늘고
                    localStorage 에 반영된다. 마지막 미션 수령 후 배너가 사라진다.
     §7 잔재 없음   «출석» 은 미션에서만 빠졌다 — 70 출석 보상 팝업 자체는 그대로 열린다.
     §8 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 미션 i 를 «현재 · 미완» 으로 만든다.
   ⚠ localStorage.clear()+reload 는 옛 페이지의 자동 save() 가 곧바로 되써서 안 통한다(LESSONS 73-①).
     메모리 상태 S 를 DEF() 로 직접 되돌린다. */
const setMission = (p, i) => p.evaluate((i) => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1;
  gmBase(GUIDE[i]);
  uiDirty = true; renderUI(); drawTuto();
}, i);

/* 154 이후의 미션표 — 순서까지 못 박는다(«순서·개수 불변» 규약의 새 기준선). */
const WANT = [
  '스킬 1회 소환하기', '스킬 장착하기', '무기 1회 소환하기', '장비 장착하기', '훈련 10회 하기',
  '방패 1회 소환하기', '목걸이 1회 소환하기', '적 100마리 처치하기', '스테이지 5 도달하기',
  '던전 1회 입장하기', '룰렛 1회 돌리기', '유물 1회 소환하기', '아이템 1회 강화하기',
  '스테이지 15 도달하기', '유물 Lv 3 모으기', '훈련 30회 하기', '스테이지 25 도달하기',
  '도감 보너스 1회 받기', '보스 1회 처치하기', '스테이지 40 도달하기'
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof GUIDE !== 'undefined' && typeof gmBase === 'function');
  await p.waitForTimeout(600);

  /* ── §1 미션표 ────────────────────────────────────────────────── */
  console.log('§1 미션표 — «출석 보상 받기» 삭제 · 순서 불변');
  const g = await p.evaluate(() => ({
    n: GUIDE.length,
    names: GUIDE.map(m => m.n),
    dia: GUIDE.map(m => gmDia(m)),
    diaFn: GUIDE.map(m => typeof m.dia === 'function'),
    ban: GUIDE.map(m => m.ban || null),
    ver: GUIDE_V
  }));
  ok(!g.names.some(n => /출석/.test(n)), '«출석» 이 들어간 미션이 없다', g.names.filter(n => /출석/.test(n)).join(','));
  eq('§1 미션 개수', g.n, 20);
  ok(JSON.stringify(g.names) === JSON.stringify(WANT), '남은 20개의 이름·순서가 설계 그대로다',
     g.names.map((n, i) => n === WANT[i] ? null : `${i}:${n}≠${WANT[i]}`).filter(Boolean).join(' | '));

  /* ── §2 버전 ─────────────────────────────────────────────────── */
  console.log('§2 GUIDE_V');
  eq('§2 GUIDE_V', g.ver, 5);

  /* ── §3 세이브 이관 ──────────────────────────────────────────── */
  console.log('§3 세이브 이관 — gv ≤ 4 는 idx ≥ 12 이면 −1');
  /* load() 를 직접 태운다. reload 는 옛 페이지의 자동 save() 와 경합한다(LESSONS 73-①). */
  const mig = await p.evaluate(() => {
    const KEY = Object.keys(localStorage).find(k => /idle_hunter_save/.test(k)) || 'idle_hunter_save_v4';
    const out = [];
    const run = (gv, idx) => {
      localStorage.setItem(KEY, JSON.stringify({ guide: { idx, prog: 5, gv }, dia: 100 }));
      load();
      out.push({ gv, idx, got: S.guide.idx, prog: S.guide.prog, newGv: S.guide.gv });
    };
    /* v4 세이브 — 삭제점 앞 · 삭제점 · 삭제점 뒤 · 끝 */
    [0, 5, 10, 11, 12, 13, 20, 21].forEach(i => run(4, i));
    /* gv ≤ 2 세이브 — v3(+1) 과 v5(−1) 이 연쇄한다 */
    [5, 6, 11, 12, 20].forEach(i => run(2, i));
    /* 이미 v5 인 세이브는 건드리지 않는다 */
    run(5, 15);
    return { out, KEY };
  });
  const M = mig.out;
  const at = (gv, idx) => M.find(r => r.gv === gv && r.idx === idx);
  /* v4: idx < 12 그대로 · idx ≥ 12 는 −1 */
  [[0, 0], [5, 5], [10, 10], [11, 11], [12, 11], [13, 12], [20, 19], [21, 20]].forEach(([i, w]) =>
    eq(`§3 v4 idx ${i} →`, at(4, i).got, w));
  ok(at(4, 11).got === 11 && g.names[11] === '유물 1회 소환하기',
    '§3 구 idx 11(출석 진행 중) 은 다음 미션 «유물 1회 소환하기» 로 넘어간다');
  /* gv ≤ 2: 먼저 +1(idx ≥ 6) 그다음 −1(idx ≥ 12).
     v2 idx 11 은 11+1=12 → 12−1=11 로 «제자리» 로 보이지만 우연이 아니다 —
     v2 의 11번 미션이 곧 v5 의 11번(«유물 1회 소환하기») 이다(삽입 1칸 + 삭제 1칸이 상쇄). */
  [[5, 5], [6, 7], [11, 11], [12, 12], [20, 20]].forEach(([i, w]) =>
    eq(`§3 v2 idx ${i} → (+1 후 −1)`, at(2, i).got, w));
  eq('§3 v2 idx 11 이 가리키는 미션', g.names[at(2, 11).got], '유물 1회 소환하기');
  eq('§3 이미 v5 인 세이브는 불변', at(5, 15).got, 15);
  ok(M.filter(r => r.gv !== 5).every(r => r.prog === -1 && r.newGv === 5),
    '§3 이관된 세이브는 기준선 미확정(-1) + gv 5 로 찍힌다');
  ok(M.every(r => Number.isFinite(r.got) && r.got >= 0 && r.got <= 20),
    '§3 이관 결과가 전부 0~20 범위 안 (클램프)');

  /* ── §4 던전 게이트 ──────────────────────────────────────────── */
  console.log('§4 03 던전 해금 — DUN_UI.relic1.gm');
  const dg = await p.evaluate(() => {
    const d = DUNGEONS.find(x => x.id === 'relic1');
    const o = { gm: DUN_UI.relic1.gm, txt: dunLockTxt(d), gate: GUIDE[DUN_UI.relic1.gm - 1].n };
    S.guide.idx = DUN_UI.relic1.gm - 1; o.before = dunLocked(d);
    S.guide.idx = DUN_UI.relic1.gm;     o.after  = dunLocked(d);
    S.guide.idx = 0;
    return o;
  });
  eq('§4 relic1 요구 미션 번호', dg.gm, 14);
  eq('§4 게이트 미션은 여전히 «스테이지 15 도달하기»', dg.gate, '스테이지 15 도달하기');
  ok(/가이드미션/.test(dg.txt) && /14/.test(dg.txt), '§4 잠금 문구가 «가이드미션 14 클리어»', dg.txt);
  ok(dg.before === true && dg.after === false, '§4 그 미션 수령 전 잠김 · 수령 후 해금',
     `before=${dg.before} after=${dg.after}`);

  /* ── §5 보상 사다리 ──────────────────────────────────────────── */
  console.log('§5 보상 사다리 — 한 칸 빠져도 안 깨진다');
  /* «사다리» 는 **고정값 미션들** 사이에서만 성립한다 — 소환 미션 직전 칸은 73 ② 때문에
     `() => summonCost(b,10)` = 1,000 으로 튀어나오므로 원래부터 단조가 아니다(idx 1·5 등).
     삭제로 사다리가 깨졌는지 보려면 고정값 부분수열만 봐야 한다. */
  const fixed = g.dia.map((v, i) => g.diaFn[i] ? null : { i, v }).filter(Boolean);
  const drop = fixed.map((r, k) => (k && r.v < fixed[k - 1].v) ? `${fixed[k - 1].i}:${fixed[k - 1].v}→${r.i}:${r.v}` : null).filter(Boolean);
  ok(drop.length === 0, `§5 고정값 보상 ${fixed.length}칸이 단조 비감소 (내려가는 칸 0)`, drop.join(','));
  const brk = g.ban.map((b, i) => (b && i > 0 && g.dia[i - 1] < 1000) ? `${i}:${g.dia[i - 1]}` : null).filter(Boolean);
  ok(brk.length === 0, '§5 소환 미션 직전 보상 ≥ 10연 1,000 (73 ②)', brk.join(','));
  ok(g.dia.every(v => Number.isFinite(v) && v > 0), '§5 보상값 전부 유한·양수');

  /* ── §6 실동작 ───────────────────────────────────────────────── */
  console.log('§6 배너 · 수령 실동작');
  await setMission(p, 11);
  const b11 = await p.evaluate(() => ({
    name: $('tuto').querySelector('.tmsg') ? $('tuto').querySelector('.tmsg').textContent.trim() : $('tuto').textContent.trim(),
    label: $('tutoBtn') ? $('tutoBtn').textContent.replace(/\s+/g, '') : '',
    cur: GUIDE[S.guide.idx].n
  }));
  eq('§6 idx 11 의 미션', b11.cur, '유물 1회 소환하기');
  ok(/유물 1회 소환하기/.test(b11.name), '§6 배너 문구 = «유물 1회 소환하기»', b11.name);
  ok(/미션-12/.test(b11.label), '§6 배너 라벨 = [미션-12]', b11.label);

  /* 수령 — 미션을 완료 상태로 만들고 배너를 누른다 */
  const claim = await p.evaluate(() => {
    S.guide.idx = 11; S.guide.prog = -1;
    /* 253 — 이 미션은 델타형에서 **abs 형으로 바뀌었다**(«이미 소환해 뒀으면 달성»). 옛 코드는
       `gmBase()` 를 부른 «부작용»(S.guide.prog 에 기준선이 찍힌다)에 기대 목표치를 계산했는데,
       abs 미션에서 gmBase 는 prog 를 건드리지 않고 0 을 돌려준다 → prog 가 -1 그대로라
       목표치가 0 이 돼 «수령 가능» 이 안 됐다. **반환값**을 쓰면 두 형태 모두에서 맞는다.
       154 의 주제(«출석» 삭제·순서·이관)와는 무관한 헬퍼 한 줄이다. */
    S.cnt.sumRelic = gmBase(GUIDE[11]) + GUIDE[11].goal;
    uiDirty = true; renderUI(); drawTuto();
    const dia0 = S.dia, ready = gmReady();
    $('tuto').click();
    save();
    const st = JSON.parse(localStorage.getItem(
      Object.keys(localStorage).find(k => /idle_hunter_save/.test(k))) || '{}');
    return { ready, dia0, dia: S.dia, idx: S.guide.idx, saved: st.guide ? st.guide.idx : null,
             next: S.guide.idx < GUIDE.length ? GUIDE[S.guide.idx].n : null };
  });
  ok(claim.ready, '§6 «유물 1회 소환하기» 가 수령 가능 상태가 된다');
  eq('§6 수령 후 idx', claim.idx, 12);
  ok(claim.dia > claim.dia0, `§6 다이아가 실제로 늘었다 (${claim.dia0} → ${claim.dia})`);
  eq('§6 localStorage 반영', claim.saved, 12);
  eq('§6 다음 미션', claim.next, '아이템 1회 강화하기');

  const last = await p.evaluate(() => {
    S.guide.idx = GUIDE.length; S.guide.prog = 0; drawTuto();
    return { off: $('tuto').classList.contains('off'), cur: gmCur() };
  });
  ok(last.off && last.cur === null, '§6 마지막 미션 뒤 배너가 사라진다(.off)');

  /* ── §7 잔재 없음 ────────────────────────────────────────────── */
  console.log('§7 70 출석 팝업 자체는 그대로');
  const att = await p.evaluate(() => {
    gmCloseAll(); closeModal();
    /* 진입 경로 자체를 본다 — 좌측 사이드 «출석» 아이콘 클릭(함수 직접 호출이 아니라 실제 UI 경로) */
    const btn = document.querySelector('.side .ibtn[data-pop="attend"]');
    if (btn) btn.click();
    const on = $('modal').classList.contains('on');
    const has = !!$('mbox').querySelector('[data-att]') || /출석/.test($('mtitle').textContent);
    closeModal();
    return { btn: !!btn, on, has, title: $('mtitle').textContent.trim() };
  });
  ok(att.btn, '§7 좌측 사이드 «출석» 아이콘이 남아 있다');
  ok(att.on, '§7 그 아이콘을 누르면 출석 팝업이 열린다');
  ok(att.has, '§7 출석 팝업 내용이 살아 있다', att.title);

  /* ── §8 콘솔 ─────────────────────────────────────────────────── */
  console.log('§8 콘솔');
  ok(errs.length === 0, `§8 콘솔 에러 0건 — ${errs.length ? errs.slice(0, 2).join(' | ') : '없음'}`);

  await browser.close();
  console.log(`\nVERIFY154 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
