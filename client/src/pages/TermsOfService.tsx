import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-12">
    <h2 className="font-display text-2xl tracking-wide text-foreground mb-4">{title}</h2>
    <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">{children}</div>
  </div>
);

const TermsOfService = () => {
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
            TERMS OF
            <br />
            SERVICE
          </h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: June 1, 2025 &nbsp;·&nbsp; Last Updated: June 1, 2026
          </p>
        </div>

        <div className="border-t border-border pt-12">
          <Section title="1. Agreement to Terms">
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between
              you ("Client," "you," or "your") and Apex Root Solutions LLC ("Apex Root,"
              "we," "us," or "our"), a limited liability company organized under the laws of
              the State of Texas.
            </p>
            <p>
              By engaging our services, signing a project proposal or contract, submitting a
              contact inquiry, or otherwise using our website located at apsoluts.com
              (the "Site"), you agree to be bound by these Terms. If you do not agree, do not
              use our Site or engage our services.
            </p>
          </Section>

          <Section title="2. Services We Provide">
            <p>
              Apex Root Solutions LLC provides professional technology services to businesses
              and entrepreneurs. Our services include, but are not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <span className="font-medium text-foreground">Mobile App Development</span> —
                custom iOS and Android applications built for performance and scale.
              </li>
              <li>
                <span className="font-medium text-foreground">Web Design & Development</span> —
                modern, responsive websites and web applications designed to convert visitors
                into customers.
              </li>
              <li>
                <span className="font-medium text-foreground">UI/UX Design</span> — intuitive,
                visually refined interfaces crafted to maximize engagement and retention.
              </li>
              <li>
                <span className="font-medium text-foreground">App Consultation</span> — strategic
                roadmapping to align your vision with market reality and technical feasibility.
              </li>
              <li>
                <span className="font-medium text-foreground">Testing & Quality Assurance</span> —
                rigorous QA across devices and platforms before every release.
              </li>
              <li>
                <span className="font-medium text-foreground">Maintenance & Updates</span> —
                ongoing support and optimization to keep your product at peak performance.
              </li>
              <li>
                <span className="font-medium text-foreground">Launch Strategy</span> — app store
                optimization and go-to-market execution.
              </li>
              <li>
                <span className="font-medium text-foreground">API & Backend Development</span> —
                scalable server-side systems, databases, and third-party integrations.
              </li>
              <li>
                <span className="font-medium text-foreground">E-Commerce Development</span> —
                full-featured online stores with secure payment processing and inventory
                management.
              </li>
            </ul>
            <p className="mt-3">
              The specific scope, deliverables, timeline, and pricing for each engagement are
              defined in a separate written agreement, proposal, or statement of work
              ("Project Agreement") signed by both parties.
            </p>
          </Section>

          <Section title="3. Project Agreements & Scope">
            <p>
              All work performed by Apex Root is governed by a Project Agreement that details
              the scope of work, milestones, deliverables, and fees. These Terms are
              incorporated by reference into every Project Agreement.
            </p>
            <p>
              Any changes to the agreed scope of work — including additions, modifications, or
              removals of features — must be requested in writing and may result in adjustments
              to timeline and cost. Verbal agreements regarding scope changes are not binding.
            </p>
            <p>
              We reserve the right to decline any project at our sole discretion, without
              obligation to provide a reason.
            </p>
          </Section>

          <Section title="4. Client Responsibilities">
            <p>To allow us to deliver quality work on time, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                Provide accurate, complete, and timely information, content, assets, and
                feedback as requested.
              </li>
              <li>
                Designate a primary point of contact with authority to make decisions on your
                behalf.
              </li>
              <li>
                Respond to review requests and feedback windows within the timeframe specified
                in your Project Agreement. Delays in client response may result in project
                timeline extensions.
              </li>
              <li>
                Ensure that all materials you provide (logos, images, copy, data) are owned by
                you or that you have the right to use them. You are solely responsible for
                obtaining any necessary licenses or permissions.
              </li>
              <li>
                Comply with all applicable laws in connection with your product, including app
                store policies, data protection regulations, and consumer protection laws.
              </li>
            </ul>
          </Section>

          <Section title="5. Fees & Payment">
            <p>
              All fees are specified in your Project Agreement. Unless otherwise agreed in
              writing:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                A deposit (typically 50% of the project fee) is due before work begins.
              </li>
              <li>
                Remaining balances are due upon project completion or as defined in milestone
                payment schedules.
              </li>
              <li>
                Invoices are due within 14 days of issuance unless otherwise specified.
              </li>
              <li>
                Late payments may incur a fee of 1.5% per month on outstanding balances.
              </li>
              <li>
                We reserve the right to suspend work on any project with an outstanding balance
                that is more than 14 days past due.
              </li>
            </ul>
            <p className="mt-3">
              All fees are quoted and payable in U.S. dollars. Quoted prices do not include
              third-party costs such as hosting, domain registration, app store developer
              accounts, software licenses, or API fees, which are the client's responsibility
              unless explicitly included in the Project Agreement.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p className="font-medium text-foreground">Work Product Ownership</p>
            <p className="mt-2">
              Upon receipt of full payment for a project, Apex Root assigns to you all rights,
              title, and interest in the custom deliverables created specifically for that
              project, including source code, designs, and written content, to the extent they
              are original works created solely for you.
            </p>
            <p className="font-medium text-foreground mt-4">Our Pre-Existing IP & Tools</p>
            <p className="mt-2">
              Apex Root retains all rights to its pre-existing intellectual property,
              proprietary frameworks, libraries, templates, tools, and methodologies used in
              delivering your project. You receive a non-exclusive, royalty-free license to
              use such components as incorporated into your deliverables.
            </p>
            <p className="font-medium text-foreground mt-4">Portfolio Rights</p>
            <p className="mt-2">
              Unless you request otherwise in writing, we reserve the right to display
              completed work in our portfolio and use your project as a reference for marketing
              purposes, including mentioning your company name.
            </p>
          </Section>

          <Section title="7. Confidentiality">
            <p>
              Both parties agree to keep confidential any proprietary or sensitive information
              shared during the course of the engagement, including business strategies,
              technical specifications, financial data, and customer information.
            </p>
            <p>
              This obligation does not apply to information that is publicly available, already
              known to the receiving party, or required to be disclosed by law.
            </p>
            <p>
              Confidentiality obligations survive the termination of any Project Agreement for
              a period of three (3) years.
            </p>
          </Section>

          <Section title="8. Warranties & Disclaimers">
            <p>
              Apex Root warrants that services will be performed in a professional and
              workmanlike manner consistent with industry standards. We will correct any
              defects in our work reported within thirty (30) days of final delivery, at no
              additional charge.
            </p>
            <p className="mt-3 uppercase text-xs tracking-wide">
              To the fullest extent permitted by law, all services and deliverables are
              provided "as is." Apex Root makes no warranties, express or implied, including
              implied warranties of merchantability, fitness for a particular purpose, or
              non-infringement. We do not warrant that your product will be free from errors,
              achieve specific business outcomes, or meet any particular performance
              benchmarks.
            </p>
            <p className="mt-3">
              Third-party platforms, app stores, payment processors, and hosting providers
              operate under their own terms. We are not responsible for downtime, policy
              changes, or actions taken by third-party services.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p className="uppercase text-xs tracking-wide">
              To the fullest extent permitted by applicable law, Apex Root Solutions LLC and
              its members, employees, contractors, and agents shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising out of
              or related to our services or these Terms, even if advised of the possibility of
              such damages.
            </p>
            <p className="mt-3">
              Our total liability to you for any claim arising out of or relating to a specific
              project shall not exceed the total fees paid by you to Apex Root for that project
              in the three (3) months preceding the claim.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              Either party may terminate a Project Agreement upon written notice if the other
              party materially breaches these Terms and fails to cure the breach within fourteen
              (14) days of written notice.
            </p>
            <p>
              If you terminate a project without cause, you remain responsible for payment of
              all work completed to the date of termination, plus any non-refundable deposits.
              If Apex Root terminates a project without cause, we will refund any prepaid fees
              for work not yet completed.
            </p>
            <p>
              Upon termination, each party will promptly return or destroy confidential
              materials belonging to the other party.
            </p>
          </Section>

          <Section title="11. Acceptable Use of Our Website">
            <p>When using our Site, you agree not to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Use the Site for any unlawful purpose or in violation of any applicable law.</li>
              <li>
                Attempt to gain unauthorized access to any part of our systems or infrastructure.
              </li>
              <li>
                Submit false, misleading, or fraudulent information through our contact forms.
              </li>
              <li>
                Transmit any malicious code, viruses, or harmful software through the Site.
              </li>
              <li>
                Scrape, crawl, or harvest data from the Site without our express written
                permission.
              </li>
            </ul>
          </Section>

          <Section title="12. Governing Law & Dispute Resolution">
            <p>
              These Terms and any disputes arising from them shall be governed by and construed
              in accordance with the laws of the State of Texas, without regard to its conflict
              of law provisions.
            </p>
            <p>
              The parties agree to first attempt to resolve any dispute informally by contacting
              each other in good faith. If a dispute cannot be resolved informally within
              thirty (30) days, it shall be submitted to binding arbitration in Dallas County,
              Texas, in accordance with the rules of the American Arbitration Association.
            </p>
            <p>
              You agree to bring claims against Apex Root only in your individual capacity and
              not as part of any class action or representative proceeding.
            </p>
          </Section>

          <Section title="13. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When we do, we will revise the
              "Last Updated" date above. Material changes will be communicated to active clients
              via email. Continued engagement with our services after any update constitutes
              acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>
              If you have any questions about these Terms or wish to discuss a project,
              please reach out:
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
          <div className="flex items-center gap-6">
            <Link
              to="/privacy-policy"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-wide"
            >
              Privacy Policy
            </Link>
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-wide"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
