<script lang="ts">
  import { Menu, X } from "@lucide/svelte";
  import { page } from "$app/state";
  import { sceneDetailsList } from "~/lib/scene-details";

  const { sceneName } = $derived(page.params);
  const currentPath = $derived(page.url.pathname);
  const selectedPath = $derived(sceneDetailsList.find((details) => details.route === sceneName));

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
    sceneName && !isPageError && "text-blue-50"
  ]}
>
  {selectedPath?.name ?? currentPath}
</div>
{#if !sidebarOpen}
  <button
    class={["absolute top-8 right-8", sceneName && !isPageError && "text-blue-50"]}
    aria-label={"Open sidebar"}
    onclick={openSidebar}
  >
    <Menu />
  </button>
{/if}

<dialog
  class="relative min-h-screen min-w-screen bg-transparent backdrop:backdrop-blur"
  bind:this={sidebar}
>
  <div
    class="absolute top-0 right-0 max-h-screen w-xs overflow-auto bg-blue-200 px-4 py-4 dark:bg-blue-800"
  >
    <button class="absolute top-8 right-8" aria-label={"Close sidebar"} onclick={closeSidebar}>
      <X />
    </button>
    <nav class="mt-14">
      <a href="/" class="text-xl underline underline-offset-8" onclick={closeSidebar}
        >Graphics with WebGL</a
      >
      <ul class="mt-4 list-disc overflow-auto ps-4">
        {#each sceneDetailsList as { route, name }}
          <li>
            <a
              href={`/scenes/${route}`}
              onclick={closeSidebar}
              class={["underline", currentPath === route && "font-bold"]}>{name}</a
            >
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</dialog>
