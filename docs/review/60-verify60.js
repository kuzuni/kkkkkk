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
const SEEK = t => (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} });
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
  {
    const b = await page.evaluate(() => { const r = document.querySelector('.tab[data-t="hero"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(b.x, b.y); await page.mouse.down();
    await page.evaluate(GRAB);
    await page.evaluate(SEEK, 60);
    near('누름 t60 .tab scale', await page.evaluate(SC, '.tab[data-t="hero"]'), 0.94, 0.01);
    await page.mouse.move(6, 6); await page.mouse.up();
    await page.mouse.move(b.x, b.y); await page.mouse.down(); await page.mouse.up();
    await page.evaluate(GRAB);
    await page.evaluate(SEEK, 99);                     /* 0.18s * .55 = 99ms → 최대 1.04 */
    near('뗌 t99 .tab scale(피크)', await page.evaluate(SC, '.tab[data-t="hero"]'), 1.04, 0.012);
    await page.evaluate(SEEK, 180);
    near('뗌 t180 .tab scale(복귀)', await page.evaluate(SC, '.tab[data-t="hero"]'), 1, 0.005);
    await page.evaluate(() => document.querySelectorAll('.jz-dn,.jz-up').forEach(e => e.classList.remove('jz-dn', 'jz-up')));
    await page.waitForTimeout(300);
  }

  console.log('[2] 다이얼로그 열기 — 박스 .92 → 1.02 → 1 (220ms) · 딤 페이드 150ms');
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
  {
    await page.evaluate(() => openTrain()); await page.evaluate(GRAB);
    await page.evaluate(SEEK, 0);
    /* t0 은 «자기 높이만큼 아래» — computed 는 px 가 아니라 `100%` 로 나온다(퍼센트 유지) */
    const t0 = await page.evaluate(() => { const v = getComputedStyle(document.querySelector('#trw')).translate;
      return (v || '').trim().split(/\s+/)[1] || ''; });
    if (t0 !== '100%') { fails.push('시트 t0 translateY = ' + t0 + ' (기대 100%)'); console.log('  ✗ 시트 t0 translateY = ' + t0); }
    else ok('시트 t0 translateY = 100% (자기 높이만큼 아래)');
    await page.evaluate(SEEK, 178);                    /* .24s * .74 = 178ms → -8px */
    near('시트 t178 translateY(오버슈트)', await page.evaluate(TY, '#trw'), -8, 1.2);
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
  {
    await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').click());
    await page.evaluate(GRAB);
    await page.evaluate(SEEK, 90);                     /* .2s * .45 = 90ms → 1.12 */
    near('탭 t90 .ti scale(피크)', await page.evaluate(SC, '.tab[data-t="hero"] .ti'), 1.12, 0.012);
    await page.evaluate(SEEK, 200);
    near('탭 t200 .ti scale(복귀)', await page.evaluate(SC, '.tab[data-t="hero"] .ti'), 1, 0.005);
    await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').click());
    await page.waitForTimeout(400);
  }

  console.log('[5] 카드 그리드 stagger 25ms');
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
  {
    await page.evaluate(() => { S.dia = 0; popup('💎 다이아 부족', '<p>다이아가 부족합니다.</p>'); });
    await page.evaluate(GRAB);
    await page.evaluate(SEEK, 56);                     /* .34s * .165 ≈ 56ms → -6px */
    near('부족 t56 .mbox translateX', await page.evaluate(TX, '#modal .mbox'), -6, 1.2);
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
    await page.evaluate(() => closeModal()); await page.waitForTimeout(300);
  }

  console.log('[7] 수치 롤링 — 전투력이 «뚝» 바뀌지 않는다');
  {
    const r = await page.evaluate(async () => {
      const read = () => document.getElementById('cpN').textContent;
      const a = read();
      S.spAtk += 4000;                                   /* 전투력을 크게 올린다 */
      const seq = [];
      for (let i = 0; i < 8; i++) { await new Promise(r => requestAnimationFrame(r)); seq.push(read()); }
      return { a, seq, uniq: new Set(seq).size };
    });
    if (r.uniq < 3) { fails.push('롤링: 8프레임 동안 표시값 ' + r.uniq + '종 (>=3 기대 — 뚝 바뀜)'); console.log('  ✗ 롤링 ' + r.uniq + '종'); }
    else ok('롤링 8프레임 표시값 ' + r.uniq + '종 (' + r.a + ' → ' + r.seq[r.seq.length - 1] + ')');
  }

  console.log('[8] 스킬 슬롯 — 발동 플래시 / 쿨 완료 글로우');
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

  console.log('[10] 비활성 버튼 — 흔들림 6px + 어두워짐');
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
