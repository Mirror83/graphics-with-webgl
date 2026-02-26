<script lang="ts">
  import { Shader } from "~/lib/shaders";
  import type { PageData } from "./$types";
  import { Model } from "~/lib/model";
  import {
    Camera,
    setupCameraInputEventHandlers,
    type CameraControlMouseState
  } from "~/lib/camera";
  import { mat4, glMatrix, vec3 } from "gl-matrix";
  import { updateRenderTime, type RenderTime } from "~/lib/render";
  import { resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";

  const { data }: { data: PageData } = $props();
  let error: string | null = $state(null);

  function renderScene(canvas: HTMLCanvasElement) {
    const result = setupWebGLContextWithCanvasResize(canvas);
    if (!result) {
      return;
    }

    const { gl, resizeHandlerCleanup } = result;

    const model = new Model(gl, data.assimpScene, data.modelBaseDir);
    const shader = new Shader(gl, data.shaderSources);

    // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
    let requestId: number;
    let camera = new Camera(vec3.fromValues(0.0, 0.0, 9.0));
    const mouseState: CameraControlMouseState = {
      lastMousePos: { x: 0, y: 0 },
      isMouseDown: false
    };
    const renderTime: RenderTime = {
      previousTime: 0,
      deltaTime: 0
    };
    const cameraInputHandlersCleanup = setupCameraInputEventHandlers(
      canvas,
      renderTime,
      camera,
      mouseState
    );

    function render(gl: WebGL2RenderingContext, timeInMs: number) {
      gl.clearColor(0.78, 0.5, 0.6, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      updateRenderTime(renderTime, timeInMs);
      setMvpUniforms(gl, shader, camera, canvas.width / canvas.height, timeInMs);
      model.draw(gl, shader);
      requestId = requestAnimationFrame((timeInMs) => render(gl, timeInMs));
    }

    resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
    gl.enable(gl.DEPTH_TEST);
    requestId = requestAnimationFrame((timeInMs) => render(gl, timeInMs));

    return () => {
      gl.disable(gl.DEPTH_TEST);
      resizeHandlerCleanup();
      cameraInputHandlersCleanup();
      cancelAnimationFrame(requestId);
    };
  }

  function setMvpUniforms(
    gl: WebGL2RenderingContext,
    shader: Shader,
    camera: Camera,
    aspectRatio: number,
    timeInMs: number
  ) {
    const model = mat4.create();
    mat4.rotate(
      model,
      model,
      glMatrix.toRadian(50) * timeInMs * 0.0005,
      vec3.fromValues(0.0, 1.0, 0.0)
    );

    const view = mat4.create();
    mat4.lookAt(
      view,
      camera.position,
      vec3.add(vec3.create(), camera.position, camera.front),
      camera.up
    );

    const projection = mat4.perspective(
      mat4.create(),
      glMatrix.toRadian(45),
      aspectRatio,
      0.1,
      100.0
    );

    gl.useProgram(shader.program);

    shader.setUniform(gl, "model", {
      type: "mat4-float",
      value: model
    });
    shader.setUniform(gl, "view", {
      type: "mat4-float",
      value: view
    });
    shader.setUniform(gl, "projection", {
      type: "mat4-float",
      value: projection
    });

    gl.useProgram(null);
  }
</script>

{#if error}
  <p class="error">{error}</p>
{/if}
<canvas tabindex="0" {@attach renderScene}></canvas>
