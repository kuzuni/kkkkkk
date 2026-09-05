/* 952 — «적어 둔 코드» 와 «도는 코드» 를 가른다 (정적 · 브라우저 없이 돈다)
 *
 *   const { strip, pixelKind } = require('./quote952');
 *
 * 왜 있는가 —
 *   918/922 의 «화소를 재는가»(`shell918.RE_PX`)는 **주석만 뺀 소스 전체**에 정규식을 댄다.
 *   그 자리는 걷개를 켤지 정하는 자리라 넉넉한 쪽이 안전하지만(안 재는 자에 걷개가 켜져도 무해),
 *   925 [2d] 처럼 «재면 브라우저를 띄워야 한다» 를 **의무**로 물을 때는 같은 넉넉함이 곧 오탐이다:
 *   `verify936` 은 `getImageData` 를 **문자열 표본**(자기 판별기에 먹이는 인공 자료 `BASE`)으로 들고 있을 뿐
 *   브라우저를 한 번도 안 띄운다(952 등재문 갈래 ⓑ — 등재문은 «주석» 을 의심했지만 주석은 이미 벗겨진다).
 *
 * 무엇을 하는가 —
 *   `strip()` 은 한 번의 훑기로 **주석 · 문자열/템플릿 리터럴의 «속» · 정규식 리터럴의 «속»** 을 공백으로 지운다.
 *   ⚠ 템플릿의 `${ ... }` **안은 코드라 남긴다** — 거기서 진짜로 화소를 재는 자를 놓치면 이 부품이 곧 구멍이다.
 *   길이·개행을 보존해(같은 글자수의 공백) 줄·칸이 안 밀린다.
 *
 * 규칙의 주인은 여기가 아니다 — «화소를 재는가» 는 `shell918.RE_PX` 를 그대로 읽는다(402 «사본을 지운다»).
 *
 * 자 — `node tools/verify952.js`
 */
'use strict';
const shell918 = require('./shell918');
const raster907 = require('./raster907');

const RE_PX = shell918.RE_PX;

/* 정규식 리터럴이 시작될 수 있는 자리 — 바로 앞의 «뜻 있는» 글자/낱말로 가른다
   (`a / b` 의 나눗셈과 `s.replace(/a/, '')` 의 리터럴을 가르는 흔한 어림이다). */
const PUNCT_BEFORE = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';',
                              '+', '-', '*', '%', '~', '^', '<', '>']);
const WORD_BEFORE = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete',
                             'void', 'do', 'else', 'yield', 'await']);

function strip(src) {
  const out = src.split('');
  const n = src.length;
  const blank = (a, b) => {
    for (let k = Math.max(0, a); k < Math.min(b, n); k++) if (out[k] !== '\n') out[k] = ' ';
  };
  /* 틀 — 바깥은 코드 한 겹. 템플릿을 만나면 'tmpl' 을 얹고, 그 안의 `${` 에서 다시 'code' 를 얹는다. */
  const st = [{ kind: 'code', depth: 0 }];
  let i = 0, prev = '', word = '';

  const isRegexStart = () => prev === '' || PUNCT_BEFORE.has(prev) || WORD_BEFORE.has(word);

  while (i < n) {
    const top = st[st.length - 1];

    /* ── 템플릿의 «글» 쪽 ── */
    if (top.kind === 'tmpl') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { blank(top.chunk, i); st.pop(); i++; prev = '`'; word = ''; continue; }
      if (c === '$' && src[i + 1] === '{') {
        blank(top.chunk, i);
        st.push({ kind: 'code', depth: 0 });
        i += 2; prev = '{'; word = ''; continue;
      }
      i++;
      if (i >= n) blank(top.chunk, n);
      continue;
    }

    /* ── 코드 쪽 ── */
    const c = src[i], c2 = src[i + 1];

    if (c === '/' && c2 === '/') {                       /* 줄 주석 */
      let j = i; while (j < n && src[j] !== '\n') j++;
      blank(i, j); i = j; continue;
    }
    if (c === '/' && c2 === '*') {                       /* 블록 주석 */
      let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      blank(i, j); i = j; continue;
    }
    if (c === '"' || c === "'") {                        /* 홑·겹따옴표 — 따옴표는 남기고 속만 지운다 */
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c || src[j] === '\n') break;
        j++;
      }
      blank(i + 1, j);
      i = j + 1; prev = c; word = ''; continue;
    }
    if (c === '`') { st.push({ kind: 'tmpl', chunk: i + 1 }); i++; prev = '`'; word = ''; continue; }

    if (c === '/' && isRegexStart()) {                   /* 정규식 리터럴 — 속은 «패턴» 이지 «재는 코드» 가 아니다 */
      let j = i + 1, cls = false, closed = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '\n') break;
        if (cls) { if (d === ']') cls = false; }
        else if (d === '[') cls = true;
        else if (d === '/') { closed = true; break; }
        j++;
      }
      if (closed) { blank(i + 1, j); i = j + 1; prev = '/'; word = ''; continue; }
    }

    if (c === '{') top.depth++;
    else if (c === '}') {
      if (top.depth === 0 && st.length > 1) {            /* `${ … }` 를 닫고 템플릿의 «글» 로 돌아간다 */
        st.pop();
        const t = st[st.length - 1];
        if (t.kind === 'tmpl') t.chunk = i + 1;
        i++; prev = '}'; word = ''; continue;
      }
      if (top.depth > 0) top.depth--;
    }

    if (/[A-Za-z_$0-9]/.test(c)) word += c;
    else word = '';
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

/* 한 자의 «화소» 가 어느 쪽인가 —
 *   'code'  = 도는 코드에서 잰다   (브라우저를 띄워야 한다 = 사슬을 지나야 한다)
 *   'quote' = 적어 두기만 했다     (문자열·템플릿·정규식 표본 — 사슬이 붙을 자리가 없다)
 *   'no'    = 세는 쪽이 아예 안 세는 자다
 * ⚠ **주석만 가진 자는 'quote' 가 아니라 'no' 다** — 세는 쪽(census)이 이미 주석을 벗기고 보므로
 *   그 자는 애초에 «화소를 재는 자» 인구에 안 든다. 이 갈래는 그 인구를 그대로 물려받아 다시 가른다.
 */
function pixelKind(src) {
  if (RE_PX.test(strip(src))) return 'code';
  if (RE_PX.test(raster907.stripComments(src))) return 'quote';
  return 'no';
}

module.exports = { strip, pixelKind, RE_PX };
