#!/usr/bin/env node
/* 20 프로필 팝업 — 플레이어 스펙 정보(#specw) 회귀·기능 게이트
 *   node tools/verify20.js
 * 좌표 목표값은 측정표 docs/measure/20-프로필팝업스펙정보.md 의 «레퍼런스 y − 84».
 * 비평(점수)은 하지 않는다 — 회귀만 본다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

/* 측정표 ref 좌표 → 프레임 좌표(−84). [셀렉터, x, y, w, h, 허용오차] */
const GEO = [
  ['.spc',          92,  431, 896, 1395, 1],
  ['.spc-body',    111,  450, 858, 1357, 1.5],
  ['.spc-ava',     451,  510, 179,  180, 1],
  ['.spc-rib',     380,  700, 318,   56, 2],
  /* 5회차 정오표 — 아래 둘은 측정표 값이 아니라 «ref 픽셀 재실측» 값이다(review §2 5회차 참고).
     .spc-edit : 측정표 §6 의 56×54 @x694 는 검정 AA 포함값. 진갈 테두리 바깥은 53×52 @x696,y845(ref).
     .spc-list : 측정표 §7-1 의 y982–1726(h744) 는 오기. ref 실측 y977–1736(h760) → 프레임 y893. */
  /* 6회차 재정정 — 편집 버튼 높이는 52 가 아니라 **54** 다(K·L 이 독립적으로 «5회차의 52 는 회귀» 로 지적).
     진갈 테두리만 마스킹하면 52 로 읽히지만 검정 AA 한 겹을 포함한 실제 박스는 54 다(측정표 §6 이 맞았다). */
  ['.spc-edit',    696,  760,  53,   54, 1],
  ['.spc-list',    139,  893, 800,  760, 1],
  ['.spc-tabs',    157, 1692, 767,   94, 1],
  /* 6회차 — 좌측 화살촉이 컨테이너 좌변(157) 밖 x149 까지 나가므로 상자를 좌로 5px 넓혔다(ref 검정 좌팁 149) */
  ['.spc-tab-on',  149, 1705, 391,   67, 1],
];

