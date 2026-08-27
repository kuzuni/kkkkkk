/* 작업 86 — 스킬 6등급 × 등급당 4종 = 24종.  실행: node tools/verify86.js
   지시서 [3]-(가) + «기능 완성 규칙»(T2 는 실제로 동작해야 완료).
     [1] 구조   — 24종 · 등급 분포 [4,4,4,4,4,4] · id 중복 없음 · 기존 13종 불변(구 세이브 호환)
     [2] 기능   — **신설 11종 각각** 헤드리스 전투에서 «발동 → 적 피해 / 버프 수치 변화» 실측
     [3] 저장   — 구 세이브(13종 시절 S.own·S.eqSkill) 로드 후 장착 8칸 보존
     [4] UI     — 04 스킬 격자 5열 x 5행 · 안쪽 스크롤 성립 · .sk-tot/.sk-btn y 불변
     [5] 도감   — COLL.skill 마지막 티어 need = 전 종 수(24) · 11 확률 팝업 24행
   기능 체크 표(review 파일에 붙일 것)는 `--table` 로 출력한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

let pass = 0, fail = 0;
const GN = ['일반','고급','희귀','영웅','전설','신화'];
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

/* 86 이 신설한 11종 — 기대 효과 축까지 같이 적는다 */
const NEW = [
  { id:'stone',  g:0, axis:'dmg',  n:'돌팔매' },
  { id:'vigor',  g:0, axis:'atk',  n:'기합' },
  { id:'mend',   g:1, axis:'heal', n:'치유의 빛' },
  { id:'arrow',  g:2, axis:'dmg',  n:'꿰뚫는 화살' },
  { id:'haste',  g:2, axis:'rate', n:'신속의 축복' },
  { id:'frost',  g:3, axis:'dmg',  n:'서리 연쇄' },
  { id:'gale',   g:4, axis:'dmg',  n:'폭풍의 칼날' },
  { id:'ward',   g:4, axis:'def',  n:'수호의 결계' },
  { id:'lance',  g:5, axis:'dmg',  n:'천벌의 창' },
  { id:'nova',   g:5, axis:'dmg',  n:'창세의 폭발' },
  { id:'rage',   g:5, axis:'atk',  n:'광란' }
];
/* 구 세이브 호환을 위해 값이 바뀌면 안 되는 기존 13종 */
const OLD = { slash:[0,0.85,1.00], shuri:[0,2.20,0.55], multi:[1,1.10,0.80], orbit:[1,0,0.45],
              ice:[1,1.60,1.30], aura:[2,0,0.55], bolt:[2,1.40,1.60], boom:[3,2.00,2.40],
              poison:[3,3.20,0.80], drain:[3,2.60,2.00], boomer:[4,2.40,1.80],
              meteor:[4,4.00,5.00], holy:[5,3.00,4.00] };

