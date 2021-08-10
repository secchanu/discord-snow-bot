import { readdirSync, existsSync, readFileSync } from "fs";

const path = "./src/toy/pixelArt/data/";
const extension = ".json";

class PixelArt {

  static get list () {
    const dirents = readdirSync(path, {withFileTypes: true});
    return dirents.map(dirent => dirent.name.replace(".json", ""));
  }

  /**
   * 名前
   * @type {String}
   */
  #name;

  /**
   * 色
   * @type {Array<String>}
   */
  #colors;

  /**
   * ピクセルマップ
   * @type {Array<Array<Number>>}
   */
  #map;


  /**
   * @param {String} name 
   */
  constructor (name) {
    this.#name = name;
    const data = this.#getData(name) ?? this.#getData();
    this.#colors = data.colors;
    this.#map = data.map;
  }

  /**
   * ファイルが存在するかどうか
   * @param {String} name 
   * @returns {Boolean}
   */
  #exists (name) {
    return  existsSync(`${path}${name}${extension}`);
  }

  /**
   * データを取得する
   * @param {String} name 
   * @returns {JSON}
   */
  #getData (name="mario") {
    if (!this.#exists(name)) return;
    const str = readFileSync(`${path}${name}${extension}`, "utf-8");
    const json = JSON.parse(str);
    return json;
  }

  /**
   * 必要な色
   * @type {Array<String>}
   */
  get colors () {
    return this.#colors;
  }

  /**
   * 色をセットする
   * @param {Array<String>} colors
   */
  setColors (...colors) {
    this.#colors = this.colors.map((color, index) => {
      return colors[index] ?? color;
    });
  }

  /**
   * 200個以下ずつの配列
   * @returns {Array}
   */
  get contents () {
    const array = this.#map.reduce((acc, row) => {
      if (!acc?.[acc.length-1] || (acc[acc.length-1].length + row.length > 200)) acc.push([]);
      const strs = row.map(value => this.#colors[value]);
      acc[acc.length-1].push(...strs, "\n");
      return acc;
    }, []);
    array[array.length-1].push(this.#name);
    return array.map(arr => arr.join(""));
  }

  /**
   * @returns {String}
   */
  toString () {
    return this.#map.reduce((acc, row) => {
      return acc + row.reduce((line, value) => {
        return line + this.#colors[value].toString();
      },"") + "\n";
    },"");
  }

}


export default PixelArt;