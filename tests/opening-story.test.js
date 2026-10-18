import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {STORY_CHAPTERS,STORY_VERSION} from '../src/opening-story.js';
test('opening has six readable chapters and four bundled, optimized illustrations',()=>{
  assert.equal(STORY_VERSION,1);assert.equal(STORY_CHAPTERS.length,6);
  const images=new Set(STORY_CHAPTERS.map(c=>c.image));assert.equal(images.size,4);
  for(const chapter of STORY_CHAPTERS){assert.ok(chapter.title&&chapter.alt&&chapter.body&&chapter.note);assert.ok(chapter.body.length<400);}
  for(const image of images){const path=new URL(`../public${image}`,import.meta.url),data=readFileSync(path);assert.equal(data[0],255);assert.equal(data[1],216);assert.ok(statSync(path).size<650000);}
});
test('arrival does not promise unimplemented housing or choose the reason for immigration',()=>{
  assert.match(STORY_CHAPTERS[2].body,/Your reasons belong to you/);
  assert.match(STORY_CHAPTERS.at(-1).body,/balloon/);
});
