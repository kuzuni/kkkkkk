/* 작업 907 — «부분 리라스터에 노출된 자» 판별기 (공용)
 *
 * 903 이 `verify432` 에서 찍은 조건이다. 한 자가 **셋을 다 갖추면** Chromium 의 타일 재사용에 노출된다:
 *   ① 한 페이지에서 **스타일 태그를 붙였다 뗀다**(레이어가 더러워진다)
 *   ② 그렇게 찍은 **판끼리 화소 차분**을 센다
 *   ③ 그 차분의 **문턱이 몇 단위**다(`d > 0` · `d > 8` — 1~19 단위의 두 얼굴이 판정을 뒤집는다)
 *
 * 이 파일이 «조건» 을 한곳에 적어 두고 셋이 같이 읽는다 —
 *   `pwlaunch.launch()`  : 조건을 갖춘 게이트에 깃발 `--disable-partial-raster` 를 **기본으로** 준다.
 *   `probe907`           : 전수 스캔·A/B 세기.
 *   `verify907`          : 그 약속을 이름으로 지킨다.
 *
 * ⚠ **③ 은 배제 조건으로 쓰지 않는다.** 문턱은 자마다 이름·자리가 달라(기본 인자 `tol = 8` · 멀리 선언된
 *    `const D = 40` · 이름 없는 식) 정적으로는 절반쯤만 풀린다 — 못 푼 것을 «큰 문턱» 으로 읽으면
 *    **노출된 자를 조용히 뺀다**. 대상은 ①∧② 로 잡고 ③ 은 풀린 값을 적기만 한다(907 §1 표).
 * ⚠ «자 플레이키» 를 한 뿌리로 보지 마라 — 902 는 정수 양자화, 906 은 표본 구성이었다(LESSONS 903-④).
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* 주석은 «묻는 말» 이 아니라 «적어 둔 말» 이다 — 머리말에 `addStyleTag` 를 설명으로 적어 둔 자가 여럿이라
   조건 판정에서 뺀다(안 빼면 903 을 인용한 자가 전부 대상으로 잡힌다). */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

const RE_ADD = /addStyleTag|createElement\((['"`])style\1/;
const RE_RM = /\.remove\(\)|removeChild|textContent\s*=\s*['"`]{2}/;
/* 두 버퍼를 같은 첨자로 비교하는 자리 — 이름은 자마다 다르므로 «모양» 으로 잡는다. */
const RE_CMP = [
  /Math\.abs\(\s*([A-Za-z_$][\w$]*)\s*\[[^\]]{1,40}\]\s*-\s*([A-Za-z_$][\w$]*)\s*\[/,
  /([A-Za-z_$][\w$]*)\.data\[[^\]]{1,40}\][^;\n]{0,60}?([A-Za-z_$][\w$]*)\.data\[/,
  /\bdiffBox\b|\bdiffPx\b|\bdiffMask\b|\bdiffRows\b|\bpxDiff\b/,
];
const RE_THR = /(?:>|>=)\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g;
const RE_CONST = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+(?:\.\d+)?)\s*[;,]/g;

/* 문턱은 «재는 자리 근처»(±4줄) 의 비교 우변이다. 식별자면 같은 파일의 `const X = 숫자` 로 한 번 푼다. */
function thresholdsNear(s) {
  const lines = s.split('\n');
  const consts = {};
  let cm;
  RE_CONST.lastIndex = 0;
  while ((cm = RE_CONST.exec(s))) consts[cm[1]] = +cm[2];
  const out = [];
  lines.forEach((ln, i) => {
    if (!RE_CMP.some(r => r.test(ln))) return;
    const win = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
    let m;
    RE_THR.lastIndex = 0;
    while ((m = RE_THR.exec(win))) {
      const v = /^\d/.test(m[1]) ? +m[1] : consts[m[1]];
      if (v !== undefined && Number.isFinite(v)) out.push(v);
    }
  });
  return out;
}

function classifySource(src, file) {
  const s = stripComments(src);
  const add = RE_ADD.test(s);
  const rm = RE_RM.test(s);
  const cmp = RE_CMP.some(r => r.test(s));
  const thr = thresholdsNear(s);
  return {
    file: file || '',
    add, rm, cmp, thr,
    small: thr.length ? Math.min(...thr) <= 64 : false,
    shots: (s.match(/\.screenshot\(/g) || []).length,
    flagged: /disable-partial-raster/.test(s) || /\bdet\(/.test(s),
    hit: add && rm && cmp,
  };
}

function classify(file, dir) {
  const p = path.isAbsolute(file) ? file : path.join(dir || __dirname, file);
  let src = '';
  try { src = fs.readFileSync(p, 'utf8'); } catch (_) { return classifySource('', file); }
  return classifySource(src, path.basename(p));
}

/* 이 파일(entry) 이 조건을 갖췄나 — `launch()` 가 판마다 한 번 읽는다(파일 하나 · 정규식 몇 개). */
const cache = new Map();
function qualifies(entryPath) {
  const p = String(entryPath || '');
  if (!p) return false;
  if (cache.has(p)) return cache.get(p);
  let v = false;
  try { v = classifySource(fs.readFileSync(p, 'utf8'), path.basename(p)).hit; } catch (_) { v = false; }
  cache.set(p, v);
  return v;
}

module.exports = { classify, classifySource, qualifies, stripComments };
