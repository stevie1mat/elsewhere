import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {STORY_CHAPTERS,STORY_VERSION,STORY_SCENES,STORY_SCENE_MS} from '../src/opening-story.js';
test('film captions start with their shots without an empty ferry beat',()=>{
  assert.equal(STORY_SCENES.length,5);
  assert.ok(STORY_SCENES.every(scene=>scene.subtitle.trim()));
  const ferry=STORY_SCENES.filter(scene=>scene.image.includes('crossing'));
  assert.equal(ferry.length,1);
  assert.equal(ferry[0].subtitle,'“Tell me when you get there.”');
  assert.equal(STORY_SCENE_MS,4500);
  assert.equal(STORY_SCENES.at(-1).subtitle,'Your first morning starts here.');
});
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
