// --- mask functions --- //

function Mask(img=undefined) {
  // gives boolean operations to image masks (ie images using alpha channel)

  this.img = (img === undefined) ?
    createImage(width, height) :
    img

  this.and = function(other) {
    let img = clone(
      (other instanceof Mask) ?
        other.img :
        other
    )
    img.mask(this.img, 0, 0)
    return new Mask(img)
  }

  this.or = function(other) {
    return (other instanceof Mask) ?
      new Mask(addImages(this.img, other.img)) :
      new Mask(addImages(this.img, other))
  }

  this.not = function() {
    return new Mask(invertOpacity(clone(this.img)))
  }
}

function invertOpacity(img) {
  img.loadPixels()
  // let d = pg.pixelDensity()
  // let numPixelValues = 4 * (width * d) * (height * d)  // for graphics context displays rendered to device screens
  let numPixelValues = 4 * width * height  // for images, which I don't think have pixel densities

  for (let i = 0; i < numPixelValues; i += 4) {
    // pg.pixels[i] = r
    // pg.pixels[i+1] = g
    // pg.pixels[i+2] = b
    img.pixels[i+3] = 255 - img.pixels[i+3]  // invert alpha channel
  }

  img.updatePixels()
  return img
}

function addImages(...imgs) {
  let result = createImage(width, height)
  for (let img of imgs) {
    result.blend(img,
                 0, 0, width, height,
                 0, 0, width, height,
                 ADD)
  }
  return result
}

function clone(img) {
  let result = createImage(width, height)
  result.copy(img,
              0, 0, width, height,
              0, 0, width, height)
  return result
}

function imgFromGraphics(fn) {
  // fn(pg) draws on graphics context, returns img
  // reuse global pg and just clear it before this use

  // let pg = createGraphics(width, height)
  pg.clear()
  pg.noErase()
  pg.background(transparent)

  fn(pg)

  let img = createImage(width, height)
  img.copy(pg, 0, 0, width, height, 0, 0, width, height)
  return img
}

function maskFromGraphics(drawFn) {
  let img = imgFromGraphics(pg => {
    pg.background(transparent)
    pg.fill(opaque)
    drawFn(pg)
  })
  return new Mask(img)
}
