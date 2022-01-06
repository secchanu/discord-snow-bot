import StageRoom from "./class/StageRoom.js";

export const stages = new Map();

/**
 * "stageInstanceCreate"
 * @description StageRoom作成
 */
export async function createStage(...args) {
  const stageInstance = args[0];
  const guildChannelManager = stageInstance?.guild?.channels;
  if (!guildChannelManager) return;
  const room = new StageRoom(guildChannelManager, stageInstance);
  await room.create();
  stages.set(room.voiceChannelIds[0], room);
}

/**
 * "stageInstanceDelete"
 * @description StageRoom削除
 */
export async function deleteStage(...args) {
  const stageInstance = args[0];
  const key = stageInstance.channelId;
  if (!stages.has(key)) return;
  const room = stages.get(key);
  room.delete();
  stages.delete(key);
}

/**
 * "voiceStateUpdate"
 * @description StageRoom出席
 */
export async function attendStage(...args) {
  const oldState = args[0];
  const newState = args[1];
  if (oldState?.channelId === newState?.channelId) return;
  if (stages.has(newState?.channelId)) { //参加
    const key = newState.channelId;
    const room = stages.get(key);
    room.join(newState.id);
  } else if (stages.has(oldState?.channelId)) { //退出
    const key = oldState.channelId;
    const room = stages.get(key);
    room.leave(oldState.id);
  }
}