import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

import Discord from "discord.js";

import { games, pickGame } from "../game/game.js";
import { premiumTierToBitrate, sleep, time } from "../util/util.js";

import OneRoom from "./class/OneRoom.js";
import CustomRoom from "./class/CustomRoom.js";


const rooms = new Map();


/**
 * Room作成
 * @param  {...any} args
 */
export async function createRoom (...args) {
  const oldState = args[0];
  const newState = args[1];
  if (!newState?.channel) return;
  const guildChannelManager = newState.guild.channels;
  let room;
  switch (newState.channelId) {
    case config.room.OneRoom: {
      const activities = newState?.member?.presence?.activities ?? [];
      const game = pickGame(activities);
      room = new OneRoom(guildChannelManager, game);
      break;
    }
    case config.room.CustomRoom: {
      const activities = newState?.member?.presence?.activities ?? [];
      const game = pickGame(activities);
      room = new CustomRoom(guildChannelManager, game);
      break;
    }
  }
  if (!room) return;
  await room.create();
  rooms.set(room.parentId, room);
  room.moveMember(newState);
}

/**
 * Room削除
 * @param  {...any} args
 */
export function deleteRoom (...args) {
  const oldState = args[0];
  const newState = args[1];
  if (!rooms.has(oldState?.channel?.parentId) || oldState?.channel?.parentId === newState?.channel?.parentId) return;
  const key = oldState.channel.parentId;
  const room = rooms.get(key);
  if (room.members.size) return;
  room.delete();
  rooms.delete(key);
}

/**
 * Room変更
 * @param  {...any} args
 */
export async function editRoom (...args) {
  const oldState = args[0];
  const newState = args[1];
  if (!rooms.has(newState?.channel?.parentId) || oldState?.channel?.parentId === newState?.channel?.parentId) return;
  const key = newState.channel.parentId;
  const room = rooms.get(key);
  room.join(newState.id);
}


