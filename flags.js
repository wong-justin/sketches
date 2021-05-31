// each bit is a flag for one of 7 subregions
// bit 0000001 = top region, A & ~B & ~C
// bit 0000010 = right mid region, A & B & ~C
// ...keep iterating clockwise...
// bit 0100000 = left mid region, A & C & ~B
// ...and lastly
// bit 1000000 = center, A & B & C

// and i guess extend it to use 8th bit for region outside A,B,C

// regions, ie the main circles
A = 0b1100011
B = 0b1001110
C = 0b1111000

// subregion is name for subsets of size 1 (ie a single, indivisible part of the diagram)
// ie bits 0000001 -> 1000000
subregions = [
  A & ~B & ~C,
  A & B & ~C,
  ~A & B & ~C,
  ~A & B & C,
  ~A & ~B & C,
  A & ~B & C,
  A & B & C,
  // (~A & ~B & ~C & 0b1111111)
]

// convenience for common but lengthy-to-write subsets
A_ONLY = A & ~B & ~C
B_ONLY = ~A & B & ~C
C_ONLY = ~A & ~B & C

AB_ONLY = A & B & ~C
BC_ONLY = ~A & B & C
AC_ONLY = A & ~B & C

// other subsets
otherMasks = [
  A,
  B,
  C,
  A & B,
  A & C,
  B & C,
  A | B,
  A | C,
  B | C,
  A | B | C,
  ~C,
  ~A & 0b1111111,
  ~B & 0b1111111,
  ~C & 0b1111111,
]

function parseMask(mask) {
  let regions = mask & 0b1111111  // ignore any stray bits created from NOT operations (~), only keeping first 7

  logBinary(regions)
  // for (let i = 0; i < 7; i++) {
  //   let r = subregions[i]
  //   if (regions & r) {
  //     console.log(`bit ${i}`)
  //   }
  // }

  let [ons, offs] = partition(range(7), i => !! (subregions[i] & regions))
  console.log(' on:', ons.join(','))
  console.log('off:', offs.join(','))
}

function range(n) {
  let arr = []
  for (let i = 0; i < n; i++) {
    arr.push(i)
  }
  return arr
}

function partition(arr, key) {
  let trues = [],
      falses = []

  // for (let i = 0; i < arr.length; i++) {
  //   let item = arr[i]
  for (let item of arr) {
    if ( key(item) ) {
      trues.push(item)
    }
    else {
      falses.push(item)
    }
  }

  return [trues, falses]
}

function logBinary(int) {
  console.log((int).toString(2))
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length
}

function testFlags() {
  console.log(
    (~B | C) & 0b1111111 ==
    0b1111001)  // true

  for (let b of subregions) {
    logBinary(b)
  }
  console.log()
  for (let b of otherMasks) {
    logBinary(b)
  }

  console.log(
    hasDuplicates([
      ...subregions,
      ...otherMasks]) == false
  )

  parseMask(B | A)
  parseMask(A & B & C)
}

// testFlags()
