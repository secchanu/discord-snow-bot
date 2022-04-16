import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

import OneRoom from "./class/OneRoom.js";
import CustomRoom from "./class/CustomRoom.js";

import { games } from "../game/game.js";

import { rooms } from "./room.js";


/**
 * "guildScheduledEventCreate"
 * @description イベント用Room作成
 */
export async function createEvent(...args) {
  const guildScheduledEvent = args[0];
  if (!guildScheduledEvent?.channel) return;
  const guildChannelManager = guildScheduledEvent.guild.channels;
  const name = guildScheduledEvent.name
  const game = games.find(game => game.name === name) ?? {
    name: guildScheduledEvent.name,
    userLimit: 0
  }
  let room;
  switch (guildScheduledEvent.channelId) {
    case config?.room?.OneRoom: {
      if (!config?.room?.OneRoom) return;
      room = new OneRoom(guildChannelManager, game);
      break;
    }
    case config?.room?.CustomRoom: {
      if (!config?.room?.CustomRoom) return;
      room = new CustomRoom(guildChannelManager, game);
      break;
    }
  }
  if (!room) return;
  room.reserve = true;
  await room.create();
  const options = {
    channel: room.voiceChannelIds[0],
    scheduledEndTime: guildScheduledEvent.scheduledStartTimestamp + (1 * 60 * 60 * 1000)
  }
  await guildScheduledEvent.edit(options);
  room.join(guildScheduledEvent?.creatorId);
  const key = room.parentId;
  rooms.set(key, room);
}

/**
 * "guildScheduledEventDelete"
 * @description イベント用Room削除
 */
export async function deleteEvent(...args) {
  const guildScheduledEvent = args[0];
  const channels = guildScheduledEvent?.guild?.channels?.cache;
  if (!channels) return;
  const key = channels.get(guildScheduledEvent?.channelId)?.parentId;
  if (!rooms.has(key)) return;
  const room = rooms.get(key);
  room.delete();
  rooms.delete(key);
}

/**
 * "guildScheduledEventUpdate"
 * @description イベント終了時動作
 */
export async function completeEvent(...args) {
  const oldGuildScheduledEvent = args[0];
  const newGuildScheduledEvent = args[1];
  if (!newGuildScheduledEvent.isCompleted()) return;
  const channels = newGuildScheduledEvent?.guild?.channels?.cache;
  if (!channels) return;
  const key = channels.get(newGuildScheduledEvent?.channelId)?.parentId;
  if (!rooms.has(key)) return;
  const room = rooms.get(key);
  if (room.members.size) {
    room.reserve = false;
  } else {
    room.delete();
    rooms.delete(key);
  }
}

/**
 * "guildScheduledEventUserAdd"
 */
export async function subscribeEvent(...args) {
  const guildScheduledEvent = args[0];
  const user = args[1];
  const channels = guildScheduledEvent?.guild?.channels?.cache;
  if (!channels) return;
  const key = channels.get(guildScheduledEvent?.channelId)?.parentId;
  if (!rooms.has(key)) return;
  const room = rooms.get(key);
  room.join(user.id);
}

/**
 * "guildScheduledEventUserRemove"
 */
export async function unsubscribeEvent(...args) {
  const guildScheduledEvent = args[0];
  const user = args[1];
  const channels = guildScheduledEvent?.guild?.channels?.cache;
  if (!channels) return;
  const key = channels.get(guildScheduledEvent?.channelId)?.parentId;
  if (!rooms.has(key)) return;
  const room = rooms.get(key);
  room.leave(user.id);
}