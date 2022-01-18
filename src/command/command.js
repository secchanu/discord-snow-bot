import Discord from "discord.js";

import { rooms } from "../room/room.js";
import { games } from "../game/game.js";

import { premiumTierToBitrate, sleep, time } from "../util/util.js";

import OneRoom from "../room/class/OneRoom.js";
import CustomRoom from "../room/class/CustomRoom.js";

/**
 * "interactionCreate"
 */
export default async function command(...args) {
  const interaction = args[0];
  if (!interaction.isCommand() || !interaction.inGuild()) return;

  switch (interaction.commandName) {

    case "room": {
      const key = interaction?.member?.voice?.channel?.parentId;
      if (!rooms.has(key)) return;
      const room = rooms.get(key);

      switch (interaction.options.getSubcommand()) {

        case "reset": {
          await interaction.deferReply({ ephemeral: false });
          await room.syncReadTC();
          interaction.followUp("部屋を初期状態に変更しました");
          break;
        }

        case "userlimit": {
          await interaction.deferReply({ ephemeral: false });
          const content = "人数制限を選択してください";
          const options = [
            { label: "人数制限なし", value: "0" },
            { label: `現在の人数 (${room.members.size}人)`, value: `${room.members.size}` }
          ];
          if (room?.game?.userLimit && ![0, room.members.size].includes(room.game.userLimit)) {
            options.push({ label: `${room.game.name}の人数 (${room.game.userLimit ? `${room.game.userLimit}人` : "制限なし"})`, value: `${room.game.userLimit}` });
          }
          const customId = "userLimit";
          const selectMenu = new Discord.MessageSelectMenu()
            .setCustomId(customId)
            .setPlaceholder("人数制限")
            .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const messageData = { content, components };
          const botMessage = await interaction.followUp(messageData);
          const filter = i => i.customId === customId;
          const res = await botMessage.awaitMessageComponent({ filter, time }).catch(() => { });
          if (!res) return;
          const userLimit = parseInt(res.values[0]);
          components[0].components.forEach(c => c.setDisabled());
          const index = room.voiceChannelIds.indexOf(interaction.member.voice.channelId);
          if (index === -1) {
            res.update({ content: "VCが見つかりませんでした", components });
            return;
          }
          const option = { userLimit };
          room.editVC(option, index);
          res.update({ content: `人数制限を${userLimit ? `${userLimit}人` : "無制限"}に変更しました`, components });
          break;
        }

        case "bitrate": {
          await interaction.deferReply({ ephemeral: false });
          const content = "ビットレートを選択してください";
          const premiumTier = interaction.guild.premiumTier;
          const bitrates = [premiumTierToBitrate(premiumTier) / 1000, 64, 8]
          const options = [
            { label: `最高 (${bitrates[0]}kbps)`, value: `${bitrates[0]}` },
            { label: `普通 (${bitrates[1]}kbps)`, value: `${bitrates[1]}` },
            { label: `最低 (${bitrates[2]}kbps)`, value: `${bitrates[2]}` }
          ];
          const customId = "bitrate";
          const selectMenu = new Discord.MessageSelectMenu()
            .setCustomId(customId)
            .setPlaceholder("ビットレート")
            .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const messageData = { content, components };
          const botMessage = await interaction.followUp(messageData);
          const filter = i => i.customId === customId;
          const res = await botMessage.awaitMessageComponent({ filter, time }).catch(() => { });
          if (!res) return;
          const bitrate = parseInt(res.values[0]) * 1000;
          components[0].components.forEach(c => c.setDisabled());
          const index = room.voiceChannelIds.indexOf(interaction.member.voice.channelId);
          if (index === -1) {
            res.update({ content: "VCが見つかりませんでした", components });
            return;
          }
          const option = { bitrate };
          room.editVC(option, index);
          res.update({ content: `ビットレートを${bitrate / 1000}kbpsに変更しました`, components });
          break;
        }

        case "type": {
          await interaction.deferReply({ ephemeral: false });
          const changeable = ["OneRoom", "CustomRoom"];
          if (!changeable.includes(room.type)) {
            interaction.followUp(`変更できるタイプがありません`);
            return;
          }
          const content = "部屋タイプを選択してください";
          const options = changeable.filter(name => name !== room.type).map(name => {
            return { label: name, value: name };
          });
          const customId = "type";
          const selectMenu = new Discord.MessageSelectMenu()
            .setCustomId(customId)
            .setPlaceholder("部屋タイプ")
            .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const messageData = { content, components };
          const botMessage = await interaction.followUp(messageData);
          const filter = i => i.customId === customId;
          const res = await botMessage.awaitMessageComponent({ filter, time }).catch(() => { });
          if (!res) return;
          const type = res.values[0];
          components[0].components.forEach(c => c.setDisabled());
          let newRoom;
          switch (type) {
            case "OneRoom": {
              newRoom = new OneRoom(null, null, room);
              break;
            }
            case "CustomRoom": {
              newRoom = new CustomRoom(null, null, room);
              break;
            }
          }
          if (!newRoom) {
            res.update({ content: `変更できませんでした`, components });
            return;
          }
          await room.call();
          await newRoom.create();
          rooms.set(newRoom.parentId, newRoom);
          res.update({ content: `部屋タイプを${type}に変更しました`, components });
          break;
        }

        case "game": {
          await interaction.deferReply({ ephemeral: false });
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
          }, [{ label: "free", value: "null" }]);
          const selectMenu = new Discord.MessageSelectMenu()
            .setCustomId("gameId")
            .setPlaceholder("ゲーム名")
            .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const messageData = { content, components };
          const botMessage = await interaction.followUp(messageData);
          const filter = i => i.customId === "gameId";
          const res = await botMessage.awaitMessageComponent({ filter, time }).catch(() => { });
          if (!res) return;
          const gameId = res.values[0] === "null" ? null : res.values[0];
          const game = games.get(gameId);
          room.game = game;
          components[0].components.forEach(c => c.setDisabled());
          res.update({ content: `ゲームを${game.name}に変更しました`, components });
          break;
        }

      }
      break;
    }

    case "call": {
      const key = interaction?.member?.voice?.channel?.parentId;
      if (!rooms.has(key)) return;
      const room = rooms.get(key);
      await interaction.deferReply({ ephemeral: false });
      if (room.type !== "CustomRoom") {
        const content = "現在の部屋はこのコマンドに対応していません\n`/room type CustomRoom` を使用してから試してください";
        await interaction.followUp(content);
        return;
      }
      await interaction.followUp("集合させます");
      await room.call();
      await interaction.editReply("集合させました");
      const overVC = (room.voiceChannelIds.length - 1) - (room.game?.teamLimit || 2);
      if (overVC > 0) room.removeVC(overVC);
      break;
    }

    case "team": {
      const key = interaction?.member?.voice?.channel?.parentId;
      if (!rooms.has(key)) return;
      const room = rooms.get(key);
      await interaction.deferReply({ ephemeral: false });
      if (room.type !== "CustomRoom") {
        const content = "現在の部屋はこのコマンドに対応していません";
        await interaction.followUp(content);
        return;
      }
      const value = interaction.options.getInteger("number");
      const game = room.game;
      const botMessage = await interaction.followUp("準備中…");
      let needVC = 0;
      async function team(int) {
        let players = interaction.member.voice.channel.members.filter(member => !member.user.bot);
        const division = (value) ? value : Math.max(2, Math.min(Math.ceil(players.size / game.userLimit), (game?.teamLimit || 2)));
        needVC = division - (room.voiceChannelIds.length - 1);
        const isOver = division * game.userLimit < players.size;
        const number = isOver ? Math.ceil(players.size / division) : game.userLimit;
        let under = division * number - players.size;
        const teams = new Array(division).fill(null).map((_, index) => {
          const handicap = Math.ceil(under / (division - index));
          under -= handicap;
          const num = number - handicap;
          const rands = players.random(num);
          players.sweep(p => rands.includes(p));
          return rands;
        });
        const content = teams.reduce((accumulator, members, index) => {
          return accumulator + `チーム${index + 1}\n` + members.reduce((acc, mem) => {
            return acc + `${mem}\n`;
          }, "") + "\n";
        }, "");
        const cancelButton = new Discord.MessageButton().setCustomId("cancel").setStyle("DANGER").setLabel("キャンセル");
        const moveButton = new Discord.MessageButton().setCustomId("move").setStyle("SUCCESS").setLabel("移動");
        const againButton = new Discord.MessageButton().setCustomId("again").setStyle("PRIMARY").setLabel("再抽選");
        const components = [new Discord.MessageActionRow().addComponents(cancelButton).addComponents(moveButton).addComponents(againButton)];
        int ? await int.update({ content, components }) : await interaction.editReply({ content, components });
        const filter = i => ["cancel", "move", "again"].includes(i.customId);
        const res = await botMessage.awaitMessageComponent({ filter, time }).catch(() => { });
        if (!res) return;
        switch (res.customId) {
          case "cancel": {
            components[0].components.forEach(c => c.setDisabled());
            await res.update({ content, components });
            break;
          }
          case "move": {
            components[0].components.forEach(c => c.setDisabled());
            await res.update({ content, components });
            if (needVC > 0) await room.addVC(room.game.name, needVC);
            for (const [index, members] of teams.entries()) {
              for (const member of members.values()) {
                await room.moveMember(member.voice, index + 1);
              }
            }
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
      const key = interaction?.member?.voice?.channel?.parentId;
      if (!rooms.has(key)) return;
      const room = rooms.get(key);

      switch (interaction.options.getSubcommand()) {
        case "member": {
          const value = interaction.options.getInteger("number");
          const rand = room.members.random(value ?? 1);
          const content = rand.reduce((acc, member) => {
            return acc + `${member}\n`;
          }, "");
          interaction.reply(content);
          break;
        }
        case "item": {
          await interaction.deferReply({ ephemeral: false });
          if (!Object.keys(room?.game?.data ?? {}).length) {
            interaction.followUp(`抽選できるアイテムがありません\n部屋のゲームを確認してください\n現在のゲームは${room?.game?.name ?? "設定無し"}です`);
            return;
          }
          const content = "抽選するアイテムを選択してください";
          const items = room.game.data;
          const options = Object.keys(items).map(name => {
            return { label: name, value: name };
          });
          const customId = "rand";
          const selectMenu = new Discord.MessageSelectMenu()
            .setCustomId(customId)
            .setPlaceholder("アイテム")
            .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const messageData = { content, components };
          const botMessage = await interaction.followUp(messageData);
          const filter = i => i.customId === customId;
          const res = await botMessage.awaitMessageComponent({ filter, time }).catch(() => { });
          if (!res) return;
          const key = res.values[0];
          components[0].components.forEach(c => c.setDisabled());
          const item = items[key];
          const result = item[Math.floor(Math.random() * item.length)];
          res.update({ content: result, components });
          break;
        }
      }
      break;
    }
      
    case "vote": {
      await interaction.deferReply({ ephemeral: false });
      await interaction.followUp("選択肢(25個まで)をスペース区切りで送信してください");
      const filterm = m => m.content.match(/[^\s]+/g)?.length > 1;
      const messages = await interaction.channel.awaitMessages({ filter: filterm, time, max: 1 });
      const alternatives = messages.first().content.match(/[^\s]+/g).slice(0, 25);
      messages.first().delete();
      const votes = new Map();
      function choices(alternatives, votes) {
        const results = alternatives.map((option, index) => {
          return { option, vote: Array.from(votes.values()).filter(v => v === index).length}
        });
        results.sort((a, b) => {
          return (a.vote > b.vote) ? -1 : 1;
        });
        return results.reduce((acc, data) => {
          return acc + `${data.option} ${data.vote}票\n`;
        }, "");
      }
      const options = alternatives.map((value, index) => {
        return { label: value, value: String(index) };
      });
      const customId = "vote";
      const selectMenu = new Discord.MessageSelectMenu()
        .setCustomId(customId)
        .setPlaceholder("投票")
        .addOptions(options);
      const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
      const botMessage = await interaction.editReply({ content: choices(alternatives, votes), components });
      const filter = i => i.customId === customId;
      const collector = botMessage.createMessageComponentCollector(filter);
      collector.on("collect", async res => {
        votes.set(res.user.id, parseInt(res.values[0]));
        await res.update({ content: choices(alternatives, votes), components });
      });
      break;
    }

  }
}