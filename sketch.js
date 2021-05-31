let someLabels = {
  [~A & ~B & ~C & 0b1111111]: 'none',
  [A & B & C]: 'all three',
  [AB_ONLY | BC_ONLY | AC_ONLY]: 'exactly two',
  [A_ONLY | B_ONLY | C_ONLY]: 'exactly one',
  [A | B | C]: 'at least one',
  [A & B & ~C]: 'A and B but not C',
  [A]: 'A',
}

function drawSubset(subset, pg=undefined) {
  // works for any combo of region flags A,B,C
  let drawFn = (pg === undefined ? image : pg.image)

  for (let bit of subregions) {
    if (bit & subset) {  //  bit is on
      let img = v.masks[bit].img
      fillWhereOpaque(img, highlighted)
      drawFn(img, 0, 0)
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight)

  // globals
  pg = createGraphics(width, height)

  transparent = color(0,0,0,0)
  opaque = color(0,0,0,255)
  bgcolor = color(128, 128, 128)
  highlighted = color(192, 64, 64)

  sqrt3 = sqrt(3)

  r = 100
  v = new VennDiagram({r})

  // mouse can hover over a combination of these circles
  mouseOvers = createObj({
    keys: [A, B, C],
    makeVal: () => false
  })

  clickedSubregions = createObj({
    keys: [...subregions, (~A & ~B & ~C & 0b1111111)],
    // keys: subregions,
    makeVal: () => false
  })

  // circlesVisible = createObj({
  //   keys: [A,B,C],
  //   makeVal: () => true
  // })

  updateDraw()
}

function updateDraw() {

  // background(128)
  // image(frame, 0, 0)

  background(bgcolor)

  // draw clicks
  for (let subregion in clickedSubregions) {
    if (clickedSubregions[subregion]) {  // if it's active
      let img = v.masks[subregion].img
      fillWhereOpaque(img, highlighted)
      image(img, 0, 0)
    }
  }

  // draw labels
  let labels = {
    [A & ~B & ~C]: 'A',
    [~A & B & ~C]: 'B',
    [~A & ~B & C]: 'C',
  }
  textSize(20)
  textAlign(CENTER)
  fill(0)
  noStroke()
  for (let subregion in labels) {
    let pt = v.centers[subregion]
    text(labels[subregion], pt.x, pt.y)
  }

  // test draw arbitrary region
  // drawSubset(A_ONLY | (A & B & C))

  // draw circle outlines
  stroke(0)
  v.drawCircleOutlines(A, B, C)

  // draw outlines around hover region
  let subregion = currentMouseoverSubregion()
  stroke(255)
  v.drawSubregionOutline(subregion)
}

// --- mouse functions --- //

function isMouseOverCircle(x, y, r) {
  return squaredDistance(x, y, mouseX, mouseY) < sq(r)
}

function squaredDistance(x1, y1, x2, y2) {
  return sq(x2 - x1) + sq(y2 - y1)
}

function currentMouseoverSubregion() {
  let subregion = 0b1111111  // 0xFF  // 0
  for (let region in mouseOvers) {
    subregion = subregion & (mouseOvers[region] ? region : ~region)
  }
  return subregion
}

function mouseMoved() {
  for (let region of [A, B, C]) {
    let pt = v.centers[region]
    mouseOvers[region] = isMouseOverCircle(pt.x, pt.y, sqrt3*v.r)
  }
  updateDraw()
}

// function mouseClicked() {
function mousePressed() {
  let region = currentMouseoverSubregion()
  if (region in clickedSubregions) {
    clickedSubregions[region] = !clickedSubregions[region]
  }
  updateDraw()
}

//

function VennDiagram({center=createVector(width/2, height/2), r=50}={}) {
  this.center = center
  this.r = r

  this.centers = (() => {

    // 3 main circle centers, A,B,C
    let centers = {},
        angles = angleNths(3),
        regions = [A, B, C]
    for (let i = 0; i < 3; i++) {
      let region = regions[i],
          angle = angles[i],
          pt = polarToRect(this.r, angle).add(this.center)

      centers[region] = pt
    }

    // 7 subregion centers, from AND/OR-ing A/B/C
    angles = angleNths(6)
    for (let i = 0; i < 6; i++) {
      let region = subregions[i],
          angle = angles[i],
          scl = (i % 2 == 0) ? 15/8 : 5/4  // just eyeballing what looks good
          // scl = 1

      centers[region] = polarToRect(this.r * scl, angle).add(this.center)
    }
    // centers[A & B & C]
    centers[1 << 6] = this.center
    // console.log(centers)
    return centers
  })()

  this.circles = createObj({
    keys: [A, B, C],
    makeVal: (k) => new Circle(this.centers[k].x, this.centers[k].y, 2*sqrt3*this.r)
  })

  let masks = createObj({
    keys: [A, B, C],
    makeVal: (k) => maskFromGraphics(pg => this.circles[k].draw(pg) )
  })
  Object.assign(masks, {
    [A & B & ~C]: masks[A]
      .and(masks[B])
      .and(masks[C].not()),

    [A & ~B & C]: masks[A]
      .and(masks[B].not())
      .and(masks[C]),

    [~A & B & C]: masks[A].not()
      .and(masks[B])
      .and(masks[C]),

    [A & ~B & ~C]: masks[A]
      .and(masks[B].not())
      .and(masks[C].not()),

    [~A & B & ~C]: masks[A].not()
      .and(masks[B])
      .and(masks[C].not()),

    [~A & ~B & C]: masks[A].not()
      .and(masks[B].not())
      .and(masks[C]),

    [A & B & C]: masks[A]
      .and(masks[B])
      .and(masks[C]),

    // [~(A | B | C)]: masks[A]
    [~A & ~B & ~C & 0b1111111]: masks[A]
      .or(masks[B])
      .or(masks[C])
      .not(),
  })
  this.masks = masks

  let arcs = {
    a: new Arc(this.centers[A], PI, 0),
    b: new Arc(this.centers[B], 5*PI/3, 2*PI/3),
    c: new Arc(this.centers[C], PI/3, 4*PI/3),
    ab1: new Arc(this.centers[B], 4*PI/3, 5*PI/3),
    ab2: new Arc(this.centers[A], 0, PI/3),
    bc1: new Arc(this.centers[C], 0, PI/3),
    bc2: new Arc(this.centers[B], 2*PI/3, PI),
    ac1: new Arc(this.centers[A], 2*PI/3, PI),
    ac2: new Arc(this.centers[C], 4*PI/3, 5*PI/3),
    abc1: new Arc(this.centers[C], 5*PI/3, 0),
    abc2: new Arc(this.centers[A], PI/3, 2*PI/3),
    abc3: new Arc(this.centers[B], PI, 4*PI/3),
  }

  this.outlines = {
    [A & B & ~C]: [arcs.ab1, arcs.ab2, arcs.abc1],
    [A & ~B & C]: [arcs.ac1, arcs.ac2, arcs.abc3],
    [~A & B & C]: [arcs.bc1, arcs.bc2, arcs.abc2],
    [A & ~B & ~C]: [arcs.a, arcs.ab1, arcs.ac2],
    [~A & B & ~C]: [arcs.b, arcs.ab2, arcs.bc1],
    [~A & ~B & C]: [arcs.c, arcs.bc2, arcs.ac1],
    [A & B & C]: [arcs.abc1, arcs.abc2, arcs.abc3],
    // [~A & ~B & ~C & 0b1111111]: [arcs.a, arcs.b, arcs.c]
    // [A]: [new Arc(this.centers[A], 0, TAU)],
    // [B]: [new Arc(this.centers[B], 0, TAU)],
    // [C]: [new Arc(this.centers[C], 0, TAU)],
  }

  this.drawCircleOutlines = function(...regions) {
    // draw outlines of circles on default canvas
    // circleFlags is out of A,B,C
    fill(transparent)
    // stroke(0)
    strokeWeight(2)
    for (let region of regions){
      let c = this.circles[region]
      // circle(pt.x, pt.y, 2*sqrt3*this.r)
      c.draw()
    }
  }

  this.drawSubregionOutline = function(subregion) {
    // emphasize boundary around one of the 7 subregions
    // called when hovering
    // stroke(255)
    strokeWeight(2)
    if (subregion in v.outlines) {
      // draw every arc
      for (let a of v.outlines[subregion]) {
        a.draw()
      }
    }
  }
}

function Circle(x, y, r) {
  this.x = x
  this.y = y
  this.r = r

  this.draw = function(pg) {
    let drawFn = (pg === undefined ? circle : pg.circle)
    drawFn(this.x, this.y, this.r)
  }
}

function Arc(center, start, end) {
  this.center = center
  this.start = start
  this.end = end

  this.draw = function(pg=undefined) {
    let drawFn = (pg === undefined ? arc : pg.arc)
    noFill()
    strokeWeight(2)
    drawFn(this.center.x, this.center.y, 2*sqrt3*v.r, 2*sqrt3*v.r, this.start, this.end)
  }
}
