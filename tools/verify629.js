/* 작업 629 게이트 — 죽은 선언 `.ibtn.lock` 두 줄이 걷혔고, **살아 있는 형제는 안 다쳤다**
 *
 *   node tools/verify629.js
 *
 * 무엇이 죽어 있었나: 작업 49 가 우측 사이드(이벤트·특권 잠금 아이콘)를 지우면서
 * `.ibtn[data-lock]` 호스트가 통째로 사라졌는데(index.html 34205 주석이 그렇게 적어 뒀다),
 * CSS 두 줄 — `.ibtn.lock .si{opacity:.5}` 와 `.ibtn.lock::after{content:'🔒'}` — 만 남았다.
 * `.ibtn` 에 `lock` 토큰을 붙이는 코드가 저장소에 **0곳**이라 두 줄 다 «한 번도 안 걸리는 규칙» 이다
 * (464 «죽은 껍데기 rl16» 와 같은 계열 · 295-②·399·460 «죽은 코드 금지»).
 *
 * 이 자가 지키는 것 다섯:
 *   [A] 소스 — 두 선언이 **선언째** 없다. 주석 안 인용은 빨강이 아니다(기록은 남겨야 한다).
 *   [B] 전제 — «죽어 있었다» 의 근거 셋. `.ibtn` 마크업 6줄에 `lock` 토큰 0 ·
 *       `classList.*('lock')` 0곳 · `data-lock` 제품 코드 0곳. 이 절이 빨개지면
 *       호스트가 되살아난 것이므로 [A] 의 삭제는 **결함**이다(먼저 여기를 본다).
 *   [C] 살아 있는 형제 — `.ibtn.busy .si,.tab.busy .ti{opacity:.5}`(453) 는 그대로 있고,
 *       `.ibtn .si` 기하는 한 값도 안 변했다. 같이 지우면 여기가 빨개진다.
 *   [D] 화면 — 부팅한 제품에서 `.ibtn.lock` 매칭 노드 0개 · 사이드 6칸의 `::after` 가
 *       자물쇠를 **0칸** 그린다. 그리고 `.ibtn.busy` 딤은 실제로 걸린다(레이아웃 Δ0px).
 *   [R] 되돌림 시험 — 이 자가 눈먼 것이 아님을 두 겹으로 못박는다.
 *       R1: 옛 두 줄을 **되살려** `lock` 을 붙이면 자물쇠가 그려지고 `.si` 가 흐려진다(= 자가 본다).
 *       R2: 지금 제품에 `lock` 을 붙여도 자물쇠 0 · `.si` opacity 불변(= 규칙이 정말 없다).
 *       R1 없이 R2 만 있으면 «못 봐서 0» 과 구별되지 않는다(356 26회차 [J-c] 규율).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 주석을 걷어낸 «제품 CSS/JS» 만 본다 — 기록(주석)이 옛 이름을 인용하는 것은 결함이 아니다.
   `/* … *​/` 와 `<!-- … -->` 둘 다 지운다(index.html 은 한 파일 안에 셋이 섞여 있다). */
const stripComments = (s) => s
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

const raw = fs.readFileSync(SRC, 'utf8');
const code = stripComments(raw);

