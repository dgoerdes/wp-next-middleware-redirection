import { NextRequest, NextResponse } from "next/server";

export type RedirectStatusCode = 301 | 302 | 303 | 304 | 307 | 308;

export type RedirectQueryFlag = "pass" | "ignore" | "exact" | "exactorder";

export type CmsRedirect = {
  source: string;
  target: string;
  search?: string;
  statusCode: RedirectStatusCode;
  queryFlag: RedirectQueryFlag;
};

const PUBLIC_FILE = /\.([a-zA-Z0-9]+$)/;

export const handleCmsRedirects = async (
  request: NextRequest
): Promise<Response | NextResponse | undefined> => {
  // We want to return early in case this is not a request
  // eligible for CMS redirects.
  if (
    PUBLIC_FILE.test(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  console.log("PATHNAME: ", request.nextUrl.pathname);

  try {
    const redirects = await getCmsRedirects();

    const matchingRedirect = redirects.find(
      (item) => item.source === request.nextUrl.pathname
    );

    if (!matchingRedirect) {
      return;
    }

    if (matchingRedirect.queryFlag === "ignore") {
      return handleIgnoreMatch(matchingRedirect);
    }
    if (matchingRedirect.queryFlag === "pass") {
      return handlePassMatch(matchingRedirect, request);
    }
    if (matchingRedirect.queryFlag === "exact") {
      return handleExactMatch(matchingRedirect, request);
    }
    if (matchingRedirect.queryFlag === "exactorder") {
      return handleExactOrderMatch(matchingRedirect, request);
    }
  } catch (error) {
    console.error("Could not fetch CMS redirects.", error);
  }
};

const getCmsRedirects = async (): Promise<CmsRedirect[]> => {
  const apiUrl = "https://api-qa.fhtw.ovl.cloud/redirects";
  console.log("FETCH REDIRECTS: ", apiUrl);

  const req = await fetch(apiUrl, {
    method: "GET",
  });

  return req.json();
};

const handlePassMatch = (
  matchingRedirect: CmsRedirect,
  request: NextRequest
): NextResponse => {
  return NextResponse.redirect(
    matchingRedirect.target + (request.nextUrl.search ?? ""),
    matchingRedirect.statusCode
  );
};

const handleIgnoreMatch = (matchingRedirect: CmsRedirect): NextResponse => {
  return NextResponse.redirect(
    matchingRedirect.target,
    matchingRedirect.statusCode
  );
};

const handleExactMatch = (
  matchingRedirect: CmsRedirect,
  request: NextRequest
): NextResponse | undefined => {
  // In case we have search params for the redirect we need to check
  // if they match to the request in any order.
  if (matchingRedirect.search) {
    const params = parseParams(matchingRedirect.search);
    const reqParams = parseParams(request.nextUrl.search);

    for (const key of Object.keys(params)) {
      if (params[key] !== reqParams[key]) {
        return;
      }
    }

    return NextResponse.redirect(
      matchingRedirect.target + (request.nextUrl.search ?? ""),
      matchingRedirect.statusCode
    );
  }

  return NextResponse.redirect(
    matchingRedirect.target,
    matchingRedirect.statusCode
  );
};

const handleExactOrderMatch = (
  matchingRedirect: CmsRedirect,
  request: NextRequest
): NextResponse | undefined => {
  // In case we have search params for the redirect we need to check
  // if they match in the same order to the request.
  if (matchingRedirect.search) {
    const href = matchingRedirect.source + matchingRedirect.search;

    if (href === request.nextUrl.href) {
      return NextResponse.redirect(
        matchingRedirect.target + (request.nextUrl.search ?? ""),
        matchingRedirect.statusCode
      );
    } else {
      return;
    }
  }

  // In case there are no search params we already have an exact match and can apply the redirect.
  return NextResponse.redirect(
    matchingRedirect.target,
    matchingRedirect.statusCode
  );
};

const parseParams = (queryString: string): Record<string, string> => {
  return queryString
    .replace("?", "")
    .split("&")
    .reduce((acc, param) => {
      const keyValue = param.split("=");
      return {
        ...acc,
        [keyValue[0]]: keyValue[1],
      };
    }, {});
};
