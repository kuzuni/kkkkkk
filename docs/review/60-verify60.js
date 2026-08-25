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
    const OP = () => parseFloat(getComputedStyle(document.querySelector('#pfw')).opacity);
    await page.evaluate(SEEK, 0);
    near('열기 t0 딤 opacity', await page.evaluate(OP), 0, 0.02);
    await page.evaluate(SEEK, 150);
    near('열기 t150 딤 opacity', await page.evaluate(OP), 1, 0.02);
    await page.evaluate(() => closeProfile()); await page.waitForTimeout(400);
  }

  console.log('[3] 바닥 시트 — 아래에서 슬라이드업 + 오버슈트 8px (240ms)');
  await page.evaluate(CLEARJZ);
  {
    await page.evaluate(() => openTrain()); await page.evaluate(GRAB);
    await page.evaluate(SEEK, 0);
    /* t0 은 «자기 높이만큼 아래» — computed 는 px 가 아니라 `100%` 로 나온다(퍼센트 유지) */
    const t0 = await page.evaluate(() => { const v = getComputedStyle(document.querySelector('#trw')).translate;
      return (v || '').trim().split(/\s+/)[1] || ''; });
    if (t0 !== '100%') { fails.push('시트 t0 translateY = ' + t0 + ' (기대 100%)'); console.log('  ✗ 시트 t0 translateY = ' + t0); }
    else ok('시트 t0 translateY = 100% (자기 높이만큼 아래)');
    await page.evaluate(SEEK, 180);                    /* 70~86% 홀드 구간 한가운데 → -8px */
    near('시트 t180 translateY(오버슈트 홀드)', await page.evaluate(TY, '#trw'), -8, 1.2);
    await page.evaluate(SEEK, 200);
    near('시트 t200 translateY(홀드 유지)', await page.evaluate(TY, '#trw'), -8, 1.2);
    await page.evaluate(SEEK, 240);
    near('시트 t240 translateY(정착)', await page.evaluate(TY, '#trw'), 0, 0.6);
    /* ⚠ 회귀 가드 — 이동거리(시트 높이 ≈2100px) 전체에 오버슈트 이징을 걸면
       베지어 최대치 1.098 이 그대로 **205px 물리 오버슈트**가 된다(3회차 비평 실측 212px).
       궤적 전체를 훑어 «최종 위치보다 10px 넘게 위로 올라간 순간» 이 없는지 본다. */
    let worst = 0;
    for (let t = 0; t <= 240; t += 6) {
      await page.evaluate(SEEK, t);
      const v = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#trw')).translate;
        const p = (s || '').trim().split(/\s+/)[1] || '0';
        return p.endsWith('%') ? 9999 : parseFloat(p); });   /* 아직 % 구간이면 화면 밖 — 무시 */
      if (v !== 9999 && v < worst) worst = v;
    }
    if (worst < -10) { fails.push(`시트 궤적 최대 오버슈트 ${worst.toFixed(1)}px (허용 -10px)`);
      console.log(`  ✗ 시트 궤적 최대 오버슈트 ${worst.toFixed(1)}px`); }
    else ok(`시트 궤적 최대 오버슈트 ${worst.toFixed(1)}px (허용 -10px 이내)`);
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

  console.log('[5] 카드 그리드 stagger 25ms');
  await page.evaluate(CLEARJZ);
  {
    await page.evaluate(() => openDungeon()); await page.waitForTimeout(20);
    const d = await page.evaluate(() => {
      const g = document.querySelectorAll('#dunw .jz-st');
      return [...g].slice(0, 5).map(e => parseFloat(e.style.getPropertyValue('--jzd')) || 0);
    });
    if (d.length < 3) { fails.push('stagger: 대상 카드 ' + d.length + '개 (>=3 기대)'); console.log('  ✗ stagger 대상 ' + d.length + '개'); }
    else { const step = d[1] - d[0];
      near('stagger 간격(ms)', step, 25, 0.5);
      near('stagger 5번째 지연(ms)', d[Math.min(4, d.length - 1)], 25 * Math.min(4, d.length - 1), 0.5);
      ok('stagger 대상 ' + d.length + '개 이상'); }
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
    await page.evaluate(CLEARJZ); await page.waitForTimeout(400);

    /* 바닥 시트 닫기 — jzSheetOut(130ms): translateY → 100% */
    await page.evaluate(() => openTrain()); await page.waitForTimeout(500);
    await page.evaluate(() => closeTrain());
    await page.evaluate(GRAB);
    near('닫기 t0 #trw translateY', await SR(page, 0, '#trw', 'ty'), 0, 1.5);
    const tEnd = await SR(page, 130, '#trw', 'tyRaw');
    if (tEnd !== '100%') { fails.push('닫기 t130 시트 translateY = ' + tEnd + ' (기대 100%)'); console.log('  ✗ 닫기 t130 시트 = ' + tEnd); }
    else ok('닫기 t130 시트 translateY = 100% (아래로 빠짐)');
    await page.evaluate(CLEARJZ); await page.waitForTimeout(400);
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
