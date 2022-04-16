import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

import { Client } from "discord.js";
const options = {
	presence: {
		activities: [
			{
				name: config.activity.name,
				type: config.activity.type
			}
		]
	},
	intents: [
		"GUILDS",
		"GUILD_VOICE_STATES",
		"GUILD_PRESENCES",
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"GUILD_SCHEDULED_EVENTS",
		"GUILD_EMOJIS_AND_STICKERS"
	]
};
const client = new Client(options);


import { setCommand } from "./src/command/create/create.js";
client.once("ready", setCommand);

import command from "./src/command/command.js";
client.on("interactionCreate", command);

import { game } from "./src/game/game.js";
client.on("interactionCreate", game);

import { createEvent, deleteEvent, completeEvent, subscribeEvent, unsubscribeEvent } from "./src/room/event.js";
client.on("guildScheduledEventCreate", createEvent);
client.on("guildScheduledEventDelete", deleteEvent);
client.on("guildScheduledEventUpdate", completeEvent);
client.on("guildScheduledEventUserAdd", subscribeEvent);
client.on("guildScheduledEventUserRemove", unsubscribeEvent);

import { createRoom, deleteRoom, attendRoom } from "./src/room/room.js";
client.on("voiceStateUpdate", createRoom);
client.on("voiceStateUpdate", deleteRoom);
client.on("voiceStateUpdate", attendRoom);

import { createStage, deleteStage, attendStage } from "./src/room/stage.js";
client.on("stageInstanceCreate", createStage);
client.on("stageInstanceDelete", deleteStage);
client.on("voiceStateUpdate", attendStage);

import { playToy } from "./src/toy/toy.js";
client.on("interactionCreate", playToy);


import "./src/server/server.js";


client.login(config.bot.token);