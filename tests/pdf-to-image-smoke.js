const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const { convertPdfBufferToImages, cleanupSession, resolvePdfRenderer } = require("../server.js")
const { createMinimalPdfBuffer } = require("./minimal-pdf.js")

async function main() {
  const renderer = await resolvePdfRenderer()
  assert.ok(renderer, "Expected a local PDF renderer to be available")

  const samplePdf = createMinimalPdfBuffer("PDF to image smoke")
  const result = await convertPdfBufferToImages(samplePdf, {
    format: "png",
    dpi: 96,
    baseName: "smoke",
  })

  assert.equal(result.files.length, 1)
  assert.ok(fs.existsSync(result.files[0].path), "Expected the rendered image file to exist")

  const copyPath = path.join(__dirname, "pdf-image-smoke-page.png")
  fs.copyFileSync(result.files[0].path, copyPath)
  await cleanupSession(result.sessionId)
  console.log("PDF to image smoke test passed.")
}

main().catch(function (error) {
  console.error(error && error.message ? error.message : error)
  process.exitCode = 1
})
