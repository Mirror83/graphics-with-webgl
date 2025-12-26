import { vec4 } from "gl-matrix";
import { setupWebGLContextWithCanvasResize, clearCanvasViewport, resizeCanvas } from "~/lib/canvas";
import type { VertexAttributeConfig, Geometry } from "~/lib/geometry";
import type { RenderWrapper } from "~/lib/render";
import { configureSceneObject } from "~/lib/scene-object";
import { setUniform } from "~/lib/shaders";

const helloUniforms: RenderWrapper = (canvas, shaderSources) => {
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
      stride: 2 * vertices.BYTES_PER_ELEMENT,
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
    return resizeHandlerCleanup;
  }

  sceneObject.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let requestId: number;
  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, timeInSeconds: number) {
    if (!sceneObject) {
      return;
    }

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    clearCanvasViewport(gl);

    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);
    const greenValue = Math.sin(timeInSeconds) * 0.5 + 0.5;
    setUniform(gl, sceneObject.shaderProgram, {
      name: "u_colour",
      type: "vec4",
      value: vec4.fromValues(0.0, greenValue, 0.0, 1.0)
    });

    sceneObject.draw();
    requestId = requestAnimationFrame((timeInMilliseconds) =>
      render(gl, canvas, timeInMilliseconds / 1000)
    );
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  requestId = requestAnimationFrame((timeInMilliseconds) =>
    render(gl, canvas, timeInMilliseconds / 1000)
  );
  return () => {
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default helloUniforms;
