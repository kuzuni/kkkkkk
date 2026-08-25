#!/usr/bin/env node
/* 작업 46 — 레이드(DPS 측정 던전) 기능 검증 (ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify46.js
 *
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영됨» 을 본다.
 * 버튼마다 «눌렀을 때 무엇이 바뀌는지» 를 DOM/상태로 대조한다.
 */
const path = require('path');
const { chromium } = require('playwright');
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

(async () => {
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch(launchOpts()); }
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
    chk('서브탭 2칸', t.length === 2, t.map((x) => x.k).join(','));
    /* 123 — 라벨이 «레이드» → «컨텐츠» 로 바뀌었다(data-dsub 키는 raid 유지) */
    chk('왼쪽 칸이 «컨텐츠»(자물쇠 아님)', t[0] && t[0].k === 'raid' && t[0].txt === '컨텐츠', t[0] && t[0].txt);
    chk('오른쪽 칸이 «던전»', t[1] && t[1].k === 'dun' && t[1].txt === '던전', t[1] && t[1].txt);
    chk('기본 선택 = 던전', !!(t[1] && t[1].on && !t[0].on));
    const noLock = await page.$$eval('#dunSub .dns-t.lk, #dunSubLock', (e) => e.length).catch(() => 0);
    chk('구버전 자물쇠 칸 잔재 0건 (57 교훈 1)', noLock === 0, noLock);
    chk('던전 카드 5장', (await page.$$eval('#dunList [data-dcard]', (e) => e.length)) === 5);

    /* ---------- 2. 레이드 탭 ---------- */
    console.log('[2] «컨텐츠» 칸 → 카드 리스트 (123: 측정장 1 + 아레나 1)');
    await click(page, '#dunSub [data-dsub="raid"]');
    await page.waitForTimeout(300);
    const cards = await page.$$eval('#dunList [data-rcard]', (els) => els.map((e) => ({
      id: e.dataset.rcard, lock: !!e.querySelector('.lk'), nm: e.querySelector('.nm').textContent.trim(),
      lvl: e.querySelector('.sp.lv i').textContent.trim(), best: e.querySelector('.sp.tk i').textContent.trim(),
      la: e.querySelector('.lb.a').textContent.trim(), lb: e.querySelector('.lb.b').textContent.trim(),
      w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height),
    })));
    /* 123 — 측정장은 r60 하나만 남았다(r30·r120 폐기). 아레나 카드는 `data-arena` 라 이 수집에 안 걸린다. */
    chk('측정장 카드 1장 (r30·r120 폐기)', cards.length === 1, cards.length);
    chk('카드 규격 = 03 던전과 동일 980×350', cards.every((c) => c.w === 980 && c.h === 350),
      cards[0] && `${cards[0].w}×${cards[0].h}`);
    chk('첫 카드 해금 + 제한 시간 60', !!(cards[0] && !cards[0].lock && cards[0].lvl === '60'), cards[0] && cards[0].lvl);
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
    let d = await page.evaluate(() => ({
      on: document.getElementById('dgdw').classList.contains('on'),
      title: document.getElementById('dgdTitle').textContent,
      lvL: document.getElementById('dgdLvL').textContent,
      floor: document.getElementById('dgdFloor').textContent,
      rwL: document.getElementById('dgdRwL').textContent,
      amt: document.getElementById('dgdAmt').textContent,
      tryN: document.getElementById('dgdTry').textContent,
      prev: document.getElementById('dgdPrev').disabled,
      next: document.getElementById('dgdNext').disabled,
      box: (() => { const r = document.querySelector('.dgd-box').getBoundingClientRect();
        return `${Math.round(r.width)}×${Math.round(r.height)}`; })(),
    }));
    chk('#dgdw 열림 (04 규격 재사용)', d.on && d.box === '796×1197', d.box);
    chk('타이틀 = 측정장 이름', d.title === 'DPS 측정장', d.title);
    chk('«레벨» → «제한 시간» 60초', d.lvL === '제한 시간' && d.floor === '60초', `${d.lvL}/${d.floor}`);
    chk('«보상» → «최고 기록»(기록 없음)', d.rwL === '최고 기록' && d.amt === '기록 없음', `${d.rwL}/${d.amt}`);
    chk('입장 횟수 무제한 ∞', d.tryN === '∞', d.tryN);
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
    chk('raidOn = r60 60초', st.on && st.id === 'r60' && st.sec === 60, `${st.id}/${st.sec}`);
    chk('세부 팝업·던전 페이지가 닫힘', !st.dgd && !st.dun, `${st.dgd}/${st.dun}`);
    chk('샌드백 1마리만 스폰(일반 몹 없음)', st.sand === 1 && st.others === 0, `${st.sand}/${st.others}`);
    chk('샌드백 공격력 0 (플레이어 무피해)', st.sandDmg === 0, st.sandDmg);
    chk('⏱ 타이머 HUD 켜짐 + 카운트다운', st.tm && Number(st.tmN) > 0 && Number(st.tmN) < 60, st.tmN);
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
    console.log('[7] 시간 만료 → 결과 팝업 + S.raidBest 저장');
    await page.evaluate(() => { raidT = 0.15; });
    await page.waitForTimeout(900);
    let r = await page.evaluate(() => ({
      on: !!raidOn, modal: document.getElementById('modal').classList.contains('on'),
      /* A5 공용 모달은 <h2> 를 #mtitle 로 옮기고 본문만 #mbox 에 남긴다 */
      title: document.getElementById('mtitle').textContent,
      txt: document.getElementById('mbox') ? document.getElementById('mbox').innerText : '',
      best: JSON.parse(JSON.stringify(S.raidBest)),
      saved: JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').raidBest,
      stage: S.stage, sand: enemies.filter((e) => e.raid).length,
      tm: document.getElementById('bossTm').classList.contains('on'),
    }));
    chk('레이드 종료(raidOn null)', !r.on);
    chk('결과 팝업 표시', r.modal && /레이드 결과/.test(r.title), r.title);
    chk('결과에 총 피해량·DPS', /총 피해량/.test(r.txt) && /DPS/.test(r.txt));
    chk('결과에 NaN/undefined 없음', !/NaN|undefined|Infinity/.test(r.txt), r.txt.replace(/\n/g, ' | '));
    /* A5 모달 본문은 크림(#D7C0A1) 바탕 — 어두운 배경용 색을 쓰면 대비 1.1:1 로 안 보인다 */
    const con = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
        const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const well = document.querySelector('#mbox .mwell') || document.getElementById('mbox');
      const bg = lum(getComputedStyle(well).backgroundColor);
      return [...document.querySelectorAll('#mbox b')].map((b) => {
        const f = lum(getComputedStyle(b).color);
        const r = (Math.max(f, bg) + 0.05) / (Math.min(f, bg) + 0.05);
        return { t: b.textContent, r: +r.toFixed(2) };
      });
    });
    chk('결과 팝업 강조 글자 대비 ≥ 2.5:1', con.every((c) => c.r >= 2.5), con);
    chk('S.raidBest.r60 기록', !!(r.best.r60 && r.best.r60.dmg > 0 && r.best.r60.dps > 0),
      r.best.r60 && `dmg ${Math.round(r.best.r60.dmg)} dps ${Math.round(r.best.r60.dps)}`);
    chk('localStorage 에 저장됨', !!(r.saved && r.saved.r60 && r.saved.r60.dps > 0));
    chk('샌드백 제거 + 스테이지 복귀', r.sand === 0 && r.stage === before.stage);
    chk('레이드 HUD 내려감', !r.tm);
    const rec1 = r.best.r60;

    console.log('[8] 카드·세부 팝업에 기록 반영');
    await click(page, '#okBtn');
    await page.waitForTimeout(200);
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

    /* ---------- 9. 포기하기 = 기록 미저장 ---------- */
    console.log('[9] [포기하기] → 중단(기록 저장 안 함)');
    await click(page, '#dgdGo');
    await page.waitForTimeout(1200);
    /* 측정 중에 또 «도전» 을 누르면 새로 시작하지 않고 안내만 (기록 보호) */
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    const t0 = await page.evaluate(() => raidT);
    await click(page, '#dgdGo');
    await page.waitForTimeout(400);
    const dup = await page.evaluate(() => ({
      t: raidT, dmg: raidDmg, title: document.getElementById('mtitle').textContent,
      on: document.getElementById('modal').classList.contains('on') }));
    chk('측정 중 재도전은 새로 시작하지 않음', dup.on && /레이드 진행 중/.test(dup.title) && dup.t < t0,
      `${dup.title} t ${dup.t.toFixed(1)} < ${t0.toFixed(1)}`);
    await click(page, '#okBtn');
    await page.waitForTimeout(200);
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
    chk('던전 카드 5장 복귀', back.cards === 5 && back.raid === 0, `${back.cards}/${back.raid}`);
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
