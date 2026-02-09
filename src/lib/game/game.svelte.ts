import { mat4, vec2, vec4 } from "gl-matrix";
import { on } from "svelte/events";
import {
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
  modifierSpawnWeights
} from "~/lib/game/modifier";
import { ParticleGenerator } from "~/lib/game/particle";
import { BreakoutPostProcessor } from "~/lib/game/post-processor";
import { Random } from "~/lib/game/random";
import { modifierTextureNames, ResourceManager } from "~/lib/game/resource-manager";
import { SpriteRenderer } from "~/lib/game/sprite";
import { updateRenderTime, type RenderTime } from "~/lib/render";

export enum BreakoutGameState {
  ACTIVE,
  PAUSED,
  MENU,
  WIN,
  NOT_INITIALIZED
}

export type BreakoutGameDimensions = {
  x: number;
  y: number;
};

const NUMBER_OF_LEVELS = 4;

export class BreakoutGame {
  state: BreakoutGameState = $state(BreakoutGameState.NOT_INITIALIZED);
  fps: number = $state(0);
  windowSize: BreakoutGameDimensions | null = null;
  resourceManager: ResourceManager | null = null;
  #spriteRenderer: SpriteRenderer | null = null;
  #levels: BreakoutGameLevel[] = [];
  #currentLevelIndex: number = 0;
  #paddle: Paddle | null = null;
  #ball: Ball | null = null;
  #renderTime: RenderTime = { deltaTime: 0, previousTime: 0 };
  #inputHandlerDisposers: Array<() => void> = [];
  #requestAnimationFrameId: number | null = null;
  #particleGenerator: ParticleGenerator | null = null;
  #postProcessor: BreakoutPostProcessor | null = null;
  #spawnedModifiers: BreakoutModifier[] = [];

  setWindowSize(size: BreakoutGameDimensions) {
    this.windowSize = size;
  }

  /**Initialize game state (load all shaders/textures/levels) */
  async init(
    gl: WebGL2RenderingContext,
    resourceManager: ResourceManager,
    windowSize: BreakoutGameDimensions
  ) {
    this.windowSize = windowSize;
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
      )
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
    this.#currentLevelIndex = 0;

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

    this.#inputHandlerDisposers.push(this.#configurePaddleMovementInputHandler());

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.state = BreakoutGameState.ACTIVE;
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

  #configurePaddleMovementInputHandler() {
    return on(window, "keydown", (event: KeyboardEvent) => {
      if (!this.#paddle) return;
      if (!this.windowSize) return;
      if (this.state !== BreakoutGameState.ACTIVE) return;

      const velocity = this.#paddle.velocity[0] * this.#renderTime.deltaTime;
      if (event.key === "ArrowLeft") {
        if (this.#paddle.position[0] >= 0.0) {
          this.#paddle.position[0] -= velocity;
        }
      } else if (event.key === "ArrowRight") {
        if (this.#paddle.position[0] + this.#paddle.size[0] <= this.windowSize.x) {
          this.#paddle.position[0] += velocity;
        }
      } else if (event.key === " ") {
        if (!this.#ball) return;
        this.#ball.stuck = false;
      }
    });
  }

  #getCurrentLevel() {
    return this.#levels[this.#currentLevelIndex];
  }

  resetCurrentLevel() {
    if (!this.#paddle) return;
    if (!this.#ball) return;
    if (!this.windowSize) return;
    if (!this.#particleGenerator) return;

    const currentLevel = this.#getCurrentLevel();
    this.#paddle.position = this.#getInitialPaddlePosition(this.windowSize);
    this.#ball.stuck = true;
    const ballPosition = this.#ballPositionOnPaddleWhenStuck(
      this.#paddle.position,
      this.#paddle.size[0],
      this.#ball.radius
    );
    this.#ball.reset(ballPosition);
    this.#clearModifiers();
    this.#particleGenerator.killAllParticles();
    this.#postProcessor?.resetEffects();
    currentLevel.reset();
  }

  #getCurrentLevelBlocks() {
    return this.#getCurrentLevel().blocks;
  }

  #handleCollisionWithBlock(ball: Ball, block: Block, collision: AABBCollision) {
    if (!block.isSolid) {
      block.destroyed = true;
    }
    const direction = collision.direction;
    if (direction === "LEFT" || direction === "RIGHT") {
      ball.velocity[0] = -ball.velocity[0];
      const penetration = ball.radius - Math.abs(collision.difference[0]);
      if (direction === "LEFT") {
        ball.position[0] += penetration;
      } else {
        ball.position[0] -= penetration;
      }
    } else {
      ball.velocity[1] = -ball.velocity[1];
      const penetration = ball.radius - Math.abs(collision.difference[1]);
      if (direction === "UP") {
        ball.position[1] -= penetration;
      } else {
        ball.position[1] += penetration;
      }
    }
  }

