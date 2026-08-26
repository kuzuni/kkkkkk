/* 작업 104 게이트 — «아이템 프레임·버튼·팝업 껍데기 통일감» (저장소 주인 지시 2026-08-26)

   지시 ① 「등급 색 테두리 + 아이콘 + 하단 수량 형태의 **공용 아이템 프레임 컴포넌트 1종**
          (크기 변수만 다르게)을 05/53 기준으로 정하고, 69·22·70·12 등 아이템 칸을 전부 교체」
   지시 ② 「69 우편함 껍데기·하단 버튼은 A5 `.mbox` + 공용 버튼 스타일로」
   지시 ③ 「화면별 측정표의 프레임 bbox 는 유지(크기 변수로 맞춘다)」

   ROUTINE [3]-(가) 기계적·구조 작업이라 비평가는 띄우지 않는다. 대신 «정말 한 벌인가» 를
   **실렌더 computed style 로** 검사한다 — 선언을 읽으면 순환 논증이 된다(LESSONS 60 11회차).

   검사 항목
     ① 여섯 화면의 아이템 칸이 전부 `.ifr` 을 달고 있는가 (05·53·12·69·22·70 + 04/07/50)
     ② 검정 외곽선 두께가 **전부 같은 한 값**인가 (토큰 --if-bw)
     ③ 안쪽 등급 림 두께가 **전부 같은 한 값**인가 (토큰 --if-rim) ← 이전엔 5·6·7 세 값이었다
     ④ 코너가 **폭 × 같은 한 비율**인가 (토큰 --if-rr) ← 이전엔 .213~.293 로 흩어져 있었다
     ⑤ 면이 같은 합성(2% 어둠 그라데이션 + 등급 면색)인가
     ⑥ 하단 수량 배지가 있는 칸은 전부 «폭 × 같은 비율» 글자에 «바닥 테두리에 걸침» 인가
     ⑦ 지시 ③ — 프레임 bbox(w×h)가 측정표 값 그대로인가
     ⑧ 지시 ② — 22·69 의 베벨 버튼 4종이 전부 `.ifbtn` 한 부품이고 베벨 스톱이 같은 식인가
     ⑨ 69 껍데기가 A5 공용 `.mbox` 인가
     ⑩ 콘솔 에러 0

   실행: node tools/verify104.js       → 마지막 줄 VERIFY104 n/n PASS
*/
'use strict';
const path = require('path');
const fs = require('fs');

