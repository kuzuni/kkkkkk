/* 게이트 662 — «미개방 스킬 세부 정보 공개 + 설명문 데이터 파생»
 *
 * 주인 지시(2026-09-02 00:20): «스킬 미개방한거 클릭시 세부에 ? 로 뜨는데 안그렇게 하기
 *                               스킬 설명도 잘써주고 내용들 잘써주기».
 *
 * 절 여섯:
 *   [A] 미보유 27종 전수 — 가려진 칸 0건(제목·아이콘·피해량·보유 효과·설명문)
 *   [B] 여는 것은 «표시» 뿐 — [장착]·[강화]는 미보유에서 여전히 disabled (664 규약과 한 벌)
 *   [C] 설명문 품질 감사 — 비어 있음 0 · 중복 0 · **틀에 손으로 적은 숫자 0** (파생 불변식)
 *   [D] 자리표 전수 — 모든 `{필드}` 가 그 스킬 데이터에서 실제로 풀린다(안 풀린 자리표 0)
 *   [E] 표시 = 데이터 — 그려진 설명문의 수치를 게이트가 **독립으로 다시 계산**해 대조
 *   [R] 되돌림 시험 — 수리 전 분기를 되돌린 사본에서 [A]·[C] 가 **빨개져야** 한다
 *
 * ⚑ [C] 가 이 게이트의 본체다. 등재문이 «손으로 적은 수치가 데이터와 어긋나는 것이 최악»
 *   이라고 못박았는데, «지금 값이 맞나» 만 세면 **다음 사람이 새 숫자를 손으로 적는 것**을
 *   못 막는다. 그래서 값이 아니라 **틀**을 단언한다 — 틀에 맨 숫자가 있으면 그 자체로 빨강.
 *   (334 처방 ①·537 A3 «개수가 아니라 목록» 과 같은 꼴: 표기 규약이 바뀌어도 안 썩는다.)
 *
 * 실행: node tools/verify662.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 페이지 안에서 한 번에 걷어 오는 표 — 27종 × (미보유 렌더 · 데이터 · 자리표) */
const HARVEST = () => {
  SKILLS.forEach(s => { delete S.own[s.id]; });
  S.eqSkill = [];
  const rows = [];
  for(const s of SKILLS){
    showSkillDetail(s.id);
    const mb = document.getElementById('mbox');
    const q = c => { const el = mb.querySelector(c); return el ? el.textContent.trim() : ''; };
    /* 자리표는 **틀**(s.d)에서 뽑는다 — 그려진 글에서 뽑으면 이미 숫자로 바뀐 뒤다 */
    const toks = (String(s.d || '').match(/\{(\w+)\}/g) || []).map(t => t.slice(1, -1));
    rows.push({
      id: s.id, tpl: String(s.d || ''), toks,
      /* 자리표가 실제로 푼 값 — 게이트는 이 값을 «다시» 계산해 대조한다([E]) */
      solved: toks.map(k => ({ k, v: (SK_DESC_F[k] ? SK_DESC_F[k](s) : null) })),
      raw: { hits:s.hits, cnt:s.cnt, pierce:s.pierce, bnc:s.bnc, vol:s.vol,
             dur:s.dur, zlife:s.zlife, wb:s.wb, cd:s.cd, slow:s.slow },
      title: (document.getElementById('mtitle').textContent || '').trim(),
      ic: q('.sk-ic'), lv: q('.sk-lv'), dmg: q('.sk-ct .vl .nt'),
      cool: q('.sk-ct .vl div:first-child'),
      own: q('.sk-ow .v'), desc: q('.sk-db p'),
      /* 미보유 딱지는 설명 본문과 갈라 센다 — 본문이 딱지에 먹히면 «열었다» 가 거짓말이 된다 */
      unTag: q('.sk-db p .sk-un'),
      btn: [...mb.parentNode.querySelectorAll('.sk-act button')].map(x => !!x.disabled),
      /* 화면 밖으로 잘렸는가 — `.sk-db` 는 overflow:hidden 290px 이다 */
      overflow: (() => { const el = mb.querySelector('.sk-db');
                         return el ? el.scrollHeight - el.clientHeight : -1; })()
    });
  }
  return rows;
};

