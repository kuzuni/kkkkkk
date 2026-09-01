/* 373 재현 — `tools/verify125.js` 의 A1 과 F2 가 **같은 🎫 를 반대로 말한다**.
 * 등재문의 두 처방(ⓐ F2 목록을 좁힌다 / ⓑ 스윕에 ▦ 메뉴를 넣고 제품 글리프를 바꾼다) 중
 * 어느 쪽인지를 «가설» 이 아니라 **찍힌 값**으로 가른다 (338 규칙).
 *
 *   node tools/probe373.js          (P373_BEFORE=<ref> 로 «수리 전» 판본을 직접 지정할 수 있다)
 *
 * 재는 것 —
 *   [1] 수리 전 F2 스윕이 ▦ 메뉴를 여는가 (등재문: «초록인 이유는 판정이 아니라 스윕이 좁아서다»)
 *   [2] 메뉴를 열면 F2 가 실제로 빨개지는가 — 🎫 를 담은 **호스트 노드**와 rect
 *   [3] 그 자리가 아트 자리인가 — 형제 6칸의 글리프·부품이 같은가 · A1 은 그 줄을 면제하는가
 *   [4] 스윕에 메뉴를 더하면 곁다리로 무엇이 그 화면을 «처음» 보는가 — F1·F3·E1 실측
 *   [5] 처방 ⓐ(«PURE 를 🪙💰 로 좁힌다») 의 대가 — 좁힌 F2 는 무엇을 놓치는가
 *   [6] 제안 판정식(«아트 자리 **노드**를 면제») 이 무르지 않은가 — 글리프·자리 둘 다 못 박히는가
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const GATE = fs.readFileSync(path.join(ROOT, 'tools', 'verify125.js'), 'utf8');

/* ── «수리 전» 사본은 **고정된 커밋**에서 꺼낸다 (작업 608 · 573 선례) ──────────
 * 이 재현기는 [1] 을 «현행 `tools/verify125.js`» 에서 읽었다. 그런데 **373 자신의 수리가
 * 그 파일의 스윕에 ▦ 메뉴를 넣는다** — 수리가 올라간 순간 «수리 전 세계» 를 묻는 항이
 * «수리 후» 를 읽어 구조적으로 영원히 빨개졌다(12/13). 표본이 낡은 게 아니라
 * **표본을 가리키는 손가락이 지금을 가리킨다**는 것이 뿌리다(566·573 과 같은 병).
 *   ⇒ 항을 지워서 초록으로 만들지 않는다(328~330 교훈) — 그러면 «373 이 통째로 사라져도
 *     초록인 재현기» 가 된다. 대신 **묻는 시점을 둘로 가른다**:
 *     [1-a] 수리 **전**(고정 커밋)은 메뉴를 안 열었다 · [1-b] 수리 **후**(지금)는 연다.
 * ⚠ 화면 수도 고정 커밋에서 읽는다 — 607 이 스윕을 21 → 22 화면으로 넓혔으므로
 *   «21» 을 손으로 박으면 그 숫자가 다음 스윕 확장 때 또 거짓말을 한다.
 * ⚠ SHA 를 손으로 박기만 하면 이 저장소에서는 또 썩는다(2026-08-30 이력 재작성) —
 *   **커밋 제목으로 찾고** 박은 SHA 는 폴백이다.
 * ⚠⚠ 그물은 **제목(`%s`)** 으로만 좁힌다 — 이 저장소의 기록은 사고를 «인용» 하므로
 *   본문 매칭은 남의 커밋을 문다(LESSONS 571-④ · 573 1회차가 실제로 그랬다).
 * ⚠ 여러 번이면 **가장 오래된** 수리의 부모가 «수리 전» 이다. */
const GOPT = { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] };
/* 756 — `<rev>:<path>` 를 꺼내기 전에 **먼저 판다**(규약 ①). 못 가져오면 지금까지처럼 null 이지만
   이유를 한 줄 찍는다(조용한 null 이 «게이트 부패» 로 읽히던 자리다 · 756 등재문). */
