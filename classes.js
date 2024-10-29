
class Environment {
  constructor(nFairies) {
    this.skyCol = [240, 12, 10];
    // fairies
    this.nFairies = nFairies;
    this.savedFairies = 0;
    this.capturedFairies = 0;
    this.fairies = [];
    // player & opponent
    this.guide = new Guide();
    this.blackHole = new BlackHole();
    this.availableColors = [];
    for (let i = 0; i < this.nFairies; i++) {
      let fairy = new Fairy(this.guide);
      if (this.colorAvailable(fairy)) {
        this.availableColors.push(fairy.col)
      }
      this.fairies.push(fairy);
    }
    // goal
    this.oasis = new Oasis(this.availableColors);

    // state variables
    this.gameOver = false;
    this.won = false;
    // game parameters
    this.dt = 0.1
  }

  reset() {
    // reset elements
    this.fairies = [];
    this.savedFairies = 0;
    this.capturedFairies = 0;
    this.guide = new Guide();
    this.blackHole = new BlackHole();
    this.availableColors = [];
    for (let i = 0; i < this.nFairies; i++) {
      let fairy = new Fairy(this.guide);
      if (this.colorAvailable(fairy)) {
        this.availableColors.push(fairy.col)
      }
      this.fairies.push(fairy);
    }
    this.oasis = new Oasis(this.availableColors);
    // reset state
    this.gameOver = false;
    this.won = false;
  }

  addFairies(nFairies) {
    for (let i = 0; i < nFairies; i++) {
      this.fairies.push(new Fairy(this.guide))
    }
  }

  releaseFairies() {
    // if fairies in oasis they'll be saved
    this.oasis.interact(this.guide, this.fairies)
    // otherwise they just start their journey again
    for (let fairy of this.fairies) {
      if (fairy.guided) {
        fairy.release(this.guide);
      }
    }
  }
  fetchColors() {
    this.availableColors = [];
    for (let fairy of this.fairies) {
      if (!fairy.saved && this.colorAvailable(fairy)) {
        this.availableColors.push(fairy.col)
      }
    }
  }

  update() {
    // move elements
    this.guide.move()
    this.blackHole.move();
    this.oasis.move();
    // blackhole may shrink guide radius:
    this.blackHole.interact(this.guide);
    this.blackHole.grow(this.capturedFairies);
    if (this.capturedFairies <= 3) {
      this.blackHole.follow(this.guide)
    }
    // oasis may save fairies without click?
    // this.oasis.interact(this.guide, this.fairies)
    this.savedFairies = 0;
    this.capturedFairies = 0;
    for (let fairy of this.fairies) {
      fairy.moveAll(this.dt, this.oasis);
      fairy.update(this.guide, this.blackHole);
      if (fairy.saved) {
        this.savedFairies++;
      } else if (fairy.captured) {
        this.capturedFairies++;
      }
    }
    if (this.oasis.isFull()) {
      this.oasis.reset();
    }
    this.fetchColors();
    this.oasis.colOptions = this.availableColors
    // How to LOSE?
    if (this.guide.attractionRad <= this.guide.minRad) {
      this.gameOver = true;
    }
    if (this.savedFairies == this.nFairies) {
      this.won = true;
    }
  }
  draw() {
    background(this.skyCol);
    if (!this.gameOver && !this.won) {
      this.oasis.draw();
      for (let fairy of this.fairies) {
        fairy.draw();
      }
      this.guide.draw();
      this.blackHole.draw();
    } else if (this.gameOver) {
      this.blackHole.size = width / 2;
      this.blackHole.x = width / 2;
      this.blackHole.y = height / 2;
      this.blackHole.draw();
      stroke(255)
      textSize(40)
      let ts = textWidth("GAME OVER")
      text("GAME OVER", width / 2 - ts / 2, height / 2)
      for (let fairy of this.fairies) {
        fairy.col[1] = 10;
        fairy.col[2] = 10;
      }
    } else {
      // won
      stroke(255)
      textSize(40)
      let ts = textWidth("All pixlies are safe!")
      text("All pixlies are safe!", width / 2 - ts / 2, height / 2)

    }
  }

