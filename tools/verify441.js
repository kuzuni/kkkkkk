#!/usr/bin/env node
/* 작업 441 회귀 게이트 — `ATLAS.dragon.a.fly` 의 «6프레임마다 180° 돌아섬»
 *   실행: node tools/verify441.js   → 마지막 줄이 `VERIFY441 n/n PASS` 여야 한다.
 *
 * 등재문: «`fly` 12프레임이 «같은 6포즈의 좌우 거울쌍» 이라 애니메이션이 6프레임마다 180° 돌아선다 —
 *          던전 보스는 7.0fps 라 **0.857초마다** 방향이 바뀐다» (425 4회차, 비평가 네 명 독립).
 *
 * ⚑ **재현이 등재문을 그대로 확인했다**(338 규칙 — `tools/probe441.js`).
 *   338·341 은 재현이 가설을 기각한 자리였지만 여기는 아니다. 픽셀 4채널 완전 대조로
 *   `f0↔f6 · f1↔f7 · f2↔f8 · f3↔f9 · f4↔f10 · f5↔f11` 여섯 쌍 전부 **일치율 100.00%** —
 *   «닮은 포즈» 가 아니라 **같은 그림을 뒤집은 것**이다. 잉크 픽셀 수(2476·2032·1596·1808·1848·2276)도
 *   등재문 값과 한 자리도 안 틀렸다.
 *   그리고 등재문의 ⚠ «다른 아틀라스도 같은 병일 수 있다» 는 **전수 스윕으로 기각**됐다 —
 *   knight·elves·zombie·bird·robo·boom 의 27개 애니 목록에 거울쌍은 **0건**이다.
 *
 * 처방은 목록을 위 줄 6장으로 자르는 것 하나다(`assets/atlas-data.js` 한 줄). 뒤집기는
 * `drawFrame` 의 `ctx.scale(-1,1)` 이 이미 하므로 왼쪽을 볼 때도 그림은 나온다.
 *   ⚠ **fps 는 안 건드렸다.** f0~f5 가 이미 «한 번의 날갯짓» 한 주기라(잉크가 펴짐 2476 → 접힘 1596 →
 *      펴짐 2276) 목록만 반으로 줄어도 날갯짓 케이던스는 Δ0 이고 «돌아섬» 만 사라진다.
 *      §4 가 그 주기성을 자로 못박는다 — fps 를 반으로 내리는 «보정» 이 들어오면 빨개진다.
 *   ⚠ **`f6~f11` 선언은 남겼다.** `tools/probe97.js` 가 그 이름을 직접 집는다(§3).
 *
 * 본다:
 *   §0 [전제] — 표본이 실재한다(시트가 열리고, 아래 줄이 실제로 «다른 그림 자리» 다)
 *   §1 전수 — **모든** 아틀라스 애니 목록에 좌우 거울쌍 0건(새 아틀라스가 들어와도 걸린다)
 *   §2 방향 — `fly` 6장 전부 **오른쪽을 보는 위 줄**(붉은 아가리 상대 x > 0.5) = `faceRight:true` 와 정합
 *   §3 부품 보전 — 프레임 선언 12개는 그대로 · 그리는 쪽(`PET_SP`·`DUN_UI`)이 여전히 `fly` 를 집는다
 *   §4 케이던스 — 목록이 «한 날갯짓» 한 주기다(안쪽 골 1개) · 던전 보스 fps 7 · 펫 fps 12 불변
 *   §5 제품 실동작(브라우저) — `stepAnim`/`curFrame` 을 두 바퀴 굴려 나온 프레임이 위 줄뿐이고,
 *       한 판 안에서 **방향 전환 0회**(수리 전에는 두 바퀴에 4회)
 *   §R 되돌림 시험 — 12장 목록으로 되돌린 사본은 §1·§2·§5 가 **다시 빨개진다**
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { decodePNG } = require('./png441');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const ATLAS_JS = path.join(ROOT, 'assets', 'atlas-data.js');
const TH = 8;
const MIRROR_HIT = 0.999;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* ---------- 공용 계측 (probe441 과 같은 자) ---------- */
function loadAtlas(src) {
  const win = {};
  new Function('window', src)(win);
  return win.ATLAS;
}
const sheets = new Map();
function sheet(img) {
  if (!sheets.has(img)) sheets.set(img, decodePNG(path.join(ROOT, img)));
  return sheets.get(img);
}
function mirrorMatch(sh, ra, rb) {
  if (ra[2] !== rb[2] || ra[3] !== rb[3]) return null;
  const [ax, ay, w, h] = ra, [bx, by] = rb;
  let same = 0;
  for (let y = 0; y < h; y++) {
    const arow = (ay + y) * sh.w * 4, brow = (by + y) * sh.w * 4;
    for (let x = 0; x < w; x++) {
      const ai = arow + (ax + x) * 4, bi = brow + (bx + (w - 1 - x)) * 4;
      const aa = sh.px[ai + 3], ba = sh.px[bi + 3];
      if (aa <= TH && ba <= TH) { same++; continue; }
      if (aa === ba && sh.px[ai] === sh.px[bi] && sh.px[ai + 1] === sh.px[bi + 1]
          && sh.px[ai + 2] === sh.px[bi + 2]) same++;
    }
  }
  return same / (w * h);
}
function sameMatch(sh, ra, rb) {
  if (ra[2] !== rb[2] || ra[3] !== rb[3]) return null;
  const [ax, ay, w, h] = ra, [bx, by] = rb;
  let same = 0;
  for (let y = 0; y < h; y++) {
    const arow = (ay + y) * sh.w * 4, brow = (by + y) * sh.w * 4;
    for (let x = 0; x < w; x++) {
      const ai = arow + (ax + x) * 4, bi = brow + (bx + x) * 4;
      const aa = sh.px[ai + 3], ba = sh.px[bi + 3];
      if (aa <= TH && ba <= TH) { same++; continue; }
      if (aa === ba && sh.px[ai] === sh.px[bi] && sh.px[ai + 1] === sh.px[bi + 1]
          && sh.px[ai + 2] === sh.px[bi + 2]) same++;
    }
  }
  return same / (w * h);
}
/* 붉은 아가리 — «어느 쪽을 보는가» 를 말하는 유일한 비대칭 잉크다(회색 몸통은 좌우가 닮았다) */
function mouth(sh, r) {
  const [sx, sy, w, h] = r;
  let n = 0, sum = 0;
  for (let y = 0; y < h; y++) {
    const row = (sy + y) * sh.w * 4;
    for (let x = 0; x < w; x++) {
      const o = row + (sx + x) * 4;
      const R = sh.px[o], G = sh.px[o + 1], B = sh.px[o + 2];
      if (sh.px[o + 3] > TH && R > 120 && R > G + 50 && R > B + 50) { n++; sum += x; }
    }
  }
  return { n, cx: n ? sum / n / w : null };
}
function ink(sh, r) {
  const [sx, sy, w, h] = r;
  let n = 0;
  for (let y = 0; y < h; y++) {
    const row = (sy + y) * sh.w * 4;
    for (let x = 0; x < w; x++) if (sh.px[row + (sx + x) * 4 + 3] > TH) n++;
  }
  return n;
}
/* 목록 하나를 재서 요약 — §1·§2·§5 와 §R 이 같은 함수를 쓴다 */
function scan(ATLAS) {
  const out = { mirrors: [], anims: 0 };
  for (const key of Object.keys(ATLAS)) {
    const A = ATLAS[key], sh = sheet(A.img);
    for (const anim of Object.keys(A.a || {})) {
      out.anims++;
      const names = A.a[anim];
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const ra = A.f[names[i]], rb = A.f[names[j]];
          const m = mirrorMatch(sh, ra, rb);
          if (m != null && m >= MIRROR_HIT) {
            const d = sameMatch(sh, ra, rb);
            if (d == null || d < MIRROR_HIT) out.mirrors.push(`${key}.${anim} ${names[i]}↔${names[j]} ${(m * 100).toFixed(2)}%`);
          }
        }
      }
    }
  }
  return out;
}

