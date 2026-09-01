/* 작업 149 게이트 — «확인·선택이 필요 없는 단순 안내» 가 모달 팝업이 아니라 토스트로 뜨는가.
 * 작업 206 이 그 기준을 **더 공격적으로** 좁혀 이 게이트를 이어받았다(2026-08-27, 주인 재지시).
 *
 * 주인 지시(149, 2026-08-27): «부족 알림 같은 건 팝업 말고 토스트로 — 방치형 게임에서 보통 하는 대로».
 * 주인 재지시(206, 2026-08-27): «알림들 팝업 말고 꼭 토스트로 — 클릭 안 해도 1초 이따 자동으로 사라지는 류로».
 *
 * 이 게이트가 소유한 것은 **분류와 그 결과의 실동작**이다:
 *   ⓐ 안내·결과 경로를 실제로 밟으면 → `.fx-toast` 가 뜨고 `#modal` 은 **안 열린다**
 *   ⓑ 팝업으로 남는 것은 «선택·입력이 실제로 필요한 것» 6곳뿐이다(206 개정 — 149 의 20곳에서 좁혔다).
 *      과교정이 아니라 **주인이 지시한 방향**이고, 반대로 그 6곳이 토스트로 밀리는 회귀는 여기서 막는다.
 *   ⓒ 토스트 문구가 프레임(1080) 밖으로 안 나간다 — `.fx-toast` 는 `white-space:nowrap` 이라
 *      문구가 길면 그대로 삐져나온다. 58 이 그 기하를 소유하므로 149 는 **문구 길이로** 지킨다.
 *      워스트케이스는 실데이터(던전·배너·코스튬·이용권·가방 이름 중 가장 긴 것)로 만든다.
 *   ⓓ 토스트가 58 이 실측해 둔 «빈 띠»(초상화 플레이트 하단 142 ↔ #chapN 상단 227) 안에 앉는다
 *   ⓔ (206 ②) 토스트는 **클릭 없이 ≈1~1.5초 안에 스스로 사라진다** — §6 이 실측한다.
 *
 * ⚠ `fxToast()` 는 토스트가 4장 이상 쌓이면 **드롭한다**. 149 는 그때 옛 팝업으로 되돌렸지만,
 *    그 폴백이 바로 주인이 없애라는 «안내성 팝업» 이다. 206 은 **큐**로 바꿨다 — 드롭되면 큐에
 *    들어가 자리가 나는 대로 뜬다(§4). 안내가 통째로 사라지는 것이 여전히 유일한 회귀 위험이다.
 *
 * 실행: node tools/verify149.js           → 마지막 줄 VERIFY149 n/n PASS
 *       node tools/verify149.js --broken  → notify 를 popup 으로 되돌려 게이트가 실제로 잡는지(음성 테스트)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
const BROKEN = process.argv.includes('--broken');

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail){
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ── §1 정적: 토스트로 옮긴 자리 · 팝업으로 남긴 자리 ────────────────────────────
   각 항목은 «그 자리에만 있는 문구 조각» 으로 찍는다. 조각이 `notify(` 뒤에 오면 옮긴 것이고
   `popup(` 뒤에 오면 안 옮긴 것이다. 줄 단위가 아니라 «가장 가까운 앞쪽 호출» 로 판정한다. */
