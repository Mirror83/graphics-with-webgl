import { mat4, vec2, vec4 } from "gl-matrix";
import { ResourceManager } from "~/lib/game/resource-manager";
import { SpriteRenderer } from "~/lib/game/sprite";

export enum BreakoutGameState {
  ACTIVE,
  MENU,
  WIN,
  NOT_INITIALIZED
}

export type BreakoutGameDimensions = {
  x: number;
  y: number;
};

export class BreakoutGame {
  state: BreakoutGameState = $state(BreakoutGameState.NOT_INITIALIZED);
  windowSize: BreakoutGameDimensions | null = null;
  resourceManager: ResourceManager | null = null;
  #spriteRenderer: SpriteRenderer | null = null;

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
    this.resourceManager = resourceManager;
    await this.resourceManager.loadShader(gl, "sprite", {
      vertex: "shaders/sprite.vert",
      fragment: "shaders/sprite.frag"
    });
    await this.resourceManager.loadTexture(gl, "ball", "textures/ball.png");
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

    this.state = BreakoutGameState.ACTIVE;
  }

  update(dt: number) {}

  render(gl: WebGL2RenderingContext) {
    if (!this.resourceManager) return;
    if (!this.#spriteRenderer) return;
    const ballTexture = this.resourceManager.getTexture("ball");
    if (!ballTexture) return;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.#spriteRenderer.drawSprite(
      gl,
      ballTexture,
      vec2.fromValues(200, 200),
      vec2.fromValues(300, 400),
      vec4.fromValues(0.0, 1.0, 0.0, 1),
      45.0
    );
  }

  clearResources(gl: WebGL2RenderingContext) {
    this.resourceManager?.clearResources(gl);
  }
}
