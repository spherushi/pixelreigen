let environ;
let n = 50;

function mouseClicked() {
  environ.releaseFairies();
  // environ.addFairies(5);
}

function setup() {
  // colorMode(HSB);
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
