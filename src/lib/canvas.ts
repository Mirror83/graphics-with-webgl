import { on } from "svelte/events";
import { defaultClearColor, type Color } from "~/lib/color";

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  width: number,
  height: number
) {
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);
}

function setupResizeHandler(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const off = on(window, "resize", () => {
    resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  });

  return off;
}

export function setupKeydownHandler(
  canvas: HTMLCanvasElement,
  callback: (event: KeyboardEvent) => void
) {
  const off = on(canvas, "keydown", callback);
  return off;
}

export function setupWebGLContextWithCanvasResize(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL2 support is unavailable.");
    return null;
  }
  const resizeHandlerCleanup = setupResizeHandler(canvas, gl);

  return { gl, resizeHandlerCleanup };
}

type ClearOptions = {
  clearColor?: Color;
  enableDepthTesting?: boolean;
};

export function clearCanvasViewport(gl: WebGL2RenderingContext, options?: ClearOptions) {
  const clearColor = options?.clearColor ?? defaultClearColor;
  gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
  if (options?.enableDepthTesting) {
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  } else {
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
