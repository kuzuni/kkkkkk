/* 작업 518 — 4회차 «전수 스윕(전 화면)».
 *
 * 2·3회차의 `probe518s` 는 오프너를 **자기가 모아서**(탭·사이드·메뉴·재화 알약 = 22개) 돌았다.
 * 그물 밖에 남아 있던 것은 **서브탭·시트·부위 슬롯 계열**이다 — 03 던전/탑/레이드 서브탭,
 * 23 훈련/룬/단련, 10 상점 구획 3, 08 영웅 시트 4, 21 도감 카테고리 6, 22 퀘스트 2,
 * 35 패스 탭 5, 19/20 프로필, 56 절전, 05 장비 세부 3.
 * 이 자는 그 목록을 손으로 다시 적지 않고 **351 의 오프너 수집기**(`probe351lib.collectOpeners`)를
 * 그대로 쓴다 — 351 은 «자·눈이 같은 화면을 본다» 를 위해 그 목록을 제품에게 묻도록 이미 고쳤고
 * (8·10·12·13·14회차), 손으로 적은 목록이 뒤처지는 사고를 402 가 못박았다.
 *
 * 재는 것(화면마다 · 새 로드):
 *   · 화면을 연다(`drive`) → 화면 안의 «재화를 주지 않는» 자리 하나를 누른다
 *     (= 주인이 겪은 순서: 버튼을 누른 직후 배경 전투 골드가 들어온다)
 *   · 2.5초 동안 `#fxl`(z60 = 모든 팝업/페이지 «위») 에 태어나는 재화 연출 노드를 센다
 *   · 그동안 **그 화면이 준 재화는 없다**(배경 전투가 버는 골드뿐) ⇒ 덮는 화면이면 **0 이어야 한다**
 *
 * 판정: `covered && n > 0` 만 LEAK. 덮는 층이 없는 화면(메인·필드)의 UI 발은 정상이다.
 *
 * 실행: node tools/probe518t.js [--only <라벨조각>]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, collectOpeners, drive, settle, TALL } = require('./probe351lib');

const WATCH_MS = 2500;
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();

/* 화면 안에서 «재화를 주지 않는» 자리 하나를 고른다.
   ⚠ 누르는 것은 **`pointerdown` 한 번뿐**이다(클릭 아님) — 수령·구매는 전부 click 핸들러라
   재화가 들어오지 않고 `fxTapEl`(추측 발원)만 선다. 그래도 «받기» 계열은 한 겹 더 뺀다:
   그 자리가 pointerdown 에서 무언가를 준다면 이 자의 전제(«재화를 안 받았다»)가 깨지고,
   깨진 줄 모르는 초록이 제일 나쁘다(3회차 probe518p 가 표를 통째로 오염시킨 그 사고). */
const SKIP_TXT = /받기|수령|획득|보상|교환/;

