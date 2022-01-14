import Room from "./Room.js";


class OneRoom extends Room {

  /**
   * @param {import("discord.js").GuildChannelManager} guildChannelManager 
   * @param {Object} game
   * @param {Room} [room=undefined]
   */
  constructor(guildChannelManager, game, room = undefined) {
    super(guildChannelManager, room);
    if (game) this.game = game;
  }

  async create() {
    const game = this.game;
    const name = game.name;
    if (!this.parentId) await super.createParent(name);
    await super.resetParent();
    if (!this.textChannelIds.length) {
      await super.createTC("専用チャット");
    }
    if (!this.voiceChannelIds.length) {
      await super.createVC(name);
    } else {
      this.editVC({name});
    }
    if (this.voiceChannelIds.length > 1) {
      super.removeVC(this.voiceChannelIds.length - 1)
    }
    return Promise.resolve(this);
  }

}


export default OneRoom;