import { getShaderSources, type ShaderSources } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";

const shaderSources: ShaderSources = await getShaderSources("more-attributes");

const moreAttributes: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, cleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
    // positions   // colours
       0.5, -0.5, 1.0, 0.0, 0.0, // bottom-left
      -0.5, -0.5, 0.0, 1.0, 0.0, // bottom-right
       0.0,  0.5, 0.0, 0.0, 1.0, // top-center
  ]);

  const colourComponentsPerVertex = 3;
  const positionComponentsPerVertex = 2;
  const totalComponentsPerVertex = positionComponentsPerVertex + colourComponentsPerVertex;
  const stride = totalComponentsPerVertex * vertices.BYTES_PER_ELEMENT;

  const attributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: positionComponentsPerVertex,
      type: gl.FLOAT,
      stride,
      normalize: false,
      offset: 0
    },
    {
      name: "colour",
      numberOfComponents: colourComponentsPerVertex,
      type: gl.FLOAT,
      stride,
      normalize: false,
      offset: positionComponentsPerVertex * vertices.BYTES_PER_ELEMENT
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
  requestAnimationFrame(() => render(gl, canvas));
  return cleanup;
};

export default moreAttributes;
