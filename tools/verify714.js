/* 714 검증 — 소환 레벨·경험치 «전 배너 공용 하나 → 배너 독립 다섯 벌»
 *
 * 주인 지시(2026-09-02 03:00): «무기 방패 목걸이 스킬 펫 소환레벨이랑 경험치 같이 뭉쳐놓은
 * 느낌인데 사실이면 분리해라. 경험치도 당연히 분리». 재현(`probe714`)이 «사실» 을 확인했다 —
 * 496 이 다섯을 한 주머니로 접어 뒀고, 무기로 뽑으면 방패 확률표까지 같이 올랐다.
 *
 * 496 과의 관계: **곡선(need = 200 + 210·n)·만렙 50·해금 사다리는 496 것을 그대로 쓴다.**
 * 714 가 뒤집은 축은 «주머니가 하나인가 다섯인가» 하나뿐이고, `verify496` 의 그 축 항들은
 * 333 처방대로 **방향을 뒤집어 갈아 끼웠다**(지우지 않았다).
 *
 * 절:
 *   [A] 배너 독립 — 한 배너에 넣은 경험치가 다른 넷에 0 건 샌다(5×5 교차 매트릭스)
 *   [B] 세이브 모양 — `sum` 다섯 벌 + `sumVer` 가 담기고 496 의 스칼라 둘은 **안 담긴다**
 *   [C] 이관 세 판 — ⓐ714 멱등 · ⓑ496 스칼라 → 다섯 복제(손해 0) · ⓒ496 이전 → 배너마다 환산
 *   [D] 표시 — 10 상점 카드 5 장이 서로 다른 Lv·exp·채움률 · 확률 팝업이 배너를 따라간다
 *   [E] 확률표 — `gradeProbs(b)` 가 그 배너의 레벨만 읽는다(오염 0)
 *   [R] 되돌림 시험 — 접근자를 496 공용으로 되돌린 사본에서 [A] 가 **빨개진다**
 *
 * 실행: node tools/verify714.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* 게이트가 제품과 **독립으로** 같은 수를 센다 */
const MAXLV = 50, A_ = 200, B_ = 210;
const needNew = lv => A_ + B_ * Math.min(Math.max(lv | 0, 1), MAXLV - 1);
const TBL196 = [50, 200, 500, 800, 1200, 1500, 1800, 2100, 2300, 2600,
                3000, 3300, 3600, 4000, 4500, 5000];
const MAX196 = 25;
const need196 = lv => TBL196[Math.min(Math.max(lv | 0, 1), TBL196.length) - 1];
const place = pulls => { let lv = 1, e = pulls;
  while (lv < MAXLV && e >= needNew(lv)) { e -= needNew(lv); lv++; }
  return { lv, exp: lv >= MAXLV ? 0 : e }; };
