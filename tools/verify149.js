/* 작업 149 게이트 — «확인·선택이 필요 없는 단순 안내» 가 모달 팝업이 아니라 토스트로 뜨는가.
 *
 * 주인 지시(2026-08-27): «부족 알림 같은 건 팝업 말고 토스트로 — 방치형 게임에서 보통 하는 대로».
 *
 * 이 게이트가 소유한 것은 **분류와 그 결과의 실동작**이다:
 *   ⓐ 단순 안내 경로를 실제로 밟으면 → `.fx-toast` 가 뜨고 `#modal` 은 **안 열린다**
 *   ⓑ 결과·의사결정 경로는 그대로 모달이다(과교정 회귀 방지 — 전부 토스트로 밀면 결과를 놓친다)
 *   ⓒ 토스트 문구가 프레임(1080) 밖으로 안 나간다 — `.fx-toast` 는 `white-space:nowrap` 이라
 *      문구가 길면 그대로 삐져나온다. 58 이 그 기하를 소유하므로 149 는 **문구 길이로** 지킨다.
 *      워스트케이스는 실데이터(던전·배너·코스튬·이용권·가방 이름 중 가장 긴 것)로 만든다.
 *   ⓓ 토스트가 58 이 실측해 둔 «빈 띠»(초상화 플레이트 하단 142 ↔ #chapN 상단 227) 안에 앉는다
 *
 * ⚠ `fxToast()` 는 토스트가 4장 이상 쌓이면 **드롭한다**. 그래서 `notify()` 는 반환값이 없을 때만
 *    옛 팝업으로 되돌린다 — 안내가 통째로 사라지는 것이 이 작업의 유일한 회귀 위험이다(§4).
 *
 * 실행: node tools/verify149.js           → 마지막 줄 VERIFY149 n/n PASS
 *       node tools/verify149.js --broken  → notify 를 popup 으로 되돌려 게이트가 실제로 잡는지(음성 테스트)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
const BROKEN = process.argv.includes('--broken');

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail){
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ── §1 정적: 토스트로 옮긴 자리 · 팝업으로 남긴 자리 ────────────────────────────
   각 항목은 «그 자리에만 있는 문구 조각» 으로 찍는다. 조각이 `notify(` 뒤에 오면 옮긴 것이고
   `popup(` 뒤에 오면 안 옮긴 것이다. 줄 단위가 아니라 «가장 가까운 앞쪽 호출» 로 판정한다. */
