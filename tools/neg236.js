#!/usr/bin/env node
/* 작업 236 — 되돌림(음성) 시험
 *
 * `tools/verify107.js` [I] 를 «두 점 표본(900ms · +3000ms)» 에서 «궤적 전체 + 관성이 멎을 때까지»
 * 로 고쳐 놓고 끝내면, 그게 **정말로 무언가를 지키는지** 아무도 모른다 —
 * 이사·재작성한 단언은 «규칙이 되돌아와도 초록» 인 항등식이 되기 쉽다(LESSONS 214-④ · 215-② · 219).
 *
 * 방법 — `index.html` 사본을 한 곳(또는 두 곳)만 갈아 끼워 `.v236-neg.html` 로 쓰고,
 * **그 파일을 새로 열어** `verify107` 를 돌린다(`V107_SRC`). 살아 있는 페이지에 주입하면
 * 거짓 초록이 난다(LESSONS 191 · 96·219 선례). 사본 7벌을 돌려야 해서 `V107_FAST=1`
 * ([C] 전투 30초·[F]·[G] 생략)로 돌린다 — [A][B][D][E][I][H] 는 전부 그대로 본다.
 *
 * 각 시험은 «빨개져야 하는 항목»(want) 과 «그대로 초록이어야 하는 항목»(not) 을 이름 조각으로 적는다.
 * not 이 있는 이유: 네 항 ⓐⓑⓒⓓ 이 **항등식이 아니라 서로 다른 절을 때린다** 는 것을 보여야 한다.
 *
 * ★ N5 가 이 시험의 핵심이다 — «갔다가 돌아온» 튐은 **옛 두 점 표본이 원리적으로 못 잡는다**
 *   (900ms 와 3900ms 두 점만 같으면 그 사이에 0 으로 튀었다 와도 초록). ⓓ 만 그걸 잡는다.
 *
 * ★ N7 은 작업 303 이 넣었다 — ⓒ 의 기준점을 «관성 마지막 프레임» → «멎은 것을 본 첫 프레임» 으로
 *   한 칸 옮긴 것이 «1px 짜리 진짜 밀림» 까지 눈감게 만들지 않았음을 못 박는다.
 *
 * 실행: node tools/neg236.js  → 마지막 줄이 `NEG236 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, `.v236-neg-${process.pid}.html`);

/* 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다) */
const SKIP  = 'if(el.__bh === html) return null;';                        /* 107 ① 내용 동일 시 재생성 생략 */
const RESTO = 'el.scrollTop = st; scRestore(el, snap);';                  /* 107 ② 안쪽 스크롤러까지 복원 */
const FLEND = 'if(Math.abs(sp) < DS_VMIN || !moved){ dsGlide = 0; return; }';  /* 95 관성 종료 조건 */
const FLSTEP = 'box.scrollTop = r.acc + sp * dt;';                        /* 95 관성 한 프레임 */

/* 이름 조각 — verify107 단언 이름 앞부분 */
const A  = '[A] 유휴 3초';
const D  = '[D] 장착';
const Ia = '[I]ⓐ';
const Ib = '[I]ⓑ';
const Ic = '[I]ⓒ';
const Id = '[I]ⓓ';

