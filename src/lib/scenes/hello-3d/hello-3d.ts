import { glMatrix, mat4, vec3 } from "gl-matrix";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import type { RenderWrapper } from "~/lib/render";
import { configureSceneObject } from "~/lib/scene-object";
import { setUniform } from "~/lib/shaders";
import { loadTexture } from "~/lib/textures";

const hello3d: RenderWrapper = (canvas, shaderSources) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
      // positions     // texture coords
       -0.5,-0.5,-0.5, 0.0, 0.0,
        0.5,-0.5,-0.5, 1.0, 0.0,
        0.5, 0.5,-0.5, 1.0, 1.0,
        0.5, 0.5,-0.5, 1.0, 1.0,
       -0.5, 0.5,-0.5, 0.0, 1.0,
       -0.5,-0.5,-0.5, 0.0, 0.0,

       -0.5,-0.5, 0.5, 0.0, 0.0,
        0.5,-0.5, 0.5, 1.0, 0.0,
        0.5, 0.5, 0.5, 1.0, 1.0,
        0.5, 0.5, 0.5, 1.0, 1.0,
       -0.5, 0.5, 0.5, 0.0, 1.0,
       -0.5,-0.5, 0.5, 0.0, 0.0,

       -0.5, 0.5, 0.5, 1.0, 0.0,
       -0.5, 0.5,-0.5, 1.0, 1.0,
       -0.5,-0.5,-0.5, 0.0, 1.0,
       -0.5,-0.5,-0.5, 0.0, 1.0,
       -0.5,-0.5, 0.5, 0.0, 0.0,
       -0.5, 0.5, 0.5, 1.0, 0.0,

        0.5, 0.5, 0.5, 1.0, 0.0,
        0.5, 0.5,-0.5, 1.0, 1.0,
        0.5,-0.5,-0.5, 0.0, 1.0,
        0.5,-0.5,-0.5, 0.0, 1.0,
        0.5,-0.5, 0.5, 0.0, 0.0,
        0.5, 0.5, 0.5, 1.0, 0.0,

       -0.5,-0.5,-0.5, 0.0, 1.0,
        0.5,-0.5,-0.5, 1.0, 1.0,
        0.5,-0.5, 0.5, 1.0, 0.0,
        0.5,-0.5, 0.5, 1.0, 0.0,
       -0.5,-0.5, 0.5, 0.0, 0.0,
       -0.5,-0.5,-0.5, 0.0, 1.0,

       -0.5, 0.5,-0.5, 0.0, 1.0,
        0.5, 0.5,-0.5, 1.0, 1.0,
        0.5, 0.5, 0.5, 1.0, 0.0,
        0.5, 0.5, 0.5, 1.0, 0.0,
       -0.5, 0.5, 0.5, 0.0, 0.0,
       -0.5, 0.5,-0.5, 0.0, 1.0,
    ]);

  const positionComponentsPerVertex = 3;
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
    attributeConfigs,
    textures: [
      loadTexture(gl, "/textures/container.jpg"),
      loadTexture(gl, "/textures/awesomeface.png")
    ]
  };

  const sceneObject = configureSceneObject(gl, geometry, shaderSources);
  if (!sceneObject) {
    alert("Unable to configure geometry");
    return resizeHandlerCleanup;
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);

  const view = mat4.identity(mat4.create());
  mat4.translate(view, view, vec3.fromValues(0.0, 0.0, -3.0));
  const projection = mat4.perspective(
    mat4.create(),
    glMatrix.toRadian(45),
    canvas.width / canvas.height,
    0.1,
    100.0
  );

  sceneObject.draw = function () {
    for (let i = 0; geometry.textures && i < geometry.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, geometry.textures[i]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / totalComponentsPerVertex);
  };

  // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
  let requestId: number;
  function render(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    timeInSeconds: number = 0
  ) {
    if (!sceneObject) {
      return;
    }

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    clearCanvasViewport(gl, { enableDepthTesting: true });

    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);

    const model = mat4.identity(mat4.create());
    mat4.rotate(
      model,
      model,
      glMatrix.toRadian(50) * timeInSeconds,
      vec3.fromValues(0.5, 1.0, 0.0)
    );

    setUniform(gl, sceneObject.shaderProgram, {
      name: "model",
      type: "mat4-float",
      value: model
    });
    setUniform(gl, sceneObject.shaderProgram, {
      name: "view",
      type: "mat4-float",
      value: view
    });
    setUniform(gl, sceneObject.shaderProgram, {
      name: "projection",
      type: "mat4-float",
      value: projection
    });

    sceneObject.draw();
    requestId = requestAnimationFrame((timeInMilliseconds) =>
      render(gl, canvas, timeInMilliseconds / 1000)
    );
  }

  requestId = requestAnimationFrame((timeInMilliseconds) =>
    render(gl, canvas, timeInMilliseconds / 1000)
  );

  return () => {
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default hello3d;
