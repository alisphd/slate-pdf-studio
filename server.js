const http = require("node:http")
const fs = require("node:fs")
const fsp = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const crypto = require("node:crypto")
const { spawn } = require("node:child_process")

const HOST = "127.0.0.1"
const PORT = Number(process.env.PORT || 4173)
const ROOT = __dirname
const TEMP_ROOT = path.join(os.tmpdir(), "harbor-pdf")
const SESSION_TTL_MS = 30 * 60 * 1000
const MAX_RAW_UPLOAD_BYTES = 150 * 1024 * 1024
const MAX_JSON_UPLOAD_BYTES = 250 * 1024 * 1024
const WORKER_PATH = path.join(ROOT, "pdf_worker.py")
const sessions = new Map()
let pythonCommandPromise = null
let workerHealthPromise = null

const STATIC_FILES = {
  "/": "index.html",
  "/index.html": "index.html",
  "/styles.css": "styles.css",
  "/app.js": "app.js",
  "/pdf-core.js": "pdf-core.js",
  "/README.md": "README.md",
  "/vendor/pdf-lib.min.js": "vendor/pdf-lib.min.js",
  "/vendor/pdf.min.js": "vendor/pdf.min.js",
  "/vendor/pdf.worker.min.js": "vendor/pdf.worker.min.js",
  "/assets/harbor-mark.svg": "assets/harbor-mark.svg",
  "/assets/favicon.svg": "assets/favicon.svg",
}
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
}

function sendJson(response, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload))
  response.writeHead(statusCode, {
    "Content-Length": body.length,
    "Content-Type": MIME_TYPES[".json"],
    "Cache-Control": "no-store",
  })
  response.end(body)
}

function sendText(response, statusCode, message) {
  const body = Buffer.from(String(message || ""))
  response.writeHead(statusCode, {
    "Content-Length": body.length,
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(body)
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream"
}

async function serveStatic(response, pathname) {
  const relativePath = STATIC_FILES[pathname]

  if (!relativePath) {
    sendText(response, 404, "Not found.")
    return
  }

  const absolutePath = path.join(ROOT, relativePath)
  const body = await fsp.readFile(absolutePath)
  response.writeHead(200, {
    "Content-Length": body.length,
    "Content-Type": getContentType(absolutePath),
    "Cache-Control": pathname === "/" ? "no-store" : "public, max-age=300",
  })
  response.end(body)
}

function collectRequestBody(request, maxBytes) {
  return new Promise(function (resolve, reject) {
    const chunks = []
    let total = 0

    request.on("data", function (chunk) {
      total += chunk.length
      if (total > maxBytes) {
        reject(new Error("The file is too large for this local server."))
        request.destroy()
        return
      }

      chunks.push(chunk)
    })

    request.on("end", function () {
      resolve(Buffer.concat(chunks))
    })

    request.on("error", reject)
  })
}

async function collectJsonRequest(request, maxBytes) {
  const rawBody = await collectRequestBody(request, maxBytes)
  if (rawBody.length === 0) {
    return {}
  }

  try {
    return JSON.parse(rawBody.toString("utf8"))
  } catch (error) {
    throw new Error("The request payload was not valid JSON.")
  }
}

function runCommandCapture(command, args, options) {
  return new Promise(function (resolve, reject) {
    const child = spawn(command, args, {
      cwd: options && options.cwd ? options.cwd : ROOT,
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""

    child.stdout.on("data", function (chunk) {
      stdout += chunk.toString()
    })

    child.stderr.on("data", function (chunk) {
      stderr += chunk.toString()
    })

    child.on("error", reject)
    child.on("close", function (code) {
      if (code === 0) {
        resolve({ stdout: stdout, stderr: stderr })
        return
      }

      const error = new Error(stderr.trim() || stdout.trim() || command + " exited with code " + code)
      error.code = code
      error.stdout = stdout
      error.stderr = stderr
      reject(error)
    })
  })
}

async function findPythonCommand() {
  const executableNames = ["python.exe", "python"]
  const pathDirectories = String(process.env.PATH || "")
    .split(path.delimiter)
    .map(function (entry) {
      return entry.trim()
    })
    .filter(Boolean)

  const commonCandidates = [
    process.env.PYTHON_PATH,
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313", "python.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "python.exe"),
    path.join(process.env.ProgramFiles || "C:\\Program Files", "Python313", "python.exe"),
  ]

  const pathCandidates = pathDirectories.flatMap(function (directory) {
    return executableNames.map(function (name) {
      return path.join(directory, name)
    })
  })

  const directCandidates = Array.from(new Set(commonCandidates.concat(pathCandidates).filter(Boolean)))

  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  const whereCommand = path.join(process.env.WINDIR || "C:\\Windows", "System32", "where.exe")
  try {
    const result = await runCommandCapture(whereCommand, ["python"])
    const match = result.stdout
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim()
      })
      .find(function (line) {
        return line && fs.existsSync(line)
      })

    if (match) {
      return match
    }
  } catch (error) {
    return null
  }

  return null
}

async function resolvePythonCommand() {
  if (!pythonCommandPromise) {
    pythonCommandPromise = findPythonCommand().catch(function (error) {
      pythonCommandPromise = null
      throw error
    })
  }

  return pythonCommandPromise
}

async function resolvePdfWorker() {
  if (!workerHealthPromise) {
    workerHealthPromise = (async function () {
      const pythonCommand = await resolvePythonCommand()

      if (!pythonCommand) {
        throw new Error("Python was not found on this machine.")
      }

      const result = await runCommandCapture(pythonCommand, [WORKER_PATH, "health"])
      const payload = JSON.parse(result.stdout || "{}")

      if (!payload.ok) {
        throw new Error("The local PDF worker is not available.")
      }

      return {
        pythonCommand: pythonCommand,
        worker: payload.worker || "PyMuPDF",
        version: payload.version || null,
      }
    })().catch(function (error) {
      workerHealthPromise = null
      throw error
    })
  }

  return workerHealthPromise
}

async function ensureTempRoot() {
  await fsp.mkdir(TEMP_ROOT, { recursive: true })
}

function createSessionId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex")
}

