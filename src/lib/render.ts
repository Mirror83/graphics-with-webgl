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
