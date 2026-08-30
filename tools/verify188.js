#!/usr/bin/env node
/* 작업 188 게이트 — «데미지·체력도 골드처럼 a/b/c 알파벳 단위».
   실행: node tools/verify188.js

   저장소 주인 정정(2026-08-27): «데미지 같은 경우는 a b c 식으로 표시돼야 함 — 체력이랑».
   150(«골드만 접는다»)의 부분 되돌림이 아니라 **범위 확장**이다 — 골드는 그대로 `fmtG`,
   전투 수치는 새 `fmtB` 로 같이 접고, **재화(다이아·유물조각·마일리지)·가격·개수·레벨·층수는
   150 그대로 «숫자 그대로»** 다. 그 경계가 이 게이트의 본체다.

   지시서 [3]-(가) 기계적 작업 — 비평가 없음. 보는 것:
     ① 소스   — `fmtB` 정의 · 전투 수치 싱크가 전부 `fmtB` · `SUF[` 참조 수 불변(4)
     ② 표기층 — `fmtB` 가 `fmtG` 와 **같은 글자**를 낸다(규칙 두 벌 금지) · 값 표
     ③ 런타임 — 화면에 실제로 찍힌 문자열. «옛 규약이었다면 다른 글자가 나오는» 값을 쓴다
                 (1.234e7 은 150 규약이면 «12,340,000», 188 규약이면 «12.3B»)
     ④ 경계   — 재화·가격·개수는 여전히 «숫자 그대로»(150 회귀 방지)
     ⑤ 기능   — T2 «기능 완성 규칙»: 버튼을 눌러 **값이 바뀐 뒤에도** 표기층이 유지되는가
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const FILE = 'file://' + SRC;

const R = [];
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });

/* «숫자 + 대문자 1~2자» = 접힌 알파벳 단위. 1000 미만은 접미사가 없으므로 {0,2} 로 열어 두고
   «쉼표가 있으면 원시 표기» 라는 반대 방향으로 가른다(작은 값에서 두 표기층은 같은 글자다). */
const UNIT = /^\d{1,3}(\.\d+)?[A-Z]{1,2}$/;
const RAWNUM = /\d,\d/;

