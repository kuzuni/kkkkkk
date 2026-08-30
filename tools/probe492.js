/* 작업 492 재현 — 50 코스튬 **격자 카드** 스프라이트가 «너무 작다» 를 찍힌 픽셀로 잰다.
 *
 * 338 규칙: 처방(«카드 아이콘 영역의 ≥80%») 을 따르기 전에 지금 값을 먼저 재고, 그 값으로만 판단한다.
 * 주인이 «기준» 으로 지목한 것은 08 세부 팝업(`showCosDetail` 의 `.sk-ic`)이므로 그 비를 같이 잰다.
 *
 * 재는 단위는 하나 — **아이콘 영역(호스트 박스) 기준 CSS px** 이고, 잉크는 캔버스 알파 bbox 다
 * (411 `probe411` 과 같은 방법. 이모지 칸은 없다 — 50·26 카드는 전부 캔버스다).
 *
 * 같이 재는 것 셋:
 *   ① 격자 카드 50칸 전수 — 잉크 h / 아이콘 영역 h · 잉크 w / 영역 w
 *   ② 08 세부 `.sk-ic` — 같은 비(주인 기준)
 *   ③ 07 스킬 · 26 펫 카드 — 같은 부품(`.sk-ci` 156x96)을 쓰는 형제(처방 ⑤ «같은 비율인지 확인»)
 *   ④ 겹침 — 잉크 bbox 가 `Lv.n`(`.sk-clv`) · 진행바(`.sk-bar`) · 카드 상하변을 침범하는가
 *
 * 실행: node tools/probe492.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

function inkSrc() {
  /* 캔버스 알파 bbox → 호스트(아이콘 영역) 좌상단 기준 CSS px */
  window.__ink492 = function (host, cardEl) {
    const hb = host.getBoundingClientRect();
    const cv = host.querySelector('canvas');
    if (!cv) return null;
    const cb = cv.getBoundingClientRect();
    const g = cv.getContext('2d', { willReadFrequently: true });
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++)
      for (let x = 0; x < cv.width; x++)
        if (d[(y * cv.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    if (x1 < 0) return { empty: true };
    const sx = cb.width / cv.width, sy = cb.height / cv.height;
    const ax = cb.x + x0 * sx, ay = cb.y + y0 * sy;
    const w = (x1 - x0 + 1) * sx, h = (y1 - y0 + 1) * sy;
    const r = { cvW: cv.width, cvH: cv.height, sc: cv.dataset.cossc || '(auto)',
      box: { w: +hb.width.toFixed(1), h: +hb.height.toFixed(1) },
      ink: { w: +w.toFixed(1), h: +h.toFixed(1),
             x: +(ax - hb.x).toFixed(1), y: +(ay - hb.y).toFixed(1) },
      rW: +(w / hb.width).toFixed(4), rH: +(h / hb.height).toFixed(4) };
    if (cardEl) {
      const kb = cardEl.getBoundingClientRect();
      r.card = { w: +kb.width.toFixed(1), h: +kb.height.toFixed(1) };
      r.inkCard = { x: +(ax - kb.x).toFixed(1), y: +(ay - kb.y).toFixed(1),
                    x2: +(ax + w - kb.x).toFixed(1), y2: +(ay + h - kb.y).toFixed(1) };
      /* 겹침 — Lv 라벨 · 진행바 */
      const hit = (sel) => {
        const el = cardEl.querySelector(sel); if (!el) return null;
        const b = el.getBoundingClientRect();
        const ox = Math.min(ax + w, b.right) - Math.max(ax, b.x);
        const oy = Math.min(ay + h, b.bottom) - Math.max(ay, b.y);
        return { box: { x: +(b.x - kb.x).toFixed(1), y: +(b.y - kb.y).toFixed(1),
                        w: +b.width.toFixed(1), h: +b.height.toFixed(1) },
                 ovX: +ox.toFixed(1), ovY: +oy.toFixed(1),
                 hit: ox > 0 && oy > 0 };
      };
      r.lv = hit('.sk-clv');
      r.bar = hit('.sk-bar');
      r.over = { top: +(kb.y - ay).toFixed(1), bottom: +(ay + h - kb.bottom).toFixed(1) };
    }
    return r;
  };
}

const stat = (a) => {
  const v = a.slice().sort((x, y) => x - y);
  return { n: v.length, min: v[0], p50: v[(v.length / 2) | 0], max: v[v.length - 1] };
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.addInitScript(inkSrc);
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof AVATARS !== 'undefined' && AVATARS.length > 0);
  await p.waitForTimeout(1500);

  /* 전 코스튬 보유 + 레벨을 섞어 «보유/미보유/착용 중» 세 상태를 다 만든다 */
  await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 400; S.stage = 400; S.rank = 6;
    S.avatars = {}; S.cosLv = {};
    AVATARS.forEach((a, i) => { if (i % 5 !== 4) { S.avatars[a.id] = 1; S.cosLv[a.id] = (i * 7) % 400; } });
    S.own = {}; S.pet = {}; S.eqPet = [];
    PETS.slice(0, 6).forEach(t => { S.pet[t.id] = { n: 3, l: 2 }; });
    PETS.slice(0, 3).forEach(t => toggleEquip(t, 'pet'));
    SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
    uiDirty = true; renderUI();
  });

  const cards = async (sub, sel) => {
    await p.evaluate(s => gmHero(s), sub);
    await p.waitForTimeout(900);
    return p.evaluate(q => Array.from(document.querySelectorAll(q))
      .map(el => window.__ink492(el.querySelector('.sk-ci'), el)).filter(Boolean), sel);
  };

  const out = {};
  out.cos = await cards('cos', '#bCos .sk-card[data-cosit]');
  out.pet = await cards('pet', '#bPet .sk-card[data-ptit]');

  /* 50 시트 «착용 중» 슬롯 (411 이 이미 잡은 자리 — 회귀 확인용) */
  await p.evaluate(() => gmHero('cos'));
  await p.waitForTimeout(600);
  out.slot = await p.evaluate(() => Array.from(document.querySelectorAll('#bCos .sk-slot[data-cosun]'))
    .map(el => window.__ink492(el.querySelector('.sk-si'), null)));

  /* 08 세부 팝업 — 주인이 «기준» 이라고 한 자리 */
  out.det = await p.evaluate(async () => {
    const r = [];
    for (const id of [AVATARS[0].id, AVATARS[3].id, AVATARS[20].id]) {
      showCosDetail(id);
      await new Promise(z => setTimeout(z, 260));
      const box = document.querySelector('#mbox .sk-ic');
      const v = window.__ink492(box, null); v.id = id; r.push(v);
    }
    closeModal();
    return r;
  });

  console.log('=== 492 재현 — 50 코스튬 카드 스프라이트 «찍힌 잉크» ===\n');
  const show = (name, arr) => {
    const rH = arr.map(o => o.rH), rW = arr.map(o => o.rW), h = arr.map(o => o.ink.h);
    const s = stat(rH), sw = stat(rW), sh = stat(h);
    console.log(`[${name}] n=${s.n} · 영역 ${arr[0].box.w}x${arr[0].box.h} · 캔버스 ${arr[0].cvW}x${arr[0].cvH} (scale ${arr[0].sc})`);
    console.log(`   잉크 h  min ${sh.min} / p50 ${sh.p50} / max ${sh.max}`);
    console.log(`   h 비율  min ${s.min} / p50 ${s.p50} / max ${s.max}   (처방 목표 ≥ 0.80)`);
    console.log(`   w 비율  min ${sw.min} / p50 ${sw.p50} / max ${sw.max}`);
  };
  show('50 격자 카드', out.cos);
  show('26 펫 카드', out.pet);
  show('50 착용 슬롯', out.slot);
  show('08 세부 .sk-ic', out.det);

  const lvHit = out.cos.filter(o => o.lv && o.lv.hit).length;
  const barHit = out.cos.filter(o => o.bar && o.bar.hit).length;
  const over = out.cos.filter(o => o.over.top > 0 || o.over.bottom > 0).length;
  console.log(`\n[겹침] 50칸 중 — Lv.n 라벨 ${lvHit} · 진행바 ${barHit} · 카드 밖 ${over}`);
  const c0 = out.cos[0];
  console.log(`   표본0 잉크(카드 기준) x ${c0.inkCard.x}..${c0.inkCard.x2} · y ${c0.inkCard.y}..${c0.inkCard.y2} / 카드 ${c0.card.w}x${c0.card.h}`);
  console.log(`   Lv 라벨 ${JSON.stringify(c0.lv.box)} · 진행바 ${JSON.stringify(c0.bar.box)}`);

  const d0 = stat(out.det.map(o => o.rH)).p50, k0 = stat(out.cos.map(o => o.rH)).p50;
  console.log(`\n[기준 대비] 08 세부 h비 ${d0} ↔ 50 카드 h비 ${k0}  ⇒ 카드가 기준의 ${(k0 / d0 * 100).toFixed(1)}%`);
  console.log(`[콘솔 에러] ${errs.length}건${errs.length ? ' — ' + errs[0] : ''}`);

  /* 원자료는 저장소를 더럽히지 않게 임시 디렉터리로 뺀다(다음 워커의 `git status` 를 흐리지 않는다) */
  const raw = require('path').join(require('os').tmpdir(), 'probe492.json');
  require('fs').writeFileSync(raw, JSON.stringify(out, null, 1));
  console.log('[원자료] ' + raw);
  await browser.close();
})();
