/* 작업 851 게이트 — «캡처 하네스 셋의 퀘스트 표본이 799 등차 축 위에서 실제로 그 그림을 낸다» 를 못박는 자.
 *
 * 851 은 제품(index.html)을 **0줄** 고쳤다. 고친 것은 채점용 캡처 하네스 셋이다:
 *   `tools/cap22.js`(22 채점 캡처) · `tools/ink141.js`(수량 배지 잉크 자) · `tools/rr143.js`(코너 반경 자).
 *
 *   종전  셋 다 «진행 = `q.get() − S.quest[].base`» 시절의 표본을 들고 있었다 —
 *         SAVE 에 등비 goal 을 전제한 `base` 를 심고, 팝업을 열기 직전에 두 줄을 더 심었다
 *         (`S.quest.stage.base = S.best - 4` · `S.quest.coll.base = ownedTotal() - 5`).
 *         799(2026-09-02)가 진행을 **누적 절대값**(`questProg = q.get()`)으로 바꾸면서
 *         `base` 는 **읽는 곳이 0곳**이 됐다 ⇒ 대입은 성공하지만 아무 일도 안 일어난다.
 *   실측  그 표본으로 팝업을 열면 5행 중 **4행이 진행 100% · 초록 활성**이다
 *         (`60/60` · `50/50` · `400/400` · `3/3` · 도감만 `1/10`) — 레퍼런스(전부 회색)와 정반대다.
 *         ⚑ 등재문은 이것을 «무음 no-op» 으로 적었지만 재현은 한 겹 더 나빴다:
 *           `cap22.js` 는 71행의 자기 가드(«활성 초록 버튼이 있다»)에 걸려 **통째로 즉사**한다.
 *   지금  진행률을 만드는 축이 **카운터와 `s` 두 값**뿐이다(`goal = step × (s+1)`).
 *         셋이 같은 표본을 들고 서두가 약속한 50 / 53 / 22 / 86 / 60 % 를 낸다.
 *
 * ⚠ `base` 를 되살리는 방향으로 «고치지» 마라(799 금지 · index.html 21298 주석).
 *   §1 이 그 되돌림을 정면으로 막는다.
 *
 * 축
 *   §1  세 하네스에 `S.quest[…].base` **대입 0건**                      (되살아나면 빨강)
 *   §2  세 하네스의 표본이 **서로 같다** — 카운터 4 · 보유 종수 · `s` 다섯
 *       (주석이 «cap22.js 와 같은 세이브» 라고 약속한 그 자리다)
 *   §3  그 표본을 실제로 실어 팝업을 열면 **5행 전부 미완료**(버튼 비활성 · [모두 받기] 비활성)
 *   §4  각 행의 진행률이 **주석이 적은 값**과 같다(50 / 53.1 / 22 / 85.7 / 60 %)
 *   §R  되돌림 시험 — **옛 표본**(base 방식)을 그대로 실으면 §3 이 빨개진다
 *       (안 빨개지면 이 자가 무른 것이다 — 334 규약)
 *
 * 실행: node tools/verify851.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const FILES = ['cap22.js', 'ink141.js', 'rr143.js'];

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 하네스에서 표본을 읽는다 — 파일을 실행하지 않고 소스에서 뽑는다(브라우저 셋을 더 띄우지 않기 위해서다). */
function sample(src) {
  const num = (k) => { const m = src.match(new RegExp('\\b' + k + ':\\s*(-?\\d+)')); return m ? +m[1] : null; };
  const s = (id) => { const m = src.match(new RegExp(id + ':\\s*\\{\\s*s:\\s*(\\d+)')); return m ? +m[1] : null; };
  const ownBlk = src.match(/own:\s*\{[\s\S]*?\n\s*(?:quest|\})/);
  const own = ownBlk ? (ownBlk[0].match(/\b[a-z][a-z0-9_]*:\s*\{\s*n:/g) || []).length : 0;
  return {
    totalKills: num('totalKills'), best: num('best'), summons: num('summons'), upgrades: num('upgrades'),
    own,
    s: { summon: s('summon'), upg: s('upg'), kill: s('kill'), stage: s('stage'), coll: s('coll') }
  };
}

/* 한 표본을 실어 «업적» 탭 5행의 상태를 읽는다. 하네스 셋이 하는 것과 같은 순서다. */
async function shoot(browser, save, freeze) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate((fz) => {
    window.step = () => {};
    if (fz) { S.totalKills = fz[0]; S.best = fz[1]; S.summons = fz[2]; S.upgrades = fz[3]; }
    else { S.quest.stage.base = S.best - 4; S.quest.coll.base = Math.max(0, ownedTotal() - 5); }
    save();
  }, freeze);
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => ({
    tab: (document.querySelector('.qs-tg b.on') || {}).dataset && document.querySelector('.qs-tg b.on').dataset.t,
    rows: [...document.querySelectorAll('.qs-r')].map((r) => ({
      t: r.querySelector('.qs-t').textContent,
      p: r.querySelector('.qs-p b').textContent,
      w: parseFloat(r.querySelector('.qs-p i').style.width),
      dis: r.querySelector('.qs-b').disabled
    })),
    all: document.getElementById('qAll').disabled
  }));
  await ctx.close();
  return st;
}

/* 하네스가 지금 들고 있는 표본을 그대로 쓴다 — 여기에 손으로 다시 적으면 값이 두 곳에 살아 갈라진다
   (211·289 가 그 병이다). cap22.js 를 «진실 공급원» 으로 삼고 §2 가 나머지 둘을 그것과 맞춘다. */
