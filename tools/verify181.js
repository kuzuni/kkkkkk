#!/usr/bin/env node
/* 작업 181 게이트 — «룰렛 회전 중에는 팝업 «위» 도 조용하다» + «보상은 그대로 지급된다»
 *
 *   node tools/verify181.js
 *
 * 65 는 `#modal` **안**(박스·딤·버튼)만 봤고 그래서 통과한 채로 증상이 남았다.
 * 181 이 막는 것은 65 의 `rou-spin` 규칙이 닿지 않는 두 곳이다:
 *   ① 연출 레이어 `#fxl`(z60, 팝업 **위**) — 보상 연출이 회전 내내 팝업을 가로질렀다
 *   ② 비활성 버튼 재터치 — 흔들림은 죽었지만 `sfx('err')`·`jzWhy` 캡션이 `#fxl` 이라 살아 있었다
 *
 * 검사(전부 수치 · 비평가 없음 — 지시서 [3]-(가)):
 *   [A] 회전 중 `#fxl` 에 새 연출 노드 **0개**
 *   [B] 회전 중 모달 박스 안 **픽셀 Δ0**(원판 사각 제외) — 「위를 지나가는 것」까지 잡는다
 *   [C] 회전 중 비활성 버튼을 5회 재터치 → 새 연출 노드 0 · `jz-sh`/`jz-why` 0 · 모달 클래스 불변
 *   [D] 정지 «후» 에는 당첨 연출이 **살아 있다** (연출을 지운 게 아니라 미룬 것이다)
 *   [E] 보상은 정확히 당첨 칸만큼 1회 지급 (회전 중에는 0)
 *   [F] 회전 중 팝업이 사라져도(닫아도) 지급된다 (65 의 «강제 닫힘» 성질 유지)
 *   [H] 회전 도중 앱을 닫아도(pagehide) 지급된다 · 두 번 와도 두 번 주지 않는다
 *   [G] 원판은 그대로 돈다 · 당첨 칸 = 포인터 아래 칸
 *
 * [B] 의 마스크 2개(원판 사각 · 박스 둥근 모서리 AA)와 그 근거는 `diffPixels` 위 주석에 있다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

/* 모달 박스·원판 사각은 페이지에서 실측해 넘긴다(하드코딩하면 레이아웃 작업에 바로 낡는다) */
async function main() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  /* 팝업 «뒤» 는 원래 계속 살아 있다(전투 캔버스·스킬 쿨다운 바·탭바 리본). 박스는 불투명이지만
     **둥근 모서리(radius) 바깥은 딤을 통해 그 배경이 비친다** — 실측으로 박스 하단 두 모서리
     AA 화소 16개가 회전과 무관하게 왔다 갔다 했다(Δ≤34, 두 값 사이를 오갈 뿐 «이동» 이 아니다).
     그걸 «흔들림» 으로 셀 수는 없으므로 배경을 통째로 내려 두고 잰다(verify65 가 `#view` 에 쓴 처방). */
  await page.evaluate(() => {
    ['view', 'stagearea', 'tabbar', 'top'].forEach((id) => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; });
  });

  await page.evaluate(() => { S.daily.spins = 30; S.dia = 0; openRoulette(); });
  await page.waitForTimeout(500);

  const geo = await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const b = document.querySelector('#modal .mbox');
    /* 267 — [룰렛 돌리기] 가 22 [모두 받기] 규격(radius 43)이 되면서 **박스 모서리와 같은 종류의
       AA 뒤집힘**이 이 버튼의 둥근 네 모서리에도 생긴다(원판 회전이 레이어를 다시 래스터할 때
       호 위 화소가 두 값 사이를 오간다 — 실측 프레임당 ≤7화소, 다음 프레임에 되돌아온다).
       박스 모서리와 같은 규칙으로 «따로 세되 흔들림으로는 안 센다». */
    const rb = document.getElementById('rouBtn');
    return { box: g('#modal .mbox'), rlt: g('#modal .rlt'), btn: g('#rouBtn'),
             br: rb ? Math.ceil(parseFloat(getComputedStyle(rb).borderTopLeftRadius) || 0) : 0,
             rr: b ? Math.ceil(parseFloat(getComputedStyle(b).borderTopLeftRadius) || 0) : 0 };
  });
  if (!geo.box || !geo.rlt) { fail('룰렛 모달이 열리지 않았다'); }

  /* ── 계측기 부착: #fxl 에 «회전 중» 추가된 노드를 센다 ── */
  await page.evaluate(() => {
    window.__w = { spinAdd: 0, postAdd: 0, cls: [], why: 0, sh: 0 };
    const fxl = document.getElementById('fxl');
    if (fxl) new MutationObserver((ms) => ms.forEach((r) => {
      r.addedNodes.forEach((n) => {
        if (rouSpinning) window.__w.spinAdd++; else window.__w.postAdd++;
        const c = (n.className && typeof n.className === 'string') ? n.className : '';
        if (/jz-why/.test(c)) window.__w.why++;
      });
    })).observe(fxl, { childList: true });
    const m = document.getElementById('modal');
    new MutationObserver((ms) => ms.forEach((r) => {
      const c = (r.target.className && typeof r.target.className === 'string') ? r.target.className : '';
      if (/jz-sh|jz-bad/.test(c)) window.__w.sh++;
      if (r.target === m && rouSpinning) window.__w.cls.push(c);
    })).observe(m, { attributes: true, subtree: true, attributeFilter: ['class'] });
    window.__dia0 = S.dia;
  });

  await page.click('#rouBtn');

  /* [B] 회전 중 박스 안 픽셀 — 캡처는 «회전 중인 프레임만» 쓴다.
     캡처 1장이 200~400ms 라 8장이면 회전(3.9s)이 끝날 수 있다. 끝난 뒤 프레임을 섞으면
     당첨 문구·하이라이트가 «흔들림» 으로 오검출된다(65 교훈 3 «회전 중 프레임만으로 재라»). */
  const shots = [];
  let midDia = null, midW = null;
  for (let i = 0; i < 8; i++) {
    const spin0 = await page.evaluate(() => rouSpinning);
    const buf = await page.screenshot({ clip: { x: geo.box.x, y: geo.box.y, width: geo.box.w, height: geo.box.h } });
    /* 267 — 캡처 «앞» 만 보던 판정을 **앞뒤 둘 다**로 바꿨다. 캡처 1장이 200~400ms 라
       그 사이에 회전이 끝나면 결과줄·버튼 라벨이 바뀐 프레임이 «회전 중» 으로 섞여 들어와
       흔들림 89,000화소로 오검출된다(이 절의 원 주석이 경고한 그 경계 — 판정이 반쪽이었다). */
    const spin = spin0 && await page.evaluate(() => rouSpinning);
    shots.push({ spin, buf });
    if (spin && midDia === null) midDia = await page.evaluate(() => S.dia);
    /* [C] 조바심 재터치 — 회전 중 비활성 버튼을 강제로 누른다(65 가 흔들림의 «주범» 으로 지목한 조작) */
    if (spin && (i === 1 || i === 3)) {
      await page.click('#rouBtn', { force: true }).catch(() => {});
      /* 267 — [닫기] 삭제. 딤 클릭은 «닫기» 라 재터치 표본으로 못 쓴다(아래 [D] 표본이 끊긴다). */
    }
    if (spin) midW = await page.evaluate(() => JSON.parse(JSON.stringify(window.__w)));
    await page.waitForTimeout(60);
  }
  const midSpin = { dia: midDia === null ? 0 : midDia, w: midW || { spinAdd: 0, why: 0, sh: 0, cls: [] } };
  const spinFrames = shots.filter((s) => s.spin).length;
  if (spinFrames < 3) fail(`[B] 회전 중 캡처가 ${spinFrames}장뿐 — 표본이 부족하다`);
  else ok(`[B-0] 회전 중 캡처 ${spinFrames}장 확보`);

  await page.waitForTimeout(4200);
  const after = await page.evaluate(() => ({ spin: rouSpinning, dia: S.dia,
    w: JSON.parse(JSON.stringify(window.__w)),
    hit: document.querySelectorAll('#rouDisc .rlt-seg.hit').length,
    res: (document.getElementById('rouRes') || {}).textContent || '',
    mark: !!document.querySelector('#modal.rou-spin') }));

  /* ── [A] 회전 중 연출 노드 0 ── */
  if (midSpin.w.spinAdd > 0) fail(`[A] 회전 중 #fxl 에 연출 노드 ${midSpin.w.spinAdd}개가 생겼다 (팝업 위에서 움직인다)`);
  else ok('[A] 회전 중 #fxl 에 추가된 연출 노드 0개');

  /* ── [B] 박스 안 픽셀 Δ0 ── */
  const PNG = pngRead;
  const corner = { n: 0 };
  let worst = 0, worstAt = -1;
  for (let i = 1; i < shots.length; i++) {
    if (!shots[i].spin || !shots[i - 1].spin) continue;
    const n = diffPixels(shots[i - 1].buf, shots[i].buf, geo, PNG, corner);
    if (n > worst) { worst = n; worstAt = i; }
  }
  if (worst > 0) fail(`[B] 회전 중 모달 박스 안 픽셀이 ${worst}개 바뀐다 (프레임 ${worstAt}, 원판 제외) ` +
    JSON.stringify(diffBox(shots[worstAt - 1].buf, shots[worstAt].buf, geo, PNG)));
  else ok(`[B] 회전 중 모달 박스 안 픽셀 Δ0 (원판 사각·모서리 AA 제외 · 모서리 잔변화 ${corner.n}화소)`);
  if (corner.n > 200) fail(`[B] 모서리 AA 잔변화가 ${corner.n}화소 — 실측 기준(16)의 12배가 넘는다. AA 가 아니라 진짜 움직임을 의심하라`);

  /* ── [C] 재터치 무반응 ── */
  if (midSpin.w.why > 0) fail(`[C] 회전 중 «왜 안 되는지» 캡션(jz-why)이 ${midSpin.w.why}회 떴다`);
  else ok('[C-1] 회전 중 재터치 → jz-why 캡션 0회');
  if (midSpin.w.sh > 0) fail(`[C] 회전 중 흔들림 클래스(jz-sh/jz-bad)가 ${midSpin.w.sh}회 붙었다`);
  else ok('[C-2] 회전 중 재터치 → jz-sh/jz-bad 0회');
  const clsChanged = midSpin.w.cls.filter((c) => !/rou-spin/.test(c));
  if (clsChanged.length) fail(`[C] 회전 중 #modal 클래스가 변했다: ${clsChanged.slice(0, 3).join(' | ')}`);
  else ok('[C-3] 회전 중 #modal 클래스 불변 (rou-spin 만)');

  /* ── [D] 정지 후에는 연출이 살아 있다 ── */
  if (after.w.postAdd < 1) fail('[D] 정지 뒤에도 당첨 연출이 0개다 — 미룬 게 아니라 지워졌다');
  else ok(`[D] 정지 «후» 당첨 연출 ${after.w.postAdd}개 (미룬 것이지 지운 게 아니다)`);

  /* ── [E] 지급 ── */
  if (midSpin.dia !== 0) fail(`[E] 회전 중에 이미 다이아가 지급됐다 (${midSpin.dia})`);
  else ok('[E-1] 회전 중 지급 0 (연출이 안 뜨는 이유)');
  const legal = await page.evaluate(() => ROULETTE.map((r) => r.dia));
  if (!legal.includes(after.dia)) fail(`[E] 정지 후 다이아 ${after.dia} — 룰렛 칸 값(${legal.join('/')}) 이 아니다`);
  else ok(`[E-2] 정지 후 정확히 1칸분 지급 (💎${after.dia})`);
  if (after.hit !== 1) fail(`[E] 당첨 칸 하이라이트 ${after.hit}개 (1개여야 한다)`);
  else ok('[E-3] 당첨 칸 하이라이트 1개');
  if (!/획득/.test(after.res)) fail(`[E] 결과 문구가 없다: "${after.res}"`);
  else ok('[E-4] 결과 문구 표시됨');
  if (after.spin || after.mark) fail('[E] 정지했는데 rouSpinning/rou-spin 표식이 남아 있다');
  else ok('[E-5] 정지 후 rouSpinning=false · rou-spin 제거');

  /* ── [F] 회전 중 팝업이 사라져도 지급 ── */
  const forced = await page.evaluate(async () => {
    const out = [];
    for (let k = 0; k < 3; k++) {
      S.daily.spins = 5; S.dia = 0; rouRot = 0; rouSpinning = false;
      openRoulette();
      spinRoulette();
      await new Promise((r) => setTimeout(r, 300));
      closeModal();                                   /* 회전 도중 강제로 닫는다 */
      await new Promise((r) => setTimeout(r, 900));
      out.push({ dia: S.dia, spins: S.daily.spins, spinning: rouSpinning });
    }
    return out;
  });
  const bad = forced.filter((f) => !(f.dia > 0) || f.spins !== 4 || f.spinning);
  if (bad.length) fail(`[F] 회전 중 강제 닫힘 3회 중 ${bad.length}회가 어긋났다: ${JSON.stringify(bad[0])}`);
  else ok(`[F] 회전 중 강제 닫힘 3/3 지급됨 (💎${forced.map((f) => f.dia).join('/')} · spins 5→4 · rouSpinning=false)`);

  /* ── [H] 회전 도중 앱을 닫아도 지급된다 (pagehide 안전망) ── */
  const hide = await page.evaluate(async () => {
    S.daily.spins = 5; S.dia = 0; rouRot = 0; rouSpinning = false; openRoulette();
    spinRoulette();
    await new Promise((r) => setTimeout(r, 300));
    const during = S.dia;
    dispatchEvent(new Event('pagehide'));            /* 탭 종료·새로고침·백그라운드 폐기 */
    const after = S.dia;
    dispatchEvent(new Event('pagehide'));            /* 두 번 와도 두 번 주면 안 된다 */
    return { during, after, twice: S.dia };
  });
  if (hide.during !== 0) fail(`[H] 회전 중 이미 지급됐다 (${hide.during})`);
  else if (!(hide.after > 0)) fail('[H] 회전 도중 pagehide 인데 지급되지 않았다 — 보상 증발');
  else if (hide.twice !== hide.after) fail(`[H] pagehide 2회에 두 번 지급됐다 (${hide.after} → ${hide.twice})`);
  else ok(`[H] 회전 도중 pagehide → 💎${hide.after} 지급 · 재발생 시 중복 지급 없음`);

  /* ── [G] 원판은 그대로 돈다 · 당첨 칸 역산 ── */
  const wheel = await page.evaluate(async () => {
    const out = [];
    const n = ROULETTE.length, seg = 360 / n;
    for (let i = 0; i < n; i++) {
      S.daily.spins = 5; rouRot = 0; rouSpinning = false; openRoulette();
      const seen = new Set();
      roulSpinTo(i);
      await new Promise((r) => {
        const tick = () => { const d = document.getElementById('rouDisc');
          if (d) seen.add(d.style.transform);
          if (!rouSpinning) return r(); requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      const rot = ((rouRot % 360) + 360) % 360;
      out.push({ want: i, under: Math.floor(((((-rot) % 360) + 360) % 360) / seg) % n, uniq: seen.size });
    }
    return out;
  });
  const wrong = wheel.filter((w) => w.want !== w.under);
  if (wrong.length) fail(`[G] 당첨 칸 역산 불일치 ${wrong.length}/8`);
  else ok('[G-1] 당첨 칸 역산 8칸 전수 일치');
  const still = wheel.filter((w) => w.uniq < 20);
  if (still.length) fail(`[G] 원판이 안 돈다 — 서로 다른 각도가 ${Math.min(...wheel.map((w) => w.uniq))}개뿐인 칸이 있다`);
  else ok(`[G-2] 원판은 그대로 돈다 (칸당 서로 다른 각도 최소 ${Math.min(...wheel.map((w) => w.uniq))}개)`);

  if (errs.length) errs.slice(0, 5).forEach((e) => fail(e));
  else ok('콘솔 에러 0건');

  await browser.close();
  console.log('');
  if (fails.length) { console.log(`VERIFY181 FAIL (${fails.length}건)`); process.exit(1); }
  console.log('VERIFY181 PASS');
}

/* ── 최소 PNG 디코더 ── PIL·sharp 없이 돌게 한다(러너마다 있는 게 다르다).
   playwright 스크린샷은 8bit RGBA 논인터레이스라 필터 5종만 풀면 된다. */
const zlib = require('zlib');
function pngRead(buf) {
  let p = 8, w = 0, h = 0, ct = 6, depth = 8, il = 0, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12);
                           depth = buf[p + 16]; ct = buf[p + 17]; il = buf[p + 20]; }
    else if (type === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + len));
    else if (type === 'IEND') break;
    p += len + 12;
  }
  /* ⚠ 크로미움 스크린샷은 **컬러타입 2(RGB, 3바이트/화소)** 로 나온다 — RGBA(4)로 가정하면
     스트라이드가 어긋나 필터 복원이 무너지고 «[4,255,0]» 같은 순색 잡음이 화면 전체에 깔린다
     (그 잡음을 «회전 중 흔들림» 으로 오검출했다). 헤더에서 읽어 쓴다. */
  if (depth !== 8 || il !== 0 || (ct !== 2 && ct !== 6))
    throw new Error(`PNG 형식 미지원 (depth ${depth} · colorType ${ct} · interlace ${il})`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  let o = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[o++];
    const line = raw.slice(o, o + stride); o += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}
