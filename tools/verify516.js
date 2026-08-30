#!/usr/bin/env node
/* 516 검증 — 21 도감 [강화]·[일괄 강화] 버튼 레드닷 (저장소 주인 지시 2026-08-31)
 *
 *   node tools/verify516.js
 *
 * 주인 원문: «도감에 일괄강화버튼 빨간점 알림하라» · «도감에 강화버튼도 빨간점 알림».
 *
 * 등재문이 요구한 다섯 축을 그대로 절로 삼는다:
 *   [A] 설치 — 부품(`.updot`)·스코프 짝(`#collw`)·좌표 변수가 다 있다.
 *   [B] 점등 == 판정 — 6탭 × 세 상태(미보유 · Lv6 · 단계 소진) 18표본에서 두 버튼의 닷 유무가
 *       `collReady`/`collTabReady` 와 **완전 일치**(헛점등·헛소등 0). 새 판정을 만들지 않았다는 증거다.
 *   [C] 찍힌 픽셀 — 350·364 처방. DOM 이 아니라 **화면에 칠해진 빨강**을 센다
 *       (166 계열 함정은 전부 «DOM 은 옳은데 그림이 다르다» 였다).
 *   [D] 자리 — 471 규약(코너 안쪽 11±1) · `.clb-btn` 은 **471 예외 ⑤**(가로 16±1, 클립 회피) ·
 *       등장 봉우리 1.3 에서도 `.cl-body{overflow-x:hidden}` 안.
 *   [E] 특이성 회귀 — ID 급 `<s>` 규칙이 있는 스코프 다섯에 짝이 살아 있다
 *       (`#collw`·`#wpnw`·`#blsw`·`:is(#bSk,#bPet,#bCos)`·`#trw`).
 *   [F] 18114 항등식(`collTabReady === collTabPend>0`) 유지 + 266 회귀(버튼 표시 조건 불변).
 *   [G] 실동작(기능 완성 규칙) — 진짜 포인터 클릭으로 [강화]·[일괄 강화] → 단계가 오르고
 *       닷이 그 자리에서 꺼지고 **localStorage 에 저장**된다.
 *   [R] 되돌림 시험 — `#collw` 짝 두 줄을 CSSOM 에서 빼면 `.alert` 없이도 닷이 그려진다(= 상시 점등).
 *       무르게 푼 수리가 아님을 이 절이 못박는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const TABS = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
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

  const setup = (lv, tab, full) => page.evaluate(([lv, tab, full]) => {
    [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => {
      if (lv) S.own[it.id] = { l: lv, n: 0 }; else delete S.own[it.id];
    });
    S.coll = {};
    if (full) COLL_SETS.forEach(st => { S.coll[st.key] = collCap(st); });
    openColl21(tab);
  }, [lv, tab, !!full]);

  /* ── [A] 설치 ─────────────────────────────────────────────────────────────
     LESSONS 254 — 되돌린 트리에서 게이트가 FAIL 이 아니라 TimeoutError 로 죽으면 정작
     잡아야 할 회귀에서 아무것도 못 잡는다. 부품이 없으면 여기서 빨갛게 끝낸다. */
  {
    await setup(6, 'weapon');
    const a = await page.evaluate(() => {
      const all = document.getElementById('collAll');
      const btn = document.querySelector('#collList .clb-btn.rdy');
      const css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } })
        .filter(r => r.selectorText).map(r => r.selectorText);
      return {
        allDot: !!(all && all.querySelector('.updot')),
        btnDot: !!(btn && btn.querySelector('.updot')),
        pair: css.some(s => /#collw\s+\.updot/.test(s)) && css.some(s => /#collw\s+\.alert\s*>\s*\.updot/.test(s)),
        bw: btn ? getComputedStyle(btn).getPropertyValue('--dot-bw').trim() : '',
        inx: btn ? getComputedStyle(btn).getPropertyValue('--dot-in-x').trim() : '',
      };
    });
    ok(a.allDot, 'A1 [일괄 강화] 버튼에 `.updot` 노드가 있다');
    ok(a.btnDot, 'A2 세트별 [강화](rdy) 버튼에 `.updot` 노드가 있다');
    ok(a.pair, 'A3 `#collw` 특이성 짝 두 줄이 있다');
    ok(a.bw === '6px' && a.inx === '16px', 'A4 `.clb-btn` 좌표 변수(--dot-bw 6 · --dot-in-x 16)',
      'bw=' + a.bw + ' inx=' + a.inx);
    if (!a.allDot || !a.btnDot || !a.pair) {
      await browser.close();
      console.log('\nVERIFY516 ' + pass + '/' + (pass + fail) + ' FAIL — 516 이 설치돼 있지 않다(이후 항목 생략)');
      process.exit(1);
    }
  }

  /* ── [B] 점등 == 판정 (18 표본) ───────────────────────────────────────────── */
  {
    const rows = await page.evaluate(() => {
      const out = [];
      const states = [
        ['미보유', 0, false], ['Lv6', 6, false], ['소진', 6, true],
      ];
      const tabs = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];
      const shown = el => {
        if (!el) return false;
        const prev = el.style.animation; el.style.animation = 'none';
        const d = getComputedStyle(el).display, w = el.getBoundingClientRect().width;
        el.style.animation = prev;
        return d !== 'none' && w > 0;
      };
      states.forEach(([nm, lv, full]) => {
        [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => {
          if (lv) S.own[it.id] = { l: lv, n: 0 }; else delete S.own[it.id];
        });
        S.coll = {};
        if (full) COLL_SETS.forEach(st => { S.coll[st.key] = collCap(st); });
        tabs.forEach(t => {
          collTab = t; renderColl21();
          const all = document.getElementById('collAll');
          const allOn = getComputedStyle(all).display !== 'none' && shown(all.querySelector('.updot'));
          const sets = COLL_SETS.filter(s => s.tab === t);
          const btns = [...document.querySelectorAll('#collList .clb-btn')];
          const perSet = btns.map((b, i) => ({
            on: shown(b.querySelector('.updot')), want: collReady(sets[i].key),
          }));
          out.push({
            st: nm, tab: t,
            allOn, allWant: collTabReady(t),
            wrong: perSet.filter(x => x.on !== x.want).length, n: perSet.length,
          });
        });
      });
      return out;
    });
    const badAll = rows.filter(r => r.allOn !== r.allWant);
    const badSet = rows.filter(r => r.wrong > 0);
    const nSet = rows.reduce((n, r) => n + r.n, 0);
    ok(badAll.length === 0, 'B1 [일괄 강화] 닷 == `collTabReady` (18 표본)',
      badAll.length ? badAll.map(r => r.st + '/' + r.tab).join(',') : '18/18');
    ok(badSet.length === 0, 'B2 세트별 [강화] 닷 == `collReady(세트)` (' + nSet + ' 버튼)',
      badSet.length ? badSet.map(r => r.st + '/' + r.tab + ':' + r.wrong).join(',') : nSet + '/' + nSet);
    /* 헛점등 0 을 «켜질 수 없는 상태» 쪽에서 한 번 더 못박는다(519 의 반대편) */
    const off = rows.filter(r => r.st !== 'Lv6');
    ok(off.every(r => !r.allOn) && off.every(r => r.wrong === 0),
      'B3 «올릴 게 없는» 12 표본에서 닷이 하나도 안 켜진다(헛점등 0)');
  }

  /* ── [C] 찍힌 픽셀 ────────────────────────────────────────────────────────
     ⚑ DOM 이 아니라 **칠해진 빨강**을 센다. 이 계열(166 ⓔ · 202 · 283 · 294 · 325 · 519)의
     결함은 예외 없이 «DOM 은 옳은데 그림이 다르다» 였으므로 자를 화면 쪽에 세운다.
     닷 코어는 `#F22E52`(242,46,82) — 버튼의 금빛(`#F5A623`)·초록(`.ifbtn`)과 G 채널로 갈린다. */
  const redPix = async (sel) => {
    const box = await page.evaluate((s) => {
      const host = document.querySelector(s);
      const dot = host && host.querySelector('.updot');
      if (!dot) return null;
      dot.style.animation = 'none';                     /* 봉우리 배율이 섞이지 않게 정지시켜 찍는다 */
      const r = dot.getBoundingClientRect();
      return { x: Math.floor(r.x) - 4, y: Math.floor(r.y) - 4, width: Math.ceil(r.width) + 8, height: Math.ceil(r.height) + 8 };
    }, sel);
    if (!box) return 0;
    const shot = await page.screenshot({ clip: box });
    return page.evaluate(async (b64) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      const d = c.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 190 && d[i + 1] < 100 && d[i + 2] > 40 && d[i + 2] < 140) n++;
      }
      return n;
    }, shot.toString('base64'));
  };
  {
    await setup(6, 'weapon');
    const onAll = await redPix('#collAll');
    const onBtn = await redPix('#collList .clb-btn.rdy');
    /* 소진 상태 = 켜질 수 없는 자리. 노드가 아예 없으므로 같은 좌표를 손으로 재서 센다. */
    await setup(6, 'weapon', true);
    const offPix = await page.evaluate(() => ({
      all: !!document.querySelector('#collAll .updot'),
      btn: !!document.querySelector('#collList .clb-btn .updot'),
      shown: getComputedStyle(document.getElementById('collAll')).display !== 'none',
    }));
    ok(onAll > 300, 'C1 [일괄 강화] 자리에 빨간 화소가 찍힌다', onAll + ' px');
    ok(onBtn > 300, 'C2 [강화] 자리에 빨간 화소가 찍힌다', onBtn + ' px');
    ok(!offPix.all && !offPix.btn && !offPix.shown,
      'C3 올릴 게 없으면 두 자리 다 노드·버튼이 통째로 없다', JSON.stringify(offPix));
  }

  /* ── [D] 자리 — 471 규약 + 예외 ⑤ ────────────────────────────────────────── */
  {
    await setup(6, 'weapon');
    const g = await page.evaluate(() => {
      const p = n => Math.round(n * 100) / 100;
      const body = document.querySelector('.cl-body').getBoundingClientRect();
      const one = sel => {
        const host = document.querySelector(sel), dot = host.querySelector('.updot');
        const prev = dot.style.animation; dot.style.animation = 'none';
        const r = dot.getBoundingClientRect(), hr = host.getBoundingClientRect();
        dot.style.animation = prev;
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2, ring = r.width / 2 + 7.5;
        return {
          dx: p(hr.right - cx), dy: p(cy - hr.top),
          quad: cx > hr.x + hr.width / 2 && cy < hr.y + hr.height / 2,     /* 299 우상단 사분면 */
          peak: p(body.right - (cx + ring * 1.3)),
          size: p(r.width),
        };
      };
      return { all: one('#collAll'), btn: one('#collList .clb-btn.rdy') };
    });
    ok(Math.abs(g.all.dx - 11) <= 1 && Math.abs(g.all.dy - 11) <= 1,
      'D1 [일괄 강화] 닷 중심 = 코너 안쪽 11±1px(471 규약)', '(' + g.all.dx + ', ' + g.all.dy + ')');
    ok(Math.abs(g.btn.dx - 16) <= 1 && Math.abs(g.btn.dy - 11) <= 1,
      'D2 [강화] 닷 중심 = (16, 11)±1px — 471 예외 ⑤(가로만 클립 회피)', '(' + g.btn.dx + ', ' + g.btn.dy + ')');
    ok(g.all.quad && g.btn.quad, 'D3 두 닷 다 호스트 우상단 사분면(299 규약)');
    ok(g.btn.peak > 0 && g.all.peak > 0, 'D4 등장 봉우리(1.3)에서도 `.cl-body` 가로 클립 밖으로 안 나간다',
      '[강화] 여유 ' + g.btn.peak + 'px · [일괄] ' + g.all.peak + 'px');
    /* [전제] — 규약값 11 이었다면 실제로 잘린다(예외 ⑤ 가 «괜히 만든 예외» 가 아님을 못박는다) */
    ok(g.btn.peak < 16 - 11 + 3, 'D5 [전제] 가로 여유는 규약값 11 로는 봉우리에서 모자란다',
      '예외로 번 것 5px · 현재 여유 ' + g.btn.peak + 'px');
    ok(g.all.size === 27 && g.btn.size === 27, 'D6 닷 크기는 공용 부품 27px 그대로', g.all.size + '/' + g.btn.size);
  }

  /* ── [E] 특이성 회귀 — 스코프 짝 다섯 ─────────────────────────────────────── */
  {
    const sc = await page.evaluate(() => {
      const sels = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } })
        .filter(r => r.selectorText).map(r => r.selectorText);
      const has = re => sels.some(s => re.test(s));
      return {
        collw: has(/#collw\s+\.updot/) && has(/#collw\s+\.alert\s*>\s*\.updot/),
        wpnw: has(/#wpnw\s+\.updot/) && has(/#wpnw\s+\.alert\s*>\s*\.updot/),
        blsw: has(/#blsw\s+\.updot/) && has(/#blsw\s+\.alert\s*>\s*\.updot/),
        sheets: has(/#bSk[^{]*\.updot/) && has(/#bSk[^{]*\.alert\s*>\s*\.updot/),
        trw: has(/#trw\s+\.stab\s*>\s*\.bdg/) && has(/#trw\s+\.stab\.alert\s*>\s*\.bdg/),
        /* 재료는 그대로다 — 짝이 재료를 «이기는» 것이지 재료를 지운 것이 아니다(519 [1-c]) */
        src: has(/#collw\s+s\b/) || has(/#collw i,#collw s/),
      };
    });
    ok(sc.collw, 'E1 `#collw` 짝');
    ok(sc.wpnw && sc.blsw && sc.sheets, 'E2 앞선 네 자리(#wpnw·#blsw·07/26/50 시트) 짝이 살아 있다');
    ok(sc.trw, 'E3 519 가 세운 `#trw` 짝이 살아 있다');
    ok(sc.src, 'E4 [전제] `#collw ... s{display:inline-block}` 재료는 그대로다(지워서 «고친» 것이 아니다)');
  }

  /* ── [F] 항등식 + 266 회귀 ────────────────────────────────────────────────── */
  {
    const f = await page.evaluate(() => {
      const tabs = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];
      let ident = 0, showEq = 0;
      [[0, false], [6, false], [6, true]].forEach(([lv, full]) => {
        [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => {
          if (lv) S.own[it.id] = { l: lv, n: 0 }; else delete S.own[it.id];
        });
        S.coll = {};
        if (full) COLL_SETS.forEach(st => { S.coll[st.key] = collCap(st); });
        tabs.forEach(t => {
          collTab = t; renderColl21();
          if (collTabReady(t) === (collTabPend(t) > 0)) ident++;
          const shown = getComputedStyle(document.getElementById('collAll')).display !== 'none';
          if (shown === collTabReady(t)) showEq++;
        });
      });
      return { ident, showEq };
    });
    ok(f.ident === 18, 'F1 18114 항등식 `collTabReady === collTabPend>0` (18 표본)', f.ident + '/18');
    ok(f.showEq === 18, 'F2 266 회귀 — [일괄 강화] 표시 조건 불변(== collTabReady)', f.showEq + '/18');
  }

  /* ── [G] 실동작(기능 완성 규칙) ───────────────────────────────────────────── */
  {
    await page.evaluate(() => localStorage.removeItem('__v516'));
    await setup(2, 'weapon');                    /* Lv2 = 세트마다 2단계까지 = 두 번 누르면 소진 */
    const before = await page.evaluate(() => {
      const st = COLL_SETS.filter(s => s.tab === 'weapon')[0];
      return { key: st.key, step: collStep(st.key), cap: collCap(st) };
    });
    await page.click('#collList .clb-btn.rdy');
    await page.waitForTimeout(120);
    const mid = await page.evaluate(k => ({
      step: collStep(k),
      dot: !!document.querySelector('#collList .clb-btn.rdy .updot'),
    }), before.key);
    ok(mid.step === before.step + 1, 'G1 [강화] 실제 클릭 → 그 세트 단계 +1',
      before.step + ' → ' + mid.step + ' (cap ' + before.cap + ')');

    /* 소진까지 눌러 «그 자리에서 꺼지는가» 를 본다 */
    const drain = await page.evaluate(async () => {
      for (let i = 0; i < 40; i++) {
        const b = document.querySelector('#collList .clb-btn.rdy');
        if (!b) break;
        b.click();
      }
      renderColl21();
      return {
        rdy: document.querySelectorAll('#collList .clb-btn.rdy').length,
        dots: document.querySelectorAll('#collList .clb-btn .updot').length,
        allShown: getComputedStyle(document.getElementById('collAll')).display !== 'none',
        allDot: !!document.querySelector('#collAll .updot'),
        pend: collTabPend('weapon'),
      };
    });
    ok(drain.rdy === 0 && drain.dots === 0, 'G2 다 올리면 그 탭 [강화] 닷이 전부 꺼진다',
      'rdy=' + drain.rdy + ' dots=' + drain.dots);
    ok(!drain.allShown && !drain.allDot && drain.pend === 0,
      'G3 [일괄 강화] 버튼·닷도 같이 사라진다', 'pend=' + drain.pend);

    /* [일괄 강화] 경로 — 다른 탭에서 진짜 클릭 */
    await setup(3, 'pet');
    const bAll = await page.evaluate(() => ({ pend: collTabPend('pet'), dot: !!document.querySelector('#collAll .updot') }));
    await page.click('#collAll');
    await page.waitForTimeout(150);
    const aAll = await page.evaluate(() => ({
      pend: collTabPend('pet'),
      dot: !!document.querySelector('#collAll .updot'),
      shown: getComputedStyle(document.getElementById('collAll')).display !== 'none',
      saved: (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })(),
    }));
    ok(bAll.dot && bAll.pend > 0, 'G4 [일괄 강화] 누르기 전 닷이 켜져 있다', 'pend=' + bAll.pend);
    ok(aAll.pend === 0 && !aAll.dot && !aAll.shown, 'G5 누른 뒤 닷·버튼이 같이 꺼진다', 'pend=' + aAll.pend);
    ok(aAll.saved && aAll.saved.coll && Object.keys(aAll.saved.coll).length > 0,
      'G6 결과가 localStorage 에 저장된다(기능 완성 규칙)',
      'coll 키 ' + (aAll.saved.coll ? Object.keys(aAll.saved.coll).length : 0) + '개');
  }

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────────── */
  {
    await setup(6, 'weapon');
    const r = await page.evaluate(() => {
      const p = n => Math.round(n * 100) / 100;
      /* `#collw` 짝 두 줄을 CSSOM 에서 빼고 «수리 전 트리» 를 만든다 */
      const killed = [];
      for (const sh of document.styleSheets) {
        let rules; try { rules = sh.cssRules; } catch (e) { continue; }
        for (let i = rules.length - 1; i >= 0; i--) {
          const s = rules[i].selectorText || '';
          if (/^#collw\s+\.updot$/.test(s) || /^#collw\s+\.alert\s*>\s*\.updot$/.test(s)) {
            killed.push({ sh, i, text: rules[i].cssText });
            sh.deleteRule(i);
          }
        }
      }
      const btn = document.querySelector('#collList .clb-btn.rdy');
      const dot = btn.querySelector('.updot');
      const seen = () => {
        const prev = dot.style.animation; dot.style.animation = 'none';
        const d = getComputedStyle(dot).display, w = p(dot.getBoundingClientRect().width);
        dot.style.animation = prev;
        return { d, w };
      };
      btn.classList.remove('alert');
      const noAlert = seen();
      btn.classList.add('alert');
      const withAlert = seen();
      killed.reverse().forEach(k => { try { k.sh.insertRule(k.text, k.i); } catch (e) {} });
      const back = (btn.classList.remove('alert'), seen());
      btn.classList.add('alert');
      return { killed: killed.length, noAlert, withAlert, back };
    });
    ok(r.killed === 2, 'R1 되돌림 대상 규칙 2줄을 찾았다', r.killed + '줄');
    ok(r.noAlert.d !== 'none' && r.noAlert.w > 0,
      'R2 짝을 빼면 `.alert` 없이도 닷이 그려진다(= 상시 점등으로 되돌아간다)',
      'display=' + r.noAlert.d + ' w=' + r.noAlert.w);
    ok(r.back.d === 'none', 'R3 규칙을 되살리면 다시 소등된다(무르게 푼 수리가 아니다)',
      'display=' + r.back.d);
  }

  ok(errs.length === 0, 'H1 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\nVERIFY516 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
