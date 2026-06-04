#!/usr/bin/env python3
"""Upload widget.js to Partner Portal script 7124 (non-interactive)."""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

SCRIPT_URL = "https://partners.tiendanube.com/applications/details/33285/script/7124"
WIDGET_PATH = Path(__file__).resolve().parent.parent / "public" / "partner" / "widget.js"


def main():
    if not WIDGET_PATH.exists():
        print("Missing:", WIDGET_PATH, file=sys.stderr)
        sys.exit(1)

    with sync_playwright() as p:
        chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        browser = p.chromium.launch(
            executable_path=chrome,
            headless=False,
            slow_mo=100,
            args=["--no-sandbox", "--disable-gpu"],
        )
        context = browser.new_context()
        page = context.new_page()
        print("Opening Partner Portal…")
        page.goto(SCRIPT_URL, wait_until="domcontentloaded", timeout=120000)
        page.wait_for_timeout(3000)

        if "login" in page.url.lower() or page.locator('input[type="password"]').count():
            print("Login required — waiting 90s for manual login…")
            page.wait_for_url("**/script/7124**", timeout=90000)

        add_btn = page.get_by_role("button", name="Agregar versión").first
        add_btn.wait_for(timeout=30000)
        add_btn.click()

        file_input = page.locator('input[type="file"][name="file"]').first
        if file_input.count() == 0:
            file_input = page.locator('input[type="file"]').first
        file_input.wait_for(state="attached", timeout=15000)
        file_input.set_input_files(str(WIDGET_PATH))
        print("Uploaded:", WIDGET_PATH)
        page.wait_for_timeout(4000)

        install_btn = page.get_by_role("button", name="Instalar en las tiendas").first
        if install_btn.is_visible():
            install_btn.click()
            print("Clicked Instalar en las tiendas")
        else:
            menu = page.locator("button").filter(has_text="⋮").first
            if menu.is_visible():
                menu.click()
                page.get_by_role("menuitem", name="Instalar en las tiendas").click()
                print("Installed via menu")
            else:
                print("Install button not found — check portal manually")

        page.wait_for_timeout(5000)
        content = page.content()
        if "v.5" in content or "v.6" in content or "v.7" in content:
            print("New version visible in page")
        browser.close()
        print("Done")


if __name__ == "__main__":
    main()
