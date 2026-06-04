#!/usr/bin/env python3
"""
Limpia widgets manuales del tema Recife (Spring) vía FTP Tiendanube.
- Popup asesoría (popup-overlay, quiz Sil)
- Barra de regios / premios manual
"""
import ftplib
import os
import re
import ssl
import sys
from pathlib import Path

HOST = os.environ.get("TN_FTP_HOST", "ftp.tiendanube.com")
PORT = int(os.environ.get("TN_FTP_PORT", "21"))
USER = os.environ.get("TN_FTP_USER", "spring29")
PASS = os.environ.get("TN_FTP_PASS", "")
LOCAL = Path(os.environ.get("TN_THEME_DIR", "/tmp/spring-theme-clean"))


def connect_ftps(host: str, user: str, password: str, port: int = 21) -> ftplib.FTP_TLS:
    """Conexión FTPS explícita (AUTH TLS) — requerido por Tiendanube."""
    ctx = ssl.create_default_context()
    ftp = ftplib.FTP_TLS(context=ctx)
    ftp.connect(host, port, timeout=120)
    ftp.auth()
    ftp.login(user, password)
    ftp.prot_p()
    ftp.set_pasv(True)
    return ftp

MARKERS_ANY = [
    "popup-overlay",
    "cerrarPopup",
    "dpp-rewards-bar-root",
    "desbloquear-premios",
    "Soy Sil y ahora",
    "Tu asesora personal",
    "barra regalos",
    "barra-regalos",
]

MARKERS_REGALOS = [
    "65000",
    "90000",
    "120000",
    "140000",
    "Aros",
    "Collar",
    "Perfume",
    "Remera Spring",
]


def download_tree(ftp: ftplib.FTP, remote: str, local: Path) -> None:
    local.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []

    def on_line(line: str) -> None:
        lines.append(line)

    try:
        ftp.retrlines(f"LIST {remote}", on_line)
    except ftplib.error_perm as e:
        print(f"SKIP LIST {remote}: {e}")
        return

    for line in lines:
        parts = line.split(maxsplit=8)
        if len(parts) < 9:
            continue
        name = parts[-1]
        if name in (".", ".."):
            continue
        rpath = f"{remote.rstrip('/')}/{name}"
        lpath = local / name
        if parts[0].startswith("d"):
            download_tree(ftp, rpath, lpath)
        else:
            with open(lpath, "wb") as f:
                ftp.retrbinary(f"RETR {rpath}", f.write)
            print(f"  ↓ {rpath}")


def upload_tree(ftp: ftplib.FTP, local: Path, remote: str) -> None:
    for item in sorted(local.iterdir()):
        rpath = f"{remote.rstrip('/')}/{item.name}"
        if item.is_dir():
            try:
                ftp.mkd(rpath)
            except ftplib.error_perm:
                pass
            upload_tree(ftp, item, rpath)
        else:
            with open(item, "rb") as f:
                ftp.storbinary(f"STOR {rpath}", f)
            print(f"  ↑ {rpath}")


