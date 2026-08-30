#!/usr/bin/env node
/* 게이트 — 작업 428 「35 패스 하단 탭 = 두 탑의 실제 패스」 (저장소 주인 지시 2026-08-30)
 *
 *   node tools/verify428.js
 *
 * 주인 원문: «패스에서 보물상자,시련의탑-> 시련의탑, 절망의 탑으로 바꾸고 자물쇠 풀기 / 잠금 풀기».
 *
 * ⚑ **«자물쇠 풀기» 는 «준비 중 토스트» 로는 푼 것이 아니다**(주인이 «자물쇠 풀기 / 잠금 풀기» 로 두 번
 *   말했다 = 지시서 «기능 완성 규칙»). 그래서 이 자의 절반은 **실동작**이다 — 눌러서 리스트가 서고,
 *   레벨을 깨면 단계가 열리고, 받으면 세이브에 남는가.
 *
 *   [A] 탭 4칸 — 라벨 «스테이지 · 시련의 탑 · 절망의 탑 · 출석» · `.lk`/🔒 **0개** · 죽은 이름 `box` 0개
 *   [B] 이름은 **모델이 말한다** — `TOWERS` 의 이름을 바꾸면 탭 라벨·타이틀이 따라온다(210 «한 곳 규약»)
 *   [C] 실동작 ① — 두 탭을 **실제로 클릭**하면 «준비 중/해금 안 됨» 토스트 0건 + 리스트가 선다
 *   [D] 실동작 ② — 해금이 `S.tower`/`S.tower2` 를 따른다. **두 탑이 서로 안 섞인다**(210 ⓐ)
 *   [E] 보상 — 전 칸 **dia**(398·399 주인 지시) · 수령이 `S.dia` 에 반영 · `got`/`prem` 이 탭별 독립
 *   [F] 체인 — 301 레드닷 · 302 [일괄 받기] 가 새 탭을 **저절로** 센다(`Object.keys(PASS_TABS)` 순회)
 *   [G] 세이브 이관 **없음** — 새 탭 키가 없는 구 세이브를 실제로 로드해 확인(KEY 안 올림)
 *   [H] 기하 — 라벨 잉크가 칸을 안 넘고 탭바 좌표 규격(측정표 35 §3-1)이 그대로다
 *   [R] 되돌림 시험 — 자물쇠를 도로 붙이면 [A] 가 · `PASS_TABS` 에서 탭을 빼면 [C] 가 실제로 빨개진다
 *
 * ⚠ **보상을 «그 탑의 산출 재화» 로 하지 않은 이유**(등재문과 갈린 자리):
 *   398·399(주인 원문 «패스 보상 출석보상 전부 다이아로 줘라», 2026-08-29)가 더 나중이고 더 넓은
 *   지시다. `verify398` §1 이 `Object.keys(PASS_TABS)` 전 칸에 «dia 하나» 를 재므로 유물조각·단련석을
 *   넣으면 그 자리에서 빨개진다 — 그 결정이 이미 게이트로 굳어 있다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → 동작» 판정이라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

const WANT = ['스테이지', '시련의 탑', '절망의 탑', '출석'];

async function boot(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, save]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);
  return { p, errs };
}

(async () => {
  console.log('=== 428 패스 하단 탭 = 두 탑의 실제 패스 ===\n');
  const browser = await launch(chromium);
  const { p, errs } = await boot(browser);

  /* ══ [A] 탭 4칸 ═══════════════════════════════════════════════════════ */
  console.log('[A] 탭 4칸 · 자물쇠 0개');
  const bar = await p.evaluate(() => {
    openPass('stage');
    return [...document.querySelectorAll('#psBar .pt')].map(c => ({
      k: c.dataset.ptab, txt: c.querySelector('b>em').textContent.trim(),
      lkCls: c.classList.contains('lk'), lkNode: !!c.querySelector('s.lk'),
      inModel: !!PASS_TABS[c.dataset.ptab]
    }));
  });
  ok(bar.length === 4, '탭이 4칸이다 (실측 ' + bar.length + ')');
  ok(bar.map(c => c.k).join(',') === 'stage,tower,tower2,att',
     '탭 키 순서 = stage · tower · tower2 · att (실측 ' + bar.map(c => c.k).join(',') + ')');
  ok(bar.map(c => c.txt).join(' · ') === WANT.join(' · '),
     '라벨 = «' + WANT.join(' · ') + '» (실측 ' + bar.map(c => c.txt).join(' · ') + ')');
  ok(bar.every(c => !c.lkCls && !c.lkNode), '자물쇠 0개 — `.lk` 클래스도 🔒 노드도 없다',
     bar.filter(c => c.lkCls || c.lkNode).map(c => c.k).join(',') || '0개');
  ok(bar.every(c => c.inModel), '네 칸 전부 PASS_TABS 에 있다 = «준비 중» 칸이 없다');
  ok(!/data-ptab="box"/.test(SRC), '죽은 이름 «box» 가 마크업에서 사라졌다(89 가 보물상자를 폐기했다)', '소스 grep');

  /* ══ [B] 이름은 모델이 말한다 ══════════════════════════════════════════ */
  console.log('\n[B] 이름은 모델(TOWERS)이 말한다');
  const nm = await p.evaluate(() => {
    const t0 = TOWERS[0].n;
    TOWERS[0].n = '시험용 탑';
    /* PASS_TABS 의 ttl/tab 은 «정의 시점» 에 굳으므로 이름 소스를 따라오는지 여기서 되묻는다 —
       따라오지 않으면 이름이 두 곳에 적혀 있다는 뜻이다(210 «한 곳 규약» 위반). */
    const src = { tab: PASS_TABS.tower.tab, ttl: PASS_TABS.tower.ttl, model: TOWERS[0].n };
    TOWERS[0].n = t0;
    return { src, back: TOWERS[0].n, d2: PASS_TABS.tower2.tab, m2: TOWER_DESPAIR_N };
  });
  ok(nm.src.tab === '시련의 탑' && nm.src.ttl === '시련의 탑 패스 1',
     '탭 라벨·타이틀이 TOWERS[0].n 에서 나온다 (실측 ' + nm.src.tab + ' / ' + nm.src.ttl + ')');
  ok(nm.d2 === nm.m2 && nm.m2 === '절망의 탑',
     'tower2 라벨 = TOWER_DESPAIR_N 상수 그대로 (실측 ' + nm.d2 + ')');

  /* ══ [C] 실동작 ① — 클릭 · 토스트 0건 · 리스트 ═════════════════════════ */
  console.log('\n[C] 실동작 ① 클릭 → 준비 중 토스트 0건 · 리스트가 선다');
  for (const k of ['tower', 'tower2']) {
    await p.evaluate(() => document.querySelectorAll('.fx-toast').forEach(e => e.remove()));
    await p.click('#psBar [data-ptab="' + k + '"]');
    await p.waitForTimeout(220);
    const r = await p.evaluate(() => ({
      tab: passTab, ttl: document.getElementById('psTtl').textContent,
      stl: document.getElementById('psStL').textContent,
      price: document.getElementById('psPrice').textContent,
      rows: document.querySelectorAll('#psTk .ps-r').length,
      boxes: document.querySelectorAll('#psTk .ps-bx').length,
      on: document.querySelector('#psBar .pt.on').dataset.ptab,
      toast: [...document.querySelectorAll('.fx-toast')].map(e => e.textContent).join(' | ')
    }));
    ok(r.tab === k && r.on === k, k + ' — 그 탭으로 갈아탄다 (실측 ' + r.tab + '/' + r.on + ')');
    ok(r.toast === '', k + ' — «준비 중 / 해금되지 않은» 토스트 0건', r.toast || '0건');
    ok(r.rows === 30 && r.boxes === 90, k + ' — 리스트가 실제로 선다 (30행 × 3칸 = ' + r.boxes + '칸)');
    ok(r.stl === '최고 레벨 :', k + ' — 스탯 라벨이 427 낱말 «최고 레벨» (실측 ' + r.stl + ')');
    ok(r.price === '₩9,900', k + ' — 가격 ₩9,900 (실측 ' + r.price + ')');
  }

  /* ══ [D] 실동작 ② — 진행도가 S.tower/S.tower2 를 따른다 · 두 탑이 안 섞인다 ══ */
  console.log('\n[D] 실동작 ② 해금이 탑 진행을 따른다 · 두 탑이 안 섞인다');
  const prog = await p.evaluate(() => {
    S.tower = 1; S.tower2 = 1; S.pass.got = {}; S.pass.prem = {};
    const rd = t => { const prev = passTab; passTab = t; renderPass();
      const o = { open: document.querySelectorAll('#psTk .ps-hex:not(.lk)').length,
                  stv: document.getElementById('psStV').textContent };
      passTab = prev; return o; };
    const a = { t1: rd('tower'), t2: rd('tower2') };
    S.tower = 6;                                   /* 레벨 5 까지 깼다 */
    const b = { t1: rd('tower'), t2: rd('tower2') };
    S.tower2 = 3;                                  /* 절망만 레벨 2 */
    const c = { t1: rd('tower'), t2: rd('tower2') };
    S.tower = 1; S.tower2 = 1; renderPass();
    return { a, b, c };
  });
  ok(prog.a.t1.open === 0 && prog.a.t2.open === 0,
     '한 레벨도 안 깼으면 해금 단계 0 (실측 ' + prog.a.t1.open + '/' + prog.a.t2.open + ')');
  ok(prog.b.t1.open === 5 && prog.b.t1.stv === '5',
     'S.tower 6 (= 레벨 5 클리어) → 5단계 해금 · «최고 레벨» 5 (실측 ' + prog.b.t1.open + '/' + prog.b.t1.stv + ')');
  ok(prog.b.t2.open === 0, '★ 시련의 탑을 올려도 절망의 탑 패스는 안 열린다 (실측 ' + prog.b.t2.open + ')');
  ok(prog.c.t2.open === 2 && prog.c.t1.open === 5,
     'S.tower2 3 → 절망 2단계 · 시련은 5 그대로 (실측 ' + prog.c.t2.open + '/' + prog.c.t1.open + ')');

  /* ══ [E] 보상 dia · 수령 · 네임스페이스 ═══════════════════════════════ */
  console.log('\n[E] 보상 dia · 수령 · got/prem 네임스페이스');
  const rw = await p.evaluate(() => {
    const keys = [];
    for (const t of ['tower', 'tower2']) {
      const prev = passTab; passTab = t;
      for (let i = 0; i < PASS_TABS[t].n; i++) for (let c = 0; c < PASS_TABS[t].cols; c++) keys.push(passRw(i, c).k);
      passTab = prev;
    }
    S.tower = 4; S.tower2 = 4; S.pass.got = {}; S.pass.prem = {};
    passTab = 'tower'; renderPass();
    const d0 = S.dia, want = passRw(0, 0).n, done = passClaim(0, 0);
    const gain = S.dia - d0;
    const gotK = Object.keys(S.pass.got);
    /* 같은 단계·같은 칸이 **다른 탭에서는 아직 안 받은 것**이어야 한다(네임스페이스) */
    passTab = 'tower2'; renderPass();
    const other = passGot(0, 0);
    const d1 = S.dia, done2 = passClaim(0, 0), gain2 = S.dia - d1;
    /* 프리미엄도 탭별 */
    S.pass.prem = { tower: 1 };
    passTab = 'tower'; const p1 = passPrem();
    passTab = 'tower2'; const p2 = passPrem();
    S.pass.prem = {}; S.pass.got = {}; S.tower = 1; S.tower2 = 1; renderPass();
    return { keys: [...new Set(keys)], want, done, gain, gotK, other, done2, gain2, p1, p2 };
  });
  ok(rw.keys.join(',') === 'dia', '두 탭 전 칸 보상 키가 dia 하나 (398·399 주인 지시) — [' + rw.keys.join(',') + ']');
  ok(rw.done === true && rw.gain === rw.want && rw.want > 0,
     '수령이 실제로 S.dia 에 반영된다 (+' + rw.gain + ' = 표기 ' + rw.want + ')');
  ok(rw.gotK.join(',') === 'tower:0:0', 'got 키가 «탭:단계:칸» 네임스페이스 (' + rw.gotK.join(',') + ')');
  ok(rw.other === false && rw.done2 === true && rw.gain2 > 0,
     '★ 시련 1단계를 받아도 절망 1단계는 아직 «안 받음» 이다 (탭이 안 섞인다)');
  ok(rw.p1 === true && rw.p2 === false, '프리미엄도 탭별로 따로 산다 (tower ' + rw.p1 + ' / tower2 ' + rw.p2 + ')');

  /* ══ [F] 301 레드닷 · 302 [일괄 받기] 가 새 탭을 센다 ═══════════════════ */
  console.log('\n[F] 301 레드닷 · 302 [일괄 받기] 체인');
  const chain = await p.evaluate(() => {
    S.tower = 4; S.tower2 = 1; S.pass.got = {}; S.pass.prem = {};
    S.lastMonthly = monthKey(); S.mailx = []; allMails().forEach(m => S.mail[m.id] = 2);
    uiDirty = true; renderUI();
    passTab = 'tower'; renderPass();
    const tabDot = k => { const el = document.querySelector('#psBar .pt[data-ptab="' + k + '"]');
      return { a: el.classList.contains('alert'), d: getComputedStyle(el.querySelector('.bdg')).display }; };
    const out = { ready: passReadyTab('tower'), any: passReadyAny(),
                  dot: tabDot('tower'), dot2: tabDot('tower2'),
                  menu: document.getElementById('menub').classList.contains('alert'),
                  upall: document.getElementById('psw').classList.contains('upall'),
                  label: document.querySelector('#psAll>b').textContent };
    const d0 = S.dia;
    passClaimAll();
    out.allGain = S.dia - d0;
    out.afterDot = tabDot('tower');
    out.afterReady = passReadyTab('tower');
    S.pass.got = {}; S.tower = 1; renderPass();
    return out;
  });
  ok(chain.ready === true && chain.any === true, '301 — passReadyTab(tower) · passReadyAny 가 새 탭을 센다');
  ok(chain.dot.a === true && chain.dot.d === 'block', '301 — 그 탭 배지가 실제로 보인다 (' + chain.dot.d + ')');
  ok(chain.dot2.a === false, '301 — 받을 게 없는 절망 탭은 꺼짐');
  ok(chain.menu === true, '301 — ▦ 메뉴 버튼까지 체인이 이어진다');
  ok(chain.upall === true && /일괄 받기 3/.test(chain.label), '302 — [일괄 받기] 가 뜨고 라벨에 개수 (' + chain.label + ')');
  ok(chain.allGain > 0 && chain.afterReady === false && chain.afterDot.a === false,
     '302 — 누르면 전부 수령되고 레드닷이 꺼진다 (+' + chain.allGain + ')');

  /* ══ [H] 기하 — 라벨이 칸을 안 넘는다 · 탭바 규격 ══════════════════════ */
  console.log('\n[H] 기하');
  const geo = await p.evaluate(() => {
    passTab = 'stage'; renderPass();
    const bk = document.querySelector('#psBar .bk').getBoundingClientRect();
    return { bk: Math.round(bk.width),
      cells: [...document.querySelectorAll('#psBar .pt')].map(c => {
        const cb = c.getBoundingClientRect(), lb = c.querySelector('b>em').getBoundingClientRect(),
              ic = c.querySelector('i').getBoundingClientRect();
        return { k: c.dataset.ptab, on: c.classList.contains('on'), w: Math.round(cb.width),
                 x: Math.round(cb.x), ink: +lb.width.toFixed(1),
                 ovf: +Math.max(0, lb.width - cb.width).toFixed(1),
                 icTop: +(ic.y - cb.y).toFixed(1) };
      }) };
  });
  ok(geo.bk === 195, '뒤로가기 칸 195px 고정(측정표 35 §3-1)', geo.bk + 'px');
  ok(geo.cells.every(c => c.w === (c.on ? 289 : 190)),
     '비활성 190 · 활성 289 규격 그대로', geo.cells.map(c => c.k + ':' + c.w).join(' '));
  ok(geo.cells.every(c => c.ovf === 0), '라벨 잉크가 칸을 안 넘는다',
     geo.cells.map(c => c.k + ':' + c.ink).join(' '));
  /* 스테이지 활성(289) 기준 좌표 — 뒤로 195 + 구분선 5 = 200 부터 5/6/4 로 벌어진다.
     passBarLayout() 은 428 이 한 줄도 안 건드렸고 칸 수(4)·순서도 그대로다. */
  ok(geo.cells[0].x === 200 && geo.cells[1].x === 494 && geo.cells[2].x === 690 && geo.cells[3].x === 884,
     '칸 좌표가 종전 그대로(구분선 5/6/4 실측) — 칸 수·순서가 안 바뀌었다',
     geo.cells.map(c => c.x).join('/'));
  ok(Math.abs(geo.cells[1].icTop - geo.cells[2].icTop) < 0.5,
     '두 탑 칸의 아이콘 상자가 같은 자리다(🏰 보정을 둘이 공유)',
     geo.cells[1].icTop + ' / ' + geo.cells[2].icTop);

  ok(errs.length === 0, '콘솔 에러 0', errs.length ? errs.slice(0, 3).join(' / ') : '0건');

  /* ══ [G] 세이브 이관 없음 — 새 탭 키가 없는 구 세이브 ══════════════════ */
  console.log('\n[G] 구 세이브 실로드 — 이관 0줄');
  const old = JSON.stringify({ gold: 5000, dia: 300, best: 40, tower: 5,
    pass: { got: { 'stage:0:0': 1, '2:0': 1 }, prem: { stage: 1 } }, att: { n: 3, date: '' } });
  const b2 = await boot(browser, old);
  const mig = await b2.p.evaluate(() => {
    openPass('tower');
    return { tab: passTab, tower: S.tower, tower2: S.tower2,
             open: document.querySelectorAll('#psTk .ps-hex:not(.lk)').length,
             got: Object.keys(S.pass.got).sort().join(','),
             prem: JSON.stringify(S.pass.prem),
             premHere: passPrem(), rows: document.querySelectorAll('#psTk .ps-r').length };
  });
  ok(mig.rows === 30 && mig.open === 4,
     '새 탭 키가 없는 구 세이브에서도 탑 패스가 정상으로 선다 (S.tower ' + mig.tower + ' → ' + mig.open + '단계)');
  ok(mig.tower2 === 1, '없던 S.tower2 는 기본 1 로 정화된다(210 의 자가 이미 지키는 자리)', String(mig.tower2));
  ok(mig.got.includes('stage:0:0') && !mig.got.includes('tower:'),
     '구 세이브의 got 은 그대로 · 새 탭 키는 저절로 안 생긴다 (' + mig.got + ')');
  ok(mig.premHere === false, '구 세이브의 프리미엄(stage)이 탑 패스로 새지 않는다 (' + mig.prem + ')');
  ok(b2.errs.length === 0, '구 세이브 로드 콘솔 에러 0', b2.errs.slice(0, 2).join(' / ') || '0건');

  /* ══ [R] 되돌림 시험 ═══════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험');
  const rev = await p.evaluate(() => {
    const out = {};
    /* ① 자물쇠를 도로 붙이면 [A] 의 «자물쇠 0개» 가 빨개진다 */
    const cell = document.querySelector('#psBar [data-ptab="tower"]');
    cell.classList.add('lk');
    const s = document.createElement('s'); s.className = 'lk'; s.textContent = '🔒'; cell.appendChild(s);
    out.lkSeen = cell.classList.contains('lk') && !!cell.querySelector('s.lk');
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    cell.click();
    out.lkToast = [...document.querySelectorAll('.fx-toast')].map(e => e.textContent).join('|');
    cell.classList.remove('lk'); s.remove();
    /* ② PASS_TABS 에서 탭을 빼면 [C] 가 «준비 중» 토스트를 잡는다 */
    const keep = PASS_TABS.tower2; delete PASS_TABS.tower2;
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    document.querySelector('#psBar [data-ptab="tower2"]').click();
    out.gone = [...document.querySelectorAll('.fx-toast')].map(e => e.textContent).join('|');
    PASS_TABS.tower2 = keep;
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    passTab = 'stage'; renderPass();
    return out;
  });
  ok(rev.lkSeen && /해금되지 않은/.test(rev.lkToast),
     '§R ① 자물쇠를 도로 붙이면 «해금되지 않은 패스» 토스트가 다시 뜬다 — 즉 [A] 는 진짜를 잰다',
     rev.lkToast);
  ok(/준비 중/.test(rev.gone),
     '§R ② PASS_TABS 에서 빼면 «준비 중» 토스트가 뜬다 — 즉 [C] 의 «0건» 은 공짜가 아니다', rev.gone);

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY428 PASS' : 'VERIFY428 FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
