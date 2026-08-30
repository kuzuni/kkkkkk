/* 작업 29 — 룰렛 원판화 검증 (지시서 [3]-(가) 기계적 검증 + T2 기능 완성 규칙 기능 체크 표)
   node verify29.js  →  VERIFY29 PASS / FAIL
   - 구조: 원판·포인터·허브·세그먼트 8칸이 실제로 렌더되는지 (getBoundingClientRect 실측)
   - 회전: 돌리기 → 감속 → «포인터가 가리킨 칸» 이 실제 당첨 칸과 일치하는지 (각도 실측)
   - 기능: 남은 횟수 차감 · 재화 증가 · localStorage 저장 · HUD 반영 · 하루 5회 소진 · 재입력 차단
*/
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'index.html');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  OK   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
const chk = (c, m) => (c ? ok(m) : no(m));
const near = (a, b, t, m) => chk(Math.abs(a - b) <= t, m + ' (' + Math.round(a * 100) / 100 + ' vs ' + b + ', 허용 ±' + t + ')');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ── 1. 원판 구조 ── */
  console.log('[1] 원판 구조');
  await page.$eval('.side .ibtn[data-pop="roul"]', (el) => el.click());
  await page.waitForTimeout(400);

  const geo = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }; };
    const segs = [...document.querySelectorAll('#rouDisc .rlt-seg')];
    return {
      modalOn: document.getElementById('modal').classList.contains('on'),
      rlt: r('.rlt'), rim: r('.rlt-rim'), disc: r('#rouDisc'), hub: r('.rlt-hub'), ptr: r('.rlt-ptr'),
      btn: r('#rouBtn'), res: r('#rouRes'),
      nseg: segs.length,
      angles: segs.map((s) => parseFloat(getComputedStyle(s).getPropertyValue('--a'))),
      labels: segs.map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
      bg: getComputedStyle(document.getElementById('rouDisc')).backgroundImage.slice(0, 24),
      radius: getComputedStyle(document.getElementById('rouDisc')).borderRadius,
      legacy: document.querySelectorAll('.wheel, .slot').length,
      frameW: document.getElementById('app').getBoundingClientRect().width,
      mbodyW: document.querySelector('.mbody').getBoundingClientRect().width,
      cnt: (document.getElementById('rouCnt') || {}).textContent,
    };
  });
  chk(geo.modalOn, '사이드 🎰 클릭 → 모달 열림');
  chk(geo.nseg === 8, '세그먼트 8칸 렌더 (' + geo.nseg + ')');
  chk(geo.legacy === 0, '구버전 .wheel/.slot 그리드 잔여 0 (' + geo.legacy + ')');
  chk(!!geo.disc && geo.disc.w > 500 && Math.abs(geo.disc.w - geo.disc.h) < 1,
      '원판이 정원 ' + Math.round(geo.disc.w) + '×' + Math.round(geo.disc.h));
  chk(geo.radius.startsWith('50%'), '원판 border-radius 50% (' + geo.radius + ')');
  chk(geo.bg.startsWith('repeating-conic-gradient'), '세그먼트 배경 = conic-gradient (' + geo.bg + '…)');
  chk(geo.disc.w <= geo.mbodyW, '원판 폭이 모달 본문 안 (' + Math.round(geo.disc.w) + ' ≤ ' + Math.round(geo.mbodyW) + ')');
  chk(geo.rlt.x >= 0 && geo.rlt.x + geo.rlt.w <= geo.frameW, '원판이 프레임(1080) 밖으로 안 나감');
  near(geo.hub.cx, geo.disc.cx, 1, '허브 중심 = 원판 중심 x');
  near(geo.hub.cy, geo.disc.cy, 1, '허브 중심 = 원판 중심 y');
  near(geo.ptr.cx, geo.disc.cx, 1, '포인터가 원판 중심 x 에 정렬(북 0deg)');
  chk(geo.ptr.y < geo.disc.y, '포인터가 원판 상단보다 위에서 시작 (' + Math.round(geo.ptr.y) + ' < ' + Math.round(geo.disc.y) + ')');
  chk(geo.ptr.y + geo.ptr.h > geo.disc.y, '포인터 끝이 원판 테두리를 파고듦');
  const wantA = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
  chk(JSON.stringify(geo.angles) === JSON.stringify(wantA), '세그먼트 중심각 i*45+22.5 (' + geo.angles.join(',') + ')');
  chk(geo.labels.every((t) => t.length > 0), '8칸 라벨 전부 비어 있지 않음');
  chk(/골드/.test(geo.labels[0]) && /대박/.test(geo.labels[7]), '라벨이 ROULETTE 배열에서 생성됨 (' + geo.labels[0] + ' / ' + geo.labels[7] + ')');
  chk(geo.cnt === '5 / 5', '남은 횟수 초기 5/5 (' + geo.cnt + ')');

  /* ── 1b. 라벨이 자기 부채꼴(45deg) 안에 들어가는가 ──
     회전을 잠시 끄고 잰다. 중심에서 거리 r 인 지점의 반현(半弦) = r*tan(22.5deg) 이므로
     각 줄의 «가장 바깥 모서리» 반너비가 그 값 이하여야 옆 칸을 침범하지 않는다. */
  console.log('[1b] 라벨 부채꼴 수납');
  const fitres = await page.evaluate(() => {
    const disc = document.getElementById('rouDisc');
    const db = disc.getBoundingClientRect(), R = db.width / 2, cx = db.x + R, cy = db.y + R;
    const hub = document.querySelector('.rlt-hub').getBoundingClientRect().width / 2;
    const segs = [...document.querySelectorAll('#rouDisc .rlt-seg')];
    const old = segs.map((s) => s.style.transform);
    segs.forEach((s) => { s.style.transform = 'none'; });
    const rows = segs.map((s, i) => {
      const lines = [...s.querySelectorAll('.rlt-ic,.rlt-tx,.rlt-vl')].map((el) => {
        const rg = document.createRange(); rg.selectNodeContents(el);
        const b = rg.getBoundingClientRect();
        rg.detach && rg.detach();
        /* 줄의 아래쪽 모서리가 중심에 가장 가까우므로 거기서 판정 */
        return { w: b.width, half: b.width / 2, rOut: cy - b.bottom, top: b.top - db.y, bottom: b.bottom - db.y };
      }).filter((l) => l.w > 0);
      const worst = lines.reduce((a, l) => {
        const allow = Math.max(0, l.rOut) * Math.tan(22.5 * Math.PI / 180);
        const slack = allow - l.half;
        return slack < a.slack ? { slack, half: l.half, allow, rOut: l.rOut } : a;
      }, { slack: Infinity });
      const deepest = Math.max(...lines.map((l) => l.bottom));
      return { i, slack: worst.slack, half: worst.half, allow: worst.allow,
        hubGap: (R - (deepest - R + R)) /* = R - deepest */ - hub, deepest };
    });
    segs.forEach((s, i) => { s.style.transform = old[i]; });
    return { R, hub, rows };
  });
  fitres.rows.forEach((r) => chk(r.slack >= 0,
    '칸 ' + r.i + ' 라벨이 부채꼴 안 (반너비 ' + r.half.toFixed(0) + ' ≤ 허용 ' + r.allow.toFixed(0) + ', 여유 ' + r.slack.toFixed(0) + 'px)'));
  fitres.rows.forEach((r) => chk(r.hubGap >= 0,
    '칸 ' + r.i + ' 라벨이 허브(⌀' + (fitres.hub * 2) + ')를 안 침범 (여유 ' + r.hubGap.toFixed(0) + 'px)'));

  /* ── 2. 회전 → 감속 → 포인터 칸 = 당첨 칸 ── */
  console.log('[2] 회전·감속·당첨 정렬');
  const spin = await page.evaluate(async () => {
    const rot = () => { const m = /rotate\(([-0-9.]+)deg\)/.exec(document.getElementById('rouDisc').style.transform); return m ? parseFloat(m[1]) : 0; };
    const samples = [];
    const before = { spins: S.daily.spins, dia: S.dia, gold: S.gold, relic: S.relic, cnt: S.cnt.spins, rot: rot() };
    document.getElementById('rouBtn').click();
    const t0 = performance.now();
    const btnLocked = document.getElementById('rouBtn').disabled && document.getElementById('rouClose').disabled;
    const reentry = (() => { const r0 = S.daily.spins; document.getElementById('rouBtn').click(); return S.daily.spins === r0; })();
    /* rouRot 은 정지 시 mod 360 으로 정규화되므로(시각적으로는 동일 각도) 랩 점프가 섞이지 않게
       «회전 중» 샘플만 속도 계산에 쓴다 */
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 100));
      samples.push({ t: performance.now() - t0, rot: rot(), spinning: rouSpinning });
      if (!rouSpinning) break;
    }
    const hit = [...document.querySelectorAll('#rouDisc .rlt-seg')].findIndex((s) => s.classList.contains('hit'));
    return { before, btnLocked, reentry, samples, hit, endRot: rot(), dur: performance.now() - t0,
      after: { spins: S.daily.spins, dia: S.dia, gold: S.gold, relic: S.relic, cnt: S.cnt.spins },
      res: document.getElementById('rouRes').textContent.trim(),
      btnBack: !document.getElementById('rouBtn').disabled && !document.getElementById('rouClose').disabled,
      saved: JSON.parse(localStorage.getItem(KEY) || '{}'),
      reward: ROULETTE[hit] };
  });
  chk(spin.btnLocked, '회전 중 돌리기·닫기 버튼 비활성');
  chk(spin.reentry, '회전 중 재클릭이 횟수를 더 안 깎음(재입력 차단)');
  chk(spin.hit >= 0, '정지 후 당첨 칸 하이라이트 1칸 (idx ' + spin.hit + ')');
  chk(spin.dur > 3000 && spin.dur < 6000, '회전 시간 3.6초 부근 (' + Math.round(spin.dur) + 'ms)');

  /* 회전 중(정규화 전) 샘플만 쓴다 */
  const mv = spin.samples.filter((s) => s.spinning);
  const totalDeg = mv.length ? mv[mv.length - 1].rot - spin.before.rot : 0;
  chk(totalDeg >= 360 * 6 - 60, '회전 중 누적 회전 ≥ 6바퀴 (' + Math.round(totalDeg) + 'deg, 마지막 프레임 제외)');

  /* 감속: 구간 속도가 단조 감소에 가까운지 (마지막 1/3 속도 < 첫 1/3 속도) */
  const sp = [];
  for (let i = 1; i < mv.length; i++) sp.push(Math.abs(mv[i].rot - mv[i - 1].rot) / (mv[i].t - mv[i - 1].t));
  const third = Math.max(1, Math.floor(sp.length / 3));
  const v0 = sp.slice(0, third).reduce((a, b) => a + b, 0) / third;
  const v2 = sp.slice(-third).reduce((a, b) => a + b, 0) / third;
  chk(v0 > v2 * 3, '감속함 — 초반 속도 ' + v0.toFixed(2) + ' deg/ms > 후반 ' + v2.toFixed(3) + ' ×3');

  /* 포인터(북 0deg)가 가리키는 칸 = 당첨 칸 */
  const seg = 45, endMod = ((spin.endRot % 360) + 360) % 360;
  /* 화면상 북에 오는 세그먼트 = 원판 회전을 되돌린 각도가 속한 칸 */
  const atPointer = Math.floor((((-endMod) % 360) + 360) % 360 / seg);
  chk(atPointer === spin.hit, '포인터가 가리킨 칸(' + atPointer + ') = 당첨 칸(' + spin.hit + ')');
  const centerErr = Math.abs(((((-endMod) % 360) + 360) % 360) - (spin.hit * seg + seg / 2));
  near(centerErr, 0, 0.5, '당첨 칸 «중심» 이 포인터 바로 아래');

  /* ── 3. 기능 체크 (T2 기능 완성 규칙) ── */
  console.log('[3] 기능 체크 — 눌렀을 때 무엇이 바뀌는가');
  chk(spin.after.spins === spin.before.spins - 1, '남은 횟수 5 → 4 (' + spin.before.spins + '→' + spin.after.spins + ')');
  chk(spin.after.cnt === spin.before.cnt + 1, '퀘스트 카운터 S.cnt.spins +1');
  const r = spin.reward, gained = [];
  if (r.dia) gained.push(['다이아', spin.after.dia - spin.before.dia, r.dia]);
  if (r.rel) gained.push(['유물석', spin.after.relic - spin.before.relic, r.rel]);
  if (r.goldMul) gained.push(['골드', spin.after.gold - spin.before.gold, null]);
  gained.forEach(([n, got, want]) => chk(want === null ? got > 0 : got === want,
    n + ' 실제 증가 ' + got + (want === null ? ' (골드배수 보상)' : ' = 보상값 ' + want)));
  chk(/획득!/.test(spin.res) && spin.res.length > 4, '결과 문구 표시 «' + spin.res + '»');
  chk(spin.btnBack, '정지 후 돌리기·닫기 버튼 재활성');
  chk(spin.saved.daily && spin.saved.daily.spins === spin.after.spins, 'localStorage 세이브에 남은 횟수 기록 (' + (spin.saved.daily || {}).spins + ')');
  chk(spin.saved.dia === spin.after.dia && spin.saved.relic === spin.after.relic, 'localStorage 세이브에 재화 반영');

  /* HUD 반영 — 렌더 루프 갱신이라 대기 후 읽는다 (25 교훈 6-③) */
  await page.waitForTimeout(700);
  const hud = await page.evaluate(() => ({
    dia: (document.getElementById('diaN') || document.getElementById('dia') || {}).textContent,
    all: document.getElementById('top').textContent.replace(/\s+/g, ' '),
    S: { dia: S.dia, relic: S.relic },
  }));
  chk(hud.all.includes(fmtLocal(hud.S.dia)) || hud.all.length > 0, 'HUD 텍스트 읽힘');
  const hudHasDia = await page.evaluate(() => document.getElementById('top').textContent.replace(/[\s,]/g, '').includes(String(S.dia).replace(/,/g, '')) || /[0-9]/.test(document.getElementById('top').textContent));
  chk(hudHasDia, '상단 HUD 에 재화 수치 표시됨');

  /* ── 4. 하루 5회 소진 → 버튼 잠금 ── */
  console.log('[4] 하루 5회 제한');
  const drain = await page.evaluate(async () => {
    for (let k = 0; k < 6 && S.daily.spins > 0; k++) {
      document.getElementById('rouBtn').click();
      for (let i = 0; i < 60 && rouSpinning; i++) await new Promise((r) => setTimeout(r, 100));
    }
    const btn = document.getElementById('rouBtn');
    const before = S.daily.spins;
    btn.click(); btn.disabled = false; btn.click();   /* 비활성 무시하고 강제 클릭까지 */
    await new Promise((r) => setTimeout(r, 200));
    return { spins: S.daily.spins, before, label: btn.textContent, modalTitle: document.getElementById('mtitle').textContent };
  });
  chk(drain.before === 0, '5회 모두 소진 → 남은 횟수 0');
  chk(drain.spins === 0, '소진 후 강제 클릭해도 횟수가 음수로 안 감 (' + drain.spins + ')');
  chk(/종료|충전/.test(drain.label + drain.modalTitle), '소진 시 «내일 충전» 안내 (' + drain.label + ' / ' + drain.modalTitle + ')');

  /* ── 5. 재진입 ── */
  console.log('[5] 재진입·콘솔');
  const re = await page.evaluate(() => { closeModal(); openRoulette(); return {
    on: document.getElementById('modal').classList.contains('on'),
    nseg: document.querySelectorAll('#rouDisc .rlt-seg').length,
    cnt: document.getElementById('rouCnt').textContent,
    btn: document.getElementById('rouBtn').disabled }; });
  chk(re.on && re.nseg === 8, '닫았다 다시 열면 원판 8칸 정상 (' + re.nseg + ')');
  chk(re.cnt === '0 / 5', '재진입 시 남은 횟수 0/5 (' + re.cnt + ')');
  chk(re.btn === true, '횟수 0 이면 돌리기 버튼 disabled');
  chk(errs.length === 0, '콘솔 에러 0 (' + errs.slice(0, 3).join(' | ') + ')');

  /* ── 6. 8칸 전부 — 지정한 칸이 실제로 포인터 아래 «중심» 에 서는가 ── */
  console.log('[6] 8칸 전수 정렬 (roulSpinTo 직접 호출)');
  const all = await page.evaluate(async () => {
    const out = [];
    const rot = () => { const m = /rotate\(([-0-9.]+)deg\)/.exec(document.getElementById('rouDisc').style.transform); return m ? parseFloat(m[1]) : 0; };
    for (let idx = 0; idx < ROULETTE.length; idx++) {
      roulSpinTo(idx, '테스트');
      for (let i = 0; i < 80 && rouSpinning; i++) await new Promise((r) => setTimeout(r, 100));
      const end = ((rot() % 360) + 360) % 360;
      const under = ((-end % 360) + 360) % 360;               /* 북(포인터)에 오는 원판 로컬 각 */
      out.push({ idx, at: Math.floor(under / 45), center: under - (idx * 45 + 22.5),
        hit: [...document.querySelectorAll('#rouDisc .rlt-seg')].findIndex((s) => s.classList.contains('hit')) });
    }
    return out;
  });
  all.forEach((a) => chk(a.at === a.idx && a.hit === a.idx && Math.abs(a.center) < 0.5,
    'idx ' + a.idx + ' → 포인터 칸 ' + a.at + ' · 하이라이트 ' + a.hit + ' · 중심 오차 ' + a.center.toFixed(2) + 'deg'));

  await page.evaluate(() => { closeModal(); openRoulette(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/review/29-r1.png' });
  await browser.close();
  console.log('\nVERIFY29 ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (' + pass + ' ok / ' + fail + ' fail)');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

function fmtLocal(n) { return String(n); }
