const state = {
  opponent: true,
  gameOver: false,
  won: false,
  // colors:
  availableColors: [],
  current_col: []
}

function hsbToRgb(hsb) {
  // needed to achieve transparency gradient
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
    // player & opponent & PIXLIES <3
    this.guide = new Guide();
    this.blackHole = new BlackHole();
    state.availableColors = [];
    this.initialiseFairies();
    this.guide.updateCol();
    // goal
    this.oasis = new Oasis(state.current_col, this.fairies);
    this.timeInOasis = 0;  // s
    this.timeToRelease = 1 * 60;  // s
    // animation parameters
    this.dt = 0.1
  }

  initialiseFairies() {
    for (let i = 0; i < this.nFairies; i++) {
      let fairy = new Fairy(this.guide);
      if (this.colorAvailable(fairy)) {
        state.availableColors.push(fairy.col)
      }
      this.fairies.push(fairy);
    }
  }

  reset() {
    // reset elements
    this.nFairies = 20;
    this.fairies = [];
    this.savedFairies = 0;
    this.capturedFairies = 0;
    this.spawnTimer = new Timer(this.fairySpawnTime);
    this.guide = new Guide();
    this.blackHole = new BlackHole();
    state.availableColors = [];
    this.initialiseFairies();
    this.guide.updateCol();
    this.oasis = new Oasis(state.current_col, this.fairies);
    // reset state
    state.gameOver = false;
    state.won = false;
  }

  addFairy() {
    this.fairies.push(new Fairy(this.guide))
    this.nFairies++;
    this.fetchColors();
  }

  releaseFairies() {
    for (let fairy of this.fairies) {
      if (fairy.guided) {
        fairy.release(this.guide);
      }
    }
  }

  fetchColors() {
    state.availableColors = [];
    for (let fairy of this.fairies) {
      if (!fairy.saved && this.colorAvailable(fairy)) {
        state.availableColors.push(fairy.col)
      }
    }
  }

  update() {
    // move elements
    this.guide.move()
    this.oasis.move();
    if (state.opponent && !state.won) {
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
    if (this.guide.withinOasis(this.oasis) && !state.won) {
      let canBeSaved = this.timeInOasis > this.timeToRelease
      this.oasis.interact(this.guide, this.fairies, canBeSaved)
      this.timeInOasis++;
    } else {
      this.timeInOasis = 0;
    }
    // update fairies
    this.savedFairies = 0;
    this.capturedFairies = 0;
    for (let fairy of this.fairies) {
      fairy.update(this.guide, this.blackHole, this.dt, this.oasis)
      if (fairy.saved) {
        this.savedFairies++;
        this.fetchColors();
      } else if (fairy.captured && state.opponent) {
        this.capturedFairies++;
      }
    }
    if (!state.won && this.oasis.isFull()) {
      this.oasis.reset();
      this.guide.updateCol();
      this.oasis.col = this.guide.col;
      this.oasis.updateCapacity(this.fairies);
    }
    // How to LOSE?
    if (!state.won && this.guide.attractionRad <= this.guide.minRad) {
      state.gameOver = true;
    }
    if (this.savedFairies == this.fairies.length) {
      state.won = true;
    }
    if (!state.gameOver && !state.won &&
      this.spawnTimer.isOver()) {
      this.addFairy();
      this.spawnTimer = new Timer(this.fairySpawnTime)
    }
  }

  draw() {
    background(this.skyCol);
    if (!state.gameOver && !state.won) {
      this.oasis.draw();
      for (let fairy of this.fairies) {
        fairy.draw();
      }
      this.guide.draw();
      if (state.opponent) {
        this.blackHole.draw(0.8);
      }
    } else if (state.gameOver) {
      let bgCol = [this.skyCol[0], this.skyCol[1], 12]
      background(bgCol)
      this.blackHole.attractionRad = width / 2;
      this.blackHole.x = width / 2;
      this.blackHole.y = height / 2;
      // this.blackHole.displayCol = hsbToRgb([240, 10, 40])
      this.blackHole.draw(0.8);
      for (let fairy of this.fairies) {
        fairy.col[1] = 10;
        fairy.col[2] = 10;
        fairy.captured = true;
        fairy.saved = false;
        fairy.guided = false;
        fairy.draw();
      }
      push()
      fill([240, 12, 12])
      textSize(40)
      textFont(gameOverFont);
      // let ts1 = "only the void"
      let ts1 = "ONLY THE VOID"
      let ts1_w = textWidth(ts1)
      let ts2 = "REMAINS"
      let ts2_w = textWidth(ts2)
      text(ts1, width / 2 - ts1_w / 2, height / 2)
      text(ts2, width / 2 - ts2_w / 2, height / 2 + 40)
      // text("GAME OVER", width / 2 - ts / 2, height / 2)
      pop()
    } else {
      // won
      push()
      // stroke(this.guide.col);
      fill(this.guide.col)
      textSize(40);
      let ts = textWidth("All pixlies are safe!")
      text("All pixlies are safe!", width / 2 - ts / 2, height / 2)
      pop()
      this.oasis.draw();
      for (let fairy of this.fairies) {
        fairy.saved = true;
        fairy.danceTimer = new Timer(100);
        fairy.draw();
      }
    }
  }

  // helper functions
  colorAvailable(fairy) {
    let available = true;
    for (let col of state.availableColors) {
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
    this.displayCol = [this.col[0], 40, 50];

    // state variables
    this.captured = false;
    this.guided = false;
    this.released = false;
    this.waveToGuide = false;
    // when saved
    this.saved = false;
    this.rad = map(random(), 0, 1, guide.size + 1, guide.attractionRad)
    this.ogRad = this.rad;
    this.phase = random(TWO_PI)
    this.savedCenterX = 0;
    this.savedCenterY = 0;
    this.danceTimer = new Timer(0);
    this.angle = random(TWO_PI);
    this.rotDir = random() <= 0.5 ? 1 : -1;

  }

  update(guide, blackHole, dt, oasis) {
    this.moveAll(dt, oasis);
    this.isGuided(guide);
    this.isCloseToGuide(guide);
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
      this.angle += TWO_PI / 100 * this.rotDir;
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

  clipWalls() {
    if (this.x - this.size <= 0) {
      this.x = this.size;
    } else if (this.x + this.size >= width) {
      this.x = width - this.size;
    } if (this.y - this.size <= 0) {
      this.y = this.size;
    } else if (this.y + this.size >= height) {
      this.y = height - this.size;
    }
  }

  moveAll(dt, oasis) {
    this.move(dt)
    this.moveSaved(oasis)
    this.clipWalls();
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
      this.displayCol = [this.col[0], 10, 30]
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
      !this.saved &&
      this.col[0] == guide.col[0]) {
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

  isCloseToGuide(guide) {
    let distance = dist(guide.x, guide.y, this.x, this.y)
    if (distance <= guide.attractionRad * 4 &&
      this.col[0] == guide.col[0] &&
      !this.guided &&
      !this.saved &&
      !this.captured) {
      this.waveToGuide = true;
    } else {
      this.waveToGuide = false;
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
    this.displayCol = [...this.col];
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

  shine() {
    push()
    fill([...this.displayCol, 0.05])
    circle(this.x, this.y, this.size * 5)
    fill([...this.displayCol, 0.1])
    circle(this.x, this.y, this.size * 4)
    fill([...this.displayCol, 0.3])
    circle(this.x, this.y, this.size * 2)
    pop()
  }

  draw() {
    push()
    noStroke()
    fill(this.displayCol)
    if (this.saved && !this.danceTimer.isOver() ||
      this.waveToGuide) {
      this.shine()
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
    this.gradient = this.setGradient(0.2)
  }

  updateCol() {
    if (state.availableColors.length > 0) {
      this.col = state.availableColors[Math.floor(random(state.availableColors.length))]
      this.displayCol = hsbToRgb(this.col)  // HSL !!! COLOR !!!
      state.current_col = this.col;
    }
  }

  clipWalls() {
    if (this.x - this.size <= 0) {
      this.x = this.size;
    } else if (this.x + this.size >= width) {
      this.x = width - this.size;
    } if (this.y - this.size <= 0) {
      this.y = this.size;
    } else if (this.y + this.size >= height) {
      this.y = height - this.size;
    }
  }

  move() {
    this.x = mouseX;
    this.y = mouseY;
    this.clipWalls();
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
    circle(this.x, this.y, this.attractionRad)
    this.gradient = this.setGradient(midStop)
    colorMode(HSB, 360, 100, 100, 1)
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
    this.m = 1;
    this.growFac = 10;

    this.col = [150, 0, 0];
    this.displayCol = hsbToRgb(this.col);
  }

  collideOasis(oasis) {
    let dx = this.x - oasis.x;
    let dy = this.y - oasis.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDist = (oasis.size + this.attractionRad) / 3;

    let nx = dx / distance;
    let ny = dy / distance;

    oasis.x -= nx * minDist * this.m / oasis.m;
    oasis.y -= ny * minDist * this.m / oasis.m;
    this.x += nx * minDist * oasis.m / this.m;
    this.y += ny * minDist * oasis.m / this.m;

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
    this.m = Math.max(1, capturedFairies);
  }

  move() {
    this.x += map(random(), 0, 1, -this.vMax, this.vMax)
    this.y += map(random(), 0, 1, -this.vMax, this.vMax)
    this.clipWalls();
  }

}

class Oasis {
  constructor(color, fairies) {
    this.minSize = 15;
    this.maxSize = 50;
    this.sizeIncrement = 1;
    this.size = this.minSize;
    this.x = random(this.size, width - this.size);
    this.y = random(height);
    this.m = 1;
    this.vMin = 1;
    this.vMax = 2;
    this.absoluteVMax = 6;
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random((this.vMax - this.vx) * 2) - (this.vMax - this.vx);
    this.col = color;
    this.fairyCapacity = 0;
    this.updateCapacity(fairies);
    this.currentlySaved = 0;
    this.bounces = 0;
    this.bounceMax = 15;
  }

  increaseSize() {
    this.size += this.sizeIncrement;
    this.m = Math.max(1, this.currentlySaved);
  }

  reset() {
    this.increaseSize();
    this.vMax = Math.min(this.vMax++, this.absoluteVMax);
    this.x = random(this.size, width - this.size);
    this.y = random(this.size, height - this.size);
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random((this.vMax - this.vx) * 2) - (this.vMax - this.vx);
    this.fairyCapacity = map(random(), 0, 1, 2, 10)
    this.currentlySaved = 0;
    this.bounces = 0;
  }

  updateCapacity(fairies) {
    let ctr = 0;
    for (let fairy of fairies) {
      if (!fairy.saved && fairy.col[0] == this.col[0]) {
        ctr++;
      }
    }
    this.fairyCapacity = ctr;
  }

  isFull() {
    if (this.currentlySaved >= this.fairyCapacity) {
    }
    return this.currentlySaved >= this.fairyCapacity;
  }

  setColor() {
    if (this.colOptions.length > 0) {
      this.col = this.colOptions[Math.floor(random(this.colOptions.length))]
    }
  }

  bounceOffWalls() {
    if (this.x + this.size >= width) {
      this.x = width - this.size;
      this.vx *= (-1 * (random() + 0.5));
      // this.setColor();
      this.bounces++;
    } else if (this.x - this.size <= 0) {
      this.x = this.size;
      this.vx *= -1 * (random() + 0.5);
      // this.setColor();
      this.bounces++;
    }
    if (this.y + this.size >= height) {
      this.y = height - this.size;
      this.vy *= -1 * (random() + 0.5);
      // this.setColor();
      this.bounces++;
    } else if (this.y - this.size <= 0) {
      this.y = this.size;
      this.vy *= -1 * (random() + 0.5);
      // this.setColor();
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