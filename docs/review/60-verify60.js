#!/usr/bin/env node
/* 60 — 쥬시 모듈 기하 검증 (비평가에게 보내기 전 자가 반증. LESSONS 04-①·05-③)
 *
 *   node docs/review/60-verify60.js      →  VERIFY60 PASS / FAIL
 *
 * 캡처 이미지를 «눈대중» 하기 전에, 애니메이션이 **지시서 수치대로** 도는지 값으로 먼저 확인한다.
 * Web Animations 를 pause 하고 currentTime 을 세운 뒤 실제 렌더 행렬(`getComputedStyle().scale/translate`)을 읽는다.
 */
const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', '..', 'index.html').replace(/\\/g, '/');
const launchOpts = () => { for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
  { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} } return {}; };

const fails = []; const ok = m => console.log('  ✓ ' + m);
const near = (label, got, want, tol) => {
  if (got === null || got === undefined || Math.abs(got - want) > tol)
    { fails.push(`${label}: ${got} (기대 ${want}±${tol})`); console.log('  ✗ ' + label + ` = ${got} (기대 ${want}±${tol})`); }
  else ok(`${label} = ${typeof got === 'number' ? got.toFixed(3) : got} (기대 ${want}±${tol})`);
};
const GRAB = () => { window.__jzA = document.getAnimations(); window.__jzA.forEach(a => { try { a.pause(); } catch (_) {} }); };
/* currentTime 만 바꾸고 바로 getComputedStyle 을 읽으면 **직전 스타일이 그대로 나온다**
   (같은 태스크에 스타일 플러시가 없어서 — 6회차에 «닫기인데 열기 값이 읽히는» 오독으로 나타났다).
   seek 뒤에 강제로 한 번 읽어 플러시시킨다. */
