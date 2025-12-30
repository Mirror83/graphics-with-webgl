import { sizeof } from "~/lib/sizeof";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";

// Shaders
import vertexShader from "~/lib/scenes/hello-triangle/hello-triangle.vert?raw";
import fragmentShader from "~/lib/scenes/hello-triangle/hello-triangle.frag?raw";

const helloTriangle: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
    -0.5, -0.5,  // bottom-left
     0.5, -0.5,  // bottom-right
     0.0,  0.5,  // top-center
  ]);

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

  const sceneObject = configureSceneObject(gl, geometry, {
    vertex: vertexShader,
    fragment: fragmentShader
  });
  if (!sceneObject) {
    alert("Unable to configure geometry");
    return resizeHandlerCleanup;
  }

  sceneObject.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  let requestId: number;
  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    if (!sceneObject) {
      return;
    }

    clearCanvasViewport(gl);

    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    sceneObject.draw();
    requestAnimationFrame(() => render(gl, canvas));
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  requestId = requestAnimationFrame(() => render(gl, canvas));
  return () => {
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default helloTriangle;
