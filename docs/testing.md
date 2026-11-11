# Engineering verification

Tested locally on macOS in Google Chrome 157.0.8103.40. Browser release checks target the built site served by Vite preview on localhost. Hardware and synthetic gesture results are tracked separately below.

## Automated suites

| Layer | Verified behavior |
|---|---|
| Vitest unit | Immediate acquisition after activation, single request, delayed grant after skip, skip/re-enable race, camera failures and cleanup, pinch confidence, stability and hysteresis, lost hands, circular angle validation, distinct mash cycles, pausable pouring, fruit delivery, full-frame cutting/peeling, tremor and loss rejection, neutral-position calibration, mirrored forward/backward offsets, return-to-center stopping, tremor, hand loss, stale input and recentering. Coverage also includes capped stride cadence, route exit and endpoint backtracking. |
| React integration | Exact onboarding choices, no device request before selecting Enable, branded denial/unavailable recovery, retry to success after inference, success dwell, and skip into direct controls. |
| Catalog and gameplay integration | Three recipe identities, fruit actions, guarded reveal, each of twelve discoveries, replay/reset, checkpoint recovery, production art paths and dimensions. |
| Playwright permission and recognition | Page waits on first load and refresh. Grant/denial, missing device, pending prompt, retry, blocked model, camera-off and keyboard recovery. The stock fake camera covers initialization. A translated photographic hand drives pineapple peeling and a mirrored pair calibrates, holds equal forward and backward offsets for equal durations and returns to center through the real browser model. The test checks equal rates and paused positions. Full journeys separately inject landmarks for repeatable coverage. The photograph is Google’s [MediaPipe pointing-up test asset](https://storage.googleapis.com/mediapipe-assets/pointing_up.jpg). |
| Playwright live journeys | Three complete direct-control runs and three complete synthetic hand-control runs, including selecting the cup, every recipe step, automatic recipe transitions, reveal, bimanual steering, reversal and returning through the endpoint menu to start another drink. Real mouse drags, pause/resume, circular stirring, arrow keys and synthesized touch drags have dedicated coverage. |
| Playwright rendering | Real Pixi canvases, interrupted navigation, refresh checkpoints, unavailable texture fallback, timed globe approach, visual regressions and responsive entry across 1440×900, 1280×720, 768×1024, 390×844 and 320×700. Mobile captures check selection and a touch-drag rear-view walk. Desktop checks interrupt resting, waving and skateboarding with a direction key. |

The deterministic pose test uses twelve sustained pinches and twelve non-pinches with lateral motion and low-confidence fist labels. The filter recognized all twelve pinches at 130 ms with a 65 ms synthetic sampling interval. It emitted zero pinches in the twelve non-pinch trials, rejected the low-confidence fist in every trial and cleared on all 24 hand losses. These figures measure filter behavior on supplied coordinates. They do not measure the visual model’s accuracy on people.

## Physical-camera check

A separate headed Chrome session opened the entry gate on the Mac with its normal permission flow, using no fake-media flags, permission grants from Playwright, model mocks or stored video. The app obtained a live camera stream and produced its first successful local inference, reached **Camera on**, then the check used **Disable camera** and closed the browser. Device readiness accepts an empty landmark result. This verifies physical capture and inference. Accuracy for repeated gestures by people in different environments requires further playtesting.

## Performance observation from the earlier release

In a fresh desktop Chrome context emulating a 390×844 viewport, with network latency set to 40 ms and download throughput to 1.6 MiB/s, the production opening transferred 346,289 bytes and reported a largest contentful paint of 384 ms. No vision assets were fetched before opt-in. During a Waikiki walk on the Mac at the phone viewport, a 99-interval requestAnimationFrame sample had p50 and p95 near 16.7 ms. This is a local desktop measurement with mobile layout. Physical mobile GPU, battery and thermal behavior can differ.

## Evidence and limits

- Screenshots from the actual rendered application are in output/playwright/. Committed browser baselines are in tests/e2e/journeys.spec.ts-snapshots/. Game captures include intermediate preparation, route poses, reveal, finale, entry permission states and narrow layouts.
- All three direct-control route tests check runtime page errors and HTTP errors. Deliberate blocked-resource tests confirm recovery separately.
- The first browser pass caught native image dragging cancelling a guava stroke. The production pad now cancels native dragging and handles pointer capture loss. Tests also caught ambiguous locators and a checkpoint fixture that competed with page-hide persistence. Fixtures now follow the actual control labels and stage state before mounting the app.
- Physical iOS/iPadOS, Android, desktop Safari/Firefox, screen-reader sessions, multi-person accuracy across lighting conditions, and physical end-to-end hand latency remain unverified. Browser emulation, synthetic hands and desktop frame timing cannot establish these results.
- Browser baselines were created on macOS Chrome. Review cross-platform antialiasing differences deliberately before accepting new baselines.

## Camera release and transport inspection

A separate production Chrome run acquired and disabled a synthetic video device three times with the real recognizer. All three tracks ended. Network inspection observed zero write requests. Session storage contained only the versioned campaign checkpoint. Console inspection showed the TensorFlow Lite XNNPACK delegate initialization INFO message on each start, emitted on the runtime’s stderr channel, with no recognition failure.

## Final execution

The hand-steering and route-exit revision passed strict TypeScript, ESLint, all **45 Vitest tests** and all **31 Playwright tests** against the production preview. The neutral-position tests cover mirrored inputs, equal travel rates, center stopping, tremor, hand loss, stale inference, recentering and cadence. All three complete camera journeys reach the endpoint menu, select another city with a single-hand pinch and begin another drink. Direct-control journeys also reach the keepsake. The endpoint regression verifies leaving mid-route, reopening the menu, and backtracking after dismissing it.

The real MediaPipe worker processes a photographic hand for peeling and two moving photographs for steering. Equal 1.4-second holds are compared in the automated browser test. In the recorded Miami sequence, equal 1.6-second intervals produce 0.360 landmark units in both directions. The recording uses the actual model with animated photographic input. Its final menu selection uses a pointer. Separate landmark-based camera tests exercise the single-hand pinch for menu activation. Phone captures check the steering meter at 320 pixels and the complete endpoint menu at 390 pixels. [Steering and endpoint recording](../output/playwright/city-stroll.mp4)

Physical two-hand performance across users and lighting still requires hands-on evaluation. Vite reports a size advisory for the lazily loaded PixiJS chunk.

The subsequent pace adjustment sets forward and backward travel to one landmark per 4 seconds. The 8 steering unit tests, production build and real-model browser steering test passed after this adjustment. The existing recording shows the earlier 4.5-second pace.

The arrival celebration revision passed TypeScript, ESLint, all 45 Vitest tests and 9 targeted Playwright tests. Five new browser cases cover all three cities' actual animated turn and raised-cup pose, the delayed menu, blocked walking/dragging during the toast, resuming backward, leaving during the animation and the reduced-motion still-pose fallback. The existing two exit tests and complete Miami direct-control and injected-camera journeys also passed. The camera journey selects another city by pointing and pinching after the celebration. Desktop and phone captures show each city's correct drink. A separate browser recording measured about 2.64 seconds from arrival to menu visibility, with no page errors. [Arrival recording](../output/playwright/arrival-celebration.mp4)

The subsequent preparation and deeper-approach revision passed strict TypeScript, ESLint, all **49 Vitest tests** and **18 targeted Playwright tests**. The browser checks include all three complete injected-camera recipes and tours, all three direct-control journeys, real-model photographic peeling and bidirectional steering, pointer/touch controls, arrival and exit recovery, and the new tower close-up/backtracking regression. Unit tests cover multi-portion rearming, rapid duplicate rejection, a held-and-released fist, unclassified down/up squeezing, four-turn mixing, late scene blending and equal eight-second approaches in both directions. A visual audit captured the original helpers and all twelve close views, including phone preparation and the tower doorway. The separate demonstration uses direct controls; it records the application, with no webcam footage. Physical gesture accuracy across people and lighting remains a separate playtesting item.
