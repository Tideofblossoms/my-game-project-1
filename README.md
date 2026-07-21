# One Life

One Life is an AI-driven life-choice game about concrete decisions people face at different ages. Players create a character, choose how to respond to realistic situations, and watch those decisions change their stats, future events, written consequences, and illustrated memories.

**Live demo:** https://one-life-simulator.chenbinsig.chatgpt.site

## What it does

- Builds a character from a name, birthplace, persona, and balanced starting stats.
- Presents age-appropriate everyday choices involving school, family, work, housing, money, health, and care.
- Keeps two future events planned in secret so the life feels connected without assuming choices the player has not made.
- Uses GPT-5.6 Sol to generate context-aware events and consequences from the character's profile, stats, and decision history.
- Uses GPT Image 2 to turn the selected outcome into a scene-specific illustration.
- Updates six life stats and saves signed-in progress to a Cloudflare D1 database.
- Falls back to a curated English scenario set and local illustration when an AI service is unavailable.

## How to run locally

### Requirements

- Node.js 22.13 or newer
- pnpm 11
- An OpenAI API key for live AI-generated stories and illustrations

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Tideofblossoms/my-game-project-1.git
   cd my-game-project-1
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy `.env.example` to `.env.local` and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=your_key_here
   OPENAI_TEXT_MODEL=gpt-5.6-sol
   OPENAI_IMAGE_MODEL=gpt-image-2
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open the local URL printed in the terminal.

### Build and test

```bash
pnpm test
```

This produces the deployment build and runs the project's rendered-source checks.

## How GPT-5.6 is used

GPT-5.6 Sol is the runtime story director in `app/api/plan/route.ts` and `app/api/turn/route.ts`.

- The planning route reads the player's age, birthplace, persona, stats, completed decisions, and already-planned events. It returns connected life situations with three actionable responses and believable tradeoffs.
- The turn route interprets the exact selected response, applies bounded stat effects, writes a concise consequence, and produces an illustration brief for that result.
- Structured JSON schemas keep generated events predictable enough for the game UI while still allowing each life to develop differently.

GPT Image 2 is used separately in `app/api/illustrate/route.ts` to create a vertical storybook scene for the chosen outcome. Image prompts explicitly prohibit captions, logos, signs, and written text.

## How we collaborated with Codex

Codex was used throughout the Build Week development process as a coding partner, not only as a text generator. It accelerated:

- inspection of the existing vinext/Next.js codebase and selection of the smallest safe architecture;
- implementation of the character creator, branching life loop, hidden event queue, API routes, stat system, cloud saves, and responsive interface;
- conversion of abstract moral prompts into concrete everyday situations with a person, place, deadline, and tradeoff;
- debugging of Git, deployment, localization, stale saved-state, and AI fallback behavior;
- English-only localization across the UI, generated stories, saved data, and image prompts;
- automated build checks, regression tests, source control, and Sites deployment.

The team made the final product and design decisions. Important human decisions included focusing on ordinary life rather than fantasy, showing no objectively correct choice, keeping future events hidden, limiting every event to three actionable responses, and preserving a playable fallback when AI generation is unavailable.

## Architecture

- **UI:** React 19, Next.js 16, TypeScript, vinext, and Vite
- **Story generation:** OpenAI Responses API with GPT-5.6 Sol
- **Illustration generation:** OpenAI Images API with GPT Image 2
- **Persistence:** Cloudflare D1
- **Hosting:** OpenAI Sites / Cloudflare-compatible vinext output
- **Tests:** Node test runner plus a production vinext build

## Repository structure

- `app/page.tsx` — complete game flow and interactive UI
- `app/english-life-content.ts` — curated English fallback scenarios
- `app/api/plan/route.ts` — GPT-5.6 future-event planning
- `app/api/turn/route.ts` — GPT-5.6 choice consequence generation
- `app/api/illustrate/route.ts` — outcome-specific image generation
- `app/api/save/route.ts` — cloud-save API
- `tests/rendered-html.test.mjs` — build and regression checks

## Testing without rebuilding

Open the live demo, select **Begin a new life**, create a character, and choose any response in the first event. No test account is required for public gameplay. AI generation may take several seconds; the game remains playable through its curated fallback if generation is temporarily unavailable.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
