let environ;
let n = 3;
let font;
let gameOverFont;

function preload() {
  font = loadFont('/assets/Selima.ttf');
  gameOverFont = loadFont('/assets/HyperScript.ttf');
}

function mouseClicked() {
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
  environ = new Environment(n);
}

function draw() {
  environ.update();
  environ.draw();

}
