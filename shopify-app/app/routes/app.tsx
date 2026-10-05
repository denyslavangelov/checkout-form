import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        <a href="/app" rel="home">
          Dashboard
        </a>
        <a href="/app/setup">Setup guide</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // Shopify boundary.error stringifies ErrorResponse.data via innerHTML.
  // If data is an object, the UI shows "[object Object]" — normalize first.
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    (error as { data?: unknown }).data != null &&
    typeof (error as { data?: unknown }).data !== "string"
  ) {
    const data = (error as { data: unknown }).data;
    const raw =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : JSON.stringify(data);
    const isTokenForbidden =
      raw.includes("Forbidden") ||
      raw.includes("Non-expiring access tokens") ||
      raw.includes("403");
    return (
      <s-page heading="Something went wrong" inlineSize="base">
        <s-section heading={isTokenForbidden ? "Re-authorize the app" : "Error"}>
          <s-paragraph>
            {isTokenForbidden
              ? "Shopify rejected the Admin API token. Close this tab, restart npm run dev -- --config shipmatch, press P to open the app again so a new expiring offline token is issued."
              : raw}
          </s-paragraph>
        </s-section>
      </s-page>
    );
  }

  try {
    return boundary.error(error);
  } catch (thrown) {
    const message =
      thrown instanceof Error ? thrown.message : "Unexpected application error";
    return (
      <s-page heading="Something went wrong" inlineSize="base">
        <s-section heading="Error">
          <s-paragraph>{message}</s-paragraph>
        </s-section>
      </s-page>
    );
  }
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
