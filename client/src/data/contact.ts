// WhatsApp is how Windows projects (and the floating chat button) are reached.
// The number is digits only, as wa.me expects: +1 682 489 6177.
export const WHATSAPP_NUMBER = "16824896177";
export const WHATSAPP_DISPLAY = "+1 682-489-6177";

export const whatsappUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const WINDOWS_MESSAGE =
  "Hello Apex Root Solutions LLC, I would like a quote for Windows software development.";
export const APP_DEVELOPMENT_MESSAGE =
  "Hello Apex Root Solutions LLC, I would like a quote for app development (web, mobile or Windows).";
export const GENERAL_MESSAGE =
  "Hello Apex Root Solutions LLC, I would like to learn more about your mobile app development services.";

// Business contact details as published on the site's footer and contact section.
export const BUSINESS_EMAIL = "contact@apsoluts.com";
export const BUSINESS_PHONE_DISPLAY = "(310) 849-6035";
export const BUSINESS_PHONE_TEL = "tel:3108496035";
export const BUSINESS_ADDRESS = "1732 Orlando Dr, Cedar Hill, TX 75104";