  // helper functions
  colorAvailable(fairy) {
    let available = true;
    for (let col of this.availableColors) {
      if (col[0] == fairy.col[0] &&
        col[1] == fairy.col[1] &&
        col[2] == fairy.col[2]
      ) {
        available = false;
      }
    }
    return available;
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
    this.orbitalSpeed = 10;
    this.pullback = 90;
    this.drag = 0.95;

    this.size = 2;
    this.colorOptions = [
      [24, 31, 100],   // apricot
      [57, 45, 100],   // icterine
      [80, 45, 100],   // mindaro
      [130, 21, 100],  // tea green
      [166, 46, 100],  // aquamarine
      [208, 34, 100],  // uranian blue
      [233, 41, 100],  // vista blue
      [275, 27, 100],  // mauve
      [310, 10, 100],  // pale purple
      [325, 84, 100],  // persian rose
      [0, 27, 100]     // melon
    ]
    this.col = this.colorOptions[Math.floor(random(this.colorOptions.length))]

    this.captured = false;
    this.guided = false;
    this.released = false;
    this.saved = false;
    this.savedCenterX = 0;
    this.savedCenterY = 0;
    this.forceConst = 5;
    this.angle = random(TWO_PI);

  }

  moveAll(dt, oasis) {
    this.move(dt)
    this.moveSaved(oasis)
  }

  update(guide, blackHole) {
    this.isGuided(guide);
    this.isCaptured(blackHole)
    if (this.guided) {
      this.updateVelocity(guide);
    } else if (this.captured) {
      this.updateVelocity(blackHole);
    } else {
      this.updateVelocityFree();
    }
  }

  isCaptured(blackHole) {
    let distance = dist(this.x, this.y, blackHole.x, blackHole.y)
    if (distance <= blackHole.attractionRad && !this.saved) {
      this.captured = true;
      // blackHole.capturedFairies++;
    }
  }

