import "server-only";
import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceEmailTemplate, type WorkspaceEmail } from "./workspace-email-template";

export function mailConfigured() {
  return !!(process.env.APP_URL && (process.env.RESEND_API_KEY ? process.env.EMAIL_FROM : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM));
}
export async function sendWorkspaceEmails(client: SupabaseClient) {
  if (!mailConfigured()) return { configured: false, sent: 0, failed: 0 };
  const port = Number(process.env.SMTP_PORT || 587);
  if (![465, 587, 2525].includes(port)) throw new Error("Porta SMTP inválida.");
  const { data, error } = await client.rpc("workspace_claim_emails");
  if (error) throw new Error("Não foi possível acessar a fila de e-mails.");
  const transport = process.env.RESEND_API_KEY ? null : nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000, dnsTimeout: 8000,
    disableFileAccess: true, disableUrlAccess: true });
  let sent = 0, failed = 0;
  await Promise.all((data as WorkspaceEmail[]).map(async job => {
    let success = false;
    try {
      const message = workspaceEmailTemplate(job, process.env.APP_URL!);
      if (process.env.RESEND_API_KEY) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", signal: AbortSignal.timeout(12000),
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace/${job.id}` },
          body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [job.recipient], ...message }),
        });
        const result = await response.json();
        success = response.ok && typeof result.id === "string";
      } else if (transport) {
        const result = await transport.sendMail({ from: process.env.SMTP_FROM, to: job.recipient,
          messageId: `<workspace-${job.id}@${new URL(process.env.APP_URL!).hostname}>`, ...message });
        success = result.accepted.length > 0;
      }
    } catch { /* Do not expose credentials, message content or SMTP diagnostics. */ }
    const result = await client.rpc("workspace_finish_email", { target: job.id, attempt: job.attempts, succeeded: success, failure: success ? null : "O serviço de e-mail não confirmou o envio. Verifique o remetente e a conexão." });
    if (success && !result.error) sent++; else failed++;
  }));
  transport?.close();
  return { configured: true, sent, failed };
}
