#!/usr/bin/env node
/* 작업 46 — 레이드(DPS 측정 던전) 기능 검증 (ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify46.js
 *
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영됨» 을 본다.
 * 버튼마다 «눌렀을 때 무엇이 바뀌는지» 를 DOM/상태로 대조한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const fails = [];
let n = 0;
const chk = (name, cond, got) => {
  n++;
  if (cond) console.log(`  ✓ ${name}` + (got !== undefined ? ` — ${got}` : ''));
  else { fails.push(name); console.log(`  ✗ ${name}` + (got !== undefined ? ` — got ${JSON.stringify(got)}` : '')); }
};
const launchOpts = () => {
  const fs = require('fs');
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    if (fs.existsSync(p)) return { executablePath: p };
  return {};
};
const click = (page, sel) => page.$eval(sel, (el) => el.click());

/* 244 — 기하를 재기 전에 «그 요소가 멈출 때까지» 기다린다.
   60 쥬시의 팝업 등장 `jzBoxIn` 은 오버슛(796×1197 → 810×1218 → 796×1197)이고 **정확히 300ms** 에
   끝난다. 여기는 `waitForTimeout(300)` 뒤에 바로 쟀기 때문에 러너가 조금만 밀려도 감속 구간
   (800×1203 · 806×1212)을 집어 뜨고 지는 FAIL 이 났다 — 제품이 아니라 «자» 가 흔들린 것이다.
   전역 `document.getAnimations()` 로는 못 기다린다: `thBob`·`jzDotPulse`·`bgmA` 같은 **상시 아이들
   애니메이션이 끝나지 않아** 영원히 대기한다(그래서 cap120 도 요소 bbox 서명으로 판정한다).
   그런데 bbox 서명«만» 으로도 안 된다 — `jzBoxIn` 은 **시작 키프레임이 평평해서**(0~100ms 가
   732×1101 로 동일) 러너가 밀리면 그 시작 고원에서 «연속 3회 같음» 이 먼저 차 버리고, 등장이
   끝나기도 전에 «정지» 로 속는다(실제로 부하를 걸어 재현: got 732×1101 · 정지).
   그래서 **잰 대상 자신의 애니메이션**(`el.getAnimations()` — 상시 아이들은 다른 요소에 붙어 있어
   안 걸린다)이 전부 끝난 것을 먼저 보고, 그 다음에 bbox 가 연속 3회 같은지를 본다.
   카드 목록처럼 여러 칸을 한 번에 재는 자리도 같은 병을 앓는다(60 `jzStagger` 등장 — 부하를 걸면
   980×350 대신 974×348 을 집는다). 그래서 셀렉터에 걸리는 **전부**를 대상으로 본다.

   ⚑⚑ **작업 957 — 이 자리는 공용 §box 로 안 접는다(사유를 여기 남긴다).** 957 이 «상자 정착을
   손으로 적은 자» 다섯 중 넷(`verify429`·`probe764`·`verify268`·`smoke.js`)을 `settle291.js` 의
   §box(그 파일 QUIET_SRC)로 모았는데, 이 자만 **축이 둘 더 있다**:
     ⓐ **스코프가 요소다** — §box 는 `document.getAnimations()` 를 **이름 패턴**으로 거른다.
        여기는 `sel` 에 걸린 요소 **자신의** 애니를 이름 무관으로 본다(`jz` 로 시작하지 않는
        연출이 그 칸에 붙어도 기다린다).
     ⓑ **bbox 연속 3회라는 둘째 관문이 있다** — 이름 패턴 하나로는 못 적는 축이고, 이 자는
        그 결과(`settled`)를 **단언으로도 남긴다**(아래 [244] 항).
   ⇒ 접는 것이 목적이 아니라 «한 규칙으로 모으는 것» 이 목적이므로(957 등재문), 규칙이 실제로
   다른 이 자리는 **사유를 적고 남긴다**. `verify957` [5] 가 «남은 손 사본은 이 하나이고 사유가
   적혀 있다» 를 래칫으로 지킨다 — 사유 없이 여섯째가 생기면 그 자가 빨개진다. */
