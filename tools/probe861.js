#!/usr/bin/env node
/* 861 재현 — `verify429` [E4] «보유 효과» 알약 1건 실패(49/50)의 갈래를 가른다.
 *
 *   node tools/probe861.js   →  마지막 줄이 `PROBE861 n/n PASS` 여야 한다.
 *
 * 등재문(PROGRESS 861)이 갈래를 둘로 세워 놓고 «재현으로 먼저 가르라»(338 규칙) 고 했다:
 *   ⓐ **제품이 실제로 칸마다 같은 값을 그린다**(제품 버그)
 *   ⓑ **자가 옛 표기 규약을 물고 있다**(게이트 부패 — 725 «%» → «×N배» · 724 보유 효과 합연산)
 *
 * [E4] 의 판정식은 `D.own.every(t => /\+/.test(t))` 한 줄이다. 즉 «수치를 든다» 를 묻는다면서
 * 실제로 세는 것은 **더하기 기호 한 글자**다 — 140 교훈(«A 를 물으려고 B 를 세면 A 가 아니라
 * B 가 바뀔 때 죽는다») 이 말하는 **대리 지표**다. 725 가 효과 표기를 «+15%» → «×1.15배» 로
 * 전면 전환하면서 그 한 글자가 프로젝트에서 사라졌고, 알약은 내내 제 수치를 들고 있었다.
 *
 * 검사 항목:
 *   [1] 재현 — 유물 10종 전수에서 알약 텍스트에 `+` 가 **0칸**(= [E4] 가 빨간 그 값 그대로).
 *   [2] ⓑ 의 증거 ① — 그런데 알약은 **칸마다 수치를 든다**: 10칸 전부 숫자를 들고 있고,
 *       그 문자열이 제품 상수에서 나온 기대값(`RELIC_EFF[eff] + ' ' + fmtEff(relicVal(it))`)과
 *       **글자 하나까지 같다**. ⇒ ⓐ(제품이 같은 값을 그린다)가 기각된다.
 *   [3] ⓑ 의 증거 ② — 알약이 **칸마다 다르다**: 서로 다른 값을 가진 칸 쌍은 실제로 다른
 *       문자열을 그린다(«수치를 그대로 든다» 의 본뜻). 종끼리 값이 같은 칸이 있으면 그건
 *       제품이 정말 같은 값인 것이고, 그 사실도 같이 찍는다.
 *   [4] ⓑ 의 증거 ③ — `+` 가 사라진 것이 **725 의 표기 규약**임을 소스로 못박는다:
 *       `fmtEff` 는 `fmtMul(1+v)` 이고 `fmtMul` 은 «×» + `mulNum` + «배» 다. 이 한 벌을
 *       지나는 한 «+» 는 어느 칸에서도 안 나온다(`fmtMulStep` 은 «증분» 자리 전용이라 다르다).
 *   [5] 되돌림 시험 — 새 판정이 **헛초록이 아님**을 못박는다:
 *       R1 알약을 «칸마다 같은 상수 문자열» 로 갈아 끼우면 [2]·[3] 의 탐지기가 **빨개진다**
 *          (= ⓐ 였다면 이 자가 실제로 잡는다).
 *       R2 알약에서 숫자를 통째로 빼면 «수치를 든다» 축이 **빨개진다**.
 *       R3 옛 표기(`+15%`)를 주입하면 [1] 의 탐지기가 그것을 **본다**(문자열이 원래 없어서
 *          0칸인 게 아니다 — 탐지기가 실제로 «+» 를 센다).
 *
 * ⚠ 이 자는 **수리 뒤에도 그대로 돈다**(756 규약). 되돌림 사본은 파일이 아니라 메모리 위에서
 *   만든다 — 알약 노드의 텍스트만 갈아 끼우고 원상 복구한다(제품 파일은 안 건드린다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ── 표본 — 유물 10종을 소환 경로로 보유시키고 칸마다 알약을 읽는다 ─────────── */
  const D = await page.evaluate(() => {
    closeModal();
    S.relic = 1e7;
    for (let i = 0; i < 400 && RELICS.some((r) => !has(r.id)); i++) summonRelic(true);
    const rows = [];
    for (const r of RELICS) {
      showItem(r.id);
      const b = document.querySelector('#mbox .sk-ow .v b');
      rows.push({
        id: r.id, eff: r.eff, lv: oLv(r.id),
        /* 제품이 그린 것 */
        txt: b ? b.textContent : null,
        /* 제품 상수에서 다시 만든 기대값 — 자가 손으로 적은 문자열이 아니다 */
        exp: RELIC_EFF[r.eff] + ' ' + fmtEff(relicVal(r)),
        val: relicVal(r)
      });
      closeModal();
    }
    return rows;
  });

  console.log('[1] 재현 — [E4] 가 세는 «+» 가 유물 10종 전수에서 몇 칸인가');
  const plus = D.filter((r) => r.txt && /\+/.test(r.txt)).length;
  ok(plus === 0, '[1] «+» 를 든 칸이 0칸이다 (= [E4] 가 빨간 그 값)',
    plus + '/' + D.length + '칸 · 표본 «' + D[0].txt + '»');

  console.log('\n[2] 갈래 ⓐ 기각 — 알약은 제품 상수에서 나온 제 수치를 글자까지 그대로 든다');
  const num = D.filter((r) => r.txt && /\d/.test(r.txt)).length;
  ok(num === D.length, '[2-a] 칸마다 숫자를 든다', num + '/' + D.length + '칸');
  const same = D.filter((r) => r.txt === r.exp).length;
  ok(same === D.length, '[2-b] 그 문자열이 `RELIC_EFF[eff] + fmtEff(relicVal)` 와 글자까지 같다',
    same + '/' + D.length + '칸');
  const badExp = D.filter((r) => r.txt !== r.exp);
  if (badExp.length) badExp.forEach((r) => console.log('    ⚠ ' + r.id + ': 제품 «' + r.txt + '» ↔ 기대 «' + r.exp + '»'));

  console.log('\n[3] 갈래 ⓐ 기각(2) — 값이 다른 칸은 실제로 다른 문자열을 그린다');
  let pairs = 0, bad3 = 0;
  for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
    const a = D[i], b = D[j];
    if (a.eff !== b.eff || Math.abs(a.val - b.val) < 1e-12) continue;
    pairs++;
    if (a.txt === b.txt) { bad3++; console.log('    ⚠ ' + a.id + ' ↔ ' + b.id + ' 가 같은 «' + a.txt + '»'); }
  }
  ok(bad3 === 0, '[3-a] 같은 효과·다른 값인 칸 쌍이 같은 문자열을 그리지 않는다',
    '쌍 ' + pairs + '개 검사 · 겹침 ' + bad3 + '건');
  const uniq = new Set(D.map((r) => r.txt)).size;
  ok(uniq > 1, '[3-b] 10칸이 «한 문자열» 로 뭉개져 있지 않다', '서로 다른 문자열 ' + uniq + '가지');
  D.forEach((r) => console.log('    ' + r.id.padEnd(9) + ' Lv.' + String(r.lv).padEnd(4) + '«' + r.txt + '»'));

  console.log('\n[4] 갈래 ⓑ 확정 — «+» 가 사라진 것은 725 의 표기 한 벌 때문이다');
  const F = await page.evaluate(() => ({
    eff:  String(fmtEff(0.15)),          /* 옛 표기라면 «+15%» */
    mul:  String(fmtMul(1.15)),
    step: String(fmtMulStep(0.02)),      /* «증분» 자리 전용 — 여기만 «+» 를 쓴다 */
    pct:  typeof pct === 'function' ? String(pct(0.15)) : null
  }));
  ok(/^×/.test(F.eff) && /배$/.test(F.eff) && !/\+/.test(F.eff),
    '[4-a] `fmtEff(0.15)` 가 «×N배» 다 — 어느 칸을 지나도 «+» 가 안 나온다', F.eff);
  ok(F.eff === F.mul, '[4-b] `fmtEff(v)` = `fmtMul(1+v)` — 표기 규칙이 한 벌이다',
    F.eff + ' = ' + F.mul);
  ok(/^\+/.test(F.step), '[4-c] «+» 는 725 가 증분 자리(`fmtMulStep`)에만 남겼다', F.step);

  console.log('\n[5] 되돌림 시험 — 새 판정이 헛초록이 아니다');
  /* ⚠ 되돌림 사본은 **그려진 알약 노드**에 만든다 — `relicVal`·`fmtEff` 는 최상위 `const` 라
     `window` 에 안 실린다(대입해도 클로저는 옛 것을 계속 부른다 · 실측으로 확인했다).
     자가 읽는 자리(`#mbox .sk-ow .v b` 의 텍스트)를 갈아 끼우고 **같은 독자**로 다시 읽으면
     «탐지기가 그 그림을 실제로 보는가» 를 정확히 그 자리에서 묻게 된다. 제품 파일은 안 건드린다. */
  const R = await page.evaluate(() => {
    const out = {};
    /* inject: 칸 번호를 받아 그 칸에 그릴 문자열을 돌려준다(null 이면 제품 그대로) */
    const read = (inject) => {
      const rows = [];
      RELICS.forEach((r, i) => {
        showItem(r.id);
        const b = document.querySelector('#mbox .sk-ow .v b');
        const exp = RELIC_EFF[r.eff] + ' ' + fmtEff(relicVal(r));
        if (b && inject) { const s = inject(i, r); if (s !== null) b.textContent = s; }
        rows.push({ txt: b ? b.textContent : null, exp });
        closeModal();
      });
      return rows;
    };
    /* R1 — «칸마다 같은 상수» 로 갈아 끼운다(ⓐ 였다면 나오는 그림) */
    const r1 = read(() => '공격력 ×1.15배');
    out.r1uniq = new Set(r1.map((x) => x.txt)).size;      /* 1 이면 «한 문자열로 뭉갰다» */
    out.r1exp  = r1.filter((x) => x.txt === x.exp).length;
    /* R2 — 숫자를 통째로 뺀다 */
    const r2 = read(() => '공격력 상승');
    out.r2num = r2.filter((x) => /\d/.test(x.txt)).length;
    /* R3 — 옛 표기(«+15%»)를 주입한다 */
    const r3 = read((i, r) => RELIC_EFF[r.eff] + ' +15%');
    out.r3plus = r3.filter((x) => /\+/.test(x.txt)).length;
    /* R4 — **한 칸만** 수치를 어긋낸다(가장 얕은 오염 — [2-b] 가 이걸 잡아야 한다).
       ⚠ 흔들기 폭은 «+0.001» 같은 미세량으로 잡으면 안 된다 — `mulNum` 은 크기대로 자릿수를
         줄이므로(10 이상이면 소수 2자리) 그 폭이 반올림에 통째로 먹혀 **주입했는데 같은 글자**가
         나온다(실측으로 밟았다). `v*2+1` 은 어느 크기에서도 표시가 달라진다. */
    const r4 = read((i, r) => i === 3 ? RELIC_EFF[r.eff] + ' ' + fmtEff(relicVal(r) * 2 + 1) : null);
    out.r4exp  = r4.filter((x) => x.txt === x.exp).length;
    out.r4diff = r4[3].txt !== r4[3].exp;      /* 전제 — 주입이 실제로 다른 글자를 만들었는가 */
    /* 원상 복구 확인 */
    const back = read(null);
    out.backOk = back.filter((x) => x.txt === x.exp).length;
    out.backN  = back.length;
    return out;
  });
  ok(R.r1uniq === 1 && R.r1exp === 0,
    '[5-R1] 전 칸을 같은 문자열로 갈면 [3-b] «한 문자열» 과 [2-b] «기대값 일치» 가 둘 다 빨개진다',
    '서로 다른 문자열 ' + R.r1uniq + '가지 · 기대값과 같은 칸 ' + R.r1exp + '칸');
  ok(R.r2num === 0, '[5-R2] 숫자를 빼면 [2-a] 의 «수치를 든다» 축이 빨개진다',
    '숫자를 든 칸 ' + R.r2num + '칸');
  ok(R.r3plus === 10, '[5-R3] 옛 표기(«+15%»)를 주입하면 [1] 의 탐지기가 실제로 «+» 를 본다',
    R.r3plus + '/10칸');
  ok(R.r4diff, '[5-R4 전제] 주입이 실제로 다른 글자를 만들었다(반올림에 먹히지 않았다)');
  ok(R.r4exp === 9, '[5-R4] 한 칸만 수치를 어긋내도 [2-b] 가 그 한 칸을 잡는다',
    '기대값과 같은 칸 ' + R.r4exp + '/10칸');
  ok(R.backOk === R.backN, '[5-R5] 되돌림 뒤 제품이 원래 값으로 돌아온다(그려진 노드만 건드렸다)',
    R.backOk + '/' + R.backN + '칸');

  ok(errs.length === 0, '[H1] 콘솔·페이지 에러 0건', errs.length + '건'
    + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));

  await browser.close();
  console.log('\nPROBE861 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
