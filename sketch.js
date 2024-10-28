let environ;
let n = 20;

function mouseClicked() {
  environ.releaseFairies();
  environ.addFairies(5);
}

function setup() {
  colorMode(HSB)
  ellipseMode(RADIUS)
  createCanvas(windowWidth, windowHeight);
  environ = new Environment(n);
}

function draw() {
  background(0);
  environ.update();
  environ.draw();

}
