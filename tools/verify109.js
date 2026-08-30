/* 작업 109 게이트 — «중복 키 `n`» 회귀 방지 + 53 가방 재화 탭 크래시 검산.
   실행: node tools/verify109.js

   버그(작업 95 세션 발견): `SKILLS` 5종(stone·arrow·frost·gale·lance)이 한 객체 리터럴 안에서
     `n:'돌팔매'` … `n:1` 처럼 **`n` 을 두 번** 썼다. JS 는 중복 키를 문법 오류로 잡지 않고
     **뒤 값이 조용히 이긴다** → 이름이 숫자가 된다.
     귀결 ⓐ 04 스킬 카드·07 시트·12 소환 결과·21 도감에서 **스킬 이름 5개가 숫자로 표시**
           ⓑ 그 5종 재료를 1개라도 보유하면 53 가방 «재화» 탭이 `r.n.replace is not a function` 으로 **크래시**
              (`renderBag()` ~13183 이 `r.n.replace(/"/g,'')` 를 부른다)

   수정: 발사 수/연쇄 대상 수를 뜻하던 뒤쪽 `n` 을 **`cnt`** 로 바꾸고 `castGeneric()` 의 읽는 쪽
        2곳(`proj` 발수 · `chain` 대상 수)을 같이 고쳤다. 이름 `n` 은 그대로 둔다 —
        다른 화면이 전부 `it.n` 을 이름으로 읽는다.

   이 게이트가 보는 것:
     ① 소스 스캔 — 데이터 배열의 객체 리터럴에 **중복 키 0건**(런타임으로는 영영 못 본다. 이미 덮인 뒤다)
     ② 런타임 — SKILLS·EQUIPS·PETS·RELICS 전 항목의 `n` 이 **비어 있지 않은 문자열**
     ③ 발수 회귀 — 5종 + 193 신설 7종의 `cnt` 가 설계값이고, `castGeneric()` 이 실제로 그 수만큼 투사체/연쇄를 만든다
     ④ 53 가방 — 5종 재료 보유 상태에서 «재화»·«소모품» 두 탭이 크래시 없이 그려지고 칸 이름이 문자열
     ⑤ 이름 표시 — 이름이 **글자로 나오는** 화면(08 스킬 세부 `#mtitle` · 11 확률 정보 `.prb-row .nm`)에 숫자 이름 0건
        (PROGRESS 109 행의 «04/07/12/21» 은 오기다 — 그 넷은 스킬 이름을 글자로 그리지 않는다. 파일 아래 ⑤ 절 주석 참고)
*/
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const FILE = 'file://' + SRC;

/* 109 가 고친 5종과 설계 발수(주석·`hits` 와 일치해야 한다) */
/* 193(2026-08-27) — 신설 8종 중 `cnt`(발사 수/소환 수)를 가진 7종을 표에 이어 적는다.
   ⚠ `hits`(전투력 추정용 «한 번 시전하면 몇 대 맞나»)와 `cnt` 는 **원래 같지 않아도 되는 수**다.
   109 시절엔 «볼리 = 발수 = 타격 수» 인 5종뿐이라 우연히 같았을 뿐이고, 193 이 그 등식이
   성립하지 않는 4종(whirl·bounce·drone·flask)을 들여왔다.
   ⚑ **504(2026-08-30)가 등식을 통째로 폐기했다** — `hits` 는 이제 «실제 판에서 발동 1회가
   내는 총 타격 수»(실측)이고 `cnt` 는 «발사체 수»(설계)다. 둘은 **어느 쪽으로도 클 수 있다**:
   관통·장판은 발사체 하나가 여러 적을 지나가 `hits > cnt`(lance 3발 → 4.50), 링형은 사방으로
   뿌리므로 빈 방향의 발이 아무도 못 맞혀 `hits < cnt`(gale 12발 → 9.92)다.
   ⇒ 아래 두 항은 «등식» 대신 **①「여러 적에 닿는 구조를 가진 종은 hits > 1」**(504 가 고친 결함이
   정확히 그 자리다 — nova·holy·meteor·boom 이 «한 적» 기준 1 로 적혀 있었다) **②「선언 빈칸 0」**
   을 본다. `cnt` 자체는 109·193 의 설계값이고 504 가 한 글자도 안 건드렸다(위 두 표가 본다). */
