import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-12">
    <h2 className="font-display text-2xl tracking-wide text-foreground mb-4">{title}</h2>
    <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">{children}</div>
  </div>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-8 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-xl tracking-[0.2em] text-foreground hover:text-muted-foreground transition-colors"
          >
            APEX ROOT
          </Link>
          <Link
            to="/"
            className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-24">
        {/* Title */}
        <div className="mb-16">
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">
            Legal
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-none tracking-wide text-foreground mb-6">
            PRIVACY
            <br />
            POLICY
          </h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: June 1, 2025 &nbsp;·&nbsp; Last Updated: June 1, 2026
          </p>
        </div>

        <div className="border-t border-border pt-12">
          <Section title="1. Introduction">
            <p>
              Apex Root Solutions LLC ("Apex Root," "we," "us," or "our") is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our website, mobile
              applications, or any services we provide (collectively, the "Services").
            </p>
            <p>
              By using our Services, you agree to the collection and use of information in
              accordance with this policy. If you do not agree, please discontinue use of our
              Services.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>
              We collect only the information necessary to provide and improve our Services.
            </p>
            <p className="font-medium text-foreground mt-4">Information You Provide Directly</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">Contact information</span> — your
                full name, email address, and phone number when you submit a contact form or
                inquiry.
              </li>
              <li>
                <span className="font-medium text-foreground">Messages</span> — the content of
                messages you send us through our contact form.
              </li>
              <li>
                <span className="font-medium text-foreground">Newsletter subscriptions</span> —
                your email address when you opt in to receive updates from us.
              </li>
            </ul>
            <p className="font-medium text-foreground mt-4">Information Collected Automatically</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">Usage data</span> — pages visited,
                time spent on pages, referring URLs, and browser type, collected via standard
                web server logs.
              </li>
              <li>
                <span className="font-medium text-foreground">Device information</span> — device
                type, operating system, and general geographic region (country/city level) derived
                from your IP address.
              </li>
            </ul>
            <p className="font-medium text-foreground mt-4">Information We Do NOT Collect</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>We do not collect precise location data (GPS).</li>
              <li>We do not access your device contacts or address book.</li>
              <li>We do not access your camera or microphone.</li>
              <li>We do not collect financial or payment information directly.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">To respond to inquiries</span> —
                using your name, email, phone, and message to reply to contact form submissions.
              </li>
              <li>
                <span className="font-medium text-foreground">To send newsletters</span> —
                delivering company updates and industry insights to subscribers who have opted in.
              </li>
              <li>
                <span className="font-medium text-foreground">To improve our Services</span> —
                analyzing usage patterns to enhance website performance and user experience.
              </li>
              <li>
                <span className="font-medium text-foreground">To comply with legal obligations</span> —
                retaining records as required by applicable law.
              </li>
            </ul>
            <p className="mt-3">
              We will not use your personal information for purposes other than those listed above
              without obtaining your prior consent.
            </p>
          </Section>

          <Section title="4. How We Share Your Information">
            <p>
              We do not sell, rent, or trade your personal information to third parties for
              their marketing purposes.
            </p>
            <p className="mt-3">
              We may share your information only in the following limited circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">Service providers</span> — trusted
                third-party vendors (e.g., email delivery services, web hosting) who assist us
                in operating our Services. These providers are contractually obligated to protect
                your data and may not use it for their own purposes.
              </li>
              <li>
                <span className="font-medium text-foreground">Legal requirements</span> — if
                required by law, court order, or government authority, or to protect the rights,
                property, or safety of Apex Root Solutions LLC, our users, or the public.
              </li>
              <li>
                <span className="font-medium text-foreground">Business transfers</span> — in
                connection with a merger, acquisition, or sale of all or a portion of our
                assets, your information may be transferred as part of that transaction.
              </li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your personal information only for as long as necessary to fulfill the
              purposes outlined in this policy, or as required by law.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Contact form submissions are retained for up to 2 years.</li>
              <li>
                Newsletter subscriber emails are retained until you unsubscribe or request
                deletion.
              </li>
              <li>Server logs are retained for up to 90 days.</li>
            </ul>
          </Section>

          <Section title="6. Your Rights & Data Deletion">
            <p>
              Depending on your location, you may have certain rights regarding your personal
              information, including rights under the California Consumer Privacy Act (CCPA),
              the General Data Protection Regulation (GDPR), and other applicable laws.
            </p>
            <p className="font-medium text-foreground mt-4">Your rights may include:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">Right to access</span> — request a
                copy of the personal information we hold about you.
              </li>
              <li>
                <span className="font-medium text-foreground">Right to correction</span> —
                request that we correct inaccurate or incomplete information.
              </li>
              <li>
                <span className="font-medium text-foreground">Right to deletion</span> — request
                that we delete your personal information.
              </li>
              <li>
                <span className="font-medium text-foreground">Right to opt out</span> — unsubscribe
                from marketing communications at any time.
              </li>
            </ul>
            <p className="font-medium text-foreground mt-4">How to request data deletion:</p>
            <p className="mt-2">
              To request deletion of your personal data, contact us at{" "}
              <a
                href="mailto:contact@apsoluts.com"
                className="text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
              >
                contact@apsoluts.com
              </a>{" "}
              with the subject line "Data Deletion Request" and include the email address
              associated with your information. We will process your request within 30 days and
              confirm once complete.
            </p>
          </Section>

          <Section title="7. Cookies & Tracking Technologies">
            <p>
              Our website may use cookies and similar tracking technologies to improve your
              experience. Cookies are small text files stored on your device.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">Essential cookies</span> — required
                for the website to function properly.
              </li>
              <li>
                <span className="font-medium text-foreground">Analytics cookies</span> — help us
                understand how visitors use our site so we can improve it.
              </li>
            </ul>
            <p className="mt-3">
              You can control cookie settings through your browser preferences. Disabling cookies
              may affect some functionality of our Services.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We implement reasonable administrative, technical, and physical safeguards to
              protect your personal information from unauthorized access, disclosure, alteration,
              or destruction. However, no method of transmission over the internet or method of
              electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Our Services are not directed to children under the age of 13 (or 16 in the
              European Economic Area). We do not knowingly collect personal information from
              children. If you believe we have inadvertently collected information from a child,
              please contact us immediately so we can delete it.
            </p>
          </Section>

          <Section title="10. Third-Party Links">
            <p>
              Our Services may contain links to third-party websites. We are not responsible for
              the privacy practices of those sites and encourage you to review their privacy
              policies before providing any personal information.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise
              the "Last Updated" date at the top of this page. We encourage you to review this
              policy periodically. Continued use of our Services after any changes constitutes
              your acceptance of the revised policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or
              our data practices, please contact us:
            </p>
            <div className="mt-4 space-y-2 border border-border p-6">
              <p className="font-medium text-foreground">Apex Root Solutions LLC</p>
              <p>1732 Orlando Dr, Cedar Hill, TX 75104</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:contact@apsoluts.com"
                  className="text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
                >
                  contact@apsoluts.com
                </a>
              </p>
              <p>
                Phone:{" "}
                <a
                  href="tel:3108496035"
                  className="text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
                >
                  (310) 849-6035
                </a>
              </p>
            </div>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs tracking-wide">
            © 2026 Apex Root Solutions LLC. All rights reserved.
          </p>
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-wide"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
