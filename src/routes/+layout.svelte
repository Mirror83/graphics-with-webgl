<script lang="ts">
  import "~/app.css";
  import NavSidebar from "~/components/nav-sidebar.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<div
  class="relative min-h-screen bg-blue-100 font-mono text-blue-900 dark:bg-blue-900 dark:text-blue-100"
>
  <NavSidebar />
  {@render children()}
</div>
