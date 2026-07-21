import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps finished One Life metadata and hosting configuration", async () => {
  const [layout, hosting] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /这一生 · AI 人生模拟器/);
  assert.doesNotMatch(layout, /Your site is taking shape|codex-preview/i);
  assert.ok(JSON.parse(hosting).project_id);
});

test("includes three languages and result-specific animated illustrations without video", async () => {
  const [page, css, plan, turn, illustrate, capabilities] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/plan/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/turn/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/illustrate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/capabilities/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type Language = "zh" \| "en" \| "es"/);
  assert.match(page, /one-life-language/);
  assert.match(page, /createArtFor\(nextResult\)/);
  assert.match(page, /createLocalSceneImage/);
  assert.match(page, /choice: pendingChoice/);
  assert.match(page, /drawStorybookCharacter/);
  assert.doesNotMatch(page, /createVideo|videoStatus|videoJobs|\/api\/video/);
  assert.doesNotMatch(page, /className="figure"/);
  assert.match(css, /\.art-rendering/);
  assert.match(css, /@keyframes artReveal/);
  assert.match(plan, /body\.locale/);
  assert.match(turn, /body\.locale/);
  assert.match(illustrate, /stick figures/);
  assert.match(illustrate, /body\.choice/);
  assert.match(illustrate, /quality: "medium"/);
  assert.match(illustrate, /42000/);
  assert.doesNotMatch(plan, /video_prompt|videoPrompt/);
  assert.doesNotMatch(capabilities, /video/);
  assert.match(plan, /弄丢的班级借阅书/);
  assert.match(plan, /prompt 必须写清楚/);
  assert.doesNotMatch(plan, /\["一个意外的邀请"/);
  assert.match(page, /legacyAbstractEventTitles/);
  await assert.rejects(readFile(new URL("../app/api/video/route.ts", import.meta.url), "utf8"));
});
