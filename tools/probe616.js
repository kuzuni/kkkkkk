#!/usr/bin/env node
/* 작업 616 재현 — 레이드·아레나 카드 썸네일이 «그려진 잉크» 에서 원본 종횡을 잃는가
 *
 *   node tools/probe616.js            # 03 컨텐츠(레이드·아레나) 3칸 + 던전 카드 대조
 *   node tools/probe616.js --json
 *
 * ── 왜 새 자가 필요한가 ────────────────────────────────────────────────
 * 616 등재문이 못박은 대로 `verify356`·`scan356` 은 이 자리를 **구조적으로 못 본다** —
 * 그 둘은 «CSS 변환(scaleX 등)» 을 세는데, 여기서 찌그러뜨리는 것은 `drawSpriteTo` 가
 * 캔버스에 **그리는 픽셀**이다(356 8회차 교훈: «종횡비를 선언으로만 물으면 래스터는 감시 밖»).
 * `probe418`(잉크 bbox 축)도 `naturalWidth/Height` 가 있는 img·svg 를 기준으로 삼아
 * 캔버스에는 «원본» 이 없다.
 *
 * ⇒ 이 자는 원본을 **아틀라스에서 직접 만든다**: 같은 프레임 rect 를 1:1 로 오프스크린에
 * 그려 «원본 잉크 bbox» 를 재고, 화면 캔버스의 «그려진 잉크 bbox» 와 종횡을 견준다.
 * 두 값의 비(= 이방성)가 1.000 이면 등방, 1 에서 멀수록 찌그러진 것이다.
 *
 * ⚠ 상자(dw×dh)가 아니라 **잉크**를 재는 이유: 97 «슬롯을 꽉 채운다» 는 상자 규칙이라
 * 상자만 보면 «규칙대로다» 로 읽힌다. 주인 지시(356)는 «그림이 안 찌그러지게» 이므로
 * 눈금은 그려진 그림, 곧 잉크여야 한다.
 * ⚠ 캔버스 픽셀을 읽으므로 `--allow-file-access-from-files` 가 필수다(fnchk97 선례).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const JSON_OUT = process.argv.includes('--json');
const HTML = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
/* 이방성 허용치 — 356 [S3] 이 잉크 종횡에 쓰는 0.5% 와 같은 자리를 쓴다 */
const TOL = Number(process.env.PROBE616_TOL || 0.005);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

/* ---------- 페이지 안에서 도는 수집기 ---------- */
const COLLECT = function () {
  /* 알파가 있는 픽셀의 bbox */
  function inkOf(d, w, h) {
    let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 8) {
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
    }
    if (x2 < 0) return null;
    return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
  }
  /* 아틀라스 rect 를 1:1 로 그려 «원본 잉크» 를 잰다 — 화면과 같은 프레임을 쓴다 */
  function srcInk(k, frame) {
    const A = ATLAS[k];
    if (!A || !A.image) return null;
    const fr = A.f[frame];
    if (!fr) return null;
    const c = document.createElement('canvas');
    c.width = fr[2]; c.height = fr[3];
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
    const ink = inkOf(g.getImageData(0, 0, fr[2], fr[3]).data, fr[2], fr[3]);
    return ink ? { rect: [fr[2], fr[3]], ink } : null;
  }
  const out = [];
  document.querySelectorAll('#dunList canvas.thcv').forEach((cv) => {
    const card = cv.closest('.dnc');
    const rd = !!(card && card.classList.contains('rd'));
    const arn = !!cv.dataset.arnav;
    const k = arn ? 'knight' : cv.dataset.thk;
    const frame = cv._fr;
    const g = cv.getContext('2d');
    const drawn = inkOf(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
    const src = srcInk(k, frame);
    out.push({
      name: (card && card.dataset && card.dataset.dun) || (arn ? ('아레나/' + cv.dataset.arnav) : k),
      mode: rd ? (arn ? 'arena(fit0)' : 'raid(fit0)') : 'dungeon(contain)',
      k, frame, cw: cv.width, ch: cv.height,
      drawn, src,
    });
  });
  return out;
};

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(HTML, { waitUntil: 'load' });
  await p.waitForTimeout(1500);

  /* 03 던전 → 서브탭 «컨텐츠»(raid) — fnchk97 [1] 과 같은 경로 */
  await p.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await p.waitForTimeout(700);

  console.log('[1] 던전 카드(액자 · contain) — 대조군');
  const dun = await p.evaluate(COLLECT);
  const dunRows = dun.filter((r) => r.mode === 'dungeon(contain)' && r.drawn && r.src);

  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(900);
  const raid = await p.evaluate(COLLECT);
  const rdRows = raid.filter((r) => r.mode !== 'dungeon(contain)' && r.drawn && r.src);

  const line = (r) => {
    const da = r.drawn.w / r.drawn.h, sa = r.src.ink.w / r.src.ink.h;
    const aniso = da / sa;
    const sx = r.drawn.w / r.src.ink.w, sy = r.drawn.h / r.src.ink.h;
    return {
      name: r.name, mode: r.mode, k: r.k, frame: r.frame,
      src: `${r.src.ink.w}×${r.src.ink.h}(${sa.toFixed(3)})`,
      drawn: `${r.drawn.w}×${r.drawn.h}(${da.toFixed(3)})`,
      sx: +sx.toFixed(3), sy: +sy.toFixed(3), aniso: +aniso.toFixed(3),
    };
  };
  const dunL = dunRows.map(line), rdL = rdRows.map(line);
  for (const r of dunL) console.log(`   · ${r.k}/${r.frame} 원본 ${r.src} → 그려짐 ${r.drawn} · 배율 ${r.sx}/${r.sy} · 이방성 ×${r.aniso}`);
  ok(dunL.length >= 4, `던전 카드 표본 ${dunL.length}장`);
  ok(dunL.every((r) => Math.abs(r.aniso - 1) <= TOL + 0.02),
     `던전 카드는 전부 등방(최대 ×${Math.max(...dunL.map((r) => Math.abs(r.aniso - 1))).toFixed(3)} 어긋남 · contain 경로)`);

  console.log('[2] 레이드·아레나 카드(fit 0 = 꽉 채우기) — 등재문 재현');
  for (const r of rdL) console.log(`   · ${r.mode} ${r.k}/${r.frame} 원본 ${r.src} → 그려짐 ${r.drawn} · 배율 ${r.sx}/${r.sy} · 이방성 ×${r.aniso}`);
  ok(rdL.length === 3, `레이드·아레나 표본 3칸(측정장 1 + 아레나 2) — 실제 ${rdL.length}`);

  const worst = rdL.length ? Math.max(...rdL.map((r) => Math.max(r.aniso, 1 / r.aniso))) : 0;
  console.log(`   최악 이방성 ×${worst.toFixed(3)} (허용 ${(1 + TOL).toFixed(3)})`);

  console.log('[3] 판정 — 이 세 칸이 원본 종횡을 지키는가');
  for (const r of rdL) {
    ok(Math.max(r.aniso, 1 / r.aniso) <= 1 + TOL,
       `${r.mode} ${r.k}/${r.frame} 등방(×${r.aniso})`);
  }

  ok(errs.length === 0, `콘솔 에러 0건 (${errs.length})`);
  await b.close();

  if (JSON_OUT) console.log(JSON.stringify({ dungeon: dunL, raid: rdL }, null, 2));
  console.log(`\nPROBE616 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
