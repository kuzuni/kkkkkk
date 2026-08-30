#!/usr/bin/env node
/* 작업 516 — 「도감의 [강화]·[일괄 강화] 버튼에 «지금 누를 게 있다» 레드닷이 안 뜬다」 **재현**
 * (338 규칙 — 고치기 전에 제품에게 먼저 묻는다. 338·341 은 여기서 등재문 가설이 기각됐던 자리다.)
 *
 *   node tools/probe516.js
 *
 * 등재문이 뿌리를 네 갈래로 적어 뒀다. 층이 다르므로 **하나만 고치면 안 낫는다**:
 *   ⓐ 판정 층 — `collReady`/`collTabReady`/`collTabPend` 가 틀렸는가(등재문은 «이미 옳다» 로 적었다)
 *   ⓑ 부품 층 — 그 버튼에 `<s class="updot">` 노드 자체가 있는가(283 이 «세 자리 전부» 라 적어 뒀다)
 *   ⓒ 그리기 층 — 166 특이성 함정. `#collw i,#collw s,…{display:inline-block}`(ID 급 1,0,1) 이
 *      `.updot{display:none}`(0,1,0) 을 이기면 `.alert` 와 **무관하게 상시 점등**이다
 *      (166 ⓔ · 202 §3 · 283 · 294 · 325 · 519 에서 이미 여섯 번 난 계열).
 *   ⓓ 좌표 층 — 471 규약(코너 안쪽 11px)으로 두면 `.cl-body{overflow-x:hidden}`(폭 860) 이 자르는가.
 *
 * 그래서 이 프로브는 층마다 따로 잰다:
 *   [A] 부품  — 6탭 × «전부 강화 가능» 상태에서 두 버튼의 `.updot` 노드 수
 *   [B] 그리기 — 노드를 손으로 심어 `.alert` **없이** 그려지는지(= 특이성 함정) + CSSOM 캐스케이드 승자
 *   [C] 판정  — `collTabReady(tab) === (collTabPend(tab) > 0)` 항등식과 `.clb-btn.rdy` == `collReady`
 *   [D] 좌표  — 471 규약대로 놓았을 때의 닷 상자와 클리핑 조상(`.cl-body` 860)·라벨 잉크 충돌
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const TABS = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : 'FAIL  ') + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderColl21 === 'function');
  await page.waitForTimeout(600);

  /* 전 아이템 Lv6 · 도감 단계 0 = 여섯 탭 전부 «강화 가능» (verify266 setup 과 같은 손잡이) */
  const setup = (lv, tab) => page.evaluate(([lv, tab]) => {
    [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => {
      if (lv) S.own[it.id] = { l: lv, n: 0 }; else delete S.own[it.id];
    });
    S.coll = {};
    openColl21(tab);
  }, [lv, tab]);

  /* ── [A] 부품 층 — 노드가 있는가 ─────────────────────────────────────────── */
  console.log('\n[A] 부품 — 두 버튼에 `.updot` 노드가 있는가 (전 탭 «강화 가능» 상태)');
  {
    const rows = [];
    await setup(6, 'weapon');
    for (const t of TABS) {
      const r = await page.evaluate(tab => {
        collTab = tab; renderColl21();
        const all = document.getElementById('collAll');
        const btns = [...document.querySelectorAll('#collList .clb-btn')];
        return {
          tab,
          ready: collTabReady(tab),
          pend: collTabPend(tab),
          allShown: getComputedStyle(all).display !== 'none',
          allDot: all.querySelectorAll('.updot').length,
          allAlert: all.classList.contains('alert'),
          btnN: btns.length,
          btnRdy: btns.filter(b => b.classList.contains('rdy')).length,
          btnDot: btns.reduce((n, b) => n + b.querySelectorAll('.updot').length, 0),
          btnAlert: btns.filter(b => b.classList.contains('alert')).length,
        };
      }, t);
      rows.push(r);
      console.log('      ' + r.tab.padEnd(7) + ' ready=' + r.ready + ' pend=' + String(r.pend).padStart(2)
        + ' | [일괄] 보임=' + r.allShown + ' 닷=' + r.allDot + ' alert=' + r.allAlert
        + ' | [강화] rdy ' + r.btnRdy + '/' + r.btnN + ' 닷=' + r.btnDot + ' alert=' + r.btnAlert);
    }
    const allDots = rows.reduce((n, r) => n + r.allDot, 0);
    const btnDots = rows.reduce((n, r) => n + r.btnDot, 0);
    ok(rows.every(r => r.ready && r.pend > 0), 'A0 표본이 «전 탭 강화 가능» 상태다');
    ok(rows.every(r => r.allShown), 'A1 [일괄 강화] 버튼은 여섯 탭 전부 보인다(266 그대로)');
    ok(allDots > 0, 'A2 [일괄 강화] 버튼에 레드닷 노드가 있다', '닷 ' + allDots + '개');
    ok(btnDots > 0, 'A3 세트별 [강화] 버튼에 레드닷 노드가 있다', '닷 ' + btnDots + '개 / rdy '
      + rows.reduce((n, r) => n + r.btnRdy, 0) + '개');
  }

  /* ── [B] 그리기 층 — 166 특이성 함정 ─────────────────────────────────────── */
  console.log('\n[B] 그리기 — `.alert` 없이도 닷이 그려지는가(특이성 함정) + 캐스케이드 승자');
  {
    const r = await page.evaluate(() => {
      const p = n => Math.round(n * 100) / 100;
      /* 노드를 손으로 심는다 — 제품이 아직 안 다는 자리라 «달았다면 어떻게 그려지나» 를 묻는 것이다 */
      const all = document.getElementById('collAll');
      const btn = document.querySelector('#collList .clb-btn');
      const mk = host => { const s = document.createElement('s'); s.className = 'updot'; host.appendChild(s); return s; };
      const d1 = mk(all), d2 = mk(btn);

      /* 특이성 계산 — probe519 [A] 와 같은 자 */
      const spec = sel => {
        const s = sel.trim();
        const a = (s.match(/#[\w-]+/g) || []).length;
        const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
        const c = (s.replace(/[#.][\w-]+|\[[^\]]+\]|:{1,2}[\w-]+/g, '').match(/[a-zA-Z][\w-]*/g) || []).length;
        return [a, b, c];
      };
      const cmp = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);
      const rules = [];
      const walk = list => {
        if (!list) return;
        for (const rr of list) {
          if (rr.type === 1 && rr.selectorText) {
            if (!/(^|;|\s)display\s*:/.test(rr.style.cssText || '')) continue;
            for (const sel of rr.selectorText.split(',')) {
              let hit = false;
              try { hit = !!d1.matches(sel.trim()); } catch (e) {}
              if (hit) rules.push({ sel: sel.trim(), disp: rr.style.display, sp: spec(sel) });
            }
          } else if (rr.cssRules && (rr.type === 4 || rr.type === 12)) walk(rr.cssRules);
        }
      };
      for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } walk(rs); }
      let win = null;
      rules.forEach(rr => { if (!win || cmp(rr.sp, win.sp) >= 0) win = rr; });

      /* 325 함정 — 등장 애니(`jzDotIn`)가 rect 를 0 으로 만든다. 잠깐 끄고 잰다. */
      const seen = el => {
        const prev = el.style.animation; el.style.animation = 'none';
        const cs = getComputedStyle(el), rc = el.getBoundingClientRect();
        el.style.animation = prev;
        return { disp: cs.display, w: p(rc.width), h: p(rc.height) };
      };
      /* ⚠ 수리 **후** 트리에서는 호스트가 이미 `.alert` 를 달고 있다 — 떼고 재야 «규약이
         돌아왔는가» 를 묻는 것이 된다(안 떼면 이 항이 수리 전과 똑같이 빨갛다). */
      const had = [all.classList.contains('alert'), btn.classList.contains('alert')];
      all.classList.remove('alert'); btn.classList.remove('alert');
      const noAlert = { all: seen(d1), btn: seen(d2) };
      all.classList.add('alert'); btn.classList.add('alert');
      const withAlert = { all: seen(d1), btn: seen(d2) };
      if (!had[0]) all.classList.remove('alert');
      if (!had[1]) btn.classList.remove('alert');
      d1.remove(); d2.remove();
      return {
        rules: rules.map(x => x.sp.join(',') + ' ' + x.sel + ' → ' + x.disp),
        win: win ? win.sel + ' → ' + win.disp + ' (' + win.sp.join(',') + ')' : null,
        noAlert, withAlert,
      };
    });
    r.rules.forEach(x => console.log('      규칙 ' + x));
    console.log('      승자 ' + r.win);
    console.log('      .alert 없음 → [일괄] ' + JSON.stringify(r.noAlert.all) + ' · [강화] ' + JSON.stringify(r.noAlert.btn));
    console.log('      .alert 있음 → [일괄] ' + JSON.stringify(r.withAlert.all) + ' · [강화] ' + JSON.stringify(r.withAlert.btn));
    ok(r.noAlert.all.disp === 'none' && r.noAlert.btn.disp === 'none',
      'B1 `.alert` 가 없으면 닷이 안 그려진다(166 규약)', 'all=' + r.noAlert.all.disp + ' btn=' + r.noAlert.btn.disp);
    ok(r.withAlert.all.disp === 'block' && r.withAlert.btn.disp === 'block',
      'B2 `.alert` 를 붙이면 그려진다', 'all=' + r.withAlert.all.disp + ' btn=' + r.withAlert.btn.disp);
  }

  /* ── [C] 판정 층 ─────────────────────────────────────────────────────────── */
  console.log('\n[C] 판정 — 기존 식이 이미 옳은가(등재문 ⓐ)');
  {
    const r = await page.evaluate(() => {
      const out = [];
      const tabs = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];
      /* 세 상태: 미보유(0) · Lv6(전부 가능) · 단계를 다 채운 상태 */
      const states = [
        ['미보유', () => { [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => delete S.own[it.id]); S.coll = {}; }],
        ['Lv6', () => { [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => S.own[it.id] = { l: 6, n: 0 }); S.coll = {}; }],
        ['소진', () => {
          [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => S.own[it.id] = { l: 6, n: 0 });
          S.coll = {}; COLL_SETS.forEach(st => { S.coll[st.key] = collCap(st); });
        }],
      ];
      states.forEach(([nm, fn]) => {
        fn();
        tabs.forEach(t => {
          collTab = t; renderColl21();
          const btns = [...document.querySelectorAll('#collList .clb-btn')];
          const sets = COLL_SETS.filter(s => s.tab === t);
          out.push({
            st: nm, tab: t,
            ident: collTabReady(t) === (collTabPend(t) > 0),
            rdyMatch: btns.length === sets.length
              && btns.every((b, i) => b.classList.contains('rdy') === collReady(sets[i].key)),
            disMatch: btns.every((b, i) => b.disabled === !collReady(sets[i].key)),
          });
        });
      });
      return out;
    });
    const bad = r.filter(x => !x.ident);
    const bad2 = r.filter(x => !x.rdyMatch || !x.disMatch);
    ok(bad.length === 0, 'C1 항등식 `collTabReady === collTabPend>0` (18 표본)',
      bad.length ? bad.map(x => x.st + '/' + x.tab).join(',') : '18/18');
    ok(bad2.length === 0, 'C2 `.clb-btn.rdy`·disabled == `collReady(세트)` (18 표본)',
      bad2.length ? bad2.map(x => x.st + '/' + x.tab).join(',') : '18/18');
  }

  /* ── [E] 실제로 그려진 닷 — 자리·클리핑·등장 봉우리 ──────────────────────── */
  console.log('\n[E] 그려진 닷 — 코너 안쪽 거리 · 클립 여유(정지 / 맥박 1.14 / 등장 봉우리 1.3)');
  {
    await setup(6, 'weapon');
    const r = await page.evaluate(() => {
      const p = n => Math.round(n * 100) / 100;
      const RING = 7.5;                 /* 닷 반지름 밖 검정 링 두께 */
      const body = document.querySelector('.cl-body').getBoundingClientRect();
      const one = (host, label) => {
        const dot = host.querySelector('.updot');
        if (!dot) return { label, missing: true };
        const prev = dot.style.animation; dot.style.animation = 'none';
        const rc = dot.getBoundingClientRect(), hr = host.getBoundingClientRect();
        dot.style.animation = prev;
        const cx = rc.x + rc.width / 2, cy = rc.y + rc.height / 2;
        const ring = rc.width / 2 + RING;
        return {
          label, missing: false,
          dx: p(hr.right - cx), dy: p(cy - hr.top),          /* 호스트 테두리 바깥 코너 ↔ 닷 중심 */
          rest: p(body.right - (cx + ring)),
          pulse: p(body.right - (cx + ring * 1.14)),
          peak: p(body.right - (cx + ring * 1.3)),
        };
      };
      return {
        all: one(document.getElementById('collAll'), '#collAll'),
        btn: one(document.querySelector('#collList .clb-btn'), '.clb-btn'),
      };
    });
    [r.all, r.btn].forEach(x => console.log('      ' + x.label.padEnd(10) +
      (x.missing ? ' 닷 없음' : ' 코너 안쪽 (' + x.dx + ', ' + x.dy + ') | 클립 여유 정지 ' + x.rest
        + ' · 맥박 ' + x.pulse + ' · 봉우리 ' + x.peak)));
    ok(!r.all.missing && !r.btn.missing, 'E0 두 버튼에 닷이 실제로 그려졌다');
    if (!r.all.missing && !r.btn.missing) {
      ok(Math.abs(r.all.dx - 11) <= 1 && Math.abs(r.all.dy - 11) <= 1,
        'E1 [일괄 강화] 닷 중심이 코너 안쪽 11±1px(471 규약)', '(' + r.all.dx + ', ' + r.all.dy + ')');
      ok(Math.abs(r.btn.dy - 11) <= 1, 'E2 [강화] 닷 세로는 규약 11±1px', 'dy=' + r.btn.dy);
      ok(Math.abs(r.btn.dx - 16) <= 1, 'E3 [강화] 닷 가로는 471 예외 ⑤ 16±1px(클립 회피)', 'dx=' + r.btn.dx);
      ok(r.btn.peak > 0 && r.all.peak > 0, 'E4 등장 봉우리(1.3)에서도 두 닷 다 클립 안',
        '[강화] ' + r.btn.peak + ' · [일괄] ' + r.all.peak);
    }
  }

  /* ── [D] 좌표 층 — 471 규약대로 놓으면 잘리는가 ──────────────────────────── */
  console.log('\n[D] 좌표 — 471 규약(코너 안쪽 11px)으로 놓았을 때의 상자·클리핑·잉크 충돌');
  {
    await setup(6, 'weapon');
    const r = await page.evaluate(() => {
      const p = n => Math.round(n * 100) / 100;
      const IN = 11, R = 13.5, RING = 21;      /* 규약 안쪽 11 · 닷 반지름 13.5 · 바깥 링 반지름 21 */
      const one = (host, bw, label) => {
        const rc = host.getBoundingClientRect();
        const sc = rc.width / host.offsetWidth || 1;         /* 프레임 → 화면 배율 */
        /* 코너(테두리 바깥 상자 우상단)에서 안쪽으로 11px 인 «중심» */
        const cx = rc.right - IN * sc, cy = rc.top + IN * sc;
        const body = document.querySelector('.cl-body').getBoundingClientRect();
        const lab = host.querySelector('b,i');
        const lr = lab ? lab.getBoundingClientRect() : null;
        return {
          label, bw,
          host: { w: p(host.offsetWidth), h: p(host.offsetHeight) },
          ringRight: p(cx + RING * sc), ringTop: p(cy - RING * sc),
          clipRight: p(body.right), clipLeft: p(body.left),
          slack: p(body.right - (cx + RING * sc)),
          labRight: lr ? p(lr.right) : null,
          gapToLabel: lr ? p((cx - RING * sc) - lr.right) : null,
        };
      };
      const all = document.getElementById('collAll');
      const btn = document.querySelector('#collList .clb-btn');
      return {
        all: one(all, parseFloat(getComputedStyle(all).borderRightWidth) || 0, '#collAll'),
        btn: one(btn, parseFloat(getComputedStyle(btn).borderRightWidth) || 0, '.clb-btn'),
        bodyOX: getComputedStyle(document.querySelector('.cl-body')).overflowX,
      };
    });
    console.log('      .cl-body overflow-x = ' + r.bodyOX + ' (우변 ' + r.btn.clipRight + ')');
    [r.all, r.btn].forEach(x => console.log('      ' + x.label.padEnd(10) + ' ' + x.host.w + '×' + x.host.h
      + ' 테두리 ' + x.bw + ' | 링 우단 ' + x.ringRight + ' 여유 ' + x.slack
      + ' | 라벨 잉크 우단 ' + x.labRight + ' 여유 ' + x.gapToLabel));
    ok(r.btn.slack >= 0, 'D1 세트별 [강화] 닷이 `.cl-body` 가로 클립(860) 안에 든다', '여유 ' + r.btn.slack + 'px');
    ok(r.all.slack >= 0, 'D2 [일괄 강화] 닷이 클립 밖으로 안 나간다', '여유 ' + r.all.slack + 'px');
    ok(r.btn.gapToLabel > 0 && r.all.gapToLabel > 0, 'D3 두 닷 모두 라벨 잉크를 안 밟는다',
      '[강화] ' + r.btn.gapToLabel + ' · [일괄] ' + r.all.gapToLabel);
  }

  ok(errs.length === 0, 'F1 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\nPROBE516 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
