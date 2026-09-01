/* 작업 732 재현기 — `tools/verify58.js` [7] 델타항 · [8] 세 씬 토큰이 왜 빨간가.
 *
 * 등재문(sess-1625-22108, 684·685 회귀 스윕 곁다리)은 두 갈래를 열어 두었다:
 *   ⓐ 게이트 부패 — 659·660 이 «숫자 플로터» 를 폐지한 뒤 자만 옛 표본을 아직 찾는다
 *   ⓑ 실재 회귀 — 아직 플로터를 쓰는 자리가 있는데 그것까지 같이 죽었다
 * 338 규칙대로 **처방 전에 제품에게 묻는다.** 자를 한 줄도 안 고친 상태에서 답이 나와야 한다.
 *
 * 묻는 것 (694 가 verify93 에서 쓴 표와 같은 꼴 — 짝 작업이라 대조가 되게 맞췄다)
 *   [1] 씬 C(23 훈련 카드)는 **났는가** — 연출이 아니라 «판정»(골드 지출)에서 읽는다.
 *       없으면 «플로터 0장» 이 «씬이 안 났다» 와 구별되지 않는다.
 *   [2] 씬 C 의 «+n» 플로터 표본 수 — 등재문의 «0장» 확인
 *   [3] 그 자리를 무엇이 대신하는가 — 660 이 세운 아이콘 버스트(`.fx-spark.fx-cic`) 알 수·화폐 신원
 *   [4] 부품 `.fx-plus` 자체는 살아 있는가 — 씬 A(전투 발)·씬 B(퀘스트 수령)
 *   [5] 델타 부품(`.fx-plus.fx-delta`)은 살아 있는가 — 50 코스튬 [강화]
 *   [6] 소스 — 훈련 두 호출부가 `fxUpOk` 의 셋째 인자(txt)에 무엇을 넘기는가
 *   [7] 소스 — 델타를 아직 넘기는 호출부는 어디인가
 *
 * 실행: node tools/probe732.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m + (d ? ' — ' + d : '')); } else { fail++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };

/* 씬 하나를 세우고 트리거 뒤 span 동안 훑어 «무엇이 떴는가» 를 돌려준다.
   verify58 의 하네스와 같은 정착 규칙·같은 씨앗을 쓴다 — 다른 것을 재면 대조가 안 된다. */
async function run(scene, span) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, 20260828);
  await p.goto(URL);
  await p.waitForTimeout(1100);

  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, scene);
  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(400); }
  if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(400); }
  if (scene === 'cos') {
    /* 694 가 verify93 에 세운 씬 D 와 같은 세팅. 클릭은 한 번의 evaluate 안에서 query+click 한다 —
       `renderCos()` 가 `#bCos.innerHTML` 을 갈아끼우면 핸들이 detach 된다(LESSONS 25-⑤). */
    await p.evaluate(() => {
      S.stone = 1e12;
      const a = AVATARS[0].id;
      S.avatars = S.avatars || {}; S.avatars[a] = 1; S.avatar = a;
      goTab('hero'); heroSubGo('cos');
    });
    await p.waitForTimeout(450);
    await p.evaluate(() => { const c = document.querySelector('#bCos [data-cosit]'); if (c) c.click(); });
    await p.waitForTimeout(300);
  }
  if (scene === 'gain') {
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  }
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash').length
      + '|' + (document.getElementById('goldN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const out = await p.evaluate(async ({ sc, span }) => {
    const t0 = performance.now();
    /* «강화가 실제로 일어났나» 는 연출이 아니라 판정에서 읽는다(씬 C 골드 · 씬 D 강화석) */
    const pay0 = sc === 'cos' ? S.stone : S.gold;
    if (sc === 'gain') {
      fxAt({ x: 1040, y: 400 }, 'combat'); S.gold += 128000;
    } else if (sc === 'quest') {
      const b = document.getElementById('qAll'); if (b) b.click();
    } else if (sc === 'cos') {
      const b = document.querySelector('#bCos [data-cosup]'); if (b) b.click();
    } else {
      const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      }
    }
    let plusMax = 0, plusFs = null, deltaMax = 0, cicMax = 0, sparkMax = 0, flashMax = 0;
    const cicCur = new Set();
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const plus = document.querySelectorAll('.fx-plus');
        if (plus.length > plusMax) plusMax = plus.length;
        if (plus.length && plusFs === null) plusFs = parseFloat(getComputedStyle(plus[0]).fontSize);
        deltaMax = Math.max(deltaMax, document.querySelectorAll('.fx-plus.fx-delta').length);
        const cic = document.querySelectorAll('.fx-spark.fx-cic');
        cicMax = Math.max(cicMax, cic.length);
        for (const c of cic) { const i = c.querySelector('img.cic'); if (i && i.dataset.curIc) cicCur.add(i.dataset.curIc); }
        sparkMax = Math.max(sparkMax, document.querySelectorAll('.fx-spark:not(.fx-cic)').length);
        flashMax = Math.max(flashMax, document.querySelectorAll('.fx-flash').length);
        if (t >= span) return res();
        setTimeout(tick, 20);
      };
      tick();
    });
    return { plusMax, plusFs, deltaMax, cicMax, cicCur: [...cicCur], sparkMax, flashMax,
      paid: pay0 - (sc === 'cos' ? S.stone : S.gold) };
  }, { sc: scene, span });

  await b.close();
  return out;
}

