import Vision from "./src/index.js";
window.game = new Vision({
  container: document.getElementById("container"),
  startClassName: "my-icon",
  size: 4,
  onGameOver(isWin) {
    alert(isWin ? "You Win !" : "Game Over");
  }
});
