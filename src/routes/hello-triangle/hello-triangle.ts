import { type ShaderSources } from "~/lib/shaders";
import vertexShaderSource from "~/routes/hello-triangle/hello-triangle.vert?raw";
import fragmentShaderSource from "~/routes/hello-triangle/hello-triangle.frag?raw";
import { sizeof } from "~/lib/sizeof";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import {
  clearAndResizeCanvas,
  resizeCanvas,
  setupWebGLContextWithCanvasResize
} from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";

export function helloTriangle(canvas: HTMLCanvasElement): () => void {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, cleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
    -0.5, -0.5,  // bottom-left
     0.5, -0.5,  // bottom-right
     0.0,  0.5,  // top-center
  ]);

  const shaderSources: ShaderSources = {
    vertex: vertexShaderSource,
    fragment: fragmentShaderSource
  };

  const attributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: 2,
      type: gl.FLOAT,
      stride: 2 * sizeof("float"),
      normalize: false,
      offset: 0
    }
  ];

  const geometry: Geometry = {
    vertices,
    attributeConfigs
  };

  const sceneObject = configureSceneObject(gl, geometry, shaderSources);
  if (!sceneObject) {
    alert("Unable to configure geometry");
    return cleanup;
  }

  sceneObject.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    if (!sceneObject) {
      return;
    }

    clearAndResizeCanvas(gl, canvas);

    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    sceneObject.draw();
    requestAnimationFrame(() => render(gl, canvas));
  }

  requestAnimationFrame(() => render(gl, canvas));
  return cleanup;
}
