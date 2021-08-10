class Othello {

  /**
   * データ
   * @type {Array<Array<Number>>}
   */
   #data = [];

  /**
   * 横
   * @type {Number}
   */
  #width;

  /**
   * 縦
   * @type {Number}
   */
  #height;

  /**
   * 終了したターン数
   * @type {Number}
   */
  #turn;

  
  /**
   * @param {Number} width 
   * @param {Number} height 
   */
  constructor (width=8, height=8) {
    this.#width = width;
    this.#height = height;
    this.reset();
  }

  /**
   * 初期化
   */
  reset () {
    this.#data.length = this.#height;
    for(let i = 0; i < this.#data.length; i++) {
      this.#data[i] = Array(this.#width).fill(0);
    }
    for (let i = this.#width/2-1; i <= this.#width/2; i++) {
      for (let j = this.#height/2-1; j <= this.#height/2; j++) {
        this.#data[j][i] = ((i + j) % 2) || -1;
      }
    }
    this.#turn = 0;
  }

  /**
   * 裏返す
   * @param {Number} color 
   * @returns {void}
   */
  reverse (color) {
    return color * -1;
  }

  /**
   * 盤内かどうか
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean}
   */
  #inBoard (x, y) {
    return (0 <= x && x < this.#width) && (0 <= y && y < this.#height);
  }

  /**
   * 空かどうか
   * @param {Number} x 
   * @param {Number} y 
   * @returns {Boolean}
   */
  #isEmpty (x, y) {
    return this.#data[y][x] === 0;
  }

  /**
   * 指定の方向に裏返せるかどうか
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} color 
   * @param {Array<Number>} way [x, y]
   * @returns {Boolean}
   */
  #canReverseLine (x, y, color, way) {
    let reversible = 0;
    do {
      x += way[0];
      y += way[1];
    } while (this.#data?.[y]?.[x] === this.reverse(color) && ++reversible)
    return this.#data?.[y]?.[x] === color && reversible;
  }

  /**
   * 裏返せるかどうか
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} color 
   * @returns {Boolean}
   */
  #canReverse (x, y, color) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        if (this.#canReverseLine(x, y, color, [i, j])) return true;
      }
    }
    return false;
  }

  /**
   * 置けるかどうか
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} color 
   * @returns {Boolean}
   */
  canPut (x, y, color) {
    //範囲
    if (!this.#inBoard(x, y)) return false;
    //有無
    if (!this.#isEmpty(x, y)) return false;
    //裏返
    if (!this.#canReverse(x, y, color)) return false;
    return true;
  }

  #canPutAll (color) {
    for (let j = 0; j < this.#height; j++) {
      for (let i = 0; i < this.#width; i++) {
        if (this.canPut(i, j, color)) return true;
      }
    }
    return false;
  }

  /**
   * 盤にある数
   * @param {Number} color 
   * @returns {Number}
   */
  count (color) {
    return this.#data.reduce((result, row) => {
      return result + row.reduce((acc, val) => {
        return acc + (val === color ? 1 : 0);
      }, 0);
    }, 0);
  }

  /**
   * 指定の方向に裏返す
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} color 
   * @param {Array<Number>} way [x, y] 
   */
  reverseLine (x, y, color, way) {
    const reversible = this.#canReverseLine(x, y, color, way)
    for (let i = 0; i < reversible; i++) {
      x += way[0];
      y += way[1];
      this.#data[y][x] = this.reverse(this.#data[y][x]);
    }
  }

  /**
   * 全方向裏返す
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} color 
   */
  reverseAll (x, y, color) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        this.reverseLine(x, y, color, [i, j]);
      }
    }
  }

  /**
   * 指定の位置に石を置く
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} color 
   * @returns {Number} next
   */
  put (x, y, color) {
    x = parseInt(x);
    y = parseInt(y);
    if (!this.canPut(x, y, color)) return false;
    this.#data[y][x] = color;
    this.reverseAll(x, y, color);
    this.#turn++;
    return this.next || true;
  }

  /**
   * データ
   * @type {Array<Array<Number>>}
   */
   get data () {
    return this.#data;
  }

  /**
   * ターン数
   * @type {Number}
   */
  get turn () {
    return this.#turn;
  }

  /**
   * 次の番
   * @type {Number}
   */
  get next () {
    let color = (this.#turn % 2) || -1;
    if (!this.#canPutAll(color)) color = this.reverse(color);
    if (!this.#canPutAll(color)) color = null;
    return color;
  }

  /**
   * 優勢
   * @type {Number}
   */
  get winner () {
    const b = this.count(-1);
    const w = this.count(1);
    if (b === w) return null;
    return b > w ? -1 : 1;
  }

}


export default Othello;