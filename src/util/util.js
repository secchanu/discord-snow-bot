import { setTimeout } from "timers/promises";

export function premiumTierToBitrate (premiumTier) {
  const premiumTierNumber = parseInt(premiumTier.replace(/[^0-9^\.]/g,"")) || 0;
  const bitrate = (premiumTierNumber*128 || 96) * 1000;
  return bitrate;
}

export async function sleep (sec) {
  return setTimeout(sec * 1000);
}

export const time = 43200 * 1000;