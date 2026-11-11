// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { CameraGate } from "../src/camera/CameraGate";
import { camera } from "../src/camera/input";
import { device } from "../src/camera/device";
const stream = {
  getVideoTracks: () => [],
  getTracks: () => [],
} as unknown as MediaStream;
beforeEach(() => {
  camera.stop();
});
afterEach(() => {
  cleanup();
  camera.stop();
  vi.restoreAllMocks();
});
it.each(["NotAllowedError", "NotFoundError"])(
  "renders the recovery path for %s and enters only after retry succeeds",
  async (name) => {
    const acquire = vi
      .spyOn(device, "acquire")
      .mockRejectedValueOnce(new DOMException("", name))
      .mockResolvedValue(stream);
    vi.spyOn(device, "start").mockResolvedValue(() => {});
    const enter = vi.fn();
    render(React.createElement(CameraGate, { onEnter: enter }));
    expect(acquire).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enable Camera" }));
    const retry = await screen.findByText("Try Again", { selector: "button" });
    expect(enter).not.toHaveBeenCalled();
    fireEvent.click(retry);
    await screen.findByText("Camera Ready! Let's Make Summer.");
    await waitFor(() => expect(enter).toHaveBeenCalledOnce(), {
      timeout: 2200,
    });
    expect(acquire).toHaveBeenCalledTimes(2);
  },
);
it("chooses alternate controls without touching the device or model", () => {
  const acquire = vi.spyOn(device, "acquire"),
    start = vi.spyOn(device, "start"),
    enter = vi.fn();
  render(React.createElement(CameraGate, { onEnter: enter }));
  fireEvent.click(screen.getByText("Continue Without Camera"));
  expect(enter).toHaveBeenCalledOnce();
  expect(acquire).not.toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();
});
