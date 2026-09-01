/* 작업 665 재현 프로브 — «모드 전환 오판정»
 *
 *   node tools/probe665.js            (기본: «열어 본» 사본 + 현행 main 둘 다)
 *   node tools/probe665.js --open     («열어 본» 사본만)
 *   node tools/probe665.js --now      (현행 main 만 — 가드가 살아 있는 상태)
 *
 * 주인 원문(2026-09-02 00:35): «그냥 그 스테이지 도전하다가 던전, 승급전 도전 가능하게 해주기.
 * 근데 원래 그거 막은 이유가 — 스테이지 보스전하다가 던전 도전하면 갑자기 스테이지 클리어 되고,
 * 승급전 도전중에 던전 도전하면 승급전 클리어 되고 그런 류의 버그가 있었음.»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **차단을 풀면 무엇이 어떻게 터지는가를 먼저 보는**
 * 자리다(338 규칙 — 처방을 따르기 전에 재현한다. 338·341 은 여기서 등재문 가설이 기각됐다).
 *
 * 방법: `index.html` 을 그대로 두고, **입장 가드만 무력화한 사본**(`--open`)을 임시 파일로 만들어
 * «주인 지시대로 그냥 열었을 때» 의 그림을 찍는다. 옛 거동을 추측하지 않고 지금 트리에서 만든다.
 *
 * 교차 행렬: {스테이지 몹 · 스테이지 보스전 · 격파 시퀀스 · 승급전 · 던전 · 탑} × {던전 · 승급전 · 탑}
 * 각 칸에서 진입 직후 4초를 굴리고 네 가지를 센다(등재문의 게이트 축 그대로):
 *   ① 이전 모드 «클리어/실패» 오판정 — S.stage · S.rank · S.dun · S.tower 가 진입만으로 움직였나
 *   ② 새 모드 정상 개시 — bossMode() 가 목표 모드인가
 *   ③ 이전 모드 상태 온전 — 스테이지 번호가 보존되는가
 *   ④ 보상 이중 지급 — 진입만으로 재화가 늘었나
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const ARG = process.argv.slice(2);
const WANT_OPEN = ARG.includes('--open') || !ARG.includes('--now');
const WANT_NOW = ARG.includes('--now') || !ARG.includes('--open');

/* 가드 무력화 — «지시대로 그냥 연다» 를 소스에서 만든다.
   ⚠ 문자열이 안 잡히면 그 자체를 빨강으로 보고한다(수리가 자리를 옮기면 여기가 먼저 말한다). */
function openedCopy() {
  const src = fs.readFileSync(SRC, 'utf8');
  const pats = [
    /* startDunRun · startPromo — 665 가 여는 두 입구 */
    [/if\(battleBusy\(\)\) return;\s*\/\* 453 — 123 의 «셋만 보던» 가드를 단일 판정으로 갈았다\(승급전·스테이지 보스전 포함\) \*\//,
      '/* probe665 --open: 가드 제거 */'],
    [/if\(battleBusy\(\)\) return;\n(\s*)enemies\.length = 0; spawnQ\.length = 0;\n(\s*)\/\* ⚑ 285/,
      '/* probe665 --open: 가드 제거 */\n$1enemies.length = 0; spawnQ.length = 0;\n$2/* ⚑ 285'],
    /* 665 수리 뒤의 이름 — 락을 통째로 걷어낸다(«전부 열었을 때» 도 안전한가를 같은 표로 본다).
       ⚠ 뒤따르는 `leaveStageRun()` 은 남겨 둔다. 지우면 «명시 종료» 라는 처방 자체가 빠진 사본이 된다. */
    [/if\(battleLocked\(\)\) return;/g, '/* probe665 --open: 가드 제거 */'],
  ];
  let out = src, hit = 0;
  for (const [re, rep] of pats) { if (re.test(out)) { out = out.replace(re, rep); hit++; } }
  const tmp = path.join(os.tmpdir(), 'probe665-open.html');
  fs.writeFileSync(tmp, out);
  return { tmp, hit };
}

/* 행렬 — [이전 모드, 새 모드] */
const CELLS = [
  ['stageMob', 'dun'], ['stageMob', 'promo'], ['stageMob', 'tower'],
  ['stageBoss', 'dun'], ['stageBoss', 'promo'], ['stageBoss', 'tower'],
  ['stageIntro', 'dun'], ['stageIntro', 'promo'],
  ['stageClr', 'dun'], ['stageClr', 'promo'],
  ['promo', 'dun'], ['promo', 'tower'],
  ['dun', 'promo'], ['dun', 'dun'],
  ['tower', 'promo'],
];

