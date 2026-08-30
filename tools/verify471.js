#!/usr/bin/env node
/* 게이트 — 작업 471 「레드닷 위치 전면 통일 «호스트 우상단 코너»」 (저장소 주인 보고 2026-08-30)
 *
 *   node tools/verify471.js
 *
 * 규약(제품 `index.html` 의 471 블록):
 *   닷 코어 중심이 **호스트 테두리 바깥 상자(border box) 우상단 코너에서 안쪽 `--dot-in`** 에 앉는다.
 *   식은 한 곳에만 있다 — `right/top: calc(var(--dot-in) - var(--dot-r) - var(--dot-bw,0px))`.
 *
 * 자를 새로 만들지 않는다 — **재현 자 `tools/probe471.js` 에게 물어서** 그 숫자로 단언한다
 * (385 «자매 자 드리프트» 방지: 두 자가 서로 다른 화면·다른 상자를 재는 날이 반드시 온다).
 *
 * 절:
 *   [A] 전수 — 예외 목록 밖 자리는 코너 거리 dxR·dyT 가 `--dot-in` ±2px
 *   [B] 잘림 0 — 조상 클리핑이 닷 바깥 링을 한 자리도 안 자른다 (주인 스크린샷 ①의 «반달»)
 *   [C] 찍힌 픽셀 — 10 상점 서브탭 배지 원 둘레 8방향이 실제로 찍힌다(`probe471b`)
 *   [D] 선언 위생 — `.ifbtn.pbtn>.updot` 이중 선언 0 · 규약식은 한 곳 · 예외는 목록에 적힌 것뿐
 *   [E] 되돌림 — 규약값을 어긴 사본에서 [A] 가 **실제로 빨개진다**
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v471-neg.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* ── 예외 목록 ─────────────────────────────────────────────────────────────
   여기 적힌 자리만 규약 밖에 설 수 있다. **목록 밖의 «안쪽형» 은 [A] 가 빨갛게 한다.**
   목록을 늘리려면 «왜 코너를 못 쓰는가» 를 제품 주석과 review 에 같이 남길 것. */
const EXC = {
  'HUD 탭바 .tab .bdg':
    '프레임 좌우 변에 맞닿은 탭 칸 — 끝 칸이 코너를 쓰면 #app 밖으로 나가 잘린다(수리 전에도 7px)',
  '35 패스 탭 #psBar .pt>.bdg':
    '같은 이유(패스 하단 탭바도 프레임 변에 플러시)',
  '05 카드 .wgc>.updot':
    '코너가 `Lv.n` 잉크 자리다 — 코너에 두면 글자 오른쪽 19px 을 검정 링이 덮는다(verify283)',
  '07 카드 .sk-card>.updot':
    '코너가 272 해제 뱃지 `.sk-eq`(x123~172) 자리다 — 배지 둘이 한 코너를 못 나눈다(verify283)',
  '10 «10회 소환» 버튼 .cbtn.b1 (328 — 노드는 카드 자식)':
    '`.cbtn{overflow:hidden}` 이라 노드를 버튼 안에 못 넣는다 — 좌표는 카드 기준이되 `--dot-in` 에 묶여 있다',
  '89 유물 수반 #rwBasin>.updot':
    '호스트 상자의 코너가 **투명**하다(그릇 림은 x32..368 · y4..64 — 330 실측). ' +
    '보이는 호스트 = 림이라 규약을 «림 코너» 에 적용했다(제품 좌표도 `--dot-in` 에 묶여 있다)',
};

