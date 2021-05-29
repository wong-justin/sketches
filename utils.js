// --- utils --- //

function createObj({keys, makeVal}) {
  let obj = {}
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i]
    obj[k] = makeVal(k, i)
  }
  return obj
}

function powersOf2(n) {
  let result = []
  for (let i = 0; i < n; i++) {
    result.push( 1 << i )
  }
  return result
}

function zip(...arrs) {
  let minLength = Math.min(...arrs.map(a => a.length)),
      result = []
  for (let i = 0; i < minLength; i++) {
    result.push(arrs.map(a => a[i]))
  }
  return result
}

function angleNths(n) {
  angles = []
  start = - HALF_PI // north on canvas
  end = start + TAU
  inc = (TAU) / n
  for (t=start; t<end; t+=inc) {
    angles.push(t)
  }
  return angles
}

function polarToRect(r, t) {
  x = r*cos(t)
  y = r*sin(t)
  return new p5.Vector(x, y)
}
