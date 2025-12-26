import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif text-[#2D3E50] mb-8">Terms of Service</h1>

        <div className="prose prose-slate">
          <p className="text-[#6B6560] mb-6">
            Last updated: December 2024
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-[#6B6560] mb-4">
            By accessing and using Haven Hub, you agree to be bound by these Terms of Service.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">2. Use of Service</h2>
          <p className="text-[#6B6560] mb-4">
            Haven Hub provides marketing automation tools for Shopify stores. You agree to use the service
            only for lawful purposes and in accordance with these terms.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">3. Account Responsibilities</h2>
          <p className="text-[#6B6560] mb-4">
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">4. Intellectual Property</h2>
          <p className="text-[#6B6560] mb-4">
            All content, features, and functionality of Haven Hub are owned by Haven & Hold and are
            protected by intellectual property laws.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">5. Limitation of Liability</h2>
          <p className="text-[#6B6560] mb-4">
            Haven Hub is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for
            any indirect, incidental, or consequential damages.
          </p>

          <h2 className="text-xl font-semibold text-[#2D3E50] mt-8 mb-4">6. Contact</h2>
          <p className="text-[#6B6560] mb-4">
            For questions about these terms, please contact us at support@havenandhold.com.
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
