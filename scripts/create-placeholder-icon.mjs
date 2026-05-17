import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { deflateSync } from 'node:zlib'

const ICON_PATH = 'build/icon.ico'
const SIZE = 256

function writeUInt32BE(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value)
  return buffer
}

function writeUInt16LE(value) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}

function writeUInt32LE(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value)
  return buffer
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const payload = Buffer.concat([typeBuffer, data])
  return Buffer.concat([writeUInt32BE(data.length), payload, writeUInt32BE(crc32(payload))])
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function isInsideRoundedTile(x, y) {
  const normalizedX = Math.abs(x - SIZE / 2) / (SIZE / 2 - 16)
  const normalizedY = Math.abs(y - SIZE / 2) / (SIZE / 2 - 16)
  return normalizedX ** 4 + normalizedY ** 4 <= 1
}

function isPulseLine(x, y) {
  const segmentDirection = (Math.floor(x / 28) % 2) * 2 - 1
  return Math.abs(y - (142 + 14 * segmentDirection)) < 4 && x > 48 && x < 208
}

function isMonogram(x, y) {
  const pulseStem = x >= 72 && x <= 88 && y >= 62 && y <= 190
  const pulseTop = x >= 82 && x <= 148 && y >= 62 && y <= 82
  const pulseMiddle = x >= 82 && x <= 148 && y >= 116 && y <= 136
  const pulseSide = x >= 136 && x <= 156 && y >= 76 && y <= 122
  const experianStem = x >= 166 && x <= 182 && y >= 70 && y <= 186
  const experianBars = x >= 166 && x <= 214 && ((y >= 70 && y <= 86) || (y >= 120 && y <= 136) || (y >= 170 && y <= 186))
  return pulseStem || pulseTop || pulseMiddle || pulseSide || experianStem || experianBars
}

function pixelAt(x, y) {
  if (!isInsideRoundedTile(x, y)) {
    return [0, 0, 0, 0]
  }

  if (isPulseLine(x, y) || isMonogram(x, y)) {
    return [255, 255, 255, 255]
  }

  const gradientPosition = (x + y) / (2 * SIZE)
  const red = Math.round(32 + 120 * gradientPosition)
  const green = Math.round(72 + 82 * (1 - gradientPosition))
  const blue = Math.round(152 + 82 * gradientPosition)
  return [red, green, blue, 255]
}

function createPng() {
  const rows = []
  for (let y = 0; y < SIZE; y += 1) {
    const row = [0]
    for (let x = 0; x < SIZE; x += 1) {
      row.push(...pixelAt(x, y))
    }
    rows.push(Buffer.from(row))
  }

  const header = Buffer.concat([
    writeUInt32BE(SIZE),
    writeUInt32BE(SIZE),
    Buffer.from([8, 6, 0, 0, 0])
  ])

  return Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function createIco(png) {
  return Buffer.concat([
    writeUInt16LE(0),
    writeUInt16LE(1),
    writeUInt16LE(1),
    Buffer.from([0, 0, 0, 0]),
    writeUInt16LE(1),
    writeUInt16LE(32),
    writeUInt32LE(png.length),
    writeUInt32LE(22),
    png
  ])
}

mkdirSync(dirname(ICON_PATH), { recursive: true })
writeFileSync(ICON_PATH, createIco(createPng()))
console.log(`Generated ${ICON_PATH}`)
