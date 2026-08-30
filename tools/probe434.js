/* 작업 434 — 재현(338 규칙): `tools/verify210.js` [A] 「단련석은 던전 계열이 아니라 입장권을
 * 안 만들었다(125 [H] 5종 유지)」 한 항이 빨간 뿌리를 **제품에게 직접 물어서** 찍는다.
 * 실행: node tools/probe434.js
 *
 * 등재문 가설(PROGRESS 434 행): 「402 가 입장권을 «던전마다 한 장» 으로 뒤집으면서(5종 → 8종)
 *   210 쪽 짝이 옛 상수 «5» 위에 서 있었다. 제품은 멀쩡하고 자만 뒤처졌다.」
 *
 * 이 자가 답하는 것 넷:
 *   P1 옛 항이 세던 값 — `tk*` 키가 지금 몇 개인가(상수 5 와 얼마나 벌어졌나)
 *   P2 그 8 이 «아무 숫자» 가 아니라 **던전 수와 정확히 같은 수**인가(402 의 «던전마다 한 장»)
 *   P3 그 항이 지키려던 **뜻** — 단련석(절망의 탑 보상)이 입장권 목록에 끼어들었는가
 *   P4 그린 것 — 03 «탑» 탭 두 카드가 입장권을 그리는가, «없음» 을 그리는가(125 H3 식)
 *   P5 죽은 사본 — `dunTk('despair')` 가 내는 키가 CUR_ICON 에 실재하는가(있으면 진짜 결손)
 *   P6 대조 — 상수 방식(«키가 5개»)과 뜻 방식(«집합이 던전 권종과 같다») 중 무엇이 빨간가
 *
 * P3~P5 가 전부 «끼어들지 않았다» 로 나오면 **제품 0줄**이고 고칠 것은 자 한 항뿐이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };

const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  const r = await p.evaluate(() => {
    const tkKeys = Object.keys(CUR_ICON).filter(k => k.startsWith('tk')).sort();
    const dunTkKeys = [...new Set(DUNGEONS.map(d => dunTk(d.id)))].sort();
    /* 03 «탑» 탭을 실제로 열어 두 카드가 **그린** 것을 읽는다(선언만 보면 사본을 놓친다 — 402 교훈) */
    openDungeon(); setDunSub('tower');
    const drawn = [...document.querySelectorAll('#dunList [data-tcard]')].map(e => {
      const cell = e.querySelector('.sp.tk');
      return { id: e.dataset.tcard,
               txt: cell ? cell.textContent.trim() : null,
               imgs: cell ? [...cell.querySelectorAll('img.cic')].map(i => i.getAttribute('src')) : null };
    });
    return {
      tkKeys, tkCount: tkKeys.length,
      dunIds: DUNGEONS.map(d => d.id), dunCount: DUNGEONS.length, dunTkKeys,
      towerIds: TOWERS.map(t => t.id),
      towerInDun: DUNGEONS.some(d => TOWERS.some(t => t.id === d.id)),
      tstoneIcon: CUR_ICON.tstone,
      hasTkTstone: !!CUR_ICON.tkTstone,
      tstoneAsTicket: DUNGEONS.filter(d => CUR_ICON[dunTk(d.id)] === CUR_ICON.tstone).map(d => d.id),
      despairKey: dunTk('despair'), despairSrc: CUR_ICON[dunTk('despair')] || null,
      towerKey: dunTk('tower'), towerSrc: CUR_ICON[dunTk('tower')] || null,
      drawn
    };
  });

  console.log('[P1] 옛 항이 세던 값 — `tk*` 키 수 (옛 상수 5)');
  ok(r.tkCount !== 5, 'P1 지금 트리의 `tk*` 키는 5 가 아니다 = 그 상수가 뒤처졌다',
     r.tkCount + '개 (' + r.tkKeys.join(',') + ')');

  console.log('[P2] 그 수가 «아무 숫자» 가 아니라 던전 수와 같은가 (402 «던전마다 한 장»)');
  ok(r.tkCount === r.dunCount, 'P2 `tk*` 키 수 = DUNGEONS 수',
     r.tkCount + ' = ' + r.dunCount);
  ok(r.tkKeys.join(',') === r.dunTkKeys.join(','),
     'P2b 키 집합도 정확히 같다(여분의 입장권 0장)',
     r.dunTkKeys.join(','));

  console.log('[P3] 그 항이 지키려던 뜻 — 단련석이 입장권 목록에 끼어들었는가');
  ok(!r.hasTkTstone, 'P3 `CUR_ICON.tkTstone` 이 없다(단련석 입장권을 안 만들었다)');
  ok(r.tstoneAsTicket.length === 0,
     'P3b 단련석 아이콘을 입장권으로 쓰는 던전 0개',
     r.tstoneAsTicket.length ? r.tstoneAsTicket.join(',') : '0개 / ' + r.tstoneIcon);
  ok(!r.towerInDun, 'P3c 단련석 수급처인 탑 2장은 DUNGEONS 밖이다(209 규약)',
     r.towerIds.join(',') + ' ∉ ' + r.dunIds.join(','));

  console.log('[P4] 그린 것 — 03 «탑» 탭 카드가 입장권을 그리는가 (125 H3 식)');
  const bad = r.drawn.filter(d => !d.imgs || d.imgs.length !== 0 || !/없음/.test(d.txt || ''));
  ok(r.drawn.length === 2 && bad.length === 0,
     'P4 탑 카드 2장 다 입장권 이미지 0장 · «없음» 을 그린다',
     r.drawn.map(d => d.id + ':' + d.txt + '(img ' + (d.imgs ? d.imgs.length : '?') + ')').join(' · '));

  console.log('[P5] 죽은 사본 — 탑 id 로 dunTk() 를 부르면 실재하는 키가 나오는가');
  ok(r.despairSrc === null && r.towerSrc === null,
     'P5 `dunTk(탑)` 이 내는 키는 CUR_ICON 에 없다 = 탑에는 권종이 없다(부르는 곳도 없다)',
     r.towerKey + '→' + r.towerSrc + ' · ' + r.despairKey + '→' + r.despairSrc);

  console.log('[P6] 대조 — 상수 방식 vs 뜻 방식, 어느 쪽이 빨간가');
  const oldWay = !r.hasTkTstone && r.tkCount === 5;                       /* 옛 항 그대로 */
  const newWay = !r.hasTkTstone && r.tstoneAsTicket.length === 0
                 && r.tkKeys.join(',') === r.dunTkKeys.join(',');         /* 뜻을 묻는 모양 */
  ok(oldWay === false && newWay === true,
     'P6 ★ 상수 방식은 빨갛고 뜻 방식은 초록이다 ⇒ 결손은 제품이 아니라 자 한 항이다',
     '옛항 ' + (oldWay ? '초록' : '빨강') + ' · 뜻항 ' + (newWay ? '초록' : '빨강'));

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  await b.close();
  console.log((fail ? 'PROBE434 FAIL ' : 'PROBE434 PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