const TOAST_SITES = [
  ['도감 환불 — 재료 없음',      '환불할 재료가 없습니다'],
  ['도감 완성 — 환불 유도',      '도감 완성 — 재료를 환불하세요'],
  ['소환 재화 부족',             '더 필요합니다\');\n    return;'],
  ['스킬 슬롯 부족',             '스킬은 최대 <b>8개</b>까지 장착합니다'],
  ['펫 슬롯 부족',               '펫은 최대 <b>3마리</b>까지 장착합니다'],
  ['가이드 소환 차단',           '소환</b>을 먼저 해주세요'],
  ['룰렛 무료 소진',             '무료 룰렛 소진'],
  ['던전 잠김(상세)',            '\' + dunLockTxt(d) + \' 필요\');\n    return;'],
  ['던전 입장 소진(상세)',       '입장 횟수 소진 — 내일'],
  ['소탕 — 던전 잠김',           'if(dunLocked(d)){ notify('],
  ['소탕 불가',                  '을 클리어해야 소탕합니다'],
  ['소탕 — 입장 소진',           '오늘 입장 횟수를 모두 사용했습니다'],
  ['코스튬 해금 조건 미달',      '\' + cosReqText(a));'],
  ['코스튬 다이아 부족',         'if(S.dia < a.cost){ notify('],
  ['승급 조건 미달',             '승급 조건 미달'],
  ['아레나 — 다른 전투 중',      '다른 전투가 진행 중입니다'],
  ['레이드 진행 중',             '진행 중 · 남은 <b>'],
  ['던전 카드 잠김(목록)',       "필요');\n    return;\n  }\n  /* 04 던전 세부"],
  ['아레나 잠김',                'ARENA.n + \' — 스테이지'],
  ['레이드 잠김',                'r.n + \' — 스테이지'],
  ['무료 소환 소진',             '무료 소환 소진 — 내일 충전'],
  ['유물 소환 — 조각 부족',      'if(!quiet) notify('],
  /* 153 — 교환 보상이 우편으로 가면서 문구가 바뀌었다. 토스트라는 사실은 그대로다. */
  ['마일리지 교환 완료',         '남은 쿠폰 \' + S.mileage'],
  ['유물조각 교환 — 다이아 부족','if(S.dia < ex.dia){ notify('],
  ['유물조각 교환 완료',         '\'</b> → \' + curIc(\'relic\')'],
  ['광고 보상 수령',             'a.r.freePet) notify('],
  ['이용권 — 다이아 부족',       'if(S.dia < p.dia){ notify('],
  ['장비 일괄강화 재료 부족',    '강화할 수 있는 <b>'],
  /* 150 — 가방 수량은 재화별 표기(`fmtCur`)로 갈렸다. 토스트라는 사실은 그대로다. */
  ['가방 칸 상세',               '보유 <b>\' + fmtCur(c.dataset.bagk'],
  ['설정 — 언어',                '현재 <b>한국어</b>만 지원합니다'],
  ['쿠폰 — 잘못된 코드',         '사용할 수 없는 코드입니다'],
  ['쿠폰 — 이미 사용',           '이미 사용한 코드입니다'],
  ['쿠폰 — 획득',                '</b> 획득!\');\n}'],
  ['최고 계급',                  '이미 최고 계급입니다'],
  ['스킬 일괄강화 재료 부족',    '강화 가능한 <b>스킬</b>'],
  ['동료 일괄강화 재료 부족',    '강화 가능한 <b>동료</b>'],
  ['미보유 코스튬',              '먼저 구매해야 착용합니다'],
  ['이미 보유한 코스튬',         '이미 가지고 있는 코스튬입니다'],
  ['마을 준비 중',               '마을은 아직 준비 중입니다'],
  ['패스 — 프리미엄 잠금',       '를 활성화하면 받습니다'],
  ['패스 탭 — 미해금',           '아직 해금되지 않은 패스입니다'],
  ['패스 탭 — 준비 중',          '이 패스는 아직 준비 중입니다'],
  ['배속 미해금',                '전투 배속은 아직 해금되지 않았습니다'],
];
/* 결과·의사결정은 모달로 남는다 — 149 가 «전부 토스트» 로 밀지 않았다는 증거 */
const POPUP_SITES = [
  ['재료 환불 결과',   '♻️ 재료 환불'],
  ['도감 강화 결과',   '🏆 도감 강화!'],
  ['가이드 전 미션 완료', '📌 가이드 미션 완료!'],
  ['던전 실패 결과',   '층 실패'],
  ['코스튬 획득',      '👤 코스튬 획득!'],
  ['승급 성공',        '🏅 승급 성공!'],
  ['승급 실패',        '💀 승급 실패'],
  ['합성 성공',        '⚗️ 합성 성공!'],
  ['레이드 결과',      '🏆 레이드 결과'],
  ['아레나 결과',      '아레나 승리!'],
  /* 153 — `diaPackName(p)` 는 이제 grantDiaPack 의 토스트에도 나온다(첫 출현이 그쪽이라
     앵커가 흐려졌다). 결제 팝업만 가리키는 조각으로 좁힌다. */
  ['다이아 상품 결제', '결제 준비 중입니다.'],
  ['이용권 구매',      'p.n + \' 이용권\''],
  ['개인정보 방침',    '🔒 개인정보 처리 방침'],
  ['고객 지원',        '🎧 고객 지원'],
  ['랭킹 목록',        '🏰 시련의 탑 랭킹'],
  ['랭커 상세',        '위 · \' + r.n'],
  ['프리미엄 패스 결제', '💳 프리미엄 패스'],
  ['길라잡이',         '🗺️ 길라잡이'],
  ['자동 축복 정산',   "popup('✨ 자동 축복',"],
  ['도감 마이그레이션', '📖 도감이 바뀌었습니다'],
];
/* 조각 위치에서 뒤로 훑어 가장 가까운 `notify(` / `popup(` 중 어느 쪽이 앞서는지 본다 */
function callerOf(frag){
  const i = SRC.indexOf(frag);
  if (i < 0) return null;
  const head = SRC.slice(Math.max(0, i - 900), i + frag.length);
  const n = head.lastIndexOf('notify('), p = head.lastIndexOf('popup(');
  if (n < 0 && p < 0) return null;
  return n > p ? 'notify' : 'popup';
}

