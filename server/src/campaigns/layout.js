import { esc } from "../templates/billing.js";

// The look shared by every promotional email we send (the scheduled campaigns and
// one-off messages). The layout is built from nested tables with inline styles,
// which is what mail apps (Outlook, Gmail, Apple Mail) render reliably, and it is
// forced to a light scheme so a client's automatic dark mode does not invert it.

export const POSTAL_ADDRESS = "Apex Root Solutions LLC · 1732 Orlando Dr, Cedar Hill, TX 75104";
export const CONTACT_EMAIL = "contact@apsoluts.com";

export const INK = "#1b2333";
export const TEXT = "#3a4252";
export const MUTED = "#6b7280";
export const FAINT = "#9aa1ad";
export const LINE = "#e4e7eb";
export const TINT = "#f4f5f7";
export const EYEBROW = "#3f5f8f";
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const SERIF = "Georgia,'Times New Roman',Times,serif";

export const button = (href, label) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${INK};border-radius:3px;">
      <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.2px;color:#ffffff;text-decoration:none;">${esc(label)}&nbsp;&nbsp;&#8599;</a>
    </td></tr></table>`;

export const listRow = (item, first) => `
      <tr>
        <td width="26" valign="top" style="padding:18px 0;${first ? "" : `border-top:1px solid ${LINE};`}font-family:${SANS};font-size:13px;color:${FAINT};">&#8599;</td>
        <td valign="top" style="padding:18px 0;${first ? "" : `border-top:1px solid ${LINE};`}font-family:${SANS};">
          <div style="font-size:15px;font-weight:700;color:${INK};line-height:1.4;">${esc(item.title)}</div>
          <div style="font-size:13px;color:${MUTED};line-height:1.55;margin-top:3px;">${esc(item.body)}</div>
        </td>
      </tr>`;

// The tinted block of list items.
export const listBlock = (items) => `
      <tr><td style="background-color:${TINT};padding:14px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items.map((item, i) => listRow(item, i === 0)).join("")}
        </table>
      </td></tr>`;

// The closing block of every message: who it came from, why the person received
// it, and how to stop.
export function footerRow({ to, reason, unsubPage }) {
  return `
      <tr><td style="background-color:${TINT};padding:26px 40px 32px 40px;font-family:${SANS};">
        <p style="margin:0 0 14px 0;font-size:12px;line-height:1.6;color:${TEXT};">Have a project in mind? <a href="mailto:${CONTACT_EMAIL}" style="color:${INK};text-decoration:underline;">Let&rsquo;s talk.</a></p>
        <p style="margin:0 0 6px 0;font-size:11px;line-height:1.6;color:${MUTED};">${esc(POSTAL_ADDRESS)}</p>
        <p style="margin:0 0 8px 0;font-size:11px;line-height:1.6;color:${MUTED};">You received this promotional email at ${esc(to)} ${esc(reason)}</p>
        <p style="margin:0;font-size:11px;line-height:1.6;"><a href="${esc(unsubPage)}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a></p>
      </td></tr>`;
}

// The whole document around the rows a message supplies.
export function shell({ subject, preheader, rows }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;">

      <tr><td style="padding:32px 40px 22px 40px;border-bottom:1px solid ${LINE};font-family:${SANS};">
        <div style="font-size:12px;font-weight:700;letter-spacing:2.4px;color:${INK};">APEX ROOT <span style="font-weight:400;color:${MUTED};">/ SOLUTIONS</span></div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;color:${INK};margin-top:10px;">A NOTE FROM APEX ROOT SOLUTIONS</div>
      </td></tr>
${rows.join("\n")}

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
