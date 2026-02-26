<script lang="ts">
  import NavSidebar from "~/components/nav-sidebar.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<NavSidebar />
{@render children()}
