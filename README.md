# Slate PDF Studio

Slate PDF Studio is a browser-first PDF toolkit for everyday file work.

## Features

- JPG or JPEG to PDF
- PDF to PNG or JPG
- Merge multiple PDFs
- Extract one PDF or multiple PDFs from page ranges
- Reorder PDF pages with drag and drop
- First-page previews for merge and page previews for extract/reorder

## Privacy

- Every task runs in the browser.
- No file uploads are required.
- GitHub Pages hosting works because there is no server dependency in the app itself.

## Run locally

1. Open PowerShell in `D:\Codex\jpg-to-pdf-local`.
2. Run `node server.js` or `npm start`.
3. Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

You can also host the folder on any static host.

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, enable Pages from the repository settings or use the included GitHub Actions workflow.
3. Your site will be available at `https://your-user.github.io/your-repo/`.

## Notes

- Large PDFs can use more memory because processing happens in the browser.
- `server.js` is only for local static serving now. The app UI no longer depends on `/api` routes.
- The vendored browser libraries live in `vendor/` so the repo can be deployed directly.
