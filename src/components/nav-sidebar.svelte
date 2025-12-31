<script lang="ts">
  import { Menu, X } from "@lucide/svelte";
  import { page } from "$app/state";
  import { sceneDetailsList } from "~/lib/scene-details";

  const { sceneName } = $derived(page.params);
  const currentPath = $derived(page.url.pathname);
  const selectedPath = $derived(sceneDetailsList.find((details) => details.route === sceneName));

  const isPageError = $derived(page.error);

  let sidebarOpen = $state(false);

  function openSidebar() {
    sidebarOpen = true;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<div class={["absolute top-8 left-8", sceneName && !isPageError && "text-blue-50"]}>
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

{#if sidebarOpen}
  <div
    class="absolute top-0 right-0 z-20 min-h-screen min-w-screen backdrop-blur"
    role="presentation"
  >
    <div class="absolute top-0 right-0 z-30 min-h-screen w-xs bg-blue-200 px-4 dark:bg-blue-800">
      <button class="absolute top-8 right-8" aria-label={"Close sidebar"} onclick={closeSidebar}>
        <X />
      </button>
      <nav class="relative top-16">
        <a href="/" class="text-xl underline underline-offset-8" onclick={closeSidebar}
          >Graphics with WebGL</a
        >
        <ul class="mt-4 list-disc ps-4">
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
  </div>
{/if}
