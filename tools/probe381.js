/* 작업 381 — 재현기 (`tools/neg229.js` 게이트 부패)
 *
 * 338 규칙: «등재문의 처방을 따르기 전에 재현부터 한다».
 * 등재문의 진단은 «`neg229` 의 행 상수 3개가 356 이 폐기한 `--sx` 를 아직 품어
 * 갈아 끼울 자리가 0곳이 됐다» 였다. 이 재현기는 그것을 **문자열 계수로 직접** 센다.
 *
 * ⚑ 이 결함의 본체는 «4건 FAIL» 이 아니라 **«조용한 구멍»** 이다 —
 *   neg229 의 루프는 자리를 못 찾으면 `continue` 라 그 블록의 want/not 이 **아예 안 세진다**.
 *   그래서 화면에는 FAIL 이 4줄만 뜨는데 실제로 사라진 단언은 **47항**이다(93 − 46).
 *   [4] 가 그 수를 센다.
 *
 * 실행: node tools/probe381.js  → 마지막 줄이 `PROBE381 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NEG = path.join(ROOT, 'tools', 'neg229.js');

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };
const hits = s => SRC.split(s).length - 1;

/* 381 이전의 neg229 가 박아 두고 있던 세 상수 — 그대로 옮겨 적었다(부패의 물증). */
const OLD = {
  coll: `      <div class="ibtn" data-pop="coll" style="--sf:.864;--sx:1.067;--dx:2px;--dy:.5px"><span class="si">📚</span><span class="sl">도감</span><span class="bdg"></span></div>`,
  bless: `      <div class="ibtn" data-pop="bless" style="--sf:.862;--sx:1.235;--dx:2px;--dy:1.5px"><span class="si">🙏</span><span class="sl">축복</span><span class="bdg"></span></div>`,
  attend: `      <div class="ibtn" data-pop="attend" title="출석" style="--sf:.896;--sx:1.130;--dx:.5px;--dy:2.5px"><span class="si">📅</span><span class="sl">출석</span><span class="bdg"></span></div>`,
};

/* 381 이 넣은 뽑기 — neg229 의 `row()` 와 **같은 정규식**이다. */
const rowRe = pop => new RegExp(`^[ \\t]*<div class="ibtn"[^\\n]*?data-pop="${pop}"[^\\n]*?</div>$`, 'gm');

console.log('[1] 부패 재현 — 옛 상수 3개는 현재 index.html 에 «0곳» 이다');
for (const [pop, s] of Object.entries(OLD)) {
  const h = hits(s);
  ok(`옛 상수 ${pop} = 0곳`, h === 0, `${h}곳`);
}

console.log('\n[2] 처방 — data-pop 으로 뽑으면 «정확히 1곳» 이다');
const got = {};
for (const pop of ['coll', 'bless', 'attend']) {
  const h = SRC.match(rowRe(pop)) || [];
  ok(`뽑기 ${pop} = 1곳`, h.length === 1, `${h.length}곳`);
  got[pop] = h[0] || '';
}

console.log('\n[3] 왜 0곳이 됐나 — 뽑은 행이 «356 이 지운 --sx» 와 «371 이 바꾼 글리프» 를 증언한다');
ok('세 행 전부 --sx 없음 (356 — 비균등 scaleX 금지)',
  ['coll', 'bless', 'attend'].every(p => !got[p].includes('--sx')),
  ['coll', 'bless', 'attend'].filter(p => got[p].includes('--sx')).join(',') || '3/3 없음');
