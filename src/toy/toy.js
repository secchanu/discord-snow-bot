import Minesweeper from "./minesweeper/Minesweeper.js";
import Othello from "./othello/Othello.js";
import PixelArt from "./pixelArt/PixelArt.js";

import Discord from "discord.js";
import { time } from "../util/util.js";


/**
 * "interactionCreate"
 */
export async function playToy (...args) {
  const interaction = args[0];
  if (!interaction.isCommand() || !interaction.inGuild()) return;
  if (!interaction.member?.premiumSince && interaction.member.id !== interaction.guild.ownerId) return;
  switch (interaction.commandName) {

    case "toy": {
      switch (interaction.options.getSubcommand()) {

        case "minesweeper": {
          await interaction.deferReply({ephemeral: false});
          const value = interaction.options.getInteger("number") ?? 4;
          const mine = Math.min(value, 25);
          const minesweeper = new Minesweeper(5, 5, mine);
          const emojis = ["⬜","1⃣","2⃣","3⃣","4⃣","5⃣","6⃣","7⃣","8⃣"];
          const content = `クリックで開ける(ボム数: ${minesweeper.mine})`;
          const botMessage = await interaction.followUp(content);
          async function sweep (int, flag=null) {
            const components = minesweeper.data.flatMap((row, y) => {
              const actionRow = new Discord.MessageActionRow();
              row.forEach((obj, x) => {
                const button = new Discord.MessageButton().setCustomId(`${x},${y}`);
                if (obj.open) {
                  if (obj.mine === null) {
                    button.setEmoji("💣").setStyle("DANGER");
                  } else {
                    button.setEmoji(emojis[obj.mine]).setStyle("PRIMARY");
                  }
                } else {
                  if (flag === null) {
                    button.setEmoji("⬛").setStyle("SECONDARY");
                  } else {
                    if (obj.mine === null) {
                      button.setEmoji(flag ? "🚩" : "💣").setStyle(flag ? "SUCCESS" : "DANGER");
                    } else {
                      button.setEmoji(emojis[obj.mine]).setStyle("SECONDARY");
                    }
                  }
                }
                if (flag !== null) button.setDisabled();
                actionRow.addComponents(button);
              });
              return actionRow;
            });
            switch (flag) {
              case true: {
                await int.update({content: `ゲームクリア！(ターン数: ${minesweeper.turn})`, components});
                return;
              }
              case false: {
                await int.update({content: `ゲームオーバー(ターン数: ${minesweeper.turn})`, components});
                return;
              }
            }
            int ? await int.update({content, components}) : await interaction.editReply({content, components});
            const filter = i => (/^\d,\d$/).test(i.customId);
            const res = await botMessage.awaitMessageComponent({filter, time}).catch(() => {});
            if (!res) return;
            const xy = res.customId.split(',');
            const result = minesweeper.sweep(...xy);
            await sweep(res, result);
          }
          await sweep();
          break;
        }

        case "othello": {
          await interaction.deferReply({ephemeral: false});
          const my = interaction.user;
          const enemy = interaction.options.getUser("user");
          const othello = new Othello(4, 4);
          const botMessage = await interaction.followUp(`クリックで置く(手番: ${othello.next === -1 ? my : enemy})`);
          async function reverse (int) {
            const next = othello.next;
            const content = `クリックで置く(手番: ${next === -1 ? my : enemy})`;
            const components = othello.data.flatMap((row, y) => {
              const actionRow = new Discord.MessageActionRow();
              row.forEach((color, x) => {
                const button = new Discord.MessageButton().setCustomId(`${x},${y}`);
                button.setStyle("SUCCESS");
                if(color === 0) {
                  button.setEmoji("🟩");
                } else {
                  if (color === -1) {
                    button.setEmoji("⚫");
                  }
                  if (color === 1) {
                    button.setEmoji("⚪");
                  }
                }
                if (!othello.canPut(x, y, next)) button.setDisabled();
                actionRow.addComponents(button);
              });
              return actionRow;
            });
            if (next === null) {
              const turn = othello.turn;
              const winner = othello.winner;
              const score = `${othello.count(winner)}-${othello.count(othello.reverse(winner))}`;
              await int.update({content: `ゲーム終了！(ターン数: ${turn}, 勝者: ${winner === null ? "無し" : winner === -1 ? my : enemy} ${winner === null ? "" : score})`, components});
              return;
            }
            int ? await int.update({content, components}) : await interaction.editReply({content, components});
            const filter = i => (/^\d,\d$/).test(i.customId);
            const res = await botMessage.awaitMessageComponent({filter, time}).catch(() => {});
            if (!res) return;
            if (res.user.id !== (next === -1 ? my.id : enemy.id)) {
              await reverse(res);
              return;
            };
            const xy = res.customId.split(',');
            othello.put(...xy, next);
            await reverse(res);
          }
          await reverse();
          break;
        }

        case "pixelart": {
          await interaction.deferReply({ephemeral: false});
          const content = "作成したいドット絵の種類を選択してください";
          const options = PixelArt.list.map(name => {
            return {label: name, value: name};
          });
          const selectMenu = new Discord.MessageSelectMenu()
                                        .setCustomId("artName")
                                        .setPlaceholder("種類")
                                        .addOptions(options);
          const components = [new Discord.MessageActionRow().addComponents(selectMenu)];
          const botMessage = await interaction.followUp({content, components});
          const filter = i => i.customId === "artName";
          const res = await botMessage.awaitMessageComponent({filter, time}).catch(() => {});
          if (!res) return;
          const name = res.values[0];
          const pixelArt = new PixelArt(name);
          const defaultColors = pixelArt.colors;
          const defaultColorList = defaultColors.reduce((acc, color) => {
            return acc + `\n${color}: `;
          }, "上から順にリアクションを付けて選択してください\n");
          components[0].components.forEach(c => c.setDisabled());
          res.update({content: defaultColorList, components});
          const colors = [];
          for (let i = 0; i < defaultColors.length; i++) {
            const reactions = await botMessage.awaitReactions({max: 1, time});
            const reaction = reactions.first();
            const emoji = reaction.emoji;
            if (emoji.id && emoji?.guild?.id !== interaction.guildId) {
              reaction.remove();
              i--;
              continue;
            }
            colors.push(emoji);
            const colorList = defaultColors.reduce((acc, color, index) => {
              return acc + `\n${color}: ${colors?.[index] ?? ""}`;
            }, "上から順にリアクションを付けて選択してください\n");
            interaction.editReply({content: colorList});
          }
          pixelArt.setColors(...colors);
          const contents = pixelArt.contents;
          contents.forEach((str, index) => {
            const texts = Discord.Util.splitMessage(str);
            texts.forEach((text, idx) => {
              if (!index && !idx) {
                botMessage.reply(text);
              } else {
                botMessage.channel.send(text);
              }
            });
          });
          break;
        }

      }
      break;
    }

  }
}