const TESTS = [
  { id: 'N1', why: '107 통째 되돌림(①·② 동시) — 주인이 보고한 원래 버그 그대로. 매 틱 본문을 갈아끼우고 안쪽 격자는 복원하지 않는다',
    edits: [[SKIP, 'if(false) return null; /* N1 — ① 되돌림 */'],
            [RESTO, 'el.scrollTop = st; /* N1 — ② 되돌림(.shsc 하나만) */']],
    want: [Ic, Id, A], not: [Ia, Ib] },

  { id: 'N2', why: '① 만 되돌림(② 복원은 살아 있다) — 재생성은 매 틱 일어나지만 스크롤은 안 튄다. [A] 만 빨갛고 [I] 는 초록이어야 한다',
    edits: [[SKIP, 'if(false) return null; /* N2 — ① 만 되돌림 */']],
    want: [A], not: [Ia, Ib, Ic, Id] },

  { id: 'N3', why: '② 만 되돌림(① 생략은 살아 있다) — 유휴엔 안 갈아끼우니 [I] 는 초록이고, 구조가 실제로 바뀌는 재렌더를 보는 [D] 만 빨개진다',
    edits: [[RESTO, 'el.scrollTop = st; /* N3 — ② 만 되돌림 */']],
    want: [D], not: [Ia, Ic, Id] },

  { id: 'N4', why: '95 관성 종료 조건 회귀 — dsFling 이 영영 안 멎는다. ⓐ 가 없으면 ⓒ 는 «멎은 뒤 0프레임» 으로 공허하게 초록이 된다',
    edits: [[FLEND, 'if(false){ dsGlide = 0; return; } /* N4 — 종료 조건 제거 */']],
    want: [Ia], not: [Ib, Id] },

  { id: 'N5', why: '★ 관성 도중 한 번 0 으로 튀었다가 되돌아온다 — «갔다 돌아온» 튐. 옛 두 점 표본(900ms·+3000ms)은 이걸 원리적으로 못 잡는다',
    edits: [[FLSTEP, 'box.scrollTop = ((window.__n5 = (window.__n5 || 0) + 1) === 25) ? 0 : r.acc + sp * dt; /* N5 — 25번째 관성 프레임에 한 번 튐 */']],
    want: [Id], not: [Ia, A] },

  { id: 'N6', why: '★ 관성이 «멎은 뒤» 1.2초에 0 으로 튀었다가 60ms 만에 되돌아온다 — 옛 두 점 표본은 두 표본 사이에서 갔다 온 튐을 **원리적으로** 못 본다(193 이전 트리에서 실증: 옛 형태 Δ0 초록 · 새 ⓒⓓ 빨강, review §4)',
    edits: [[FLEND, 'if(Math.abs(sp) < DS_VMIN || !moved){ dsGlide = 0; ' +
                    'if(!window.__n6){ window.__n6 = 1; const b2 = box, v2 = b2.scrollTop; ' +
                    'setTimeout(() => { b2.scrollTop = 0; setTimeout(() => { b2.scrollTop = v2; }, 60); }, 1200); } return; } /* N6 — 멎은 뒤 한 번 튐 */']],
    want: [Ic, Id], not: [Ia, Ib, A] },

  { id: 'N7', why: '★ 관성이 멎은 뒤 1.5초에 **1px** 밀리고 되돌아오지 않는다 — 작업 303 이 ⓒ 의 기준점을 ' +
                   '«관성 마지막 프레임» 에서 «멎은 것을 본 첫 프레임» 으로 한 칸 옮겼으므로, 그 한 칸이 ' +
                   '«1px 짜리 진짜 밀림» 까지 같이 눈감게 만들지 않았는지 못 박는다. ⓓ 는 아래로 민 것이라 초록이어야 한다',
    edits: [[FLEND, 'if(Math.abs(sp) < DS_VMIN || !moved){ dsGlide = 0; ' +
                    'if(!window.__n7){ window.__n7 = 1; const b3 = box; ' +
                    'setTimeout(() => { b3.scrollTop = b3.scrollTop + 1; }, 1500); } return; } /* N7 — 멎은 뒤 1px 밀림 */']],
    want: [Ic], not: [Ia, Ib, Id, A] },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

/* verify107 을 사본에 대고 돌려 «빨간 항목 이름» 목록을 낸다 */
const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify107.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V107_SRC: TMP, V107_FAST: '1' }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*✗ /.test(l)).map(l => l.trim().replace(/^✗ /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : '전 항목 초록');

  for (const t of TESTS) {
    console.log('\n[' + t.id + '] ' + t.why);
    let src = SRC, bad = false;
    for (const [from, to] of t.edits) {
      const hits = src.split(from).length - 1;
      if (hits !== 1) { ok(t.id + ' 갈아 끼울 자리를 찾았다', false, '「' + from.slice(0, 40) + '」 ' + hits + '곳 — index.html 이 바뀌었다'); bad = true; break; }
      src = src.replace(from, to);
    }
    if (bad) continue;
    ok(t.id + ' 갈아 끼울 자리를 찾았다', true, t.edits.length + '곳');
    fs.writeFileSync(TMP, src);
    const fails = runGate();
    t.want.forEach(w => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
      fails.some(f => f.startsWith(w)), fails.length ? '빨간 항목 ' + fails.length + '개: ' + fails.join(' / ').slice(0, 160) : '전부 초록 — 단언이 안 잡는다'));
    (t.not || []).forEach(w => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
      !fails.some(f => f.startsWith(w)), '빨간 항목 ' + fails.length + '개: ' + fails.join(' / ').slice(0, 160)));
  }

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG236 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
