/* 작업 252 — 12 소환 결과 카드 «등장 순서» 진단 (판정 없음, 측정 전용).
 *
 * 등재문(PROGRESS 252)이 지목한 의심 3곳은 전부 `jzStagger` 쪽이지만, 12 결과 카드는
 * `showSummonResult()` 가 **인라인 `animation-delay`** 를 직접 박는다. 어느 쪽이 실제로
 * 화면에 보이는 연출인지(=어떤 @keyframes 가 이겼는지)와, 그 지연이 «DOM 순서» 인지
 * «등급 순서» 인지를 감이 아니라 실측으로 가른다.
 *
 * 실행: node tools/probe252.js [--n 10|30]
 * 출력: 카드별 [DOM i · 등급 g · 인라인 delay · 이긴 animation-name · getAnimations() 목록]
 *       + 실제 스케일 시간축(20ms × 40) 에서 «각 카드가 처음 보이기 시작한 시각» 순서.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ai = process.argv.indexOf('--n');
const N = ai > 0 ? Number(process.argv[ai + 1]) : 10;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 서로 다른 N 종을 뽑아 «칸 수 = N» 을 보장한다(같은 아이템은 개수로 합쳐지므로) */
  const dump = await p.evaluate(async (n) => {
    S.dia = 1e9;
    const res = [], seen = new Set();
    for (let i = 0; i < 8000 && res.length < n; i++) {
      const r = summonOne('weapon');
      if (seen.has(r.it.id)) continue;
      seen.add(r.it.id); res.push(r);
    }
    const t0 = performance.now();
    showSummonResult('weapon', n, res, false);

    /* 선언값 스냅샷 — 팝업이 뜬 «직후» 프레임 */
    const cards = [...document.getElementById('sumGridIn').children];
    const decl = cards.map((el, i) => {
      const cs = getComputedStyle(el);
      return {
        i,
        g: res[i] ? res[i].it.g : -1,
        cls: el.className,
        inlineDelay: el.style.animationDelay || '',
        jzd: el.style.getPropertyValue('--jzd') || '',
        name: cs.animationName,
        dur: cs.animationDuration,
        delay: cs.animationDelay,
        anims: el.getAnimations().map(a => (a.animationName || (a.effect && a.effect.getKeyframes && 'kf')) + '@' + Math.round(a.currentTime || 0)),
      };
    });

    /* 시간축 — 20ms 간격 40회, 카드별 실효 scale(0 이면 아직 안 나타남) */
    const trace = [];
    for (let k = 0; k < 40; k++) {
      const row = cards.map(el => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const sc = Math.hypot(m.a, m.b);
        const op = Number(getComputedStyle(el).opacity);
        return Math.round(sc * op * 1000) / 1000;
      });
      trace.push({ t: Math.round(performance.now() - t0), row });
      await new Promise(r => setTimeout(r, 20));
    }
    return { decl, trace };
  }, N);

  console.log('=== [A] 카드별 선언값 (DOM 순) ===');
  for (const d of dump.decl) {
    console.log(`  i=${String(d.i).padStart(2)} g=${d.g} inline="${d.inlineDelay}" --jzd="${d.jzd}"`
      + ` | computed name=${d.name} dur=${d.dur} delay=${d.delay}`
      + ` | anims=[${d.anims.join(', ')}] | cls="${d.cls}"`);
  }

  console.log('\n=== [B] 인라인 delay 가 «DOM 순» 인가 «등급 순» 인가 ===');
  const byDom = dump.decl.map(d => parseFloat(d.inlineDelay) || 0);
  const domSorted = byDom.every((v, i, a) => i === 0 || v >= a[i - 1]);
  const gradeOrder = dump.decl.slice().sort((x, y) => x.g - y.g || x.i - y.i).map(d => d.i);
  const delayOrder = dump.decl.slice().sort((x, y) => (parseFloat(x.inlineDelay) || 0) - (parseFloat(y.inlineDelay) || 0) || x.i - y.i).map(d => d.i);
  console.log('  delay(DOM 순 배열) =', byDom.map(v => v.toFixed(3)).join(' '));
  console.log('  DOM 순 단조증가?    =', domSorted ? 'YES' : 'NO  ← «순서대로» 가 아니다');
  console.log('  delay 오름차순 i    =', delayOrder.join(','));
  console.log('  등급 오름차순 i     =', gradeOrder.join(','));
  console.log('  두 순서 일치?       =', JSON.stringify(delayOrder) === JSON.stringify(gradeOrder) ? 'YES ← 등급 순으로 매겨져 있다' : 'NO');

  console.log('\n=== [C] 실제 등장 시각(실효 scale×opacity 가 0.05 를 처음 넘은 t, ms) ===');
  const nCards = dump.decl.length;
  const first = [];
  for (let c = 0; c < nCards; c++) {
    let t = null;
    for (const s of dump.trace) if (s.row[c] > 0.05) { t = s.t; break; }
    first.push(t);
  }
  console.log('  ' + first.map((t, i) => `i${i}:${t === null ? '—' : t}`).join('  '));
  const appearOrder = first.map((t, i) => ({ t: t === null ? 1e9 : t, i })).sort((a, b) => a.t - b.t || a.i - b.i).map(o => o.i);
  console.log('  등장 순서(i)        =', appearOrder.join(','));
  console.log('  DOM 순서와 같은가?  =', appearOrder.join(',') === dump.decl.map(d => d.i).join(',') ? 'YES' : 'NO  ← 화면에서 «랜덤» 으로 읽힌다');

  console.log('\n=== [D] 최종 정지 스케일(마지막 표본) ===');
  console.log('  ' + dump.trace[dump.trace.length - 1].row.join(' '));
  console.log('\n콘솔 에러:', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();