const { chromium } = (() => {
  try { return require('playwright'); } catch (e) {}
  try { return require('playwright-core'); } catch (e) {}
  console.error('playwright 를 찾을 수 없다 — `npm i --no-save playwright` 후 재실행');
  process.exit(2);
})();

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail){
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* 측정표가 확정한 프레임 bbox — 지시 ③ «유지» 대상 */
const BBOX = {
  '05 .wgc'    : [148, 158],
  '53 .bg53-c' : [148, 147],
  '12 .sm-c'   : [157, 157],
  '69 .ml-i'   : [108, 108],
  '22 .qs-i'   : [106, 106],
  '70 .at-if'  : [138, 138],
  '04 .sk-card': [168, 171]
};

(async () => {
  const browser = await chromium.launch(launchOpts());
  try {
    const ctx = await browser.newContext({ viewport: { width: 540, height: 1140 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(700);

    const r = await page.evaluate(() => {
      const out = { frames: [], badges: [], btns: [], shell: null, err: [] };
      const safe = (label, fn) => { try { fn(); } catch (e) { out.err.push(label + ': ' + e.message); } };

      const app = () => document.getElementById('app').getBoundingClientRect();
      const SC = () => app().width / 1080;
      const px = v => parseFloat(v) || 0;

      /* box-shadow computed 형식은 «색 0px 0px 0px Npx inset» 이다(Chrome). 인셋 두께만 뽑는다. */
      const insets = cs => cs.boxShadow.split(/,(?![^(]*\))/)
        .filter(s => /inset/.test(s))
        .map(s => { const m = s.match(/0px\s+0px\s+0px\s+([\d.]+)px/); return m ? parseFloat(m[1]) : null; })
        .filter(v => v !== null);

      const snap = (label, el) => {
        if (!el) { out.err.push(label + ': 요소 없음'); return; }
        const cs = getComputedStyle(el);
        const q = el.getBoundingClientRect(), sc = SC();
        const ins = insets(cs);
        const isIn = el.classList.contains('ifr-in');
        out.frames.push({
          label,
          ifr: el.classList.contains('ifr'),
          bw: isIn ? (ins[0] || 0) : px(cs.borderTopWidth),
          rim: isIn ? ((ins[1] || 0) - (ins[0] || 0)) : (ins[0] || 0),
          radius: px(cs.borderTopLeftRadius),
          w: q.width / sc, h: q.height / sc,
          grad: /linear-gradient/.test(cs.backgroundImage),
          layers: cs.backgroundImage.split(/,(?![^(]*\))/).length
        });
      };

      /* 배지·프레임 폭은 rect(스케일 보정), font-size·stroke 는 computed(프레임 좌표계 그대로) */
      const bsnap = (label, frame) => {
        if (!frame) { out.err.push(label + ' 배지: 프레임 없음'); return; }
        const q = frame.querySelector('.ifq');
        if (!q) { out.err.push(label + ' 배지: .ifq 없음'); return; }
        const cs = getComputedStyle(q);
        const fr = frame.getBoundingClientRect(), br = q.getBoundingClientRect(), sc = SC();
        out.badges.push({ label, fw: fr.width / sc,
          fs: parseFloat(cs.fontSize), stroke: parseFloat(cs.webkitTextStrokeWidth),
          over: (br.bottom - fr.bottom) / sc });
      };

      const btn = (label, el) => {
        if (!el) { out.err.push(label + ': 버튼 없음'); return; }
        const cs = getComputedStyle(el);
        const q = el.getBoundingClientRect(), sc = SC();
        out.btns.push({ label, ifbtn: el.classList.contains('ifbtn'),
          bw: px(cs.borderTopWidth), h: q.height / sc,
          grad: cs.backgroundImage, line: cs.borderTopColor });
      };

      const flush = () => { void document.body.offsetHeight; };

      /* 화면마다 «열고 바로 잰다» — #modal 은 22·69·70 이 공유하므로 순서가 곧 파괴 순서다 */
      safe('22 퀘스트', () => { openQuest('rep'); flush();
        snap('22 .qs-i', document.querySelector('.qs-i'));
        bsnap('22', document.querySelector('.qs-i'));
        btn('22 .qs-b', document.querySelector('.qs-b'));
        btn('22 .qs-all', document.querySelector('.qs-all')); });

      safe('69 우편', () => { openMail(); flush();
        snap('69 .ml-i', document.querySelector('.ml-i'));
        bsnap('69', document.querySelector('.ml-i'));
        btn('69 .ml-b', document.querySelector('.ml-b'));
        btn('69 .ml-all', document.querySelector('.ml-all'));
        out.shell = { mbox: !!document.querySelector('#modal .mbox'),
                      cls: document.getElementById('modal').className }; });

      safe('70 출석', () => { openAttend(); flush();
        snap('70 .at-if', document.querySelector('.at-if'));
        bsnap('70', document.querySelector('.at-if')); });

      safe('53 가방', () => { closeModal(); S.gold = 1e6; S.dia = 5e4; openBag(); flush();
        snap('53 .bg53-c', document.querySelector('#bagGrid .bg53-c:not(.em)'));
        bsnap('53', document.querySelector('#bagGrid .bg53-c:not(.em)')); });

      safe('12 소환결과', () => {
        document.getElementById('bagw').classList.remove('on');
        const res = [0, 1, 2].map(g => ({ it: { g, ic: '🗡', n: 'T' + g }, n: 'T' + g }));
        showSummonResult('weapon', 3, res, null);
        /* `fx-pop` 은 0% 에 scale(0) 이라 **애니메이션 중에는 rect 가 0×0** 이다(캡처 아티팩트 —
           LESSONS 92-1 과 같은 종류). 기하를 재기 전에 팝을 걷어낸다. */
        document.querySelectorAll('#sumGridIn .sm-c').forEach(el => {
          el.classList.remove('fx-pop'); el.style.animation = 'none';
        });
        flush();
        snap('12 .sm-c', document.querySelector('#sumGridIn .sm-c'));
        bsnap('12', document.querySelector('#sumGridIn .sm-c')); });

      safe('05 장비 카드', () => {
        document.getElementById('sumw').classList.remove('on');
        openWeapon(null, 'weapon'); flush();
        snap('05 .wgc', document.querySelector('.wgc')); });

      safe('04 스킬 카드', () => {
        document.getElementById('wpnw').classList.remove('on');
        gmHero('sk'); flush();
        snap('04 .sk-card', document.querySelector('.sk-card')); });

      return out;
    });

    console.log('\n[① 공용 컴포넌트 부착]');
    for (const f of r.frames) ck('.ifr — ' + f.label, f.ifr);

    console.log('\n[② 검정 외곽선 — 한 값인가]');
    {
      const vs = [...new Set(r.frames.map(f => f.bw.toFixed(2)))];
      ck('선 두께 단일값', vs.length === 1, vs.join(' / ') + 'px');
      ck('선 두께 = 05/53 기준 5px', near(r.frames[0].bw, 5, 0.05), r.frames[0].bw + 'px');
    }

    console.log('\n[③ 안쪽 등급 림 — 한 값인가]');
    {
      const vs = [...new Set(r.frames.map(f => f.rim.toFixed(2)))];
      ck('림 두께 단일값', vs.length === 1, vs.join(' / ') + 'px');
      ck('림 두께 = 05/53 기준 6px', near(r.frames[0].rim, 6, 0.05), r.frames[0].rim + 'px');
    }

    console.log('\n[④ 코너 — 폭 대비 한 비율인가]');
    {
      const rr = r.frames.map(f => ({ label: f.label, v: f.radius / f.w }));
      for (const x of rr) ck('코너비율 ' + x.label, near(x.v, 0.233, 0.004), x.v.toFixed(4));
      const spread = Math.max(...rr.map(x => x.v)) - Math.min(...rr.map(x => x.v));
      ck('코너비율 산포 ≤ .004', spread <= 0.004, spread.toFixed(4));
    }

    console.log('\n[⑤ 면 합성]');
    for (const f of r.frames) ck('면 그라데이션 ' + f.label, f.grad && f.layers >= 1, f.layers + '겹');

    console.log('\n[⑥ 하단 수량 배지]');
    /* 141 (2026-08-26) — 배지 배율은 «전 화면 한 값» 이 아니라 **화면별 입력**(`--ifq-k`)이 됐다.
       104 의 통일값 .235 는 그대로 기본값이고 다섯 화면이 그 값을 쓴다. 22 만 .317 이다 —
       104 주석이 스스로 «통일의 대가로 22 가 가장 많이 줄었다» 고 적어 둔 손실을 회수한 값으로,
       ref 잉크(`50` 46×27 · `100` 67×27)를 우리 서체(Jua, 숫자 잉크비 0.803)로 역산한 것이다.
       근거·실측은 docs/review/141-*.md. 여기서 «다섯은 .235 그대로» 를 같이 못 박아 둔다 —
       141 이 통일을 깬 것이 아니라 «잉크 크기만» 화면별로 연 것임을 이 게이트가 지킨다. */
    const IFQK = { '22': 0.317, '69': 0.235, '70': 0.235, '53': 0.235, '12': 0.235 };
    for (const b of r.badges) {
      const k = IFQK[b.label];
      if (k == null) { ck('배지 배율 기준값 ' + b.label, false, '기준값 없음'); continue; }
      ck('배지 글자비율 ' + b.label, near(b.fs / b.fw, k, 0.004), (b.fs / b.fw).toFixed(4) + ' (기준 ' + k + ')');
      /* 126 ② (2026-08-26) — 배지 외곽선의 기준이 «프레임 폭» 에서 «글자 크기» 로 옮겨졌다.
         104 의 .054 는 05·53 에서 뽑은 «통일» 상수이지 레퍼런스 실측이 아니었고, 프레임 폭 기준이라
         글자 대비로는 r = .054/.235 = .230 — 126 ② 가 «막힘 확실» 로 가른 구간이었다.
         지금은 `--st-body` × 글자비율(.235). 4회차 2차에서 비평가 I·J 지적으로 --st-body 를
         .15 → **.16** 으로 올렸으므로 .16 × .235 = **.0376**. 프레임마다 같다는 불변식은 그대로다.
         ⚠ `--st-body` 를 다시 조정하면 이 값도 같이 고쳐라(허용오차 ±.004 라 한 단계는 그냥 통과한다). */
      /* 스트로크는 «글자 크기» 기준(`--st-body` × 1em)이라 프레임 폭 대비로 보면 .16 × 배율이다.
         배율이 화면별로 갈렸으므로 이 기대값도 화면별로 따라간다 — 22 는 .16 × .317 = .0507. */
      ck('배지 스트로크비율 ' + b.label, near(b.stroke / b.fw, 0.16 * k, 0.004),
        (b.stroke / b.fw).toFixed(4) + ' (기준 ' + (0.16 * k).toFixed(4) + ')');
      ck('배지 바닥 걸침 ' + b.label, b.over > 0, b.over.toFixed(1) + 'px');
    }

    console.log('\n[⑦ 지시 ③ — 프레임 bbox 유지]');
    for (const f of r.frames) {
      const want = BBOX[f.label];
      if (!want) { ck('bbox ' + f.label, false, '기준값 없음'); continue; }
      ck('bbox ' + f.label, near(f.w, want[0], 0.6) && near(f.h, want[1], 0.6),
        f.w.toFixed(1) + '×' + f.h.toFixed(1) + ' (측정표 ' + want.join('×') + ')');
    }

    console.log('\n[⑧ 지시 ② — 공용 베벨 버튼]');
    {
      /* computed 그라데이션을 «색을 지우고 스톱만 남긴» 골격으로 바꿔 네 버튼을 직접 비교한다.
         상단 하이라이트 스톱은 테두리 두께라 버튼마다 다르므로 그 자리만 표식으로 치환한다. */
      const skel = b => b.grad
        .replace(/rgba?\([^)]*\)/g, 'C')
        .replace(/calc\(100% - 12px\)/g, 'CA')
        .replace(/calc\(100% - 6px\)/g, 'CB')
        .replace(new RegExp('\\b' + b.bw + 'px', 'g'), 'BW')
        .replace(/\s+/g, ' ').trim();
      const sk = r.btns.map(x => ({ label: x.label, s: skel(x) }));
      for (const x of r.btns) {
        ck('.ifbtn — ' + x.label, x.ifbtn);
        ck('테두리 검정 ' + x.label, x.line === 'rgb(0, 0, 0)', x.line);
        ck('바닥 림 밴드 −12→−6 ' + x.label,
          /calc\(100% - 12px\)/.test(x.grad) && /calc\(100% - 6px\)/.test(x.grad),
          x.grad.slice(0, 60) + '…');
        /* 상단 하이라이트 밴드의 끝 스톱 = 검정 테두리 두께 (색을 지운 뒤 두 번째 스톱을 읽는다) */
        const col = x.grad.replace(/rgba?\([^)]*\)/g, 'C');
        const m2 = col.match(/C 0px, C ([\d.]+)px/);
        ck('상단 하이라이트 = 테두리 ' + x.label,
          !!m2 && near(parseFloat(m2[1]), x.bw, 0.05),
          (m2 ? m2[1] : '?') + 'px vs 테두리 ' + x.bw + 'px');
      }
      const uniq = [...new Set(sk.map(x => x.s))];
      ck('베벨 골격이 네 버튼 모두 동일', uniq.length === 1,
        uniq.length + '종' + (uniq.length > 1 ? ' — ' + sk.map(x => x.label).join(',') : ''));
    }

    console.log('\n[⑨ 69 껍데기]');
    ck('A5 공용 .mbox', !!(r.shell && r.shell.mbox), r.shell && r.shell.cls);

    console.log('\n[⑩ 런타임]');
    ck('렌더 경로 오류 0', r.err.length === 0, r.err.join(' | '));
    ck('콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));

    await ctx.close();
  } finally {
    await browser.close();
  }

  if (bad.length) { console.log('\n실패 목록:'); bad.forEach(b => console.log('  - ' + b)); }
  console.log('\nVERIFY104 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
