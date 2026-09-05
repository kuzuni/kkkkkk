/* 작업 936 — «측정 상자를 움직이는 제품 상태에 매단 자» 판별기 (공용)
 *
 * 928 이 `verify856` 에서 찍은 얼굴이다. 한 자가 **셋을 다 갖추면** 재는 자리가 판마다 흔들린다:
 *   ① 상자·좌표를 **`player.x`/`player.y` 에서 판다**(`const CX = Math.round(player.x + ox + 180)`)
 *   ② 그 상자에서 **화소**를 잰다(`ctx.getImageData(bx, by, …)` · `clip:` 캡처)
 *   ③ 그 파생보다 **앞에 못박는 줄이 없다** — 못박았어도 그 뒤에 `step()` 이 돌면 도로 풀린다
 *
 * ⚠ **«전부 못박아라» 는 오답이다**(등재문 936). 플레이어 «자리» 가 곧 표본인 자
 *   (`probe114*` 계열 · `probe288away` 등)는 좌표를 값으로 보고할 뿐 그 좌표로 **화소 상자를
 *   잡지 않는다** — ② 가 그런 자를 뺀다. 조건은 ①∧②∧③ 셋 다일 때만 참이다.
 *
 * ⚑ 907 과 같은 꼴로 «조건을 한곳에 적고 셋이 같이 읽는다»:
 *   `probe936` : 전수 인구조사 + 표류 실측(A/B)
 *   `verify936` : 그 인구가 **0 인 채로 남는지**를 지킨다(래칫) — 새 자가 조건을 갖추면 자동으로 걸린다
 *
 * ⚠ 정적으로 «절반만 풀리는» 것을 배제 조건으로 쓰지 않는다(LESSONS 907-③).
 *   ③ 은 «못박기 · 미는 것 · 파생» 세 자리의 **텍스트 순서**로만 푼다 — 못 푼 것은 «아니다» 가 아니다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* 주석은 «묻는 말» 이 아니라 «적어 둔 말» 이다 — 936·928 을 인용한 자가 전부 대상이 되지 않게 뗀다. */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/* ── ① 파생: `player.x`/`player.y` 를 **셈에 쓰는** 선언. 값을 그대로 보고하는 자리
   (`px: player.x` · `+player.x.toFixed(1)`)는 상자가 아니므로 뺀다. */
const RE_PLAYER_MATH = /player\.[xy]\s*[+\-*/]|[+\-*/]\s*player\.[xy]|player\.[xy]\s*\)?\s*[+\-*/]/;
const RE_DECL = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;
/* 한 줄에 여러 선언이 오는 꼴(`const CX = …, CY = …, R = 64;`)도 이름을 다 딴다. */
const RE_DECL_MULTI = /([A-Za-z_$][\w$]*)\s*=\s*([^,;\n]+)/g;

/* ── ② 화소를 재는 자리 — 상자 인자가 오염됐는지 본다. */
const RE_PIXEL_CALL = /(?:getImageData|readPixels)\s*\(([^)]*)\)/g;
const RE_CLIP = /clip\s*:\s*\{([^}]*)\}/g;

