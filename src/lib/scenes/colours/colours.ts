import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { on } from "svelte/events";
import { Camera, CameraDirection } from "~/lib/camera";

// Shaders
import containerVertexShaderSource from "~/lib/scenes/colours/container.vert?raw";
import containerFragmentShaderSource from "~/lib/scenes/colours/container.frag?raw";
import lightVertexShaderSource from "~/lib/scenes/colours/light.vert?raw";
import lightFragmentShaderSource from "~/lib/scenes/colours/light.frag?raw";

const colours: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = result;

  // prettier-ignore
  const vertices = new Float32Array([
      // positions
       -0.5,-0.5,-0.5,
        0.5,-0.5,-0.5,
        0.5, 0.5,-0.5,
        0.5, 0.5,-0.5,
       -0.5, 0.5,-0.5,
       -0.5,-0.5,-0.5,

       -0.5,-0.5, 0.5,
        0.5,-0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
       -0.5, 0.5, 0.5,
       -0.5,-0.5, 0.5,

       -0.5, 0.5, 0.5,
       -0.5, 0.5,-0.5,
       -0.5,-0.5,-0.5,
       -0.5,-0.5,-0.5,
       -0.5,-0.5, 0.5,
       -0.5, 0.5, 0.5,

        0.5, 0.5, 0.5,
        0.5, 0.5,-0.5,
        0.5,-0.5,-0.5,
        0.5,-0.5,-0.5,
        0.5,-0.5, 0.5,
        0.5, 0.5, 0.5,

       -0.5,-0.5,-0.5,
        0.5,-0.5,-0.5,
        0.5,-0.5, 0.5,
        0.5,-0.5, 0.5,
       -0.5,-0.5, 0.5,
       -0.5,-0.5,-0.5,

       -0.5, 0.5,-0.5,
        0.5, 0.5,-0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
       -0.5, 0.5, 0.5,
       -0.5, 0.5,-0.5,
    ]);

  const positionComponentsPerVertex = 3;
  const stride = positionComponentsPerVertex * vertices.BYTES_PER_ELEMENT;

  const attributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: positionComponentsPerVertex,
      type: gl.FLOAT,
      stride,
      normalize: false,
      offset: 0
    }
  ];

  const geometry: Geometry = {
    vertices,
    attributeConfigs
  };

  const container = configureSceneObject(gl, geometry, {
    vertex: containerVertexShaderSource,
    fragment: containerFragmentShaderSource
  });
  if (!container) {
    alert("Unable to configure geometry for container");
    return resizeHandlerCleanup;
  }

  const lightCube = configureSceneObject(gl, geometry, {
    vertex: lightVertexShaderSource,
    fragment: lightFragmentShaderSource
  });
  if (!lightCube) {
    alert("Unable to configure geometry for light cube");
    return resizeHandlerCleanup;
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);

  container.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  };
  lightCube.draw = container.draw;

  // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
  let requestId: number;
  let camera = new Camera(vec3.fromValues(-3.0, 0.0, 3.0), vec3.fromValues(0.0, 1.0, 0.0), {
    yaw: -31,
    pitch: 5
  });
  let previousTime = 0;
  let deltaTime = 0;
  let lastMousePos = { x: canvas.width / 2, y: canvas.height / 2 };
  let isMouseDown = false;

  const lightPos = vec3.fromValues(1.2, 1.0, 2.0);
  const lightScale = vec3.fromValues(0.2, 0.2, 0.2);
  const lightColour = vec3.fromValues(1.0, 1.0, 1.0);

  const containerPos = vec3.fromValues(0.0, 0.0, 0.0);
  const containerColour = vec3.fromValues(1.0, 0.5, 0.31);

  function handleMouseDown(event: MouseEvent) {
    lastMousePos = { x: event.clientX, y: event.clientY };
    isMouseDown = true;
  }

  function handleMouseUp() {
    console.debug("position:", camera.position, "eulerAngles:", camera.eulerAngles);
    isMouseDown = false;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isMouseDown) {
      return;
    }
    const currentMousePos = { x: event.clientX, y: event.clientY };
    const offset = {
      x: currentMousePos.x - lastMousePos.x,
      y: lastMousePos.y - currentMousePos.y // Reversed since y-coordinates go from bottom to top
    };
    lastMousePos = currentMousePos;
    camera.lookAround(offset);
  }

  function handleScrollWheelZoom(event: WheelEvent) {
    let deltaY: number;
    switch (event.deltaMode) {
      case WheelEvent.DOM_DELTA_PIXEL:
        deltaY = event.deltaY;
        break;
      case WheelEvent.DOM_DELTA_LINE:
        deltaY = event.deltaY * 16; // Approximate line height in pixels
        break;
      case WheelEvent.DOM_DELTA_PAGE:
        deltaY = event.deltaY * 800; // Approximate page height in pixels
        break;
      default:
        deltaY = event.deltaY;
        break;
    }
    camera.zoom(deltaY * 0.01); // Scale down the scroll amount
  }

  function moveCameraByKeyboardInput(event: KeyboardEvent) {
    switch (event.key) {
      case "w":
      case "ArrowUp":
        camera.move(CameraDirection.Forward, deltaTime);
        break;
      case "s":
      case "ArrowDown":
        camera.move(CameraDirection.Backward, deltaTime);
        break;
      case "a":
      case "ArrowLeft":
        camera.move(CameraDirection.Left, deltaTime);
        break;
      case "d":
      case "ArrowRight":
        camera.move(CameraDirection.Right, deltaTime);
        break;
      default:
        break;
    }
  }

  const keydownCleanup = on(canvas, "keydown", moveCameraByKeyboardInput);
  const mouseDownCleanup = on(canvas, "mousedown", handleMouseDown);
  const mouseUpCleanup = on(canvas, "mouseup", handleMouseUp);
  const mouseMoveCleanup = on(canvas, "mousemove", handleMouseMove);
  const mouseScrollCleanup = on(
    canvas,
    "wheel",
    handleScrollWheelZoom,
    // This option is to improve scrolling performance.
    // For more info, see https://github.com/RByers/EventListenerOptions/blob/gh-pages/explainer.md
    { passive: true }
  );

  function cleanupMouseHandlers() {
    mouseDownCleanup();
    mouseUpCleanup();
    mouseMoveCleanup();
    mouseScrollCleanup();
  }

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

    deltaTime = (currentTime - previousTime) / 1000;
    previousTime = currentTime;

    const view = mat4.identity(mat4.create());
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
    const containerModel = mat4.identity(mat4.create());
    mat4.translate(containerModel, containerModel, containerPos);
    setUniform(gl, container.shaderProgram, {
      name: "model",
      type: "mat4-float",
      value: containerModel
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

    const lightCubeModel = mat4.identity(mat4.create());
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
    keydownCleanup();
    cleanupMouseHandlers();
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default colours;
