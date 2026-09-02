/* 814 채점용 연속 프레임 캡처 — 지시서 [3]-(다)(«연속 프레임 6~8장 · 비평 2인»)

   씬 두 개를 같은 자로 찍는다:
     A «격자»  — 50 코스튬 시트 카드 [강화](이 작업이 고친 자리)
     B «팝업»  — 08 세부 팝업 [강화](같은 행동의 짝 자리 · 736 «짝인 두 자리»)
   그리고 **수리 전** 사본(옛 호출 = 문구 «Lv. n» 부활)을 같은 타이밍으로 한 벌 더 찍어
   비평가가 «무엇이 좋아졌고 무엇을 잃었는가» 를 같은 눈금으로 볼 수 있게 한다.

   ⚠ 캡처는 커밋하지 않는다(ROUTINE 서두 — `docs/review/*.png` 는 .gitignore).
   ⚠ 잘라 찍는다(카드 둘레 620×560) — 1080×2280 전장을 주면 168px 카드의
     «값 줄이 덮이는가» 를 사람이 못 본다. 맥락용 전장 1장은 따로 찍는다.

   실행: node tools/cap814.js [--tag r1] */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'review');
const tagIx = process.argv.indexOf('--tag');
const TAG = tagIx > 0 ? process.argv[tagIx + 1] : 'r1';
const TS = [0, 90, 180, 270, 360, 450, 540, 630];   /* 트리거 직후 8장 · 90ms 간격(수명 620ms 를 덮는다) */

async function boot(file) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.join(ROOT, file));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    S.cosLv = S.cosLv || {}; S.cosLv[AVATARS[1].id] = 12;      /* 한 자리 · 두 자리가 같이 보이게 */
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  return { b, p };
}

/* ⚠ **실시간**으로 찍는다(58 방식 «트리거 직후 80~100ms 간격»). 애니를 정지시켜 진행도를 주는 자
   (probe/verify)와 달리, 채점용 프레임은 **사람이 보는 그대로**여야 한다 — 파티클은 CSS 가 아니라
   JS 틱이 움직이므로 `currentTime` 을 밀어도 안 따라오고, 그렇게 찍으면 «4장째부터 똑같은 그림» 이 된다.
   스크린샷 한 장이 ~120ms 라 간격은 그 위에 얹는다. 실제 시각을 같이 적어 비평 브리핑에 넘긴다. */
async function shoot(p, prefix, box, t0) {
  const at = [];
  for (let i = 1; i <= 8; i++) {
    at.push(Math.round(Date.now() - t0));
    await p.screenshot({ path: path.join(OUT, prefix + '-' + i + '.png'), clip: box });
    const want = i * 90 - (Date.now() - t0);
    if (want > 0) await p.waitForTimeout(want);
  }
  return at;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const shots = [];

  for (const [file, kind] of [['index.html', 'now'], [null, 'pre']]) {
    let src = file;
    if (kind === 'pre') {
      /* 수리 전 사본 — 옛 호출(문구 «Lv. n»)로 되돌린다. §R-a 와 같은 주입이다. */
      const s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      const from = 'fxUpOk(card, card);                            /* 17 «성공» 과 같은 한 세트(58 톤) — 814: 문구는 뺀다 */';
      const to = "fxUpOk(card, card, 'Lv. ' + cosLvOf(cosSel));";
      if (s.indexOf(from) < 0) { console.log('⚠ 수리 전 주입 앵커를 못 찾았다 — pre 캡처 건너뜀'); continue; }
      src = '.cap814-pre.html';
      fs.writeFileSync(path.join(ROOT, src), s.split(from).join(to)
        .split('      cosLvPop();                                    /* 814 — 값이 바뀐 줄이 «방금 갱신됐다» 를 말한다 */\n').join(''));
    }
    const { b, p } = await boot(src);

    /* ── 씬 A: 격자 카드 [강화] ─────────────────────────── */
    const boxA = await p.evaluate(() => {
      const all = [...document.querySelectorAll('#bCos [data-cosit]')];
      all[1].click();
      const r = document.querySelector('#bCos .sk-card.sel').getBoundingClientRect();
      document.querySelector('#bCos [data-cosup]').click();
      return { x: Math.max(0, r.left - 230), y: Math.max(0, r.top - 120), width: 620, height: 560 };
    });
    const atA = await shoot(p, '814-' + TAG + '-' + kind + '-grid', boxA, Date.now());
    shots.push('814-' + TAG + '-' + kind + '-grid-1..8.png @ ' + atA.join('/') + 'ms');

    /* 맥락용 전장 1장(연출이 끝난 뒤 — 자리 맥락용) */
    await p.screenshot({ path: path.join(OUT, '814-' + TAG + '-' + kind + '-grid-full.png') });

    /* ── 씬 B: 08 세부 팝업 [강화] ──────────────────────── */
    const boxB = await p.evaluate(() => {
      document.getAnimations().forEach((a) => { try { a.finish(); } catch (_) {} });
      for (const d of document.querySelectorAll('#fxl > *')) d.remove();
      showCosDetail(cosSel);
      const btn = [...document.querySelectorAll('#mbox button')].find((x) => /강화/.test(x.textContent) && !x.disabled);
      const ic = document.querySelector('#mbox .sk-ic');
      const r = ic.getBoundingClientRect();
      if (btn) btn.click();
      return { x: Math.max(0, r.left - 230), y: Math.max(0, r.top - 90), width: 620, height: 560 };
    });
    const atB = await shoot(p, '814-' + TAG + '-' + kind + '-pop', boxB, Date.now());
    shots.push('814-' + TAG + '-' + kind + '-pop-1..8.png @ ' + atB.join('/') + 'ms');

    await b.close();
    if (kind === 'pre') { try { fs.unlinkSync(path.join(ROOT, src)); } catch (_) {} }
  }

  console.log('CAP814 — ' + shots.join(' · '));
  console.log('수명 620ms · 8장 · 목표 간격 90ms(실측 시각은 위 줄)');
})().catch((e) => { console.error(e); process.exit(1); });
