import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));

export function setCommand(client) {
	const commandManager = client?.application?.commands;
	if (!commandManager) return;
	const data = JSON.parse(readFileSync("./src/command/create/data.json", "utf-8"));
	commandManager.set(data, config.guild.id);
}