/* ── ③ 못박기 / 미는 것 */
const RE_PIN = /player\.x\s*=(?!=)/g;                 /* 자가 직접 못박는다 */
const RE_HOME = /\bspawnStage\s*\(\s*\)/g;            /* 제품의 «집» — 여기서도 player.x 가 정해진다 */
const RE_MOVE = /(?:^|[^.\w])step\s*\(/g;             /* 한 틱 굴린다 = 플레이어가 움직인다 */

/* 파생이 **이름 붙은 닫힘** 안에 있으면(`const grab = () => { … player.x … }`) 글자 순서는
   틀린 모형이다 — 그 줄은 «선언» 이고 실제로 재는 때는 **첫 호출**이다. 그래서 그런 파생은
   자리를 «닫힘의 첫 호출» 로 옮겨 묻는다(size541lib 이 그 꼴 — 못박기는 `clear()` 안에 있고
   그 선언이 `grab` 선언보다 뒤다). ⚠ 못 찾으면 자리를 그대로 둔다 — 907-③(«못 푼 것» 은
   «아니다» 가 아니다) 대로, 못 푼 것은 **엄한 쪽**(파생 자리 그대로)으로 남긴다. */
const RE_NAMED_FN = /(?:\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{|\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{)/g;

function enclosing(s, at) {                 /* `at` 를 감싸는 **가장 안쪽** 이름 붙은 함수 */
  let best = null;
  RE_NAMED_FN.lastIndex = 0;
  let m;
  while ((m = RE_NAMED_FN.exec(s))) {
    if (m.index > at) break;
    const name = m[1] || m[2];
    const open = s.indexOf('{', m.index + m[0].length - 1);
    if (open < 0) continue;
    let d = 0, end = -1;
    for (let i = open; i < s.length; i++) {
      const c = s[i];
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) { end = i; break; } }
    }
    if (end > at) best = { name, start: m.index, defEnd: end };
  }
  return best;
}

/* 파생과 «재는 호출» 이 **같은 닫힘 안**에 있을 때만 자리를 첫 호출로 옮긴다.
   (`const grab = () => { const x = …player.x…; return c.getImageData(x, …) }` — size541lib)
   상자를 **밖에서 한 번** 셈해 두고 닫힘은 읽기만 하는 꼴(`const bx = …; const grab = () => …bx…`)은
   상자가 이미 얼어 있으므로 옮기지 않는다 — 그 자리에서 못박았는지를 그대로 묻는다. */
function callSiteIfShared(s, declAt, readAt) {
  const a = enclosing(s, declAt), b = enclosing(s, readAt);
  if (!a || !b || a.start !== b.start) return -1;
  const call = new RegExp('(?:^|[^.\\w$])' + a.name.replace(/\$/g, '\\$') + '\\s*\\(');
  const rest = s.slice(a.defEnd);
  const c = rest.search(call);
  return c < 0 ? -1 : a.defEnd + c;
}

function idxAll(s, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(s))) out.push(m.index);
  return out;
}

/* 오염 이름 닫기 — `CX ← player.x` · `bx ← CX` 처럼 한 다리 건너도 따라간다(2단이면 충분하고,
   더 돌려도 새 이름이 안 늘면 멈춘다). 값은 «이름 → 그 선언의 첫 자리» 다. */
