<script lang="ts">
  import { Menu, X } from "@lucide/svelte";
  import { page } from "$app/state";
  import { parts } from "~/lib/scene-details";
  import PartCollapsible from "~/components/part-collapsible.svelte";

  const { partName: currentPartName, sceneName: currentSceneName } = $derived(page.params);
  const currentPath = $derived(page.url.pathname);
  const currentScenes = $derived(currentPartName ? parts[currentPartName].scenes : []);
  const selectedPath = $derived(
    currentScenes.find((details) => details.route === currentSceneName)
  );

  const isPageError = $derived(page.error);

  let sidebar: HTMLDialogElement;
  let sidebarOpen = $state(false);

  function openSidebar() {
    sidebarOpen = true;
    sidebar.showModal();
  }

  function closeSidebar() {
    sidebarOpen = false;
    sidebar.close();
  }
</script>

<div
  class={[
    "absolute top-8 left-8 max-w-[20ch] truncate sm:max-w-[30ch] md:max-w-[50ch]",
    currentSceneName && !isPageError && "text-blue-50"
  ]}
>
  {selectedPath?.name ?? currentPath}
</div>
{#if !sidebarOpen}
  <button
    class={["absolute top-8 right-8", currentSceneName && !isPageError && "text-blue-50"]}
    aria-label={"Open sidebar"}
    onclick={openSidebar}
  >
    <Menu />
  </button>
{/if}

<dialog
  class="min-h-screen min-w-screen bg-transparent backdrop:backdrop-blur"
  closedby="closerequest"
  bind:this={sidebar}
  onclose={() => {
    sidebarOpen = false;
  }}
>
  <div
    class="absolute top-0 right-0 h-screen w-xs overflow-auto bg-blue-200 px-4 py-4 text-blue-900 dark:bg-blue-800 dark:text-blue-100"
  >
    <button
      class="my-4 flex w-full flex-row justify-end"
      aria-label={"Close sidebar"}
      onclick={closeSidebar}
    >
      <X />
    </button>
    <nav>
      <a href="/" class="text-xl underline underline-offset-8" onclick={closeSidebar}
        >Graphics with WebGL</a
      >
      <div class="my-4 space-y-2">
        {#each Object.entries(parts) as [partRouteName, part]}
          <PartCollapsible
            {partRouteName}
            {part}
            currentRouteName={currentPath}
            onclick={closeSidebar}
          />
        {/each}
      </div>
    </nav>
  </div>
</dialog>
