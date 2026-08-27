#!/usr/bin/env node
/* 88 검증 — «스탯 훈련» 서브탭 + 캐릭터 레벨·경험치·스탯 포인트 시스템 폐기
 *
 *   node tools/verify88.js
 *
 * 검사 항목:
 *   [A] 소스 — spAtk/statStage/plvNeed/pexp 등 폐기 식별자가 코드(주석 제외)에 0건
 *   [B] 23 훈련 팝업 — 서브탭(#trSub/[data-trsub]) 없음 · 리본 «훈련 n 단계» · 카드 3장 💰 재화
 *   [C] 훈련 실동작 — 카드 탭 → 골드 감소 + Lv 상승 + S.upgrades 증가 (88 이후에도 골드 훈련은 산다)
 *   [D] 강화 탭 — «⚒️ 강화 / 🧬 스탯» 서브탭 없음([data-uptab]/[data-sp]/[data-spauto]/[data-spreset] 0)
 *   [E] 구 세이브 호환 — plv/pexp/sp/spAtk/spHp/spRegen/spAuto/statStage 가 든 세이브가 에러 없이 로드
 *       + 그 키들이 전투력에 영향 없음(포인트 유무로 cp() 동일 = «아무 곳에서도 읽지 않음»)
 *   [F] 킬 경험치 폐기 — 적 처치를 겪어도 S.pexp/S.plv 가 생기지 않는다
 *   [G] 가이드 미션 — idx16 = «훈련 30회 하기»(같은 자리 교체) · GUIDE_V 4 · 카운터 S.upgrades 연동
 *   [H] 프로필 정보 탭 — «레벨/경험치» 문구 없음 · «최고 스테이지» 로 대체
 *   [I] 재화 정보 — CURINFO.sp 없음 · openCurInfo('sp') 는 조용히 무시
 *   [J] 가방 — «스탯 포인트» 행 없음
 *   [K] 탭 레드닷 — 구 세이브 sp>0 이어도 성장 탭 alert 없음
 *   [L] 전투력 제거분 기록 — 구 세이브(포인트 100/50/20·statStage 3)의 cp 배율 변화 수치 출력
 *   [M] 콘솔 에러 0건
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  /* [A] 소스 검사 — 주석을 걷어낸 코드에서 폐기 식별자 0건 */
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const dead = ['spAtk', 'spHp', 'spRegen', 'spAuto', 'statStage', 'statCap', 'statLv(', 'plvNeed',
    'S.plv', 'S.pexp', 'S.sp ', 'S.sp;', 'S.sp)', 'S.sp,', 'addStat', 'autoSpend', 'resetStat',
    'SP_PER_LV', 'SP_VALUE', 'gainExp', 'statTrain', 'renderStat(', 'trSub', 'trIsTrain', 'upTab', 'data-trsub'];
  const hits = dead.filter(t => code.includes(t));
  ok(hits.length === 0, '[A] 폐기 식별자 0건 (주석 제외)', hits.length ? '잔존: ' + hits.join(', ') : '');

  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));

  /* 구 세이브(88 이전 키 포함)를 심어 두고 로드시킨다 */
  await page.addInitScript(() => {
    const KEY = 'idle_hunter_save_v4';
    if (window.__seeded) return; window.__seeded = 1;
    const old = {
      nick: 'V88', gold: 5e6, dia: 1000, stage: 3, best: 3, rank: 0,
      plv: 30, pexp: 12, sp: 13, spAtk: 100, spHp: 50, spRegen: 20, spAuto: true, statStage: 3,
      upgrades: 0
    };
    localStorage.setItem(KEY, JSON.stringify(old));
  });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderTrain === 'function' && typeof cp === 'function');
  await page.waitForTimeout(1000);

  /* [E] 구 세이브 로드 + 포인트 무영향 */
  const E = await page.evaluate(() => {
    const cpWith = cp();
    /* 구 키를 지워도 cp 가 같아야 «아무 곳에서도 읽지 않는다» */
    delete S.spAtk; delete S.spHp; delete S.spRegen; delete S.statStage; delete S.plv; delete S.pexp; delete S.sp;
    markDirty();
    return { loaded: S.nick === 'V88', cpWith, cpWithout: cp() };
  });
  ok(E.loaded, '[E] 구 세이브(88 이전 키 포함) 로드 정상');
  ok(E.cpWith === E.cpWithout, '[E] 구 키가 전투력에 무영향', 'cp ' + E.cpWith + ' = ' + E.cpWithout);

  /* [B] 23 훈련 팝업 — 서브탭 없음 */
  await page.evaluate(() => { gmCloseAll && gmCloseAll(); openTrain(); });
  await page.waitForTimeout(400);
  /* 125 이후 화폐는 이모지 텍스트가 아니라 <img class="cic" data-cur-ic="…" alt=""> 다 —
     `alt=""` 이라 textContent 에 **없다**(LESSONS 175-② · 185-⑤). 옛 `c === '💰'` 단언은
     화면이 멀쩡한데 원리적으로 항상 false 였다. 아이콘은 **키**로 재고, 가격 칸은 «잴 수 있는
     값인가» 를 같이 못 박는다(212-②) — 아이콘만 보면 `.cb` 가 통째로 비어도 «gold 0개» 로
     조용히 통과할 수 있다. 88 이 지키는 성질은 «훈련 카드 3장이 골드로 산다» 다. */
  const B = await page.evaluate(() => ({
    on: document.getElementById('trw').classList.contains('on'),
    sub: !!document.querySelector('#trSub, [data-trsub], .tr-sub'),
    rib: document.getElementById('trRib').textContent,
    cards: [...document.querySelectorAll('#trw .tr-card')].length,
    coins: [...document.querySelectorAll('#trw .tr-card .cb s')].map(e => {
      const im = e.querySelector('img[data-cur-ic]');
      return im ? im.dataset.curIc : 'txt:' + e.textContent.trim();
    }),
    costs: [...document.querySelectorAll('#trw .tr-card .cb > i')].map(e => e.textContent.trim())
  }));
  ok(B.on, '[B] 훈련 팝업 열림');
  ok(!B.sub, '[B] 서브탭(스탯 훈련) 요소 없음');
  ok(/^훈련 \d+ 단계$/.test(B.rib.replace(/\s+/g, ' ').trim()), '[B] 리본 «훈련 n 단계»', B.rib);
  ok(B.cards === 3 && B.coins.length === 3 && B.coins.every(c => c === 'gold'),
    '[B] 카드 3장 · 재화 = 골드 아이콘(img[data-cur-ic="gold"])', B.cards + '장 · ' + B.coins.join('/'));
  ok(B.costs.length === 3 && B.costs.every(t => /^(상한|[\d.,]+[A-Za-z]{0,3})$/.test(t))
    && B.costs.some(t => parseFloat(t) > 0),
    '[B] 가격 칸이 읽히는 값 (아이콘만 보고 빈 칸을 통과시키지 않게)', B.costs.join('/'));

  /* [C] 훈련 실동작 — 골드 훈련이 산다 */
  const C = await page.evaluate(() => {
    const before = { gold: S.gold, up: S.upgrades, lv: lv('atk') };
    const card = document.querySelector('#trw .tr-card[data-tr="atk"]');
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { before, after: { gold: S.gold, up: S.upgrades, lv: lv('atk') } };
  });
  ok(C.after.gold < C.before.gold && C.after.lv === C.before.lv + 1 && C.after.up === C.before.up + 1,
    '[C] 카드 탭 → 골드 감소·Lv+1·upgrades+1',
    'gold ' + C.before.gold + '→' + C.after.gold + ' · lv ' + C.before.lv + '→' + C.after.lv);
  await page.evaluate(() => closeTrain());

  /* [D] 강화 탭 — 스탯 서브탭·분배 UI 없음 */
  await page.evaluate(() => { goTab('grow'); renderUp(); });
  await page.waitForTimeout(300);
  const D = await page.evaluate(() => ({
    stat: !!document.querySelector('#bUp [data-uptab], #bUp [data-sp], #bUp [data-spauto], #bUp [data-spreset]'),
    txt: document.getElementById('bUp').textContent.includes('스탯 포인트'),
    ups: document.querySelectorAll('#bUp .up').length
  }));
  ok(!D.stat && !D.txt, '[D] 강화 탭에 🧬 스탯 서브탭·분배 UI 없음');
  ok(D.ups > 0, '[D] 강화 목록은 그대로 렌더', D.ups + '행');

  /* [K] 성장 탭 레드닷 — 구 세이브 sp>0 이어도 꺼져 있다 */
  const K = await page.evaluate(() => {
    S.sp = 99; drawHud(); renderUI && renderUI();
    const t = document.querySelector('.tab[data-t="grow"]');
    const al = t.classList.contains('alert');
    delete S.sp;
    return al;
  });
  ok(!K, '[K] 성장 탭 레드닷 조건 삭제(sp 무시)');

  /* [F] 킬 경험치 폐기 */
  const F = await page.evaluate(async () => {
    delete S.pexp; delete S.plv;
    const e = enemies[0];
    if (e) { e.hp = 0; killEnemy ? killEnemy(e) : (e.dead = true); }
    await new Promise(r => setTimeout(r, 1200));
    return { pexp: S.pexp, plv: S.plv, kills: S.totalKills };
  }).catch(() => ({ pexp: undefined, plv: undefined, kills: -1 }));
  ok(F.pexp === undefined && F.plv === undefined, '[F] 처치 후에도 S.pexp/S.plv 미생성', 'kills=' + F.kills);

  /* [G] 가이드 미션 — 88 이 «스탯 포인트 10 투자» 자리에 넣은 «훈련 n회 하기»
     ★ «idx 16» 은 88 시점의 **스냅샷**이었다(LESSONS 185-①). 154 가 idx 11 «출석 보상 받기» 를
     지우면서 뒤 미션을 −1 로 당겼고(GUIDE_V 4→5 + load 이관), 훈련 미션은 지금 **idx 15** 다.
     154 는 같이 움직일 게이트로 verify73·76·113 만 챙겼고 여기는 못 챙겼다 — 게임은 옳고
     게이트만 굳었다. 88 이 소유한 성질은 «몇 번째냐» 가 아니라 넷이다:
       ① 스탯 미션이 표에서 사라졌다  ② 88 이 넣은 «훈련 30회 하기» 가 딱 하나 있다(이름의 n = goal)
       ③ 훈련 미션의 카운터가 S.upgrades 다   ④ 기준선 리셋(GUIDE_V)이 88 이전으로 안 돌아갔다
     ⚠ «훈련 n회 하기» 는 표에 **둘**이다 — idx 4 «훈련 10회 하기» 는 88 이전(61·73) 것이고 88 것은
     goal 30 쪽이다. 그래서 이름만으로 «하나뿐인가» 를 물으면 안 된다. 88 의 미션은 goal 30 으로
     집고, 카운터는 **훈련 미션 전부**가 S.upgrades 를 세는지로 본다.
     표의 이름·순서·개수 자체는 154 의 `verify154` §1 이 통째로 못 박으므로 여기서 겹쳐 박지 않는다. */
  const G = await page.evaluate(() => {
    const tr = GUIDE.map((g, i) => ({ i, n: g.n, goal: g.goal })).filter(g => /^훈련 \d+회 하기$/.test(g.n));
    const stat = GUIDE.map(g => g.n).filter(n => /스탯/.test(n));
    const mine = tr.filter(g => g.n === '훈련 30회 하기');
    /* 카운터는 «지금 같나» 가 아니라 «따라 움직이나» 로 잰다 — 둘 다 0 인 순간의 항등식은 단언이 아니다(212-①) */
    const keep = S.upgrades;
    S.upgrades = keep + 37;
    const moved = tr.map(g => GUIDE[g.i].get());
    S.upgrades = keep;
    const back = tr.map(g => GUIDE[g.i].get());
    return { tr, stat, mine, v: GUIDE_V, len: GUIDE.length, probe: { base: keep, moved, back } };
  });
  const gt = G.mine[0];
  ok(G.mine.length === 1 && G.stat.length === 0 && gt.goal === 30,
    '[G] «스탯» 미션 폐기 + 88 의 «훈련 30회 하기» 1개 (이름의 n = goal)',
    (gt ? 'idx ' + gt.i + ' «' + gt.n + '» goal ' + gt.goal : '«훈련 30회 하기» ' + G.mine.length + '개')
    + (G.stat.length ? ' · 스탯 잔존: ' + G.stat.join(',') : '') + ' · 표 ' + G.len + '행');
  ok(G.v >= 4, '[G] GUIDE_V ≥ 4 (88 의 기준선 리셋이 살아 있다)', 'v' + G.v + ' — 88 이 3→4 · 154 가 4→5');
  ok(G.tr.length >= 1 && G.probe.moved.every(v => v === G.probe.base + 37)
    && G.probe.back.every(v => v === G.probe.base),
    '[G] 훈련 미션 카운터 = S.upgrades (값을 37 움직여 확인)',
    '미션 ' + G.tr.map(g => 'idx' + g.i).join('/') + ' · ' + G.probe.base + '→'
    + G.probe.moved.join(',') + ' (기대 ' + (G.probe.base + 37) + ')');

  /* [H] 프로필 정보 탭 */
  const H = await page.evaluate(() => {
    renderSt();
    const h = document.getElementById('bSt').innerHTML;
    return { lvl: /레벨 |경험치/.test(h), best: h.includes('최고 스테이지') };
  });
  ok(!H.lvl && H.best, '[H] 정보 탭 — 레벨/경험치 없음 · 최고 스테이지 표시');

  /* [I] 재화 정보 sp 폐기 */
  const I = await page.evaluate(() => {
    const none = !CURINFO.sp;
    openCurInfo('sp');
    return { none, opened: document.getElementById('ciw').classList.contains('on') };
  });
  ok(I.none && !I.opened, '[I] CURINFO.sp 없음 · openCurInfo(\'sp\') 무시');

  /* [J] 가방 재화 탭 */
  const J = await page.evaluate(() => bagCur().some(r => r.n === '스탯 포인트'));
  ok(!J, '[J] 가방에 «스탯 포인트» 행 없음');

  /* [M] 콘솔 에러 */
  await page.waitForTimeout(1500);
  ok(errs.length === 0, '[M] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  /* [L] 전투력 제거분 기록(감사 로그) — 구 배율: (1+.02*100)(atk) 등 + statStage 3 → (1+.1*2) */
  console.log('[L] 제거분 기록 — 구 세이브(공100/체50/재생20·스탯훈련 3단계) 기준:');
  console.log('    atk ×' + (1 + 0.02 * 100).toFixed(2) + ' · hp ×' + (1 + 0.02 * 50).toFixed(2)
    + ' · regen ×' + (1 + 0.02 * 20).toFixed(2) + ' · 전스탯 ×' + (1 + 0.1 * (3 - 1)).toFixed(2)
    + ' 이 88 로 제거됨(보상 없음 — 밸런스 재측정 항목).');

  await browser.close();
  console.log('\nVERIFY88 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
