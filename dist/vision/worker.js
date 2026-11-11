// Only transient local image bitmaps enter this worker. Return hand coordinates only.
self.exports = {};
importScripts("./mediapipe.js");
let recognizer;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const files =
        await self.exports.FilesetResolver.forVisionTasks("/vision/wasm");
      recognizer = await self.exports.GestureRecognizer.createFromOptions(
        files,
        {
          baseOptions: { modelAssetPath: "/vision/gesture_recognizer.task" },
          runningMode: "VIDEO",
          numHands: 2,
        },
      );
      self.postMessage({ type: "initialized" });
    } else {
      const result = recognizer.recognizeForVideo(data.frame, data.time);
      self.postMessage({
        type: "result",
        points: result.landmarks[0] || [],
        second: result.landmarks[1],
        pose: result.gestures[0]?.[0],
      });
    }
  } catch {
    self.postMessage({ type: "error" });
  } finally {
    data.frame?.close();
  }
};
