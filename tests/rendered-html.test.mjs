import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps finished One Life metadata and hosting configuration", async () => {
  const [layout, hosting] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /One Life · AI Life Choice Simulator/);
  assert.match(layout, /<html lang="en">/);
  assert.doesNotMatch(layout, /Your site is taking shape|codex-preview/i);
  assert.ok(JSON.parse(hosting).project_id);
});

test("keeps the complete game English-only with result-specific illustrations", async () => {
  const [page, css, plan, turn, illustrate, capabilities, lifeContent] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/plan/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/turn/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/illustrate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/capabilities/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/english-life-content.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const language: Language = "en"/);
  assert.match(page, /english-only-20260721/);
  assert.match(page, /data\.save\?\.contentVersion === ENGLISH_CONTENT_VERSION/);
  assert.match(page, /const languageSwitcher = null/);
  assert.match(page, /englishLifeScenarios/);
  assert.match(page, /window\.localStorage\.removeItem\("one-life-language"\)/);
  assert.match(page, /createArtFor\(nextResult\)/);
  assert.match(page, /createLocalSceneImage/);
  assert.match(page, /choice: pendingChoice/);
  assert.match(page, /drawStorybookCharacter/);
  assert.doesNotMatch(page, /createVideo|videoStatus|videoJobs|\/api\/video/);
  assert.doesNotMatch(page, /className="figure"/);
  assert.match(css, /\.art-rendering/);
  assert.match(css, /@keyframes artReveal/);
  assert.match(plan, /Write every player-facing field in natural English only/);
  assert.match(turn, /natural English only/);
  assert.match(illustrate, /stick figures/);
  assert.match(illustrate, /body\.choice/);
  assert.match(illustrate, /quality: "medium"/);
  assert.match(illustrate, /42000/);
  assert.doesNotMatch(plan, /video_prompt|videoPrompt/);
  assert.doesNotMatch(capabilities, /video/);
  assert.match(plan, /englishLifeScenarios/);
  assert.match(lifeContent, /The missing classroom book/);
  assert.match(lifeContent, /The weekend on the overtime list/);
  assert.match(illustrate, /No typography or written language of any kind/);
  assert.doesNotMatch(plan, /\["一个意外的邀请"/);
  assert.match(page, /legacyAbstractEventTitles/);
  await assert.rejects(readFile(new URL("../app/api/video/route.ts", import.meta.url), "utf8"));
});