function taintedNames(s) {
  const decls = [];
  let m;
  RE_DECL.lastIndex = 0;
  while ((m = RE_DECL.exec(s))) {
    const head = m.index;
    /* `const a = …, b = …` 를 한 선언으로 읽으면 b 를 놓친다 — 쉼표 목록을 다시 가른다. */
    const body = m[0].replace(/^\b(?:const|let|var)\s+/, '');
    let d;
    RE_DECL_MULTI.lastIndex = 0;
    while ((d = RE_DECL_MULTI.exec(body))) decls.push({ name: d[1], expr: d[2], at: head });
  }
  const tainted = new Map();
  for (let pass = 0; pass < 4; pass++) {
    let grew = false;
    for (const d of decls) {
      if (tainted.has(d.name)) continue;
      const direct = RE_PLAYER_MATH.test(d.expr);
      const via = Array.from(tainted.keys()).some(n =>
        new RegExp('(?:^|[^.\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(d.expr));
      if (direct || via) { tainted.set(d.name, d.at); grew = true; }
    }
    if (!grew) break;
  }
  return tainted;
}

/* ── 예외 선언 — «상자가 플레이어 자신의 그림을 따라간다» 처럼 못박으면 재는 것이 사라지는 자는
   **파일 안에 이유를 적어** 스스로를 예외로 밝힌다. 적지 않으면 인구에 남는다(빠진 자리를
   아무도 안 세는 일을 없애는 것이 이 행의 본체다). 자동 승인이 아니라 **셈에 남는 선언**이다 —
   `verify936` 이 이름 목록으로 래칫을 걸어, 새 자가 조용히 예외가 되는 길을 막는다. */
const RE_EXEMPT = /936-예외\s*:\s*([^\n]{20,})/;

function classifySource(src, file) {
  const ex = RE_EXEMPT.exec(src || '');
  const s = stripComments(src || '');
  const tainted = taintedNames(s);
  const names = Array.from(tainted.keys());

  /* ② 오염된 이름으로 상자를 잡는 화소 읽기 */
  const boxes = [];
  for (const re of [RE_PIXEL_CALL, RE_CLIP]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      const args = m[1] || '';
      const used = names.filter(n =>
        new RegExp('(?:^|[^.\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(args));
      if (used.length) boxes.push({ at: m.index, args: args.trim().slice(0, 80), used });
    }
  }
  /* 상자를 만든 파생 중 **가장 앞선 것** — ③ 은 그 자리를 기준으로 묻는다. */
  const seeds = [];
  for (const b of boxes) for (const n of b.used) {
    const declAt = tainted.get(n);
    const moved = callSiteIfShared(s, declAt, b.at);
    seeds.push(moved >= 0 ? moved : declAt);
  }
  const derivAt = seeds.length ? Math.min.apply(null, seeds) : -1;

  const pins = idxAll(s, RE_PIN).concat(idxAll(s, RE_HOME)).sort((a, b) => a - b);
  const moves = idxAll(s, RE_MOVE);

  let pinned = false, lastPin = -1, moveAfterPin = -1;
  if (derivAt >= 0) {
    const before = pins.filter(p => p < derivAt);
    lastPin = before.length ? before[before.length - 1] : -1;
    const mv = moves.filter(p => p > lastPin && p < derivAt);
    moveAfterPin = mv.length ? mv[mv.length - 1] : -1;
    pinned = lastPin >= 0 && moveAfterPin < 0;
  }

  return {
    file: file || '',
    derive: tainted.size > 0,        /* ① */
    pixel: boxes.length > 0,         /* ② */
    pinned,                          /* ③ 의 반대 */
    derivAt, lastPin, moveAfterPin,
    boxes: boxes.map(b => b.args),
    exempt: !!ex,
    reason: ex ? ex[1].trim().replace(/\s*\*\/?\s*$/, '') : '',
    /* 조건을 갖췄다(raw) ↔ 아직 셈에 남는다(hit). 예외는 «없는 것» 이 아니라 «밝힌 것» 이다. */
    raw: boxes.length > 0 && !pinned,
    hit: boxes.length > 0 && !pinned && !ex,
  };
}

function classify(file, dir) {
  const p = path.isAbsolute(file) ? file : path.join(dir || __dirname, file);
  let src = '';
  try { src = fs.readFileSync(p, 'utf8'); } catch (_) { return classifySource('', path.basename(p)); }
  return classifySource(src, path.basename(p));
}

/* 이 판별기·그 세는 자·그 지키는 자는 조건을 «설명» 하므로 인구에서 뺀다(907 과 같은 자리). */
const SELF = new Set(['pin936.js', 'probe936.js', 'verify936.js', 'tmp936nopin.js']);

function scanDir(dir) {
  const d = dir || __dirname;
  return fs.readdirSync(d)
    .filter(f => f.endsWith('.js') && !SELF.has(f))
    .map(f => classify(f, d))
    .filter(r => r.derive);
}

function census(dir) {
  return scanDir(dir).filter(r => r.hit);
}

module.exports = { classify, classifySource, scanDir, census, stripComments, SELF };

if (require.main === module) {
  const rows = scanDir(path.join(__dirname));
  const hit = rows.filter(r => r.hit);
  const ex = rows.filter(r => r.raw && r.exempt);
  console.log('PIN936 — ① player 파생 ' + rows.length + '자 · ② 화소 상자 ' +
              rows.filter(r => r.pixel).length + '자 · ①∧②∧③ 미선언 **' + hit.length + '자**' +
              ' · 선언된 예외 ' + ex.length + '자\n');
  for (const r of rows.filter(r => r.pixel)) {
    console.log('  ' + (r.hit ? 'HIT ' : r.exempt && r.raw ? '예외' : 'pin ') + ' ' + r.file.padEnd(20) +
                ' deriv@' + r.derivAt + ' pin@' + r.lastPin + ' move@' + r.moveAfterPin +
                '  box(' + r.boxes[0] + ')');
  }
  for (const r of ex) console.log('\n  [예외] ' + r.file + ' — ' + r.reason.slice(0, 120));
}
