import Room from "./Room.js";

import CustomRoom from "./CustomRoom.js";


class OneRoom extends Room {

  /**
   * @param {GuildChannelManager} guildChannelManager 
   * @param {Object} game
   * @param {?Snowflake} parentId
   */
  constructor (guildChannelManager, game, parentId=undefined) {
    super(guildChannelManager, parentId);
    this.game = game;
  }

  async create () {
    const game = this.game;
    const name = game.name;
    await super.createParent(name);
    await super.createTC("専用チャット");
    await super.createVC(name);
    return Promise.resolve(this);
  }

  join (userID) {
    super.enableReadTC(userID);
  }

  async toOneRoom () {
    return Promise.resolve(false);
  }

  async toCustomRoom () {
    const game = this.game;
    const name = game.name;
    const teamLimit = game?.teamLimit ?? 2;
    const newRoom = new CustomRoom(this.guildChannelManager, game, this.parentId);
    newRoom.textChannelId = this.textChannelIds[0];
    newRoom.voiceChannelId = this.voiceChannelIds[0];
    newRoom.editVC({name: "home"}, 0);
    for (let i = 0; i < teamLimit; i++) {
      await newRoom.createVC(`${name} ${i+1}`);
    }
    return Promise.resolve(newRoom);
  }

}


export default OneRoom;