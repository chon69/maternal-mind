#!/usr/bin/env python3
"""Convierte los .md de los retiros a .docx via HTML + textutil.

Uso: python3 _md2docx.py retiro-1-volver-a-ti.md
Sin pandoc ni dependencias: cubre solo el subconjunto de Markdown que usan
estos documentos (encabezados, negrita, cursiva, citas, tablas, listas, hr).
"""
import html, re, subprocess, sys
from pathlib import Path

def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", t)
    return t

def convert(md):
    out, i, lines = [], 0, md.split("\n")
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1
        elif ln.startswith("|"):                                  # tabla
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip("|").split("|")])
                i += 1
            rows = [r for r in rows if not all(set(c) <= set("-: ") for c in r)]
            cells = "".join(
                "<tr>" + "".join(
                    f"<{'th' if n == 0 else 'td'}>{inline(c)}</{'th' if n == 0 else 'td'}>"
                    for c in r) + "</tr>"
                for n, r in enumerate(rows))
            out.append(f"<table border='1' cellpadding='6' cellspacing='0'>{cells}</table>")
        elif ln.startswith(">"):                                   # cita
            buf = []
            while i < len(lines) and (lines[i].startswith(">") or
                                      (buf and not lines[i].strip())):
                if not lines[i].strip():
                    if i + 1 < len(lines) and lines[i + 1].startswith(">"):
                        buf.append(""); i += 1; continue
                    break
                buf.append(lines[i].lstrip(">").strip()); i += 1
            body = "".join(f"<p>{inline(p)}</p>" for p in buf if p)
            out.append(f"<blockquote>{body}</blockquote>")
        elif ln.startswith("- "):                                  # lista
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:])}</li>"); i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
        elif re.match(r"^#{1,6} ", ln):                            # encabezado
            n = len(ln) - len(ln.lstrip("#"))
            out.append(f"<h{n}>{inline(ln[n:].strip())}</h{n}>"); i += 1
        elif ln.strip() == "---":
            out.append("<hr>"); i += 1
        else:                                                      # párrafo
            buf = []
            while i < len(lines) and lines[i].strip() and not re.match(
                    r"^(#{1,6} |[-|>]|---$)", lines[i]):
                buf.append(lines[i]); i += 1
            out.append(f"<p>{inline(' '.join(buf))}</p>")
    return "\n".join(out)

CSS = """body{font-family:Georgia,serif;font-size:11pt;line-height:1.5;margin:2.5cm}
h1{font-size:19pt;margin:26pt 0 10pt}h2{font-size:14pt;margin:20pt 0 6pt}
h3{font-size:12pt;margin:14pt 0 4pt;font-style:italic}
blockquote{margin:10pt 0;padding:8pt 14pt;background:#f4f4f0;border-left:3px solid #999}
table{border-collapse:collapse;margin:10pt 0;font-size:10pt}th{background:#eee;text-align:left}
hr{border:0;border-top:1px solid #ccc;margin:20pt 0}li{margin-bottom:3pt}"""

src = Path(sys.argv[1])
tmp = src.with_suffix(".tmp.html")
tmp.write_text(f"<html><head><meta charset='utf-8'><style>{CSS}</style></head>"
               f"<body>{convert(src.read_text())}</body></html>")
subprocess.run(["textutil", "-convert", "docx", str(tmp),
                "-output", str(src.with_suffix(".docx"))], check=True)
tmp.unlink()
print(f"{src.with_suffix('.docx').name} generado")
