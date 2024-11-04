let environ;
let n = levelParms[0].nFairies;  // take from level 1
let font;
let gameOverFont;
let infoFont

function preload() {
  font = loadFont('/assets/Selima.ttf');
  gameOverFont = loadFont('/assets/HyperScript.ttf');
  infoFont = loadFont('/assets/monofonto.otf');
}

function mouseClicked() {
  state.started = true
  environ.releaseFairies();
  if (state.won || state.gameOver) {
    environ.reset();
  }
}


function setup() {
  // colorMode(HSB);
  textFont(font);
  colorMode(HSB, 360, 100, 100, 1)
  ellipseMode(RADIUS);
  rectMode(RADIUS);
  createCanvas(windowWidth, windowHeight);
  updateState();
  environ = new Environment(n);
}

function draw() {
  environ.update();
  environ.draw();

}
