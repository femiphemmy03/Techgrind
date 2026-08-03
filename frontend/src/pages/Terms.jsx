export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="text-muted text-sm leading-relaxed space-y-5">
        <p>Last updated: {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">1. The program</h2>
        <p>
          TechGrind is a 12-week cohort-based learning program (1 week introduction, 10 weeks of instruction and
          weekly assessment, 1 week final assessment and capstone). Course instruction itself is free; a ₦6,500
          commitment fee is required at registration and a separate ₦10,000 fee applies to join a startup team.
          Both fees are non-refundable commitment fees intended to keep participants accountable to the program.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">2. Certificates</h2>
        <p>
          Certificates are issued free of charge to students who attempt all 10 weekly assessments and maintain an
          average score of at least 75%.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">3. Cohort data</h2>
        <p>
          When a cohort ends, all associated student accounts, videos, assessments, and scores tied to that cohort
          are permanently deleted. Progress cannot be carried over between cohorts.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">4. Affiliate program</h2>
        <p>
          Affiliates earn ₦1,500 for each student who completes registration payment using their referral code.
          Changing a referral code permanently resets the affiliate's referral count.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">5. Withdrawals</h2>
        <p>
          Withdrawals are processed automatically and immediately once requested, up to 3 times within any rolling
          30-day period, with a minimum of 10 days between requests. There is no manual review step before a
          transfer is sent — <strong className="text-offwhite">you are solely responsible for the accuracy of the bank account details
          you provide when requesting a withdrawal.</strong> The platform displays the resolved account holder name
          for your review before you confirm a withdrawal — it is your responsibility to verify this name matches
          your own before confirming. Once confirmed, a transfer cannot be reversed. TechGrind is
          not liable for funds sent to incorrect account details you entered and confirmed.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">6. Prizes</h2>
        <p>
          Startup funding, laptops, and free domain/hosting awards are given at TechGrind's discretion based on
          team and individual performance, and are not guaranteed to any participant.
        </p>

        <h2 className="text-offwhite font-semibold text-lg mt-8 mb-2">7. Conduct</h2>
        <p>
          TechGrind reserves the right to revoke access for any student, lecturer, or affiliate found violating
          these terms or engaging in fraudulent referral activity.
        </p>
      </div>
    </div>
  );
}
