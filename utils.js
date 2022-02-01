(() => {

  /* logging */

  let doubleDigitPad = (n) => {
    let isSingleDigit = n < 10
    return (isSingleDigit ? `0${n}` : `${n}`)
  }

  let getTimestamp = () => {
    // sortable; contains month -> sec

    let d = new Date(),
        month = d.getMonth(),
        date = d.getDate(),
        hr = d.getHours(),
        min = d.getMinutes(),
        sec = d.getSeconds()

    return [month+1, date, hr, min, sec]
      .map(doubleDigitPad)
      .join('_')
  }

  let printBits = (int, n=0) => {
    let bits = (int >>> 0).toString(2),
        padding = n - bits.length,
        result = ''

    if (n == 0 || padding == 0) {
      result = bits
    }
    else if (padding > 0) {
      result = '0'.repeat(padding) + bits
    }
    else if(padding < 0) {
      result = bits.substring(-padding, bits.length)
    }
    print(result)
  }

  /* images */

  let putImage = (img) => image(img, 0, 0)

  let newImageThen = (fn) => {
    let result = createImage(width, height)
    fn(result)
    return result
  }

  let addImages = (...imgs) => newImageThen(result => {
    for (let img of imgs) {
      result.blend(img,
                   0, 0, width, height,
                   0, 0, width, height,
                   ADD)
    }
  })

  let clone = (img) => newImageThen(
      result => result.copy(img,
                            0, 0, width, height,
                            0, 0, width, height)
  )

  let invertOpacity = (img) => {
    // happens in place
    img.loadPixels()

    let numPixelValues = 4 * width * height // all my images have canvas width, height

    for (let i = 0; i < numPixelValues; i += 4) {
      // pixels[i], [i+1], [i+2] = r, g, b
      img.pixels[i+3] = 255 - img.pixels[i+3]  // invert alpha channel
    }

    img.updatePixels()
    return img
  }

  let fillWhereOpaque = (img, _color) => {

    // happens in place
    img.loadPixels()

    let numPixelValues = 4 * width * height // all my images have canvas width, height

    let r = red(_color),
        g = green(_color),
        b = blue(_color)
    for (let i = 0; i < numPixelValues; i += 4) {
      // if (img.pixels[i+3] == 255) {  // alpha
      if (img.pixels[i+3] > 0) {  // alpha; edges aliased i guess so less than 255
        img.pixels[i] = r
        img.pixels[i+1] = g
        img.pixels[i+2] = b
      }
    }

    img.updatePixels()
    return img
  }

  let putMask = (mask) => putImage(mask.img)

  let newOffscreenRenderer = () => {
    // usage: OffscreenRenderer.render(pg => drawingFunction(pg) )

    // save resources and just create one p5 graphics context in this closure,
    //    resetting it before each new render
    let pg, size

    let resize = () => {
      // with current widnow/canvas size
      size = newSize(width, height)
      pg = createGraphics(size.w, size.h)
    }

    resize()  // init

    let render = (drawOnGraphics) => {
      // param: drawOnGraphics(pg) draws on graphics context
      // returns: p5.Image

      // clear from last use
      pg.clear()
      pg.noErase()

      // pg.background(transparent)
      pg.noFill()
      pg.noStroke()

      drawOnGraphics(pg)

      return newImageThen(
        img => img.copy(pg,
                        0, 0, size.w, size.h,
                        0, 0, size.w, size.h)
      )
    }

    return {render, resize}
  }

  /* structures */

  let newCircle = (x, y, r) => {
    let draw = (pg) => pg.circle(x, y, r*2)
    let contains = (pt) => sqDist(pt.x, pt.y, x, y) < sq(r)
    return {x, y, r, draw, contains}
  }

  let newEllipse = (x, y, a, b, theta) => {

    let draw = (pg) => {
      pg.push()
      pg.translate(x, y)
      pg.rotate(theta)
      pg.ellipse(0, 0, a, b)
      pg.pop()
    }

    let contains = (pt) => {
      // https://stackoverflow.com/questions/7946187/point-and-ellipse-rotated-position-test-algorithm

      // Another way uses the definition of the ellipse as the points whose sum of distances to the foci is constant.

      // transformation from rotated ellipse to unit circle
      pt = pt.copy()
      pt.add(-x, -y)
      pt.rotate(-theta) // not positive theta, forgot why
      let scaled = newPoint(2*pt.x / a, 2*pt.y / b )
      return (scaled.x * scaled.x + scaled.y * scaled.y) < 1  // isPointInsideCircle
    }

    return {x, y, a, b, theta, draw, contains}
  }

  let newBitstring = (init) => {
    // easy but not performant implementation

    // let newBitstring = (bitsOn, numBits) => {
    //   let bits = new Array(numBits).fill(false)
    //   bitsOn.forEach(bit => bits[bit] = true)

    let bits

    if (typeof init == 'number') {
      // given length
      bits = zeros(init)
    }
    else if (Array.isArray(init)) {
      // given bits
      bits = init
    }
    else if (typeof init == 'string') {
      bits = init.split('').map(b => parseInt(b)).reverse()
    }
    // let _32bitContainers = new Array(1).fill(0)

    return {
      bits: bits,
      and: (other) => newBitstring(
        mapZipped(bits, other.bits, (a,b) => a & b)
      ),
      or: (other) => newBitstring(
        mapZipped(bits, other.bits, (a,b) => a | b)
      ),
      not: () => newBitstring( bits.map(b => b === 0 ? 1 : 0) ),
      equals: (other) => equalArrays(bits, other.bits),
      toString: () => {
        // let bits = (int >>> 0).toString(2),
        // let bits = (int).toString(2),
        //     padding = length - bits.length
        //
        // return '0'.repeat(padding) + bits
        return [...bits].reverse().join('')
      },
    }
  }

  let newSize = (width, height) => {
    return {w: width, h: height}
  }

  let newPoint = (x, y) => {
    return {x, y}
  }

    /* functions for using Maps instead of Objs
  ** unused alternative to generateKeyVals

  let generateMap = (keys, makeVal) => {
    // convenience for initialization
    let map = new Map()
    keys.forEach( (k, i) => map.set(k, makeVal(k, i)) )
    return map
  }

  let intKeysAndValueMaker = (obj) => {
    // turns an object into arguments for generateMap
    //    converts object string keys into ints
    // eg: generateMap(...intKeysAndValueMaker({ '1': val }))

    let intKeys = Object.keys(obj).map(k => parseInt(k))
    let valueMaker = (key) => obj[key]
    return [intKeys, valueMaker]
  }

  let mapMerge = (a, b) => new Map([
    ...a, ...b
  ])

  */

  let generateKeyVals = (keys, makeVal) => {
    // convenience for initialization
    let obj = {}
    keys.forEach( (k, i) => obj[k] = makeVal(k, i) )
    return obj
  }

  let forEachKeyVal = (obj, fn) => Object.entries(obj).forEach(([k, v]) => fn(k,v))

  let mapZipped = (a, b, fn) => {
    // let len = a.length
    // for (let i = 0; i < len; ++i) {
    //   fn(a[i], b[i])
    // }
    return a.map( (item, i) => fn(item, b[i], i) )
  }

  let range = (begin, end) => {
    let arr = []
    for (let i = begin; i < end; ++i) {
      arr.push(i)
    }
    return arr
  }

  let zeros = (n) => new Array(n).fill(0)

  let ones = (n) => new Array(n).fill(1)

  let permutations = (items) => {
    // https://stackoverflow.com/questions/9960908/permutations-in-javascript
    let length = items.length,
        result = [items.slice()],
        c = new Array(length).fill(0),
        i = 1, k, p;

    while (i < length) {
      if (c[i] < i) {
        k = i % 2 && c[i];
        p = items[i];
        items[i] = items[k];
        items[k] = p;
        ++c[i];
        i = 1;
        result.push(items.slice());
      } else {
        c[i] = 0;
        ++i;
      }
    }
    return uniq(result)
  }

  let transpose = (arr2D) => {
    return arr2D[0].map( (_, i) => arr2D.map(row => row[i]) )
  }

  let uniq = (arr) => {
    let seen = {}
    return arr.filter( (item) => {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true)
    })
  }

  let equalArrays = (a, b) => {
    // let i = a1.length
    // while (i--) {
    //   if (a[i] !== b[i]) return false
    // }
    // return true

    return a.every((v,i) => v === b[i])
  }

  let shiftedLists = (arr) => {
    let lists = [],
        n = arr.length

    for (let i = 0; i < n; i++) {
      let first = arr.slice(i, n),
          last = arr.slice(0, i)
      lists.push([...first, ...last])
    }

    return lists
  }

  let booleanPermutations = (() => {
    // memoized, trying improve performance and save time
    let seen = {}

    return (n) => {
      if (n in seen) return seen[n]
      //    permutations([1,1...1,1])
      //  + permutations([1,1...1,0])
      //  + ...
      /// + permutations([0,0...0,1])
      /// + permutations([0,0...0,0])

      let patterns = []   // size 2 ** n

      for (let numOn = n; numOn >= 0; numOn--) {
        let collection = [...ones(numOn), ...zeros(n - numOn)]

        patterns.push( ...permutations(collection) )
      }
      seen[n] = patterns
      return patterns
    }
  })()

  let newBitstringOnAt = (i, n) => {
    let b = newBitstring(n)
    b.bits[i] = 1
    return b
  }

  let consecutiveOnBits = (n) => {
    return Array.from({n}, (_, i) => newBitstringOnAt(i, n))
  }

  /* geometry */

  let sqDist = (x0, y0, x1, y1) => sq(x1 - x0) + sq(y1 - y0)

  let isPointInsideCircle = (pt, cir) => sqDist(pt.x, pt.y, cir.x, cir.y) < sq(cir.r)

  // misc?

  let onPageSave = (fn) => {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        fn()
      }
    })
  }



  window.utils = {
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
    equalArrays,
  }
})();