const TOAST_SITES = [
  ['도감 환불 — 재료 없음',      '환불할 재료가 없습니다'],
  ['도감 완성 — 환불 유도',      '도감 완성 — 재료를 환불하세요'],
  ['소환 재화 부족',             '더 필요합니다\');\n    return;'],
  ['스킬 슬롯 부족',             '스킬은 최대 <b>8개</b>까지 장착합니다'],
  ['펫 슬롯 부족',               '펫은 최대 <b>3마리</b>까지 장착합니다'],
  ['가이드 소환 차단',           '소환</b>을 먼저 해주세요'],
  /* 401 — 367(주인 지시 «룰렛 3회 무료 + 2회 광고»)이 «5회 중 뒤 2회는 광고 구간이라 더는 무료
     소진이 아니다» 며 문구를 «오늘 룰렛 소진» 으로 바꿨다. **367 은 잘못한 게 없다** — 옛 문구를
     상수로 박아 둔 이쪽이 부패한 것이다(368 과 같은 병). 조각을 살아 있는 문구로 갈아 끼운다.
     149 가 재는 성질(«팝업이 아니라 토스트로 나간다»)은 그대로다.
     ⚠ 자리를 비우지 마라(333 처방) — 문구만 갈아 끼우면 «367 이 통째로 사라져도 초록» 이 되므로,
     그 문구가 선 근거(광고 구간)를 묻는 절을 아래 [367] 에 세웠다. */
  ['룰렛 소진',                  '오늘 룰렛 소진 — 내일 <b>'],
  ['던전 잠김(상세)',            '\' + dunLockTxt(d) + \' 필요\');\n    return;'],
  /* 204 — «내일 N회 리필» 폐기 → «출석 보상마다 +N장 적립» */
  ['던전 입장 소진(상세)',       '입장권 없음 — 출석 보상마다'],
  ['소탕 — 던전 잠김',           'if(dunLocked(d)){ notify('],
  ['소탕 불가',                  '을 클리어해야 소탕합니다'],
  ['소탕 — 입장 소진',           '입장권이 없습니다 — 출석 보상마다'],   /* 204 */
  /* 182 — «코스튬 해금 조건 미달»·«코스튬 다이아 부족» 두 자리는 **경로째 폐기**됐다
     (구매 폐지 → `buyAvatar()` 삭제). 코스튬이 남긴 단순 안내는 아래 «미보유 코스튬» 하나다. */
  /* 333 — 옛 «승급 조건 미달» 반려는 295(입장 제한 폐지, 2026-08-27 주인 지시)가 `startPromo()` 에서
     **삭제**했다. `verify295` 는 그 문구가 «없어야» 통과하므로 여기 남겨 두면 두 게이트가 서로 반대를
     단언한다(제품이 아니라 게이트가 부패한 자리 — 319 선례). 자리는 비우지 않고 **살아 있는 승급 계열
     토스트**로 갈아 끼웠다: 코스튬 [강화]의 미보유 반려(index.html `cosUpgrade` 분기)다. */
  ['코스튬 미보유 강화',         '승급전에서 획득해야 강화합니다'],
  /* ⚑ 453(주인 지시 2026-08-30) — 「아레나 — 다른 전투 중」 조각(«다른 전투가 진행 중입니다»)이
     죽었다. 전투 중 진입 전면 차단으로 그 두 자리(`challengeTower` · `#dgdGo` 아레나 갈래)가
     **한 벌로 통일된 문구**를 쓰게 됐기 때문이다 — 같은 사건에 두 문장이면 사용자가 다른 일로 읽는다.
     333 처방대로 자리를 비우지 않고 **살아 있는 자리**로 갈아 끼운다: 두 문구가 만나는 한 곳
     `battleBlock()` 이다. 149 가 재는 성질(«팝업이 아니라 토스트로 나간다»)은 한 글자도 안 바뀐다 —
     `popup(` 으로 바뀌면 빨개지고, `battleBlock` 이 통째로 사라져도 «조각을 못 찾음» 으로 빨개진다.
     ⚠ 문구 자체(«전투 중에는 열 수 없습니다» / «…입장할 수 없습니다»)가 실제로 화면에 나가는지는
       `verify453` [B] 가 **실행 중 토스트를 가로채서** 따로 잰다 — 여기서 문자열을 또 박으면 두 자가
       같은 값을 두 곳에 적게 된다(LESSONS 58-①). */
  ['전투 중 차단 안내(453)',     'if(!battleBusy()) return false;\n  if(msg) notify('],
  ['레이드 진행 중',             '진행 중 · 남은 <b>'],
  ['던전 카드 잠김(목록)',       "필요');\n    return;\n  }\n  /* 04 던전 세부"],
  ['아레나 잠김',                'ARENA.n + \' — 스테이지'],
  ['레이드 잠김',                'r.n + \' — 스테이지'],
  ['무료 소환 소진',             '무료 소환 소진 — 내일 충전'],
  ['유물 소환 — 조각 부족',      'if(!quiet) notify('],
  /* 153 — 교환 보상이 우편으로 가면서 문구가 바뀌었다. 토스트라는 사실은 그대로다. */
  /* 200 — 표기가 «남은 쿠폰» → «남은 마일리지» 로 바뀌었다(주인 지시). 토스트라는 사실은 그대로다. */
  ['마일리지 교환 완료',         '남은 마일리지 \' + S.mileage'],
  /* 511 — 490(주인 확정 2026-08-30 «다이아→유물조각·룬강화석 전부 1:1»)이 §9 교환을
     «품목 3단 묶음» 에서 **품목 2종 × 수량 탭** 으로 갈아 끼우면서 두 조각이 같이 죽었다:
     `ex.dia`(묶음 가격 필드)는 필드째 사라졌고, 완료 문구의 `curIc('relic')` 은 두 재화가
     한 경로를 쓰게 되어 `curIc(ex.k)` 가 됐다. **490 은 잘못한 게 없다** — 옛 문구를 상수로
     박아 둔 이쪽이 부패한 것이다(401·368 과 같은 병). 149 가 재는 성질(«팝업이 아니라
     토스트로 나간다»)은 한 글자도 안 바뀌므로 **조각만** 살아 있는 문구로 옮긴다(333 처방).
     이름도 «유물조각» → «재화» 로 넓힌다 — 한 자리가 두 재화를 답하는 것이 490 의 구조다.
     ⚠ 자리를 비우지 않았다: 490 이 통째로 되돌아가 묶음 표가 살아나면 `ex.k`·`< n` 이
       사라지므로 두 항이 «조각을 못 찾음» 으로 곧바로 빨개진다. */
  ['재화 교환 — 다이아 부족',    'if(S.dia < n){ notify('],
  ['재화 교환 완료(유물조각·룬강화석)', '\'</b> → \' + curIc(ex.k)'],
  ['광고 보상 수령',             'a.r.freePet) notify('],
  /* ⚠ **588(2026-08-31) 이관** — «다이아 부족» 안내는 이용권을 다이아로 사던 시절의 것이고
     주인 지시(«그 이용권들은 다이아로 못사게 하기»)로 그 분기가 통째로 사라졌다.
     149 가 이 자리에서 소유한 성질(«이용권 구매의 결과 안내가 팝업이 아니라 토스트»)은
     아래 «589 결제 완료» 한 줄이 그대로 이어받는다 — 자리를 비우지 않았다(333 처방). */
  ['589 결제 완료 안내',         "notify('💳 결제 완료 — '"],
  ['장비 일괄강화 재료 부족',    '강화할 수 있는 <b>'],
  /* 150 — 가방 수량은 재화별 표기(`fmtCur`)로 갈렸다. 토스트라는 사실은 그대로다.
     310 — 그 «가방 칸 상세» 토스트는 **경로째 사라졌다**: 292(53 가방 «화폐 전용» + 칸 클릭 →
     33 재화 정보 팝업, 주인 지시 «클릭 시 세부정보 팝업 떠야 함»)가 `notify()` 한 줄을 걷어냈다.
     여기서 조각을 계속 찾으면 «옮겼는가» 가 아니라 «없어진 것을 못 찾았다» 로 FAIL 한다 —
     182·189 가 같은 절에서 한 대로 **행을 지우고 주석으로 남긴다.** 대신 «토스트로 되살아나지
     않는가» 는 아래 [292] 절의 음성 시험이 지킨다(177-③ — 자리만 비우면 되살아나도 아무도 모른다).
     «칸 클릭 → 33 팝업» 이라는 **양성** 실동작은 292 의 제 게이트(`tools/func292.js` ②)가 소유한다. */
  ['설정 — 언어',                '현재 <b>한국어</b>만 지원합니다'],
  ['쿠폰 — 잘못된 코드',         '사용할 수 없는 코드입니다'],
  ['쿠폰 — 이미 사용',           '이미 사용한 코드입니다'],
  ['쿠폰 — 획득',                '</b> 획득!\');\n}'],
  ['최고 계급',                  '이미 최고 계급입니다'],
  ['스킬 일괄강화 재료 부족',    '강화 가능한 <b>스킬</b>'],
  ['펫 일괄강화 재료 부족',      '강화 가능한 <b>펫</b>'],
  ['미보유 코스튬',              '승급전에서 획득해야 착용합니다'],
  /* 182 — «이미 보유한 코스튬» 은 [구매] 버튼 분기였다. 버튼째 사라져 이 안내도 없다. */
  /* 189 — «🌳 마을 준비 중» 토스트도 같은 이유로 사라졌다(마을 칸째 삭제). */
  ['패스 — 프리미엄 잠금',       '를 활성화하면 받습니다'],
  ['패스 탭 — 미해금',           '아직 해금되지 않은 패스입니다'],
  ['패스 탭 — 준비 중',          '이 패스는 아직 준비 중입니다'],
  /* 189 — «🔒 배속 미해금» 토스트도 사라졌다(#spdb 째 삭제). */
  /* ── 206 (2026-08-27, 주인 재지시) — 149 가 «결과» 라서 모달로 남겨 뒀던 14곳 ────────────
     기준: «확인» 버튼 하나로 닫기만 하는 화면은 팝업이 아니다. 결과 수치는 화면에 이미 남는다. */
  ['206 재료 환불 결과',   "도감 완성 — ' + curIc("],
  ['206 도감 강화 결과',   "도감 <b>' + n + '단계</b>"],
  ['206 가이드 전 미션 완료','📌 모든 가이드 미션 완료! 🎉'],
  /* 310 — 문구가 바뀌었다: 255(던전 실패 사유가 «피해 부족» → «보스를 못 잡음»)·264(탑도 같은
     판정)가 «층 실패 — 피해 <b>x</b> / y» 를 «층 실패 — 보스 체력 <b>n%</b> 남음 / 보스 <b>미등장</b>»
     으로 갈아 끼웠다. 토스트라는 사실은 그대로이므로 **조각만** 새 문구로 옮긴다.
     («어느 문구가 맞는가» 는 아래 [255·264] 절이 따로 못 박는다 — 조각이 또 낡으면 그쪽이 먼저 운다.) */
  /* 427 — 탑도 «레벨» 이 되면서 이 공용 한 줄의 낱말이 «n층 실패» → «레벨 n 실패» 로 바뀌었다.
     조각은 그 새 낱말째 잡는다(«실패 — » 만 잡으면 승급·합성 실패와 구별이 안 된다). */
  ['206 던전 레벨 실패',   "' 레벨 ' + f + ' 실패 — '"],
  /* 458 — 사유가 둘로 갈렸다(시간 초과 · 사망). 자리를 가리키는 조각은 **갈리지 않는 앞머리**로 옮긴다 —
     «시간 안에» 를 계속 잡으면 사망 사유가 유일한 문구가 되는 날 이 항이 자리째 사라진 것처럼 빨개진다.
     («어느 문구가 맞는가» 는 verify458 [3-e] 가 따로 못 박는다.) */
  ['206 승급 실패',        "'💀 승급 실패 — '"],
  ['206 합성 성공',        '⚗️ 합성 성공 — '],
  ['206 레이드 결과',      "' — DPS <b>' + fmtB(dps)"],
  ['206 아레나 결과',      "'🏅 아레나 승리' : '💀 아레나 패배'"],
  /* 589 이관 — «결제 준비 중» 은 주인 지시(«클릭시 걍 결제된거로 쳐주기»)로 폐기됐다.
     이제 세 상품(다이아 팩·이용권·프리미엄 패스)이 **같은 한 줄**을 쓴다 = `payMock()`.
     ⚑ 697 이관 — 그 한 줄의 **내용**이 바뀌었다(«우편함을 확인하세요» → «즉시 지급되었습니다»).
        토스트라는 것(149 의 판정)은 그대로이고 갈 곳이 우편함에서 지갑으로 옮겨졌을 뿐이다. */
  ['697 즉시 지급 안내',     "' · 즉시 지급되었습니다'"],
  ['206 랭킹 탭 미개방',   '랭킹은 아직 열리지 않았습니다'],
  ['206 자동 축복 정산',   '✨ 자동 축복 <b>'],
  ['206 도감 마이그레이션','📖 도감이 <b>«부위 · 등급 세트»</b>'],
];
/* 206 — 팝업으로 남는 것은 «선택·입력이 실제로 필요한 것» 뿐이다.
   버튼이 둘 이상이거나, 읽고 고를 **목록·장문**이 본문인 화면 6곳. 이 6곳이 토스트로 밀리면
   (한 줄 nowrap 에 목록·UID·약관이 들어갈 리 없으므로) 정보가 통째로 사라진다 — 그 회귀를 막는다. */