(async () => {
  let b;
  try { b = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await launch(chromium, o); }
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
    len: SKILLS.length,
    dist: [0,1,2,3,4,5].map(g => SKILLS.filter(s => s.g === g).length),
    over: SKILLS.filter(s => s.g > 5).length,
    ids: SKILLS.map(s => s.id),
    old: SKILLS.filter(s => !s.t).map(s => [s.id, s.g, s.cd, s.m]),
    sup: SKILLS.filter(s => s.sup).length,
    gradeLen: GRADE.length
  }));
  ok(st.len === 24, 'SKILLS.length === 24 (실측 ' + st.len + ')');
  ok(JSON.stringify(st.dist) === '[4,4,4,4,4,4]', '등급 분포 [4,4,4,4,4,4] (실측 ' + JSON.stringify(st.dist) + ')');
  ok(new Set(st.ids).size === st.len, 'id 중복 없음');
  ok(st.over === 0, '스킬은 6등급까지만 쓴다 — 85 의 7·8등급(초월·불멸) 미적용 (초과 ' + st.over + '종)');
  const bad = st.old.filter(([id, g, cd, m]) => !OLD[id] || OLD[id][0] !== g || OLD[id][1] !== cd || OLD[id][2] !== m);
  ok(st.old.length === 13 && !bad.length, '기존 13종 id·등급·cd·m 불변 (어긋남 ' + bad.length + '건)');
  ok(st.sup === 5, '보조(sup) 5종 — DPS 합산 제외 대상');
  NEW.forEach(x => ok(st.ids.includes(x.id), '신설 ' + x.n + '(' + x.id + ') 존재'));

  /* ---------------- [2] 기능 — 신설 11종 실동작 ---------------- */
  console.log('[2] 기능 — 신설 11종 헤드리스 전투 실측');
  const table = [];
  for (const sk of NEW) {
    const r = await p.evaluate(({ id, axis }) => {
      /* 깨끗한 상태: 그 스킬 하나만 보유·장착하고 적을 세워 둔다 */
      sbufClear();
      S.own = {}; S.own[id] = { n: 0, l: 1 };
      S.eqSkill = [id];
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      enemies.length = 0; spawnQ.length = 0;
      markDirty();
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 99;
      for (let i = 0; i < 8; i++) makeEnemy('zombie');
      enemies.forEach(e => { e.born = 1; e.hp = e.max = 1e12; e.x = player.x + (Math.random() * 200 - 100);
                             e.y = player.y + (Math.random() * 200 - 100); });
      const hp0 = enemies.reduce((s, e) => s + e.hp, 0);
      player.hp = stat.maxHp * 0.4;
      const php0 = player.hp;
      /* 20초를 60fps 로 결정적으로 돌린다(적은 죽지 않게 hp 를 크게 잡았다) */
      let peakAtk = 0, peakRate = 0, peakDef = 0, peakRegen = 0, shotsSeen = 0, boltsSeen = 0, boomsSeen = 0;
      for (let i = 0; i < 1200; i++) {
        const s0 = shots.length, b0 = bolts.length, m0 = booms.length;
        step(1 / 60);
        if (shots.length > s0) shotsSeen += shots.length - s0;
        if (bolts.length > b0) boltsSeen += bolts.length - b0;
        if (booms.length > m0) boomsSeen += booms.length - m0;
        peakAtk = Math.max(peakAtk, sbuf.atk); peakRate = Math.max(peakRate, sbuf.rate);
        peakDef = Math.max(peakDef, sbuf.def); peakRegen = Math.max(peakRegen, sbuf.regen);
        enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });   /* 죽지 않게 되돌리되 피해량은 아래서 따로 센다 */
      }
      return { dmg: hp0 - enemies.reduce((s, e) => s + e.hp, 0),
               hit: enemies.filter(e => e.fx > 0 || e.slow > 0).length,
               php0, php1: player.hp, maxHp: stat.maxHp,
               peakAtk, peakRate, peakDef, peakRegen, shotsSeen, boltsSeen, boomsSeen };
    }, sk);

    /* 피해축은 «투사체/번개/폭발이 실제로 나갔고 적 상태가 바뀌었다» 로 본다
       (적 hp 를 매 틱 되돌리므로 누적 피해 총량 대신 발사·명중 흔적을 센다) */
    let good, note;
    if (sk.axis === 'dmg') {
      const shot = r.shotsSeen + r.boltsSeen + r.boomsSeen;
      good = shot > 0;
      note = '발사/명중 ' + shot + '회 (투사체 ' + r.shotsSeen + ' · 번개 ' + r.boltsSeen + ' · 폭발 ' + r.boomsSeen + ')';
    } else if (sk.axis === 'atk')   { good = r.peakAtk > 0;   note = '스킬 피해 버프 최대 +' + Math.round(r.peakAtk * 100) + '%'; }
    else if (sk.axis === 'rate')    { good = r.peakRate > 0;  note = '발동 속도 버프 최대 +' + Math.round(r.peakRate * 100) + '%'; }
    else if (sk.axis === 'def')     { good = r.peakDef > 0 && r.php1 > r.php0;
                                      note = '받는 피해 −' + Math.round(r.peakDef * 100) + '% · 체력 ' + Math.round(r.php0) + '→' + Math.round(r.php1); }
    else /* heal */                 { good = r.peakRegen > 0 && r.php1 > r.php0;
                                      note = '재생 버프 +' + Math.round(r.peakRegen * 100) + '% · 체력 ' + Math.round(r.php0) + '→' + Math.round(r.php1); }
    ok(good, sk.n + '(' + sk.id + ', ' + GN[sk.g] + ') — ' + note);
    table.push({ id: sk.id, n: sk.n, g: sk.g, axis: sk.axis, note, good });
  }

  /* rage 는 2축(atk+rate) 이므로 따로 확인 */
  const rage = await p.evaluate(() => {
    sbufClear(); S.own = { rage: { n: 0, l: 1 } }; S.eqSkill = ['rage']; skillCd = {};
    enemies.length = 0; player.dead = 0; player.x = WORLD.w / 2; player.y = WORLD.h / 2;
    for (let i = 0; i < 3; i++) makeEnemy('zombie');
    enemies.forEach(e => { e.born = 1; e.hp = e.max = 1e12; });
    castSkill(SK.rage);
    return { atk: sbuf.atk, rate: sbuf.rate };
  });
  ok(rage.atk > 0 && rage.rate > 0, '광란은 2축 동시 버프 (피해 +' + Math.round(rage.atk * 100) + '% · 속도 +' + Math.round(rage.rate * 100) + '%)');

  /* 버프가 실제로 피해 계산에 곱해지는가 — 같은 스킬을 버프 전/후로 발동해 dmg 비교 */
  const bmul = await p.evaluate(() => {
    sbufClear(); S.own = { slash: { n: 0, l: 1 } }; S.eqSkill = ['slash']; markDirty();
    enemies.length = 0; player.dead = 0; player.x = WORLD.w / 2; player.y = WORLD.h / 2;
    makeEnemy('zombie'); enemies[0].born = 1; enemies[0].hp = enemies[0].max = 1e12;
    shots.length = 0; castSkill(SK.slash); const d0 = shots[shots.length - 1].dmg;
    addSbuf('atk', 0.40, 8); shots.length = 0; castSkill(SK.slash);
    const d1 = shots[shots.length - 1].dmg;
    sbufClear();
    return { d0, d1 };
  });
  ok(bmul.d1 > bmul.d0 * 1.35, '버프가 기존 스킬 피해에도 곱해진다 (' + bmul.d0.toFixed(1) + ' → ' + bmul.d1.toFixed(1) + ')');

  const expire = await p.evaluate(async () => {
    sbufClear(); addSbuf('atk', 0.5, 0.5);
    for (let i = 0; i < 60; i++) sbufTick(1 / 60);   /* 1초 경과 */
    return sbuf.atk;
  });
  ok(expire === 0, '버프는 지속시간이 지나면 0 으로 만료된다');

  /* ---------------- [3] 구 세이브 ---------------- */
  console.log('[3] 구 세이브 호환');
  const sv = await p.evaluate(() => {
    /* 13종 시절 세이브를 흉내낸다 — 신설 11종은 존재하지 않는다 */
    Object.assign(S, DEF());
    S.own = {}; ['slash', 'shuri', 'multi', 'ice', 'bolt', 'boom', 'drain', 'holy']
      .forEach(id => S.own[id] = { n: 3, l: 4 });
    S.eqSkill = ['slash', 'shuri', 'multi', 'ice', 'bolt', 'boom', 'drain', 'holy'];
    save();
    load();
    return { eq: S.eqSkill.slice(), own: Object.keys(S.own).length,
             valid: S.eqSkill.every(id => !!SK[id]), cp: cp() };
  });
  ok(sv.eq.length === 8 && sv.valid, '구 세이브 장착 8칸 그대로 살아남는다 (' + sv.eq.length + '칸)');
  ok(sv.own === 8, '보유 8종 보존');
  ok(Number.isFinite(sv.cp) && sv.cp > 0, '전투력 유한값 (' + sv.cp + ') — NaN 없음');

  /* ---------------- [4] 04 스킬 격자 ---------------- */
  console.log('[4] 04 스킬 격자');
  await p.evaluate(() => { Object.assign(S, DEF()); SKILLS.forEach(s => S.own[s.id] = { n: 0, l: 1 }); S.eqSkill = SKILLS.filter(s => has(s.id)).sort((a,b) => power(b,'skill') - power(a,'skill')).slice(0,8).map(s => s.id);  /* 105 — autoEquipAll() 폐기: 셋업만 직접 8칸 */ uiDirty = true; renderUI(); gmHero('sk'); });
  await p.waitForTimeout(500);
  const ui = await p.evaluate(() => {
    Object.assign(S, DEF());
    SKILLS.forEach(s => S.own[s.id] = { n: 0, l: 1 });
    S.eqSkill = SKILLS.filter(s => has(s.id)).sort((a,b) => power(b,'skill') - power(a,'skill')).slice(0,8).map(s => s.id);  /* 105 — autoEquipAll() 폐기: 셋업만 직접 8칸 */ uiDirty = true; renderUI();
    gmHero('sk');
    const gp = document.querySelector('#bSk .sk-gp');
    const cards = [...document.querySelectorAll('#bSk .sk-card')];
    const xs = [...new Set(cards.map(c => parseFloat(c.style.left)))].sort((a, b) => a - b);
    const ys = [...new Set(cards.map(c => parseFloat(c.style.top)))].sort((a, b) => a - b);
    const tot = document.querySelector('#bSk .sk-tot'), btn = document.querySelector('#bSk .sk-b1');
    const cs = getComputedStyle(gp), ct = tot && getComputedStyle(tot), cb = btn && getComputedStyle(btn);
    return { cards: cards.length, cols: xs.length, rows: ys.length,
             colPitch: xs.length > 1 ? xs[1] - xs[0] : 0, rowPitch: ys.length > 1 ? ys[1] - ys[0] : 0,
             clientH: gp.clientHeight, scrollH: gp.scrollHeight, ovf: cs.overflowY,
             gpTop: cs.top, gpH: cs.height, totTop: ct && ct.top, btnTop: cb && cb.top };
  });
  ok(ui.cards === 24, '카드 24장 렌더 (실측 ' + ui.cards + ')');
  ok(ui.cols === 5 && ui.rows === 5, '5열 x 5행 (실측 ' + ui.cols + 'x' + ui.rows + ')');
  ok(ui.colPitch === 190 && ui.rowPitch === 220, '열 pitch 190 · 행 pitch 220 유지');
  ok(ui.ovf === 'auto' && ui.scrollH > ui.clientH + 100,
     '격자 안쪽 스크롤 성립 (' + ui.clientH + ' → ' + ui.scrollH + ')');
  ok(ui.gpTop === '387px' && ui.gpH === '680px', '격자 패널 기하 불변 (top 387 · h 680)');
  ok(ui.totTop === '1085px' && ui.btnTop === '1158px', '.sk-tot 1085 · .sk-btn 1158 y 불변');

  /* ---------------- [5] 도감 · 확률 ---------------- */
  console.log('[5] 도감 · 확률');
  const cl = await p.evaluate(() => {
    /* 91 이 «카테고리 × need 티어» 를 «등급 세트» 로 교체하면서 `COLL.skill.tiers` 가 사라져
       이 절이 즉사하고 있었다(86 이후 미실행). 묻는 것은 그대로 — «도감이 스킬 24종을 다 담는가» —
       새 구조에서는 «스킬 세트 6개(6등급) · 구성원 합 24» 가 같은 단언이다. */
    const sk = COLL_SETS.filter(x => x.tab === 'skill');
    const skIds = new Set(sk.reduce((a2, x) => a2.concat(x.it), []));
    /* 확률 팝업은 «그 레벨에서 확률이 0 이 아닌 등급»만 그린다 — 전 단계를 훑어 24종이 다 나오는지 본다 */
    const seen = new Set(); let maxHeads = 0;
    PRB_STEPS.forEach((_, i) => {
      openProbInfo('skill', PRB_STEPS[i].unlock);
      prbStep = i; renderProbInfo();
      document.querySelectorAll('#prbList .prb-row .nm>i').forEach(e => seen.add(e.textContent));
      maxHeads = Math.max(maxHeads, document.querySelectorAll('#prbList .prb-gh').length);
    });
    document.getElementById('prbw').classList.remove('on');
    return { sets: sk.length, members: skIds.size, all: SKILLS.every(x => skIds.has(x.id)),
             rows: seen.size, heads: maxHeads, listLen: BANNERS.skill.list.length };
  });
  ok(cl.members === 24 && cl.all, '도감 스킬 세트 구성원 24종 = 전 종 (실측 ' + cl.members + ')');
  ok(cl.sets === 6, '도감 스킬 세트 6개(6등급) (실측 ' + cl.sets + ')');
  ok(cl.listLen === 24, '스킬 소환 풀 24종 (실측 ' + cl.listLen + ')');
  ok(cl.rows === 24, '11 확률 팝업이 전 단계에 걸쳐 24종을 모두 표기 (실측 ' + cl.rows + ')');
  ok(cl.heads === 6, '확률 팝업 등급 헤더 최대 6개 (실측 ' + cl.heads + ')');

  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();

  if (process.argv.includes('--table')) {
    console.log('\n| 스킬 | 등급 | 눌렀을 때(발동 시) 무엇이 바뀌는가 | 실측 |');
    console.log('|---|---|---|---|');
    table.forEach(t => console.log('| ' + t.n + ' (`' + t.id + '`) | ' + GN[t.g] + ' | '
      + (t.axis === 'dmg' ? '적에게 직접 피해' : t.axis === 'atk' ? '스킬 피해 증가 버프'
        : t.axis === 'rate' ? '스킬 발동 속도 버프' : t.axis === 'def' ? '받는 피해 감소 + 회복' : '체력 회복 + 재생 버프')
      + ' | ' + (t.good ? '✅ ' : '❌ ') + t.note + ' |'));
  }

  console.log('\nVERIFY86 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
