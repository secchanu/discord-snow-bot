import { setTimeout } from "timers/promises";

export function premiumTierToBitrate (premiumTier) {
  const premiumTierNumber = parseInt(premiumTier.replace(/[^0-9^\.]/g,"")) || 0;
  const bitrate = (premiumTierNumber*128 || 96) * 1000;
  return bitrate;
}

export async function sleep (sec) {
  return await setTimeout(sec * 1000);
}

export const time = 86400 * 1000;