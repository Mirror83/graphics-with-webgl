<script lang="ts">
  import type { SvelteHTMLElements } from "svelte/elements";
  import type { SoundMode } from "~/lib/game/game.svelte";
  import { soundModeList } from "~/lib/game/game.svelte";

  type Props = {
    setupGame: (mode: SoundMode) => void;
  } & SvelteHTMLElements["div"];

  let { setupGame, ...rest }: Props = $props();
</script>

<div class="flex items-center justify-center text-white" {...rest}>
  <div class="flex flex-col items-center gap-4">
    <div>Do you want sound?</div>
    <div class="items-center justify-center">
      {#each soundModeList as mode}
        <button
          class={[
            "border p-2 hover:text-black",
            mode === "no-sound" ? "hover:bg-red-300" : "hover:bg-green-300"
          ]}
          onclick={() => setupGame(mode)}>{mode}</button
        >
      {/each}
    </div>
  </div>
</div>
