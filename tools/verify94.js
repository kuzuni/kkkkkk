/* 작업 94 게이트 — 전투 캔버스 중앙 대형 텍스트(showMsg) 정리.
   실행: node tools/verify94.js

   저장소 주인 보고(2026-08-26): «스테이지를 맴돌다 보면 화면 중앙에 아주 큰 텍스트가 뜨는데
   화면 밖으로 나가 무슨 말인지 모르겠고, 없어도 되는 말 같다.»

   원인 둘:
     ⓐ `showMsg` 가 캔버스 중앙에 «900 28px»(논리 · 화면 56px) 한 줄을 폭 제한 없이 그린다.
     ⓑ 보스전 실패 후 파밍 상태에서 **웨이브가 전멸할 때마다** 30자짜리
        `'파밍 +1.2KG — [재도전] 으로 보스에 다시 도전'`(≈1,500px > 1080) 이 반복 호출된다.

   수정: ① 긴 문구 삭제(파밍 반복·보스전 실패 장문·«[재도전] 으로…» 류)
        ② 남는 문구는 짧게 — `STAGE n` · `BOSS n` · `STAGE CLEAR!`(+💎d) · `부활 중...` ·
           던전/레이드/승급전 시작·중단 한 줄
        ③ 그리기 전 폭 클램프 — 넘치면 폰트 비례 축소(하한 18 논리), 그래도 넘치면 «…»
        ④ `data-why`(비활성 버튼 사유) 는 캔버스가 아니라 **DOM 캡션 `jzWhy()`**(#fxl z60, 팝업 위)
        ⑤ 페이드 인 0.15s → 유지 1.0s → 페이드 아웃 0.3s · 같은 문구 1초 내 재호출 무시

   이 게이트가 보는 것:
     ① 소스 — 삭제한 문구가 다시 들어오지 않았는가(0건) · 남은 호출부의 형태
     ② 런타임 — 연출 상수와 클램프 계산값
     ③ **픽셀** — 캔버스를 «문구 없음/있음» 두 번 찍어 **차분**으로 잉크 bbox 를 낸다.
        월드를 정지(step 스텁)시켜 두 프레임이 문구 말고는 완전히 같게 만든 뒤 diff 하므로
        `measureText` 추정이 아니라 **실제로 그려진 잉크**를 잰다(LESSONS 74-⑤ · 100-①).
        길이 12·40·80·200자 + 한글 장문 전부 프레임 안(±0).
     ④ 페이드 — 같은 차분으로 최대 |Δ| 를 재 알파 램프가 0.15/1.0/0.3 곡선을 따르는지 본다.
     ⑤ 파밍 3웨이브 — 보스전 실패 → 웨이브 전멸 3회 동안 `showMsg` 호출 0건 · `msgT` 0 유지
     ⑥ `data-why` — 비활성 버튼 pointerdown 에 DOM 캡션이 뜨고, 캔버스(msgT)는 건드리지 않으며,
        팝업이 열려 있어도 그 위(#fxl z60 > 모달 z)에 뜨고 bbox 가 프레임 안이다.
*/
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const FILE = 'file://' + SRC;

const R = [];
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });
const near = (n, got, want, tol) =>
  R.push({ n, got: String(got), want: want + '±' + tol, pass: Math.abs(got - want) <= tol });

function report() {
  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY94 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
}

/* ⚠ 본문 전체를 try/finally 로 감싼다(LESSONS 109-③).
   수정 «전» 빌드처럼 심볼이 통째로 없는 경우에도 게이트는 **FAIL 을 찍고 끝나야** 한다 —
   던지고 죽으면 «게이트가 이 버그를 잡는다» 는 것을 증명할 방법이 없다. */
