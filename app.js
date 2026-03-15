(function () {
  const state = {
    mode: "jpg-to-pdf",
    busy: false,
    server: {
      checked: false,
      available: false,
      workerAvailable: false,
      message: "",
    },
    jpgFiles: [],
    images: {
      file: null,
      results: [],
    },
    merge: {
      files: [],
      results: [],
    },
    extract: {
      file: null,
      pageCount: 0,
      previews: [],
      results: [],
    },
    reorder: {
      file: null,
      pageCount: 0,
      pages: [],
      results: [],
      dragPageId: null,
      dropTargetId: null,
    },
  }

  const elements = {
    body: document.body,
    serverNote: document.getElementById("server-note"),
    modeButtons: Array.from(document.querySelectorAll(".mode-button")),
    jpgPanel: document.getElementById("jpg-panel"),
    imagesPanel: document.getElementById("images-panel"),
    mergePanel: document.getElementById("merge-panel"),
    extractPanel: document.getElementById("extract-panel"),
    reorderPanel: document.getElementById("reorder-panel"),
    jpgDropzone: document.getElementById("jpg-dropzone"),
    jpgInput: document.getElementById("jpg-input"),
    jpgPick: document.getElementById("jpg-pick"),
    jpgConvert: document.getElementById("jpg-convert"),
    jpgClear: document.getElementById("jpg-clear"),
    jpgName: document.getElementById("jpg-name"),
    jpgPageSize: document.getElementById("jpg-page-size"),
    jpgPageOrientation: document.getElementById("jpg-page-orientation"),
    jpgMargin: document.getElementById("jpg-margin"),
    jpgStatus: document.getElementById("jpg-status"),
    jpgEmpty: document.getElementById("jpg-empty"),
    jpgList: document.getElementById("jpg-list"),
    imagesDropzone: document.getElementById("images-dropzone"),
    imagesInput: document.getElementById("images-input"),
    imagesPick: document.getElementById("images-pick"),
    imagesConvert: document.getElementById("images-convert"),
    imagesClear: document.getElementById("images-clear"),
    imagesFormat: document.getElementById("images-format"),
    imagesDpi: document.getElementById("images-dpi"),
    imagesName: document.getElementById("images-name"),
    imagesStatus: document.getElementById("images-status"),
    imagesSummary: document.getElementById("images-summary"),
    imagesResultsWrap: document.getElementById("images-results-wrap"),
    imagesResults: document.getElementById("images-results"),
    imagesDownloadAll: document.getElementById("images-download-all"),
    mergeDropzone: document.getElementById("merge-dropzone"),
    mergeInput: document.getElementById("merge-input"),
    mergePick: document.getElementById("merge-pick"),
    mergeRun: document.getElementById("merge-run"),
    mergeClear: document.getElementById("merge-clear"),
    mergeName: document.getElementById("merge-name"),
    mergeStatus: document.getElementById("merge-status"),
    mergeEmpty: document.getElementById("merge-empty"),
    mergeList: document.getElementById("merge-list"),
    mergeResultsWrap: document.getElementById("merge-results-wrap"),
    mergeResults: document.getElementById("merge-results"),
    extractDropzone: document.getElementById("extract-dropzone"),
    extractInput: document.getElementById("extract-input"),
    extractPick: document.getElementById("extract-pick"),
    extractRun: document.getElementById("extract-run"),
    extractClear: document.getElementById("extract-clear"),
    extractName: document.getElementById("extract-name"),
    extractGroups: document.getElementById("extract-groups"),
    extractSummary: document.getElementById("extract-summary"),
    extractStatus: document.getElementById("extract-status"),
    extractPreviewWrap: document.getElementById("extract-preview-wrap"),
    extractSelectionHint: document.getElementById("extract-selection-hint"),
    extractPreview: document.getElementById("extract-preview"),
    extractResultsWrap: document.getElementById("extract-results-wrap"),
    extractResults: document.getElementById("extract-results"),
    reorderDropzone: document.getElementById("reorder-dropzone"),
    reorderInput: document.getElementById("reorder-input"),
    reorderPick: document.getElementById("reorder-pick"),
    reorderRun: document.getElementById("reorder-run"),
    reorderClear: document.getElementById("reorder-clear"),
    reorderReset: document.getElementById("reorder-reset"),
    reorderReverse: document.getElementById("reorder-reverse"),
    reorderName: document.getElementById("reorder-name"),
    reorderSummary: document.getElementById("reorder-summary"),
    reorderStatus: document.getElementById("reorder-status"),
    reorderPreviewWrap: document.getElementById("reorder-preview-wrap"),
    reorderPreview: document.getElementById("reorder-preview"),
    reorderResultsWrap: document.getElementById("reorder-results-wrap"),
    reorderResults: document.getElementById("reorder-results"),
  }

  const panelMap = {
    "jpg-to-pdf": elements.jpgPanel,
    "pdf-to-images": elements.imagesPanel,
    "merge-pdf": elements.mergePanel,
    "extract-pages": elements.extractPanel,
    "reorder-pages": elements.reorderPanel,
  }

  let pdfRuntimeReady = false

  bindEvents()
  renderMode()
  renderJpgQueue()
  renderImagesState()
  renderMergeQueue()
  renderExtractState()
  renderReorderState()
  void checkServerAvailability()

  function bindEvents() {
    elements.modeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (!state.busy) {
          state.mode = button.dataset.mode
          renderMode()
        }
      })
    })

    bindDropzone(elements.jpgDropzone, elements.jpgInput, true, addJpgFiles)
    bindDropzone(elements.imagesDropzone, elements.imagesInput, false, setImagesFileFromList)
    bindDropzone(elements.mergeDropzone, elements.mergeInput, true, addMergeFiles)
    bindDropzone(elements.extractDropzone, elements.extractInput, false, setExtractFileFromList)
    bindDropzone(elements.reorderDropzone, elements.reorderInput, false, setReorderFileFromList)

    elements.jpgPick.addEventListener("click", function () {
      if (!state.busy) {
        elements.jpgInput.click()
      }
    })
    elements.jpgConvert.addEventListener("click", function () {
      void convertJpgToPdf()
    })
    elements.jpgClear.addEventListener("click", function () {
      if (!state.busy) {
        clearJpgFiles()
        setStatus(elements.jpgStatus, "Cleared the JPG queue.", "muted")
      }
    })
    elements.jpgList.addEventListener("click", onJpgListClick)

    elements.imagesPick.addEventListener("click", function () {
      if (!state.busy) {
        elements.imagesInput.click()
      }
    })
    elements.imagesConvert.addEventListener("click", function () {
      void convertPdfToImages()
    })
    elements.imagesClear.addEventListener("click", function () {
      if (!state.busy) {
        clearImagesState()
        setStatus(elements.imagesStatus, "Cleared the selected PDF.", "muted")
      }
    })
    elements.imagesDownloadAll.addEventListener("click", downloadAllImages)

    elements.mergePick.addEventListener("click", function () {
      if (!state.busy) {
        elements.mergeInput.click()
      }
    })
    elements.mergeRun.addEventListener("click", function () {
      void mergePdfs()
    })
    elements.mergeClear.addEventListener("click", function () {
      if (!state.busy) {
        clearMergeState()
        setStatus(elements.mergeStatus, "Cleared the merge queue.", "muted")
      }
    })
    elements.mergeList.addEventListener("click", onMergeListClick)

    elements.extractPick.addEventListener("click", function () {
      if (!state.busy) {
        elements.extractInput.click()
      }
    })
    elements.extractRun.addEventListener("click", function () {
      void extractPages()
    })
    elements.extractClear.addEventListener("click", function () {
      if (!state.busy) {
        clearExtractState()
        setStatus(elements.extractStatus, "Cleared the selected PDF.", "muted")
      }
    })
    elements.extractGroups.addEventListener("input", renderExtractState)

    elements.reorderPick.addEventListener("click", function () {
      if (!state.busy) {
        elements.reorderInput.click()
      }
    })
    elements.reorderRun.addEventListener("click", function () {
      void reorderPages()
    })
    elements.reorderClear.addEventListener("click", function () {
      if (!state.busy) {
        clearReorderState()
        setStatus(elements.reorderStatus, "Cleared the selected PDF.", "muted")
      }
    })
    elements.reorderReset.addEventListener("click", resetReorderPages)
    elements.reorderReverse.addEventListener("click", reverseReorderPages)
    bindReorderDragAndDrop()

    window.addEventListener("beforeunload", function () {
      revokeCollectionUrls(state.jpgFiles)
      revokeCollectionUrls(state.images.results)
      revokeCollectionUrls(state.merge.files)
      revokeCollectionUrls(state.merge.results)
      revokeCollectionUrls(state.extract.previews)
      revokeCollectionUrls(state.extract.results)
      revokeCollectionUrls(state.reorder.pages)
      revokeCollectionUrls(state.reorder.results)
    })
  }

  function bindDropzone(dropzone, input, multiple, onFiles) {
    dropzone.addEventListener("click", function () {
      if (!state.busy) {
        input.click()
      }
    })

    dropzone.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && !state.busy) {
        event.preventDefault()
        input.click()
      }
    })

    input.addEventListener("change", function (event) {
      void onFiles(event.target.files)
      event.target.value = ""
    })

    ;["dragenter", "dragover"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault()
        if (!state.busy) {
          dropzone.classList.add("is-dragover")
        }
      })
    })

    ;["dragleave", "dragend", "drop"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault()
        dropzone.classList.remove("is-dragover")
      })
    })

    dropzone.addEventListener("drop", function (event) {
      if (state.busy) {
        return
      }

      const files = Array.from((event.dataTransfer && event.dataTransfer.files) || [])
      if (!multiple && files.length > 1) {
        void onFiles([files[0]])
        return
      }

      void onFiles(files)
    })
  }

  function bindReorderDragAndDrop() {
    elements.reorderPreview.addEventListener("dragstart", function (event) {
      const card = findPageCard(event.target)
      if (!card || state.busy) {
        return
      }

      state.reorder.dragPageId = card.dataset.id
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", state.reorder.dragPageId)
      }
      window.requestAnimationFrame(function () {
        card.classList.add("is-dragging")
      })
    })

    elements.reorderPreview.addEventListener("dragover", function (event) {
      if (!state.reorder.dragPageId) {
        return
      }

      const card = findPageCard(event.target)
      if (!card) {
        return
      }

      event.preventDefault()
      if (state.reorder.dropTargetId !== card.dataset.id) {
        clearDropTargetClass()
        state.reorder.dropTargetId = card.dataset.id
        card.classList.add("is-drop-target")
      }
    })

    elements.reorderPreview.addEventListener("drop", function (event) {
      const card = findPageCard(event.target)
      if (!card || !state.reorder.dragPageId) {
        return
      }

      event.preventDefault()
      const fromIndex = state.reorder.pages.findIndex(function (item) {
        return item.id === state.reorder.dragPageId
      })
      const toIndex = state.reorder.pages.findIndex(function (item) {
        return item.id === card.dataset.id
      })

      if (fromIndex === -1 || toIndex === -1) {
        clearReorderDragState()
        return
      }

      if (fromIndex !== toIndex) {
        moveItem(state.reorder.pages, fromIndex, toIndex)
      }

      clearReorderDragState()
      renderReorderState()
    })

    elements.reorderPreview.addEventListener("dragend", function () {
      clearReorderDragState()
      renderReorderState()
    })
  }

  async function checkServerAvailability() {
    state.server.checked = true

    try {
      await ensurePdfEngines()
      state.server.available = true
      state.server.workerAvailable = true
      state.server.message = "Runs in your browser only. Your originals stay untouched on this device."
    } catch (error) {
      state.server.available = false
      state.server.workerAvailable = false
      state.server.message = error && error.message ? error.message : "Harbor PDF could not start its browser tools. Refresh the page and try again."
    }

    renderServerNote()
    updateControls()
    renderImagesState()
    renderMergeQueue()
    renderExtractState()
    renderReorderState()
  }

  async function addJpgFiles(fileListLike) {
    const candidates = Array.from(fileListLike || [])
    if (candidates.length === 0) {
      return
    }

    const jpgFiles = candidates.filter(isJpegFile)
    const ignoredCount = candidates.length - jpgFiles.length

    if (jpgFiles.length === 0) {
      setStatus(elements.jpgStatus, "Only JPG or JPEG files are supported here.", "error")
      return
    }

    setBusy(true)
    setStatus(elements.jpgStatus, "Reading JPG files locally...", "muted")

    const results = await Promise.allSettled(
      jpgFiles.map(function (file) {
        return createJpgQueueItem(file)
      })
    )

    const readyFiles = []
    let failedCount = 0

    results.forEach(function (result) {
      if (result.status === "fulfilled") {
        readyFiles.push(result.value)
      } else {
        failedCount += 1
      }
    })

    state.jpgFiles = state.jpgFiles.concat(readyFiles)
    setBusy(false)
    renderJpgQueue()

    if (readyFiles.length > 0) {
      let message = "Added " + readyFiles.length + " JPG file(s)."
      if (ignoredCount > 0) {
        message += " Ignored " + ignoredCount + " other file(s)."
      }
      if (failedCount > 0) {
        message += " " + failedCount + " file(s) could not be read."
      }
      setStatus(elements.jpgStatus, message, failedCount > 0 ? "error" : "success")
      return
    }

    setStatus(elements.jpgStatus, "The selected JPG files could not be read.", "error")
  }

  async function createJpgQueueItem(file) {
    const previewUrl = URL.createObjectURL(file)

    try {
      const details = await Promise.all([file.arrayBuffer(), loadImage(previewUrl)])
      const orientation = LocalJpgPdf.getJpegOrientation(details[0])
      const dimensions = LocalJpgPdf.getTransformedDimensions(
        details[1].naturalWidth,
        details[1].naturalHeight,
        orientation
      )

      return {
        id: generateId(),
        file: file,
        previewUrl: previewUrl,
        name: file.name,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        orientation: orientation,
      }
    } catch (error) {
      URL.revokeObjectURL(previewUrl)
      throw error
    }
  }

  async function convertJpgToPdf() {
    if (state.busy || state.jpgFiles.length === 0) {
      return
    }

    const filename = sanitizeFilename(elements.jpgName.value) || timestampName("images")
    const marginPoints = LocalJpgPdf.mmToPoints(Number(elements.jpgMargin.value || 0))

    setBusy(true)

    try {
      const pages = []

      for (let index = 0; index < state.jpgFiles.length; index += 1) {
        const item = state.jpgFiles[index]
        setStatus(
          elements.jpgStatus,
          "Preparing page " + (index + 1) + " of " + state.jpgFiles.length + "...",
          "muted"
        )

        const preparedImage = await prepareImageForPdf(item)
        const layout = getPageLayout(
          preparedImage.width,
          preparedImage.height,
          elements.jpgPageSize.value,
          elements.jpgPageOrientation.value,
          marginPoints
        )

        pages.push({
          imageBytes: preparedImage.bytes,
          imageWidth: preparedImage.width,
          imageHeight: preparedImage.height,
          pageWidth: layout.pageWidth,
          pageHeight: layout.pageHeight,
          drawWidth: layout.drawWidth,
          drawHeight: layout.drawHeight,
          drawX: layout.drawX,
          drawY: layout.drawY,
          colorSpace: "DeviceRGB",
        })
      }

      const pdfBytes = LocalJpgPdf.buildPdf(pages)
      downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), filename + ".pdf")
      setStatus(elements.jpgStatus, "Saved " + filename + ".pdf locally.", "success")
    } catch (error) {
      setStatus(
        elements.jpgStatus,
        error && error.message ? error.message : "The PDF could not be created.",
        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  async function prepareImageForPdf(item) {
    const workingUrl = URL.createObjectURL(item.file)

    try {
      const image = await loadImage(workingUrl)
      const dimensions = LocalJpgPdf.getTransformedDimensions(
        image.naturalWidth,
        image.naturalHeight,
        item.orientation
      )
      const canvas = document.createElement("canvas")
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      const context = canvas.getContext("2d", { alpha: false })

      if (!context) {
        throw new Error("This browser does not support local image conversion.")
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      applyOrientationTransform(context, item.orientation, image.naturalWidth, image.naturalHeight)
      context.drawImage(image, 0, 0)

      const jpegBlob = await canvasToJpegBlob(canvas, 0.92)
      return {
        bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
        width: canvas.width,
        height: canvas.height,
      }
    } finally {
      URL.revokeObjectURL(workingUrl)
    }
  }

  async function setImagesFileFromList(fileListLike) {
    const file = Array.from(fileListLike || []).find(isPdfFile)
    if (!file) {
      setStatus(elements.imagesStatus, "Choose a PDF file.", "error")
      return
    }

    state.images.file = file
    revokeCollectionUrls(state.images.results)
    state.images.results = []
    elements.imagesName.value = sanitizeFilename(baseNameFromFile(file.name)) || "pages"
    renderImagesState()
    setStatus(elements.imagesStatus, "PDF ready to export locally.", "success")
  }

  async function convertPdfToImages() {
    if (state.busy || !state.images.file || !state.server.workerAvailable) {
      return
    }

    setBusy(true)
    revokeCollectionUrls(state.images.results)
    state.images.results = []
    renderImagesState()
    setStatus(elements.imagesStatus, "Rendering PDF pages in your browser...", "muted")

    try {
      state.images.results = await renderPdfFileToImages(state.images.file, {
        format: elements.imagesFormat.value,
        dpi: elements.imagesDpi.value,
        baseName: sanitizeFilename(elements.imagesName.value) || baseNameFromFile(state.images.file.name) || "pages",
      })

      renderImagesState()
      setStatus(elements.imagesStatus, "Created " + state.images.results.length + " image(s) in your browser.", "success")
    } catch (error) {
      setStatus(elements.imagesStatus, error && error.message ? error.message : "The PDF could not be exported.", "error")
    } finally {
      setBusy(false)
    }
  }

  async function addMergeFiles(fileListLike) {
    const allFiles = Array.from(fileListLike || [])
    const files = allFiles.filter(isPdfFile)
    const ignored = allFiles.length - files.length

    if (files.length === 0) {
      setStatus(elements.mergeStatus, "Only PDF files are supported here.", "error")
      return
    }

    setBusy(true)
    setStatus(elements.mergeStatus, "Loading first-page previews locally...", "muted")

    try {
      for (const file of files) {
        const item = {
          id: generateId(),
          file: file,
          name: file.name,
          size: file.size,
          previewUrl: null,
        }

        try {
          const previews = await fetchPdfPreview(file, {
            pages: [0],
            dpi: 72,
            baseName: baseNameFromFile(file.name) + "-cover",
          })
          item.previewUrl = previews[0] ? previews[0].previewUrl : null
        } catch (error) {
          item.previewUrl = null
        }

        state.merge.files.push(item)
      }

      revokeCollectionUrls(state.merge.results)
      state.merge.results = []
      renderMergeQueue()

      let message = "Added " + files.length + " PDF file(s)."
      if (ignored > 0) {
        message += " Ignored " + ignored + " other file(s)."
      }
      setStatus(elements.mergeStatus, message, "success")
    } finally {
      setBusy(false)
    }
  }

  async function mergePdfs() {
    if (state.busy || state.merge.files.length < 2 || !state.server.workerAvailable) {
      return
    }

    setBusy(true)
    revokeCollectionUrls(state.merge.results)
    state.merge.results = []
    renderMergeQueue()
    setStatus(elements.mergeStatus, "Merging PDFs in your browser...", "muted")

    try {
      await ensurePdfEngines()
      const outputName = sanitizeFilename(elements.mergeName.value) || "merged"
      const mergedDocument = await window.PDFLib.PDFDocument.create()

      for (let index = 0; index < state.merge.files.length; index += 1) {
        const item = state.merge.files[index]
        setStatus(
          elements.mergeStatus,
          "Merging file " + (index + 1) + " of " + state.merge.files.length + "...",
          "muted"
        )

        const sourceBytes = await readFileBytes(item.file)
        const sourceDocument = await window.PDFLib.PDFDocument.load(sourceBytes, {
          updateMetadata: false,
        })
        const pageIndexes = Array.from({ length: sourceDocument.getPageCount() }, function (_, pageIndex) {
          return pageIndex
        })
        const copiedPages = await mergedDocument.copyPages(sourceDocument, pageIndexes)

        copiedPages.forEach(function (page) {
          mergedDocument.addPage(page)
        })
      }

      const mergedBytes = await mergedDocument.save()
      state.merge.results = [
        createPdfDownloadItem(mergedBytes, outputName + ".pdf", {
          label: "Merged PDF",
          pageCount: mergedDocument.getPageCount(),
        }),
      ]
      renderMergeQueue()
      setStatus(elements.mergeStatus, "Merged PDFs in your browser.", "success")
    } catch (error) {
      setStatus(elements.mergeStatus, error && error.message ? error.message : "The PDFs could not be merged.", "error")
    } finally {
      setBusy(false)
    }
  }

  async function setExtractFileFromList(fileListLike) {
    const file = Array.from(fileListLike || []).find(isPdfFile)
    if (!file) {
      setStatus(elements.extractStatus, "Choose a PDF file.", "error")
      return
    }

    revokeCollectionUrls(state.extract.previews)
    revokeCollectionUrls(state.extract.results)
    state.extract.file = file
    state.extract.pageCount = 0
    state.extract.previews = []
    state.extract.results = []
    elements.extractName.value = sanitizeFilename(baseNameFromFile(file.name)) || "extract"
    elements.extractGroups.value = ""
    renderExtractState()

    setBusy(true)
    setStatus(elements.extractStatus, "Loading page previews in your browser...", "muted")

    try {
      const details = await Promise.all([
        inspectPdfFile(file),
        fetchPdfPreview(file, {
          dpi: 72,
          baseName: baseNameFromFile(file.name) + "-preview",
        }),
      ])

      state.extract.pageCount = details[0]
      state.extract.previews = details[1].map(function (item) {
        return {
          id: "extract-" + item.page,
          pageNumber: item.page,
          previewUrl: item.previewUrl,
        }
      })

      renderExtractState()
      setStatus(elements.extractStatus, pageCountText(state.extract.pageCount) + " detected.", "success")
    } catch (error) {
      clearExtractState()
      setStatus(elements.extractStatus, error && error.message ? error.message : "The PDF could not be inspected.", "error")
    } finally {
      setBusy(false)
    }
  }

  async function extractPages() {
    if (state.busy || !state.extract.file || !state.server.workerAvailable) {
      return
    }

    let groups
    try {
      groups = parseExtractGroups(elements.extractGroups.value, state.extract.pageCount)
    } catch (error) {
      setStatus(elements.extractStatus, error.message, "error")
      return
    }

    setBusy(true)
    revokeCollectionUrls(state.extract.results)
    state.extract.results = []
    renderExtractState()
    setStatus(elements.extractStatus, "Preparing page groups in your browser...", "muted")

    try {
      await ensurePdfEngines()
      const sourceBytes = await readFileBytes(state.extract.file)
      const sourceDocument = await window.PDFLib.PDFDocument.load(sourceBytes, {
        updateMetadata: false,
      })
      const outputBaseName = sanitizeFilename(elements.extractName.value) || "extract"
      const outputs = []

      for (let index = 0; index < groups.length; index += 1) {
        const group = groups[index]
        setStatus(
          elements.extractStatus,
          "Building output " + (index + 1) + " of " + groups.length + "...",
          "muted"
        )

        const document = await window.PDFLib.PDFDocument.create()
        const copiedPages = await document.copyPages(sourceDocument, group.pages)
        copiedPages.forEach(function (page) {
          document.addPage(page)
        })

        const filename = outputBaseName + "-part-" + (index + 1) + ".pdf"
        outputs.push(
          createPdfDownloadItem(await document.save(), filename, {
            label: group.label,
            pageCount: group.pages.length,
          })
        )
      }

      state.extract.results = outputs
      renderExtractState()
      setStatus(elements.extractStatus, "Created " + state.extract.results.length + " PDF output(s).", "success")
    } catch (error) {
      setStatus(elements.extractStatus, error && error.message ? error.message : "The pages could not be extracted.", "error")
    } finally {
      setBusy(false)
    }
  }

  async function setReorderFileFromList(fileListLike) {
    const file = Array.from(fileListLike || []).find(isPdfFile)
    if (!file) {
      setStatus(elements.reorderStatus, "Choose a PDF file.", "error")
      return
    }

    revokeCollectionUrls(state.reorder.pages)
    revokeCollectionUrls(state.reorder.results)
    state.reorder.file = file
    state.reorder.pageCount = 0
    state.reorder.pages = []
    state.reorder.results = []
    state.reorder.dragPageId = null
    state.reorder.dropTargetId = null
    elements.reorderName.value = sanitizeFilename(baseNameFromFile(file.name)) || "reordered"
    renderReorderState()

    setBusy(true)
    setStatus(elements.reorderStatus, "Loading page previews in your browser...", "muted")

    try {
      const details = await Promise.all([
        inspectPdfFile(file),
        fetchPdfPreview(file, {
          dpi: 72,
          baseName: baseNameFromFile(file.name) + "-preview",
        }),
      ])

      state.reorder.pageCount = details[0]
      state.reorder.pages = details[1].map(function (item) {
        return {
          id: generateId(),
          pageNumber: item.page,
          previewUrl: item.previewUrl,
        }
      })

      renderReorderState()
      setStatus(elements.reorderStatus, pageCountText(state.reorder.pageCount) + " ready to reorder.", "success")
    } catch (error) {
      clearReorderState()
      setStatus(elements.reorderStatus, error && error.message ? error.message : "The PDF could not be inspected.", "error")
    } finally {
      setBusy(false)
    }
  }

  async function reorderPages() {
    if (state.busy || !state.reorder.file || !state.server.workerAvailable) {
      return
    }

    if (state.reorder.pages.length === 0) {
      setStatus(elements.reorderStatus, "Load a PDF before exporting.", "error")
      return
    }

    setBusy(true)
    revokeCollectionUrls(state.reorder.results)
    state.reorder.results = []
    renderReorderState()
    setStatus(elements.reorderStatus, "Saving reordered PDF in your browser...", "muted")

    try {
      await ensurePdfEngines()
      const sourceBytes = await readFileBytes(state.reorder.file)
      const sourceDocument = await window.PDFLib.PDFDocument.load(sourceBytes, {
        updateMetadata: false,
      })
      const outputDocument = await window.PDFLib.PDFDocument.create()
      const pageIndexes = state.reorder.pages.map(function (item) {
        return item.pageNumber - 1
      })
      const copiedPages = await outputDocument.copyPages(sourceDocument, pageIndexes)

      copiedPages.forEach(function (page) {
        outputDocument.addPage(page)
      })

      state.reorder.results = [
        createPdfDownloadItem(
          await outputDocument.save(),
          (sanitizeFilename(elements.reorderName.value) || "reordered") + ".pdf",
          {
            label: "Reordered PDF",
            pageCount: outputDocument.getPageCount(),
          }
        ),
      ]
      renderReorderState()
      setStatus(elements.reorderStatus, "Saved reordered PDF in your browser.", "success")
    } catch (error) {
      setStatus(elements.reorderStatus, error && error.message ? error.message : "The PDF could not be reordered.", "error")
    } finally {
      setBusy(false)
    }
  }

  function resetReorderPages() {
    if (state.busy || !state.reorder.file) {
      return
    }

    state.reorder.pages.sort(function (left, right) {
      return left.pageNumber - right.pageNumber
    })
    renderReorderState()
  }

  function reverseReorderPages() {
    if (state.busy || state.reorder.pages.length === 0) {
      return
    }

    state.reorder.pages.reverse()
    renderReorderState()
  }

  async function inspectPdfFile(file) {
    await ensurePdfEngines()
    const bytes = await readFileBytes(file)
    const pdfDocument = await window.PDFLib.PDFDocument.load(bytes, {
      updateMetadata: false,
    })

    return pdfDocument.getPageCount()
  }

  async function fetchPdfPreview(file, options) {
    return renderPdfFileToImages(file, {
      format: "png",
      dpi: options && options.dpi ? options.dpi : 72,
      baseName: (options && options.baseName) || baseNameFromFile(file.name) || "preview",
      pages: options && Array.isArray(options.pages) ? options.pages : null,
    })
  }

  function onJpgListClick(event) {
    const button = event.target.closest("button[data-action]")
    if (!button || state.busy) {
      return
    }

    const row = button.closest("[data-id]")
    if (!row) {
      return
    }

    const index = state.jpgFiles.findIndex(function (item) {
      return item.id === row.dataset.id
    })
    if (index === -1) {
      return
    }

    const action = button.dataset.action
    if (action === "remove") {
      revokePreview(state.jpgFiles[index])
      state.jpgFiles.splice(index, 1)
      renderJpgQueue()
      setStatus(elements.jpgStatus, "Removed " + row.dataset.name + ".", "muted")
      return
    }

    if (action === "up" && index > 0) {
      moveItem(state.jpgFiles, index, index - 1)
      renderJpgQueue()
      return
    }

    if (action === "down" && index < state.jpgFiles.length - 1) {
      moveItem(state.jpgFiles, index, index + 1)
      renderJpgQueue()
    }
  }

  function onMergeListClick(event) {
    const button = event.target.closest("button[data-action]")
    if (!button || state.busy) {
      return
    }

    const row = button.closest("[data-id]")
    if (!row) {
      return
    }

    const index = state.merge.files.findIndex(function (item) {
      return item.id === row.dataset.id
    })
    if (index === -1) {
      return
    }

    const action = button.dataset.action
    if (action === "remove") {
      revokeCollectionUrls([state.merge.files[index]])
      state.merge.files.splice(index, 1)
      renderMergeQueue()
      setStatus(elements.mergeStatus, "Removed " + row.dataset.name + ".", "muted")
      return
    }

    if (action === "up" && index > 0) {
      moveItem(state.merge.files, index, index - 1)
      renderMergeQueue()
      return
    }

    if (action === "down" && index < state.merge.files.length - 1) {
      moveItem(state.merge.files, index, index + 1)
      renderMergeQueue()
    }
  }

  function renderMode() {
    elements.modeButtons.forEach(function (button) {
      const isActive = button.dataset.mode === state.mode
      button.classList.toggle("is-active", isActive)
      button.setAttribute("aria-selected", String(isActive))
    })

    Object.keys(panelMap).forEach(function (mode) {
      panelMap[mode].hidden = mode !== state.mode
    })

    renderServerNote()
  }

  function renderServerNote() {
    elements.serverNote.textContent = state.server.message || "Runs in your browser only. Your originals stay untouched on this device."
    elements.serverNote.dataset.kind = state.server.workerAvailable ? "success" : "error"
  }

  function renderJpgQueue() {
    elements.jpgEmpty.hidden = state.jpgFiles.length > 0
    elements.jpgList.innerHTML = state.jpgFiles
      .map(function (item, index) {
        const name = escapeHtml(item.name)
        return [
          '<article class="file-row" data-id="' + item.id + '" data-name="' + name + '">',
          '<img class="thumb" src="' + item.previewUrl + '" alt="' + name + ' preview" />',
          '<div class="file-copy">',
          '<h3>' + name + '</h3>',
          '<div class="meta">Page ' + (index + 1) + ' • ' + item.width + ' x ' + item.height + ' px • ' + formatBytes(item.size) + '</div>',
          '</div>',
          '<div class="row-actions">',
          '<button type="button" data-action="up"' + (index === 0 ? ' disabled' : '') + '>Up</button>',
          '<button type="button" data-action="down"' + (index === state.jpgFiles.length - 1 ? ' disabled' : '') + '>Down</button>',
          '<button type="button" data-action="remove">Remove</button>',
          '</div>',
          '</article>',
        ].join("")
      })
      .join("")

    updateControls()
  }

  function renderImagesState() {
    if (!state.images.file) {
      elements.imagesSummary.textContent = state.server.workerAvailable
        ? "No file selected."
        : state.server.message || "No file selected."
    } else {
      elements.imagesSummary.textContent = state.images.file.name + " • " + formatBytes(state.images.file.size)
    }

    elements.imagesResultsWrap.hidden = state.images.results.length === 0
    elements.imagesDownloadAll.hidden = state.images.results.length < 2
    elements.imagesResults.innerHTML = state.images.results
      .map(function (item) {
        const name = escapeHtml(item.name)
        return [
          '<article class="result-card">',
          item.previewUrl ? '<img class="result-preview" src="' + item.previewUrl + '" alt="Preview of page ' + item.page + '" loading="lazy" />' : '',
          '<div>',
          '<h3>' + name + '</h3>',
          '<div class="result-meta">Page ' + item.page + '</div>',
          '</div>',
          '<div class="card-actions">',
          '<a class="download-link" href="' + item.downloadUrl + '" download="' + name + '">Download</a>',
          item.previewUrl ? '<a class="download-link" href="' + item.previewUrl + '" target="_blank" rel="noreferrer">Open</a>' : '',
          '</div>',
          '</article>',
        ].join("")
      })
      .join("")

    updateControls()
  }

  function renderMergeQueue() {
    elements.mergeEmpty.hidden = state.merge.files.length > 0
    elements.mergeList.innerHTML = state.merge.files
      .map(function (item, index) {
        const name = escapeHtml(item.name)
        const thumb = item.previewUrl
          ? '<img class="thumb" src="' + item.previewUrl + '" alt="Preview of ' + name + '" />'
          : '<div class="thumb thumb-label">PDF</div>'

        return [
          '<article class="file-row" data-id="' + item.id + '" data-name="' + name + '">',
          thumb,
          '<div class="file-copy">',
          '<h3>' + name + '</h3>',
          '<div class="meta">Document ' + (index + 1) + ' • ' + formatBytes(item.size) + '</div>',
          '</div>',
          '<div class="row-actions">',
          '<button type="button" data-action="up"' + (index === 0 ? ' disabled' : '') + '>Up</button>',
          '<button type="button" data-action="down"' + (index === state.merge.files.length - 1 ? ' disabled' : '') + '>Down</button>',
          '<button type="button" data-action="remove">Remove</button>',
          '</div>',
          '</article>',
        ].join("")
      })
      .join("")

    renderDownloadResults(elements.mergeResultsWrap, elements.mergeResults, state.merge.results)
    updateControls()
  }

  function renderExtractState() {
    if (!state.extract.file) {
      elements.extractSummary.textContent = state.server.workerAvailable
        ? "No file selected"
        : state.server.message || "No file selected"
    } else if (state.extract.pageCount > 0) {
      elements.extractSummary.textContent = state.extract.file.name + " • " + pageCountText(state.extract.pageCount)
    } else {
      elements.extractSummary.textContent = state.extract.file.name + " • loading pages"
    }

    const previewSelection = getExtractPreviewSelection()
    elements.extractPreviewWrap.hidden = state.extract.previews.length === 0
    elements.extractSelectionHint.textContent = previewSelection.message
    elements.extractPreview.innerHTML = state.extract.previews
      .map(function (item) {
        const classes = ["page-card"]
        if (previewSelection.selectedPages.has(item.pageNumber)) {
          classes.push("is-selected")
        }

        return [
          '<article class="' + classes.join(' ') + '">',
          '<div class="page-topline"><h3>Page ' + item.pageNumber + '</h3><span>' + item.pageNumber + '</span></div>',
          '<img src="' + item.previewUrl + '" alt="Preview of page ' + item.pageNumber + '" loading="lazy" />',
          '<div class="page-meta">Use page ' + item.pageNumber + ' in your ranges.</div>',
          '</article>',
        ].join("")
      })
      .join("")

    renderDownloadResults(elements.extractResultsWrap, elements.extractResults, state.extract.results)
    updateControls()
  }

  function renderReorderState() {
    if (!state.reorder.file) {
      elements.reorderSummary.textContent = state.server.workerAvailable
        ? "No file selected"
        : state.server.message || "No file selected"
    } else if (state.reorder.pageCount > 0) {
      elements.reorderSummary.textContent = state.reorder.file.name + " • " + pageCountText(state.reorder.pageCount)
    } else {
      elements.reorderSummary.textContent = state.reorder.file.name + " • loading pages"
    }

    elements.reorderPreviewWrap.hidden = state.reorder.pages.length === 0
    elements.reorderPreview.innerHTML = state.reorder.pages
      .map(function (item, index) {
        const classes = ["page-card"]
        if (state.reorder.dragPageId === item.id) {
          classes.push("is-dragging")
        }
        if (state.reorder.dropTargetId === item.id) {
          classes.push("is-drop-target")
        }

        return [
          '<article class="' + classes.join(' ') + '" draggable="true" data-id="' + item.id + '">',
          '<div class="page-topline"><h3>Page ' + item.pageNumber + '</h3><span>Position ' + (index + 1) + '</span></div>',
          '<img src="' + item.previewUrl + '" alt="Preview of page ' + item.pageNumber + '" loading="lazy" />',
          '<div class="page-meta">Drag to move this page.</div>',
          '</article>',
        ].join("")
      })
      .join("")

    renderDownloadResults(elements.reorderResultsWrap, elements.reorderResults, state.reorder.results)
    updateControls()
  }

  function renderDownloadResults(wrap, container, items) {
    wrap.hidden = items.length === 0
    container.innerHTML = items
      .map(function (item) {
        const name = escapeHtml(item.name)
        const metaParts = []
        if (item.label) {
          metaParts.push("Pages " + escapeHtml(item.label))
        }
        if (item.pageCount) {
          metaParts.push(pageCountText(item.pageCount))
        }
        return [
          '<article class="download-card">',
          '<h3>' + name + '</h3>',
          '<div class="download-meta">' + (metaParts.join(" • ") || "PDF ready") + '</div>',
          '<div class="download-actions">',
          '<a class="download-link" href="' + item.downloadUrl + '" download="' + name + '">Download</a>',
          '</div>',
          '</article>',
        ].join("")
      })
      .join("")
  }

  function updateControls() {
    const hasJpgFiles = state.jpgFiles.length > 0
    const hasImagesFile = Boolean(state.images.file)
    const hasMergeFiles = state.merge.files.length > 0
    const hasExtractFile = Boolean(state.extract.file)
    const hasReorderFile = Boolean(state.reorder.file)
    const workerReady = state.server.workerAvailable

    elements.body.dataset.busy = String(state.busy)

    elements.jpgPick.disabled = state.busy
    elements.jpgConvert.disabled = !hasJpgFiles || state.busy
    elements.jpgClear.disabled = !hasJpgFiles || state.busy
    elements.jpgName.disabled = state.busy
    elements.jpgPageSize.disabled = state.busy
    elements.jpgPageOrientation.disabled = state.busy
    elements.jpgMargin.disabled = state.busy

    elements.imagesPick.disabled = state.busy
    elements.imagesConvert.disabled = !hasImagesFile || state.busy || !workerReady
    elements.imagesClear.disabled = !hasImagesFile || state.busy
    elements.imagesFormat.disabled = state.busy || !workerReady
    elements.imagesDpi.disabled = state.busy || !workerReady
    elements.imagesName.disabled = state.busy
    elements.imagesDownloadAll.disabled = state.busy || state.images.results.length < 2

    elements.mergePick.disabled = state.busy || !workerReady
    elements.mergeRun.disabled = state.busy || !workerReady || state.merge.files.length < 2
    elements.mergeClear.disabled = state.busy || !hasMergeFiles
    elements.mergeName.disabled = state.busy || !workerReady

    elements.extractPick.disabled = state.busy || !workerReady
    elements.extractRun.disabled = state.busy || !workerReady || !hasExtractFile || state.extract.pageCount === 0
    elements.extractClear.disabled = state.busy || !hasExtractFile
    elements.extractName.disabled = state.busy || !workerReady
    elements.extractGroups.disabled = state.busy || !workerReady || !hasExtractFile

    elements.reorderPick.disabled = state.busy || !workerReady
    elements.reorderRun.disabled = state.busy || !workerReady || state.reorder.pages.length === 0
    elements.reorderClear.disabled = state.busy || !hasReorderFile
    elements.reorderReset.disabled = state.busy || state.reorder.pages.length === 0
    elements.reorderReverse.disabled = state.busy || state.reorder.pages.length === 0
    elements.reorderName.disabled = state.busy || !workerReady
  }

  function clearJpgFiles() {
    state.jpgFiles.forEach(revokePreview)
    state.jpgFiles = []
    renderJpgQueue()
  }

  function clearImagesState() {
    revokeCollectionUrls(state.images.results)
    state.images.file = null
    state.images.results = []
    renderImagesState()
  }

  function clearMergeState() {
    revokeCollectionUrls(state.merge.files)
    revokeCollectionUrls(state.merge.results)
    state.merge.files = []
    state.merge.results = []
    renderMergeQueue()
  }

  function clearExtractState() {
    revokeCollectionUrls(state.extract.previews)
    revokeCollectionUrls(state.extract.results)
    state.extract.file = null
    state.extract.pageCount = 0
    state.extract.previews = []
    state.extract.results = []
    elements.extractGroups.value = ""
    renderExtractState()
  }

  function clearReorderState() {
    revokeCollectionUrls(state.reorder.pages)
    revokeCollectionUrls(state.reorder.results)
    state.reorder.file = null
    state.reorder.pageCount = 0
    state.reorder.pages = []
    state.reorder.results = []
    clearReorderDragState()
    renderReorderState()
  }

  function moveItem(list, fromIndex, toIndex) {
    const removed = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, removed[0])
  }

  function revokePreview(item) {
    revokeCollectionUrls([item])
  }

  function clearReorderDragState() {
    clearDropTargetClass()
    state.reorder.dragPageId = null
    state.reorder.dropTargetId = null
    const dragging = elements.reorderPreview.querySelector(".is-dragging")
    if (dragging) {
      dragging.classList.remove("is-dragging")
    }
  }

  function clearDropTargetClass() {
    const target = elements.reorderPreview.querySelector(".is-drop-target")
    if (target) {
      target.classList.remove("is-drop-target")
    }
  }

  function findPageCard(node) {
    return node && node.closest ? node.closest("[data-id]") : null
  }

  function getExtractPreviewSelection() {
    if (state.extract.previews.length === 0) {
      return {
        selectedPages: new Set(),
        message: "Type page ranges below to select pages.",
      }
    }

    const rawText = String(elements.extractGroups.value || "").trim()
    if (!rawText) {
      return {
        selectedPages: new Set(),
        message: "Type page ranges below to highlight the pages you want.",
      }
    }

    const lines = rawText
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim()
      })
      .filter(Boolean)

    try {
      const selectedPages = new Set()
      lines.forEach(function (line) {
        parsePageSequence(line, state.extract.pageCount).forEach(function (pageIndex) {
          selectedPages.add(pageIndex + 1)
        })
      })

      return {
        selectedPages: selectedPages,
        message: selectedPages.size + " page(s) highlighted from your ranges.",
      }
    } catch (error) {
      return {
        selectedPages: new Set(),
        message: "Check your ranges. Example: 1-3 or 8,10-12.",
      }
    }
  }

  function setBusy(value) {
    state.busy = value
    updateControls()
  }

  function setStatus(element, message, kind) {
    element.textContent = message
    element.dataset.kind = kind
  }

  function isJpegFile(file) {
    return /image\/jpeg/i.test(file.type) || /\.(jpe?g)$/i.test(file.name)
  }

  function isPdfFile(file) {
    return /application\/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const image = new Image()
      image.onload = function () {
        resolve(image)
      }
      image.onerror = function () {
        reject(new Error("A JPG file could not be read."))
      }
      image.src = src
    })
  }

  function canvasToJpegBlob(canvas, quality) {
    return canvasToBlobOfType(canvas, "image/jpeg", quality)
  }

  function canvasToBlobOfType(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob(
          function (blob) {
            if (blob) {
              resolve(blob)
              return
            }
            reject(new Error("The browser could not create the image."))
          },
          type,
          quality
        )
        return
      }

      try {
        resolve(dataUrlToBlob(canvas.toDataURL(type, quality)))
      } catch (error) {
        reject(new Error("The browser could not create the image."))
      }
    })
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",")
    const mimeMatch = parts[0].match(/data:(.*?);base64/)
    const binary = atob(parts[1])
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return new Blob([bytes], { type: mimeMatch ? mimeMatch[1] : "image/jpeg" })
  }

  function getPageLayout(imageWidth, imageHeight, pageSizeKey, orientationMode, marginPoints) {
    const pageSize = LocalJpgPdf.PAGE_SIZES[pageSizeKey] || LocalJpgPdf.PAGE_SIZES.a4
    let pageWidth = pageSize.width
    let pageHeight = pageSize.height
    const shouldRotate = orientationMode === "landscape" || (orientationMode === "auto" && imageWidth > imageHeight)

    if (shouldRotate) {
      pageWidth = pageSize.height
      pageHeight = pageSize.width
    }

    const clampedMargin = Math.max(0, Math.min(marginPoints, Math.min(pageWidth, pageHeight) / 3))
    const usableWidth = Math.max(36, pageWidth - clampedMargin * 2)
    const usableHeight = Math.max(36, pageHeight - clampedMargin * 2)
    const scale = Math.min(usableWidth / imageWidth, usableHeight / imageHeight)

    return {
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      drawWidth: imageWidth * scale,
      drawHeight: imageHeight * scale,
      drawX: (pageWidth - imageWidth * scale) / 2,
      drawY: (pageHeight - imageHeight * scale) / 2,
    }
  }

  function applyOrientationTransform(context, orientation, width, height) {
    switch (orientation) {
      case 2:
        context.transform(-1, 0, 0, 1, width, 0)
        break
      case 3:
        context.transform(-1, 0, 0, -1, width, height)
        break
      case 4:
        context.transform(1, 0, 0, -1, 0, height)
        break
      case 5:
        context.transform(0, 1, 1, 0, 0, 0)
        break
      case 6:
        context.transform(0, 1, -1, 0, height, 0)
        break
      case 7:
        context.transform(0, -1, -1, 0, height, width)
        break
      case 8:
        context.transform(0, -1, 1, 0, 0, width)
        break
      default:
        context.transform(1, 0, 0, 1, 0, 0)
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(function () {
      URL.revokeObjectURL(url)
    }, 1000)
  }

  function downloadAllImages() {
    if (state.images.results.length === 0) {
      return
    }

    state.images.results.forEach(function (item, index) {
      window.setTimeout(function () {
        const link = document.createElement("a")
        link.href = item.downloadUrl
        link.download = item.name
        document.body.appendChild(link)
        link.click()
        link.remove()
      }, index * 160)
    })
  }

  async function ensurePdfEngines() {
    if (!window.PDFLib || !window.pdfjsLib) {
      throw new Error("Browser PDF libraries are missing. Refresh the page and try again.")
    }

    if (!pdfRuntimeReady) {
      if (window.pdfjsLib.GlobalWorkerOptions && location.protocol !== "file:") {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.js", window.location.href).toString()
      }
      pdfRuntimeReady = true
    }
  }

  async function readFileBytes(file) {
    return new Uint8Array(await file.arrayBuffer())
  }

  async function openPdfInPdfJs(bytes) {
    await ensurePdfEngines()
    const loadingTask = window.pdfjsLib.getDocument({
      data: bytes,
      disableWorker: location.protocol === "file:",
      isEvalSupported: false,
      useWorkerFetch: false,
    })

    return loadingTask.promise
  }

  async function renderPdfFileToImages(file, options) {
    const bytes = await readFileBytes(file)
    const pdfDocument = await openPdfInPdfJs(bytes)
    const baseName = sanitizeFilename((options && options.baseName) || baseNameFromFile(file.name) || "pages") || "pages"
    const pageIndexes =
      options && Array.isArray(options.pages) && options.pages.length > 0
        ? options.pages.slice()
        : Array.from({ length: pdfDocument.numPages }, function (_, index) {
            return index
          })
    const format = options && options.format === "jpg" ? "jpg" : "png"
    const mimeType = format === "jpg" ? "image/jpeg" : "image/png"
    const scale = getPdfScaleFromDpi(options && options.dpi)
    const results = []

    try {
      for (let index = 0; index < pageIndexes.length; index += 1) {
        const pageIndex = pageIndexes[index]
        if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pdfDocument.numPages) {
          throw new Error("One of the requested pages is out of range.")
        }

        const page = await pdfDocument.getPage(pageIndex + 1)
        const viewport = page.getViewport({ scale: scale })
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.ceil(viewport.width))
        canvas.height = Math.max(1, Math.ceil(viewport.height))
        const context = canvas.getContext("2d", { alpha: false })

        if (!context) {
          throw new Error("This browser cannot render PDF pages.")
        }

        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        const blob = await canvasToBlobOfType(canvas, mimeType, format === "jpg" ? 0.92 : undefined)
        const objectUrl = URL.createObjectURL(blob)

        results.push({
          id: generateId(),
          page: pageIndex + 1,
          name: baseName + "-page-" + (pageIndex + 1) + "." + format,
          previewUrl: objectUrl,
          downloadUrl: objectUrl,
        })

        page.cleanup()
        canvas.width = 0
        canvas.height = 0
      }

      return results
    } finally {
      if (typeof pdfDocument.cleanup === "function") {
        pdfDocument.cleanup()
      }
      if (typeof pdfDocument.destroy === "function") {
        await pdfDocument.destroy()
      }
    }
  }

  function getPdfScaleFromDpi(value) {
    const dpi = Number(value) || 72
    return Math.max(0.5, dpi / 72)
  }

  function createPdfDownloadItem(pdfBytes, filename, meta) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    return {
      name: filename,
      label: meta && meta.label ? meta.label : null,
      pageCount: meta && meta.pageCount ? meta.pageCount : null,
      downloadUrl: URL.createObjectURL(blob),
    }
  }

  function revokeCollectionUrls(items) {
    const seen = new Set()

    Array.from(items || []).forEach(function (item) {
      ;["previewUrl", "downloadUrl"].forEach(function (key) {
        const value = item && item[key]
        if (value && !seen.has(value)) {
          seen.add(value)
          revokeObjectUrl(value)
        }
      })
    })
  }

  function revokeObjectUrl(value) {
    if (typeof value === "string" && value.indexOf("blob:") === 0) {
      URL.revokeObjectURL(value)
    }
  }

  function parseExtractGroups(text, pageCount) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim()
      })
      .filter(Boolean)

    if (lines.length === 0) {
      throw new Error("Add at least one line of page ranges.")
    }

    return lines.map(function (line) {
      return {
        label: line,
        pages: parsePageSequence(line, pageCount),
      }
    })
  }

  function parsePageSequence(spec, pageCount) {
    const tokens = String(spec || "")
      .split(",")
      .map(function (token) {
        return token.trim()
      })
      .filter(Boolean)

    if (tokens.length === 0) {
      throw new Error("Add at least one page number or range.")
    }

    const pages = []

    tokens.forEach(function (token) {
      if (/^\d+$/.test(token)) {
        const pageNumber = Number(token)
        assertPageNumber(pageNumber, pageCount)
        pages.push(pageNumber - 1)
        return
      }

      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/)
      if (!rangeMatch) {
        throw new Error("Invalid page token: " + token)
      }

      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      assertPageNumber(start, pageCount)
      assertPageNumber(end, pageCount)
      const step = start <= end ? 1 : -1

      for (let pageNumber = start; step > 0 ? pageNumber <= end : pageNumber >= end; pageNumber += step) {
        pages.push(pageNumber - 1)
      }
    })

    return pages
  }

  function assertPageNumber(pageNumber, pageCount) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
      throw new Error("Page numbers must stay between 1 and " + pageCount + ".")
    }
  }

  function pageCountText(pageCount) {
    return pageCount + " page" + (pageCount === 1 ? "" : "s")
  }

  function baseNameFromFile(filename) {
    return String(filename || "").replace(/\.[^.]+$/, "")
  }

  function sanitizeFilename(value) {
    return String(value || "")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/[. ]+$/g, "")
  }

  function timestampName(prefix) {
    const now = new Date()
    return (
      prefix +
      "-" +
      [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds()),
      ].join("")
    )
  }

  function pad(value) {
    return String(value).padStart(2, "0")
  }

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + " B"
    }

    const units = ["KB", "MB", "GB"]
    let size = bytes / 1024
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex += 1
    }

    return size.toFixed(size >= 100 ? 0 : 1) + " " + units[unitIndex]
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character]
    })
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID()
    }

    return "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10)
  }
})()




