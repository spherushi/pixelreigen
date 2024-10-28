let environ;
let n = 1;

function mouseClicked() {
  for (let fairy of environ.fairies) {
    fairy.guided = false;
  }
  environ.addFairies(5);
}

function setup() {
  colorMode(HSB)
  createCanvas(windowWidth, windowHeight);
  environ = new Environment(n);
}

function draw() {
  background(0);
  environ.update();
  environ.draw();

}
