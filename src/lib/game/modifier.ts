import { vec2, vec4 } from "gl-matrix";
import { BreakoutGameObject, type BreakoutGameObjectProperties } from "~/lib/game/game-object";

export const breakoutModifierNames = [
  "ball-speed-increase",
  "sticky-paddle",
  "pass-through",
  "paddle-size-increase",
  "confuse",
  "chaos"
] as const;

export type BreakoutModifierName = (typeof breakoutModifierNames)[number];

export type BreakoutModifierProperties = Omit<BreakoutGameObjectProperties, "size" | "colour"> & {
  name: BreakoutModifierName;
  colour?: vec4;
  duration?: BreakoutModifierDuration;
};

export type BreakoutModifierDuration = null | number;

/**
 * Changes an aspect (or aspects) of the game either visually
 * (e.g. through post-processing effects),
 * mechanically (e.g. by speeding up the ball),
 * or a combination of both.
 * */
export class BreakoutModifier extends BreakoutGameObject {
  static readonly SIZE = vec2.fromValues(60.0, 20.0);
  static readonly VELOCITY = vec2.fromValues(0.0, 150.0);

  name: BreakoutModifierName;
  duration: BreakoutModifierDuration;
  isActive: boolean = false;

  constructor(properties: BreakoutModifierProperties) {
    super({ ...properties, velocity: BreakoutModifier.VELOCITY, size: BreakoutModifier.SIZE });
    this.name = properties.name;
    this.colour = properties.colour ?? BreakoutModifier.getDefaultModifierColour(this.name);
    this.duration = properties.duration ?? BreakoutModifier.getDefaultModifierDuration(this.name);
  }

  move(dt: number) {
    vec2.scaleAndAdd(this.position, this.position, this.velocity, dt);
  }

  static getDefaultModifierColour(name: BreakoutModifierName) {
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

  static getDefaultModifierDuration(name: BreakoutModifierName): BreakoutModifierDuration {
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
}

export const modifierSpawnPossibilities = [...breakoutModifierNames, null] as const;
export const modifierSpawnWeights = modifierSpawnPossibilities.map((name) => {
  switch (name) {
    case "ball-speed-increase":
    case "sticky-paddle":
    case "pass-through":
    case "paddle-size-increase":
      return 1; // least likely
    case "confuse":
    case "chaos":
      return 3; // more likely
    case null:
      return 0; // most likely
    default:
      throw new Error(`Unknown modifier name: ${name}`);
  }
});