  #handleCollisionWithPaddle(ball: Ball, paddle: Paddle, collision: AABBCollision) {
    const direction = collision.direction;
    if (direction === "LEFT" || direction === "RIGHT") {
      ball.velocity[0] = -ball.velocity[0];
      const penetration = ball.radius - Math.abs(collision.difference[0]);
      if (direction === "LEFT") {
        ball.position[0] += penetration;
      } else {
        ball.position[0] -= penetration;
      }
    } else {
      ball.velocity[1] = -ball.velocity[1];
      const penetration = ball.radius - Math.abs(collision.difference[1]);
      if (direction === "UP") {
        ball.position[1] -= penetration;
      } else {
        ball.position[1] += penetration;
      }
    }
    const paddleCenterX = paddle.position[0] + paddle.size[0] / 2;
    const distanceFromPaddleCenter = ball.position[0] + ball.radius - paddleCenterX;
    const percentage = distanceFromPaddleCenter / (paddle.size[0] / 2);
    const strength = 2.0;
    const oldSpeed = vec2.length(ball.velocity);
    ball.velocity[0] = Paddle.INITIAL_VELOCITY[0] * percentage * strength;
    ball.velocity[1] = -1.0 * Math.abs(ball.velocity[1]);
    vec2.normalize(ball.velocity, ball.velocity);
    vec2.scale(ball.velocity, ball.velocity, oldSpeed);
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
    if (this.#ball.stuck) return;
    if (!this.#paddle) return;
    if (!this.windowSize) return;

    const isCollisionWithWall = this.#checkAndHandleWallCollision(this.#ball, this.windowSize);
    if (isCollisionWithWall) {
      this.#postProcessor?.activateEffect({ effectName: "shake", collisionWith: "wall" });
    }

    for (const block of this.#getCurrentLevelBlocks()) {
      if (block.destroyed) continue;
      const blockCollisionResult = checkCollisionAABBAndCircle(this.#ball, block);
      if (!blockCollisionResult.isColliding) continue;
      if (block.isSolid) {
        this.#postProcessor?.activateEffect({ effectName: "shake", collisionWith: "wall" });
      } else {
        this.#maybeSpawnModifier(vec2.fromValues(block.position[0], block.position[1]));
      }
      this.#handleCollisionWithBlock(this.#ball, block, blockCollisionResult);
    }

    const paddleCollisionResult = checkCollisionAABBAndCircle(this.#ball, this.#paddle);
    if (paddleCollisionResult.isColliding) {
      this.#handleCollisionWithPaddle(this.#ball, this.#paddle, paddleCollisionResult);
    }

    this.#checkAndHandleModifierCollisions();
  }

  #maybeSpawnModifier(position: vec2) {
    if (!this.resourceManager) return;
    const modifierToSpawn = Random.choice(modifierSpawnPossibilities, modifierSpawnWeights);
    if (!modifierToSpawn) return;
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
    }
  }

  #activateModifier(modifier: BreakoutModifier) {
    modifier.isActive = true;
    switch (modifier.name) {
      case "chaos":
        if (!this.#postProcessor) break;
        this.#postProcessor.effects.chaos.isActive = true;
        this.#postProcessor.effects.chaos.durationInSeconds =
          BreakoutModifier.getDefaultDuration(modifier.name) ?? 0;
        this.#postProcessor.activateEffect({ effectName: "chaos" });
        break;
      default:
        console.debug("pseudo-activate modifier:", modifier.name);
        break;
    }
  }

  #updateSpawnedModifiers(dt: number) {
    if (!this.windowSize) return;

    for (const modifier of this.#spawnedModifiers) {
      if (modifier.pill) {
        modifier.pill.move(dt);
        if (modifier.pill.position[1] >= this.windowSize.y) {
          modifier.destroyModifierPill();
        }
      }
      if (modifier.isActive && modifier.duration) {
        if (!this.#postProcessor) break;
        modifier.duration -= dt;
        switch (modifier.name) {
          case "chaos":
            this.#postProcessor.effects[modifier.name].durationInSeconds = modifier.duration;
            break;
          default:
            break;
        }
        if (modifier.duration <= Number.EPSILON) {
          modifier.isActive = false;
          switch (modifier.name) {
            case "chaos":
              if (!this.#postProcessor) break;
              this.#postProcessor.effects.chaos.isActive = false;
              this.#postProcessor.effects.chaos.durationInSeconds = 0;
              break;
            default:
              console.debug("pseudo-deactivate modifier:", modifier.name);
              break;
          }
        } else {
        }
      }
    }
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
      this.#checkAndHandleCollisions();
      this.#updateSpawnedModifiers(dt);
      if (this.#ball.position[1] >= this.windowSize.y) {
        this.resetCurrentLevel();
      }
      this.#particleGenerator.update(
        dt,
        this.#ball,
        vec2.fromValues(this.#ball.radius / 2, this.#ball.radius / 2)
      );
      this.#postProcessor?.updateEffects(dt);
    }
  }

  render(gl: WebGL2RenderingContext) {
    if (!this.windowSize) return;
    if (!this.resourceManager) return;
    if (!this.#spriteRenderer) return;
    const backgroundTexture = this.resourceManager.getTexture("background");
    if (!backgroundTexture) return;
    if (!this.#paddle) return;
    if (!this.#ball) return;
    if (this.state !== BreakoutGameState.ACTIVE) return;
    if (!this.#particleGenerator) return;

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

    this.#getCurrentLevel().draw(gl, this.#spriteRenderer);
    this.#paddle.draw(gl, this.#spriteRenderer);
    this.#ball.draw(gl, this.#spriteRenderer);
    this.#drawSpawnedModifiers(gl, this.#spriteRenderer);
    this.#particleGenerator.drawParticles(gl);

    this.#postProcessor?.endRenderToScreenTexture(gl);
    const timeInSeconds = this.#renderTime.previousTime / 1000;
    this.#postProcessor?.renderWithPostProcessing(gl, timeInSeconds);

    this.#requestAnimationFrameId = requestAnimationFrame((time) => {
      updateRenderTime(this.#renderTime, time);
      this.fps = Math.round(1 / this.#renderTime.deltaTime);
      this.render(gl);
    });
  }

  pause() {
    if (this.#requestAnimationFrameId !== null) {
      cancelAnimationFrame(this.#requestAnimationFrameId);
      this.#requestAnimationFrameId = null;
      this.state = BreakoutGameState.PAUSED;
    }
  }

  resume(gl: WebGL2RenderingContext) {
    if (this.state === BreakoutGameState.PAUSED) {
      this.state = BreakoutGameState.ACTIVE;
      this.render(gl);
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