function sanitizeBaseName(value) {
  const sanitized = String(value || "document")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")

  return sanitized || "document"
}

async function createOperationDir(prefix) {
  await ensureTempRoot()
  const dir = path.join(TEMP_ROOT, prefix + "-" + createSessionId())
  await fsp.mkdir(dir, { recursive: true })
  return dir
}

async function withTemporaryDir(prefix, callback) {
  const dir = await createOperationDir(prefix)

  try {
    return await callback(dir)
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
}

async function runWorkerJson(command, payload, dir) {
  const worker = await resolvePdfWorker()
  const args = [WORKER_PATH, command]

  if (payload !== undefined && payload !== null) {
    const configPath = path.join(dir, "worker-config.json")
    await fsp.writeFile(configPath, JSON.stringify(payload), "utf8")
    args.push(configPath)
  }

  const result = await runCommandCapture(worker.pythonCommand, args, { cwd: dir })
  const rawOutput = String(result.stdout || "").trim()

  try {
    return JSON.parse(rawOutput || "{}")
  } catch (error) {
    const lines = rawOutput
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim()
      })
      .filter(Boolean)

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(lines[index])
      } catch (lineError) {
        continue
      }
    }

    throw new Error(result.stderr.trim() || "The local PDF worker returned an invalid response.")
  }
}

function scheduleCleanup(sessionId) {
  const timer = setTimeout(function () {
    void cleanupSession(sessionId)
  }, SESSION_TTL_MS)

  if (typeof timer.unref === "function") {
    timer.unref()
  }
}

async function cleanupSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) {
    return
  }

  sessions.delete(sessionId)
  await fsp.rm(session.dir, { recursive: true, force: true })
}

function normalizeSessionFiles(files) {
  return files.map(function (file, index) {
    return {
      id: String(index + 1),
      path: file.path,
      contentType: file.contentType || getContentType(file.path),
      downloadName: file.name || path.basename(file.path),
      preview: Boolean(file.preview),
      label: file.label || null,
      page: file.page || null,
      pageCount: file.pageCount || null,
    }
  })
}

function toPublicFileList(sessionId, files) {
  return files.map(function (file) {
    return {
      id: file.id,
      name: file.downloadName,
      label: file.label,
      page: file.page,
      pageCount: file.pageCount,
      previewUrl: file.preview ? "/downloads/" + sessionId + "/" + file.id + "?inline=1" : null,
      downloadUrl: "/downloads/" + sessionId + "/" + file.id + "?download=1",
    }
  })
}

