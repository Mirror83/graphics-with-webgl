import { getShaderSources, type ShaderSources } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";
import { loadTexture } from "~/lib/textures";

const shaderSources: ShaderSources = await getShaderSources("hello-textures");

const helloTextures: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, cleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
    // positions   // colours       // texture coords
    0.5,  0.5,     1.0, 0.0, 0.0,   1.0, 1.0, // top-right
    0.5, -0.5,     0.0, 1.0, 0.0,   1.0, 0.0, // bottom-right
   -0.5, -0.5,     0.0, 0.0, 1.0,   0.0, 0.0, // bottom-left
   -0.5,  0.5,     1.0, 1.0, 0.0,   0.0, 1.0  // top-left
  ]);

  // prettier-ignore
  const indices = new Uint32Array([
    0, 1, 3, // first triangle
    1, 2, 3  // second triangle
  ]);

  const positionComponentsPerVertex = 2;
  const colourComponentsPerVertex = 3;
  const textureCoordComponentsPerVertex = 2;
  const totalComponentsPerVertex =
    positionComponentsPerVertex + colourComponentsPerVertex + textureCoordComponentsPerVertex;
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
    },
    {
      name: "texCoord",
      numberOfComponents: textureCoordComponentsPerVertex,
      type: gl.FLOAT,
      stride,
      normalize: false,
      offset: (positionComponentsPerVertex + colourComponentsPerVertex) * vertices.BYTES_PER_ELEMENT
    }
  ];

  const geometry: Geometry = {
    vertices,
    indices,
    attributeConfigs,
    textures: [loadTexture(gl, "/textures/container.jpg")]
  };

  const sceneObject = configureSceneObject(gl, geometry, shaderSources);
  if (!sceneObject) {
    alert("Unable to configure geometry");
    return cleanup;
  }

  sceneObject.draw = function () {
    for (let i = 0; geometry.textures && i < geometry.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, geometry.textures[i]);
    }
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
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

export default helloTextures;
