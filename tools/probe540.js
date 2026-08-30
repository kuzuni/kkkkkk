/* 작업 540 재현 — «닫개 목록 안의 유령» 이 무엇을 망가뜨리는가
 * 실행: node tools/probe540.js
 *
 * 338 규칙(처방 전에 재현)으로 돌린다. 등재문의 주장은 셋이다:
 *   ⓐ `closeDefeat` 는 제품에 없는 이름이다(`index.html` 0건)
 *   ⓑ `typeof … === 'function'` 가드가 그것을 삼켜 **18 패배 화면을 치우는 팔이 한 번도 안 돈다**
 *   ⓒ `#defw.on`(z39 · inset:0)은 한 번 켜지면 클릭 말고 끄는 경로가 없어 **굳고**,
 *      그 뒤 표본이 전부 «0회» 로 읽힌다 (= 게이트가 «가끔» 빨개지는 씨앗)
 *
 * §1 은 사망을 **직접 일으켜** 같은 실행에서 «옛 손 ↔ 새 손» 을 잰다(probe524 와 같은 축).
 * §2 는 540 이 새로 답해야 하는 것 — **합집합 하나로 묶어도 되는가.**
 *   아홉 자리가 들고 있던 목록이 셋으로 갈려 있었으므로(넷 · 다섯 · 여섯),
 *   합집합을 부른 **직후** 각 자가 쓰던 화면이 그대로 열리는지 확인한다.
 *   («치운 뒤에 자기 화면을 연다» 는 순서가 아홉 자리에 예외 없이 있다는 것이 합집합의 근거다)
 * §3 은 전수 — 지금 트리에 손으로 적힌 닫개 목록이 남아 있지 않다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { RESET_CLOSERS, SHELL_IDS, GHOSTS, install, missingClosers, defeatStuck, defeatBlocked } = require('./closers540');

const { chromium: _c } = { chromium };
const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const TOOLS = path.resolve(__dirname);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ok   ' + m + (d ? '  [' + d + ']' : '')))
                            : (fail++, console.log('  FAIL ' + m + (d ? '  [' + d + ']' : ''))); };

/* 수리 «전» 손 — 유령이 섞인 목록 + 이름 없는 껍데기를 안 걷는다 */
const OLD_CLOSERS = ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult'];

