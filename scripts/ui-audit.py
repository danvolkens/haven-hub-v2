#!/usr/bin/env python3
"""
UI Audit Script for Haven Hub v2
Captures console errors and checks navigation links for 404s
"""

from playwright.sync_api import sync_playwright
import json

# Login credentials
EMAIL = "hello@havenandhold.com"
PASSWORD = "umu-qpy1CNJ3xrq-xka"
BASE_URL = "http://localhost:3000"

# Dashboard navigation links to check
NAVIGATION_LINKS = [
    "/dashboard",
    "/dashboard/quotes",
    "/dashboard/quotes/new",
    "/dashboard/products",
    "/dashboard/calendar",
    "/dashboard/pinterest/analytics",
    "/dashboard/leads/popups",
    "/dashboard/customers/referrals",
    "/dashboard/campaigns/coupons",
    "/dashboard/content/cross-platform",
    "/dashboard/links",
    "/dashboard/design/rules",
    "/dashboard/settings/data",
    "/dashboard/setup",
]

def main():
    console_errors = []
    network_errors = []
    navigation_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Capture console messages
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append({
                    "type": msg.type,
                    "text": msg.text,
                    "location": msg.location if hasattr(msg, 'location') else None
                })

        page.on("console", handle_console)

        # Capture network failures
        def handle_response(response):
            if response.status >= 400:
                network_errors.append({
                    "url": response.url,
                    "status": response.status,
                    "status_text": response.status_text
                })

        page.on("response", handle_response)

        print("=" * 60)
        print("HAVEN HUB V2 UI AUDIT")
        print("=" * 60)

        # Step 1: Go to login page
        print("\n[1] Navigating to login page...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.screenshot(path="/tmp/audit-01-login.png")

        # Step 2: Login
        print("[2] Logging in...")
        try:
            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)  # Wait for redirect
            page.screenshot(path="/tmp/audit-02-after-login.png")
            print(f"    Current URL: {page.url}")
        except Exception as e:
            print(f"    Login failed: {e}")
            page.screenshot(path="/tmp/audit-02-login-error.png")

        # Step 3: Check each navigation link
        print("\n[3] Checking navigation links...")
        for link in NAVIGATION_LINKS:
            url = f"{BASE_URL}{link}"
            print(f"    Checking: {link}")

            try:
                response = page.goto(url)
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(500)

                status = response.status if response else "N/A"
                result = {
                    "path": link,
                    "status": status,
                    "ok": status == 200
                }
                navigation_results.append(result)

                if status != 200:
                    print(f"        ❌ Status: {status}")
                    page.screenshot(path=f"/tmp/audit-404-{link.replace('/', '-')}.png")
                else:
                    print(f"        ✅ Status: {status}")

            except Exception as e:
                print(f"        ❌ Error: {e}")
                navigation_results.append({
                    "path": link,
                    "status": "ERROR",
                    "error": str(e),
                    "ok": False
                })

        # Step 4: Check sidebar links by clicking them
        print("\n[4] Checking sidebar links via click...")
        page.goto(f"{BASE_URL}/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        # Find all sidebar links
        sidebar_links = page.locator('nav a, aside a, [class*="sidebar"] a').all()
        print(f"    Found {len(sidebar_links)} sidebar links")

        for i, link in enumerate(sidebar_links[:20]):  # Check first 20 links
            try:
                href = link.get_attribute("href")
                text = link.inner_text().strip()[:30]
                if href and href.startswith("/"):
                    print(f"    Link {i+1}: {text} -> {href}")
            except:
                pass

        browser.close()

    # Print Summary
    print("\n" + "=" * 60)
    print("AUDIT SUMMARY")
    print("=" * 60)

    print(f"\n📊 NAVIGATION RESULTS:")
    ok_count = sum(1 for r in navigation_results if r.get("ok"))
    fail_count = len(navigation_results) - ok_count
    print(f"    ✅ Passed: {ok_count}")
    print(f"    ❌ Failed: {fail_count}")

    if fail_count > 0:
        print("\n    Failed routes:")
        for r in navigation_results:
            if not r.get("ok"):
                print(f"        - {r['path']}: {r.get('status', 'ERROR')}")

    print(f"\n📝 CONSOLE ERRORS: {len(console_errors)}")
    for i, err in enumerate(console_errors[:20]):  # Show first 20
        text = err['text'][:100] + "..." if len(err['text']) > 100 else err['text']
        print(f"    {i+1}. {text}")

    print(f"\n🌐 NETWORK ERRORS (4xx/5xx): {len(network_errors)}")
    for i, err in enumerate(network_errors[:20]):  # Show first 20
        print(f"    {i+1}. [{err['status']}] {err['url'][:80]}")

    print("\n📸 Screenshots saved to /tmp/audit-*.png")

    # Save detailed JSON report
    report = {
        "navigation": navigation_results,
        "console_errors": console_errors,
        "network_errors": network_errors
    }
    with open("/tmp/ui-audit-report.json", "w") as f:
        json.dump(report, f, indent=2)
    print("📄 Detailed report: /tmp/ui-audit-report.json")

if __name__ == "__main__":
    main()
