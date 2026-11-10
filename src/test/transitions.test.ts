import { describe, it, expect } from "vitest";
import { ALL_ROOMS, getRoom } from "../game/rooms/forgotten-crossroads";
import { PLAYER_CONSTANTS, TILE_SIZE } from "../game/types";

const T = TILE_SIZE;
const PW = PLAYER_CONSTANTS.WIDTH;
const PH = PLAYER_CONSTANTS.HEIGHT;

describe("Room transitions", () => {
  const roomIds = Object.keys(ALL_ROOMS);

  for (const roomId of roomIds) {
    const room = getRoom(roomId);

    for (const transition of room.transitions) {
      it(`${roomId} → ${transition.toRoom} (${transition.direction}): target position is within room bounds`, () => {
        const targetRoom = getRoom(transition.toRoom);
        const { x, y } = transition.toPosition;

        // Player must be within room bounds
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + PW).toBeLessThanOrEqual(targetRoom.width);
        expect(y + PH).toBeLessThanOrEqual(targetRoom.height);
      });

      it(`${roomId} → ${transition.toRoom} (${transition.direction}): target position is not inside solid geometry`, () => {
        const targetRoom = getRoom(transition.toRoom);
        const { x, y } = transition.toPosition;
        const playerRect = { x, y, width: PW, height: PH };

        // Check the player doesn't spawn fully inside a solid platform
        for (const platform of targetRoom.platforms) {
          if (platform.type === 'one_way') continue;

          const overlap =
            playerRect.x < platform.x + platform.width &&
            playerRect.x + playerRect.width > platform.x &&
            playerRect.y < platform.y + platform.height &&
            playerRect.y + playerRect.height > platform.y;

          if (overlap) {
            // Calculate overlap area - small overlaps at feet are OK (landing on platform)
            const overlapX = Math.min(playerRect.x + playerRect.width, platform.x + platform.width) - Math.max(playerRect.x, platform.x);
            const overlapY = Math.min(playerRect.y + playerRect.height, platform.y + platform.height) - Math.max(playerRect.y, platform.y);
            const overlapArea = overlapX * overlapY;
            const playerArea = PW * PH;

            // Player should not be more than 50% inside a solid platform
            expect(overlapArea / playerArea).toBeLessThan(0.5);
          }
        }
      });

      it(`${roomId} → ${transition.toRoom} (${transition.direction}): has a return transition or platform below`, () => {
        const targetRoom = getRoom(transition.toRoom);
        const { x, y } = transition.toPosition;

        // Check there's either a platform below to land on, or it's a flying section
        let hasSupport = false;

        for (const platform of targetRoom.platforms) {
          // Platform is below or at player's feet
          const platformTop = platform.y;
          const playerBottom = y + PH;

          if (
            platformTop >= y && // Platform top is at or below player top
            platformTop <= playerBottom + T * 10 && // Within 10 tiles below
            x + PW > platform.x && // Horizontally overlapping
            x < platform.x + platform.width
          ) {
            hasSupport = true;
            break;
          }
        }

        expect(hasSupport).toBe(true);
      });
    }
  }
});
