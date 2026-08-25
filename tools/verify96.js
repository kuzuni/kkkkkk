/* 작업 96 — 서브탭 공용화 게이트
 *
 * 저장소 주인 지시(2026-08-26)의 검증 항목을 그대로 옮긴 것이다:
 *   ① 영웅 4탭 · 던전 2탭 · 상점 2탭의 **활성/비활성 칸 스타일이 동일**
 *      (computed style 비교: 배경·테두리·폰트 Δ0)
 *   ② 영웅 스킬↔장비 전환 연속 8프레임에서 **`#eqw` bbox 이동 0**
 *      (= «장비 탭만 아래에서 다시 등장» 하지 않는다)
 *   ③ 폐기 부품 잔존 0 (`.dns-t.l/.r` 스킨 · `.shp-cat-pill` · `.shp-cs` · `.eqtc>b` · `#herosub`)
 *   ④ 전환이 실제로 동작(본문 교체 · shopCat/dunSub 상태 · 콘솔 에러 0)
 *
 * 실행: node tools/verify96.js  → 마지막 줄이 `VERIFY96 PASS` 여야 한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

/* 비교 대상 — «배경·테두리·폰트» 축만 본다(위치·폭은 화면별 실측이라 다르다) */
const CELL_PROPS = ['backgroundImage', 'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopColor',
  'borderRadius', 'boxShadow', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight'];
const BAR_PROPS = ['backgroundImage', 'backgroundColor', 'borderTopWidth', 'borderTopColor',
  'borderRadius', 'height', 'boxSizing'];
const INK_PROPS = ['fontSize', 'fontWeight', 'color', 'textShadow', 'transform', 'webkitTextStrokeWidth'];

const grab = `(el, props) => { const cs = getComputedStyle(el); const o = {};
  props.forEach(p => o[p] = cs[p]); return o; }`;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(900);

    /* ---------- ③ 폐기 부품 잔존 0 ---------- */
    console.log('\n[3] 폐기 부품 잔존 0');
    const dead = await page.evaluate(() => {
      const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (_) { return []; } })
        .map(r => r.selectorText || '').join(' | ');
      return {
        herosub: !!document.getElementById('herosub'),
        pill: document.querySelectorAll('.shp-cat-pill').length,
        cs: document.querySelectorAll('.shp-cs').length,
        eqtd: document.querySelectorAll('.eqtd').length,
        cssPill: /\.shp-cat-pill/.test(css),
        cssDnsT: /\.dns-t\.(l|r|on|off)/.test(css),
        cssEqtc: /\.eqtc(\.|>|\s|,)/.test(css),
        bars: document.querySelectorAll('.stabs').length,
      };
    });
    ok('#herosub 노드 폐기', dead.herosub === false, String(dead.herosub));
    ok('.shp-cat-pill 노드 0', dead.pill === 0, dead.pill + '개');
    ok('.shp-cs(✦) 노드 0', dead.cs === 0, dead.cs + '개');
    ok('.eqtd(06 구분선) 노드 0', dead.eqtd === 0, dead.eqtd + '개');
    ok('.shp-cat-pill CSS 규칙 0', dead.cssPill === false, String(dead.cssPill));
    ok('.dns-t.l/.r/.on/.off 스킨 CSS 규칙 0', dead.cssDnsT === false, String(dead.cssDnsT));
    ok('.eqtc 스킨 CSS 규칙 0', dead.cssEqtc === false, String(dead.cssEqtc));
    ok('공용 부품 .stabs 바가 DOM 에 있다', dead.bars >= 2, dead.bars + '개');

    /* ---------- ① 세 화면의 칸 스타일 동일 ---------- */
    console.log('\n[1] 활성/비활성 칸 스타일 Δ0 (영웅 4탭 · 던전 2탭 · 상점 2탭)');

    /* 영웅 — 스킬 시트를 연다 */
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(600);
    const hero = await page.evaluate(([g, cp, bp, ip]) => {
      const G = eval(g), bar = document.querySelector('#bSk .stabs');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip) };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS]);

    /* 06 장비 — 같은 영웅 탭의 오버레이 */
    await page.evaluate(() => heroSubGo('eq'));
    await page.waitForTimeout(600);
    const eq = await page.evaluate(([g, cp, bp, ip]) => {
      const G = eval(g), bar = document.getElementById('eqTabs');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip) };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS]);

    /* 03 던전 */
    await page.evaluate(() => { goTab('adv'); });
    await page.waitForTimeout(600);
    const dun = await page.evaluate(([g, cp, bp, ip]) => {
      const G = eval(g), bar = document.getElementById('dunSub');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip) };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS]);

    /* 10 상점 */
    await page.evaluate(() => goTab('shop'));
    await page.waitForTimeout(600);
    const shop = await page.evaluate(([g, cp, bp, ip]) => {
      const G = eval(g), bar = document.getElementById('shopCats');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip) };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS]);

    const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).map(k => k + ': ' + a[k] + ' ≠ ' + b[k]);
    const cmp = (label, key, props) => {
      [['06 장비', eq], ['03 던전', dun], ['10 상점', shop]].forEach(([n, o]) => {
        const d = diff(hero[key], o[key]);
        ok(label + ' — 영웅 vs ' + n + ' Δ0', d.length === 0, d.length ? d.slice(0, 3).join(' / ') : props.length + '개 속성 일치');
      });
    };
    cmp('바 껍데기', 'bar', BAR_PROPS);
    cmp('비활성 칸', 'off', CELL_PROPS);
    cmp('활성 칸', 'on', CELL_PROPS);
    cmp('비활성 라벨', 'offI', INK_PROPS);
    cmp('활성 라벨', 'onI', INK_PROPS);
    /* 활성이 «비활성과 구별» 되기는 해야 한다 — 전부 같아 버리면 위 비교는 무의미하다 */
    ok('활성 ≠ 비활성 (구별은 남아 있다)', diff(hero.on, hero.off).length > 0,
      diff(hero.on, hero.off).length + '개 속성 차이');

    /* ---------- ② 스킬↔장비 전환 8프레임 — #eqw bbox 이동 0 ---------- */
    console.log('\n[2] 영웅 스킬↔장비 전환 — #eqw 가 아래에서 다시 올라오지 않는다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(700);
    const base = await page.evaluate(() => document.getElementById('eqw').getBoundingClientRect().top);
    /* 스킬로 갔다가 장비로 되돌아오는 «그 순간» 8프레임을 연속으로 읽는다 */
    const frames = await page.evaluate(() => new Promise(res => {
      heroSubGo('sk');
      setTimeout(() => {
        const out = [], eqw = document.getElementById('eqw'), pan = document.getElementById('panel');
        heroSubGo('eq');
        let n = 0;
        const tick = () => {
          const r = eqw.getBoundingClientRect();
          out.push({ top: Math.round(r.top * 10) / 10, h: Math.round(r.height),
            /* `jz-wrap`/`jz-dm`/`jz-sl` 은 한 번 붙으면 안 떼는 **표식**이라 연출 여부와 무관하다.
               개폐 연출 클래스는 `jz-o`/`jz-c` 와 종류(`jz-sh2`/`jz-dlg`/`jz-pg`) 뿐이다. */
            cls: [...eqw.classList].filter(c => /^jz-(o|c|sh2|dlg|pg)$/.test(c)).join(' '),
            pcls: [...pan.classList].filter(c => /^jz-(o|c|sh2|dlg|pg)$/.test(c)).join(' '),
            anims: document.getAnimations().filter(a => /^jzSheet/.test(a.animationName || '')).length });
          if (++n < 8) requestAnimationFrame(tick); else res(out);
        };
        requestAnimationFrame(tick);
      }, 700);
    }));
    const tops = [...new Set(frames.map(f => f.top))];
    ok('8프레임 #eqw top 이동 0', tops.length === 1, 'top ' + tops.join(' / '));
    ok('8프레임 #eqw top = 전환 전과 동일', Math.abs(frames[0].top - base) < 0.5,
      frames[0].top + ' vs ' + base);
    ok('시트 슬라이드 애니메이션(jzSheet*) 0개', frames.every(f => f.anims === 0),
      JSON.stringify(frames.map(f => f.anims)));
    ok('#eqw 에 개폐 연출 클래스 없음', frames.every(f => !f.cls), frames.map(f => f.cls).join('|') || '없음');
    ok('#panel 에 개폐 연출 클래스 없음', frames.every(f => !f.pcls), frames.map(f => f.pcls).join('|') || '없음');

    /* ---------- ④ 전환 실동작 ---------- */
    console.log('\n[4] 전환 실동작 (본문 교체 · 상태)');
    const act = await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const out = {};
      /* 영웅 4탭 — 누른 탭의 본문이 실제로 켜지는가 */
      goTab('hero', true); heroSubGo('sk'); await sleep(400);
      out.sk = document.getElementById('bSk').classList.contains('on');
      document.querySelector('#bSk [data-sktab="pet"]').click(); await sleep(400);
      out.pet = document.getElementById('bPet').classList.contains('on') && heroTab === 'pet';
      document.querySelector('#bPet [data-pttab="cos"]').click(); await sleep(400);
      out.cos = document.getElementById('bCos').classList.contains('on') && heroTab === 'cos';
      document.querySelector('#bCos [data-costab="eq"]').click(); await sleep(500);
      out.eq = document.getElementById('eqw').classList.contains('on') && heroTab === 'eq';
      document.querySelector('#eqTabs [data-eqtab="sk"]').click(); await sleep(500);
      out.back = document.getElementById('bSk').classList.contains('on')
        && !document.getElementById('eqw').classList.contains('on');
      /* 03 던전 2탭 */
      goTab('adv', true); await sleep(400);
      document.querySelector('#dunSub [data-dsub="raid"]').click(); await sleep(300);
      out.raid = document.querySelector('#dunSub [data-dsub="raid"]').classList.contains('on');
      out.raidInk = document.querySelector('#dunSub [data-dsub="raid"]>i').classList.contains('ol4')
        && document.querySelector('#dunSub [data-dsub="dun"]>i').classList.contains('ol3');
      document.querySelector('#dunSub [data-dsub="dun"]').click(); await sleep(300);
      out.dun = document.querySelector('#dunSub [data-dsub="dun"]').classList.contains('on');
      /* 10 상점 2탭 */
      goTab('shop', true); await sleep(500);
      document.querySelector('#shopCats [data-cat="coin"]').click(); await sleep(400);
      out.coin = shopCat === 'coin' && document.getElementById('shopList').classList.contains('coin');
      out.coinInk = document.querySelector('#shopCats [data-cat="coin"]>i').classList.contains('ol4')
        && document.querySelector('#shopCats [data-cat="summon"]>i').classList.contains('ol3');
      document.querySelector('#shopCats [data-cat="summon"]').click(); await sleep(400);
      out.summon = shopCat === 'summon' && !document.getElementById('shopList').classList.contains('coin');
      return out;
    });
    ok('영웅 → 스킬 본문', act.sk === true, String(act.sk));
    ok('영웅 → 동료 본문', act.pet === true, String(act.pet));
    ok('영웅 → 코스튬 본문', act.cos === true, String(act.cos));
    ok('영웅 → 장비 오버레이', act.eq === true, String(act.eq));
    ok('장비 → 스킬 복귀 (#eqw 내려감)', act.back === true, String(act.back));
    ok('던전 → 레이드 탭 활성', act.raid === true, String(act.raid));
    ok('던전 탭 라벨 외곽선이 활성 ol4 / 비활성 ol3', act.raidInk === true, String(act.raidInk));
    ok('던전 → 던전 탭 복귀', act.dun === true, String(act.dun));
    ok('상점 → 재화 탭', act.coin === true, String(act.coin));
    ok('상점 탭 라벨 외곽선이 활성 ol4 / 비활성 ol3', act.coinInk === true, String(act.coinInk));
    ok('상점 → 소환 탭 복귀', act.summon === true, String(act.summon));

    console.log('\n[5] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY96 ' + (fail ? 'FAIL — ' : 'PASS — ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