async function sweep(url, tag) {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(url);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계(161 교훈 · probe458 과 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const rows = [];
  for (const [from, to] of CELLS) {
    /* eslint-disable no-undef */
    const r = await ev(([from, to]) => {
      const DT = 1 / 60;
      /* ⚠ 자가 흔들리지 않게 **플레이어를 죽지 않게** 고정한다 — 죽으면 `playerDied()` 가 그 모드를
         실패로 끝내 «세우기» 자체가 랜덤으로 무너진다(1회차에 실제로 그랬다: 같은 칸이 사본에서는
         서고 현행에서는 안 섰다). 판정·보상 경로는 한 줄도 안 건드린다. */
      const tick = (sec) => {
        for (let i = 0; i < Math.round(sec / DT); i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); }
      };
      const dg = DUNGEONS[0], dg2 = DUNGEONS[1];

      /* ---- 공통 준비 ---- */
      localStorage.clear();
      Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 99999; S.gold = 99999;
      for (const d of DUNGEONS) S.dunTk[d.id] = 9;
      for (const t of TOWERS) S.dunTk[t.id] = 9;
      arena = null; raidOn = null; promo = null;
      if (dunRun) endDunRun(false, true);
      spawnStage();
      document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach((el) => el.classList.remove('on'));

      const toasts = [];
      const on = notify; notify = (h) => { toasts.push(String(h).replace(/<[^>]*>/g, '')); };
      const op = popup; popup = (t) => { toasts.push('[팝업]' + String(t).replace(/<[^>]*>/g, '')); };

      const enter = (md) => {
        if (md === 'dun') startDunRun(dg, (S.dun[dg.id] || 0) + 1);
        else if (md === 'dun2') startDunRun(dg2, (S.dun[dg2.id] || 0) + 1);
        else if (md === 'tower') startDunRun(TOWER, towerFloor(TOWER));
        else if (md === 'promo') startPromo();
      };

      /* ---- 이전 모드 세우기 ---- */
      let setupOk = true;
      if (from === 'stageMob') tick(0.5);
      else if (from === 'stageIntro') {
        /* 457 등장 국면 한복판 — 국면이 열린 프레임에서 멈춘다(`battleLocked` 이 이 창을 안 막는
           근거를 여기서 직접 잰다: 갈아타도 잃는 것이 없어야 한다). */
        startBoss();
        for (let i = 0; i < 900 && !bossIntro; i++) tick(DT);
        setupOk = !!bossIntro;
      }
      else if (from === 'stageBoss' || from === 'stageClr') {
        /* 스폰 딜레이 1.4s(28) + 등장 국면(457) — 길이가 아틀라스·연출에 달렸으므로 «몇 초» 로
           박지 않고 **보스가 실제로 설 때까지** 굴린다(1회차에 4초 고정이 랜덤으로 무너졌다). */
        startBoss();
        for (let i = 0; i < 900 && !(enemies.some((e) => e.tk === 'boss') && !bossIntro); i++) tick(DT);
        setupOk = bossMode() === 'stage' && enemies.some((e) => e.tk === 'boss') && !bossIntro;
        if (from === 'stageClr') {
          const b = enemies.find((e) => e.tk === 'boss');
          if (b) killEnemy(b); else setupOk = false;   /* 475 격파 시퀀스 창 안 */
          setupOk = setupOk && !!bossClear;
        }
      } else if (from === 'promo') { startPromo(); tick(2.0); setupOk = bossMode() === 'promo'; }
      /* 던전·탑도 «몇 초» 로 박지 않는다 — 보스가 서고 등장 국면이 끝나야(`dunRun.fight`) 런이
         제 시계를 굴린다(425). 4초 고정은 1회차에 랜덤으로 무너졌다(그 사이 보스를 잡아 클리어). */
      else if (from === 'dun' || from === 'tower') {
        enter(from);
        for (let i = 0; i < 900 && !(dunRun && dunRun.fight); i++) tick(DT);
        setupOk = bossMode() === 'dun' && !!dunRun && dunRun.fight && !dunRun.bossDown;
      }

      const pre = { stage: S.stage, rank: S.rank, dun: { ...S.dun }, tower: S.tower, tower2: S.tower2,
                    gold: S.gold, dia: S.dia, md: bossMode(), tk: { ...S.dunTk } };
      toasts.length = 0;

      /* ---- 갈아타기 ----
         ⚠ 오판정 창은 **0.2초**다. 4초를 굴린 뒤에 재면 그 사이의 정상 전투 수입(잡몹 골드)·정상
            클리어(탑 1레벨은 4초에 잡힌다)가 «오판정» 으로 읽힌다 — 1회차 표가 그래서 빨갰다.
            «전환 순간의 오판정» 이 이 작업의 축이므로 창은 전환 직후여야 한다. */
      enter(to === 'dun' && from === 'dun' ? 'dun2' : to);
      const mdAfter = bossMode();
      tick(0.2);

      const post = { stage: S.stage, rank: S.rank, dun: { ...S.dun }, tower: S.tower, tower2: S.tower2,
                     gold: S.gold, dia: S.dia, md: bossMode() };
      tick(3.0);                                       /* 새 모드가 실제로 굴러가는지(정상 개시) */
      const late = bossMode();
      notify = on; popup = op;

      const dunUp = Object.keys(post.dun).filter((k) => (post.dun[k] || 0) > (pre.dun[k] || 0));
      return {
        setupOk, preMd: pre.md, entered: mdAfter, endMd: late,
        dStage: post.stage - pre.stage, dRank: post.rank - pre.rank,
        dunUp, dTower: (post.tower - pre.tower) + (post.tower2 - pre.tower2),
        dGold: Math.round(post.gold - pre.gold), dDia: post.dia - pre.dia,
        toasts: toasts.slice(0, 4),
      };
    }, [from, to]);
    /* eslint-enable no-undef */
    rows.push({ from, to, r });
  }
  await browser.close();
  return { rows, errs, tag };
}

