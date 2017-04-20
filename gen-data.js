// var bn = require('bn.js')
var fs = require('fs')
var crypto = require('./lib/crypto/crypto')
var randomBytes = crypto.randomBytes
var sha256 = crypto.sha256

// amount{uint32} + fromAddress{address} + toAddress{address}
const messageSize = 4 + 20 + 20
// seq{uint32} + prevRoot{hash256} + transaction{Message}  + root{hash256}
const ticketNoSignSize = 4 + 32 + messageSize + 32
// [ticketNoSignSize bytes] + sign{Buffer}[64 bytes]
const ticketSize = ticketNoSignSize + 64

const rootDir = 'data'
const n = 16
const min = 30
const max = 80

function generateOneFile (i) {
  var height = (((max - min) * Math.random()) + min) | 0
  var output = {}

  while (height--) {
    let bytes = randomBytes(ticketSize)
    let hash = sha256(bytes)
    output[hash.toString('hex')] = bytes.toString('hex')
  }

  fs.writeFileSync(`${rootDir}/data-${i}.json`, JSON.stringify(output, ' ', 2))
}

function generate () {
  for (var i = 0; i < n; i += 1) {
    generateOneFile(i)
  }
}

/**
 * main
 */

generate()