function registerSession(dir, files) {
  const sessionId = createSessionId()
  const normalizedFiles = normalizeSessionFiles(files)
  sessions.set(sessionId, { dir: dir, files: normalizedFiles, createdAt: Date.now() })
  scheduleCleanup(sessionId)

  return {
    sessionId: sessionId,
    files: normalizedFiles,
    publicFiles: toPublicFileList(sessionId, normalizedFiles),
  }
}

async function writePdfBuffer(dir, filename, buffer) {
  const safeName = sanitizeBaseName(filename).replace(/\.pdf$/i, "") + ".pdf"
  const absolutePath = path.join(dir, safeName)
  await fsp.writeFile(absolutePath, buffer)
  return absolutePath
}

function decodeBase64File(payload, defaultName) {
  if (!payload || typeof payload.data !== "string") {
    throw new Error("One of the PDF files was missing file data.")
  }

  try {
    return {
      name: payload.name || defaultName || "document.pdf",
      buffer: Buffer.from(payload.data, "base64"),
    }
  } catch (error) {
    throw new Error("One of the PDF files could not be decoded.")
  }
}

async function inspectPdfBuffer(pdfBuffer) {
  return withTemporaryDir("inspect", async function (dir) {
    const inputPath = path.join(dir, "input.pdf")
    await fsp.writeFile(inputPath, pdfBuffer)
    const payload = await runWorkerJson("inspect", { input: inputPath }, dir)
    return { pageCount: Number(payload.pageCount) || 0 }
  })
}

function parsePageIndexesParam(rawValue) {
  if (!rawValue) {
    return null
  }

  return String(rawValue)
    .split(",")
    .map(function (value) {
      return value.trim()
    })
    .filter(Boolean)
    .map(function (value) {
      const index = Number(value)
      if (!Number.isInteger(index) || index < 0) {
        throw new Error("Preview page indexes must be zero-based integers.")
      }
      return index
    })
}

async function convertPdfBufferToImages(pdfBuffer, options) {
  const dir = await createOperationDir("render")
  const inputPath = path.join(dir, "input.pdf")
  await fsp.writeFile(inputPath, pdfBuffer)

  const renderOptions = {
    input: inputPath,
    outputDir: dir,
    format: options && options.format === "jpg" ? "jpg" : "png",
    dpi: options && options.dpi ? Number(options.dpi) : 144,
    baseName: sanitizeBaseName(options && options.baseName),
  }

  if (options && Array.isArray(options.pages) && options.pages.length > 0) {
    renderOptions.pages = options.pages.map(function (value) {
      return Number(value)
    })
  }

  const payload = await runWorkerJson("render", renderOptions, dir)

  return registerSession(dir, payload.files || [])
}

async function mergePdfBuffers(filePayloads, outputName) {
  const dir = await createOperationDir("merge")
  const inputPaths = []

  for (let index = 0; index < filePayloads.length; index += 1) {
    const decoded = decodeBase64File(filePayloads[index], "document-" + (index + 1) + ".pdf")
    inputPaths.push(await writePdfBuffer(dir, decoded.name, decoded.buffer))
  }

  const finalName = sanitizeBaseName(outputName || "merged") + ".pdf"
  const outputPath = path.join(dir, finalName)

  await runWorkerJson(
    "merge",
    {
      inputs: inputPaths,
      output: outputPath,
    },
    dir
  )

  return registerSession(dir, [
    {
      path: outputPath,
      name: finalName,
      label: "Merged PDF",
      contentType: "application/pdf",
    },
  ])
}

async function extractPdfBuffer(filePayload, groups, outputName) {
  const dir = await createOperationDir("extract")
  const decoded = decodeBase64File(filePayload, "document.pdf")
  const inputPath = await writePdfBuffer(dir, decoded.name, decoded.buffer)
  const baseName = sanitizeBaseName(outputName || decoded.name || "extract")

  const workerGroups = groups.map(function (group, index) {
    return {
      label: group.label || "Part " + (index + 1),
      name: baseName + "-part-" + (index + 1) + ".pdf",
      output: path.join(dir, baseName + "-part-" + (index + 1) + ".pdf"),
      pages: group.pages,
    }
  })

  const payload = await runWorkerJson(
    "extract",
    {
      input: inputPath,
      groups: workerGroups,
    },
    dir
  )

  return registerSession(dir, payload.files || [])
}

