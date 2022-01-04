import Room from "./Room.js";

import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));


class StageRoom extends Room {

  #topic;

  /**
 * @param {GuildChannelManager} guildChannelManager 
 * @param {string} topic
 * @param {?Snowflake} parentId
 */
  constructor(guildChannelManager, stageInstance) {
    const channels = guildChannelManager.cache;
    const stage = channels.get(config.room.StageRoom);
    super(guildChannelManager, {parentId: stage.parentId});
    this.voiceChannelId = stage.id;
    this.#topic = stageInstance.topic;
  }

  async create() {
    const name = this.#topic;
    await super.resetParent();
    await super.createTC(name);
    super.syncReadTC();
    return this;
  }

  async delete() {
    super.deleteTC();
  }

}


export default StageRoom;