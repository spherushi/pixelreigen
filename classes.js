const state = {
  opponent: false
}

function hsbToRgb(hsb) {
  let col = color(`hsba(${hsb[0]}, ${hsb[1]}%, ${hsb[2]}%, 1)`)
  push()
  colorMode(RGB);
  let theRed = red(col);
  let theGreen = green(col);
  let theBlue = blue(col);

  let rgb_col = [theRed, theGreen, theBlue]
  pop()

  return rgb_col;
}

class Timer {
  constructor(durationInSeconds) {
    this.timeStart = millis()
    this.timeEnd = millis() + (durationInSeconds * 1000);
  }

  isOver() {
    return (millis() >= this.timeEnd);
  }
}

class Environment {
  constructor(nFairies) {
    this.skyCol = [240, 12, 10];
    // fairies
    this.nFairies = nFairies;
    this.savedFairies = 0;
    this.capturedFairies = 0;
    this.fairies = [];
    this.fairySpawnTime = 10;  // s
    this.spawnTimer = new Timer(this.fairySpawnTime);
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
    this.timeInOasis = 0;  // s
    this.timeToRelease = 1 * 60;  // s

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
    this.spawnTimer = new Timer(this.fairySpawnTime);
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
    this.oasis.move();
    if (state.opponent) {
      this.blackHole.move();
      // blackhole may shrink guide radius:
      this.blackHole.interactGuide(this.guide);
      this.blackHole.interactOasis(this.oasis);
      this.blackHole.grow(this.capturedFairies);
      if (this.capturedFairies <= 1) {
        this.blackHole.follow(this.guide)
      }
    }
    // oasis saves fairies after hover duration 
    if (this.guide.withinOasis(this.oasis)) {
      this.timeInOasis++;
      let canBeSaved = this.timeInOasis > this.timeToRelease
      this.oasis.interact(this.guide, this.fairies, canBeSaved)
    } else {
      this.timeInOasis = 0;
    }
    // this.oasis.interact(this.guide, this.fairies)
    this.savedFairies = 0;
    this.capturedFairies = 0;
    for (let fairy of this.fairies) {
      fairy.moveAll(this.dt, this.oasis);
      fairy.update(this.guide, this.blackHole)
      if (fairy.saved) {
        this.savedFairies++;
      } else if (fairy.captured && state.opponent) {
        this.capturedFairies++;
      }
    }
    if (this.oasis.isFull()) {
      this.oasis.reset();
    }
    if (this.spawnTimer.isOver()) {
      this.fairies.push(new Fairy(this.guide))
      this.spawnTimer = new Timer(this.fairySpawnTime)
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
      if (state.opponent) {
        this.blackHole.draw(0.8);
      }
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
    this.x = random(width);
    this.y = random(height);
    this.vMax = 10
    this.vx = random(this.vMax) - 1;
    this.vy = random(this.vMax) - 1;
    // movement variables
    this.orbitalSpeed = 10;
    this.pullback = 90;
    this.drag = 0.95;
    this.forceConst = 5;

    // visual
    this.size = 2.5;
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

    // state variables
    this.captured = false;
    this.guided = false;
    this.released = false;
    // when saved
    this.saved = false;
    this.rad = map(random(), 0, 1, guide.size + 1, guide.attractionRad)
    this.ogRad = this.rad;
    this.phase = random(TWO_PI)
    this.savedCenterX = 0;
    this.savedCenterY = 0;
    this.danceTimer = new Timer(0);
    this.angle = random(TWO_PI);

  }


  update(guide, blackHole) {
    this.isGuided(guide);
    if (state.opponent) {
      this.isCaptured(blackHole)
    }
    if (this.guided) {
      this.updateVelocity(guide);
    } else if (this.captured) {
      this.updateVelocity(blackHole);
    } else {
      this.updateVelocityFree();
    }
    if (this.saved) {
      this.rad = this.ogRad * sin(millis() / 1000 + this.phase)
      if (!this.danceTimer.isOver()) {
        this.rad *= 2;
      }
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

  updateAccel(guide) {
    const damp_accel = 1;
    const damp_orbit = 1;
    const damp_rand = 1;
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

    return { ax: ax, ay: ay }
  }

  updateVelocity(guide) {
    const inertia = 0;
    const min_speed = 0.01;
    const max_speed = 50;
    let accel = this.updateAccel(guide)

    // apply acceleration to velocities
    this.vx = this.vx * inertia + accel.ax * (1 - inertia);
    this.vy = this.vy * inertia + accel.ay * (1 - inertia);

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

  moveAll(dt, oasis) {
    this.move(dt)
    this.moveSaved(oasis)
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

  withinOasis(oasis) {
    let xRange = (this.x >= oasis.x - oasis.size) &&
      (this.x <= oasis.x + oasis.size)
    let yRange = (this.y >= oasis.y - oasis.size) &&
      (this.y <= oasis.y + oasis.size)
    return (xRange && yRange)
  }

  collideOasis(oasis) {
    if (this.withinOasis(oasis)) {
      this.x += oasis.size * (random() <= 0.5 ? -1 : 1)
      this.y += oasis.size * (random() <= 0.5 ? -1 : 1)
    }
  }

  isCaptured(blackHole) {
    let distance = dist(this.x, this.y, blackHole.x, blackHole.y)
    if (distance <= blackHole.attractionRad && !this.saved) {
      this.captured = true;
      this.drag = 0.5;
      blackHole.capturedFairies++;
    } else {
      this.drag = 0.95
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

  isSaved(guide) {
    this.x = guide.x + guide.size;
    this.y = guide.y + guide.size;
    this.savedCenterX = guide.x;
    this.savedCenterY = guide.y;
    this.rad = guide.size
    this.ogRad = this.rad;
    this.saved = true;
    this.guided = false;
    this.danceTimer = new Timer(8);
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
    if (this.saved && !this.danceTimer.isOver()) {
      push()
      fill([...drawCol, 0.05])
      circle(this.x, this.y, this.size * 5)
      fill([...drawCol, 0.1])
      circle(this.x, this.y, this.size * 4)
      fill([...drawCol, 0.3])
      circle(this.x, this.y, this.size * 2)
      pop()
    } else {
      circle(this.x, this.y, this.size)
    }
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
    this.recaptureChance = 0.6;
    this.minRad = this.size;
    this.col = [49, 100, 76]  // HSB col
    this.displayCol = hsbToRgb(this.col)  // HSL !!! COLOR !!!
    console.log(this.displayCol)
    this.gradient = this.setGradient(0.2)
  }

  move() {
    this.x = mouseX;
    this.y = mouseY;
  }

  withinOasis(oasis) {
    let xRange = (this.x >= oasis.x - oasis.size) &&
      (this.x <= oasis.x + oasis.size)
    let yRange = (this.y >= oasis.y - oasis.size) &&
      (this.y <= oasis.y + oasis.size)
    return (xRange && yRange)
  }

  setGradient(midStop) {
    let myGradient = drawingContext.createRadialGradient(
      this.x, this.y, 0,   // inner rad
      this.x, this.y, this.attractionRad);  // outer rad
    // !!! THIS IS NOT HSB !!!
    // let colorString = "hsla(" + this.displayCol[0] + ", " + this.displayCol[1] + "%, " + this.displayCol[2] + "%, "
    let colorString = "rgba(" + this.displayCol[0] + ", " + this.displayCol[1] + ", " + this.displayCol[2] + ", "
    myGradient.addColorStop(0, colorString + '1)');
    myGradient.addColorStop(midStop, colorString + '0.4)');
    // myGradient.addColorStop(0.8, colorString + '0.1)');
    myGradient.addColorStop(1, colorString + '0)');

    return myGradient;
  }

  draw(midStop = 0.2) {
    push()
    colorMode(RGB)
    noStroke();
    fill(this.displayCol)
    drawingContext.fillStyle = this.gradient;
    // drawingContext.strokeStyle = 'hsla(0, 100%, 50%, 1)';
    circle(this.x, this.y, this.attractionRad)
    this.gradient = this.setGradient(midStop)

    colorMode(HSB, 360, 100, 100, 1)
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

    this.displayCol = [150, 0, 0]
  }

  collideOasis(oasis) {
    console.log("collide")
    let dx = this.x - oasis.x;
    let dy = this.y - oasis.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDist = (oasis.size + this.attractionRad) / 2;

    let nx = dx / distance;
    let ny = dy / distance;

    oasis.x -= nx * minDist;
    oasis.y -= ny * minDist;
    this.x += nx * minDist;
    this.y += ny * minDist;

    oasis.vx = -oasis.vx;
    oasis.vy = -oasis.vy;
    this.vx = -this.vx;
    this.vy = -this.vy;

  }

  interactOasis(oasis) {
    if (dist(this.x, this.y, oasis.x, oasis.y) <= this.attractionRad + oasis.size) {
      this.collideOasis(oasis)
    }
  }

  interactGuide(guide) {
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
    if (this.y <= guide.y) {
      this.y += this.vMax;
    } else {
      this.y -= this.vMax;
    }
  }

  grow(capturedFairies) {
    this.size = Math.min(this.initialSize + capturedFairies * this.growFac, width / 3);
    this.attractionRad = this.size;
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
    this.sizeIncrement = 1;
    // this.size = map(random(), 0, 1, this.minSize, this.maxSize)
    this.size = this.minSize;
    this.x = random(this.size, width - this.size);
    this.y = random(height);
    this.vMin = 1;
    this.vMax = 2;
    this.absoluteVMax = 7;
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random((this.vMax - this.vx) * 2) - (this.vMax - this.vx);
    this.fairyCapacity = map(random(), 0, 1, 5, 10)
    this.currentlySaved = 0;
    this.colOptions = colors;
    this.bounces = 0;
    this.bounceMax = 15;
    this.setColor();
  }

  increaseSize() {
    this.size += this.sizeIncrement;
  }

  reset() {
    this.increaseSize();
    this.vMax = Math.min(this.vMax++, this.absoluteVMax);
    this.x = random(this.size, width - this.size);
    this.y = random(this.size, height - this.size);
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random((this.vMax - this.vx) * 2) - (this.vMax - this.vx);
    this.fairyCapacity = map(random(), 0, 1, 1, 10)
    this.currentlySaved = 0;
    this.bounces = 0;
    this.setColor();
  }

  isFull() {
    return this.currentlySaved >= this.fairyCapacity;
  }

  setColor() {
    this.col = [0, 100, 100]
    if (this.colOptions.length > 0) {
      this.col = this.colOptions[Math.floor(random(this.colOptions.length))]
    }
  }

  bounceOffWalls() {
    if (this.x + this.size >= width) {
      this.x = width - this.size;
      this.vx *= (-1 * (random() + 0.5));
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
    // ensure speed is managable
    if (abs(this.vx) < this.vMin) {
      this.vx = this.vMin;
    } else if (abs(this.vy) < this.vMin) {
      this.vy = this.vMin;
    }
    if (abs(this.vx) + abs(this.vy) > this.absoluteVMax) {
      this.vx = this.absoluteVMax - abs(this.vy);
    }
  }

  move() {
    this.x += this.vx;
    this.y += this.vy;
    this.bounceOffWalls();
  }

  interact(guide, fairies, canBeSaved) {
    if (guide.withinOasis(this)) {
      for (let fairy of fairies) {
        if (fairy.col[0] == this.col[0] &&
          fairy.guided &&
          canBeSaved &&
          !this.isFull()) {
          fairy.isSaved(this);
          this.currentlySaved++;
          this.increaseSize();
        } else if (fairy.col[0] != this.col[0]) {
          fairy.collideOasis(this)
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