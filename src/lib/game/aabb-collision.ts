import { vec2 } from "gl-matrix";
import { vectorDirection, type Direction } from "~/lib/game/direction";

export type NoCollision = {
  isColliding: false;
};

export type AABBCollision = {
  isColliding: true;
  direction: Direction;
  difference: vec2;
};

export type AABBCollisionCheckResult = AABBCollision | NoCollision;

export type AABB = {
  position: vec2;
  size: vec2;
};

export type Circle = {
  position: vec2;
  radius: number;
};

/** @tutorial https://learnopengl.com/In-Practice/2D-Game/Collisions/Collision-detection */
export function checkCollisionAABBAndCircle(circle: Circle, box: AABB): AABBCollisionCheckResult {
  const ballCenter = vec2.fromValues(
    circle.position[0] + circle.radius,
    circle.position[1] + circle.radius
  );
  const boxHalfExtents = vec2.fromValues(box.size[0] / 2, box.size[1] / 2);
  const boxCenter = vec2.fromValues(
    box.position[0] + boxHalfExtents[0],
    box.position[1] + boxHalfExtents[1]
  );
  let difference = vec2.subtract(vec2.create(), ballCenter, boxCenter);
  const clamped = vec2.fromValues(
    Math.max(-boxHalfExtents[0], Math.min(difference[0], boxHalfExtents[0])),
    Math.max(-boxHalfExtents[1], Math.min(difference[1], boxHalfExtents[1]))
  );
  const closest = vec2.add(vec2.create(), boxCenter, clamped);
  difference = vec2.subtract(vec2.create(), closest, ballCenter);
  const isColliding = vec2.length(difference) < circle.radius;
  if (!isColliding) {
    return { isColliding: false };
  }
  const direction = vectorDirection(difference);
  return { isColliding, direction, difference };
}

/** @tutorial https://learnopengl.com/In-Practice/2D-Game/Collisions/Collision-detection */
export function checkCollisionAABBs(box1: AABB, box2: AABB): boolean {
  const collisionX =
    box1.position[0] + box1.size[0] >= box2.position[0] &&
    box2.position[0] + box2.size[0] >= box1.position[0];
  const collisionY =
    box1.position[1] + box1.size[1] >= box2.position[1] &&
    box2.position[1] + box2.size[1] >= box1.position[1];
  return collisionX && collisionY;
}