async function reorderPdfBuffer(filePayload, pages, outputName) {
  const dir = await createOperationDir("reorder")
  const decoded = decodeBase64File(filePayload, "document.pdf")
  const inputPath = await writePdfBuffer(dir, decoded.name, decoded.buffer)
  const finalName = sanitizeBaseName(outputName || decoded.name || "reordered") + ".pdf"
  const outputPath = path.join(dir, finalName)

  const payload = await runWorkerJson(
    "reorder",
    {
      input: inputPath,
      output: outputPath,
      name: finalName,
      pages: pages,
      label: "Reordered PDF",
    },
    dir
  )

  return registerSession(dir, [payload.file])
}

async function handleHealth(response) {
  try {
    const worker = await resolvePdfWorker()
    sendJson(response, 200, {
      ok: true,
      localOnly: true,
      workerAvailable: true,
      worker: worker.worker,
      version: worker.version,
    })
  } catch (error) {
    sendJson(response, 200, {
      ok: true,
      localOnly: true,
      workerAvailable: false,
      worker: null,
      version: null,
      message: error && error.message ? error.message : "The local PDF worker is unavailable.",
    })
  }
}

async function handlePdfInspect(request, response) {
  const pdfBuffer = await collectRequestBody(request, MAX_RAW_UPLOAD_BYTES)

  if (pdfBuffer.length === 0) {
    sendJson(response, 400, { ok: false, error: "No PDF file was uploaded to the local server." })
    return
  }

  const result = await inspectPdfBuffer(pdfBuffer)
  sendJson(response, 200, { ok: true, pageCount: result.pageCount })
}

async function handlePdfToImages(request, response, url) {
  const pdfBuffer = await collectRequestBody(request, MAX_RAW_UPLOAD_BYTES)

  if (pdfBuffer.length === 0) {
    sendJson(response, 400, { ok: false, error: "No PDF file was uploaded to the local server." })
    return
  }

  const result = await convertPdfBufferToImages(pdfBuffer, {
    format: url.searchParams.get("format"),
    dpi: url.searchParams.get("dpi"),
    baseName: url.searchParams.get("name") || request.headers["x-filename"] || "pages",
  })

  sendJson(response, 200, {
    ok: true,
    files: result.publicFiles,
  })
}

async function handlePdfPreview(request, response, url) {
  const pdfBuffer = await collectRequestBody(request, MAX_RAW_UPLOAD_BYTES)

  if (pdfBuffer.length === 0) {
    sendJson(response, 400, { ok: false, error: "No PDF file was uploaded to the local server." })
    return
  }

  const result = await convertPdfBufferToImages(pdfBuffer, {
    format: "png",
    dpi: url.searchParams.get("dpi") || 72,
    baseName: url.searchParams.get("name") || request.headers["x-filename"] || "preview",
    pages: parsePageIndexesParam(url.searchParams.get("pages")),
  })

  sendJson(response, 200, {
    ok: true,
    files: result.publicFiles,
  })
}

async function handlePdfMerge(request, response) {
  const payload = await collectJsonRequest(request, MAX_JSON_UPLOAD_BYTES)
  const files = Array.isArray(payload.files) ? payload.files : []

  if (files.length < 2) {
    sendJson(response, 400, { ok: false, error: "Choose at least two PDF files to merge." })
    return
  }

  const result = await mergePdfBuffers(files, payload.outputName)
  sendJson(response, 200, { ok: true, files: result.publicFiles })
}

async function handlePdfExtract(request, response) {
  const payload = await collectJsonRequest(request, MAX_JSON_UPLOAD_BYTES)
  const groups = Array.isArray(payload.groups) ? payload.groups : []

  if (!payload.file) {
    sendJson(response, 400, { ok: false, error: "Choose a PDF file to extract from." })
    return
  }

  if (groups.length === 0) {
    sendJson(response, 400, { ok: false, error: "Add at least one page group to extract." })
    return
  }

  const result = await extractPdfBuffer(payload.file, groups, payload.outputName)
  sendJson(response, 200, { ok: true, files: result.publicFiles })
}

