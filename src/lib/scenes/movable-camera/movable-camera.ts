import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import { updateRenderTime, type RenderTime, type RenderWrapper } from "~/lib/render";
import { loadTexture } from "~/lib/textures";
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { Camera, setupCameraInputEventHandlers, type CameraControlMouseState } from "~/lib/camera";

// Shaders
import vertexShaderSource from "~/lib/scenes/movable-camera/movable-camera.vert?raw";
import fragmentShaderSource from "~/lib/scenes/movable-camera/movable-camera.frag?raw";

const movableCamera: RenderWrapper = (canvas) => {
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
    vec3.set(vec3.create(),  0.0,  0.0,  0.0),
    vec3.set(vec3.create(),  2.0,  5.0, -15.0),
    vec3.set(vec3.create(), -1.5, -2.2, -2.5),
    vec3.set(vec3.create(), -3.8, -2.0, -12.3),
    vec3.set(vec3.create(),  2.4, -0.4, -3.5),
    vec3.set(vec3.create(), -1.7,  3.0, -7.5),
    vec3.set(vec3.create(),  1.3, -2.0, -2.5),
    vec3.set(vec3.create(),  1.5,  2.0, -2.5),
    vec3.set(vec3.create(),  1.5,  0.2, -1.5),
    vec3.set(vec3.create(), -1.3,  1.0, -1.5),
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

  sceneObject.draw = function () {
    for (let i = 0; geometry.textures && i < geometry.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, geometry.textures[i]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / totalComponentsPerVertex);
  };

  // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
  let requestId: number;
  let camera = new Camera();
  const mouseState: CameraControlMouseState = {
    lastMousePos: { x: 0, y: 0 },
    isMouseDown: false
  };
  const renderTime: RenderTime = {
    previousTime: 0,
    deltaTime: 0
  };

  const cleanupCameraHandlers = setupCameraInputEventHandlers(
    canvas,
    renderTime,
    camera,
    mouseState
  );

  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, currentTime: number = 0) {
    if (!sceneObject) {
      return;
    }

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    updateRenderTime(renderTime, currentTime);
    const timeInSeconds = currentTime / 1000;

    clearCanvasViewport(gl, { enableDepthTesting: true });
    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);

    const view = mat4.create();

    mat4.lookAt(
      view,
      camera.position,
      vec3.add(vec3.create(), camera.position, camera.front),
      camera.up
    );

    const projection = mat4.perspective(
      mat4.create(),
      glMatrix.toRadian(camera.controlOptions.fov),
      canvas.width / canvas.height,
      0.1,
      100.0
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
    requestId = requestAnimationFrame((currentTime) => render(gl, canvas, currentTime));
  }

  requestId = requestAnimationFrame((currentTime) => render(gl, canvas, currentTime));

  return () => {
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    cleanupCameraHandlers();
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default movableCamera;
