/*
     This file is part of pixelreigen.

    Pixelreigen is free software: you can redistribute it and/or modify it 
    under the terms of the GNU General Public License as published by the 
    Free Software Foundation, either version 3 of the License, or 
    (at your option) any later version.

    Pixelreigen is distributed in the hope that it will be useful, 
    but WITHOUT ANY WARRANTY; without even the implied warranty of 
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
    See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License 
    along with Foobar. If not, see <https://www.gnu.org/licenses/>. 
*/

let environ;
let n = levelParms[0].nFairies;  // take from level 1
let font;
let gameOverFont;
let infoFont

function preload() {
  font = loadFont('./assets/Selima.woff');
  gameOverFont = loadFont('./assets/HyperScrypt-Stencil_web.woff')
  infoFont = loadFont('./assets/monofonto.woff');
}

function mouseClicked() {
  state.started = true
  environ.releaseFairies();
  if (state.won || state.gameOver) {
    environ.reset();
  }
}


function setup() {
  // colorMode(HSB);
  textFont(font);
  colorMode(HSB, 360, 100, 100, 1)
  ellipseMode(RADIUS);
  rectMode(RADIUS);
  createCanvas(windowWidth, windowHeight);
  updateState();
  environ = new Environment(n);
}

function draw() {
  environ.update();
  environ.draw();

}
