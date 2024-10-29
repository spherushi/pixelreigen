
class Environment {
  constructor(nFairies) {
    // fairies
    this.nFairies = nFairies;
    this.savedFairies = 0;
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
    this.blackHole.grow();
    // oasis may save fairies without click?
    // this.oasis.interact(this.guide, this.fairies)
    this.savedFairies = 0;
    for (let fairy of this.fairies) {
      fairy.move(this.dt);
      fairy.moveSaved(this.oasis);
      // check for guidance and capture
      fairy.isGuided(this.guide);
      fairy.isCaptured(this.blackHole);
      if (fairy.guided) {
        fairy.updateVelocity(this.guide);
      } else if (fairy.captured) {
        fairy.updateVelocity(this.blackHole);
      } else {
        fairy.updateVelocityFree();
      }
      if (fairy.saved) {
        this.savedFairies++;
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
    // this.orbitalSpeed = 0.6;
    // this.pullback = 5;
    // this.drag = 0.95;
    this.orbitalSpeed = 0.3;
    this.pullback = 10;
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

  isCaptured(blackHole) {
    let distance = dist(this.x, this.y, blackHole.x, blackHole.y)
    if (distance <= blackHole.attractionRad && !this.saved) {
      this.captured = true;
      blackHole.capturedFairies++;
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
    } else if (round(distance) == round(R)) {
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
    if (this.saved) {
      // this.x = this.savedCenterX + this.rad * cos(this.angle)
      // this.y = this.savedCenterY + this.rad * sin(this.angle)
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
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
      drawCol[2] = 20;
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
    this.repulsionRad = this.size * 2;
    this.recaptureChance = 0.4;
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
    this.initialSize = this.size;
    this.v = random(this.vMax);
    this.shrinkGuide = 0.1;
    this.capturedFairies = 0;
    this.growFac = 10;

    this.col = [150, 10, 10]
  }

  interact(guide) {
    if (dist(this.x, this.y, guide.x, guide.y) <= this.attractionRad + guide.attractionRad &&
      guide.attractionRad >= guide.minRad) {
      guide.attractionRad -= this.shrinkGuide;
    }
  }

  grow() {
    this.size = this.initialSize + this.capturedFairies * this.growFac;
    this.capturedFairies = 0;
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