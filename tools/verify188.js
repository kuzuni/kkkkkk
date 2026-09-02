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

/* ⚑ 760 (2026-09-01) — `page.evaluate` 안의 예외가 **자를 통째로 죽이던** 것을 막는다
   (278·228 처방 · 319·708 선례 — `tools/verify486.js` 머리말의 그 부품을 그대로 가져왔다).
   660(주인 지시 «훈련·단련 숫자 플로터 폐지»)이 `trDeltaTxt()` 를 **선언째** 지웠는데 아래 ③·⑤ 가
   아직 그 함수를 부르고 있어 `ReferenceError` 가 밖으로 나갔고, 프로세스가 ③ 한복판에서 끝나
   **③ 뒤의 모든 절(③-b · §R0~§R3 · ⑤ · 콘솔 에러 항)이 한 번도 안 돌았다**
   (`log: []` · 앞 절의 초록만 찍힌 채 종료 = «초록 n줄» 이 통과처럼 보이는 가장 나쁜 형태).
   이제 예외는 `{ __err }` 로 잡혀 **그 블록의 항목만 빨개지고** 뒤 절은 계속 돈다.
   관례: 측정 뒤 `if (blk(r, '이름')) { … }` 로 걸러 쓴다 — 죽은 블록은 FAIL 1건으로 세고 건너뛴다.
   ⚠ ② 표기층의 짧은 `p.evaluate` 는 감싸지 않는다 — 그 자리가 죽으면 `fmtB` 자체가 없다는 뜻이라
     블록을 이어 봐야 뒤 항목이 전부 거짓 빨강이 된다(486 의 `open()` 예외와 같은 판단). */
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0] }; }
};
const blk = (r, m) => {
  if (r && r.__err) {
    R.push({ n: m + ' — 평가가 죽었다(그 절은 «돌았다» 가 아니라 «건너뛰었다»)',
             got: r.__err, want: '(예외 없음)', pass: false });
    return false;
  }
  return true;
};

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
    /* 662 이관(2026-09-01) — 343 이 옮겨 놓은 이 자리를 **662 가 또 옮겼다**. 주인 지시로
       미보유 칸이 «—» 를 그만두고 실수치를 말하게 되면서 `own ? … : '—'` 삼항이 사라지고,
       레벨 축이 인자로 빠져(`skillDmgAt(it, own ? oLv(id) : 1)`) 제품은 여전히 fmtB 를 지난다.
       ⇒ 343 과 같은 처방: 자리만 지금 그 줄로 옮기고 **묻는 것은 그대로 둔다**(fmtB 를 지나는가).
       ⚠ 여기서 «옛 삼항이 없어졌다» 만 눌러 초록으로 만들면 «662 가 통째로 사라져도 초록인
         게이트» 가 된다(328-330 교훈) — 그래서 아래 ①-662 항으로 **미보유가 «—» 로 되돌아가면
         빨개지는** 짝을 한 줄 더 세운다. */
    ['04 스킬 피해 — 세부 표 «피해량» 칸(dmgNow)',
     /const dmgNow = \(\) => fmtB\(skillDmgAt\(it, own \? oLv\(id\) : 1\)\);/],
    /* ⚑ 760 이관(2026-09-01) — 위 662 이관과 **같은 사고가 이 줄에서 한 번 더** 났다. 664(주인 지시
       «미개방 정보 공개»)가 펫 칸에서도 `own ? … : '—'` 삼항을 걷어 냈는데(index.html 28635, 바로 위
       주석이 그 판단을 적어 두고 있다) 자만 옛 삼항에 굳어 있었다. **제품은 내내 `fmtB` 를 지났다.**
       ⚠ 이 빨강은 660 이 낸 즉사(760) 뒤에 숨어 **한 번도 화면에 안 찍혔다** — 보고서(`R.forEach`)가
         파일 맨 끝이라 프로세스가 ③ 에서 죽으면 ① 의 판정도 같이 사라진다. «즉사» 의 진짜 대가다.
       ⇒ 343·662 와 같은 처방: 자리만 지금 그 줄로 옮기고 **묻는 것은 그대로 둔다**(fmtB 를 지나는가).
         «삼항이 없어졌다» 를 눌러 통과시키지 않는 짝은 아래 ①-664 항이 맡는다. */
    ['07 펫 피해 — 세부 표 «피해량» 칸(ct3Now)', /ct3Now = \(\) => cat === 'pet'\s+\? fmtB\(petDmg\(it\)\)/],
    /* 481 이관(2026-08-30) — 이 항은 **485 가 그 줄을 다시 쓴 뒤로 빨갰다**(수리 전 76/79).
       485 가 «장착 효과 — 공격력 +n%» 를 앞에 붙이고 481 이 라벨을 «전투 참여 피해» → «전투 피해»
       로 줄이면서 옛 조립문이 사라진 것이고, 제품은 그 사이에도 내내 `fmtB(petDmg(it))` 를 불렀다
       (343 이 이 파일에서 이미 한 번 겪은 것과 같은 꼴 — 굳은 것은 게이트뿐이다).
       ⇒ 자리만 지금 그 줄로 옮기고 **묻는 것은 그대로 둔다**: 이 값이 fmtB 를 지나는가. */
    ['07 펫 피해 — 설명문 «전투 피해» 칸', /· 전투 피해 <em>'\s*\+\s*fmtB\(petDmg\(it\)\) \+ '<\/em>/],
    ['06 장비 공격력 알약', /class="eqst a"[^\n]*fmtB\(stat\.dmg\)/],
    ['06 장비 체력 알약', /class="eqst b"[^\n]*fmtB\(stat\.maxHp\)/],
    /* 705 이관(2026-09-02) — 주인 지시로 «햄지» 라벨이 폐지되고 라벨을 **강화 표 `UPG` 에서 읽는다**
       (`U.atk.name` = «공격력» · `U.hp.name` = «최대 체력» · `U.regen.name` = «체력 재생»).
       343·662 와 같은 처방: **자리만 지금 그 줄로 옮기고 묻는 것은 그대로 둔다** — 이 값이 fmtB 를 지나는가.
       ⚠ 라벨 리터럴을 여기 다시 적지 않는다 — `U.<id>.name` 을 짚어야 «표에서 읽는다» 가 깨질 때 빨개진다. */
    ['25 정보 탭 공격력', /\[U\.atk\.name,\s*fmtB\(stat\.dmg\)\]/],
    ['25 정보 탭 체력', /\[U\.hp\.name,\s*fmtB\(stat\.maxHp\)\]/],
    ['25 정보 탭 재생', /\[U\.regen\.name,\s*fmtB\(stat\.regen\)/],
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
    (src.match(/\bfmt[A-Za-z]*\((skillDmg(?:At)?|petDmg)\(/g) || []).filter(s => !s.startsWith('fmtB(')).length, 0);
  /* 662 — 위 자리 항의 짝 둘. 이관이 «옛 문자열이 없어졌다» 로 끝나지 않게 한다.
     ⓐ 미보유 칸이 «—» 로 되돌아가면 빨강 — 주인 지시(662)가 통째로 사라지는 자리다.
     ⓑ 피해 식이 **한 곳**인가 — `skillDmgAt` 이 식을 갖고 `skillDmg` 는 그것을 오늘의
        레벨로 부르는 껍데기여야 한다. 식이 두 벌이 되면 표기층이 조용히 갈라진다(262 규칙). */
  yes('①-662 미보유 피해량이 «—» 로 되돌아가 있지 않다',
    !/const dmgNow = \(\) => own \? [^\n]*: '—';/.test(src));
  eq('①-662 스킬 피해 식은 소스에 한 벌뿐이다',
    (src.match(/stat\.dmg \* s\.m \* gWear\(s\.g\)/g) || []).length, 1);
  yes('①-662 skillDmg 는 skillDmgAt 을 부르는 껍데기다',
    /const skillDmg = s => skillDmgAt\(s, oLv\(s\.id\)\);/.test(src));
  /* ⚑ 760 — 664 자리에도 같은 짝을 세운다(위 SINK 주석). 자리 항만 옮기고 끝내면
     «664 가 통째로 되돌아가도 초록인 게이트» 가 된다(328-330 교훈 · 662 와 같은 처방). */
  yes('①-664 펫 미보유 피해량이 «—» 로 되돌아가 있지 않다',
    !/cat === 'pet'\s+\? \(own \? fmtB\(petDmg\(it\)\) : '—'\)/.test(src));

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
  const run = await ev(p, async () => {
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
          «접히는지» 를 가르는 표본 성격은 **체력 카드 x30**(레벨 900 · 최종값 9만대) 그대로다.
       ⚑ **760(2026-09-01) — 둘째 칸의 «입» 이 660 으로 닫혔다.** 주인 지시 «훈련 숫자 이펙트 폐지»가
          `trDeltaTxt()` 를 **선언째** 걷어(index.html 35387 주석) 이 줄이 `ReferenceError` 로 자를 죽였다.
          333 처방대로 **자리를 비우지 않고 방향을 뒤집는다** — 「그 자리에 «+n» 이 알파벳 단위로 있다」
          → 「그 자리에 «+n» 자체가 없다」. 재는 것은 **카드에 실제로 찍힌 글자**이고, 헛초록이 아님은
          아래 §R4 미끼(같은 대조기에 «+12.3B» 를 흘린다)가 못박는다.
       ⚠ «훈련 플로터 0장» 자체는 `verify660` [D3] 이, `trDeltaTxt` 선언 0건은 `verify486` [F1] 이
          이미 계측기까지 세워 지킨다 — 여기서 겹쳐 세지 않는다. 188 이 묻는 것은 표기층뿐이다. */
    S.buyQty = 30;
    renderTrain();
    await sleep(150);
    out.trGain = t('#trCards [data-tr="hp"] .cv i');
    out.trNow  = fmtB(stat.maxHp);
    /* 표본이 «접히는 값» 인지부터 — 1000 미만이면 UNIT 은 접미사 없이도 통과해 자가 무뎌진다 */
    out.trNowRaw = Math.round(stat.maxHp);
    const trHpCard = document.querySelector('#trCards [data-tr="hp"]');
    const PLUS = /\+\s*\d/;                       /* 대조기 — «+n» 증가분 글자 */
    out.trPlus  = PLUS.test((trHpCard || {}).textContent || '');
    out.trBait  = PLUS.test(((trHpCard || {}).textContent || '') + ' +12.3B');   /* §R4 미끼 */
    out.trShow = U.atk.show(lv('atk'));
    out.trHp   = U.hp.show(lv('hp'));

    /* 25 정보 탭(스펙) — 공격력·체력·재생 */
    openSpec();
    await sleep(150);
    const rows = [].map.call(document.querySelectorAll('#spcList .spc-row'),
      r => [t('.nm', r), t('.vl', r)]);
    /* 705 이관 — 라벨이 `UPG` 표에서 온다. 자도 **같은 표를 짚어** 라벨을 손으로 베끼지 않는다
       (베끼면 표가 바뀔 때 자만 조용히 «행 없음 = undefined» 이 되어 ③ 이 헛빨강을 낸다). */
    out.spcAtk = (rows.find(r => r[0] === U.atk.name) || [])[1];
    out.spcHp  = (rows.find(r => r[0] === U.hp.name) || [])[1];
    out.spcRg  = (rows.find(r => r[0] === U.regen.name) || [])[1];
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
  if (blk(run, '③ 런타임 표시면')) {
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
    /* ⚑ 760 — 표본이 «접히는» 쪽인지부터 못 박는다(1000 미만이면 UNIT 은 접미사 없이도 통과한다) */
    yes('③ 23 훈련 체력 표본이 접히는 값이다(stat.maxHp = ' + run.trNowRaw + ' ≥ 10,000)',
      run.trNowRaw >= 1e4);
    /* ⚑ 760 — 방향 반전(333): 660 이 «+n» 증가분의 입을 닫았다. 카드에 그 글자가 없어야 한다 */
    yes('③ 23 훈련 체력 카드에 «+n» 증가분 글자 0건(660 — 58 플로터 은퇴 · 333 방향 반전)',
      run.trPlus === false);
    yes('§R4 음성 대조 — 같은 카드 글자에 «+12.3B» 를 흘리면 같은 대조기가 잡는다',
      run.trBait === true);
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
  }

  /* ── ③-b 08 세부 팝업 — 스킬·펫 «피해량» 이 실제 화면에 찍힌 글자 ────────────────
     343 — 위 ① 의 자리를 옮겼으니 «그 자리가 정말 화면에 나오는 전투 수치인가» 를 한 번 짚는다.
     소스만 보는 항은 함수가 아무 데서도 안 불려도 초록이다. 라벨(«피해량»)까지 같이 못 박아
     칸이 다른 뜻으로 밀려도 걸리게 한다. */
  const det = await ev(p, async () => {
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
  const detOk = blk(det, '③-b 08 세부 팝업');
  if (detOk) {
    eq('③ 08 스킬 세부 표 헤더', det.skHead, '피해량');
    yes('③ 08 스킬 세부 «피해량» «' + det.skVal + '» 알파벳 단위', UNIT.test(det.skVal || ''));
    eq('③ 08 펫 세부 표 헤더', det.ptHead, '피해량');
    yes('③ 08 펫 세부 «피해량» «' + det.ptVal + '» 알파벳 단위', UNIT.test(det.ptVal || ''));
    yes('③ 08 펫 설명문 «장착 효과» 피해 «' + det.ptDesc + '» 알파벳 단위', UNIT.test(det.ptDesc || ''));
  }

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
  const leak = s => (s.match(/\bfmt[A-Za-z]*\((skillDmg(?:At)?|petDmg)\(/g) || []).filter(x => !x.startsWith('fmtB(')).length;
  /* 662 이관 — 되돌림 시험의 «갈아 끼울 문자열» 도 지금 제품의 것으로 옮긴다.
     ⚠ 안 옮기면 replace 가 **아무것도 안 바꾸고** 그 자리에서 조용히 통과한다
       (652 가 neg219 에서 겪은 «갈아 끼울 문자열 없음» 과 같은 부패다). */
  const rSk = src.replace(/fmtB\(skillDmgAt\(it, own \? oLv\(id\) : 1\)\)/g,
                          'fmt(skillDmgAt(it, own ? oLv(id) : 1))');
  yes('§R0 스킬 되돌림 시험이 실제로 갈아 끼웠다(빈 replace 가 아니다)', rSk !== src);
  const rPt = src.replace(/fmtB\(petDmg\(it\)\)/g, 'fmt(petDmg(it))');
  yes('§R1 스킬 피해를 fmt( 로 되돌리면 ① 항이 빨개진다', !SK04.test(rSk) && leak(rSk) >= 1);
  yes('§R2 펫 피해를 fmt( 로 되돌리면 ① 두 항이 빨개진다',
    !PT07.test(rPt) && !PT07D.test(rPt) && leak(rPt) >= 2);
  /* §R3 은 위 ③-b 가 집어 온 id·기대값 위에 서 있다 — 그 블록이 죽었으면 여기서 거짓 빨강 5건이
     난다. 죽은 블록은 FAIL 1건으로만 세는 것이 760 의 규약이므로 같이 건너뛴다. */
  const rev = detOk ? await ev(p, async (ids) => {
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
  }, { sk: det.skId, pt: det.ptId }) : { __err: '③-b 가 죽어 표본 id 가 없다' };
  if (detOk && blk(rev, '§R3 표기층 센티넬')) {
    eq('§R3 표기층을 센티넬로 갈면 08 스킬 «피해량»', rev.sk, '⟪B⟫');
    eq('§R3 표기층을 센티넬로 갈면 08 펫 «피해량»', rev.pt, '⟪B⟫');
    eq('§R3 표기층을 센티넬로 갈면 08 펫 설명문 피해', rev.ptD, '⟪B⟫');
    eq('§R3 원복하면 스킬 «피해량» 이 실제 값으로', rev.skBack, det.skVal);
    eq('§R3 원복하면 펫 «피해량» 이 실제 값으로', rev.ptBack, det.ptVal);
  }

  /* ── ⑤ 기능 체크 — 버튼을 눌러 값이 바뀐 뒤에도 표기층이 유지되는가 ── */
  const fn = await ev(p, async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = sel => ((document.querySelector(sel) || {}).textContent || '').trim();
    const o = {};

    /* F1 — 23 훈련 [강화]: 골드가 줄고 전투력이 오른다. 비용은 골드(fmtG), 카드 값은 전투 수치(fmtB).
       486 이관 — 알약은 «최종값»(«+» 없음)이고 증가분은 58 플로터로 옮겨 갔다. 둘 다 본다. */
    S.trainStage = 12; S.buyQty = 30; S.gold = 4.2e25; renderTrain(); await sleep(120);
    o.f1cost0 = t('#trCards [data-tr="hp"] .cb i'); o.f1gain0 = t('#trCards [data-tr="hp"] .cv i');
    const cp0 = cp();
    trainBuy('hp');
    renderTrain(); drawHud(); await sleep(120);
    o.f1cp = cp() > cp0; o.f1cost = t('#trCards [data-tr="hp"] .cb i'); o.f1gain = t('#trCards [data-tr="hp"] .cv i');
    o.f1now = fmtB(stat.maxHp);
    o.f1moved = o.f1gain !== o.f1gain0;
    /* ⚑ 760 — 폐지된 «+n» 입(`trDeltaTxt`)이 있던 자리. 333 방향 반전: **산 뒤에도** 카드가
       증가분 글자를 되살리지 않는가(660). 미끼로 같은 대조기가 살아 있음을 같이 못박는다. */
    {
      const card = document.querySelector('#trCards [data-tr="hp"]');
      const PLUS = /\+\s*\d/;
      o.f1plus = PLUS.test((card || {}).textContent || '');
      o.f1bait = PLUS.test(((card || {}).textContent || '') + ' +12.3B');
    }

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
  if (blk(fn, '⑤ 기능 체크')) {
    yes('⑤ [F1] 23 훈련 [강화] — 전투력 상승', fn.f1cp === true);
    yes('⑤ [F1] 훈련 비용 «' + fn.f1cost + '» 골드(알파벳)', UNIT.test(fn.f1cost || ''));
    /* 486 이관 — 산 뒤에도 «최종값 + 알파벳 단위» 가 유지되고, 그 값이 실제로 움직인다 */
    yes('⑤ [F1] 훈련 카드 최종값 «' + fn.f1gain0 + '» → «' + fn.f1gain + '» 갱신 + 알파벳(486)',
      fn.f1moved === true && UNIT.test(fn.f1gain || '') && !/^\+/.test(fn.f1gain || ''));
    eq('⑤ [F1] 훈련 카드 알약 = fmtB(stat.maxHp) (486)', fn.f1gain, fn.f1now);
    /* ⚑ 760 — 방향 반전(333): 폐지된 «+n» 은 강화 직후에도 안 돌아온다 */
    yes('⑤ [F1] 강화 직후에도 훈련 카드에 «+n» 증가분 글자 0건(660 · 333 방향 반전)',
      fn.f1plus === false);
    yes('§R5 음성 대조 — 같은 카드 글자에 «+12.3B» 를 흘리면 같은 대조기가 잡는다',
      fn.f1bait === true);
    yes('⑤ [F2] 06 장비 능력치 알약 «' + fn.f2a0 + '» → «' + fn.f2a + '» 갱신 + 알파벳',
      fn.f2changed === true && UNIT.test(fn.f2a || ''));
    yes('⑤ [F3] 레이드 누적 피해 ' + Math.round(fn.f3dmg) + ' → HUD «' + fn.f3hp + '» 알파벳',
      fn.f3dmg > 0 && UNIT.test(fn.f3hp || ''));
    eq('⑤ [F4] 획득 연출 골드(알파벳)', fn.f4g, '12.3B');
    eq('⑤ [F4] 획득 연출 다이아(숫자 그대로 · 150 불변)', fn.f4d, '12,340,000');
  }

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 140) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const bad = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY188 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
