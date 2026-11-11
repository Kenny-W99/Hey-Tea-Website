# HEYTEA · Make Your Summer

Enter the Summer Globe, choose a destination tea, prepare its fruit, and take the finished drink on a four-stop illustrated journey. Miami, Hawaii and Los Angeles use the supplied campaign artwork. Every visit begins with a camera choice.

## Run locally

Use Node.js 22.12+ and npm. From the project root:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No secrets, accounts, database or API configuration are required. The workspace initially contained the approved plan without a generated Lovable project, so this build uses a React + TypeScript Vite SPA. Campaign configuration is bundled. FastAPI remains a later option for independent content publishing.

## Play

Choose **Enable Camera** and answer the browser’s permission prompt, or select **Continue Without Camera**. Camera readiness requires a decoded frame and a successful local inference. Point with one hand and pinch to press buttons. At the station, sweep sideways four times to cut with the illustrated HEYTEA helper; each cut opens the fruit a little more. To peel, pull down slowly: the skin comes away continuously while the same campaign helper stands on the right, steps back as it pulls and cheers when the fruit is bare. Squeeze briefly and reopen twice for lime juice, or make two down-and-up presses. A single downward sweep scoops or drops the fruit into the bowl. Mash with three presses. Tilt gently for a thin stream or farther for a faster pour (about three seconds at full tilt); straighten to pause. Draw two circles to mix with the campaign's shaker mascot; the bar fills as your hand goes round, and loops may be oval, drift or go either way. Each step displays its progress and, once finished, holds the result for about two seconds before moving on.

Explore the four landmarks of your selected city on one continuous road. The traveler follows each painting's walkway, sidewalk or bike path, and the camera moves through a simple 3D box built around the scene's vanishing point, so near palms, pillars and planters pass by faster than the distant landmark. In Venice the traveler skates side-on down the middle of the bike lane, which has been cleared of the painted skater. Depth changes smoothly from the path to the edges of the picture, so the walk keeps its depth without stretching the sides, and each landmark dissolves into the next while the camera keeps moving forward. On the curving Kilauea Point cliff path the camera turns with the bend. Hold both hands comfortably for a moment to set a neutral position. Move them a little farther apart and hold to walk forward. Bring them a little closer and hold to walk back. Return to the starting separation or lower a hand to stop. Each landmark now has a longer eight-second approach at full input, a brisker walking cadence and a destination-specific close view before the next scene blends in. Forward and backward movement use the same rate. The on-screen meter shows the current direction. **Recenter hands** sets a new comfortable neutral position.

Stop for about a second to see the traveler sit, sip, wave or skate according to the location. You can also choose what the traveler does while stopped: with the camera, lower one hand and hold a sign with the other for about half a second — ✊ sit down on a seat suited to the stop, 👍 take a sip, 🖐 turn around and wave, ✌️ turn around for a selfie. Without the camera, use the Sit, Sip, Wave and Selfie buttons or keys 1–4. The selfie flashes and shows a postcard of the current view with the traveler and the city's cup, which can be saved as a JPEG. Walking again ends the action. The open palm left in view after two-hand steering is ignored until the hand changes sign. **All destinations** returns to the drink choices at any time. At the end, the traveler turns around, raises your drink and hops happily before **Where to next?** fades in. The menu offers **Choose another city**, **Keep exploring** and **Finish your summer**. With the camera, use one hand to point and pinch a menu button. Without it, drag on the path or hold the direction buttons, ↑/↓ or W/S. Escape leaves a walk and closes the completion menu when it is open. The header camera switch remains available until the finale. Sound is opt-in and the site respects reduced motion.

## Commands

| Command | Purpose |
|---|---|
| npm run dev | Local development server |
| npm run typecheck | Strict TypeScript checks |
| npm run lint | ESLint |
| npm test | Vitest unit and integration tests |
| npm run test:e2e | Browser journeys, permissions, gestures and screenshots |
| npm run build | Typecheck and produce dist/ |
| npm run preview | Serve the production build locally |

Playwright uses an installed Google Chrome by default. To use Playwright Chromium, run `npx playwright install chromium` and set `PW_CHANNEL=chromium`. Tests start Vite on port 5173 if needed. Set `PW_BASE_URL` to test an already running production preview. Visual baselines are under tests/e2e. Capture review images under output/playwright. Review visual changes before updating baselines.

## Deployment

Publish the contents of **dist/** to an HTTPS static host at the origin root. Serve /art/ and /vision/ unchanged, including the model, classic worker and WASM files. Use the correct application/wasm MIME type. The model and fonts are self-hosted. The npm postinstall script copies the locked MediaPipe runtime from node_modules. The trained gesture model is included in public/vision. A fresh install requires network access for npm, while visitors require only the site’s own origin.

The deployed site needs camera permission on its own HTTPS origin. For an intentional embedded deployment, the parent must allow camera access for the embedded origin. Test the published top-level page as well as the embed. There is no backend to deploy in this release.

## Project references

- [Implementation plan](plan.md)
- [Architecture and privacy](docs/architecture.md)
- [Source art and processing](docs/assets.md)
- [Testing and device coverage](docs/testing.md)
- [Design audit](docs/design-audit.md)
