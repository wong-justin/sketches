/* taken from generalized any_venn code, just cleaned up enough to be functional for users */

let {
  doubleDigitPad,
  getTimestamp,
  putImage,
  newImageThen,
  addImages,
  clone,
  invertOpacity,
  fillWhereOpaque,
  putMask,
  newCircle,
  generateKeyVals,
  forEachKeyVal,
  printBits,
  sqDist,
  isPointInsideCircle,
  onPageSave,
  newSize,
  newPoint,
  newOffscreenRenderer,
  range,
  zeros,
  ones,
  mapZipped,
  transpose,
  uniq,
  permutations,
  shiftedLists,
  newEllipse,
  newBitstring,
  booleanPermutations,
  newBitstringOnAt,
  consecutiveOnBits,
} = window.utils

// used globally, mainly initialized during setup
let venn, // needed in event handlers
    bgcolor // for redrawing

let sets = [
  newBitstring('01100011'),
  newBitstring('01001110'),
  newBitstring('01111000'),
]

function setup() {

  /* actual canvas setup */
  createCanvas(windowWidth, windowHeight)

  // these are setup constants

  transparent = color(0,0,0,0)
  opaque = color(0,0,0,255)
  bgcolor = color(128)
  fgcolor = color(192, 64, 64)
  white = color(255)

  let OffscreenRenderer = newOffscreenRenderer()

  /* masking */

  let newBooleanMask = (init) => {

    let img

    switch (typeof init) {
      case 'object':  // existing p5.Image
        img = init
        break
      case 'function':  // function to draw on a renderer
        img = OffscreenRenderer.render(init)
        break
      case 'undefined': // blank, transparent image
        img = OffscreenRenderer.render((pg) => pg.background(transparent))
        break
    }

    return {
      img: img,
      // functions with other masks
      and: (other) => {
        let otherImg = clone(other.img)
        otherImg.mask(img, 0, 0)
        return newBooleanMask(otherImg)
      },
      or: (other) => newBooleanMask(addImages(img, other.img)),
      not: () => newBooleanMask(invertOpacity(clone(img))),
      // converting back to images
      // apply: (otherImg) => {
      //   return p5.Image,
      // },
      fill: (_color) => {
        return fillWhereOpaque(clone(img), _color)
      }
    }

  }

  let _fill = (pg) => pg.fill(opaque)
  let _nofill = (pg) => pg.noFill()

  let _stroke = (pg) => {pg.stroke(opaque); pg.strokeWeight(3)}
  let _nostroke = (pg) => pg.noStroke()

  let sequence = (...drawFns) => (pg) => drawFns.forEach(fn => fn(pg))





  let generateSetFlags = (n) => {
    // these patterns manifest if looking at transposed stack of set flags
    // flags
    //  1100
    //  1010
    // rotated => patterns
    //  00
    //  01
    //  10
    //  11

    let patterns = booleanPermutations(n)

    let bitArrs = transpose(patterns),
        setFlags = bitArrs.map(newBitstring)

    return setFlags
  }


  let create3VennCircles = () => {
    let center = createVector(width/2, height/2),
        minDim = Math.min(width, height),
        radius = minDim / 4,
        NORTH = HALF_PI

    let circles = range(0,3).map(i => {

      let theta = NORTH + i/3 * TWO_PI,
          offset = p5.Vector.fromAngle(theta, radius / sqrt(3))

      offset.add(center)

      return newCircle(offset.x, offset.y, radius)
    })

    let labels = ['A', 'B', 'C'].map( (letter, i) => {

      let theta = NORTH + i/3 * TWO_PI,
          offset = p5.Vector.fromAngle(theta, 9/8 * radius)

      offset.add(center)

      return {label: letter, center: offset}
    })
    return [circles, labels]
  }

  let create3VennCirclesUpsideDown = () => {
    let center = createVector(width/2, height/2),
        minDim = Math.min(width, height),
        radius = minDim / 4,
        NORTH = HALF_PI

    return range(0,3).map(i => {

      let theta = NORTH + i/3 * TWO_PI,
          offset = p5.Vector.fromAngle(theta, radius / sqrt(3))

      offset.add(center)

      return newCircle(offset.x, offset.y, radius)
    })
  }


  let newVenn = (_shapes, _labels) => {

    let N = _shapes.length,
        // sets = generateSetFlags(N),
        units = consecutiveOnBits(2 ** N),
        shapes = generateKeyVals(sets, (_, i) => _shapes[i]),
        labels = _labels ? generateKeyVals(sets, (_, i) => _labels[i]) : null
        ALL_ONES = newBitstring(ones(2 ** N))

    // graphics
        // masks
    let fills,
        borders,
        // images
        highlightedFills = {},
        secondaryFills,
        highlightedBorders = {}

    // state
    let unitHovered = null,
        unitsActive = generateKeyVals(units, () => false),
        setsActive = generateKeyVals(sets, () => true),
        isErasing = false

    // init masks with set shapes
    fills = generateKeyVals(sets,
      (set) => newBooleanMask( sequence(_fill, shapes[set].draw) )
    )

    borders = generateKeyVals(sets,
      (set) => newBooleanMask( sequence(_stroke, shapes[set].draw) )
    )

    // populate masks by calculating unit regions
    for (let onOffs of booleanPermutations(N)) {
      // let [a, b, c, d] = sets
      // let unit = a.and(b).and(c).and(c.not())
      // let mask = fills[a].and(fills[b]).and(fills[c]).and(fills[d].not())

      let unitSequence = mapZipped(sets, onOffs, (set, isOn) => [set, isOn])

      let unit = unitSequence.reduce( (bits, [set, isOn]) => {
        return bits.and(isOn ? set : set.not())
      }, ALL_ONES)


      // initialize accumulator
      let [set0, isOn] = unitSequence[0],
          mask = isOn ? fills[set0] : fills[set0].not()

      // accumulate boolean operations
      for (let [set, isOn] of unitSequence) {
        let newMask = isOn ? fills[set] : fills[set].not()
        mask = mask.and(newMask)
      }

      // set result mask for unit region
      highlightedFills[unit] = mask.fill(fgcolor)




      // borders

      let arcs = sets.map(set => {
        let border = borders[set]
        return unitSequence.reduce( (prevBorder, [otherSet, isOn]) => {
          if (set.equals(otherSet)) return prevBorder
          let partialBorder = prevBorder.and(isOn ? fills[otherSet] : fills[otherSet].not())
          return partialBorder
        }, border)
      })

      // finish this unit borders
      let allBorders = arcs.reduce( (prev, curr) => prev.or(curr) )
      highlightedBorders[unit] = allBorders.fill(white)
    }

    // don't want a border for outside region, looks bad
    // ~A & ~B & ... = transparent
    highlightedBorders[newBitstringOnAt(2**N - 1, 2 ** N)] = newBooleanMask().img


    // secondaryFills = generateKeyVals(sets, s => fills[s].fill(color(96)))
    // highlightedBorders = generateKeyVals(sets, s => borders[s].fill(white) )

    let getUnitContaining = (pt) => {
      let region = newBitstring(ones(2 ** N))

      forEachKeyVal(shapes, (_set, shape) => {
        let set = newBitstring(_set)
        // print(set.toString())

        let narrowerRegion = region.and( shape.contains(pt) ?
          set : set.not()
        )
        region = narrowerRegion
      })
      return region
    }

    let drawSets = () => {
      forEachKeyVal(setsActive, (set, isActive) => {
        if (isActive) {
          putMask(borders[set])
          if (labels) {
            let {label, center} = labels[set]
            text(label, center.x, center.y)
          }
        }
      })
      if (unitHovered) putImage(highlightedBorders[unitHovered])
    }

    let drawUnits = () => {
      forEachKeyVal(unitsActive, (unit, isActive) => {
        if (isActive) putImage(highlightedFills[unit])
      })
      // if (unitHovered) putImage(highlightedFills[unitHovered])
    }

    let draw = () => {
      drawUnits()
      drawSets()
      // let [A, B, C] = sets
      // putImage(highlightedFills[A.and(B.not()).and(C.not())])
    }

    let handleMouseMoved = (x, y) => {
      let mouse = createVector(x, y),
          unit = getUnitContaining(mouse)

      unitHovered = unit
      if (mouseIsPressed) unitsActive[unit] = !isErasing
      // putImage(highlightedFills[unit])
    }

    let handleMousePressed = (x, y) => {
      let mouse = createVector(x, y),
          unit = getUnitContaining(mouse)

      isErasing = unitsActive[unit]
      // unitsActive[unit] = ! unitsActive[unit]
    }

    let handleMouseReleased = (x, y) => {
      isErasing = false
    }

    let [A, B, C] = sets
    textSize(30)
    textAlign(CENTER);
    let keypressFunctions = {
      a: () => setsActive[A] = !setsActive[A],
      b: () => setsActive[B] = !setsActive[B],
      c: () => setsActive[C] = !setsActive[C],
    }

    let handleKeypress = (key) => {
      if (! (key in keypressFunctions) ) return

      keypressFunctions[key]()
    }

    return {
      draw,
      handleMouseMoved,
      handleMousePressed,
      handleMouseReleased,
      handleKeypress,
    }
  }

  background(bgcolor)
  // venn = newVenn(create3VennCirclesUpsideDown())

  let [circles, labels] = create3VennCircles()
  venn = newVenn(circles, labels)
  render()
}

function draw() {

  venn.handleMouseMoved(mouseX, mouseY)
  render()
}

function render() {
  background(bgcolor)
  venn.draw()
}

onPageSave(() => saveCanvas(`canvas_${getTimestamp()}`, 'png'))

// function mouseMoved() {
//   venn.handleMouseMoved(mouseX, mouseY)
//   render()
// }

function mousePressed() {
  venn.handleMousePressed(mouseX, mouseY)
}

function mouseReleased() {
  venn.handleMouseReleased(mouseX, mouseY)
}

function keyPressed() {
  // if key == n then flip north 180 deg and make new venn
  venn.handleKeypress(key)
}






