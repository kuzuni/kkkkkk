/* 128 오디오 게이트 — node tools/verify128.js → 마지막 줄 VERIFY128 PASS
 *
 * 78 의 `<audio>` 폴백(`auMode === 'el'`)이 sfx() 호출마다 엘리먼트를 새로 만들고 회수하지 않아
 * 크로미움의 문서당 WebMediaPlayer 상한(~75, crbug.com/1144736)을 넘기면 그 뒤로 효과음이
 * **통째로 죽는** 버그를 잡는다. 상한을 넘긴 뒤에도 소리가 나는지까지 본다.
 *
 *   §A 폭주 — sfx() 를 상한의 몇 배로 때려도 미디어 엘리먼트 총수가 «고정 상한» 안에 머문다
 *   §B 상한 돌파 후에도 실제로 재생된다(«막혔다» 경고 0건 + 재생 진행 확인)
 *   §C BGM 트랙 전환을 반복해도 엘리먼트가 안 쌓이고, 이전 트랙이 겹쳐 울리지 않는다
 *   §D 장시간 자동 전투(기본 60s, `--long` 이면 180s) — 실제 게임이 스스로 내는 소리로 회귀 확인
 *   §E 78 회귀 — 프리로드 캐시 auEl 은 AU_SFX 전종 그대로, 예외 0
 *
 * 이 게이트는 `file://` 로 연다 — 그래야 auMode 가 'el' 폴백으로 떨어진다(78 의 canFetch 분기).
 */
const fs = require('fs'), path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const LONG = process.argv.includes('--long');
const PLAY_MS = LONG ? 180000 : 60000;

let fails = [], checks = 0;
const ck = (name, ok, info) => {
  checks++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : ''));
  if(!ok) fails.push(name);
};

/* 소스에서 상수를 읽어 온다 — LESSONS 99 «N 을 세는 게이트는 N 을 소스에서 뽑아라» */
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SFX_N = eval((HTML.match(/const AU_SFX = (\[[\s\S]*?\]);/) || [0, '[]'])[1]).length;
const VOICE_MAX = +((HTML.match(/const AU_VOICE_MAX = (\d+)/) || [0, 0])[1]);
const BGM_EL = 2;                       /* 128 — 페이드 교차용 핑퐁 2개 */
const CAP = SFX_N + VOICE_MAX + BGM_EL; /* 이 문서가 만들 수 있는 미디어 엘리먼트 총수의 상한 */

