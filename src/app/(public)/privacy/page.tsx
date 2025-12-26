import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif text-[#2D3E50] mb-8">Privacy Policy</h1>

        <div className="prose prose-slate">
          <p className="text-[#6B6560] mb-6">
            Last updated: December 2024
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-[#6B6560] mb-4">
            We collect information you provide directly, including your email address, business information,
            and any content you create through our platform.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-[#6B6560] mb-4">
            We use your information to provide and improve our services, communicate with you,
            and ensure the security of your account.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">3. Third-Party Services</h2>
          <p className="text-[#6B6560] mb-4">
            Haven Hub integrates with third-party services like Pinterest, Shopify, and Klaviyo.
            Your use of these integrations is subject to their respective privacy policies.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">4. Data Security</h2>
          <p className="text-[#6B6560] mb-4">
            We implement appropriate security measures to protect your personal information.
            However, no method of transmission over the internet is 100% secure.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">5. Your Rights</h2>
          <p className="text-[#6B6560] mb-4">
            You have the right to access, correct, or delete your personal information.
            Contact us to exercise these rights.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">6. Cookies</h2>
          <p className="text-[#6B6560] mb-4">
            We use cookies to improve your experience and analyze how our service is used.
            You can control cookie settings in your browser.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">7. Contact Us</h2>
          <p className="text-[#6B6560] mb-4">
            For privacy-related questions, please contact us at privacy@havenandhold.com.
          </p>
        </div>

        <div className="mt-12">
          <Link href="/login" className="text-[#7A9E7E] hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