/* ---------- 브라우저 절(§5·§R) ---------- */
const URL = 'file://' + path.resolve(ROOT, 'index.html');
async function runPage(browser, overrideFly) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof ATLAS !== 'undefined' && ATLAS.dragon && ATLAS.dragon.image
    && typeof curFrame === 'function' && typeof stepAnim === 'function');
  const r = await p.evaluate((fly) => {
    if (fly) ATLAS.dragon.a.fly = fly.slice();
    /* 던전 보스와 같은 손잡이로 굴린다 — fps 는 ETYPE.boss.fps(7) */
    const fps = ETYPE.boss.fps;
    const e = { akey: 'dragon', anim: 'fly', at: 0, afps: fps, aloop: true, adone: false };
    const list = ATLAS.dragon.a.fly;
    const seen = [], secs = (list.length / fps) * 2;      /* 정확히 두 바퀴 */
    for (let t = 0; t < secs - 1e-9; t += 1 / 60) {
      const f = curFrame(e);
      if (f && (!seen.length || seen[seen.length - 1] !== f)) seen.push(f);
      stepAnim(e, 1 / 60);
    }
    /* 각 프레임의 «붉은 아가리» 를 아틀라스 이미지에서 직접 읽는다(그리는 쪽과 같은 rect) */
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d', { willReadFrequently: true });
    const side = {};
    for (const nm of new Set(seen)) {
      const fr = ATLAS.dragon.f[nm];
      cv.width = fr[2]; cv.height = fr[3];
      g.clearRect(0, 0, fr[2], fr[3]);
      g.drawImage(ATLAS.dragon.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
      let n = 0, sum = 0;
      try {
        const d = g.getImageData(0, 0, fr[2], fr[3]).data;
        for (let y = 0; y < fr[3]; y++) for (let x = 0; x < fr[2]; x++) {
          const o = (y * fr[2] + x) * 4;
          if (d[o + 3] > 8 && d[o] > 120 && d[o] > d[o + 1] + 50 && d[o] > d[o + 2] + 50) { n++; sum += x; }
        }
      } catch (_) { return { tainted: true }; }
      side[nm] = n ? (sum / n / fr[2] > 0.5 ? 'R' : 'L') : '?';
    }
    const seq = seen.map(nm => side[nm]);
    let turns = 0;
    for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) turns++;
    return { seen, seq, turns, fps, petFps: PET_SP.dragon.fps, petAnim: PET_SP.dragon.anim, tainted: false };
  }, overrideFly || null);
  await ctx.close();
  return r;
}