const POPUP_SITES = [
  /* 182 — «👤 코스튬 획득!» 결제 팝업은 구매 경로와 함께 사라졌다. 코스튬 획득 결과는
     이제 «🏅 승급 성공!» 팝업 안에서 알린다 — 그 **코스튬 그리드(목록)** 가 이 팝업이 남는 이유다. */
  ['승급 성공(코스튬 그리드)', '🏅 승급 성공!'],
  ['개인정보 방침(장문)',      '🔒 개인정보 처리 방침'],
  ['고객 지원(UID·Gamer Id)',  '🎧 고객 지원'],
  ['랭커 상세(항목 목록)',     '위 · \' + r.n'],
  ['길라잡이(진행·보상 목록)', '🗺️ 길라잡이'],
  ['notify 폴백(레이어 부재)', "popup('알림'"],
];
/* 조각 위치에서 뒤로 훑어 가장 가까운 `notify(` / `popup(` 중 어느 쪽이 앞서는지 본다.
   ⚑ **511(2026-08-30) — 이 함수가 이 게이트의 세 번째 부패 자리였다.** 옛 판은
   `SRC.indexOf(frag)` 로 **첫 출현 하나만** 봤다. 475(모든 보스전 격파 시퀀스)가 `bossClear`
   절 주석에 «🏅 승급 성공!» 을 한 번 더 적자(index.html 24942) 그 주석이 첫 출현이 되었고,
   주석 앞 900자에는 `notify(`·`popup(` 이 없어 **제품(25734 `popup('🏅 승급 성공!'`)은 내내
   옳은데** 게이트만 «조각을 못 찾음» 으로 빨개졌다. **475 는 잘못한 게 없다.**
   ⇒ ① 주석 안 출현은 건너뛴다(제품 코드가 아니다) ② 남은 출현을 **전부** 보고, 서로 다른
      호출자가 나오면 «자리가 둘» 로 빨개진다 — 조용히 첫 자리만 답하지 않는다.
   ⚠ 이 함수를 무르게 고치면(예: 조각에 `popup(` 을 넣어 자리를 특정) 그 항은 «호출자가
     무엇인가» 를 더는 못 묻는 헛초록이 된다. 아래 §R 이 그것을 못박는다. */
function inComment(src, i){
  const bo = src.lastIndexOf('/*', i), bc = src.lastIndexOf('*/', i);
  if (bo > bc) return true;                                   /* 블록 주석 안 */
  const nl = src.lastIndexOf('\n', i);
  const line = src.slice(nl + 1, i);
  const lc = line.indexOf('//');
  return lc >= 0 && line[lc - 1] !== ':';                     /* 줄 주석 안(URL 의 «://» 제외) */
}
function callerAt(src, i, len){
  const head = src.slice(Math.max(0, i - 900), i + len);
  const n = head.lastIndexOf('notify('), p = head.lastIndexOf('popup(');
  if (n < 0 && p < 0) return null;
  return n > p ? 'notify' : 'popup';
}
function callerOf(frag, src){
  src = src || SRC;
  const hits = [];
  for (let i = src.indexOf(frag); i >= 0; i = src.indexOf(frag, i + 1)){
    if (inComment(src, i)) continue;                          /* 주석 출현은 제품이 아니다 */
    hits.push(callerAt(src, i, frag.length));
  }
  if (!hits.length) return null;                              /* 조각을 못 찾음 */
  const uniq = [...new Set(hits)];
  return uniq.length === 1 ? uniq[0] : '자리가 ' + hits.length + '곳(' + uniq.join('/') + ')';
}
/* §R 전용 — 511 이 고치기 **전** 판(첫 출현 하나만 본다). 되돌림 시험의 대조군이다. */
function callerOfNaive(frag, src){
  src = src || SRC;
  const i = src.indexOf(frag);
  return i < 0 ? null : callerAt(src, i, frag.length);
}

