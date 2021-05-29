function setup() {
  createCanvas(windowWidth, windowHeight)

  // globals
  pg = createGraphics(width, height)

  transparent = color(0,0,0,0)
  opaque = color(0,0,0,255)

  sqrt3 = sqrt(3)

  v = new VennDiagram()

  // mouse can hover over a combination of these circles
  mouseOvers = createObj({
    keys: [A, B, C],
    makeVal: () => false
  })

  clickedRegions = createObj({
    keys: subregions,
    makeVal: () => false
  })

}

function draw() {

  let frame = imgFromGraphics(pg => {

    pg.background(255, 0, 0, 128)

    // draw labels
    // fill(0)
    // for (let region of subregions) {
    //   let pt = v.centers[region]
    //   pg.circle(pt.x, pt.y, 5)
    // }

    let labels = {
      [A & ~B & ~C]: 'A',
      [~A & B & ~C]: 'B',
      [~A & ~B & C]: 'C',
    }
    for (let region in labels) {
      let pt = v.centers[region]
      pg.text(labels[region], pt.x, pt.y)
    }


    // draw clicks
    for (let region in clickedRegions) {
      if (clickedRegions[region]) {
        let img = v.masks[region].img
        pg.image(img, 0, 0)
      }
    }

    // draw arcs
    // pg.noFill()
    // pg.stroke(0)
    // for (let a of Object.values(v.arcs) ) {
    //   a.draw(pg)
    // }
  })

  // // draw hovers by masking
  // let region = currentMouseoverRegion()
  // if (region in v.masks) {
  //   frame.mask(v.masks[region].img, 0, 0)
  // }

  background(128)
  image(frame, 0, 0)
  v.draw()
}

// --- mouse functions --- //

function isMouseOverCircle(x, y, r) {
  return squaredDistance(x, y, mouseX, mouseY) < sq(r)
}

function squaredDistance(x1, y1, x2, y2) {
  return sq(x2 - x1) + sq(y2 - y1)
}

function currentMouseoverRegion() {
  let flags = 0b1111111  //0xFF
  for (let region in mouseOvers) {
    flags = flags & (mouseOvers[region] ? region : ~region)
  }
  return flags
}

function mouseMoved() {
  for (let region of [A, B, C]) {
    let pt = v.centers[region]
    mouseOvers[region] = isMouseOverCircle(pt.x, pt.y, sqrt3*v.r)
  }
}

function mouseClicked() {
  let region = currentMouseoverRegion()
  if (region in clickedRegions) {
    clickedRegions[region] = !clickedRegions[region]
  }
  // console.log(clickedRegions)
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

    // // [~(A | B | C)]: circleMasks[A]
    // [~A & ~B & ~C & 0b1111111]: masks[A]
    //   .or(masks[B])
    //   .or(masks[C])
    //   .not(),
  })
  this.masks = masks

  // this.arcs = {
  //   a: new Arc(this.centers[A], PI, 0),
  //   b: new Arc(this.centers[B], 5*PI/3, 2*PI/3),
  //   c: new Arc(this.centers[C], PI/3, 4*PI/3),
  //   ab1: new Arc(this.centers[B], 4*PI/3, 5*PI/3),
  //   ab2: new Arc(this.centers[A], 0, PI/3),
  //   bc1: new Arc(this.centers[C], 0, PI/3),
  //   bc2: new Arc(this.centers[B], 2*PI/3, PI),
  //   ac1: new Arc(this.centers[A], 2*PI/3, PI),
  //   ac2: new Arc(this.centers[C], 4*PI/3, 5*PI/3),
  //   abc1: new Arc(this.centers[C], 5*PI/3, 0),
  //   abc2: new Arc(this.centers[A], PI/3, 2*PI/3),
  //   abc3: new Arc(this.centers[B], PI, 4*PI/3),
  // }

  this.draw = function() {
    // draw outlines of circles

    fill(transparent)
    stroke(0)
    for (let region of [A, B, C]){
      let pt = this.centers[region]
      circle(pt.x, pt.y, 2*sqrt3*this.r)
    }

  }
}

function Circle(x, y, r) {
  this.x = x
  this.y = y
  this.r = r

  this.draw = function(pg) {
    if (pg === undefined) {
      circle(this.x, this.y, this.r)
    }
    else {
      pg.circle(this.x, this.y, this.r)
    }
  }
}

// function Arc(center, start, end) {
//   this.center = center
//   this.start = start
//   this.end = end

//   this.draw = function(pg=undefined) {
//     if (pg) {
//       pg.arc(this.center.x, this.center.y, 2*sqrt3*v.r, 2*sqrt3*v.r, this.start, this.end)
//     }
//     else {
//       arc(this.center.x, this.center.y, 2*sqrt3*v.r, 2*sqrt3*v.r, this.start, this.end)
//     }
//   }
// }
