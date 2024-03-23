window.addEventListener("load", async () => {
  const isMobile = /(iPhone|iPad|iPod|Android)/i.test(navigator.userAgent);

  const { Util, DrawUtil, HTMLUtil } = await import("./util.mjs");
  const { Field } = await import("./Field.mjs");
  const { ActiveField } = await import("./ActiveField.mjs");
  const { SafeObject } = await import("./SafeObject.mjs");
  const { HTMLCanvas } = await import("./HTMLCanvas.mjs")
  const { EventEmitter } = await import("./EventEmitter.mjs");

  class FieldCanvasData extends SafeObject {
    #blockSize; #offsetX; #offsetY;
    constructor(blockSize, offsetX, offsetY) {
      super();
      this.#blockSize = blockSize,
      this.#offsetX = offsetX, this.#offsetY = offsetY;
    }
    get blockSize() {
      return this.#blockSize * SCALE;
    }
    get offsetX() {
      return this.#offsetX * SCALE;
    }
    get offsetY() {
      return this.#offsetY * SCALE;
    }
    transformToCanvasPosition({ x, y }) {
      return {
        x: x * this.blockSize + this.offsetX,
        y: y * this.blockSize + this.offsetY
      };
    }
  }

  class Scaler extends EventEmitter { }

  class Game extends EventEmitter {
    #fc; 
    #tick; #canvas;
    #fieldCanvasData;
    /** @type {import("./ActiveField.mjs").ActiveField} */
    #field;
    constructor(canvas, fieldCanvasData) {
      super();
      this.#canvas = canvas;
      this.#fieldCanvasData = fieldCanvasData;
      this.#reset();
      Object.seal(this);
    }
    #reset() {
      this.#fc = 0,
      this.paused = false,
      this.#tick = 53, this.#field = new ActiveField();
    }
    restart() {
      this.#field = new ActiveField();
      this.#reset();
    }
    hold() {
      this.#field.holdMino();
    }
    hardDrop() {
      this.#field.hardDropMino();
    }
    softDrop() {
      this.#field.softDropMino();
    }
    moveRight() {
      this.#field.moveMinoRight();
    }
    moveLeft() {
      this.#field.moveMinoLeft();
    }
    rotateRight() {
      this.#field.rotateMinoRight();
    }
    rotateLeft() {
      this.#field.rotateMinoLeft();
    }
    minoProcess() {
      const tick = Math.round(this.#tick);
      if ((this.#fc % tick) === (tick - 1)) {
        this.#field.fallMino();
      }
      this.#field.checkMinoLockdown();
    }
    drawProcess() {
      this.#canvas.clear();

      for (let i = 0; i < Field.BLOCK_ROWS - Field.BLOCK_Y_BIAS; i++) {
        const { offsetX, offsetY, blockSize } = this.#fieldCanvasData;
        this.#canvas.stroke(offsetX, offsetY + i * blockSize, Field.BLOCK_COLS * blockSize, 0, 1, "#88888822");
      }
      for (let i = 0; i < Field.BLOCK_COLS; i++) {
        const { offsetX, offsetY, blockSize } = this.#fieldCanvasData;
        this.#canvas.stroke(offsetX + i * blockSize, offsetY, 0, (Field.BLOCK_ROWS - Field.BLOCK_Y_BIAS) * blockSize, 1, "#88888822");
      }

      if (!Util.checkChallengeMode()) {
        this.#field.iterateGhostFieldBlocks(({ x, y, color }) => {
          ({ x, y } = this.#fieldCanvasData.transformToCanvasPosition({ x, y }));
          DrawUtil.drawGhostBlock(this.#canvas, x, y, this.#fieldCanvasData.blockSize, color);
        });
      }

      this.#field.iterateFieldBlocks(({ x, y, color }) => {
        ({ x, y } = this.#fieldCanvasData.transformToCanvasPosition({ x, y }));
        DrawUtil.drawBlock(this.#canvas, x, y, this.#fieldCanvasData.blockSize, color);
      });

      if (isMobile) {
        const { offsetX, offsetY, blockSize } = this.#fieldCanvasData;
        const cols = Field.BLOCK_COLS,
        rows = Field.BLOCK_ROWS - Field.BLOCK_Y_BIAS;
        this.#canvas.stroke(offsetX, offsetY + rows * blockSize / 4, cols * blockSize, 0, 3, "#00AAFF77");
        this.#canvas.stroke(offsetX, offsetY + rows * blockSize * 3 / 4, cols * blockSize, 0, 3, "#00AAFF77");
        this.#canvas.stroke(offsetX + cols * blockSize / 2, offsetY, 0,  rows * blockSize * 3 / 4, 3, "#00AAFF77");
      }

      this.#canvas.fillText(
        "HOLD", 4 * SCALE, 30 * SCALE,
        "#FFFFFF", "start", "alphabetic", 
        `${22 * SCALE}px Sans-Serif`
      );

      if (typeof this.#field.holdingMinoKind === "number") {
        if (this.#field.holdingMinoKind === 6) {
          DrawUtil.drawMino(this.#canvas, 21 * SCALE, 50 * SCALE, this.#field.holdingMinoKind, 0, 18, Util.colorTable[this.#field.holdingMinoKind]);
        } else {
          DrawUtil.drawMino(this.#canvas, (this.#field.holdingMinoKind === 5 ? 21 : 28) * SCALE, 58 * SCALE, this.#field.holdingMinoKind, 0, 20, Util.colorTable[this.#field.holdingMinoKind]);
        }
      }

      this.#canvas.fillText(
        "SCORE", 3 * SCALE, 150 * SCALE, "#FFFFFF",
        "start", "alphabetic", 
        `${18 * SCALE}px Sans-Serif`
      );
      const scoreLen = `${this.#field.score}`.length;
      const fontSize = scoreLen < 8 ? 17 : scoreLen < 9 ? 15 : scoreLen < 10 ? 13 : 12;
      this.#canvas.fillText(
        `${this.#field.score}`,  
        66.5 * SCALE, 160 * SCALE,
        "#FFFFFF", "end", "top", 
        `${fontSize * SCALE}px Sans-Serif`
      );
      this.#canvas.fillText(
        "NEXT", 300 * SCALE, 30 * SCALE,
        "#FFFFFF", "start", "alphabetic", 
        `${22 * SCALE}px Sans-Serif`
      );
      const nexts = this.#field.getNexts();
      DrawUtil.drawNexts(
        this.#canvas, 
        Util.checkChallengeMode() ? nexts.slice(0, 1) : nexts,
        315 * SCALE, 80 * SCALE,
        50 * SCALE, 16 * SCALE
      );
    }
    proc() {
      if (this.paused) {
        this.#canvas.clear();
        this.#canvas.fillRect(0, 0, this.#canvas.width, this.#canvas.height, "#0055FF11");
        this.#canvas.strokeRect(0, 0, this.#canvas.width, this.#canvas.height, "#00FF77");
        this.emit("pause");
        return;
      }
      if (this.#field.gameover) {
        this.#canvas.strokeText("GAME OVER", this.#canvas.width / 2, this.#canvas.height / 2, "#000000", "center", "middle", `bold ${2.5 * SCALE}em Sans-Serif`, 3.2 * SCALE);
        this.#canvas.fillText("GAME OVER", this.#canvas.width / 2, this.#canvas.height / 2, "#FF0000EE", "center", "middle", `bold ${2.5 * SCALE}em Sans-Serif`);
        this.#canvas.strokeText("GAME OVER", this.#canvas.width / 2, this.#canvas.height / 2, "#000000", "center", "middle", `bold ${2.5 * SCALE}em Sans-Serif`, 1);
        this.emit("gameover");
        return;
      }
      this.minoProcess();
      this.drawProcess();
      this.#fc++;
      setTimeout(() => Promise.resolve().then(() => this.proc()), 15);
    }
    getBoundingFieldRect() {
      let { x, y } = this.#canvas.getBoundingClientRect();
      x += this.#fieldCanvasData.offsetX, y += this.#fieldCanvasData.offsetY;
      const width = Field.BLOCK_COLS * this.#fieldCanvasData.blockSize,
      height = (Field.BLOCK_ROWS - Field.BLOCK_Y_BIAS) * this.#fieldCanvasData.blockSize
      return Object.freeze({
        x, y, width, height, left: x, top: y, 
        right: x + width, bottom: y + height
      });
    }
  }
  Object.freeze(Game.prototype);

  let SCALE;

{
  const container = document.createElement("div");
  container.style.textAlign = "center";

  const canvasWidth = 365, canvasHeight = 410, html = document.documentElement;
	const scaler = new Scaler();
  const canvas = new HTMLCanvas({ width: canvasWidth, height: canvasHeight }, scaler);
  container.append((d => canvas.appendTo(d))(document.createElement("div")));

  const setSCALE = () => {
    const prevSCALE = SCALE;
    SCALE = (html.clientWidth - 10) / canvasWidth;
    SCALE = SCALE < 1.7 ? SCALE : 1.7;
    if (!isMobile && (canvasHeight * SCALE) > (html.clientHeight * 0.78)) {
      SCALE *= (html.clientHeight * 0.78) / (canvasHeight * SCALE);
    }
    if (typeof prevSCALE === "undefined" || Math.abs(prevSCALE - SCALE) > 0.01) {
      scaler.emit("rescale", SCALE);
		}
  };
  setSCALE();
  setInterval(setSCALE, 200);

  const buttons = document.createElement("div");
  buttons.style.margin = "12px";
  const generalButton = document.createElement("span");
  generalButton.textContent = "PAUSE";
  Object.assign(generalButton.style, {
    padding: "3px",
    cursor: "pointer",
    "font-size": "2em",
    diaplay: "inline-box",
    "user-select": "none",
    "border-radius": "15px",
    border: "#D7D7D7 5px solid",    
    background: "linear-gradient(#777,black)",
    "font-family": "'Andale Mono','Courier New',Courier,monospace"
  });
  generalButton.addEventListener("click", onButtonClick);
  function onButtonClick() {
    generalButton.textContent = (game.paused = !game.paused) ? "RESUME" : "PAUSE"
  }
  buttons.append(generalButton);
  container.append(buttons);

  const settingAndInfo = document.createElement("div");
  if (isMobile) {
    HTMLUtil.appendChildren(
      settingAndInfo,
      "左をタップして左へ移動　右をタップして右へ移動",
      document.createElement("br"),
      "左上をタップして左に回転　右上をタップして右に回転",
      document.createElement("br"),
      "下をタップして高速落下"
    );
    canvas.on("click", e => {
      if (game.paused) return;
      const { left, top, right, bottom, width, height } = game.getBoundingFieldRect();
      switch (!0) {
        case e.clientX < left:
        case right < e.clientX:
        case e.clientY < top:
        case bottom < e.clientY:
          return;
      }
      const halfLR = left + width / 2 < e.clientX ? 1 : -1;
      const posTMB = e.clientY < top + height / 4 ? "T" : e.clientY < bottom - height / 4 ? "M" : "B";
      switch (posTMB) {
        case "T": game.minoVr = halfLR; break;
        case "M": game.minoVx = halfLR; break;
        case "B": game.minoDrop = "soft"; break;
      }
    });
  } else {
    const leftMove = HTMLUtil.createKeySelector("lmov", "key#A#i");
    const rightMove = HTMLUtil.createKeySelector("rmov", "key#D#i");
    const leftRot = HTMLUtil.createKeySelector("lrot", "key#Q#i");
    const rightRot = HTMLUtil.createKeySelector("rrot", "key#E#i");
    const softDrop = HTMLUtil.createKeySelector("ff", "key#S#i");
    const hardDrop = HTMLUtil.createKeySelector("hd", "code#Space");
    const useHold = HTMLUtil.createKeySelector("hold", "key#C#i");
    HTMLUtil.appendChildren(
      settingAndInfo,
      leftMove, "で左へ移動　", rightMove, "で右へ移動",
      document.createElement("br"),
      leftRot, "で左に回転　", rightRot, "で右に回転",
      document.createElement("br"),
      softDrop, "でソフトドロップ　", hardDrop, "でハードドロップ",
      document.createElement("br"),
      useHold, "でホールド　ESCでPause/Resume"
    );
    document.addEventListener("keydown", e => {
      if (e.code === "Escape") {
        return generalButton.click();
      }
      if (game.paused) return;
      const states = HTMLUtil.checkKeysDown(e, leftMove, rightMove, leftRot, rightRot, softDrop, hardDrop, useHold);
      for (const state of states) if (state) { 
        e.preventDefault();
        break;
      }
      if (states[0]) game.moveLeft();
      if (states[1]) game.moveRight();
      if (states[2]) game.rotateLeft();
      if (states[3]) game.rotateRight();
      if (states[4]) game.softDrop();
      if (states[5]) game.hardDrop();
      if (states[6]) game.hold();
    });
  }
  container.append(settingAndInfo);

  document.body.append(container);

  const fieldCanvasData = new FieldCanvasData(19, 68, 5);
  const game = new Game(canvas, fieldCanvasData);
  game.on("gameover", () => {
    console.log("%cGAME OVER", "color:red;font-size:xx-large");
    generalButton.textContent = "RETRY";
    generalButton.removeEventListener("click", onButtonClick);
    generalButton.addEventListener("click", () => {
      generalButton.textContent = "PAUSE";
      game.paused = false;
      game.restart();
      game.proc();
      generalButton.addEventListener("click", onButtonClick);
    }, { once: true });
  });
  game.on("pause", () => {
    generalButton.addEventListener("click", () => game.proc(), { once: true });
  });
  game.proc();
}

});

// navigator.serviceWorker.register("./sw.js");
