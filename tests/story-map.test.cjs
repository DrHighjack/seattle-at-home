const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mapSource = fs.readFileSync(path.join(root, 'story-map.js'), 'utf8');
const storiesHtml = fs.readFileSync(path.join(root, 'stories.html'), 'utf8');
const entries = [...mapSource.matchAll(/^\s*\{ id: '([^']+)'([^}]*)\},?$/gm)]
  .map(([, id, body]) => ({ id, body }));

test('client story pins, sale prices, and accessible property list stay in sync', () => {
  assert.match(storiesHtml, /<section class="story-map-section"[^>]*\shidden(?:\s|>)/);
  assert.equal((storiesHtml.match(/<article class="client-story"/g) ?? []).length, 7);
  assert.doesNotMatch(storiesHtml, /leaflet@|maplibre-gl@|story-map\.js\?/);
  const ids = entries.map(({ id }) => id);
  const detailIds = entries
    .filter(({ body }) => body.includes('detailsOnly: true'))
    .map(({ id }) => id);
  const listIds = [...storiesHtml.matchAll(/<li id="([^"]+)"/g)]
    .map(([, id]) => id);
  const pricedEntries = entries
    .map(({ id, body }) => ({ id, body, price: body.match(/soldPrice: (\d+)/)?.[1] }))
    .filter(({ price }) => price);

  assert.equal(entries.length, 44);
  assert.equal(new Set(ids).size, ids.length, 'map entry IDs must be unique');
  assert.equal(pricedEntries.length, 40, 'all report sale prices should be represented');
  assert.equal(detailIds.length, 37);
  assert.deepEqual([...listIds].sort(), [...detailIds].sort());
  assert.equal(listIds.length, detailIds.length, 'property list must not duplicate pins');
  assert.match(storiesHtml, /aria-label="Map showing 44 property locations/);
  assert.match(mapSource, /story\.soldPrice\.toLocaleString\('en-US'\)/);

  for (const { id, body, price } of pricedEntries) {
    const formattedPrice = `$${Number(price).toLocaleString('en-US')}`;
    if (body.includes('detailsOnly: true')) {
      const item = storiesHtml.match(new RegExp(`<li id="${id}">([\\s\\S]*?)<\\/li>`))?.[1];
      assert.ok(item?.includes(formattedPrice), `${id} details should show ${formattedPrice}`);
    } else {
      const article = storiesHtml.match(new RegExp(`<article class="client-story" id="${id}">([\\s\\S]*?)<\\/article>`))?.[1];
      assert.ok(article?.includes(formattedPrice), `${id} story should show ${formattedPrice}`);
    }
  }
});

test('all missing report transactions include matching map and accessible-list details', () => {
  const addedIds = [
    '1833-27th', '4029-ashworth', '4224-144th-lane-se', '8932-lowell-larimer',
    '2822-e-thomas', '601-alder', '76-donahey', '11520-56th-dr-se',
    '2404-mugho', '713-pilchuck', '1532-maple', '13150-ne-203rd',
  ];
  const addedEntries = addedIds.map((id) => entries.find((entry) => entry.id === id));
  const mlsNumbers = addedEntries.map((entry) => entry?.body.match(/mls: '(\d+)'/)?.[1]);

  assert.ok(addedEntries.every(Boolean), 'all 12 previously missing report properties should be mapped');
  assert.equal(new Set(mlsNumbers).size, addedIds.length, 'MLS numbers should be unique');
  assert.match(mapSource, /story-map-report-details/);

  for (const [index, entry] of addedEntries.entries()) {
    const item = storiesHtml.match(new RegExp(`<li id="${addedIds[index]}">([\\s\\S]*?)<\\/li>`))?.[1];
    assert.ok(item, `${addedIds[index]} should appear in the accessible property list`);
    assert.ok(item.includes(`MLS #${mlsNumbers[index]}`), `${addedIds[index]} should show its MLS number`);
    assert.match(entry.body, /listPrice: \d+/);
    assert.match(entry.body, /listDate: '\d{2}\/\d{2}\/\d{4}'/);
    assert.match(entry.body, /soldDate: '\d{2}\/\d{2}\/\d{4}'/);
    assert.match(entry.body, /dom: \d+/);
  }
});

test('imported listing photos exist locally and are assigned to their matching pins', () => {
  for (const id of [
    '17001-inglewood', '11901-32nd', '222-4th-ave', '26586-ne-143rd', '4040-32nd-ave-sw',
    '1001-casino', '10458-157th', '19264-ne-69th', '23230-44th', '211a-151st',
    '4405-s-myrtle', '86-north-camano', '1085-103rd-ave', '26547-ne-143rd',
    '803-9th-ave-s', '11155-134th-ct', '1611-ne-75th', '3021-20th-ave-s',
    '4107-sw-othello', '4343-roosevelt', '6226-76th-ave',
  ]) {
    const entry = entries.find((item) => item.id === id);
    const photo = `Zillow Pictures/${id}.webp`;
    assert.ok(entry?.body.includes(`photo: '${photo}'`), `${id} must use its matching photo`);
    const data = fs.readFileSync(path.join(root, photo));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.ok(data.length > 1000, `${id} photo must not be empty`);
  }
  assert.ok(storiesHtml.includes('src="Zillow Pictures/222-4th-ave.webp"'));
  assert.ok(entries.find(({ id }) => id === '23230-44th').body.includes("photoType: 'aerial'"));
  assert.match(mapSource, /if \(isAerial\) photo\.style\.objectFit = 'contain'/);
});
