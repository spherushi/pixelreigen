let environ;
let n = 50;

function mouseClicked() {
  environ.releaseFairies();
  // environ.addFairies(5);
}

function setup() {
  colorMode(HSB);
  ellipseMode(RADIUS);
  rectMode(RADIUS);
  createCanvas(windowWidth, windowHeight);
  environ = new Environment(n);
}

function draw() {
  environ.update();
  environ.draw();

}
