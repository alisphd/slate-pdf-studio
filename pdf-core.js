(function (root, factory) {
  const api = factory()

  if (typeof module === "object" && module.exports) {
    module.exports = api
  }

  root.LocalJpgPdf = api
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const encoder = new TextEncoder()
  const PDF_HEADER = Uint8Array.from([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xff, 0xff,
    0xff, 0xff, 0x0a,
  ])

  const PAGE_SIZES = {
    a4: { label: "A4", width: 595.28, height: 841.89 },
    letter: { label: "Letter", width: 612, height: 792 },
  }

  function encode(text) {
    return encoder.encode(text)
  }

  function formatPdfNumber(value) {
    return Number.parseFloat(Number(value).toFixed(3)).toString()
  }

  function concatUint8Arrays(chunks) {
    const totalLength = chunks.reduce(function (sum, chunk) {
      return sum + chunk.length
    }, 0)

    const result = new Uint8Array(totalLength)
    let offset = 0

    chunks.forEach(function (chunk) {
      result.set(chunk, offset)
      offset += chunk.length
    })

    return result
  }

  function mmToPoints(mm) {
    return (mm * 72) / 25.4
  }

  function getTransformedDimensions(width, height, orientation) {
    if (orientation >= 5 && orientation <= 8) {
      return { width: height, height: width }
    }

    return { width: width, height: height }
  }

  function getJpegOrientation(arrayBuffer) {
    const view = new DataView(arrayBuffer)

    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      return 1
    }

    let offset = 2

    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) {
        break
      }

      const marker = view.getUint16(offset, false)
      offset += 2

      if (marker === 0xffd9 || marker === 0xffda) {
        break
      }

      const blockLength = view.getUint16(offset, false)

      if (blockLength < 2 || offset + blockLength > view.byteLength) {
        break
      }

      if (marker === 0xffe1 && blockLength >= 10) {
        const exifOffset = offset + 2
        const isExif =
          view.getUint32(exifOffset, false) === 0x45786966 &&
          view.getUint16(exifOffset + 4, false) === 0

        if (isExif) {
          const tiffOffset = exifOffset + 6
          const byteOrder = view.getUint16(tiffOffset, false)
          const littleEndian = byteOrder === 0x4949

          if (littleEndian || byteOrder === 0x4d4d) {
            const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian)
            const directoryOffset = tiffOffset + firstIfdOffset

            if (directoryOffset + 2 <= view.byteLength) {
              const entryCount = view.getUint16(directoryOffset, littleEndian)

              for (let index = 0; index < entryCount; index += 1) {
                const entryOffset = directoryOffset + 2 + index * 12

                if (entryOffset + 12 > view.byteLength) {
                  return 1
                }

                if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
                  return view.getUint16(entryOffset + 8, littleEndian)
                }
              }
            }
          }
        }
      }

      offset += blockLength
    }

    return 1
  }

  function buildPageContent(page, imageName) {
    const commands = [
      "q",
      [
        formatPdfNumber(page.drawWidth),
        "0 0",
        formatPdfNumber(page.drawHeight),
        formatPdfNumber(page.drawX),
        formatPdfNumber(page.drawY),
        "cm",
      ].join(" "),
      "/" + imageName + " Do",
      "Q",
    ].join("\n")

    return encode(commands + "\n")
  }

  function buildPdf(pages) {
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error("Add at least one JPG before creating a PDF.")
    }

    const offsets = []
    const chunks = [PDF_HEADER]
    let currentOffset = PDF_HEADER.length

    const catalogId = 1
    const pagesId = 2
    let nextObjectId = 3

    const references = pages.map(function () {
      return {
        pageId: nextObjectId++,
        imageId: nextObjectId++,
        contentId: nextObjectId++,
      }
    })

    const infoId = nextObjectId++

    function pushBytes(bytes) {
      chunks.push(bytes)
      currentOffset += bytes.length
    }

    function addObject(id, body) {
      const bodyBytes = typeof body === "string" ? encode(body) : body
      offsets[id] = currentOffset
      pushBytes(encode(id + " 0 obj\n"))
      pushBytes(bodyBytes)
      pushBytes(encode("\nendobj\n"))
    }

    function addStreamObject(id, dictionaryEntries, streamBytes) {
      const dictionary = dictionaryEntries
        ? "<< " + dictionaryEntries + " /Length " + streamBytes.length + " >>"
        : "<< /Length " + streamBytes.length + " >>"

      addObject(
        id,
        concatUint8Arrays([
          encode(dictionary + "\nstream\n"),
          streamBytes,
          encode("\nendstream"),
        ])
      )
    }

    addObject(catalogId, "<< /Type /Catalog /Pages " + pagesId + " 0 R >>")

    const kids = references
      .map(function (reference) {
        return reference.pageId + " 0 R"
      })
      .join(" ")

    addObject(
      pagesId,
      "<< /Type /Pages /Count " + pages.length + " /Kids [" + kids + "] >>"
    )

    pages.forEach(function (page, index) {
      const reference = references[index]
      const imageName = "Im" + (index + 1)
      const colorSpace =
        page.colorSpace === "DeviceGray" ? "/DeviceGray" : "/DeviceRGB"

      if (!(page.imageBytes instanceof Uint8Array) || page.imageBytes.length === 0) {
        throw new Error("Each PDF page needs JPG image data.")
      }

      addObject(
        reference.pageId,
        [
          "<< /Type /Page",
          "/Parent " + pagesId + " 0 R",
          "/MediaBox [0 0 " +
            formatPdfNumber(page.pageWidth) +
            " " +
            formatPdfNumber(page.pageHeight) +
            "]",
          "/Resources << /ProcSet [/PDF /ImageC] /XObject << /" +
            imageName +
            " " +
            reference.imageId +
            " 0 R >> >>",
          "/Contents " + reference.contentId + " 0 R >>",
        ].join(" ")
      )

      addStreamObject(
        reference.imageId,
        [
          "/Type /XObject",
          "/Subtype /Image",
          "/Width " + Math.round(page.imageWidth),
          "/Height " + Math.round(page.imageHeight),
          "/ColorSpace " + colorSpace,
          "/BitsPerComponent 8",
          "/Filter /DCTDecode",
        ].join(" "),
        page.imageBytes
      )

      addStreamObject(reference.contentId, "", buildPageContent(page, imageName))
    })

    addObject(infoId, "<< /Producer (Slate PDF Studio) /Creator (Codex) >>")

    const maxObjectId = infoId
    const xrefOffset = currentOffset

    const xrefLines = ["xref", "0 " + (maxObjectId + 1), "0000000000 65535 f "]

    for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
      const offset = offsets[objectId] || 0
      xrefLines.push(String(offset).padStart(10, "0") + " 00000 n ")
    }

    pushBytes(encode(xrefLines.join("\n") + "\n"))
    pushBytes(
      encode(
        [
          "trailer",
          "<< /Size " +
            (maxObjectId + 1) +
            " /Root " +
            catalogId +
            " 0 R /Info " +
            infoId +
            " 0 R >>",
          "startxref",
          String(xrefOffset),
          "%%EOF",
        ].join("\n")
      )
    )

    return concatUint8Arrays(chunks)
  }

  return {
    PAGE_SIZES: PAGE_SIZES,
    buildPdf: buildPdf,
    formatPdfNumber: formatPdfNumber,
    getJpegOrientation: getJpegOrientation,
    getTransformedDimensions: getTransformedDimensions,
    mmToPoints: mmToPoints,
  }
})

