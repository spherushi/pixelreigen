
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
      if (fairy.guided) {
        // attract fairies?
        fairy.getForce(this.guide);
        // fairy.attachTo(this.guide)
      }
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
    this.vMax = 5
    this.vx = random(this.vMax) - 1;
    this.vy = random(this.vMax) - 1;
    this.fx = 0;
    this.fy = 0;

    this.size = 5;
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

  getForce(guide) {
    // get distances and normal vectors
    const dx = guide.x - this.x;
    const dy = guide.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy)
    const safeDist = Math.max(distance, guide.size);  // no infinity forces
    const normal_x = dx / safeDist
    const normal_y = dy / safeDist
    const tangent_x = -normal_y;
    const tangent_y = normal_x;
    // this is needed to have a possibility of a stable orbit
    let orbitalSpeed = Math.sqrt((guide.m * this.forceConst) / this.rad)
    this.vx = normal_x * orbitalSpeed
    this.vy = normal_y * orbitalSpeed

    // this.vx = tangent_x * orbitalSpeed
    // this.vy = tangent_y * orbitalSpeed

    // define force
    const fg = (this.forceConst * this.m * guide.m) / (distance * distance); // g * (Mm) / r**2
    const f_zp = (orbitalSpeed * orbitalSpeed) / distance // v**2 / r
    const f_repulsive = -2 *fg;
    // const f_repulsive = 0;
    let force = fg // +f_zp
    if (distance < guide.repulsionRad) {
      force += f_repulsive;
    }
    this.fx = force * normal_x;
    this.fy = force * normal_y;
  }

  move(dt) {
    if (this.guided) {
      // this.angle += TWO_PI / 100;
      this.vx += (this.fx / this.m) * dt
      this.vy += (this.fy / this.m) * dt
    } else {
      this.vx = random(this.vMax) * (random() > 0.5 ? 1 : -1);
      this.vy = random(this.vMax) * (random() > 0.5 ? 1 : -1);
    }
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
    this.size = 20;
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

