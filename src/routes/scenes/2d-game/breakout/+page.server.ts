import { VERCEL_URL, VERCEL_TARGET_ENV, VERCEL_BRANCH_URL } from "$env/static/private";

export function load() {
  const baseURL = getBaseURL();
  const breakoutAssetsBaseURL = `${baseURL}/assets/breakout`;
  return {
    breakoutAssetsBaseURL
  };
}

function getBaseURL() {
  if (VERCEL_TARGET_ENV === "production") {
    return `https://${VERCEL_URL}`;
  } else if (VERCEL_TARGET_ENV === "preview") {
    return `https://${VERCEL_BRANCH_URL}`;
  }
  return `http://localhost:1420`;
}