const CNT = { stone: 1, arrow: 2, frost: 4, gale: 12, lance: 3 };
/* 193 이 들여온 `cnt` 보유 7종. **`CNT` 는 건드리지 않는다** — 109 의 이름·53 가방·08 제목 절이
   «중복 키 n 에 이름이 숫자로 덮였던 바로 그 5종» 을 지목하는 표라서다(회귀의 원본 표본). */
const CNT193 = { curve: 2, whirl: 8, rico: 2, spiral: 6, bounce: 1, drone: 2, flask: 1 };

const R = [];
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });

/* ── ① 소스 레벨 중복 키 스캔 ──────────────────────────────────────────
   런타임 객체는 이미 덮인 뒤라 중복을 볼 수 없다. 소스를 직접 훑는 수밖에 없다.
   문자열·주석을 건너뛰며 `{`/`}` 깊이로 객체를 쌓고, «`{` 또는 `,` 바로 다음의 식별자 + `:`» 만
   그 객체의 키로 센다(삼항 `? :` 은 앞 문자가 `{`/`,` 가 아니라 걸리지 않는다). */
function scanDupKeys(src, from, to) {
  const dups = [];
  const stack = [];          /* 객체마다 {키 → 첫 등장 줄} */
  let i = from, prevSig = '', line = src.slice(0, from).split('\n').length;
  while (i < to) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    /* 주석 */
    if (c === '/' && src[i + 1] === '/') { while (i < to && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2; while (i < to && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    /* 문자열 */
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < to && src[i] !== q) { if (src[i] === '\\') i++; else if (src[i] === '\n') line++; i++; }
      i++; prevSig = 'str'; continue;
    }
    if (c === '{') { stack.push(new Map()); prevSig = '{'; i++; continue; }
    if (c === '}') { stack.pop(); prevSig = '}'; i++; continue; }
    if (c === ',') { prevSig = ','; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    /* 키 후보 — 앞의 유의미 문자가 `{` 나 `,` 일 때만 */
    if (/[A-Za-z_$]/.test(c) && (prevSig === '{' || prevSig === ',') && stack.length) {
      let j = i; while (j < to && /[\w$]/.test(src[j])) j++;
      let k = j; while (k < to && /\s/.test(src[k])) k++;
      if (src[k] === ':') {
        const key = src.slice(i, j), top = stack[stack.length - 1];
        if (top.has(key)) dups.push({ key, line, first: top.get(key) });
        else top.set(key, line);
        prevSig = 'key'; i = k + 1; continue;
      }
    }
    prevSig = c; i++;
  }
  return dups;
}

/* `const NAME = [` 부터 짝이 맞는 `]` 까지의 구간을 돌려준다 */
function arrayRange(src, name) {
  const m = src.indexOf('const ' + name + ' = [');
  if (m < 0) return null;
  let i = src.indexOf('[', m), d = 0;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '[') d++;
    else if (c === ']') { d--; if (!d) return [start, i + 1]; }
  }
  return null;
}

/* 페이지에서 실행 — 데이터 배열 전체의 `n` 타입 검사 */
const probeNames = () => {
  const bad = [];
  const tables = { SKILLS, EQUIPS, PETS, RELICS };
  for (const t in tables)
    tables[t].forEach(it => {
      if (typeof it.n !== 'string' || !it.n.trim())
        bad.push(t + ':' + it.id + '=' + JSON.stringify(it.n) + '(' + typeof it.n + ')');
    });
  return bad;
};

