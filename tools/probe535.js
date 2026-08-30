/* 작업 535 — `verify42.js` [11] 「우측 사이드 아이콘 위 터치 무시」 표본이 «요소 없음» 인 뿌리 재현.
   지시서 338 규칙: 처방(셀렉터 갈아 끼우기) 전에 «제품이 틀린 쪽인가 자가 틀린 쪽인가» 를 재현으로 가른다.
   묻는 것 셋:
     [1] `#sideR` 이 정말로 없는가(= 작업 49 주인 지시대로 삭제됐는가) · 좌측 레일은 살아 있는가
     [2] 전투 화면에서 캔버스 위에 얹힌 «UI 크롬» 노드 중 **프레임 우측 절반(x중심 ≥ 540)** 에 있는 것이 무엇인가
         — verify42 [11] 이 옮겨 갈 «살아 있는 우측 노드» 후보를 실측으로 고른다(333 처방: 자리를 비우지 마라)
     [3] 그 후보 위에서 실제로 조이스틱이 안 뜨는가(= 표본을 옮겨도 항의 뜻이 보존되는가)
   실행: node tools/probe535.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '  OK   ' : '  FAIL ') + n + (d === undefined ? '' : '  → ' + d)); };

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  console.log('\n[1] #sideR 은 실재하는가 (작업 49 — 주인 지시로 우측 컬럼 전부 삭제)');
  const rail = await page.evaluate(() => ({
    sideR: !!document.getElementById('sideR'),
    sideRIbtn: document.querySelectorAll('#sideR .ibtn').length,
    sideL: !!document.getElementById('sideL'),
    sideLIbtn: document.querySelectorAll('#sideL .ibtn').length
  }));
  ok('#sideR 노드 없음 (49 대로 삭제)', rail.sideR === false, '#sideR=' + rail.sideR);
  ok('#sideR .ibtn 0개 → verify42 [11] 의 «요소 없음» 이 이것이다', rail.sideRIbtn === 0, rail.sideRIbtn);
  ok('좌측 레일은 살아 있다 (대조군)', rail.sideL && rail.sideLIbtn === 6, '#sideL ' + rail.sideLIbtn + '칸');

  console.log('\n[2] 전투 화면 우측 절반(중심 x ≥ 540)에 살아 있는 UI 크롬 노드');
  const cands = await page.evaluate(() => {
    const sels = ['#menub', '#top', '#stinfo', '#tuto', '#tuto .tbtn', '#tuto .trew', '#battlefoot', '#slots',
                  '#hpwrap', '#botleft .ubtn', '#sideL .ibtn', '#tabbar > *:last-child', '#joy'];
    const out = [];
    for (const s of sels) {
      const e = document.querySelector(s); if (!e) { out.push({ s, miss: true }); continue; }
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      out.push({ s, x: +(r.left + r.width / 2).toFixed(1), y: +(r.top + r.height / 2).toFixed(1),
                 w: +r.width.toFixed(1), h: +r.height.toFixed(1), pe: cs.pointerEvents, z: cs.zIndex,
                 vis: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 });
    }
    return out;
  });
  for (const c of cands) {
    if (c.miss) { console.log('       ' + c.s.padEnd(22) + ' — 없음'); continue; }
    console.log('       ' + c.s.padEnd(22) + ' 중심(' + c.x + ', ' + c.y + ') ' + c.w + '×' + c.h +
                ' pe=' + c.pe + ' z=' + c.z + (c.vis ? '' : ' [안 보임]') + (c.x >= 540 ? '  ◀ 우측' : ''));
  }
  const right = cands.filter(c => !c.miss && c.vis && c.x >= 540);
  ok('우측 절반에 보이는 UI 노드가 있다', right.length > 0, right.map(c => c.s).join(' · '));
  const hitR = right.filter(c => c.pe !== 'none');
  ok('그중 포인터를 실제로 받는(pe ≠ none) 노드가 있다', hitR.length > 0, hitR.map(c => c.s).join(' · '));

  console.log('\n[3] 후보 위 터치 — 조이스틱이 뜨지 않아야 한다 (항의 뜻 보존 확인)');
  const st = async () => page.evaluate(() => ({ on: joy.on, disp: getComputedStyle(document.getElementById('joy')).display }));
  for (const c of hitR) {
    await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(60);
    const s = await st();
    const top = await page.evaluate(([x, y]) => {
      const e = document.elementsFromPoint(x, y)[0] || {};
      return e.tagName + '#' + (e.id || '') + '.' + (typeof e.className === 'string' ? e.className : '');
    }, [c.x, c.y]);
    ok(c.s + ' 위 터치 무시', !s.on, top);
    await page.mouse.move(2, 2); await page.mouse.up(); await page.waitForTimeout(80);
  }

  console.log('\n[4] 음성 대조 — 캔버스 한복판은 여전히 조이스틱이 뜬다');
  const g = await page.evaluate(() => { const r = document.getElementById('stagearea').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.waitForTimeout(60);
  ok('캔버스 중앙 → 조이스틱 뜬다 (차단이 과하지 않다)', (await st()).on);
  await page.mouse.up();

  console.log('\nPROBE535 ' + (fail ? 'FAIL' : 'PASS') + ' (' + pass + '/' + (pass + fail) + ')');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
