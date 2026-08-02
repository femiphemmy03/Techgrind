export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16 prose-invert">
      <h1 className="font-display text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="text-muted text-sm leading-relaxed space-y-5">
        <p>Last updated: {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</p>

        <p>
          TechGrind ("we", "us") is operated by Oluwafemi Sunmola Technologies LTD (RC: 8815307). We deliberately
          collect the minimum data necessary to run the platform: your email address, an optional username, your
          selected track, and payment records processed securely through Flutterwave. We do not request or store
          government ID numbers, phone numbers, home addresses, or other sensitive personal data.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">Why email matters</h2>
        <p>
          Your email is the single identifier tied to your account and the only channel we use to help you recover
          access if you forget your password. We do not verify emails at signup, so please use one you can actually
          access — without it, we cannot assist with account recovery.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">Payments</h2>
        <p>
          Card and bank details are handled entirely by Flutterwave, our licensed payment processor. TechGrind never
          sees or stores your card number, CVV, or bank login details.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">Data retention</h2>
        <p>
          When a cohort formally ends, associated student learning records (videos progress, assessment scores) are
          permanently deleted from our systems as part of routine cohort close-out.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">Contact</h2>
        <p>Questions about this policy can be sent to techgrindng@gmail.com.</p>
      </div>
    </div>
  );
}