/* 수리 전 분기 복원 — probe662 와 **같은 표**를 쓴다(둘이 갈라지면 되돌림 시험이 거짓이 된다) */
function revert(src){
  let n = 0;
  const sub = (a, b) => { if(src.indexOf(a) < 0) return; src = src.split(a).join(b); n++; };
  sub("$('mtitle').textContent = it.n;", "$('mtitle').textContent = own ? it.n : '???';");
  sub("+   '<div class=\"sk-ic\">' + it.ic + '</div>'",
      "+   '<div class=\"sk-ic\">' + (own ? it.ic : '❔') + '</div>'");
  sub('const dmgNow = () => fmtB(skillDmgAt(it, own ? oLv(id) : 1));',
      "const dmgNow = () => own ? fmtB(skillDmg(it)) : '—';");
  /* 725 이관 — 표기가 «×N배» 로 갔다. 되돌림 사본이 재현하는 **결손은 그대로**다(미보유를 0 으로
     눌러 적는 것) — 옛 «+0%» 자리에 이제 `fmtEff(0)` = «×1배» 가 선다. */
  sub("const ownNow = () => '공격력 <em>' + fmtEff(ownValAt(it, own ? oLv(id) : 1)) + '</em>';   /* 725 */",
      "const ownNow = () => '공격력 <em>' + (own ? fmtEff(ownVal(it)) : fmtEff(0)) + '</em>';");
  sub('  const desc = skillDescText(it)',
      "  const desc = (own ? skillDescText(it) : '아직 획득하지 못했습니다.<br>스킬 소환으로 획득하세요.')");
  sub('const dLv = own ? oLv(id) : 1, lv = dLv;', 'const lv = oLv(id);');
  return { src, n };
}

/* 게이트가 제품과 **따로** 계산하는 수치 표기 — 제품의 `skDescNum` 을 베끼지 않고 다시 적는다.
   (같은 함수를 부르면 «자기가 만든 값을 자기가 확인» 하는 자가 된다 — LESSONS 333-③) */
const numTxt = v => (v == null ? null : String(+(+v).toFixed(2)));

