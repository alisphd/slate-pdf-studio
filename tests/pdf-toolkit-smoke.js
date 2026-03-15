const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const {
  cleanupSession,
  convertPdfBufferToImages,
  extractPdfBuffer,
  inspectPdfBuffer,
  mergePdfBuffers,
  reorderPdfBuffer,
  resolvePdfWorker,
} = require("../server.js")
const { createMinimalPdfBuffer } = require("./minimal-pdf.js")

function readPageTexts(pythonCommand, pdfPath) {
  const script = [
    "import fitz, json, sys",
    "doc = fitz.open(sys.argv[1])",
    "texts = [page.get_text('text').strip() for page in doc]",
    "print(json.dumps(texts))",
  ].join("; ")

  return JSON.parse(execFileSync(pythonCommand, ["-c", script, pdfPath], { encoding: "utf8" }))
}

async function main() {
  const worker = await resolvePdfWorker()
  assert.ok(worker && worker.pythonCommand, "Expected the local PDF worker to be available")

  const pdfA = createMinimalPdfBuffer("A")
  const pdfB = createMinimalPdfBuffer("B")
  const pdfC = createMinimalPdfBuffer("C")

  const inspectResult = await inspectPdfBuffer(pdfA)
  assert.equal(inspectResult.pageCount, 1)

  const imageResult = await convertPdfBufferToImages(pdfA, {
    format: "png",
    dpi: 96,
    baseName: "smoke",
  })
  assert.equal(imageResult.files.length, 1)
  assert.ok(fs.existsSync(imageResult.files[0].path), "Expected the rendered image file to exist")
  fs.copyFileSync(imageResult.files[0].path, path.join(__dirname, "pdf-image-smoke-page.png"))
  await cleanupSession(imageResult.sessionId)

  const mergeResult = await mergePdfBuffers(
    [pdfA, pdfB, pdfC].map(function (buffer, index) {
      return {
        name: "input-" + (index + 1) + ".pdf",
        data: buffer.toString("base64"),
      }
    }),
    "merged-smoke"
  )

  assert.equal(mergeResult.files.length, 1)
  const mergedPath = mergeResult.files[0].path
  assert.equal((await inspectPdfBuffer(fs.readFileSync(mergedPath))).pageCount, 3)
  assert.deepStrictEqual(readPageTexts(worker.pythonCommand, mergedPath), ["A", "B", "C"])

  const mergedPayload = {
    name: "merged.pdf",
    data: fs.readFileSync(mergedPath).toString("base64"),
  }

  const extractResult = await extractPdfBuffer(
    mergedPayload,
    [
      { label: "1,3", pages: [0, 2] },
      { label: "2", pages: [1] },
    ],
    "extract-smoke"
  )

  assert.equal(extractResult.files.length, 2)
  assert.deepStrictEqual(readPageTexts(worker.pythonCommand, extractResult.files[0].path), ["A", "C"])
  assert.deepStrictEqual(readPageTexts(worker.pythonCommand, extractResult.files[1].path), ["B"])

  const reorderResult = await reorderPdfBuffer(mergedPayload, [2, 0, 1], "reorder-smoke")
  assert.equal(reorderResult.files.length, 1)
  assert.deepStrictEqual(readPageTexts(worker.pythonCommand, reorderResult.files[0].path), ["C", "A", "B"])

  await cleanupSession(mergeResult.sessionId)
  await cleanupSession(extractResult.sessionId)
  await cleanupSession(reorderResult.sessionId)

  console.log("PDF toolkit smoke test passed.")
}

main().catch(function (error) {
  console.error(error && error.message ? error.message : error)
  process.exitCode = 1
})