const settleBox = (page, sel, cap = 3000) => page.evaluate(async ({ sel, cap }) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const all = () => [...document.querySelectorAll(sel)];
  const running = () => all().reduce((n, e) => n + (e.getAnimations
    ? e.getAnimations().filter((a) => a.playState !== 'finished' && a.playState !== 'idle').length : 0), 0);
  const sig = () => all().map((e) => { const r = e.getBoundingClientRect();
    return `${r.width.toFixed(2)}×${r.height.toFixed(2)}`; }).join('|');
  let waited = 0, anim = 0;
  /* ① 자기 등장 애니메이션이 끝날 때까지 */
  while (waited < cap) { anim = running(); if (!anim) break; await wait(50); waited += 50; }
  /* ② 그 다음 bbox 가 연속 3회(≈150ms) 완전히 같을 때까지 */
  let prev = '', same = 0;
  while (waited < cap) {
    await wait(50); waited += 50;
    const s = sig();
    same = (s === prev && s !== '') ? same + 1 : 0;
    prev = s;
    if (same >= 3 && !running()) break;
  }
  return { waited, settled: same >= 3 && !running(), box: prev || sig() };
}, { sel, cap });

(async () => {
  let browser;
  try { browser = await launch(chromium); } catch (e) { browser = await launch(chromium, launchOpts()); }
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  try {
    /* ---------- 1. 서브탭 ---------- */
    console.log('[1] 03 던전 페이지 서브탭 «컨텐츠 · 던전»');
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    let t = await page.$$eval('#dunSub [data-dsub]', (els) => els.map((e) => ({
      k: e.dataset.dsub, txt: e.textContent.trim(), on: e.classList.contains('on'),
      x: Math.round(e.getBoundingClientRect().left), w: Math.round(e.getBoundingClientRect().width),
    })));
    /* 209(2026-08-27, 주인 지시) — «탑» 탭이 3번째 칸으로 들어왔다. 46 이 지키려던 것은 «칸 개수»가
       아니라 «컨텐츠·던전 두 칸이 이 순서로 있고 기본이 던전» 이므로, 개수 대신 **그 두 칸**을 묻는다
       (LESSONS 194-4 — «N칸까지만» 은 대개 «그때 N개였다» 는 기록이다). */
    chk('서브탭 — 컨텐츠·던전이 앞 두 칸 (+209 탑)', t.length === 3
      && t[0] && t[0].k === 'raid' && t[1] && t[1].k === 'dun' && t[2] && t[2].k === 'tower',
      t.map((x) => x.k).join(','));
    /* 123 — 라벨이 «레이드» → «컨텐츠» 로 바뀌었다(data-dsub 키는 raid 유지) */
    chk('왼쪽 칸이 «컨텐츠»(자물쇠 아님)', t[0] && t[0].k === 'raid' && t[0].txt === '컨텐츠', t[0] && t[0].txt);
    chk('오른쪽 칸이 «던전»', t[1] && t[1].k === 'dun' && t[1].txt === '던전', t[1] && t[1].txt);
    chk('기본 선택 = 던전', !!(t[1] && t[1].on && !t[0].on));
    const noLock = await page.$$eval('#dunSub .dns-t.lk, #dunSubLock', (e) => e.length).catch(() => 0);
    chk('구버전 자물쇠 칸 잔재 0건 (57 교훈 1)', noLock === 0, noLock);
    /* 242 — 옛 단언은 «던전 카드 5장» 이었다. 그 5 는 «46 당시 표가 5칸이었다» 는 기록일 뿐이라
       90(6장)·194(7장)·203(8장)이 표를 늘릴 때마다 빨개졌다(236 ④ «데이터가 늘어도 전제는 죽는다»).
       카드 수는 **근거 데이터인 `DUNGEONS` 표에서 파생**시키고, 표 자체가 줄지 않았다는 하한
       (46 당시 5칸 · gold·dia 상시)을 «안 바뀌어야 하는 쪽» 으로 같이 못박는다(200 ③). */
    const dunIds = await page.evaluate(() => DUNGEONS.map((d) => d.id));
    /* 264 — 측정장 제한 시간은 **표(RAIDS[0].sec)가 유일한 출처**다. 아래 단언들이 이 값을 쓴다
       (60 → 30 처럼 주인이 창을 바꿔도 게이트가 «그때 60이었다» 로 굳지 않게 — LESSONS 194-4). */
    const raidSec = await page.evaluate(() => RAIDS[0].sec);
    const cardIds = await page.$$eval('#dunList [data-dcard]', (e) => e.map((x) => x.dataset.dcard));
    chk('던전 카드 = DUNGEONS 표 전부 (수·순서까지)', cardIds.join(',') === dunIds.join(','),
      `카드 ${cardIds.length} [${cardIds.join(',')}] / 표 ${dunIds.length} [${dunIds.join(',')}]`);
    chk('표가 46 당시(5칸) 아래로 줄지 않음 + gold·dia 상시', dunIds.length >= 5
      && dunIds.includes('gold') && dunIds.includes('dia'), dunIds.length);

    /* ---------- 2. 레이드 탭 ---------- */
    console.log('[2] «컨텐츠» 칸 → 카드 리스트 (123: 측정장 1 + 아레나 1)');
    await click(page, '#dunSub [data-dsub="raid"]');
    await page.waitForTimeout(300);
    /* 244 — 카드 규격(980×350)을 재기 전에 60 `jzStagger` 등장이 끝난 것을 확인한다.
       부하 없이 돌리면 이미 끝나 있어 안 보이지만, 러너가 밀리면 974×348 을 집는다. */
    const rcSettle = await settleBox(page, '#dunList [data-rcard], #dunList [data-arena]');
    const cards = await page.$$eval('#dunList [data-rcard]', (els) => els.map((e) => ({
      id: e.dataset.rcard, lock: !!e.querySelector('.lk'), nm: e.querySelector('.nm').textContent.trim(),
      lvl: e.querySelector('.sp.lv i').textContent.trim(), best: e.querySelector('.sp.tk i').textContent.trim(),
      la: e.querySelector('.lb.a').textContent.trim(), lb: e.querySelector('.lb.b').textContent.trim(),
      w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height),
    })));
    /* 123 — 측정장은 r60 하나만 남았다(r30·r120 폐기). 아레나 카드는 `data-arena` 라 이 수집에 안 걸린다. */
    chk('측정장 카드 1장 (r30·r120 폐기)', cards.length === 1, cards.length);
    chk('카드 규격 = 03 던전과 동일 980×350', cards.every((c) => c.w === 980 && c.h === 350),
      `${cards[0] && `${cards[0].w}×${cards[0].h}`} (등장 애니 정지까지 ${rcSettle.waited}ms · ${rcSettle.settled ? '정지' : '미정지'})`);
    chk('카드 규격을 «등장 애니 정지 후» 에 쟀다 (뜨고 지는 FAIL 방지)', rcSettle.settled, `${rcSettle.waited}ms`);
    /* 264 — 주인 지시로 제한 시간이 60 → **30** 이 됐다(«30초 만에 얼마나 넣는지»).
       기대값을 손으로 적지 않고 표(RAIDS)에서 읽는다 — 창이 또 바뀌어도 이 줄은 안 썩는다. */
    chk('첫 카드 해금 + 제한 시간 = RAIDS[0].sec', !!(cards[0] && !cards[0].lock && cards[0].lvl === String(raidSec)), `${cards[0] && cards[0].lvl} (표 ${raidSec})`);
    chk('라벨이 «제한 시간(초) / 최고 DPS»', !!(cards[0] && cards[0].la === '제한 시간(초)' && cards[0].lb === '최고 DPS'),
      cards[0] && `${cards[0].la}/${cards[0].lb}`);
    chk('기록 없으면 «-»', cards[0] && cards[0].best === '-', cards[0] && cards[0].best);
    chk('측정장은 잠금 없음', cards.filter((c) => c.lock).length === 0);
    /* 123 — 같은 탭의 2번째 카드 = 아레나. 스테이지 미달이면 잠긴다(ARENA.open = 5) */
    const arn = await page.$$eval('#dunList [data-arena]', (els) => els.map((e) => ({
      lock: !!e.querySelector('.lk'), nm: e.querySelector('.nm').textContent.trim(),
      la: e.querySelector('.lb.a').textContent.trim(), lb: e.querySelector('.lb.b').textContent.trim(),
      ncv: e.querySelectorAll('canvas.thcv').length,
      w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height),
    })));
    chk('아레나 카드 1장', arn.length === 1, arn.length);
    chk('아레나 카드 규격 980×350', !!(arn[0] && arn[0].w === 980 && arn[0].h === 350), arn[0] && `${arn[0].w}×${arn[0].h}`);
    chk('아레나 카드 이름 «아레나»', !!(arn[0] && arn[0].nm === '아레나'), arn[0] && arn[0].nm);
    chk('아레나 라벨 «제한 시간(초) / 전적 (승-패)»',
      !!(arn[0] && arn[0].la === '제한 시간(초)' && arn[0].lb === '전적 (승-패)'), arn[0] && `${arn[0].la}/${arn[0].lb}`);
    chk('아레나 썸네일 = 플레이어 2명(캔버스 2장)', !!(arn[0] && arn[0].ncv === 2), arn[0] && arn[0].ncv);
    chk('스테이지 미달이면 아레나 잠금', !!(arn[0] && arn[0].lock), arn[0] && arn[0].lock);
    const ov = await page.$$eval('#dunList [data-rcard]', (els) => els.map((e) => {
      const p = e.querySelector('.sp.lv'), i = p.querySelector('i');
      return Math.round(i.getBoundingClientRect().right - p.getBoundingClientRect().right);
    }));
    chk('시간 알약 밖으로 글자가 새지 않음', ov.every((d) => d <= 0), ov);
    /* 재화 알약(`.pill`)은 폭 288 고정 + 글자가 left:58 절대배치라 안쪽 폭이 230 뿐이다.
       03 던전의 10글자 라벨이 7.5px 새는 기존 결함이 있으므로, 레이드 라벨은 반드시 230 안에 넣는다. */
    const pov = await page.$$eval('#dunList [data-rcard] .pill', (els) => els.map((e) => {
      const i = e.querySelector('i');
      return Math.round(i.getBoundingClientRect().right - e.getBoundingClientRect().right);
    }));
    chk('재화 알약 밖으로 라벨이 새지 않음', pov.every((d) => d <= 0), pov);

    /* ---------- 3. 04 세부 팝업 재사용 ---------- */
    console.log('[3] 카드 클릭 → 04 세부 팝업(레이드 모드)');
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    /* 244 — `jzBoxIn` 오버슛이 끝난 뒤에 잰다(위 settleBox 주석). 대기 300ms 는 애니메이션 길이와
       «같은» 값이라 경계에 걸린다 — 멈춘 것을 확인하고 넘어간다. */
    const dgdSettle = await settleBox(page, '.dgd-box');
    let d = await page.evaluate(() => ({
      on: document.getElementById('dgdw').classList.contains('on'),
      title: document.getElementById('dgdTitle').textContent,
      lvL: document.getElementById('dgdLvL').textContent,
      floor: document.getElementById('dgdFloor').textContent,
      rwL: document.getElementById('dgdRwL').textContent,
      amt: document.getElementById('dgdAmt').textContent,
      tryN: document.getElementById('dgdTry').textContent,
      tryMax: (typeof RAID_TRY === 'number' ? RAID_TRY : null),   /* 205 */
      prev: document.getElementById('dgdPrev').disabled,
      next: document.getElementById('dgdNext').disabled,
      box: (() => { const r = document.querySelector('.dgd-box').getBoundingClientRect();
        return `${Math.round(r.width)}×${Math.round(r.height)}`; })(),
    }));
    chk('#dgdw 열림 (04 규격 재사용)', d.on && d.box === '796×1197',
      `${d.box} (등장 애니 정지까지 ${dgdSettle.waited}ms · ${dgdSettle.settled ? '정지' : '미정지'})`);
    /* 244 — «멈춘 뒤에 쟀다» 자체를 단언으로 남긴다. settleBox 가 상한(3s)까지 못 멈추면
       위 규격 단언이 우연히 맞아떨어져도 그건 잰 게 아니라 걸린 것이다. */
    chk('규격을 «등장 애니 정지 후» 에 쟀다 (뜨고 지는 FAIL 방지)', dgdSettle.settled,
      `${dgdSettle.waited}ms → ${dgdSettle.box}`);
    chk('타이틀 = 측정장 이름', d.title === 'DPS 측정장', d.title);
    chk('«레벨» → «제한 시간» = RAIDS[0].sec 초', d.lvL === '제한 시간' && d.floor === `${raidSec}초`, `${d.lvL}/${d.floor}`);
    chk('«보상» → «최고 기록»(기록 없음)', d.rwL === '최고 기록' && d.amt === '기록 없음', `${d.rwL}/${d.amt}`);
    /* 205 (2026-08-27, 저장소 주인 지시 «DPS 랑 아레나 하루 딱 3번만») — 46 이 세워 둔
       «입장 횟수 무제한 ∞» 는 46 자신이 «가정(주인 확인 필요)» 로 적어 둔 값이었고, 205 가 그
       가정을 뒤집었다. LESSONS 185-④ «설계가 뒤집힌 단언은 지우지 말고 이사시켜라» 대로
       묻는 것(«이 칸이 측정장의 입장 규칙을 말하는가»)은 그대로 두고 기대값만 새 규칙으로 옮긴다.
       기대 문구는 리터럴로 박지 않는다(185-①) — `RAID_TRY` 에서 런타임 계산한다.
       242 — 206 과 같은 회차에 같은 자리를 고쳤다(병합). 기대값을 화면이 쓰는 `raidLeft()` 가
       아니라 근거 상수에서 만든다는 점이 같아 206 쪽 형태를 살리고, 242 는 이 상수를 [8] 의
       «차감이 실제로 반영되는가» 에 재사용한다. */
    const RTRY = d.tryMax;
    chk(`입장 횟수 = 하루 ${d.tryMax}회 (205 — 종전 ∞ 폐기)`, d.tryN === `${d.tryMax}/${d.tryMax}`, d.tryN);
    chk('해금된 다른 측정장 없으면 ◀▶ 비활성', d.prev && d.next, `${d.prev}/${d.next}`);

    /* 123 — 측정장이 하나뿐이라 ◀▶ 는 «해금 후에도» 갈 곳이 없다(구 «단기/장기 측정장 이동» 검사 폐기) */
    console.log('[4] ◀▶ = 측정장 이동 (123: 측정장 1개 → 항상 비활성)');
    await page.evaluate(() => { S.best = 999; renderRaidDetail(); });
    await page.waitForTimeout(150);
    d = await page.evaluate(() => ({ title: document.getElementById('dgdTitle').textContent,
      prev: document.getElementById('dgdPrev').disabled, next: document.getElementById('dgdNext').disabled }));
    chk('해금 후에도 ◀▶ 비활성 (옮겨 갈 측정장 없음)', d.prev && d.next, `${d.prev}/${d.next}`);
    chk('타이틀 유지 = DPS 측정장', d.title === 'DPS 측정장', d.title);

    /* ---------- 5. 도전 = 레이드 시작 ---------- */
    console.log('[5] «도전» → 레이드 시작(샌드백 · 타이머 · HUD)');
    const before = await page.evaluate(() => ({ stage: S.stage, gold: S.gold }));
    await click(page, '#dgdGo');
    await page.waitForTimeout(600);
    let st = await page.evaluate(() => ({
      on: !!raidOn, id: raidOn && raidOn.id, sec: raidOn && raidOn.sec, t: raidT,
      dgd: document.getElementById('dgdw').classList.contains('on'),
      dun: document.getElementById('dunw').classList.contains('on'),
      tm: document.getElementById('bossTm').classList.contains('on'),
      hp: document.getElementById('bossHp').classList.contains('on'),
      gv: document.getElementById('bossGv').classList.contains('on'),
      tmN: document.getElementById('bossTmN').textContent,
      sand: enemies.filter((e) => e.raid).length,
      sandDmg: (enemies.find((e) => e.raid) || {}).dmg,
      others: enemies.filter((e) => !e.raid).length,
    }));
    chk('raidOn = r60 · 제한 시간 = 표의 sec', st.on && st.id === 'r60' && st.sec === raidSec, `${st.id}/${st.sec} (표 ${raidSec})`);
    chk('세부 팝업·던전 페이지가 닫힘', !st.dgd && !st.dun, `${st.dgd}/${st.dun}`);
    chk('샌드백 1마리만 스폰(일반 몹 없음)', st.sand === 1 && st.others === 0, `${st.sand}/${st.others}`);
    chk('샌드백 공격력 0 (플레이어 무피해)', st.sandDmg === 0, st.sandDmg);
    chk('⏱ 타이머 HUD 켜짐 + 카운트다운', st.tm && Number(st.tmN) > 0 && Number(st.tmN) <= raidSec, `${st.tmN} (표 ${raidSec})`);
    chk('바·[포기하기] HUD 켜짐', st.hp && st.gv);

    console.log('[6] 피해 집계 · 샌드백 불사 · 스테이지 정지');
    await page.waitForTimeout(4000);
    st = await page.evaluate(() => ({
      dmg: raidDmg, t: raidT, stage: S.stage,
      hpFull: (() => { const e = enemies.find((x) => x.raid); return e ? e.hp === e.max : null; })(),
      alive: enemies.filter((e) => e.raid).length,
      hpN: document.getElementById('bossHpN').textContent,
      php: player.hp, pmax: stat.maxHp,
    }));
    chk('누적 피해량 > 0 (모든 피해 경로 집계)', st.dmg > 0, Math.round(st.dmg));
    chk('샌드백이 죽지 않음(hp = max)', st.hpFull === true && st.alive === 1);
    chk('레이드 중 스테이지 진행 정지', st.stage === before.stage, `${before.stage}→${st.stage}`);
    chk('플레이어 무피해', st.php === st.pmax, `${Math.round(st.php)}/${Math.round(st.pmax)}`);
    chk('HUD 숫자 = 누적 피해량', st.hpN && st.hpN !== '0' && !/NaN|undefined/.test(st.hpN), st.hpN);

    /* ---------- 7. 종료 → 결과 + 기록 저장 ---------- */
    /* 206(2026-08-27, 주인 재지시) — 레이드 «결과» 는 모달이 아니라 **토스트**다.
       («알림들 팝업 말고 꼭 토스트로». 총 피해·최고 기록은 아래 [8] 이 보는 03 던전 카드가 들고 있다) */
    console.log('[7] 시간 만료 → 결과 토스트 + S.raidBest 저장');
    await page.evaluate(() => { raidT = 0.15; });
    await page.waitForTimeout(400);        /* 토스트 체류가 1.06초다 — 사라지기 전에 잰다 */
    let r = await page.evaluate(() => ({
      on: !!raidOn, modal: document.getElementById('modal').classList.contains('on'),
      toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).join(' | '),
      title: document.getElementById('mtitle').textContent,
      txt: document.getElementById('mbox') ? document.getElementById('mbox').innerText : '',
      best: JSON.parse(JSON.stringify(S.raidBest)),
      saved: JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').raidBest,
      stage: S.stage, sand: enemies.filter((e) => e.raid).length,
      tm: document.getElementById('bossTm').classList.contains('on'),
    }));
    chk('레이드 종료(raidOn null)', !r.on);
    chk('206 — 결과가 토스트로 뜬다', !!r.toast && /DPS/.test(r.toast), r.toast);
    chk('206 — 결과 모달은 안 열린다', !r.modal, r.modal ? '모달 ON «' + r.title + '»' : 'off');
    chk('결과에 NaN/undefined 없음', !/NaN|undefined|Infinity/.test(r.toast), r.toast);
    /* 토스트는 어두운 판(rgba(24,17,10,.92)) 위 크림 글자다 — 모달의 크림 바탕 대비 규칙이 아니라
       58 이 소유한 자기 기하를 따른다. 폭·자리·대비는 `verify149 §3` 이 잰다. */
    chk('S.raidBest.r60 기록', !!(r.best.r60 && r.best.r60.dmg > 0 && r.best.r60.dps > 0),
      r.best.r60 && `dmg ${Math.round(r.best.r60.dmg)} dps ${Math.round(r.best.r60.dps)}`);
    chk('localStorage 에 저장됨', !!(r.saved && r.saved.r60 && r.saved.r60.dps > 0));
    chk('샌드백 제거 + 스테이지 복귀', r.sand === 0 && r.stage === before.stage);
    chk('레이드 HUD 내려감', !r.tm);
    const rec1 = r.best.r60;

    console.log('[8] 카드·세부 팝업에 기록 반영');
    /* 206 — 닫을 팝업이 없다(결과가 토스트다). 토스트가 스스로 사라지기만 기다린다 */
    await page.waitForTimeout(1200);
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    const c2 = await page.$$eval('#dunList [data-rcard]', (els) => els.map((e) => ({
      id: e.dataset.rcard, best: e.querySelector('.sp.tk i').textContent.trim(), lock: !!e.querySelector('.lk') })));
    /* 123 — 측정장은 1장뿐이다(r30·r120 폐기). 같은 탭의 아레나 카드는 data-arena 라 이 수집 밖이다. */
    chk('컨텐츠 탭이 그대로 열려 있음', c2.length === 1, c2.length);
    chk('스테이지 999 → 측정장 해금', c2.every((c) => !c.lock));
    chk('카드 «최고 DPS» 갱신', c2[0] && c2[0].best !== '-', c2[0] && c2[0].best);
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    const amt = await page.evaluate(() => document.getElementById('dgdAmt').textContent);
    chk('세부 팝업 «최고 기록» 갱신', /DPS/.test(amt) && !/기록 없음/.test(amt), amt);
    /* 242 — 205 의 하루 횟수가 «표시만» 이 아니라 실제로 깎이는지: [5] 에서 1회 돌았으므로 (3−1)/3 */
    const tryAfter = await page.evaluate(() => document.getElementById('dgdTry').textContent);
    chk('1회 도전이 남은 횟수에 반영 (205)', tryAfter === `${RTRY - 1}/${RTRY}`, tryAfter);

    /* ---------- 9. 포기하기 = 기록 미저장 ---------- */
    console.log('[9] [포기하기] → 중단(기록 저장 안 함)');
    await click(page, '#dgdGo');
    await page.waitForTimeout(1200);
    /* 측정 중에 또 «도전» 을 누르면 새로 시작하지 않고 안내만 (기록 보호) */
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    /* 242 — 옛 단언은 «모달 #mtitle 이 «레이드 진행 중»» 이었다. **149(2026-08-27, 저장소 주인 지시
       «단순 안내는 팝업이 아니라 토스트»)** 가 이 안내를 `notify()` 로 옮겨(~20606) 모달이 아예 안 뜬다 —
       그래서 이 자리는 «직전 결과 팝업의 제목» 을 읽고 있었다. 안내는 `.fx-toast` 로 확인하고,
       토스트가 1060ms 만에 스스로 사라지므로 고정 대기 대신 **MutationObserver 로 등장을 받아 적는다**(236 ②). */
    const t0 = await page.evaluate(() => raidT);
    const dmg0 = await page.evaluate(() => raidDmg);
    await page.evaluate(() => {
      window.__t242 = [];
      const L = document.getElementById('fxl') || document.body;
      window.__o242 = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((nd) => {
        if (nd.nodeType === 1 && nd.classList.contains('fx-toast')) window.__t242.push(nd.textContent.trim());
      })));
      window.__o242.observe(L, { childList: true });
    });
    await click(page, '#dgdGo');
    await page.waitForTimeout(400);
    /* 149 — «레이드 진행 중» 안내는 모달이 아니라 토스트다(206 이 그 규칙을 이어받았다).
       242 — 같은 자리를 206 과 나란히 고쳤다(병합). «계약»(판이 안 리셋된다)과 «표현»(토스트 한 줄)을
       두 단언으로 가르고, 토스트가 1060ms 만에 스스로 사라지므로 클릭 전에 건 MutationObserver 로
       등장을 받아 적는다(236 ② — 체류 시간이 또 바뀌어도 안 깨진다). */
    const dup = await page.evaluate(() => {
      window.__o242.disconnect();
      return { t: raidT, dmg: raidDmg, on: !!raidOn, id: raidOn && raidOn.id,
        toast: window.__t242.slice(), modal: document.getElementById('modal').classList.contains('on') };
    });
    chk('측정 중 재도전은 새로 시작하지 않음 — 같은 판이 계속 돈다',
      dup.on && dup.id === 'r60' && dup.t < t0 && dup.dmg >= dmg0,
      `raidOn ${dup.id} t ${dup.t.toFixed(1)} < ${t0.toFixed(1)} · dmg ${Math.round(dup.dmg)} ≥ ${Math.round(dmg0)}`);
    chk('안내는 토스트 한 줄(149) — 팝업으로 흐름을 끊지 않음',
      !dup.modal && dup.toast.some((s) => /진행 중/.test(s)), `modal ${dup.modal} · ${JSON.stringify(dup.toast)}`);
    await page.waitForTimeout(1200);       /* 206 — 토스트 자연 소멸 대기 */
    await click(page, '.tab[data-t="adv"]');   /* 던전 페이지 닫기 → 전투 화면 */
    await page.waitForTimeout(400);
    await click(page, '#bossGv');
    await page.waitForTimeout(500);
    r = await page.evaluate(() => ({
      on: !!raidOn, best: JSON.parse(JSON.stringify(S.raidBest)), stage: S.stage,
      sand: enemies.filter((e) => e.raid).length, mobs: enemies.length,
      tm: document.getElementById('bossTm').classList.contains('on'),
      modal: document.getElementById('modal').classList.contains('on'),
    }));
    chk('레이드 중단', !r.on && r.sand === 0);
    chk('중단은 결과 팝업 없음', !r.modal);
    chk('중단은 기록을 덮어쓰지 않음', r.best.r60 && r.best.r60.dps === rec1.dps,
      r.best.r60 && Math.round(r.best.r60.dps));
    chk('일반 전투 복귀(몹 재스폰)', r.tm === false && r.stage === before.stage);

    /* ---------- 10. 던전 탭 복귀 ---------- */
    console.log('[10] «던전» 칸 복귀 — 04 라벨 원복');
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    await click(page, '#dunSub [data-dsub="dun"]');
    await page.waitForTimeout(300);
    const back = await page.evaluate(() => ({
      cards: document.querySelectorAll('#dunList [data-dcard]').length,
      raid: document.querySelectorAll('#dunList [data-rcard]').length,
      on: document.querySelector('#dunSub [data-dsub="dun"]').classList.contains('on'),
    }));
    /* 242 — §1 과 같은 이유로 표 길이 파생. «복귀» 가 묻는 것은 «5장» 이 아니라
       «레이드 카드가 사라지고 던전 표가 통째로 돌아왔는가» 다. */
    chk('던전 표 전부 복귀 + 레이드 카드 0장', back.cards === dunIds.length && back.raid === 0,
      `${back.cards}/${back.raid} (표 ${dunIds.length})`);
    chk('선택 표시가 던전으로 이동', back.on);
    await click(page, '#dunList [data-dcard="gold"]');
    await page.waitForTimeout(300);
    const lab = await page.evaluate(() => ({
      l: document.getElementById('dgdLvL').textContent, r: document.getElementById('dgdRwL').textContent,
      f: document.getElementById('dgdFloor').textContent }));
    chk('04 라벨이 «레벨 / 보상» 으로 원복', lab.l === '레벨' && lab.r === '보상', `${lab.l}/${lab.r}`);
    chk('던전 층 표시 정상', /^\d+$/.test(lab.f), lab.f);

    chk('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3));
    await ctx.close();

    /* ---------- 11. 세이브 마이그레이션 (44 교훈 1 — addInitScript) ---------- */
    console.log('[11] 옛 세이브 마이그레이션 (raidBest 없음 / null / 문자열 / 깨진 항목)');
    for (const [label, val] of [['필드 없음', undefined], ['null', null], ['문자열', '"x"'],
                                ['깨진 항목', '{"r60":{"dmg":"x"}}']]) {
      const c2x = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
      const errs2 = [];
      const p2 = await c2x.newPage();
      p2.on('pageerror', (e) => errs2.push(String(e.message)));
      await c2x.addInitScript(`(() => {
        const s = { stage: 7, best: 12, gold: 1000, dia: 100 };
        ${val === undefined ? '' : `s.raidBest = ${val};`}
        localStorage.setItem('idle_hunter_save_v4', JSON.stringify(s));
      })()`);
      await p2.goto(URL, { waitUntil: 'load' });
      await p2.waitForTimeout(700);
      const got = await p2.evaluate(() => ({
        ok: S.raidBest && typeof S.raidBest === 'object' && !Array.isArray(S.raidBest),
        keys: Object.keys(S.raidBest || {}).length,
        best: S.best,
        bad: /\bNaN\b|\bundefined\b/.test(document.body.innerText || ''),
      }));
      chk(`세이브 «${label}» → raidBest 정상화 + NaN 없음`,
        got.ok && got.keys === 0 && !got.bad && errs2.length === 0,
        `${JSON.stringify(got)} ${errs2.slice(0, 1)}`);
      await c2x.close();
    }
  } catch (e) {
    fails.push('CRASH: ' + (e.message || e));
    console.log('  ✗ CRASH ' + (e.message || e));
  }
  await browser.close();
  console.log(fails.length ? `\nVERIFY46 FAIL — ${fails.length}/${n}` : `\nVERIFY46 PASS ${n}/${n}`);
  process.exit(fails.length ? 1 : 0);
})();
