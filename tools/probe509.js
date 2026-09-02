#!/usr/bin/env node
/* 재현 — 작업 509 「글로벌 UI 레이어 레드닷 3자리만 «부품 모양» 이 다르다」
 *
 *   node tools/probe509.js          사람용 표
 *   node tools/probe509.js --json   기계용
 *
 * 338 규칙대로 **처방 전에 재현한다.** 등재문(471 4회차 비평가 BS 의 곁다리 관측)은
 * «01 탭바 · 02 사이드 · 03 ▦ 메뉴 세 자리만 분홍 링이 0 이고 코어가 16~27% 크다» 인데,
 * BS 는 **대조 시트(축소된 png)** 위에서 «시트px» 로 쟀다. 여기서는 같은 것을
 * **1080 프레임에 찍힌 화소**로 다시 잰다(350·368 «찍힌 픽셀» 처방 — 캡처를 data URL 로
 * 페이지에 되돌려 `getImageData` 로 읽는다. 노드 쪽 PNG 디코더를 새로 들이지 않는다).
 *
 * 재는 것 (닷 하나마다) — 중심에서 **네 방향(우·좌·상·하)** 으로 화소를 훑어
 * 반지름 프로파일을 만들고 색으로 띠를 가른다:
 *   · coreR  진한 코어 `#F22E52`(242,46,82) 가 끝나는 반지름
 *   · rimR   밝은 분홍 림 `#FF7596`(255,117,150) 이 끝나는 반지름 (없으면 coreR 과 같다)
 *   · outR   검정 링이 끝나는 반지름
 *   · rim    rimR − coreR (분홍 림 두께 · **0 이면 «분홍 링 없음»**)
 *   · blk    outR − rimR  (검정 링 두께)
 * 좌우(x축)만 쓰는 이유는 `.updot` 의 광택(`inset 0 6px …`)이 **위쪽**에만 얹혀 세로축을
 * 오염시키기 때문이다 — 세로도 같이 찍어 표에 남기되 판정은 가로로 한다.
 *
 * ⚑ 823(2026-09-02) — 자리 축(`inX`/`inY`) 옆에 **제품이 선언한 규약값**(`dotInX`/`dotInY` ·
 *   폴백 `--dot-in`)을 같이 찍는다. `verify509` [C] 가 좌표 상수를 굳혀 두고 있었는데
 *   471 7회차가 `.ibtn .bdg{--dot-in-x}` 를 20 → 17.4 로 옮기자 자만 뒤처져 빨갰다(작업 823).
 *   재는 값과 선언한 값을 나란히 두면 «자리가 어긋났다» 와 «규약값이 바뀌었다» 가 갈린다.
 *
 * ⚠ 471 5회차의 사고를 그대로 피한다 — `jzDotPulse`(scale 1.14 봉우리)가 켜져 있으면
 *   닷이 12.5% 부푼 채로 찍힌다. 자는 닷의 애니를 **끄고** 잰다(`animation:none`).
 *
 * 참고(레퍼런스 실측 — 이 자는 재측정하지 않는다. 지시서 [2] «이미 있으면 재측정 금지»):
 *   docs/measure/03-던전팝업.md §3-6 — 코어 Ø24~26 · **밝은 림 포함 Ø31~33** · 검정 포함 Ø41~43
 *   docs/measure/A1-탭바.md §6      — «채움» Ø31 · 검정 5 → 외곽 ≈41
 *   docs/measure/A2-사이드아이콘.md §1-5 — «채움» Ø31 / 외곽 Ø41~42
 *   ⇒ A1·A2 의 «채움 31» 은 03 의 «밝은 림 포함 31~33» 과 같은 띠다(그 둘은 코어와 림을
 *     가르지 않았다). 세 표는 **한 부품**을 말하고 있고 그 부품이 `.updot`(27/32/42) 이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = process.env.P509_FILE
  ? ('file://' + path.resolve(process.env.P509_FILE))
  : ('file://' + path.resolve(__dirname, '..', 'index.html'));
const KEY = 'idle_hunter_save_v4';
const JSONOUT = process.argv.includes('--json');

/* ── 장면표 ── 자리는 `probe471` 의 것을 그대로 쓴다(385 «자매 자 드리프트» 방지) ── */
const SCENES = [
  { open: '', close: '', items: [
    { label: 'HUD ▦ 메뉴 #menub .bdg',  dot: '#menub .bdg',       kind: '글로벌', host: '#menub' },
    { label: 'HUD 사이드 .ibtn .bdg',   dot: '.ibtn .bdg',        kind: '글로벌', host: '.ibtn' },
    { label: 'HUD 탭바 .tab .bdg',      dot: '#tabbar .tab .bdg', kind: '글로벌', host: '.tab' },
  ] },
  { open: 'openMenu(); await wait(900);', close: 'closeMenu(); await wait(120);', items: [
    { label: '▦ 메뉴 칸 .mn-b>.bdg',    dot: '#mnw .mn-b>.bdg',   kind: '표준' },
  ] },
  { open: 'openDungeon(); await wait(900);',
    close: "document.getElementById('dunw').classList.remove('on'); await wait(150);", items: [
    { label: '03 서브탭 .stab>.bdg',    dot: '#dunw .stab>.bdg',  kind: '표준' },
    { label: '03 카드 .dnc .dot',       dot: '#dunw .dnc .dot',   kind: '표준' },
  ] },
  { open: 'QUESTS.forEach(q => { S.quest[q.id].base = 0; });'
        + " S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9; openQuest('rep'); await wait(900);",
    close: 'closeModal(); await wait(150);', items: [
    { label: '22 [모두 받기] #qAll>.updot', dot: '#qAll>.updot', kind: '표준★기준', host: '#qAll' },
  ] },
];

