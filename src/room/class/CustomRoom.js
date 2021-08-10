import Room from "./Room.js";

import OneRoom from "./OneRoom.js";


class CustomRoom extends Room {

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
    const teamLimit = game?.teamLimit ?? 2;
    await super.createParent(name);
    await super.createTC("専用チャット");
    await super.createVC("home");
    for (let i = 0; i < teamLimit; i++) {
      await super.createVC(`${name} ${i+1}`);
    }
    return Promise.resolve(this);
  }

  join (userID) {
    super.enableReadTC(userID);
  }

  async addVC (number=1) {
    const game = this.game;
    const name = game.name;
    const exist = this.voiceChannelIds.length;
    for (let i = exist; i < (exist + number); i++) {
      await super.createVC(`${name} ${i}`);
    }
  }

  removeVC (number=1) {
    const exist = this.voiceChannelIds.length;
    for (let i = exist-1; i > (exist - number)-1; i--) {
      super.deleteVC(i);
    }
  }

  async toCustomRoom () {
    return Promise.resolve(false);
  }

  async toOneRoom () {
    await this.call();
    const game = this.game;
    const name = game.name;
    const newRoom = new OneRoom(this.guildChannelManager, game, this.parentId);
    newRoom.textChannelId = this.textChannelIds[0];
    newRoom.voiceChannelId = this.voiceChannelIds[0];
    newRoom.editVC({name: name}, 0);
    const exist = this.voiceChannelIds.length;
    for (let i = exist-1; i > 0; i--) {
      this.deleteVC(i);
    }
    return Promise.resolve(newRoom);
  }

}


export default CustomRoom;