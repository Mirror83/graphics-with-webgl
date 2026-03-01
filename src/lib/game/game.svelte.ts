import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { on } from "svelte/events";
import {
  aabbAndCircleCollisionResponse,
  checkCollisionAABBAndCircle,
  checkCollisionAABBs,
  type AABBCollision
} from "~/lib/game/aabb-collision";
import { Ball, Block, Paddle } from "~/lib/game/game-object";
import { BreakoutGameLevel } from "~/lib/game/level";
import {
  BreakoutModifier,
  BreakoutModifierPill,
  modifierSpawnPossibilities,
  modifierSpawnWeights,
  type BreakoutModifierName
} from "~/lib/game/modifier";
import { ParticleGenerator } from "~/lib/game/particle";
import { BreakoutPostProcessor } from "~/lib/game/post-processor";
import { Random } from "~/lib/game/random";
import {
  modifierTextureNames,
  ResourceManager,
  soundEffectNames,
  type SoundEffectName
} from "~/lib/game/resource-manager";
import { SpriteRenderer } from "~/lib/game/sprite";
import { updateRenderTime, type RenderTime } from "~/lib/render";

export enum BreakoutGameState {
  ACTIVE,
  PAUSED,
  MENU,
  WIN,
  LOSE,
  NOT_INITIALIZED
}

export type BreakoutGameDimensions = {
  x: number;
  y: number;
};

const NUMBER_OF_LEVELS = 4;
const NUMBER_OF_LIVES = 3;

export const soundModeList = ["no-sound", "sfx-only", "music-only", "sfx+music"] as const;
export type SoundMode = (typeof soundModeList)[number];
export type GameInitOptionalParams = Partial<{
  windowSize: BreakoutGameDimensions;
  soundMode: SoundMode;
}>;

export class BreakoutGame {
  state: BreakoutGameState = $state(BreakoutGameState.NOT_INITIALIZED);
  fps: number = $state(0);
  windowSize: BreakoutGameDimensions | null = null;
  resourceManager: ResourceManager | null = null;
  #spriteRenderer: SpriteRenderer | null = null;
  #levels: BreakoutGameLevel[] = [];
  #currentLevelNumber: number | null = $state(null);
  #paddle: Paddle | null = null;
  #ball: Ball | null = null;
  #renderTime: RenderTime = { deltaTime: 0, previousTime: 0 };
  #inputHandlerDisposers: Array<() => void> = [];
  #requestAnimationFrameId: number | null = null;
  #particleGenerator: ParticleGenerator | null = null;
  #postProcessor: BreakoutPostProcessor | null = null;
  #spawnedModifiers: BreakoutModifier[] = [];

  #lives: number = $state(NUMBER_OF_LIVES);
  soundMode: SoundMode = $state("no-sound");

  setWindowSize(size: BreakoutGameDimensions) {
    this.windowSize = size;
  }

