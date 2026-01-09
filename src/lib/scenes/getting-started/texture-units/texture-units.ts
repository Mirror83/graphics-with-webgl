import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import {
  clearCanvasViewport,
  resizeCanvas,
  setupKeydownHandler,
  setupWebGLContextWithCanvasResize
} from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";
import { loadTexture } from "~/lib/textures";

// Shaders
import vertexShaderSource from "./vert.glsl?raw";
import fragmentShaderSource from "./frag.glsl?raw";

const textureUnits: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
    // positions   // texture coords
    0.5,  0.5,     1.0, 1.0, // top-right
    0.5, -0.5,     1.0, 0.0, // bottom-right
   -0.5, -0.5,     0.0, 0.0, // bottom-left
   -0.5,  0.5,     0.0, 1.0  // top-left
  ]);

  // prettier-ignore
  const indices = new Uint32Array([
    0, 1, 3, // first triangle
    1, 2, 3  // second triangle
  ]);

  const positionComponentsPerVertex = 2;
  const textureCoordComponentsPerVertex = 2;
  const totalComponentsPerVertex = positionComponentsPerVertex + textureCoordComponentsPerVertex;
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
      name: "texCoord",
      numberOfComponents: textureCoordComponentsPerVertex,
      type: gl.FLOAT,
      stride,
      normalize: false,
      offset: positionComponentsPerVertex * vertices.BYTES_PER_ELEMENT
    }
  ];

  const geometry: Geometry = {
    vertices,
    indices,
    attributeConfigs,
    textures: [
      loadTexture(gl, "/textures/container.jpg"),
      loadTexture(gl, "/textures/awesomeface.png")
    ]
  };

  const sceneObject = configureSceneObject(gl, geometry, {
    vertex: vertexShaderSource,
    fragment: fragmentShaderSource
  });
  if (!sceneObject) {
    alert("Unable to configure geometry");
    return resizeHandlerCleanup;
  }

  sceneObject.draw = function () {
    for (let i = 0; geometry.textures && i < geometry.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, geometry.textures[i]);
    }
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
  };

  let mixAmount = 0.2;
  function changeTextureUnitMixAmount(event: KeyboardEvent) {
    if (event.key === "ArrowUp") {
      mixAmount = Math.min(mixAmount + 0.1, 1.0);
    } else if (event.key === "ArrowDown") {
      mixAmount = Math.max(mixAmount - 0.1, 0.0);
    }
  }

  const keydownHandlerCleanup = setupKeydownHandler(canvas, changeTextureUnitMixAmount);

  // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
  let requestId: number;
  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    if (!sceneObject) {
      return;
    }

    clearCanvasViewport(gl);
    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);

    setUniform(gl, sceneObject.shaderProgram, {
      name: "mixAmount",
      type: "float",
      value: mixAmount
    });

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    sceneObject.draw();
    requestId = requestAnimationFrame(() => render(gl, canvas));
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  requestId = requestAnimationFrame(() => render(gl, canvas));

  return () => {
    resizeHandlerCleanup();
    keydownHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default textureUnits;
