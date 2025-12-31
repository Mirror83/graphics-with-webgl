type EventHandlerCleanup = () => void;

/** This represents a function that:
 * 1. Sets up a (WebGL) scene given the `canvas` element
 *    (including objects, shaders and event handlers)
 * 2. Sets up and runs the render function and the render loop for that scene
 *    (using `requestAnimationFrame`)
 * 3. Returns a cleanup function that stops the render loop,
 *    removes event handlers and resets any relevant context state
 *    (e.g. depth testing) modified for the scene during rendering or setup.
 *
 * Wrapping the details of scene creation and rendering in a single function
 * gives flexibility in how those details are implemented.
 *
 * However, it also limits the ability for external components
 * to modify the scene after creation.
 * For example, a UI component that allows users to modify scene parameters
 * (e.g. rotation speed, or camera movement buttons on touch screens)
 * would need to be implemented within the scene function itself
 * (using classic DOM manipulation methods), rather than externally
 * (like through Svelte components).
 *
 * For the purposes of this project though, this trade-off is acceptable,
 * because the demos in the source material (the Learn OpenGL book)
 * do not particularly need the extra flexibility.
 *
 * @param canvas The HTMLCanvasElement to render the scene on
 * @returns A cleanup function to stop rendering the scene and clean up event handlers and context state
 *  */
export type RenderWrapper = (canvas: HTMLCanvasElement) => EventHandlerCleanup;

/** Represents timing information for rendering, including the previous frame time
 *  and the delta time between frames.
 *
 *  This was created mainly as a way to pass delta time by reference to event handlers
 * (see {@link setupCameraInputEventHandlers}, for example),
 *  but it also encapsulates the logic for calculating delta time
 *  between frames (see {@link updateRenderTime})
 * */
export type RenderTime = {
  previousTime: number;
  deltaTime: number;
};

export function updateRenderTime(renderTime: RenderTime, currentTimeInMs: number) {
  renderTime.deltaTime = (currentTimeInMs - renderTime.previousTime) / 1000;
  renderTime.previousTime = currentTimeInMs;
}

type SceneDetails = {
  name: string;
  route: string;
  description?: string;
  inputInstructions?: string;
};

export const sceneDetails: SceneDetails[] = [
  {
    name: "Hello Triangle",
    route: "hello-triangle",
    description: "An orange-ish triangle"
  },
  {
    name: "Hello Triangle Indexed",
    route: "hello-triangle-indexed",
    description: "An orange-ish rectangle"
  },
  {
    name: "Hello Uniforms",
    route: "hello-uniforms",
    description: "A triangle with a uniform colour that changes over time"
  },
  {
    name: "More Attributes",
    route: "more-attributes",
    description: "A colourful triangle with per-vertex colours interpolated across its surface"
  },
  {
    name: "Hello Textures",
    route: "hello-textures",
    description: "A rectangle textured with an image of a wooden container"
  },
  {
    name: "Texture Units",
    route: "texture-units",
    description:
      "A rectangle textured with two textures (a wooden container and a smiley face picture) using texture units",
    inputInstructions:
      "Click on the canvas then use the up and down arrow keys to change the blend between the wooden container and smiley face picture. (Sorry mobile guys.)"
  },
  {
    name: "Hello Transformations",
    route: "hello-transformations",
    description:
      "Two rectangles; one at the top-left, and one at the bottom-right of the screen. The first one scales up and down, and the other rotates over time."
  },
  {
    name: "Hello 3D (No Depth Test)",
    route: "hello-3d-no-depth-test",
    description:
      "A rotating 3D cube with each face textured with an image of a wooden container and a smiley face (with depth-testing disabled, thus causing some faces to be rendered over others.)"
  },
  {
    name: "Hello 3D",
    route: "hello-3d",
    description:
      "A rotating 3D cube with each face textured with an image of a wooden container and a smiley face (and depth-testing enabled)."
  },
  {
    name: "More Cubes",
    route: "more-cubes",
    description:
      "Ten 3D cubes with each face textured with an image of a wooden container and a smiley face (and depth-testing enabled). Four of them rotate over time."
  },
  {
    name: "Camera circle",
    route: "camera-circle",
    description:
      "Simulation of a camera going in a circle while looking at the center of the scene."
  },
  {
    name: "Movable Camera",
    route: "movable-camera",
    description: `
     Click on the canvas and then use the arrow keys to move the camera
     forward and backward, and strafe left and right.
     Click and drag the mouse to look around. 
     Use the scroll wheel (or equivalent trackpad gesture) to zoom in and out. (Sorry mobile guys.)`
  },
  {
    name: "Colours",
    route: "colours"
  },
  {
    name: "Basic lighting (Diffuse)",
    route: "basic-lighting-diffuse",
    description: "A 3D cube lit by a single light source, demonstrating diffuse lighting."
  }
];