  isGuided(guide) {
    let distance = dist(this.x, this.y, guide.x, guide.y)
    if (distance <= guide.attractionRad &&
      !this.released &&
      !this.saved) {
      if (this.captured) {
        this.guided = random() <= guide.recaptureChance ? true : false;
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

  updateVelocityFree() {
    if (this.saved) {
      this.angle += TWO_PI / 100;
    } else {
      this.vx = random(this.vMax) * (random() <= 0.5 ? -1 : 1);
      this.vy = random(this.vMax) * (random() <= 0.5 ? 1 : -1);
    }
  }

  updateVelocity(guide) {
    const inertia = 0;
    const damp_accel = 1;
    const damp_orbit = 1;
    const damp_rand = 1;
    const min_speed = 0.01;
    const max_speed = 50;

    // get distances and normal vectors
    const dx = guide.x - this.x;
    const dy = guide.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy)
    const safeDist = Math.max(distance, 1);  // no infinity forces
    const normal_x = dx / safeDist
    const normal_y = dy / safeDist
    const tangent_x = -normal_y;
    const tangent_y = normal_x;

    // calculate accelerations
    let ax = 0;
    let ay = 0;

    // ensure fairy is not lost
    let R = guide.attractionRad;
    if (distance > R) {
      const pullbackStrength = this.pullback * (distance - R) * damp_accel;
      ax += pullbackStrength * normal_x;
      ay += pullbackStrength * normal_y;
    }
    // add random movement if at edge of radius
    // else if (round(distance) == round(R)) {
    const randForce = random(30) * damp_rand;
    ax += normal_x * randForce * (random() <= 0.5 ? -1 : 1);
    ay += normal_y * randForce * (random() <= 0.5 ? -1 : 1);
    // }

    // add orbital motion:
    ax += this.orbitalSpeed * tangent_x * damp_orbit;
    ay += this.orbitalSpeed * tangent_y * damp_orbit;

    // apply acceleration to velocities
    this.vx = this.vx * inertia + ax * (1 - inertia);
    this.vy = this.vy * inertia + ay * (1 - inertia);

    // add drag??
    this.vx *= this.drag;
    this.vy *= this.drag;

    // Clamp speed to prevent excessive velocities
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > max_speed) {
      const scale = max_speed / currentSpeed;
      this.vx *= scale;
      this.vy *= scale;
    } else if (currentSpeed < min_speed) {
      this.vx = 0;
      this.vy = 0;
    }


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

    // wrap around canvas
    this.x = (width + this.x) % width;
    this.y = (height + this.y) % height;
  }

  moveSaved(oasis) {
    if (this.saved) {
      this.x = oasis.x + this.rad * cos(this.angle)
      this.y = oasis.y + this.rad * sin(this.angle)
    }
  }

  draw() {
    let drawCol = [...this.col]
    if (!this.saved) {
      drawCol[1] = 40;
      drawCol[2] = 50;
    }
    if (this.captured) {
      drawCol[1] = 10;
      drawCol[2] = 30;
    }
    push()
    noStroke()
    fill(drawCol)
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
    this.recaptureChance = 0.4;
    this.minRad = this.size;
    this.col = [49, 100, 76]  // HSL !!! COLOR !!!
    // this.col = [49, 47, 100]  // old HSB value
  }

  move() {
    this.x = mouseX;
    this.y = mouseY;
  }

  draw() {
    push()
    noStroke();
    fill(this.col)
    let myGradient = drawingContext.createRadialGradient(
      this.x, this.y, 0,   // inner rad
      this.x, this.y, this.attractionRad);  // outer rad
    // !!! THIS IS NOT HSB !!!
    let colorString = "hsla(" + this.col[0] + ", " + this.col[1] + "%, " + this.col[2] + "%, "
    myGradient.addColorStop(0, colorString + '1)');
    myGradient.addColorStop(0.2, colorString + '0.3)');
    // myGradient.addColorStop(0.8, colorString + '0.1)');
    myGradient.addColorStop(1, colorString + '0)');
    drawingContext.fillStyle = myGradient;
    drawingContext.strokeStyle = 'hsla(0, 100%, 50%, 1)';
    circle(this.x, this.y, this.attractionRad)

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
    this.vMax = 2;
    this.initialSize = this.size;
    this.v = random(this.vMax);
    this.shrinkGuide = 0.1;
    this.capturedFairies = 0;
    this.growFac = 10;

    this.col = [150, 0, 0]
  }

  interact(guide) {
    if (dist(this.x, this.y, guide.x, guide.y) <= this.attractionRad + guide.attractionRad &&
      guide.attractionRad >= guide.minRad) {
      guide.attractionRad -= this.shrinkGuide;
    }
  }

  follow(guide) {
    if (this.x <= guide.x) {
      this.x += this.vMax;
    } else {
      this.x -= this.vMax;
    }
    if (this.y <= guide.x) {
      this.y += this.vMax;
    } else {
      this.y -= this.vMax;
    }
  }

  grow(capturedFairies) {
    this.size = this.initialSize + capturedFairies * this.growFac;
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

class Oasis {
  constructor(colors) {
    this.minSize = 15;
    this.maxSize = 50;
    this.size = map(random(), 0, 1, this.minSize, this.maxSize)
    this.x = random(this.size, width - this.size);
    this.y = random(height);
    this.vMax = 5;
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random(this.vMax * 2) - this.vMax;
    this.fairyCapacity = map(random(), 0, 1, 5, 10)
    this.currentlySaved = 0;
    this.colOptions = colors;
    this.bounces = 0;
    this.bounceMax = 20;
    this.setColor();
  }

  reset() {
    this.size = map(random(), 0, 1, this.minSize, this.maxSize);
    this.x = random(this.size, width - this.size);
    this.y = random(this.size, height - this.size);
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random(this.vMax * 2) - this.vMax;
    this.fairyCapacity = map(random(), 0, 1, 5, 10)
    this.currentlySaved = 0;
    this.bounces = 0;
    this.setColor();
  }

  isFull() {
    return this.currentlySaved >= this.fairyCapacity;
  }

  withinOasis(guide) {
    let xRange = (guide.x >= this.x - this.size) &&
      (guide.x <= this.x + this.size)
    let yRange = (guide.y >= this.y - this.size) &&
      (guide.y <= this.y + this.size)
    return (xRange && yRange)
  }

  saveFairy(fairy) {
    fairy.x = this.x + this.size;
    fairy.y = this.y + this.size;
    fairy.savedCenterX = this.x;
    fairy.savedCenterY = this.y;
    fairy.rad = this.size
    fairy.saved = true;
    fairy.guided = false;
  }

  setColor() {
    this.col = this.colOptions[Math.floor(random(this.colOptions.length))]
  }

  bounceOffWalls() {
    if (this.x + this.size >= width) {
      this.x = width - this.size;
      this.vx *= -1 * (random() + 0.5);
      this.setColor();
      this.bounces++;
    } else if (this.x - this.size <= 0) {
      this.x = this.size;
      this.vx *= -1 * (random() + 0.5);
      this.setColor();
      this.bounces++;
    }
    if (this.y + this.size >= height) {
      this.y = height - this.size;
      this.vy *= -1 * (random() + 0.5);
      this.setColor();
      this.bounces++;
    } else if (this.y - this.size <= 0) {
      this.y = this.size;
      this.vy *= -1 * (random() + 0.5);
      this.setColor();
      this.bounces++;
    }
    if (this.bounces > this.bounceMax) {
      this.reset();
    }
  }

  move() {
    this.x += this.vx;
    this.y += this.vy;
    this.bounceOffWalls();
  }

  interact(guide, fairies) {
    if (this.withinOasis(guide)) {
      for (let fairy of fairies) {
        if (fairy.col[0] == this.col[0] && fairy.guided) {
          this.saveFairy(fairy);
          this.currentlySaved++;
        }
      }
    }
  }

  draw() {
    push()
    noStroke()
    fill(this.col);
    rect(this.x, this.y, this.size)
    pop()
  }
}