/* ── §3 워스트케이스 문구 — 실데이터에서 «가장 긴 이름» 을 골라 조립한다 ─────────── */
const WORST = [
  { n: '던전 잠김',       f: 'D => "🔒 " + D.dun + " — " + D.dunLock + " 필요"' },
  { n: '던전 입장 소진',  f: 'D => "<b>" + D.dun + "</b> 입장 횟수 소진 — 내일 <b>3회</b>"' },
  { n: '무료 소환 소진',  f: 'D => "<b>" + D.ban + "</b> 무료 소환 소진 — 내일 충전"' },
  { n: '가이드 소환 차단',f: 'D => "📌 <b>" + D.ban + " 소환</b>을 먼저 해주세요"' },
  { n: '코스튬 조건 미달',f: 'D => "🔒 <b>" + D.ava + "</b> — " + D.avaReq' },
  { n: '도감 완성',       f: 'D => "🏆 " + D.coll + " 도감 완성 — 재료를 환불하세요"' },
  { n: '레이드 잠김',     f: 'D => "🔒 " + D.raid + " — 스테이지 <b>9999</b> 필요 (현재 9999)"' },
  { n: '레이드 진행 중',  f: 'D => "⚔ " + D.raid + " 진행 중 · 남은 <b>120.0초</b>"' },
  { n: '가방 칸',         f: 'D => "🎒 " + D.bag + " — 보유 <b>999.99Z</b>"' },
  { n: '이용권 다이아 부족', f: 'D => D.icDia + " <b>999.99Z</b> 더 필요합니다"' },
  { n: '마일리지 교환',   f: 'D => D.icDia + " <b>999.99Z</b> 우편함으로 발송 · 남은 쿠폰 999개"' },
  { n: '유물조각 교환',   f: 'D => D.icDia + " <b>999.99Z</b> → " + D.icRel + " <b>999.99Z</b> 우편함 발송"' },
  { n: '광고 보상 수령',  f: 'D => "🎁 " + D.ad + " — " + D.icGold + " 999.99Z 획득"' },
  { n: '장비 일괄강화',   f: 'D => "강화할 수 있는 <b>" + D.wpn + "</b>가 없습니다"' },
  { n: '승급 조건 미달',  f: 'D => "🏅 " + D.rank + " 승급 조건 미달"' },
];