(async () => {
  const src = fs.readFileSync(ATLAS_JS, 'utf8');
  const ATLAS = loadAtlas(src);
  const D = ATLAS.dragon;
  const sh = sheet(D.img);
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  console.log('§0 [전제] 표본이 실재한다 ────────────────────────────────────');
  ok(sh.w === 576 && sh.h === 128,
    `[0-a] 시트가 열린다 — ${D.img} ${sh.w}×${sh.h}`);
  ok(Object.keys(D.f).length === 12 && Object.keys(D.f).every(n => ink(sh, D.f[n]) > 0),
    `[0-b] 프레임 선언 12칸이 전부 «잉크가 있는» 자리다(빈 칸을 세고 초록이 되는 게 아니다)`);
  {
    const up = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'], lo = ['f6', 'f7', 'f8', 'f9', 'f10', 'f11'];
    ok(up.every(n => D.f[n][1] === 0) && lo.every(n => D.f[n][1] === 64),
      `[0-c] 위 줄 f0~f5(sy 0) · 아래 줄 f6~f11(sy 64) — 격자는 그대로다`);
    ok(lo.every((n, i) => sameMatch(sh, D.f[up[i]], D.f[n]) < MIRROR_HIT),
      `[0-d] 아래 줄은 위 줄의 «복사» 가 아니다(같은 방향 일치율 < ${MIRROR_HIT}) — 거울이라는 말이 공허하지 않다`);
  }

  console.log('\n§1 전수 — 어떤 애니 목록에도 좌우 거울쌍이 없다 ──────────────');
  {
    const s = scan(ATLAS);
    ok(s.mirrors.length === 0,
      `[1-a] 거울쌍 **0건** / 애니 ${s.anims}개 전수` + (s.mirrors.length ? ' — ' + s.mirrors.join(' · ') : ''));
    ok(s.anims >= 27,
      `[1-b] 실제로 전수를 돌았다(애니 ${s.anims}개 ≥ 27) — 목록이 비어서 초록인 게 아니다`);
  }

  console.log('\n§2 방향 — `fly` 는 오른쪽을 보는 위 줄 6장뿐 ──────────────────');
  {
    const fly = D.a.fly;
    ok(fly.length === 6, `[2-a] \`fly\` **6프레임** — ${fly.join(',')}`);
    ok(fly.every(n => D.f[n][1] === 0), `[2-b] 여섯 장 전부 **위 줄**(sy 0)이다`);
    const ms = fly.map(n => mouth(sh, D.f[n]));
    ok(ms.every(m => m.n > 0 && m.cx > 0.5),
      `[2-c] 붉은 아가리가 전부 **오른쪽**(cx ${ms.map(m => m.cx.toFixed(3)).join(' ')}) = \`PET_SP.dragon.faceRight:true\` 와 정합`);
    const lo = ['f6', 'f7', 'f8', 'f9', 'f10', 'f11'].map(n => mouth(sh, D.f[n]));
    ok(lo.every(m => m.n > 0 && m.cx < 0.5),
      `[2-d] 음성항 — 뺀 여섯 장은 실제로 **왼쪽**을 본다(cx ${lo.map(m => m.cx.toFixed(3)).join(' ')}) = 자가 방향을 실제로 가른다`);
  }

  console.log('\n§3 부품 보전 ────────────────────────────────────────────────');
  ok(Object.keys(D.f).length === 12,
    `[3-a] 프레임 선언은 **12칸 그대로**다 — 목록에서만 뺐다(\`tools/probe97.js\` 가 'f6' 을 이름으로 집는다)`);
  ok(/\['dragon',\s*'f6'\]/.test(fs.readFileSync(path.join(ROOT, 'tools', 'probe97.js'), 'utf8')),
    `[3-b] 그 소비자가 실재한다 — probe97 이 아직 \`['dragon','f6']\` 을 집는다(선언을 지우면 즉사한다)`);
  ok(/dragon:\s*\{\s*anim:'fly'/.test(idx),
    `[3-c] 펫(\`PET_SP.dragon\`)이 여전히 \`fly\` 를 집는다`);
  ok((idx.match(/thk:'dragon',\s*thf:'f\d+',\s*thi:'fly'/g) || []).length === 2,
    `[3-d] 던전 2종(\`DUN_UI\`)이 여전히 \`thi:'fly'\` 를 집는다 — 이 목록은 실제로 그려진다`);
  ok(D.a.fly.every(n => !!D.f[n]),
    `[3-e] 목록의 이름이 전부 선언에 있다(죽은 이름 0)`);

  console.log('\n§4 케이던스 — 목록이 «한 날갯짓» 한 주기다 ───────────────────');
  {
    const seq = D.a.fly.map(n => ink(sh, D.f[n]));
    const mi = seq.indexOf(Math.min(...seq));
    ok(mi > 0 && mi < seq.length - 1,
      `[4-a] 잉크 골이 **안쪽**에 하나다(펴짐 → 접힘 → 펴짐) — ${seq.join(' → ')} · 최소 f${mi}`);
    let dirChg = 0;
    for (let i = 2; i < seq.length; i++) if (Math.sign(seq[i] - seq[i - 1]) !== Math.sign(seq[i - 1] - seq[i - 2])) dirChg++;
    ok(dirChg === 1, `[4-b] 증감 방향 전환이 **1회**뿐이다(주기가 하나) — ${dirChg}회`);
    ok(/fps:7,\s*scale:\s*1\.65/.test(idx.replace(/\s+/g, ' ')) || /boss:\s*\{[^}]*fps:7/.test(idx.replace(/\s+/g, ' ')),
      `[4-c] 던전 보스가 읽는 \`ETYPE.boss.fps\` 는 **7** 그대로다(목록을 줄이며 «보정» 으로 내리지 않았다)`);
    ok(/dragon:\s*\{\s*anim:'fly',\s*fps:12/.test(idx),
      `[4-d] 펫 \`PET_SP.dragon.fps\` 는 **12** 그대로다`);
  }

  console.log('\n§5 제품 실동작 — 두 바퀴에 방향 전환 0회 ──────────────────────');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  let rev = null;
  try {
    const r = await runPage(browser);
    ok(!r.tainted, `[5-0] 캔버스가 안 오염됐다(\`--allow-file-access-from-files\`) — 픽셀로 읽었다`);
    ok(r.seen.length === 12 && r.seen.every(n => D.f[n][1] === 0),
      `[5-a] \`stepAnim\`/\`curFrame\` 두 바퀴가 낸 프레임 ${r.seen.length}장이 **전부 위 줄**이다`);
    ok(r.turns === 0,
      `[5-b] 방향 전환 **0회** — ${r.seq.join('')}`);
    ok(r.fps === 7 && r.petFps === 12 && r.petAnim === 'fly',
      `[5-c] 산 값으로도 fps 가 그대로다 — 보스 ${r.fps} · 펫 ${r.petFps}(${r.petAnim})`);

    console.log('\n§R 되돌림 시험 — 12장으로 되돌리면 다시 빨개진다 ─────────────');
    const old = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11'];
    /* (1) Node 절 — 옛 목록을 넣은 **사본 파일**로 §1·§2 를 다시 돌린다 */
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'v441-')), 'atlas-data.js');
    fs.writeFileSync(tmp, src.replace(/"fly":\["f0","f1","f2","f3","f4","f5"\]/,
      '"fly":[' + old.map(n => '"' + n + '"').join(',') + ']'));
    const A2 = loadAtlas(fs.readFileSync(tmp, 'utf8'));
    ok(A2.dragon.a.fly.length === 12, `[R-0] 사본이 실제로 옛 목록이다(12장) — 되돌림이 no-op 이 아니다`);
    const s2 = scan(A2);
    ok(s2.mirrors.length === 6,
      `[R-a] §1 이 **6쌍**을 다시 잡는다 — ${s2.mirrors.slice(0, 2).join(' · ')} …`);
    ok(A2.dragon.a.fly.some(n => mouth(sh, A2.dragon.f[n]).cx < 0.5),
      `[R-b] §2 가 빨개진다 — 옛 목록에는 왼쪽을 보는 장이 섞여 있다`);
    /* (2) 브라우저 절 — 같은 목록을 페이지에 주입해 «돌아섬» 을 실제로 센다 */
    rev = await runPage(browser, old);
    /* 두 바퀴를 «한 줄» 로 보면 RRRRRR|LLLLLL|RRRRRR|LLLLLL = 이음매 3개다.
       한 바퀴 안 전환은 2회(R→L 과 되감기 L→R)이므로 주기는 (12/7)/2 = **0.857초** — 등재문의 값이다. */
    ok(rev.turns === 3,
      `[R-c] §5 가 빨개진다 — 두 바퀴에 방향 전환 **${rev.turns}회**(${rev.seq.join('')}) = 한 바퀴 2회 · ${((old.length / rev.fps) / 2).toFixed(3)}초마다`);
    ok(rev.seen.some(n => D.f[n][1] === 64),
      `[R-d] 그때 아래 줄 프레임이 실제로 그려진다 — ${rev.seen.filter(n => D.f[n][1] === 64).join(',')}`);
  } finally {
    await browser.close();
  }

  console.log(`\nVERIFY441 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
