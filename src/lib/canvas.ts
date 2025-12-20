import { on } from "svelte/events";
import { Colors, defaultClearColor, type Color } from "~/lib/color";

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

export function setupWebGLContextWithCanvasResize(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL2 support is unavailable.");
    return null;
  }

  const off = on(window, "resize", () => {
    resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  });

  const cleanup = () => {
    off();
  };

  return { gl, cleanup };
}

type ClearOptions = {
  clearColor: Color;
  enableDepthTesting: boolean;
};

export function clearAndResizeCanvas(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  options: ClearOptions = {
    clearColor: defaultClearColor,
    enableDepthTesting: false
  }
) {
  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  const clearColor = options.clearColor;
  gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
  if (options.enableDepthTesting) {
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  } else {
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
