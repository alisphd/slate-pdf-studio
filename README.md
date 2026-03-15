# Harbor PDF

![Harbor PDF logo](assets/harbor-mark.svg)

Harbor PDF is a privacy-first PDF toolkit that runs in the browser and keeps your original files on your own device.

Live site:
[https://alisphd.github.io/slate-pdf-studio/](https://alisphd.github.io/slate-pdf-studio/)

## Why People Can Trust It

Harbor PDF is designed so people can use it locally or online without worrying that their documents will be uploaded, overwritten, or silently stored somewhere else.

What stays safe:
- Your original JPG and PDF files are never edited in place.
- Every result is created as a new download.
- The app does not need an account.
- The app does not send document data to a cloud API.
- GitHub Pages only hosts the app files, not your documents.

What "online" means here:
- When you open the GitHub Pages site, your browser downloads the app code.
- After that, the PDF work happens inside your browser on your device.
- Your selected documents stay on your computer unless you manually upload them somewhere else.

## Features

- JPG or JPEG to PDF
- PDF to PNG or JPG
- Compress a PDF in the browser
- Merge multiple PDFs
- Extract one PDF or many PDFs from page ranges
- Reorder PDF pages with drag and drop
- Page previews for merge, extract, and reorder
- Static-host friendly setup for GitHub Pages

## Quick Start

### Use It Online

1. Open [https://alisphd.github.io/slate-pdf-studio/](https://alisphd.github.io/slate-pdf-studio/)
2. Choose the tool you want.
3. Select your local files.
4. Wait for the browser to generate the result.
5. Save the downloaded file wherever you want.

### Run It Locally On Your PC

Recommended method:

1. Open PowerShell in `D:\Codex\slate-pdf-studio`
2. Run `node server.js`
3. Open [http://127.0.0.1:4173](http://127.0.0.1:4173)

You can also use:
- `npm start`
- any other simple static file server

Why run a local server if the app is browser-based:
- it gives the most reliable behavior across browsers
- it serves the favicon and vendored browser libraries cleanly
- it mirrors the GitHub Pages deployment setup

## Safety Notes

Harbor PDF is built to reduce the fear of losing documents, but it is important to understand exactly what happens.

Your source files:
- The files you open in Harbor PDF stay where they already are on your computer.
- Harbor PDF does not rename, move, or overwrite those original files.
- If you close the browser tab, your original files are still untouched.

Your output files:
- Results are generated as new files.
- If you do not save a download, the generated result may be lost, but your original documents are still safe.
- If the browser crashes during processing, you may need to run the conversion again, but your source files are not damaged.

What Harbor PDF does not do:
- It does not automatically back up your files.
- It does not sync your documents to another computer.
- It does not replace a normal backup plan.

Best practice:
- Keep normal backups of important documents.
- Save generated files into a clear folder like `Exports` or `Processed PDFs`.
- For very large documents, close extra tabs so the browser has more memory available.

## How Each Tool Works

### JPG to PDF

Use this when you want to combine JPG or JPEG images into a single PDF.

Steps:
1. Open `JPG to PDF`
2. Add one or more JPG files
3. Set the output name, paper size, orientation, and margin
4. Reorder the images if needed
5. Click `Create PDF`

Result:
- a new PDF download is created
- your original images are unchanged

### PDF to Images

Use this when you want each PDF page exported as a PNG or JPG.

Steps:
1. Open `PDF to Images`
2. Add one PDF
3. Choose image format and DPI
4. Click `Export Images`

Result:
- each page is rendered into a new image file
- the original PDF stays unchanged

### Merge PDFs

Use this when you want several PDFs combined into one file.

Steps:
1. Open `Merge PDFs`
2. Add two or more PDFs
3. Check the first-page previews
4. Reorder the files if needed
5. Click `Merge PDFs`

Result:
- one new merged PDF is created
- the source PDFs are unchanged

### Compress PDF

Use this when you want to reduce the size of a scanned or image-heavy PDF.

Steps:
1. Open `Compress PDF`
2. Add one PDF
3. Choose an output name and compression level
4. Click `Compress PDF`

Important note:
- this tool rebuilds each page as a compressed image inside a new PDF
- it usually works best for scanned documents, screenshots, and image-based PDFs
- text-heavy PDFs may lose sharpness or searchable/selectable text
- Harbor PDF still leaves the original file unchanged

Result:
- one new compressed PDF is created
- the source PDF is unchanged

### Extract Pages

Use this when you want one PDF split into one or more smaller PDFs.

Steps:
1. Open `Extract Pages`
2. Add one PDF
3. Review the page previews
4. Type page groups such as `1-3` or `5,8-10`
5. Click `Extract`

How page groups work:
- one line equals one output PDF
- `1-3` means pages 1, 2, and 3
- `7` means only page 7
- `2,4-6` means page 2 plus pages 4, 5, and 6

Result:
- one new PDF is created for each line
- the source PDF is unchanged

### Reorder Pages

Use this when you want to rearrange pages before saving a new PDF.

Steps:
1. Open `Reorder Pages`
2. Add one PDF
3. Drag page thumbnails into the order you want
4. Use `Reset order` or `Reverse` if helpful
5. Click `Save reordered PDF`

Result:
- a new reordered PDF is created
- the original PDF is unchanged

## GitHub Pages Deployment

This repo already includes a GitHub Pages workflow:
[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)

To deploy your own copy:
1. Push the repo to GitHub
2. Open repository `Settings -> Pages`
3. Set `Source` to `GitHub Actions`
4. Open the `Actions` tab
5. Run the `Deploy GitHub Pages` workflow, or push a new commit to `main`

## Local Development

Project folder:
`D:\Codex\slate-pdf-studio`

Useful commands:
```powershell
node server.js
npm start
node tests/smoke-test.js
node tests/pdf-toolkit-smoke.js
```

Important files:
- `index.html` contains the UI shell
- `app.js` contains the browser-side logic
- `styles.css` contains the visual design
- `vendor/` contains the bundled browser PDF libraries
- `server.js` is only a lightweight local static server and legacy toolkit helper

## Limitations

- Very large PDFs can use a lot of browser memory.
- Older browsers may perform worse than current Chromium, Firefox, or Safari versions.
- The app creates downloads, so you still need to save the output files where you want them.

## Summary

Harbor PDF is safe for private day-to-day PDF work because it creates new output files, leaves the originals alone, and performs the document processing in your browser instead of uploading your files to a remote service.
