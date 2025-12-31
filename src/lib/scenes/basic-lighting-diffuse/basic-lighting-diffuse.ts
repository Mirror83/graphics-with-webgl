import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import { updateRenderTime, type RenderTime, type RenderWrapper } from "~/lib/render";
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { Camera, setupCameraInputEventHandlers, type CameraControlMouseState } from "~/lib/camera";

// Shaders
import containerVertexShaderSource from "~/lib/scenes/basic-lighting-diffuse/container.vert?raw";
import containerFragmentShaderSource from "~/lib/scenes/basic-lighting-diffuse/container.frag?raw";
import lightVertexShaderSource from "~/lib/scenes/basic-lighting-diffuse/light.vert?raw";
import lightFragmentShaderSource from "~/lib/scenes/basic-lighting-diffuse/light.frag?raw";

const basicLighting: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = result;

  // prettier-ignore
  const containerVertices = new Float32Array([
       // positions        // normals
       -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,
        0.5, -0.5, -0.5,  0.0,  0.0, -1.0,
        0.5,  0.5, -0.5,  0.0,  0.0, -1.0,
        0.5,  0.5, -0.5,  0.0,  0.0, -1.0,
       -0.5,  0.5, -0.5,  0.0,  0.0, -1.0,
       -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,

       -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,
        0.5, -0.5,  0.5,  0.0,  0.0,  1.0,
        0.5,  0.5,  0.5,  0.0,  0.0,  1.0,
        0.5,  0.5,  0.5,  0.0,  0.0,  1.0,
       -0.5,  0.5,  0.5,  0.0,  0.0,  1.0,
       -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,

       -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,
       -0.5,  0.5, -0.5, -1.0,  0.0,  0.0,
       -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,
       -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,
       -0.5, -0.5,  0.5, -1.0,  0.0,  0.0,
       -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,

        0.5,  0.5,  0.5,  1.0,  0.0,  0.0,
        0.5,  0.5, -0.5,  1.0,  0.0,  0.0,
        0.5, -0.5, -0.5,  1.0,  0.0,  0.0,
        0.5, -0.5, -0.5,  1.0,  0.0,  0.0,
        0.5, -0.5,  0.5,  1.0,  0.0,  0.0,
        0.5,  0.5,  0.5,  1.0,  0.0,  0.0,

       -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,
        0.5, -0.5, -0.5,  0.0, -1.0,  0.0,
        0.5, -0.5,  0.5,  0.0, -1.0,  0.0,
        0.5, -0.5,  0.5,  0.0, -1.0,  0.0,
       -0.5, -0.5,  0.5,  0.0, -1.0,  0.0,
       -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,

       -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,
        0.5,  0.5, -0.5,  0.0,  1.0,  0.0,
        0.5,  0.5,  0.5,  0.0,  1.0,  0.0,
        0.5,  0.5,  0.5,  0.0,  1.0,  0.0,
       -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,
       -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,
    ]);

  // prettier-ignore
  const lightVertices = new Float32Array([
    // positions
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,

    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,

    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,

     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,

    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,

    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
  ])

  const positionComponentsPerVertex = 3;
  const normalComponentsPerVertex = 3;

  const containerTotalComponentsPerVertex = positionComponentsPerVertex + normalComponentsPerVertex;
  const containerStride = containerTotalComponentsPerVertex * containerVertices.BYTES_PER_ELEMENT;

  const lightTotalComponentsPerVertex = positionComponentsPerVertex;
  const lightStride = lightTotalComponentsPerVertex * lightVertices.BYTES_PER_ELEMENT;

  const containerAttributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: positionComponentsPerVertex,
      type: gl.FLOAT,
      stride: containerStride,
      normalize: false,
      offset: 0
    },
    {
      name: "normal",
      numberOfComponents: normalComponentsPerVertex,
      type: gl.FLOAT,
      stride: containerStride,
      normalize: false,
      offset: positionComponentsPerVertex * containerVertices.BYTES_PER_ELEMENT
    }
  ];

  const containerGeometry: Geometry = {
    vertices: containerVertices,
    attributeConfigs: containerAttributeConfigs
  };

  const lightAttributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: positionComponentsPerVertex,
      type: gl.FLOAT,
      stride: lightStride,
      normalize: false,
      offset: 0
    }
  ];

  const lightGeometry: Geometry = {
    vertices: lightVertices,
    attributeConfigs: lightAttributeConfigs
  };

  const container = configureSceneObject(gl, containerGeometry, {
    vertex: containerVertexShaderSource,
    fragment: containerFragmentShaderSource
  });
  if (!container) {
    alert("Unable to configure geometry for container");
    return resizeHandlerCleanup;
  }

  const lightCube = configureSceneObject(gl, lightGeometry, {
    vertex: lightVertexShaderSource,
    fragment: lightFragmentShaderSource
  });
  if (!lightCube) {
    alert("Unable to configure geometry for light cube");
    return resizeHandlerCleanup;
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);

  container.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, containerVertices.length / containerTotalComponentsPerVertex);
  };

  lightCube.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, lightVertices.length / lightTotalComponentsPerVertex);
  };

  // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
  let requestId: number;
  let camera = new Camera(vec3.fromValues(-3.0, 0.0, 3.0), vec3.fromValues(0.0, 1.0, 0.0), {
    yaw: -31,
    pitch: 5
  });

  const renderTime: RenderTime = {
    previousTime: 0,
    deltaTime: 0
  };
  const mouseState: CameraControlMouseState = {
    lastMousePos: { x: canvas.width / 2, y: canvas.height / 2 },
    isMouseDown: false
  };

  const cameraHandlersCleanup = setupCameraInputEventHandlers(
    canvas,
    renderTime,
    camera,
    mouseState
  );

  const lightPos = vec3.fromValues(1.2, 1.0, 2.0);
  const lightScale = vec3.fromValues(0.2, 0.2, 0.2);
  const lightColour = vec3.fromValues(1.0, 1.0, 1.0);

  const containerPos = vec3.fromValues(0.0, 0.0, 0.0);
  const containerColour = vec3.fromValues(1.0, 0.5, 0.31);

  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, currentTime: number = 0) {
    if (!container) {
      alert("Cannot draw scene object.");
      return;
    }

    if (!lightCube) {
      alert("Cannot draw light cube object.");
      return;
    }

    if (!container.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    if (!lightCube.draw) {
      alert("Cannot draw light cube object.");
      return;
    }

    updateRenderTime(renderTime, currentTime);

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

    clearCanvasViewport(gl, {
      enableDepthTesting: true,
      clearColor: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }
    });
    gl.bindVertexArray(container.vertexArrayObject);
    gl.useProgram(container.shaderProgram);

    setUniform(gl, container.shaderProgram, {
      name: "view",
      type: "mat4-float",
      value: view
    });
    setUniform(gl, container.shaderProgram, {
      name: "projection",
      type: "mat4-float",
      value: projection
    });
    const containerModel = mat4.create();
    mat4.translate(containerModel, containerModel, containerPos);
    setUniform(gl, container.shaderProgram, {
      name: "model",
      type: "mat4-float",
      value: containerModel
    });

    setUniform(gl, container.shaderProgram, {
      name: "lightPosition",
      type: "vec3",
      value: lightPos
    });
    setUniform(gl, container.shaderProgram, {
      name: "lightColour",
      type: "vec3",
      value: lightColour
    });
    setUniform(gl, container.shaderProgram, {
      name: "containerColour",
      type: "vec3",
      value: containerColour
    });

    container.draw();

    gl.bindVertexArray(lightCube.vertexArrayObject);
    gl.useProgram(lightCube.shaderProgram);

    const lightCubeModel = mat4.create();
    mat4.translate(lightCubeModel, lightCubeModel, lightPos);
    mat4.scale(lightCubeModel, lightCubeModel, lightScale);
    setUniform(gl, lightCube.shaderProgram, {
      name: "model",
      type: "mat4-float",
      value: lightCubeModel
    });
    setUniform(gl, lightCube.shaderProgram, {
      name: "view",
      type: "mat4-float",
      value: view
    });
    setUniform(gl, lightCube.shaderProgram, {
      name: "projection",
      type: "mat4-float",
      value: projection
    });
    setUniform(gl, lightCube.shaderProgram, {
      name: "lightColour",
      type: "vec3",
      value: lightColour
    });
    lightCube.draw();

    requestId = requestAnimationFrame((currentTime) => render(gl, canvas, currentTime));
  }

  requestId = requestAnimationFrame((currentTime) => render(gl, canvas, currentTime));

  return () => {
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    cameraHandlersCleanup();
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default basicLighting;
