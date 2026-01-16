<script lang="ts">
  import "~/app.css";
  import NavSidebar from "~/components/nav-sidebar.svelte";
  import type { LayoutProps } from "./$types";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  let { children }: LayoutProps = $props();
  let shouldHideNavbar = $state(false);
  onMount(() => {
    shouldHideNavbar = page.url.searchParams.get("hide-navbar") === "true";
  });
</script>

<div
  class="relative min-h-screen bg-blue-100 font-mono text-blue-900 dark:bg-blue-900 dark:text-blue-100"
>
  {#if !shouldHideNavbar}
    <NavSidebar />
  {/if}
  {@render children()}
</div>
