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
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* 247 — 되돌림 시험(`tools/neg247.js`)이 «한 곳만 갈아 끼운 사본» 을 물릴 수 있게 열어 둔다.
   살아 있는 페이지에 주입하면 거짓 초록이 난다(LESSONS 191) — 반드시 «파일을 새로 연다». */
const URL = 'file://' + path.resolve(process.env.V123_SRC || path.join(__dirname, '..', 'index.html')).replace(/\\/g, '/');

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
  try { browser = await launch(chromium, ARGS); }
  catch (e) { browser = await launch(chromium, Object.assign({}, launchOpts(), ARGS)); }
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
    /* 209(2026-08-27, 주인 지시) — «탑» 칸이 3번째로 들어왔다. 123 이 지키려던 것은 «칸 개수» 가
       아니라 ««레이드» 라벨이 사라지고 «컨텐츠» 가 그 자리에 있다» 이므로 개수는 컨텐츠·던전이
       **둘 다 살아 있는지**로만 묻는다(LESSONS 194-4). */
    chk('서브탭에 컨텐츠 · 던전이 그대로 있다 (+209 탑)',
      ['raid', 'dun'].every((k) => tabs.some((t) => t.k === k)) && tabs.length === 3, JSON.stringify(tabs));
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
    /* 215 (2026-08-27) — 이 단언은 «세부 팝업 대신 «모달» 안내가 뜨나» 를 묻고 있었다.
       149(주인 지시)가 «부족·잠김 같은 한 줄 안내는 팝업이 아니라 토스트» 로 뒤집은 뒤라
       `.modal.on` 은 원리적으로 항상 false 다(게이트 부패 — got "false/").
       LESSONS 185-④ «설계가 뒤집힌 단언은 지우지 말고 이사시켜라» 대로 묻는 것(«세부 팝업이
       안 열리고, 화면이 해금 조건을 말하는가»)은 그대로 두고 재는 자리만 `.modal` → `.fx-toast` 로 옮긴다.
       처방·실측 근거는 213 이 `fnchk97` [5] 에서 이미 세워 뒀다(`docs/review/213-레이드기록알약침범.md` §2).
       · 기대 문구를 리터럴로 박지 않는다(185-①) — `ARENA.open` 에서 런타임 계산한다.
         (숫자만 세면 안내문의 «현재 n» 에 걸리므로 「스테이지 <필요값>」 으로 본다.)
       · 대기는 토스트 수명에 걸려 있다(760ms 퇴장 시작 · 1060ms 제거) → 300ms(185-⑥).
       · «모달은 안 뜬다» 를 같이 박는다 — 팝업으로 되돌아가면 그 자리에서 잡힌다. */
    const need = await page.evaluate(() => (typeof ARENA === 'object' ? ARENA.open : null));
    await click(page, '#dunList [data-arena]');
    await page.waitForTimeout(300);
    const locked = await page.evaluate(() => ({
      dgd: document.getElementById('dgdw').classList.contains('on'),
      toast: [...document.querySelectorAll('#fxl .fx-toast')].map((e) => e.textContent).join(' | '),
      modal: !!document.querySelector('.modal.on, #modal.on'),
    }));
    chk(`스테이지 미달이면 세부 팝업 대신 «해금» 안내 (149 토스트 — 스테이지 ${need} 필요)`,
      !locked.dgd && locked.toast.includes('스테이지 ' + need),
      `${locked.dgd}/${locked.toast}`);
    chk('잠금 안내는 팝업이 아니다 (149)', !locked.modal, locked.modal);
    await page.evaluate(() => {
      document.querySelectorAll('#fxl .fx-toast').forEach((e) => e.remove());
      document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on'));
    });
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
    /* 205 (2026-08-27) — 아레나에 하루 3회 제한이 생겼다. 이 게이트는 한 세션에서 4번 넘게
       들어가므로 «횟수 소진» 이 123 의 단언을 대신 깨뜨린다(게이트가 남의 규칙에 걸려 빨개지는 꼴).
       205 의 횟수 규칙은 `tools/verify205.js` 가 따로 지키므로 여기서는 **매 입장 직전에 무료분을
       채워 두고** 123 이 원래 묻던 것(대전 진행·보상·전적)만 본다. */
    await page.evaluate(() => { S.daily.arena = ARENA_TRY; renderArenaDetail(); });
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

    /* ---------- 247 — 결과 통보 채집기 (2026-08-27) ----------------------------------
       206(주인 지시)이 아레나 결과를 **모달 → 토스트**로 내렸다(index.html `openArenaResult`
       «결과 화면 — 206(주인 지시)으로 모달에서 토스트로 내렸다»). 옛 [6]·[7] 은 `#modal.on .mhead`
       를 물어 `got ""` 로 굳어 있었다 — 제품 회귀가 아니라 **재는 자리**가 낡은 것이다
       (211·213·214·215·217·218·219·230·231 과 같은 계열 · LESSONS 231-①).
       처방도 그 계열의 세 줄 관례다: ⓐ 자리만 이사(185-④) ⓑ 기대 문구는 런타임 계산(185-①)
       ⓒ «팝업이 아니다» 동반 단언(230-③).

       ⚠ 다만 이 화면은 앞선 계열과 **한 가지가 다르다** — 클릭 한 번으로 안내가 나는 동기 흐름이
       아니라 «hitEnemy → 게임 루프 → endArena» 라 **비동기 경계**가 있다. 그런데 토스트는 스스로
       사라진다(58 — 퇴장 760ms · 소멸 1060ms). [6] 이 아레나 종료를 기다리는 900ms 뒤에 DOM 을
       읽으면 소멸까지 여유가 **160ms** 뿐이라, 고쳐 놓고도 «뜨고 지는 FAIL»(226·135 계열)을 새로
       만드는 자가 된다. 그래서 레이어에 **태어난 순간을 기록**해 시간축에서 떼어 놓는다.
       LESSONS 185-⑥ 의 취지(«놓치지 마라»)를 대기 없이 만족시키는 자다.
       비우는 것은 그대로 필요하다 — `fxToast` 는 4장부터 조용히 드롭한다(LESSONS 230-②). */
    const armToasts = () => page.evaluate(() => {
      const L = document.getElementById('fxl');
      window.__t123 = [];
      if (!window.__t123obs) {
        window.__t123obs = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((nd) => {
          if (nd.nodeType === 1 && nd.classList && nd.classList.contains('fx-toast')) window.__t123.push(nd.textContent);
        })));
        window.__t123obs.observe(L, { childList: true });
      }
      L.querySelectorAll('.fx-toast').forEach((e) => e.remove());
      document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on'));
    });
    const readToasts = () => page.evaluate(() => ({
      toast: (window.__t123 || []).join(' | '),
      modal: !!document.querySelector('#modal.on, .modal.on'),
    }));

    /* ---------- 6. 승리 → 결과 통보 + 보상 + 전적 ---------- */
    console.log('[6] 상대 HP 0 → 승리 결과 통보(206 토스트) · 보상 지급 · 전적 반영');
    const before = await page.evaluate(() => ({ gold: S.gold, dia: S.dia, w: S.arena.w, l: S.arena.l, stage: S.stage }));
    await armToasts();
    /* 기대 문구는 리터럴로 박지 않는다(185-① · 212-①) — 제품이 그 줄을 만들 때 쓰는 재료를
       그대로 게이트에서 계산한다. 상대 전투력은 **이 통보가 유일한 표시처**이므로(index.html
       `openArenaResult` 주석 · 188 «전투 수치는 fmtB») 표기 규약이 흔들리면 여기가 먼저 빨개진다. */
    const opCp = await page.evaluate(() => fmtB(arena.op.cp));
    await page.evaluate(() => { const e = enemies.find((x) => x.arena); if (e) hitEnemy(e, e.max * 99, false, 0, 0); });
    await page.waitForTimeout(900);
    const win = await page.evaluate(() => ({
      on: !!arena, gold: S.gold, dia: S.dia, w: S.arena.w, l: S.arena.l, stage: S.stage,
      cls: document.getElementById('app').className,
      foes: enemies.filter((e) => e.arena).length,
      top: !!document.getElementById('top').getBoundingClientRect().width,
    }));
    const winT = await readToasts();
    chk('대전이 끝났다(arena = null)', win.on === false, win.on);
    chk('승리 결과 통보가 떴다(206 — 모달 아닌 토스트)', /아레나 승리/.test(winT.toast), winT.toast || '(통보 없음)');
    /* 값만 «어딘가에 있나» 로 물으면 보상 숫자와 우연히 같아도 초록이다 — 라벨 바로 뒤인지를 본다
       (231-② «런타임 계산의 재료는 화면이 이미 그리고 있는 라벨»). 라벨이 사라져도 여기가 잡는다. */
    chk('승리 통보에 상대 전투력이 적혀 있다(런타임 fmtB)',
      new RegExp('상대 전투력\\s*' + opCp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(winT.toast),
      `상대 전투력 ${opCp} ⊂ ${winT.toast.slice(0, 70)}`);
    /* 206 되돌림(토스트 → 팝업)을 **이름으로** 잡는 자리다 — 이것이 없으면 문구 항목 하나만
       빨개져 «문안이 바뀌었나» 로 오진한다(LESSONS 230-③ · 214-④ · 215-② · 217-②). */
    chk('승리 통보는 팝업이 아니다(206)', winT.modal === false, winT.modal);
    chk('승수 +1', win.w === before.w + 1 && win.l === before.l, `${win.w}승 ${win.l}패`);
    chk('보상(골드·다이아)이 실제로 지급됐다', win.gold > before.gold && win.dia > before.dia,
      `+${Math.round(win.gold - before.gold)}G +${win.dia - before.dia}💎`);
    chk('스테이지가 대전 전으로 복귀', win.stage === before.stage, `${before.stage} → ${win.stage}`);
    chk('상대가 전장에서 치워졌다', win.foes === 0, win.foes);
    chk('상단 HUD·탭바 복귀(dunrun/arn 해제)', win.top && !/\barn\b/.test(win.cls), win.cls);

    /* 카드의 전적 칸이 갱신됐는지 — 다른 화면 반영(기능 완성 규칙).
       247 — 옛 «결과에 상대·전적이 적혀 있다» 는 **한 물음에 둘**이 묶여 있었고, 206 이 그 둘을
       서로 다른 화면으로 갈라 놓았다(상대 전투력 = 통보 한 줄 · 전적 = 03 던전 페이지 아레나 카드).
       그래서 «자리 이사» 도 둘로 갈랐다 — 상대는 위 토스트 단언이, **전적은 아래 이 항목**이 잰다.
       둘을 한 항목으로 되묶지 마라. 그러면 어느 화면이 죽었는지 게이트가 말하지 못한다. */
    await page.evaluate(() => { document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on')); });
    await click(page, '.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    await click(page, '#dunSub [data-dsub="raid"]');
    await page.waitForTimeout(400);
    const rec = await page.$eval('#dunList [data-arena] .sp.tk i', (e) => e.textContent.trim());
    chk('아레나 카드의 «전적» 칸이 1-0 으로 갱신', rec === '1-0', rec);

    /* ---------- 7. 패배 · 중단 ---------- */
    console.log('[7] 패배(내 HP 0) · ◀ 나가기 중단');
    await armToasts();
    const lose = await page.evaluate(async () => {
      S.daily.arena = ARENA_TRY;           /* 205 — 위 [4] 주석 참고 */
      closeDungeon();
      startArena();
      await new Promise((r) => setTimeout(r, 400));
      const b = { w: S.arena.w, l: S.arena.l, gold: S.gold };
      /* 실제 사망 경로와 같은 상태로 만든다 — 접촉 피해로 hp 가 0 이 되면 dead 가 함께 켜진다.
         hp 만 0 으로 두면 다음 프레임의 체력 재생이 곧바로 되살려 재현이 안 된다. */
      player.hp = 0; player.dead = 2.4;
      await new Promise((r) => setTimeout(r, 700));
      return { b, on: !!arena, w: S.arena.w, l: S.arena.l, gold: S.gold,
               def: document.getElementById('defw').classList.contains('on') };
    });
    const loseT = await readToasts();
    chk('내 HP 0 → 아레나 패배로 끝난다', lose.on === false && lose.l === lose.b.l + 1, `${lose.w}승 ${lose.l}패`);
    chk('패배 결과 통보가 떴다(206 — 모달 아닌 토스트)', /아레나 패배/.test(loseT.toast), loseT.toast || '(통보 없음)');
    chk('패배 통보는 팝업이 아니다(206)', loseT.modal === false, loseT.modal);
    chk('18 패배 화면이 겹쳐 뜨지 않는다', lose.def === false, lose.def);
    chk('패배에도 위로 보상이 지급된다', lose.gold > lose.b.gold, `+${Math.round(lose.gold - lose.b.gold)}G`);

    /* 247 — 안내를 재는 절에는 «그 안내가 지키려던 상태 불변식» 을 짝으로 붙인다(LESSONS 231-③).
       여기서는 반대 방향이다: 중단(`endArena(null)`)은 전적·보상이 없듯 **결과 통보도 없어야** 한다.
       승/패 통보만 물으면 «중단인데도 승리라고 알리는» 회귀를 아무도 말해 주지 않는다. */
    await armToasts();
    const quit = await page.evaluate(async () => {
      S.daily.arena = ARENA_TRY;           /* 205 — 위 [4] 주석 참고 */
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
    const quitT = await readToasts();
    chk('◀ 나가기 → 대전 중단', quit.on === false, quit.on);
    chk('중단은 승/패 결과 통보를 내지 않는다', !/아레나 (승리|패배)/.test(quitT.toast), quitT.toast || '(통보 없음)');
    chk('중단은 전적에 안 들어간다', quit.w === quit.b.w && quit.l === quit.b.l, `${quit.w}승 ${quit.l}패`);
    chk('중단은 보상도 없다', quit.gold === quit.b.gold, `${Math.round(quit.gold)} vs ${Math.round(quit.b.gold)}`);
    chk('중단 후 기본 화면 복귀', quit.top && !/\barn\b/.test(quit.cls), quit.cls);

    /* ---------- 8. 다른 전투와 겹치지 않는다 ---------- */
    console.log('[8] 아레나 중에는 던전·측정장에 못 들어간다');
    const excl = await page.evaluate(async () => {
      S.daily.arena = ARENA_TRY;           /* 205 */
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
        /* 618 — 프레임 시계 고정. 이 절이 묻는 것은 «load() 가 구 세이브 값을 지키는가» 인데,
           부팅 즉시 도는 자동 전투가 아래 900ms 대기 중 첫 킬 드랍(스테이지 30 은 ~400골드 소수)을
           내면 골드 표본이 오염된다 — probe618 실측: ~850ms 에 kills 0→1 과 함께 12345 → 12783.28….
           rAF 타임스탬프를 0 으로 고정하면 제품 loop(37871)의 dt = (now-last)/1000 이 0 이라
           step(0) = 전투 정지·렌더는 그대로다. 오프라인 축은 결백(표본에 time 이 없어 offPend 자체가
           안 생긴다 — probe618 [2]). ⚠ `=== 12345` 를 범위로 무르게 풀지 마라(등재문 반려 사유) —
           아래 «킬 0» 항이 이 고정을 지킨다(고정이 빠지면 골드 항보다 먼저, 뜻이 보이게 빨개진다). */
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => raf(() => cb(0));
      });
      await p2.goto(URL, { waitUntil: 'load' });
      await p2.waitForTimeout(900);
      const got = await p2.evaluate(() => ({
        keys: Object.keys(S.raidBest || {}),
        r60: S.raidBest && S.raidBest.r60 && S.raidBest.r60.dps,
        arena: S.arena, gold: S.gold, kills: S.totalKills,
        bad: /\bNaN\b|\bundefined\b/.test(document.body.innerText || ''),
      }));
      chk('r60 기록만 남는다', got.keys.length === 1 && got.keys[0] === 'r60', JSON.stringify(got.keys));
      chk('r60 최고 DPS 는 그대로 이월', got.r60 === 2e4, got.r60);
      chk('arena 키가 없던 세이브도 0승 0패로 채워진다',
        !!got.arena && got.arena.w === 0 && got.arena.l === 0, JSON.stringify(got.arena));
      chk('골드 표본 창에 전투 수입이 안 섞였다(시계 고정 = 킬 0 — 618)', got.kills === 0, got.kills);
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
