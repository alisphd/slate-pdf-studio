function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function createMinimalPdfBuffer(message) {
  const header = Buffer.from("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n", "binary")
  const text = escapePdfText(message || "Hello local PDF")
  const stream = Buffer.from(
    "BT\n/F1 24 Tf\n36 96 Td\n(" + text + ") Tj\nET\n",
    "binary"
  )

  const objects = [
    Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "binary"),
    Buffer.from("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n", "binary"),
    Buffer.from(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
      "binary"
    ),
    Buffer.concat([
      Buffer.from("4 0 obj\n<< /Length " + stream.length + " >>\nstream\n", "binary"),
      stream,
      Buffer.from("endstream\nendobj\n", "binary"),
    ]),
    Buffer.from("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n", "binary"),
  ]

  const offsets = [0]
  let current = header.length

  objects.forEach(function (object) {
    offsets.push(current)
    current += object.length
  })

  const xrefStart = current
  const xrefLines = ["xref", "0 6", "0000000000 65535 f "]

  for (let index = 1; index <= 5; index += 1) {
    xrefLines.push(String(offsets[index]).padStart(10, "0") + " 00000 n ")
  }

  const trailer = Buffer.from(
    xrefLines.join("\n") +
      "\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
      xrefStart +
      "\n%%EOF",
    "binary"
  )

  return Buffer.concat([header].concat(objects).concat([trailer]))
}

module.exports = {
  createMinimalPdfBuffer,
}