/* ── §3 워스트케이스 문구 — 실데이터에서 «가장 긴 이름» 을 골라 조립한다 ─────────── */
const WORST = [
  { n: '던전 잠김',       f: 'D => "🔒 " + D.dun + " — " + D.dunLock + " 필요"' },
  /* 204 — 문구가 «출석 보상마다 +N장» 으로 바뀌었다(N = DUN_TRY, 페이지 안에서 읽는다) */
  { n: '던전 입장 소진',  f: 'D => "<b>" + D.dun + "</b> 입장권 없음 — 출석 보상마다 <b>+" + DUN_TRY + "장</b>"' },
  { n: '무료 소환 소진',  f: 'D => "<b>" + D.ban + "</b> 무료 소환 소진 — 내일 충전"' },
  { n: '가이드 소환 차단',f: 'D => "📌 <b>" + D.ban + " 소환</b>을 먼저 해주세요"' },
  /* 182 — 옛 «코스튬 조건 미달» 토스트(이름 + 해금 조건)는 구매 폐지와 함께 사라졌다.
     코스튬이 남긴 단 하나의 토스트는 이름이 안 들어가는 고정 문구라 워스트케이스가 짧다. */
  { n: '코스튬 미보유 착용', f: 'D => "🔒 승급전에서 획득해야 착용합니다"' },
  { n: '도감 완성',       f: 'D => "🏆 " + D.coll + " 도감 완성 — 재료를 환불하세요"' },
  { n: '레이드 잠김',     f: 'D => "🔒 " + D.raid + " — 스테이지 <b>9999</b> 필요 (현재 9999)"' },
  { n: '레이드 진행 중',  f: 'D => "⚔ " + D.raid + " 진행 중 · 남은 <b>120.0초</b>"' },
  /* 310 — «가방 칸» 워스트케이스는 그 토스트가 292 로 사라져 잴 문구가 없다(위 §1 주석 참조). */
  { n: '이용권 다이아 부족', f: 'D => D.icDia + " <b>999.99Z</b> 더 필요합니다"' },
  { n: '마일리지 교환',   f: 'D => D.icDia + " <b>999.99Z</b> 우편함으로 발송 · 남은 마일리지 999개"' },
  { n: '유물조각 교환',   f: 'D => D.icDia + " <b>999.99Z</b> → " + D.icRel + " <b>999.99Z</b> 우편함 발송"' },
  { n: '광고 보상 수령',  f: 'D => "🎁 " + D.ad + " — " + D.icGold + " 999.99Z 획득"' },
  { n: '장비 일괄강화',   f: 'D => "강화할 수 있는 <b>" + D.wpn + "</b>가 없습니다"' },
  /* 333 — «승급 조건 미달» 워스트케이스(계급 이름을 끼운 유일한 자리)는 295 가 그 토스트를 없애
     잴 문구가 사라졌다. 310 의 «가방 칸» 과 같은 처리: 항목과 재료(D.rank)를 **같이** 지운다.
     살아 있는 승급 계열 토스트 셋(미보유 착용 · 미보유 강화 · 206 승급 실패) 중 계급 이름이
     들어가는 것은 하나도 없어 갈아 끼울 «가장 긴 이름» 표본 자체가 없다(§1·§2 는 갈아 끼웠다). */
  /* ── 206 이 토스트로 내린 «결과» 문구들. 수치는 150 표기의 최댓값(999.99Z)으로 민다 ── */
  { n: '206 레이드 결과',   f: 'D => "🏆 " + D.raid + " — DPS <b>999.99Z</b> · " + D.icStone + " 999 · " + D.icRstone + " 999 · <b>신기록!</b>"' },
  { n: '206 아레나 결과',   f: 'D => "🏅 아레나 승리 — 상대 전투력 <b>999.99Z</b> · " + D.icGold + " 999.99Z · " + D.icStone + " 999"' },
  /* 310 — 255·264 의 새 문구로 바꿨다. 두 분기 중 잉크가 긴 쪽은 «보스 체력 <b>100%</b> 남음»
     이다(«보스 <b>미등장</b>» 보다 길다). 층수는 탑(209·210)이 세 자리까지 가므로 999 로 민다. */
  { n: '206 던전 레벨 실패', f: 'D => "💀 " + D.dun + " 레벨 999 실패 — 보스 체력 <b>100%</b> 남음"' },
  /* ⚠ 효과 문구(`collEffText`)를 붙인 판은 최대 단계에서 **폭 1077/1080** 으로 프레임 양끝에
     닿았다(1회차 실측). 제품 문구에서 뺐고, 여기 워스트케이스도 뺀 판으로 잰다. */
  { n: '206 도감 강화',     f: 'D => "🏆 " + D.collSet + " 도감 <b>10단계</b> 강화!"' },
  { n: '206 재료 환불',     f: 'D => "♻️ " + D.ban + " 도감 완성 — " + D.icDia + " <b>+999.99Z</b> 환불"' },
  { n: '206 합성 성공',     f: 'D => "⚗️ 합성 성공 — " + D.grade + " <b>" + D.equip + "</b> 획득!"' },
  /* 589 — 세 상품이 같은 문구 틀을 쓰므로 워스트케이스는 «가장 긴 상품 이름» 으로 만든다 */
  { n: '589 이용권 결제 완료', f: 'D => "💳 결제 완료 — " + D.pass + " 이용권 · 우편함을 확인하세요"' },
  { n: '589 다이아 결제 완료', f: 'D => "💳 결제 완료 — " + D.diaPack + " · 우편함을 확인하세요"' },
  { n: '206 승급 실패',     f: 'D => "💀 승급 실패 — 시간 안에 <b>승급 수호자</b>를 못 잡았습니다"' },
  { n: '589 프리미엄 결제 완료', f: 'D => "💳 결제 완료 — 프리미엄 패스 · 절망의 탑 · 우편함을 확인하세요"' },
  { n: '206 랭킹 탭',       f: 'D => "🏚️ 몬스터 농장 랭킹은 아직 열리지 않았습니다"' },
  { n: '206 가이드 완료',   f: 'D => "📌 모든 가이드 미션 완료! 🎉"' },
  { n: '206 자동 축복',     f: 'D => "✨ 자동 축복 <b>99999회</b> — 축복 Lv <b>999 → 999</b>"' },
  { n: '206 도감 마이그레이션', f: 'D => "📖 도감이 <b>«부위 · 등급 세트»</b> 단위로 바뀌었습니다"' },
];