const gitShow = r => {
  const i = String(r).indexOf(':');
  if (i > 0) {
    const got = require('./gitrev756').show(r.slice(0, i), r.slice(i + 1), { maxBuffer: 1 << 28 });
    if (got.ok) { if (got.how) console.error('[i]' + got.how); return got.buf.toString('utf8'); }
    console.error('[i] ' + (got.env ? '보류(환경) — ' : '빨강 — ') + got.why);
    return null;
  }
  try { return execFileSync('git', ['show', r], GOPT); } catch (e) { return null; }
};
const gitQ = a => { try { return execFileSync('git', a, GOPT).trim(); } catch (e) { return null; } };
const BEFORE_FALLBACK = '81a4352';         /* claim(373) — 373 의 수리(wip) 직전 */
function pickBefore() {
  if (process.env.P373_BEFORE) return { ref: process.env.P373_BEFORE, how: 'P373_BEFORE 환경변수' };
  for (const head of ['wip(373):', 'done(373):']) {
    const list = (gitQ(['rev-list', '--fixed-strings', '--grep=' + head, 'HEAD']) || '')
      .split('\n').filter(Boolean)
      .filter(sha => (gitQ(['log', '-1', '--format=%s', sha]) || '').startsWith(head));
    if (!list.length) continue;
    const first = list[list.length - 1];   /* rev-list 는 최신순 — 끝이 가장 오래된 수리다 */
    const parent = gitQ(['rev-parse', '--short', first + '^']);
    if (parent) return { ref: parent, how: '`' + head + '` 첫 커밋의 부모' };
  }
  return { ref: BEFORE_FALLBACK, how: '폴백 SHA(이력에서 373 수리 커밋을 못 찾았다)' };
}
const BEFORE = pickBefore();
const GATE_BEFORE = gitShow(BEFORE.ref + ':tools/verify125.js');

/* 스윕 블록을 «어느 판본에서든» 같은 자로 읽는다 — 자가 갈리면 전·후 대조가 아니다 */
const sweepOf = g => {
  const i = g.indexOf('const steps = [');
  if (i < 0) return null;
  const block = g.slice(i, g.indexOf('];', i));
  const shut = g.indexOf('const shut = ()') >= 0 ? g.slice(g.indexOf('const shut = ()'), i) : '';
  return { n: (block.match(/\n\s*\['/g) || []).length,
           opensMenu: /openMenu|menub/.test(block),
           closesMenu: /closeMenu/.test(shut) };
};

/* verify125 와 **같은 집합**을 쓴다 — 다른 잣대로 재면 재현이 아니다 */
const PURE = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'];
const CUR_EMOJI = ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'];
const ART_SLOT = /\b(?:ic|art)\s*:\s*'[^'\s]{1,8}'/g;
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
                            .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));

let pass = 0, fail = 0;
const ok = (b, name, detail) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : '')); b ? pass++ : fail++; };

/* 제안 판정식 — 면제는 «자리(선택자) + 글리프 + 노드가 그 글리프 하나뿐» 셋이 모두 맞을 때만 */
const ART_NODE = [{ sel: '#mnw .mn-b[data-mn="pass"] > i.mn-i', g: '\u{1F3AB}' }];

