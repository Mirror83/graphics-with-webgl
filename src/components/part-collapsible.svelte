<script lang="ts">
  import { ChevronDown, ChevronUp } from "@lucide/svelte";
  import type { Part } from "~/lib/scene-details";
  type CollapsibleProps = {
    part: Part;
    partRouteName: string;
    currentRouteName: string;
    onclick?: () => void;
  };
  let { part, partRouteName, currentRouteName, onclick }: CollapsibleProps = $props();
  let isOpen = $state(false);
</script>

<div>
  <button
    onclick={() => (isOpen = !isOpen)}
    class="flex w-full flex-row items-center justify-between py-2"
  >
    {part.displayName}
    {#if !isOpen}
      <ChevronDown />
    {:else}
      <ChevronUp />
    {/if}
  </button>
  {#if isOpen}
    <ul class="ms-4 list-disc">
      {#each part.scenes as { route, name: sceneName }}
        <li>
          <a
            href="/scenes/{partRouteName}/{route}"
            {onclick}
            class={["underline", currentRouteName === route && "font-bold"]}>{sceneName}</a
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>
