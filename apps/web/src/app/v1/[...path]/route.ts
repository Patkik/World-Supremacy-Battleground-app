import { NextRequest, NextResponse } from "next/server";

const API_TARGET = process.env.INTERNAL_API_URL || "http://api:8088";

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const targetUrl = new URL(`/v1/${path.join("/")}${req.nextUrl.search}`, API_TARGET);

    const headers = new Headers();
    req.headers.forEach((val, key) => {
      if (key !== "host" && key !== "connection") {
        headers.set(key, val);
      }
    });

    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const resHeaders = new Headers();
    response.headers.forEach((val, key) => {
      if (key !== "content-encoding") {
        resHeaders.set(key, val);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "API Gateway proxy failure", details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
