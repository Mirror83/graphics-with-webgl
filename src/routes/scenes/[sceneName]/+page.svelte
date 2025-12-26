<script lang="ts">
  import { defaultClearColor, toHexColourString } from "~/lib/color";
  import type { PageData } from "./$types";
  import { Info } from "@lucide/svelte";
  let dialog: HTMLDialogElement;

  function showDialog() {
    dialog.showModal();
  }

  function closeDialog() {
    dialog.close();
  }

  const { data }: { data: PageData } = $props();
  const bgColour = toHexColourString(defaultClearColor);
</script>

<main class={`min-h-screen text-blue-50`} style:background-color={bgColour}>
  <canvas tabindex="0" class="focus:outline-0" {@attach data.renderWrapper}
    >{data.description}</canvas
  >

  <dialog
    class="m-auto bg-transparent px-4 backdrop:backdrop-blur"
    closedby="any"
    bind:this={dialog}
  >
    <div class="max-w-[80ch] bg-blue-100 p-8 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
      <h1 class="text-2xl font-bold">{data.name}</h1>
      <p>{data.description}</p>
      {#if data.inputInstructions}
        <p class="mt-8">{data.inputInstructions}</p>
      {/if}
      <button class="mt-8 border-2 p-2" onclick={closeDialog}>Close</button>
    </div>
  </dialog>

  <div class="absolute bottom-8 left-8">
    <button aria-label="Open Info" onclick={showDialog}><Info /></button>
  </div>
</main>
