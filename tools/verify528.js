#!/usr/bin/env node
/* 528 검증 — 「하네스가 소환 만렙을 손으로 적지 않는다」 래칫 + 되돌림 시험
 *
 *   node tools/verify528.js
 *
 * 왜 자를 새로 놓나: 528 이 고친 다섯 자리는 **지금은 초록이었다**. 빨간 자를 고친 것이 아니라
 * «만렙이 바뀌는 날 조용히 뜻을 잃는» 자리를 닫은 것이라, 같은 병이 다시 들어와도 아무 자도
 * 빨개지지 않는다(115 → 196 → 496 을 지나며 실제로 두 세대를 그렇게 지나왔다 — 522 §5).
 * ⇒ 이 자는 «값» 이 아니라 **«형태»** 를 지킨다.
 *
 *   [A] 소스 래칫 — 하네스(`tools/*.js` · 저장소 루트 `*.js`)에 **만렙 이상의 수를 손으로 적은**
 *                   `openProbInfo(bank, N)` · `S.sum[b].lv = N` · `S.sumLv = N` 이 0건이다.
 *                   허용 목록은 **이유와 함께** 적고, 그 자리가 사라지면 목록 쪽이 빨개진다(334 처방).
 *   [B] 실동작    — `openProbInfo(bank, SUM_MAXLV)` 가 실제로 MAX 단계를 연다(85 [G0]·106 [E7-a] 의 뿌리).
 *   [R] 되돌림    — 만렙을 올린 사본에서 «옛 형태(리터럴 100)» 와 «새 형태(SUM_MAXLV)» 가 **갈린다**.
 *                   이 절이 없으면 [A] 는 «숫자를 안 적었다» 만 말하고 그것이 왜 중요한지는 못 말한다.
 *
 * ⚠ 제품(`index.html`)은 한 줄도 안 고친다. [R] 은 `const SUM_MAXLV = …;` 한 줄만 갈아 끼운 사본을
 *    저장소 루트에 잠깐 뽑아 쓰고 끝나면 지운다(360·367·438·439·453·467·471·541 선례 — /tmp 에 두면
 *    index.html 이 상대 경로로 무는 `assets/**` 가 통째로 404 다).
 */
const fs   = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const IDX  = path.join(ROOT, 'index.html');
const COPY = path.join(ROOT, `.v528-max-${process.pid}.html`);
const url  = f => 'file://' + f.replace(/\\/g, '/');
const BIG  = 150;                     /* [R] 의 «만렙이 100 이상으로 오른 날» */

let pass = 0, fail = 0;
const ok = (b, name, got) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (got ? ' — ' + got : '')); b ? pass++ : fail++; };

/* ── 허용 목록 — «만렙 이상» 이지만 그것이 **묻는 것 자체**인 자리.
      숫자만 적지 말고 이유를 적는다. 자리가 사라지면 A3 이 빨개져 목록을 치우게 한다. */
const ALLOW = [
  { file: 'tools/verify109.js', n: 999,
    why: '109 ⑤ — «무슨 수를 넣어도 마지막 단계» 를 묻는 의도적 초과 표본이라 만렙과 무관해야 한다' },
  { file: 'tools/probe522.js',  n: 75,
    why: '522 재현기 — «옛 하네스가 박아 둔 숫자» 를 일부러 그대로 재현한다(고치면 재현이 사라진다)' },
  { file: 'tools/probe522.js',  n: 100,
    why: '522 재현기 ⓑ — 옛 ⑩ 이 소환 레벨에 100 을 직접 대입해 load() 클램프에 깎이는 것을 재현한다(같은 이유)' }
];

/* 주석을 걷어낸다. `//` 는 `file://`·`https://` 를 자르지 않도록 앞에 «:» 가 없을 때만 자른다.
   ⚠ 문자열 안까지는 안 걷는다(따옴표 파싱은 이 자보다 큰 물건이 된다) — 그래서 **설명문에
      패턴을 그대로 적지 마라**. 이 파일 자신도 스캔 대상이라 허용 목록의 `why` 에 대입문을
      그대로 쓰면 자기 자신을 잡는다(1회차에 실제로 그랬다). 값은 숫자만 말로 적는다. */
const strip = src => src
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

