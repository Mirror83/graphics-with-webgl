import { mat4, vec2, vec4 } from "gl-matrix";
import { on } from "svelte/events";
import { vectorDirection, type Direction } from "~/lib/game/direction";
import { Ball, Block, Paddle } from "~/lib/game/game-object";
import { BreakoutGameLevel } from "~/lib/game/level";
import { ResourceManager } from "~/lib/game/resource-manager";
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

type NoCollision = {
  isColliding: false;
};

type Collision = {
  isColliding: true;
  direction: Direction;
  difference: vec2;
};

type CollisionResult = NoCollision | Collision;

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
      this.resourceManager.loadTexture(gl, "block_solid", "textures/block_solid.png"),
      this.resourceManager.loadTexture(gl, "block", "textures/block.png"),
      this.resourceManager.loadTexture(gl, "background", "textures/background.jpg"),
      this.resourceManager.loadTexture(gl, "paddle", "textures/paddle.png")
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
      .setUniform(gl, "projection", { type: "mat4-float", value: projection });

    const renderer = new SpriteRenderer(spriteShader);
    renderer.init(gl);
    this.#spriteRenderer = renderer;
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

  /** @tutorial https://learnopengl.com/In-Practice/2D-Game/Collisions/Collision-detection */
  #checkCollisionAABBAndCircle(ball: Ball, obstacle: Block | Paddle): CollisionResult {
    const ballCenter = vec2.fromValues(
      ball.position[0] + ball.radius,
      ball.position[1] + ball.radius
    );
    const obstacleHalfExtents = vec2.fromValues(obstacle.size[0] / 2, obstacle.size[1] / 2);
    const obstacleCenter = vec2.fromValues(
      obstacle.position[0] + obstacleHalfExtents[0],
      obstacle.position[1] + obstacleHalfExtents[1]
    );
    let difference = vec2.subtract(vec2.create(), ballCenter, obstacleCenter);
    const clamped = vec2.fromValues(
      Math.max(-obstacleHalfExtents[0], Math.min(difference[0], obstacleHalfExtents[0])),
      Math.max(-obstacleHalfExtents[1], Math.min(difference[1], obstacleHalfExtents[1]))
    );
    const closest = vec2.add(vec2.create(), obstacleCenter, clamped);
    difference = vec2.subtract(vec2.create(), closest, ballCenter);
    const isColliding = vec2.length(difference) < ball.radius;
    if (!isColliding) {
      return { isColliding };
    }
    const direction = vectorDirection(difference);
    return { isColliding, direction, difference };
  }

  #getCurrentLevel() {
    return this.#levels[this.#currentLevelIndex];
  }

  resetCurrentLevel() {
    if (!this.#paddle) return;
    if (!this.#ball) return;
    if (!this.windowSize) return;
    const currentLevel = this.#getCurrentLevel();
    this.#paddle.position = this.#getInitialPaddlePosition(this.windowSize);
    this.#ball.stuck = true;
    const ballPosition = this.#ballPositionOnPaddleWhenStuck(
      this.#paddle.position,
      this.#paddle.size[0],
      this.#ball.radius
    );
    this.#ball.reset(ballPosition);
    currentLevel.reset();
  }

  #getCurrentLevelBlocks() {
    return this.#getCurrentLevel().blocks;
  }

  #handleCollisionWithBlock(ball: Ball, block: Block, collision: Collision) {
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

  #handleCollisionWithPaddle(ball: Ball, paddle: Paddle, collision: Collision) {
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

  #checkAndHandleCollisions() {
    if (!this.#ball) return;
    if (this.#ball.stuck) return;
    if (!this.#paddle) return;

    for (const block of this.#getCurrentLevelBlocks()) {
      if (block.destroyed) continue;
      const blockCollisionResult = this.#checkCollisionAABBAndCircle(this.#ball, block);
      if (!blockCollisionResult.isColliding) continue;
      this.#handleCollisionWithBlock(this.#ball, block, blockCollisionResult);
    }

    const paddleCollisionResult = this.#checkCollisionAABBAndCircle(this.#ball, this.#paddle);
    if (!paddleCollisionResult.isColliding) return;
    this.#handleCollisionWithPaddle(this.#ball, this.#paddle, paddleCollisionResult);
  }

  update(dt: number) {
    if (this.state !== BreakoutGameState.ACTIVE) return;
    if (!this.#ball) return;
    if (!this.#paddle) return;
    if (!this.windowSize) return;

    if (this.#ball.stuck) {
      const ballPosition = this.#ballPositionOnPaddleWhenStuck(
        this.#paddle.position,
        this.#paddle.size[0],
        this.#ball.radius
      );
      this.#ball.move(dt, this.windowSize.x, ballPosition);
    } else {
      this.#ball.move(dt, this.windowSize.x);
      this.#checkAndHandleCollisions();
      if (this.#ball.position[1] >= this.windowSize.y) {
        this.resetCurrentLevel();
      }
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

    this.#spriteRenderer.drawSprite(
      gl,
      backgroundTexture,
      vec2.fromValues(0, 0),
      vec2.fromValues(this.windowSize.x, this.windowSize.y),
      vec4.fromValues(1, 1, 1, 1),
      0
    );

    this.update(this.#renderTime.deltaTime);

    this.#levels[this.#currentLevelIndex].draw(gl, this.#spriteRenderer);
    this.#paddle.draw(gl, this.#spriteRenderer);
    this.#ball.draw(gl, this.#spriteRenderer);

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
    if (this.#requestAnimationFrameId !== null) {
      cancelAnimationFrame(this.#requestAnimationFrameId);
      this.#requestAnimationFrameId = null;
    }
  }
}
