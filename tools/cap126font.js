// 126 ① 폰트 후보 비교 캡처 — 1080 폭, 후보별 동일 샘플 블록.
// 사용: node tools/cap126font.js [출력경로]
// 후보 woff2 는 assets/fonts/_cand/*.woff2 (비교 전용 임시) 또는 assets/fonts/*.woff2 를 읽는다.
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'docs/review/126-font-candidates.png');

const CAND_DIR = fs.existsSync(path.join(ROOT, 'assets/fonts/_cand'))
  ? path.join(ROOT, 'assets/fonts/_cand') : path.join(ROOT, 'assets/fonts');

const cands = fs.readdirSync(CAND_DIR).filter(f => /\.woff2$/.test(f)).sort();

const faces = cands.map((f, i) => `@font-face{font-family:'C${i}';src:url('file://${path.join(CAND_DIR, f)}') format('woff2');font-display:block}`).join('\n');

const SAMPLES = [
  { cls: 'hud', t: '1,234,567b' },
  { cls: 'title', t: '보물상자' },
  { cls: 'name', t: '전설의 대검 Lv.28' },
  { cls: 'body', t: '골드를 사용해 능력치를 올립니다' },
  { cls: 'btn', t: '일괄 강화' },
  { cls: 'cap', t: '다음 보상까지 00:35' },
];

const col = (i, label) => `
<div class="col">
  <div class="lab">${label}</div>
  <div class="s" style="font-family:${i < 0 ? "'Malgun Gothic',sans-serif" : `'C${i}'`}">
    ${SAMPLES.map(s => `<div class="${s.cls}">${s.t}</div>`).join('')}
  </div>
</div>`;

const html = `<!doctype html><meta charset="utf-8"><style>
${faces}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;background:#2b1d14;color:#fff;font-family:'Malgun Gothic',sans-serif}
.col{border-bottom:2px solid #6b4f3a;padding:10px 14px}
.lab{font-family:'Malgun Gothic',sans-serif;font-size:20px;color:#f0d9ba;margin-bottom:6px}
.s>div{color:#fff;-webkit-text-stroke:5px #1a1008;paint-order:stroke fill;white-space:nowrap;line-height:1.15}
.hud{font-size:44px}
.title{font-size:56px}
.name{font-size:34px}
.body{font-size:30px;-webkit-text-stroke-width:4px}
.btn{font-size:40px}
.cap{font-size:24px;-webkit-text-stroke-width:3px;color:#f0d9ba}
</style>
${col(-1, '현재 (Malgun Gothic / 시스템)')}
${cands.map((f, i) => col(i, f.replace(/\.sub\.woff2|\.woff2/, ''))).join('')}
`;

(async () => {
  const tmp = path.join(require('os').tmpdir(), 'cap126font.html');
  fs.writeFileSync(tmp, html);
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 1400 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await p.screenshot({ path: OUT, fullPage: true });
  // 폭 실측: 후보별 같은 문자열의 잉크 폭·높이 비(=«좁고 높은» 판정용)
  const m = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.col').forEach(c => {
      const t = c.querySelector('.title'), r = t.getBoundingClientRect();
      const cv = document.createElement('canvas'), x = cv.getContext('2d');
      x.font = getComputedStyle(t).fontSize + ' ' + getComputedStyle(t).fontFamily;
      const tm = x.measureText('보물상자');
      out.push({
        name: c.querySelector('.lab').textContent,
        adv: +tm.width.toFixed(1),
        ink: +((tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) || 0).toFixed(1),
        h: +r.height.toFixed(1),
      });
    });
    return out;
  });
  console.log('폰트 후보 실측 (title 56px "보물상자")');
  m.forEach(o => console.log(`  ${o.name.padEnd(30)} advance ${o.adv}  잉크높이 ${o.ink}  비(높이/폭) ${(o.ink / (o.adv / 4)).toFixed(2)}`));
  await b.close();
  console.log('saved', OUT);
})();