(async () => {
  console.log('\n[§1 정적 — 분류가 소스에 그대로 박혀 있는가]');
  ck('§1-0 notify() 정의', /function notify\(txt\)\{[\s\S]{0,240}fxToast\(txt\)/.test(SRC),
     'popup 폴백 ' + (/if\(!el\) popup\('알림'/.test(SRC) ? '있음' : '없음'));
  ck('§1-0 fxToast 가 el 을 반환', /setTimeout\(\(\) => el\.remove\(\), 1060\);\s*\n\s*return el;/.test(SRC));
  let tOk = 0;
  TOAST_SITES.forEach(([n, f]) => { const c = callerOf(f); if (c === 'notify') tOk++; else ck('§1 토스트 — ' + n, false, c ? '아직 ' + c + '()' : '조각을 못 찾음'); });
  ck('§1 토스트 전환 ' + tOk + '/' + TOAST_SITES.length, tOk === TOAST_SITES.length);
  let pOk = 0;
  POPUP_SITES.forEach(([n, f]) => { const c = callerOf(f); if (c === 'popup') pOk++; else ck('§1 팝업 유지 — ' + n, false, c ? '토스트로 밀렸다' : '조각을 못 찾음'); });
  ck('§1 팝업 유지 ' + pOk + '/' + POPUP_SITES.length, pOk === POPUP_SITES.length);

  const browser = await launch(chromium);
  for (const H of HEIGHTS) {
    console.log('\n[frame 1080x' + H + ']');
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof notify === 'function');
    await page.waitForTimeout(500);

    if (BROKEN) await page.evaluate(() => { window.notify = t => popup('알림', '<p>' + t + '</p>'); });

    /* ── §2 실동작 — 실제 경로를 밟는다. 각 항목이 «버튼별 기능 체크 표» 의 한 줄이다 ───── */
    const RUN = await page.evaluate(() => {
      /* 토스트/모달을 매 항목 전에 비우고, 그 항목이 무엇을 열었는지 본다 */
      const clear = () => {
        document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
        try { closeModal(); } catch (e) {}
      };
      const seen = () => {
        const t = [...document.querySelectorAll('#fxl .fx-toast')];
        const md = document.getElementById('modal');
        return { toast: t.length, txt: t.map(e => e.textContent).join(' | '),
                 modal: !!(md && md.classList.contains('on')) };
      };
      const out = [];
      const run = (name, fn) => {
        clear();
        let err = '';
        try { fn(); } catch (e) { err = String(e && e.message || e); }
        out.push(Object.assign({ name, err }, seen()));
      };

      /* 상태를 «막히는» 쪽으로 몰아 둔다 */
      S.dia = 0; S.relic = 0; S.gold = 0;

      run('가이드 소환 차단',         () => doSummon('weapon', 1));
      /* 가이드 배너 잠금을 풀어야 «재화 부족» 경로가 드러난다(gmBlocked 가 먼저 막는다) */
      run('소환 재화 부족 (10 상점)', () => { S.guide.idx = GUIDE.length; doSummon('weapon', 1); });
      run('유물 소환 — 조각 부족',    () => summonRelic());
      run('코스튬 — 다이아 부족',     () => { const a = AVATARS.find(x => !S.avatars[x.id] && cosReqOk(x)); if (a) buyAvatar(a); else throw new Error('대상 코스튬 없음'); });
      run('코스튬 — 해금 조건 미달',  () => { const a = AVATARS.find(x => !S.avatars[x.id] && !cosReqOk(x)); if (a) buyAvatar(a); else throw new Error('조건부 코스튬 없음'); });
      run('승급 조건 미달',           () => { S.best = 0; startPromo(); });
      run('던전 잠김 — 소탕',         () => { const d = DUNGEONS.find(x => dunLocked(x)); if (d) sweepDungeon(d); else throw new Error('잠긴 던전 없음'); });
      run('던전 입장 소진 — 소탕',    () => { const d = DUNGEONS.find(x => !dunLocked(x)); S.dun[d.id] = 2; S.daily.dun[d.id] = 0; sweepDungeon(d); });
      run('스킬 슬롯 부족',           () => { S.eqSkill = SKILLS.slice(0, 8).map(x => x.id); const s = SKILLS.find(x => !S.eqSkill.includes(x.id)); if (!S.own[s.id]) S.own[s.id] = { n: 1, l: 1 }; toggleEquip(s, 'skill'); });
      run('펫 슬롯 부족',             () => { S.eqPet = PETS.slice(0, 3).map(x => x.id); const p = PETS.find(x => !S.eqPet.includes(x.id)); if (!S.own[p.id]) S.own[p.id] = { n: 1, l: 1 }; toggleEquip(p, 'pet'); });
      run('쿠폰 — 잘못된 코드',       () => { if (!S.opt.cp) S.opt.cp = {}; const code = 'NOPE'; if (!CF_CODES[code]) notify('🎟 사용할 수 없는 코드입니다'); });
      /* passClaim 은 «해금된 단계»(passOpen) 에서만 프리미엄을 묻는다 — 진행도를 올려 한 칸 연다 */
      run('패스 — 프리미엄 잠금',     () => {
        S.pass.prem = 0; S.pass.got = {}; S.best = 999999; S.att.n = 9999;
        const i = passLast();
        if (i < 0) throw new Error('해금된 패스 단계가 없다');
        if (passClaim(i, 1) !== false) throw new Error('프리미엄 잠금이 안 걸렸다');
      });
      run('배속 미해금',              () => document.getElementById('spdb').onclick());
      run('마을 준비 중',             () => document.querySelector('#botleft .ubtn:not([data-util="chat"])').onclick());
      run('최고 계급',                () => { const keep = S.rank; S.rank = RANKS.length - 1; openPromo(); S.rank = keep; });
      run('이용권 — 다이아 부족',     () => { const p = PASS_ITEMS.find(x => !passOwned(x)); if (p) buyPass(p.id); else throw new Error('미보유 이용권 없음'); });
      run('설정 — 언어',              () => notify('💬 현재 <b>한국어</b>만 지원합니다'));
      clear();
      return out;
    });

    RUN.forEach(r => {
      const ok = !r.err && r.toast >= 1 && !r.modal;
      ck('§2 ' + r.name, ok,
         r.err ? '예외: ' + r.err
               : '토스트 ' + r.toast + ' · 모달 ' + (r.modal ? 'ON(← 아직 팝업)' : 'off')
                 + (r.txt ? ' · «' + r.txt.slice(0, 46) + '»' : ''));
    });

    /* ── §3 폭·자리 — 워스트케이스 문구가 프레임 안에 드는가 ───────────────────── */
    const WID = await page.evaluate(fns => {
      const longest = (arr, get) => arr.reduce((a, b) => (String(get(b)).length > String(get(a)).length ? b : a));
      const D = {
        dun:     longest(DUNGEONS, d => d.n).n,
        dunLock: dunLockTxt(longest(DUNGEONS, d => dunLockTxt(d).length ? d : d)),
        ban:     longest(Object.values(BANNERS), b => b.n).n,
        ava:     longest(AVATARS, a => a.n).n,
        avaReq:  AVATARS.map(a => cosReqText(a)).reduce((a, b) => (String(b).length > String(a).length ? b : a), ''),
        coll:    'S' in window ? longest(Object.values(BANNERS), b => b.n).n : '',
        raid:    longest(RAIDS, r => r.n).n,
        bag:     'ZZZZZZZZZZ',
        wpn:     wpnSlotDef().n,
        rank:    longest(RANKS, r => r.ic + ' ' + r.n).ic + ' ' + longest(RANKS, r => r.ic + ' ' + r.n).n,
        ad:      longest(COIN_ADS, a => a.n).n,
        icDia:   curIc('dia'), icRel: curIc('relic'), icGold: curIc('gold'),
      };
      /* 가방 이름은 아이템 전체에서 가장 긴 것으로 */
      try {
        const names = [].concat(SKILLS, PETS, RELICS).map(x => x.n).filter(Boolean);
        if (names.length) D.bag = names.reduce((a, b) => (b.length > a.length ? b : a));
      } catch (e) {}
      const wrap = document.getElementById('app');
      const wr = wrap.getBoundingClientRect(), sc = wr.width / 1080;
      const res = [];
      for (const s of fns) {
        const txt = (0, eval)('(' + s.f + ')')(D);
        document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
        const el = notify(txt);
        if (!el) { res.push({ n: s.n, w: -1, l: 0, r: 0, t: 0, b: 0, txt }); continue; }
        /* fxToastIn 0% 는 translate(-50%,-40px) scale(.92) 다 — 그대로 재면 폭을 8% 작게,
           자리를 40px 위로 잰다. 애니메이션을 끄고 «정착 상태» 를 명시해 둔 뒤 잰다. */
        el.style.animation = 'none';
        el.style.transform = 'translate(-50%,0)';
        const r = el.getBoundingClientRect();
        res.push({ n: s.n, w: r.width / sc,
                   l: (r.left - wr.left) / sc, r: (r.right - wr.left) / sc,
                   t: (r.top - wr.top) / sc, b: (r.bottom - wr.top) / sc, txt });
        el.remove();
      }
      /* 58 이 실측해 둔 빈 띠 */
      const plate = document.querySelector('#top .pcp'), chap = document.getElementById('chapN');
      const band = {
        top: plate ? (plate.getBoundingClientRect().bottom - wr.top) / sc : 142,
        bot: chap ? (chap.getBoundingClientRect().top - wr.top) / sc : 227,
      };
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      return { res, band, D };
    }, WORST);

    WID.res.forEach(r => {
      ck('§3 폭 — ' + r.n, r.w > 0 && r.l >= 0 && r.r <= 1080,
         r.w < 0 ? '토스트를 못 띄웠다'
                 : '폭 ' + r.w.toFixed(0) + ' · x' + r.l.toFixed(0) + '..' + r.r.toFixed(0)
                   + (r.l < 0 || r.r > 1080 ? '  ← 프레임 밖' : ''));
    });
    const first = WID.res.find(r => r.w > 0);
    ck('§3 토스트가 «빈 띠» 안', !!first && first.t >= WID.band.top - 2 && first.b <= WID.band.bot + 2,
       first ? '토스트 y' + first.t.toFixed(0) + '..' + first.b.toFixed(0)
               + ' ⊂ 띠 y' + WID.band.top.toFixed(0) + '..' + WID.band.bot.toFixed(0) : '토스트 없음');

    /* ── §4 폴백 — 토스트를 못 띄우면 안내가 사라지면 안 된다 ─────────────────── */
    const FB = await page.evaluate(() => {
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      try { closeModal(); } catch (e) {}
      for (let i = 0; i < 4; i++) fxToast('스택 ' + i);      /* 4장 → 다음 것은 fxToast 가 드롭한다 */
      const el = notify('드롭된 안내');
      const md = document.getElementById('modal');
      const r = { dropped: !el, modal: !!(md && md.classList.contains('on')),
                  txt: md ? md.textContent.slice(0, 40) : '' };
      try { closeModal(); } catch (e) {}
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      return r;
    });
    ck('§4 토스트 드롭 시 팝업 폴백', FB.dropped && FB.modal,
       '드롭 ' + FB.dropped + ' · 폴백 모달 ' + FB.modal + (FB.txt ? ' «' + FB.txt.trim() + '»' : ''));

    ck('§5 콘솔 에러 0', errs.length === 0, errs.length ? errs.slice(0, 3).join(' / ') : '0건');
    await ctx.close();
  }
  await browser.close();

  console.log('');
  if (bad.length) { console.log('실패 항목:'); bad.forEach(b => console.log('  · ' + b)); }
  console.log('VERIFY149 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
