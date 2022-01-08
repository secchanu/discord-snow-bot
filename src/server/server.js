import { readFileSync } from "fs";
import { parse } from "ini";
const config = parse(readFileSync("./config.ini", "utf-8"));
const port = config.bot.port;

import { games } from "../game/game.js";

import express from "express";
import { Collection } from "discord.js";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Max-Age', '86400');
  next();
});

app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.json(JSON.stringify([...games], null, " "));
});

app.post("/", (req, res) => {
  try {
    const col = new Collection(req.body);
    for (const [key, val] of col) {
      games.set(key, val);
    }
  } catch (_) {}
});

app.listen(port);