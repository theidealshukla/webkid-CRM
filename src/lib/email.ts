import nodemailer from "nodemailer";

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD env vars are required.");
  }
  cachedTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransport;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  id?: string;
  error?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || `Webkid CRM <${process.env.GMAIL_USER}>`;

  // Optional dev override: redirect all mail to one address while testing.
  const override = process.env.EMAIL_TEST_OVERRIDE;
  const finalTo = override || to;

  try {
    const info = await getTransport().sendMail({
      from,
      to: finalTo,
      subject,
      html,
      text: text || stripHtml(html),
    });
    return { id: info.messageId };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("sendEmail failed:", message);
    return { error: message };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
