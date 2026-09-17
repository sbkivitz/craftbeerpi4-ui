"""Headless functional test for the dashboard "Load Layout" menu.

Drives the real UI in a real browser with no human and no mouse, against a running
CBPi instance. This exists because the menu spans the React app and the backend
template API, so neither a unit test nor an API call can prove it actually works -
only clicking it can, and this clicks it.

Run:
    python e2e/test_load_layout.py                  # against http://127.0.0.1:8000
    python e2e/test_load_layout.py --url http://pi:8000 --headed

Uses the installed Edge/Chrome rather than downloading a browser.
"""
import argparse
import sys

from playwright.sync_api import sync_playwright

TEMPLATE_TITLE = "3-Vessel HERMS"


def find_browser(pw, headless):
    """Prefer an already-installed browser so no download is needed."""
    for channel in ("msedge", "chrome"):
        try:
            return pw.chromium.launch(channel=channel, headless=headless)
        except Exception:
            continue
    return pw.chromium.launch(headless=headless)


def check(results, label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}{(' - ' + detail) if detail else ''}")
    results.append(bool(condition))
    return bool(condition)


def run(base_url, headless):
    results = []
    with sync_playwright() as pw:
        browser = find_browser(pw, headless)
        page = browser.new_page(viewport={"width": 1500, "height": 950})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        print(f"\nDriving {base_url}")
        page.goto(f"{base_url}/cbpi_ui/static/index.html", wait_until="networkidle")

        # The SPA may land on a login form depending on config.
        if page.locator("input[type=password]").count() > 0:
            page.fill("input[name=username], input[type=text]", "cbpi")
            page.fill("input[type=password]", "123")
            page.click("button[type=submit], button:has-text('Login')")
            page.wait_for_load_state("networkidle")

        page.goto(f"{base_url}/cbpi_ui/static/index.html#/", wait_until="networkidle")
        page.wait_for_timeout(2500)

        print("\nDashboard loads:")
        check(results, "page rendered", page.locator("body").count() > 0)
        check(results, "no uncaught JS errors on load", not errors, "; ".join(errors[:3]))

        # Enter edit mode. When locked the overlay shows only the lock toggle; the
        # lock is the last button on the page, and unlocking reveals the edit tools.
        print("\nEdit mode:")
        page.locator("button").last.click()
        page.wait_for_timeout(1500)
        trigger = page.locator("button[title='Load Layout']")
        check(results, "edit mode revealed the Load Layout control",
              trigger.count() > 0, f"{trigger.count()} found")

        print("\nLoad Layout menu:")
        found = trigger.count() > 0
        check(results, "Load Layout button present", found)

        if found:
            trigger.first.click()
            page.wait_for_timeout(900)
            # Scope to the popover: the loaded layout also contains a title widget
            # with the same text, and matching that instead would click through the
            # menu backdrop.
            item = page.locator(f".MuiPopover-root li:has-text('{TEMPLATE_TITLE}')")
            listed = item.count() > 0
            check(results, f"'{TEMPLATE_TITLE}' listed in menu", listed)

            if listed:
                item.first.click()
                page.wait_for_timeout(2500)
                body = page.locator("body").inner_text()
                check(results, "layout loaded (vessel labels rendered)",
                      "HLT" in body and "Boil" in body)
                check(results, "no mojibake in temperature units", "\u00c2\u00b0" not in body)
                check(results, "no 'Missing Config' placeholders", "Missing Config" not in body)
                check(results, "no JS errors after loading layout",
                      not errors, "; ".join(errors[:3]))
                page.screenshot(path="e2e/loaded_layout.png")
                print("\n  screenshot -> e2e/loaded_layout.png")

        browser.close()

    passed = sum(1 for r in results if r)
    print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--headed", action="store_true")
    args = ap.parse_args()
    sys.exit(run(args.url.rstrip("/"), headless=not args.headed))
