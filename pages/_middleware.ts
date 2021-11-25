import { NextRequest, NextResponse } from "next/server";
import { handleCmsRedirects } from "../middleware/handle-cms-redirects";

export async function middleware(
  request: NextRequest
): Promise<Response | NextResponse | undefined> {
  return handleCmsRedirects(request);
}
