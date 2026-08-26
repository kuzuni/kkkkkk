/* 126 ② — «스트로크가 속공간(counter)을 언제 막는가» 실측기.
 *
 * 비평가 H 의 1순위 지적(«작은 라벨에서 ㅇ 속이 막힌다»)을 눈이 아니라 픽셀로 가른다.
 * `-webkit-text-stroke` 는 글리프 윤곽 «중심» 에 그려지므로 **안쪽으로 sw/2 만큼 파고든다**
 * (LESSONS·03 주의 참고). 따라서 막힘 여부는 절대 px 가 아니라 **sw/fs 비율**로 결정된다.
 *
 *   node tools/m126ct.js
 *
 * 방법: 흰 글자 + 검정 스트로크를 회색 바탕에 그리고, 글리프 **바깥 윤곽 안쪽에 남은 흰 픽셀**
 * (= 속공간 + 획 본체)이 스트로크 0 일 때 대비 얼마나 남는지 센다. 속공간이 막히면
 * «흰 섬» 개수가 줄고(ㅇ 의 구멍이 사라진다) 남은 흰 면적이 급격히 떨어진다.
 * 글자는 이 게임의 라벨에 실제로 쓰이는 «ㅇ 이 든 한글» 로 잡는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const SAMPLES = ['우편', '보상', '소환', '길라잡이', '아무거나'];
const FSS = [22, 24, 26, 29, 34, 40, 48, 56];
const RS = [0.00, 0.08, 0.12, 0.16, 0.18, 0.20, 0.22, 0.24, 0.26, 0.30, 0.36];

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 900, height: 400 } });
  await page.goto(URL);            // GameKR 이 실제로 물린 문서에서 잰다
  await page.waitForTimeout(600);

  const res = await page.evaluate(async ({ SAMPLES, FSS, RS }) => {
    await document.fonts.ready;
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d', { willReadFrequently: true });

    // 한 조합의 «흰 잉크 면적 + 흰 섬 개수» 를 센다.
    const measure = (txt, fs, sw) => {
      const pad = Math.ceil(fs * 0.9) + 20;
      cv.width = Math.ceil(fs * (txt.length + 1)) + pad * 2;
      cv.height = Math.ceil(fs * 2) + pad * 2;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.font = '' + fs + "px GameKR";
      ctx.textBaseline = 'alphabetic';
      // 스트로크가 «윤곽 중심» 이 되도록 canvas 도 같은 방식(lineWidth = sw, 중심선)으로 그린다
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      // Chromium 의 `-webkit-text-stroke` 는 **채움 위에** 스트로크를 얹는다 —
      // 그래서 윤곽 중심선의 «안쪽 절반» 이 글자 속을 실제로 파먹는다. 같은 순서로 그린다.
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, pad, pad + fs);
      if (sw > 0) { ctx.lineWidth = sw; ctx.strokeStyle = '#000'; ctx.strokeText(txt, pad, pad + fs); }

      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width, H = cv.height;
      const white = new Uint8Array(W * H);
      let area = 0;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) { white[p] = 1; area++; }
      }
      // 흰 «섬»(연결 성분) 개수 — ㅇ 속공간이 살아 있으면 흰 획과 별개 섬이 안 되므로
      // 대신 «검정 안에 갇힌 회색 섬»(= 뚫린 속공간)을 센다: 회색 픽셀 중 바깥과 안 이어진 것.
      const gray = new Uint8Array(W * H);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        if (Math.abs(d[i] - 128) < 12 && Math.abs(d[i + 1] - 128) < 12) gray[p] = 1;
      }
      // 바깥 회색에서 flood fill
      const seen = new Uint8Array(W * H);
      const st = [0];
      seen[0] = 1;
      while (st.length) {
        const p = st.pop(), x = p % W, y = (p / W) | 0;
        const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
        for (const q of nb) if (q >= 0 && !seen[q] && gray[q]) { seen[q] = 1; st.push(q); }
      }
      let holes = 0, holePx = 0;
      const seen2 = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) {
        if (!gray[p] || seen[p] || seen2[p]) continue;
        // 새 구멍
        let n = 0; const s2 = [p]; seen2[p] = 1;
        while (s2.length) {
          const q = s2.pop(), x = q % W, y = (q / W) | 0; n++;
          const nb = [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1];
          for (const r of nb) if (r >= 0 && !seen2[r] && gray[r] && !seen[r]) { seen2[r] = 1; s2.push(r); }
        }
        if (n >= 3) { holes++; holePx += n; }
      }
      return { area, holes, holePx };
    };

    const out = [];
    for (const fs of FSS) {
      for (const r of RS) {
        const sw = +(fs * r).toFixed(2);
        let area = 0, holes = 0, holePx = 0;
        for (const t of SAMPLES) { const m = measure(t, fs, sw); area += m.area; holes += m.holes; holePx += m.holePx; }
        out.push({ fs, r, sw, area, holes, holePx });
      }
    }
    return out;
  }, { SAMPLES, FSS, RS });

  await browser.close();

  // r=0 을 기준으로 «남은 흰 잉크 %» 와 «살아 있는 속공간 %» 를 낸다
  const base = new Map();
  for (const o of res) if (o.r === 0) base.set(o.fs, o);
  console.log('표본: ' + SAMPLES.join(' ') + '  (GameKR, 한 조합당 5단어)');
  console.log('\n남은 흰 잉크 % (스트로크 0 대비) — 획이 얼마나 먹혔나');
  let h = '| fs |'; for (const r of RS) h += ' ' + r.toFixed(2) + ' |';
  console.log(h); console.log('|' + '---|'.repeat(RS.length + 1));
  for (const fs of FSS) {
    let ln = '| ' + fs + ' |';
    for (const r of RS) { const o = res.find(x => x.fs === fs && x.r === r); ln += ' ' + Math.round(o.area / base.get(fs).area * 100) + ' |'; }
    console.log(ln);
  }
  console.log('\n살아 있는 속공간 면적 % (스트로크 0 대비) — 0 에 가까울수록 ㅇ 이 막힌 것');
  console.log(h); console.log('|' + '---|'.repeat(RS.length + 1));
  for (const fs of FSS) {
    let ln = '| ' + fs + ' |';
    for (const r of RS) { const o = res.find(x => x.fs === fs && x.r === r); ln += ' ' + Math.round(o.holePx / (base.get(fs).holePx || 1) * 100) + ' |'; }
    console.log(ln);
  }
  console.log('\n뚫린 속공간 «개수» (스트로크 0 일 때 개수 → 현재 개수)');
  console.log(h); console.log('|' + '---|'.repeat(RS.length + 1));
  for (const fs of FSS) {
    let ln = '| ' + fs + ' |';
    for (const r of RS) { const o = res.find(x => x.fs === fs && x.r === r); ln += ' ' + o.holes + ' |'; }
    console.log(ln);
  }
})();