(async () => {
  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, stage: 12, best: 12,
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    }));
  });
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  const res = [];
  const ok = (n, c, d) => res.push({ n, c, d: d || '' });

  /* --- 1. 진입: HUD 초상화 → 19 → 하단 토글 «종합 스탯» → 20 --- */
  await page.click('#profBtn');
  await page.waitForTimeout(300);
  ok('19 #pfw 열림', await page.evaluate(() => !!document.querySelector('#pfw.on')));
  await page.click('.pf-tgl>.lb');
  await page.waitForTimeout(400);
  ok('토글 «종합 스탯» → #specw 열림', await page.evaluate(() => !!document.querySelector('#specw.on')));
  ok('19 #pfw 닫힘(상호 배타)', await page.evaluate(() => !document.querySelector('#pfw.on')));

  /* --- 2. 좌표 회귀 --- */
  const geo = await page.evaluate(sels => {
    const app = document.getElementById('app').getBoundingClientRect();
    const o = {};
    sels.forEach(s => {
      const el = document.querySelector(s);
      if (!el) { o[s] = null; return; }
      const b = el.getBoundingClientRect();
      o[s] = { x: b.x - app.x, y: b.y - app.y, w: b.width, h: b.height };
    });
    return o;
  }, GEO.map(g => g[0]));
  GEO.forEach(([s, x, y, w, h, tol]) => {
    const g = geo[s];
    if (!g) return ok('좌표 ' + s, false, '요소 없음');
    const d = [Math.abs(g.x - x), Math.abs(g.y - y), Math.abs(g.w - w), Math.abs(g.h - h)];
    ok('좌표 ' + s, Math.max(...d) <= tol,
       `실측 ${g.x.toFixed(1)},${g.y.toFixed(1)} ${g.w.toFixed(1)}x${g.h.toFixed(1)} / 목표 ${x},${y} ${w}x${h}`);
  });

  /* --- 3. 행 격자: 13행 · 피치 60 · 줄무늬 교대 --- */
  const rows = await page.evaluate(() => {
    const rs = [...document.querySelectorAll('.spc-row')];
    const app = document.getElementById('app').getBoundingClientRect();
    return {
      n: rs.length,
      pitch: rs.length > 1 ? rs[1].getBoundingClientRect().y - rs[0].getBoundingClientRect().y : 0,
      h: rs.length ? rs[0].getBoundingClientRect().height : 0,
      top: rs.length ? rs[0].getBoundingClientRect().y - app.y : 0,
      bg: rs.slice(0, 4).map(r => getComputedStyle(r).backgroundColor),
      scrollH: document.getElementById('spcList').scrollHeight,
      clientH: document.getElementById('spcList').clientHeight
    };
  });
  ok('행 13개', rows.n === 13, '실측 ' + rows.n);
  ok('행 피치 60', Math.abs(rows.pitch - 60) <= 0.5, '실측 ' + rows.pitch);
  ok('행 높이 60', Math.abs(rows.h - 60) <= 0.5, '실측 ' + rows.h);
  ok('줄무늬 교대(홀↔짝 다름)', rows.bg[0] === rows.bg[2] && rows.bg[1] === rows.bg[3] && rows.bg[0] !== rows.bg[1],
     rows.bg.slice(0, 2).join(' / '));
  ok('내부 스크롤 발생(13행 780 > 뷰포트 744)', rows.scrollH > rows.clientH,
     `scrollH ${rows.scrollH} > clientH ${rows.clientH}`);

  /* --- 4. 값이 실제 게임 데이터인가 (NaN·undefined 0건) --- */
  const vals = await page.evaluate(() => ({
    gid: document.getElementById('spcGid').textContent,
    pfGid: document.getElementById('pfGid').textContent,
    nick: document.getElementById('spcNick').textContent,
    rows: [...document.querySelectorAll('.spc-row')].map(r => [
      r.querySelector('.nm').textContent, r.querySelector('.vl').textContent]),
    sNick: S.nick, dmg: stat.dmg, hp: stat.maxHp
  }));
  /* 705 ④ 이관(2026-09-02) — 주인 지시로 이 줄은 «업데이트 예정» 이 됐다(uuid 는 미구현 표기였다).
     333 처방대로 **자리를 비우지 않고 방향만 뒤집는다**: ⓐ 그 문구가 서 있는가 ⓑ **uuid 가 되살아나면 빨강**.
     ⓑ 가 없으면 «그 줄이 통째로 사라져도 초록» 인 게이트가 된다. */
  ok('상단 줄 = «업데이트 예정»(705 ④)', vals.gid.trim() === '업데이트 예정', vals.gid.slice(0, 30));
  ok('그 자리에 uuid 가 되살아나지 않았다', !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(vals.gid), vals.gid.slice(0, 40));
  ok('19 프로필 상단 줄도 같은 문구(한 팝업 = 한 문구)', vals.pfGid.trim() === '업데이트 예정', vals.pfGid.slice(0, 30));
  ok('닉네임 = S.nick', vals.nick === vals.sNick, `${vals.nick} / ${vals.sNick}`);
  const flat = JSON.stringify(vals.rows);
  ok('NaN/undefined/null 0건', !/NaN|undefined|null/.test(flat),
     (flat.match(/NaN|undefined|null/g) || []).join(','));
  ok('빈 값 0건', vals.rows.every(r => r[0].trim() && r[1].trim()));
  ok('1행 공격력 = stat.dmg 반영', vals.rows[0][1].length > 0 && vals.dmg > 0,
     `${vals.rows[0][0]} = ${vals.rows[0][1]} (stat.dmg ${vals.dmg})`);

  /* --- 5. 값이 «게임 상태 변화» 를 따라가는가 --- */
  const live = await page.evaluate(() => {
    const before = document.querySelector('.spc-row .vl').textContent;
    const b0 = stat.dmg;
    S.lv.atk = (S.lv.atk | 0) + 500; renderSpec();
    return { before, after: document.querySelector('.spc-row .vl').textContent, b0, b1: stat.dmg };
  });
  ok('강화 후 값 갱신', live.before !== live.after && live.b1 > live.b0,
     `${live.before} → ${live.after} (dmg ${live.b0} → ${live.b1})`);

  /* --- 6. 닉네임 편집 버튼이 실제로 저장되는가 --- */
  page.once('dialog', d => d.accept('테스트닉'));
  await page.click('#spcEdit');
  await page.waitForTimeout(300);
  const nickRes = await page.evaluate(() => ({
    s: S.nick,
    shown: document.getElementById('spcNick').textContent,
    hud: (document.getElementById('nickN') || {}).textContent,
    saved: (JSON.parse(localStorage.getItem(KEY) || '{}')).nick
  }));
  ok('편집 → S.nick 변경', nickRes.s === '테스트닉', nickRes.s);
  ok('편집 → 화면 표시 갱신', nickRes.shown === '테스트닉', nickRes.shown);
  ok('편집 → 상단 HUD 반영', nickRes.hud === '테스트닉', String(nickRes.hud));
  ok('편집 → localStorage 저장(S)', nickRes.saved === '테스트닉', String(nickRes.saved));

  /* --- 7. 토글 «프로필» → 19 로 복귀 --- */
  await page.click('#spcProfTab');
  await page.waitForTimeout(400);
  ok('«프로필» → #pfw 열림', await page.evaluate(() => !!document.querySelector('#pfw.on')));
  ok('«프로필» → #specw 닫힘', await page.evaluate(() => !document.querySelector('#specw.on')));

  /* --- 8. 딤 클릭 닫힘 / 박스 안 클릭 유지 --- */
  await page.click('.pf-tgl>.lb');
  await page.waitForTimeout(300);
  await page.mouse.click(540, 250);           // 딤(팝업 위쪽 바깥)
  await page.waitForTimeout(250);
  ok('딤 클릭 → 닫힘', await page.evaluate(() => !document.querySelector('#specw.on')));
  await page.evaluate(() => openSpec());
  await page.waitForTimeout(250);
  await page.mouse.click(540, 1200);          // 박스 안(리스트)
  await page.waitForTimeout(250);
  ok('박스 안 클릭 → 유지', await page.evaluate(() => !!document.querySelector('#specw.on')));

  /* --- 9. 프레임 밖으로 나간 요소 0건 --- */
  const out = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    return [...document.querySelectorAll('#specw *')].filter(el => {
      const b = el.getBoundingClientRect();
      return b.width && b.height && (b.y < app.y - 1 || b.y + b.height > app.y + app.height + 1
        || b.x < app.x - 1 || b.x + b.width > app.x + app.width + 1);
    }).map(el => el.className || el.id);
  });
  ok('프레임 밖 요소 0건', out.length === 0, out.join(','));

  ok('콘솔 에러 0', errs.length === 0, errs.join(' | '));

  await browser.close();
  const bad = res.filter(r => !r.c);
  res.forEach(r => console.log((r.c ? '  ✓ ' : '  ✗ ') + r.n + (r.d ? '  — ' + r.d : '')));
  console.log('\n' + (bad.length ? `VERIFY20 FAIL ${bad.length}/${res.length}` : `VERIFY20 PASS ${res.length}/${res.length}`));
  process.exit(bad.length ? 1 : 0);
})();