(async () => {
  const b = await launch(chromium);
  const openers = (await collectOpeners(b)).filter(o => !ONLY || o.label.includes(ONLY));
  console.log('\n=== probe518t — 4회차 전수 스윕 (351 오프너 ' + openers.length + '화면)');

  const rows = [];
  for (const o of openers) {
    const { ctx, page, errs } = await fresh(b, ...TALL);
    /* 453 — 보스전이 서면 페이지 열기가 통째로 no-op 이다. 273 의 정상 상태 «파밍 대기» 로 둔다
       (재는 축 — 배경 골드·발원·층 — 은 한 값도 안 바뀐다. verify518 [E]·[F] 와 같은 처방). */
    await page.evaluate(() => { S.bossFarm = true; S.dia = 1e9; }).catch(() => {});
    let r;
    try {
      await drive(page, o);
      /* ⚠ 4회차에 잡은 자 자신의 함정 — `drive` 의 450ms 로는 60 쥬시 개봉이 안 끝난다.
         89 유물(`#relw`)은 그 순간 **opacity 0** 이라 `fxCovered()` 가 «안 덮음» 으로 읽혔다
         (3회차가 편입해 둔 화면인데 자가 도로 놓친 꼴). 연출이 멎은 뒤에 잰다(1회차 ③ 과 같은 규율). */
      await settle(page);
      await page.waitForTimeout(400);
      r = await page.evaluate(async ({ ms, skipSrc }) => {
        const skipRe = new RegExp(skipSrc);
        document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
        const covered = fxCovered();

        /* 화면 안의 «재화를 안 주는» 자리 하나를 누른다 — 이것이 `fxTapEl`(추측 발원)을 세운다.
           ⚠ 연출 층 자신(`#fxl`·`#fxlc`)과 상시 크롬(`#top`·`#tabbar`·`#stagearea`)은 호스트가 아니다 —
           4회차 첫 실행이 z60 인 `#fxl` 을 «화면» 으로 골라 **한 화면도 안 눌렀다**(탭이 없으면
           추측 발원 자체가 안 서므로 자가 통째로 헛초록이 된다). */
        const SKIPID = ['fxl', 'fxlc', 'top', 'tabbar', 'stagearea', 'wrap'];
        const host = [...document.querySelectorAll('#app > *')]
          .filter(n => {
            const s = getComputedStyle(n), rc = n.getBoundingClientRect();
            return s.display !== 'none' && !SKIPID.includes(n.id) && rc.width > 100 && rc.height > 200;
          })
          .sort((a, b) => (+getComputedStyle(a).zIndex || 0) - (+getComputedStyle(b).zIndex || 0))
          .pop();
        let tapped = '·';
        if (host) {
          const cand = [...host.querySelectorAll('button, .btn, .ifbtn, .sk-slot, .sk-btn, [data-q], .rc, .cbtn, .shp-card, .dnc, .cfr, .qs-row, .ps-bx, .tm, .cl-card, .rw-slot')]
            .find(n => { const rc = n.getBoundingClientRect();
                         return rc.width > 20 && rc.height > 20 && !skipRe.test(n.textContent || ''); });
          /* ⚠ 목록에 없는 화면이 절반이었다(4회차 2번째 실행 — 54 중 28화면이 «탭 못 함»).
             `fxTapEl` 은 **아무 노드나** 받는다(34438 — `closest(…) || t`)이므로 폴백은
             «그 화면 한복판에 실제로 찍히는 것»(elementFromPoint)이면 충분하다. */
          const fb = (() => {
            const rc = host.getBoundingClientRect();
            return document.elementFromPoint(Math.round(rc.x + rc.width / 2), Math.round(rc.y + rc.height / 2));
          })();
          const pick = cand || (fb && !skipRe.test(fb.textContent || '') ? fb : null);
          if (pick) { pick.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); tapped = ((pick.className || '').split(' ')[0] || pick.tagName.toLowerCase()) + (cand ? '' : '*'); }
        }

        const gold0 = S.gold, dia0 = S.dia;
        const CURC = ['#FFDE6A', '#8FE9FF', 'rgb(255, 222, 106)', 'rgb(143, 233, 255)'];
        const hits = [];
        let below = 0;                                   /* 대조군 — 같은 연출이 팝업 «아래»(#fxlc)로 간 수 */
        const mo = new MutationObserver(recs => {
          for (const rec of recs) for (const n of rec.addedNodes) {
            if (n.nodeType !== 1 || !n.classList) continue;
            const c = n.className || '';
            const col = n.style.getPropertyValue('--c') || n.style.color || '';
            const cur = /fx-fly|fx-lit/.test(c) || (/fx-plus|fx-spark/.test(c) && CURC.includes(col));
            if (!cur) continue;
            if (n.closest('#fxl')) hits.push(c.split(' ')[0] + (/fx-plus|fx-spark/.test(c) ? ' ' + col : ''));
            else if (n.closest('#fxlc')) below++;
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        await new Promise(r2 => setTimeout(r2, ms));
        mo.disconnect();
        const sm = {};
        hits.forEach(h => { sm[h] = (sm[h] || 0) + 1; });
        return { covered, host: host ? (host.id || host.className) : '·', tapped, below,
                 goldUp: +(S.gold - gold0).toFixed(2), diaUp: S.dia - dia0, n: hits.length, kinds: sm };
      }, { ms: WATCH_MS, skipSrc: SKIP_TXT.source });
    } catch (e) {
      r = { err: String(e).slice(0, 120) };
    }
    r.label = o.label; r.errs = errs.length;
    rows.push(r);
    if (r.err) console.log('  ERR  ' + r.label.padEnd(20) + ' ' + r.err);
    else console.log('  ' + (r.covered && r.n > 0 ? 'LEAK' : ' ok ') + ' ' + r.label.padEnd(20)
      + ' 덮음 ' + (r.covered ? 'O' : '·')
      + ' · 층 ' + String(r.host).slice(0, 14).padEnd(14)
      + ' · 탭 ' + String(r.tapped).slice(0, 12).padEnd(12)
      + ' · #fxl ' + String(r.n).padStart(3) + ' / #fxlc ' + String(r.below).padStart(3)
      + ' · 배경 골드 +' + r.goldUp
      + (r.n ? ' · ' + JSON.stringify(r.kinds) : '')
      + (r.errs ? ' · 콘솔 ' + r.errs : ''));
    await ctx.close();
  }

  const leaks = rows.filter(r => !r.err && r.covered && r.n > 0);
  const covered = rows.filter(r => !r.err && r.covered);
  const errsN = rows.filter(r => r.err);
  console.log('\n화면 ' + rows.length + ' · 덮는 화면 ' + covered.length
    + ' · **샌 화면 ' + leaks.length + '개**'
    + (leaks.length ? ' — ' + leaks.map(l => l.label).join(', ') : ' (전 화면 0)')
    + (errsN.length ? ' · 오프너 실패 ' + errsN.length + ' — ' + errsN.map(e => e.label).join(', ') : ''));
  /* «탭을 못 한 화면» 은 추측 발원이 안 서므로 그 초록은 아무것도 안 말한다 — 세어서 드러낸다
     (8·13회차 351 «조용한 실패가 초록으로 읽힌다» 와 같은 규율). */
  const notap = rows.filter(r => !r.err && r.tapped === '·');
  console.log('탭 못 한 화면 ' + notap.length + (notap.length ? ' — ' + notap.map(r => r.label).join(', ') : ''));
  console.log('콘솔 에러 합계 ' + rows.reduce((a, r) => a + (r.errs || 0), 0));
  await b.close();
  process.exit(leaks.length || errsN.length ? 1 : 0);
})();
