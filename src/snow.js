import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

import { Client } from "discord.js";
const options = {
  presence: {
    activities: [
      {
        name: "雪鯖",
        type: "WATCHING"
      }
    ]
  },
  intents: [
    "GUILDS",
    "GUILD_VOICE_STATES",
    "GUILD_PRESENCES",
    "GUILD_MESSAGES",
    "GUILD_MESSAGE_REACTIONS"
  ]
};
const client = new Client(options);


import { setCommand } from "./command/command.js";
client.once("ready", setCommand);


import { createRoom, deleteRoom, editRoom, roomFunction } from "./room/room.js";
client.on("voiceStateUpdate", createRoom);
client.on("voiceStateUpdate", deleteRoom);
client.on("voiceStateUpdate", editRoom);
client.on("interactionCreate", roomFunction);


import { game } from "./game/game.js";
client.on("interactionCreate", game);


import { playToy } from "./toy/toy.js";
client.on("interactionCreate", playToy);


client.login(config.bot.token);