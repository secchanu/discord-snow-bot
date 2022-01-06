import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

import { Client } from "discord.js";

/**
 * "ready"
 * @description ギルドにコマンドを登録する
 * @param {Client} client 
 */
export function setCommand(client) {
	if (!config?.guild?.id) return;
	const commandManager = client?.application?.commands;
	if (!commandManager) return;
	const data = JSON.parse(readFileSync("./src/command/create/data.json", "utf-8"));
	commandManager.set(data, config.guild.id);
}