const PAT = [
  { re: /openProbInfo\s*\(\s*(['"])[A-Za-z]+\1\s*,\s*(\d+)\s*\)/g, g: 2, what: 'openProbInfo(bank, N)' },
  { re: /(?:S\.sum(?:\.\w+|\[[^\]]+\])\.lv|S\.sumLv)\s*=\s*(\d+)/g, g: 1, what: 'S.sum[b].lv = N' }
];

(async () => {
  /* ── [A] 소스 래칫 ───────────────────────────────────────────────────────────────── */
  const src = fs.readFileSync(IDX, 'utf8');
  const mMax = src.match(/const SUM_MAXLV\s*=\s*(\d+);/);
  ok(!!mMax, 'A0 전제 — 제품에서 만렙 선언 한 줄을 찾았다', mMax ? mMax[0] : '못 찾음');
  const MAX = mMax ? Number(mMax[1]) : 0;

  const files = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => f.endsWith('.js')).map(f => 'tools/' + f)
    .concat(fs.readdirSync(ROOT).filter(f => f.endsWith('.js')));
  const hits = [];
  for (const rel of files) {
    const code = strip(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const lines = code.split('\n');
    lines.forEach((line, i) => {
      for (const p of PAT) {
        p.re.lastIndex = 0;
        let m;
        while ((m = p.re.exec(line))) {
          const n = Number(m[p.g]);
          if (n >= MAX) hits.push({ rel, ln: i + 1, n, what: p.what, txt: m[0] });
        }
      }
    });
  }
  const allowed = h => ALLOW.some(a => a.file === h.rel && a.n === h.n);
  const bad = hits.filter(h => !allowed(h));
  ok(hits.length > 0, 'A1 전제 — 자가 실제로 자리를 찾아낸다(스윕이 헛돌면 A2 가 공짜로 초록이다)',
     '전체 ' + hits.length + '건(만렙 ' + MAX + ' 이상) · 파일 ' + files.length + '개 스캔');
  ok(bad.length === 0, 'A2 하네스에 «만렙 이상의 수를 손으로 적은» 자리 0건',
     bad.length ? bad.map(h => h.rel + ':' + h.ln + ' ' + h.txt).join(' · ') : '없음');
  ALLOW.forEach(a => ok(hits.some(h => h.rel === a.file && h.n === a.n),
     'A3 허용 목록이 살아 있다 — ' + a.file + ' 의 ' + a.n,
     a.why));
  /* 528 이 고친 다섯 자리는 이름으로도 못박는다 — 되돌아오면 A2 와 함께 여기가 빨개진다 */
  ['tools/verify85.js', 'tools/verify106.js'].forEach(rel => {
    const code = strip(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    ok(/openProbInfo\s*\(\s*['"][A-Za-z]+['"]\s*,\s*SUM_MAXLV\s*\)/.test(code)
       && /\.lv\s*=\s*SUM_MAXLV/.test(code) === (rel === 'tools/verify85.js'),
       'A4 ' + rel + ' 이 만렙을 제품에서 읽는다(openProbInfo · lv 대입)',
       rel === 'tools/verify85.js' ? 'openProbInfo(…, SUM_MAXLV) · S.sum[b].lv = SUM_MAXLV'
                                   : 'openProbInfo(…, SUM_MAXLV)');
  });

  /* ── [B]·[R] 실동작 ──────────────────────────────────────────────────────────────── */
  const browser = await launch(chromium);
  const open = async f => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.goto(url(f));
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProbInfo === 'function');
    await page.waitForTimeout(400);
    return page;
  };
  /* 두 형태를 같은 자로 잰다 — 판정식을 베끼지 않고 제품이 그린 결과(단계 라벨·행)를 읽는다 */
  const read = lit => {
    const shot = () => { const h = document.getElementById('prbList').innerHTML;
      return { lv: document.getElementById('prbLv').textContent, imm: /불멸/.test(h),
               rows: document.querySelectorAll('#prbList .prb-row').length,
               heads: document.querySelectorAll('#prbList .prb-gh').length }; };
    /* 773 — 기대하는 «등급 수 · 행 수» 도 손 상수가 아니라 제품에서 파생한다(probe528 과 같은 식).
       757 이 확률표를 그 배너가 파는 종까지 자른 뒤 펫 8등급/36행이 7등급/35행이 됐고,
       자만 옛 수에 굳어 [B1]·[R3] 이 빨갰다. 표(rollOf)와 종 목록에게 직접 묻는다. */
    const specOf = b => { const tab = rollOf(b), gs = new Set(BANNERS[b].list.map(x => x.g));
      return { heads: [...gs].filter(g => g < tab.length).length,
               rows:  BANNERS[b].list.filter(x => x.g < tab.length).length,
               gated: tab.some(g => g.unlock > lit) }; };
    openProbInfo('weapon', lit);       const wOld = shot();
    openProbInfo('weapon', SUM_MAXLV); const wNew = shot();
    openProbInfo('pet',    lit);       const pOld = shot();
    openProbInfo('pet',    SUM_MAXLV); const pNew = shot();
    closeProbInfo();
    return { max: SUM_MAXLV, wOld, wNew, pOld, pNew,
             spec: { pet: specOf('pet'), weapon: specOf('weapon') } };
  };

  const LIT = 100;                     /* 528 이 걷어낸 그 수 */
  const now = await open(IDX);
  const B = await now.evaluate(read, LIT);
  await now.close();
  ok(B.wNew.lv === 'MAX' && B.wNew.imm
     && B.pNew.rows === B.spec.pet.rows && B.pNew.heads === B.spec.pet.heads,
     'B1 openProbInfo(bank, SUM_MAXLV) 가 실제로 MAX 단계를 연다 (85 [G0]·106 [E7-a] 의 뿌리)',
     '무기 단계=' + B.wNew.lv + ' 불멸행=' + B.wNew.imm + ' · 펫 ' + B.pNew.rows + '행/' + B.pNew.heads
     + '등급(파생 ' + B.spec.pet.rows + '행/' + B.spec.pet.heads + '등급)');
  ok(B.wOld.lv === B.wNew.lv && B.pOld.rows === B.pNew.rows,
     'B2 지금 만렙(' + B.max + ')에서는 옛 형태와 새 형태가 **구별되지 않는다** — [A] 래칫이 유일한 방벽이다',
     '옛 단계=' + B.wOld.lv + '/' + B.pOld.rows + '행 ↔ 새 ' + B.wNew.lv + '/' + B.pNew.rows + '행');

  const ANCH = 'const SUM_MAXLV = ' + MAX + ';';
  ok(src.split(ANCH).length === 2, 'R0 전제 — 사본 편집 자리 「' + ANCH + '」 를 소스에서 정확히 1건 찾았다',
     (src.split(ANCH).length - 1) + '건');
  fs.writeFileSync(COPY, src.replace(ANCH, 'const SUM_MAXLV = ' + BIG + ';'));
  let R;
  try { const big = await open(COPY); R = await big.evaluate(read, LIT); await big.close(); }
  finally { try { fs.unlinkSync(COPY); } catch (_) {} }

  ok(R.max === BIG, 'R1 전제 — 사본의 만렙은 ' + BIG + ' 다', 'SUM_MAXLV=' + R.max);
  ok(R.wOld.lv === String(LIT) && !R.wOld.imm && R.wNew.lv === 'MAX' && R.wNew.imm,
     'R2 되돌림 — 만렙이 오르면 옛 형태는 «MAX 단계» 가 아니라 Lv' + LIT + ' 을 열고 불멸 행을 잃는다 · 새 형태는 그대로',
     '옛 단계=' + R.wOld.lv + ' 불멸행=' + R.wOld.imm + ' ↔ 새 단계=' + R.wNew.lv + ' 불멸행=' + R.wNew.imm);
  ok(R.pNew.rows === R.spec.pet.rows && R.pNew.heads === R.spec.pet.heads
     && (R.spec.pet.gated ? R.pOld.rows < R.pNew.rows : R.pOld.rows === R.pNew.rows)
     && R.spec.weapon.gated && R.wOld.rows < R.wNew.rows,
     'R3 되돌림 — 106 [E7] 이 세는 행은 «만렙 문턱 행» 이 있는 표에서만 옛 형태에서 무너진다 '
     + '(757 이 펫에서 불멸을 걷어내 지금 무너지는 쪽은 무기다 — 대조군)',
     '펫 옛 ' + R.pOld.rows + '행/' + R.pOld.heads + '등급 ↔ 새 ' + R.pNew.rows + '행/' + R.pNew.heads
     + '등급(파생 ' + R.spec.pet.rows + '행/' + R.spec.pet.heads + '등급 · 문턱행 '
     + (R.spec.pet.gated ? '있음' : '없음') + ') · 무기 옛 ' + R.wOld.rows + '행 ↔ 새 ' + R.wNew.rows + '행');

  await browser.close();
  console.log('\nVERIFY528 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); try { fs.unlinkSync(COPY); } catch (_) {} process.exit(2); });
