/* 작업 563 — 되돌림(음성) 시험 : `tools/verify47.js` 의 **새 레드닷 절**이 진짜로 무는가
 *
 * 563 은 «제품이 옳고 게이트가 낡았다» 계열이다(242·245~247·275·276·277·279·368). 이런 작업의
 * 가장 쉬운 «고침» 은 빨간 단언을 **지우거나 허용을 2.5px 넓히는** 것인데, 그 순간 47 이 세운
 * 감시가 통째로 사라지고 «고쳤다» 는 기록만 남는다(LESSONS 185-②·④).
 * 옛 항은 «레드닷 27×27 · 칸 안 (돌출 0)» 이었고, 471 이 «닷 중심 = 호스트 코너 안쪽 --dot-in»
 * 으로 규약을 통일하면서 **동시에 참일 수 없는 물음**이 됐다(`tools/probe563.js` 재현: 11 자리
 * 전부 중심 11.0/11.0 · 걸침 2.5px · 안 잘림). 그래서 허용을 넓히지 않고 **물음을 옮겼다**.
 * 옮긴 물음이 빈 껍데기가 아님을 아래가 증명한다:
 *
 *   N1  옛 기준선으로 되돌린다(닷을 칸 «안» 으로) — **옛 항이었다면 초록**이던 자리가 빨개진다.
 *       ⇒ 이번 수리가 «봐주기» 가 아님을 이 한 항이 못박는다.
 *   N2  닷이 코너에 정확히 걸터앉는다(안쪽 0) — 471 이 걷어낸 유형 ⓐ(«코너 밖으로 문 것»).
 *   N3  상자만 키우고 `--dot-r` 은 그대로 — 509 가 세운 «상자↔반지름 짝» 이 깨진다.
 *   N5  배지 노드가 사라진다 — 항이 조용히 0개가 되는 «헛초록» 길을 막는다(185-②).
 *   N6  닷이 칸 아래로 내려간다 — «걸치는 면은 코너 쪽 둘뿐» 이 빈 말이 아님.
 *   N4  ★ **양성 대조** — 규약 상수 `--dot-in` 자체를 11 → 16 으로 옮기면 제품이 통째로 따라
 *       움직이므로 게이트는 **초록**이어야 한다. 게이트가 «11» 을 손으로 들고 있으면 여기서
 *       빨개진다(276 «리터럴 기대값은 그때의 데이터를 감시한다»).
 *
 * 방법 — `index.html` **사본**을 갈아 끼워 `.v563-neg.html` 로 쓰고, 그 파일을 열어 `verify47` 를
 *   통째로 돌린다(`V47_SRC`). 살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다(LESSONS 191).
 *   원본 `index.html` 은 한 바이트도 안 건드린다(neg221·neg279 와 같은 방식).
 *   갈아 끼울 자리는 **정체(선택자·data 키)로만** 지목하고 줄 내용은 그때그때 읽는다(387 처방) —
 *   못 찾거나 둘 이상이면 §[A] 가 빨개진다. 조용히 죽는 길이 없다.
 *
 * 실행: node tools/neg563.js  → 마지막 줄이 `NEG563 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.v563-neg.html');
const LINES = SRC.split('\n');
const ANCHORS = [];
const ind = s => (s.match(/^[ \t]*/) || [''])[0];

const at = (name, re, why) => {
  const hit = [];
  LINES.forEach((l, i) => { if (re.test(l)) hit.push(i); });
  ANCHORS.push({ name, why, n: hit.length, at: hit.length === 1 ? hit[0] + 1 : 0 });
  return hit.length === 1 ? LINES[hit[0]] : null;
};
const cat = (...parts) => parts.some(p => p == null) ? null : parts.join('');

/* 주입 자리 — 471 §2 가 세운 «배지를 칸 위로» 한 줄. 이 줄 **뒤에** 규칙을 끼운다.
   순서에 기대지 않으려고 주입 선언에는 전부 `!important` 를 붙인다(제품에는 이 부품에
   `!important` 가 한 줄도 없다 — 그래서 이기고, 그래서 «주입이 안 먹었다» 가 없다). */
const Z6 = at('Z6', /^\s*\.stab>\.bdg\{z-index:6\}\s*$/, '471 §2 — 배지를 칸 위로 올린 한 줄(주입 자리)');
/* 규약 상수 — N4 가 옮길 자리이자, «제품이 그 상수를 선언한다» 는 전제 그 자체 */
const ROOT_IN = at('ROOT_IN', /^\s*:root\{--dot-in:[0-9.]+px\}\s*$/, '471 규약 상수 :root{--dot-in}');
/* 03 던전 서브탭 세 칸 — N5 가 배지 노드를 걷어낸다 */
const DUN_CELLS = ['raid', 'dun', 'tower'].map(k =>
  at('DUN_' + k, new RegExp('^\\s*<div class="stab dns-t [^"]*" data-dsub="' + k + '">'),
    '03 던전 서브탭 «' + k + '» 칸(배지 노드를 든 줄)'));

