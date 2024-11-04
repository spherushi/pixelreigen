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
    this.recaptured = false;
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
    this.isCloseToGuide(guide);
    if (state.opponent) {
      this.isCaptured(blackHole)
    }
    this.isGuided(guide);
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
    if (state.won && oasis.spansScreen()) {
      this.moveWon();
    } else {
      this.move(dt)
      this.moveSaved(oasis)
    }
    this.clipWalls();
  }

  move(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  moveSaved(oasis) {
    if (this.saved) {
      this.x = oasis.x + this.rad * cos(this.angle)
      this.y = oasis.y + this.rad * sin(this.angle)
    }
  }

  moveWon() {
    this.x += random(5) * (random() <= 0.5 ? -1 : 1);
    this.y += random(2) * (random() <= 0.5 ? -1 : 1);
    this.y += 3 * sin(this.angle)
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
    if (distance <= blackHole.attractionRad && 
      !this.recaptured &&
      !this.saved) {
      this.captured = true;
      this.displayCol = [this.col[0], 10, 30]
      this.drag = 0.5;
      blackHole.capturedFairies++;
    } else {
      this.drag = 0.95
    }
    if (distance >= blackHole.attractionRad * 2) {
      this.recaptured = false;
    }
  }

  isGuided(guide) {
    let distance = dist(this.x, this.y, guide.x, guide.y)
    if (distance <= guide.attractionRad &&
      !this.released &&
      !this.saved &&
      this.col[0] == guide.col[0]) {
      // can we reclaim pixly from the void?
      if (this.captured) {
        this.guided = random() <= guide.recaptureChance ? true : false;
        if (this.guided) {
          this.captured = false;
          this.recaptured = true;
        }
        // if nothing interferes, we guide the pixly
      } else {
        this.guided = true;
      }
    } else if (distance > guide.attractionRad * 2) {
      this.released = false;  // adds a delay to recapturing pixlies
    } else if (this.col[0] != guide.col[0]) {
      // otherwise oasis changing color due to fulness
      // can leave pixly guided even though it shouldn't be
      this.guided = false;
    }
  }

  isCloseToGuide(guide) {
    let distance = dist(guide.x, guide.y, this.x, this.y)
    if (distance <= guide.attractionRad * 4 &&
      this.col[0] == guide.col[0] &&
      !this.guided &&
      !this.saved) {
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

  shineBrighter() {
    push()
    fill([...this.displayCol, 0.05])
    circle(this.x, this.y, this.size * 5)
    fill([...this.displayCol, 0.3])
    circle(this.x, this.y, this.size * 4)
    fill([...this.displayCol, 0.8])
    circle(this.x, this.y, this.size * 2)
    fill(this.displayCol)
    circle(this.x, this.y, this.size)
    pop()
  }

  draw() {
    push()
    noStroke()
    fill(this.displayCol)
    if (this.saved && !this.danceTimer.isOver() && !state.won ||
      this.waveToGuide) {
      this.shine()
    } else if (state.won) {
      this.shineBrighter()
    } else {
      circle(this.x, this.y, this.size)
    }
    pop()
  }
}
