/* 작업 258 게이트 — 「04 던전 세부 팝업이 열려 있는 동안 깜빡거린다」(주인 보고 2026-08-27).
 *
 * 원인은 측정으로 확정했다(`tools/probe258*.js`):
 *   · 팝업이 열려 있는 동안 `.dgd-box` 안에서 픽셀이 바뀌는 자리는 **배너 썸네일 한 곳뿐**이고,
 *   · `__idleFrozen` 으로 121 아이들 타이머만 멈추면 던전 8종 전부 프레임간 diff 가 **0px** 이 된다.
 * 즉 «깜빡임» = `raidIdleTick` 이 배너 캔버스(`#dgdw canvas.dgd-th`)를 8fps 로 다시 칠하는 것.
 *
 * 이 게이트가 재는 것:
 *   [A] 팝업이 열려 있는 동안 배너가 **정지**한다 — 던전 8종 · 레이드 · 탑, 프레임간 픽셀 diff 0.
 *       (타이머는 켠 채로 잰다. 끄고 재면 고쳤든 안 고쳤든 0 이라 아무것도 못 잡는다.)
 *   [B] 정지시켰다고 **빈 캔버스가 되면 안 된다** — 여전히 그 몬스터가 그려져 있다(잉크 > 2000).
 *   [C] 멈춘 자리는 **기준 포즈**(`data-thf`)다 — 아이들 창이 없어 공격 사이클을 돌던 칸이
 *       «칼을 뻗은 중간 포즈» 로 굳지 않는다(probe258d: `blue_attack_3` 은 기준보다 폭 1.8배).
 *   [D] 121 회귀 — 03 행 카드는 **여전히 돈다**. 팝업을 고치면서 목록까지 멈추면 안 된다.
 *   [E] 음성항 — 옛 트리(선택자에 배너를 되돌린 사본)로 재면 [A] 가 반드시 빨개진다.
 *       사본을 저장소 루트에 두는 이유는 `assets/*` 가 상대 경로라서다(169·59·74 선례).
 *
 * 실행: node tools/verify258.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC;
const NEG = path.join(ROOT, '__neg258.html');

let pass = 0, fail = 0;
const ok = (t, d) => { pass++; console.log(`PASS ${t}${d ? ' — ' + d : ''}`); };
const no = (t, d) => { fail++; console.log(`FAIL ${t}${d ? ' — ' + d : ''}`); };
const chk = (c, t, d) => (c ? ok : no)(t, d);

const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

/* 배너 캔버스 한 장의 «화면 상태» — 픽셀 서명 + 잉크 + 지금 그린 프레임.
   스크린샷 대신 캔버스 픽셀을 직접 읽는다(72/97 선례). 서명은 32비트 롤링 해시라
   한 픽셀만 달라도 값이 바뀐다 — «정지했는가» 판정에 딱 맞다. */
const SNAP = () => {
  const cv = document.getElementById('dgdTh'), bn = document.getElementById('dgdBn');
  if (!bn.classList.contains('th-on')) return { on: false };
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let h = 2166136261, ink = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 8) ink++;
    h ^= d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3] * 11;
    h = Math.imul(h, 16777619);
  }
  return { on: true, sig: h >>> 0, ink, fr: cv._fr || '', thf: cv.dataset.thf || '', thi: cv.dataset.thi || '' };
};

async function boot(b, url) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url || URL);
  await p.waitForTimeout(1200);
  await p.evaluate(SEED);
  await p.evaluate(() => { openDungeon(); });
  await p.waitForTimeout(700);
  return { ctx, p, errs };
}

/* 팝업을 연 뒤 N 회 표본을 떠서 «서명이 몇 번 바뀌는가» 를 센다.
   ⚠ 표본 간격은 아이들 1프레임(125ms)보다 넉넉히 길어야 한다 — 짧으면 안 고쳐도 0 이 나온다. */
