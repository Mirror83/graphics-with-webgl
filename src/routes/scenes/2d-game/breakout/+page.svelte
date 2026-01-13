<script lang="ts">
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

  onMount(async () => {
    console.debug("In main");
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
  <div class="absolute z-20 flex items-center justify-center">
    <div>
      {#if game && game.state === BreakoutGameState.NOT_INITIALIZED}
        <p>Initializing game...</p>
      {/if}
    </div>
  </div>

  <canvas bind:this={canvas}></canvas>
</main>