ok('축복 글리프 = 😇 (371 — 🙏 에서 교체)', got.bless.includes('😇'), got.bless.includes('🙏') ? '아직 🙏' : '😇');
ok('축복 --sf = .872 (371)', got.bless.includes('--sf:.872'), (got.bless.match(/--sf:[^;"]*/) || ['?'])[0]);
/* 옛 상수와 새 행이 «같은 행» 임을 못박는다 — 뽑기가 엉뚱한 줄을 문 게 아니라
   같은 자리의 스타일만 바뀐 것이라는 증명(안 그러면 [1] 의 0곳은 다른 이유일 수 있다). */
ok('세 행 전부 data-pop 과 라벨이 옛 상수와 같다',
  ['coll', 'bless', 'attend'].every(p => {
    const lbl = (OLD[p].match(/<span class="sl">([^<]*)</) || [])[1];
    return got[p].includes(`data-pop="${p}"`) && got[p].includes(`<span class="sl">${lbl}<`);
  }), '도감·축복·출석');

console.log('\n[4] 크기 — «조용한 구멍» 은 FAIL 4줄이 아니라 단언 47항이다');
const score = () => {
  let out;
  try { out = execFileSync('node', [NEG], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const m = out.match(/NEG229 (PASS|FAIL) — (\d+)\/(\d+)/);
  return m ? { verdict: m[1], n: +m[2], tot: +m[3] } : null;
};
const now = score();
ok('현재 neg229 = PASS 93/93', now && now.verdict === 'PASS' && now.n === 93 && now.tot === 93,
  now ? `${now.verdict} ${now.n}/${now.tot}` : '점수를 못 읽었다');
/* 되돌림 — 옛 상수를 도로 박은 **사본**을 만들어 돌린다(살아 있는 파일은 안 건드린다). */
console.log('\n[R] 되돌림 시험 — 옛 상수를 도로 박으면 42/46 으로 죽는다');
/* ⚠ 사본은 반드시 `tools/` 안에 둔다 — neg229 는 ROOT 를 `path.resolve(__dirname,'..')` 로 잡고
   `verify71.js` 도 `__dirname` 으로 찾는다. ROOT 에 두면 저장소 «바깥» 을 뒤져 ENOENT 로 죽는다. */
const TMP = path.join(ROOT, 'tools', `.p381-neg-${process.pid}.js`);
try {
  let js = fs.readFileSync(NEG, 'utf8');
  js = js.replace(/const COLL_ROW = row\('coll'\);/, 'const COLL_ROW = ' + JSON.stringify(OLD.coll) + ';')
         .replace(/const BLESS_ROW = row\('bless'\);/, 'const BLESS_ROW = ' + JSON.stringify(OLD.bless) + ';')
         .replace(/const ATTEND_ROW = row\('attend'\);/, 'const ATTEND_ROW = ' + JSON.stringify(OLD.attend) + ';');
  fs.writeFileSync(TMP, js);
  let out;
  try { out = execFileSync('node', [TMP], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const m = out.match(/NEG229 (PASS|FAIL) — (\d+)\/(\d+)/);
  ok('옛 상수 사본 = FAIL 42/46', !!m && m[1] === 'FAIL' && +m[2] === 42 && +m[3] === 46,
    m ? `${m[1]} ${m[2]}/${m[3]}` : '점수를 못 읽었다');
  const dead = (out.match(/갈아 끼울 자리가 전부 정확히 1곳 — 1개가 1곳이 아니다/g) || []).length;
  ok('죽는 블록 = 4개 (N1·N2·N3·N6)', dead === 4, `${dead}개`);
  ok('사라진 단언 = 47항 (93 → 46)', !!m && 93 - (+m[3]) === 47, m ? `${93 - +m[3]}항` : '—');
} finally { try { fs.unlinkSync(TMP); } catch (_) {} }

/* 가드가 «조용한 0곳» 을 다시는 안 만든다는 증명 — 없는 pop 을 뽑으면 그 자리에서 죽어야 한다.
   381 이 고친 것의 핵심이라 음성항으로 못박는다(«0곳이면 continue» 가 부패의 뿌리였다). */
console.log('\n[R2] 가드 — 뽑기가 실패하면 «조용히 지나가지» 않고 그 자리에서 죽는다');
const TMP2 = path.join(ROOT, 'tools', `.p381-guard-${process.pid}.js`);
try {
  const js = fs.readFileSync(NEG, 'utf8').replace(/const COLL_ROW = row\('coll'\);/, "const COLL_ROW = row('nosuchpop');");
  fs.writeFileSync(TMP2, js);
  let code = 0, out = '';
  try { out = execFileSync('node', [TMP2], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  ok('없는 pop → 종료 코드 1', code === 1, `코드 ${code}`);
  ok('없는 pop → «0곳 찾았다» 를 말한다', /0곳 찾았다/.test(out), out.split('\n').find(l => /neg229:/.test(l)) || '메시지 없음');
} finally { try { fs.unlinkSync(TMP2); } catch (_) {} }

console.log('\nPROBE381 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
