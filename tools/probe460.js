/* 작업 460 재현 자 — «플레이어 애니는 idle · run(move) 둘만» 이 지금 얼마나 안 지켜지는가.
 *
 *   node tools/probe460.js
 *
 * 주인 원문: «플레이어는 공격모션없이 가만히 있을때는 idle 움직일떄는 move만 애니메이션 하기».
 *
 * 이 파일은 «고쳤다» 를 재는 게이트(`verify460.js`)가 아니라 **무엇이 어떻게 어긋나는가**를
 * 프레임으로 찍는 자리다(338 규칙 — 처방을 따르기 전에 재현한다).
 * 338·341·350 이 가르쳐 준 대로, 등재문의 가설(«매 프레임 attack_A / get_hit 로 갈아탄다»)을
 * **믿지 말고 세어 본다** — 실제로 몇 프레임이 그 둘이었는지가 이 작업의 크기다.
 *
 * 재는 것 넷:
 *   [A] 일반 스테이지 전투 60초 — 플레이어 `anim` 이름별 프레임 수(= 지시 위반 비율)
 *   [B] 보스전 — 같은 표(피격이 잦아 `get_hit` 비율이 다르다)
 *   [C] 스킬 시전 직후 프레임이 실제로 `attack_A` 로 갈아타는가(원인 = `player.atkFx`)
 *   [D] `atkFx` · `hitFx` 의 **애니 외 용도**가 있는가 — 처방 ②(«상수·대입까지 지울지»)의 갈림길.
 *       소스 전수 grep 이 아니라 «그 값을 0 으로 굳혔을 때 그림이 바뀌는가» 로 판정한다.
 *
 * ⚠ 게임 루프를 얼리고(`requestAnimationFrame` 무력화) `step(dt)` 만 손으로 돌린다 — probe425 처방.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const DT = 1 / 60;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
  };
  const blk = (title, r) => {
    console.log('\n=== ' + title + ' ===');
    if (r && r.__err) { console.log('  ⚠ 실패: ' + r.__err); return false; }
    return true;
  };

  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 공통 하네스 — 세이브를 깨끗이 세우고 스킬 하나를 장착시킨다(시전이 있어야 attack_A 가 뜬다) */
  const setup = (boss) => ev(([bo]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 };
    S.eqSkill = ['slash'];
    S.stage = bo ? 20 : 17;                 /* 보스 스테이지는 10 의 배수(162) */
    S.best = S.stage; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    player.dead = 0; player.hp = stat.maxHp;
    enemies.length = 0; shots.length = 0;
    if (bo) startBoss();
    return { stage: S.stage, boss: !!(typeof bossT !== 'undefined' && bossT > 0) };
  }, [boss]);

  /* n 프레임 굴리며 플레이어 애니 이름·표시자를 센다. */
  const sample = (n) => ev(([N]) => {
    const cnt = {}, ev2 = { atk: 0, hit: 0, mov: 0 };
    let casts = 0, castAnim = 0, hits = 0, hitAnim = 0;
    let pAtk = 0, pHit = 0;
    for (let i = 0; i < N; i++) {
      step(1 / 60);
      const a = player.anim || '(없음)';
      cnt[a] = (cnt[a] || 0) + 1;
      if (player.atkFx > 0) ev2.atk++;
      if (player.hitFx > 0) ev2.hit++;
      if (Math.hypot(player.vx, player.vy) > 25) ev2.mov++;
      /* «시전한 프레임» = atkFx 가 방금 세워진 프레임(직전 프레임보다 커졌다) */
      if (player.atkFx > pAtk + 1e-9) { casts++; if (a === 'attack_A') castAnim++; }
      if (player.hitFx > pHit + 1e-9) { hits++; if (a === 'get_hit') hitAnim++; }
      pAtk = player.atkFx; pHit = player.hitFx;
    }
    return { n: N, cnt, ev: ev2, casts, castAnim, hits, hitAnim, alive: player.dead <= 0 };
  }, [n]);

  const table = (r) => {
    const tot = r.n;
    const names = Object.keys(r.cnt).sort((a, b) => r.cnt[b] - r.cnt[a]);
    for (const k of names) {
      const c = r.cnt[k];
      const ok = (k === 'idle' || k === 'run' || k === 'die') ? '  ' : '⚠ ';
      console.log('  ' + ok + k.padEnd(10) + String(c).padStart(6) + ' 프레임  ' + (c / tot * 100).toFixed(2) + '%');
    }
    const bad = names.filter((k) => k !== 'idle' && k !== 'run' && k !== 'die')
      .reduce((s, k) => s + r.cnt[k], 0);
    console.log('  ── 지시 위반(idle·run·die 외) ' + bad + ' / ' + tot +
                ' = ' + (bad / tot * 100).toFixed(2) + '%');
    console.log('  참고 — atkFx>0 ' + r.ev.atk + ' · hitFx>0 ' + r.ev.hit + ' · 이동 ' + r.ev.mov + ' 프레임');
    return bad;
  };

  console.log('작업 460 재현 — 플레이어 애니 «idle · run 둘만» 위반 계수');

  /* [A] 일반 전투 60초 */
  let a = await setup(false);
  let ra = a && a.__err ? a : await sample(3600);
  let badA = null;
  if (blk('[A] 일반 스테이지 전투 60초(3600프레임)', ra)) badA = table(ra);

  /* [B] 보스전 */
  const b0 = await setup(true);
  const rb = b0 && b0.__err ? b0 : await sample(1800);
  let badB = null;
  if (blk('[B] 보스전 30초(1800프레임)', rb)) badB = table(rb);

  /* [C] 시전 → attack_A 전환이 실제로 일어나는가 */
  if (blk('[C] 원인 — 시전·피격 프레임의 애니 전환', ra)) {
    console.log('  [A] 스킬 시전 ' + ra.casts + '회 중 그 프레임 애니가 attack_A 인 것 ' + ra.castAnim + '회');
    console.log('  [A] 피격     ' + ra.hits + '회 중 그 프레임 애니가 get_hit  인 것 ' + ra.hitAnim + '회');
    if (!rb.__err) {
      console.log('  [B] 시전 ' + rb.casts + ' / attack_A ' + rb.castAnim +
                  ' · 피격 ' + rb.hits + ' / get_hit ' + rb.hitAnim);
    }
  }

  /* [D] atkFx · hitFx 의 «애니 외 용도» — 처방 ②(«상수·대입까지 지울지»)의 갈림길.
   *
   * ⚠ 1회차에 이것을 **픽셀 대조**로 재려다 자를 버렸다. 플래그만 갈아 끼우고 같은 프레임을
   *    두 번 그려 비교하는 방식이었는데, **대조군(아무것도 안 바꾸고 두 번 그리기)이 이미 다르다** —
   *    전투 캔버스에는 프레임마다 흔들리는 층(파티클·트레일·비네트)이 있어서 이 자로는
   *    «플래그 때문에 달라졌다» 를 절대 못 가른다. 그 자를 그대로 뒀으면 atkFx 가
   *    «애니 외 용도 있음» 으로 읽혀 **지우면 안 되는 것으로 굳었을 것**이다(실제로 그렇게 읽혔다).
   *    ⇒ 소비처는 **소스 전수 열거**로 판정한다. 아래가 그 표이고, review 에 그대로 옮긴다. */
  const rd = ((src) => {
    const lines = src.split('\n');
    const out = { atkFx: [], hitFx: [] };
    /* 주석은 소비처가 아니다 — 460 이 남긴 «폐지했다» 주석이 그대로 «읽기» 로 세어지면
       표가 거꾸로 읽힌다(수리 후 1회 실제로 그랬다). 줄 안의 주석을 먼저 지우고 센다.
       여러 줄 주석 안쪽은 `blk` 로 따라간다(index.html 은 주석이 길다). */
    let blkC = false;
    lines.forEach((raw, i) => {
      let ln = raw;
      if (blkC) { const e = ln.indexOf('*/'); if (e < 0) return; ln = ln.slice(e + 2); blkC = false; }
      for (;;) {
        const s = ln.indexOf('/*');
        if (s < 0) break;
        const e = ln.indexOf('*/', s + 2);
        if (e < 0) { ln = ln.slice(0, s); blkC = true; break; }
        ln = ln.slice(0, s) + ' ' + ln.slice(e + 2);
      }
      ln = ln.replace(/\/\/.*$/, '');
      for (const f of ['atkFx', 'hitFx']) {
        if (!ln.includes(f)) continue;
        const t = ln.trim();
        /* 대입(선언·초기화 포함) / 감쇠 / 읽기 — 셋으로 가른다. «읽기» 만이 소비처다. */
        const kind = new RegExp('\\b' + f + '\\s*[-+]?=(?!=)').test(t) ? (/-=/.test(t) ? '감쇠' : '대입')
                   : new RegExp('\\b' + f + '\\s*:').test(t) ? '선언'
                   : '읽기';
        out[f].push({ line: i + 1, kind, txt: t.slice(0, 96) });
      }
    });
    return out;
  })(require('fs').readFileSync(path.resolve(__dirname, '../index.html'), 'utf8'));
  console.log('\n=== [D] 애니 외 용도 — 소스 전수 열거(«읽기» 만이 소비처다) ===');
  for (const f of ['atkFx', 'hitFx']) {
    console.log('  ' + f + ':');
    for (const h of rd[f]) console.log('    ' + String(h.line).padStart(6) + '  ' + h.kind + '  ' + h.txt);
    const rd2 = rd[f].filter((h) => h.kind === '읽기');
    console.log('    → 읽기 ' + rd2.length + '곳' +
                (rd2.length ? ' (줄 ' + rd2.map((h) => h.line).join(', ') + ')' : ' — 소비처 없음'));
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('요약 — 위반 프레임 [A] ' + (badA === null ? '?' : badA) +
              ' · [B] ' + (badB === null ? '?' : badB));
  await browser.close();
})();