async function handlePdfReorder(request, response) {
  const payload = await collectJsonRequest(request, MAX_JSON_UPLOAD_BYTES)
  const pages = Array.isArray(payload.pages) ? payload.pages : []

  if (!payload.file) {
    sendJson(response, 400, { ok: false, error: "Choose a PDF file to reorder." })
    return
  }

  if (pages.length === 0) {
    sendJson(response, 400, { ok: false, error: "Add a page order before exporting." })
    return
  }

  const result = await reorderPdfBuffer(payload.file, pages, payload.outputName)
  sendJson(response, 200, { ok: true, files: result.publicFiles })
}

async function handleDownload(response, pathname, url) {
  const parts = pathname.split("/").filter(Boolean)
  const sessionId = parts[1]
  const fileId = parts[2]
  const session = sessions.get(sessionId)

  if (!session) {
    sendText(response, 404, "This local download has expired.")
    return
  }

  const file = session.files.find(function (entry) {
    return entry.id === fileId
  })

  if (!file) {
    sendText(response, 404, "File not found.")
    return
  }

  const inline = url.searchParams.get("inline") === "1" && url.searchParams.get("download") !== "1"
  const disposition = (inline ? "inline" : "attachment") + '; filename="' + file.downloadName.replace(/"/g, "") + '"'
  const stream = fs.createReadStream(file.path)

  stream.on("error", function () {
    sendText(response, 500, "Could not read the generated file.")
  })

  response.writeHead(200, {
    "Content-Type": file.contentType,
    "Content-Disposition": disposition,
    "Cache-Control": "no-store",
  })
  stream.pipe(response)
}

async function routeRequest(request, response) {
  const url = new URL(request.url, "http://" + (request.headers.host || HOST + ":" + PORT))
  const pathname = url.pathname

  if (request.method === "GET" && pathname in STATIC_FILES) {
    await serveStatic(response, pathname)
    return
  }

  if (request.method === "GET" && pathname === "/api/health") {
    await handleHealth(response)
    return
  }

  if (request.method === "POST" && pathname === "/api/pdf-inspect") {
    await handlePdfInspect(request, response)
    return
  }

  if (request.method === "POST" && pathname === "/api/pdf-to-images") {
    await handlePdfToImages(request, response, url)
    return
  }

  if (request.method === "POST" && pathname === "/api/pdf-preview") {
    await handlePdfPreview(request, response, url)
    return
  }

  if (request.method === "POST" && pathname === "/api/pdf-merge") {
    await handlePdfMerge(request, response)
    return
  }

  if (request.method === "POST" && pathname === "/api/pdf-extract") {
    await handlePdfExtract(request, response)
    return
  }

  if (request.method === "POST" && pathname === "/api/pdf-reorder") {
    await handlePdfReorder(request, response)
    return
  }

  if (request.method === "GET" && pathname.startsWith("/downloads/")) {
    await handleDownload(response, pathname, url)
    return
  }

  sendText(response, 404, "Not found.")
}

function createServer() {
  return http.createServer(function (request, response) {
    void routeRequest(request, response).catch(function (error) {
      sendJson(response, 500, {
        ok: false,
        error: error && error.message ? error.message : "Unexpected local server error.",
      })
    })
  })
}

function startServer() {
  const server = createServer()
  return new Promise(function (resolve, reject) {
    server.once("error", reject)
    server.listen(PORT, HOST, function () {
      console.log("Harbor PDF running at http://" + HOST + ":" + PORT)
      resolve(server)
    })
  })
}

if (require.main === module) {
  startServer().catch(function (error) {
    console.error(error && error.message ? error.message : error)
    process.exitCode = 1
  })
}

module.exports = {
  cleanupSession: cleanupSession,
  convertPdfBufferToImages: convertPdfBufferToImages,
  createServer: createServer,
  extractPdfBuffer: extractPdfBuffer,
  inspectPdfBuffer: inspectPdfBuffer,
  mergePdfBuffers: mergePdfBuffers,
  reorderPdfBuffer: reorderPdfBuffer,
  resolvePdfWorker: resolvePdfWorker,
  sanitizeBaseName: sanitizeBaseName,
  startServer: startServer,
}









