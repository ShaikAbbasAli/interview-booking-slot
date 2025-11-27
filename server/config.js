// Reads desk list from environment variable
// Example: DESKS="D1,D2,D3,D4,D5,D6"

const desksEnv = process.env.DESKS || "Desk_1,Desk_2,Desk_3,Desh_4,Desk_5,Desk_6";

export const ALL_DESKS = desksEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
