<script lang="ts">
  import { Pause, Speaker, SpeakerIcon, Volume, VolumeIcon, VolumeOff } from "@lucide/svelte";
  import { resizeCanvas } from "~/lib/canvas";
  import {
    BreakoutGame,
    BreakoutGameState,
    soundModeList,
    type BreakoutGameDimensions,
    type SoundMode
  } from "~/lib/game/game.svelte";
  import { ResourceManager } from "~/lib/game/resource-manager";

  let { data } = $props();
  let glContext: WebGL2RenderingContext | undefined = $state();
  let canvas: HTMLCanvasElement;
  const game = new BreakoutGame();

  let pauseMenu: HTMLDialogElement;
  let resultMenu: HTMLDialogElement;

  $effect(() => {
    if (game.state === BreakoutGameState.WIN || game.state === BreakoutGameState.LOSE) {
      resultMenu.showModal();
    }
  });

  async function setupGame(
    gl: WebGL2RenderingContext,
    {
      dimensions = { x: 800, y: 600 },
      soundMode = "no-sound"
    }: { dimensions?: BreakoutGameDimensions; soundMode?: SoundMode } = {}
  ) {
    resizeCanvas(canvas, gl, dimensions.x, dimensions.y);
    const resourceManager = new ResourceManager(data.breakoutAssetsBaseURL);
    await game.init(gl, resourceManager, dimensions, soundMode);

    game.render(gl);
  }
</script>

<h1 class="sr-only">Breakout</h1>
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
    <div class="absolute top-8 right-8 flex flex-col gap-2 text-white">
      <div>Lives: {game.getRemainingLives()}</div>
      <div>FPS: {game.fps}</div>
    </div>
  {/if}

  <dialog
    bind:this={pauseMenu}
    class="m-auto backdrop:backdrop-blur-sm"
    onclose={() => {
      game.resume();
    }}
  >
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center px-4 py-4">
      <p class="mb-4 text-xl font-bold">Breakout</p>
      <section class="mb-8">
        <h2>Sound settings</h2>
        <div class="flex flex-row items-center">
          {#each soundModeList as mode}
            <button
              class={[
                "border p-2",
                mode === game.soundMode && "bg-black text-white hover:cursor-default!"
              ]}
              disabled={mode === game.soundMode}
              onclick={() => game.setSoundMode(mode)}>{mode}</button
            >
          {/each}
        </div>
      </section>
      <div class="space-y-2">
        <button
          class="rounded border p-2"
          onclick={() => {
            pauseMenu.close();
          }}>Resume</button
        >
        <button
          class="rounded border p-2"
          onclick={() => {
            game.retryLevel();
            pauseMenu.close();
          }}>Reset game</button
        >
        <a class="rounded border p-2" href="/">To Home Page</a>
      </div>
    </div>
  </dialog>

  <dialog bind:this={resultMenu} class="m-auto backdrop:backdrop-blur-sm">
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center px-4 py-4">
      <p class="mb-4 text-xl font-bold">
        {game.state === BreakoutGameState.WIN ? "You Win" : "You Lose"}
      </p>
      <div class="space-y-2">
        <button
          class="rounded border p-2"
          onclick={() => {
            game.replayLevel();
            resultMenu.close();
          }}>Play again</button
        >
        <button
          class="rounded border p-2"
          onclick={() => {
            resultMenu.close();
          }}>Level Select</button
        >
        <a class="rounded border p-2" href="/">To Home Page</a>
      </div>
    </div>
  </dialog>

  <div class="absolute z-20 flex items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      {#if game.state === BreakoutGameState.NOT_INITIALIZED}
        <div>Do you want sound?</div>
        <div class="items-center justify-center">
          {#each soundModeList as mode}
            <button
              class={[
                "border p-2 hover:text-black",
                mode === "no-sound" ? "hover:bg-red-300" : "hover:bg-green-300"
              ]}
              onclick={() => setupGame(glContext!, { soundMode: mode })}>{mode}</button
            >
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <canvas
    bind:this={canvas}
    {@attach (canvas) => {
      const gl = canvas.getContext("webgl2");
      if (!gl) {
        return;
      }
      glContext = gl;
      return () => {
        game.clearResources(gl);
      };
    }}
  ></canvas>
</main>
