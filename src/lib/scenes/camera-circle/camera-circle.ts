import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";
import { loadTexture } from "~/lib/textures";
import { glMatrix, mat4, vec3 } from "gl-matrix";

// Shaders
import vertexShaderSource from "~/lib/scenes/camera-circle/camera-circle.vert?raw";
import fragmentShaderSource from "~/lib/scenes/camera-circle/camera-circle.frag?raw";

const moreCubes: RenderWrapper = (canvas) => {
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

  // prettier-ignore
  const cubePositions: vec3[] = [
    vec3.fromValues( 0.0,  0.0,  0.0),
    vec3.fromValues( 2.0,  5.0, -15.0),
    vec3.fromValues(-1.5, -2.2, -2.5),
    vec3.fromValues(-3.8, -2.0, -12.3),
    vec3.fromValues( 2.4, -0.4, -3.5),
    vec3.fromValues(-1.7,  3.0, -7.5),
    vec3.fromValues( 1.3, -2.0, -2.5),
    vec3.fromValues( 1.5,  2.0, -2.5),
    vec3.fromValues( 1.5,  0.2, -1.5),
    vec3.fromValues(-1.3,  1.0, -1.5),
  ];

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

  const sceneObject = configureSceneObject(gl, geometry, {
    vertex: vertexShaderSource,
    fragment: fragmentShaderSource
  });
  if (!sceneObject) {
    alert("Unable to configure geometry");
    return resizeHandlerCleanup;
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);

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

    const view = mat4.create();
    const radius = 10.0;
    const camX = Math.sin(timeInSeconds) * radius;
    const camZ = Math.cos(timeInSeconds) * radius;

    mat4.lookAt(
      view,
      vec3.fromValues(camX, 0.0, camZ),
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(0.0, 1.0, 0.0)
    );

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

    for (let i = 0; i < cubePositions.length; i++) {
      const position = cubePositions[i];
      const model = mat4.create();
      mat4.translate(model, model, position);
      // The (i + 10) gives the first cube a non-zero angle
      // so that it is affected by the rotation calculation below
      const angle = 20.0 * (i + 10);
      mat4.rotate(
        model,
        model,
        // Rotate every third cube
        glMatrix.toRadian(i % 3 === 0 ? (timeInSeconds / 5) * angle : angle),
        vec3.fromValues(1.0, 0.3, 0.5)
      );
      setUniform(gl, sceneObject.shaderProgram, {
        name: "model",
        type: "mat4-float",
        value: model
      });

      sceneObject.draw();
    }
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

export default moreCubes;
