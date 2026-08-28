/* 작업 278 임시 실측 — 26 펫 시트 장착 슬롯의 «지금» 마크업.
   verify174 §2·§10 이 쓰던 `#bPet .sk-slot[data-ptun]` 가 무엇으로 바뀌었는지,
   해제 뒤 빈 칸이 무슨 클래스가 되는지 눈으로 확인한다. 실행: node tools/probe278.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const dump = () => [...document.querySelectorAll('#bPet .sk-eqp > *')].map(s => ({
  cls: s.className,
  attrs: [...s.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value),
  kids: [...s.children].map(k => k.tagName.toLowerCase() + '.' + k.className
    + ([...k.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join(',') || '')),
  cv: s.querySelectorAll('canvas.pt-cv').length
}));

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await browser.newContext({ viewport: { width: 1080, height: 2280 } })).newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    pick.forEach(x => { S.own[x.id] = { n: 5000, l: 1 }; });
    S.eqPet = pick.map(x => x.id);
    save(); uiDirty = true;
    if (!$('bPet').classList.contains('on')) { goTab('hero'); heroSubGo('pet'); }
  });
  await p.waitForTimeout(700);

  console.log('— 장착 3칸(해제 전)');
  console.log(JSON.stringify(await p.evaluate(dump), null, 1));
  console.log('선택자 개수:', JSON.stringify(await p.evaluate(() => ({
    'slot[data-ptun]': document.querySelectorAll('#bPet .sk-slot[data-ptun]').length,
    'slot[data-ptslot]': document.querySelectorAll('#bPet .sk-slot[data-ptslot]').length,
    '.sk-eq[data-ptun]': document.querySelectorAll('#bPet .sk-eq[data-ptun]').length,
    'slot.lock': document.querySelectorAll('#bPet .sk-eqp .sk-slot.lock').length,
    'slot.free': document.querySelectorAll('#bPet .sk-eqp .sk-slot.free').length
  }))));

  const before = await p.evaluate(() => S.eqPet.slice());
  await p.click('#bPet .sk-slot[data-ptslot] .sk-eq[data-ptun]');
  await p.waitForTimeout(500);
  console.log('\n— 첫 칸 [─] 클릭 뒤');
  console.log(JSON.stringify(await p.evaluate(dump), null, 1));
  console.log('eqPet:', JSON.stringify(before), '→', JSON.stringify(await p.evaluate(() => S.eqPet.slice())));
  console.log('선택자 개수:', JSON.stringify(await p.evaluate(() => ({
    'slot[data-ptslot]': document.querySelectorAll('#bPet .sk-slot[data-ptslot]').length,
    'slot.lock': document.querySelectorAll('#bPet .sk-eqp .sk-slot.lock').length,
    'slot.free': document.querySelectorAll('#bPet .sk-eqp .sk-slot.free').length,
    '.sk-plus': document.querySelectorAll('#bPet .sk-eqp .sk-slot.free .sk-plus').length,
    'canvas': document.querySelectorAll('#bPet .sk-slot[data-ptslot] canvas.pt-cv').length
  }))));
  await browser.close();
})();