/* 두 캡처(모달 박스 클립)에서 «원판 사각 밖» 화소 차이를 센다 */
/* 마스크 2개 — 둘 다 «회전해야 하는 것/움직임이 아닌 것» 이라 센서에서 뺀다.
   ① 원판 사각(`.rlt`)          : 돌아야 하는 곳
   ② 박스 네 «둥근 모서리» 정사각(radius+6): 실측 결과 회전 중 여기 **16화소**가 두 값 사이를
      왔다 갔다 한다(Δ≤34, 좌우 대칭, 다음 프레임에 원래 색으로 되돌아온다 = 이동이 아니라
      래스터 AA 뒤집힘). 배경(#view·#stagearea·#tabbar·#top)을 전부 내려도 남고, 회전이 없으면
      6프레임 연속 Δ0 이라 «원판 레이어 재래스터의 부산물» 로 확정했다. 감추지 않고 따로 세어
      리포트에 찍는다 — 여기 수가 갑자기 커지면 그건 진짜 무슨 일이 난 것이다. */
function inCorner(x, y, w, h, r) {
  const R = r + 6;
  return (x < R || x >= w - R) && (y < R || y >= h - R);
}
/* 267 — 박스 좌표계에서 «[룰렛 돌리기] 버튼의 둥근 네 모서리» 안인가. 근거는 위 주석과 같다. */
function inBtnCorner(x, y, geo) {
  if (!geo.btn) return false;
  const bx = geo.btn.x - geo.box.x, by = geo.btn.y - geo.box.y;
  const lx = x - bx, ly = y - by;
  if (lx < 0 || ly < 0 || lx >= geo.btn.w || ly >= geo.btn.h) return false;
  return inCorner(lx, ly, geo.btn.w, geo.btn.h, geo.br || 0);
}
function diffPixels(bufA, bufB, geo, read, cornerOut) {
  const A = read(bufA), B = read(bufB);
  if (A.w !== B.w || A.h !== B.h) return A.w * A.h;
  const bpp = A.bpp;
  const rx0 = geo.rlt.x - geo.box.x, ry0 = geo.rlt.y - geo.box.y;
  const rx1 = rx0 + geo.rlt.w, ry1 = ry0 + geo.rlt.h;
  let n = 0;
  for (let y = 0; y < A.h; y++) {
    const inR = y >= ry0 && y <= ry1;
    for (let x = 0; x < A.w; x++) {
      if (inR && x >= rx0 && x <= rx1) continue;
      if (inCorner(x, y, A.w, A.h, geo.rr) || inBtnCorner(x, y, geo)) {
        const j = (y * A.w + x) * bpp;
        if (cornerOut && (Math.abs(A.data[j] - B.data[j]) > 8 || Math.abs(A.data[j + 1] - B.data[j + 1]) > 8 ||
            Math.abs(A.data[j + 2] - B.data[j + 2]) > 8)) cornerOut.n++;
        continue;
      }
      const i = (y * A.w + x) * bpp;
      if (Math.abs(A.data[i] - B.data[i]) > 8 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 8 ||
          Math.abs(A.data[i + 2] - B.data[i + 2]) > 8) n++;
    }
  }
  return n;
}
/* 실패 시 «어디가» 변했는지 — 박스 좌표계 bbox (진단용) */
function diffBox(bufA, bufB, geo, read) {
  const A = read(bufA), B = read(bufB);
  const bpp = A.bpp;
  const rx0 = geo.rlt.x - geo.box.x, ry0 = geo.rlt.y - geo.box.y;
  const rx1 = rx0 + geo.rlt.w, ry1 = ry0 + geo.rlt.h;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < A.h; y++) {
    const inR = y >= ry0 && y <= ry1;
    for (let x = 0; x < A.w; x++) {
      if (inR && x >= rx0 && x <= rx1) continue;
      if (inCorner(x, y, A.w, A.h, geo.rr) || inBtnCorner(x, y, geo)) continue;
      const i = (y * A.w + x) * bpp;
      if (Math.abs(A.data[i] - B.data[i]) > 8 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 8 ||
          Math.abs(A.data[i + 2] - B.data[i + 2]) > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, 프레임y: geo.box.y + y0 };
}
main().catch((e) => { console.error(e); process.exit(2); });
