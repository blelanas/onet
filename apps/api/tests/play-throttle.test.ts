import { beforeEach, describe, expect, it } from "vitest";
import { claimPlay, playThrottle, PLAY_THROTTLE_MAX, PLAY_WINDOW_MS } from "@api/modules/content/song-actions";

describe("song play throttle", () => {
  beforeEach(() => playThrottle.clear());

  it("counts one play per user and song per window", () => {
    const t = 1_000_000;
    expect(claimPlay("u1:s1", t)).toBeTypeOf("function");
    expect(claimPlay("u1:s1", t + PLAY_WINDOW_MS - 1)).toBeNull();
    expect(claimPlay("u2:s1", t + 1)).toBeTypeOf("function");
    expect(claimPlay("u1:s1", t + PLAY_WINDOW_MS)).toBeTypeOf("function");
  });

  it("rolls the slot back when the increment fails, so the next play counts", () => {
    const rollback = claimPlay("u1:s1", 1_000)!;
    rollback();
    expect(playThrottle.has("u1:s1")).toBe(false);
    expect(claimPlay("u1:s1", 1_001)).toBeTypeOf("function");
  });

  it("restores the previous play time on rollback, and ignores a stale rollback", () => {
    claimPlay("u1:s1", 0);
    const rollback = claimPlay("u1:s1", PLAY_WINDOW_MS)!;
    rollback();
    expect(claimPlay("u1:s1", PLAY_WINDOW_MS - 1)).toBeNull(); // window measured from the play at t=0 again
    const late = claimPlay("u1:s1", 2 * PLAY_WINDOW_MS)!;
    claimPlay("u1:s1", 3 * PLAY_WINDOW_MS); // a later play took the slot
    late();
    expect(claimPlay("u1:s1", 3 * PLAY_WINDOW_MS + 1)).toBeNull();
  });

  it("evicts the oldest entries beyond the cap", () => {
    for (let i = 0; i <= PLAY_THROTTLE_MAX; i++) claimPlay(`u:${i}`, i);
    expect(playThrottle.size()).toBe(PLAY_THROTTLE_MAX);
    expect(playThrottle.has("u:0")).toBe(false);
    expect(playThrottle.has(`u:${PLAY_THROTTLE_MAX}`)).toBe(true);
  });
});
