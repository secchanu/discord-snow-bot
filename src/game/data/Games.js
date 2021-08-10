import { readFileSync, writeFileSync } from "fs";


const path = "./src/game/data/games.json";


class Games {

  #games;
  #updater;
  
  constructor () {
    this.#games = this.#load();
    this.#updater = setInterval(() => {
      this.#games = this.#load();
    }, 10000000);
  }

  /**
   * 同期(読み込み)
   */
  #load () {
    return new Map(JSON.parse(readFileSync(path, "utf-8")));
  }

  /**
   * 同期(書き込み)
   */
  #sync () {
    writeFileSync(path, JSON.stringify([...this.#games], null, '  '), err=>{});
  }

  /**
   * IDのゲームが存在するかどうか
   * @param {Snowflake} id 
   * @returns {Boolean}
   */
  has (id) {
    return this.#games.has(id);
  }

  /**
   * IDからゲームデータを取得する
   * @param {Snowflake} id 
   * @returns {Object}
   */
  get (id) {
    return this.#games.get(id);
  }

  /**
   * IDをKeyにしてgameをセットする
   * @param {Snowflake} id 
   * @param {Object} game 
   */
  set (id, game) {
    this.#games.set(id, game);
    this.#sync();
  }

}


export default Games;