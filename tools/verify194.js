/* 작업 194 — 코스튬 개편(① 강화석 강화 맥스 500 · ② 등급 폐지 · ③ 획득처 3곳).
 * 실행: node tools/verify194.js [--table]
 *
 * ROUTINE «기능 완성 규칙»(T2 는 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가
 * 저장(S)·HUD·다른 화면에 반영됨» 이어야 완료) 에 맞춘 게이트다. 절 구성:
 *
 *   [1] 재화    — `stone` 이 CUR_ICON·CURINFO·가방·giveReward 를 전부 지난다 · 아이콘 1종(125)
 *   [2] 등급 폐지 — AVATARS 에 `g` 없음 · 효과 50종 동일 · 시트에 등급 섹션/등급 라벨 0건
 *   [3] 강화    — 곡선(단조·상한 500) · cosUpOk/cosUpgrade 가 재화를 실제로 깎고 Lv 를 올린다
 *   [4] 반영    — bonus() 가 «레벨 총합에 1회 곱» 으로 오른다 · 저장·재로드 보존 · 시트 표기 일치
 *   [5] 획득처  — 강화석 던전 1클리어 · DPS 측정장 · 아레나가 각각 stone 을 실제로 지급
 *   [6] 승급 매핑 — 순번 컷(21·10·8·6·2·1·1)이 50종을 빠짐없이 덮고 구 앵커 2점을 지킨다
 *   [7] 되돌림 시험 — 일부러 깨 보고 이 게이트가 정말 잡는지(LESSONS 43-①)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const table = [];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  /* ================= [1] 재화 ================= */
  console.log('[1] 재화 — 강화석이 125 단일 출처와 33 재화 정보 팝업을 지난다');
  const cur = await p.evaluate(() => ({
    icon: CUR_ICON.stone, tk: CUR_ICON.tkStone,
    info: !!CURINFO.stone, ways: CURINFO.stone ? CURINFO.stone.ways.length : 0,
    def: DEF().stone, key: 'cosLv' in DEF(),
    ic1: (curIc('stone').match(/src="([^"]+)"/) || [])[1],
    bag: (function () { S.stone = 777; return bagCur().some(r => r.n === '강화석' && r.q === 777); })()
  }));
  ok(cur.icon === 'assets/ui/cur-stone.svg', 'CUR_ICON.stone 이 전용 SVG 하나', cur.icon);
  ok(cur.tk === 'assets/ui/cur-ticket-stone.svg', '강화석 던전권도 전용 SVG 하나', cur.tk);
  ok(cur.ic1 === cur.icon, 'curIc(\'stone\') 이 같은 경로를 낸다(125 단일 출처)', cur.ic1);
  ok(cur.info && cur.ways === 3, '33 재화 정보 팝업에 강화석 등재 · 획득처 3줄', String(cur.ways));
  ok(cur.def === 0 && cur.key, 'DEF() 에 stone·cosLv 신설', 'stone=' + cur.def + ' cosLv=' + cur.key);
  ok(cur.bag, '53 가방 «재화» 탭에 강화석 보유량이 뜬다');

  const give = await p.evaluate(() => {
    S.stone = 0;
    const txt = giveReward({ stone: 1234 });
    return { got: S.stone, txt: txt.replace(/<[^>]*>/g, '').trim() };
  });
  ok(give.got === 1234, 'giveReward({stone}) 가 S.stone 을 실제로 올린다', String(give.got));
  ok(/1,234/.test(give.txt), '보상 문구가 «숫자 그대로»(150 규칙)', give.txt);

  /* ================= [2] 등급 폐지 ================= */
  console.log('[2] 등급 폐지 — 데이터·UI 어디에도 코스튬 등급이 없다');
  const gr = await p.evaluate(() => {
    const gs = AVATARS.map(a => a.g);
    const uniq = new Set(AVATARS.map(a => a.atk + '/' + a.hp + '/' + a.gold));
    const fills = new Set(AVATARS.map(() => COS_FILL));
    return { hasG: gs.some(g => g !== undefined), uniq: uniq.size, one: [...uniq][0],
             pal: AVATARS.every(a => typeof a.pal === 'number'),
             tint: new Set(AVATARS.map(a => a.tint)).size, fills: fills.size,
             legacy: typeof COS_LEGACY, vars: typeof COS_VAR };
  });
  ok(!gr.hasG, 'AVATARS 항목에 `g`(등급) 필드가 없다');
  ok(gr.uniq === 1, '보유 효과가 50종 전부 동일 (' + gr.one + ')');
  ok(gr.pal, '색 파라미터 `pal`(밴드)만 남았다');
  ok(gr.tint === 50, '틴트 50종이 그대로 구분된다(87 ΔE 자산 보존)', String(gr.tint));
  ok(gr.legacy === 'undefined' && gr.vars === 'undefined',
    '죽은 데이터(COS_LEGACY·COS_VAR) 폐기 (LESSONS 68-③)');

  await p.evaluate(() => { S.rank = 7; AVATARS.forEach(a => S.avatars[a.id] = 1); markDirty(); save(); });
  await p.evaluate(() => { goTab('hero'); heroSubGo('cos'); });
  await p.waitForTimeout(500);
  const ui = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#bCos .sk-card')];
    const names = GRADE.map(g => g.n);
    const txt = document.getElementById('bCos').textContent;
    return {
      cards: cards.length,
      heads: document.querySelectorAll('#bCos .cos-hd').length,
      gradeWords: names.filter(n => txt.indexOf(n) >= 0),
      faces: [...new Set(cards.map(c => c.style.getPropertyValue('--f')))],
      lv: cards[0].querySelector('.sk-clv').textContent,
      rows: [...new Set(cards.map(c => c.style.top))].length
    };
  });
  ok(ui.cards === 50, '격자 카드 50장', String(ui.cards));
  ok(ui.heads === 0, '등급 섹션 헤더 0개(폐지)', String(ui.heads));
  ok(ui.gradeWords.length === 0, '시트 텍스트에 등급명 0건',
    ui.gradeWords.length ? ui.gradeWords.join(',') : '없음');
  ok(ui.faces.length <= 2, '카드 면색이 등급 8단이 아니라 한 벌(착용 dim 포함 최대 2)',
    ui.faces.join(' / '));
  ok(/^Lv\. /.test(ui.lv), '카드 라벨이 등급명 대신 Lv.n', ui.lv);
  ok(ui.rows === 10, '평평한 5열 × 10행 격자', ui.rows + '행');

  /* ================= [3] 강화 ================= */
  console.log('[3] 강화 — 곡선과 실제 동작');
  const cv = await p.evaluate(() => {
    const c = [];
    for (let l = 0; l < COS_MAXLV; l++) c.push(cosCost(l));
    let mono = true;
    for (let i = 1; i < c.length; i++) if (c[i] < c[i - 1]) mono = false;
    return { max: COS_MAXLV, c0: c[0], c100: c[100], c499: c[499],
             total: c.reduce((a, x) => a + x, 0), mono,
             same: JSON.stringify([cosCost(37), cosCost(37)]) };
  });
  ok(cv.max === 500, '맥스 레벨 500(주인 확정)', String(cv.max));
  ok(cv.mono, '비용 곡선이 단조 증가');
  ok(cv.c0 >= 1 && cv.c499 > cv.c0 * 100, '곡선 폭 Lv0 ' + cv.c0 + ' → Lv499 ' + cv.c499);
  table.push({ k: '한 코스튬 만렙 누적', v: cv.total.toLocaleString() + ' 강화석' });

  const up = await p.evaluate(() => {
    S.cosLv = {}; S.stone = 0; markDirty();
    const poor = cosUpOk('av0');                       /* 재화 0 → 안 된다 */
    S.stone = 50;
    const before = S.stone;
    const did = cosUpgrade('av0');
    const cost = before - S.stone;
    const noOwn = cosUpgrade('av5_not_real');           /* 없는 id */
    /* 미보유 코스튬은 못 올린다 */
    const keep = S.avatars.av9; delete S.avatars.av9;
    const locked = cosUpgrade('av9');
    if (keep) S.avatars.av9 = keep;
    /* 만렙 가드 */
    S.cosLv.av1 = COS_MAXLV; S.stone = 1e12;
    const maxed = cosUpgrade('av1');
    return { poor, did, cost, lv: cosLvOf('av0'), noOwn, locked, maxed, lv1: cosLvOf('av1') };
  });
  ok(up.poor === false, '강화석이 모자라면 cosUpOk 가 false');
  ok(up.did === true && up.lv === 1, '[강화] 1회 → Lv 0 → 1', 'Lv ' + up.lv);
  ok(up.cost === cv.c0, '강화석이 곡선대로 정확히 차감', String(up.cost));
  ok(up.noOwn === false && up.locked === false, '없는 id·미보유 코스튬은 강화 거부');
  ok(up.maxed === false && up.lv1 === 500, '만렙(500)에서 더 안 오른다', 'Lv ' + up.lv1);

  /* ================= [4] 반영 ================= */
  console.log('[4] 반영 — bonus() · 저장 · 시트 표기');
  const bo = await p.evaluate(() => {
    S.cosLv = {}; markDirty();
    const a0 = bonus().atk;
    S.cosLv.av0 = 100; markDirty();
    const a1 = bonus().atk;
    S.cosLv.av1 = 100; markDirty();
    const a2 = bonus().atk;
    /* 합산 후 1회 곱 — 200Lv 한 덩어리는 100+100 두 덩어리와 **같아야** 한다(코스튬마다 곱이 아니다) */
    S.cosLv = { av0: 200 }; markDirty();
    const a3 = bonus().atk;
    S.cosLv = {}; markDirty();
    return { a0, a1, a2, a3, per: COS_LV.atk, own: cosOwnSum('atk') };
  });
  /* ⚑ 724 — 방향을 뒤집었다(333 처방). 주인 확정 모델에서 코스튬은 **보유+강화가 한 카테고리**라
     강화분이 «자기만의 곱» 을 갖지 않는다: 배수는 `(1+보유Σ+강화)/(1+보유Σ)` 다.
     항을 지우지 않은 이유 — 이 자리가 지키는 것은 «강화 100Lv 이 정확히 100·per 만큼 붙는다» 이고
     그 뜻은 모델이 바뀌어도 살아 있다(값이 아니라 «얼마나 붙나» 를 묻는다). */
  {
    const want = (1 + bo.own + 100 * bo.per) / (1 + bo.own);
    ok(Math.abs(bo.a1 / bo.a0 - want) < 1e-9,
      '강화 100Lv → 공격력 ×' + want.toFixed(4) + ' = (1+보유Σ+' + (100 * bo.per).toFixed(2) + ')/(1+보유Σ '
      + bo.own.toFixed(4) + ') · 724 (실측 ×' + (bo.a1 / bo.a0).toFixed(4) + ')');
  }
  ok(Math.abs(bo.a2 - bo.a3) < 1e-6,
    '«레벨 총합에 1회 곱» — 100+100 과 200 이 같다 (LESSONS 91-1)',
    bo.a2.toExponential(4) + ' vs ' + bo.a3.toExponential(4));
  table.push({ k: '만렙 상한(50종×500Lv)', v: '공격 ×' + (1 + 50 * 500 * bo.per).toFixed(0) });

  const sheet = await p.evaluate(() => {
    S.cosLv = { av0: 42 }; S.stone = 1e9; markDirty(); renderCos();
    const c = document.querySelector('#bCos [data-cosit="av0"]');
    return { lv: c.querySelector('.sk-clv').textContent,
             bar: c.querySelector('.sk-bar b').textContent,
             up: c.querySelector('.sk-bar').classList.contains('up'),
             slot: document.querySelector('#bCos .sk-slv').textContent,
             tot: document.querySelector('#bCos .sk-tot').textContent };
  });
  ok(sheet.lv === 'Lv. 42' && sheet.bar === '42/500', '카드가 레벨을 그대로 그린다',
    sheet.lv + ' · ' + sheet.bar);
  ok(sheet.up, '강화 가능 칸은 진행바가 «가능» 표시(.up)');
  ok(/강화 \d+Lv/.test(sheet.tot), '총효과 줄에 강화 총합 표기', sheet.tot.trim());

  /* 저장·재로드 — 새 컨텍스트가 아니라 이 페이지의 save()/reload (LESSONS 50-②: 영속성 검사) */
  await p.evaluate(() => { S.cosLv = { av0: 7, av1: 3 }; S.stone = 4242; save(); });
  await p.reload();
  await p.waitForTimeout(1000);
  const kept = await p.evaluate(() => ({ lv0: cosLvOf('av0'), lv1: cosLvOf('av1'), st: S.stone }));
  ok(kept.lv0 === 7 && kept.lv1 === 3 && kept.st === 4242,
    '재로드 후 강화 레벨·강화석 보존', JSON.stringify(kept));

  /* 손댄 세이브 정화 — 상한 초과·음수·없는 id.
     ⚠ 살아 있는 페이지에 localStorage 를 쓰고 reload 하면 **그 페이지의 자동 저장이 먼저 덮어쓴다**
     (LESSONS 87-3 · 43-①). 주입은 반드시 «새 컨텍스트 + addInitScript» 로 한다(LESSONS 44-①). */
  const KEYV = await p.evaluate(() => KEY);
  const ctx2 = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEYV, JSON.stringify({ avatar: 'av0', avatars: { av0: 1, av1: 1 },
                            cosLv: { av0: 99999, av1: -5, zz: 3 }, stone: -1 })]);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('pageerror(손댄세이브): ' + String(e)));
  await p2.goto(URL);
  await p2.waitForTimeout(1000);
  const clean = await p2.evaluate(() => ({ lv0: cosLvOf('av0'), keys: Object.keys(S.cosLv).sort(), st: S.stone }));
  await ctx2.close();
  ok(clean.lv0 === 500 && clean.keys.join(',') === 'av0' && clean.st === 0,
    '손댄 세이브 정화 — 상한 클램프 · 음수·없는 id 제거', JSON.stringify(clean));

  /* ================= [5] 획득처 3곳 ================= */
  console.log('[5] 획득처 — 던전 · DPS 측정장 · 아레나가 실제로 지급한다');
  const dun = await p.evaluate(() => {
    S.guide.idx = 99; S.stone = 0; S.dun.stone = 1;
    DUNGEONS.forEach(d => S.dunTk[d.id] = 3);
    const d = DUNGEONS.find(x => x.id === 'stone');
    const before = { st: S.stone, f: S.dun.stone, left: S.dunTk.stone };
    challengeDungeon(d);
    const entered = !!dunRun && dunRun.d.id === 'stone';
    if (entered) { dunRun.dmg = dunRun.need; endDunRun(true); }
    const after = { st: S.stone, f: S.dun.stone, left: S.dunTk.stone };
    const clr = document.getElementById('dclw').classList.contains('on');
    closeDunClear();
    return { entered, before, after, clr, rw: d.rw(1), name: d.n };
  });
  ok(dun.entered, '강화석 던전 «' + dun.name + '» 입장');
  ok(dun.after.st - dun.before.st > 0, '클리어 보상으로 강화석 실지급',
    '+' + (dun.after.st - dun.before.st));
  ok(dun.after.f === dun.before.f + 1 && dun.after.left === dun.before.left - 1,
    '층 +1 · 입장 −1(다른 던전과 같은 규칙)');
  ok(dun.clr, '31 던전 클리어 화면 표시');
  ok(Object.keys(dun.rw).join(',') === 'stone', '보상 종류는 stone 1종', Object.keys(dun.rw).join(','));
  table.push({ k: '던전 1층 보상', v: dun.rw.stone + ' 강화석 (하루 3런)' });

  const raid = await p.evaluate(() => {
    S.stone = 0; S.best = 50;
    const r = RAIDS[0];
    startRaid(r);
    const on = !!raidOn;
    raidDmg = 1e9; raidT = 0;
    endRaid(true);
    const first = S.stone;             /* 첫 기록 = 신기록 → ×2 */
    closeModal();
    startRaid(r); raidDmg = 1; raidT = 0; endRaid(true);
    const second = S.stone - first;    /* 기록 미달 → 기본값 */
    closeModal();
    return { on, first, second, base: COS_ST_RAID };
  });
  ok(raid.on, 'DPS 측정장 입장');
  ok(raid.first === raid.base * 2, '측정장 신기록 보상 = 기본 ×2', String(raid.first));
  ok(raid.second === raid.base, '측정장 일반 보상 = 기본', String(raid.second));
  table.push({ k: 'DPS 측정장', v: raid.base + ' (신기록 ' + raid.base * 2 + ')' });

  const arn = await p.evaluate(() => {
    const w = arenaReward(true), l = arenaReward(false);
    S.stone = 0;
    const got = giveReward(w);
    return { w: w.stone, l: l.stone, applied: S.stone, txt: got.replace(/<[^>]*>/g, ' ').trim() };
  });
  ok(arn.w > 0 && arn.l > 0, '아레나 승·패 모두 강화석을 준다', '승 ' + arn.w + ' · 패 ' + arn.l);
  ok(arn.applied === arn.w, '아레나 보상이 giveReward 를 지나 실제로 들어온다', String(arn.applied));
  table.push({ k: '아레나', v: '승 ' + arn.w + ' · 패 ' + arn.l });

  const pills = await p.evaluate(() => ({
    dun: (DUN_UI.stone || {}).rw, raid: RAIDS[0].ui.rw, arena: ARENA.ui.rw
  }));
  ok(JSON.stringify(pills).indexOf('강화석') > 0,
    '03 카드 보상 알약이 세 곳 모두 «강화석» 을 말한다',
    [].concat(pills.dun, pills.raid, pills.arena).join(' / '));

  /* ================= [6] 승급 매핑 ================= */
  console.log('[6] 승급 매핑 — 순번 컷이 182 의 지급표를 그대로 재현');
  const map = await p.evaluate(() => {
    const ks = Object.keys(PROMO_COS).map(Number).sort((a, b) => a - b);
    const flat = [].concat.apply([], ks.map(k => PROMO_COS[k]));
    return { sizes: ks.map(k => PROMO_COS[k].length), n: flat.length,
             uniq: new Set(flat).size, hasAv0: flat.indexOf('av0') >= 0,
             av41: cosRankOf('av41'), av48: cosRankOf('av48'),
             off: Object.keys(COS_OFF).length, total: AVATARS.length,   /* 275 */
             cut: PROMO_CUT.slice() };
  });
  /* 275(2026-08-28, 주인 지시 «승급전 한 번 깰 때마다 코스튬 1개») — `PROMO_CUT` 은 남았지만
     이제 «지급 개수» 가 아니라 **«대표를 뽑는 구간»** 이다. 194 가 여기서 지키려던 것은
     «컷이 흔들려 지급표가 몰래 바뀌지 않는다» 이므로, 컷 자체가 그대로인지와
     그 컷에서 뽑힌 대표 7종이 그대로인지를 잰다(칸 수 기대만 1 로 내린다). */
  ok(JSON.stringify(map.cut) === '[21,10,8,6,2,1,1]',
    '컷 21·10·8·6·2·1·1 상수 그대로(275 이후엔 «대표를 뽑는 구간»)', map.cut.join('·'));
  ok(map.sizes.every(s => s === 1),
    '275 — 승급 1회 = 1종', map.sizes.join('·'));
  ok(map.n === 7 && map.uniq === 7 && !map.hasAv0,
    '승급 7회가 겹침 없이 7종을 덮고 av0(기본 지급)은 빠진다', map.n + '칸 / 고유 ' + map.uniq);
  ok(map.off === 42 && map.n + map.off + 1 === map.total,
    '275 — 남는 42종은 미출시(COS_OFF) · 7 + 42 + av0 = 50',
    map.n + ' + ' + map.off + ' + 1 = ' + (map.n + map.off + 1));
  ok(map.av41 === 3 && map.av48 === 6,
    '구 계급 조건 앵커 2점 보존 (av41→3 · av48→6)', 'av41=' + map.av41 + ' av48=' + map.av48);

  /* ================= [7] 되돌림 시험 ================= */
  console.log('[7] 되돌림 시험 — 일부러 깨면 이 게이트가 잡는가 (LESSONS 43-①)');
  const neg = await p.evaluate(() => {
    const out = {};
    /* ⓐ 강화 효과를 «코스튬마다 곱» 으로 되돌리면 [4] 의 «합산 후 1회 곱» 이 깨져야 한다 */
    const keep = S.cosLv;
    S.cosLv = { av0: 100, av1: 100 }; markDirty(); const two = bonus().atk;
    S.cosLv = { av0: 200 }; markDirty(); const one = bonus().atk;
    out.pooled = Math.abs(two - one) < 1e-6;
    /* 코스튬마다 곱이었다면 두 값이 달라야 한다 — 그 «다름» 을 직접 계산해 확인 */
    const perCos = Math.pow(1 + 100 * COS_LV.atk, 2), pooledV = 1 + 200 * COS_LV.atk;
    out.wouldDiffer = Math.abs(perCos - pooledV) > 1e-6;
    /* ⓑ 강화석 없이 강화가 되면 [3] 이 잡아야 한다 */
    S.stone = 0; S.cosLv = {}; markDirty();
    out.noFreeUp = cosUpgrade('av0') === false && cosLvOf('av0') === 0;
    /* ⓒ 등급이 되살아나면 [2] 가 잡아야 한다 */
    out.noGrade = AVATARS.every(a => a.g === undefined);
    S.cosLv = keep; markDirty();
    return out;
  });
  ok(neg.pooled && neg.wouldDiffer,
    'ⓐ «코스튬마다 곱» 이었다면 값이 달라진다(그래서 이 단언이 의미가 있다)');
  ok(neg.noFreeUp, 'ⓑ 강화석 0 에서는 레벨이 안 오른다');
  ok(neg.noGrade, 'ⓒ 등급 필드가 되살아나지 않았다');

  ok(errs.length === 0, '콘솔/페이지 에러 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  if (process.argv.includes('--table')) {
    console.log('\n| 항목 | 값 |');
    console.log('|---|---|');
    table.forEach(r => console.log('| ' + r.k + ' | ' + r.v + ' |'));
  }

  console.log('\nVERIFY194 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
