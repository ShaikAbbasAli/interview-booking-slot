// Reads desk list from environment variable
// Example: DESKS="D1,D2,D3,D4,D5,D6"

const desksEnv = process.env.DESKS || "Room-1,Room-2,Kitchen,Hall,Room-3,Room-4";

export const ALL_DESKS = desksEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
