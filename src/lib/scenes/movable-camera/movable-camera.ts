import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject } from "~/lib/scene-object";
import type { RenderWrapper } from "~/lib/render";
import { loadTexture } from "~/lib/textures";
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { on } from "svelte/events";
import { Camera, CameraDirection } from "~/lib/camera";

const moreCubes: RenderWrapper = (canvas, shaderSources) => {
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

  const sceneObject = configureSceneObject(gl, geometry, shaderSources);
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
  let previousTime = 0;
  let deltaTime = 0;
  let lastMousePos = { x: canvas.width / 2, y: canvas.height / 2 };
  let isMouseDown = false;

  function handleMouseDown(event: MouseEvent) {
    lastMousePos = { x: event.clientX, y: event.clientY };
    isMouseDown = true;
  }

  function handleMouseUp() {
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
    console.debug("Wheel event:", event);
    console.debug("camera controlOptions:", camera.controlOptions);
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
    if (!sceneObject) {
      return;
    }

    if (!sceneObject.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    deltaTime = (currentTime - previousTime) / 1000;
    previousTime = currentTime;
    const timeInSeconds = currentTime / 1000;

    clearCanvasViewport(gl, { enableDepthTesting: true });
    gl.bindVertexArray(sceneObject.vertexArrayObject);
    gl.useProgram(sceneObject.shaderProgram);

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
      const model = mat4.identity(mat4.create());
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
    keydownCleanup();
    cleanupMouseHandlers();
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default moreCubes;
