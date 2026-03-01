<script lang="ts">
  import { Pause } from "@lucide/svelte";
  import InitialSoundConfirmation from "~/components/2d-game/breakout/initial-sound-confirmation.svelte";
  import ToHomepageLink from "~/components/2d-game/breakout/to-homepage-link.svelte";
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

  $inspect(game.state).with((type, state) =>
    console.log("type:", type, "\nvalue:", BreakoutGameState[state])
  );

  $effect(() => {
    switch (game.state) {
      case BreakoutGameState.MENU:
        levelSelectMenu.showModal();
        break;
      case BreakoutGameState.PAUSED:
        pauseMenu.showModal();
        break;
      case BreakoutGameState.WIN:
      case BreakoutGameState.LOSE:
        resultMenu.showModal();
        break;
      case BreakoutGameState.ACTIVE:
        // Close all open modals
        levelSelectMenu.open && levelSelectMenu.close();
        resultMenu.open && resultMenu.close();
        pauseMenu.open && pauseMenu.close();
        break;
      default:
        break;
    }
  });

  async function setupGame(
    gl: WebGL2RenderingContext,
    { windowSize = { x: 700, y: 500 }, soundMode = "no-sound" }: GameInitOptionalParams = {}
  ) {
    resizeCanvas(canvas, gl, windowSize.x, windowSize.y);
    const resourceManager = new ResourceManager(data.breakoutAssetsBaseURL);
    await game.init(gl, resourceManager, {
      windowSize: windowSize,
      soundMode
    });

    game.render(gl);
  }

  function gameCanvasAttachment(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      return;
    }
    glContext = gl;
    return () => {
      game.clearResources(gl);
    };
  }
</script>

<main class="flex min-h-screen flex-col items-center justify-center bg-black">
  <h1 class="sr-only">Breakout</h1>
  {#if game.state === BreakoutGameState.ACTIVE}
    {@render pauseButtonAndLevelInfo()}
  {/if}
  <canvas
    class={[game.state === BreakoutGameState.NOT_INITIALIZED ? "hidden" : "block"]}
    bind:this={canvas}
    {@attach gameCanvasAttachment}
  ></canvas>

  {@render pauseMenuDialog()}
  {@render resultDialog()}
  {@render levelSelectDialog()}

  {#if game.state === BreakoutGameState.NOT_INITIALIZED}
    <InitialSoundConfirmation
      setupGame={(soundMode) => {
        if (!glContext) throw new Error("No gl context");
        setupGame(glContext, { soundMode });
      }}
    />
  {/if}
</main>

{#snippet pauseButtonAndLevelInfo()}
  {@const levelNumber = game.getCurrentLevelNumber()}
  <div class="mb-4 flex w-175 items-center justify-between text-white">
    <button
      aria-label="Pause game"
      onclick={() => {
        game.pause();
        pauseMenu.showModal();
      }}><Pause /></button
    >
    {#if levelNumber}
      <div>Level {levelNumber}</div>
    {/if}
    <div class="flex flex-col">
      <div class="text-sm">
        <div>Lives: {game.getRemainingLives()}</div>
        <div>FPS: {game.fps}</div>
      </div>
    </div>
  </div>
{/snippet}

{#snippet pauseMenuDialog()}
  <dialog bind:this={pauseMenu} class="m-auto backdrop:backdrop-blur-sm" closedby="none">
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
              onclick={() => {
                game.setSoundMode(mode);
              }}>{mode}</button
            >
          {/each}
        </div>
      </section>
      <div>
        <button
          class="border p-2"
          onclick={() => {
            game.resume();
            pauseMenu.close();
          }}>Resume</button
        >
        <button
          class="border p-2"
          onclick={() => {
            game.restartLevel();
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
      <ToHomepageLink />
    </div>
  </dialog>
{/snippet}

{#snippet resultDialog()}
  <dialog bind:this={resultMenu} class="m-auto backdrop:backdrop-blur-sm" closedby="none">
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center space-y-4 px-4 py-4">
      <p class="mb-4 text-xl font-bold">
        {game.state === BreakoutGameState.WIN ? "You Win" : "You Lose"}
      </p>
      <div>
        <button
          class="border p-2"
          onclick={() => {
            game.restartLevel();
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
      <ToHomepageLink />
    </div>
  </dialog>
{/snippet}

{#snippet levelSelectDialog()}
  <dialog bind:this={levelSelectMenu} class="m-auto backdrop:backdrop-blur-sm" closedby="none">
    <div class="flex min-h-32 min-w-60 flex-col items-center justify-center space-y-4 px-4 py-4">
      <div class="text-xl font-bold">Breakout</div>
      <div class="grid-cols-2">
        {#each game.getLevelNumbers() as levelNumber}
          <button
            class="border p-2"
            onclick={() => {
              game.startLevel(levelNumber);
            }}>Level {levelNumber}</button
          >
        {/each}
      </div>
      <ToHomepageLink />
    </div>
  </dialog>
{/snippet}
