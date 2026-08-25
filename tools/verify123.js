#!/usr/bin/env node
/* 작업 123 — «컨텐츠» 탭 개편 + 아레나(1:1 PvP 더미) 기능 검증 (ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify123.js
 *
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영됨» 을 본다.
 * 지시서 [3]-(가) 기계적 작업 — 비평가 없이 이 게이트 + smoke 로 통과 판정한다.
 *
 * 검증 축(주인 지시 ①~⑤):
 *   1. 서브탭 라벨 «컨텐츠»          2. 측정장 1장(r30·r120 참조 0) + 아레나 1장
 *   3. 아레나 세부 팝업(04 재사용)   4. 입장 → 상대 닉네임·HP 바·30초 타이머
 *   5. 피해 → 상대 HP 감소           6. 승/패 → 결과 화면 + 보상 지급 + 전적 반영
 *   7. ◀ 나가기 = 중단(전적·보상 없음)  8. 구 세이브(r30·r120 기록) 로드 정상
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
  /* 썸네일 잉크를 getImageData 로 재려면 file:// 캔버스 오염을 풀어야 한다(verify72 와 같은 인자) */
  const ARGS = { args: ['--allow-file-access-from-files'] };
  try { browser = await chromium.launch(ARGS); }
  catch (e) { browser = await chromium.launch(Object.assign({}, launchOpts(), ARGS)); }
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  try {
    /* ---------- 1. 서브탭 라벨 (지시 ①) ---------- */
    console.log('[1] 서브탭 «레이드» → «컨텐츠»');
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    const tabs = await page.$$eval('#dunSub [data-dsub]', (els) => els.map((e) => ({
      k: e.dataset.dsub, txt: e.textContent.trim() })));
    chk('서브탭 2칸(컨텐츠 · 던전)', tabs.length === 2, JSON.stringify(tabs));
    chk('«레이드» 라벨이 화면에 남아 있지 않다', !tabs.some((t) => t.txt.includes('레이드')), JSON.stringify(tabs.map((t) => t.txt)));
    chk('«컨텐츠» 칸 존재 (data-dsub 키는 raid 유지)',
      tabs.some((t) => t.k === 'raid' && t.txt === '컨텐츠'), JSON.stringify(tabs));

    /* ---------- 2. 카드 2장 (지시 ②③) ---------- */
    console.log('[2] «컨텐츠» 탭 카드 2장 — DPS 측정장 + 아레나');
    await click(page, '#dunSub [data-dsub="raid"]');
    await page.waitForTimeout(400);
    const cards = await page.$$eval('#dunList .dnc', (els) => els.map((e) => ({
      id: e.dataset.rcard || (e.dataset.arena ? 'arena' : '?'),
      nm: e.querySelector('.nm').textContent.trim(),
      lock: !!e.querySelector('.lk'),
      ncv: e.querySelectorAll('canvas.thcv').length,
      la: e.querySelector('.lb.a').textContent.trim(),
      lb: e.querySelector('.lb.b').textContent.trim(),
      w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height),
    })));
    chk('카드 정확히 2장', cards.length === 2, JSON.stringify(cards.map((c) => c.id)));
    chk('1번 = DPS 측정장(r60)', !!(cards[0] && cards[0].id === 'r60' && cards[0].nm === 'DPS 측정장'),
      cards[0] && `${cards[0].id}/${cards[0].nm}`);
    chk('2번 = 아레나', !!(cards[1] && cards[1].id === 'arena' && cards[1].nm === '아레나'),
      cards[1] && `${cards[1].id}/${cards[1].nm}`);
    chk('카드 규격 = 03 던전과 동일 980×350', cards.every((c) => c.w === 980 && c.h === 350),
      cards.map((c) => `${c.w}×${c.h}`).join(' '));
    chk('아레나 썸네일 = 플레이어 2명(캔버스 2장, 97 규칙)', !!(cards[1] && cards[1].ncv === 2), cards[1] && cards[1].ncv);
    chk('아레나 라벨 «제한 시간(초) / 전적 (승-패)»',
      !!(cards[1] && cards[1].la === '제한 시간(초)' && cards[1].lb === '전적 (승-패)'),
      cards[1] && `${cards[1].la}/${cards[1].lb}`);

    /* r30·r120 참조 0 — 코드·상태 양쪽 */
    const dead = await page.evaluate(() => ({
      ids: RAIDS.map((r) => r.id),
      arenaId: typeof ARENA === 'object' ? ARENA.id : null,
    }));
    chk('RAIDS = [r60] 하나뿐 (r30·r120 삭제)', dead.ids.length === 1 && dead.ids[0] === 'r60', JSON.stringify(dead.ids));
    chk('ARENA 상수 존재', dead.arenaId === 'arena', dead.arenaId);

    /* 썸네일이 «자리를 채웠는지» — 잉크가 두 칸 모두에 실제로 그려져야 한다(LESSONS 72-③) */
    const ink = await page.evaluate(() => [...document.querySelectorAll('#dunList [data-arena] canvas.thcv')]
      .map((cv) => {
        const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let on = 0; for (let i = 3; i < im.length; i += 4) if (im[i] > 8) on++;
        return { px: [cv.width, cv.height], on };
      }));
    chk('아레나 썸네일 2칸에 실제로 스프라이트가 그려졌다',
      ink.length === 2 && ink.every((c) => c.on > 200), JSON.stringify(ink));

    /* ---------- 3. 04 세부 팝업 (지시 ④ 진입) ---------- */
    console.log('[3] 아레나 카드 → 04 세부 팝업');
    /* 잠금 상태에서는 안내만 뜨고 안 열린다 */
    await click(page, '#dunList [data-arena]');
    await page.waitForTimeout(300);
    const locked = await page.evaluate(() => ({
      dgd: document.getElementById('dgdw').classList.contains('on'),
      pop: (document.querySelector('#modal.on .mhead, .modal.on .mhead') || {}).textContent || '',
    }));
    chk('스테이지 미달이면 세부 팝업 대신 «해금» 안내', !locked.dgd && /아레나/.test(locked.pop),
      `${locked.dgd}/${locked.pop}`);
    await page.evaluate(() => { document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on')); });
    await page.evaluate(() => { S.best = 999; renderDunPage(); });
    await page.waitForTimeout(300);
    await click(page, '#dunList [data-arena]');
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => ({
      on: document.getElementById('dgdw').classList.contains('on'),
      title: document.getElementById('dgdTitle').textContent,
      lvL: document.getElementById('dgdLvL').textContent,
      floor: document.getElementById('dgdFloor').textContent,
      rwL: document.getElementById('dgdRwL').textContent,
      amt: document.getElementById('dgdAmt').textContent,
      prev: document.getElementById('dgdPrev').disabled,
      next: document.getElementById('dgdNext').disabled,
      /* 60 쥬시 팝인(scale)이 도는 동안에는 bbox 가 몇 px 커 보인다 — 레이아웃 크기로 잰다 */
      box: (() => { const e = document.querySelector('.dgd-box'); return `${e.offsetWidth}×${e.offsetHeight}`; })(),
    }));
    chk('#dgdw 열림 (04 규격 796×1197 재사용)', d.on && d.box === '796×1197', d.box);
    chk('타이틀 «아레나»', d.title === '아레나', d.title);
    chk('«레벨» → «제한 시간» 30초', d.lvL === '제한 시간' && d.floor === '30초', `${d.lvL}/${d.floor}`);
    chk('«보상» → «전적» 0승 0패', d.rwL === '전적' && d.amt === '0승 0패', `${d.rwL}/${d.amt}`);
    chk('◀▶ 비활성 (옮겨 갈 곳 없음)', d.prev && d.next, `${d.prev}/${d.next}`);

    /* ---------- 4. 입장 = 1:1 대전 (지시 ④) ---------- */
    console.log('[4] «도전» → 아레나 입장 (상대 닉네임 · HP 바 · 30초 타이머)');
    await click(page, '#dgdGo');
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => {
      const app = document.getElementById('app'), A = app.getBoundingClientRect();
      const vis = (id) => { const e = document.getElementById(id); const r = e && e.getBoundingClientRect(); return !!(r && r.width); };
      const inFrame = (id) => { const e = document.getElementById(id); if (!e) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.top >= A.top - 1.5 && r.bottom <= A.bottom + 1.5
            && r.left >= A.left - 1.5 && r.right <= A.right + 1.5; };
      return {
        on: !!arena, cls: document.getElementById('app').className,
        foes: enemies.filter((e) => e.arena).length,
        tk: (enemies.find((e) => e.arena) || {}).tk,
        atlas: ((enemies.find((e) => e.arena) || {}).T || {}).atlas,
        tint: !!(enemies.find((e) => e.arena) || {}).tint,
        nmL: document.getElementById('arnNmL').textContent,
        nmR: document.getElementById('arnNmR').textContent,
        tm: document.getElementById('arnTmN').textContent,
        hud: inFrame('arnHud'), hudTm: inFrame('arnTm'), out: inFrame('dunOut'),
        dunHud: vis('dunHud'), top: vis('top'), tab: vis('tabbar'),
        opCp: arena && arena.op.cp, myCp: cp(),
        opMax: arena && arena.opMax, myMax: arena && arena.myMax,
        pool: RANK_NPC.map((x) => x.n),
      };
    });
    chk('arena 상태 켜짐', st.on === true, st.on);
    chk('전장에 상대 1명만', st.foes === 1, st.foes);
    chk('상대 = 플레이어 스프라이트(knight) 특수 적', st.tk === 'arena' && st.atlas === 'knight', `${st.tk}/${st.atlas}`);
    chk('상대에 틴트가 걸려 색이 내 기사와 구분된다', st.tint === true, st.tint);
    chk('상대 닉네임이 54 랭킹 더미 풀에서 나왔다', st.pool.includes(st.nmR), st.nmR);
    chk('내 닉네임도 HUD 에 뜬다', !!st.nmL && st.nmL !== 'undefined', st.nmL);
    chk('타이머가 30초에서 내려간다', +st.tm > 0 && +st.tm <= 30, st.tm);
    chk('아레나 HUD 가 프레임 안에 보인다', st.hud && st.hudTm, `${st.hud}/${st.hudTm}`);
    chk('던전 HUD 는 안 뜬다(같은 상태를 쓰되 내용은 아레나)', st.dunHud === false, st.dunHud);
    chk('상단 HUD·탭바 숨김 + ◀ 나가기 노출', !st.top && !st.tab && st.out, `${st.top}/${st.tab}/${st.out}`);
    chk('상대 전투력 = 내 전투력 ×0.8~1.2',
      st.opCp >= st.myCp * 0.79 && st.opCp <= st.myCp * 1.21, `${st.opCp} vs ${st.myCp}`);
    chk('HP 기준값이 유한값', Number.isFinite(st.opMax) && Number.isFinite(st.myMax) && st.opMax > 0,
      `${st.opMax}/${st.myMax}`);

    /* ---------- 5. 피해 → 상대 HP 바 감소 ---------- */
    console.log('[5] 상대를 때리면 HP 바가 실제로 줄어든다');
    const w0 = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('arnHpR')).width));
    const hit = await page.evaluate(() => {
      const e = enemies.find((x) => x.arena); if (!e) return null;
      hitEnemy(e, e.max * 0.5, false, 0, 0);
      drawArnHud();
      return { hp: e.hp, max: e.max };
    });
    await page.waitForTimeout(250);
    const w1 = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('arnHpR')).width));
    chk('hitEnemy 로 상대 HP 가 줄었다', !!hit && hit.hp < hit.max, hit && `${Math.round(hit.hp)}/${Math.round(hit.max)}`);
    chk('상대 HP 바 폭이 실제로 줄었다', w1 < w0 - 5, `${Math.round(w0)} → ${Math.round(w1)}`);

    /* ---------- 6. 승리 → 결과 화면 + 보상 + 전적 ---------- */
    console.log('[6] 상대 HP 0 → 승리 결과 화면 · 보상 지급 · 전적 반영');
    const before = await page.evaluate(() => ({ gold: S.gold, dia: S.dia, w: S.arena.w, l: S.arena.l, stage: S.stage }));
    await page.evaluate(() => { const e = enemies.find((x) => x.arena); if (e) hitEnemy(e, e.max * 99, false, 0, 0); });
    await page.waitForTimeout(900);
    const win = await page.evaluate(() => ({
      on: !!arena, gold: S.gold, dia: S.dia, w: S.arena.w, l: S.arena.l, stage: S.stage,
      cls: document.getElementById('app').className,
      head: (document.querySelector('#modal.on .mhead') || {}).textContent || '',
      body: (document.querySelector('#modal.on .mbox') || {}).textContent || '',
      foes: enemies.filter((e) => e.arena).length,
      top: !!document.getElementById('top').getBoundingClientRect().width,
    }));
    chk('대전이 끝났다(arena = null)', win.on === false, win.on);
    chk('승리 결과 화면이 떴다', /아레나 승리/.test(win.head), win.head);
    chk('결과에 상대·전적이 적혀 있다', /전적/.test(win.body) && /승/.test(win.body), win.body.slice(0, 60));
    chk('승수 +1', win.w === before.w + 1 && win.l === before.l, `${win.w}승 ${win.l}패`);
    chk('보상(골드·다이아)이 실제로 지급됐다', win.gold > before.gold && win.dia > before.dia,
      `+${Math.round(win.gold - before.gold)}G +${win.dia - before.dia}💎`);
    chk('스테이지가 대전 전으로 복귀', win.stage === before.stage, `${before.stage} → ${win.stage}`);
    chk('상대가 전장에서 치워졌다', win.foes === 0, win.foes);
    chk('상단 HUD·탭바 복귀(dunrun/arn 해제)', win.top && !/\barn\b/.test(win.cls), win.cls);

    /* 카드의 전적 칸이 갱신됐는지 — 다른 화면 반영(기능 완성 규칙) */
    await page.evaluate(() => { document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on')); });
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    await click(page, '#dunSub [data-dsub="raid"]');
    await page.waitForTimeout(400);
    const rec = await page.$eval('#dunList [data-arena] .sp.tk i', (e) => e.textContent.trim());
    chk('아레나 카드의 «전적» 칸이 1-0 으로 갱신', rec === '1-0', rec);

    /* ---------- 7. 패배 · 중단 ---------- */
    console.log('[7] 패배(내 HP 0) · ◀ 나가기 중단');
    const lose = await page.evaluate(async () => {
      closeDungeon();
      startArena();
      await new Promise((r) => setTimeout(r, 400));
      const b = { w: S.arena.w, l: S.arena.l, gold: S.gold };
      /* 실제 사망 경로와 같은 상태로 만든다 — 접촉 피해로 hp 가 0 이 되면 dead 가 함께 켜진다.
         hp 만 0 으로 두면 다음 프레임의 체력 재생이 곧바로 되살려 재현이 안 된다. */
      player.hp = 0; player.dead = 2.4;
      await new Promise((r) => setTimeout(r, 700));
      return { b, on: !!arena, w: S.arena.w, l: S.arena.l, gold: S.gold,
               head: (document.querySelector('#modal.on .mhead') || {}).textContent || '',
               def: document.getElementById('defw').classList.contains('on') };
    });
    chk('내 HP 0 → 아레나 패배로 끝난다', lose.on === false && lose.l === lose.b.l + 1, `${lose.w}승 ${lose.l}패`);
    chk('패배 결과 화면이 떴다', /아레나 패배/.test(lose.head), lose.head);
    chk('18 패배 화면이 겹쳐 뜨지 않는다', lose.def === false, lose.def);
    chk('패배에도 위로 보상이 지급된다', lose.gold > lose.b.gold, `+${Math.round(lose.gold - lose.b.gold)}G`);

    const quit = await page.evaluate(async () => {
      document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on'));
      closeDungeon();
      startArena();
      await new Promise((r) => setTimeout(r, 400));
      const b = { w: S.arena.w, l: S.arena.l, gold: S.gold };
      document.getElementById('dunOut').click();
      await new Promise((r) => setTimeout(r, 500));
      return { b, on: !!arena, w: S.arena.w, l: S.arena.l, gold: S.gold,
               cls: document.getElementById('app').className,
               top: !!document.getElementById('top').getBoundingClientRect().width };
    });
    chk('◀ 나가기 → 대전 중단', quit.on === false, quit.on);
    chk('중단은 전적에 안 들어간다', quit.w === quit.b.w && quit.l === quit.b.l, `${quit.w}승 ${quit.l}패`);
    chk('중단은 보상도 없다', quit.gold === quit.b.gold, `${Math.round(quit.gold)} vs ${Math.round(quit.b.gold)}`);
    chk('중단 후 기본 화면 복귀', quit.top && !/\barn\b/.test(quit.cls), quit.cls);

    /* ---------- 8. 다른 전투와 겹치지 않는다 ---------- */
    console.log('[8] 아레나 중에는 던전·측정장에 못 들어간다');
    const excl = await page.evaluate(async () => {
      closeDungeon(); startArena();
      await new Promise((r) => setTimeout(r, 300));
      startDunRun(DUNGEONS[0], 1);
      startRaid(RAIDS[0]);
      const out = { arena: !!arena, dun: !!dunRun, raid: !!raidOn };
      endArena(null);
      await new Promise((r) => setTimeout(r, 300));
      return out;
    });
    chk('아레나 중 던전 런이 시작되지 않는다', excl.arena && !excl.dun, JSON.stringify(excl));
    chk('아레나 중 측정장이 시작되지 않는다', excl.arena && !excl.raid, JSON.stringify(excl));

    /* ---------- 9. 콘솔 에러 / NaN ---------- */
    console.log('[9] 콘솔 에러 · NaN/undefined');
    const bad = await page.evaluate(() => {
      const t = document.body.innerText || '';
      const m = t.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
      return m ? m[0] : null;
    });
    chk('화면 텍스트에 NaN/undefined/Infinity 없음', !bad, bad);
    chk('콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));

    /* ---------- 10. 구 세이브 로드 (지시 ②) ---------- */
    console.log('[10] 구 세이브 — r30·r120 기록이 정리되고 r60 만 이월');
    {
      const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const p2 = await c2.newPage();
      const e2 = [];
      p2.on('console', (m) => { if (m.type() === 'error') e2.push(m.text()); });
      p2.on('pageerror', (e) => e2.push(String(e.message || e)));
      await p2.addInitScript(() => {
        /* 구 세이브 흉내 — 폐기된 측정장 2종의 기록 + arena 키 없음 */
        localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
          gold: 12345, dia: 678, stage: 30, best: 30,
          raidBest: { r60: { dmg: 1e6, dps: 2e4 }, r30: { dmg: 5e5, dps: 1e4 }, r120: { dmg: 9e6, dps: 3e4 } },
        }));
      });
      await p2.goto(URL, { waitUntil: 'load' });
      await p2.waitForTimeout(900);
      const got = await p2.evaluate(() => ({
        keys: Object.keys(S.raidBest || {}),
        r60: S.raidBest && S.raidBest.r60 && S.raidBest.r60.dps,
        arena: S.arena, gold: S.gold,
        bad: /\bNaN\b|\bundefined\b/.test(document.body.innerText || ''),
      }));
      chk('r60 기록만 남는다', got.keys.length === 1 && got.keys[0] === 'r60', JSON.stringify(got.keys));
      chk('r60 최고 DPS 는 그대로 이월', got.r60 === 2e4, got.r60);
      chk('arena 키가 없던 세이브도 0승 0패로 채워진다',
        !!got.arena && got.arena.w === 0 && got.arena.l === 0, JSON.stringify(got.arena));
      chk('구 세이브 값(골드)은 그대로', got.gold === 12345, got.gold);
      chk('구 세이브 로드에 NaN/에러 없음', !got.bad && e2.length === 0, `${got.bad} ${e2.slice(0, 1)}`);
      await c2.close();
    }
  } catch (e) {
    fails.push('CRASH: ' + (e.message || e));
    console.log('  ✗ CRASH ' + (e.message || e));
  }
  await browser.close();
  console.log(fails.length ? `\nVERIFY123 FAIL — ${fails.length}/${n}` : `\nVERIFY123 PASS ${n}/${n}`);
  process.exit(fails.length ? 1 : 0);
})();
