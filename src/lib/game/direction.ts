import { vec2 } from "gl-matrix";

const directions = ["UP", "RIGHT", "DOWN", "LEFT"] as const;
export type Direction = (typeof directions)[number];

const compass: vec2[] = [
  vec2.fromValues(0, 1), // UP
  vec2.fromValues(1, 0), // RIGHT
  vec2.fromValues(0, -1), // DOWN
  vec2.fromValues(-1, 0) // LEFT
];

export function vectorDirection(target: vec2): Direction {
  let max = -Infinity;
  let bestMatch;
  for (let i = 0; i < compass.length; i++) {
    const dotProduct = vec2.dot(vec2.normalize(vec2.create(), target), compass[i]);
    if (dotProduct > max) {
      max = dotProduct;
      bestMatch = i;
    }
  }
  return directions[bestMatch!];
}