(async () => {
  console.log('PROBE732 — verify58 [7]·[8] 이 무엇을 놓쳤나\n');

  const upg = await run('upg', 900);
  const gain = await run('gain', 1200);
  const quest = await run('quest', 1500);
  const cos = await run('cos', 1000);

  console.log('[1] 씬 C(23 훈련 카드)는 났는가 — 연출이 아니라 «판정»(골드 지출)에서 읽는다');
  ok(upg.paid > 0, '훈련 강화로 골드가 나갔다', '지출 ' + upg.paid);
  ok(upg.flashMax >= 1, '흰 플래시가 났다 — 씬 자체는 정상이다', flashMax(upg));

  console.log('\n[2] 씬 C 의 «+n» 플로터 — 등재문의 «0장» 확인');
  ok(upg.plusMax === 0, '씬 C «+n» 플로터 **0장**', '표본 최대 ' + upg.plusMax + '장');

  console.log('\n[3] 그 자리를 무엇이 대신하는가 — 660 이 세운 재화 아이콘 버스트');
  ok(upg.cicMax >= 3, '`.fx-spark.fx-cic` 버스트가 뜬다', upg.cicMax + '알');
  ok(upg.cicCur.length === 1 && upg.cicCur[0] === 'gold',
    '그 버스트의 화폐 신원이 `gold` 하나다 (660 — 훈련 = 골드)', '[' + upg.cicCur.join(',') + ']');
  ok(upg.sparkMax === 0, '옛 앰버 방사형 불꽃(`.fx-spark` 비-cic)은 0개 — 겹쳐 쏘지 않는다',
    upg.sparkMax + '개');

  console.log('\n[4] 부품 `.fx-plus` 자체는 살아 있는가 — 씬 A·씬 B');
  ok(gain.plusMax >= 1, '씬 A(전투 발) «+n» 이 뜬다', gain.plusMax + '장 · ' + gain.plusFs + 'px');
  ok(quest.plusMax >= 1, '씬 B(퀘스트 수령) «+n» 이 뜬다', quest.plusMax + '장 · ' + quest.plusFs + 'px');

  console.log('\n[5] 델타 부품(`.fx-plus.fx-delta`)은 살아 있는가 — 50 코스튬 [강화]');
  ok(cos.paid > 0, '코스튬 강화가 실제로 났다 (강화석 지출)', '지출 ' + cos.paid);
  ok(cos.deltaMax >= 1, '씬 D 델타 «+n» 이 뜬다 — 부품은 안 죽었다',
    cos.deltaMax + '장 · ' + cos.plusFs + 'px');

  console.log('\n[6][7] 소스 — 누가 `fxUpOk` 의 셋째 인자(txt)를 넘기는가');
  const raw = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'latin1');
  /* ⚠ 1회차 함정 — 주석을 안 걷으면 «호출부» 가 부풀어 답이 뒤집힌다. 이 파일은 `fxUpOk` 를
     **주석에서 네 번** 인용한다(31036 종전 한 줄 인용 · 35138·35268 설명 · 34955 머리말) —
     걷기 전 11곳 → 걷은 뒤 7곳이다. 줄 번호가 어긋나면 위치 대조가 무의미하므로
     주석 자리는 **같은 길이의 공백**으로 덮고 줄바꿈은 남긴다. */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, ' '))
                 .replace(/\/\/[^\n]*/g, (s) => s.replace(/[^\n]/g, ' '));
  const calls = [];
  const re = /fxUpOk\(/g; let m;
  while ((m = re.exec(src))) {
    if (/function\s+fxUpOk\($/.test(src.slice(Math.max(0, m.index - 20), m.index + 7))) continue;
    let i = m.index + 7, d = 1, s = '';
    while (i < src.length && d > 0) { const ch = src[i]; if (ch === '(') d++; else if (ch === ')') d--; if (d > 0) s += ch; i++; }
    calls.push({ line: src.slice(0, m.index).split('\n').length, args: s });
  }
  const argAt = (s, k) => { let d = 0, cur = '', out = []; for (const ch of s) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out[k]; };
  const withTxt = calls.filter(c => { const a = argAt(c.args, 2); return a && a !== 'null' && a !== 'undefined'; });
  const trainCalls = calls.filter(c => /PAY_CUR\.train|bi0\.cur/.test(c.args));
  console.log('      호출부 ' + calls.length + '곳 · 텍스트를 넘기는 곳 ' + withTxt.length + '곳: '
    + withTxt.map(c => c.line).join('·'));
  ok(trainCalls.length === 2 && trainCalls.every(c => argAt(c.args, 2) === 'null'),
    '훈련 두 호출부의 셋째 인자가 `null` 이다 — 660 주석 «숫자 플로터 폐지» 와 일치',
    trainCalls.map(c => c.line + ':' + argAt(c.args, 2)).join(' · '));
  ok(withTxt.length >= 1 && withTxt.every(c => /cosLvOf/.test(c.args)),
    '텍스트를 넘기는 호출부는 **코스튬뿐**이다 — 델타가 살아 있는 유일한 자리',
    withTxt.map(c => c.line).join('·'));

  console.log('\n⇒ 판정: ' + (upg.paid > 0 && upg.plusMax === 0 && upg.cicMax >= 3 && cos.deltaMax >= 1
    ? 'ⓐ **게이트 부패**. 제품은 660 대로 옳고, 자만 폐지된 표본을 아직 찾는다.'
    : 'ⓑ 실재 회귀 의심 — 위 표를 보라.'));
  console.log('\nPROBE732 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();

function flashMax(h) { return h.flashMax + '장'; }
