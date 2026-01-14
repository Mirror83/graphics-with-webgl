import { vec2, vec4 } from "gl-matrix";
import type { SpriteRenderer } from "~/lib/game/sprite";
import type { Texture2D } from "~/lib/textures";

type BreakoutGameObjectProperties = {
  position: vec2;
  size: vec2;
  sprite: Texture2D;
  velocity?: vec2;
  colour?: vec4;
  rotationAngle?: number;
  isSolid?: boolean;
  destroyed?: boolean;
};

class BreakoutGameObject {
  position: vec2;
  size: vec2;
  velocity: vec2;
  sprite: Texture2D;
  colour: vec4;
  rotationAngle: number;
  isSolid: boolean;
  destroyed: boolean;

  constructor(properties: BreakoutGameObjectProperties) {
    this.position = properties.position;
    this.size = properties.size;
    this.sprite = properties.sprite;
    this.colour = properties.colour ?? vec4.fromValues(1, 1, 1, 1);
    this.velocity = properties.velocity ?? vec2.fromValues(0, 0);
    this.rotationAngle = properties.rotationAngle ?? 0;
    this.isSolid = properties.isSolid ?? false;
    this.destroyed = properties.destroyed ?? false;
  }

  draw(gl: WebGL2RenderingContext, renderer: SpriteRenderer) {
    renderer.drawSprite(gl, this.sprite, this.position, this.size, this.colour, this.rotationAngle);
  }
}

export class Block extends BreakoutGameObject {}
