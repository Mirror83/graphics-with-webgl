import { glMatrix, mat4, vec3 } from "gl-matrix";
import { on } from "svelte/events";
import type { RenderTime } from "~/lib/render";

export enum CameraDirection {
  Forward,
  Backward,
  Left,
  Right
}

const YAW = -90.0;
const PITCH = 0.0;
const SPEED = 2.5;
const SENSITIVITY = 0.1;
const FOV_MAX = 45.0;
const FOV_MIN = 1.0;

type EulerAngles = {
  yaw: number;
  pitch: number;
};

type CameraControlOptions = {
  movementSpeed: number;
  mouseSensitivity: number;
  /* Field of view angle in degrees */
  fov: number;
};

export class Camera {
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
    fov: FOV_MAX
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

  move(direction: CameraDirection, deltaTime: number) {
    const velocity = this.controlOptions.movementSpeed * deltaTime;
    switch (direction) {
      case CameraDirection.Forward:
        vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.front, velocity));
        break;
      case CameraDirection.Backward:
        vec3.sub(this.position, this.position, vec3.scale(vec3.create(), this.front, velocity));
        break;
      case CameraDirection.Left:
        vec3.sub(this.position, this.position, vec3.scale(vec3.create(), this.right, velocity));
        break;
      case CameraDirection.Right:
        vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.right, velocity));
        break;
    }
  }

  lookAround(offset: { x: number; y: number }, constrainPitch: boolean = true) {
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

  zoom(yOffset: number) {
    this.controlOptions.fov -= yOffset;
    // Clamp the field of view to 45 degrees
    if (this.controlOptions.fov < FOV_MIN) {
      this.controlOptions.fov = FOV_MIN;
    } else if (this.controlOptions.fov > FOV_MAX) {
      this.controlOptions.fov = FOV_MAX;
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

/** Stores information about the mouse relevant to controlling a {@link Camera} */
export type CameraControlMouseState = {
  lastMousePos: { x: number; y: number };
  isMouseDown: boolean;
};

function handleMouseDown(event: MouseEvent, mouseState: CameraControlMouseState) {
  mouseState.lastMousePos = { x: event.clientX, y: event.clientY };
  mouseState.isMouseDown = true;
}

function handleMouseUp(camera: Camera, mouseState: CameraControlMouseState) {
  console.debug("position:", camera.position, "eulerAngles:", camera.eulerAngles);
  mouseState.isMouseDown = false;
}

function handleMouseMove(event: MouseEvent, camera: Camera, mouseState: CameraControlMouseState) {
  if (!mouseState.isMouseDown) {
    return;
  }
  const currentMousePos = { x: event.clientX, y: event.clientY };
  const offset = {
    x: currentMousePos.x - mouseState.lastMousePos.x,
    y: mouseState.lastMousePos.y - currentMousePos.y // Reversed since y-coordinates go from bottom to top
  };
  mouseState.lastMousePos = currentMousePos;
  camera.lookAround(offset);
}

function handleScrollWheelZoom(event: WheelEvent, camera: Camera) {
  let deltaY: number;
  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_PIXEL:
      deltaY = event.deltaY;
      break;
    case WheelEvent.DOM_DELTA_LINE:
      deltaY = event.deltaY * 16; // Approximate line height in pixels
      break;
    case WheelEvent.DOM_DELTA_PAGE:
      deltaY = event.deltaY * 800; // Approximate page height in pixels
      break;
    default:
      deltaY = event.deltaY;
      break;
  }
  camera.zoom(deltaY * 0.01); // Scale down the scroll amount
}

function moveCameraByKeyboardInput(event: KeyboardEvent, renderTime: RenderTime, camera: Camera) {
  const { deltaTime } = renderTime;
  switch (event.key) {
    case "w":
    case "ArrowUp":
      camera.move(CameraDirection.Forward, deltaTime);
      break;
    case "s":
    case "ArrowDown":
      camera.move(CameraDirection.Backward, deltaTime);
      break;
    case "a":
    case "ArrowLeft":
      camera.move(CameraDirection.Left, deltaTime);
      break;
    case "d":
    case "ArrowRight":
      camera.move(CameraDirection.Right, deltaTime);
      break;
    default:
      break;
  }
}

/**
 * Sets up input event handlers for controlling a {@link Camera} using a mouse/trackpad and keyboard.
 * The following controls are supported:
 * - Mouse drag to look around
 * - Scroll wheel to zoom in/out
 * - W/A/S/D or Arrow keys to move forward/left/backward/right
 *
 * @param canvas The HTML canvas element to attach the event handlers to.
 * @param renderTime The render time object that stores the current calculated delta time for framerate-independent movement.
 * @param camera The camera to control.
 * @param mouseState The mouse state object to track mouse position and button state.
 * @returns A cleanup function to remove the event handlers when they are no longer needed.
 */
export function setupCameraInputEventHandlers(
  canvas: HTMLCanvasElement,
  renderTime: RenderTime,
  camera: Camera,
  mouseState: CameraControlMouseState
) {
  const keydownCleanup = setupKeydownHandlerForCamera(canvas, renderTime, camera);
  const mouseEventsCleanup = setUpMouseEventHandlersForCamera(canvas, camera, mouseState);
  return () => {
    keydownCleanup();
    mouseEventsCleanup();
  };
}

function setupKeydownHandlerForCamera(
  canvas: HTMLCanvasElement,
  renderTime: RenderTime,
  camera: Camera
) {
  const keydownCleanup = on(canvas, "keydown", (event) =>
    moveCameraByKeyboardInput(event, renderTime, camera)
  );

  return keydownCleanup;
}

function setUpMouseEventHandlersForCamera(
  canvas: HTMLCanvasElement,
  camera: Camera,
  mouseState: CameraControlMouseState
) {
  const mouseDownCleanup = on(canvas, "mousedown", (event) => handleMouseDown(event, mouseState));
  const mouseUpCleanup = on(canvas, "mouseup", () => handleMouseUp(camera, mouseState));
  const mouseMoveCleanup = on(canvas, "mousemove", (event) =>
    handleMouseMove(event, camera, mouseState)
  );
  const mouseScrollCleanup = on(
    canvas,
    "wheel",
    (event) => handleScrollWheelZoom(event, camera),
    // This option is to improve scrolling performance.
    // For more info, see https://github.com/RByers/EventListenerOptions/blob/gh-pages/explainer.md
    { passive: true }
  );

  function cleanupMouseHandlers() {
    mouseDownCleanup();
    mouseUpCleanup();
    mouseMoveCleanup();
    mouseScrollCleanup();
  }

  return cleanupMouseHandlers;
}
