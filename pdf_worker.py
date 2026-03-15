import json
import os
import sys

try:
    import fitz
except Exception as error:  # pragma: no cover
    print(str(error), file=sys.stderr)
    sys.exit(1)


def emit_json(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True))


def read_config(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def safe_page_list(pages, page_count):
    result = []
    for value in pages:
        if not isinstance(value, int):
            raise ValueError("Page indexes must be integers.")
        if value < 0 or value >= page_count:
            raise ValueError("Page index out of range.")
        result.append(value)
    return result


def resolve_render_pages(config, page_count):
    pages = config.get("pages")
    if pages is None:
        return list(range(page_count))
    return safe_page_list(pages, page_count)


def cmd_health():
    emit_json({"ok": True, "worker": "PyMuPDF", "version": getattr(fitz, "VersionBind", "unknown")})


def cmd_inspect(config_path):
    config = read_config(config_path)
    document = fitz.open(config["input"])
    try:
        emit_json({"ok": True, "pageCount": document.page_count})
    finally:
        document.close()


def cmd_render(config_path):
    config = read_config(config_path)
    document = fitz.open(config["input"])
    output_dir = config["outputDir"]
    output_format = "jpg" if config.get("format") == "jpg" else "png"
    dpi = int(config.get("dpi") or 144)
    base_name = config.get("baseName") or "pages"
    files = []

    try:
        for page_index in resolve_render_pages(config, document.page_count):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(dpi=dpi, alpha=False)
            filename = f"{base_name}-page-{page_index + 1}.{output_format}"
            absolute_path = os.path.join(output_dir, filename)
            pixmap.save(absolute_path)
            files.append(
                {
                    "page": page_index + 1,
                    "path": absolute_path,
                    "name": filename,
                    "contentType": "image/jpeg" if output_format == "jpg" else "image/png",
                    "preview": True,
                }
            )

        emit_json({"ok": True, "files": files})
    finally:
        document.close()


def cmd_merge(config_path):
    config = read_config(config_path)
    output_path = config["output"]
    merged = fitz.open()

    try:
        for input_path in config["inputs"]:
            source = fitz.open(input_path)
            try:
                merged.insert_pdf(source)
            finally:
                source.close()

        merged.save(output_path, garbage=3, deflate=True)
        emit_json({"ok": True, "output": output_path})
    finally:
        merged.close()


def cmd_extract(config_path):
    config = read_config(config_path)
    source = fitz.open(config["input"])
    files = []

    try:
        page_count = source.page_count
        for index, group in enumerate(config["groups"]):
            pages = safe_page_list(group["pages"], page_count)
            output_path = group["output"]
            document = fitz.open()
            try:
                for page_index in pages:
                    document.insert_pdf(source, from_page=page_index, to_page=page_index)
                document.save(output_path, garbage=3, deflate=True)
            finally:
                document.close()

            files.append(
                {
                    "path": output_path,
                    "name": group["name"],
                    "label": group.get("label") or f"Part {index + 1}",
                    "pageCount": len(pages),
                    "contentType": "application/pdf",
                }
            )

        emit_json({"ok": True, "files": files})
    finally:
        source.close()


def cmd_reorder(config_path):
    config = read_config(config_path)
    source = fitz.open(config["input"])
    output_path = config["output"]
    order = safe_page_list(config["pages"], source.page_count)
    document = fitz.open()

    try:
        for page_index in order:
            document.insert_pdf(source, from_page=page_index, to_page=page_index)
        document.save(output_path, garbage=3, deflate=True)
        emit_json(
            {
                "ok": True,
                "file": {
                    "path": output_path,
                    "name": config["name"],
                    "label": config.get("label") or "Reordered PDF",
                    "pageCount": len(order),
                    "contentType": "application/pdf",
                }
            }
        )
    finally:
        document.close()
        source.close()


def main(argv):
    if len(argv) < 2:
        raise ValueError("A worker command is required.")

    command = argv[1]

    if command == "health":
        cmd_health()
        return

    if len(argv) < 3:
        raise ValueError("A config path is required.")

    config_path = argv[2]

    if command == "inspect":
        cmd_inspect(config_path)
        return

    if command == "render":
        cmd_render(config_path)
        return

    if command == "merge":
        cmd_merge(config_path)
        return

    if command == "extract":
        cmd_extract(config_path)
        return

    if command == "reorder":
        cmd_reorder(config_path)
        return

    raise ValueError(f"Unknown worker command: {command}")


if __name__ == "__main__":
    try:
        main(sys.argv)
    except Exception as error:  # pragma: no cover
        print(str(error), file=sys.stderr)
        sys.exit(1)
