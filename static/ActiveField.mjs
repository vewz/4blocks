// @ts-check

import { LockdownManager } from "./LockdownManager.mjs";
import { SafeObject } from "./SafeObject.mjs";
import { MinoNexts } from "./MinoNexts.mjs";
import { Field } from "./Field.mjs";
import { Util } from "./util.mjs";

export class ActiveField extends SafeObject {
  #fieldData = new Field();
  #lockdown = new LockdownManager();

  /** @type {undefined | 0 | 1 | 2 | 3 | 4 | 5 | 6} */
  #currentMinoKind = undefined;
  /** @type {number} */
  #currentMinoX = 5;
  /** @type {number} */
  #currentMinoY = -1;
  /** @type {number} */
  #currentMinoRot = 0;
  /** @type {number} */
  #currentMinoLowestY = Infinity;

  /** @type {boolean} */
  #holdingAvailable = true;
  /** @type {undefined | 0 | 1 | 2 | 3 | 4 | 5 | 6} */
  #holdingMinoKind;

  #gameover = false;

  #nexts = new MinoNexts();

  #score = 0;

  constructor() {
    super();
    this.#currentMinoKind = this.#nexts.shiftMino();
  }

  #getGhostMinoY() {
    if (typeof this.#currentMinoKind !== "number") {
      throw new TypeError("Connot get the ghost mino's information because there isn't a falling mino");
    }

    let ghostY = this.#currentMinoY;

    do {
      ghostY += 1;
    } while(Util.isPlacable(
      this.#currentMinoX,
      ghostY,
      this.#currentMinoKind,
      this.#currentMinoRot,
      this.#fieldData
    ));

