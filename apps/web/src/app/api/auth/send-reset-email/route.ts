import { NextRequest, NextResponse } from "next/server";
import { buildPasswordResetEmailHtml, getSmtpConfig, sendMail } from "@/lib/email";
import { localEmailOrigin } from "@/lib/local-email-origin";

interface OobCodeRecord {
  email: string;
  requestType: string;
  oobCode: string;
  oobLink: string;
}

function getCandidateHosts(): string[] {
  const custom = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const hosts = [
    custom ? (custom.startsWith("http") ? custom : `http://${custom}`) : null,
    "http://firebase:9099",
    "http://127.0.0.1:9099",
    "http://localhost:9099",
  ].filter(Boolean) as string[];
  return Array.from(new Set(hosts));
}

async function fetchEmulatorOobCodes(): Promise<OobCodeRecord[]> {
  for (const host of getCandidateHosts()) {
    try {
      const res = await fetch(`${host}/emulator/v1/projects/demo-wsb/oobCodes`, {
        signal: AbortSignal.timeout(2000),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return (data.oobCodes || []) as OobCodeRecord[];
      }
    } catch {}
  }
  return [];
}

async function triggerEmulatorResetCode(email: string): Promise<void> {
  for (const host of getCandidateHosts()) {
    try {
      const res = await fetch(`${host}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return;
    } catch {}
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "true" || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-wsb") {
      return NextResponse.json({ ok: false, error: "Local email delivery is unavailable" }, { status: 404 });
    }
    let email = "";
    try {
      const body = await req.json();
      if (body && typeof body.email === "string") {
        email = body.email.trim();
      }
    } catch {}

    if (!email || email.length > 254 || /[\r\n\0]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const appOrigin = localEmailOrigin(process.env.WEB_ORIGIN);
    if (!appOrigin) return NextResponse.json({ ok: false, error: "Local email delivery is unavailable" }, { status: 503 });

    // Trigger or fetch password reset code
    let oobCodes = await fetchEmulatorOobCodes();
    let matching = oobCodes.filter((item) => item.email.toLowerCase() === email.toLowerCase() && item.requestType === "PASSWORD_RESET");

    if (matching.length === 0) {
      await triggerEmulatorResetCode(email);
      oobCodes = await fetchEmulatorOobCodes();
      matching = oobCodes.filter((item) => item.email.toLowerCase() === email.toLowerCase() && item.requestType === "PASSWORD_RESET");
    }

    const latest = matching[matching.length - 1];
    if (!latest?.oobCode) {
      return NextResponse.json({ ok: false, error: "Could not generate password reset code" }, { status: 500 });
    }

    const resetUrl = `${appOrigin}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(latest.oobCode)}`;

    const smtp = getSmtpConfig();
    if (!smtp) {
      return NextResponse.json({
        ok: true,
        delivered: false,
        reason: "smtp_not_configured",
        resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
      });
    }

    const result = await sendMail({
      to: email,
      subject: "Reset your password — World Supremacy Battlegrounds",
      html: buildPasswordResetEmailHtml(resetUrl, email),
      text: `Hello,\n\nPlease reset your password for World Supremacy Battlegrounds by opening this link in your browser:\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nWorld Supremacy Battlegrounds Platform`,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: "Failed to deliver reset email",
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      delivered: true,
      recipient: email,
      messageId: result.messageId,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "Unable to process reset request",
    }, { status: 500 });
  }
}
