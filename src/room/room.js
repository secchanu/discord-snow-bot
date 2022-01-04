import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

import { pickGame } from "../game/game.js";

import OneRoom from "./class/OneRoom.js";
import CustomRoom from "./class/CustomRoom.js";


export const rooms = new Map();


/**
 * Room作成
 * @param  {...any} args 
 * @returns {void}
 */
export async function createRoom(...args) {
  const oldState = args[0];
  const newState = args[1];
  if (!newState?.channel) return;
  const guildChannelManager = newState.guild.channels;
  const activities = newState?.member?.presence?.activities ?? [];
  const game = pickGame(activities);
  let room;
  switch (newState.channelId) {
    case config.room.OneRoom: {
      room = new OneRoom(guildChannelManager, game);
      break;
    }
    case config.room.CustomRoom: {
      room = new CustomRoom(guildChannelManager, game);
      break;
    }
  }
  if (!room) return;
  await room.create();
  const key = room.parentId;
  rooms.set(key, room);
  room.moveMember(newState);
}

/**
 * Room削除
 * @param  {...any} args 
 * @returns {void}
 */
export function deleteRoom(...args) {
  const oldState = args[0];
  const newState = args[1];
  if (!rooms.has(oldState?.channel?.parentId) || oldState?.channel?.parentId === newState?.channel?.parentId) return;
  const key = oldState.channel.parentId;
  const room = rooms.get(key);
  if (room.reserve) return;
  if (room.members.size) return;
  room.delete();
  rooms.delete(key);
}

/**
 * Room出席
 * @param  {...any} args 
 * @returns {void}
 */
export async function attendRoom(...args) {
  const oldState = args[0];
  const newState = args[1];
  if (!rooms.has(newState?.channel?.parentId) || oldState?.channel?.parentId === newState?.channel?.parentId) return;
  const key = newState.channel.parentId;
  const room = rooms.get(key);
  if (room.reserve) return;
  room.join(newState.id);
}