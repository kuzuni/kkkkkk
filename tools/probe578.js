#!/usr/bin/env node
/* 작업 578 — «[충전] 을 뗀 뒤 「+1,000,000」 사본이 이웃 «공격력 단련» 행 안에 하나 더 뜬다» 재현기
 *
 *   node tools/probe578.js
 *
 * 338 규칙 — 처방 전에 «찍힌 노드» 로 가설 셋을 가른다:
 *   ⓐ `hbFloat` 의 변형 벗기기가 **개별 변환 속성**(`.jz-hdn{scale;translate}`)을 못 벗겨 자리가 밀린다
 *   ⓑ 2패스 캡처(`cap491`)가 만든 **두 번째 시도**의 사다리가 다른 레인에 앉는다(= 하네스 탓)
 *   ⓒ `end:` 의 `fxReward()`·토스트가 남긴 별개 노드
 *
 * 재는 것은 «#fxl 자식 전부 + 문서 안에서 그 문자열을 말하는 노드 전부» 의 **프레임 px 상자**다.
 * 등재문의 좌표(CI 「y258~290 · 181×33」)는 `cap491` 의 **잘라낸 그림 기준**이므로
 * 여기서 crop box 를 같이 찍어 프레임 좌표로 환산한다.
 */
/* ⚠ 626(2026-09-01) — 이 재현기의 **대상이 통째로 폐지됐다.** 613(단련석 직접 지불)이 «전환»
   단계를 없애면서 [충전] 버튼(`#trTemper .tp-hd .cg` · `data-tpchg`)이 제품에서 사라졌고
   (`verify577` [1-a] 가 «0개» 를 부재 게이트로 지킨다), 이 파일은 **입구부터 끝까지 그 버튼을
   누르는 자**다(`SEL`·`HD` · [A] 짧은 탭 · [B] 홀드 · [C] 2패스). 그래서 그냥 돌리면
   `[A] tap()` 에서 `Cannot read properties of null (reading 'getBoundingClientRect')` 로 **즉사**한다
   (626 재현 — 게다가 종료 코드가 0 이라 «조용히 죽는다»).
   ⓑ(살아 있는 버튼으로 갈아 끼우기)는 **기각**했다 — 578 이 잰 것은 «재고를 한 번에 다 쓰는
   버튼이 뗌 프레임에 「+1,000,000」 사본을 남긴다» 이고, 그 «한 번에 다 쓴다» 가 [충전] 고유의
   성질이라 다른 버튼에서는 재현할 대상 자체가 없다(624 가 `cap491` 장면을 걷어낸 것과 같은 판단:
   333 «자리를 비우지 마라» 는 «살아 있는 대체 계약» 이 있을 때의 말이다).
   ⇒ `probe577` 선례 그대로 **역사 기록으로 보존하고 입구에서 종료**한다. 재현 수치는
   `docs/review/578-*.md` 에 있고, 578 이 세운 계약은 `verify578` [F1a]·[F1b](624 가 «한 줄» 에서
   «계약» 으로 갈아 끼운 것)이 산 자리에서 계속 지킨다. 옛 트리에서 굴려 볼 일이 생기면
   `PROBE578_FORCE=1 node tools/probe578.js` 로 강제한다. */
if (!process.env.PROBE578_FORCE) {
  console.log('probe578: 대상([충전] .cg) 폐지 — 613. 역사 기록만 보존, 실행 생략 (PROBE578_FORCE=1 로 강제)');
  process.exit(0);
}
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const SEL = '#trTemper .tp-hd .cg';          /* [충전] 버튼 — 홀드가 붙는 자리 */
const HD  = '#trTemper .tp-hd';              /* 회당 피드백 호스트(491 4회차) */

