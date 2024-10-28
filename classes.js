
class Environment {
  constructor(nFairies) {
    this.dt = 0.1
    this.fairies = [];
    this.guide = new Guide();
    for (let i = 0; i < nFairies; i++) {
      this.fairies.push(new Fairy(this.guide))
    }
  }

  addFairies(nFairies) {
    for (let i = 0; i < nFairies; i++) {
      this.fairies.push(new Fairy(this.guide))
    }
  }

  update() {
    // move elements
    this.guide.move()
    for (let fairy of this.fairies) {
      fairy.move(this.dt);
      // check for guidance
      fairy.isGuided(this.guide);
      fairy.updateVelocity(this.guide);
    }
  }

  draw() {
    for (let fairy of this.fairies) {
      fairy.draw();
    }
    this.guide.draw();
  }
}

class Fairy {
  constructor(guide) {
    // this.m = map(random(), 0, 1, 1, 5);  // can't have 0 mass!
    this.m = 1
    this.rad = map(random(), 0, 1, guide.size + 1, guide.attractionRad)
    this.x = random(width);
    this.y = random(height);
    this.vMax = 10
    this.vx = random(this.vMax) - 1;
    this.vy = random(this.vMax) - 1;
    this.orbitalSpeed = 1;
    this.pullback = 6;
    this.drag = 0.95;

    this.size = 2;
    this.col = [random(255), 100, 100]

    this.guided = false;
    this.forceConst = 5;
    this.angle = random(TWO_PI);

  }

  isGuided(guide) {
    let distance = dist(this.x, this.y, guide.x, guide.y)
    if (distance <= guide.attractionRad / 2) {
      console.log("guided")
      this.guided = true;
      // this.rad =  distance;
    }
  }

  attachTo(guide) {
    this.x = guide.x + guide.attractionRad * cos(this.angle)
    this.y = guide.y + guide.attractionRad * sin(this.angle)
  }

  updateVelocity(guide) {
    if (this.guided) {
      // get distances and normal vectors
      const dx = guide.x - this.x;
      const dy = guide.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy)
      const safeDist = Math.max(distance, 1);  // no infinity forces
      const normal_x = dx / safeDist
      const normal_y = dy / safeDist
      const tangent_x = -normal_y;
      const tangent_y = normal_x;

      // ensure fairy is not lost
      let R = guide.attractionRad;
      if (distance >= R) {
        const pullbackStrength = this.pullback * (distance - R);
        this.vx += pullbackStrength * normal_x;
        this.vy += pullbackStrength * normal_y;
      } else if (round(distance) == guide.attractionRad) {
        this.vx += normal_x * random(50) * (random() <= 0.5 ? -1 : 1);
        this.vy += normal_y * random(50) * (random() <= 0.5 ? -1 : 1);
        console.log("adapted")
      }
      console.log(distance + ", R = " + guide.attractionRad)

      // add orbital motion:
      this.vx += this.orbitalSpeed * tangent_x;
      this.vy += this.orbitalSpeed * tangent_y;

      // add drag??
      this.vx *= this.drag;
      this.vy *= this.drag;
    } else {
      this.vx = random(this.vMax) * (random() <= 0.5 ? -1 : 1);
      this.vy = random(this.vMax) * (random() <= 0.5 ? 1 : -1);
    }
  }

  move(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw() {
    push()
    noStroke()
    fill(this.col)
    circle(this.x, this.y, this.size)
    pop()
  }
}

class Guide {
  constructor() {
    this.x = mouseX;
    this.y = mouseY;
    this.m = 2500;
    this.size = 10;
    this.attractionRad = this.size * 5;
    this.repulsionRad = this.size * 2;
    this.col = [49, 47, 100, 50]
  }

  move() {
    this.x = mouseX;
    this.y = mouseY;
  }

  draw() {
    push()
    noStroke();
    fill(this.col)
    circle(this.x, this.y, this.size)
    drawingContext.shadowBlur = 320;
    drawingContext.shadowColor = color(this.col);
    noFill();
    stroke(255, 100, 100, 0.5)
    circle(this.x, this.y, this.attractionRad)
    pop()
  }
}

