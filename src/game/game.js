import Games from "./data/Games.js";
export const games = new Games();

import Discord from "discord.js";
import { time } from "../util/util.js";


/**
 * メンバーのアクティビティから有効なもののゲームデータを1つ返す
 * @param {Array<Activity>} activities 
 * @returns {Game}
 */
export function pickGame (activities) {
  const applicationIds = activities.map(activity => activity.applicationId);
  const validIds = applicationIds.filter(id => id && games.has(id));
  const game = games.get(validIds?.[0] ?? null);
  return game;
}


class Game {

  #game;
  #botMessage;

  async setId (interaction) {
    await interaction.deferReply({ephemeral: true});
    const activities = interaction?.member?.presence.activities;
    const validActivities = activities.filter(activity => activity.applicationId);
    const content = "登録するゲームを選択してください";
    const acts = validActivities.slice(0, 25);
    if (!acts.length) {
      await interaction.followUp("ゲームが見つかりませんでした");
      return;
    }
    const options = acts.map(activity => {
      return {
        label: activity.name,
        value: activity.applicationId
      }
    });
    const selectMenu = new Discord.MessageSelectMenu()
                                  .setCustomId("applicationId")
                                  .setPlaceholder("ゲーム名")
                                  .addOptions(options);
    const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
    const messageData = {content, components};
    this.#botMessage = await interaction.followUp(messageData);
    const filter = i => i.customId === "applicationId";
    const res = await this.#botMessage.awaitMessageComponent({filter, time}).catch(() => {});
    if (!res) return;
    const applicationId = res.values[0];
    const game = games.get(applicationId);
    this.#game = game ?? {};
    const id = applicationId;
    this.#game.id = id;
    const name = validActivities.find(a => a.applicationId = applicationId).name;
    this.#game.name = name;
    return res;
  }

  async setUserLimit (interaction) {
    const content = `${this.#game.name}について教えて下さい\nプレイ人数は何人ですか？${this.#game.userLimit ? `\n現在の設定は${this.#game.userLimit}人です` : ""}`;
    const array = [...Array(25).keys()];
    const options = array.map(n => {
      return {
        label: `${n || "無制限"}`,
        value: `${n}`
      }
    });
    const selectMenu = new Discord.MessageSelectMenu()
                                  .setCustomId("applicationId")
                                  .setPlaceholder("プレイ人数")
                                  .addOptions(options);
    const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
    const messageData = {content, components};
    await interaction.update(messageData);
    const filter = i => i.customId === "applicationId";
    const res = await this.#botMessage.awaitMessageComponent({filter, time}).catch(() => {});
    if (!res) return;
    const userLimit = parseInt(res.values[0]);
    this.#game.userLimit = userLimit;
    return res;
  }

  async submit (interaction) {
    const content = `この内容で登録しますか？\nゲーム名: ${this.#game.name}\nプレイ人数: ${this.#game.userLimit ? `${this.#game.userLimit}人` : "無制限"}`;
    const noButton = new Discord.MessageButton().setCustomId("no").setStyle("DANGER").setLabel("キャンセル");
    const yesButton = new Discord.MessageButton().setCustomId("yes").setStyle("SUCCESS").setLabel("OK");
    const components = [new Discord.MessageActionRow().addComponents(noButton).addComponents(yesButton)];
    const messageData = {content, components};
    await interaction.update(messageData);
    const filter = i => ["no", "yes"].includes(i.customId);
    const res = await this.#botMessage.awaitMessageComponent({filter, time}).catch(() => {});
    if (!res) return;
    switch (res.customId) {
      case "no": {
        components[0].components.forEach(c => c.setDisabled());
        await res.update({content: "キャンセルされました", components});
        break;
      }
      case "yes": {
        this.#game.data = {};
        games.set(this.#game.id, this.#game);
        components[0].components.forEach(c => c.setDisabled());
        await res.update({content: `${this.#game.name} を登録しました`, components});
        break;
      }
    }
  }

}


export async function game (...args) {
  const interaction = args[0];
  if (!interaction.isCommand() || !interaction.inGuild()) return;
  if (!interaction.member?.premiumSince && interaction.member.id !== interaction.guild.ownerId) return;
  switch (interaction.commandName) {
    
    case "game": {
      switch (interaction.options.getSubcommand()) {

        case "set": {
          const game = new Game();
          const res = await game.setId(interaction);
          if (!res) return;
          const msg = await game.setUserLimit(res);
          if (!msg) return;
          await game.submit(msg);
          break;
        }

      }
      break;
    }

  }
}