const SRC = FILES.map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8'));
const SAMPLE = sample(SRC[0]);
const SAVE_NEW = {
  totalKills: SAMPLE.totalKills, best: SAMPLE.best, summons: SAMPLE.summons, upgrades: SAMPLE.upgrades,
  gold: 5e7, dia: 12000,
  own: { slash: { n:0, l:1 }, shuri: { n:0, l:1 }, stone: { n:0, l:1 },
         curve: { n:0, l:1 }, multi: { n:0, l:1 }, orbit: { n:0, l:1 } },
  quest: { summon: { s: SAMPLE.s.summon }, upg: { s: SAMPLE.s.upg }, kill: { s: SAMPLE.s.kill },
           stage: { s: SAMPLE.s.stage }, coll: { s: SAMPLE.s.coll } }
};
/* §R 이 쓰는 **옛 표본** — 851 이전 세 파일에 그대로 있던 값이다(git 없이도 되돌림을 물을 수 있게 박아 둔다) */
const SAVE_OLD = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 }, upg: { s: 4, base: 3000 - 70 }, kill: { s: 3, base: 1000 - 50 },
    stage: { s: 2, base: 0 }, coll: { s: 1, base: 0 }
  }
};
/* 주석이 약속한 진행률 — 행 순서는 렌더 순서(소환·강화·처치·스테이지·도감)다 */
const WANT = [
  { id: 'summon', p: '15/30',  w: 50.0 },
  { id: 'upg',    p: '69/130', w: 53.1 },
  { id: 'kill',   p: '44/200', w: 22.0 },
  { id: 'stage',  p: '6/7',    w: 85.7 },
  { id: 'coll',   p: '6/10',   w: 60.0 }
];

(async () => {
  console.log('\n작업 851 — 캡처 하네스 셋의 퀘스트 표본 (799 등차 축)\n');

  console.log('§1 죽은 기준선(`S.quest[].base`) 대입이 되살아나지 않았다');
  FILES.forEach((f, i) => {
    const hits = (SRC[i].match(/S\.quest[^\n]*\.base\s*=/g) || []).length;
    ok(hits === 0, `[1-${i + 1}] ${f} — \`S.quest….base =\` 대입 ${hits}건 (0 이어야 한다 · 799 금지)`);
  });

  console.log('\n§2 셋이 같은 표본을 들고 있다 (주석 «cap22.js 와 같은 세이브» 의 실측)');
  const S0 = SAMPLE, keys = ['totalKills', 'best', 'summons', 'upgrades', 'own'];
  FILES.slice(1).forEach((f, i) => {
    const s = sample(SRC[i + 1]);
    const dk = keys.filter((k) => s[k] !== S0[k]);
    const ds = Object.keys(S0.s).filter((k) => s.s[k] !== S0.s[k]);
    ok(dk.length === 0 && ds.length === 0,
      `[2-${i + 1}] ${f} = cap22.js 표본 — 카운터·보유 종수 어긋남 ${dk.length}건${dk.length ? '(' + dk.join(',') + ')' : ''}`
      + ` · s 어긋남 ${ds.length}건${ds.length ? '(' + ds.join(',') + ')' : ''}`);
  });
  ok(S0.own === 6, `[2-own] 보유 종수 ${S0.own} 종 — coll 진행은 \`ownedTotal()\` 이라 카운터가 아니라 이 수로 심는다`);

  const browser = await launch(chromium);
  const freeze = [S0.totalKills, S0.best, S0.summons, S0.upgrades];
  const now = await shoot(browser, SAVE_NEW, freeze);

  console.log('\n§3 그 표본이 실제로 «레퍼런스와 같은 상태» 를 낸다');
  ok(now.tab === 'rep', `[3-a] 열리는 탭 = 업적(rep) — «${now.tab}»`);
  ok(now.rows.length === 5, `[3-b] 행 5개 — ${now.rows.length}개`);
  const green = now.rows.filter((r) => !r.dis);
  ok(green.length === 0, `[3-c] 활성(초록) 버튼 0개 — ${green.length}개${green.length ? ' (' + green.map((r) => r.p).join(' · ') + ')' : ''}`);
  ok(now.all === true, '[3-d] [모두 받기] 비활성 — ' + (now.all ? '비활성' : '활성'));
  ok(now.rows.every((r) => r.w > 0 && r.w < 100),
    `[3-e] 다섯 행 전부 0% 초과·100% 미만 — ${now.rows.map((r) => r.w + '%').join(' · ')}`);

  console.log('\n§4 진행률이 주석이 적은 값과 같다');
  WANT.forEach((wnt, i) => {
    const r = now.rows[i] || {};
    ok(r.p === wnt.p && Math.abs((r.w || 0) - wnt.w) <= 0.2,
      `[4-${wnt.id}] ${wnt.p} (${wnt.w}%) — 실측 «${r.p}» ${r.w}%`);
  });

  console.log('\n§R 되돌림 시험 — 옛 표본(기준선 방식)을 실으면 §3 이 빨개진다');
  const old = await shoot(browser, SAVE_OLD, null);
  const oldGreen = old.rows.filter((r) => !r.dis);
  ok(oldGreen.length > 0,
    `[R-a] 옛 표본에서 활성(초록) 버튼 ${oldGreen.length}개 — 0 이면 이 자가 무르다(334)`);
  ok(old.rows.filter((r) => r.w >= 100).length > 0,
    `[R-b] 옛 표본에서 진행 100% 행 ${old.rows.filter((r) => r.w >= 100).length}개 — ${old.rows.map((r) => r.p).join(' · ')}`);
  ok(old.all === false, `[R-c] 옛 표본에서 [모두 받기] 활성 — ${old.all ? '비활성(예상 밖)' : '활성'}`);

  await browser.close();
  console.log(`\nVERIFY851 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
