/* 작업 497 — 다이아 팩 5종·마일리지 교환 다이아를 «×2» 로 되돌릴 때 **글자가 칸을 넘치는가** 를 먼저 잰다.
 *
 * 338 규칙 — 처방보다 재현이 먼저다. 등재문(PROGRESS 497)이 «카드 숫자 폭이 늘어 잘리지 않는지
 * (470/477 규약) 확인» 이라고만 적어 두었으므로, 여기서 **지금 폭 · 바꾼 뒤 폭 · 여유** 를 실제로 찍는다.
 *
 * 재는 것 넷:
 *   [1] 지금 다섯 칸 — 라벨 문자열 · 자연폭(scaleX 걷은 폭) · 렌더폭 · 카드 안쪽(.bg) 좌우 여백
 *   [2] «×2» 라벨을 넣었을 때의 같은 값 — `DIA_PACKS[].q` 만 갈아 끼우고 다시 그린다(상수는 안 건드린다)
 *       ⚠ 자연폭은 서체·자간이 정하므로 **문자열을 실제로 그려서** 잰다. 자릿수 × 상수로 지어내지 않는다.
 *   [3] 마일리지 패널 `.rw`(«마일리지 10개 → 💎 2,500,000») — 500만으로 바꿨을 때 칸(.cn-ml) 넘침
 *   [4] 33 재화 정보 팝업 «마일리지» 의 획득처 문구 — 지금 문자열이 팩 값과 맞는가
 *
 * 자 = `.qt` 의 getBoundingClientRect (렌더폭, scaleX 포함) 와 `Range` 잉크 상자.
 * 호스트 = `.cn-cd.dia>.bg` 의 클라이언트 박스. 여백이 음수면 카드 밖으로 나간 것이다.
 *
 * 실행: node tools/probe497.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

const NEW = [10000, 70000, 150000, 900000, 2000000];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 카드 다섯 칸의 라벨 상자를 잰다. scaleX 를 걷은 «자연폭» 도 같이 낸다. */
const MEASURE = () => {
  const out = [];
  document.querySelectorAll('#shopList .cn-cd.dia').forEach(cd => {
    const q = cd.querySelector('.qt'), bg = cd.querySelector('.bg');
    const qr = q.getBoundingClientRect(), br = bg.getBoundingClientRect();
    const cs = getComputedStyle(q);
    const qx = parseFloat(cs.getPropertyValue('--qx')) || 1;
    const qk = parseFloat(cs.getPropertyValue('--qk')) || 1;
    /* 자연폭 = scaleX 를 걷은 폭. transform 을 잠시 끄고 다시 재는 편이 확실하다. */
    const keep = q.style.transform;
    q.style.transform = 'none';
    const nat = q.getBoundingClientRect().width;
    q.style.transform = keep;
    out.push({
      t: q.textContent,
      nat: +nat.toFixed(1),
      w: +qr.width.toFixed(1),
      sx: +(qx * qk).toFixed(3),
      l: +(qr.left - br.left).toFixed(1),
      r: +(br.right - qr.right).toFixed(1),
      bg: +br.width.toFixed(1),
    });
  });
  return out;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderCoinPage === 'function');
  await page.waitForTimeout(400);
  await page.evaluate(() => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await page.waitForTimeout(200);

  /* ---- [1] 지금 ---- */
  const now = await page.evaluate(MEASURE);
  console.log('\n[1] 지금(116 «÷2» 값)');
  now.forEach(c => console.log('    ' + c.t.padEnd(12) + ' 자연 ' + c.nat + ' · ×' + c.sx + ' → 렌더 ' + c.w
    + ' · 좌여백 ' + c.l + ' · 우여백 ' + c.r + ' (bg ' + c.bg + ')'));
  ok(now.length === 5, '1-a 다이아 카드 5칸', String(now.length));
  ok(now.every(c => c.l >= 0 && c.r >= 0), '1-b 지금은 다섯 칸 다 카드 안쪽',
     '좌 최소 ' + Math.min(...now.map(c => c.l)).toFixed(1) + ' · 우 최소 ' + Math.min(...now.map(c => c.r)).toFixed(1));

  /* ---- [2] «×2» 라벨 ---- */
  const next = await page.evaluate(newVals => {
    DIA_PACKS.forEach((p, i) => { p.q = '×' + fmt(newVals[i]); });
    renderCoinPage(document.getElementById('shopList'));
    return null;
  }, NEW);
  await page.waitForTimeout(150);
  const after = await page.evaluate(MEASURE);
  console.log('\n[2] «×2» 라벨(상수는 그대로 · 문자열만 갈아 끼움)');
  after.forEach(c => console.log('    ' + c.t.padEnd(12) + ' 자연 ' + c.nat + ' · ×' + c.sx + ' → 렌더 ' + c.w
    + ' · 좌여백 ' + c.l + ' · 우여백 ' + c.r));
  const over = after.filter(c => c.l < 0 || c.r < 0);
  ok(true, '2-a «×2» 라벨 좌여백 = ' + after.map(c => c.l).join('/'),
     over.length ? '넘침 ' + over.length + '칸: ' + over.map(c => c.t).join(', ') : '넘침 0칸');
  /* 늘어난 폭 — 어느 칸이 가장 크게 늘었나 */
  const grow = after.map((c, i) => +(c.w - now[i].w).toFixed(1));
  console.log('    렌더폭 증가: ' + grow.map((g, i) => now[i].t + '→' + after[i].t + ' ' + (g >= 0 ? '+' : '') + g).join(' · '));
  ok(after.every(c => c.l >= 0 && c.r >= 0), '2-b «×2» 라벨도 다섯 칸 다 카드 안쪽(넘침 0)',
     '좌 최소 ' + Math.min(...after.map(c => c.l)).toFixed(1) + 'px');

  /* ---- [3] 마일리지 패널 ---- */
  const mile = await page.evaluate(() => {
    const read = () => {
      const rw = document.querySelector('#cnMile .rw'), ml = document.getElementById('cnMile');
      const rr = rw.getBoundingClientRect(), mr = ml.getBoundingClientRect();
      /* 잉크 상자 — 텍스트 노드 전체 범위 */
      const rg = document.createRange(); rg.selectNodeContents(rw);
      const ir = rg.getBoundingClientRect();
      return { t: rw.textContent.trim(), ink: +ir.width.toFixed(1), box: +rr.width.toFixed(1),
        l: +(ir.left - mr.left).toFixed(1), r: +(mr.right - ir.right).toFixed(1), host: +mr.width.toFixed(1) };
    };
    const before = read();
    /* MILE_DIA 는 const 라 못 바꾼다 — 렌더된 문자열만 갈아 끼워 폭을 잰다 */
    const rw = document.querySelector('#cnMile .rw');
    rw.innerHTML = rw.innerHTML.replace(fmt(MILE_DIA), fmt(MILE_DIA * 2));
    const after = read();
    return { before, after };
  });
  console.log('\n[3] 마일리지 교환 문구');
  console.log('    지금 «' + mile.before.t + '» 잉크 ' + mile.before.ink + ' · 좌 ' + mile.before.l + ' · 우 ' + mile.before.r + ' (호스트 ' + mile.before.host + ')');
  console.log('    500만 «' + mile.after.t + '» 잉크 ' + mile.after.ink + ' · 좌 ' + mile.after.l + ' · 우 ' + mile.after.r);
  ok(mile.after.l >= 0 && mile.after.r >= 0, '3-a 500만 문구도 마일리지 칸 안쪽',
     '좌 ' + mile.after.l + ' · 우 ' + mile.after.r);
  ok(mile.after.ink > mile.before.ink, '3-b 문구가 실제로 길어진다(단언이 유효한 크기)',
     mile.before.ink + ' → ' + mile.after.ink);

  /* ---- [4] 33 재화 정보 «마일리지» 획득처 문구 ---- */
  const ways = await page.evaluate(() => ({
    ways: CURINFO.mile.ways.slice(),
    cpPacks: DIA_PACKS.filter(p => p.cp).map(p => p.dia),
  }));
  console.log('\n[4] CURINFO.mile.ways = ' + JSON.stringify(ways.ways));
  console.log('    쿠폰이 붙은 팩(dia) = ' + ways.cpPacks.join(' · '));
  /* 지금 문구는 «90만 · 200만» 인데 116 «÷2» 이후 실제 팩은 45만·100만이다 — 이미 어긋나 있다 */
  const say = ways.ways[0];
  const matchNow = ways.cpPacks.every(d => say.includes(String(Math.round(d / 10000)) + '만'));
  ok(!matchNow, '4-a 지금 획득처 문구가 실제 쿠폰 팩 값과 어긋나 있다(하드코딩 잔재)',
     '«' + say + '» vs 실제 ' + ways.cpPacks.map(d => (d / 10000) + '만').join('·'));

  await browser.close();
  console.log('\nPROBE497 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