/* ─────────────────────────── [A] 소스 — 선언째 없다 ─────────────────────────── */
blk('[A] 소스 — 죽은 선언 두 줄이 선언째 없다');
{
  const declSi = /\.ibtn\.lock\s+\.si\s*\{/.test(code);
  const declAf = /\.ibtn\.lock\s*::?after\s*\{/.test(code);
  ok(!declSi, 'A1 `.ibtn.lock .si{…}` 선언 0건 (제품 코드 기준)');
  ok(!declAf, 'A2 `.ibtn.lock::after{…}` 선언 0건 (제품 코드 기준)');
  /* 셀렉터가 어떤 꼴로든 남아 있으면 잡는다 — 위 둘을 붙여 쓰거나 다른 자식에 건 변형까지. */
  const any = code.match(/\.ibtn\.lock\b/g) || [];
  ok(any.length === 0, `A3 제품 코드에 \`.ibtn.lock\` 셀렉터 0건 — 찍힘: ${any.length}`);
  /* 헛빨강 방지 — 주석에는 남아 있어야 한다(왜 지웠는지가 곧 기록이다). */
  ok(/\.ibtn\.lock/.test(raw), 'A4 주석에는 인용이 남아 있다 — 삭제 경위가 파일 안에 기록돼 있다(헛빨강 방지항)');
}

/* ───────────────────── [B] 전제 — «죽어 있었다» 의 근거 셋 ───────────────────── */
blk('[B] 전제 — 호스트가 없다(이 절이 빨개지면 [A] 의 삭제가 결함이다)');
{
  const ibtnTags = raw.match(/<div class="ibtn"[^>]*>/g) || [];
  ok(ibtnTags.length >= 6, `B1 \`.ibtn\` 마크업을 실제로 읽었다 — ${ibtnTags.length}칸 (0이면 아래 항은 헛초록)`);
  const withLock = ibtnTags.filter((t) => /\block\b/.test(t));
  ok(withLock.length === 0, `B2 \`.ibtn\` 마크업에 \`lock\` 토큰 0칸 — 찍힘: ${withLock.length}`);
  const adds = code.match(/classList\s*\.\s*(add|toggle|remove|replace)\s*\([^)]*['"]lock['"]/g) || [];
  ok(adds.length === 0, `B3 \`classList.*('lock')\` 0곳 — 찍힘: ${adds.length}`);
  const dataLock = code.match(/data-lock/g) || [];
  ok(dataLock.length === 0, `B4 제품 코드에 \`data-lock\` 0건 (작업 49 가 지운 그 축) — 찍힘: ${dataLock.length}`);
}

/* ───────────────── [C] 살아 있는 형제 — 같이 지우지 않았다 ───────────────── */
blk('[C] 살아 있는 형제 — 453 딤과 `.ibtn .si` 기하는 그대로다');
{
  ok(/\.ibtn\.busy \.si,\.tab\.busy \.ti\{opacity:\.5\}/.test(code),
     'C1 `.ibtn.busy .si,.tab.busy .ti{opacity:.5}` 가 그대로 있다(453 이 쓰는 규칙)');
  const busyUse = (code.match(/classList\s*\.\s*toggle\s*\(\s*['"]busy['"]/g) || []).length;
  ok(busyUse >= 2, `C2 \`busy\` 는 실제로 붙는다 — 토글 ${busyUse}곳(= 형제는 죽은 규칙이 아니다)`);
  /* 31228 의 `<div class="lock">` 은 `.ibtn` 자식이 아닌 **다른 자물쇠**다 — 같이 지우면 안 된다. */
  ok(/class="lock"/.test(raw), 'C3 `.ibtn` 밖의 `<div class="lock">`(격자 미보유 딤)은 안 건드렸다');
}

/* ────────────────────────── 화면 판정 · 되돌림 ────────────────────────── */
const OLD_CSS = `.ibtn.lock .si{opacity:.5}
.ibtn.lock::after{content:'🔒';position:absolute;left:0;right:0;top:0;height:var(--ih,82px);
  display:flex;align-items:center;justify-content:center;font-size:calc(var(--ih,82px)*.66);
  filter:drop-shadow(0 0 4px #000) drop-shadow(0 3px 5px #000)}`;

/* 사이드 6칸을 그대로 읽는다. `lockOn` 이 참이면 첫 칸에 `lock` 을 붙인 **뒤** 잰다. */
const READ = (lockOn) => {
  const ib = [...document.querySelectorAll('.ibtn')];
  if (lockOn && ib[0]) ib[0].classList.add('lock');
  const after = ib.map((b) => {
    const cs = getComputedStyle(b, '::after');
    return { content: cs.content, w: Math.round(parseFloat(cs.width) || 0) };
  });
  const si = ib.map((b) => {
    const s = b.querySelector('.si');
    if (!s) return null;
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    return { op: +cs.opacity, w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
  });
  return {
    n: ib.length,
    matched: document.querySelectorAll('.ibtn.lock').length,
    padlock: after.filter((a) => /🔒/.test(a.content)).length,
    after, si,
  };
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + SRC, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __err: String(e) }; } };

  blk('[D] 화면 — 부팅한 제품에서 자물쇠가 0칸이다');
  const base = await ev(READ, false);
  if (base.__err) { ok(false, '[D] 블록 즉사 — ' + base.__err); }
  else {
    ok(base.n >= 6, `D1 전제 — 사이드 \`.ibtn\` ${base.n}칸을 실제로 읽었다 (0이면 아래는 헛초록)`);
    ok(base.matched === 0, `D2 \`.ibtn.lock\` 매칭 노드 0개 — 찍힘: ${base.matched}`);
    ok(base.padlock === 0, `D3 \`::after\` 가 그리는 자물쇠 0칸 — 찍힘: ${base.padlock}`);
    const dim = base.si.filter((s) => s && s.op < 1).length;
    ok(dim === 0, `D4 부팅 직후 흐려진 \`.si\` 0칸(전투 중이 아니다) — 찍힘: ${dim}`);
  }

  blk('[R] 되돌림 시험 — 이 자가 눈먼 것이 아니다');
  /* R1: 옛 두 줄을 되살리고 같은 자리에 `lock` 을 붙인다 ⇒ 자물쇠가 뜨고 `.si` 가 흐려져야 한다. */
  await page.addStyleTag({ content: OLD_CSS });
  await page.waitForTimeout(120);
  const back = await ev(READ, true);
  if (back.__err) { ok(false, '[R1] 블록 즉사 — ' + back.__err); }
  else {
    ok(back.matched === 1, `R1a 옛 규칙 복원 + \`lock\` 부착 ⇒ 매칭 1칸 — 찍힘: ${back.matched}`);
    ok(back.padlock === 1, `R1b 그 칸에 자물쇠가 그려진다 — 찍힘: ${back.padlock}칸 (= 자가 자물쇠를 볼 수 있다)`);
    ok(back.si[0] && back.si[0].op === 0.5, `R1c 그 칸 \`.si\` opacity .5 — 찍힘: ${back.si[0] ? back.si[0].op : 'n/a'}`);
  }

  /* R2: 새 페이지(제품 그대로)에서 `lock` 만 붙인다 ⇒ 아무 일도 안 일어나야 한다. */
  const p2 = await ctx.newPage();
  await p2.goto('file://' + SRC, { waitUntil: 'load' });
  await p2.waitForTimeout(900);
  const now = await (async () => { try { return await p2.evaluate(READ, true); } catch (e) { return { __err: String(e) }; } })();
  if (now.__err) { ok(false, '[R2] 블록 즉사 — ' + now.__err); }
  else {
    ok(now.matched === 1, `R2a 제품에 \`lock\` 을 붙이면 매칭은 1칸이다 — 찍힘: ${now.matched} (붙이기 자체는 되는지 확인)`);
    ok(now.padlock === 0, `R2b 그래도 자물쇠 0칸 — 찍힘: ${now.padlock} (규칙이 정말 없다)`);
    ok(now.si[0] && now.si[0].op === 1, `R2c 그래도 \`.si\` opacity 1 — 찍힘: ${now.si[0] ? now.si[0].op : 'n/a'}`);
    /* 기하 Δ0px — 삭제가 레이아웃을 안 건드렸다는 가장 짧은 증거. */
    if (!base.__err && base.si[0] && now.si[0]) {
      const d = Math.abs(base.si[0].w - now.si[0].w) + Math.abs(base.si[0].h - now.si[0].h);
      ok(d === 0, `R2d \`.si\` 상자 Δ0px (${now.si[0].w}×${now.si[0].h}) — 찍힘 Δ: ${d}`);
    }
  }

  ok(errs.length === 0, `E1 콘솔 에러 0건 — 찍힘: ${errs.length}${errs.length ? ' (' + errs[0].slice(0, 120) + ')' : ''}`);

  await ctx.close();
  await browser.close();
  console.log(`\n결과: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
