import { VERCEL_URL } from "$env/static/private";

export function load() {
  const breakoutAssetsBaseURL = VERCEL_URL
    ? `https://${VERCEL_URL}/assets/breakout`
    : `http://localhost:1420/assets/breakout`;
  return {
    breakoutAssetsBaseURL
  };
}
