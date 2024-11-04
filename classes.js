class Environment {
  constructor(nFairies) {
    this.skyCol = [240, 12, 10];
    // fairies
    this.nFairies = nFairies;
    this.savedFairies = 0;
    this.capturedFairies = 0;
    this.fairies = [];
    this.instructionalFairies = [];
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
      // add fairies for info screen
      addInfoFairy(i, this)
    }
  }

  reset() {
    // reset elements
    updateState()
    this.nFairies = levelParms[state.level].nFairies;
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
    if (state.started) {
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
        this.oasis.indicateTransfer = false;
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
      if (!state.gameOver && !state.won &&
        this.spawnTimer.isOver() &&
        state.level >= 1) {
        this.addFairy();
        this.spawnTimer = new Timer(this.fairySpawnTime)
      }
      // How to LOSE?
      if (!state.won && this.guide.attractionRad <= this.guide.minRad) {
        state.gameOver = true;
        state.level = 0;
      }
      // WIN
      if (!state.won && this.savedFairies == this.fairies.length &&
        state.level >= 1) {
        state.won = true;
        // use blackHole col to update text:
        this.blackHole.col = [...this.guide.col]
      } else if (!state.won && this.savedFairies == this.fairies.length &&
        state.level == 0) {
        state.level = 1;
        state.started = false;
        updateState();
        this.reset();
      }
      if (state.won) {
        this.oasis.expand();
        if (this.spawnTimer.isOver()) {
          let newFairy = new Fairy(this.guide);
          newFairy.displayCol = newFairy.col;
          this.fairies.push(newFairy)
          this.spawnTimer = new Timer(2);
        }
      }
    }
  }

  draw() {
    background(this.skyCol);
    if (!state.started) {
      instructionText(this)
    }
    else if (!state.gameOver && !state.won) {
      scoreText(this);
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
      this.blackHole.draw(0.8);
      for (let fairy of this.fairies) {
        fairy.col[1] = 10;
        fairy.col[2] = 10;
        fairy.captured = true;
        fairy.saved = false;
        fairy.guided = false;
        fairy.draw();
      }
      this.writeGameOverText();
    } else {
      // won
      this.oasis.draw();
      this.writeGameWonText();
      for (let fairy of this.fairies) {
        fairy.saved = true;
        fairy.danceTimer = new Timer(100);
        fairy.draw();
      }
    }
  }

  // helper functions
  writeGameWonText() {
    push()
    if (round(frameCount) % 30 == 0) {
      this.blackHole.col[0] = (this.blackHole.col[0] + 7) % 360;
    }
    fill(this.blackHole.col);
    textSize(40);
    let winText = "All pixlies are safe!"
    winText = "Thanks for saving us!"
    let ts = textWidth(winText)
    text(winText, width / 2 - ts / 2, height / 2)
    pop()
  }

  writeGameOverText() {
    push()
    fill([240, 12, 12])
    textSize(40)
    textFont(gameOverFont);
    let ts1 = "ONLY THE VOID"
    let ts1_w = textWidth(ts1)
    let ts2 = "REMAINS"
    let ts2_w = textWidth(ts2)
    text(ts1, width / 2 - ts1_w / 2, height / 2)
    text(ts2, width / 2 - ts2_w / 2, height / 2 + 40)
    pop()
  }

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
    let colorString = "rgba(" + this.displayCol[0] + ", " + this.displayCol[1] + ", " + this.displayCol[2] + ", "
    myGradient.addColorStop(0, colorString + '1)');
    myGradient.addColorStop(midStop, colorString + '0.4)');
    myGradient.addColorStop(1, colorString + '0)');

    return myGradient;
  }

  draw(midStop = 0.2) {
    push()
    colorMode(RGB)
    noStroke();
    fill(this.displayCol)
    drawingContext.fillStyle = this.gradient;
    this.gradient = this.setGradient(midStop)
    circle(this.x, this.y, this.attractionRad)
    colorMode(HSB, 360, 100, 100, 1)
    pop()
  }
}

class BlackHole extends Guide {
  constructor() {
    super()
    this.x = random(width);
    this.y = random(height);
    this.vMax = 1.5;
    this.initialSize = this.size;
    this.v = random(this.vMax);
    this.shrinkGuide = 0.1;
    this.suckedLight = 0;
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
      this.suckedLight += this.shrinkGuide;
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
    this.attractionRad = this.size + this.suckedLight;
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
    this.absoluteVMax = 4;
    this.vx = random(this.vMax * 2) - this.vMax;
    this.vy = random((this.vMax - this.vx) * 2) - (this.vMax - this.vx);
    this.col = color;
    this.fairyCapacity = 0;
    this.updateCapacity(fairies);
    this.currentlySaved = 0;
    this.bounces = 0;
    this.bounceMax = 15;
    this.indicateTransfer = false;
    this.ogSize = this.size;
    this.angleIncrement = 5;
    this.angle = this.angleIncrement;
  }

  expand() {
    // used for quickly expanding oasis if game won
    for (let i = 0; i < 3; i++) {
      this.increaseSize();
    }
  }

  increaseSize() {
    this.size += this.sizeIncrement;
    this.ogSize = this.size;
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
    this.angle = this.angleIncrement;
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

  spansScreen() {
    return (this.size * 2 >= width && this.size * 2 >= height)
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
    for (let fairy of fairies) {
      if (fairy.col[0] == this.col[0] &&
        fairy.guided) {
        // if correct fairy is guided and guide is on oasis
        this.indicateTransfer = true;
        if (canBeSaved &&
          !this.isFull()) {
          // if enough time has passed hovering 
          // over the oasis and oasis has capacity
          this.indicateTransfer = false;
          fairy.isSaved(this);
          this.currentlySaved++;
          this.increaseSize();
        }
      } else if (fairy.col[0] != this.col[0]) {
        fairy.collideOasis(this)
      }
    }
  }

  draw() {
    push()
    colorMode(HSB)
    noStroke()
    if (this.indicateTransfer) {
      fill([...this.col, 0.5])
      rect(this.x, this.y, this.size * 2, this.size * 2,
        this.size, this.size, this.size, this.size)
    }
    fill(this.col);
    if (!state.won) {
      rect(this.x, this.y, this.size, this.size,
        this.size / 2, this.size / 2, this.size / 2, this.size / 2)
    } else {
      rect(this.x, this.y, this.size)
    }
    pop()
  }
}