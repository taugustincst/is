const { open } = require('./lib');
const S = require('./lib').OUT;
/* The story has faces: a line that opens with a name is a turn, with the
   speaker's face and name beside the words, at the campfire and on the
   story page; a page shows the faces of those it has named so far, the one
   speaking lit; and a name the company does not know stands alone. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const fire = await page.evaluate(() => [...document.querySelectorAll('#campfire .line')].map(l => ({ turns: l.querySelectorAll('.turn').length, faces: l.querySelectorAll('canvas.face').length, who: [...l.querySelectorAll('.who')].map(w => w.textContent), text: l.textContent.slice(0, 40) })));
  ok('the campfire gives each named turn a face and a name', fire.length >= 3 && fire[0].faces === 1 && fire[0].who[0] === 'Garret' && fire[1].who[0] === 'Rowan', JSON.stringify(fire.slice(0, 2)));
  ok('an aside stays with the name', fire.some(l => l.who.some(w => /^Bram, from the top of the wagon$/.test(w))), JSON.stringify(fire.map(l => l.who)));
  await page.screenshot({ path: `${S}/story-campfire.png` });
  // A page of story, line by line.
  const lines = ['Garret: "Four of us, and a road."', 'Rowan draws his sword. "Not today, Ser."', 'The road is empty for a long while.', 'Ser Brannoc: "You think this was ever yours to stop?"', 'Garret: "Hold the line."  Rowan: "Then hold it."'];
  await page.evaluate((lines) => { game.story('A test page', lines); }, lines);
  await page.waitForSelector('#screen-story.active');
  const page1 = await page.evaluate(() => ({ turns: document.querySelectorAll('#story-text .turn').length, who: [...document.querySelectorAll('#story-text .who')].map(w => w.textContent), cast: [...document.querySelectorAll('#story-cast canvas')].map(c => c.title + (c.classList.contains('speaking') ? '*' : '')), hidden: document.getElementById('story-cast').hidden }));
  ok('a speaking line is a turn with a face, and the cast strip lights the speaker', page1.turns === 1 && page1.who[0] === 'Garret' && page1.cast.join() === 'Garret*' && !page1.hidden, JSON.stringify(page1));
  await page.click('#btn-story-next');
  const page2 = await page.evaluate(() => ({ prose: document.querySelectorAll('#story-text .prose').length, cast: [...document.querySelectorAll('#story-cast canvas')].map(c => c.title + (c.classList.contains('speaking') ? '*' : '')) }));
  ok('a narrative line that names one of the company adds their face, lit', page2.prose === 1 && page2.cast.join() === 'Garret,Rowan*', JSON.stringify(page2));
  await page.click('#btn-story-next');
  const page3 = await page.evaluate(() => [...document.querySelectorAll('#story-cast canvas')].map(c => c.title + (c.classList.contains('speaking') ? '*' : '')));
  ok('a line about nobody in particular leaves the faces unlit', page3.join() === 'Garret,Rowan', page3.join());
  await page.click('#btn-story-next');
  const page4 = await page.evaluate(() => { const ls = document.querySelectorAll('#story-text .line'); const l = ls[ls.length - 1]; return { noface: l.querySelectorAll('.turn.noface').length, faces: l.querySelectorAll('canvas.face').length, who: [...l.querySelectorAll('.who')].map(w => w.textContent), cast: [...document.querySelectorAll('#story-cast canvas')].map(c => c.title + (c.classList.contains('speaking') ? '*' : '')) }; });
  ok('a name the company does not know gets its label but no face, and is not in the strip', page4.noface === 1 && page4.faces === 0 && page4.who[0] === 'Ser Brannoc' && page4.cast.join() === 'Garret,Rowan', JSON.stringify(page4));
  await page.click('#btn-story-next');
  const page5 = await page.evaluate(() => { const ls = document.querySelectorAll('#story-text .line'); const l = ls[ls.length - 1]; return { turns: l.querySelectorAll('.turn').length, who: [...l.querySelectorAll('.who')].map(w => w.textContent), cast: [...document.querySelectorAll('#story-cast canvas')].map(c => c.title + (c.classList.contains('speaking') ? '*' : '')), btn: document.getElementById('btn-story-next').textContent }; });
  ok('two turns on one line are two turns, and the last speaker is lit', page5.turns === 2 && page5.who.join() === 'Garret,Rowan' && page5.cast.join() === 'Garret,Rowan*' && page5.btn === 'Onward', JSON.stringify(page5));
  await page.screenshot({ path: `${S}/story-faces.png` });
  // On a phone the faces still fit beside the words.
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  const fit = await page.evaluate(() => { const box = document.querySelector('.story-box').getBoundingClientRect(); return [...document.querySelectorAll('#story-text .turn')].every(t => t.getBoundingClientRect().right <= box.right + 1) && document.documentElement.scrollWidth <= innerWidth; });
  ok('the turns fit a phone', fit);
  await page.screenshot({ path: `${S}/story-faces-phone.png` });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
