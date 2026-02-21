<script lang="ts">
  import { Pause } from "@lucide/svelte";
  import { resizeCanvas } from "~/lib/canvas";
  import {
    BreakoutGame,
    BreakoutGameState,
    soundModeList,
    type GameInitOptionalParams
  } from "~/lib/game/game.svelte";
  import { ResourceManager } from "~/lib/game/resource-manager";

  let { data } = $props();
  let glContext: WebGL2RenderingContext | undefined = $state();
  let canvas: HTMLCanvasElement;
  const game = new BreakoutGame();

  let pauseMenu: HTMLDialogElement;
  let resultMenu: HTMLDialogElement;
  let levelSelectMenu: HTMLDialogElement;

  $effect(() => {
    if (game.state === BreakoutGameState.MENU) {
      levelSelectMenu.showModal();
    }
    if (game.state === BreakoutGameState.WIN || game.state === BreakoutGameState.LOSE) {
      resultMenu.showModal();
    }
  });

  async function setupGame(
    gl: WebGL2RenderingContext,
    {
      windowSize = { x: 800, y: 600 },
      soundMode = "no-sound",
      startingLevel: currentLevel = 1
    }: GameInitOptionalParams = {}
  ) {
    resizeCanvas(canvas, gl, windowSize.x, windowSize.y);
    const resourceManager = new ResourceManager(data.breakoutAssetsBaseURL);
    await game.init(gl, resourceManager, {
      windowSize: windowSize,
      soundMode,
      startingLevel: currentLevel
    });

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
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center space-y-4 px-4 py-4">
      <p class="text-xl font-bold">Breakout</p>
      <section>
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
      <div>
        <button
          class="border p-2"
          onclick={() => {
            pauseMenu.close();
          }}>Resume</button
        >
        <button
          class="border p-2"
          onclick={() => {
            game.retryLevel();
            pauseMenu.close();
          }}>Reset level</button
        >
        <button
          class="border p-2"
          onclick={() => {
            game.toMenu();
            pauseMenu.close();
          }}>Level select</button
        >
      </div>
      <a class="underline" href="/">To Home Page</a>
    </div>
  </dialog>

  <dialog bind:this={resultMenu} class="m-auto backdrop:backdrop-blur-sm">
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center space-y-4 px-4 py-4">
      <p class="mb-4 text-xl font-bold">
        {game.state === BreakoutGameState.WIN ? "You Win" : "You Lose"}
      </p>
      <div>
        <button
          class="border p-2"
          onclick={() => {
            game.resetLevel();
            resultMenu.close();
          }}>Play again</button
        >
        <button
          class="border p-2"
          onclick={() => {
            game.toMenu();
            resultMenu.close();
          }}>Level Select</button
        >
      </div>
      <a class="underline" href="/">To Home Page</a>
    </div>
  </dialog>

  <dialog bind:this={levelSelectMenu} class="m-auto backdrop:backdrop-blur-sm">
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center space-y-4 px-4 py-4">
      <div class="text-xl font-bold">Breakout</div>
      <div class="grid-cols-2">
        {#each game.getLevelNumbers() as levelNumber}
          <button
            class="border p-2"
            onclick={() => {
              game.setCurrentLevel(levelNumber);
              levelSelectMenu.close();
            }}>Level {levelNumber}</button
          >
        {/each}
      </div>
      <a class="underline" href="/">To Home Page</a>
    </div>
  </dialog>

  <div class="absolute z-20 flex items-center justify-center text-white">
    {#if game.state === BreakoutGameState.NOT_INITIALIZED}
      <div class="flex flex-col items-center gap-4">
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
      </div>
    {/if}
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