const SEEK = t => {
  (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
  void document.documentElement.offsetHeight;
  void getComputedStyle(document.body).opacity;
};
/* pause 한 애니메이션은 영원히 멈춰 있다 — 절을 넘어가기 전에 반드시 풀어 준다 */
const CLEARJZ = () => {
  /* ⚠ `window.__jzA` 만 풀면 안 된다 — 그건 **마지막 GRAB 목록**뿐이라, 그 앞 절에서 pause 해 둔
     애니메이션은 fill:both 로 값을 붙든 채 영원히 남는다. 다음 절의 GRAB 이 그걸 다시 집어 가면
     «닫기 프레임인데 열기 애니가 재생»되는 오독이 난다(6회차에 실제로 났다).
     → 문서 전체를 훑어 전부 풀어 준다(무한 반복 애니는 finish 가 던지므로 cancel 로 뺀다). */
  /* ⚠ `finish()` 가 아니라 `cancel()` 이어야 한다. `finish()` 한 애니메이션은 `fill:both` 로
     **끝값을 붙든 채 이펙트 스택에 남고**, 클래스를 지워도 `getAnimations()` 에 계속 잡힌다.
     그러면 다음 장면의 GRAB 이 그걸 다시 집어 가서 **앞 장면 값이 새 연출을 덮는다**
     (누름 잔재 `jzDn@60` 이 뗌 스프링을 가려 «뗌 t0 이 .94 가 아니다» 로 읽혔다).
     클래스를 먼저 지우고 → 전부 cancel 해야 스택이 실제로 빈다. */
  window.__jzA = [];
  document.querySelectorAll('.jz-dn,.jz-up,.jz-sh,.jz-ti,.jz-st,.jz-bad,.jz-o,.jz-c,.jz-top')
    .forEach(e => e.classList.remove('jz-dn', 'jz-up', 'jz-sh', 'jz-ti', 'jz-st', 'jz-bad', 'jz-o', 'jz-c', 'jz-top'));
  document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
};
/* ⚠ seek 와 read 를 **다른 page.evaluate 로 나누면 안 된다.** 그 사이(수십 ms)에
   `jzClose` 의 클래스 제거 타임아웃(140ms)이 끼어들어 측정 대상 애니메이션이 바뀐다 —
   6회차에 «닫기 프레임인데 열기 값(0.92)이 읽히는» 오독으로 나타났다. 한 태스크 안에서 끝낸다. */
/* ⚠ 11회차 — «그 요소의 opacity» 만 재면 **컨테이너와의 곱셈**을 못 본다.
   10회차 결함 2·5 가 정확히 그것이었다(박스 하한 .45 가 딤 컨테이너와 곱해져 0 이 됐는데 게이트는 통과).
   화면에 실제로 나오는 값 = 조상 opacity 의 곱. 그걸 재는 항목을 따로 둔다. */
const EFFOP = (page, t, sel) => page.evaluate(([t, sel]) => {
  (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
  const e = document.querySelector(sel); if (!e) return null;
  let o = 1;
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
    const v = parseFloat(getComputedStyle(n).opacity);
    if (!isNaN(v)) o *= v;
  }
  return o;
}, [t, sel]);
/* 딤이 «컨테이너 opacity» 가 아니라 «배경색 알파» 로 페이드하는지 본다(11회차 결함 2 의 처방) */
const BGA = (page, t, sel) => page.evaluate(([t, sel]) => {
  (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
  const e = document.querySelector(sel); if (!e) return null;
  const m = /^rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor || '');
  if (!m) return null;
  const p = m[1].split(','); return p.length < 4 ? 1 : parseFloat(p[3]);
}, [t, sel]);
const SR = (page, t, sel, kind) => page.evaluate(([t, sel, kind]) => {
  (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
  const e = document.querySelector(sel); if (!e) return null;
  const cs = getComputedStyle(e);
  if (kind === 'sc') { const v = cs.scale; return (!v || v === 'none') ? 1 : parseFloat(v); }
  if (kind === 'op') return parseFloat(cs.opacity);
  if (kind === 'tx') { const v = cs.translate; if (!v || v === 'none') return 0; return parseFloat(v); }
  if (kind === 'tyRaw') { const v = cs.translate; if (!v || v === 'none') return '0px';
    const p = (v || '').trim().split(/\s+/); return p.length > 1 ? p[1] : '0px'; }
  const v = cs.translate; if (!v || v === 'none') return 0;
  const p = v.trim().split(/\s+/); return p.length > 1 ? parseFloat(p[1]) : 0;
}, [t, sel, kind]);
/* computed `scale` 는 "1" | "0.94" | "0.94 0.94" 로 나온다 */
const SC = s => { const e = document.querySelector(s); if (!e) return null;
  const v = getComputedStyle(e).scale; if (!v || v === 'none') return 1; return parseFloat(v); };
const TY = s => { const e = document.querySelector(s); if (!e) return null;
  const v = getComputedStyle(e).translate; if (!v || v === 'none') return 0;
  const p = v.trim().split(/\s+/); return p.length > 1 ? parseFloat(p[1]) : 0; };
const TX = s => { const e = document.querySelector(s); if (!e) return null;
  const v = getComputedStyle(e).translate; if (!v || v === 'none') return 0; return parseFloat(v); };

(async () => {
  const browser = await chromium.launch(launchOpts());
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 2280 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await page.evaluate(() => { S.gold = 9e12; S.dia = 9e6; });

  console.log('[1] 버튼 누름 .94 (60ms) / 뗌 스프링 1.04 → 1 (180ms)');
  await page.evaluate(CLEARJZ);
  {
    /* 실제 마우스로 누르면 «옮겨서 떼기» 가 pointercancel 을 먼저 쏴서 뗌 타임라인이 앞당겨진다.
       (5·6회차 비평이 «뗌 t0 이 1.000» 으로 읽은 것의 정체) → 페이지 안에서 직접 쏜다. */
    const SEL = '.tab[data-t="hero"]';
    await page.evaluate(sel => { const el = document.querySelector(sel), r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }, SEL);
    await page.evaluate(GRAB);
    near('누름 t60 .tab scale', await SR(page, 60, SEL, 'sc'), 0.94, 0.01);
    await page.evaluate(CLEARJZ);
    await page.evaluate(sel => { const el = document.querySelector(sel), r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, SEL);
    await page.evaluate(GRAB);
    near('뗌 t0 .tab scale(눌린 상태에서 시작)', await SR(page, 0, SEL, 'sc'), 0.94, 0.012);
    near('뗌 t99 .tab scale(피크)', await SR(page, 99, SEL, 'sc'), 1.04, 0.012);
    near('뗌 t180 .tab scale(복귀)', await SR(page, 180, SEL, 'sc'), 1, 0.005);
    await page.evaluate(CLEARJZ);
    await page.waitForTimeout(300);
  }

  console.log('[2] 다이얼로그 열기 — 박스 .92 → 1.02 → 1 (220ms) · 딤 페이드 150ms');
  await page.evaluate(CLEARJZ);
  {
    await page.evaluate(() => openProfile()); await page.evaluate(GRAB);
    await page.evaluate(SEEK, 0);
    near('열기 t0 #pfw>* scale', await page.evaluate(SC, '#pfw>*'), 0.92, 0.012);
    await page.evaluate(SEEK, 136);                    /* .22s * .62 = 136ms → 1.02 */
    near('열기 t136 #pfw>* scale(오버슈트)', await page.evaluate(SC, '#pfw>*'), 1.02, 0.012);
    await page.evaluate(SEEK, 220);
    near('열기 t220 #pfw>* scale(정착)', await page.evaluate(SC, '#pfw>*'), 1, 0.005);
    /* ⚠ 11회차 — 옛 항목은 «컨테이너 opacity 0 → 1» 을 기대했다. 그게 바로 결함 2 의 원인이었다
       (컨테이너가 흐리면 박스의 .45 가 곱해져 소거된다). 이제 딤은 **배경색 알파**로 페이드하고
       컨테이너 opacity 는 1 로 고정이며, 게이트도 «화면에 실제로 나오는 값» 으로 바꾼다. */
    near('열기 t0 딤 배경 알파', await BGA(page, 0, '#pfw'), 0, 0.02);
    near('열기 t150 딤 배경 알파', await BGA(page, 150, '#pfw'), 0.85, 0.03);
    near('열기 t0 박스 실효 opacity(조상 곱)', await EFFOP(page, 0, '#pfw>*'), 0.45, 0.04);
    near('열기 t66 박스 실효 opacity(30% = 불투명)', await EFFOP(page, 66, '#pfw>*'), 1, 0.03);
    await page.evaluate(() => closeProfile()); await page.waitForTimeout(400);
  }

  console.log('[3] 바닥 시트 — 아래에서 슬라이드업 + 오버슈트 8px (240ms)');
  await page.evaluate(CLEARJZ);
  {
    await page.evaluate(() => openTrain()); await page.evaluate(GRAB);
    await page.evaluate(SEEK, 0);
    /* t0 은 «자기 높이만큼 아래» — computed 는 px 가 아니라 `100%` 로 나온다(퍼센트 유지) */
    /* 12회차 — 움직이는 것은 껍데기(#trw)가 아니라 시트 본체(#trw>.jz-sl) 다 */
    const t0 = await page.evaluate(() => { const v = getComputedStyle(document.querySelector('#trw>.jz-sl')).translate;
      return (v || '').trim().split(/\s+/)[1] || ''; });
    if (t0 !== '100%') { fails.push('시트 t0 translateY = ' + t0 + ' (기대 100%)'); console.log('  ✗ 시트 t0 translateY = ' + t0); }
    else ok('시트 t0 translateY = 100% (자기 높이만큼 아래)');
    await page.evaluate(SEEK, 180);                    /* 70~86% 홀드 구간 한가운데 → -8px */
    near('시트 t180 translateY(오버슈트 홀드)', await page.evaluate(TY, '#trw>.jz-sl'), -8, 1.2);
    await page.evaluate(SEEK, 200);
    near('시트 t200 translateY(홀드 유지)', await page.evaluate(TY, '#trw>.jz-sl'), -8, 1.2);
    await page.evaluate(SEEK, 240);
    near('시트 t240 translateY(정착)', await page.evaluate(TY, '#trw>.jz-sl'), 0, 0.6);
    /* ⚠ 회귀 가드 — 이동거리(시트 높이 ≈2100px) 전체에 오버슈트 이징을 걸면
       베지어 최대치 1.098 이 그대로 **205px 물리 오버슈트**가 된다(3회차 비평 실측 212px).
       궤적 전체를 훑어 «최종 위치보다 10px 넘게 위로 올라간 순간» 이 없는지 본다. */
    let worst = 0;
    for (let t = 0; t <= 240; t += 6) {
      await page.evaluate(SEEK, t);
      const v = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#trw>.jz-sl')).translate;
        const p = (s || '').trim().split(/\s+/)[1] || '0';
        return p.endsWith('%') ? 9999 : parseFloat(p); });   /* 아직 % 구간이면 화면 밖 — 무시 */
      if (v !== 9999 && v < worst) worst = v;
    }
    if (worst < -10) { fails.push(`시트 궤적 최대 오버슈트 ${worst.toFixed(1)}px (허용 -10px)`);
      console.log(`  ✗ 시트 궤적 최대 오버슈트 ${worst.toFixed(1)}px`); }
    else ok(`시트 궤적 최대 오버슈트 ${worst.toFixed(1)}px (허용 -10px 이내)`);
    /* ⚠ 12회차 — **선언 240ms 중 몇 %가 «화면 안에서» 도는가.**
       11회차엔 `translate:0 100%` 의 기준이 껍데기(≈2105px)라 경로의 32.3%(680px)가 뷰포트 밖에서
       소모됐고, 시트 상단이 화면에 들어오는 시각이 t≈39ms(예산의 16.3%)였다.
       «끝값이 맞다» 로는 절대 안 잡히는 결함이라 **화면 좌표로 가시 구간을 직접 잰다.** */
    const trav = await page.evaluate(() => {
      const sl = document.querySelector('#trw>.jz-sl'), app = document.querySelector('#app');
      const H = app.getBoundingClientRect().height, ay = app.getBoundingClientRect().y;
      const top = t => { (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
        void document.documentElement.offsetHeight;
        return sl.getBoundingClientRect().y - ay; };
      const t0 = top(0), tE = top(240);
      return { t0, tE, H, total: t0 - tE, vis: Math.min(t0, H) - tE };
    });
    const visPct = trav.total > 0 ? trav.vis / trav.total * 100 : 0;
    console.log(`    이동거리 ${trav.total.toFixed(0)}px (t0 top ${trav.t0.toFixed(0)} → 최종 ${trav.tE.toFixed(0)}, 프레임 높이 ${trav.H.toFixed(0)})`);
    if (visPct < 95) { fails.push(`시트 가시 이동 비율 ${visPct.toFixed(1)}% (95% 이상 기대 — 나머지는 뷰포트 밖)`);
      console.log(`  ✗ 시트 가시 이동 비율 ${visPct.toFixed(1)}%`); }
    else ok(`시트 가시 이동 비율 ${visPct.toFixed(1)}% (>=95%)`);
    /* ⚠ 11회차(결함 1) — 딤이 시트와 «같이» 올라오면 하드 와이프가 된다.
       딤 자식은 컨테이너의 translate 를 정확히 상쇄해 **화면상 제자리**여야 하고,
       자기 opacity 로 150ms 페이드해야 한다. 화면 좌표(getBoundingClientRect)로 직접 잰다. */
    const dimId = await page.evaluate(() => {
      const d = document.querySelector('#trw>.jz-dm'); if (!d) return null;
      d.setAttribute('data-jzdim', '1'); return 1;
    });
    if (!dimId) { fails.push('시트 딤 자식(.jz-dm)이 안 잡혔다 — 딤 분리 미적용'); console.log('  ✗ 시트 딤 .jz-dm 없음'); }
    else {
      const DY = t => page.evaluate(tt => {
        (window.__jzA || []).forEach(a => { try { a.currentTime = tt; } catch (_) {} });
        /* 기준은 «움직이지 않는» #app 이다 — #trw 자신은 슬라이드 중이라 기준이 될 수 없다 */
        const d = document.querySelector('#trw>[data-jzdim]'), p = document.querySelector('#app');
        return { dy: d.getBoundingClientRect().y - p.getBoundingClientRect().y,
                 op: parseFloat(getComputedStyle(d).opacity) };
      }, t);
      let dworst = 0;
      for (const t of [0, 30, 60, 90, 120, 150, 180, 206, 225, 240]) {
        const v = await DY(t);
        if (Math.abs(v.dy) > Math.abs(dworst)) dworst = v.dy;
      }
      near('시트 딤 화면 고정(최대 이탈 px)', dworst, 0, 2);
      near('시트 딤 t0 opacity(페이드 시작)', (await DY(0)).op, 0, 0.02);
      near('시트 딤 t150 opacity(페이드 완료)', (await DY(150)).op, 1, 0.02);
    }
    await page.evaluate(() => closeTrain()); await page.waitForTimeout(400);
  }

  console.log('[4] 탭 아이콘 1.12 팝 (200ms)');
  await page.evaluate(CLEARJZ);
  {
    await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').click());
    await page.evaluate(GRAB);
    /* ⚠ 패널이 열리면 그 칸은 `.close`(✕)가 되어 **`.ti` 는 display:none** 이다.
       `.ti` 만 재면 «팝이 0px» 이라는 오독이 나온다(비평 L-1 이 정확히 이걸 짚었다).
       화면에 실제로 그려지는 쪽을 골라서 잰다. */
    const vis = await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').classList.contains('close') ? '.tx' : '.ti');
    const SELI = '.tab[data-t="hero"] ' + vis;
    near('탭 t90 ' + vis + ' scale(피크)', await SR(page, 90, SELI, 'sc'), 1.12, 0.012);
    near('탭 t200 ' + vis + ' scale(복귀)', await SR(page, 200, SELI, 'sc'), 1, 0.005);
    await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').click());
    await page.waitForTimeout(400);
  }

  console.log('[5] 카드 그리드 stagger 25ms — «렌더된 등장 시각» 으로 잰다(선언값 읽기 금지)');
  await page.evaluate(CLEARJZ);
  {
    /* ⚠ 11회차 — 옛 항목은 `style.--jzd` **선언값**을 읽어 «25ms 균등» 이라고 통과시켰다.
       그 사이 두 비평가의 실측은 10~39ms(3.9배 편차)에 순서 역전까지 있었다 — 게이트가 순환 논증이었다
       (3회차·67 3회차와 같은 종류의 함정. LESSONS 43-①).
       → 이제 «조상 opacity 까지 곱한 실효 불투명도가 0.5 를 넘는 첫 시각» 을 카드마다 찾아
       그 **간격**을 본다. 선언 delay 를 한 번도 읽지 않는다. */
    await page.evaluate(() => openDungeon());
    await page.evaluate(GRAB);
    const n = await page.evaluate(() => document.querySelectorAll('#dunw .jz-st').length);
    if (n < 3) { fails.push('stagger: 대상 카드 ' + n + '개 (>=3 기대)'); console.log('  ✗ stagger 대상 ' + n + '개'); }
    else {
      const onset = await page.evaluate(() => {
        const g = [...document.querySelectorAll('#dunw .jz-st')].slice(0, 5);
        const eff = e => { let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
          const v = parseFloat(getComputedStyle(x).opacity); if (!isNaN(v)) o *= v; } return o; };
        const out = g.map(() => null);
        for (let t = 0; t <= 700; t += 2) {
          (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
          void document.documentElement.offsetHeight;
          for (let i = 0; i < g.length; i++) if (out[i] === null && eff(g[i]) >= 0.5) out[i] = t;
          if (out.every(v => v !== null)) break;
        }
        return out;
      });
      if (onset.some(v => v === null)) { fails.push('stagger: 700ms 안에 안 나타난 카드가 있다 ' + JSON.stringify(onset));
        console.log('  ✗ stagger 미등장 ' + JSON.stringify(onset)); }
      else {
        const gaps = onset.slice(1).map((v, i) => v - onset[i]);
        console.log('    실측 등장 시각(ms) = ' + onset.join(' / ') + ' · 간격 = ' + gaps.join(' / '));
        for (let i = 0; i < gaps.length; i++) near('stagger 실측 간격 #' + (i + 1) + '(ms)', gaps[i], 25, 6);
        /* 순서 역전 = 간격이 음수. 위 near 로도 걸리지만 원인이 다르므로 따로 이름을 붙여 둔다. */
        if (gaps.some(g => g <= 0)) { fails.push('stagger: 등장 순서 역전(간격 ' + gaps.join('/') + ')'); console.log('  ✗ stagger 순서 역전'); }
        else ok('stagger 순서 역전 0건 (' + onset.length + '칸)');
      }
    }
    await page.evaluate(CLEARJZ);
    await page.evaluate(() => closeDungeon()); await page.waitForTimeout(400);
  }

  console.log('[6] 재화 부족 — 박스 흔들림 6px + 알약 빨간 틴트');
  await page.evaluate(CLEARJZ);
  {
    await page.evaluate(() => { S.dia = 0; popup('💎 다이아 부족', '<p>다이아가 부족합니다.</p>'); });
    await page.evaluate(GRAB);
    /* jzShake 극점: .34s 의 12.5/25/37.5/50/62.5/75% = 42.5/85/127.5/170/212.5/255ms */
    near('부족 t42 .mbox translateX(1번째 극점)', await SR(page, 42, '#modal .mbox', 'tx'), -6, 1.2);
    near('부족 t255 .mbox translateX(6번째 극점, 감쇠 없음)', await SR(page, 255, '#modal .mbox', 'tx'), 6, 1.2);
    /* ⚠ 회귀 가드 — 2회차에 `.jz-bad{...!important}` 가 열기 팝(`jzBoxIn`)을 삼켜서
       «부족 팝업만 뚝 뜨는» 사고가 났다(3회차 비평 실측: 박스 폭 882±1px 고정). 둘 다 살아야 한다. */
    await page.evaluate(SEEK, 136);
    near('부족 t136 .mbox scale(열기 팝 생존)', await page.evaluate(SC, '#modal .mbox'), 1.02, 0.015);
    /* 알약 틴트는 딤(z30) 아래라 filter 로는 안 보인다 → #fxl(z60) 위 오버레이로 그린다.
       위치는 **흔들리지 않는 t=0** 에서 잰다 — 흔들림 도중에 재면 그 변위(±6px)가 오차로 잡힌다. */
    await page.evaluate(SEEK, 0);
    const ov = await page.evaluate(() => {
      const e = document.querySelector('#fxl .jz-badov'); if (!e) return null;
      const p = document.querySelector('.cDia').getBoundingClientRect(), r = e.getBoundingClientRect();
      return { dx: Math.abs(r.x + r.width / 2 - (p.x + p.width / 2)), dy: Math.abs(r.y + r.height / 2 - (p.y + p.height / 2)) };
    });
    if (!ov) { fails.push('부족: 알약 위 빨간 오버레이(.jz-badov) 없음'); console.log('  ✗ 부족 알약 오버레이 없음'); }
    else { near('부족 오버레이 중심 Δx', ov.dx, 0, 2); near('부족 오버레이 중심 Δy', ov.dy, 0, 2); }
    /* ⚠ «DOM 이 있다» 로는 부족하다 — 3회 연속 «화면엔 강한 빨강 0px» 지적을 받았다.
       피크 시각에 실제로 칠해지는 색을 본다(불투명 빨강 #FF3B4E 가 딤 위에 얹혀야 한다). */
    const pk = await SR(page, 46, '#fxl .jz-badov', 'op');
    near('부족 오버레이 피크 opacity(t=46)', pk, 0.62, 0.06);
    const col = await page.evaluate(() => { const e = document.querySelector('#fxl .jz-badov');
      return e ? getComputedStyle(e).backgroundColor : null; });
    if (!col || !/255,\s*59,\s*78/.test(col)) { fails.push('부족 오버레이 색 = ' + col + ' (기대 rgb(255,59,78))');
      console.log('  ✗ 부족 오버레이 색 = ' + col); }
    else ok('부족 오버레이 색 = ' + col + ' (딤 위 불투명 빨강)');
    /* ⚠ 11회차(결함 3) — 9회차의 «알약 R=243 통과» 는 **섬광판을 잰 것**이었고,
       알약 «본체와 그 수치» 는 딤 아래에 남아 두 비평가가 ×0.46 로 같은 값을 쟀다.
       이제 알약을 통째로 복제해 #fxl 에 다시 그린다 — 복제본에 **수치 글자가 실제로 있는지**까지 본다.
       (DOM 존재만 보면 또 «판만 있고 숫자는 딤 아래» 를 통과시킨다) */
    const cl = await page.evaluate(() => {
      const p = document.querySelector('#fxl .jz-badp'); if (!p) return null;
      const b = p.querySelector('b'), ic = p.querySelector('i');
      const pr = p.getBoundingClientRect(), sr = document.querySelector('.cDia').getBoundingClientRect();
      /* 복제본의 «실효» 불투명도 — 조상을 곱해서 1 이라야 «딤 위» 다(딤 아래면 딤 계수가 곱해진다) */
      let eo = 1; for (let x = b; x && x.nodeType === 1; x = x.parentElement) {
        const v = parseFloat(getComputedStyle(x).opacity); if (!isNaN(v)) eo *= v; }
      return { txt: b ? b.textContent.trim() : null, ic: ic ? ic.textContent.trim() : null, eo,
               dx: Math.abs(pr.x - sr.x), dy: Math.abs(pr.y - sr.y),
               ids: p.querySelectorAll('[id]').length,
               z: parseInt(getComputedStyle(document.getElementById('fxl')).zIndex, 10),
               mz: parseInt(getComputedStyle(document.getElementById('modal')).zIndex, 10) };
    });
    if (!cl) { fails.push('부족: 알약 복제 판(.jz-badp) 없음 — 수치가 딤 아래에 남는다'); console.log('  ✗ 알약 복제 판 없음'); }
    else {
      /* ⚠ «원본 텍스트와 같은가» 로 재면 안 된다 — HUD 는 58 `fxDisp` 로 **롤링 중**이라
         복제한 순간의 값과 나중에 읽은 원본이 다르다(첫 시도에서 9.00M vs 1.35M 로 오진했다).
         봐야 할 것은 «수치 글자와 아이콘이 딤 위에 실제로 그려지는가» 다. */
      if (!cl.txt || !/[0-9]/.test(cl.txt) || !cl.ic) { fails.push('부족: 복제 알약에 수치·아이콘이 없다 (수치="' + cl.txt + '" 아이콘="' + cl.ic + '")');
        console.log('  ✗ 복제 알약 내용 없음'); }
      else ok('복제 알약이 수치·아이콘까지 그려짐 = "' + cl.ic + ' ' + cl.txt + '"');
      if (!(cl.z > cl.mz)) { fails.push('부족: #fxl z' + cl.z + ' 가 #modal z' + cl.mz + ' 보다 위가 아니다');
        console.log('  ✗ 복제 판이 딤 위가 아님'); }
      else ok('복제 판 레이어 #fxl z' + cl.z + ' > 딤 #modal z' + cl.mz);
      near('복제 알약 수치 실효 opacity(딤 곱 없음)', cl.eo, 1, 0.02);
      near('복제 알약 좌상단 Δx', cl.dx, 0, 2);
      near('복제 알약 좌상단 Δy', cl.dy, 0, 2);
      /* 복제본에 id 가 남으면 `$('diaN')` 이 유령을 집어 HUD 갱신이 화면 밖으로 간다 */
      if (cl.ids) { fails.push('부족: 복제본에 id 가 ' + cl.ids + '개 남았다(원본 id 충돌)'); console.log('  ✗ 복제본 id 잔존'); }
      else ok('복제본 id 0개 (원본 #diaN/#goldN 과 충돌 없음)');
    }
    await page.evaluate(() => closeModal()); await page.waitForTimeout(300);
  }

  console.log('[7] 수치 롤링 — 전투력이 «뚝» 바뀌지 않는다');
  await page.evaluate(CLEARJZ);
  {
    const r = await page.evaluate(async () => {
      const read = () => document.getElementById('cpN').textContent;
      const a = read();
      /* 전투력을 크게 올린다. «S.spAtk 를 직접 더하기» 는 못 쓴다 — spAtk 는 bonus() 를 거치는데
         bonus() 는 markDirty() 로만 무효화되는 캐시라 값을 직접 꽂으면 cp() 가 안 움직인다(10회차에 잡음).
         `S.lv.atk` 는 stat.dmg 의 U.atk.val(lv('atk')) 로 캐시 없이 바로 들어간다. */
      S.lv.atk += 60;
      const seq = [];
      for (let i = 0; i < 8; i++) { await new Promise(r => requestAnimationFrame(r)); seq.push(read()); }
      return { a, seq, uniq: new Set(seq).size, moved: read() !== a };
    });
    if (!r.moved) { fails.push('롤링: 전투력 표시가 아예 안 움직였다(레버 무효 — 게이트 자체 점검 필요)'); console.log('  ✗ 롤링 레버 무효'); }
    if (r.uniq < 3) { fails.push('롤링: 8프레임 동안 표시값 ' + r.uniq + '종 (>=3 기대 — 뚝 바뀜)'); console.log('  ✗ 롤링 ' + r.uniq + '종'); }
    else ok('롤링 8프레임 표시값 ' + r.uniq + '종 (' + r.a + ' → ' + r.seq[r.seq.length - 1] + ')');
  }

  console.log('[8] 스킬 슬롯 — 발동 플래시 / 쿨 완료 글로우');
  await page.evaluate(CLEARJZ);
  {
    const r = await page.evaluate(async () => {
      const s = document.querySelector('#slots .slot2');
      if (!s) return { err: '슬롯 없음' };
      const wait = () => new Promise(r => setTimeout(r, 40));
      s.classList.add('ready'); await wait();
      s.classList.remove('ready'); await wait();       /* 활성 → 대기 = 발동 */
      const cast = s.classList.contains('jz-cast');
      s.classList.add('ready'); await wait();          /* 대기 → 활성 = 쿨 완료 */
      const cd = s.classList.contains('jz-cdok');
      return { cast, cd };
    });
    if (r.err || !r.cast) { fails.push('슬롯 발동 플래시(.jz-cast) 없음'); console.log('  ✗ 슬롯 발동 플래시 없음'); }
    else ok('슬롯 발동 → .jz-cast 부착');
    if (!r.cd) { fails.push('슬롯 쿨완료 글로우(.jz-cdok) 없음'); console.log('  ✗ 슬롯 쿨완료 글로우 없음'); }
    else ok('슬롯 쿨완료 → .jz-cdok 부착');
  }

  console.log('[9] 보스 — 등장 비네트+슬램 / 처치 흰 플래시');
  await page.evaluate(CLEARJZ);
  {
    const r = await page.evaluate(async () => {
      const si = document.getElementById('stinfo'), L = document.getElementById('fxl');
      const wait = () => new Promise(r => setTimeout(r, 40));
      si.classList.remove('bfight', 'bfarm'); await wait();
      si.classList.add('bfight'); await wait();
      const vig = !!L.querySelector('.jz-vig'), slam = !!L.querySelector('.jz-slam');
      si.classList.remove('bfight'); await wait();     /* bfarm 없이 빠짐 = 처치 */
      const wf = !!L.querySelector('.jz-wf');
      si.classList.remove('bfight', 'bfarm');
      return { vig, slam, wf };
    });
    if (!r.vig) { fails.push('보스 등장 비네트(.jz-vig) 없음'); console.log('  ✗ 보스 비네트 없음'); } else ok('보스 등장 → 붉은 비네트');
    if (!r.slam) { fails.push('보스 「BOSS」 리본 슬램(.jz-slam) 없음'); console.log('  ✗ 보스 슬램 없음'); } else ok('보스 등장 → 「BOSS」 슬램');
    if (!r.wf) { fails.push('보스 처치 흰 플래시(.jz-wf) 없음'); console.log('  ✗ 처치 흰 플래시 없음'); } else ok('보스 처치 → 흰 플래시');
  }

  console.log('[11] 닫기 — «뚝 사라지는 팝업은 0점»(지시). 역방향 애니가 실제로 도는가');
  await page.evaluate(CLEARJZ);
  {
    /* 다이얼로그 닫기 — jzBoxOut(120ms): scale 1 → .94 + opacity → 0 */
    await page.evaluate(() => openProfile()); await page.waitForTimeout(400);
    await page.evaluate(() => closeProfile());
    await page.evaluate(GRAB);
    const vis = await page.evaluate(() => getComputedStyle(document.querySelector('#pfw')).display);
    if (vis === 'none') { fails.push('닫기: #pfw 가 즉시 display:none (역재생 없음)'); console.log('  ✗ 닫기 즉시 사라짐'); }
    else ok('닫기 중 #pfw display = ' + vis + ' (역재생 위해 되살림)');
    near('닫기 t0 #pfw>* scale', await SR(page, 0, '#pfw>*', 'sc'), 1, 0.02);
    near('닫기 t120 #pfw>* scale', await SR(page, 120, '#pfw>*', 'sc'), 0.94, 0.02);
    near('닫기 t120 #pfw>* opacity', await SR(page, 120, '#pfw>*', 'op'), 0, 0.05);
    /* ⚠ 11회차(결함 5) — «끝값이 .94» 만으로는 부족하다. 옛 곡선은 축소보다 **투명도가 먼저 0 에 닿아**
       선언 6% 중 2.6%p 가 화면에 안 나왔다(T) · 렌더된 축소가 −44%(U). 축소가 «보이는 동안» 끝나야 한다.
       → 실효 불투명도가 0.25 이상인 마지막 시각의 scale 을 재서, 선언 축소의 대부분이 렌더되는지 본다. */
    const vis25 = await page.evaluate(() => {
      let last = null;
      for (let t = 0; t <= 120; t += 2) {
        (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
        void document.documentElement.offsetHeight;
        const e = document.querySelector('#pfw>*');
        let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
          const v = parseFloat(getComputedStyle(x).opacity); if (!isNaN(v)) o *= v; }
        if (o >= 0.25) { const s = getComputedStyle(e).scale; last = (!s || s === 'none') ? 1 : parseFloat(s); }
      }
      return last;
    });
    if (vis25 === null) { fails.push('닫기: 실효 불투명도 0.25 이상인 프레임이 없다'); console.log('  ✗ 닫기 가시 프레임 0장'); }
    else { const rendered = (1 - vis25) / 0.06 * 100;
      console.log('    가시(실효 α≥.25) 마지막 scale = ' + vis25.toFixed(4) + ' → 선언 축소의 ' + rendered.toFixed(0) + '% 렌더');
      if (rendered < 70) { fails.push('닫기: 선언 축소의 ' + rendered.toFixed(0) + '% 만 렌더(70% 이상 기대)');
        console.log('  ✗ 닫기 축소 미렌더'); }
      else ok('닫기 축소 렌더율 ' + rendered.toFixed(0) + '% (>=70%)'); }
    /* ⚠ 12회차 — 11회차에 축소를 살리려고 페이드를 뒤로 몰았더니 **이번엔 깜빡였다**
       (두 비평가 독립 실측: 소멸률 8.1× / 7.3× 점프, 페이드량의 75%가 마지막 35ms).
       «총량이 맞다» 로는 못 잡는다 — **구간별 소멸 속도의 최대/최소 비**를 본다. */
    const rate = await page.evaluate(() => {
      const e = document.querySelector('#pfw>*'), out = [];
      for (let t = 0; t <= 120; t += 10) {
        (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
        void document.documentElement.offsetHeight;
        let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
          const v = parseFloat(getComputedStyle(x).opacity); if (!isNaN(v)) o *= v; }
        out.push(o);
      }
      const d = []; for (let i = 1; i < out.length; i++) d.push(out[i - 1] - out[i]);
      return { out, d };
    });
    const pos = rate.d.filter(v => v > 0.001);
    const ratio = pos.length ? Math.max(...pos) / Math.min(...pos) : 999;
    console.log('    10ms 구간별 소멸량 = ' + rate.d.map(v => (v * 100).toFixed(1)).join(' / ') + ' %');
    if (ratio > 3) { fails.push('닫기 소멸률 최대/최소 비 ' + ratio.toFixed(1) + '배 (3배 이하 기대 — 계단·깜빡)');
      console.log('  ✗ 닫기 소멸률 ' + ratio.toFixed(1) + '배 점프'); }
    else ok('닫기 소멸률 최대/최소 비 ' + ratio.toFixed(1) + '배 (<=3배, 계단 없음)');
    await page.evaluate(CLEARJZ); await page.waitForTimeout(400);

    /* 바닥 시트 닫기 — jzSheetOut(130ms): translateY → 100% */
    await page.evaluate(() => openTrain()); await page.waitForTimeout(500);
    await page.evaluate(() => closeTrain());
    await page.evaluate(GRAB);
    near('닫기 t0 #trw translateY', await SR(page, 0, '#trw>.jz-sl', 'ty'), 0, 1.5);
    const tEnd = await SR(page, 130, '#trw>.jz-sl', 'tyRaw');
    if (tEnd !== '100%') { fails.push('닫기 t130 시트 translateY = ' + tEnd + ' (기대 100%)'); console.log('  ✗ 닫기 t130 시트 = ' + tEnd); }
    else ok('닫기 t130 시트 translateY = 100% (아래로 빠짐)');
    await page.evaluate(CLEARJZ); await page.waitForTimeout(400);
  }

  console.log('[13] 12회차 — 딤 곡선 통일 · 시트에 stagger 없음 · 페이지 크로스페이드 이중상');
  await page.evaluate(CLEARJZ);
  {
    /* ⓐ 딤 곡선이 한 종류인가 — dlg 는 «배경색 알파», 시트는 «자식 opacity» 로 그리지만 **곡선은 같아야** 한다.
       11회차엔 진행 46.7% 시점에 19.2%p 가 벌어져 «한 빌드에 딤 곡선 2종» 으로 감점됐다. */
    await page.evaluate(() => openProfile()); await page.evaluate(GRAB);
    const dlgP = [];
    for (const t of [37, 75, 112]) dlgP.push(await BGA(page, t, '#pfw') / 0.85);
    await page.evaluate(CLEARJZ); await page.evaluate(() => closeProfile()); await page.waitForTimeout(400);
    await page.evaluate(() => openTrain()); await page.evaluate(GRAB);
    const shP = [];
    for (const t of [37, 75, 112]) shP.push(await SR(page, t, '#trw>.jz-dm', 'op'));
    console.log('    딤 진행률 t37/75/112 — dlg ' + dlgP.map(v => v.toFixed(3)).join('/')
                + ' · 시트 ' + shP.map(v => v.toFixed(3)).join('/'));
    for (let i = 0; i < 3; i++) near('딤 곡선 일치 #' + (i + 1) + '(dlg−시트)', dlgP[i] - shP[i], 0, 0.05);
    /* ⓑ 시트 안에는 stagger 가 없어야 한다 — 있으면 «시트가 빈 채로 올라온다»(11회차 비평 MAJOR). */
    const st = await page.evaluate(() => document.querySelectorAll('#trw .jz-st').length);
    if (st) { fails.push('시트 안에 stagger 카드 ' + st + '개 (시트는 완성 상태로 올라와야 한다)');
      console.log('  ✗ 시트 내부 stagger ' + st + '개'); }
    else ok('시트 내부 stagger 0개 (면 전체가 완성 상태로 슬라이드)');
    await page.evaluate(CLEARJZ); await page.evaluate(() => closeTrain()); await page.waitForTimeout(400);
    /* ⓒ 전체화면 페이지의 반투명 구간 — 길면 아래 화면이 비쳐 «두 화면 동시 판독» 이 된다
       (11회차 비평: t=60 에 알약 이중상 55px · 텍스트 온 텍스트). 45ms 면 이미 불투명해야 한다. */
    await page.evaluate(() => openDungeon()); await page.evaluate(GRAB);
    near('페이지 t45 불투명도(이중상 구간 종료)', await SR(page, 45, '#dunw', 'op'), 1, 0.02);
    near('페이지 t0 불투명도', await SR(page, 0, '#dunw', 'op'), 0, 0.02);
    await page.evaluate(CLEARJZ); await page.evaluate(() => closeDungeon()); await page.waitForTimeout(400);
  }

  console.log('[12] 탭 팝이 «그 순간 보이는» 아이콘에 붙는가 (패널이 열리면 .ti 는 display:none)');
  await page.evaluate(CLEARJZ);
  {
    const r = await page.evaluate(async () => {
      const t = document.querySelector('.tab[data-t="hero"]');
      t.click();                                       /* 패널 열림 → 이 칸은 .close(✕) 가 된다 */
      await new Promise(r => setTimeout(r, 30));
      const ti = t.querySelector('.ti'), tx = t.querySelector('.tx');
      const vd = e => getComputedStyle(e).display !== 'none';
      return { close: t.classList.contains('close'),
               shown: vd(ti) ? 'ti' : (vd(tx) ? 'tx' : 'none'),
               popped: (vd(ti) && ti.classList.contains('jz-ti')) || (vd(tx) && tx.classList.contains('jz-ti')) };
    });
    if (!r.popped) { fails.push('탭 팝이 보이는 아이콘(' + r.shown + ')에 안 붙었다'); console.log('  ✗ 탭 팝 미부착 ' + JSON.stringify(r)); }
    else ok('탭 팝 → 보이는 쪽(' + r.shown + ')에 .jz-ti 부착' + (r.close ? ' [✕ 칸 상태]' : ''));
    await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').click());
    await page.waitForTimeout(400);
  }

  console.log('[10] 비활성 버튼 — 흔들림 6px + 어두워짐');
  await page.evaluate(CLEARJZ);
  {
    const r = await page.evaluate(async () => {
      const b = document.getElementById('tutoBtn');
      if (!b) return { err: '대상 없음' };
      b.disabled = true;
      const rc = b.getBoundingClientRect();
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rc.x + rc.width / 2, clientY: rc.y + rc.height / 2 }));
      await new Promise(r => setTimeout(r, 30));
      return { sh: b.classList.contains('jz-sh'), dn: b.classList.contains('jz-dn'),
               f: getComputedStyle(b).filter };
    });
    if (r.err || !r.sh) { fails.push('비활성 흔들림(.jz-sh) 없음'); console.log('  ✗ 비활성 흔들림 없음 ' + JSON.stringify(r)); }
    else ok('비활성 누름 → .jz-sh (' + r.f.slice(0, 24) + ')');
    if (r.dn) { fails.push('비활성인데 .jz-dn(정상 누름)도 붙었다'); console.log('  ✗ 비활성에 .jz-dn 동시 부착'); }
  }

  if (errs.length) { fails.push('콘솔/페이지 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | ')); }
  console.log('');
  console.log(fails.length ? 'VERIFY60 FAIL\n  - ' + fails.join('\n  - ') : 'VERIFY60 PASS');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
