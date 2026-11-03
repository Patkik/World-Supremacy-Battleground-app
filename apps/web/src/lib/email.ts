import tls from "node:tls";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.WSB_SMTP_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.WSB_SMTP_PORT || process.env.SMTP_PORT || "465", 10);
  const user = (process.env.WSB_SMTP_USER || process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.WSB_SMTP_PASS || process.env.SMTP_PASS || "").trim();
  // Strip spaces if user provided Google App Password with grouping spaces
  const pass = rawPass.replace(/\s+/g, "");
  const from = (process.env.WSB_SMTP_FROM || process.env.SMTP_FROM || "").trim() || `"World Supremacy Battlegrounds" <${user}>`;

  if (!user || !pass) {
    return null;
  }

  return { host, port, user, pass, from };
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email using direct TLS SMTP without external dependencies.
 */
export async function sendMail(options: SendMailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const config = getSmtpConfig();
  if (!config) {
    return { ok: false, error: "SMTP is not configured" };
  }

  const { to, subject, html, text } = options;
  const fromAddress = config.from.match(/<([^>]+)>/)?.[1] || config.user;
  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${config.host}>`;

  const plainText = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const rawMessage = [
    `From: ${config.from}`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
    `.`,
    ``,
  ].join("\r\n");

  return new Promise((resolve) => {
    let resolved = false;
    function finish(res: { ok: boolean; messageId?: string; error?: string }) {
      if (!resolved) {
        resolved = true;
        try { socket.end(); } catch {}
        resolve(res);
      }
    }

    const socket = tls.connect(
      {
        host: config.host,
        port: config.port,
        servername: config.host,
        timeout: 15000,
      },
      () => {
        // Connected
      }
    );

    socket.setTimeout(15000, () => {
      finish({ ok: false, error: "SMTP connection timed out" });
    });

    let step = 0;
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      const lastLine = lines[lines.length - 2] || "";

      // SMTP responses end with a line starting with 3 digits followed by a space
      if (lastLine.match(/^\d{3}\s/)) {
        const code = parseInt(lastLine.substring(0, 3), 10);
        buffer = "";

        if (code >= 400) {
          finish({ ok: false, error: `SMTP server responded with error: ${lastLine}` });
          return;
        }

        step++;
        if (step === 1) {
          socket.write(`EHLO localhost\r\n`);
        } else if (step === 2) {
          socket.write(`AUTH LOGIN\r\n`);
        } else if (step === 3) {
          socket.write(Buffer.from(config.user).toString("base64") + "\r\n");
        } else if (step === 4) {
          socket.write(Buffer.from(config.pass).toString("base64") + "\r\n");
        } else if (step === 5) {
          socket.write(`MAIL FROM:<${fromAddress}>\r\n`);
        } else if (step === 6) {
          socket.write(`RCPT TO:<${to}>\r\n`);
        } else if (step === 7) {
          socket.write(`DATA\r\n`);
        } else if (step === 8) {
          socket.write(rawMessage);
        } else if (step === 9) {
          socket.write(`QUIT\r\n`);
          finish({ ok: true, messageId });
        }
      }
    });

    socket.on("error", (err) => {
      finish({ ok: false, error: err.message });
    });
  });
}

/**
 * Builds the verification email HTML.
 */
export function buildVerificationEmailHtml(verifyUrl: string, recipientEmail: string, purpose: "verify" | "change" = "verify"): string {
  const safeEmail = recipientEmail.replace(/[&<>"']/g, value => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]!);
  const safeUrl = verifyUrl.replace(/[&<>"']/g, value => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]!);
  const title = purpose === "change" ? "Confirm your email change" : "Verify your email address";
  const explanation = purpose === "change"
    ? `You asked to change your WSB account email to <strong>${safeEmail}</strong>. Confirm this address to complete the change. Your current address stays active until confirmation.`
    : `Please confirm that <strong>${safeEmail}</strong> belongs to you. Email verification confirms control of this address; chapter membership is checked separately.`;
  const buttonText = purpose === "change" ? "Confirm Email Change" : "Verify Email Address";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — World Supremacy Battlegrounds</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0f12;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0d0f12;
      padding: 40px 16px;
    }
    .main {
      background-color: #161b22;
      margin: 0 auto;
      max-width: 580px;
      border-radius: 8px;
      border: 1px solid #30363d;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(180deg, #1f242c 0%, #161b22 100%);
      padding: 32px 32px 24px;
      border-bottom: 2px solid #e8ff00;
      text-align: left;
    }
    .brand-title {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      color: #8b949e;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .content {
      padding: 32px;
    }
    h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 16px;
    }
    p {
      color: #c9d1d9;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .btn-container {
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #e8ff00;
      color: #000000;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .alt-link {
      background-color: #0d1117;
      padding: 12px 16px;
      border-radius: 4px;
      border: 1px solid #30363d;
      font-family: monospace;
      font-size: 13px;
      word-break: break-all;
      color: #58a6ff;
      margin-top: 24px;
    }
    .alt-link a {
      color: #58a6ff;
      text-decoration: none;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0d1117;
      border-top: 1px solid #21262d;
      text-align: left;
    }
    .footer p {
      color: #8b949e;
      font-size: 12px;
      line-height: 1.5;
      margin: 0 0 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td class="header">
          <div class="brand-title">World Supremacy Battlegrounds</div>
          <div class="brand-subtitle">Championship Competition System</div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1>${title}</h1>
          <p>Hello,</p>
          <p>${explanation}</p>
          <div class="btn-container">
            <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">${buttonText}</a>
          </div>
          <p style="font-size: 13px; color: #8b949e;">If the button above does not work, copy and paste this link into your browser:</p>
          <div class="alt-link">
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>This link is intended for ${safeEmail}. If you did not request this action, ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} World Supremacy Battlegrounds. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Builds the password reset email HTML.
 */
export function buildPasswordResetEmailHtml(resetUrl: string, recipientEmail: string): string {
  const safeEmail = recipientEmail.replace(/[&<>"']/g, value => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]!);
  const safeUrl = resetUrl.replace(/[&<>"']/g, value => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]!);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password — World Supremacy Battlegrounds</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0f12;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0d0f12;
      padding: 40px 16px;
    }
    .main {
      background-color: #161b22;
      margin: 0 auto;
      max-width: 580px;
      border-radius: 8px;
      border: 1px solid #30363d;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(180deg, #1f242c 0%, #161b22 100%);
      padding: 32px 32px 24px;
      border-bottom: 2px solid #e8ff00;
      text-align: left;
    }
    .brand-title {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      color: #8b949e;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .content {
      padding: 32px;
    }
    h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 16px;
    }
    p {
      color: #c9d1d9;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .btn-container {
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #e8ff00;
      color: #000000;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .alt-link {
      background-color: #0d1117;
      padding: 12px 16px;
      border-radius: 4px;
      border: 1px solid #30363d;
      font-family: monospace;
      font-size: 13px;
      word-break: break-all;
      color: #58a6ff;
      margin-top: 24px;
    }
    .alt-link a {
      color: #58a6ff;
      text-decoration: none;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0d1117;
      border-top: 1px solid #21262d;
      text-align: left;
    }
    .footer p {
      color: #8b949e;
      font-size: 12px;
      line-height: 1.5;
      margin: 0 0 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td class="header">
          <div class="brand-title">World Supremacy Battlegrounds</div>
          <div class="brand-subtitle">Championship Competition System</div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1>Reset your password</h1>
          <p>Hello,</p>
          <p>We received a request to reset the password associated with <strong>${safeEmail}</strong>. Click the button below to choose a new password.</p>
          <div class="btn-container">
            <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #8b949e;">If the button above does not work, copy and paste this link into your browser:</p>
          <div class="alt-link">
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>If you did not request a password reset, you can safely ignore this email. Your current password remains unchanged.</p>
          <p>&copy; ${new Date().getFullYear()} World Supremacy Battlegrounds. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}
