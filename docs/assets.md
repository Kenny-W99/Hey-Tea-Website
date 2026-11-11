# Campaign artwork

The source was the supplied 25-page **561 project 2.pdf**. Embedded images were extracted into source-art/ at native sizes. Existing PDF alpha streams are preserved separately where present. The source-art directory stays outside the production bundle.

The per-asset [manifest](../public/art/manifest.json) records each PDF-derived production path, source page and object, original and output size, processing, optimization and review status. [Route geometry](../public/art/routes.json) records normalized foot position, pose dimensions and aspect ratio for each destination stop.

| Pages | Production use | Treatment |
|---|---|---|
| 2 | City cups, front and back | Isolate lids, transparent margins and exact sleeve prints. Use native source detail and cap display size. |
| 5–6 | Globe, sunset alternate and poster beach | Convert embedded original to WebP. Isolate illustrated poster footer for the entry composition. |
| 7, 10 | Wordmark, mascot and destination illustrations | Crop and clean mattes. Maintain mixed photographic and illustrated campaign identity. |
| 11–18 | Six fruits × three states, mash/pour/mix helpers | Use original embedded alpha where available, preserve photo texture, remove background and adjacent illustration fragments. Derive separate pitcher/mascot art so a static stream does not continue after input stops. |
| 20–25 | Four stops per destination | Preserve an intact still, a character-free scene, back/mid/front layers, separate landmark pose and source-aligned ground anchor. |

## Reproduction

The optimized artwork is checked in and can be served immediately. For an art rebuild, use Python with Pillow, NumPy, OpenCV, pypdfium2 and ONNX Runtime. Run scripts/extract_art.py with the original PDF path. Run scripts/prepare_art.py with a compatible depth-estimation ONNX model accepting a normalized RGB tensor named pixel_values, followed by scripts/prepare_pitchers.py. The checked-in mattes in source-art/mattes retain the approved extraction boundaries. The depth estimator is a build-time art tool separate from browser hand tracking.

The processing script reconstructs obscured scenery using material from neighboring areas at the same elevation. It partitions scene pixels into depth planes and extends hidden edges for limited camera motion. Keep parallax modest. Individual back-plane images intentionally contain extended colors where foreground or midground layers cover them. Use the flattened scene or still for a standalone postcard.

## Mascot and visual limits

The revised tour uses a dedicated rear-facing illustration based on the campaign walker. Its generated source is source-art/traveler-rear.png. Run scripts/prepare_follow_art.py with the depth-model path to rebuild the eight-frame rear walk sheet and twelve 41 × 25 depth grids. The scene uses the original city plate and the selected cup. The four character-free paintings connect in a single view, with the same carried cup throughout. The printed plates support a bounded forward approach at each stop. The reference video supplied for this revision informed camera movement and is not part of the downloaded site.

After rebuilding rear-stride.webp and the printed city poses, run `python3 scripts/prepare_travel_actions.py`. It separates the waving arm, skater, board, and rear-view tea arm at the existing joints. The sprites in public/art/traveler/ share registration with their source drawings. Seated activities reuse each destination’s own printed pose.

The arrival celebration reuses the rear walk frame and the happy front-facing wave sprites. CSS separates the cup arm at its shoulder, covers the source beverage with the selected city's approved cup, and animates a turn, toast and hop. It adds no new raster assets.

The website does not use the experimental Hawaii/LA reveal boards as finished product art. Reveals combine approved source cup designs, the selected destination and extracted mascot artwork. Campaign-owner review of commercial usage rights and high-resolution original packaging remains external to this engineering build.

After preparing the plates, run scripts/travel_cups.py with the same Python environment. It removes mismatched source beverages, places the printed recipe sleeve at the hand, rebuilds the travel stills, and generates separate left-facing walk cycles while keeping packaging lettering readable. The archive holds 56 native image objects plus their applicable masks.

## Recognition assets

The runtime package is pinned through package-lock.json. The model is Google’s pretrained [MediaPipe Gesture Recognizer, float16, revision 1](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task), SHA-256 `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`. The separate build-time depth model used to prepare the checked-in landscape planes had SHA-256 `afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c`. Ordinary frontend builds use the prepared art.

## Cutting helper

The supplied guava reference is preserved at source-art/guava-cutting-reference.jpg. scripts/prepare_cut_helper.py isolates the sunglasses character and knife-bearing arm from its center panel. The two transparent sprites share a shoulder pivot. The guava pile uses the campaign’s prepared fruit photo.

## Preparation companions

Run `scripts/prepare_station_helpers.py` with the existing art Python environment to extract the additional original campaign figures. Page 12 supplies the fruit-pushing and lime-squeezing helpers; pages 14 and 17 supply the intact three-state pineapple, prickly-pear and orange helper vignettes; page 15 supplies the lilikoi scooping scene. The intact peeling scenes preserve the hands where they meet the skin. Exterior mattes remove the surrounding page while retaining white character interiors. Pages 13, 15 and 18 already provide each city's mash, pour and shaker figures. Mixing now renders the shaker figure and responds to circular hand movement. Every new asset is recorded in the manifest with its source page and native crop dimensions.

## Continuous peeling

Run `python3 scripts/prepare_peel_helper.py`. It cuts the pulling and cheering mascot from the orange page (p17-05) and completes the front-foot outline that the printed peel covered. It also registers each fruit's whole and peeled photos on one canvas (`<fruit>-peel-skin.webp`, `<fruit>-peel-flesh.webp`) and separates the pineapple crown. The same mascot appears for all three fruits. The earlier three-state helper vignettes remain in public/art/fruit but are no longer displayed.

## City depth

The travel mesh no longer reads travel-depth.json. Depth is derived from each stop's route in src/travel/movement.ts: the floor below the vanishing point and two wall planes whose floor lines are set per stop. Scenes with open sides use distant walls. Relative to the ground under the traveler's feet, each vertex's magnification is compressed smoothly (tanh in log space, easing toward ±35%), and the floor eases into the walls through rounded corners. Depth stays continuous, so the scenery neither stretches at the sides nor splits into flat sliding layers. Between stops the next painting dissolves in over the whole frame, with a light blur at the crossover, while both cameras keep moving forward.

## Venice bike lane

Run `python3 scripts/prepare_venice_clear.py` to rebuild public/art/la/1-scene.webp from source-art/la-1-scene-original.webp. It removes the roller skater and her shadow from the lane the traveler skates in, rebuilds the asphalt row by row from nearby clean road so the palm shadows continue, and redraws the double yellow line from its own cross-section along a fitted curve. Other people in the scene are unchanged.

## Wynwood Walls close view

Run `python3 scripts/prepare_hd_plate.py` to rebuild public/art/miami/3-scene.webp as a 2× Lanczos copy with a light unsharp mask, from source-art/miami-3-scene-1440.webp. That stop's walk ends close to its horizon, so its zoom limit is also lower than the others'. The city canvas renders at up to 2× device pixels on screens wider than 700 px.