(async () => {
  console.log('\n[§1 정적 — 분류가 소스에 그대로 박혀 있는가]');
  ck('§1-0 notify() 정의', /function notify\(txt\)\{[\s\S]{0,240}fxToast\(txt\)/.test(SRC),
     '큐 ' + (/noteQ\.push\(txt\)/.test(SRC) ? '있음' : '없음'));
  /* 206 ③ — 팝업 폴백은 «레이어 자체가 없을 때» 한 조건으로 좁혔다. 옛 «드롭 = 팝업» 이 돌아오면 FAIL */
  ck('§1-0 폴백은 레이어 부재에만', /if\(!fxL\(\)\)\{ popup\('알림'/.test(SRC) && !/if\(!el\) popup\('알림'/.test(SRC),
     /if\(!el\) popup\('알림'/.test(SRC) ? '옛 «드롭 = 팝업» 폴백이 되살아났다' : '큐 폴백');
  ck('§1-0 fxToast 가 el 을 반환', /setTimeout\(\(\) => el\.remove\(\), 1060\);\s*\n\s*return el;/.test(SRC));
  let tOk = 0;
  const why = (c, want) => !c ? '조각을 못 찾음' : /^자리가/.test(c) ? c + ' — 조각이 자리를 하나로 못 가리킨다' : '아직 ' + c + '()';
  TOAST_SITES.forEach(([n, f]) => { const c = callerOf(f); if (c === 'notify') tOk++; else ck('§1 토스트 — ' + n, false, why(c)); });
  ck('§1 토스트 전환 ' + tOk + '/' + TOAST_SITES.length, tOk === TOAST_SITES.length);
  let pOk = 0;
  POPUP_SITES.forEach(([n, f]) => { const c = callerOf(f); if (c === 'popup') pOk++; else ck('§1 팝업 유지 — ' + n, false, c === 'notify' ? '토스트로 밀렸다' : why(c)); });
  ck('§1 팝업 유지 ' + pOk + '/' + POPUP_SITES.length, pOk === POPUP_SITES.length);

  /* ── §R 되돌림 시험(511) — «무르게 풀지 않았다» 를 네 못으로 박는다 ────────────────────
     고친 것은 조각 둘(490)과 **조각을 자리로 옮기는 함수**(475 주석) 뿐이고, 게이트가 재던
     성질(«어느 호출자가 이 문구를 내보내는가»)은 한 칸도 안 넓혔다. 사본은 메모리에서만
     만든다 — index.html 은 읽기만 한다. */
  const PROMO = POPUP_SITES[0][1];                       /* '🏅 승급 성공!' */
  ck('§R-a 옛 판(첫 출현 하나)이 이 자리에서 실제로 틀린다',
     callerOfNaive(PROMO) !== 'popup',
     '옛 판 → ' + (callerOfNaive(PROMO) || '조각을 못 찾음') + ' · 새 판 → ' + callerOf(PROMO));
  const noSite = SRC.replace("popup('🏅 승급 성공!'", "popup('승급 결과'");
  ck('§R-b 주석 출현만 남으면 초록이 아니다 (주석은 제품이 아니다)',
     callerOf(PROMO, noSite) === null,
     '제품 호출부를 지운 사본 → ' + (callerOf(PROMO, noSite) || '조각을 못 찾음')
     + ' · 그 사본에도 주석 출현은 남아 있다(' + (noSite.split(PROMO).length - 1) + '건)');
  ck('§R-c 그 자리가 토스트로 밀리면 빨개진다',
     callerOf(PROMO, SRC.replace("popup('🏅 승급 성공!'", "notify('🏅 승급 성공!'")) === 'notify',
     '팝업 → 토스트 사본에서 notify 로 읽힌다');
  const EXFRAGS = [TOAST_SITES.find(r => /재화 교환 — 다이아/.test(r[0]))[1],
                   TOAST_SITES.find(r => /재화 교환 완료/.test(r[0]))[1]];
  const exBroken = SRC.replace('if(S.dia < n){ notify(', 'if(S.dia < n){ popup(')
                      .replace("notify(curIc('dia') + ' <b>' + fmt(n) + '</b> → ' + curIc(ex.k)",
                               "popup(curIc('dia') + ' <b>' + fmt(n) + '</b> → ' + curIc(ex.k)");
  ck('§R-d 새 교환 조각 둘은 popup 으로 되돌리면 빨개진다',
     EXFRAGS.every(f => callerOf(f, exBroken) !== 'notify'),
     EXFRAGS.map(f => callerOf(f, exBroken) || '못 찾음').join(' · '));

  /* ── §367 (401) — 소진 문구가 «무료» 가 아니라 «오늘» 인 **근거**를 같이 잡는다 ────────────
     위 §1 의 조각을 살아 있는 문구로 갈아 끼우는 것만으로 끝내면, 367 이 통째로 되돌아가
     «5회 전부 무료» 가 돼도 이 절은 초록으로 남는다(333 — 자리를 비우지 마라 · 177-③).
     ⚠ 구간의 **동작**(라벨 «광고 보고 돌리기» · ▶AD 표식 · 회차별 전환)은 `verify367` 이 소유한다.
     여기서 묻는 것은 딱 하나 — «149 가 지키는 이 토스트가 그 구성 위에 서 있는가» 다. */
  const roulSeg = src => {
    const g = re => { const m = src.match(re); return m ? +m[1] : NaN; };
    return { free: g(/const ROUL_FREE\s*=\s*(\d+)/), ad: g(/const ROUL_AD\s*=\s*(\d+)/),
             sum: /const ROUL_TRY\s*=\s*ROUL_FREE\s*\+\s*ROUL_AD/.test(src) };
  };
  const RS = roulSeg(SRC);
  ck('§367 [전제] 광고 구간이 실재한다 (무료 n + 광고 m)',
     RS.free >= 1 && RS.ad >= 1 && RS.sum,
     'ROUL_FREE=' + RS.free + ' · ROUL_AD=' + RS.ad + ' · ROUL_TRY=ROUL_FREE+ROUL_AD ' + (RS.sum ? '✓' : '✗')
     + (RS.ad >= 1 ? '' : '  ← 광고 구간이 사라졌다: 소진 문구는 다시 «무료 …» 여야 한다'));
  /* 충전량을 리터럴 5 로 적으면 구간을 늘려도 문구가 안 따라온다 — 총량 상수로만 말해야 한다 */
  ck('§367 소진 토스트가 충전량을 상수 ROUL_TRY 로 말한다',
     /notify\('🎰 오늘 룰렛 소진[^']*'\s*\+\s*ROUL_TRY\s*\+/.test(SRC), '소스 grep');
  /* 옛 문구가 «살아 있는 코드» 로 돌아왔는가. 367 이 남긴 설명 주석에 같은 글자가 있으므로
     주석을 걷어낸 사본에서 본다(걷어내다 그 구간째 날아가면 음성항이 헛초록이 되므로 전제도 같이 찍는다). */
  const SRC_NC = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
  ck('§367 옛 «무료 룰렛 소진» 이 살아 있는 코드로 안 돌아왔다',
     SRC_NC.includes('오늘 룰렛 소진') && !SRC_NC.includes('무료 룰렛 소진'),
     SRC_NC.includes('오늘 룰렛 소진') ? '주석 제외 grep' : '← 주석 제거가 이 구간째 지웠다(자가 헛초록)');
  /* §R — 무르게 푼 수리가 아님을 못박는다: 367 **이전**(무료 5 · 광고 0) 사본에서 [전제] 가 빨개진다.
     `verify367` [R] 과 같은 되돌림이지만 여기서는 «그러면 149 의 이 절이 빨개지는가» 만 본다. */
  const REV = SRC.replace('const ROUL_FREE = 3;', 'const ROUL_FREE = 5;')
                 .replace('const ROUL_AD   = 2;', 'const ROUL_AD   = 0;');
  const RR = roulSeg(REV);
  ck('§367 §R 되돌림 — ROUL_AD=0 사본에서는 [전제] 가 빨갛다',
     REV !== SRC && RR.free === 5 && RR.ad === 0 && !(RR.free >= 1 && RR.ad >= 1 && RR.sum),
     REV === SRC ? '사본이 안 만들어졌다(상수 표기가 바뀌었다)' : 'ROUL_FREE=5 · ROUL_AD=0 ⇒ 전제 FAIL');

  /* ── §589 (2026-08-31) — 결제 안내가 «한 곳» 인 것이 이 절이 지키는 것 ────────────────────
     589 가 안내 네 자리(다이아 상품 «준비 중» · 이용권 «구매 완료» · 프리미엄 «연동 준비 중»)를
     **한 줄로 접었다**. §1 은 조각 하나만 세므로, 줄만 갈아 끼우고 끝내면 «세 상품 중 둘이 제
     안내를 따로 만들어도 초록» 이 된다(333 · §367 과 같은 이유). 그래서 여기서 «한 곳» 을 묻는다.
     ⚠ 이 절이 소유한 것은 **안내의 유일성**뿐이다 — 결제·지급의 실동작은 `verify589` 가 갖는다. */
  const SRC_NC589 = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const payHits = (SRC_NC589.match(/notify\('💳 결제 완료 — '/g) || []).length;
  ck('§589 «결제 완료» 안내가 소스에 딱 한 곳(payMock)', payHits === 1, payHits + '곳');
  ck('§589 그 한 곳이 payMock 안이다',
     /function payMock\(o\)\{?[\s\S]{0,900}?notify\('💳 결제 완료 — '/.test(SRC_NC589), '소스 grep');
  ['dia:', 'pass:', 'prem:'].forEach(k => {
    ck('§589 원화 상품 «' + k + '» 이 payMock 을 지난다',
       new RegExp("payMock\\(\\{\\s*[\\s\\S]{0,120}?k:\\s*'" + k).test(SRC_NC589), '소스 grep');
  });
  /* 옛 안내 셋이 «살아 있는 코드» 로 안 돌아왔는가(주석에는 설명으로 남아 있다) */
  ['결제 준비 중입니다', '결제 연동 준비 중입니다', "'🎫 ' + p.n + ' 이용권 — '"].forEach(t => {
    ck('§589 옛 안내 «' + t.slice(0, 14) + '» 이 살아 있는 코드로 안 돌아왔다',
       !SRC_NC589.includes(t), SRC_NC589.includes(t) ? '되살아났다' : '주석 제외 grep');
  });
  /* §R — 무르게 푼 것이 아님을 못박는다: 상품 하나가 제 안내를 따로 내는 사본에서 이 절이 빨개진다 */
  const REV589 = SRC.replace("$('psBuy').onclick = () => buyPassPrem();",
    "$('psBuy').onclick = () => notify('💳 결제 완료 — 프리미엄 · 우편함을 확인하세요');");
  /* 사본 쪽은 «결제 완료» 안내가 몇 곳인지만 세면 되므로 뒷부분을 묶지 않는 느슨한 자로 센다
     (되돌림이 심는 문구는 상품 이름을 리터럴로 이어 붙이므로 위 엄격한 자에는 안 걸린다). */
  const revHits = (REV589.replace(/\/\*[\s\S]*?\*\//g, ' ').match(/notify\('💳 결제 완료/g) || []).length;
  /* 되돌림 사본에서 깨지는 것은 «버튼이 payMock 을 지난다» 는 배선이다 — 그 사본에서는
     `#psBuy` 가 제 notify 를 직접 부르므로 «결제 완료» 안내가 **두 곳**이 된다. */
  const revBtnDirect = /\$\('psBuy'\)\.onclick = \(\) => notify\('💳 결제 완료/.test(REV589);
  const revWired = /\$\('psBuy'\)\.onclick = \(\) => buyPassPrem\(\)/.test(REV589);
  ck('§589 §R 되돌림 — 프리미엄이 제 안내를 따로 내면 «한 곳»(=1) 이 깨진다',
     REV589 !== SRC && revBtnDirect && !revWired && revHits === 2,
     REV589 === SRC ? '사본이 안 만들어졌다(핸들러 표기가 바뀌었다)'
       : '사본의 «결제 완료» 안내 ' + revHits + '곳 · 버튼 직접 notify ' + revBtnDirect);

  const browser = await launch(chromium);
  for (const H of HEIGHTS) {
    console.log('\n[frame 1080x' + H + ']');
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof notify === 'function');
    await page.waitForTimeout(500);

    if (BROKEN) await page.evaluate(() => { window.notify = t => popup('알림', '<p>' + t + '</p>'); });

    /* ── §2 실동작 — 실제 경로를 밟는다. 각 항목이 «버튼별 기능 체크 표» 의 한 줄이다 ───── */
    const RUN = await page.evaluate(() => {
      /* 토스트/모달을 매 항목 전에 비우고, 그 항목이 무엇을 열었는지 본다 */
      const clear = () => {
        document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
        try { closeModal(); } catch (e) {}
      };
      const seen = () => {
        const t = [...document.querySelectorAll('#fxl .fx-toast')];
        const md = document.getElementById('modal');
        return { toast: t.length, txt: t.map(e => e.textContent).join(' | '),
                 modal: !!(md && md.classList.contains('on')) };
      };
      const out = [];
      const run = (name, fn, allowModal) => {
        clear();
        let err = '';
        try { fn(); } catch (e) { err = String(e && e.message || e); }
        out.push(Object.assign({ name, err, allowModal: !!allowModal }, seen()));
      };

      /* 상태를 «막히는» 쪽으로 몰아 둔다 */
      S.dia = 0; S.relic = 0; S.gold = 0;

      run('가이드 소환 차단',         () => doSummon('weapon', 1));
      /* 가이드 배너 잠금을 풀어야 «재화 부족» 경로가 드러난다(gmBlocked 가 먼저 막는다) */
      run('소환 재화 부족 (10 상점)', () => { S.guide.idx = GUIDE.length; doSummon('weapon', 1); });
      run('유물 소환 — 조각 부족',    () => summonRelic());
      /* 182 — 구매 두 경로 대신 «미보유 코스튬 착용 시도»(시트 [착용] 버튼과 같은 분기) */
      run('코스튬 — 미보유 착용',     () => { const a = AVATARS.find(x => !S.avatars[x.id]); if (!a) throw new Error('미보유 코스튬 없음'); cosSel = a.id; if (!wearAvatar(cosSel)) notify('\u{1F512} 승급전에서 획득해야 착용합니다'); });
      /* 333 — 옛 «승급 조건 미달»(`S.best = 0; startPromo()`)은 295 가 반려 자체를 없애 이제 토스트가
         0 이다(가드는 «최고 계급»·«이미 승급전 중» 둘뿐이고 둘 다 조용히 return). 위 §1 과 같은 자리로
         갈아 끼운다 — 코스튬 [강화]의 미보유 반려. 243 «미보유 착용» 과 같은 꼴로 분기를 밟는다. */
      run('코스튬 — 미보유 강화',     () => {
        const a = AVATARS.find(x => !S.avatars[x.id]); if (!a) throw new Error('미보유 코스튬 없음');
        cosSel = a.id; renderCos();
        /* 243 «미보유 착용» 처럼 분기를 베껴 쓰지 않고 **실제 버튼**을 누른다(#bCos 위임 리스너).
           베껴 쓰면 notify() 가 살아 있다는 것만 재는 표본이 된다 — 되돌림 시험에서 §2 가 안 빨개졌다. */
        const b = document.querySelector('#bCos [data-cosup]');
        if (!b) throw new Error('[강화] 버튼이 없다');
        b.click();
      });
      run('던전 잠김 — 소탕',         () => { const d = DUNGEONS.find(x => dunLocked(x)); if (d) sweepDungeon(d); else throw new Error('잠긴 던전 없음'); });
      run('던전 입장 소진 — 소탕',    () => { const d = DUNGEONS.find(x => !dunLocked(x)); S.dun[d.id] = 2; S.dunTk[d.id] = 0; sweepDungeon(d); });
      run('스킬 슬롯 부족',           () => { S.eqSkill = SKILLS.slice(0, 8).map(x => x.id); const s = SKILLS.find(x => !S.eqSkill.includes(x.id)); if (!S.own[s.id]) S.own[s.id] = { n: 1, l: 1 }; toggleEquip(s, 'skill'); });
      run('펫 슬롯 부족',             () => { S.eqPet = PETS.slice(0, 3).map(x => x.id); const p = PETS.find(x => !S.eqPet.includes(x.id)); if (!S.own[p.id]) S.own[p.id] = { n: 1, l: 1 }; toggleEquip(p, 'pet'); });
      run('쿠폰 — 잘못된 코드',       () => { if (!S.opt.cp) S.opt.cp = {}; const code = 'NOPE'; if (!CF_CODES[code]) notify('🎟 사용할 수 없는 코드입니다'); });
      /* passClaim 은 «해금된 단계»(passOpen) 에서만 프리미엄을 묻는다 — 진행도를 올려 한 칸 연다 */
      run('패스 — 프리미엄 잠금',     () => {
        S.pass.prem = 0; S.pass.got = {}; S.best = 999999; S.att.n = 9999;
        const i = passLast();
        if (i < 0) throw new Error('해금된 패스 단계가 없다');
        if (passClaim(i, 1) !== false) throw new Error('프리미엄 잠금이 안 걸렸다');
      });
      /* 189(2026-08-27, 저장소 주인 지시) — «배속»·«마을» 두 칸이 삭제돼 그 토스트 2건도 없어졌다.
         자리만 비우면 되살아나도 아무도 모른다(177-③) → 아래 [189] 절이 «부재» 를 자로 삼는다. */
      run('최고 계급',                () => { const keep = S.rank; S.rank = RANKS.length - 1; openPromo(); S.rank = keep; });
      /* 588·589 이관 — «다이아 부족» 은 죽었고, 같은 버튼이 이제 «결제 완료» 를 낸다.
         ⚠ 다이아를 **0** 으로 두고 부른다: 옛 차감 분기가 되살아나면 여기가 그대로 빨개진다. */
      run('589 이용권 결제 완료',     () => { const p = PASS_ITEMS.find(x => !passOwned(x.id));
        if (!p) throw new Error('미보유 이용권 없음'); S.dia = 0; if (buyPass(p.id) !== true) throw new Error('구매가 막혔다'); });
      run('설정 — 언어',              () => notify('💬 현재 <b>한국어</b>만 지원합니다'));
      /* 401 — §1 이 정적으로만 보던 자리를 실동작으로도 한 줄 세운다. 333-③ 대로 분기를 베껴 쓰지 않고
         **실제로 배선된 핸들러**(`#rouBtn.onclick` = `spinRoulette`)를 부른다 — 게이트가 제 손으로
         부른 notify 를 세면 아무것도 검증하지 않는다. † 룰렛 팝업이 열린 채라 모달 ON 을 허용한다. */
      run('룰렛 소진 †',              () => {
        S.daily.spins = 0; openRoulette();
        const b = document.getElementById('rouBtn');
        if (!b || !b.onclick) throw new Error('#rouBtn 이 없다');
        b.onclick();
      }, true);

      /* ── 206 — 149 가 «결과» 라서 모달로 남겼던 자리들. 전부 **제품 함수를 실제로 부른다**
         (문구를 게이트에서 손으로 조립해 notify 에 넣으면 아무것도 검증하지 않는다).
         †  = 그 경로가 자기 모달을 이미 열어 둔 채 알리는 자리 → 모달 ON 을 허용하고
              «토스트가 떴는가» 만 본다(합성은 아이템 상세 팝업 안의 버튼이다). */
      /* 310 — `finishDunRun` 이 읽는 것은 255·264 이후 `bossIn`·`bossLeft` 다. 옛 `dmg`/`need` 를
         계속 넘기면 두 분기 중 «보스 미등장» 만 늘 밟혀 긴 쪽(«보스 체력 n% 남음»)이 안 돌았다. */
      run('206 던전 레벨 실패', () => { const d = DUNGEONS[0];
        finishDunRun({ d, f: 3, bossIn: true, bossLeft: .42, stage: S.stage }, false); });
      run('206 승급 실패',      () => { promo = { rank: RANKS[Math.min(1, RANKS.length - 1)] }; endPromo(false); });
      run('206 아레나 결과',    () => { S.arena = { w: 3, l: 1 };
        openArenaResult(true, { op: { n: '도전자', cp: 1.5e9 } }, curIc('gold') + ' 999.9M'); });
      run('206 레이드 결과',    () => { raidOn = RAIDS[0]; raidT = 0; raidDmg = 4.4e10; raidStage = S.stage;
        endRaid(true); });
      run('206 도감 강화',      () => { const st = COLL_SETS[0];
        st.it.forEach(id => { S.own[id] = { n: 1, l: 1 }; });
        S.coll[st.key] = 0;
        if (!collReady(st.key)) throw new Error('세트가 강화 가능 상태가 아니다');
        claimColl(st.key); });
      run('206 재료 환불',      () => { const bk = Object.keys(BANNERS)[0], B = BANNERS[bk];
        B.list.forEach(it => { S.own[it.id] = { n: 3, l: maxLv(it) === Infinity ? MAX_LEVEL : maxLv(it) }; });
        if (!allMaxed(B.list)) throw new Error('배너가 전부 최대가 아니다');
        doRefund(bk); });
      run('206 합성 성공 †',    () => { const it = EQUIPS.find(e => canCraft(e) || (!isTopGrade(e) && nextGradeItem(e)));
        if (!it) throw new Error('합성 가능한 장비가 없다');
        S.own[it.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
        showItem(it.id);
        const c = document.getElementById('mCraft');
        if (!c) throw new Error('[합성] 버튼이 없다');
        c.onclick(); }, true);
      run('206 이용권 구매',    () => { const p = PASS_ITEMS.find(x => !passOwned(x.id));
        if (!p) throw new Error('미보유 이용권 없음');
        S.dia = 1e12;
        if (buyPass(p.id) === false) throw new Error('구매가 막혔다'); });
      run('206 다이아 상품 결제', () => { renderCoinPage($('shopList'));
        const b = document.querySelector('#shopList [data-diabuy]');
        if (!b) throw new Error('다이아 상품 칸이 없다'); b.click(); });
      run('206 프리미엄 패스',  () => { const b = document.getElementById('psBuy');
        if (!b || !b.onclick) throw new Error('#psBuy 가 없다'); b.onclick(); });
      run('206 랭킹 탭 미개방', () => { const t = document.querySelector('#rkw [data-rktab="tower"]');
        if (!t) throw new Error('랭킹 탭이 없다'); t.click(); });
      /* 남은 3곳(가이드 체인 끝 · 자동 축복 정산 · 도감 마이그레이션)은 «부팅 1회» 또는
         «가이드 전 미션 클리어» 라 런타임에서 그 조건을 만들 수 없다 → §1 정적 + §3 폭이 자다. */
      clear();
      return out;
    });

    RUN.forEach(r => {
      const ok = !r.err && r.toast >= 1 && (r.allowModal || !r.modal);
      ck('§2 ' + r.name, ok,
         r.err ? '예외: ' + r.err
               : '토스트 ' + r.toast + ' · 모달 ' + (r.modal ? (r.allowModal ? 'ON(자기 시트 — 허용)' : 'ON(← 아직 팝업)') : 'off')
                 + (r.txt ? ' · «' + r.txt.slice(0, 46) + '»' : ''));
    });

    /* ── §3 폭·자리 — 워스트케이스 문구가 프레임 안에 드는가 ───────────────────── */
    const WID = await page.evaluate(fns => {
      const longest = (arr, get) => arr.reduce((a, b) => (String(get(b)).length > String(get(a)).length ? b : a));
      const D = {
        dun:     longest(DUNGEONS, d => d.n).n,
        dunLock: dunLockTxt(longest(DUNGEONS, d => dunLockTxt(d).length ? d : d)),
        ban:     longest(Object.values(BANNERS), b => b.n).n,
        ava:     longest(AVATARS, a => a.n).n,
        avaReq:  AVATARS.map(a => cosReqText(a)).reduce((a, b) => (String(b).length > String(a).length ? b : a), ''),
        coll:    'S' in window ? longest(Object.values(BANNERS), b => b.n).n : '',
        raid:    longest(RAIDS, r => r.n).n,
        wpn:     wpnSlotDef().n,
        ad:      longest(COIN_ADS, a => a.n).n,
        icDia:   curIc('dia'), icRel: curIc('relic'), icGold: curIc('gold'),
        icStone: curIc('stone'), icRstone: curIc('rstone'),
        /* 206 — 새로 토스트가 된 결과 문구들의 워스트케이스 재료 */
        collSet: longest(COLL_SETS, s => s.n).n,
        grade:   Object.values(GRADE).map(g => g.n).reduce((a, b) => (b.length > a.length ? b : a), ''),
        equip:   longest(EQUIPS, e => e.n).n,
        pass:    longest(PASS_ITEMS, p => p.n).n,
        diaPack: (() => { const p = longest(DIA_PACKS, x => diaPackName(x) + wonTxt(x.won));
                          return diaPackName(p) + ' <b>' + wonTxt(p.won) + '</b>'; })(),
      };
      /* 310 — «가방 이름» 재료(D.bag)는 그 토스트가 292 로 사라져 쓰는 워스트케이스가 없다.
         죽은 재료를 남겨 두면 다음 세션이 «가방 토스트가 아직 있다» 고 읽는다 → 같이 지웠다. */
      const wrap = document.getElementById('app');
      const wr = wrap.getBoundingClientRect(), sc = wr.width / 1080;
      const res = [];
      for (const s of fns) {
        const txt = (0, eval)('(' + s.f + ')')(D);
        document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
        const el = notify(txt);
        if (!el) { res.push({ n: s.n, w: -1, l: 0, r: 0, t: 0, b: 0, txt }); continue; }
        /* fxToastIn 0% 는 translate(-50%,-40px) scale(.92) 다 — 그대로 재면 폭을 8% 작게,
           자리를 40px 위로 잰다. 애니메이션을 끄고 «정착 상태» 를 명시해 둔 뒤 잰다. */
        el.style.animation = 'none';
        el.style.transform = 'translate(-50%,0)';
        const r = el.getBoundingClientRect();
        res.push({ n: s.n, w: r.width / sc,
                   l: (r.left - wr.left) / sc, r: (r.right - wr.left) / sc,
                   t: (r.top - wr.top) / sc, b: (r.bottom - wr.top) / sc, txt });
        el.remove();
      }
      /* 58 이 실측해 둔 빈 띠 */
      const plate = document.querySelector('#top .pcp'), chap = document.getElementById('chapN');
      const band = {
        top: plate ? (plate.getBoundingClientRect().bottom - wr.top) / sc : 142,
        bot: chap ? (chap.getBoundingClientRect().top - wr.top) / sc : 227,
      };
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      return { res, band, D };
    }, WORST);

    WID.res.forEach(r => {
      ck('§3 폭 — ' + r.n, r.w > 0 && r.l >= 0 && r.r <= 1080,
         r.w < 0 ? '토스트를 못 띄웠다'
                 : '폭 ' + r.w.toFixed(0) + ' · x' + r.l.toFixed(0) + '..' + r.r.toFixed(0)
                   + (r.l < 0 || r.r > 1080 ? '  ← 프레임 밖' : ''));
    });
    const first = WID.res.find(r => r.w > 0);
    ck('§3 토스트가 «빈 띠» 안', !!first && first.t >= WID.band.top - 2 && first.b <= WID.band.bot + 2,
       first ? '토스트 y' + first.t.toFixed(0) + '..' + first.b.toFixed(0)
               + ' ⊂ 띠 y' + WID.band.top.toFixed(0) + '..' + WID.band.bot.toFixed(0) : '토스트 없음');

    /* ── §4 큐 — 토스트를 못 띄워도 안내가 사라지면 안 되고, 팝업으로 되돌아가서도 안 된다 ───
       206 ③: 149 의 «드롭 = 팝업 폴백» 이 바로 주인이 없애라는 안내성 팝업이었다.
       이제 드롭분은 큐에 들어가 앞 토스트가 소멸(1060ms)하는 대로 실제로 뜬다. */
    const FB = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      try { closeModal(); } catch (e) {}
      for (let i = 0; i < 4; i++) fxToast('스택 ' + i);      /* 4장 → 다음 것은 fxToast 가 드롭한다 */
      const el = notify('큐로 밀린 안내');
      const md = document.getElementById('modal');
      const r = { dropped: !el, queued: noteQ.length === 1,
                  modal: !!(md && md.classList.contains('on')),
                  txt: md ? md.textContent.slice(0, 40) : '', shownMs: -1 };
      /* 자리가 나면 실제로 뜨는가 — 최대 3초까지 20ms 간격으로 본다 */
      const t0 = performance.now();
      for (let i = 0; i < 150; i++) {
        if ([...document.querySelectorAll('#fxl .fx-toast')].some(e => e.textContent.includes('큐로 밀린 안내'))) {
          r.shownMs = performance.now() - t0; break;
        }
        await wait(20);
      }
      try { closeModal(); } catch (e) {}
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      noteQ.length = 0;
      return r;
    });
    ck('§4 드롭분이 큐로 간다',      FB.dropped && FB.queued,
       '드롭 ' + FB.dropped + ' · 큐 적재 ' + FB.queued);
    ck('§4 폴백 팝업이 안 뜬다',     !FB.modal,
       FB.modal ? '모달 ON «' + FB.txt.trim() + '» ← 149 의 옛 폴백' : '모달 off');
    ck('§4 큐가 자리 나면 실제로 뜬다', FB.shownMs >= 0 && FB.shownMs <= 2500,
       FB.shownMs < 0 ? '3초 안에 안 떴다 — 안내가 사라졌다' : Math.round(FB.shownMs) + 'ms 뒤 표시');

    /* ── §6 체류 — 주인 기준 «클릭 안 해도 ≈1초 뒤 자동으로 사라진다»(206 ②) ──────────
       58 이 이 기하를 소유한다. 206 은 값을 바꾸지 않고 **상한만** 자로 세운다:
       너무 짧으면 못 읽고, 1.5초를 넘으면 주인이 말한 «1초 이따» 가 아니다. */
    const LIFE = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      const t0 = performance.now();
      const el = fxToast('체류 측정');
      if (!el) return -1;
      for (let i = 0; i < 250; i++) {
        if (!el.isConnected) return performance.now() - t0;
        await wait(20);
      }
      return -2;
    });
    ck('§6 클릭 없이 자동 소멸 (0.7~1.5초)', LIFE >= 700 && LIFE <= 1500,
       LIFE < 0 ? (LIFE === -1 ? '토스트를 못 띄웠다' : '5초 안에 안 사라졌다') : Math.round(LIFE) + 'ms');

    /* ── §189 삭제된 두 안내의 «부재» ────────────────────────────────────────────
       189(저장소 주인 지시)가 «마을»·«배속» 두 칸을 지우면서 그 안내 토스트 2건도 없어졌다.
       위 목록에서 줄만 빼면 되살아나도 초록이므로(177-③), 부재를 자로 세운다 —
       ⓐ 소스에 문구가 남아 있지 않고 ⓑ DOM 에 그 칸이 없다. */
    const GONE = await page.evaluate(() => ({
      spdb: !!document.getElementById('spdb'),
      town: !!document.querySelector('#botleft .ubtn[data-util="town"]'),
      chat: !!document.querySelector('#botleft .ubtn[data-util="chat"]')
    }));
    ck('§189 #spdb(배속) 없음',        !GONE.spdb, GONE.spdb ? '되살아났다' : '없음');
    ck('§189 «마을» 칸 없음',          !GONE.town, GONE.town ? '되살아났다' : '없음');
    ck('§189 💬 채팅 칸은 남아 있다',   GONE.chat, GONE.chat ? '있음' : '채팅까지 사라졌다');
    ck('§189 «마을 준비 중» 문구 0건',  !SRC.includes('마을은 아직 준비 중입니다'), '소스 grep');
    ck('§189 «배속 미해금» 문구 0건',   !SRC.includes('전투 배속은 아직 해금되지 않았습니다'), '소스 grep');

    /* ── §292 사라진 «가방 칸 상세» 토스트의 부재 (310) ──────────────────────────
       292 가 가방 칸의 `notify()` 를 걷어내고 33 재화 정보 팝업으로 갈아 끼웠다(주인 지시).
       §1 목록에서 줄만 뺐으면 토스트가 되살아나도 초록이다(177-③ · §189 와 같은 이유) →
       ⓐ 옛 문구가 소스에 0건이고 ⓑ 칸이 `data-cur` 로 33 에 물려 있는지를 자로 세운다.
       («칸 클릭 → 33 팝업» 의 실동작 전수 확인은 292 의 제 게이트 `tools/func292.js` ② 가 소유한다.) */
    const BAG = await page.evaluate(() => {
      openBag();                                   /* 칸은 열어야 그려진다(150 — 숨은 채 그리면 폭 0) */
      const c = [...document.querySelectorAll('#bagGrid .bg53-c:not(.em)')];
      const out = { n: c.length, cur: c.filter(e => e.dataset.cur).length };
      closeBag();
      return out;
    });
    ck('§292 옛 «가방 칸 보유량» 토스트 문구 0건',
       !/보유 <b>'\s*\+\s*fmtCur\(c\.dataset\.bagk/.test(SRC), '소스 grep');
    ck('§292 가방 칸이 33 에 물려 있다', BAG.n > 0 && BAG.cur === BAG.n,
       BAG.n ? BAG.cur + '/' + BAG.n + ' 칸에 data-cur' : '칸이 0개 — 가방을 못 그렸다');

    /* ── §255·264 던전·탑 «층 실패» 문구가 보스 판정을 말하는가 (310) ─────────────
       255 가 실패 사유를 «피해 부족» → «보스를 못 잡음» 으로 바꾸고 264 가 탑까지 같은 문구로
       모았다. §1 조각은 «층 실패 — » 까지만 찍으므로 문구 자체는 여기서 못 박는다 —
       옛 «피해 x / y» 가 돌아오면 눈금(dunRunProg)과 통보가 다시 어긋난다. */
    ck('§255 «레벨 n 실패» 는 보스 체력·미등장으로 말한다',
       / 실패 — '[\s\S]{0,120}보스 체력 <b>[\s\S]{0,80}보스 <b>미등장<\/b>/.test(SRC), '소스 grep');
    ck('§264 옛 «실패 — 피해» 문구 0건', !SRC.includes(' 실패 — 피해 <b>'), '소스 grep');
    /* 427 — 옛 낱말(«n층 실패»)이 되살아나면 여기서 운다. 조각 한 줄만 고치고 넘어가면
       제품이 «층» 으로 되돌아가도 아무도 모른다(310 이 조각을 옮겨 놓고 이 절을 세운 이유와 같다). */
    ck('§427 던전·탑 실패 통보에 «층» 0건', !/' \+ f \+ '층 실패/.test(SRC), '소스 grep');

    ck('§5 콘솔 에러 0', errs.length === 0, errs.length ? errs.slice(0, 3).join(' / ') : '0건');
    await ctx.close();
  }
  await browser.close();

  console.log('');
  if (bad.length) { console.log('실패 항목:'); bad.forEach(b => console.log('  · ' + b)); }
  console.log('VERIFY149 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