def remove_asesoria_block(text: str) -> str:
    """Quita bloques pegados de asesoria-spring / tn_asesoria_content."""
    original = text

    # Bloque completo desde <style> con #popup-overlay hasta </script> final del quiz
    m = re.search(
        r"<style>[\s\S]*?#popup-overlay[\s\S]*?</script>\s*",
        text,
        re.IGNORECASE,
    )
    if m:
        text = text[: m.start()] + text[m.end() :]

    # Popup HTML suelto
    text = re.sub(
        r"<!--\s*POPUP\s*-->[\s\S]*?</div>\s*</div>\s*</div>\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r'<div[^>]*id=["\']popup-overlay["\'][\s\S]*?</div>\s*(?=</div>|<!--|<header|{%)',
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Sección quiz + resultado
    text = re.sub(
        r'<section[^>]*id=["\']quiz["\'][\s\S]*?</section>\s*',
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r'<section[^>]*id=["\']resultado["\'][\s\S]*?</section>\s*',
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Scripts sueltos de asesoría
    text = re.sub(
        r"<script>[\s\S]*?cerrarPopup[\s\S]*?</script>\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"<script>[\s\S]*?api\.anthropic\.com[\s\S]*?</script>\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # CSS suelto popup
    text = re.sub(
        r"/\* POPUP \*/[\s\S]*?@keyframes bounce[\s\S]*?\}\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"#popup-overlay[\s\S]*?\.btn-wa:hover\{[^}]+\}\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    return text if text != original else text


def remove_regalos_block(text: str) -> str:
    original = text

    text = re.sub(
        r"<script>[\s\S]*?dpp-rewards[\s\S]*?</script>\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"<style>[\s\S]*?dpp-rewards[\s\S]*?</style>\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r'<[^>]*id=["\']dpp-rewards-bar-root["\'][\s\S]*?</[^>]+>\s*',
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Barra estática v7 (umbrales Spring)
    if "65000" in text and ("regalo" in text.lower() or "barra" in text.lower()):
        text = re.sub(
            r"<script>[\s\S]*?65000[\s\S]*?</script>\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"<style>[\s\S]*?65000[\s\S]*?</style>\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"<div[^>]*(?:barra|regalo|premio|rewards)[\s\S]*?</div>\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

    return text if text != original else text


def clean_file(path: Path) -> bool:
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return False

    if not any(m.lower() in raw.lower() for m in MARKERS_ANY):
        if not any(m in raw for m in MARKERS_REGALOS):
            return False

    cleaned = remove_regalos_block(remove_asesoria_block(raw))
    if cleaned == raw:
        return False

    backup = path.with_suffix(path.suffix + ".bak")
    if not backup.exists():
        backup.write_text(raw, encoding="utf-8")
    path.write_text(cleaned, encoding="utf-8")
    return True


def main() -> int:
    password = PASS or (sys.argv[1] if len(sys.argv) > 1 else "")
    if not password:
        print("Uso: TN_FTP_PASS=xxx python3 clean-spring-theme-ftp.py")
        print("  o: python3 clean-spring-theme-ftp.py <password>")
        return 1

    LOCAL.mkdir(parents=True, exist_ok=True)
    print(f"Conectando FTPS a {HOST}:{PORT} como {USER}...")
    ftp = connect_ftps(HOST, USER, password, PORT)
    print(f"PWD: {ftp.pwd()}")

    print("Descargando tema...")
    download_tree(ftp, ".", LOCAL)

    exts = {".tpl", ".liquid", ".html", ".htm", ".js", ".css"}
    changed: list[Path] = []
    for path in LOCAL.rglob("*"):
        if path.is_file() and path.suffix.lower() in exts:
            if clean_file(path):
                changed.append(path)
                print(f"  ✓ limpiado: {path.relative_to(LOCAL)}")

    if not changed:
        print("No se encontraron widgets en archivos del tema.")
        print("Buscá manualmente en layouts/, templates/, snippets/")
        for p in LOCAL.rglob("*"):
            if p.is_file() and p.suffix.lower() in exts:
                try:
                    t = p.read_text(encoding="utf-8", errors="replace")
                    for m in MARKERS_ANY:
                        if m.lower() in t.lower():
                            print(f"  ? posible: {p.relative_to(LOCAL)} ({m})")
                except Exception:
                    pass
        return 0

    print(f"Subiendo {len(changed)} archivo(s)...")
    for path in changed:
        rel = path.relative_to(LOCAL)
        remote = "." + "/" + str(rel).replace(os.sep, "/")
        with open(path, "rb") as f:
            ftp.storbinary(f"STOR {remote}", f)
        print(f"  ↑ {remote}")

    ftp.quit()
    print("Listo. Revisá la tienda en springvm.com.ar")
    print("Backups locales: *.bak junto a cada archivo en", LOCAL)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