(async () => {
  /* ── ① 소스 스캔 ───────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  yes('① fmtB(전투 수치 알파벳 단위) 정의', /const fmtB = n => fmtG\(n\);/.test(src));
  yes('① fmtB 는 fmtG 를 그대로 부른다(표기 규칙 두 벌 금지)',
    !/function fmtB\(/.test(src) && (src.match(/SUF\[/g) || []).length === 4);
  yes('① 전투 수치 호출부가 fmtB 로 갈라져 있다(≥ 30곳)', (src.match(/fmtB\(/g) || []).length >= 30);

  /* 싱크별로 «그 줄이 fmtB 를 부르는가» 를 한 줄씩 못 박는다. 새 코드가 이 자리를 fmt 로
     되돌리면(=150 규약으로 회귀) 여기서 걸린다. */
  const SINK = [
    ['전투 데미지 라벨(신규)', /nums\.push\(\{ x, y: ny, v:fmtB\(v\)/],
    ['전투 데미지 라벨(병합)', /q\.raw \+= v; q\.v = fmtB\(q\.raw\);/],
    ['보스 HP 바', /\$\('bossHpN'\)\.textContent = fmtB\(hp\);/],
    ['레이드 누적 피해', /\$\('bossHpN'\)\.textContent = fmtB\(raidDmg\);/],
    ['HUD 전투력', /\$\('cpN'\)\.textContent = fmtB\(jzRollVal\('cp', cp\(\)\)\);/],
    ['플레이어 체력', /\$\('hpT'\)\.textContent = fmtB\(Math\.max\(0, player\.hp\)\) \+ ' \/ ' \+ fmtB\(maxHp\);/],
    /* 338 이관 — 이 싱크가 «누적 피해» 에서 **«남은 보스 체력»** 으로 바뀌었다(바가 39 보스
       체력바와 같은 방향이 됐다). 묻는 것은 그대로다: 이 자리의 전투 수치가 fmtB 를 지나는가. */
    ['30 던전 런 — 남은 보스 체력', /\$\('dunBarN'\)\.textContent = fmtB\(dunBossHpVal\(\)\);/],
    ['23 훈련 — 피해', /show:l => '피해 ' \+ fmtB\(/],
    ['23 훈련 — 체력', /show:l => fmtB\(U\.hp\.val/],
    ['23 훈련 — 재생', /show:l => '초당 ' \+ fmtB\(U\.regen/],
    ['23 훈련 — 증가분(+N)', /gain:'\+' \+ fmtB\(gain\)/],
    /* 343 이관(2026-08-29) — 이 두 항은 «'피해 <b>' + fmtB(…)» 라는 **옛 문자열 조립 형태**에 굳어
       있었다. 262 가 08 세부 팝업의 «레벨을 타는 칸» 을 함수 한 벌(`dmgNow`/`ct3Now`)로 뽑고
       268 이 껍데기를 `.sk-ct` 2열 표(«쿨타임|피해량»)로 통일하면서 그 조립문이 사라졌다 —
       제품은 내내 `fmtB(skillDmg(it))`·`fmtB(petDmg(it))` 를 부르고 있었고 굳은 것은 게이트뿐이다.
       ⇒ 자리만 «지금 그 값을 만드는 함수» 로 옮기고 **묻는 것은 그대로 둔다**: 이 값이 fmtB 를
       지나는가. 펫은 자리가 둘(표 4번째 칸 · 설명문 «장착 효과» 줄)이라 칸을 갈라 쓴다
       (326 교훈 — 한 항이 두 자리를 겸하면 한쪽이 사라져도 초록이다). */
    ['04 스킬 피해 — 세부 표 «피해량» 칸(dmgNow)', /const dmgNow = \(\) => own \? fmtB\(skillDmg\(it\)\) : '—';/],
    ['07 펫 피해 — 세부 표 «피해량» 칸(ct3Now)', /ct3Now = \(\) => cat === 'pet'\s+\? \(own \? fmtB\(petDmg\(it\)\) : '—'\)/],
    /* 481 이관(2026-08-30) — 이 항은 **485 가 그 줄을 다시 쓴 뒤로 빨갰다**(수리 전 76/79).
       485 가 «장착 효과 — 공격력 +n%» 를 앞에 붙이고 481 이 라벨을 «전투 참여 피해» → «전투 피해»
       로 줄이면서 옛 조립문이 사라진 것이고, 제품은 그 사이에도 내내 `fmtB(petDmg(it))` 를 불렀다
       (343 이 이 파일에서 이미 한 번 겪은 것과 같은 꼴 — 굳은 것은 게이트뿐이다).
       ⇒ 자리만 지금 그 줄로 옮기고 **묻는 것은 그대로 둔다**: 이 값이 fmtB 를 지나는가. */
    ['07 펫 피해 — 설명문 «전투 피해» 칸', /· 전투 피해 <em>'\s*\+\s*fmtB\(petDmg\(it\)\) \+ '<\/em>/],
    ['06 장비 공격력 알약', /class="eqst a"[^\n]*fmtB\(stat\.dmg\)/],
    ['06 장비 체력 알약', /class="eqst b"[^\n]*fmtB\(stat\.maxHp\)/],
    ['25 정보 탭 공격력', /\['햄지 공격력', fmtB\(stat\.dmg\)\]/],
    ['25 정보 탭 체력', /\['햄지 체력', fmtB\(stat\.maxHp\)\]/],
    ['25 정보 탭 재생', /\['햄지 체력 재생', fmtB\(stat\.regen\)/],
    ['19 스펙 DPS·공격력', /DPS <b>' \+ fmtB\(stat\.dps\)[^\n]*fmtB\(stat\.dmg\)/],
    ['03 던전 요구 전투력', /fmtB\(need\)/],
    ['03 레이드 최고 DPS', /\(b\.dps > 0 \? fmtB\(b\.dps\) : '-'\)/],
    ['04 레이드 세부 최고 기록', /b\.dmg > 0 \? fmtB\(b\.dmg\) \+ ' \(DPS ' \+ fmtB\(b\.dps\)/],
    ['아레나 상대 전투력', /상대 전투력 <b>' \+ fmtB\(a\.op\.cp\)/],
    ['103 채팅 랭커 전투력', /fmtB\(rkCp\(p\.best\)\)/],
  ];
  SINK.forEach(([n, re]) => yes('① 싱크 — ' + n, re.test(src)));
  /* 반대 방향: 이 싱크들이 다시 `fmt(` 로 새지 않았는가 */
  eq('① 전투 수치 자리에 남은 fmt( 호출', (src.match(/fmtB?\(stat\.(dmg|maxHp|regen|dps)\)/g) || [])
    .filter(s => !s.startsWith('fmtB')).length, 0);
  /* 343 — 스킬·펫 피해도 같은 반대 방향을 세운다. 위의 자리 단언이 «그 줄이 fmtB 를 부른다» 를
     보는 반면 이쪽은 «어디서도 다른 표기층으로 새지 않는다» 를 본다 — 자리를 옮긴 항이
     새 자리에서 초록인 채로 **옛 자리가 fmt 로 부활**하는 것을 막는 짝이다.
     `fmt` `fmtG` `fmtCur` 무엇이든 걸리게 접두어를 열어 두고 `fmtB(` 만 통과시킨다. */
  eq('① 스킬·펫 피해 표기층에 남은 비-fmtB 호출',
    (src.match(/\bfmt[A-Za-z]*\((skillDmg|petDmg)\(/g) || []).filter(s => !s.startsWith('fmtB(')).length, 0);

  /* ── 페이지 ────────────────────────────────────────────────────── */
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  /* ── ② 표기층 ── */
  const CASES = [[999, '999'], [5.07e3, '5.07A'], [1.234e7, '12.3B'], [2.36e9, '2.36C'], [4.2e15, '4.20E']];
  const bGot = await p.evaluate(cs => cs.map(c => fmtB(c[0])), CASES);
  CASES.forEach((c, i) => eq('② fmtB(' + c[0] + ') 알파벳 단위', bGot[i], c[1]));
  eq('② fmtB = fmtG (같은 규칙 한 벌)',
    await p.evaluate(() => [1, 999, 1234, 1.234e7, 9.9999e5, 4.2e15].every(v => fmtB(v) === fmtG(v))), 'true');
  eq('② fmtB(Infinity)', await p.evaluate(() => fmtB(Infinity)), '∞');
  /* 경계 — 재화는 150 그대로다 */
  eq('④ fmt(2.36e9) 재화는 숫자 그대로(150 불변)', await p.evaluate(() => fmt(2.36e9)), '2,360,000,000');
  eq('④ fmtCur(dia) 숫자 그대로(150 불변)', await p.evaluate(() => fmtCur('dia', 1.234e7)), '12,340,000');

  /* ── ③ 런타임 표시면 ───────────────────────────────────────────── */
  const run = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = (sel, root) => (((root || document).querySelector(sel) || {}).textContent || '').trim();
    /* 방치형 중후반 — 훈련 레벨을 올려 전투 수치를 1000 위로 보낸다(옛 규약이면 쉼표가 찍힌다) */
    S.trainStage = 12;                    /* 상한 1200 — 아래 레벨이 «MAX» 로 막히지 않게 */
    S.lv.atk = 900; S.lv.hp = 900; S.lv.regen = 900;
    S.dia = 2.36e9; S.relic = 3.3e6; S.gold = 4.2e15;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    S.best = 999; S.stage = 60;
    markDirty(); drawHud(); renderUI();
    await sleep(1400);                    /* 60 쥬시 — #cpN 표시값이 목표까지 굴러갈 시간 */
    drawHud();
    const out = { cp: t('#cpN'), hp: t('#hpT'), dia: t('#diaN') };

    /* 전투 데미지 라벨 */
    nums.length = 0; dmgNum(100, 100, 1.234e7, false);
    out.dmg = nums.length ? nums[nums.length - 1].v : '';

    /* 06 장비 시트 — 공격력·체력 알약 */
    goTab('hero'); heroTab = 'eq'; renderEqPage();
    await sleep(200);
    out.eqA = t('.eqst.a i'); out.eqB = t('.eqst.b i');

    /* 23 훈련 카드 — 상세 효과값 · 카드 알약.
       ⚠ **486 이관(2026-08-30)** — 알약(`.cv`)은 더 이상 «증가분(+N)» 이 아니라 **지금 최종값**이다
       (주인 지시 «최종값이 몇인지 각각 써있어야함»). 그래서 이 자리의 «+» 접두 기대는 폐기다.
       ⛔ 그렇다고 항을 지우지는 않았다 — 188 이 여기서 묻던 것은 «훈련 카드가 전투 수치 표기층을
          타는가» 이고 그 물음은 그대로 살아 있다. 그래서 **두 칸으로 갈랐다**:
            · `trGain` = 알약 = 최종값 → 알파벳 단위, «+» 없음
            · `trDelta` = 58 «+n» 플로터(`trDeltaTxt`) = 증가분이 옮겨 간 자리 → «+» + 알파벳 단위
          «접히는지» 를 가르는 표본 성격은 **체력 카드 x30**(레벨 900 · 최종값 9만대) 그대로다. */
    S.buyQty = 30;
    renderTrain();
    await sleep(150);
    out.trGain = t('#trCards [data-tr="hp"] .cv i');
    out.trNow  = fmtB(stat.maxHp);
    out.trDelta = trDeltaTxt(document.querySelector('#trCards [data-tr="hp"]'));
    out.trShow = U.atk.show(lv('atk'));
    out.trHp   = U.hp.show(lv('hp'));

    /* 25 정보 탭(스펙) — 공격력·체력·재생 */
    openSpec();
    await sleep(150);
    const rows = [].map.call(document.querySelectorAll('#spcList .spc-row'),
      r => [t('.nm', r), t('.vl', r)]);
    out.spcAtk = (rows.find(r => r[0] === '햄지 공격력') || [])[1];
    out.spcHp  = (rows.find(r => r[0] === '햄지 체력') || [])[1];
    out.spcRg  = (rows.find(r => r[0] === '햄지 체력 재생') || [])[1];
    closeSpec();

    /* 03 던전 리스트 — «내 전투력» · 요구 전투력.
       ⚠ 같은 화면에 보상(다이아·유물조각)이 같이 찍힌다 — 그쪽은 150 대로 쉼표가 정상이므로
       «쉼표 0건» 으로 보면 안 되고 **라벨을 짚어** 그 값만 꺼낸다. */
    renderDun();
    await sleep(120);
    const dun = (document.getElementById('bDun') || {}).textContent || '';
    /* 값 뒤에 닉네임(«U_1787…»)·라벨이 바로 이어 붙는 자리가 있다 — 접미사 뒤에 영숫자가 오면
       그것은 단위가 아니라 옆 글자다. 경계를 걸지 않으면 «1.22B» 를 «1.22BU» 로 집어 헛통과한다. */
    const PICK = lab => new RegExp(lab + '\\s*([\\d.,]+[A-Z]{0,2})(?![A-Za-z0-9_])');
    out.dunCp   = (dun.match(PICK('내 전투력')) || [])[1];
    out.dunNeed = [...dun.matchAll(/요구 전투력\s*([\d.,]+[A-Z]{0,2})(?![A-Za-z0-9_])/g)].map(m => m[1]);

    /* 19 스펙 시트(renderSt) — DPS·공격력·체력·재생·적 체력.
       ⚠ 시트 전체 textContent 를 정규식으로 긁으면 «전투력 1.22B» 뒤에 **닉네임(«U_1787…»)이 바로
       이어 붙어** 접미사와 구분이 안 된다(경계를 걸면 이번엔 «2» 로 잘린다). 값은 **그 값을 담은
       요소**에서 꺼낸다 — 절(sect)을 짚어 그 안의 <b>/<em> 만 읽는다. */
    renderSt();
    await sleep(120);
    const sects = [].slice.call(document.querySelectorAll('#bSt .sect'));
    const sectOf = k => sects.find(x => (x.querySelector('h3') || {}).textContent.includes(k));
    const bOf = (k, i) => { const q = sectOf(k); if (!q) return ''; const bs = q.querySelectorAll('p b');
      return bs[i] ? bs[i].textContent.trim() : ''; };
    out.stPick = {
      전투력:  ((sects[0] && sects[0].querySelector('h3 em') || {}).textContent || '').replace('전투력', '').trim(),
      DPS:     bOf('전투력 상세', 0),
      공격력:  bOf('전투력 상세', 1),
      체력:    bOf('전투력 상세', 2),
      재생:    bOf('전투력 상세', 3).replace('/s', ''),
      적체력:  bOf('현재 스테이지', 0),
    };
    return out;
  });
  yes('③ HUD 전투력 «' + run.cp + '» 알파벳 단위', UNIT.test(run.cp));
  yes('③ HUD 플레이어 체력 «' + run.hp + '» 알파벳 단위(둘 다)',
    run.hp.split('/').every(s => UNIT.test(s.trim())));
  eq('③ 전투 데미지 1.234e7 (옛 규약이면 «12,340,000»)', run.dmg, '12.3B');
  yes('③ 06 장비 공격력 알약 «' + run.eqA + '»', UNIT.test(run.eqA));
  yes('③ 06 장비 체력 알약 «' + run.eqB + '»', UNIT.test(run.eqB));
  /* 486 이관 — 알약은 «지금 최종값»(«+» 없음) · 증가분은 58 플로터로 옮겨 갔다 */
  yes('③ 23 훈련 체력 카드 최종값 «' + run.trGain + '» 알파벳 단위(486 — «+» 접두 없음)',
    UNIT.test(run.trGain) && !/^\+/.test(run.trGain));
  eq('③ 23 훈련 체력 카드 알약 = fmtB(stat.maxHp) (486)', run.trGain, run.trNow);
  yes('③ 23 훈련 증가분(58 플로터, x30) «' + run.trDelta + '»',
    /^\+\d{1,3}(\.\d+)?[A-Z]{1,2}$/.test(run.trDelta));
  yes('③ 23 훈련 «피해 N» «' + run.trShow + '»', UNIT.test(run.trShow.replace('피해 ', '')));
  yes('③ 23 훈련 «최대 체력» «' + run.trHp + '»', UNIT.test(run.trHp));
  yes('③ 25 정보 탭 공격력 «' + run.spcAtk + '»', UNIT.test(run.spcAtk || ''));
  yes('③ 25 정보 탭 체력 «' + run.spcHp + '»', UNIT.test(run.spcHp || ''));
  yes('③ 25 정보 탭 체력 재생 «' + run.spcRg + '»', UNIT.test((run.spcRg || '').replace('/s', '')));
  yes('③ 03 던전 «내 전투력» «' + run.dunCp + '»', UNIT.test(run.dunCp || ''));
  yes('③ 03 던전 «요구 전투력» ' + (run.dunNeed || []).length + '건 «' + (run.dunNeed || []).join(',') + '»',
    (run.dunNeed || []).length > 0 && run.dunNeed.every(v => UNIT.test(v)));
  Object.entries(run.stPick || {}).forEach(([k, v]) =>
    yes('③ 19 스펙 시트 ' + k + ' «' + v + '»', UNIT.test(v || '')));
  /* ④ 경계 — 같은 화면에서 재화는 그대로다 */
  eq('④ HUD 다이아 2.36e9 는 숫자 그대로(150 불변)', run.dia, '2,360,000,000');

  /* ── ③-b 08 세부 팝업 — 스킬·펫 «피해량» 이 실제 화면에 찍힌 글자 ────────────────
     343 — 위 ① 의 자리를 옮겼으니 «그 자리가 정말 화면에 나오는 전투 수치인가» 를 한 번 짚는다.
     소스만 보는 항은 함수가 아무 데서도 안 불려도 초록이다. 라벨(«피해량»)까지 같이 못 박아
     칸이 다른 뜻으로 밀려도 걸리게 한다. */
  const det = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = s => ((document.querySelector(s) || {}).textContent || '').trim();
    const o = {};
    S.trainStage = 12; S.lv.atk = 900; S.lv.hp = 900; S.lv.regen = 900; markDirty();
    o.skId = SKILLS[0].id; S.own[o.skId] = { l: 40, n: 5 };
    closeModal(); showSkillDetail(o.skId); await sleep(150);
    o.skHead = t('#mbox .sk-ct .hd .nt b'); o.skVal = t('#mbox .sk-ct .vl .nt b');
    o.ptId = (PETS[0] || {}).id; S.own[o.ptId] = { l: 40, n: 5 };
    closeModal(); showItem(o.ptId); await sleep(150);
    o.ptHead = t('#mbox .sk-ct .hd .nt b'); o.ptVal = t('#mbox .sk-ct .vl .nt b');
    /* 설명문 em 은 넷이다 — [0] 주기 · [1] 485 장착 효과 % · [2] 481 전투 피해 · [3] 마리수.
       재는 것은 «피해» 칸이므로 481 이관으로 자리를 1 → 2 로 옮긴다(라벨은 아래 eq 로 못박는다). */
    o.ptDesc = [].map.call(document.querySelectorAll('#mbox .sk-db p em'), e => e.textContent.trim())[2];
    closeModal();
    return o;
  });
  eq('③ 08 스킬 세부 표 헤더', det.skHead, '피해량');
  yes('③ 08 스킬 세부 «피해량» «' + det.skVal + '» 알파벳 단위', UNIT.test(det.skVal || ''));
  eq('③ 08 펫 세부 표 헤더', det.ptHead, '피해량');
  yes('③ 08 펫 세부 «피해량» «' + det.ptVal + '» 알파벳 단위', UNIT.test(det.ptVal || ''));
  yes('③ 08 펫 설명문 «장착 효과» 피해 «' + det.ptDesc + '» 알파벳 단위', UNIT.test(det.ptDesc || ''));

  /* ── §R 되돌림 시험(343 신설) ────────────────────────────────────────────────
     «눌러서 초록» 이 아님을 못 박는다. 두 방향으로 센다:
       R1·R2 소스 — 그 줄을 옛 표기층(`fmt(`)으로 되돌린 사본에서 ① 항이 **거짓**이 되고
                    비-fmtB 누수 카운터가 **≥1** 이 되는가(파일은 안 건드린다 — 문자열 사본이다).
       R3   런타임 — 표기층(`fmtG`, `fmtB = n => fmtG(n)`)을 센티넬로 갈아 끼우면 두 팝업의
                    «피해량» 칸과 펫 설명문이 **전부** 센티넬로 바뀌는가. 화면의 그 글자가
                    정말 이 표기층을 지나 나온다는 뜻이고, 원복하면 실제 값으로 돌아온다.  */
  const SK04 = SINK.find(s => s[0].startsWith('04 스킬 피해'))[1];
  const PT07 = SINK.find(s => s[0].startsWith('07 펫 피해 — 세부'))[1];
  const PT07D = SINK.find(s => s[0].startsWith('07 펫 피해 — 설명문'))[1];   /* 481 — «전투 피해» 칸 */
  const leak = s => (s.match(/\bfmt[A-Za-z]*\((skillDmg|petDmg)\(/g) || []).filter(x => !x.startsWith('fmtB(')).length;
  const rSk = src.replace(/fmtB\(skillDmg\(it\)\)/g, 'fmt(skillDmg(it))');
  const rPt = src.replace(/fmtB\(petDmg\(it\)\)/g, 'fmt(petDmg(it))');
  yes('§R1 스킬 피해를 fmt( 로 되돌리면 ① 항이 빨개진다', !SK04.test(rSk) && leak(rSk) >= 1);
  yes('§R2 펫 피해를 fmt( 로 되돌리면 ① 두 항이 빨개진다',
    !PT07.test(rPt) && !PT07D.test(rPt) && leak(rPt) >= 2);
  const rev = await p.evaluate(async (ids) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = s => ((document.querySelector(s) || {}).textContent || '').trim();
    const em1 = () => ([].map.call(document.querySelectorAll('#mbox .sk-db p em'), e => e.textContent.trim())[2] || '');
    const o = {}, keep = fmtG;
    window.fmtG = () => '⟪B⟫';
    closeModal(); showSkillDetail(ids.sk); await sleep(120); o.sk = t('#mbox .sk-ct .vl .nt b');
    closeModal(); showItem(ids.pt);        await sleep(120); o.pt = t('#mbox .sk-ct .vl .nt b'); o.ptD = em1();
    window.fmtG = keep;
    closeModal(); showSkillDetail(ids.sk); await sleep(120); o.skBack = t('#mbox .sk-ct .vl .nt b');
    closeModal(); showItem(ids.pt);        await sleep(120); o.ptBack = t('#mbox .sk-ct .vl .nt b');
    closeModal();
    return o;
  }, { sk: det.skId, pt: det.ptId });
  eq('§R3 표기층을 센티넬로 갈면 08 스킬 «피해량»', rev.sk, '⟪B⟫');
  eq('§R3 표기층을 센티넬로 갈면 08 펫 «피해량»', rev.pt, '⟪B⟫');
  eq('§R3 표기층을 센티넬로 갈면 08 펫 설명문 피해', rev.ptD, '⟪B⟫');
  eq('§R3 원복하면 스킬 «피해량» 이 실제 값으로', rev.skBack, det.skVal);
  eq('§R3 원복하면 펫 «피해량» 이 실제 값으로', rev.ptBack, det.ptVal);

  /* ── ⑤ 기능 체크 — 버튼을 눌러 값이 바뀐 뒤에도 표기층이 유지되는가 ── */
  const fn = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = sel => ((document.querySelector(sel) || {}).textContent || '').trim();
    const o = {};

    /* F1 — 23 훈련 [강화]: 골드가 줄고 전투력이 오른다. 비용은 골드(fmtG), 카드 값은 전투 수치(fmtB).
       486 이관 — 알약은 «최종값»(«+» 없음)이고 증가분은 58 플로터로 옮겨 갔다. 둘 다 본다. */
    S.trainStage = 12; S.buyQty = 30; S.gold = 4.2e25; renderTrain(); await sleep(120);
    o.f1cost0 = t('#trCards [data-tr="hp"] .cb i'); o.f1gain0 = t('#trCards [data-tr="hp"] .cv i');
    const cp0 = cp();
    o.f1delta = trDeltaTxt(document.querySelector('#trCards [data-tr="hp"]'));
    trainBuy('hp');
    renderTrain(); drawHud(); await sleep(120);
    o.f1cp = cp() > cp0; o.f1cost = t('#trCards [data-tr="hp"] .cb i'); o.f1gain = t('#trCards [data-tr="hp"] .cv i');
    o.f1now = fmtB(stat.maxHp);
    o.f1moved = o.f1gain !== o.f1gain0;

    /* F2 — 06 장비 [장착]: 능력치 알약이 새 값으로 다시 그려진다 */
    goTab('hero'); heroTab = 'eq'; renderEqPage(); await sleep(150);
    o.f2a0 = t('.eqst.a i');
    S.lv.atk += 200; renderEqPage(); await sleep(120);
    o.f2a = t('.eqst.a i'); o.f2changed = o.f2a !== o.f2a0;

    /* F3 — 레이드(DPS 측정장) 시작: 누적 피해 HUD 가 전투 수치 표기로 찍힌다 */
    S.best = 999; S.stage = 999;
    try { startRaid(RAIDS[0]); } catch (e) { o.f3err = String(e && e.message || e); }
    await sleep(2500);
    o.f3hp = t('#bossHpN'); o.f3dmg = typeof raidDmg === 'number' ? raidDmg : -1;
    try { endRaid(true); } catch (e) {}
    await sleep(200);

    /* F4 — 재화 획득 연출(58): 골드는 알파벳, 다이아는 숫자 그대로 (188 이 경계를 안 건드렸다) */
    o.f4g = fmtCur('gold', 1.234e7); o.f4d = fmtCur('dia', 1.234e7);
    return o;
  });
  yes('⑤ [F1] 23 훈련 [강화] — 전투력 상승', fn.f1cp === true);
  yes('⑤ [F1] 훈련 비용 «' + fn.f1cost + '» 골드(알파벳)', UNIT.test(fn.f1cost || ''));
  /* 486 이관 — 산 뒤에도 «최종값 + 알파벳 단위» 가 유지되고, 그 값이 실제로 움직인다 */
  yes('⑤ [F1] 훈련 카드 최종값 «' + fn.f1gain0 + '» → «' + fn.f1gain + '» 갱신 + 알파벳(486)',
    fn.f1moved === true && UNIT.test(fn.f1gain || '') && !/^\+/.test(fn.f1gain || ''));
  eq('⑤ [F1] 훈련 카드 알약 = fmtB(stat.maxHp) (486)', fn.f1gain, fn.f1now);
  yes('⑤ [F1] 훈련 증가분(58 플로터) «' + fn.f1delta + '» 전투 수치(알파벳)',
    /^\+\d{1,3}(\.\d+)?[A-Z]{1,2}$/.test(fn.f1delta || ''));
  yes('⑤ [F2] 06 장비 능력치 알약 «' + fn.f2a0 + '» → «' + fn.f2a + '» 갱신 + 알파벳',
    fn.f2changed === true && UNIT.test(fn.f2a || ''));
  yes('⑤ [F3] 레이드 누적 피해 ' + Math.round(fn.f3dmg) + ' → HUD «' + fn.f3hp + '» 알파벳',
    fn.f3dmg > 0 && UNIT.test(fn.f3hp || ''));
  eq('⑤ [F4] 획득 연출 골드(알파벳)', fn.f4g, '12.3B');
  eq('⑤ [F4] 획득 연출 다이아(숫자 그대로 · 150 불변)', fn.f4d, '12,340,000');

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 140) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const bad = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY188 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
