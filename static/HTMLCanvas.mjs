import { EventEmitter } from "./EventEmitter.mjs";

export class HTMLCanvas extends EventEmitter {
  /** @type {CanvasRenderingContext2D} */
  #context;

  /**
   * @param {({ width: number, height: number })} size
   * @param {EventEmitter} scaler
   */
  constructor(size, scaler) {
    super();
    const canvas = document.createElement("canvas");
    canvas.addEventListener("click", e => this.emit("click", e));
    this.#context = canvas.getContext("2d");
    const { width, height } = size;
    scaler.on("rescale", scale => {
      canvas.width = width * scale;
      canvas.height = height * scale;
    });
  }

  /** @param {HTMLElement} element */
  appendTo(element) {
    element.append(this.#context.canvas);
    return element;
  }

  getBoundingClientRect() {
    return this.#context.canvas.getBoundingClientRect();
  }
  get width() {
    return this.#context.canvas.width;
  }
  get height() {
    return this.#context.canvas.height;
  }
  clear() {
    this.#context.clearRect(0, 0, this.#context.canvas.width, this.#context.canvas.height);
  }

  /**
   * @param {number} startX
   * @param {number} startY
   * @param {number} displacementX
   * @param {number} displacementY
   * @param {number} borderWidth
   * @param {string} color
   */
  stroke(startX, startY, displacementX, displacementY, borderWidth, color) {
    this.#context.strokeStyle = color;
    this.#context.lineWidth = borderWidth;
    this.#context.beginPath();
    this.#context.moveTo(startX, startY);
    this.#context.lineTo(startX + displacementX, startY + displacementY);
    this.#context.stroke();
  }

  /**
   * @param {number} startX
   * @param {number} startY
   * @param {number} displacementX
   * @param {number} displacementY
   * @param {string} color
   */
  fillRect(startX, startY, displacementX, displacementY, color) {
    this.#context.fillStyle = color;
    this.#context.fillRect(startX, startY, displacementX, displacementY);
  }

  /**
   * @param {number} startX
   * @param {number} startY
   * @param {number} displacementX
   * @param {number} displacementY
   * @param {string} color
   */
  strokeRect(startX, startY, displacementX, displacementY, color) {
    this.#context.strokeStyle = color;
    this.#context.strokeRect(startX, startY, displacementX, displacementY);
  }

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {CanvasTextAlign} align
   * @param {CanvasTextBaseline} baseline
   * @param {string} font
   */
  fillText(text, x, y, color, align, baseline, font) {
    this.#context.fillStyle = color;
    this.#context.textAlign = align;
    this.#context.textBaseline = baseline;
    this.#context.font = font;
    this.#context.fillText(text, x, y);
  }

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {CanvasTextAlign} align
   * @param {CanvasTextBaseline} baseline
   * @param {string} font
   * @param {number} lineWidth
   */
  strokeText(text, x, y, color, align, baseline, font, lineWidth) {
    this.#context.strokeStyle = color;
    this.#context.lineWidth = lineWidth;
    this.#context.textAlign = align;
    this.#context.textBaseline = baseline;
    this.#context.font = font;
    this.#context.strokeText(text, x, y);
  }
}