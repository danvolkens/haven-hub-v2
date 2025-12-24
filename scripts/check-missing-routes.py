#!/usr/bin/env python3
"""
Check all sidebar links for 404s
"""

from playwright.sync_api import sync_playwright

EMAIL = "hello@havenandhold.com"
PASSWORD = "umu-qpy1CNJ3xrq-xka"
BASE_URL = "http://localhost:3000"

# All links discovered in sidebar
SIDEBAR_LINKS = [
    "/dashboard",
    "/dashboard/approval-queue",
    "/dashboard/quotes",
    "/dashboard/assets",
    "/dashboard/pinterest",
    "/dashboard/pinterest/ads",
    "/dashboard/pinterest/tests",
    "/dashboard/pinterest/analytics",
    "/dashboard/leads/quiz",
    "/dashboard/leads/landing-pages",
    "/dashboard/leads/popups",
    "/dashboard/leads/abandonment",
    "/dashboard/customers",
    "/dashboard/customers/referrals",
    "/dashboard/customers/win-back",
    "/dashboard/customers/gifts",
    "/dashboard/campaigns",
    "/dashboard/campaigns/coupons",
    "/dashboard/campaigns/calendar",
    "/dashboard/analytics/attribution",
    "/dashboard/content/cross-platform",
    "/dashboard/links",
    "/dashboard/design/rules",
    "/dashboard/settings/data",
    "/dashboard/setup",
]

# API routes that were 404 or 500
API_ROUTES = [
    "/api/quotes",
    "/api/products",
    "/api/popups",
    "/api/coupons",
    "/api/links",
    "/api/pinterest/analytics/copy-templates",
    "/api/pinterest/analytics/chart",
    "/api/pinterest/analytics/overview",
    "/api/pinterest/analytics/top-pins",
    "/api/design-rules",
    "/api/settings/setup-progress",
    "/api/integrations",
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Login first
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

        print("=" * 70)
        print("CHECKING SIDEBAR ROUTES")
        print("=" * 70)

        missing_pages = []
        working_pages = []

        for link in SIDEBAR_LINKS:
            url = f"{BASE_URL}{link}"
            try:
                response = page.goto(url, timeout=10000)
                page.wait_for_load_state("domcontentloaded")
                status = response.status if response else 0

                # Check if it's a 404 page (even if HTTP 200)
                is_not_found = page.locator('text="404"').count() > 0 or \
                               page.locator('text="Not Found"').count() > 0 or \
                               page.locator('text="Page not found"').count() > 0

                if status == 404 or is_not_found:
                    missing_pages.append(link)
                    print(f"❌ MISSING: {link}")
                else:
                    working_pages.append(link)
                    print(f"✅ OK:      {link}")

            except Exception as e:
                missing_pages.append(link)
                print(f"❌ ERROR:   {link} - {str(e)[:50]}")

        print("\n" + "=" * 70)
        print("CHECKING API ROUTES")
        print("=" * 70)

        api_issues = []

        for route in API_ROUTES:
            url = f"{BASE_URL}{route}"
            try:
                response = page.goto(url, timeout=10000)
                status = response.status if response else 0

                if status >= 400:
                    api_issues.append((route, status))
                    print(f"❌ {status}: {route}")
                else:
                    print(f"✅ {status}: {route}")

            except Exception as e:
                api_issues.append((route, "ERROR"))
                print(f"❌ ERROR: {route}")

        browser.close()

        # Summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"\n📁 MISSING PAGES ({len(missing_pages)}):")
        for p in missing_pages:
            print(f"    - {p}")

        print(f"\n🔌 API ISSUES ({len(api_issues)}):")
        for route, status in api_issues:
            print(f"    - [{status}] {route}")

if __name__ == "__main__":
    main()
