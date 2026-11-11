# Architecture

## Data flow

The root component mounts the camera onboarding gate before creating any playable scene. Its choice belongs to the current page lifetime. Reloading requires a fresh choice even when the browser retains its own permission. After the choice, the app restores a valid semantic checkpoint or displays the Summer Globe.

| Module | Ownership |
|---|---|
| src/camera/CameraGate.tsx | Entry copy, native buttons, recovery, announced status, success dwell and persistent camera switch |
| src/camera/session.ts | Single pending permission request, session generation, stream ownership, verification timeout, cancellation and device cleanup. Device dependency is injectable. |
| src/camera/device.ts, mainThread.ts, public/vision/worker.js | Open front-preferred video on explicit activation. Decode frames, run a self-hosted MediaPipe model, confirm the first result, terminate on teardown. A throttled main-thread alternative covers missing worker capabilities. |
| src/camera/gestures.ts, input.ts, HandCursor.tsx | Mirror and smooth hand coordinates, apply confidence, dwell and pinch hysteresis, publish samples. Map pinch to a single button activation on the rising edge. |
| src/game/catalog.ts | Immutable city, cup, ingredients, tea, action sequence, landmark and pose metadata |
| src/game/run.ts | The recipe advances after its completion animation. A single distance can increase or decrease through all landmarks. Old stop-and-pace checkpoints migrate to positions along the road. |
| src/game/strokes.ts, progress.ts, handMotion.ts, useStationInput.ts | Shared action counts: four cuts, two squeezes, one scoop, one portion, three presses and two mixing circles. Camera mixing sums the angle the fingertip sweeps around the middle of its last two seconds of motion (normalised for ovals); a 0.9-turn loop counts, a tracking gap under 0.9 s keeps progress, and a still, trembling or scrubbing hand sweeps no angle. Peeling is continuous: downward travel (0.7 of the pad, or 0.45 of the camera frame) peels the whole skin; tremor, lifts and tracking jumps never peel. A squeeze needs a brief close-and-release or complete down-and-up motion. A 600 ms refractory period rejects rapid duplicates. Integrate fresh tilt samples to control pour rate. Completed steps hold for about two seconds before advancing. The same actions have direct button equivalents. |
| src/game/PeelBoard.tsx | Canvas peeling scene. Registered skin and peeled photos are split along a wrapping peel line; the removed skin is a ribbon from that line to the helper's hands. The helper stays right of the fruit, steps back and leans with the pull, then switches to the cheering pose. |
| src/game/CuttingBoard.tsx, StationArt.tsx, vessel.ts | The supplied chef's knife arm pivots at the shoulder. Each cut queues one short swing. The board redraws during action or resize. Pixi renders original preparation helper vignettes, individual fruit deliveries, the tea stream, liquid surface and the input-responsive shaker mascot. |
| src/travel/movement.ts (routes, cameraAt) | Each stop has an authored walkable path, a vanishing point and side-wall lines. Nearness comes from a floor/wall box through the vanishing point, so straight edges stay straight. Each frame the camera travels forward and solves the path point under the traveler's feet with the same mapping used for the 81×61 mesh, so the traveler never leaves the walkway. The camera pans to keep the traveler near the middle. On a curving route (`turn`) the camera moves toward where the path ahead points, so the scenery expands from the bend instead of one fixed point. |
| src/travel/actions.ts, FrontPose.tsx, postcard.ts | One-hand signs while stopped: Closed_Fist sits, Thumb_Up sips, Open_Palm waves and Victory takes a selfie, after a 600 ms hold and 1.2 s after two-hand steering. A held sign fires once. Buttons and keys 1–4 do the same. Wave and selfie turn the traveler to face the visitor with the city's cup on a separate arm. The postcard is composed locally from the WebGL scene, read in the same task as its render, and the pose sprites; it never leaves the browser. |
| src/travel/push.ts, World.tsx, RouteFinish.tsx | Calibrate neutral palm separation, normalize a signed control axis and integrate it at an equal rate in both directions. The DOM meter shows the current input. Losing a hand pauses movement, and the render loop rejects camera samples older than 250 ms. A shared canvas renders the four depth meshes. Endpoint arrival opens a native dialog with continuation, exit and keepsake actions. Leaving returns to drink selection. |
| src/scenes, src/App.tsx, src/sound.ts | Scene composition, GSAP timelines, history, focus, reduced motion, optional synthesized audio and completion teardown |

## Run state and navigation

Selection establishes the recipe ID. Every subsequent scene resolves its city, assets and tea from that same ID. Preparation progress is capped at one, and only a completed step permits progression. At the route endpoint the visitor may finish or walk back. Replay clears the prior recipe and exploration state.

Continuous movement, frame timestamps and hand positions remain transient. Only scene, city, step, recipe progress and route distance enter session storage. Page hide flushes the checkpoint and releases camera hardware. Browser Back restores a stable state and disables the previous live input session. A hidden tab will require explicit re-enabling of a released camera.

## Camera and privacy

Permission is requested before any model download and only after activation of Enable Camera or Try Again. There is at most one active camera session and one inference frame in flight. Cancelling pending permission invalidates late results. A later grant for an abandoned request is immediately released. A real video frame plus completed inference verifies readiness even if no hand is visible yet.

The worker receives a disposable bitmap, calls recognizeForVideo, returns up to two sets of landmarks and the primary pose confidence, and closes the bitmap. It has no upload or recording path. The city walk's how-to-play card shows the same live stream in a muted, mirrored video element on the page (CameraSession.preview returns it only while tracking is ready); nothing is captured from it. All production requests for game assets, fonts and model files go to the site origin. Sound output does not request microphone permission. Session storage and browser history never contain frames or landmarks.

## Rendering and publishing

Vite serves the React shell. PixiJS loads when a visitor reaches the station or a city. The renderer follows the reducer and input references without sending frame data through React. Each scene releases texture leases when unmounted. GSAP handles the globe approach and page transitions. Reduced motion uses a small perspective change and a dissolve with a stationary traveler.

Every word on the site uses one self-hosted face, Short Stack (via @fontsource), chosen to match the hand-drawn lettering of the campaign art; the selfie postcard canvas draws with it too. The city walk renders the world over the whole scene, with the place name, exit, steering meter and sign buttons as small overlays; on phones held upright the world keeps a near-square view so the painting is not over-magnified. The bowl step derives its count from the recipe: preparedFruits lists each fruit cut or peeled earlier, and each drop adds one of them.

A bundled catalog supplies all content. The optional FastAPI contract in plan.md remains appropriate if a separate content publishing workflow is introduced. Current interactions have no network dependency beyond the site's static files.
