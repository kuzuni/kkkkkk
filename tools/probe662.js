/* 작업 662 — 재현(338 규칙: 처방을 따르기 **전에** 실제로 찍힌 것부터 본다).
 *
 * 주인 지시(2026-09-02 00:20): «스킬 미개방한거 클릭시 세부에 ? 로 뜨는데 안그렇게 하기
 *                               스킬 설명도 잘써주고 내용들 잘써주기».
 *
 * 이 자가 하는 일은 하나다 — **미보유 상태의 08 세부 팝업을 스킬 27종 전수로 열어
 * «가려진 칸» 을 센다.** 한 칸만 열어 보면 «? 하나» 로 보이지만 실제로 가려진 자리는 다섯이다:
 *   ① 제목  `???`      ② 아이콘 `❔`      ③ 피해량 `—`
 *   ④ 보유 효과 `×1배`(강제 0 · 725 이전에는 `+0%`)  ⑤ 설명문 통째 («아직 획득하지 못했습니다…» 안내문으로 갈아 끼움)
 *
 * ⚑ **수리 전/후를 같은 자로 잰다.** `--old` 를 주면 index.html 의 사본에 수리 전 분기를
 *   되돌려 넣고 그 사본을 연다 — 등재문의 «? 로 뜬다» 가 몇 칸짜리였는지가 그 실행의 출력이다.
 *   (되돌림 시험 자체는 게이트 `verify662` §R 이 따로 못박는다. 여기는 «세는» 자다.)
 *
 * 실행: node tools/probe662.js        — 지금 트리
 *       node tools/probe662.js --old  — 수리 전 분기를 되돌린 사본
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OLD = process.argv.includes('--old');
const SRC = path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 수리 전 분기 복원 — 662 가 연 다섯 자리를 문자열로 되돌린다.
   ⚠ 못 갈아 끼운 자리가 하나라도 있으면 «되돌린 척» 이 되므로 치환 건수를 세서 알린다. */
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
  /* 여섯째 — 레벨 축. 수리 전 미보유는 **Lv. 0** 이었다(격자 카드는 Lv.1 이라 같은 스킬이
     두 화면에서 다른 레벨을 보였다 — 25076 의 «0/4 ↔ 0/5» 와 같은 병). */
  sub('const dLv = own ? oLv(id) : 1, lv = dLv;', 'const lv = oLv(id);');
  return { src, n };
}

(async () => {
  console.log('\n=== probe662 — 미보유 08 세부 팝업 «가려진 칸» 전수 재현 ==='
            + (OLD ? '  [수리 전 분기 복원]' : '  [지금 트리]'));

  let url = 'file://' + SRC;
  let tmp = null;
  if(OLD){
    const r = revert(fs.readFileSync(SRC, 'utf8'));
    ok(r.n === 6, '[0] 수리 전 분기 6자리를 전부 되돌렸다 — ' + r.n + '/6');
    /* ⚠ 사본은 **저장소 안**에 둔다 — /tmp 로 옮기면 `assets/…` 상대 경로가 통째로 죽어
       «콘솔 에러 0건» 항이 사본 탓에 빨개진다(제품 문제가 아닌 것을 게이트가 문제로 읽는다). */
    tmp = path.join(path.dirname(SRC), '.probe662-old.html');
    fs.writeFileSync(tmp, r.src);
    url = 'file://' + tmp;
  }

  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url);
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    /* 전 종을 «미보유» 로 만든다 — 부팅 세이브는 slash 하나만 갖고 있어 26종만 보인다. */
    SKILLS.forEach(s => { delete S.own[s.id]; });
    S.eqSkill = [];
    const rows = [];
    for(const s of SKILLS){
      showSkillDetail(s.id);
      const mb = document.getElementById('mbox');
      const q = c => { const el = mb.querySelector(c); return el ? el.textContent.trim() : ''; };
      rows.push({
        id: s.id,
        title: (document.getElementById('mtitle').textContent || '').trim(),
        ic: q('.sk-ic'),
        lv: q('.sk-lv'),
        dmg: q('.sk-ct .vl .nt'),
        own: q('.sk-ow .v'),
        desc: q('.sk-db p'),
        btn: [...mb.parentNode.querySelectorAll('.sk-act button')].map(x => !!x.disabled)
      });
    }
    return rows;
  });

  /* «가려짐» 의 정의 — 다섯 자리 각각. 문자열 하나가 아니라 자리마다 다른 표식이다. */
  const hidTitle = out.filter(r => /\?/.test(r.title));
  const hidIc    = out.filter(r => r.ic === '❔' || r.ic === '');
  const hidDmg   = out.filter(r => r.dmg === '—' || r.dmg === '');
  const hidOwn   = out.filter(r => /×1배/.test(r.own));   /* 725 — «강제 0» = 배율 1 */
  const hidDesc  = out.filter(r => /획득하지 못했습니다/.test(r.desc));
  const total    = hidTitle.length + hidIc.length + hidDmg.length + hidOwn.length + hidDesc.length;

  console.log('');
  console.log('  종 수 ' + out.length + ' (전부 미보유 상태)');
  console.log('  ① 제목 «?»        ' + hidTitle.length + '/' + out.length);
  console.log('  ② 아이콘 «❔»      ' + hidIc.length + '/' + out.length);
  console.log('  ③ 피해량 «—»       ' + hidDmg.length + '/' + out.length);
  console.log('  ④ 보유 효과 «×1배»(강제 0)  ' + hidOwn.length + '/' + out.length);
  console.log('  ⑤ 설명문 안내문     ' + hidDesc.length + '/' + out.length);
  console.log('  ⇒ 가려진 칸 합계 **' + total + '**');
  console.log('  표본 3종: ' + JSON.stringify(out.slice(0, 3).map(r =>
      r.title + ' | ' + r.ic + ' | ' + r.lv + ' | ' + r.dmg + ' | ' + r.own), null, 0));

  console.log('');
  if(OLD){
    ok(total > 0, '[1] 수리 전에는 가려진 칸이 있다 — ' + total + '칸 (등재문 «? 로 뜬다» 재현)');
    ok(hidTitle.length === out.length && hidIc.length === out.length,
       '[2] 가려짐은 «한 칸» 이 아니라 27종 전수다 — 제목 ' + hidTitle.length + ' · 아이콘 ' + hidIc.length);
  }else{
    ok(total === 0, '[1] 지금 트리에는 가려진 칸이 0건이다 — ' + total + '칸');
    ok(out.every(r => r.lv === 'Lv. 1'),
       '[2] 미보유 레벨 축은 07 격자 카드와 같은 **Lv. 1** 이다 — '
       + [...new Set(out.map(r => r.lv))].join(','));
    ok(out.every(r => r.btn.length === 2 && r.btn[0] && r.btn[1]),
       '[3] 여는 것은 표시뿐 — [장착]·[강화]는 그대로 disabled');
  }
  ok(errs.length === 0, '[4] 콘솔 에러 0건 — ' + JSON.stringify(errs.slice(0, 3)));

  await b.close();
  if(tmp) { try { fs.rmSync(tmp, { force: true }); } catch(_){} }
  console.log('\n  ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
