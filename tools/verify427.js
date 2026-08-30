#!/usr/bin/env node
/* 게이트 — 작업 427 「탑도 «층» 이 아니라 «레벨»」 (저장소 주인 지시 2026-08-30)
 *
 *   node tools/verify427.js
 *
 * ⚑ **이 게이트가 지키는 것은 «탑 라벨 한 칸» 이 아니다.** 209 가 세운 것은 «탑은 층이다» 라는
 *   **낱말 규약**이었고 그 규약이 여섯 자리(런 타이틀 · 실패 통보 · 소탕 안내 · 339 카운트다운 ·
 *   04 세부 · 03 카드)에 흩어져 있었다. 주인이 그 규약을 뒤집었으므로 이 자는 **자리마다** 묻는다 —
 *   한 자리만 고치고 나머지가 «층» 으로 남는 것이 이 작업의 유일한 실패 모양이다.
 *
 *   [A] 소스 — **제품 문자열**에 «층» 0건(주석은 뺀다. 277 «폐기 식별자» 방식).
 *       ⚠ 이 항 하나로 닫지 않는다 — 소스 grep 은 «그렸는가» 를 못 본다(350·368 규약).
 *   [B] 런 타이틀 — 탑 2종·던전이 **같은 형식** «이름 - 레벨 n» 이다(427 로 분기 자체가 사라졌다).
 *   [C] 04 세부 팝업 — 탑 모드 `#dgdLvL` = «레벨»(던전 모드와 같은 낱말) · 모드 전환 잔류 없음.
 *   [D] 03 탑 카드 좌 캡슐 = «레벨» + 현재 레벨(던전 카드와 같은 낱말).
 *   [E] 실패 통보 — «<이름> 레벨 n 실패»(던전·탑 공용 한 줄).
 *   [F] 소탕 안내 · [G] 339 카운트다운 · [H] 던전 탭 안내문·행 · [I] 던전 잠금 사유.
 *   [K] **데이터·규칙 0줄** — 지시는 «표기만» 이다. 진행 키(S.tower/S.tower2)·`towerSetFloor`·
 *       «현재 레벨만 도전(◀▶ 잠금)»·«입장권 0 차감»·«소탕 없음» 이 그대로인지 되묻는다.
 *       (낱말을 바꾸다 규칙을 같이 건드리면 209·210·264 가 뒤늦게 운다.)
 *   [R] 되돌림 시험 — 옛 낱말을 도로 넣은 **사본**에서 [A] 스캐너가 실제로 빨개진다.
 *       (없으면 [A] 는 «아무것도 안 세는 자» 여도 초록이다 — 334 교훈.)
 *
 * [3]-(가) 기계적 검증: 레퍼런스 이미지 대조가 아니라 «상태 → 문자열» 판정이라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* ── 주석을 걷어낸 «제품 문자열» 층. 블록 주석(/* … *\/)과 HTML 주석만 지운다 —
   이 파일에는 `//` 줄 주석이 없고(URL·정규식과 구별이 안 되므로 일부러 안 쓴다), 지우려 들면
   `https://` 같은 자리를 잘라 오히려 거짓 양성을 만든다. */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
}
/* «층» 이 남은 제품 줄을 돌려준다(줄 번호 + 잘린 본문). 되돌림 시험이 같은 함수를 쓴다. */
function floorHits(src) {
  const body = stripComments(src).split('\n');
  const out = [];
  body.forEach((l, i) => { if (l.includes('층')) out.push((i + 1) + ': ' + l.trim().slice(0, 90)); });
  return out;
}

