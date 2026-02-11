import { vec2, vec4 } from "gl-matrix";
import type { SpriteRenderer } from "~/lib/game/sprite";
import type { Texture2D } from "~/lib/textures";

export type BreakoutGameObjectProperties = {
  position: vec2;
  size: vec2;
  sprite: Texture2D;
  velocity?: vec2;
  colour?: vec4;
  rotationAngle?: number;
};

export class BreakoutGameObject {
  position: vec2;
  size: vec2;
  velocity: vec2;
  sprite: Texture2D;
  colour: vec4;
  rotationAngle: number;

  constructor(properties: BreakoutGameObjectProperties) {
    this.position = properties.position;
    this.size = properties.size;
    this.sprite = properties.sprite;
    this.colour = properties.colour ?? vec4.fromValues(1, 1, 1, 1);
    this.velocity = properties.velocity ?? vec2.fromValues(0, 0);
    this.rotationAngle = properties.rotationAngle ?? 0;
  }

  draw(gl: WebGL2RenderingContext, renderer: SpriteRenderer) {
    renderer.drawSprite(gl, this.sprite, this.position, this.size, this.colour, this.rotationAngle);
  }
}

export type BlockProperties = BreakoutGameObjectProperties & {
  isSolid: boolean;
  destroyed: boolean;
};

export class Block extends BreakoutGameObject {
  destroyed: boolean;
  isSolid: boolean;

  constructor(properties: BlockProperties) {
    super({ ...properties });
    this.destroyed = properties.destroyed;
    this.isSolid = properties.isSolid;
  }
}

type PaddleProperties = Omit<BreakoutGameObjectProperties, "size" | "velocity"> & {
  size?: vec2;
  velocity?: vec2;
};

export class Paddle extends BreakoutGameObject {
  static readonly INITIAL_SIZE = vec2.fromValues(100, 20);
  static readonly INITIAL_VELOCITY = vec2.fromValues(800, 0);
  static readonly Y_OFFSET = 10;

  constructor(properties: PaddleProperties) {
    super({
      ...properties,
      size: properties.size ?? vec2.fromValues(Paddle.INITIAL_SIZE[0], Paddle.INITIAL_SIZE[1]),
      velocity:
        properties.velocity ??
        vec2.fromValues(Paddle.INITIAL_VELOCITY[0], Paddle.INITIAL_VELOCITY[1])
    });
  }

  reset(position: vec2) {
    this.position = position;
  }
}

type BallProperties = Omit<BreakoutGameObjectProperties, "size"> & {
  radius?: number;
};

export class Ball extends BreakoutGameObject {
  static readonly INITIAL_VELOCITY = vec2.fromValues(100, -350);
  static readonly INITIAL_RADIUS = 12.5;
  static readonly INITIAL_SIZE = vec2.fromValues(Ball.INITIAL_RADIUS * 2, Ball.INITIAL_RADIUS * 2);
  radius: number;
  stuck: boolean = true;

  constructor(properties: BallProperties) {
    super({
      ...properties,
      velocity:
        properties.velocity ?? vec2.fromValues(Ball.INITIAL_VELOCITY[0], Ball.INITIAL_VELOCITY[1]),
      size: vec2.fromValues(Ball.INITIAL_RADIUS * 2, Ball.INITIAL_RADIUS * 2)
    });
    this.radius = properties.radius ?? Ball.INITIAL_RADIUS;
  }

  move(deltaTime: number, newPositionWhenStuck?: vec2) {
    if (this.stuck) {
      this.position = newPositionWhenStuck ? newPositionWhenStuck : this.position;
    } else {
      this.position = vec2.scaleAndAdd(this.position, this.position, this.velocity, deltaTime);
    }
  }

  reset(
    position: vec2,
    velocity: vec2 = vec2.fromValues(Ball.INITIAL_VELOCITY[0], Ball.INITIAL_VELOCITY[1])
  ) {
    this.position = position;
    this.velocity = velocity;
  }
}