/* 화소 분류 — 코어(242,46,82) · 림(255,117,150) · 검정 */
const CORE = [242, 46, 82], RIM = [255, 117, 150];
const near = (p, c, t) => Math.abs(p[0]-c[0]) <= t && Math.abs(p[1]-c[1]) <= t && Math.abs(p[2]-c[2]) <= t;

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  page.on('console', m => { if (m.type() === 'error') console.error('  [console] ' + m.text()); });
  await page.addInitScript(k => { try { localStorage.removeItem(k); } catch (_) {} }, KEY);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.wait = ms => new Promise(r => setTimeout(r, ms)); });

  const rows = [];
  for (const sc of SCENES) {
    if (sc.open) await page.evaluate(`(async () => { ${sc.open} })()`);
    for (const it of sc.items) {
      /* 닷을 **강제로 보이게** 한다 — 점등 조건이 아니라 «부품 모양» 을 재는 자다.
         166 특이성 함정을 피하려고 인라인으로 박는다(인라인이 어떤 선택자보다 세다).
         471 5회차 — 맥박(jzDotPulse)을 끄지 않으면 12.5% 부푼 닷을 잰다. */
      const geo = await page.evaluate(({ sel, hostSel }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('animation', 'none', 'important');
        el.style.setProperty('transform', 'none', 'important');
        el.style.setProperty('opacity', '1', 'important');
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        /* 그려진 바깥 링 = 상자 + 가장 큰 spread × 2 (`box-shadow` 는 상자를 안 넓힌다) */
        const sh = cs.boxShadow === 'none' ? '' : cs.boxShadow;
        let sp = 0;
        sh.replace(/rgba?\([^)]*\)/g, 'C').split(',').forEach(part => {
          if (/inset/.test(part)) return;
          const px = part.match(/-?[\d.]+px/g) || [];
          if (px.length >= 4) sp = Math.max(sp, parseFloat(px[3]));
        });
        const h = hostSel ? el.closest(hostSel) : el.parentElement;
        const hr = h ? h.getBoundingClientRect() : null;
        /* 823 — 471 규약식의 **재료**를 살아 있는 값으로 읽는다(822 가 `probe325` 에서 쓴 꼴).
           규약은 «중심 = 호스트 코너 안쪽 `--dot-in-x`(없으면 `--dot-in`)» 이라 자리를 묻는 항이
           좌표 상수를 새로 적을 필요가 없다 — 제품이 그 값을 바꾸면 자도 같이 따라온다.
           정의 안 된 var 를 물면 빈 문자열이 오고, 그것이 CSS 식의 폴백과 같은 뜻이다. */
        const cv = n => parseFloat(cs.getPropertyValue(n));
        const dotIn = cv('--dot-in');
        const orIn = v => (Number.isFinite(v) ? v : dotIn);
        return { x: r.x, y: r.y, w: r.width, h: r.height,
                 bw: parseFloat(cs.borderTopWidth) || 0,
                 ring: +(r.width + 2 * sp).toFixed(2),
                 inX: hr ? +(hr.right - (r.x + r.width / 2)).toFixed(2) : null,
                 inY: hr ? +((r.y + r.height / 2) - hr.top).toFixed(2) : null,
                 shadow: sh,
                 dotIn: Number.isFinite(dotIn) ? dotIn : null,
                 dotInX: orIn(cv('--dot-in-x')), dotInY: orIn(cv('--dot-in-y')),
                 dotR: (cs.getPropertyValue('--dot-r') || '').trim() };
      }, { sel: it.dot, hostSel: it.host || null });
      if (!geo) { rows.push({ ...it, missing: true }); continue; }
      await page.waitForTimeout(420);   /* 550 — 등장 애니가 멎은 뒤에 읽는다 */

      const cx = geo.x + geo.w / 2, cy = geo.y + geo.h / 2;
      const R = 34;                                  /* 바깥 링 21 + 여유 */
      const clip = { x: Math.round(cx - R), y: Math.round(cy - R), width: R * 2, height: R * 2 };
      const png = (await page.screenshot({ clip })).toString('base64');
      /* 찍힌 화소를 페이지로 되돌려 읽는다(350·368 처방) */
      const prof = await page.evaluate(async ({ png, R, dx, dy }) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + png; });
        const cv = document.createElement('canvas');
        cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        const px = (x, y) => { const i = (y * cv.width + x) * 4; return [d[i], d[i+1], d[i+2]]; };
        const ox = Math.round(R + dx), oy = Math.round(R + dy);   /* 클립 안 중심 */
        const ray = (sx, sy) => {
          const out = [];
          for (let t = 0; t <= R; t++) {
            const x = ox + sx * t, y = oy + sy * t;
            if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) break;
            out.push(px(x, y));
          }
          return out;
        };
        return { right: ray(1, 0), left: ray(-1, 0), up: ray(0, -1), down: ray(0, 1) };
      }, { png, R, dx: cx - Math.round(cx - R) - R, dy: cy - Math.round(cy - R) - R });

      /* 띠 가르기 — 중심에서 바깥으로 «코어 → 림 → 검정» 순.
         경계는 «마지막 화소 + 0.5»(화소 중심 기준)로 잡는다.
         ⚠ 배경이 어두운 자리(▦ 메뉴 패널)에서 검정 띠가 배경으로 이어지므로
            검정 런은 «분홍 끝 + 9px» 에서 끊고 그때는 clip 표시를 남긴다. */
      const isCoreP = p => near(p, CORE, 26);
      const isRimP  = p => near(p, RIM, 40) && !isCoreP(p);
      const isBlkP  = p => p[0] < 60 && p[1] < 60 && p[2] < 60;
      const band = ray => {
        let i = 0;
        while (i < ray.length && isCoreP(ray[i])) i++;
        const coreR = i - 0.5;                       /* 마지막 코어 화소의 바깥 경계 */
        let j = i;
        while (j < ray.length && (isRimP(ray[j]) || isCoreP(ray[j]))) j++;
        const rimR = j - 0.5;
        let k = j;
        while (k < ray.length && !isBlkP(ray[k]) && k < j + 2) k++;   /* 경계 혼색 최대 2px */
        let e = k, clipped = false;
        while (e < ray.length && isBlkP(ray[e])) { e++; if (e > rimR + 9) { clipped = true; break; } }
        const outR = e - 0.5;
        return { coreR, rimR: Math.max(rimR, coreR), outR: Math.max(outR, rimR), clipped };
      };
      const bx = [band(prof.right), band(prof.left)];
      const by = [band(prof.up), band(prof.down)];
      const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
      const row = {
        label: it.label, kind: it.kind,
        box: +geo.w.toFixed(2), bw: +geo.bw.toFixed(2), dotR: geo.dotR,
        ring: geo.ring, inX: geo.inX, inY: geo.inY,
        dotIn: geo.dotIn, dotInX: geo.dotInX, dotInY: geo.dotInY,
        coreR: +avg(bx.map(b => b.coreR)).toFixed(1),
        rimR:  +avg(bx.map(b => b.rimR)).toFixed(1),
        outR:  +avg(bx.map(b => b.outR)).toFixed(1),
        coreRy: +avg(by.map(b => b.coreR)).toFixed(1),
        outRy:  +avg(by.map(b => b.outR)).toFixed(1),
        clipped: bx.some(b => b.clipped),
        hasShadowRing: /px\s+#?[0-9a-fA-F]|rgb/.test(geo.shadow) && geo.shadow.includes(','),
      };
      row.rim = +(row.rimR - row.coreR).toFixed(1);
      row.blk = +(row.outR - row.rimR).toFixed(1);
      rows.push(row);
    }
    if (sc.close) await page.evaluate(`(async () => { ${sc.close} })()`);
  }
  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify(rows, null, 2)); return; }
  console.log('PROBE509 — 레드닷 «부품 모양» 실측 (찍힌 화소 · 가로축 좌우 평균, 반지름 px)\n');
  console.log('  자리                                 구분      코어R   림R   외곽R  분홍두께 검정두께  상자');
  for (const r of rows) {
    if (r.missing) { console.log('  ' + r.label.padEnd(36) + ' — 노드 없음'); continue; }
    console.log('  ' + r.label.padEnd(36) + ' ' + String(r.kind).padEnd(9) +
      String(r.coreR).padStart(5) + String(r.rimR).padStart(7) + String(r.outR).padStart(7) +
      String(r.rim).padStart(8) + String(r.blk).padStart(8) + String(r.box).padStart(8) +
      '   링' + String(r.ring).padStart(6) +
      (r.inX === null ? '' : '   코너안쪽 ' + r.inX + '/' + r.inY +
        ' (선언 ' + r.dotInX + '/' + r.dotInY + ')'));
  }
  const std = rows.filter(r => !r.missing && r.kind !== '글로벌');
  const glb = rows.filter(r => !r.missing && r.kind === '글로벌');
  const m = a => (a.reduce((s, v) => s + v, 0) / a.length);
  if (std.length && glb.length) {
    const sc = m(std.map(r => r.coreR)), gc = m(glb.map(r => r.coreR));
    console.log('\n  표준 코어R 평균 ' + sc.toFixed(2) + ' ↔ 글로벌 코어R 평균 ' + gc.toFixed(2) +
      '  (+' + ((gc / sc - 1) * 100).toFixed(1) + '%)');
    console.log('  분홍 링 두께 — 표준 ' + m(std.map(r => r.rim)).toFixed(2) +
      ' ↔ 글로벌 ' + m(glb.map(r => r.rim)).toFixed(2));
    console.log('  외곽R          표준 ' + m(std.map(r => r.outR)).toFixed(2) +
      ' ↔ 글로벌 ' + m(glb.map(r => r.outR)).toFixed(2));
  }
})().catch(e => { console.error(e); process.exit(1); });
