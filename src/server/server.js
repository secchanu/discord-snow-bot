import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));
const port = config.bot.port;

import Games from "../game/class/Games.js";
import { games } from "../game/game.js";

import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, access_token'
  );
  res.json(JSON.stringify([...games], null, " "));
});

app.post("/", (req, res) => {
  games = games.concat(new Games(JSON.parse(req.body)));
});

app.listen(port);