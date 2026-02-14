import { vec2, vec4 } from "gl-matrix";
import { BreakoutGameObject, type BreakoutGameObjectProperties } from "~/lib/game/game-object";
import type { ResourceManager } from "~/lib/game/resource-manager";
import type { SpriteRenderer } from "~/lib/game/sprite";
import type { Texture2D } from "~/lib/textures";

export const breakoutModifierNames = [
  "ball-speed-increase",
  "sticky-paddle",
  "pass-through",
  "paddle-size-increase",
  "confuse",
  "chaos"
] as const;

export type BreakoutModifierName = (typeof breakoutModifierNames)[number];

export type BreakoutModifierProperties = {
  name: BreakoutModifierName;
  duration?: BreakoutModifierDuration;
};

export type BreakoutModifierDuration = null | number;

export const modifierSpawnPossibilities = [...breakoutModifierNames, null] as const;
export const modifierSpawnWeights = modifierSpawnPossibilities.map((name) => {
  switch (name) {
    case "ball-speed-increase":
      return 0;
    case "sticky-paddle":
      return 1;
    case "pass-through":
      return 0;
    case "paddle-size-increase":
      return 0;
    case "confuse":
      return 0;
    case "chaos":
      return 0;
    case null:
      return 0;
    default:
      throw new Error(`Unknown modifier name: ${name}`);
  }
});

type BreakoutModifierPillProperties = Omit<BreakoutGameObjectProperties, "size"> & {
  modifierName: BreakoutModifierName;
  size?: number;
};

/**
 * This represents what the paddle "physically" interacts with in-game in order to activate
 * a modifier effect.
 */
export class BreakoutModifierPill extends BreakoutGameObject {
  static readonly SIZE = vec2.fromValues(60.0, 20.0);
  static readonly VELOCITY = vec2.fromValues(0.0, 150.0);

  static getDefaultColour(name: BreakoutModifierName) {
    switch (name) {
      case "confuse":
        return vec4.fromValues(1.0, 0.3, 0.3, 1.0);
      case "chaos":
        return vec4.fromValues(0.9, 0.25, 0.25, 1.0);
      case "paddle-size-increase":
        return vec4.fromValues(1.0, 0.6, 0.4, 1.0);
      case "pass-through":
        return vec4.fromValues(0.5, 1.0, 0.5, 1.0);
      case "sticky-paddle":
        return vec4.fromValues(1.0, 0.5, 1.0, 1.0);
      case "ball-speed-increase":
        return vec4.fromValues(0.5, 0.5, 1.0, 1.0);
      default:
        throw new Error(`Unknown modifier name: ${name}`);
    }
  }

  static getDefaultSprite(modifierName: BreakoutModifierName, resourceManager: ResourceManager) {
    const textureName = `modifier-${modifierName}` as const;
    const texture = resourceManager.getTexture(textureName);
    if (!texture) {
      throw new Error(
        `Texture with name: '${textureName}' not found for modifier: '${modifierName}'`
      );
    }
    return texture;
  }

  constructor(properties: BreakoutModifierPillProperties) {
    super({
      ...properties,
      velocity: BreakoutModifierPill.VELOCITY,
      size: BreakoutModifierPill.SIZE,
      colour: properties.colour ?? BreakoutModifierPill.getDefaultColour(properties.modifierName)
    });
  }

  move(dt: number) {
    vec2.scaleAndAdd(this.position, this.position, this.velocity, dt);
  }
}

/**
 * Changes an aspect (or aspects) of the game either visually
 * (e.g. through post-processing effects),
 * mechanically (e.g. by speeding up the ball),
 * or a combination of both.
 * */
export class BreakoutModifier {
  name: BreakoutModifierName;
  duration: BreakoutModifierDuration;
  isActive: boolean = false;
  pill: BreakoutModifierPill | null = null;

  static getDefaultDuration(name: BreakoutModifierName): BreakoutModifierDuration {
    switch (name) {
      case "confuse":
        return 15.0;
      case "chaos":
        return 15.0;
      case "paddle-size-increase":
        return null;
      case "pass-through":
        return 10.0;
      case "sticky-paddle":
        return 20.0;
      case "ball-speed-increase":
        return null;
      default:
        throw new Error(`Unknown modifier name: ${name}`);
    }
  }

  constructor(properties: BreakoutModifierProperties) {
    this.name = properties.name;
    this.duration = properties.duration ?? BreakoutModifier.getDefaultDuration(this.name);
  }

  spawnModifierPill(position: vec2, sprite: Texture2D) {
    this.pill = new BreakoutModifierPill({
      modifierName: this.name,
      position,
      sprite
    });
  }

  destroyModifierPill() {
    this.pill = null;
  }

  drawModifierPill(gl: WebGL2RenderingContext, spriteRenderer: SpriteRenderer) {
    if (!this.pill) return;
    this.pill.draw(gl, spriteRenderer);
  }
}
