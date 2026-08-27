/* 작업 90 — 03 던전 구성(골드 1 · 다이아 1 · 유물조각 1~4).  실행: node tools/verify90.js
   지시서 [3]-(가) + «기능 완성 규칙»(T2 는 실제 게임 데이터로 동작해야 완료).
     [1] 구조   — DUNGEONS 6종 · id 단언 · growth/boss 폐기 · req/rw 배수 1 / 2.5 / 6 / 15
     [2] 기능   — 각 던전 헤드리스 1회 클리어 → 보상 종류가 gold·dia·rel·stone·rstone 만 · 층 +1 · 입장 −1
     [3] 해금   — relic2~4 잠금 → 이전 단 5층 클리어 후 해금 (03 카드 `.lk` 문구까지)
     [4] 저장   — 구 세이브(relic/growth/boss 키) 로드 · «고대 유적» 진행도가 relic1 로 이어짐
     [5] UI     — 03 카드 IDS.length 장 · 리스트 세로 스크롤 성립 · 보상 알약 글자가 알약 밖으로 안 샘(LESSONS 46-①)
   194(2026-08-27) — 강화석 던전(`stone`)이 7번째로 붙었다. 90 의 «6종» 단언은 그때 있던
   던전 수였지 못박은 상한이 아니다 → IDS·CUR 에 stone 을 더하고 개수 단언을 IDS.length 로 돌린다.
   기능 체크 표(review 파일에 붙일 것)는 `--table` 로 출력한다. */
/* 139 — 브라우저 부트스트랩은 110 공용 `tools/pwlaunch.js` 로 통일한다.
   여기 복붙돼 있던 `launchOpts()` 는 `/opt/pw-browsers/chromium` 하나만 봐서
   빌드 번호가 붙은 디렉터리(chromium-1194/…)를 못 찾는다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

const IDS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];
/* 194 — +stone(강화석) · 203 — +rstone(룬강화석). 90 의 개수 단언은 «그때 있던 던전 수» 이지
   못박은 상한이 아니다 — 던전 계열이 늘면 IDS·CUR 에 더하고 개수는 IDS.length 로 따라간다. */
const K   = { relic1: 1, relic2: 2.5, relic3: 6, relic4: 15 };
const CUR = { gold: 'gold', dia: 'dia', relic1: 'rel', relic2: 'rel', relic3: 'rel', relic4: 'rel',
              stone: 'stone', rstone: 'rstone' };   /* 194 · 203 */

