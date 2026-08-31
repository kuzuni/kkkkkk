/* 531 — «레드닷 상시 점등 함정» 예방 짝의 **손잡이 한 곳**.
 *
 * 531 이 `index.html` 에 깐 두 줄
 *     :is(<스코프 23>) :is(s.updot,s.bdg,s.dot){display:none}
 *     :is(<스코프 23>) .alert>:is(s.updot,s.bdg,s.dot){display:block}
 * 은 **화면별 짝**(`#blsw .updot{display:none}` 따위)보다 특이성이 한 칸 높다(1,1,1 ↔ 1,1,0).
 *
 * ⚑ 그래서 앞선 작업들의 **되돌림 시험**이 이 파일을 읽어야 한다 — 283 · 325 · 516 · 519 의
 *   음성항은 전부 «화면별 짝을 걷으면 상시 점등으로 되돌아간다» 를 단언하는데, 531 이 그 뒤를
 *   받치고 있으면 걷어도 안 켜져서 **그 항이 빨개진다**(실제로 넷이 동시에 빨개졌다).
 *   그 항들의 뜻(«이 두 줄이 실제로 일한다»)은 여전히 옳으므로, 되돌릴 때 **531 의 짝도 같이**
 *   걷는 것으로 이관했다. 걷는 식을 각자 적으면 531 의 셀렉터가 바뀌는 날 넷이 조용히 헛초록이
 *   되므로(그때 «걷을 규칙 0줄» 은 예외가 아니라 그냥 0이다), 식을 여기 한 곳에만 둔다.
 */

/* CSSOM 규칙이 531 의 짝인가 — 두 줄 다 이 꼴을 갖는다 */
const CSSOM_RE = /s\.updot,\s*s\.bdg,\s*s\.dot/;

/* index.html **원문**에서 두 줄을 통째로 집는 자(283 처럼 소스 사본을 만드는 자가 쓴다) */
const SRC_RE = /\s*:is\(#bSk[^)]*\)\s*(?:\.alert>)?:is\(s\.updot,s\.bdg,s\.dot\)\{display:(?:none|block)\}/g;

/* 페이지 안에서 돌릴 조각 — 531 의 짝을 CSSOM 에서 걷고 «되살리는 함수» 를 돌려준다.
   ⚠ 되살리기까지 한 벌로 주는 이유: 되돌림 시험은 예외 없이 «걷었다 → 쟀다 → 되살렸다» 3박자이고,
     되살리기를 빼먹으면 그 뒤의 항이 전부 수리 전 트리에서 채점된다. */
const STRIP_JS = `(() => {
  const RE = ${CSSOM_RE.toString()};
  const killed = [];
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch (e) { continue; }
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      if (r.type === 1 && RE.test(r.selectorText || '')) { killed.push({ sh, i, text: r.cssText }); sh.deleteRule(i); }
    }
  }
  return { n: killed.length, restore: () => killed.reverse().forEach(k => { try { k.sh.insertRule(k.text, k.i); } catch (e) {} }) };
})`;

module.exports = { CSSOM_RE, SRC_RE, STRIP_JS };
