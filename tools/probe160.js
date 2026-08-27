/* 작업 160 진단·확인 프로브 — 스테이지 클리어 문구가 «캔버스에 그려지는 실제 글자» 인지 본다.
   실행: node tools/probe160.js

   버그(주인 보고 2026-08-27): 스테이지 클리어 메시지가 깨진 원문으로 나온다.
     원인 — `showMsg()` 는 캔버스 텍스트 싱크(`ctx.fillText`)인데, 클리어 문구가
     125 의 `curIc('dia')`(= `<img class="cic" src="assets/ui/cur-dia.svg">` **HTML 문자열**)를
     이어 붙여 «STAGE CLEAR! <img class="cic" …>+80» 이 그대로 그려졌다.

   이 프로브가 보는 것:
     ① 실제 클리어 경로(step 루프)를 태워 `msgTxt` 를 읽는다 — 최고 기록 갱신(first) 케이스.
        170(2026-08-27) — 주인 지시로 **클리어 다이아가 폐지**됐다. 이 프로브의 «다이아 지급 > 0»
        은 감시할 등식을 잃었으므로 지우지 않고 **뒤집어** 둔다(LESSONS 168-②): 지급은 0 이어야 한다.
     ② `msgTxt` 에 `<`·`img`·`svg` 가 0건인지(= 마크업이 글자로 새지 않는지).
     ③ 캔버스 중앙 잉크 bbox 가 프레임 안인지(문구가 길어져도 94 클램프가 먹는지) —
        문구 «없음/있음» 두 프레임의 차분으로 실제 잉크만 잰다(verify94 와 같은 방식).
     ④ 최고 기록 미갱신(first=false) 케이스는 «STAGE CLEAR!» 만 남는지.
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  let br = null;
  try {
    br = await launch(chromium, { args: ['--allow-file-access-from-files'] });
    const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e && e.message || e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(FILE, { waitUntil: 'load' });
    await page.waitForTimeout(1200);

    /* 클리어를 «진짜로» 돌린다.
       ⚠ 170(2026-08-27) 에서 발견 — 이 하네스는 **작업 162 이후 죽어 있었다**: 162 가 «몹 전멸 = 클리어»
       를 «보스 격파 = 클리어» 로 바꾼 뒤로 «전장 비우고 step 한 틱» 은 클리어 분기(`if(stageWin)`)를
       한 번도 태우지 못했다(문구가 빈 문자열로 나오고 다이아 단언이 조용히 무력해졌다).
       이제 162 의 실제 경로대로 굴린다: 50킬 → 보스 도전 → 보스 스폰 → killEnemy → 클리어. */
    const run = async (first) => page.evaluate((first) => {
      arena = null; raidOn = null; dunRun = null; promo = null;
      S.stage = 12;
      S.best = first ? 12 : 999;          /* first = 최고 기록 갱신 — 170 이후에도 지급은 0 이어야 한다 */
      S.bossFarm = false;
      spawnStage();
      player.dead = 0; player.hp = stat.maxHp;
      /* 50킬 — 보스 도전으로 넘어간다 */
      enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      step(0.016);
      /* 보스가 실제로 나올 때까지(스폰 딜레이) */
      for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
      const b = enemies.find(e => e.tk === 'boss');
      msgT = 0; msgTxt = ''; msgLast = ''; msgLastT = -1e9;
      const dia0 = S.dia, gold0 = S.gold;
      if (b) killEnemy(b);               /* 격파 → stageWin 예약 */
      step(0.016);                       /* 다음 프레임에서 클리어 처리 */
      return { txt: msgTxt, diaGain: S.dia - dia0, goldGain: S.gold - gold0,
               stage: S.stage, fired: !!b, msgT };
    }, first);

    const a = await run(true);
    const b = await run(false);

    /* 잉크 bbox — 문구 있는 프레임과 지운 프레임의 차분 */
    const ink = await page.evaluate(async () => {
      const cv = document.querySelector('canvas');
      const g = cv.getContext('2d');
      const snap = () => g.getImageData(0, 0, cv.width, cv.height).data;
      const origStep = window.step, origCam = window.camUpdate;
      /* 월드 정지 — step 뿐 아니라 `camUpdate`(실시간 dt 로 도는 카메라)까지 멈춰야
         두 프레임이 문구 말고 «완전히» 같아진다(verify94 ③ 과 같은 하네스). */
      window.step = () => {}; window.camUpdate = () => {};
      /* 시간축으로 계속 움직이는 것들을 비운다 — 안 비우면 차분이 전장 전체를 태워 문구가 묻힌다 */
      [enemies, shots, parts, nums, corpses, zones, booms, bolts, rings, ghosts, spawnQ]
        .forEach(a => { a.length = 0; });
      /* 170 — 위에서 «진짜 보스 격파» 를 돌리게 고친 뒤로 `cam.shake = 12`(~15548) 가 남아
         두 프레임이 통째로 흔들려 차분이 화면 전체를 태웠다. 흔들림도 0 으로 눕힌다. */
      cam.shake = 0;
      msgT = 0; msgTxt = ''; msgLast = '';
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const off = snap();
      showMsg('STAGE CLEAR!');            /* 170 — 다이아 조각이 사라진 실제 문구 */
      msgT = 1.0;                                   /* 유지 구간(가장 진함) */
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const on = snap();
      window.step = origStep; window.camUpdate = origCam;
      /* 스캔은 «중앙 문구 띠» 로 좁힌다 — step 을 멈춰도 파티클·카메라 등 시간축 연출이
         두 프레임 사이에서 계속 움직여 전장 전체를 차분에 태운다(문구 잉크가 묻힌다). */
      const yA = Math.round(cv.height * 0.35), yB = Math.round(cv.height * 0.60);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
      for (let y = yA; y < yB; y++) for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4;
        if (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]) > 24) {
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return { n, x0, y0, x1, y1, w: cv.width, h: cv.height };
    });

    const bad = (t) => /[<>]|img|svg|cic/i.test(t);
    const rows = [
      ['① 클리어 분기 실제 발화', a.fired && a.stage === 13 ? 'true (stage 12 → 13)' : 'false ← 하네스 부패'],
      ['① 클리어 문구(최고 기록 갱신)', JSON.stringify(a.txt)],
      ['① 다이아 지급', a.diaGain + ' (170 — 0 이어야 한다)'],
      ['① 골드 지급', a.goldGain + ' (>0 이어야 한다)'],
      ['② 문구에 마크업', bad(a.txt) ? '있음 ← 버그' : '0건'],
      ['④ 클리어 문구(기록 미갱신)', JSON.stringify(b.txt)],
      ['④ 문구에 마크업', bad(b.txt) ? '있음 ← 버그' : '0건'],
      ['③ 잉크 픽셀 수', ink.n],
      ['③ 잉크 bbox', 'x ' + ink.x0 + '..' + ink.x1 + ' / y ' + ink.y0 + '..' + ink.y1 + ' (캔버스 ' + ink.w + '×' + ink.h + ')'],
      ['③ 프레임 안', (ink.n > 0 && ink.x0 >= 0 && ink.x1 < ink.w) ? 'true' : 'false'],
      ['콘솔·런타임 에러', errs.length ? errs.join(' | ') : '0'],
    ];
    rows.forEach(([k, v]) => console.log('  ' + k.padEnd(30) + ' → ' + v));
    const ok = a.fired && a.stage === 13 && b.fired
            && a.txt === 'STAGE CLEAR!' && b.txt === 'STAGE CLEAR!'
            && !bad(a.txt) && !bad(b.txt)
            && a.diaGain === 0 && b.diaGain === 0 && a.goldGain > 0
            && ink.n > 0 && ink.x0 >= 0 && ink.x1 < ink.w && !errs.length;
    console.log('\nPROBE160 ' + (ok ? 'OK' : 'BAD'));
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('PROBE160 ERROR ' + (e && e.message || e));
    process.exit(2);
  } finally { if (br) await br.close(); }
})();