  /**Initialize game state (load all shaders/textures/levels) */
  async init(
    gl: WebGL2RenderingContext,
    resourceManager: ResourceManager,
    { windowSize = { x: 800, y: 800 }, soundMode = "no-sound" }: GameInitOptionalParams = {}
  ) {
    this.windowSize = windowSize;
    this.soundMode = soundMode;
    const levelSize = { x: windowSize.x, y: windowSize.y / 2 };
    this.resourceManager = resourceManager;
    await Promise.all([
      this.resourceManager.loadShader(gl, "sprite", {
        vertex: "shaders/sprite.vert",
        fragment: "shaders/sprite.frag"
      }),
      this.resourceManager.loadTexture(gl, "ball", "textures/ball.png"),
      this.resourceManager.loadTexture(gl, "block-solid", "textures/block-solid.png"),
      this.resourceManager.loadTexture(gl, "block", "textures/block.png"),
      this.resourceManager.loadTexture(gl, "background", "textures/background.jpg"),
      this.resourceManager.loadTexture(gl, "paddle", "textures/paddle.png"),

      this.resourceManager.loadShader(gl, "particle", {
        vertex: "shaders/particle.vert",
        fragment: "shaders/particle.frag"
      }),
      this.resourceManager.loadTexture(gl, "particle", "textures/particle.png"),

      this.resourceManager.loadShader(gl, "post-processing", {
        vertex: "shaders/post-processing.vert",
        fragment: "shaders/post-processing.frag"
      }),
      ...modifierTextureNames.map((name) =>
        this.resourceManager!.loadTexture(gl, name, `textures/${name}.png`)
      ),

      ...soundEffectNames.map((name) => this.resourceManager!.loadAudio(name, `audio/${name}.wav`)),
      this.resourceManager.loadAudio("background-music", `audio/background-music.mp3`)
    ]);
    // These define the size of the near and far planes of the orthographic projection
    // (their top-left and bottom-right corners)
    const top = 0;
    const left = 0;
    const bottom = this.windowSize.y;
    const right = this.windowSize.x;

    // These define the distance between the near and far plane.
    // They are set to a small range since we don't need depth for 2D rendering.
    // The game elements will be positioned at the middle of the near and far plane
    // (i.e at z = 0)
    const nearPlane = -1;
    const farPlane = 1;

    const projection = mat4.ortho(mat4.create(), left, right, bottom, top, nearPlane, farPlane);

    const levels = await Promise.all(
      Array.from({ length: NUMBER_OF_LEVELS }, (_, i) => {
        return BreakoutGameLevel.createAndInitLevel(
          resourceManager,
          `levels/level-${i + 1}.txt`,
          levelSize
        );
      })
    );

    this.#levels = levels;

    const paddleSprite = this.resourceManager.getTexture("paddle");
    if (!paddleSprite) {
      throw new Error("Paddle texture not found in resource manager");
    }

    this.#paddle = new Paddle({
      position: this.#getInitialPaddlePosition(this.windowSize),
      sprite: paddleSprite
    });

    const ballPosition = this.#ballPositionOnPaddleWhenStuck(
      this.#paddle.position,
      this.#paddle.size[0],
      Ball.INITIAL_RADIUS
    );
    const ballSprite = this.resourceManager.getTexture("ball");
    if (!ballSprite) {
      throw new Error("Ball texture not found in resource manager");
    }
    this.#ball = new Ball({ position: ballPosition, sprite: ballSprite });

    const spriteShader = this.resourceManager.getShader("sprite");
    if (!spriteShader) {
      throw new Error("Sprite shader not found in resource manager");
    }
    spriteShader
      .use(gl)
      .setUniform(gl, "spriteImage", { type: "int", value: 0 })
      .setUniform(gl, "projection", { type: "mat4-float", value: projection })
      .finishUse(gl);

    const renderer = new SpriteRenderer(spriteShader);
    renderer.init(gl);
    this.#spriteRenderer = renderer;

    const particleShader = this.resourceManager.getShader("particle");
    if (!particleShader) {
      throw new Error("Particle shader not found in resource manager");
    }
    particleShader
      .use(gl)
      .setUniform(gl, "projection", { type: "mat4-float", value: projection })
      .finishUse(gl);
    const particleTexture = this.resourceManager.getTexture("particle");
    if (!particleTexture) {
      throw new Error("Particle texture not found in resource manager");
    }

    this.#particleGenerator = new ParticleGenerator(gl, particleShader, particleTexture);

    const postProcessingShader = this.resourceManager.getShader("post-processing");
    if (!postProcessingShader) {
      throw new Error("Post-processing shader not found in resource manager");
    }

    this.#postProcessor = new BreakoutPostProcessor(postProcessingShader, this.windowSize);
    this.#postProcessor.init(gl);

    this.#inputHandlerDisposers.push(
      this.#configurePaddleMovementInputHandler(),
      this.#configureKeyUpInputHandlers()
    );

    if (this.#canPlayBackgroundMusic()) {
      this.#playBackgroundMusic();
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.state = BreakoutGameState.MENU;
  }

  #canPlayBackgroundMusic() {
    return this.soundMode === "music-only" || this.soundMode === "sfx+music";
  }

  #canPlaySoundEffects() {
    return this.soundMode === "sfx+music" || this.soundMode === "sfx-only";
  }

  #playBackgroundMusic() {
    if (!this.resourceManager?.getAudioPlayer("background-music")?.isPlayedAtLeastOnce) {
      this.resourceManager?.getAudioPlayer("background-music")?.play({ loop: true });
    } else {
      this.resourceManager.getAudioPlayer("background-music")?.resume();
    }
  }

  #pauseBackgroundMusic() {
    this.resourceManager?.getAudioPlayer("background-music")?.pause();
  }

  #playSoundEffect(name: SoundEffectName) {
    if (this.#canPlaySoundEffects()) {
      this.resourceManager?.getAudioPlayer(name)?.play();
    }
  }

  setSoundMode(mode: SoundMode) {
    this.soundMode = mode;
    switch (this.soundMode) {
      case "music-only":
      case "sfx+music":
        this.#playBackgroundMusic();
        break;
      case "no-sound":
      case "sfx-only":
        this.#pauseBackgroundMusic();
        break;
      default:
        break;
    }
  }

  getRemainingLives() {
    return this.#lives;
  }

  #getInitialPaddlePosition(windowSize: BreakoutGameDimensions): vec2 {
    return vec2.fromValues(
      windowSize.x / 2 - Paddle.INITIAL_SIZE[0] / 2,
      windowSize.y - (Paddle.INITIAL_SIZE[1] + Paddle.Y_OFFSET)
    );
  }

  #ballPositionOnPaddleWhenStuck(
    paddlePosition: vec2,
    paddleWidth: number,
    ballRadius: number
  ): vec2 {
    return vec2.add(
      vec2.create(),
      paddlePosition,
      vec2.fromValues(paddleWidth / 2 - ballRadius, -ballRadius * 2.0)
    );
  }

  #movePaddleOnInput(direction: "left" | "right") {
    if (!this.windowSize) return;
    if (!this.#paddle) return;

    if (this.state !== BreakoutGameState.ACTIVE) return;
    const velocity = this.#paddle.velocity[0] * this.#renderTime.deltaTime;
    if (direction === "left") {
      if (this.#paddle.position[0] >= 0.0) {
        this.#paddle.position[0] -= velocity;
      }
    } else if (direction === "right") {
      if (this.#paddle.position[0] + this.#paddle.size[0] <= this.windowSize.x) {
        this.#paddle.position[0] += velocity;
      }
    }
  }

  #unstickBallOnInput() {
    if (!this.#ball || !this.#ball.stuck) return;
    this.#ball.stuck = false;
  }

  #configureKeyUpInputHandlers() {
    return on(window, "keyup", (event: KeyboardEvent) => {
      switch (event.key) {
        case " ":
          this.#unstickBallOnInput();
          break;
        default:
          break;
      }
    });
  }

  #configurePaddleMovementInputHandler() {
    return on(window, "keydown", (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight":
          this.#movePaddleOnInput(event.key === "ArrowLeft" ? "left" : "right");
          break;
        default:
          break;
      }
    });
  }

  getLevelNumbers() {
    const levelNumbers = Array(NUMBER_OF_LEVELS)
      .fill(0)
      .map((_, i) => i + 1);
    return levelNumbers;
  }

  getCurrentLevelNumber() {
    return this.#currentLevelNumber;
  }

  toMenu() {
    this.state = BreakoutGameState.MENU;
    this.#currentLevelNumber = null;
  }

  #getCurrentLevel() {
    return this.#currentLevelNumber ? this.#levels[this.#currentLevelNumber - 1] : null;
  }

  retryLevel() {
    if (!this.#paddle) return;
    if (!this.#ball) return;
    if (!this.windowSize) return;
    if (!this.#particleGenerator) return;

    this.#paddle.size = vec2.fromValues(Paddle.INITIAL_SIZE[0], Paddle.INITIAL_SIZE[1]);
    this.#paddle.position = this.#getInitialPaddlePosition(this.windowSize);
    this.#paddle.sticky = false;
    this.#ball.stuck = true;
    this.#paddle.colour = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    const ballPosition = this.#ballPositionOnPaddleWhenStuck(
      this.#paddle.position,
      this.#paddle.size[0],
      this.#ball.radius
    );
    this.#ball.reset(ballPosition);
    this.#clearModifiers();
    this.#particleGenerator.killAllParticles();
    this.#postProcessor?.resetEffects();
  }

  restartLevel() {
    const currentLevel = this.#getCurrentLevel();
    if (currentLevel) {
      this.#lives = NUMBER_OF_LIVES;
      this.retryLevel();
      currentLevel.reset();
      this.state = BreakoutGameState.ACTIVE;
    }
  }

  startLevel(levelNumber: number = 1) {
    this.#currentLevelNumber = levelNumber;
    this.restartLevel();
    this.state = BreakoutGameState.ACTIVE;
  }

  #getCurrentLevelBlocks() {
    return this.#getCurrentLevel()?.blocks;
  }

  #handleCollisionWithBlock(ball: Ball, block: Block, collision: AABBCollision) {
    if (!ball.passThrough || block.isSolid) {
      aabbAndCircleCollisionResponse(ball, collision);
    }
    if (block.isSolid) {
      this.#postProcessor?.activateEffect({ effectName: "shake", collisionWith: "solid-block" });
      this.#playSoundEffect("block-solid");
    } else {
      block.destroyed = true;
      this.#maybeSpawnModifier(vec2.fromValues(block.position[0], block.position[1]));
      if (!ball.passThrough) this.#playSoundEffect("block");
    }
  }

  /** Changes the ball's velocity based on where it hit the paddle */
  #ballAndPaddleCollisionResponse(ball: Ball, paddle: Paddle) {
    const paddleCenterX = paddle.position[0] + paddle.size[0] / 2;
    const distanceFromPaddleCenter = ball.position[0] + ball.radius - paddleCenterX;
    const percentage = distanceFromPaddleCenter / (paddle.size[0] / 2);

    const strength = 2.0;
    const oldVelocity = vec2.fromValues(ball.velocity[0], ball.velocity[1]);
    ball.velocity[0] = Ball.INITIAL_VELOCITY[0] * percentage * strength;

    vec2.normalize(ball.velocity, ball.velocity);
    vec2.scale(ball.velocity, ball.velocity, vec2.length(oldVelocity));

    ball.velocity[1] = -1.0 * Math.abs(ball.velocity[1]);
  }

  #handleCollisionWithPaddle(ball: Ball, paddle: Paddle) {
    this.#ballAndPaddleCollisionResponse(ball, paddle);
    this.#playSoundEffect("paddle");
    ball.stuck = paddle.sticky;
  }

  #checkAndHandleWallCollision(ball: Ball, windowSize: BreakoutGameDimensions): boolean {
    if (ball.position[0] <= 0) {
      ball.velocity[0] *= -1;
      ball.position[0] = 0;
      return true;
    } else if (ball.position[0] + ball.size[0] >= windowSize.x) {
      ball.velocity[0] *= -1;
      ball.position[0] = windowSize.x - ball.size[0];
      return true;
    }
    if (ball.position[1] <= 0) {
      ball.velocity[1] *= -1;
      ball.position[1] = 0;
      return true;
    }
    return false;
  }

  #checkAndHandleCollisions() {
    if (!this.#ball) return;
    if (!this.#paddle) return;
    if (!this.windowSize) return;

    if (!this.#ball.stuck) {
      const isCollisionWithWall = this.#checkAndHandleWallCollision(this.#ball, this.windowSize);
      if (isCollisionWithWall) {
        this.#postProcessor?.activateEffect({ effectName: "shake", collisionWith: "wall" });
      }

      const blocks = this.#getCurrentLevelBlocks();
      if (blocks) {
        for (const block of blocks) {
          if (block.destroyed) continue;
          const blockCollisionResult = checkCollisionAABBAndCircle(this.#ball, block);
          if (!blockCollisionResult.isColliding) continue;
          this.#handleCollisionWithBlock(this.#ball, block, blockCollisionResult);
        }

        const paddleCollisionResult = checkCollisionAABBAndCircle(this.#ball, this.#paddle);
        if (paddleCollisionResult.isColliding) {
          this.#handleCollisionWithPaddle(this.#ball, this.#paddle);
        }
      }
    }

    this.#checkAndHandleModifierCollisions();
  }

  #maybeSpawnModifier(position: vec2) {
    if (!this.resourceManager) return;
    const modifierToSpawn = Random.choice(modifierSpawnPossibilities, modifierSpawnWeights);

    if (!modifierToSpawn) return;

    // Chaos and confuse should not be active at the same time, so
    // a chaos modifier is not spawned when confuse is active and vice-versa
    if (
      (modifierToSpawn === "chaos" && this.#postProcessor?.effectIsActive("confuse")) ||
      (modifierToSpawn === "confuse" && this.#postProcessor?.effectIsActive("chaos"))
    ) {
      return;
    }

    const modifier = new BreakoutModifier({ name: modifierToSpawn });
    modifier.spawnModifierPill(
      position,
      BreakoutModifierPill.getDefaultSprite(modifierToSpawn, this.resourceManager)
    );

    this.#spawnedModifiers.push(modifier);
  }

  #checkAndHandleModifierCollisions() {
    if (!this.#paddle) return;
    for (const modifier of this.#spawnedModifiers) {
      if (!modifier.pill) continue;
      const modifierCollisionResult = checkCollisionAABBs(modifier.pill, this.#paddle);
      if (!modifierCollisionResult) continue;
      this.#activateModifier(modifier);
      modifier.destroyModifierPill();
      this.#playSoundEffect("modifier");
    }
  }

  #activateModifier(modifier: BreakoutModifier) {
    modifier.isActive = true;
    const duration = BreakoutModifier.getDefaultDuration(modifier.name);
    if (duration === null) {
      modifier.duration = null;
      switch (modifier.name) {
        case "ball-speed-increase":
          // Increase ball velocity
          if (!this.#ball) break;
          vec2.scale(this.#ball.velocity, this.#ball.velocity, 1.2);
          break;
        case "paddle-size-increase":
          if (!this.#paddle) break;
          // Increase paddle size
          this.#paddle.size[0] += 50.0;
          break;
        default:
          break;
      }

      return;
    }

    modifier.duration = duration;

    switch (modifier.name) {
      case "chaos":
      case "confuse":
        if (!this.#postProcessor) break;
        this.#postProcessor.activateEffect({
          effectName: modifier.name,
          durationInSeconds: duration
        });
        break;
      case "sticky-paddle":
        if (!this.#paddle) break;
        // Make paddle sticky
        this.#paddle.sticky = true;
        this.#paddle.colour = BreakoutModifierPill.getDefaultColour(modifier.name);
        break;
      case "pass-through":
        if (!this.#ball) break;
        this.#ball.passThrough = true;
        break;
      default:
        throw new Error(`Unknown modifier: ${modifier.name}`);
    }
  }

  #isOtherModifierActive(modifiers: BreakoutModifier[], name: BreakoutModifierName) {
    return modifiers.some((modifier) => modifier.name === name && modifier.isActive);
  }

  #updateSpawnedModifiers(dt: number) {
    if (!this.windowSize) return;

    for (const modifier of this.#spawnedModifiers) {
      if (modifier.pill) {
        modifier.pill.move(dt);
        if (modifier.pill.position[1] >= this.windowSize.y) {
          modifier.destroyModifierPill();
        }
        // Modifier will never be activated here, so it is safe to continue
        // on to the next modifier
        continue;
      }

      if (!(modifier.isActive && modifier.duration)) continue;

      // Update numeric duration for active modifiers
      modifier.duration -= dt;
      if (modifier.duration > Number.EPSILON) continue;

      // Deactivate modifier once duration is close enough to zero
      modifier.isActive = false;
      switch (modifier.name) {
        case "chaos":
        case "confuse":
          if (!this.#postProcessor) break;
          if (!this.#isOtherModifierActive(this.#spawnedModifiers, modifier.name)) {
            this.#postProcessor.resetEffect(modifier.name);
          }
          break;
        case "sticky-paddle":
          if (!this.#paddle) break;
          if (!this.#ball) break;
          if (!this.#isOtherModifierActive(this.#spawnedModifiers, modifier.name)) {
            this.#paddle.sticky = false;
            this.#ball.stuck = false;
            this.#paddle.colour = vec4.fromValues(1, 1, 1, 1);
          }
          break;
        case "pass-through":
          if (!this.#ball) break;
          if (!this.#isOtherModifierActive(this.#spawnedModifiers, modifier.name)) {
            this.#ball.passThrough = false;
          }
          break;
        default:
          throw new Error(`Unknown modifier: ${modifier.name}`);
      }
    }

    // Remove modifiers that have been spawned and destroyed (i.e. they went past the bottom of the screen),
    // but not activated or modifiers that have been collected (i.e. collided with the paddle) and have been
    // deactivated (i.e. activated past their duration)
    this.#spawnedModifiers = this.#spawnedModifiers.filter(
      (modifier) => modifier.pill || modifier.isActive
    );
  }

  #drawSpawnedModifiers(gl: WebGL2RenderingContext, spriteRenderer: SpriteRenderer) {
    if (!this.#spriteRenderer) return;

    for (const modifier of this.#spawnedModifiers) {
      modifier.drawModifierPill(gl, spriteRenderer);
    }
  }

  #clearModifiers() {
    this.#spawnedModifiers = [];
  }

  update(dt: number) {
    if (this.state !== BreakoutGameState.ACTIVE) return;
    if (!this.#ball) return;
    if (!this.#paddle) return;
    if (!this.windowSize) return;
    if (!this.#particleGenerator) return;

    if (this.#ball.stuck) {
      const ballPositionWhenStuck = this.#ballPositionOnPaddleWhenStuck(
        this.#paddle.position,
        this.#paddle.size[0],
        this.#ball.radius
      );
      this.#ball.move(dt, ballPositionWhenStuck);
    } else {
      this.#ball.move(dt);
    }

    this.#checkAndHandleCollisions();
    if (this.#getCurrentLevel()?.isCompleted()) {
      this.state = BreakoutGameState.WIN;
    }

    this.#updateSpawnedModifiers(dt);
    if (this.#ball.position[1] >= this.windowSize.y) {
      this.#lives -= 1;
      if (this.#lives === 0) {
        this.state = BreakoutGameState.LOSE;
      } else {
        this.retryLevel();
      }
    }

    this.#particleGenerator.update(
      dt,
      this.#ball,
      vec2.fromValues(this.#ball.radius / 2, this.#ball.radius / 2)
    );
    this.#postProcessor?.updateEffects(dt);
  }

  render(gl: WebGL2RenderingContext) {
    if (!this.windowSize) return;
    if (!this.resourceManager) return;
    if (!this.#spriteRenderer) return;
    const backgroundTexture = this.resourceManager.getTexture("background");
    if (!backgroundTexture) return;
    if (!this.#paddle) return;
    if (!this.#ball) return;
    if (!this.#particleGenerator) return;

    if (this.state === BreakoutGameState.MENU) {
      // Just draw the background while at the menu.
      this.#spriteRenderer.drawSprite(
        gl,
        backgroundTexture,
        vec2.fromValues(0, 0),
        vec2.fromValues(this.windowSize.x, this.windowSize.y),
        vec4.fromValues(1, 1, 1, 1),
        0
      );
    } else if (this.state === BreakoutGameState.ACTIVE) {
      this.#postProcessor?.beginRenderToScreenTexture(gl);

      this.#spriteRenderer.drawSprite(
        gl,
        backgroundTexture,
        vec2.fromValues(0, 0),
        vec2.fromValues(this.windowSize.x, this.windowSize.y),
        vec4.fromValues(1, 1, 1, 1),
        0
      );

      this.update(this.#renderTime.deltaTime);

      this.#getCurrentLevel()?.draw(gl, this.#spriteRenderer);
      if (!this.#ball.stuck) {
        this.#particleGenerator.drawParticles(
          gl,
          this.#isOtherModifierActive(this.#spawnedModifiers, "pass-through")
            ? BreakoutModifierPill.getDefaultColour("pass-through")
            : undefined
        );
      }
      this.#paddle.draw(gl, this.#spriteRenderer);
      this.#ball.draw(gl, this.#spriteRenderer);
      this.#drawSpawnedModifiers(gl, this.#spriteRenderer);

      this.#postProcessor?.endRenderToScreenTexture(gl);
      const timeInSeconds = this.#renderTime.previousTime / 1000;
      this.#postProcessor?.renderWithPostProcessing(gl, timeInSeconds);
    }

    this.#requestAnimationFrameId = requestAnimationFrame((time) => {
      updateRenderTime(this.#renderTime, time);
      this.fps = Math.round(1 / this.#renderTime.deltaTime);
      this.render(gl);
    });
  }

  pause() {
    if (this.state === BreakoutGameState.ACTIVE) {
      this.state = BreakoutGameState.PAUSED;
    }
  }

  resume() {
    if (this.state === BreakoutGameState.PAUSED) {
      this.state = BreakoutGameState.ACTIVE;
    }
  }

  clearResources(gl: WebGL2RenderingContext) {
    gl.disable(gl.BLEND);
    this.resourceManager?.clearResources(gl);
    this.#inputHandlerDisposers.forEach((dispose) => dispose());
    this.#inputHandlerDisposers = [];
    this.#clearModifiers();
    if (this.#requestAnimationFrameId !== null) {
      cancelAnimationFrame(this.#requestAnimationFrameId);
      this.#requestAnimationFrameId = null;
    }
  }
}
