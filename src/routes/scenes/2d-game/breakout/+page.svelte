<script lang="ts">
  import { Pause } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { resizeCanvas } from "~/lib/canvas";
  import {
    BreakoutGame,
    BreakoutGameState,
    type BreakoutGameDimensions
  } from "~/lib/game/game.svelte";
  import { ResourceManager } from "~/lib/game/resource-manager";

  let { data } = $props();
  let glBinding: WebGL2RenderingContext;
  let canvas: HTMLCanvasElement;
  const game = new BreakoutGame();

  let pauseMenu: HTMLDialogElement;

  onMount(async () => {
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      return;
    }
    glBinding = gl;
    const dimensions: BreakoutGameDimensions = { x: window.innerWidth, y: window.innerHeight };
    resizeCanvas(canvas, gl, dimensions.x, dimensions.y);
    const resourceManager = new ResourceManager(data.breakoutAssetsBaseURL);
    await game.init(gl, resourceManager, dimensions);

    console.debug("Game init complete.");
    console.debug("Game:", game);
    console.debug("Game state:", BreakoutGameState[game.state]);
    game.render(gl);
  });

  onDestroy(() => {
    game.clearResources(glBinding);
  });
</script>

<main class="flex min-h-screen items-center justify-center bg-black">
  {#if game.state === BreakoutGameState.ACTIVE}
    <button
      class="absolute top-8 left-8"
      aria-label="Pause game"
      onclick={() => {
        game.pause();
        pauseMenu.showModal();
      }}><Pause /></button
    >
  {/if}
  <dialog
    bind:this={pauseMenu}
    class="m-auto"
    onclose={() => {
      game.resume(glBinding);
    }}
  >
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center">
      <p class="fonr-bold mb-4 text-xl font-bold">Breakout</p>
      <button
        class="rounded border p-2"
        onclick={() => {
          pauseMenu.close();
        }}>Resume</button
      >
    </div>
  </dialog>
  <div class="absolute z-20 flex items-center justify-center">
    <div>
      {#if game.state === BreakoutGameState.NOT_INITIALIZED}
        <p>Initializing game...</p>
      {/if}
    </div>
  </div>

  <canvas bind:this={canvas}></canvas>
</main>
