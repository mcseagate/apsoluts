export function getNewsletterTemplate(email) {
  return `
    <div style=" background-color:#f8fafc;padding:32px 16px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;box-sizing:border-box;border-radius:10px;overflow:hidden;">
        <!-- Header: Dark Theme -->
        <div style="background-color:#0a0a0a;border-top:4px solid #be1c1c;padding:24px 32px;">
          <p style="color:#be1c1c;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 4px 0;font-weight:700;">Subscription Confirmed</p>
          <h2 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Welcome to Apex Root</h2>
        </div>
        
        <!-- Body: Light Theme -->
        <div style="padding:32px;background-color:#ffffff;">
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
            Thank you for subscribing to updates from <strong>Apex Root Solutions LLC</strong>. You've joined a community of forward-thinking innovators.
          </p>
          
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:32px 0 16px 0;font-weight:600;">What to expect in your inbox:</p>
          
          <ul style="color:#334155;font-size:14px;line-height:1.7;padding-left:20px;margin:0 0 32px 0;">
            <li style="margin-bottom:10px;"><strong style="color:#0f172a;">Build Smarter:</strong> Expert mobile and web app development insights.</li>
            <li style="margin-bottom:10px;"><strong style="color:#0f172a;">Launch Faster:</strong> Best practices for rapid project delivery and architecture design.</li>
            <li style="margin-bottom:10px;"><strong style="color:#0f172a;">Scale Bigger:</strong> Actionable case studies, industry trends, and strategic advice.</li>
          </ul>

          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:24px;margin-bottom:16px;">
            <p style="color:#334155;font-size:13px;line-height:1.6;margin:0 0 16px 0;">
              Have a project idea in mind? Let's build it together.
            </p>
            <a href="mailto:contact@apsoluts.com" style="display:inline-block;background-color:#be1c1c;color:#ffffff;text-decoration:none;font-size:12px;text-transform:uppercase;font-weight:600;letter-spacing:2px;padding:12px 24px;border-radius:0px;">Let's Talk</a>
          </div>

          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0 0;">
            If you ever have any questions, feel free to reply directly to this email or reach us at <a href="mailto:contact@apsoluts.com" style="color:#be1c1c;text-decoration:none;font-weight:600;">contact@apsoluts.com</a>.
          </p>
        </div>

        <!-- Footer: Dark Theme -->
        <div style="background-color:#0a0a0a;padding:24px 32px;border-top:1px solid #242424;">
          <p style="color:#808080;font-size:11px;margin:0 0 6px 0;line-height:1.4;text-transform:uppercase;letter-spacing:1px;">Apex Root Solutions LLC · 1732 Orlando Dr, Cedar Hill, TX 75104</p>
          <p style="color:#505050;font-size:10px;margin:0;line-height:1.4;">This email was sent to ${email} because you signed up on our website.</p>
        </div>
      </div>
    </div>
  `;
}

export function getNewsletterAdminTemplate(email) {
  return `
    <div style="background-color:#f8fafc;padding:32px 16px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;box-sizing:border-box;border-radius:10px;overflow:hidden;">
        <!-- Header: Dark Theme -->
        <div style="background-color:#0a0a0a;border-top:4px solid #be1c1c;padding:24px 32px;">
          <p style="color:#be1c1c;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 4px 0;font-weight:700;">Admin Notification</p>
          <h2 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">New Subscriber Alert</h2>
        </div>
        
        <!-- Body: Light Theme -->
        <div style="padding:32px;background-color:#ffffff;">
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
            Hello, a new user has just subscribed to updates from your website.
          </p>

          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:24px;margin-bottom:16px;text-align:center;">
            <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px 0;font-weight:600;">Subscriber Email</p>
            <p style="color:#0f172a;font-size:18px;font-weight:700;margin:0;word-break:break-all;">${email}</p>
          </div>

          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0 0;">
            You can view your complete list of subscribers in your Admin Portal.
          </p>
        </div>

        <!-- Footer: Dark Theme -->
        <div style="background-color:#0a0a0a;padding:24px 32px;border-top:1px solid #242424;">
          <p style="color:#808080;font-size:11px;margin:0;line-height:1.4;text-transform:uppercase;letter-spacing:1px;">Apex Root Solutions LLC · 1732 Orlando Dr, Cedar Hill, TX 75104</p>
        </div>
      </div>
    </div>
  `;
}
