import { NextRequest, NextResponse } from "next/server";
import { buildVerificationEmailHtml, getSmtpConfig, sendMail } from "@/lib/email";
import { safeAuthReturn } from "@/lib/auth-return";
import { localEmailOrigin } from "@/lib/local-email-origin";

interface OobCodeRecord {
  email: string;
  requestType: string;
  oobCode: string;
  oobLink: string;
}
type VerificationRequestType = "VERIFY_EMAIL" | "VERIFY_AND_CHANGE_EMAIL";

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

async function triggerEmulatorVerifyCode(email: string, requestType: VerificationRequestType): Promise<void> {
  for (const host of getCandidateHosts()) {
    try {
      const res = await fetch(`${host}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType, email }),
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
    let requestType: VerificationRequestType = "VERIFY_EMAIL";
    let continueTo: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.email === "string") {
        email = body.email.trim();
      }
      if (body?.requestType === "VERIFY_AND_CHANGE_EMAIL") requestType = "VERIFY_AND_CHANGE_EMAIL";
      else if (body?.requestType !== undefined && body.requestType !== "VERIFY_EMAIL") {
        return NextResponse.json({ ok: false, error: "Unsupported email action" }, { status: 400 });
      }
      if (typeof body?.continueTo === "string") continueTo = body.continueTo;
      else if (body?.continueTo !== undefined && body.continueTo !== null) {
        return NextResponse.json({ ok: false, error: "Unsupported continuation" }, { status: 400 });
      }
    } catch {}

    if (!email || email.length > 254 || /[\r\n\0]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const appOrigin = localEmailOrigin(process.env.WEB_ORIGIN);
    if (!appOrigin) return NextResponse.json({ ok: false, error: "Local email delivery is unavailable" }, { status: 503 });

    const safeContinueTo = continueTo ? safeAuthReturn(continueTo, appOrigin) : null;
    if (continueTo && !safeContinueTo) {
      return NextResponse.json({ ok: false, error: "Unsupported continuation" }, { status: 400 });
    }

    // Look for latest verification oobCode in emulator
    let oobCodes = await fetchEmulatorOobCodes();
    let matching = oobCodes.filter((item) => item.email.toLowerCase() === email.toLowerCase() && item.requestType === requestType);

    if (matching.length === 0 && requestType === "VERIFY_EMAIL") {
      // Trigger code generation
      await triggerEmulatorVerifyCode(email, requestType);
      oobCodes = await fetchEmulatorOobCodes();
      matching = oobCodes.filter((item) => item.email.toLowerCase() === email.toLowerCase() && item.requestType === requestType);
    }

    const latest = matching[matching.length - 1];
    if (!latest?.oobCode) {
      return NextResponse.json({ ok: false, error: "Could not generate verification code" }, { status: 500 });
    }

    const actionMode = requestType === "VERIFY_AND_CHANGE_EMAIL" ? "verifyAndChangeEmail" : "verifyEmail";
    const continuation = safeContinueTo ? `&continue=${encodeURIComponent(safeContinueTo)}` : "";
    const verifyUrl = `${appOrigin}/auth/action?mode=${actionMode}&oobCode=${encodeURIComponent(latest.oobCode)}${continuation}`;

    const smtp = getSmtpConfig();
    if (!smtp) {
      return NextResponse.json({
        ok: true,
        delivered: false,
        reason: "smtp_not_configured",
        verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
      });
    }

    const result = await sendMail({
      to: email,
      subject: requestType === "VERIFY_AND_CHANGE_EMAIL" ? "Confirm your email change — World Supremacy Battlegrounds" : "Verify your email — World Supremacy Battlegrounds",
      html: buildVerificationEmailHtml(verifyUrl, email, requestType === "VERIFY_AND_CHANGE_EMAIL" ? "change" : "verify"),
      text: requestType === "VERIFY_AND_CHANGE_EMAIL"
        ? `Hello,\n\nYou requested to change your WSB account email to ${email}. Confirm the new address using this link; your current address remains active until confirmation:\n${verifyUrl}\n\nIf you did not request this action, ignore this email.`
        : `Hello,\n\nPlease confirm that ${email} belongs to you by opening this link in your browser. Email verification does not grant chapter membership:\n${verifyUrl}\n\nIf you did not request this action, ignore this email.`,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: "Failed to deliver verification email",
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
      error: "Unable to process verification request",
    }, { status: 500 });
  }
}