const probe = (file) => {
  const env = { ...process.env };
  if (file) env.P471_FILE = file;
  const out = execFileSync('node', [path.join(__dirname, 'probe471.js'), '--json'],
    { env, cwd: ROOT, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' });
  /* ⚠ `pwlaunch` 가 «번들 브라우저 없음» 안내를 stdout 으로 먼저 찍는다 — 그 줄의 `[i]` 를
     JSON 시작으로 읽으면 즉사한다. 배열 리터럴의 시작(`[` + 줄바꿈)으로 자른다. */
  return JSON.parse(out.slice(out.indexOf('[\n')));
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const inset = parseFloat((src.match(/:root\{--dot-in:([\d.]+)px\}/) || [])[1]);
  ok(inset > 0, '[전제] 제품이 규약 상수 `--dot-in` 을 한 곳에 선언한다', inset + 'px');

  const rows = probe(null);
  const seen = rows.filter(r => !r.missing);
  ok(seen.length >= 25, '[전제] 자리를 실제로 열어서 쟀다 (오프너가 죽으면 «결함 없음» 으로 읽힌다)',
    seen.length + '자리 · 못 연 자리 ' + rows.filter(r => r.missing).length);
  ok(rows.every(r => !r.missing), '[전제] 목록의 모든 자리에서 닷 노드를 찾았다',
    rows.filter(r => r.missing).map(r => r.label).join(' · ') || '없음');

  /* ── [A] 전수 — 코너 거리 ── */
  const off = seen.filter(r => !(r.label in EXC))
    .filter(r => Math.abs(r.dxR - inset) > 2 || Math.abs(r.dyT - inset) > 2);
  ok(off.length === 0, '[A] 예외 밖 전 자리 — 중심이 호스트 코너에서 안쪽 --dot-in (±2px)',
    off.length ? off.map(r => r.label + ' ' + r.dxR + '/' + r.dyT).join(' · ')
               : (seen.length - Object.keys(EXC).length) + '자리 전부');
  /* 예외도 «아무 값이나» 는 아니다 — 목록에 적혀 있어야 하고 수치는 기록으로 남긴다 */
  Object.keys(EXC).forEach(k => {
    const r = seen.find(x => x.label === k);
    ok(!!r, '[A] 예외 목록의 자리가 실제로 존재한다 — ' + k, r ? r.dxR + '/' + r.dyT : '없음');
  });
  /* ⚑ 음성항 — «예외 목록을 늘려서 통과» 하는 길을 막는다 */
  /* 자리 수를 **정확히** 못박는다 — 한 자리를 늘리려면 이 숫자와 위 사유를 같이 고쳐야 하고,
     그러면 «예외를 늘려서 통과» 가 조용히 일어날 수 없다(리뷰에 반드시 걸린다). */
  ok(Object.keys(EXC).length === 6, '[A] 음성 — 예외는 정확히 6자리다 (목록을 늘려 통과하는 길을 막는다)',
    Object.keys(EXC).length + '자리 · ' + Object.keys(EXC).join(' / '));
  ok(Object.values(EXC).every(v => v && v.length > 20),
    '[A] 음성 — 예외마다 «왜 코너를 못 쓰는가» 가 적혀 있다', Object.values(EXC).length + '건');

  /* ── [B] 잘림 0 ── */
  const cut = seen.filter(r => r.cutMax.some(v => v > 0.05));
  ok(cut.length === 0, '[B] 조상 클리핑이 닷 바깥 링을 한 자리도 안 자른다',
    cut.length ? cut.map(r => r.label + ' [' + r.cutMax.join('/') + '] ← ' + r.clipper).join(' · ') : '0자리');

  /* ── [C] 찍힌 픽셀 (주인 스크린샷 ① 자리) ── */
  const px = execFileSync('node', [path.join(__dirname, 'probe471b.js')],
    { cwd: ROOT, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
  const m = px.match(/잘린 배지 (\d+)\/(\d+)/);
  ok(m && Number(m[1]) === 0 && Number(m[2]) > 0,
    '[C] 찍힌 픽셀 — 10 상점 서브탭 배지가 원 둘레 8방향 전부 찍힌다(«반달» 회귀 감시)',
    m ? m[0] : '못 읽음');

  /* ── [D] 선언 위생 ── */
  const dup = (src.match(/\.ifbtn\.pbtn>\.updot\{/g) || []).length;
  ok(dup === 0, '[D] `.ifbtn.pbtn>.updot` 좌표 선언 0건 (471 ③ — 이중 선언을 지웠다)', dup + '건');
  /* 1회차 비평 이후 축이 갈렸다 — 가로만 예외로 미는 자리가 있어 `--dot-in-x`/`--dot-in-y` 가
     `--dot-in` 을 폴백으로 받는다. 식 자체는 여전히 한 규칙에만 있다. */
  const formula = (src.match(/var\(--dot-in-[xy],var\(--dot-in\)\) - var\(--dot-r\) - var\(--dot-bw,0px\)/g) || []).length;
  ok(formula === 2, '[D] 규약식(right/top)이 한 규칙에만 있다', formula + '회(= 한 규칙의 right·top)');
  ok(/\.ifbtn\{--dot-bw:var\(--gb-bw\)\}/.test(src),
    '[D] `.ifbtn` 은 자기 테두리(`--gb-bw`)를 읽는다 — 버튼마다 6/7 이 저절로 따라온다');

  /* ── [E] 되돌림 시험 ── */
  fs.writeFileSync(NEG, src.replace(':root{--dot-in:' + inset + 'px}', ':root{--dot-in:34px}'));
  let negOff = -1;
  try {
    const nrows = probe(NEG).filter(r => !r.missing);
    negOff = nrows.filter(r => !(r.label in EXC))
      .filter(r => Math.abs(r.dxR - inset) > 2 || Math.abs(r.dyT - inset) > 2).length;
  } finally { try { fs.unlinkSync(NEG); } catch (_) {} }
  ok(negOff > 10, '[E] 되돌림 — `--dot-in` 을 34 로 어긴 사본에서 [A] 가 실제로 무더기로 빨개진다',
    negOff + '자리 위반(허용 오차 ±2 는 한 칸도 안 넓혔다)');
  const back = probe(null).filter(r => !r.missing)
    .filter(r => !(r.label in EXC))
    .filter(r => Math.abs(r.dxR - inset) > 2 || Math.abs(r.dyT - inset) > 2).length;
  ok(back === 0, '[E] 되돌림을 걷으면 도로 초록 (시험이 상태를 안 남긴다)', back + '자리');

  console.log('\nVERIFY471 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
