<script lang="ts">
  import { resizeCanvas } from "~/lib/canvas";
  import {
    BreakoutGame,
    BreakoutGameState,
    type BreakoutGameDimensions
  } from "~/lib/game/game.svelte";
  import { ResourceManager } from "~/lib/game/resource-manager";

  let glBinding: WebGL2RenderingContext;
  let canvas: HTMLCanvasElement;
  let game: BreakoutGame | null = null;

  async function setupGame(gl: WebGL2RenderingContext, dimensions: BreakoutGameDimensions) {
    const resourceManager = new ResourceManager();
    game = new BreakoutGame(resourceManager, dimensions);
    await game.init(gl);

    console.debug("Game init complete.");
    console.debug("Game:", game);
    console.debug("Game state:", BreakoutGameState[game.state]);
    game.render(gl);
  }

  function main(canvas: HTMLCanvasElement) {
    console.debug("In main");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      return;
    }
    glBinding = gl;
    const dimensions = { x: window.innerWidth, y: window.innerHeight };
    resizeCanvas(canvas, gl, dimensions.x, dimensions.y);
    setupGame(gl, dimensions);

    return () => {
      game?.clearResources(gl);
    };
  }
</script>

<main class="flex min-h-screen items-center justify-center bg-black">
  <div class="absolute z-20 flex items-center justify-center">
    <div>
      {#if game && game.state === BreakoutGameState.NOT_INITIALIZED}
        <p>Initializing game...</p>
      {/if}
    </div>
  </div>

  <canvas bind:this={canvas} {@attach main}></canvas>
</main>