(async () => {
  /* ── [1] 스윕이 ▦ 메뉴를 여는가 (게이트 소스 — 수리 «전» 과 «후» 를 갈라 묻는다) ── */
  const now = sweepOf(GATE);
  const bef = GATE_BEFORE ? sweepOf(GATE_BEFORE) : null;
  console.log('[1] F2 스윕 — 지금: ' + now.n + '화면 · openMenu ' + (now.opensMenu ? '있음' : '**없음**')
    + ' · shut() closeMenu ' + (now.closesMenu ? '있음' : '**없음**'));
  if (bef) {
    console.log('    수리 전(' + BEFORE.ref + ' · ' + BEFORE.how + '): ' + bef.n + '화면 · openMenu '
      + (bef.opensMenu ? '있음' : '**없음**'));
    ok(!bef.opensMenu && bef.n > 0,
       '[1-a] «수리 전» 스윕은 ▦ 메뉴를 한 번도 열지 않았다(F2 가 초록이던 진짜 이유)',
       bef.n + '화면 중 0');
    /* 고른 ref 가 정말 «373 수리 전» 인가 — 이력 그래프가 아니라 **373 이 넣은 부품**으로 못박는다
     * (얕은 클론에서는 조상 경로가 끊겨 있어 `rev-list --ancestry-path` 로는 못 묻는다) */
    const mark = ['ART_NODE', 'F2b'];
    const inNow = mark.filter(k => GATE.indexOf(k) >= 0);
    const inBef = mark.filter(k => GATE_BEFORE.indexOf(k) >= 0);
    ok(inNow.length === mark.length && inBef.length === 0,
       '[1-c] 고른 판본이 정말 «373 수리 전» 이다(373 이 넣은 부품이 지금엔 있고 거기엔 없다)',
       '지금 ' + inNow.join('·') + ' / 수리 전 ' + (inBef.join('·') || '없음'));
  } else {
    console.log('  –   [1-a]·[1-c] 건너뜀 — «수리 전» 판본(' + BEFORE.ref + ' · ' + BEFORE.how
      + ')을 못 읽는다(얕은 클론)');
  }
  ok(now.opensMenu && now.closesMenu,
     '[1-b] «지금» 스윕은 ▦ 메뉴를 연다 — 373 의 수리가 살아 있다(항을 지워서 초록이 된 게 아니다)',
     now.n + '화면 · openMenu ' + now.opensMenu + ' · closeMenu ' + now.closesMenu);

  /* ── A1 은 그 자리를 면제하는가 (소스) ──────────────────────────────── */
  const BARE = stripComments(SRC);
  const mnLine = BARE.split('\n').findIndex(l => l.indexOf('data-mn="pass"') >= 0) + 1;
  const a1Exempt = /'data-mn="pass"'/.test(GATE);
  ok(a1Exempt && mnLine > 0, '[1] A1 은 같은 자리를 허용 목록으로 **면제**한다(자기모순의 반대쪽)',
     'index.html ' + mnLine + '행 · ALLOW 항목 있음');

  /* ── 런타임 ─────────────────────────────────────────────────────────── */
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openMenu === 'function');
  await p.waitForTimeout(500);

  /* 제안 판정식 본체를 페이지에 한 번만 심는다 — [2]·[5]·[6] 이 **같은 함수**를 부른다(334 교훈) */
  await p.evaluate(([PURE, ART]) => {
    window.__f2 = () => {
      const t = document.body.innerText || '';
      const found = PURE.filter(e => t.indexOf(e) >= 0);
      const leaks = [], art = [], seen = [];
      if (!found.length) return { found, leaks, art };
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const v = n.nodeValue || '';
        const gs = PURE.filter(e => v.indexOf(e) >= 0);
        if (!gs.length) continue;
        const el = n.parentElement; if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || +st.opacity === 0) continue;
        const desc = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
          + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : '')
          + '[' + Math.round(r.width) + '×' + Math.round(r.height) + ']';
        for (const g of gs) {
          seen.push(g);
          const k = ART.findIndex(a => { try { return el.matches(a.sel) && a.g === g && v.trim() === g; } catch (e) { return false; } });
          if (k >= 0) art.push({ k, g, desc }); else leaks.push({ g, desc, txt: v.trim().slice(0, 40) });
        }
      }
      for (const g of found) if (seen.indexOf(g) < 0) leaks.push({ g, desc: '(호스트 미상)', txt: '' });
      return { found, leaks, art };
    };
  }, [PURE, ART_NODE]);

  /* ── [2] 메뉴를 열면 F2 가 빨개지는가 ───────────────────────────────── */
  const m = await p.evaluate(() => {
    const t0 = document.body.innerText || '';
    const before = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'].filter(e => t0.indexOf(e) >= 0);
    openMenu();
    const t1 = document.body.innerText || '';
    const after = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'].filter(e => t1.indexOf(e) >= 0);
    const i = document.querySelector('#mnw .mn-b[data-mn="pass"] > i.mn-i');
    const r = i.getBoundingClientRect();
    return { before, after, ic: i.textContent, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
             f2: window.__f2() };
  });
  console.log('[2] 메뉴 닫힘 F2 대상: ' + (m.before.join(',') || '0건')
    + ' → 열림: ' + (m.after.join(',') || '0건') + ' · 호스트 ' + JSON.stringify(m.ic) + ' ' + m.w + '×' + m.h);
  console.log('    제안 판정식: 유출 ' + m.f2.leaks.length + '건 · 아트 자리 면제 ' + m.f2.art.length + '건'
    + (m.f2.art[0] ? ' @ ' + m.f2.art[0].desc : ''));
  ok(m.before.length === 0 && m.after.join('') === '\u{1F3AB}',
     '[2] 메뉴를 열면 현행 F2 가 빨개진다(닫혀 있어서 초록이었을 뿐)', m.after.join(',') || '0건');
  ok(m.w > 0 && m.h > 0, '[2] 그 🎫 는 0×0 이 아니라 **보이는 채** 새어 나온다', m.w + '×' + m.h);
  ok(m.f2.leaks.length === 0 && m.f2.art.length === 1,
     '[2] 제안 판정식(아트 자리 노드 면제)은 같은 화면을 유출 0건으로 본다', '면제 ' + m.f2.art.length + '건');

  /* ── [3] 그 자리는 아트 자리인가 — 형제 7칸 전수 ───────────────────── */
  const tiles = await p.evaluate(() => [...document.querySelectorAll('#mnw .mn-b')].map(bx => {
    const i = bx.querySelector('.mn-i'), l = bx.querySelector('.mn-l');
    const r = i.getBoundingClientRect();
    return { mn: bx.dataset.mn, ic: i.textContent.trim(), tag: i.tagName.toLowerCase() + '.' + i.className,
             label: l ? l.textContent.trim() : '', img: !!i.querySelector('img'),
             w: Math.round(r.width), h: Math.round(r.height) };
  }));
  console.log('[3] ▦ 메뉴 칸: ' + tiles.map(t => t.mn + '=' + t.ic).join(' · '));
  ok(tiles.length === 7 && tiles.every(t => !t.img && t.tag === 'i.mn-i'),
     '[3] 7칸이 **같은 부품·전부 이모지 아트**다(패스만 다른 규격이 아니다)',
     tiles.filter(t => t.img).length + '칸만 이미지');
  const passT = tiles.find(t => t.mn === 'pass');
  ok(passT && passT.ic === '\u{1F3AB}' && passT.label === '패스',
     '[3] 패스 칸 = 🎫 + 라벨 «패스» (A1 이 이미 면제한 그 줄)', passT.ic + '/' + passT.label);

  /* ── [4] 스윕에 메뉴를 더하면 F1·F3·E1 이 그 화면을 처음 본다 ───────── */
  const side = await p.evaluate(() => {
    const t = document.body.innerText || '';
    return { imgLeak: /<?img\s+class="cic"|cur-[a-z-]+\.svg/.test(t),
             nan: /\bNaN\b|\bundefined\b/.test(t),
             cic: [...document.querySelectorAll('#mnw img.cic')].length };
  });
  console.log('[4] 메뉴 화면 — F1 마크업 유출 ' + side.imgLeak + ' · F3 NaN/undefined ' + side.nan + ' · img.cic ' + side.cic + '개');
  ok(!side.imgLeak && !side.nan, '[4] 메뉴를 스윕에 넣어도 F1·F3 은 곁다리로 빨개지지 않는다',
     'F1 0건 · F3 0건 · E1 무관(cic ' + side.cic + '개)');

  /* ── [5] 처방 ⓐ(PURE 를 🪙💰 로 좁힌다) 의 대가 ───────────────────── */
  const narrow = await p.evaluate(() => {
    /* 「던전 입장권을 이모지로 표시」 — 125 가 이미지로 통일한 바로 그 자리를 되돌린 모양 */
    const box = document.createElement('div');
    box.id = '__probe373';
    box.style.cssText = 'position:fixed;left:20px;top:200px;z-index:99;font-size:30px';
    box.textContent = '\u{1F3AB} 던전 입장권 3';
    document.body.appendChild(box);
    const t = document.body.innerText || '';
    const wide = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'].filter(e => t.indexOf(e) >= 0);
    const narrowed = ['\u{1FA99}', '\u{1F4B0}'].filter(e => t.indexOf(e) >= 0);
    const mine = window.__f2();
    box.remove();
    return { wide, narrowed, leaks: mine.leaks.map(l => l.g + '@' + l.desc + ' «' + l.txt + '»') };
  });
  console.log('[5] 입장권을 이모지로 되돌린 화면 — 현행 폭넓은 PURE: ' + narrow.wide.join(',')
    + ' · ⓐ 로 좁힌 PURE: ' + (narrow.narrowed.join(',') || '**0건 = 놓친다**'));
  console.log('    제안 판정식: ' + narrow.leaks.join(' | '));
  ok(narrow.narrowed.length === 0 && narrow.leaks.length === 1,
     '[5] ⓐ 처럼 목록을 좁히면 «입장권 이모지» 를 놓친다 — 제안 판정식은 잡는다',
     'ⓐ 0건 vs 제안 ' + narrow.leaks.length + '건');

  /* ── [6] 제안 판정식이 무르지 않은가 ───────────────────────────────── */
  const R = await p.evaluate(() => {
    const i = document.querySelector('#mnw .mn-b[data-mn="pass"] > i.mn-i');
    const l = document.querySelector('#mnw .mn-b[data-mn="pass"] > i.mn-l');
    const orig = i.textContent, origL = l.textContent;
    i.textContent = '\u{1FA99}';                       /* 같은 자리 · 다른 글리프 */
    const swapGlyph = window.__f2().leaks.length;
    i.textContent = orig;
    l.textContent = '\u{1F3AB}';                       /* 같은 글리프 · 다른 자리 */
    const swapSlot = window.__f2().leaks.length;
    l.textContent = origL;
    const clean = window.__f2();
    return { swapGlyph, swapSlot, cleanLeaks: clean.leaks.length, cleanArt: clean.art.length };
  });
  console.log('[6] 되돌림 — 자리 그대로 🪙: 유출 ' + R.swapGlyph + '건 · 글리프 그대로 다른 자리: 유출 '
    + R.swapSlot + '건 · 원복: 유출 ' + R.cleanLeaks + '건(면제 ' + R.cleanArt + ')');
  ok(R.swapGlyph === 1, '[6] 면제는 **글리프까지** 못 박는다(🪙 로 바꾸면 빨강)');
  ok(R.swapSlot === 1, '[6] 면제는 **그 자리에만** 듣는다(라벨 칸의 🎫 는 빨강)');
  ok(R.cleanLeaks === 0 && R.cleanArt === 1, '[6] 원복하면 초록(시험이 «항상 빨강» 이 아니다)');

  ok(errs.length === 0, '[7] 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0건');

  await b.close();
  console.log('\nPROBE373 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
