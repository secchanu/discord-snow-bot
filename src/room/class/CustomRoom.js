import Room from "./Room.js";


class CustomRoom extends Room {

  /**
   * @param {GuildChannelManager} guildChannelManager 
   * @param {Object} game
   * @param {?Room} room
   */
  constructor(guildChannelManager, game, room = undefined) {
    super(guildChannelManager, room);
    if (game) this.game = game;
  }

  async create() {
    const game = this.game;
    const name = game.name;
    const teamLimit = game?.teamLimit ?? 2;
    if (!this.parentId) await super.createParent(name);
    await super.resetParent();
    if (!this.textChannelIds.length) {
      await super.createTC("専用チャット");
    }
    if (!this.voiceChannelIds.length) {
      await super.createVC("home");
    } else {
      this.editVC({name: "home"});
    }
    if (this.voiceChannelIds.length > 1) {
      for (let i = 1; i < this.voiceChannelIds.length; i++) {
        this.editVC({name: `${name} ${i}`});
      }
    }
    if (this.voiceChannelIds.length < (1 + teamLimit)) {
      await super.addVC(name, (1 + teamLimit) - this.voiceChannelIds.length);
    } else if (this.voiceChannelIds.length > (1 + teamLimit)) {
      await super.removeVC(this.voiceChannelIds.length - (1 + teamLimit));
    }
    return this;
  }

}


export default CustomRoom;