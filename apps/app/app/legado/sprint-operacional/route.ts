import { NextResponse } from "next/server";

const legacyApplication = "/legado/sprint-operacional/index.html";

export const GET = (request: Request) =>
  NextResponse.redirect(new URL(legacyApplication, request.url));
