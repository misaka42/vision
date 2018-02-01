import { h, app } from "hyperapp";

import "./index.css";
import TileContainer from "./tile-container";

const __STYLE_TAG_ID = "__vision_style";

const DEFAULT_CONFIG = {
  size: 4,
  moveInterval: 800,
  moveDuration: 800,
  moveSteps: 5,
  startDelay: 1000,
  startClassName: "",
  startButtonText: "START !",
  retryButtonText: "RETRY !"
};

class Vision {
  constructor(config) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config);
    if (this.config.container instanceof HTMLElement === false) {
      throw new TypeError(
        "Did you forget to pass a container to the constructor ?"
      );
    }
    const containerWidth = this.config.container.getBoundingClientRect().width;
    if (containerWidth <= 0) {
      throw new Error("container must have a initial width.");
    }
    this.state = {
      size: this.config.size,
      containerWidth,
      status: "init",
      moving: false,
      startClassName: this.config.startClassName
    };
    this.actions = {
      initTilePosition: () => state => {
        const position = [];
        for (let i = 0; i < state.size * state.size; i++) {
          position.push(i);
        }
        return { position };
      },
      randomTilePosition: count => state => {
        const position = state.position;
        count = count || position.length;
        for (let i = 0; i < count; i++) {
          randomSwapArrayItem(
            position,
            Math.floor(Math.random() * position.length)
          );
        }
        if (state.startIndex) {
          randomSwapArrayItem(position, state.startIndex);
        }
        console.debug("randomTilePosition", position);
        return { position };
      },
      startGame: () => state => {
        if (state.status === "init" || state.status === "over") {
          return {
            status: "start",
            startIndex: Math.floor(Math.random() * state.size * state.size)
          };
        }
        return {};
      },
      startMoving: () => state => ({ status: "moving" }),
      stopMoving: () => state => ({ status: "waiting" }),
      pickTile: index => state => {
        if (state.status !== "waiting") {
          return {};
        }
        const isWin = Number(index) === Number(state.startIndex);
        if (typeof this.config.onGameOver === "function") {
          setTimeout(this.config.onGameOver.bind(this, isWin), 50);
        }
        return { isWin, status: "over" };
      }
    };
    this._init();
  }

  _init() {
    updateTileMoveSpeed(this.config.moveDuration / 1000);
    const view = (state, actions) =>
      h("div", { class: "game-container" }, [
        TileContainer(state, actions),
        h(
          "div",
          {
            style: {
              display: state.status === "init" ? "block" : "none"
            },
            onclick: this.start.bind(this)
          },
          this.config.startButtonText
        ),
        h(
          "div",
          {
            style: {
              display: state.status === "over" ? "block" : "none"
            },
            onclick: this.start.bind(this)
          },
          this.config.retryButtonText
        )
      ]);
    this.app = app(this.state, this.actions, view, this.config.container);
    this.app.initTilePosition();
  }

  start() {
    this.app.startGame();
    setTimeout(() => {
      this.app.startMoving();
      setTimeout(() => {
        this._move(this.config.moveSteps);
      }, this.config.startDelay);
    }, this.config.startDelay);
  }

  _move(countdown) {
    if (countdown <= 0) {
      this.app.stopMoving();
      return;
    }
    this.app.randomTilePosition();
    setTimeout(this._move.bind(this, countdown - 1), this.config.moveInterval);
  }
}

/**
 * randomly swap array item
 * @param {Array} arr
 * @param {number} index
 */
function randomSwapArrayItem(arr, index) {
  let randomIndex = index;
  while (randomIndex === index) {
    randomIndex = Math.floor(Math.random() * arr.length);
  }
  const swap = arr[index];
  arr[index] = arr[randomIndex];
  arr[randomIndex] = swap;
  console.debug("swap", index, "->", randomIndex);
}

/**
 * update style
 * @param {number} second
 */
function updateTileMoveSpeed(second) {
  const style = document.getElementById(__STYLE_TAG_ID);
  const innerText = `.tile-container .tile { -webkit-transition: top ${second}s, left ${second}s; transition: top ${second}s, left ${second}s; }`;
  if (style) {
    style.innerText = innerText;
  } else {
    const el = document.createElement("style");
    el.id = __STYLE_TAG_ID;
    el.innerText = innerText;
    el.type = "text/css";
    document.head.appendChild(el);
  }
}

export default Vision;
