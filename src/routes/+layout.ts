// Tauri doesn't have a Node.js server to do proper SSR,
// so the app is pre-rendered as a static site.
// This comes with the limitation that Tauri APIs cannot be used in
// `load` functions, but as this app only uses Tauri to render the
// SvelteKit app in a desktop window (for now), this is acceptable.
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const prerender = true;
