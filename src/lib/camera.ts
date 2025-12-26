import { glMatrix, mat4, vec2, vec3 } from "gl-matrix";

enum CameraMovement {
  Forward,
  Backward,
  Left,
  Right
}

const YAW = -90.0;
const PITCH = 0.0;
const SPEED = 2.5;
const SENSITIVITY = 0.1;
const ZOOM = 45.0;

type EulerAngles = {
  yaw: number;
  pitch: number;
};

type CameraControlOptions = {
  movementSpeed: number;
  mouseSensitivity: number;
  zoom: number;
};

class Camera {
  position: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
  front: vec3 = vec3.fromValues(0.0, 0.0, -1.0);
  up: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
  right: vec3;
  worldUp: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
  eulerAngles: EulerAngles = {
    yaw: YAW,
    pitch: PITCH
  };

  controlOptions: CameraControlOptions = {
    movementSpeed: SPEED,
    mouseSensitivity: SENSITIVITY,
    zoom: ZOOM
  };

  constructor(
    position: vec3 = this.position,
    up: vec3 = this.up,
    eulerAngles?: Partial<EulerAngles>
  ) {
    this.position = position;
    if (eulerAngles) {
      this.eulerAngles = {
        yaw: eulerAngles.yaw ?? YAW,
        pitch: eulerAngles.pitch ?? PITCH
      };
    }
    const updatedVectors = this.#calculateFrontRightAndUpVectors(this.eulerAngles, this.worldUp);
    this.up = updatedVectors.up;
    this.front = updatedVectors.front;
    this.right = updatedVectors.right;
  }

  getViewMatrix() {
    return mat4.lookAt(
      mat4.create(),
      this.position,
      vec3.add(vec3.create(), this.position, this.front),
      this.up
    );
  }

  processKeyboardInput(direction: CameraMovement, deltaTime: number) {
    const velocity = this.controlOptions.movementSpeed * deltaTime;
    switch (direction) {
      case CameraMovement.Forward:
        vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.front, velocity));
        break;
      case CameraMovement.Backward:
        vec3.sub(this.position, this.position, vec3.scale(vec3.create(), this.front, velocity));
      case CameraMovement.Left:
        vec3.sub(this.position, this.position, vec3.scale(vec3.create(), this.right, velocity));
      case CameraMovement.Right:
        vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.right, velocity));
        break;
    }
  }

  processMouseMovement(offset: { x: number; y: number }, constrainPitch: boolean = true) {
    const xOffset = offset.x * this.controlOptions.mouseSensitivity;
    const yOffset = offset.y * this.controlOptions.mouseSensitivity;
    this.eulerAngles.yaw += xOffset;
    this.eulerAngles.pitch += yOffset;

    if (constrainPitch) {
      if (this.eulerAngles.pitch > 89.0) {
        this.eulerAngles.pitch = 89.0;
      } else if (this.eulerAngles.pitch < -89.0) {
        this.eulerAngles.pitch = -89.0;
      }
    }

    const updatedVectors = this.#calculateFrontRightAndUpVectors(this.eulerAngles, this.worldUp);
    this.front = updatedVectors.front;
    this.right = updatedVectors.right;
    this.up = updatedVectors.up;
  }

  processMouseScroll(yOffset: number) {
    this.controlOptions.zoom -= yOffset;
    if (this.controlOptions.zoom < 1.0) {
      this.controlOptions.zoom = 1.0;
    } else if (this.controlOptions.zoom > 45.0) {
      this.controlOptions.zoom = 45.0;
    }
  }

  #calculateFrontRightAndUpVectors(eulerAngles: EulerAngles, worldUp: vec3 = this.worldUp) {
    const front = vec3.fromValues(
      Math.cos(glMatrix.toRadian(eulerAngles.yaw)) * Math.cos(glMatrix.toRadian(eulerAngles.pitch)),
      Math.sin(glMatrix.toRadian(eulerAngles.pitch)),
      Math.sin(glMatrix.toRadian(eulerAngles.yaw)) * Math.cos(glMatrix.toRadian(eulerAngles.pitch))
    );
    vec3.normalize(front, front);
    const right = vec3.cross(vec3.create(), front, worldUp);
    vec3.normalize(right, right);
    const up = vec3.cross(vec3.create(), right, front);
    vec3.normalize(up, up);

    return { front, right, up };
  }
}
