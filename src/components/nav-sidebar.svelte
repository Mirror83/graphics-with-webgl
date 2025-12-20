<script lang="ts">
  import { Menu, X } from "@lucide/svelte";
  import { page } from "$app/state";

  const paths = [
    { href: "/", name: "Home" },
    { href: "/hello-triangle", name: "Hello Triangle" },
    { href: "/hello-triangle-indexed", name: "Hello Triangle (indexed)" }
  ];
  const currentPath = $derived(page.url.pathname);
  const selectedPath = $derived(paths.find((path) => path.href === currentPath));

  let sidebarOpen = $state(false);
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
</script>

<div class="absolute top-0 left-0 z-30 flex w-full items-center justify-between p-8">
  <div>{selectedPath?.name ?? currentPath}</div>
  <button aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"} onclick={toggleSidebar}>
    {#if sidebarOpen}
      <X />
    {:else}
      <Menu />
    {/if}
  </button>
</div>
{#if sidebarOpen}
  <div
    class="absolute top-0 right-0 z-10 min-h-screen min-w-screen backdrop-blur"
    role="presentation"
  >
    <nav class="absolute top-0 right-0 z-20 min-h-screen w-xs bg-blue-200 p-4 dark:bg-blue-800">
      <ul class="relative top-16 list-disc ps-4">
        {#each paths as { href, name }}
          <li>
            <a
              {href}
              onclick={() => (sidebarOpen = false)}
              class={["underline", currentPath === href && "font-bold"]}>{name}</a
            >
          </li>
        {/each}
      </ul>
    </nav>
  </div>
{/if}