(async () => {
  console.log('=== 427 탑 «층» → «레벨» ===\n');

  /* ══ [A] 소스 — 제품 문자열에 «층» 0건 ══════════════════════════════ */
  console.log('[A] 소스 — 제품 문자열');
  const hits = floorHits(SRC);
  ok(hits.length === 0, '주석 밖 «층» 0건', hits.length ? hits.join(' | ') : '0건');
  /* 옛 형식이 통째로 되살아나는 자리를 이름으로 못 박는다(조각이 낡아도 여기가 먼저 운다) */
  ok(!/isTower\(d\)\s*\?\s*' - ' \+ f \+ '층'/.test(SRC), '런 타이틀의 탑/던전 낱말 분기가 사라졌다', '소스 grep');
  ok(/dunTtlBase = d\.n \+ ' - 레벨 ' \+ f;/.test(SRC), '런 타이틀은 한 갈래 «이름 - 레벨 n»', '소스 grep');

  const browser = await launch(chromium);
  const p = await (await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(1200);

  /* ══ [B] 런 타이틀 — 탑 2종·던전이 같은 형식 ═════════════════════════ */
  console.log('\n[B] 런 타이틀 «이름 - 레벨 n»');
  const ttl = await p.evaluate(() => {
    const t = () => document.getElementById('dunTtl').textContent.trim();
    const out = {};
    challengeTower('tower');      out.tower = t();   endDunRun(false, true);
    challengeTower('despair');    out.despair = t(); endDunRun(false, true);
    S.dunTk[DUNGEONS[0].id] = 9;  challengeDungeon(DUNGEONS[0]); out.dun = t(); out.dunN = DUNGEONS[0].n;
    endDunRun(false, true);
    return out;
  });
  ok(ttl.tower === '시련의 탑 - 레벨 1', '시련의 탑 (실측 "' + ttl.tower + '")');
  ok(ttl.despair === '절망의 탑 - 레벨 1', '절망의 탑 (실측 "' + ttl.despair + '")');
  ok(new RegExp('^' + ttl.dunN + ' - 레벨 \\d+$').test(ttl.dun.replace(/[●○]+$/, '').trim()),
     '던전도 같은 형식 — 낱말이 하나다 (실측 "' + ttl.dun + '")');

  /* ══ [C] 04 세부 팝업 라벨 ══════════════════════════════════════════ */
  console.log('\n[C] 04 세부 팝업 라벨');
  const lv = await p.evaluate(() => {
    const L = () => document.getElementById('dgdLvL').textContent.trim();
    const out = {};
    openTowerDetail('tower');  out.tower = L();
    closeDunDetail();
    openDunDetail(DUNGEONS[0]); out.dun = L();
    closeDunDetail();
    /* 모드 전환 잔류(205 주석) — 던전을 본 뒤 탑을 열어도 «레벨» 이어야 한다 */
    openTowerDetail('despair'); out.back = L(); out.floor = document.getElementById('dgdFloor').textContent.trim();
    closeDunDetail();
    return out;
  });
  ok(lv.tower === '레벨', '탑 모드 라벨 = «레벨» (실측 "' + lv.tower + '")');
  ok(lv.dun === '레벨', '던전 모드 라벨 = «레벨» (실측 "' + lv.dun + '")');
  ok(lv.back === '레벨', '던전 → 탑 전환 뒤에도 «레벨» (잔류 없음, 실측 "' + lv.back + '")');
  ok(lv.floor === '1', '값 칸은 그대로 현재 레벨 (실측 "' + lv.floor + '")');

  /* ══ [D] 03 탑 카드 좌 캡슐 ═════════════════════════════════════════ */
  console.log('\n[D] 03 탑 카드');
  const card = await p.evaluate(() => {
    closeDunDetail(); openDungeon(); setDunSub('tower');
    const cs = [...document.querySelectorAll('#dunList [data-tcard]')];
    const rd = c => { const g = s => { const e = c.querySelector(s); return e ? e.textContent.trim() : null; };
                      return { nm: g('.nm'), lbA: g('.lb.a'), lbB: g('.lb.b'), lv: g('.sp.lv') }; };
    const dun = (() => { setDunSub('dun');
      const d = document.querySelector('#dunList [data-dcard]');
      return d ? d.querySelector('.lb.a').textContent.trim() : null; })();
    return { towers: cs.map(rd), dunLbA: dun };
  });
  ok(card.towers.length > 0 && card.towers.every(t => t.lbA === '레벨'),
     '탑 카드 좌 캡슐 = «레벨» ' + card.towers.length + '장 (실측 ' + card.towers.map(t => t.nm + ':' + t.lbA).join(' · ') + ')');
  ok(card.towers.every(t => /\d+$/.test(t.lv || '')), '값 칸은 그대로 현재 레벨 숫자 (' + card.towers.map(t => t.lv).join(',') + ')');
  ok(card.towers.every(t => t.lbB === '입장 제한'), '우 캡슐 «입장 제한» 은 안 건드렸다(209 ①)');
  ok(card.dunLbA === '레벨', '던전 카드도 같은 낱말 (실측 "' + card.dunLbA + '")');

  /* ══ [E] 실패 통보 ══════════════════════════════════════════════════ */
  console.log('\n[E] 실패 통보 «레벨 n 실패»');
  const failT = await p.evaluate(() => {
    const grab = () => [...document.querySelectorAll('.fx-toast')].map(e => e.textContent).join(' | ');
    const out = {};
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    challengeTower('tower'); endDunRun(false, false); out.tower = grab();
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    S.dunTk[DUNGEONS[0].id] = 9; challengeDungeon(DUNGEONS[0]); endDunRun(false, false); out.dun = grab(); out.dunN = DUNGEONS[0].n;
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    return out;
  });
  ok(/시련의 탑 레벨 1 실패/.test(failT.tower), '탑 (실측 "' + failT.tower + '")');
  ok(new RegExp(failT.dunN + ' 레벨 \\d+ 실패').test(failT.dun), '던전 — 같은 한 줄 (실측 "' + failT.dun + '")');

  /* ══ [F] 소탕 안내 ══════════════════════════════════════════════════ */
  console.log('\n[F] 소탕 안내');
  const sweep = await p.evaluate(() => {
    const d = DUNGEONS[0];
    S.dun[d.id] = 1;                       /* 아직 1레벨도 못 깼다 = 소탕할 이전 레벨이 없다 */
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    sweepDungeon(d);
    const t = [...document.querySelectorAll('.fx-toast')].map(e => e.textContent).join(' | ');
    document.querySelectorAll('.fx-toast').forEach(e => e.remove());
    return t;
  });
  ok(/먼저 레벨 1을 클리어해야 소탕합니다/.test(sweep), '«먼저 레벨 1을 …» (실측 "' + sweep + '")');

  /* ══ [G] 339 카운트다운 ═════════════════════════════════════════════ */
  console.log('\n[G] 339 카운트다운 문구');
  const cd = await p.evaluate(() => {
    const d = DUNGEONS[0];
    S.dun[d.id] = 3; S.dunTk[d.id] = 9;
    dclDun = d; dclAuto = true; dclSweep = false; dclCd = 5;
    const next = dclCdTxt();
    dclSweep = true;
    const rep = dclCdTxt();
    dclAuto = false; dclSweep = false;
    return { next, rep };
  });
  ok(cd.next === '5초 뒤 다음 레벨 자동 도전', '«다음 레벨 자동 도전» (실측 "' + cd.next + '")');
  ok(cd.rep === '5초 뒤 자동 소탕', '소탕 쪽 문구는 그대로 — 낱말 교체가 남의 갈래를 안 밟았다 (실측 "' + cd.rep + '")');

  /* ══ [H] 던전 탭 안내문 · 행 ════════════════════════════════════════ */
  console.log('\n[H] 던전 탭 안내문 · 행');
  const dunTab = await p.evaluate(() => {
    renderDun();
    const h = document.getElementById('bDun').innerHTML;   /* renderDun 은 setBody('bDun') 로 그린다 */
    return { intro: /다음 레벨이 열립니다/.test(h) && /이전 레벨 보상/.test(h),
             row: /레벨 \d+<\/span>/.test(h), old: h.includes('층') };
  });
  ok(dunTab.intro, '안내문 «다음 레벨이 열립니다 · 이전 레벨 보상»');
  ok(dunTab.row, '행 캡슐 «레벨 n»');
  ok(!dunTab.old, '그려진 던전 탭에 «층» 0건');

  /* ══ [I] 던전 잠금 사유 ═════════════════════════════════════════════ */
  console.log('\n[I] 던전 잠금 사유');
  const lock = await p.evaluate(() => {
    const ids = Object.keys(DUN_UI).filter(k => DUN_UI[k].pre);
    return ids.map(id => { const d = DUNGEONS.find(x => x.id === id); return d ? dunLockTxt(d) : ''; });
  });
  ok(lock.length > 0 && lock.every(t => /레벨 <b>\d+<\/b> 클리어/.test(t)),
     '«<이전 단> 레벨 <b>n</b> 클리어» ' + lock.length + '건 (실측 ' + (lock[0] || '').replace(/<[^>]+>/g, '') + ')');
  ok(lock.every(t => !t.includes('층')), '잠금 사유에 «층» 0건');

  /* ══ [K] 데이터·규칙 0줄 — 바뀐 것은 낱말뿐이다 ═════════════════════ */
  console.log('\n[K] 데이터·규칙 0줄');
  const rule = await p.evaluate(() => {
    const out = {};
    out.keys = ['tower', 'tower2'].every(k => Number.isFinite(S[k]));
    out.fk = TOWERS.map(t => t.fk).join(',');
    out.setFloor = typeof towerSetFloor === 'function';
    out.def = DEF().tower === 1 && DEF().tower2 === 1;
    /* «현재 레벨만 도전» — ◀▶ 는 탑 세부에서 둘 다 잠긴다 */
    openTowerDetail('tower');
    out.prev = document.getElementById('dgdPrev').disabled;
    out.next = document.getElementById('dgdNext').disabled;
    closeDunDetail();
    /* 입장권 0 차감 — 탑 런은 S.dunTk 를 안 건드린다 */
    const before = JSON.stringify(S.dunTk);
    challengeTower('tower'); endDunRun(false, true);
    out.tkSame = JSON.stringify(S.dunTk) === before;
    /* 클리어 → 레벨 +1 이 저장까지 간다(낱말만 바꿨다는 증거의 반대쪽) */
    const f0 = S.tower;
    challengeTower('tower'); endDunRun(true, false);
    out.up = S.tower === f0 + 1;
    return out;
  });
  ok(rule.keys && rule.def, '진행 키 S.tower · S.tower2 그대로(기본 1)');
  ok(rule.fk === 'tower,tower2', '탑마다 제 키 — TOWERS.fk (' + rule.fk + ')');
  ok(rule.setFloor, '`towerSetFloor` 이름 그대로(리네임 안 했다)');
  ok(rule.prev && rule.next, '◀▶ 둘 다 잠김 — «현재 레벨만 도전»(209 ②)');
  ok(rule.tkSame, '탑 런은 입장권을 안 쓴다(209 ①)');
  ok(rule.up, '클리어하면 레벨 +1 이 실제로 오른다(264 ③)');

  ok(errs.length === 0, '콘솔 에러 0', errs.length ? errs.slice(0, 3).join(' / ') : '0건');
  await browser.close();

  /* ══ [R] 되돌림 시험 ════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험 — 옛 낱말을 도로 넣으면 [A] 가 빨개진다');
  const revs = [
    ['런 타이틀', "dunTtlBase = d.n + ' - 레벨 ' + f;", "dunTtlBase = d.n + (isTower(d) ? ' - ' + f + '층' : ' - 레벨 ' + f);"],
    ['카드 라벨', "'<div class=\"lb a\"><i>레벨</i></div><div class=\"lb b\"><i>입장 제한</i></div>'",
                  "'<div class=\"lb a\"><i>층</i></div><div class=\"lb b\"><i>입장 제한</i></div>'"],
    ['카운트다운', "'다음 레벨 자동 도전'", "'다음 층 자동 도전'"]
  ];
  revs.forEach(([n, from, to]) => {
    if (!SRC.includes(from)) { ok(false, '§R ' + n + ' — 되돌릴 자리를 못 찾았다(표본이 낡았다)', from.slice(0, 50)); return; }
    const bad = SRC.replace(from, () => to);
    const h = floorHits(bad);
    ok(h.length > 0, '§R ' + n + ' 을 되돌리면 [A] 가 잡는다', h.length + '건');
  });
  /* 음성항 — 주석 안의 «층» 은 [A] 가 세지 않는다(세면 209·210 설계 주석 때문에 영원히 빨갛다) */
  ok(floorHits('/* 현재 층만 도전한다 */\nconst a = 1;').length === 0, '§R 주석 안 «층» 은 안 센다(거짓 양성 방지)');
  ok(floorHits("const t = '3층';").length === 1, '§R 주석 밖 «층» 은 반드시 센다');

  console.log('\n' + (fail === 0 ? 'VERIFY427 PASS' : 'VERIFY427 FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
