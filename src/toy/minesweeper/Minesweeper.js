class Minesweeper {

  /**
   * データ
   * @type {Array<Array<Object>>}
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
   * ボム数
   * @type {Number}
   */
  #mine;

  /**
   * 終了したターン数
   * @type {Number}
   */
  #turn;


  /**
   * @param {Number} width 
   * @param {Number} height 
   * @param {Number} mine 地雷数
   */
  constructor (width=9, height=9, mine=10) {
    this.#width = width;
    this.#height = height;
    this.#mine = mine;
    this.reset();
  }

  /**
   * 初期化
   */
  reset () {
    this.#data.length = this.#height;
    for(let i = 0; i < this.#data.length; i++) {
      this.#data[i] = Array(this.#width).fill(null).map(_ => ({open: false, mine: 0}));
    }
    const randed = [];
    for (let n = 0; n < this.#mine; n++) {
      const rand = Math.floor(Math.random() * this.#width * this.#height);
      if (randed.includes(rand)) {
        n--;
        continue;
      }
      const x = rand % this.#width;
      const y = (rand - x) / this.#width;
      this.#data[y][x].mine = null;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (!i && !j) continue;
          if (this.#inBoard(x+i, y+j) && !this.#isMine(x+i, y+j)) this.#data[y+j][x+i].mine++;
        }
      }
      randed.push(rand);
    }
    this.#turn = 0;
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
   * 地雷があるかどうか
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean}
   */
  #isMine (x, y) {
    return this.#data[y][x].mine === null;
  }

  /**
   * 数値があるかどうか
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean}
   */
  #isNumber (x, y) {
    return !!this.#data[y][x].mine;
  }

  /**
   * 開けられるかどうか
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean} 
   */
  canOpen (x, y) {
    return this.#inBoard(x, y) && !this.#data[y][x].open;
  }

  /**
   * 周囲のマスを開けられるかどうか
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean}
   */
  #canSpread (x, y) {
    return !this.#isMine(x, y) && !this.#isNumber(x, y);
  }

  /**
   * 指定のマスを開ける
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean}
   */
  #open (x, y) {
    if (!this.canOpen(x, y)) return false;
    this.#data[y][x].open = true;
    if (this.#canSpread(x, y)) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (!i && !j) continue;
          this.#open(x+i, y+j);
        }
      }
    }
    return true;
  }

  /**
   * 全マス開ける
   */
  #openAll () {
    this.#data.forEach(row => {
      row.forEach(obj => obj.open = true);
    });
  }

  isClear () {
    for (const row of this.#data) {
      for (const obj of row) {
        if (!obj.open && obj.mine !== null) {
          return false;
        };
      }
    }
    return true;
  }

  /**
   * 指定のマスを開けて、結果を得る
   * @param {Number} x 
   * @param {Nmber} y 
   * @returns {Boolean}
   */
  sweep (x, y) {
    x = parseInt(x);
    y = parseInt(y);
    if (!this.canOpen(x, y)) return;
    this.#turn++;
    if (this.#isMine(x, y)) {
      this.#openAll();
      return false;
    } else {
      this.#open(x, y);
      return this.isClear() || null;
    }
  }

  /**
   * ボム数
   * @type {Number}
   */
  get mine () {
    return this.#mine;
  }

  /**
   * データ
   * @type {Array<Array<Object>>}
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

}


export default Minesweeper;