export async function roomFunction (...args) {
  const interaction = args[0];
  if (!interaction.isCommand() || !interaction.inGuild()) return;
  const key = interaction?.member?.voice?.channel?.parentId;
  if (!rooms.has(key)) return;
  const room = rooms.get(key);
  switch (interaction.commandName) {

    case "room": {
      switch (interaction.options.getSubcommand()) {

        case "userlimit": {
          await interaction.deferReply({ephemeral: false});
          const value = interaction.options.getString("state");
          const userLimit = value === "LOCK" ? room.members.size
                          : value === "OPEN" ? 0
                          : room?.game.userLimit ?? 0;
          const options = {
            userLimit: userLimit
          };
          const index = room.voiceChannelIds.indexOf(interaction.member.voice.channelId);
          if (index === -1) {
            await interaction.followUp("VCが見つかりませんでした");
            return;
          }
          room.editVC(options, index);
          await interaction.followUp(`人数制限を${userLimit ? `${userLimit}人` : "無制限"}に変更しました`);
          break;
        }

        case "bitrate": {
          await interaction.deferReply({ephemeral: false});
          const value = interaction.options.getString("state");
          const premiumTier = interaction.guild.premiumTier;
          const bitrate = value === "DEFAULT" ? 64 * 1000
                        : value === "LOW" ? 8 * 1000
                        : premiumTierToBitrate(premiumTier);
          const options = {
            bitrate: bitrate
          };
          const index = room.voiceChannelIds.indexOf(interaction.member.voice.channelId);
          if (index === -1) {
            await interaction.followUp("VCが見つかりませんでした");
            return;
          }
          room.editVC(options, index);
          await interaction.followUp(`ビットレートを${bitrate/1000}kbpsに変更しました`);
          break;
        }

        case "type": {
          await interaction.deferReply({ephemeral: false});
          const value = interaction.options.getString("type");
          let newRoom;
          switch (value) {
            case "OneRoom": {
              newRoom = await room.toOneRoom();
              break;
            }
            case "CustomRoom": {
              newRoom = await room.toCustomRoom();
              break;
            }
          }
          if (!newRoom) {
            await interaction.followUp(`変更できませんでした`);
            return;
          }
          rooms.set(newRoom.parentId, newRoom);
          await interaction.followUp(`部屋タイプを${value}に変更しました`);
          break;
        }

        case "game": {
          await interaction.deferReply({ephemeral: false});
          const activities = interaction?.member?.presence?.activities ?? [];
          const validActivities = activities.filter(activity => activity.applicationId && games.has(activity.applicationId));
          const content = "ゲームを選択してください";
          const acts = validActivities.slice(0, 24);
          const options = acts.reduce((acc, activity) => {
            acc.push({
              label: activity.name,
              value: activity.applicationId
            });
            return acc;
          }, [{label: "free", value: "null"}]);
          const selectMenu = new Discord.MessageSelectMenu()
                                        .setCustomId("gameId")
                                        .setPlaceholder("ゲーム名")
                                        .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const messageData = {content, components};
          const botMessage = await interaction.followUp(messageData);
          const filter = i => i.customId === "gameId";
          const res = await botMessage.awaitMessageComponent({filter, time}).catch(() => {});
          if (!res) return;
          const gameId = res.values[0] === "null" ? null : res.values[0];
          const game = games.get(gameId);
          room.changeGame(game);
          components[0].components.forEach(c => c.setDisabled());
          res.update({content: `ゲームを${game.name}に変更しました`, components});
          break;
        }

      }
      break;
    }

    case "call": {
      await interaction.deferReply({ephemeral: false});
      if (room.type !== "CustomRoom") {
        const content = "現在の部屋はこのコマンドに対応していません\n`/room type CustomRoom` を使用してから試してください";
        await interaction.followUp(content);
        return;
      }
      await room.call();
      await interaction.followUp("集合させました");
      await sleep(3);
      const overVC = (room.voiceChannelIds.length-1) - (room.game?.teamLimit || 2);
      if (overVC > 0) room.removeVC(overVC);
      break;
    }

    case "team": {
      await interaction.deferReply({ephemeral: false});
      const key = interaction?.member?.voice?.channel?.parentId;
      const room = rooms.get(key);
      if (room.type !== "CustomRoom") {
        const content = "現在の部屋はこのコマンドに対応していません\n`/room type CustomRoom` を使用してから試してください";
        await interaction.followUp(content);
        return;
      }
      const value = interaction.options.getInteger("number");
      const game = room.game;
      const botMessage = await interaction.followUp("準備中…");
      let needVC = 0;
      async function team (int) {
        let players = room.members.filter(member => !member.user.bot);
        const division = (value && value <= players.size) ? value : Math.max(2, Math.min(Math.ceil(players.size/game.userLimit), (game?.teamLimit || 2)));
        needVC = division - (room.voiceChannelIds.length-1);
        const isOver = division*game.userLimit < players.size;
        const number = isOver ? Math.ceil(players.size/division) : game.userLimit;
        let under = division*number - players.size;
        const teams = new Array(division).fill(null).map((_, index) => {
          const handicap = Math.ceil(under / (division-index));
          under -= handicap;
          const num = number - handicap;
          const rands = players.random(num);
          players.sweep(p => rands.includes(p));
          return rands;
        });
        const content = teams.reduce((accumulator, members, index) => {
          return accumulator + `チーム${index+1}\n` + members.reduce((acc, mem) => {
            return acc + `${mem}\n`;
          }, "") + "\n";
        }, "");
        const cancelButton = new Discord.MessageButton().setCustomId("cancel").setStyle("DANGER").setLabel("キャンセル");
        const moveButton = new Discord.MessageButton().setCustomId("move").setStyle("SUCCESS").setLabel("移動");
        const againButton = new Discord.MessageButton().setCustomId("again").setStyle("PRIMARY").setLabel("再抽選");
        const components = [new Discord.MessageActionRow().addComponents(cancelButton).addComponents(moveButton).addComponents(againButton)];
        int ? await int.update({content, components}) : await interaction.editReply({content, components});
        const filter = i => ["cancel", "move", "again"].includes(i.customId);
        const res = await botMessage.awaitMessageComponent({filter, time}).catch(() => {});
        if (!res) return;
        switch (res.customId) {
          case "cancel": {
            components[0].components.forEach(c => c.setDisabled());
            await res.update({content, components});
            break;
          }
          case "move": {
            components[0].components.forEach(c => c.setDisabled());
            await res.update({content, components});
            if (needVC > 0) await room.addVC(needVC);
            teams.forEach((members, index) => {
              members.forEach(member => {
                room.moveMember(member.voice, index+1);
              });
            });
            break;
          }
          case "again": {
            await team(res);
            break;
          }
        }
      }
      await team();
      break;
    }

    case "rand": {
      switch (interaction.options.getSubcommand()) {
        case "member": {
          const value = interaction.options.getInteger("number");
          const rand = room.members.random(value ?? 1);
          const content = rand.reduce((acc, member) => {
            return acc + `${member}\n`;
          },"");
          interaction.reply(content);
          break;
        }
        default: {
          const type = interaction.options.getSubcommand();
          const data = room?.game?.data?.[type];
          if (!data) {
            interaction.reply("データが見つかりませんでした");
            return;
          }
          const result = data[Math.floor(Math.random()*data.length)];
          interaction.reply(result);
          break;
        }
      }
      break;
    }

  }
}
