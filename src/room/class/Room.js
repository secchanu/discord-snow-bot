import { Channel } from "discord.js";
import { premiumTierToBitrate } from "../../util/util.js";


/**
 * @interface
 */
class Room {

  /**
   * @type {GuildChannelManager}
   */
  #guildChannelManager;

  /**
   * @type {Snowflake}
   */
  #parentId;

  /**
   * @type {Array<Snowflake>}
   */
  #voiceChannelIds = [];

  /**
   * @type {Array<Snowflake>}
   */
  #textChannelIds = [];

  /**
   * @type {Object}
   */
  game;

  /**
   * @type {boolean}
   */
  reserve;

  /**
   * @param {GuildChannelManager} guildChannelManager 
   * @param {?Room} room
   */
  constructor(guildChannelManager, room = undefined) {
    if (guildChannelManager) this.#guildChannelManager = guildChannelManager;
    if (!room) return;
    if (!this.#guildChannelManager) this.#guildChannelManager = room?.guildChannelManager;
    this.#parentId = room?.parentId;
    this.#voiceChannelIds = room?.voiceChannelIds ?? [];
    this.#textChannelIds = room?.textChannelIds ?? [];
    this.game = room?.game;
  }


  /**
   * クラス名
   * @type {String}
   */
  get type() {
    return this.constructor.name;
  }

  /**
   * @type {GuildChannelManager}
   */
  get guildChannelManager() {
    return this.#guildChannelManager;
  }

  /**
   * このRoomのCCのID
   * @type {Snowflake}
   */
  get parentId() {
    return this.#parentId;
  }

  /**
   * このRoomのVCのIDの配列
   * @type {Array<Snowflake>}
   */
  get voiceChannelIds() {
    return this.#voiceChannelIds;
  }

  /**
   * このRoomのTCのIDの配列
   * @type {Array<Snowflake>}
   */
  get textChannelIds() {
    return this.#textChannelIds;
  }

  /**
   * @param {Snowflake} voiceChannelId
   */
  set voiceChannelId(voiceChannelId) {
    this.#voiceChannelIds.push(voiceChannelId);
  }

  /**
   * @param {Snowflake} textChannelId
   */
  set textChannelId(textChannelId) {
    this.#textChannelIds.push(textChannelId);
  }

  /**
   * このRoom内にいるメンバーのコレクション
   * @type {Collection<Snowflake,GuildMember>}
   */
  get members() {
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    const children = parent.children;
    const vcs = children.filter(child => ["GUILD_VOICE", "GUILD_STAGE_VOICE"].includes(child.type));
    if (!vcs.size) return null;
    const members = vcs.flatMap(vc => {
      return vc.members;
    });
    return members;
  }

  /**
   * このRoomが見えているメンバーのコレクション
   * @type {Collection<Snowflake,GuildMember>}
   */
  get attendance() {
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    const children = parent.children;
    const tcs = children.filter(child => ["GUILD_TEXT"].includes(child.type));
    if (!tcs.size) return null;
    const members = tcs.flatMap(tc => {
      return tc.members;
    });
    return members;
  }

  /**
   * 親になるカテゴリーチャンネルを作成する
   * 最初に呼ぶ
   * @param {String} name 
   * @param {GuildChannelCreateOptions} options 
   * @returns {Promise<CategoryChannel>}
   */
  async createParent(name, options = {}) {
    const channel = await this.#guildChannelManager.create(name, {
      type: "GUILD_CATEGORY",
    });
    this.#parentId = channel.id;
    return channel;
  }

  /**
   * ボイスチャンネルを作成する
   * @param {String} name 
   * @param {GuildChannelCreateOptions} options 
   * @returns {Promise<VoiceChannel>}
   */
  async createVC(name, options = {}) {
    const premiumTier = this.#guildChannelManager.guild.premiumTier;
    const bitrate = premiumTierToBitrate(premiumTier);
    const channel = await this.#guildChannelManager.create(name, {
      type: "GUILD_VOICE",
      bitrate: bitrate,
      userLimit: options?.userLimit ?? 0,
      parent: this.#parentId
    });
    this.voiceChannelId = channel.id;
    return channel;
  }

  /**
   * テキストチャンネルを作成する
   * @param {String} name 
   * @param {GuildChannelCreateOptions} options 
   * @returns {Promise<TextChannel>}
   */
  async createTC(name, options = {}) {
    const everyone = this.#guildChannelManager.guild.roles.everyone;
    const channel = await this.#guildChannelManager.create(name, {
      type: "GUILD_TEXT",
      parent: this.#parentId,
      permissionOverwrites: [
        {
          id: everyone,
          deny: ["VIEW_CHANNEL"]
        }
      ]
    });
    this.textChannelId = channel.id;
    return channel;
  }

  async resetParent() {
    const channels = this.#guildChannelManager.cache;
    if (this.#voiceChannelIds) {
      for (const id of this.#voiceChannelIds) {
        const channel = channels.get(id);
        await channel.setParent(this.#parentId);
      }
    }
    if (this.#textChannelIds)
    for (const id of this.#textChannelIds) {
      const channel = channels.get(id);
      await channel.setParent(this.#parentId);
    }
  }

  /**
   * 親であるカテゴリーチャンネルを編集する
   * その後子のチャンネルを全て同期する
   * @param {ChannelData} options 
   * @returns {?CategoryChannel}
   */
  async editParent(options = {}) {
    if (!this.#parentId) return;
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    await parent.edit(options);
    const children = parent.children;
    children.each(child => {
      child.lockPermissions();
    });
    return parent;
  }

  /**
   * 指定したVCを編集する
   * @param {ChannelData} options 
   * @param {Number} [index=0]
   * @returns {?Promise<VoiceChannel>} 
   */
  async editVC(options = {}, index = 0) {
    if (!this.#voiceChannelIds?.[index]) return;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#voiceChannelIds[index]);
    await channel.edit(options);
    return channel;
  }

  /**
   * 指定したTCを編集する
   * @param {ChannelData} options 
   * @param {Number} [index=0] 
   * @returns {?TextChannel}
   */
  async editTC(options = {}, index = 0) {
    if (!this.#textChannelIds?.[index]) return;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    await channel.edit(options);
    return channel;
  }

  async deleteParent() {
    if (!this.#parentId) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#parentId);
    await channel.delete();
    this.#parentId = undefined;
    return true;
  }

  /**
   * 指定したVCを削除する
   * @param {Number} [index=0] 
   * @returns {?VoiceChannel}
   */
  async deleteVC(index = 0) {
    if (!this.#voiceChannelIds?.[index]) return;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#voiceChannelIds[index]);
    await channel.delete();
    this.#voiceChannelIds.splice(index, 1);
    return channel;
  }

  /**
   * 指定したTCを削除する
   * @param {Number} [index=0] 
   * @returns {?VoiceChannel}
   */
  async deleteTC(index = 0) {
    if (!this.#textChannelIds?.[index]) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    await channel.delete();
    this.#textChannelIds.splice(index, 1);
    return channel;
  }

  async addVC(name, number = 1) {
    const exist = this.#voiceChannelIds.length;
    for (let i = exist; i < (exist + number); i++) {
      await this.createVC(`${name} ${i}`);
    }
  }

  /**
   * 指定した数だけVCを減らす
   * @param {?Number} number 
   */
  async removeVC(number = 1) {
    const exist = this.#voiceChannelIds.length;
    for (let i = exist - 1; i > (exist - number) - 1; i--) {
      await this.deleteVC(i);
    }
  }

  /**
   * 指定した数だけTCを減らす
   * @param {?Number} number 
   */
  async removeTC(number = 1) {
    const exist = this.#textChannelIds.length;
    for (let i = exist - 1; i > (exist - number) - 1; i--) {
      await this.deleteTC(i);
    }
  }

  /**
   * Room内にいるかどうか
   * @param {VoiceState} voiceState 
   * @returns {Boolean}
   */
  inVC(voiceState) {
    return this.#voiceChannelIds.includes(voiceState?.channelId);
  }

  /**
   * 指定したTCをユーザーが読めるようにする
   * @param {Snowflake} userId 
   * @param {Number} [index=0] 
   * @returns {Promise<Boolean>}
   */
  async enableReadTC(userId, index = 0) {
    if (!this.#textChannelIds?.[index]) return false;
    if (!userId) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    const manager = channel.permissionOverwrites;
    await manager.create(userId, {
      VIEW_CHANNEL: true
    });
    return true;
  }

  /**
   * 上書きした権限を削除する
   * @param {Snowflake} userId 
   * @param {Number} [index=0] 
   * @returns {Promise<Boolean>}
   */
  async deleteOverwriteTC(userId, index = 0) {
    if (!this.#textChannelIds?.[index]) return false;
    if (!userId) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    const manager = channel.permissionOverwrites;
    await manager.delete(userId);
    return true;
  }

  /**
   * @returns {void}
   */
  async syncReadTC() {
    if (this.attendance) {
      for (const member of this.attendance.values()) {
        await this.deleteOverwriteTC(member.id);
      }
    }
    if (this.members) {
      for (const member of this.members.values()) {
        await this.enableReadTC(member.id);
      }
    }
  }

  /**
   * メンバーを指定したVCに移動させる
   * @param {VoiceState} voiceState 
   * @param {Number} [index=0] 
   */
  async moveMember(voiceState, index = 0) {
    if (!voiceState?.channel || !this.#voiceChannelIds?.[index]) return;
    return voiceState.setChannel(this.#voiceChannelIds[index]);
  }

  /**
   * メンバーを1つのVCに集合させる
   * @param {Number} [index=0]
   */
  async call(index = 0) {
    for (const member of this.members.values()) {
      const voiceState = member.voice;
      if (!voiceState?.channel) return;
      await this.moveMember(voiceState, index);
    }
  }

  changeGame(game) {
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    const children = parent.children;
    children.each(child => {
      child.edit({
        name: child.name.replace(this.game.name, game.name),
        userLimit: 0
      });
    });
    parent.edit({
      name: parent.name.replace(this.game.name, game.name),
      userLimit: 0
    });
    this.game = game;
  }

  /**
   * @abstract
   * Room作成時の動作
   */
  async create() { }

  /**
   * @abstract
   * このRoomを削除する
   */
  async delete() {
    this.removeVC(this.#voiceChannelIds.length);
    this.removeTC(this.#textChannelIds.length);
    this.deleteParent();
  }

  /**
   * @abstract
   * Room参加時の動作
   */
  join(userId) {
    this.enableReadTC(userId);
  }

  /**
   * @abstract
   * Room退出時の動作
   */
  leave(userId) {
    this.deleteOverwriteTC(userId);
  }

}


export default Room;