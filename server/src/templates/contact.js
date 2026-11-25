import { esc } from "./billing.js";

export function getContactTemplate(data) {
  return `
    <div style=" background-color:#f8fafc;padding:32px 16px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;box-sizing:border-box;border-radius:10px;overflow:hidden;">
        <!-- Header: Dark Theme -->
        <div style="background-color:#0a0a0a;border-top:4px solid #be1c1c;padding:24px 32px;">
          <p style="color:#be1c1c;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 4px 0;font-weight:700;">New Form Submission</p>
          <h2 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Apex Root Solutions</h2>
        </div>
        
        <!-- Body: Light Theme -->
        <div style="padding:32px;background-color:#ffffff;">
          <div style="border-bottom:1px solid #e2e8f0;padding-bottom:20px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;color:#64748b;width:130px;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;vertical-align:top;"><strong>Full Name</strong></td>
                <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:500;">${esc(data.fullName)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;vertical-align:top;"><strong>Email</strong></td>
                <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:500;"><a href="mailto:${esc(data.email)}" style="color:#be1c1c;text-decoration:none;font-weight:600;">${esc(data.email)}</a></td>
              </tr>
              ${
                data.phone
                  ? `
              <tr>
                <td style="padding:10px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;vertical-align:top;"><strong>Phone</strong></td>
                <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:500;">${esc(data.phone)}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>

          <div style="margin-bottom:10px;">
            <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px 0;"><strong>Message</strong></p>
            <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:20px;color:#0f172a;font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;">${esc(data.message)}</div>
          </div>
        </div>

        <!-- Footer: Dark Theme -->
        <div style="background-color:#0a0a0a;padding:24px 32px;border-top:1px solid #242424;">
          <p style="color:#808080;font-size:10px;margin:0;letter-spacing:1px;text-transform:uppercase;line-height:1.4;">Sent via apsoluts.com contact form · ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}