/* 페이지 안에서 도는 계측기 — #fxl 자식 + 문서 전역의 «그 문자열» 노드를 프레임 px 로 찍는다 */
const SNAP = () => {
    const out = { fxl: [], doc: [], t: Math.round(performance.now()) };
    const L = document.getElementById('fxl');
    const box = el => { const r = (typeof fxRect === 'function') ? fxRect(el) : null;
      return r ? { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.w.toFixed(1), h:+r.h.toFixed(1) } : null; };
    if(L) for(const d of L.children){
      const cs = getComputedStyle(d);
      out.fxl.push({ cls:d.className, txt:(d.textContent||'').trim().slice(0,40), r:box(d),
        fs:cs.fontSize, op:+(+cs.opacity).toFixed(3), col:cs.color,
        anim:cs.animationName, host:d.dataset.hbHost || '' });
    }
    /* 문서 전역 — «1,000,000» 을 말하는 «잎» 노드(자식 요소가 없는 것)만 */
    for(const e of document.querySelectorAll('*')){
      if(e.children.length) continue;
      const t = (e.textContent||'').trim();
      if(!/1,000,000/.test(t)) continue;
      const r = box(e); if(!r || !r.w) continue;
      const cs = getComputedStyle(e);
      if(cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      out.doc.push({ tag:e.tagName.toLowerCase(), cls:e.className, id:e.id,
        parent:(e.parentElement && (e.parentElement.className || e.parentElement.id)) || '',
        txt:t.slice(0,40), r, fs:cs.fontSize, col:cs.color });
    }
    return out;
};

const P = [];
const say = s => { P.push(s); console.log(s); };
const fmtR = r => r ? `(${r.x},${r.y}) ${r.w}×${r.h}` : '—';
const dump = (tag, s) => {
  say(`  [${tag}] t=${s.t}ms · #fxl ${s.fxl.length}개 · 문서 «1,000,000» ${s.doc.length}개`);
  for(const d of s.fxl) say(`      fxl  «${d.txt}» ${d.cls} ${fmtR(d.r)} fs${d.fs} α${d.op} ${d.col}`);
  for(const d of s.doc) say(`      doc  «${d.txt}» <${d.tag} class="${d.cls}"> in .${d.parent} ${fmtR(d.r)} fs${d.fs}`);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => say('  [PAGEERROR] ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);

  const setup = async () => {
    await page.evaluate(() => {
      const v = document.getElementById('view'); if(v) v.style.visibility = 'hidden';
      S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
      if(S.temper) S.temper.pts = 500;
      if(!$('trw').classList.contains('on')) openTrain();
      setTrSub('temper'); renderTrain();
      const L = document.getElementById('fxl'); if(L) L.innerHTML = '';
    });
    await page.waitForTimeout(500);
  };
  const snap = tag => page.evaluate(SNAP).then(s => { dump(tag, s); return s; });
  const tap = async (ms) => {
    const r = await page.evaluate(s => { const e = document.querySelector(s); const b = e.getBoundingClientRect();
      return { x:b.x + b.width/2, y:b.y + b.height/2 }; }, SEL);
    await page.mouse.move(r.x, r.y);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
  };

  await setup();

  /* ── 기준선: 이 화면의 자리들 ─────────────────────────────────────── */
  say('\n[0] 기준 상자 (프레임 px)');
  const geo = await page.evaluate(() => {
    const g = {}, b = el => { const r = el ? fxRect(el) : null;
      return r ? { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.w.toFixed(1), h:+r.h.toFixed(1) } : null; };
    g.box   = b(document.querySelector('#trw .tr-box'));
    g.hd    = b(document.querySelector('#trTemper .tp-hd'));
    g.cg    = b(document.querySelector('#trTemper .tp-hd .cg'));
    g.row0  = b(document.querySelector('#trTemper .tr-tp.k0'));
    g.row0n = (document.querySelector('#trTemper .tr-tp.k0 .tn') || {}).textContent || '';
    return g;
  });
  say(`  .tr-box  ${fmtR(geo.box)}   ← cap491 의 crop 은 이 상자 −6px`);
  say(`  .tp-hd   ${fmtR(geo.hd)}    (아래변 ${geo.hd ? (geo.hd.y + geo.hd.h) : '?'})`);
  say(`  .cg      ${fmtR(geo.cg)}`);
  say(`  .tr-tp.k0 «${geo.row0n.trim()}» ${fmtR(geo.row0)}`);
  if(geo.box){
    /* 등재문 좌표(crop 기준) → 프레임 px */
    const ox = geo.box.x - 6, oy = geo.box.y - 6;
    say(`  ⇒ 등재문 CI 「crop y258~290」 = 프레임 y${(oy+258).toFixed(1)}~${(oy+290).toFixed(1)}`);
    say(`  ⇒ 등재문 CJ 「crop x491~670」 = 프레임 x${(ox+491).toFixed(1)}~${(ox+670).toFixed(1)}`);
  }

  /* ── A. 제품 단독: 짧은 탭 한 번 ──────────────────────────────────── */
  say('\n[A] 제품 단독 — 짧은 탭 1회(60ms) 뒤 경과별 스냅');
  await tap(60);
  await page.waitForTimeout(140); await snap('A/up+140');
  await page.waitForTimeout(300); await snap('A/up+440');
  await page.waitForTimeout(600); await snap('A/up+1040');
  await page.evaluate(() => { if(typeof rtHoldStop === 'function') rtHoldStop(false); });

  /* ── B. cap491 재현: 1패스(누름·홀드·뗌) → 되돌림 → 2패스(짧은 탭) ── */
  say('\n[B] cap491 8회차 순서 재현 — 1패스 홀드 → 재고·잔액 되돌림 → 2패스 짧은 탭');
  await setup();
  const pts0 = await page.evaluate(() => (S.temper && S.temper.pts) || 0);
  const r = await page.evaluate(s => { const e = document.querySelector(s); const b = e.getBoundingClientRect();
    return { x:b.x + b.width/2, y:b.y + b.height/2 }; }, SEL);
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  await page.waitForTimeout(60);  await snap('B/down+60');
  await page.waitForTimeout(420); await snap('B/hold+480');
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.evaluate(() => { if(typeof rtHoldStop === 'function') rtHoldStop(false); });
  await page.waitForTimeout(400); await snap('B/1패스 뗌+800');
  await page.evaluate(p0 => { S.tstone = 1e6; if(S.temper) S.temper.pts = p0; renderTrain(); }, pts0);
  await page.waitForTimeout(300); await snap('B/되돌림 직후');
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(140); await snap('B/2패스 up+140  ★ 등재문이 본 프레임');

  /* ── C. 가설 ⓐ 직격: `.jz-hdn` 이 붙은 채 hbFloat 이 도는가 ────────── */
  say('\n[C] 가설 ⓐ — 호스트에 걸린 «개별 변환 속성» 을 hbFloat 이 벗기는가');
  const c = await page.evaluate(hd => {
    const el = document.querySelector(hd), out = {};
    el.classList.add('jz-hdn');
    const cs = getComputedStyle(el);
    out.transform = cs.transform; out.scale = cs.scale; out.translate = cs.translate;
    let m = null; try { m = new DOMMatrixReadOnly(cs.transform); } catch(_){}
    out.matrix = m ? { a:+m.a.toFixed(4), d:+m.d.toFixed(4), e:+m.e.toFixed(2), f:+m.f.toFixed(2) } : null;
    const b = el.getBoundingClientRect(), f = fxSc();
    out.rect = { x:+((b.left-f.x)/f.s).toFixed(1), y:+((b.top-f.y)/f.s).toFixed(1),
                 w:+(b.width/f.s).toFixed(1), h:+(b.height/f.s).toFixed(1) };
    el.classList.remove('jz-hdn');
    const b2 = el.getBoundingClientRect();
    out.rest = { x:+((b2.left-f.x)/f.s).toFixed(1), y:+((b2.top-f.y)/f.s).toFixed(1),
                 w:+(b2.width/f.s).toFixed(1), h:+(b2.height/f.s).toFixed(1) };
    return out;
  }, HD);
  say(`  getComputedStyle(.tp-hd.jz-hdn).transform = ${c.transform}`);
  say(`  ... .scale = ${c.scale} · .translate = ${c.translate}`);
  say(`  ... DOMMatrixReadOnly(transform) = ${JSON.stringify(c.matrix)}`);
  say(`  jz-hdn 붙은 상자 ${fmtR(c.rect)} ↔ 뗀 상자 ${fmtR(c.rest)}`);
  const dy = (c.rect.y - c.rest.y).toFixed(1), dx = (c.rect.x - c.rest.x).toFixed(1);
  say(`  ⇒ 실제 밀림 Δ(${dx}, ${dy}) · 벗기기가 되돌리는 값 Δ(${c.matrix ? c.matrix.e : '?'}, ${c.matrix ? c.matrix.f : '?'})`);

  /* ── D 는 폐기했다(1회차 자백) ─────────────────────────────────────────
     «`#fxlc` 를 비우기 «전 ↔ 뒤» crop 두 장을 픽셀로 뺀다» 를 짜 봤는데 **자가 틀렸다**:
     두 장 사이 60ms 동안 토스트·hb 플로터·스파크가 계속 움직이므로 바이트 차이가 나도
     그것이 `#fxlc` 때문인지 알 수 없다(실제로 «다르다» 가 나왔는데 fxlc 에는 스파크뿐이었다).
     층 문제는 픽셀이 아니라 **z 로 닫힌다** — `#fxlc` z7 < `#trw` z29 < `#fxl` z60 이고,
     등재문이 본 사본은 `#fxl` 쪽이다(아래 [E] 가 그 사실을 직접 찍는다). */

  /* ── E. 결정 경로 — 누가 `fx-plus ui`(= #fxl · z60 · 팝업 위) 를 만드는가 ──
     518 가 세운 가드(`buried`)는 «팝업이 떠 있고 발원이 탭 추측이면 층을 팝업 아래로» 다.
     등재문이 본 사본은 `ui` 가 붙어 있었다 = **그 가드가 안 걸렸다.** 왜인지를 여기서 찍는다. */
  say('\n[E] 결정 경로 — fxFly/fxPlus 호출마다 발원·가드·층을 찍는다');
  await setup();
  await page.evaluate(() => {
    window.__fxLog = [];
    const okNum = v => (typeof v === 'number' ? +v.toFixed(1) : v);
    const _fly = fxFly, _plus = fxPlus;
    fxFly = function(from, cur, n){
      let cov = null, ovl = null; try { cov = fxCovered(); } catch(_){}
      try { ovl = from && from.el ? fxOverlaid(from.el) : null; } catch(_){}
      window.__fxLog.push({ fn:'fxFly', cur, n, from: from ? { x:okNum(from.x), y:okNum(from.y),
        combat:!!from.combat, tap:!!from.tap,
        el: from.el ? (from.el.id || from.el.className || from.el.tagName) : null } : null,
        covered:cov, overlaid:ovl, pill: !!(FXCUR[cur] && fxPill(FXCUR[cur])) });
      return _fly.apply(this, arguments);
    };
    fxPlus = function(cur, n, combat, at){
      window.__fxLog.push({ fn:'fxPlus', cur, n, combat:!!combat,
        at: at ? { x:okNum(at.x), y:okNum(at.y) } : null, lay: combat ? 'fxlc' : 'fxl(z60)' });
      return _plus.apply(this, arguments);
    };
  });
  const pts2 = await page.evaluate(() => (S.temper && S.temper.pts) || 0);
  const drain = async tag => {
    const l = await page.evaluate(() => { const a = window.__fxLog; window.__fxLog = []; return a; });
    if(!l.length){ say(`  [${tag}] —`); return; }
    for(const e of l) say(`  [${tag}] ${e.fn} ${e.cur} +${e.n}` + (e.fn === 'fxFly'
      ? ` 발원=${JSON.stringify(e.from)} covered=${e.covered} overlaid=${e.overlaid} pill=${e.pill}`
      : ` combat/buried=${e.combat} at=${JSON.stringify(e.at)} → ${e.lay}`));
  };
  await page.waitForTimeout(400); await drain('setup 직후');
  await page.mouse.move(r.x, r.y); await page.mouse.down();
  await page.waitForTimeout(480); await drain('1패스 홀드');
  await page.mouse.up(); await page.waitForTimeout(800);
  await page.evaluate(() => { if(typeof rtHoldStop === 'function') rtHoldStop(false); });
  await drain('1패스 뗌');
  await page.evaluate(p0 => { S.tstone = 1e6; if(S.temper) S.temper.pts = p0; renderTrain(); }, pts2);
  await page.waitForTimeout(300); await drain('★ 되돌림(하네스)');
  await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
  await page.waitForTimeout(140); await drain('2패스 up+140');
  await snap('E/2패스 up+140');

  /* ── F. 실제 플레이로 닿는가 — 하네스를 끄고 «손을 안 댄 채» 팝업을 열어 둔다 ──
     518 등재문이 이미 적어 둔 «표시가 없는 증가분(스테이지·파도 보너스 같은 자동 수입)» 이
     **탭 창(1200ms)마저 비어 있을 때** 어디로 가는지를 센다. 하네스는 아무 값도 안 건드린다. */
  say('\n[F] 실동작 — 팝업을 열어 둔 채 25초, 손도 안 대고 상태도 안 건드린다');
  await page.evaluate(() => {
    const v = document.getElementById('view'); if(v) v.style.visibility = '';   /* 전투를 실제로 돌린다 */
    /* ⚠ 앞 절이 넣어 둔 `S.gold = 1e18` 을 되돌린다 — 1e18 에서는 전투 골드가 **부동소수점에
       흡수돼** `v - fxSeen` 이 0 이 되어 증가 자체가 안 보인다(1회차에 fxFly 0회로 읽혔다). */
    S.gold = 1e6; S.dia = 1e4;
    window.__nul = []; window.__all = 0;
    const _fly = fxFly;
    fxFly = function(from, cur, n){
      window.__all++;
      if(!from || !fxPt(from)){
        let cov = null; try { cov = fxCovered(); } catch(_){}
        window.__nul.push({ cur, n, covered:cov });
      }
      return _fly.apply(this, arguments);
    };
    if(!$('trw').classList.contains('on')) openTrain();
    setTrSub('temper'); renderTrain();
  });
  await page.waitForTimeout(25000);                 /* 손을 안 댄다 — 탭 창(1200ms)이 계속 비어 있다 */
  const f = await page.evaluate(() => {
    const L = document.getElementById('fxl'), C = document.getElementById('fxlc');
    const pick = el => Array.from(el ? el.children : []).filter(d => d.classList.contains('fx-plus'))
      .map(d => { const r = fxRect(d); return { cls:d.className, txt:d.textContent,
        r: r ? { x:+r.x.toFixed(1), y:+r.y.toFixed(1) } : null }; });
    return { nul: window.__nul, all: window.__all, fxl: pick(L), fxlc: pick(C) };
  });
  say(`  fxFly 총 ${f.all}회 · 그 중 **발원 불명** ${f.nul.length}회`);
  const byCur = {};
  for(const e of f.nul) byCur[e.cur] = (byCur[e.cur] || 0) + 1;
  for(const k in byCur) say(`      ${k} ${byCur[k]}회 (covered=${f.nul.find(e => e.cur === k).covered})`);
  say(`  25초 뒤 살아 있는 .fx-plus — #fxl(z60·팝업 위) ${f.fxl.length}개 · #fxlc(z7·팝업 아래) ${f.fxlc.length}개`);
  for(const d of f.fxl)  say(`      fxl   «${d.txt}» ${d.cls} ${d.r ? `(${d.r.x},${d.r.y})` : ''}`);
  for(const d of f.fxlc) say(`      fxlc  «${d.txt}» ${d.cls} ${d.r ? `(${d.r.x},${d.r.y})` : ''}`);

  await browser.close();
  console.log('\n— probe578 끝 —');
})().catch(e => { console.error(e); process.exit(1); });
