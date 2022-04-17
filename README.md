# discord-snow-bot

雪鯖用Discord Bot


# 自分で動かしたい人

## 動作環境

* Node.js 16.6.0 以上


## インストール

```bash
git clone https://github.com/secchanu/discord-snow-bot.git
cd discord-snow-bot
npm i

```

`default.ini`をコピーして`config.ini`を作成

```ini:config.ini
[bot]
token = {ここにBotのトークン}
port = 1999

[guild]
id = {ここにサーバーのID}

[room]
OneRoom = {ここにOneRoom用のボイスチャンネルのID}
CustomRoom = {ここにCustomRoom用のボイスチャンネルのID}

[activity]
name = {ステータスの「〇〇を☓☓中」の〇〇}
;PLAYING STREAMING LISTENING WATCHING CUSTOM COMPETING
type = {ステータスの「〇〇を☓☓中」の☓☓(上の一覧から選択)}
```

※{}は不要


## 動かし方

```bash
npm start
```


## メモ

何かあれば [@secchanu](https://twitter.com/secchanu) まで