// Parse the Anchor RSS feed into a clean JSON shape.
// Usage:  node _build/parse.js  (run from managers-matrix-site/)
const fs = require('fs');
const path = require('path');

const FEED  = path.join(__dirname, 'feed.xml');
const OUT   = path.join(__dirname, 'episodes.json');
const xml   = fs.readFileSync(FEED, 'utf8');

const clean = (s) => {
  if (!s) return '';
  s = s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
  return s.trim();
};
const stripTags = (s) => clean(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const get = (block, tag) => {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>');
  const m = block.match(re);
  return m ? clean(m[1]) : '';
};
const attr = (block, tag, attrName) => {
  const re = new RegExp('<' + tag + '\\b[^>]*\\b' + attrName + '="([^"]+)"');
  const m = block.match(re);
  return m ? m[1] : '';
};

const chBlock = xml.split('<item>')[0];
const channel = {
  title:       get(chBlock, 'title'),
  description: stripTags(get(chBlock, 'description')),
  image:       attr(chBlock, 'itunes:image', 'href'),
  link:        get(chBlock, 'link'),
  author:      get(chBlock, 'itunes:author'),
  email:       get(chBlock, 'itunes:email'),
  language:    get(chBlock, 'language'),
};

const items = xml.split('<item>').slice(1).map(s => s.split('</item>')[0]);
const episodes = items.map((it) => {
  const titleRaw = get(it, 'title');
  const nm = titleRaw.match(/^#?\s*(\d+)\s*[-–:]?\s*(.*)$/);
  const num = nm ? parseInt(nm[1], 10) : null;
  const titleClean = nm ? nm[2].trim() : titleRaw;
  return {
    rawTitle: titleRaw,
    num,
    title: titleClean,
    description: stripTags(get(it, 'description')),
    pubDate: get(it, 'pubDate'),
    duration: get(it, 'itunes:duration'),
    season: get(it, 'itunes:season'),
    epNum: get(it, 'itunes:episode'),
    audio: attr(it, 'enclosure', 'url'),
    image: attr(it, 'itunes:image', 'href'),
  };
}).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

fs.writeFileSync(OUT, JSON.stringify({ channel, episodes }, null, 2));
console.log(`Wrote ${OUT}`);
console.log(`Channel: ${channel.title}`);
console.log(`Episodes: ${episodes.length}`);