const after = (anchor, css) => anchor == null ? null : cat(anchor, '\n', ind(anchor), css);
const N1_CSS = after(Z6, '.stab>.bdg{right:0!important;top:0!important}');
const N2_CSS = after(Z6, '.stab>.bdg{right:calc(0px - var(--dot-r))!important;top:calc(0px - var(--dot-r))!important}');
const N3_CSS = after(Z6, '.stab>.bdg{width:40px!important;height:40px!important}');
const N4_CSS = after(Z6, ':root{--dot-in:16px!important}');
const N6_CSS = after(Z6, '.stab>.bdg{top:70px!important}');
/* 배지 노드 제거 — 줄에서 그 조각만 뺀다. 조각이 없으면 from === to 가 되어 편집 루프가
   «자리 없음» 으로 읽는다(no-op 이 조용히 통과하는 길이 없다). */
const stripBdg = l => (l == null ? null : l.replace('<s class="bdg"></s>', ''));

/* 단언 이름(앞머리로 대조한다) */
const A_PRE  = '전제 — 배지가 있고 471 규약 상수';
const A_BOX  = '레드닷 상자 27x27';
const A_CTR  = '레드닷 중심 = 칸';
const A_SIDE = '레드닷이 걸치는 면은 코너 쪽 둘뿐';

/* ── [C] 절 — 같은 563 행의 나머지 한 건(`verify360` [27]) ────────────────────────────
   상류가 563 을 «레드닷 계열 12건» 으로 넓히며 붙인 자리다. 뿌리도 같다(509 가 «상자» 와
   «그려진 것» 을 가른 뒤 자가 상자를 붙들고 있었다). 처방도 같아서 — 기대값 `--ih`×.512 는
   한 칸도 안 넓히고 **재는 대상**만 «상자» → «그려진 바깥 지름» 으로 옮겼다 — 그것이
   «봐주기» 가 아님을 여기서 증명한다. */
const IBTN_ON = at('IBTN_ON', /^\s*\.ibtn\.on \.bdg\{display:block\}\s*$/,
  '`.ibtn .bdg` 규칙 바로 뒤 한 줄(주입 자리)');
const afterI = css => IBTN_ON == null ? null : cat(IBTN_ON, '\n', ind(IBTN_ON), css);
const C1_CSS = afterI('.ibtn .bdg{width:27px!important;height:27px!important}');
const C2_CSS = afterI('.ibtn .bdg{box-shadow:none!important}');
const C3_CSS = afterI('.ibtn .bdg{cursor:default}');
const B_RING = '출석 레드닷 «그려진» 바깥 지름';
const B_PROP = '출석 레드닷은 --ih 파생이다';
const B_PAIR = '전제 — 출석 레드닷 상자 = 2 × --dot-r';

const CTESTS = [
  { id: 'C1', why: '배지 상자를 27px 리터럴로 못박는다 — `--ih` 파생이 끊긴다(아트가 줄어도 배지는 그대로)',
    edit: [[IBTN_ON, C1_CSS]], want: [B_PROP], not: [B_RING, B_PAIR] },
  { id: 'C2', why: '검정·분홍 링(box-shadow)을 걷는다 — 상자는 그대로 27 인데 **그려진** 지름이 42 → 27 로 준다',
    edit: [[IBTN_ON, C2_CSS]], want: [B_RING], not: [B_PROP, B_PAIR] },
  { id: 'C3', why: '★ 양성 대조 — 무해한 선언 한 줄만 끼운다(주입 기법 자체가 빨강을 만들지 않는다)',
    edit: [[IBTN_ON, C3_CSS]], green: true },
];