const oldPulls = c => {
  const lv = Math.min(MAX196, Math.max(1, Number.isFinite(c && c.lv) ? Math.floor(c.lv) : 1));
  let s = 0; for (let n = 1; n < lv; n++) s += need196(n);
  const cap = lv >= MAX196 ? 0 : need196(lv) - 1;
  if (c && Number.isFinite(c.exp) && c.exp > 0) s += Math.min(Math.floor(c.exp), cap);
  return s;
};

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  (b ? pass++ : fail++);
  console.log((b ? 'PASS ' : 'FAIL ') + name + (detail != null ? ' — ' + detail : ''));
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  const BK = await page.evaluate(() => BKEYS.slice());

  /* ================= [A] 배너 독립 ================= */
  console.log('[A] 배너 독립 — 한 배너에 넣은 경험치가 다른 넷에 안 샌다');
  const A = await page.evaluate(() => {
    const zero = () => BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    const out = {};
    /* 5×5 교차 매트릭스 — 배너 하나에만 넣고 다섯을 전부 읽는다 */
    out.matrix = BKEYS.map(b => { zero(); sumAddExp(b, 7); return BKEYS.map(k => sumExp(k)); });
    /* 레벨업도 그 배너에서만 일어난다 */
    zero(); const up = sumAddExp('skill', sumNeedExp(1) + 3);
    out.up = { up, lv: BKEYS.map(k => sumLv(k)), exp: BKEYS.map(k => sumExp(k)) };
    /* 옛 이름 쓰기(`S.sum.weapon.lv = 9`)는 그 배너만 움직인다 */
    zero(); S.sum.weapon.lv = 9; S.sum.weapon.exp = 33;
    out.write = BKEYS.map(k => sumLv(k) + '/' + sumExp(k));
    /* 접근자가 인자를 **읽는다** — 모르는 이름은 읽기 전용 Lv1 폴백(저장 구조를 안 더럽힌다) */
    zero(); S.sum.pet.lv = 4;
    out.arg = { pet: sumLv('pet'), skill: sumLv('skill'),
                ghost: sumLv('없는배너'), ghostKept: Object.keys(S.sum).length };
    return out;
  });
  ok(A.matrix.every((row, i) => row.every((v, j) => v === (i === j ? 7 : 0))),
    'A1 ★ 5×5 교차 매트릭스 — 대각선만 7, 나머지 20 칸 전부 0(오염 0 건)',
    A.matrix.map(r => r.join(',')).join(' | '));
  ok(A.up.up === 1 && A.up.lv.filter(v => v === 2).length === 1 && A.up.lv.filter(v => v === 1).length === BK.length - 1,
    'A2 ★ 레벨업도 그 배너에서만 — 스킬만 Lv2, 나머지 넷 Lv1',
    A.up.lv.join(',') + ' | exp ' + A.up.exp.join(','));
  ok(A.write.filter(s => s === '9/33').length === 1 && A.write.filter(s => s === '1/0').length === BK.length - 1,
    'A3 `S.sum[b].lv` 쓰기는 그 칸 하나만 움직인다(496 별칭 뷰 폐지)', A.write.join(' · '));
  ok(A.arg.pet === 4 && A.arg.skill === 1 && A.arg.ghost === 1 && A.arg.ghostKept === BK.length,
    'A4 접근자는 인자를 읽는다 · 모르는 배너는 Lv1 폴백이고 `S.sum` 에 칸을 안 만든다',
    'pet ' + A.arg.pet + ' · skill ' + A.arg.skill + ' · ghost ' + A.arg.ghost
      + ' · 칸 수 ' + A.arg.ghostKept);
  ok(!/const\s+sumLv\s*=\s*_b\s*=>/.test(CODE) && !/function\s+sumAddExp\(\s*_b\s*,/.test(CODE),
    'A5 496 의 «인자를 무시하는» 접근자 선언 0 건(주석 걷어낸 소스 스캔)');
  ok(!/sumAliasView/.test(CODE),
    'A6 496 의 별칭 뷰 `sumAliasView` 는 **선언째** 사라졌다(죽은 코드 금지 규약)');

  /* ================= [B] 세이브 모양 ================= */
  console.log('[B] 세이브 모양 — 다섯 벌이 담기고 496 스칼라 둘은 안 담긴다');
  const B = await page.evaluate(() => {
    BKEYS.forEach((k, i) => { S.sum[k].lv = i + 2; S.sum[k].exp = i * 11; });
    const json = JSON.stringify(S);
    return { json, parsed: JSON.parse(json).sum, ver: JSON.parse(json).sumVer, VER: SUM_VER };
  });
  ok(/"sum":\{/.test(B.json) && !/"sumLv":/.test(B.json) && !/"sumExp":/.test(B.json),
    'B1 ★ `sum` 다섯 벌이 담기고 496 의 스칼라 둘은 **안 담긴다**',
    (B.json.match(/"sum[A-Za-z]*":/g) || []).join(' '));
  ok(BK.every((k, i) => B.parsed[k] && B.parsed[k].lv === i + 2 && B.parsed[k].exp === i * 11),
    'B2 다섯 칸이 서로 다른 값을 그대로 싣는다', JSON.stringify(B.parsed));
  ok(B.ver === B.VER && B.VER >= 2, 'B3 `sumVer` = ' + B.VER + ' — 이관 갈래를 가르는 판 번호',
    String(B.ver));

  /* ================= [C] 이관 세 판 =================
     ⚠ 살아 있는 페이지에 localStorage 를 쓰고 reload 하면 그 페이지의 자동 저장이 먼저 덮어쓴다
     (LESSONS 87-3 · 43-①). 주입은 «새 컨텍스트 + addInitScript» 로 한다(LESSONS 44-①). */
  console.log('[C] 세이브 이관 — 714 · 496 · 496 이전 세 판');
  const KEYV = await page.evaluate(() => KEY);
  const inject = async obj => {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await c.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEYV, JSON.stringify(obj)]);
    const p2 = await c.newPage();
    p2.on('pageerror', e => errs.push('pageerror(세이브 이관): ' + String(e)));
    await p2.goto(URL);
    await p2.waitForTimeout(900);
    const r = await p2.evaluate(() => ({
      cells: JSON.parse(JSON.stringify(BKEYS.map(k => ({ b: k, lv: S.sum[k].lv, exp: S.sum[k].exp })))),
      ver: S.sumVer, scalar: (typeof S.sumLv !== 'undefined' || typeof S.sumExp !== 'undefined'),
      json: JSON.stringify(S)
    }));
    await c.close();
    return r;
  };

  /* ⓑ 496 세이브(스칼라 둘) → 다섯 복제 */
  const C1 = await inject({ sumLv: 13, sumExp: 500 });
  ok(C1.cells.every(c => c.lv === 13 && c.exp === 500),
    'C1 ★ 496 세이브(공용 Lv13/500) → **다섯 배너에 그대로 복제**(주인 지시 «손해 0»)',
    C1.cells.map(c => c.b + ' ' + c.lv + '/' + c.exp).join(' · '));
  ok(!C1.scalar && !/"sumLv":/.test(C1.json),
    'C2 496 의 죽은 스칼라 둘은 이관 뒤 **지워진다**(204 `daily.dun` 처방)');

  /* ⓐ 714 세이브 — 멱등 */
  const SAVE714 = { sumVer: 2, sum: { skill:{lv:3,exp:7}, weapon:{lv:12,exp:0}, shield:{lv:8,exp:99},
                                      amulet:{lv:1,exp:5}, pet:{lv:50,exp:0} } };
  const C3 = await inject(SAVE714);
  ok(C3.cells.every(c => c.lv === SAVE714.sum[c.b].lv && c.exp === SAVE714.sum[c.b].exp),
    'C3 ★ 714 세이브는 그대로 — 다섯 칸이 서로 다른 값을 유지한다(멱등)',
    C3.cells.map(c => c.lv + '/' + c.exp).join(' · '));
  const C3b = await inject(JSON.parse(C3.json));
  ok(C3b.cells.every((c, i) => c.lv === C3.cells[i].lv && c.exp === C3.cells[i].exp),
    'C4 왕복 — 저장한 것을 다시 넣어도 같다', C3b.cells.map(c => c.lv + '/' + c.exp).join(' · '));

  /* ⓒ 496 이전 세이브 — 배너마다 구 곡선으로 되돌려 세서 그 배너에 얹는다(합치지 않는다) */
  const OLD = { skill:{lv:20,exp:0}, weapon:{lv:12,exp:0}, shield:{lv:8,exp:0},
                amulet:{lv:3,exp:0}, pet:{lv:5,exp:0} };
  const C5 = await inject({ sum: OLD });
  const want5 = BK.map(k => place(oldPulls(OLD[k])));
  ok(C5.cells.every((c, i) => c.lv === want5[i].lv && c.exp === want5[i].exp),
    'C5 ★ 496 이전 세이브 → 배너마다 따로 환산(합치지 않는다)',
    C5.cells.map((c, i) => c.b + ' ' + c.lv + '/' + c.exp).join(' · '));
  {   /* 보존을 «되돌려 세서» 못박는다 — 배너마다 뽑기 수가 그대로다 */
    const back = C5.cells.map(c => { let t = c.exp; for (let n = 1; n < c.lv; n++) t += needNew(n); return t; });
    ok(back.every((v, i) => v === oldPulls(OLD[BK[i]])),
      'C6 ★ 배너별 누적 뽑기 수 보존 — 새 곡선에서 되돌려 세도 같다',
      back.join(' · ') + ' vs ' + BK.map(k => oldPulls(OLD[k])).join(' · '));
    ok(new Set(C5.cells.map(c => c.lv)).size > 1,
      'C7 ★ 496 처럼 한 값으로 접히지 않는다(다섯 레벨이 서로 다르다)',
      C5.cells.map(c => c.lv).join(','));
  }
  /* 손댄 세이브 방어 · 빈 세이브 */
  const C8 = await inject({ sum: { weapon:{lv:-7,exp:-3}, skill:{lv:'9',exp:'x'},
                                   shield:{lv:1/0,exp:NaN}, amulet:null, pet:{lv:2,exp:999999} } });
  const wantPet = place(oldPulls({ lv:2, exp:999999 }));
  ok(C8.cells.every(c => Number.isFinite(c.lv) && Number.isFinite(c.exp) && c.lv >= 1),
    'C9 손댄 세이브 방어 — 값 전부 유한 · Lv ≥ 1 (NaN 0 건)',
    C8.cells.map(c => c.b + ' ' + c.lv + '/' + c.exp).join(' · '));
  ok(C8.cells.find(c => c.b === 'pet').exp === wantPet.exp
     && C8.cells.find(c => c.b === 'pet').lv === wantPet.lv,
    'C10 ★ `exp:999999` 는 구 need−1 로 접힌다(공짜 레벨 방지) — Lv' + wantPet.lv + '/' + wantPet.exp,
    JSON.stringify(C8.cells.find(c => c.b === 'pet')));
  ok(C8.cells.filter(c => c.lv === 1 && c.exp === 0).length >= 3,
    'C11 음수·문자열 아닌 비유한·null 은 Lv1/0 으로 접힌다',
    C8.cells.map(c => c.lv + '/' + c.exp).join(' · '));
  const C12 = await inject({});
  ok(C12.cells.every(c => c.lv === 1 && c.exp === 0),
    'C12 `sum` 이 아예 없는 세이브 → 다섯 칸 Lv1/0', C12.cells.map(c => c.lv + '/' + c.exp).join(' · '));

  /* ================= [D] 표시 ================= */
  console.log('[D] 10 상점 소환 카드 · 확률 팝업 — 배너를 따라간다');
  const WANT = { skill:20, weapon:12, shield:8, amulet:3, pet:5 };
  const D = await page.evaluate(want => {
    S.dia = 2e6;
    BKEYS.forEach(k => { S.sum[k].lv = want[k]; S.sum[k].exp = 100; });
    openShopPage(null, 'sum'); renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    /* ⚠ 카드 순서는 `SHOP_BOXES` 순이라 `BKEYS` 순이 아니다 — 칸의 배너 키를 같이 읽는다
       (안 읽으면 «다섯이 서로 다르다» 는 통과하는데 «어느 카드가 어느 배너인가» 를 못 묻는다). */
    const r = { n: cards.length,
                b: cards.map(c => c.querySelector('.cmag').dataset.shinfo),
                lv: cards.map(c => c.querySelector('.clv>i').textContent.trim()),
                bar: cards.map(c => c.querySelector('.cbar>b').textContent.trim()),
                w: cards.map(c => c.querySelector('.cbar .trk>i').style.width),
                bad: /NaN|undefined/.test(document.getElementById('shopList').textContent) };
    /* 만렙 한 칸 — 그 카드만 MAX */
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    S.sum.pet.lv = SUM_MAXLV; renderShopPage();
    const cs = [...document.querySelectorAll('#shopList .shp-card')];
    r.maxBar = cs.map(c => c.querySelector('.cbar>b').textContent.trim());
    return r;
  }, WANT);
  ok(D.n === 5, 'D1 소환 카드 5 장', String(D.n));
  ok(new Set(D.lv).size === 5 && D.lv.every((v, i) => v === 'Lv.' + WANT[D.b[i]]),
    'D2 ★ 다섯 장이 서로 다른 Lv 알약 — 그 배너에 넣은 값 그대로',
    D.b.map((b, i) => b + ' ' + D.lv[i]).join(' · '));
  ok(new Set(D.bar).size === 5 && D.bar.every((v, i) => v === '100/' + needNew(WANT[D.b[i]])),
    'D3 경험치 표기 = 100/need(그 배너 Lv) 다섯 장이 서로 다르다', D.bar.join(' · '));
  ok(new Set(D.w).size === 5, 'D4 채움률도 다섯 장이 서로 다르다', D.w.join(' · '));
  ok(D.maxBar.filter(b => b === 'MAX').length === 1,
    'D5 ★ 한 배너만 만렙이면 «MAX» 도 한 장뿐', D.maxBar.join(' · '));
  ok(!D.bad, 'D6 카드 표기 NaN/undefined 0 건');
  /* 확률 팝업(`openProbInfo`)은 «현재 레벨 이하의 가장 높은 단계» 로 기본 자리를 잡는다 —
     그 기본 자리가 배너를 따라가는지가 «표시가 분리됐는가» 의 두 번째 자리다. */
  const D7 = await page.evaluate(() => {
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    S.sum.weapon.lv = 40;
    openProbInfo('weapon'); const w = $('prbLv').textContent.trim();
    openProbInfo('shield'); const s = $('prbLv').textContent.trim();
    closeProbInfo();
    return { w, s };
  });
  ok(D7.w === '40' && D7.s === '1',
    'D7 ★ 확률 팝업 «현재 단계» 가 배너를 따라간다 — 무기 40 · 방패 1',
    JSON.stringify(D7));

  /* ================= [E] 확률표 ================= */
  console.log('[E] `gradeProbs(b)` 는 그 배너의 레벨만 읽는다');
  const E = await page.evaluate(() => {
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    S.sum.weapon.lv = SUM_MAXLV;
    const top = b => gradeProbs(b)[7] || 0;
    return { w: top('weapon'), others: BKEYS.filter(k => k !== 'weapon').map(k => top(k)),
             sumW: gradeProbs('weapon').reduce((a, c) => a + c, 0),
             sumS: gradeProbs('shield').reduce((a, c) => a + c, 0) };
  });
  ok(E.w > 0 && E.others.every(v => v === 0),
    'E1 ★ 무기만 만렙 — 불멸 칸은 무기에서만 > 0, 나머지 넷 0(오염 0)',
    (E.w * 100).toFixed(4) + '% vs ' + E.others.map(v => (v * 100).toFixed(4) + '%').join(' '));
  ok(Math.abs(E.sumW - 1) < 1e-9 && Math.abs(E.sumS - 1) < 1e-9,
    'E2 두 배너 다 확률 합 = 1(레벨이 달라도 표가 정상)',
    E.sumW.toFixed(6) + ' · ' + E.sumS.toFixed(6));

  /* ================= [R] 되돌림 시험 =================
     접근자를 496 «공용 하나» 로 되돌린 사본에서 [A1] 이 **빨개져야** 무르게 푼 수리가 아니다. */
  console.log('[R] 되돌림 시험 — 496 공용으로 되돌린 사본');
  {
    const rev = SRC
      .replace('const sumLv  = b => sumOf(b).lv;', 'const sumLv  = _b => S.__sh.lv;')
      .replace('const sumExp = b => sumOf(b).exp;', 'const sumExp = _b => S.__sh.exp;')
      .replace(/function sumAddExp\(b, n\)\{[\s\S]*?\n\}/,
        'function sumAddExp(_b, n){ const s = S.__sh; s.exp += n; let up = 0;\n'
        + '  while(s.lv < SUM_MAXLV && s.exp >= sumNeedExp(s.lv)){ s.exp -= sumNeedExp(s.lv); s.lv++; up++; }\n'
        + '  if(s.lv >= SUM_MAXLV) s.exp = 0; return up; }')
      .replace('let S = DEF();', 'let S = DEF(); S.__sh = { lv:1, exp:0 };');
    const rp = path.join(ROOT, `.verify714-rev-${process.pid}.html`);
    fs.writeFileSync(rp, rev);
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await c.newPage();
    const rerr = [];
    p2.on('pageerror', e => rerr.push(String(e)));
    await p2.goto('file://' + rp.replace(/\\/g, '/'));
    await p2.waitForTimeout(900);
    const R = await p2.evaluate(() => {
      S.__sh = { lv:1, exp:0 };
      sumAddExp('weapon', 7);
      return { snap: BKEYS.map(k => sumLv(k) + '/' + sumExp(k)) };
    });
    await c.close();
    try { fs.unlinkSync(rp); } catch (e) {}
    ok(new Set(R.snap).size === 1 && R.snap[0] === '1/7',
      'R1 ★ 되돌린 사본에서는 다섯이 **같이 오른다** — [A1] 이 빨개진다(무르게 풀지 않았다)',
      R.snap.join(' · '));
    ok(rerr.length === 0, 'R2 되돌린 사본도 콘솔 에러 0 건(되돌림이 딴 데를 안 깬다)',
      rerr.slice(0, 2).join(' | '));
  }

  ok(errs.length === 0, 'Z1 콘솔 에러 0 건', errs.slice(0, 3).join(' | '));

  console.log('');
  console.log('VERIFY714 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
