
class Environment {
  constructor(nFairies) {
    this.dt = 0.1
    this.fairies = [];
    this.guide = new Guide();
    this.blackHole = new BlackHole();
    for (let i = 0; i < nFairies; i++) {
      this.fairies.push(new Fairy(this.guide))
    }
  }

  addFairies(nFairies) {
    for (let i = 0; i < nFairies; i++) {
      this.fairies.push(new Fairy(this.guide))
    }
  }

  releaseFairies() {
    for (let fairy of this.fairies) {
      if (fairy.guided) {
        this.releaseFairy(fairy);
      }
    }
  }

  releaseFairy(fairy) {
    fairy.release(this.guide)
  }

  update() {
    // move elements
    this.guide.move()
    this.blackHole.move();
    this.blackHole.interact(this.guide);
    for (let fairy of this.fairies) {
      fairy.move(this.dt);
      // check for guidance
      fairy.isGuided(this.guide);
      fairy.isCaptured(this.blackHole);
      if (fairy.guided) {
        fairy.updateVelocity(this.guide);
      } else if (fairy.captured) {
        fairy.updateVelocity(this.blackHole);
      } else {
        fairy.updateVelocityFree();
      }
    }
  }

  draw() {
    for (let fairy of this.fairies) {
      fairy.draw();
    }
    this.guide.draw();
    this.blackHole.draw();
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
    this.orbitalSpeed = 0.6;
    this.pullback = 5;
    this.drag = 0.95;

    this.size = 2;
    this.col = [random(255), 100, 100]

    this.captured = false;
    this.guided = false;
    this.released = false;
    this.forceConst = 5;
    this.angle = random(TWO_PI);

  }

  isCaptured(blackHole) {
    let distance = dist(this.x, this.y, blackHole.x, blackHole.y)
    if (distance <= blackHole.attractionRad) {
      this.captured = true;
    }
  }

  isGuided(guide) {
    let distance = dist(this.x, this.y, guide.x, guide.y)
    if (distance <= guide.attractionRad && !this.released) {
      if (this.captured) {
        this.guided = random() <= 0.2 ? true : false;
        if (this.guided) {
          this.captured = false;
        }
      } else {
        this.guided = true;
      }
    } else if (distance > guide.attractionRad * 2) {
      this.released = false;
    }
  }

  attachTo(guide) {
    this.x = guide.x + guide.attractionRad * cos(this.angle)
    this.y = guide.y + guide.attractionRad * sin(this.angle)
  }

  updateVelocityFree() {
    this.vx = random(this.vMax) * (random() <= 0.5 ? -1 : 1);
    this.vy = random(this.vMax) * (random() <= 0.5 ? 1 : -1);
  }

  updateVelocity(guide) {
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
    if (distance > R) {
      const pullbackStrength = this.pullback * (distance - R);
      this.vx += pullbackStrength * normal_x;
      this.vy += pullbackStrength * normal_y;
    } else if (round(distance) == guide.attractionRad) {
      this.vx += normal_x * random(50) * (random() <= 0.5 ? -1 : 1);
      this.vy += normal_y * random(50) * (random() <= 0.5 ? -1 : 1);
    }

    // add orbital motion:
    this.vx += this.orbitalSpeed * tangent_x;
    this.vy += this.orbitalSpeed * tangent_y;

    // add drag??
    this.vx *= this.drag;
    this.vy *= this.drag;
  }

  release(guide) {
    const dx = guide.x - this.x;
    const dy = guide.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy)
    const safeDist = Math.max(distance, 1);  // no infinity forces
    const normal_x = dx / safeDist
    const normal_y = dy / safeDist

    this.guided = false;
    this.released = true;
    this.x = guide.x
    this.y = guide.y
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
    this.minRad = this.size;
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

class BlackHole extends Guide {
  constructor() {
    super()
    this.x = random(width);
    this.y = random(height);
    this.vMax = 10;
    this.v = random(this.vMax);
    this.shrinkGuide = 0.1;

    this.col = [150, 10, 10]
  }

  interact(guide) {
    if (dist(this.x, this.y, guide.x, guide.y) <= this.attractionRad + guide.attractionRad &&
      guide.attractionRad >= guide.minRad) {
      guide.attractionRad -= this.shrinkGuide;
    }
  }

  bounceOffWalls() {
    if (this.x + this.size >= width) {
      this.x = width - this.size;
    } else if (this.x - this.size <= 0) {
      this.x = this.size;
    }
    if (this.y + this.size >= height) {
      this.y = height - this.size;
    } else if (this.y - this.size <= 0) {
      this.y = this.size;
    }
  }

  move() {
    this.x += map(random(), 0, 1, -this.vMax, this.vMax)
    this.y += map(random(), 0, 1, -this.vMax, this.vMax)
    this.bounceOffWalls();
  }

}