let br = null;
(async () => {
 try {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── ① 소스 — 삭제한 문구의 회귀 방지 ─────────────────────────────────
     주석에 문구를 인용하면 여기서 걸리므로, 검사는 «주석을 뺀» 소스로 한다. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const GONE = [
    ['파밍 반복 문구', '파밍 +'],
    ['«[재도전] 으로…» 안내', '[재도전] 으로'],
    ['보스전 실패 장문', '보스전 실패 ('],
    ['레이드 중단 장문', '기록 저장 안 함'],
    ['던전 중단 장문', '입장 횟수는 소모됩니다'],
    ['«BOSS STAGE n — 30초»', 'BOSS STAGE'],
  ];
  GONE.forEach(([n, t]) => eq('소스 · 삭제 ' + n, code.split(t).length - 1, 0));

  /* 남은 showMsg 호출부 — 인자 원문을 뽑아 형태와 길이를 본다 */
  const calls = [];
  {
    const re = /showMsg\(/g;
    let m;
    while ((m = re.exec(code))) {
      let i = m.index + m[0].length, d = 1, s = '';
      for (; i < code.length && d > 0; i++) {
        const c = code[i];
        if (c === '"' || c === "'" || c === '`') { const q = c; s += c; i++; while (i < code.length && code[i] !== q) { if (code[i] === '\\') { s += code[i]; i++; } s += code[i]; i++; } s += q; continue; }
        if (c === '(') d++;
        if (c === ')') { d--; if (!d) break; }
        s += c;
      }
      calls.push(s.trim());
    }
  }
  /* 160 — 8 → 9. 작업 123(아레나)이 «아레나 중단» 한 줄을 더했다(94 규칙대로 12자 이내).
     214 — 9 → 10. 작업 162 가 «몹 50킬 → 보스 도전 → 보스 격파» 3단계로 나누면서
     **한 줄이던 스테이지 문구가 두 자리로 갈렸다**: `spawnStage()` 는 언제나 `'STAGE ' + s`,
     `'BOSS ' + S.stage` 는 새로 생긴 `startBoss()` 로 이사했다(index.html ~14905·~14918 주석).
     둘 다 94 규칙(짧고 HTML 없음 — 최대 «BOSS 9999» 9자)을 지키므로 **기대값을 현행화**한다.
     ⚠ 위 정규식은 정의부(`function showMsg(t)`)도 함께 센다 — 그래서 «호출부 9 + 정의 1 = 10» 이다.
     맨 숫자만 올리면 다음 부패 때 또 «누가 늘렸나» 를 처음부터 뒤져야 하므로,
     아래 «인자 원문 목록» 두 줄이 그 숫자의 근거다(리터럴 6 + 비리터럴 4). */
  eq('소스 · 남은 showMsg 호출부 수', calls.length, 10);
  /* 문자열 리터럴만으로 된 인자는 «짧게» 규칙을 문자 수로 검산한다(≤ 14자) */
  const lits = calls.filter(c => /^'[^']*'$/.test(c)).map(c => c.slice(1, -1));
  const tooLong = lits.filter(t => t.length > 14);
  eq('소스 · 리터럴 문구 중 14자 초과', tooLong.join(' | ') || 'none', 'none');
  yes('소스 · 리터럴 문구를 실제로 훑었다(≥ 5개)', lits.length >= 5);
  eq('소스 · 남은 리터럴 문구', lits.slice().sort().join('/'),
     /* 160 — «아레나 중단»(작업 123) 추가. 목록은 «어떤 문구가 남아 있는지»의 기록이다. */
     ['던전 중단', '레이드 시작', '레이드 중단', '부활 중...', '승급전 시작', '아레나 중단'].sort().join('/'));
  /* 214 — 리터럴이 아닌 인자(동적 문구·정의부)도 목록으로 못 박는다. 여기가 비어 있으면
     «호출부 수» 단언이 맨 숫자가 되어, 동적 문구가 하나 늘어도 다른 하나가 줄면 조용히 지나간다.
     동적 문구는 «14자» 리터럴 규칙으로 검산할 수 없으므로 **어떤 식이 남아 있는지**로 감시한다. */
  const dyn = calls.filter(c => !/^'[^']*'$/.test(c)).map(c => c.replace(/\s+/g, ' '));
  eq('소스 · 남은 비리터럴 showMsg 인자', dyn.slice().sort().join(' / '),
     [ 't',                    /* 정의부 `function showMsg(t)` — 정규식이 함께 센다 */
       "'STAGE ' + s",         /* spawnStage() — 162 이후 스테이지 시작은 언제나 몹 구간 */
       "'BOSS ' + S.stage",    /* startBoss() — 162 가 여기로 이사시켰다 */
       'msg',                  /* 보스 격파 = 스테이지 클리어(`const msg = 'STAGE CLEAR!'`) */
     ].sort().join(' / '));

  /* data-why 는 이제 캔버스가 아니라 DOM 캡션 */
  eq('소스 · dataset.why 를 showMsg 로 띄우는 곳', (code.match(/showMsg\(el\.dataset\.why/g) || []).length, 0);
  yes('소스 · jzWhy(el, dataset.why) 가 있다', /jzWhy\(el,\s*el\.dataset\.why/.test(code));
  yes('소스 · .jz-why 스타일이 있다', /\.jz-why\s*\{/.test(src));

  /* ── 브라우저 ── */
  /* getImageData 로 캔버스를 훑으므로 file:// 아틀라스에 오염되지 않게 띄운다(verify79·80 과 같은 이유) */
  br = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE);
  /* ⚠ LESSONS 109-③ — «깨진 빌드에서 죽는 게이트는 게이트가 아니다.»
     수정 «전» 빌드에는 msgFit·MSG_* 가 아예 없다. 그것을 waitForFunction 조건에 넣었더니
     게이트가 FAIL 을 찍는 대신 타임아웃으로 통째로 죽었다(음성 테스트에서 실제로 그랬다).
     → 기다리는 조건은 «구·신 양쪽에 다 있는» showMsg 하나로 두고,
       신설 심볼은 아래 ev() 가 «없으면 FAIL 한 줄» 로 바꾼다. */
  await p.waitForFunction(() => typeof showMsg === 'function', null, { timeout: 15000 })
    .catch(e => R.push({ n: '부트 · showMsg 정의', got: 'ERR: ' + String(e.message).split('\n')[0], want: 'ok', pass: false }));
  await p.waitForTimeout(900);

  /* 페이지에서 값을 읽되, 던지면 «FAIL 한 줄» 로 바꾸고 fallback 을 돌려준다.
     이래야 수정 전 빌드에서도 게이트가 끝까지 돌아 «무엇이 없어서 FAIL 인지» 를 전부 보고한다. */
  const ev = async (label, fn, arg, fallback) => {
    try { return await p.evaluate(fn, arg); }
    catch (e) {
      R.push({ n: label, got: 'ERR: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120), want: 'ok', pass: false });
      return fallback;
    }
  };
  const shot = async (label, file) => {
    try { await p.locator('#app').screenshot({ path: path.resolve(__dirname, '../docs/review/' + file) }); }
    catch (e) { console.log('[i] 캡처 건너뜀(' + label + '): ' + String((e && e.message) || e).split('\n')[0]); }
  };

  /* ── ② 연출 상수 ── */
  const K = await ev('런타임 · MSG_* 상수 읽기', () => ({
    inS: MSG_IN, hold: MSG_HOLD, out: MSG_OUT, dur: MSG_DUR,
    fs: MSG_FS, minfs: MSG_MINFS, maxw: MSG_MAXW, dedup: MSG_DEDUP, vw: VW, sc: SC,
  }), null, {});
  eq('상수 · 페이드 인(s)', K.inS, 0.15);
  eq('상수 · 유지(s)', K.hold, 1);
  eq('상수 · 페이드 아웃(s)', K.out, 0.3);
  near('상수 · 총 길이(s)', K.dur, 1.45, 1e-9);
  eq('상수 · 기본 font-size(논리)', K.fs, 28);
  eq('상수 · 축소 하한(논리)', K.minfs, 18);
  eq('상수 · 최대 폭(논리) = VW − 40', K.maxw, K.vw - 40);
  eq('상수 · 중복 무시 창(ms)', K.dedup, 1000);

  /* ── ③ 클램프 계산 — msgFit() 이 폭 안에 넣는가 ── */
  const fit = await ev('런타임 · msgFit() 호출', () => {
    const T = {
      '12자': '스테이지 클리어!',
      '40자': 'x'.repeat(40),
      '80자': 'x'.repeat(80),
      '200자': 'x'.repeat(200),
      '한글장문': '파밍 +1.2KG — [재도전] 으로 보스에 다시 도전 그리고 더 긴 문장이 이어진다',
      '보스전실패': '💀 보스전 실패 (시간 초과) — [재도전] 으로 다시 도전',
    };
    const out = {};
    for (const k in T) {
      const f = msgFit(T[k]);
      ctx.save(); ctx.font = '900 ' + f.fs + 'px sans-serif';
      const w = ctx.measureText(f.t).width;
      ctx.restore();
      out[k] = { fs: f.fs, w: Math.round(w * 100) / 100, cut: f.t !== T[k], t: f.t };
    }
    return out;
  }, null, {});
  /* msgFit 이 없는 빌드에서는 fit 이 {} 다 — 항목이 «없음» 으로 FAIL 나게만 하고 죽지는 않는다 */
  const F = k => fit[k] || { fs: -1, w: 1e9, cut: null, t: '<없음>' };
  ['12자', '40자', '80자', '200자', '한글장문', '보스전실패'].forEach(k => {
    yes('클램프 · ' + k + ' 폭 ≤ ' + K.maxw + ' (실측 ' + F(k).w + ')', F(k).w <= K.maxw);
    yes('클램프 · ' + k + ' font-size ≥ 18 (' + F(k).fs + ')', F(k).fs >= K.minfs);
  });
  yes('클램프 · 200자는 «…» 로 잘린다', /…$/.test(F('200자').t));
  eq('클램프 · 12자는 원문 그대로', F('12자').cut, false);
  eq('클램프 · 12자는 축소하지 않는다', F('12자').fs, 28);

  /* ── ⑤ 파밍 3바퀴 — 중앙 텍스트 0회 (픽셀 테스트 «전» 에: 진짜 step 이 필요하다) ──
     보스전 실패 → 파밍 상태에서 «한 바퀴»(몹 ENEMY_COUNT 킬)를 돌 때마다 step() 의 파밍 분기가 돈다.

     214 — 이 하네스는 162 전까지 «전장을 비우면 = 웨이브 전멸» 이라는 전제로 돌았다.
     162 가 스테이지를 «몹 50킬 → 보스 도전 → 보스 격파» 3단계로 바꾸면서 파밍 보너스
     (index.html ~16530 `if(S.bossFarm){ bonusG = eGold(S.stage)*12*goldMul }`)가
     **`killed >= ENEMY_COUNT` 분기 «안»** 으로 들어갔다. `enemies`/`spawnQ` 만 비우고 `killed` 를
     그대로 0 으로 두면 그 분기가 아니라 «④ 전장이 비었으니 다시 채운다»(queueMobs) 로 빠져
     골드가 0 이다 — `파밍 · 3회 모두 골드는 들어온다` 가 false,false,false 로 굳은 원인이 이것이다.
     실측(`tools/probe214.js`): 실제 킬 경로로 50킬을 채우면 3바퀴 모두 **205 = eGold(10)×12×goldMul**
     가 정확히 들어온다. **지급 누락이 아니라 하네스가 분기에 못 닿은 것**이므로 index.html 은 0줄이고,
     하네스를 162 흐름(진짜 킬)으로 옮긴다.

     비교하는 값도 «> g0»(막연히 늘었나) 에서 **공식과의 일치**로 좁혔다 — 몹 드랍 골드가 섞여
     늘어나기만 해도 통과하던 자리라, 보너스가 통째로 빠져도 초록일 수 있었다(LESSONS 212-② 계열). */
  const farm = await ev('런타임 · 파밍 시뮬레이션', () => {
    const rec = [];
    const orig = showMsg;
    showMsg = t => { rec.push(String(t)); orig(t); };
    const out = { fail: [], waves: [], msgT: [], gold: [], boss: [], first: null, err: '' };
    try {
      S.stage = 10; S.bossFarm = false; promo = null; raidOn = null; dunRun = null;
      player.dead = 0; msgT = 0; msgTxt = ''; msgLast = '';
      spawnStage();                          /* 162 — 스테이지는 언제나 몹 구간부터 */
      /* 한 바퀴 = 실제 킬 경로(killEnemy — S.gold += e.gold 가 지나는 그 함수)로 ENEMY_COUNT 채우기.
         반환값은 그 구간의 msgT 최고치 = «몹 잡는 동안 중앙 문구가 떴는가». */
      const drive = () => {
        let guard = 0, peak = 0;
        while (killed < ENEMY_COUNT && guard++ < 4000) {
          step(0.016);
          if (msgT > peak) peak = msgT;
          while (enemies.length && killed < ENEMY_COUNT) killEnemy(enemies[0]);
        }
        return Math.round(peak * 1000) / 1000;
      };
      /* ① 첫 도전 — 파밍이 아니므로 보너스는 «없어야» 한다(이중 지급 방지, index.html ~16527) */
      drive();
      let g0 = S.gold;
      step(0.016);                           /* killed >= ENEMY_COUNT → 보스 도전 */
      out.first = { bonus: Math.round(S.gold - g0), bossOn: !!bossOn };
      /* ② 보스전 실패 — 문구 0건이어야 한다 */
      rec.length = 0; msgT = 0; msgTxt = ''; msgLast = '';
      bossT = 30; player.dead = 0;
      failBoss('패배');
      out.fail = rec.slice(); out.msgT.push(msgT);
      for (let w = 0; w < 3; w++) {          /* ③ 파밍 한 바퀴 × 3 */
        rec.length = 0; msgT = 0; msgTxt = ''; msgLast = '';
        out.msgT.push(drive());              /* 몹 50킬 구간 — 문구 0건 · msgT 0 유지 */
        out.waves.push(rec.slice());
        g0 = S.gold;
        rec.length = 0;
        step(0.016);                         /* 파밍 분기 진입 */
        const want = eGold(S.stage) * 12 * stat.goldMul;
        out.gold.push(want > 0 && Math.abs((S.gold - g0) - want) < 1e-6);
        out.boss.push(rec.slice().join(' | '));   /* 분기 끝의 startBoss() 가 남기는 문구 */
        bossT = 30; player.dead = 0; failBoss('패배');   /* 다음 바퀴 */
      }
    } catch (e) { out.err = String(e && e.message || e); }
    showMsg = orig;
    /* 상태 원복 */
    try { S.stage = 3; S.bossFarm = false; bossT = 0; bossOn = false; stageWin = false; spawnStage(); msgT = 0; msgTxt = ''; msgLast = ''; }
    catch (e) { out.err = out.err || String(e && e.message || e); }
    return out;
  }, null, { fail: ['<게이트가 읽지 못함>'], waves: [], msgT: [1], gold: [], boss: [], first: null, err: '읽지 못함' });
  eq('파밍 · 시뮬레이션 에러', farm.err || 'none', 'none');
  eq('파밍 · 첫 도전은 보너스 없음(이중 지급 방지)', farm.first ? farm.first.bonus : -1, 0);
  yes('파밍 · 첫 50킬이 보스 도전으로 이어졌다', !!(farm.first && farm.first.bossOn));
  eq('파밍 · 보스전 실패 시 showMsg 호출', farm.fail.join(' | ') || 'none', 'none');
  eq('파밍 · 50킬 구간 showMsg 호출', farm.waves.flat().join(' | ') || 'none', 'none');
  eq('파밍 · 바퀴를 실제로 3회 돌렸다', farm.waves.length, 3);
  eq('파밍 · 3회 모두 보너스 골드가 공식대로 들어온다', farm.gold.join(','), 'true,true,true');
  eq('파밍 · msgT 는 내내 0', farm.msgT.filter(v => v !== 0).length, 0);
  /* 162 이후 파밍 한 바퀴의 끝은 «보스 재도전» 이었고 문구는 startBoss() 의 «BOSS n» 하나였다.
     273(2026-08-27, 주인 지시)으로 **대기 중에는 보스가 자동으로 서지 않으므로** 바퀴 끝에서
     startBoss() 가 돌지 않는다 → 문구는 **0건**이다. 이 절이 지키려는 것은 그대로다:
     94 가 지운 «파밍 +1.2KG — [재도전] 으로…» 류 장문이 되살아나면 여기서 걸린다. */
  eq('파밍 · 바퀴 끝 문구 0건 (273 — 자동 재도전 폐지)', farm.boss.join(' / '), ' /  / ');

  /* ── ⑤-2 남는 문구는 그대로 뜬다 ── */
  const keep = await ev('런타임 · 남는 문구 확인', () => {
    const out = {};
    const shot = (fn) => { msgT = 0; msgTxt = ''; msgLast = ''; fn(); return msgTxt; };
    out.stage = shot(() => { S.stage = 7; S.bossFarm = false; spawnStage(); });
    /* 214 — 옛 단언 `spawnStage()@stage20 → 'BOSS 20'` 은 **판정할 등식을 잃었다**(LESSONS 168-②).
       162 가 «10 스테이지마다 보스» 를 폐기하고 «어느 스테이지든 몹 50킬을 채운 뒤에야 보스» 로
       바꿨으므로, 스테이지 시작(spawnStage)은 20 이든 7 이든 언제나 «STAGE n» 이 맞다.
       지우지 않고 **문구가 실제로 이사한 자리(startBoss)로 옮긴다** — 그래야 «BOSS n» 이
       통째로 사라지는 회귀를 계속 잡는다. */
    out.stage20 = shot(() => { S.stage = 20; S.bossFarm = false; spawnStage(); });
    out.boss = shot(() => { S.stage = 20; S.bossFarm = false; bossOn = false; startBoss(); });
    out.bossOdd = shot(() => { S.stage = 7; S.bossFarm = false; bossOn = false; startBoss(); });
    out.farmStage = shot(() => { S.stage = 20; S.bossFarm = true; spawnStage(); });
    S.stage = 3; S.bossFarm = false; bossT = 0; bossOn = false; stageWin = false; spawnStage(); msgT = 0; msgTxt = ''; msgLast = '';
    return out;
  }, null, {});
  eq('문구 · 일반 스테이지', keep.stage, 'STAGE 7');
  eq('문구 · 스테이지 시작은 20 에서도 «STAGE n»(162 — 10 배수 특례 폐지)', keep.stage20, 'STAGE 20');
  eq('문구 · 보스 도전(startBoss)', keep.boss, 'BOSS 20');
  eq('문구 · 보스 도전은 10 의 배수가 아니어도 뜬다', keep.bossOdd, 'BOSS 7');
  eq('문구 · 파밍 중 보스 스테이지(보스전 아님)', keep.farmStage, 'STAGE 20');

  /* 클리어 문구 — 소스 형태로 검산(스테이지 클리어를 실제로 돌리면 세이브가 흔들린다) */
  /* 160 — 옛 단언은 `msg += ' 💎+' + d`(이모지)였다. 작업 125 가 그 자리를 `curIc('dia')`
     = `<img class="cic" …>` **HTML 문자열**로 바꾸면서 캔버스에 원문이 그려졌고(주인 보고),
     이 단언은 그때부터 죽어 있었다. 이제 «아이콘 없이 낱말 + 수치» 가 정답이다 —
     125 의 «화폐는 이미지 1종» 원칙 때문에 💎 로도 되돌릴 수 없다(verify125 A1 이 잡는다). */
  /* 170(2026-08-27) — 주인 지시로 **클리어 다이아 보상 자체가 폐지**됐다. 160 이 고쳐 둔
     «낱말 다이아» 단언은 감시할 등식을 잃었으므로(LESSONS 168-② SUPERSEDED) 지우지 않고
     **뒤집어 이사**시킨다: 문구는 «STAGE CLEAR!» 한 낱말뿐이고 뒤에 아무것도 안 붙는다. */
  yes('문구 · 클리어는 «STAGE CLEAR!» 뿐 (170 — 다이아 조각 폐지)',
      /const msg = 'STAGE CLEAR!';/.test(code) &&
      !/msg\s*\+=/.test(code.slice(code.indexOf("const msg = 'STAGE CLEAR!';"),
                                   code.indexOf('showMsg(msg)') + 12)));
  eq('문구 · 클리어 문구에 골드 없음', (code.match(/STAGE CLEAR![^\n]*G'/g) || []).length, 0);
  /* 160 — 캔버스 텍스트 싱크(showMsg → fillText · nums → fillText)에 HTML 이 흘러들면
     태그가 «글자» 로 그려진다. 이 싱크로 가는 줄에 아이콘 마크업 생성기가 있으면 실패. */
  {
    const bad = code.split('\n').map((ln, i) => ({ ln, i }))
      .filter(o => /showMsg\(|nums\.push\(|msgTxt\s*=/.test(o.ln))
      .filter(o => /curIc\(|<img|&lt;img/.test(o.ln))
      .map(o => (o.i + 1) + ': ' + o.ln.trim().slice(0, 60));
    eq('문구 · 캔버스 싱크에 HTML 아이콘 0건', bad.join(' | ') || 'none', 'none');
  }
  /* 클리어 문구가 만들어지는 그 블록 자체에도 마크업 생성기가 없어야 한다(위 줄 단위 검사 보강) */
  {
    const blk = code.slice(code.indexOf("const msg = 'STAGE CLEAR!';"));
    eq('문구 · 클리어 블록에 curIc 0건',
       (blk.slice(0, blk.indexOf('showMsg(msg)') + 12).match(/curIc\(/g) || []).length, 0);
  }

  /* ── ③-2 중복 무시 ── */
  const dedup = await ev('런타임 · 중복 무시 확인', async () => {
    msgT = 0; msgTxt = ''; msgLast = ''; msgLastT = -1e9;
    showMsg('STAGE 3'); const a = msgT;
    msgT = 0.4;
    showMsg('STAGE 3'); const b = msgT;            /* 1초 내 같은 문구 → 무시 */
    showMsg('STAGE 4'); const c = msgT;            /* 다른 문구 → 갱신 */
    await new Promise(r => setTimeout(r, 1100));
    msgT = 0.2;
    showMsg('STAGE 4'); const d = msgT;            /* 1초 뒤 같은 문구 → 갱신 */
    msgT = 0; msgTxt = ''; msgLast = '';
    return { a, b, c, d };
  }, null, { a: -1, b: -1, c: -1, d: -1 });
  near('중복 · 첫 호출은 MSG_DUR', dedup.a, 1.45, 1e-9);
  near('중복 · 1초 내 같은 문구는 무시(msgT 유지)', dedup.b, 0.4, 1e-9);
  near('중복 · 다른 문구는 갱신', dedup.c, 1.45, 1e-9);
  near('중복 · 1초 뒤 같은 문구는 갱신', dedup.d, 1.45, 1e-9);

  /* ── ④ 픽셀 — 「문구 없음 / 있음」 차분으로 실제 잉크 bbox 를 낸다 ────────
     월드를 정지시켜(step 스텁) 두 프레임이 문구 말고는 완전히 같게 만든다.
     오라(시간 의존 반경)만 시간에 따라 흔들리는데, 기본 세이브는 'aura' 미장착이라 그려지지 않는다. */
  const auraOff = await ev('런타임 · 오라 상태 읽기', () => !(skillEquipped('aura') && has('aura')), null, false);
  yes('픽셀 · 시간 의존 오라가 꺼져 있다(차분이 결정론적)', auraOff);

  await ev('런타임 · 픽셀 하네스 설치', () => {
    window.__m94 = {};
    __m94.step = step; __m94.cam = camUpdate;
    step = () => {};                                  /* 월드 완전 정지 — msgT 도 우리가 직접 준다 */
    /* 카메라도 멈춘다 — camUpdate() 는 step 밖(loop 본문)에서 돌기 때문에 스텁 하나로는 안 선다.
       첫 회차에 이걸 빼먹었더니 카메라가 목표로 수렴하는 동안 «문구 없음/있음» 두 프레임의
       배경이 통째로 달라져, 짧은 문구의 차분 bbox 가 캔버스 전체(1080×1996)로 나왔다. */
    { const c = camClamp(player.x, player.y); cam.x = c.x; cam.y = c.y; }
    camUpdate = () => {};
    enemies.length = 0; spawnQ.length = 0; shots.length = 0; parts.length = 0;
    nums.length = 0; corpses.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
    pets.length = 0; cam.shake = 0; player.dead = 0; msgT = 0; msgTxt = '';
    __m94.raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    __m94.snap = () => ctx.getImageData(0, 0, cvs.width, cvs.height).data;
    __m94.box = (a, b, thr) => {
      const W = cvs.width;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, mx = 0;
      for (let i = 0, q = 0; i < a.length; i += 4, q++) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        if (d > mx) mx = d;
        if (d > thr) {
          const x = q % W, y = (q / W) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; n++;
        }
      }
      return { x0, y0, x1, y1, n, mx, W, H: cvs.height };
    };
    __m94.shot = async (txt, at) => {
      /* ⚠ 상수는 «수정 후» 빌드에만 있다. 음성 테스트(수정 전 빌드)에서도 이 하네스가 돌아야
         «옛 빌드는 글자가 프레임 밖으로 나간다» 를 픽셀로 증명할 수 있다 → 구 빌드 값으로 폴백. */
      const DUR = (typeof MSG_DUR !== 'undefined') ? MSG_DUR : 1.7;
      const INS = (typeof MSG_IN !== 'undefined') ? MSG_IN : 0;
      msgT = 0; msgTxt = ''; msgLast = (typeof msgLast === 'undefined') ? '' : '';
      await __m94.raf();
      const base = __m94.snap();
      showMsg(txt);
      msgT = (at === undefined) ? (DUR - INS - 0.5) : at;   /* 기본: 유지 구간 */
      await __m94.raf();
      const cur = __m94.snap();
      const r = __m94.box(base, cur, 20);
      msgT = 0; msgTxt = '';
      return r;
    };
  });

  /* 자기 검사 — «문구 없음» 프레임 두 장이 실제로 픽셀 단위로 같은가.
     같지 않으면 아래 차분 bbox 는 문구가 아니라 배경 변화를 재고 있는 것이다. */
  const still = await ev('런타임 · 정지 자기 검사', async () => {
    await __m94.raf(); const a = __m94.snap();
    await __m94.raf(); const b = __m94.snap();
    return __m94.box(a, b, 20);
  }, null, { n: -1 });
  eq('픽셀 · 정지 자기 검사(빈 프레임 2장 차분 픽셀)', still.n, 0);

  const PIX = {
    '12자': '스테이지 클리어!',
    '40자': 'x'.repeat(40),
    '80자': 'x'.repeat(80),
    '200자': 'x'.repeat(200),
    '한글장문': '파밍 +1.2KG — [재도전] 으로 보스에 다시 도전 그리고 더 긴 문장이 이어진다',
  };
  for (const k of Object.keys(PIX)) {
    const b = await ev('픽셀 · ' + k + ' 차분 촬영', t => __m94.shot(t), PIX[k], { n: -1, x0: -1, x1: 1e9, y0: -1, y1: 1e9, W: 1080, H: 1, mx: 0 });
    yes('픽셀 · ' + k + ' 잉크가 실제로 그려졌다(px ' + b.n + ')', b.n > 200);
    yes('픽셀 · ' + k + ' 좌측 여백 ≥ 0 (x0=' + b.x0 + ')', b.x0 >= 0);
    yes('픽셀 · ' + k + ' 우측 여백 ≥ 0 (x1=' + b.x1 + ' / W=' + b.W + ')', b.x1 <= b.W - 1);
    yes('픽셀 · ' + k + ' 상하도 프레임 안 (y ' + b.y0 + '..' + b.y1 + ')', b.y0 >= 0 && b.y1 <= b.H - 1);
    /* 프레임 «턱걸이» 도 잡는다 — 클램프가 도는 한 좌우 여백은 각각 15px 이상 남아야 한다 */
    yes('픽셀 · ' + k + ' 좌우 여백 ≥ 15px (L=' + b.x0 + ' R=' + (b.W - 1 - b.x1) + ')',
        b.x0 >= 15 && (b.W - 1 - b.x1) >= 15);
  }

  /* 회귀 대조 — 클램프가 없었다면 80자는 얼마나 나갔는가(참고값, 판정 아님) */
  const raw = await ev('런타임 · 무클램프 폭 측정', () => {
    ctx.save(); ctx.font = '900 ' + MSG_FS + 'px sans-serif';
    const w = ctx.measureText('x'.repeat(80)).width; ctx.restore();
    return { logical: Math.round(w), device: Math.round(w * SC) };
  }, null, { logical: -1, device: -1 });
  console.log('[i] 클램프 없을 때 80자 폭 = 논리 ' + raw.logical + 'px / 화면 ' + raw.device + 'px (프레임 1080)');

  /* ── ④-2 페이드 램프 — 같은 차분의 최대 |Δ| 로 알파를 잰다 ── */
  const ramp = {};
  for (const [k, at] of [['등장 직후(el=0.00)', 1.45], ['등장 중(el=0.075)', 1.375],
                         ['유지(el=0.50)', 0.95], ['퇴장 중(잔여 0.15)', 0.15], ['퇴장 끝(잔여 0.01)', 0.01]]) {
    const b = await ev('페이드 · ' + k + ' 차분 촬영', t => __m94.shot('STAGE 12', t), at, { mx: -1 });
    ramp[k] = b.mx;
  }
  const hold = ramp['유지(el=0.50)'];
  yes('페이드 · 유지 구간이 가장 진하다(Δ ' + hold + ')', hold >= 150);
  yes('페이드 · 등장 직후는 거의 안 보인다(Δ ' + ramp['등장 직후(el=0.00)'] + ' < 40)', ramp['등장 직후(el=0.00)'] < 40);
  yes('페이드 · 등장 중 < 유지 (' + ramp['등장 중(el=0.075)'] + ' < ' + hold + ')', ramp['등장 중(el=0.075)'] < hold);
  yes('페이드 · 등장 중 > 등장 직후', ramp['등장 중(el=0.075)'] > ramp['등장 직후(el=0.00)']);
  yes('페이드 · 퇴장 중은 유지의 30~75% (' + Math.round(ramp['퇴장 중(잔여 0.15)'] / hold * 100) + '%)',
      ramp['퇴장 중(잔여 0.15)'] > hold * 0.30 && ramp['퇴장 중(잔여 0.15)'] < hold * 0.75);
  yes('페이드 · 퇴장 끝은 거의 안 보인다(Δ ' + ramp['퇴장 끝(잔여 0.01)'] + ' < 40)', ramp['퇴장 끝(잔여 0.01)'] < 40);

  /* 증거 캡처 — 80자 강제 호출(유지 구간) */
  await ev('캡처 · 80자 준비', () => {
    msgT = 0; msgTxt = ''; msgLast = '';
    showMsg('x'.repeat(80)); msgT = MSG_DUR - MSG_IN - 0.5;
  }, null, null);
  await p.waitForTimeout(120);
  await shot('80자', '94-80자클램프.png');
  await ev('캡처 · 한글 장문 준비', () => {
    msgT = 0; msgTxt = ''; msgLast = '';
    showMsg('파밍 +1.2KG — [재도전] 으로 보스에 다시 도전 그리고 더 긴 문장이 이어진다');
    msgT = MSG_DUR - MSG_IN - 0.5;
  });
  await p.waitForTimeout(120);
  await shot('한글장문', '94-한글장문클램프.png');
  await ev('런타임 · 하네스 원복', () => { step = __m94.step; camUpdate = __m94.cam; msgT = 0; msgTxt = ''; msgLast = ''; });

  /* ── ⑥ data-why → DOM 캡션 ────────────────────────────────────────────
     비활성 버튼을 실제로 pointerdown 해서 캡션이 뜨는지, 캔버스는 그대로인지 본다. */
  const why = await ev('런타임 · data-why 시뮬레이션', async () => {
    const out = { err: '' };
    try {
      document.querySelectorAll('.jz-why').forEach(e => e.remove());
      const b = document.createElement('button');
      b.id = '__why94';
      b.textContent = '테스트';
      b.disabled = true;
      b.dataset.why = '보스를 먼저 잡아야 열립니다 — 스테이지 30 이상 필요';
      b.style.cssText = 'position:absolute;left:400px;top:900px;width:280px;height:96px;cursor:pointer';
      document.getElementById('app').appendChild(b);
      msgT = 0; msgTxt = ''; msgLast = '';
      const r = b.getBoundingClientRect();
      b.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      }));
      await new Promise(res => requestAnimationFrame(res));
      const cap = document.querySelector('#fxl .jz-why');
      out.exists = !!cap;
      out.text = cap ? cap.textContent : '';
      out.inFxl = !!(cap && cap.closest('#fxl'));
      out.msgT = msgT;
      out.msgTxt = msgTxt;
      out.shake = b.classList.contains('jz-sh');
      if (cap) {
        const cr = cap.getBoundingClientRect(), ar = document.getElementById('app').getBoundingClientRect();
        const s = ar.width / FRAME_W;
        out.box = {
          x: Math.round((cr.left - ar.left) / s), y: Math.round((cr.top - ar.top) / s),
          w: Math.round(cr.width / s), h: Math.round(cr.height / s),
        };
        out.above = out.box.y + out.box.h <= Math.round((r.top - ar.top) / s);
      }
      /* 좌우 극단 — 프레임 가장자리에서도 캡션이 안 넘치는지 */
      out.edges = [];
      for (const left of [0, 980]) {
        document.querySelectorAll('.jz-why').forEach(e => e.remove());
        b.style.left = left + 'px';
        const rr = b.getBoundingClientRect();
        b.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, composed: true, clientX: rr.left + 4, clientY: rr.top + 4,
        }));
        await new Promise(res => requestAnimationFrame(res));
        const c2 = document.querySelector('#fxl .jz-why');
        const ar2 = document.getElementById('app').getBoundingClientRect();
        const s2 = ar2.width / FRAME_W;
        if (!c2) { out.edges.push({ left, miss: true }); continue; }
        const c2r = c2.getBoundingClientRect();
        out.edges.push({
          left,
          x0: Math.round((c2r.left - ar2.left) / s2),
          x1: Math.round((c2r.right - ar2.left) / s2),
        });
      }
      /* 상단 극단 — 위가 좁으면 아래로 뒤집는다 */
      document.querySelectorAll('.jz-why').forEach(e => e.remove());
      b.style.left = '400px'; b.style.top = '6px';
      const r3 = b.getBoundingClientRect();
      b.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, clientX: r3.left + 10, clientY: r3.top + 10,
      }));
      await new Promise(res => requestAnimationFrame(res));
      const c3 = document.querySelector('#fxl .jz-why');
      const ar3 = document.getElementById('app').getBoundingClientRect();
      const s3 = ar3.width / FRAME_W;
      out.topFlip = c3 ? Math.round((c3.getBoundingClientRect().top - ar3.top) / s3) : -1;
      /* 층위 — #fxl 이 모달보다 위여야 «팝업 위에 뜬다» 가 성립한다 */
      out.zFxl = +getComputedStyle(document.getElementById('fxl')).zIndex;
      out.zModal = +getComputedStyle(document.getElementById('modal')).zIndex;
      b.remove();
      document.querySelectorAll('.jz-why').forEach(e => e.remove());
    } catch (e) { out.err = String(e && e.message || e); }
    return out;
  }, null, { err: '읽지 못함', edges: [], box: null });
  eq('data-why · 시뮬레이션 에러', why.err || 'none', 'none');
  yes('data-why · DOM 캡션이 뜬다', why.exists === true);
  eq('data-why · 캡션 문구', why.text, '보스를 먼저 잡아야 열립니다 — 스테이지 30 이상 필요');
  yes('data-why · 캡션이 #fxl(z60, 팝업 위) 안에 있다', why.inFxl === true);
  yes('data-why · #fxl 이 모달보다 위 (' + why.zFxl + ' > ' + why.zModal + ')', why.zFxl > why.zModal);
  eq('data-why · 캔버스 중앙 문구를 쓰지 않는다(msgT)', why.msgT, 0);
  eq('data-why · 캔버스 중앙 문구를 쓰지 않는다(msgTxt)', why.msgTxt || 'none', 'none');
  yes('data-why · 버튼 흔들림(jz-sh)은 그대로', why.shake === true);
  yes('data-why · 캡션이 버튼 위에 붙는다', why.above === true);
  yes('data-why · 캡션 bbox 가 프레임 안 (x ' + (why.box && why.box.x) + ' w ' + (why.box && why.box.w) + ')',
      !!why.box && why.box.x >= 0 && why.box.x + why.box.w <= 1080);
  (why.edges || []).forEach(e => {
    yes('data-why · 가장자리(left ' + e.left + ') 캡션이 프레임 안 (' + e.x0 + '..' + e.x1 + ')',
        !e.miss && e.x0 >= 0 && e.x1 <= 1080);
  });
  yes('data-why · 프레임 상단에서는 아래로 뒤집는다 (top=' + why.topFlip + ')', why.topFlip > 100);

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 120) : ''), want: '0', pass: errs.length === 0 });
 } catch (e) {
  R.push({ n: '게이트 실행 중 예외', got: String((e && e.stack) || e).split('\n').slice(0, 2).join(' | ').slice(0, 200), want: 'none', pass: false });
 } finally {
  if (br) { try { await br.close(); } catch (_) {} }
  report();
 }
})();