(async () => {
  /* ── ① 소스 스캔 ── */
  const src = fs.readFileSync(SRC, 'utf8');
  const TABLES = ['SKILLS', 'PETS', 'RELICS', 'SLOTS', 'SHOP_BOXES', 'DUNGEONS'];
  let allDup = [];
  TABLES.forEach(name => {
    const rg = arrayRange(src, name);
    if (!rg) { R.push({ n: '소스 · ' + name + ' 구간 탐색', got: 'not found', want: 'found', pass: false }); return; }
    const d = scanDupKeys(src, rg[0], rg[1]);
    allDup = allDup.concat(d.map(x => name + ' ' + x.key + ' (line ' + x.first + '→' + x.line + ')'));
    eq('소스 · ' + name + ' 중복 키', d.length + (d.length ? ' :: ' + d.map(x => x.key + '@' + x.line).join(',') : ''), 0);
  });
  /* EQ_NAMES 는 EQUIPS 를 만드는 원본이라 같이 본다(배열이 아니라 객체라 구간을 손으로 잡는다) */
  {
    const m = src.indexOf('const EQ_NAMES');
    if (m > 0) {
      let i = src.indexOf('{', m), d = 0, end = i;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
        if (c === '{') d++; else if (c === '}') { d--; if (!d) { end = i + 1; break; } }
      }
      const dd = scanDupKeys(src, src.indexOf('{', m), end);
      allDup = allDup.concat(dd.map(x => 'EQ_NAMES ' + x.key));
      eq('소스 · EQ_NAMES 중복 키', dd.length, 0);
    }
  }
  eq('소스 · 데이터 테이블 중복 키 총합', allDup.length + (allDup.length ? ' :: ' + allDup.join(' | ') : ''), 0);
  /* 109 의 직접 회귀 — 5종이 다시 `n:<숫자>` 를 갖지 않는지 문자열로도 한 번 더 */
  yes('소스 · SKILLS 에 `n:<숫자>` 리터럴 없음',
      !/\bn:\s*\d/.test(src.slice(...arrayRange(src, 'SKILLS'))));

  /* ── 브라우저 ── */
  const br = await launch(chromium);
  const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE);
  await p.waitForTimeout(900);

  /* ── ② 런타임 이름 타입 ── */
  const bad = await p.evaluate(probeNames);
  eq('런타임 · SKILLS/EQUIPS/PETS/RELICS 의 `n` 이 전부 문자열',
     bad.length + (bad.length ? ' :: ' + bad.join(', ') : ''), 0);
  const names = await p.evaluate(ids => ids.map(id => (SKILLS.find(s => s.id === id) || {}).n), Object.keys(CNT));
  eq('런타임 · 5종 이름', names.join('/'), '돌팔매/꿰뚫는 화살/서리 연쇄/폭풍의 칼날/천벌의 창');

  /* ── ③ 발수 회귀 — cnt 값 + castGeneric 이 실제로 그만큼 만든다 ── */
  const cnts = await p.evaluate(() => SKILLS.filter(s => s.cnt !== undefined)
    .reduce((o, s) => (o[s.id] = s.cnt, o), {}));
  Object.keys(CNT).forEach(id => eq('발수 · ' + id + '.cnt', cnts[id], CNT[id]));
  Object.keys(CNT193).forEach(id => eq('발수(193) · ' + id + '.cnt', cnts[id], CNT193[id]));
  eq('발수 · cnt 를 가진 스킬 수', Object.keys(cnts).length,
     Object.keys(CNT).length + Object.keys(CNT193).length);
  /* 504 — 관통 2 이상 · 링 · 장판 · 빔 · 범위는 **구조적으로** 여러 적에 닿는다. 그런 종이
     `hits <= 1` 로 적혀 있으면 누군가 «한 적이 받는 수» 규약으로 되돌린 것이다(그것이 504 가
     고친 결함이다 — nova·holy·meteor·boom 이 1 이었다). 옛 예외표 HITS_NE_CNT 는 그 잔재라 지웠다. */
  yes('발수 · 여러 적에 닿는 구조(pierce≥2·ring·장판·빔·범위)는 `hits` > 1 — «한 적» 규약 잔재 0건',
    await p.evaluate(() => SKILLS
      .filter(s => (s.pierce >= 2) || s.ring || s.zk || s.dur || s.r !== undefined)
      .every(s => (s.hits || 0) > 1)));
  yes('발수 · `cnt` 를 가진 종 전부 `hits` 선언이 있다(빈칸이면 모델이 조용히 1 로 떨어진다)',
    await p.evaluate(() => SKILLS.filter(s => s.cnt !== undefined).every(s => typeof s.hits === 'number' && s.hits > 0)));

  /* castGeneric 실사격: 적을 하나 놓고 스킬별로 쏜 뒤 shots/bolts 증가분을 센다 */
  const fired = await p.evaluate(ids => {
    const out = {};
    ids.forEach(id => {
      const s = SKILLS.find(x => x.id === id);
      shots.length = 0; bolts.length = 0;
      enemies.length = 0;
      /* 근접 적 1기 — nearest() 와 chain 의 `born >= 0.3` 조건을 만족시킨다 */
      for (let i = 0; i < 8; i++)
        enemies.push({ x: player.x + 120 + i * 10, y: player.y, r: 30, hp: 1e9, mhp: 1e9,
                       born: 1, dmg: 0, spd: 0, gold: 0, xp: 0, type: 'n' });
      drones.length = 0;                       /* 193 — 드론은 shots 가 아니라 소환수 배열을 만든다 */
      const ok = castGeneric(s, 1);
      out[id] = { ok, made: s.t === 'chain' ? bolts.length
                          : s.t === 'drone' ? drones.length : shots.length };
    });
    shots.length = 0; bolts.length = 0; enemies.length = 0; drones.length = 0;
    return out;
  }, Object.keys(CNT).concat(Object.keys(CNT193)));
  Object.keys(CNT).forEach(id => {
    yes('실사격 · ' + id + ' 발동', fired[id].ok === true);
    eq('실사격 · ' + id + ' 생성 수', fired[id].made, CNT[id]);
  });
  Object.keys(CNT193).forEach(id => {
    yes('실사격(193) · ' + id + ' 발동', fired[id].ok === true);
    eq('실사격(193) · ' + id + ' 생성 수', fired[id].made, CNT193[id]);
  });

  /* ── ④ 53 가방 — 5종 재료 보유 상태 ──────────────────────────────────────
     292(주인 지시 «가방에는 재화 즉 화폐들만»)로 **전제가 바뀌었다**: 가방은 이제 S.own 재료를
     싣지 않는다. 그래서 «5종 이름이 칸에 보인다» 는 단언은 옛 제품을 서술한 것이라 이사시켰다 —
     109 가 잡은 버그(이름이 «숫자» 로 나온다)의 감시는 남기고, 표본만 화폐로 바꾼다.
     재료 이름이 글자로 나오는지는 아래 ⑤(08 세부 팝업 · 11 확률표)가 그대로 지킨다.
     되돌림 시험: `bagCur()` 에 S.own 루프를 되살리면 «재료가 안 실린다» 3건이 빨개진다. */
  const bag = await p.evaluate(ids => {
    ids.forEach(id => { S.own[id] = { l: 1, n: 7 }; });
    S.gold = 1e6; S.dia = 5e4; S.relic = 500; S.stone = 40; S.rstone = 30; S.tstone = 20; S.mileage = 6;
    const r = { curErr: '', tabsLeft: 1, curCells: 0, nonString: [], shown: [], noKey: [] };
    try { openBag(); r.curCells = document.querySelectorAll('#bagGrid .bg53-c:not(.em)').length; }
    catch (e) { r.curErr = String(e && e.message || e); }
    try {
      bagCur().forEach(x => {
        if (typeof x.n !== 'string') r.nonString.push(String(x.n));
        if (!x.k || !CURINFO[x.k]) r.noKey.push(String(x.n));
      });
      r.shown = [].map.call(document.querySelectorAll('#bagGrid .bg53-c:not(.em)'), c => c.dataset.bagn);
      r.tabsLeft = document.querySelectorAll('#bagw [data-bagtab], #bagw .bg53-tabs').length;
    } catch (e) { r.curErr = r.curErr || String(e && e.message || e); }
    try { renderBag(); closeBag(); } catch (e) { r.curErr = r.curErr || String(e && e.message || e); }
    return r;
  }, Object.keys(CNT));
  eq('53 · 렌더 크래시', bag.curErr || 'none', 'none');
  yes('53 · 화폐 칸 ≥ 5(실제 보유량이 실제로 들어감)', bag.curCells >= 5);
  eq('53 · bagCur() 이름 중 비문자열', bag.nonString.length + (bag.nonString.length ? ' :: ' + bag.nonString.join(',') : ''), 0);
  eq('53 · 칸 이름에 숫자만인 것', bag.shown.filter(x => /^\d+$/.test(x || '')).join(',') || 'none', 'none');
  eq('53 · CURINFO 키가 빠진 칸(292 — 클릭이 죽는 칸)', bag.noKey.join(',') || 'none', 'none');
  eq('53 · 292 — 소모품 탭 스트립 잔재', bag.tabsLeft, 0);
  eq('53 · 292 — S.own 재료가 가방에 안 실린다',
    bag.shown.filter(n => ['돌팔매', '꿰뚫는 화살', '서리 연쇄', '폭풍의 칼날', '천벌의 창'].indexOf(n) >= 0)
      .join(',') || 'none', 'none');
  /* 증거 캡처 — 크래시가 나던 그 화면(5종 보유 + 가방) */
  await p.evaluate(() => { openBag(); });
  await p.waitForTimeout(400);
  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '../docs/review/109-53-가방재화탭.png') });
  await p.evaluate(() => closeBag());

  /* ── ⑤ 이름이 «실제로 글자로 나오는» 화면 ──────────────────────────────
     PROGRESS 109 행은 «04/07/12/21 에서 이름 표시 확인» 이라고 적었지만, 소스를 보면
     그 넷은 스킬 이름을 **글자로 그리지 않는다**: 04·07 카드는 아이콘+Lv+조각바(`renderSkill`),
     12 소환 결과 칸은 아이콘+중복 개수(`showSummonResult` — `a.n` 은 개수다), 21 도감은
     91 교체 뒤 «부위×등급 세트» 이름(`st.n`)만 쓴다. 스킬 이름이 글자로 나오는 곳은
     **08 스킬 세부 팝업(`#mtitle`)** 과 **11 확률 정보 팝업(`.prb-row .nm`)**, 그리고 53 가방이다.
     → 실제 표시면을 본다. 각 검사는 «훑은 개수» 도 같이 보고해 셀렉터가 헛도는 것을 막는다. */
  const scr = await p.evaluate(ids => {
    const out = { d8: [], d8err: '', p11: [], p11n: 0, p11err: '' };
    /* 08 — 5종 전부 보유 상태로 세부 팝업을 열어 제목을 읽는다 */
    ids.forEach(id => {
      try { showSkillDetail(id); out.d8.push(document.getElementById('mtitle').textContent); }
      catch (e) { out.d8err = out.d8err || id + ': ' + String(e && e.message || e); }
      try { closeModal(); } catch (e) {}
    });
    /* 11 — 스킬 배너 확률 정보(전 등급 행에 스킬 이름이 나열된다) */
    try {
      openProbInfo('skill', 999);
      const rows = document.querySelectorAll('#prbList .prb-row .nm i');
      out.p11n = rows.length;
      out.p11 = [].map.call(rows, e => e.textContent.trim());
      closeProbInfo();
    } catch (e) { out.p11err = String(e && e.message || e); }
    return out;
  }, Object.keys(CNT));
  const isNum = t => /^\d+(\.\d+)?$/.test((t || '').trim());
  eq('08 · 스킬 세부 팝업 렌더 에러', scr.d8err || 'none', 'none');
  eq('08 · 제목을 읽은 스킬 수', scr.d8.length, Object.keys(CNT).length);
  eq('08 · 제목', scr.d8.join('/'), '돌팔매/꿰뚫는 화살/서리 연쇄/폭풍의 칼날/천벌의 창');
  eq('11 · 확률 정보 렌더 에러', scr.p11err || 'none', 'none');
  yes('11 · 이름 행을 실제로 훑었다(≥ 24종)', scr.p11n >= 24);
  eq('11 · 확률표에 숫자 이름', scr.p11.filter(isNum).join(',') || 'none', 'none');
  yes('11 · 5종 이름이 확률표에 보인다', ['돌팔매', '꿰뚫는 화살', '서리 연쇄', '폭풍의 칼날', '천벌의 창']
    .every(n => scr.p11.indexOf(n) >= 0));

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 100) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY109 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