(async () => {
  /* 139 — [5] 썸네일 판정이 캔버스 잉크를 읽는다. file:// 로 띄운 스프라이트는
     캔버스를 오염시켜 `getImageData` 가 SecurityError 로 막히므로 72 게이트와 같은 플래그를 준다. */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* ---------------- [1] 구조 ---------------- */
  console.log('[1] 구조');
  const st = await p.evaluate(() => ({
    ids: DUNGEONS.map(d => d.id),
    names: DUNGEONS.map(d => d.n),
    tries: DUN_TRY,
    req1: DUNGEONS.map(d => d.req(1)),
    rw1:  DUNGEONS.map(d => d.rw(1)),
    rw3:  DUNGEONS.map(d => d.rw(3)),
    uiKeys: Object.keys(DUN_UI),
    towerIds: (typeof TOWERS !== 'undefined' ? TOWERS : [TOWER]).map(t => t.id),   /* 210 */
    stateKeys: Object.keys(DUN_STATE),
    pills: DUNGEONS.map(d => (DUN_UI[d.id] || {}).rw)
  }));
  ok(st.ids.length === IDS.length, 'DUNGEONS.length === ' + IDS.length + ' (실측 ' + st.ids.length + ')');
  ok(JSON.stringify(st.ids) === JSON.stringify(IDS), 'id 순서 ' + IDS.join('·') + ' (실측 ' + st.ids.join('·') + ')');
  ok(!st.ids.includes('growth') && !st.ids.includes('boss'), 'growth(수련의 탑)·boss(마왕의 성) 폐기');
  ok(!st.ids.includes('relic'), '구 id `relic` 없음 — relic1~4 로 대체');
  /* 204(2026-08-27, 주인 지시) — 90 ④ 의 «하루 3회 리필» 은 폐기됐다. DUN_TRY 는 이제
     «출석 1회가 주는 적립량 = 표기 분모» 이고 값은 2 다. 저장 위치도 S.daily.dun → S.dunTk. */
  ok(st.tries === 2, 'DUN_TRY === 2 (204 — 출석마다 던전별 +2 적립 · 표기 분모)');
  ok(st.names.length === new Set(st.names).size, '던전 이름 ' + IDS.length + '개 모두 다름 (' + st.names.join(' · ') + ')');
  /* 209(2026-08-27, 주인 지시) — 「시련의 탑」은 **던전이 아니다**(DUNGEONS 에 없다). 다만 카드 기하와
     178 던전 보스 스프라이트를 `DUN_UI[id]` 한 곳에서 읽으므로 UI 항목만 하나 더 있다.
     90 이 지키려던 규칙은 «던전마다 UI 가 1개» 이므로 ⊇ 로 묻고, 던전이 아닌 키는 아래 화이트리스트로만
     허용한다(LESSONS 194-4 — 개수 단언은 상한이 아니라 «그때 N개» 라는 기록이었다). */
  /* 210 ②(2026-08-27, 주인 지시) — 「절망의 탑」이 시련의 탑과 나란히 서면서 «던전 아닌 키» 가
     둘이 됐다. 화이트리스트를 손으로 늘리면 탑이 늘 때마다 여기가 빨개지므로 `TOWERS` 를 그대로
     읽는다 — 이 절이 지키려던 «던전이 아닌 키는 탑뿐» 은 그대로 참이다. */
  const UI_EXTRA = st.towerIds;
  ok(IDS.every(id => st.uiKeys.includes(id))
     && st.uiKeys.filter(k => !IDS.includes(k)).every(k => UI_EXTRA.includes(k)),
     'DUN_UI ⊇ DUNGEONS ' + IDS.length + '개 + 던전 아닌 키는 ' + UI_EXTRA.join('·') + ' 뿐 (실측 ' + st.uiKeys.length + '개)');
  ok(IDS.every(id => st.stateKeys.includes(id)) && st.stateKeys.length === IDS.length, 'DUN_STATE 키 ' + IDS.length + '개, DUNGEONS 와 1:1');

  /* req·rw 배수 — relic1 을 1 로 두고 2.5 / 6 / 15 인지 실측 */
  const i1 = st.ids.indexOf('relic1');
  ['relic2', 'relic3', 'relic4'].forEach(id => {
    const i = st.ids.indexOf(id);
    const kr = st.req1[i] / st.req1[i1], kw = st.rw1[i].rel / st.rw1[i1].rel;
    ok(Math.abs(kr - K[id]) < 1e-9, id + ' 요구 전투력 배수 ' + K[id] + ' (실측 ' + kr.toFixed(3) + ')');
    ok(Math.abs(kw - K[id]) < 0.02, id + ' 유물조각 보상 배수 ≈' + K[id] + ' (실측 ' + kw.toFixed(3) + ')');
  });
  /* 보상 종류가 한 던전당 1종뿐인가 — frag(도감 재료)·복합 보상은 폐기했다(194 +stone · 203 +rstone) */
  const kinds = new Set();
  st.rw1.concat(st.rw3).forEach(r => Object.keys(r).forEach(k => kinds.add(k)));
  ok([...kinds].every(k => ['gold', 'dia', 'rel', 'stone', 'rstone'].includes(k)),
     '보상 종류가 gold·dia·rel·stone·rstone 뿐 (실측 ' + [...kinds].join(',') + ')');
  st.ids.forEach((id, i) => ok(Object.keys(st.rw1[i]).length === 1 && st.rw1[i][CUR[id]] > 0,
    id + ' 보상은 ' + CUR[id] + ' 1종'));
  ok(st.pills.every(r => r.length === 1), '03 카드 보상 알약은 던전당 1개 (폭 초과분 폐기)');

  /* ---------------- [2] 기능 — 각 던전 실제 1회 클리어 ---------------- */
  console.log('[2] 기능 — 각 던전 헤드리스 1회 클리어');
  const table = [];
  for (const id of IDS) {
    const r = await p.evaluate(({ id, all }) => {
      /* 잠금·전투력을 문제삼지 않는 «클리어 그 자체» 검사: 해금 상태로 만들고 요구 피해를 채운다 */
      S.guide.idx = 99;
      all.forEach(x => { S.dun[x] = 99; });           /* 상위 단 해금(이전 단 5층 초과) */
      S.dun[id] = 1;
      DUNGEONS.forEach(d => S.dunTk[d.id] = 3);          /* 204 — 입장권 적립식 */
      S.gold = 0; S.dia = 0; S.relic = 0; S.stone = 0; S.rstone = 0;   /* 194 · 203 */
      const before = { gold: S.gold, dia: S.dia, rel: S.relic, stone: S.stone, rstone: S.rstone,
                       floor: S.dun[id], left: S.dunTk[id], cnt: S.cnt.dungeon };
      const d = DUNGEONS.find(x => x.id === id);
      challengeDungeon(d);                            /* 30 — 제한 시간 전투로 입장 */
      const entered = !!dunRun && dunRun.d.id === id;
      const need = entered ? dunRun.need : 0;
      if (entered) { dunRun.dmg = dunRun.need; endDunRun(true); }   /* 요구 피해를 채워 클리어 */
      const after = { gold: S.gold, dia: S.dia, rel: S.relic, stone: S.stone, rstone: S.rstone,
                      floor: S.dun[id], left: S.dunTk[id], cnt: S.cnt.dungeon };
      const clr = document.getElementById('dclw').classList.contains('on');
      const amt = document.getElementById('dclAmt').textContent;
      closeDunClear();
      return { entered, need, before, after, clr, amt };
    }, { id, all: IDS }).catch(e => ({ err: String(e) }));

    if (r.err) { ok(false, id + ' — 평가 실패: ' + r.err); continue; }
    const cur = CUR[id];
    const gained = { gold: r.after.gold - r.before.gold, dia: r.after.dia - r.before.dia,
                     rel: r.after.rel - r.before.rel, stone: r.after.stone - r.before.stone,
                     rstone: r.after.rstone - r.before.rstone };   /* 194 · 203 */
    const only = Object.keys(gained).filter(k => gained[k] > 0);
    ok(r.entered, id + ' — [도전] 이 30초 던전 전투로 입장(요구 피해 ' + Math.round(r.need).toLocaleString() + ')');
    ok(only.length === 1 && only[0] === cur, id + ' — 획득 재화가 ' + cur + ' 1종 (실측 ' + (only.join(',') || '없음') + ')');
    ok(gained[cur] > 0, id + ' — ' + cur + ' +' + Math.round(gained[cur]).toLocaleString() + ' 실제 지급(S 반영)');
    ok(r.after.floor === r.before.floor + 1, id + ' — 층 ' + r.before.floor + ' → ' + r.after.floor + ' (다음 층 해금)');
    ok(r.after.left === r.before.left - 1, id + ' — 입장 횟수 ' + r.before.left + ' → ' + r.after.left);
    ok(r.after.cnt === r.before.cnt + 1, id + ' — S.cnt.dungeon +1 (가이드 미션 «던전 N회» 연동)');
    ok(r.clr, id + ' — 31 던전 클리어 화면 표시(보상 ' + r.amt + ')');
    table.push({ id, cur, gain: Math.round(gained[cur]), need: Math.round(r.need),
                 floor: r.before.floor + '→' + r.after.floor, left: r.before.left + '→' + r.after.left, amt: r.amt });
  }

  /* ---------------- [3] 해금 ---------------- */
  console.log('[3] 해금 — 이전 단 5층 클리어');
  const lk = await p.evaluate(() => {
    const out = { locked: {}, txt: {}, afterClear: {}, gate: {} };
    S.guide.idx = 99;
    ['relic1', 'relic2', 'relic3', 'relic4'].forEach(x => S.dun[x] = 1);
    ['relic2', 'relic3', 'relic4'].forEach(id => {
      const d = DUNGEONS.find(x => x.id === id);
      out.locked[id] = dunLocked(d);
      out.txt[id] = dunLockTxt(d);
    });
    /* 이전 단을 «5층 클리어»(= S.dun 6) 로 만들면 열려야 한다 */
    S.dun.relic1 = 6; out.afterClear.relic2 = dunLocked(DUNGEONS.find(x => x.id === 'relic2'));
    S.dun.relic1 = 5; out.gate.relic2 = dunLocked(DUNGEONS.find(x => x.id === 'relic2'));  /* 4층까지 = 아직 잠김 */
    S.dun.relic2 = 6; out.afterClear.relic3 = dunLocked(DUNGEONS.find(x => x.id === 'relic3'));
    S.dun.relic3 = 6; out.afterClear.relic4 = dunLocked(DUNGEONS.find(x => x.id === 'relic4'));
    /* relic1 은 61 가이드 미션 게이트를 그대로 쓴다 */
    S.guide.idx = 0;  out.g0 = dunLocked(DUNGEONS.find(x => x.id === 'relic1'));
    S.guide.idx = 15; out.g15 = dunLocked(DUNGEONS.find(x => x.id === 'relic1'));
    /* 잠긴 던전은 입장·소탕이 막힌다 */
    S.guide.idx = 99; S.dun.relic1 = 1; S.dun.relic2 = 1;
    const d2 = DUNGEONS.find(x => x.id === 'relic2');
    const l0 = S.dunTk.relic2, f0 = S.dun.relic2;
    challengeDungeon(d2); sweepDungeon(d2);
    out.blocked = (S.dunTk.relic2 === l0) && !dunRun && (S.dun.relic2 === f0);
    if (dunRun) endDunRun(false, true);
    closeModal && closeModal();
    return out;
  });
  ['relic2', 'relic3', 'relic4'].forEach(id => {
    ok(lk.locked[id] === true, id + ' — 이전 단 미클리어 시 잠김');
    ok(lk.afterClear[id] === false, id + ' — 이전 단 5층 클리어 후 해금');
    ok(/5<\/b>층 클리어/.test(lk.txt[id]), id + ' — 잠금 문구 «… 5층 클리어» (실측 ' + lk.txt[id].replace(/<[^>]+>/g, '') + ')');
  });
  ok(lk.gate.relic2 === true, 'relic2 — 이전 단 4층까지만 깨면 아직 잠김(경계 검사)');
  ok(lk.g0 === true && lk.g15 === false, 'relic1 — 61 가이드미션 15 게이트 유지');
  ok(lk.blocked === true, '잠긴 던전은 입장·소탕 모두 차단(입장 횟수·층 불변)');

  /* ---------------- [4] 저장 — 구 세이브 로드 ---------------- */
  console.log('[4] 저장 — 구 세이브(relic/growth/boss) 로드');
  const mig = await p.evaluate(() => {
    const KEYN = 'idle_hunter_save_v4';
    const keep = localStorage.getItem(KEYN);
    const old = JSON.parse(keep || '{}');
    /* 던전 재편 이전 세이브 모양 그대로 */
    old.dun = { gold: 4, dia: 2, relic: 7, growth: 3, boss: 2 };
    /* 204 — 이 세이브는 «현재 세이브를 복사해» 만든다. 204 이후로는 거기에 `dunTk`(영구 입장권)가
       들어 있어서, 지우지 않으면 «이미 개편된 세이브» 로 읽혀 90 의 승계 경로를 아예 안 탄다.
       구 세이브를 흉내 내는 것이 이 절의 목적이므로 새 키를 떨군다. */
    delete old.dunTk;
    old.daily = Object.assign({}, old.daily || {}, {
      date: (() => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(); })(),
      dun: { gold: 1, dia: 0, relic: 2, growth: 3, boss: 3 } });
    localStorage.setItem(KEYN, JSON.stringify(old));
    const errs = [];
    let r;
    try { r = load(); } catch (e) { errs.push(String(e)); }
    const out = { err: errs, loaded: r !== undefined,
                  relic1: S.dun.relic1, gold: S.dun.gold, dia: S.dun.dia,
                  tryRelic1: S.dunTk.relic1,
                  newKeys: ['relic1','relic2','relic3','relic4'].map(k => S.dun[k]),
                  nan: Object.keys(S.dun).filter(k => !Number.isFinite(S.dun[k])),
                  dailyNan: Object.keys(S.dunTk).filter(k => !Number.isFinite(S.dunTk[k])) };
    if (keep) localStorage.setItem(KEYN, keep);
    return out;
  });
  ok(mig.err.length === 0, '구 세이브 로드에 예외 없음' + (mig.err.length ? ' — ' + mig.err[0] : ''));
  ok(mig.relic1 === 7, '구 «고대 유적» 7층 진행도가 relic1 로 이어짐 (실측 ' + mig.relic1 + ')');
  ok(mig.tryRelic1 === 2, '같은 날짜면 남은 입장 횟수도 relic1 로 이어짐 (실측 ' + mig.tryRelic1 + ')');
  ok(mig.gold === 4 && mig.dia === 2, '골드·다이아 던전 층 보존 (' + mig.gold + ' · ' + mig.dia + ')');
  ok(mig.newKeys.every(v => Number.isFinite(v) && v >= 1), 'relic1~4 층이 전부 유효값 (' + mig.newKeys.join(',') + ')');
  ok(mig.nan.length === 0 && mig.dailyNan.length === 0,
     'S.dun · S.dunTk 에 NaN/undefined 0건' + (mig.nan.length ? ' — ' + mig.nan.join(',') : ''));

  /* ---------------- [5] UI — 03 카드 IDS.length 장 ---------------- */
  console.log('[5] UI — 03 던전 카드');
  await p.evaluate(() => { localStorage.removeItem('idle_hunter_save_v4'); });
  await p.reload();
  await p.waitForTimeout(1200);
  const ui = await p.evaluate(() => {
    S.guide.idx = 99; S.dun.relic1 = 6; S.dun.relic2 = 6; S.dun.relic3 = 1;
    dunSub = 'dun';
    openDungeon();
    const list = document.getElementById('dunList');
    const cards = [...list.querySelectorAll('[data-dcard]')];
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    /* 알약 안쪽 글자가 알약 밖으로 새는가 — LESSONS 46-① 의 7.5px 누출 재발 검사.
       캡슐은 radius 23 이라 글자 띠(top 8 · h 30) 높이에서 모서리가 5.6px 을 먹는다 —
       «오른쪽 여백 6px 이상» 을 기준으로 본다(글자가 곡선에 닿지 않는 최소값). */
    const INSET = 6;
    const leaks = [];
    cards.forEach(c => c.querySelectorAll('.pill').forEach(pl => {
      const i = pl.querySelector('i'); if (!i) return;
      const a = pl.getBoundingClientRect(), b = i.getBoundingClientRect();
      const over = Math.max(0, b.right - (a.right - INSET)) + Math.max(0, a.left - b.left);
      if (over > 0.5) leaks.push({ card: c.dataset.dcard, t: i.textContent, over: +over.toFixed(1),
                                   gap: +(a.right - b.right).toFixed(1) });
    }));
    return {
      n: cards.length,
      ids: cards.map(c => c.dataset.dcard),
      locked: cards.filter(c => c.querySelector('.lk')).map(c => c.dataset.dcard),
      lockTxt: cards.filter(c => c.querySelector('.lk')).map(c => c.querySelector('.lk u').textContent),
      /* 139 — 72 가 `6efe9e8` 에서 `.th>em`(이모지) → `.th>canvas.thcv`(스프라이트)로 갈았다.
         여기서 보는 것은 «썸네일이 채워졌나» 하나뿐이므로, 판정을 72 가 verify72 §1-2 에 쓴 것과
         같은 «캔버스가 있고 실제로 그려졌다»(알파>8 픽셀 수 > 0)로 좁힌다.
         마크업 모양이 아니라 «칸이 비었나» 를 물어야 아트가 또 바뀌어도 안 깨진다. */
      thumbs: cards.filter(c => {
        const cv = c.querySelector('.th canvas.thcv');
        if (!cv || !cv.width || !cv.height) return false;
        let im;
        try { im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; }
        catch (e) { return false; }            /* 캔버스 오염 = 못 읽음 = 통과시키지 않는다 */
        for (let i = 3; i < im.length; i += 4) if (im[i] > 8) return true;
        return false;
      }).length,
      scroll: { sh: list.scrollHeight, ch: list.clientHeight },
      pitch: cards.length > 1 ? Math.round(rect(cards[1]).y - rect(cards[0]).y) : 0,
      leaks
    };
  });
  ok(ui.n === IDS.length, '03 던전 카드 ' + IDS.length + '장 (실측 ' + ui.n + ')');
  ok(JSON.stringify(ui.ids) === JSON.stringify(IDS), '카드 순서가 DUNGEONS 순서와 같음');
  ok(ui.pitch === 360, '카드 pitch 360px 불변(350 + margin 10) — 실측 ' + ui.pitch);
  ok(ui.scroll.sh > ui.scroll.ch, IDS.length + '장이 리스트 높이를 넘어 세로 스크롤 성립 ('
     + ui.scroll.sh + ' > ' + ui.scroll.ch + ')');
  ok(ui.thumbs === IDS.length, '72 카드 썸네일(.th>canvas.thcv) ' + IDS.length + '장 모두 실제로 그려짐 (실측 ' + ui.thumbs + ')');
  ok(JSON.stringify(ui.locked) === JSON.stringify(['relic4']),
     'relic1~3 해금 · relic4 만 잠김 (실측 잠김 ' + (ui.locked.join(',') || '없음') + ')');
  ok(ui.lockTxt.every(t => /용의 무덤 5층 클리어/.test(t)),
     '잠금 칸 문구가 이전 단 이름·층으로 나옴 (실측 ' + (ui.lockTxt[0] || '') + ')');
  ok(ui.leaks.length === 0, '보상 알약 글자 누출 0건'
     + (ui.leaks.length ? ' — ' + ui.leaks.map(l => l.card + ':' + l.t + ' +' + l.over + 'px').join(' | ') : ''));

  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();

  if (process.argv.includes('--table')) {
    console.log('\n| 던전 | [도전] 을 눌렀을 때 무엇이 바뀌는가 | 실측 |');
    console.log('|---|---|---|');
    table.forEach(t => console.log('| `' + t.id + '` | 30초 전투 입장(요구 피해 ' + t.need.toLocaleString()
      + ') → 클리어 시 ' + t.cur + ' 지급 · 층 +1 · 입장 −1 · 31 클리어 화면 | ✅ ' + t.cur + ' +'
      + t.gain.toLocaleString() + ' · 층 ' + t.floor + ' · 입장 ' + t.left + ' · 화면 보상 ' + t.amt + ' |'));
  }

  console.log('\nVERIFY90 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