(async () => {
  console.log('\n=== verify662 — 미개방 스킬 세부 공개 + 설명문 데이터 파생 ===');
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  const open = async url => {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(url);
    await p.waitForTimeout(1200);
    const rows = await p.evaluate(HARVEST);
    return { p, rows, errs };
  };

  const cur = await open('file://' + SRC);
  const R = cur.rows;
  const N = R.length;

  /* ── [A] 가려진 칸 0건 ─────────────────────────────────────────── */
  console.log('\n[A] 미보유 27종 — 가려진 칸');
  ok(N === 27, '[A0] 스킬은 27종이다 — ' + N
     + '  (⚠ PROGRESS 662 등재문의 «24종» 은 낡은 수다. 504 이후 27종)');
  const bad = (name, f) => {
    const hit = R.filter(f);
    ok(hit.length === 0, '[A] ' + name + ' 0건 — ' + hit.length
       + (hit.length ? ' : ' + hit.slice(0, 4).map(r => r.id).join(',') : ''));
  };
  bad('제목에 «?»',        r => /\?/.test(r.title));
  bad('아이콘 «❔»/빈칸',   r => r.ic === '❔' || r.ic === '');
  bad('피해량 «—»/빈칸',   r => r.dmg === '—' || r.dmg === '');
  /* 725 이관 — «강제 0» 의 얼굴이 «+0%» 에서 «×1배» 로 바뀌었다(값이 0 이면 배율이 1 이다).
     미보유 칸도 Lv.1 기준의 실값이라 «×1배» 는 여전히 «눌러 적었다» 는 뜻뿐이다. */
  bad('보유 효과 «×1배»(강제 0)', r => /×1배/.test(r.own));
  bad('설명문 안내문 대체', r => /획득하지 못했습니다/.test(r.desc));
  bad('쿨타임 빈칸',       r => !r.cool);
  ok(R.every(r => r.title === r.desc.slice(0, 0) + r.title && r.title.length >= 2
                  && !/^\s*$/.test(r.title)),
     '[A6] 제목이 전부 실명이다 — ' + R.slice(0, 3).map(r => r.title).join(' · ') + ' …');
  ok(R.every(r => r.lv === 'Lv. 1'),
     '[A7] 미보유 레벨 축 = 07 격자 카드와 같은 Lv. 1 — ' + [...new Set(R.map(r => r.lv))].join(','));
  /* 음성항 — «열었다» 가 «상태를 안 적는다» 가 되면 안 된다(가진 것으로 읽힌다) */
  ok(R.every(r => /🔒/.test(r.unTag)),
     '[A8] 미보유 딱지(🔒)가 27종 전부에 있다 — ' + R.filter(r => /🔒/.test(r.unTag)).length + '/' + N);
  ok(R.every(r => r.overflow <= 0),
     '[A9] 설명 상자(290px overflow:hidden)에서 잘린 칸 0건 — 최대 넘침 '
     + Math.max.apply(null, R.map(r => r.overflow)) + 'px');

  /* ── [B] 여는 것은 표시뿐 ──────────────────────────────────────── */
  console.log('\n[B] 조작은 그대로 막혀 있다');
  ok(R.every(r => r.btn.length === 2), '[B1] 미보유 세부의 버튼은 2개다 — '
     + [...new Set(R.map(r => r.btn.length))].join(','));
  ok(R.every(r => r.btn[0] === true), '[B2] [장착] 은 27종 전부 disabled');
  ok(R.every(r => r.btn[1] === true), '[B3] [강화] 는 27종 전부 disabled');

  /* ── [C] 설명문 품질 감사 ─────────────────────────────────────── */
  console.log('\n[C] 설명문 감사 — 비어있음 · 중복 · 손으로 적은 수치');
  const empty = R.filter(r => r.tpl.trim().length < 12);
  ok(empty.length === 0, '[C1] 비었거나 지나치게 짧은 설명 0건(12자 미만) — ' + empty.length
     + (empty.length ? ' : ' + empty.map(r => r.id).join(',') : ''));
  const seen = {}, dup = [];
  R.forEach(r => { const k = r.tpl.trim(); if(seen[k]) dup.push(r.id + '↔' + seen[k]); else seen[k] = r.id; });
  ok(dup.length === 0, '[C2] 같은 설명을 재탕한 칸 0건 — ' + dup.length
     + (dup.length ? ' : ' + dup.join(',') : ''));
  /* ⚑ 본체 — 틀에 «맨 숫자» 가 있으면 그것이 곧 손으로 적은 수치다.
     자리표(`{cnt}`)는 중괄호 안이라 이 정규식에 안 걸린다. */
  const hand = R.filter(r => /(^|[^{\w])\d/.test(r.tpl.replace(/\{\w+\}/g, ' ')));
  ok(hand.length === 0, '[C3] **틀에 손으로 적은 숫자 0건** — ' + hand.length
     + (hand.length ? ' : ' + hand.map(r => r.id + '«' + r.tpl.slice(0, 40) + '»').join(' / ') : ''));
  /* 톤 — 27종 전부 마침표로 끝나는 서술문(«… (지속)» 꼴 조각 문장을 되살리면 빨강) */
  const tone = R.filter(r => !/\.$/.test(r.tpl.trim()));
  ok(tone.length === 0, '[C4] 27종 전부 마침표로 끝나는 서술문 — 어긋난 칸 ' + tone.length
     + (tone.length ? ' : ' + tone.map(r => r.id).join(',') : ''));
  const shortD = R.filter(r => r.tpl.trim().length < 20);
  ok(shortD.length === 0, '[C5] «한 줄 요약» 급(20자 미만) 0건 — ' + shortD.length
     + '  (최단 ' + Math.min.apply(null, R.map(r => r.tpl.trim().length)) + '자 · 최장 '
     + Math.max.apply(null, R.map(r => r.tpl.trim().length)) + '자)');

  /* ── [D] 자리표가 전부 풀린다 ─────────────────────────────────── */
  console.log('\n[D] 자리표 — 안 풀린 자리표 0건');
  const unres = R.filter(r => /\{\w+\}/.test(r.desc));
  ok(unres.length === 0, '[D1] 그려진 설명에 남은 «{…}» 0건 — ' + unres.length
     + (unres.length ? ' : ' + unres.map(r => r.id).join(',') : ''));
  const nullTok = [];
  R.forEach(r => r.solved.forEach(s => { if(s.v == null) nullTok.push(r.id + '.{' + s.k + '}'); }));
  ok(nullTok.length === 0, '[D2] 데이터에 없는 필드를 가리키는 자리표 0건 — ' + nullTok.length
     + (nullTok.length ? ' : ' + nullTok.join(',') : ''));
  const nTok = R.reduce((a, r) => a + r.toks.length, 0);
  ok(nTok >= 20, '[D3] 자리표가 실제로 쓰이고 있다 — ' + nTok + '개 / '
     + R.filter(r => r.toks.length).length + '종  (0 이면 «파생» 이 이름뿐이라는 뜻)');

  /* ── [E] 표시 = 데이터 (게이트가 독립으로 다시 계산) ──────────── */
  console.log('\n[E] 그려진 수치 = 데이터에서 다시 계산한 수치');
  const mismatch = [];
  R.forEach(r => {
    r.toks.forEach(k => {
      const src = k === 'slow' ? (r.raw.slow == null ? null : r.raw.slow * 100) : r.raw[k];
      const want = numTxt(src);
      if(want == null) { mismatch.push(r.id + '.{' + k + '} = 데이터 없음'); return; }
      /* 그려진 글 안에 그 수가 실제로 있는가 — `<em>` 로 감싸도 textContent 에는 숫자로 남는다 */
      if(r.desc.indexOf(want) < 0) mismatch.push(r.id + '.{' + k + '} → ' + want + ' 없음');
    });
  });
  ok(mismatch.length === 0, '[E1] 자리표가 푼 수 ' + nTok + '개가 전부 화면에 있다 — 어긋남 '
     + mismatch.length + (mismatch.length ? ' : ' + mismatch.slice(0, 4).join(' / ') : ''));
  /* 음성항 — 화면에 있는 수 중 **데이터에서 안 나온 수**가 있으면 손으로 적힌 것이다.
     ⚠ 딱지(«Lv. 1»)는 설명 본문이 아니므로 잘라 낸다. */
  const orphan = [];
  R.forEach(r => {
    const body = r.desc.replace(r.unTag, '');
    const nums = body.match(/\d+(?:\.\d+)?/g) || [];
    const allow = r.toks.map(k => numTxt(k === 'slow' ? r.raw.slow * 100 : r.raw[k]));
    nums.forEach(n => { if(allow.indexOf(n) < 0) orphan.push(r.id + ' «' + n + '»'); });
  });
  ok(orphan.length === 0, '[E2] 설명 본문에 데이터 밖 숫자 0건 — ' + orphan.length
     + (orphan.length ? ' : ' + orphan.slice(0, 5).join(' / ') : ''));
  ok(cur.errs.length === 0, '[E3] 콘솔 에러 0건 — ' + JSON.stringify(cur.errs.slice(0, 3)));
  await cur.p.close();

  /* ── [R] 되돌림 시험 ─────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 수리 전 분기를 되돌린 사본은 빨개져야 한다');
  const rv = revert(fs.readFileSync(SRC, 'utf8'));
  ok(rv.n === 6, '[R0] 수리 전 분기 6자리를 전부 되돌렸다 — ' + rv.n + '/6'
     + '  (못 되돌리면 아래 두 항이 «무르게» 통과한다)');
  const tmp = path.join(path.dirname(SRC), '.verify662-old.html');
  fs.writeFileSync(tmp, rv.src);
  let old = null;
  try {
    old = await open('file://' + tmp);
    const oHid = old.rows.filter(r => /\?/.test(r.title)).length
               + old.rows.filter(r => r.ic === '❔').length
               + old.rows.filter(r => r.dmg === '—').length
               + old.rows.filter(r => /×1배/.test(r.own)).length   /* 725 — 강제 0 = 배율 1 */
               + old.rows.filter(r => /획득하지 못했습니다/.test(r.desc)).length;
    ok(oHid === 135, '[R1] 수리 전 사본은 [A] 가 빨갛다 — 가려진 칸 ' + oHid + ' (27종 × 5자리)');
    ok(old.rows.every(r => r.lv === 'Lv. 0'),
       '[R2] 수리 전 미보유 레벨은 Lv. 0 이었다(격자 카드 Lv.1 과 어긋남) — '
       + [...new Set(old.rows.map(r => r.lv))].join(','));
    await old.p.close();
  } finally {
    try { fs.rmSync(tmp, { force: true }); } catch(_){}
  }
  /* [C3] 의 되돌림 — 틀에 숫자를 하나 심으면 그 항이 빨개지는가(자 자신의 회귀) */
  const probe = R[0].tpl.replace(/\.$/, ' 3초 뒤 사라진다.');
  ok(/(^|[^{\w])\d/.test(probe.replace(/\{\w+\}/g, ' ')),
     '[R3] [C3] 의 자는 손으로 적은 숫자를 실제로 잡는다 — 시험 문자열 «… 3초 …» 빨강 확인');
  ok(!/(^|[^{\w])\d/.test('탄 {cnt}발을 쏜다.'.replace(/\{\w+\}/g, ' ')),
     '[R4] 그 자가 **자리표는 숫자로 안 센다** — «탄 {cnt}발» 초록 확인');

  await b.close();
  console.log('\n  VERIFY662 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
