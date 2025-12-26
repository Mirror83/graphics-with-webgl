import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";

const helloTriangleIndexed: RenderWrapper = (canvas, shaderSources) => {
  const contextAndCleanup = setupWebGLContextWithCanvasResize(canvas);
  if (!contextAndCleanup) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = contextAndCleanup;

  // prettier-ignore
  const vertices = new Float32Array([
    0.5,  0.5, // top-right
    0.5, -0.5, // bottom-right
   -0.5, -0.5, // bottom-left
   -0.5,  0.5, // top-left
  ]);

  // prettier-ignore
  const indices = new Uint32Array([
    0, 1, 3, // first triangle
    1, 2, 3, // second triangle
  ]);

  const attributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: 2,
      type: gl.FLOAT,
      normalize: false,
      stride: 2 * vertices.BYTES_PER_ELEMENT,
      offset: 0
    }
  ];

  const geometry: Geometry = {
    vertices,
    indices,
    attributeConfigs
  };

  const sceneObject = configureSceneObject(gl, geometry, shaderSources);
  if (!sceneObject) {
    alert("Cannot configure geometry");
    return resizeHandlerCleanup;
  }

  sceneObject.draw = function () {
    if (!this.elementBuffer) {
      alert("An element buffer object is needed.");
      return;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
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

export default helloTriangleIndexed;