async function still(p, open, n = 8, gap = 160) {
  await p.evaluate(() => { window.__idleFrozen = false; });   /* 타이머는 켠 채로 잰다 */
  await p.evaluate(open);
  await p.waitForTimeout(900);
  const s = [];
  for (let i = 0; i < n; i++) { s.push(await p.evaluate(SNAP)); await p.waitForTimeout(gap); }
  const on = s.filter(x => x.on).length;
  const sigs = new Set(s.filter(x => x.on).map(x => x.sig));
  const frs = new Set(s.filter(x => x.on).map(x => x.fr));
  return { n: s.length, on, uniq: sigs.size, frs: [...frs], ink: s[0] && s[0].ink, first: s[0] || {} };
}

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* ================= [A]·[B]·[C] 던전 8종 + 레이드 + 탑 ================= */
  {
    const { ctx, p, errs } = await boot(b);
    const ids = await p.evaluate(() => DUNGEONS.map(d => d.id));
    chk(ids.length >= 8, `A0 던전 목록 ${ids.length}종`, ids.join(','));

    let stillN = 0, drawnN = 0, baseN = 0, note = '';
    for (const id of ids) {
      const r = await still(p, `(() => { closeDunDetail(); openDunDetail(DUNGEONS.find(d => d.id === '${id}')); })()`);
      if (r.on === r.n && r.uniq === 1) stillN++;
      else if (!note) note = `${id}: 표본 ${r.n} 중 켜짐 ${r.on} · 서로 다른 그림 ${r.uniq}장 (${r.frs.join('/')})`;
      if (r.ink > 2000) drawnN++;
      if (r.first.fr && r.first.fr === r.first.thf) baseN++;
      else if (!note) note = `${id}: 멈춘 프레임 ${r.first.fr} ≠ 기준 포즈 ${r.first.thf}`;
    }
    chk(stillN === ids.length, `A1 던전 ${ids.length}종 — 팝업이 열려 있는 동안 배너가 정지(프레임간 diff 0)`,
      `${stillN}/${ids.length}${note ? ' — ' + note : ''}`);
    chk(drawnN === ids.length, `B1 던전 ${ids.length}종 — 정지해도 스프라이트는 그려져 있다(잉크 > 2000)`, `${drawnN}/${ids.length}`);
    chk(baseN === ids.length, `C1 던전 ${ids.length}종 — 멈춘 자리가 기준 포즈(data-thf)`, `${baseN}/${ids.length}`);

    /* 레이드(46·123) — 측정장 보스도 같은 배너를 쓴다 */
    const rd = await still(p, `(() => { closeDunDetail(); openRaidDetail(RAIDS[0]); })()`).catch(() => null);
    chk(rd && rd.on === rd.n && rd.uniq === 1, 'A2 레이드 세부 — 배너 정지',
      rd ? `켜짐 ${rd.on}/${rd.n} · 그림 ${rd.uniq}장` : '못 염');

    /* 탑(209·210) */
    const tw = await p.evaluate(() => typeof openTowerDetail === 'function' && typeof TOWER !== 'undefined');
    if (tw) {
      const t = await still(p, `(() => { closeDunDetail(); openTowerDetail(TOWER.id); })()`);
      chk(t.on === t.n && t.uniq === 1, 'A3 시련의 탑 세부 — 배너 정지', `켜짐 ${t.on}/${t.n} · 그림 ${t.uniq}장`);
    } else no('A3 시련의 탑 세부 — 배너 정지', 'openTowerDetail/TOWER 없음');

    chk(errs.length === 0, 'A9 콘솔·런타임 에러 0', `${errs.length}건 ${errs.slice(0, 2).join(' / ')}`);
    await ctx.close();
  }

  /* ================= [D] 121 회귀 — 03 행 카드는 여전히 돈다 ================= */
  {
    const { ctx, p, errs } = await boot(b);
    await p.evaluate(() => { window.__idleFrozen = false; closeDunDetail(); });
    await p.waitForFunction(() => {
      const cs = [...document.querySelectorAll('#dunList canvas.thcv')];
      return cs.length >= 6 && cs.every(c => c._fr);
    }, null, { timeout: 8000 }).catch(() => {});
    const seen = await p.evaluate(async () => {
      /* 잠금 카드는 121 지시 ④ 로 «정지» 가 정답이다 — 회귀 표본에서 뺀다 */
      const cs = [...document.querySelectorAll('#dunList canvas.thcv')]
        .filter(c => c.dataset.thi && !c.closest('.dnc.lkd') && c.offsetParent);
      const sets = cs.map(() => new Set());
      for (let i = 0; i < 14; i++) {
        cs.forEach((c, k) => sets[k].add(c._fr));
        await new Promise(r => setTimeout(r, 130));
      }
      return { cards: cs.length, moving: sets.filter(s => s.size > 1).length };
    });
    chk(seen.cards > 0 && seen.moving === seen.cards,
      'D1 121 회귀 — 03 행 카드는 여전히 아이들이 돈다', `${seen.moving}/${seen.cards}장이 프레임을 바꿨다`);
    chk(errs.length === 0, 'D9 콘솔·런타임 에러 0', `${errs.length}건`);
    await ctx.close();
  }

  /* ================= [E] 음성항 — 옛 트리로 되돌리면 빨개진다 ================= */
  {
    const src = fs.readFileSync(SRC, 'utf8');
    /* ⚠ 선택자만으로 찾으면 안 된다 — `#dunList canvas.thcv` 는 이 파일에 두 군데 있고(썸네일 재도색
       예산을 재는 함수가 먼저 나온다) 첫 번째를 갈아 끼우면 **아이들 타이머는 그대로**라 음성항이
       거짓 통과한다(실제로 한 번 그렇게 통과했다). 꼬리 주석까지 붙여 라인을 특정한다. */
    const NEEDLE = "document.querySelectorAll('#dunList canvas.thcv').forEach(cv => {   /* 258 — 배너(`.dgd-th`) 제외 */";
    chk(src.includes(NEEDLE), 'E0 음성항 사본 — 아이들 선택자 라인을 찾았다', '258 주석이 붙은 forEach');
    /* 258 이전 트리 = 선택자에 배너를 되돌리고, `data-thi` 도 다시 채운다(둘 다 있어야 옛 거동이다) */
    const old = src
      .replace(NEEDLE, "document.querySelectorAll('#dunList canvas.thcv, #dgdw canvas.dgd-th').forEach(cv => {")
      .replace("cv.dataset.thi  = '';", "cv.dataset.thi  = u.thi || '';");
    chk(old !== src && !old.includes(NEEDLE) && old.includes("cv.dataset.thi  = u.thi"),
      'E0b 음성항 사본 — 두 자리를 모두 되돌렸다');
    fs.writeFileSync(NEG, old);
    try {
      const { ctx, p } = await boot(b, 'file://' + NEG);
      const r = await still(p, `(() => { closeDunDetail(); openDunDetail(DUNGEONS[0]); })()`);
      chk(r.uniq > 1, 'E1 음성항 — 옛 트리에서는 배너가 8fps 로 다시 칠해진다(깜빡임 재현)',
        `표본 ${r.on}장 중 서로 다른 그림 ${r.uniq}장`);
      await ctx.close();
    } finally { try { fs.unlinkSync(NEG); } catch (_) {} }
  }

  await b.close();
  console.log(`\nVERIFY258 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