const TESTS = [
  { id: 'N1', why: '★ 옛 기준선 복귀 — 닷을 칸 «안» 으로 되돌린다(돌출 0). 옛 항이었다면 여기가 초록이다',
    edit: [[Z6, N1_CSS]], want: [A_CTR], not: [A_PRE, A_BOX, A_SIDE] },

  { id: 'N2', why: '닷이 코너에 정확히 걸터앉는다(안쪽 0) — 471 이 걷어낸 유형 ⓐ',
    edit: [[Z6, N2_CSS]], want: [A_CTR], not: [A_PRE, A_BOX, A_SIDE] },

  { id: 'N3', why: '상자만 40x40 으로 키우고 --dot-r 은 13.5 그대로 — 509 «상자↔반지름 짝» 이 깨진다',
    edit: [[Z6, N3_CSS]], want: [A_PRE, A_BOX, A_CTR] },

  { id: 'N5', why: '03 던전 배지 노드 3개 제거 — 항이 0개가 되어 «검사할 게 없어 초록» 이 되는 길',
    edit: DUN_CELLS.map(l => [l, stripBdg(l)]), want: [A_PRE], not: [A_BOX, A_CTR, A_SIDE] },

  { id: 'N6', why: '닷이 칸 아래로 내려간다(top 70 · 칸 84) — «걸치는 면은 코너 쪽 둘뿐» 이 빈 말이 아님',
    edit: [[Z6, N6_CSS]], want: [A_SIDE, A_CTR], not: [A_PRE, A_BOX] },

  { id: 'N4', why: '★ 양성 대조 — 규약 상수 --dot-in 을 11 → 16 으로 옮긴다. 제품이 통째로 따라 움직이므로 게이트는 초록이어야 한다',
    edit: [[Z6, N4_CSS]], green: true },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

const runGate = (gate, envKey) => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, gate || 'verify47.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { [envKey || 'V47_SRC']: TMP }), encoding: 'utf8', maxBuffer: 8 << 20 });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*FAIL /.test(l)).map(l => l.trim().replace(/^FAIL /, ''));
};

(async () => {
  try {
    console.log('[A] 갈아 끼울 자리 — 제품에서 정확히 한 줄씩 해석된다');
    ANCHORS.forEach(a => ok('앵커 ' + a.name + ' — ' + a.why,
      a.n === 1, a.n === 1 ? 'index.html:' + a.at : (a.n === 0 ? '0줄 — 그 자리가 사라졌다' : a.n + '줄 — 지목이 모호하다')));

    console.log('\n[R] 자가검사 — 이 해석기가 «무엇이 와도 초록» 이 아님');
    const probe = re => { let n = 0; LINES.forEach(l => { if (re.test(l)) n++; }); return n; };
    ok('R1 없는 자리는 0줄로 읽힌다(해석 실패)', probe(/^\s*\.__없는규칙__\{/) === 0, '0줄');
    ok('R2 모호한 지목은 2줄 이상으로 읽힌다(해석 실패)', probe(/^\s*<div class="stab\b/) > 1, probe(/^\s*<div class="stab\b/) + '줄');
    ok('R3 no-op 치환은 «자리 없음» 으로 읽힌다',
      DUN_CELLS[0] != null && DUN_CELLS[0].replace('<s class="없는조각"></s>', '') === DUN_CELLS[0],
      '갈아 낄 조각이 없으면 from === to');
    ok('R4 제품이 규약 상수를 실제로 들고 있다(:root --dot-in)',
      ROOT_IN != null && /--dot-in:\s*11px/.test(ROOT_IN), (ROOT_IN || '').trim());

    const suite = (title, tests, gate, envKey) => {
      console.log('\n' + title);
      for (const t of tests) {
      const edits = (t.edit || []).filter(Boolean);
      const bad = edits.length !== (t.edit || []).length
        || edits.some(([from, to]) => from == null || to == null || from === to);
      if (bad) { ok(t.id + ' ' + t.why, false, '자리 없음 — 앵커 해석 실패(위 [A] 참고)'); continue; }
      let src = SRC, applied = true;
      for (const [from, to] of edits) {
        if (src.indexOf(from) < 0) { applied = false; break; }
        src = src.replace(from, to);
      }
      if (!applied) { ok(t.id + ' ' + t.why, false, '원문에서 그 줄을 못 찾았다'); continue; }
      fs.writeFileSync(TMP, src);
      const fails = runGate(gate, envKey);
      const hit = p => fails.some(f => f.startsWith(p));
      if (t.green) {
        ok(t.id + ' ' + t.why, fails.length === 0,
          fails.length ? 'FAIL ' + fails.length + '건: ' + fails.slice(0, 3).join(' / ') : 'FAIL 0건');
      } else {
        const wantOK = (t.want || []).every(hit);
        const notOK = (t.not || []).every(p => !hit(p));
        ok(t.id + ' ' + t.why, wantOK && notOK,
          'FAIL ' + fails.length + '건' + (wantOK ? '' : ' · 기대한 항이 안 빨개졌다')
          + (notOK ? '' : ' · 안 빨개져야 할 항이 빨개졌다') + (fails.length ? ' — ' + fails[0] : ''));
      }
      }
    };
    suite('[B] 되돌림 시험 — 갈아 끼운 사본에서 verify47 이 무엇을 무는가', TESTS, 'verify47.js', 'V47_SRC');
    suite('[C] 되돌림 시험 — 같은 행의 나머지 한 건: verify360 [4] 출석 배지', CTESTS, 'verify360.js', 'V360_SRC');
  } finally {
    try { fs.unlinkSync(TMP); } catch (_) {}
  }
  console.log('\nNEG563 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
