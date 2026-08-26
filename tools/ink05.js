/* 05 — 잉크 세로중심 프로브 (7회차 신설).
   비평가 R·S 가 독립으로 잡은 두 항목(버튼 라벨 · «총 보유 효과» 줄)의 잉크중심을
   캡처에서 직접 재서 목표값과 대조한다. PIL 없이 돌게 파이썬 대신 노드 + PNG 디코드는
   크로미움에게 시킨다(54 verify54 와 같은 방식 — npm 의존성 0).
   실행: node tools/ink05.js [캡처경로]   (기본 docs/review/05-r8.png)
   좌표계 = 캡처(1080x2280). ref 값은 측정표 §7·§8 에서 −84 환산. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const shot = process.argv[2] || 'docs/review/05-r8.png';

/* 창 = [x0,x1,y0,y1] · 잉크 판정 = 「배경보다 밝고 채도 낮은 글자 코어」가 아니라
   «그 창에서 배경색과 충분히 다른 픽셀» 로 잡는다(05 교훈 3-ⓑ: 좁은 색 마스크 금지). */
/* 버튼 면은 그라디언트 + 밝은 링 + 굽이 겹쳐 «배경 거리» 마스크로는 라벨이 안 잡힌다
   (링·테두리가 통째로 걸려 잉크가 h103 으로 읽힌다). 라벨만 고르는 마스크를 쓴다:
     btn1 「장착 중」 #AAEFFF — 파랑−빨강 ≥ 25 (면·링은 무채색이라 0)
     btn2 「일괄 강화」 #DFDFDF — 휘도 ≥ 205 이면서 창을 링 안쪽으로 좁힘(굽 밴드 y1780~ 제외)
   ref 값은 측정표 §7·§8 에서 −84 환산: 버튼 잉크 1804~1841 중심 1822.5 → 1738.5,
   총합줄 잉크 1687~1727 중심 1707 → 1623. */
const WINS = [
  { k: 'btn1', win: [300, 470, 1700, 1775], mask: 'blue', refCy: 1738.5, note: '[장착 중] 라벨' },
  { k: 'btn2', win: [600, 790, 1700, 1775], mask: 'lum', refCy: 1738.5, note: '[일괄 강화] 라벨' },
  { k: 'tot', win: [280, 800, 1585, 1665], mask: 'bg', bg: [0xf0, 0xd9, 0xba], refCy: 1623.0, note: '«총 보유 효과:» 줄' },
];

function launchOpts() {
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  const file = path.resolve(process.cwd(), shot);
  if (!fs.existsSync(file)) { console.error('캡처 없음: ' + file); process.exit(2); }
  const b64 = fs.readFileSync(file).toString('base64');

  let br;
  try { br = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; br = await chromium.launch(o); }
  const p = await br.newPage();
  const out = await p.evaluate(async ({ b64, WINS }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const at = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const res = [];
    for (const w of WINS) {
      const [x0, x1, y0, y1] = w.win;
      let top = null, bot = null, left = null, right = null;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const [r, g, bl] = at(x, y);
          let hit;
          if (w.mask === 'blue') hit = bl - r >= 25;
          else if (w.mask === 'lum') hit = (r * 0.299 + g * 0.587 + bl * 0.114) >= 205;
          else hit = Math.abs(r - w.bg[0]) + Math.abs(g - w.bg[1]) + Math.abs(bl - w.bg[2]) > 110;
          if (hit) {
            if (top === null) top = y;
            bot = y;
            if (left === null || x < left) left = x;
            if (right === null || x > right) right = x;
          }
        }
      }
      res.push({ k: w.k, note: w.note, top, bot, left, right,
        cy: top === null ? null : +((top + bot) / 2).toFixed(1),
        h: top === null ? null : bot - top + 1,
        w: left === null ? null : right - left + 1, refCy: w.refCy });
    }
    return { res, size: [c.width, c.height] };
  }, { b64, WINS });
  await br.close();

  console.log('캡처 ' + shot + ' ' + out.size.join('x'));
  let fail = 0;
  for (const r of out.res) {
    const d = r.cy === null ? null : +(r.cy - r.refCy).toFixed(1);
    const ok = d !== null && Math.abs(d) <= 2;
    if (!ok) fail++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.k.padEnd(5)} ${r.note.padEnd(18)} 잉크 y${r.top}..${r.bot} (h${r.h} w${r.w}) 중심 ${r.cy} / ref ${r.refCy} → Δ${d}`);
  }
  console.log(fail ? `INK05 FAIL (${fail})` : 'INK05 PASS (잉크중심 3항목 Δ≤2px)');
  process.exit(fail ? 1 : 0);
})();
