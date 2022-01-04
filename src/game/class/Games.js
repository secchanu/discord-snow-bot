import { Collection } from "discord.js";
import { writeFileSync } from "fs";

const path = "./src/game/data/games.json";

class Games extends Collection {

  /**
   * 同期(書き込み)
   */
  sync() {
    writeFileSync(path, JSON.stringify([...this], null, '  '), _ => { });
  }

  /**
   * 同期込み
   * @param {any} key
   * @param {any} value
   */
  set(key, value) {
    super.set(key, value);
    this.sync();
  }

}


export default Games;