    ghostY -= 1;
    return ghostY;
  }

  #isTouchedDown() {
    return (typeof this.#currentMinoKind === "number") && !Util.isPlacable(
      this.#currentMinoX,
      this.#currentMinoY + 1,
      this.#currentMinoKind,
      this.#currentMinoRot,
      this.#fieldData
    );
  }

  #putMinoOnFieldAndShiftNexts() {
    if (typeof this.#currentMinoKind !== "number") return;
    const rot = /** @type {0 | 1 | 2 | 3} */ (this.#currentMinoRot % 4);
    const minoBlocks = Util.shapeTable[this.#currentMinoKind][rot];
    const minoColor = Util.colorTable[this.#currentMinoKind];
    for (const { 0: x, 1: y } of minoBlocks) {
      this.#fieldData.putTile(x + this.#currentMinoX, y + this.#currentMinoY, minoColor);
    }
    this.#lockdown.resetEveryCount();
    this.#currentMinoKind = undefined;
    this.#currentMinoX = 5;
    this.#currentMinoY = -1;
    this.#currentMinoRot = 0;
    this.#currentMinoLowestY = Infinity;
    this.#holdingAvailable = true;

    let line = 0, cutCount = 0;
    while ((line = this.#fieldData.findLineFilled()) !== -1) {
      this.#fieldData.cutLine(line);
      cutCount++;
    }
    const lv = 1;
    switch (!0) {
      case cutCount === 1: this.#score += lv * 100; break;
      case cutCount === 2: this.#score += lv * 300; break;
      case cutCount === 3: this.#score += lv * 500; break;
      case cutCount === 4: this.#score += lv * 800; break;
      case 4 < cutCount: throw new Error("something wrong");
    }
    if (cutCount && this.#fieldData.isEmpty()) {
      this.#score += lv * 1000;
    }

    const nextMino = this.#nexts.shiftMino();
    if (Util.isPlacable(
      this.#currentMinoX,
      this.#currentMinoY,
      nextMino,
      this.#currentMinoRot,
      this.#fieldData
    )) {
      setTimeout(() => {
        this.#currentMinoKind = nextMino;
      }, 500);
    } else{
      this.#gameover = true;
    }
  }

  get holdingMinoKind() {
    return this.#holdingMinoKind;
  }
  get score() {
    return this.#score;
  }
  get gameover() {
    return this.#gameover;
  }

  getNexts() {
    return this.#nexts.getNexts();
  }

  /**
   * @param {(info : { x: number, y: number, color: string }) => void} callback
   */
  iterateFieldBlocks(callback)  {
    this.#fieldData.forEach(callback);
    if (typeof this.#currentMinoKind === "number") {
      const rot = /** @type {0 | 1 | 2 | 3} */ (this.#currentMinoRot % 4);
      const minoBlocks = Util.shapeTable[this.#currentMinoKind][rot];
      const minoColor = Util.colorTable[this.#currentMinoKind];
      for (const { 0: x, 1: y } of minoBlocks) {
        callback({ x: x + this.#currentMinoX, y: y + this.#currentMinoY, color: minoColor });
      }
    }
  }

  /**
   * @param {(info : { x: number, y: number, color: string }) => void} callback
   */
  iterateGhostFieldBlocks(callback)  {
    if (typeof this.#currentMinoKind === "number") {
      const rot = /** @type {0 | 1 | 2 | 3} */ (this.#currentMinoRot % 4);
      const minoBlocks = Util.shapeTable[this.#currentMinoKind][rot];
      const minoColor = Util.colorTable[this.#currentMinoKind];
      const baseY = this.#getGhostMinoY();
      for (const { 0: x, 1: y } of minoBlocks) {
        callback({ x: x + this.#currentMinoX, y: y + baseY, color: minoColor });
      }
    }
  }

  checkMinoLockdown() {
    if (typeof this.#currentMinoKind !== "number") return;
    if (this.#lockdown.hasLocked()) {
      this.#putMinoOnFieldAndShiftNexts();
    }
  }

  holdMino() {
    if (typeof this.#currentMinoKind !== "number") return;
    if (!this.#holdingAvailable) return;
    [this.#holdingMinoKind, this.#currentMinoKind] = [this.#currentMinoKind, (typeof this.#holdingMinoKind === "number") ? this.#holdingMinoKind : this.#nexts.shiftMino()];
    this.#currentMinoRot = 0;
    this.#currentMinoX = 5;
    this.#currentMinoY = -1;
    this.#holdingAvailable = false;
  }
  fallMino() {
    if (typeof this.#currentMinoKind !== "number") return;
    let dummyY = this.#currentMinoY;
    dummyY += 1;
    if (!this.#isTouchedDown()) {
      this.#currentMinoY += 1;
      this.#lockdown.extendLockdownTimer();
      if (this.#currentMinoY < this.#currentMinoLowestY) {
        this.#lockdown.resetMinoMovementRemaining();
      }
      if (this.#isTouchedDown()) {
        this.#lockdown.startLockdownTimer();
      }
      return true;
    }
    return false;
  }
  hardDropMino() {
    if (typeof this.#currentMinoKind !== "number") return;
    const y = this.#getGhostMinoY();
    const distance = y - this.#currentMinoY;
    this.#currentMinoY = y;
    if (!Util.checkTrainingMode()) this.#score += distance * 2;
    this.#putMinoOnFieldAndShiftNexts();
  }
  softDropMino() {
    if (typeof this.#currentMinoKind !== "number") return;
    this.fallMino() && (this.#score++);
  }

  /** @param {number} x */
  #moveMinoLR(x) {
    if (typeof this.#currentMinoKind !== "number") return;
    if (!Util.isPlacable(
      this.#currentMinoX + x,
      this.#currentMinoY,
      this.#currentMinoKind,
      this.#currentMinoRot,
      this.#fieldData
    )) return;

    this.#currentMinoX += x;

    this.#lockdown.extendLockdownTimer();
    if (this.#isTouchedDown()) {
      this.#lockdown.startLockdownTimer();
    }
  }
  moveMinoRight() {
    this.#moveMinoLR(1);
  }
  moveMinoLeft() {
    this.#moveMinoLR(-1);
  }

  /** @param {number} angle */
  #rotateMino(angle) {
    const currentMinoKind = this.#currentMinoKind;
    if (typeof currentMinoKind !== "number") return;
    const newRot = (this.#currentMinoRot + angle + 8) % 4;
    const candidacies = Util.checkChallengeMode() ? [[0, 0]] : Util.superRotationResolve(this.#currentMinoRot, newRot, currentMinoKind);
    const displacement = candidacies.find(({ 0: x, 1: y }) => Util.isPlacable(
      this.#currentMinoX + x,
      this.#currentMinoY + y,
      currentMinoKind,
      newRot,
      this.#fieldData
    ));
    if (!displacement) return;
    const { 0: displacementX, 1: displacementY } = displacement;
    this.#currentMinoRot = newRot;
    this.#currentMinoX += displacementX;
    this.#currentMinoY += displacementY;
    this.#lockdown.extendLockdownTimer();
    if (this.#currentMinoY < this.#currentMinoLowestY) {
      this.#lockdown.resetMinoMovementRemaining();
    }
    if (this.#isTouchedDown()) {
      this.#lockdown.startLockdownTimer();
    }
  }
  rotateMinoRight() {
    this.#rotateMino(1);
  }
  rotateMinoLeft() {
    this.#rotateMino(-1);
  }
}
