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
   * @param {GuildChannelManager} guildChannelManager 
   * @param {?Snowflake} parentId
   */
  constructor (guildChannelManager, parentId=undefined) {
    this.#guildChannelManager = guildChannelManager;
    this.#parentId = parentId;
  }


  /**
   * クラス名
   * @type {String}
   */
  get type () {
    return this.constructor.name;
  }

  /**
   * @type {GuildChannelManager}
   */
  get guildChannelManager () {
    return this.#guildChannelManager;
  }

  /**
   * このRoomのCCのID
   * @type {Snowflake}
   */
  get parentId () {
    return this.#parentId;
  }

  /**
   * このRoomのVCのIDの配列
   * @type {Array<Snowflake>}
   */
  get voiceChannelIds () {
    return this.#voiceChannelIds;
  }

  /**
   * このRoomのTCのIDの配列
   * @type {Array<Snowflake>}
   */
  get textChannelIds () {
    return this.#textChannelIds;
  }

  /**
   * @param {Snowflake} voiceChannelId
   */
  set voiceChannelId (voiceChannelId) {
    this.#voiceChannelIds.push(voiceChannelId);
  }
  
  /**
   * @param {Snowflake} textChannelId
   */
  set textChannelId (textChannelId) {
    this.#textChannelIds.push(textChannelId);
  }

  /**
   * このRoom内にいるメンバーのコレクション
   * @type {Collection<Snowflake,GuildMember>}
   */
  get members () {
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    const children = parent.children;
    const vcs = children.filter(child => child.type === "GUILD_VOICE");
    if (!vcs.size) return null;
    const members = vcs.flatMap(vc => {
      return vc.members;
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
  async createParent (name, options={}) {
    const channel = await this.#guildChannelManager.create(name, {
      type: "GUILD_CATEGORY",
    });
    this.#parentId = channel.id;
    return Promise.resolve(channel);
  }

  /**
   * ボイスチャンネルを作成する
   * @param {String} name 
   * @param {GuildChannelCreateOptions} options 
   * @returns {Promise<VoiceChannel>}
   */
  async createVC (name, options={}) {
    if (!this.#parentId) return;
    const premiumTier = this.#guildChannelManager.guild.premiumTier;
    const bitrate = premiumTierToBitrate(premiumTier);
    const channel = await this.#guildChannelManager.create(name, {
      type: "GUILD_VOICE",
      bitrate: bitrate,
      userLimit: options?.userLimit ?? 0,
      parent: this.#parentId
    });
    this.voiceChannelId = channel.id;
    return Promise.resolve(channel);
  }

  /**
   * テキストチャンネルを作成する
   * @param {String} name 
   * @param {GuildChannelCreateOptions} options 
   * @returns {Promise<TextChannel>}
   */
  async createTC (name, options={}) {
    if (!this.#parentId) return;
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
    return Promise.resolve(channel);
  }

  /**
   * 親であるカテゴリーチャンネルを編集する
   * その後子のチャンネルを全て同期する
   * @param {ChannelData} options 
   * @returns {?CategoryChannel}
   */
  async editParent (options={}) {
    if (!this.#parentId) return;
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    await parent.edit(options);
    const children = parent.children;
    children.each(child => {
      child.lockPermissions();
    });
    return Promise.resolve(parent);
  }

  /**
   * 指定したVCを編集する
   * @param {ChannelData} options 
   * @param {Number} [index=0]
   * @returns {?VoiceChannel} 
   */
  async editVC (options={}, index=0) {
    if (!this.#voiceChannelIds?.[index]) return;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#voiceChannelIds[index]);
    await channel.edit(options);
    return Promise.resolve(channel);
  }

  /**
   * 指定したTCを編集する
   * @param {ChannelData} options 
   * @param {Number} [index=0] 
   * @returns {?TextChannel}
   */
  async editTC (options={}, index=0) {
    if (!this.#textChannelIds?.[index]) return;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    await channel.edit(options);
    return Promise.resolve(channel);
  }

  /**
   * 指定したVCを削除する
   * @param {Number} [index=0] 
   * @returns {Boolean}
   */
  async deleteVC (index=0) {
    if (!this.#voiceChannelIds?.[index]) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#voiceChannelIds[index]);
    channel.delete();
    this.#voiceChannelIds.splice(index, 1);
    return Promise.resolve(true);
  }

  /**
   * 指定したTCを削除する
   * @param {Number} [index=0] 
   * @returns {Boolean}
   */
   async deleteTC (index=0) {
    if (!this.#textChannelIds?.[index]) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    channel.delete();
    this.#textChannelIds.splice(index, 1);
    return Promise.resolve(true);
  }

  /**
   * Room内にいるかどうか
   * @param {VoiceState} voiceState 
   * @returns {Boolean}
   */
  inVC (voiceState) {
    return this.#voiceChannelIds.includes(voiceState?.channelId);
  }

  /**
   * 指定したTCをユーザーが読めるようにする
   * @param {Snowflake} userId 
   * @param {Number} [index=0] 
   * @returns {Boolean}
   */
  enableReadTC (userId, index=0) {
    if (!this.#textChannelIds?.[index]) return false;
    const channels = this.#guildChannelManager.cache;
    const channel = channels.get(this.#textChannelIds[index]);
    const manager = channel.permissionOverwrites;
    manager.create(userId, {
      VIEW_CHANNEL: true
    });
    return true;
  }

  /**
   * メンバーを指定したVCに移動させる
   * @param {VoiceState} voiceState 
   * @param {Number} [index=0] 
   */
  async moveMember (voiceState, index=0) {
    if (!voiceState?.channel || !this.#voiceChannelIds?.[index]) return Promise.resolve(false);
    await voiceState.setChannel(this.#voiceChannelIds[index]);
    return Promise.resolve(true);
  }

  /**
   * メンバーを1つのVCに集合させる
   * @param {Number} [index=0]
   */
  async call (index=0) {
    return Promise.all(this.members.map(async member => {
      const voiceState = member.voice;
      if (!voiceState?.channel) return;
      return this.moveMember(voiceState, index);
    }));
  }

  changeGame (game) {
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
  async create () {}

  /**
   * このRoomを削除する
   */
   async delete () {
    const channels = this.#guildChannelManager.cache;
    const parent = channels.get(this.#parentId);
    const children = parent.children;
    children.each(child => child.delete());
    parent.delete();
  }

  /**
   * @abstract
   * Room参加時の動作
   */
  join () {}

}


export default Room;