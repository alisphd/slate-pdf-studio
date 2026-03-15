const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const { buildPdf, mmToPoints, PAGE_SIZES } = require("../pdf-core.js")

const pdfBytes = buildPdf([
  {
    imageBytes: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
    imageWidth: 1,
    imageHeight: 1,
    pageWidth: PAGE_SIZES.letter.width,
    pageHeight: PAGE_SIZES.letter.height,
    drawWidth: 400,
    drawHeight: 400,
    drawX: 106,
    drawY: 196,
    colorSpace: "DeviceRGB",
  },
])

const pdfText = Buffer.from(pdfBytes).toString("latin1")

assert.equal(Buffer.from(pdfBytes).subarray(0, 8).toString("ascii"), "%PDF-1.4")
assert.match(pdfText, /\/Type \/Catalog/)
assert.match(pdfText, /\/Count 1/)
assert.equal(Math.round(mmToPoints(25.4)), 72)

fs.writeFileSync(path.join(__dirname, "smoke-output.pdf"), Buffer.from(pdfBytes))

console.log("Smoke test passed.")