function report(res) {
  const { rows, errs, tag } = res;
  console.log('\n===== ' + tag + ' =====');
  console.log('이전모드 → 새모드   | 세움 | 진입후 mode | Δstage Δrank Δ던전 Δ탑 | Δgold  Δdia | 판정');
  let bad = 0;
  for (const { from, to, r } of rows) {
    if (r.__err) { console.log(pad(from + ' → ' + to, 20) + '| ⚠ ' + r.__err); bad++; continue; }
    /* 이중 지급·오판정 축 — 다이아·계급·던전·탑 진행은 «전환만으로» 절대 안 움직인다.
       ⚠ 골드는 축이 아니다: 전환 창 0.2초에도 잡몹 킬 골드가 들어온다(참고값으로만 찍는다). */
    const blocked = r.entered === r.preMd;
    /* 격파 시퀀스(475) 창에서 갈아탄 칸의 기대값은 «클리어가 보존된다» = Δstage +1 이다.
       0 이면 이미 이긴 판이 증발한 것(보상 손실) — 오판정과 같은 급의 결손이다. */
    const clrLost = from === 'stageClr' && !blocked && r.dStage !== 1;
    const mis = (r.dRank !== 0) || (r.dunUp.length > 0) || (r.dTower !== 0) || (r.dDia !== 0)
      || (from !== 'stageClr' && r.dStage !== 0) || clrLost;
    const verdict = !r.setupOk ? '세우기 실패'
      : clrLost ? '🔴 클리어 증발' : mis ? '🔴 오판정' : blocked ? '차단됨' : '초록';
    if (mis || !r.setupOk) bad++;
    console.log(pad(from + ' → ' + to, 20) + '| ' + (r.setupOk ? ' o  ' : ' x  ') + ' | '
      + pad(r.preMd + '→' + r.entered, 12) + '| '
      + pad(String(r.dStage), 7) + pad(String(r.dRank), 6) + pad(r.dunUp.join(',') || '-', 7) + pad(String(r.dTower), 4)
      + '| ' + pad(String(r.dGold), 7) + pad(String(r.dDia), 5) + '| ' + verdict);
    if (mis && r.toasts.length) console.log(' '.repeat(22) + '↳ ' + r.toasts.join(' / '));
  }
  if (errs.length) console.log('콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  console.log('요약 — 오판정·세우기 실패 ' + bad + '칸 / ' + rows.length + '칸');
  return bad;
}
const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);

(async () => {
  let bad = 0;
  if (WANT_OPEN) {
    const { tmp, hit } = openedCopy();
    if (!hit) { console.log('⚠ 가드 문자열을 하나도 못 찾았다 — 자리가 옮겨졌다. 패턴을 갱신할 것.'); process.exitCode = 2; }
    else bad += report(await sweep('file://' + tmp, '① 가드를 «그냥 열어 본» 사본 (치환 ' + hit + '건)'));
  }
  if (WANT_NOW) bad += report(await sweep('file://' + SRC, '② 현행 index.html'));
  console.log('\nprobe665 — 재현 자다(합격/불합격이 아니라 «무엇이 어떻게 어긋나는가» 를 본다).');
})().catch((e) => { console.error(e); process.exit(1); });