/* 이 자리에서 «버튼» 은 룬 [강화] — 349·203·488 이 전부 쓰는 자리다 */
const BTN = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
                           if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} } });

  /* ══ §1 — 유령의 대가 (사망을 직접 일으켜 같은 실행에서 두 손을 잰다) ═══════════ */
  console.log('[1] 유령의 대가 — 사망을 직접 일으켜 «옛 손 ↔ 새 손» 을 같은 실행에서 잰다');

  /* 전제 — `openDefeat()` 한 번이 정말 `#defw.on` 을 켜는가(단언이 공허하지 않다) */
  const lit = await p.evaluate(() => {
    if (typeof openDefeat !== 'function') return null;
    openDefeat();
    return document.getElementById('defw').classList.contains('on');
  });
  ok(lit === true, '전제 — `openDefeat()` 한 번이 `#defw.on` 을 실제로 켠다(사망 재현이 공허하지 않다)');

  /* 한 손을 재는 절차: 죽인다 → 그 손으로 치운다 → 버튼 위 최상단 노드를 본다 */
  const runHand = async (useOld) => {
    return await p.evaluate(o => {
      /* 죽음 — 제품 경로 그대로 */
      openDefeat();
      /* 손 */
      o.closers.forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      if (!o.old) o.shells.forEach(id => { const d = document.getElementById(id); if (d) d.classList.remove('on'); });
      /* 자기 화면을 연다 — 아홉 자리가 예외 없이 지키는 순서 */
      S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; S.dia = 1e9;
      openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
      return null;
    }, { closers: useOld ? OLD_CLOSERS : RESET_CLOSERS, shells: SHELL_IDS, old: useOld });
  };
  const topAt = async () => {
    const bb = await p.locator(BTN).boundingBox();
    if (!bb) return '(버튼 없음)';
    return await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      if (el && el.closest && el.closest(o.sel)) return 'HIT';
      if (!el) return '(null)';
      const cn = el.className && el.className.baseVal != null ? el.className.baseVal : el.className;
      const cls = String(cn || '').trim();
      return el.tagName + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.split(/\s+/).join('.') : '');
    }, { sel: BTN, x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
  };
  const stuck = () => p.evaluate(() => document.getElementById('defw').classList.contains('on'));

  await runHand(true); await p.waitForTimeout(450);
  const oldTop = await topAt(), oldStuck = await stuck();
  console.log('  수리 전 손: 최상단 ' + oldTop + ' · defw.on ' + oldStuck);
  ok(oldStuck === true && oldTop !== 'HIT',
    '★ 수리 전 손 — 목록을 다 지나도 `#defw.on` 이 버튼을 덮은 채 **굳는다**(유령이 안 치운다)', oldTop);

  await runHand(false); await p.waitForTimeout(450);
  const newTop = await topAt(), newStuck = await stuck();
  console.log('  수리 후 손: 최상단 ' + newTop + ' · defw.on ' + newStuck);
  ok(newStuck === false && newTop === 'HIT',
    '★ 수리 후 손 — 같은 사망을 겪고도 버튼이 최상단이다(이름 없는 껍데기를 DOM 으로 끈다)', newTop);

  /* ══ §2 — 합집합 하나로 묶어도 되는가 (540 이 새로 답하는 것) ════════════════ */
  console.log('\n[2] 합집합 — 아홉 자리가 들고 있던 목록 셋을 하나로 묶어도 각 자의 화면이 그대로 열리나');
  const sheets = [
    { k: '23 훈련 · 룬 (203·210·349·488 계열)',
      open: () => { S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain(); },
      sel: '#trRunes .tr-rn[data-rune="r1"] .rbt.b1' },
    { k: '23 훈련 · 단련 (210 계열)',
      open: () => { S.tstone = 1e6; openTrain(); setTrSub('temper'); renderTrain(); },
      sel: '.tr-tp[data-temper="atk"] [data-tempup]' },
    { k: '08 스킬 세부 (354 계열)',
      open: () => { S.own['slash'] = { n: 1e7, l: 1 }; showSkillDetail('slash'); },
      sel: '#modal #mLv' },
    { k: '89 유물 수반 (354 계열)',
      open: () => { S.relic = 1e9; openRelw(); },
      sel: '#relw #rwBasin' },
  ];
  for (const s of sheets) {
    const r = await p.evaluate(o => {
      /* 합집합을 먼저 부르고 → 자기 화면을 연다 (아홉 자리가 지키는 순서) */
      window.__clear540 ? window.__clear540()
        : o.closers.forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      try { (new Function('return (' + o.open + ')'))()(); } catch (e) { return { err: String(e) }; }
      return { err: null };
    }, { closers: RESET_CLOSERS, open: s.open.toString() });
    await p.waitForTimeout(450);
    const seen = await p.locator(s.sel).count().then(n => n > 0 && p.locator(s.sel).first().isVisible()).catch(() => false);
    ok(!r.err && seen, 'ⓐ ' + s.k + ' — 합집합을 부른 직후 그대로 열린다', r.err || s.sel);
  }

  /* ══ §3 — 전수 (지금 트리에 손으로 적힌 목록이 남아 있지 않다) ════════════════ */
  console.log('\n[3] 전수 — 손으로 적힌 닫개 목록과 유령의 잔존');
  const files = fs.readdirSync(TOOLS).filter(f => f.endsWith('.js'));
  const hand = [], users = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    /* «배열 리터럴 안에 닫개 이름이 둘 이상» = 손으로 적은 목록 */
    if (/\[[^\]]*'close[A-Za-z]+'[^\]]*'close[A-Za-z]+'[^\]]*\]/.test(t)) hand.push(f);
    if (/require\(['"]\.\/closers540['"]\)/.test(t)) users.push(f);
  }
  const ghosted = hand.filter(f => GHOSTS.some(g => new RegExp("'" + g + "'").test(fs.readFileSync(path.join(TOOLS, f), 'utf8'))));
  console.log('  손으로 적은 목록: ' + hand.join(' , '));
  console.log('  공용 모듈을 읽는 자: ' + users.join(' , '));
  console.log('  유령을 든 자: ' + (ghosted.join(' , ') || '없음'));
  ok(users.length >= 9, '★ 540 이 걷은 아홉 자리가 공용 모듈을 읽는다', users.length + '자리');
  /* 유령 이름을 «들어도 되는» 자는 셋뿐이다 — 공용 모듈은 감시 목록(`GHOSTS`)으로,
     두 재현기는 «수리 전 손» 의 재료로 든다. 그 밖의 자가 들면 손으로 적은 목록이 되살아난 것이다.
     ⚠ 면제 목록은 **양성항과 한 쌍**이다 — 셋이 실제로 들고 있지 않으면 면제가 빈 껍데기가 된다. */
  const GHOST_OK = ['closers540.js', 'probe524.js', 'probe540.js'];
  ok(ghosted.every(f => GHOST_OK.includes(f)),
    '★ 유령을 든 자는 감시 목록·재현기뿐이다(게이트·프로브의 실제 손에는 0건)', ghosted.join(' , ') || '없음');
  ok(GHOST_OK.every(f => ghosted.includes(f)),
    '양성항 — 그 셋은 실제로 유령을 들고 있다(면제 목록이 빈 껍데기가 아니다)', GHOST_OK.join(' , '));

  await install(p, { arm: true });
  const miss2 = await missingClosers(p);
  ok(miss2.length === 0, '공용 목록의 이름이 전부 제품에 실재한다', RESET_CLOSERS.length + '개');
  ok(GHOSTS.every(g => !new RegExp(g).test(fs.readFileSync(SRC, 'utf8'))),
    '★ 유령 이름이 `index.html` 에 0건이다(자가 없는 이름을 불러 왔다)', GHOSTS.join(' , '));

  /* arm 이 실동작하나 — 켜려 해도 안 켜지고, 막은 횟수가 오른다 */
  const before = await defeatBlocked(p);
  await p.evaluate(() => openDefeat());
  ok((await defeatBlocked(p)) === before + 1 && !(await defeatStuck(p)),
    '★ arm — `openDefeat` 의 제품 경로는 그대로 부르되 껍데기만 걷고 횟수를 센다',
    '막은 횟수 ' + (await defeatBlocked(p)) + '회');

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));
  console.log('\nPROBE540 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
