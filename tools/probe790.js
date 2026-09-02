#!/usr/bin/env node
/* 작업 790 — 재현 프로브: verify180 [G] 「구 세이브 gold·stage 불변 = 12345」 가
 * 12355.737(실행마다 다른 소수)로 빨간 것이 **어느 구간의 수입인가** 를 가른다(338 규칙 — 처방 전 재현).
 *
 *   node tools/probe790.js
 *
 * 등재문(790)은 «618 이 verify123 에서 고친 그 병의 형제» 라고 적었다 — 이 프로브가 그 동일성을
 * 말이 아니라 **찍힌 값**으로 못박는다. 180 의 표본은 123 의 것과 두 군데 다르다:
 *   ⓐ stage 30 이 아니라 **stage 7**(킬 드랍이 ~438 이 아니라 ~10.7) ·
 *   ⓑ 123 은 부팅만 보지만 180 [G] 는 **부팅 중에 월별 우편 1통이 지급**된다(dailyCheck 경로).
 * ⓑ 때문에 «시계를 고정하면 지급 자체가 멈추지 않는가» 가 이 자리의 고유한 위험이고,
 * [3] 이 그것을 대조로 답한다(고정 부팅에서도 우편 1통·열쇠·dia 1000 이 그대로여야 처방이 성립한다).
 *
 * 프로브 축:
 *   [1] 표본 세이브(시각 없음 · gold 12345 · stage 7)로 부팅 → 100ms 간격 12칸의
 *       (gold, totalKills) 시계열 — 골드가 오르는 프레임마다 kills 도 오르면 오염원은 전투다.
 *   [2] 오프라인 축 기각 — 표본에 time 이 없으니 offPend·팝업이 안 생겨야 한다(618 [2] 와 같은 축).
 *   [3] 처방 예행 — rAF 타임스탬프 고정(dt=0) 부팅에서 gold === 12345 · kills === 0 이면서
 *       **[G] 의 나머지 축(dia 1000 · 월별 우편 1통 · 달 열쇠)이 그대로 성립**하는가.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(path.join(__dirname, '..', 'index.html')).replace(/\\/g, '/');

let n = 0; const fails = [];
const chk = (name, cond, got) => {
  n++;
  if (cond) console.log(`  ✓ ${name}` + (got !== undefined ? ` — ${got}` : ''));
  else { fails.push(name); console.log(`  ✗ ${name}` + (got !== undefined ? ` — got ${JSON.stringify(got)}` : '')); }
};

/* verify180 [G] 가 쓰는 바로 그 표본 — 한 글자도 바꾸지 않는다(자와 같은 것을 물어야 대조가 성립한다) */
const SAVE = { gold: 12345, dia: 1000, stage: 7, best: 7, mailx: [], mailSeq: 0, mail: {} };
const KEY = 'idle_hunter_save_v4';
/* 제품과 같은 로컬 시각 규칙(212-①) — UTC 로 세면 월말 자정에 하루 어긋난다 */
const MK_JS = `(d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'))`;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* ---------- [1]·[2] 그대로 부팅 — 어디서 새는가 ---------- */
  console.log('[1] 표본 부팅 시계열 (gold · totalKills)');
  const c1 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p1 = await c1.newPage();
  await p1.addInitScript(([k, sv]) => { localStorage.setItem(k, sv); }, [KEY, JSON.stringify(SAVE)]);
  await p1.goto(URL, { waitUntil: 'load' });
  const series = [];
  for (let i = 0; i <= 12; i++) {
    series.push(await p1.evaluate(() => ({
      gold: S.gold, kills: S.totalKills,
      off: !!(typeof offPend !== 'undefined' && offPend),
      pop: !!document.querySelector('#offw.on'),
    })));
    if (i < 12) await p1.waitForTimeout(100);
  }
  series.forEach((s, i) => console.log(`    t≈${i * 100}ms gold=${s.gold} kills=${s.kills} offPend=${s.off} 팝업=${s.pop}`));
  const first = series[0], lastS = series[series.length - 1];
  chk('load 직후 표본 골드는 12345 로 시작한다(주입→load 구간은 결백)',
    first.gold === 12345 || first.kills > 0, `first gold=${first.gold} kills=${first.kills}`);
  chk('900ms 대기 끝에는 골드가 12345 를 넘는다(게이트가 본 그 오염)', lastS.gold > 12345, lastS.gold);
  chk('골드 증가는 킬 수와 같이 움직인다(늘어난 프레임마다 kills 도 늘었다)',
    series.every((s, i) => i === 0 || s.gold === series[i - 1].gold || s.kills > series[i - 1].kills),
    `kills ${first.kills} → ${lastS.kills}`);
  chk('오염량이 «몹 한 마리의 드랍» 규모다 — stage 7 이라 123(stage 30, ~438)보다 두 자리 작다',
    lastS.gold > 12345 && lastS.gold - 12345 < 200, `Δ=${lastS.gold - 12345}`);
  console.log('[2] 오프라인 축 기각');
  chk('offPend(오프라인 보류)가 전 구간 null — 시각 없는 세이브는 오프라인 정산이 없다',
    series.every((s) => !s.off), JSON.stringify(series.map((s) => s.off)));
  chk('오프라인 보상 팝업도 전 구간 닫혀 있다', series.every((s) => !s.pop));
  await c1.close();

  /* ---------- [3] 처방 예행 — rAF 시계 고정 부팅 ---------- */
  console.log('[3] 처방 예행: rAF 타임스탬프 고정(dt=0) 부팅');
  const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p2 = await c2.newPage();
  const e2 = [];
  p2.on('console', (m) => { if (m.type() === 'error') e2.push(m.text()); });
  p2.on('pageerror', (e) => e2.push(String(e.message || e)));
  await p2.addInitScript(([k, sv]) => {
    localStorage.setItem(k, sv);
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf(() => cb(0));   /* loop(now=0) → dt=0 → step(0) = 전투 정지 */
  }, [KEY, JSON.stringify(SAVE)]);
  await p2.goto(URL, { waitUntil: 'load' });
  await p2.waitForTimeout(900);
  const froze = await p2.evaluate((mkjs) => ({
    gold: S.gold, stage: S.stage, kills: S.totalKills, dia: S.dia,
    key: S.lastMonthly, mk: eval(mkjs)(new Date()),
    n: (S.mailx || []).filter(m => m.src === 'monthly').length,
  }), MK_JS);
  chk('시계 고정이면 900ms 뒤에도 골드가 정확히 12345', froze.gold === 12345, froze.gold);
  chk('시계 고정이면 킬 0 — 오염원이 전투 킬 드랍이었다는 대조 증명', froze.kills === 0, froze.kills);
  chk('stage 도 표본 그대로 7', froze.stage === 7, froze.stage);
  /* ↓ 이 세 항이 이 프로브의 존재 이유다 — 618 의 자리와 달리 여기는 «부팅 중 지급» 이 함께 있다.
     시계를 고정해도 그 지급이 멈추지 않아야 처방이 [G] 에서 쓸 수 있다. */
  chk('시계 고정이 월별 우편 지급을 멈추지 않는다 — 이번 달 1통', froze.n === 1, froze.n);
  chk('시계 고정이 달 열쇠 채움을 멈추지 않는다', froze.key === froze.mk, `${froze.key} / ${froze.mk}`);
  chk('시계 고정에도 구 세이브 dia 는 소급 없이 1000', froze.dia === 1000, froze.dia);
  chk('시계 고정 부팅에 콘솔 에러 없음', e2.length === 0, e2.slice(0, 2).join(' | '));
  await c2.close();

  await browser.close();
  console.log(fails.length ? `\nPROBE790 FAIL — ${fails.length}/${n}` : `\nPROBE790 PASS ${n}/${n}`);
  process.exit(fails.length ? 1 : 0);
})();