(async () => {
  const browser = await launch(chromium, { args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });

  ck('§0 소스에 AU_VOICE_MAX 상수 존재', VOICE_MAX > 0, 'AU_VOICE_MAX=' + VOICE_MAX);
  ck('§0 목소리 풀 상한이 WebMediaPlayer 한도(75) 아래', CAP < 75,
     'SFX ' + SFX_N + ' + 목소리 ' + VOICE_MAX + ' + BGM ' + BGM_EL + ' = ' + CAP);

  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
    const errs = [], blocked = [];
    const grab = t => {
      if(/WebMediaPlayer/i.test(t)) blocked.push(t.slice(0, 140));
      errs.push(t.slice(0, 140));
    };
    page.on('console', m => { if(m.type() === 'error' || m.type() === 'warning') grab(m.text()); });
    page.on('pageerror', e => grab(String(e)));
    await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load' });
    await page.mouse.click(270, 400);            /* auInit 은 첫 제스처에서 돈다 */
    await page.waitForTimeout(400);
    return { page, errs, blocked };
  };

  /* ---------- §A·§B 폭주 ---------- */
  {
    const { page, errs, blocked } = await open();
    ck('§A auMode = el (file:// 폴백)', await page.evaluate(() => auMode) === 'el');

    /* 상한(75)의 몇 배로 때린다. 98 의 이름별 최소 간격(auLast)은 매번 0 으로 밀어 우회한다 —
       «게이트가 스로틀에 가려 아무것도 안 재는» 것을 막기 위해서다. */
    const BURST = 1200;
    const r = await page.evaluate(async (n) => {
      const thrown = [];
      for(let i = 0; i < n; i++){
        const name = AU_SFX[i % AU_SFX.length];
        auLast[name] = 0;
        try{ sfx(name); }catch(e){ if(thrown.length < 3) thrown.push(name + ':' + e); }
        if(i % 40 === 39) await new Promise(r => setTimeout(r, 8));
      }
      return { thrown, made: typeof auMade === 'number' ? auMade : -1,
               voices: typeof auVo !== 'undefined' ? auVo.length : -1,
               els: Object.keys(auEl).length };
    }, BURST);
    await page.waitForTimeout(600);

    ck('§A sfx() ' + BURST + '회 예외 0', r.thrown.length === 0, r.thrown.join(','));
    ck('§A 만든 미디어 엘리먼트 총수 ≤ ' + CAP, r.made >= 0 && r.made <= CAP, 'auMade=' + r.made);
    ck('§A 목소리 풀 ≤ ' + VOICE_MAX, r.voices >= 0 && r.voices <= VOICE_MAX, 'auVo=' + r.voices);
    ck('§B «WebMediaPlayer 막힘» 경고 0건', blocked.length === 0,
       blocked.length + '건: ' + blocked.slice(0, 2).join(' | '));

    /* 상한을 넘긴 «뒤» 에도 실제로 소리가 나는가 — 버그의 본체는 «조용해진다» 이다.
       뮤트 상태에서도 currentTime 은 진행하므로 그것으로 재생을 확인한다. */
    const play = await page.evaluate(async () => {
      auLast['victory'] = 0; sfx('victory');
      await new Promise(r => setTimeout(r, 700));
      let best = 0, live = 0;
      for(const v of auVo){ if(!v.el.paused) live++; if(v.el.currentTime > best) best = v.el.currentTime; }
      return { best, live };
    });
    ck('§B 폭주 후에도 재생 진행(currentTime > 0.05s)', play.best > 0.05, 't=' + play.best.toFixed(3) + 's');

    ck('§B 콘솔 에러 0', errs.length === 0, errs.slice(0, 2).join(' | '));
    await page.close();
  }

  /* ---------- §C BGM 전환 ---------- */
  {
    const { page, errs, blocked } = await open();
    const r = await page.evaluate(async () => {
      const before = auMade, voBefore = auVo.length;
      for(let i = 0; i < 24; i++){ bgmSet(i % 2 ? 'boss' : 'main'); await new Promise(r => setTimeout(r, 60)); }
      await new Promise(r => setTimeout(r, 1400));         /* 페이드아웃(1s)이 끝날 시간을 준다 */
      let playing = 0;
      for(const el of auBgmEl){ if(el && !el.paused && el.volume > 0.001) playing++; }
      return { before, after: auMade, voBefore, voAfter: auVo.length,
               playing, cur: bgmCur, els: auBgmEl.filter(Boolean).length };
    });
    /* 전환 «중에도» 게임은 자기 효과음을 낸다(LESSONS 99) — 목소리가 지연 생성되는 몫을 빼고 센다.
       BGM 이 트랙마다 엘리먼트를 만들면 이 차가 24 로 벌어진다. */
    const bgmGrew = (r.after - r.before) - (r.voAfter - r.voBefore);
    ck('§C 트랙 24회 전환이 만든 BGM 엘리먼트 ≤ ' + BGM_EL, bgmGrew <= BGM_EL,
       'auMade ' + r.before + '→' + r.after + ' 중 목소리 ' + (r.voAfter - r.voBefore) + ' 제외 = ' + bgmGrew);
    ck('§C BGM 엘리먼트 ≤ ' + BGM_EL + '개', r.els <= BGM_EL, String(r.els));
    ck('§C 동시에 울리는 BGM 은 1개 이하', r.playing <= 1, String(r.playing) + '개');
    ck('§C 전환 후 트랙 유지', r.cur === (23 % 2 ? 'boss' : 'main'), String(r.cur));
    ck('§C «WebMediaPlayer 막힘» 0건 · 콘솔 에러 0', blocked.length === 0 && errs.length === 0,
       errs.slice(0, 2).join(' | '));
    await page.close();
  }

  /* ---------- §D 장시간 실제 플레이 ---------- */
  {
    const { page, errs, blocked } = await open();
    const t0 = Date.now();
    process.stdout.write('  … §D 자동 전투 ' + (PLAY_MS / 1000) + 's 관찰 중');
    let peak = 0;
    while(Date.now() - t0 < PLAY_MS){
      await page.waitForTimeout(5000);
      const made = await page.evaluate(() => (typeof auMade === 'number' ? auMade : -1));
      if(made > peak) peak = made;
      process.stdout.write('.');
    }
    console.log('');
    ck('§D ' + (PLAY_MS / 1000) + 's 자동 전투 — 엘리먼트 총수 ≤ ' + CAP, peak <= CAP, 'auMade 최대 ' + peak);
    ck('§D «WebMediaPlayer 막힘» 0건', blocked.length === 0,
       blocked.length + '건: ' + blocked.slice(0, 2).join(' | '));
    /* 3분을 논 뒤에도 새 효과음이 실제로 난다 — «조용해짐» 의 직접 확인 */
    const still = await page.evaluate(async () => {
      auLast['victory'] = 0; sfx('victory');
      await new Promise(r => setTimeout(r, 700));
      let best = 0; for(const v of auVo) if(v.el.currentTime > best) best = v.el.currentTime;
      return best;
    });
    ck('§D 장시간 뒤에도 효과음 재생됨', still > 0.05, 't=' + still.toFixed(3) + 's');
    ck('§D 콘솔 에러 0', errs.length === 0, errs.slice(0, 2).join(' | '));
    await page.close();
  }

  /* ---------- §E 78 회귀 ---------- */
  {
    const { page, errs } = await open();
    const r = await page.evaluate(() => {
      const thrown = [];
      for(const n of AU_SFX){ try{ auLast[n] = 0; sfx(n); }catch(e){ thrown.push(n + ':' + e); } }
      try{ bgmApply(); }catch(e){ thrown.push('bgm:' + e); }
      return { thrown, els: Object.keys(auEl).length, bgm: bgmCur,
               vol: auVo.length ? auVo[0].el.volume : -1 };
    });
    ck('§E 프리로드 캐시 auEl = AU_SFX ' + SFX_N + '종', r.els === SFX_N, String(r.els));
    ck('§E sfx()·bgmApply() 예외 0', r.thrown.length === 0, r.thrown.join(','));
    ck('§E BGM main (el 경로)', r.bgm === 'main', String(r.bgm));
    ck('§E 98 게인 적용 — 목소리 volume 0..1', r.vol >= 0 && r.vol <= 1, String(r.vol));
    ck('§E 콘솔 에러 0', errs.length === 0, errs.slice(0, 2).join(' | '));
    await page.close();
  }

  await browser.close();
  console.log('');
  console.log(fails.length === 0 ? 'VERIFY128 PASS (' + checks + '/' + checks + ')'
                                 : 'VERIFY128 FAIL — ' + fails.length + '건: ' + fails.join(' / '));
  process.exit(fails.length ? 1 : 0);
})();
