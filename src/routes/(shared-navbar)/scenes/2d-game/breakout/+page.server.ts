import { VERCEL_URL, VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL } from "$env/static/private";

export function load() {
  const baseURL = getBaseURL();
  const breakoutAssetsBaseURL = `${baseURL}/assets/breakout`;
  return {
    breakoutAssetsBaseURL
  };
}

function getBaseURL() {
  if (VERCEL_ENV === "production") {
    return `https://${VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (VERCEL_ENV === "preview") {
    return `https://${VERCEL_URL}`;
  }
  return `http://localhost:1420`;
}
