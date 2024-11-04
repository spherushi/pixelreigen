const state = {
  started: false,
  opponent: true,
  gameOver: false,
  won: false,
  level: 0,
  // colors:
  availableColors: [],
  current_col: [],
  // text:
  infoFontSize: 20
}

const levelParms = [
  // level 0
  {
    opponent: false,
    nFairies: 3
  },
  // level 1
  {
    opponent: true,
    nFairies: 15
  }
]

function updateState() {
  let level = state.level;
  state.opponent = levelParms[level].opponent;
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

// function to add fairies for info splash screen
function addInfoFairy(i, environment) {
  let infoFairy = new Fairy(environment.guide)
  infoFairy.x = width / 8 + random(width * 6 / 8)
  if (i == 0 || i == 1) {
    let sign = random() < 0.5 ? -1 : 1
    infoFairy.x = width * 2 / 3 + sign * random(10)
    infoFairy.y = height / 4 + state.infoFontSize * 7 + sign * random(10)
    infoFairy.captured = true
  } else if (i == 2 || i == 3 || i == 4) {
    infoFairy.x = width / 3
    infoFairy.y = height / 2 - state.infoFontSize
    if (i == 3) {
      infoFairy.guided = true
      infoFairy.x += random(50)
      infoFairy.y += random(50)
    } else if (i == 4) {
      infoFairy.x = width / 2 + 5 * state.infoFontSize
      infoFairy.y = height / 2 + 3 * state.infoFontSize
    }
    infoFairy.col = environment.guide.col
    infoFairy.waveToGuide = true
  } else if (random() < 0.5) {
    infoFairy.y = height / 9 + random(height / 8 - 20)
  } else {
    infoFairy.y = height / 4 + 6 * state.infoFontSize
      + random(height / 8)
  }
  environment.instructionalFairies.push(infoFairy)
}

// text for counting how many pixlies are saved during game
function scoreText(environment) {
  let scoreText = "pixlies saved: " + environment.savedFairies + "/" + environment.fairies.length;
  let margin = 10
  push()
  textFont(infoFont)
  textSize(20)
  fill(environment.guide.col)
  text(scoreText, 10, height - margin)
  pop()
}

function instructionText(environment) {
  let textBoxWidth = width / 3
  let x_fairy = (width - textBoxWidth) / 2
  let y_fairy = height / 4
  push()
  textFont(infoFont)
  textSize(state.infoFontSize)
  fill(environment.guide.col)
  textAlign(CENTER)
  if (!state.opponent) {
    for (let fairy of environment.instructionalFairies) {
      fairy.updateVelocityFree();
      if (fairy.guided) {
        fairy.updateVelocity(environment.guide)
      }
      fairy.move(environment.dt)
      fairy.isCaptured(environment.blackHole)
      if (fairy.waveToGuide) {
        fairy.isGuided(environment.guide)
        fairy.displayCol = environment.guide.col
      }
      fairy.draw()
    }
    let infoFairies = "The pixlies are lost in the dark"
    text(infoFairies, x_fairy, y_fairy, textBoxWidth)
    let textGuide = "Collect resonating pixlies"
    environment.guide.x = width / 4
    environment.guide.y = height / 2 + state.infoFontSize
    environment.guide.draw()
    text(textGuide, width / 3 + 20, height / 2 + state.infoFontSize, textBoxWidth + 10)

    let textOasis = "and guide them to the oasis to keep them safe"
    environment.oasis.x = width * 3 / 4
    environment.oasis.y = height * 3 / 4 - state.infoFontSize
    environment.oasis.draw()
    text(textOasis, width / 4, 3 / 4 * height - state.infoFontSize * 3, textBoxWidth * 1.6)

  } else {
    let infoVoid = "The pixlies are in danger of being sucked into the void"
    let y_void = y_fairy + 4 * state.infoFontSize
    text(infoVoid, x_fairy / 2, y_void, textBoxWidth * 2)
    environment.blackHole.x = x_fairy * 2
    environment.blackHole.y = y_void + state.infoFontSize * 3
    environment.blackHole.draw()
  }

  pop()
}

