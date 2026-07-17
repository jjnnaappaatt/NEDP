import "server-only";

/** LIFF deep-link helper (shared by the webhook replies and the push/Flex builders): opens the app
 *  inside LINE when NEXT_PUBLIC_LIFF_ID is set, otherwise falls back to the public web URL. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example";
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
export const LIFF = (path = ""): string =>
  LIFF_ID ? `https://liff.line.me/${LIFF_ID}${path}` : `${APP_URL}${path}`;
