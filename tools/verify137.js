/* 작업 137 게이트 — 19 프로필 «잠금 칭호» 카드에서 자물쇠가 칭호 글자를 덮지 않는가.
 *
 * 버그(등재 2026-08-26): `.pf-lk{left:50%;margin-left:-14px}` 라 자물쇠 중심 = 카드 중심 175,
 * `.pf-bn`(left 26 · w 298) 안에서 가운데 정렬된 이름의 중심도 26+149 = **175** —
 * 두 중심이 CSS 상 항상 같은 점이라 잠긴 7칸 **전부** 에서 가운데 1~2자가 자물쇠에 가린다
 * («다이아→이 소실 · 플래티넘→래티 소실 · 그랜드마스터→드마 소실»).
 *
 * 레퍼런스 재측정(`tools/scan137.py`, 2026-08-26): `docs/ref/19-프로필-팝업.jpg` 의 자물쇠도
 * **카드 중심**(흰 몸통 카드상대 161..188, 중심 174.5)이고 칭호 글자와 **겹친다**
 * (ref 3행1열: 글자 잉크 117..161 · 189..232 로 가운데가 잘려 있다).
 * 즉 «레퍼런스는 안 겹친다» 는 등재 당시 전제는 틀렸고, 레퍼런스에서 베낄 «안 겹치는 자리» 는 없다.
 * 그래서 등재가 제시한 두 선택지 중 **«배너 위 오버레이 + 글자를 비켜 놓기»** 를 택하되,
 * 우리 칭호가 레퍼런스보다 길다는 점(그랜드마스터 6자)을 감안해 **글자를 그대로 두고
 * 자물쇠만 배너 오른쪽 안쪽으로** 옮긴다 — 글자 위치(측정표 §5-3 중심 174.5)는 손대지 않는다.
 *
 * 검사:
 *   ① 잠긴 카드 전부에서 자물쇠 bbox ∩ 칭호 글자 잉크 bbox = **0**
 *   ② 자물쇠가 배너(.pf-bn) 안에 들어오는가(밖으로 튀지 않는가)
 *   ③ 자물쇠 크기 28×32 (측정표 §5-4) 유지
 *   ④ 칭호 글자 중심이 카드 중심(175±3) — 레퍼런스 값 그대로인가(글자는 안 옮겼다는 증거)
 *   ⑤ 보유 카드에는 자물쇠가 없고, 잠긴 카드에는 전부 있는가
 *   ⑥ 프레임 4종(1600·1920·2280·2600)에서 ①~⑤ 가 동일한가 + 콘솔 에러 0
 *
 * 실행: node tools/verify137.js            → 마지막 줄 VERIFY137 n/n PASS
 *       node tools/verify137.js --broken   → 옛 CSS(left:50%)를 주입해 게이트가 실제로 잡는지(음성 테스트)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
const BROKEN = process.argv.includes('--broken');

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail){
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

function inter(a, b){
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return (w > 0 && h > 0) ? w * h : 0;
}

(async () => {
  const browser = await launch(chromium);
  try {
    for (const H of HEIGHTS) {
      console.log(`\n[frameH ${H}]`);
      const ctx = await browser.newContext({ viewport: { width: 540, height: Math.round(540 * H / 1080) }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(URL);
      await page.waitForTimeout(700);

      const r = await page.evaluate((broken) => {
        if (broken) {
          const s = document.createElement('style');
          s.textContent = '.pf-lk{left:50%!important;margin-left:-14px!important}';
          document.head.appendChild(s);
        }
        /* 1칸만 보유(브론즈) → 나머지 7칸이 전부 잠김 = 버그가 드러나는 최악 상태 */
        try { S.rank = 0; } catch (e) {}
        openProfile();
        void document.body.offsetHeight;

        const app = document.getElementById('app');
        const ar = app.getBoundingClientRect();
        const sc = ar.width / 1080;
        const F = q => ({ left:(q.left-ar.left)/sc, top:(q.top-ar.top)/sc,
                          right:(q.right-ar.left)/sc, bottom:(q.bottom-ar.top)/sc,
                          width:q.width/sc, height:q.height/sc });

        const cards = [...document.querySelectorAll('#pfCards .pf-card')].map(card => {
          const cb = F(card.getBoundingClientRect());
          const lk = card.querySelector('.pf-lk');
          const bn = card.querySelector('.pf-bn');
          const i = bn && bn.querySelector('i');
          /* 글자 «잉크» bbox — <i> 의 박스가 아니라 텍스트 노드의 실제 client rect */
          let tb = null;
          if (i && i.firstChild) {
            const rg = document.createRange();
            rg.selectNodeContents(i);
            const q = rg.getBoundingClientRect();
            if (q.width > 0) tb = F(q);
          }
          /* 자물쇠는 흰 몸통(28×32) + drop-shadow. 그림자는 bbox 에 안 들어간다 */
          const lb = lk ? F(lk.getBoundingClientRect()) : null;
          return {
            name: i ? i.textContent : '',
            own: card.classList.contains('own'),
            card: cb, lock: lb, bn: bn ? F(bn.getBoundingClientRect()) : null, txt: tb
          };
        });
        return { cards, n: cards.length };
      }, BROKEN);

      ck(`카드 8칸 렌더`, r.n === 8, `${r.n}칸`);

      let ov = 0, ovDetail = [];
      for (const c of r.cards) {
        const rel = v => v - c.card.left;   /* 카드 상대 x */
        if (c.own) {
          ck(`«${c.name}» 보유칸 자물쇠 없음`, !c.lock, c.lock ? '자물쇠가 있다' : '');
          continue;
        }
        ck(`«${c.name}» 잠금칸 자물쇠 있음`, !!c.lock, '');
        if (!c.lock || !c.txt) continue;

        const a = inter(c.lock, c.txt);
        if (a > 0) { ov++; ovDetail.push(`${c.name} ${a.toFixed(0)}px²`); }
        ck(`«${c.name}» 자물쇠∩글자 = 0`, a === 0,
           `자물쇠 x ${rel(c.lock.left).toFixed(0)}..${rel(c.lock.right).toFixed(0)} · ` +
           `글자 x ${rel(c.txt.left).toFixed(0)}..${rel(c.txt.right).toFixed(0)}` +
           (a > 0 ? ` · 겹침 ${(Math.min(c.lock.right,c.txt.right)-Math.max(c.lock.left,c.txt.left)).toFixed(0)}px` : ''));

        ck(`«${c.name}» 자물쇠가 배너 안`,
           c.lock.left >= c.bn.left - 0.6 && c.lock.right <= c.bn.right + 0.6,
           `배너 x ${rel(c.bn.left).toFixed(0)}..${rel(c.bn.right).toFixed(0)}`);

        ck(`«${c.name}» 자물쇠 28×32`,
           Math.abs(c.lock.width - 28) < 0.6 && Math.abs(c.lock.height - 32) < 0.6,
           `${c.lock.width.toFixed(1)}×${c.lock.height.toFixed(1)}`);

        const cx = (rel(c.txt.left) + rel(c.txt.right)) / 2;
        ck(`«${c.name}» 글자 중심 175±3(ref 174.5)`, Math.abs(cx - 175) <= 3, `중심 ${cx.toFixed(1)}`);
      }

      ck('콘솔/런타임 에러 0', errs.length === 0, errs.slice(0, 2).join(' | '));
      if (BROKEN) console.log(`  (음성 테스트) 겹친 칸 ${ov}개: ${ovDetail.join(', ')}`);
      await ctx.close();
    }
  } finally { await browser.close(); }

  console.log('');
  if (bad.length) { console.log('실패 항목:'); bad.forEach(b => console.log('  - ' + b)); }
  console.log(`VERIFY137 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
