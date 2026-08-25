/* 128 재현 — node tools/repro128.js
 *
 * 수정 «전» 에는 CRASH(= 효과음이 죽는다)를, 수정 «후» 에는 PASS 를 찍는다.
 * verify128 과 달리 **소스에 새 심볼이 없어도 돈다** — 옛 빌드에도 그대로 돌려 대조하기 위해서다.
 * (LESSONS 110-③ «재현 스크립트는 수정 전 빌드에서 먼저 CRASH 를 보여야 근거가 된다»)
 *
 *   A  sfx() 를 1200회 때린 뒤 «WebMediaPlayer 막힘» 경고 수
 *   B  그 뒤에 낸 새 효과음이 실제로 재생되는가(currentTime 진행) — 버그의 본체
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const BURST = +(process.argv[2] || 1200);

(async () => {
  const browser = await launch(chromium, { args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
  const blocked = [];
  const grab = t => { if(/WebMediaPlayer/i.test(t)) blocked.push(t.slice(0, 120)); };
  page.on('console', m => { if(m.type() === 'error' || m.type() === 'warning') grab(m.text()); });
  page.on('pageerror', e => grab(String(e)));
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load' });
  await page.mouse.click(270, 400);
  await page.waitForTimeout(400);

  const mode = await page.evaluate(() => auMode);
  console.log('auMode = ' + mode + (mode === 'el' ? '' : '  ← el 폴백이 아니면 이 재현은 무의미하다'));

  await page.evaluate(async (n) => {
    for(let i = 0; i < n; i++){
      const name = AU_SFX[i % AU_SFX.length];
      auLast[name] = 0;
      try{ sfx(name); }catch(_){}
      if(i % 40 === 39) await new Promise(r => setTimeout(r, 8));
    }
  }, BURST);
  await page.waitForTimeout(800);

  /* 폭주 «뒤» 에 낸 소리가 나는가. 구현이 무엇을 쓰든(clone 이든 풀이든) 문서 안의
     모든 <audio> 를 훑어 «지금 진행 중인 재생» 을 찾는다 — 새 심볼에 의존하지 않는다. */
  const played = await page.evaluate(async () => {
    const seen = new Set();
    const scan = () => {
      let best = 0;
      if(typeof auVo !== 'undefined') for(const v of auVo) best = Math.max(best, v.el.currentTime || 0);
      for(const el of document.querySelectorAll('audio')) best = Math.max(best, el.currentTime || 0);
      return best;
    };
    seen.add(scan());
    auLast['victory'] = 0;
    let ok = false;
    const before = scan();
    sfx('victory');
    await new Promise(r => setTimeout(r, 800));
    ok = scan() > 0.05 || scan() > before;
    return { ok, t: scan() };
  });

  console.log('폭주 ' + BURST + '회 → «WebMediaPlayer 막힘» 경고 ' + blocked.length + '건');
  if(blocked.length) console.log('  예: ' + blocked[0]);
  console.log('폭주 뒤 새 효과음 재생 = ' + (played.ok ? 'O' : 'X') + ' (t=' + played.t.toFixed(3) + 's)');

  await browser.close();
  const bad = blocked.length > 0 || !played.ok;
  console.log('');
  console.log(bad ? 'REPRO128 CRASH — 효과음이 죽는다(누수 재현됨)' : 'REPRO128 PASS — 누수 없음');
  process.exit(bad ? 1 : 0);
})();
