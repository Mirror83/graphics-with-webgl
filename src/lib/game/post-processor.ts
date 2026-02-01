import type { BreakoutGameDimensions } from "~/lib/game/game.svelte";
import type { Shader } from "~/lib/shaders";
import { Texture2D } from "~/lib/textures";

interface BreakoutPostProcessingEffect {
  isActive: boolean;
  durationInSeconds: number;
}

interface ShakeEffect extends BreakoutPostProcessingEffect {
  shakeStrength: number;
}

type BreakoutEffects = {
  shake: ShakeEffect;
};

type BreakoutPostProcessingEffectName = keyof BreakoutEffects;

type ShakeActivationParams = {
  effectName: BreakoutPostProcessingEffectName;
  collisionWith: "wall" | "solid-block";
};

type BreakoutPostProcessingEffectActivationParams = ShakeActivationParams;

export class BreakoutPostProcessor {
  screenSize: BreakoutGameDimensions;

  postProcessingShader: Shader;
  screenTexture: Texture2D;

  /** The frame buffer object which the screen texture is attached to for intermediate rendering. */
  #framebufferObject: WebGLFramebuffer | null = null;
  #screenTextureQuadVao: WebGLVertexArrayObject | null = null;

  effects: BreakoutEffects = {
    shake: {
      isActive: false,
      durationInSeconds: 0,
      shakeStrength: 0.01
    }
  };

  constructor(shader: Shader, screenSize: BreakoutGameDimensions) {
    this.postProcessingShader = shader;
    this.screenSize = screenSize;
    this.screenTexture = new Texture2D();
  }

  init(gl: WebGL2RenderingContext) {
    this.#framebufferObject = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebufferObject);
    this.screenTexture.init(gl, { kind: "framebuffer-attachment", size: this.screenSize });
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.screenTexture.id,
      0
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Error in BreakoutPostProcessor: Failed to initialize framebuffer object.");
    }
    this.#initScreenTextureQuadVao(gl);
    const offset = 1 / 300;
    // prettier-ignore
    const kernelOffsets = new Float32Array([
      -offset,  offset, // top-left
       0.0,     offset, // top-center
       offset,  offset, // top-right
      -offset,  0.0,   // center-left
       0.0,     0.0,   // center-center
       offset,  0.0,   // center-right
      -offset, -offset, // bottom-left
       0.0,    -offset, // bottom-center
       offset, -offset  // bottom-right
    ]);
    const blurKernelElementSum = 16;
    // prettier-ignore
    const blurKernel = new Float32Array([
      1.0 / blurKernelElementSum, 2.0 / blurKernelElementSum, 1.0 / blurKernelElementSum,
      2.0 / blurKernelElementSum, 4.0 / blurKernelElementSum, 2.0 / blurKernelElementSum,
      1.0 / blurKernelElementSum, 2.0 / blurKernelElementSum, 1.0 / blurKernelElementSum,
    ]);

    this.postProcessingShader
      .use(gl)
      // Set the texture unit of the texture the game is to be rendered to
      .setUniform(gl, "gameScene", { type: "int", value: 0 })
      .setUniform(gl, "kernelOffsets", { type: "vec2f-array", value: kernelOffsets })
      .setUniform(gl, "blurKernel", { type: "float-array", value: blurKernel })
      .finishUse(gl);

    // Unbind framebuffer after setup
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  #initScreenTextureQuadVao(gl: WebGL2RenderingContext) {
    this.#screenTextureQuadVao = gl.createVertexArray();
    gl.bindVertexArray(this.#screenTextureQuadVao);
    // Coordinates specified in normalized device coordinates
    // prettier-ignore
    const vertices = new Float32Array([
        // pos       // texture coords
        -1.0, -1.0,  0.0, 0.0,
         1.0,  1.0,  1.0, 1.0,
        -1.0,  1.0,  0.0, 1.0,

        -1.0, -1.0,  0.0, 0.0,
         1.0, -1.0,  1.0, 0.0,
         1.0,  1.0,  1.0, 1.0,
    ]);
    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const totalElementsPerVertex = 4;

    const location = 0;
    const size = totalElementsPerVertex;
    const type = gl.FLOAT;
    const normalize = false;
    // Each vertex consists of position (2 floats) and texture coords (2 floats)
    const stride = totalElementsPerVertex * vertices.BYTES_PER_ELEMENT;
    const offset = 0;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, normalize, stride, offset);

    // Unbind vertex array object and buffer after setup
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  beginRenderToScreenTexture(gl: WebGL2RenderingContext) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebufferObject);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  endRenderToScreenTexture(gl: WebGL2RenderingContext) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  renderWithPostProcessing(gl: WebGL2RenderingContext, timeInSeconds: number) {
    this.postProcessingShader
      .use(gl)
      .setUniform(gl, "timeInSeconds", { type: "float", value: timeInSeconds })
      .setUniform(gl, "effects.shake", { type: "boolean", value: this.effects.shake.isActive })
      .setUniform(gl, "effects.shakeStrength", {
        type: "float",
        value: this.effects.shake.shakeStrength
      });
    gl.activeTexture(gl.TEXTURE0);
    this.screenTexture.bind(gl);
    gl.bindVertexArray(this.#screenTextureQuadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.postProcessingShader.finishUse(gl);
    this.screenTexture.unbind(gl);
    gl.bindVertexArray(null);
  }

  activateEffect(activationParams: BreakoutPostProcessingEffectActivationParams) {
    switch (activationParams.effectName) {
      case "shake":
        this.#activateShake(activationParams);
        break;
      default:
        throw new Error(`Unknown effect: ${activationParams.effectName}`);
    }
  }

  updateEffects(dt: number) {
    this.#updateShake(dt);
  }

  resetEffects() {
    if (this.effects.shake.isActive) {
      this.#resetShake();
    }
  }

  #activateShake(activationParams: ShakeActivationParams) {
    this.effects.shake.isActive = true;
    this.effects.shake.durationInSeconds = activationParams.collisionWith === "wall" ? 0.05 : 0.15;
    this.effects.shake.shakeStrength = activationParams.collisionWith === "wall" ? 0.01 : 0.15;
  }

  #updateShake(dt: number) {
    if (!this.effects.shake.isActive) return;
    this.effects.shake.durationInSeconds -= dt;
    if (this.effects.shake.durationInSeconds <= Number.EPSILON) {
      this.#resetShake();
    }
  }

  #resetShake() {
    this.effects.shake.isActive = false;
    this.effects.shake.durationInSeconds = 0;
  }
}
