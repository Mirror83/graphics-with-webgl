import type { BreakoutGameDimensions } from "~/lib/game/game.svelte";
import type { Shader } from "~/lib/shaders";
import { Texture2D } from "~/lib/textures";

interface BreakoutPostProcessingEffect {
  isActive: boolean;
  durationInSeconds: number;
}

interface BreakoutPostProcessingEffectWithStrength extends BreakoutPostProcessingEffect {
  strength: number;
}

type ShakeEffect = BreakoutPostProcessingEffectWithStrength;
type ChaosEffect = BreakoutPostProcessingEffectWithStrength;
type ConfuseEffect = BreakoutPostProcessingEffect;

type BreakoutPostProcessingEffects = {
  shake: ShakeEffect;
  chaos: ChaosEffect;
  confuse: ConfuseEffect;
};

type ShakeActivationParams = {
  effectName: "shake";
  collisionWith: "wall" | "solid-block";
};

type ChaosActivationParams = {
  effectName: "chaos";
  durationInSeconds: number;
  strength?: number;
};

type ConfuseActivationParams = {
  effectName: "confuse";
  durationInSeconds: number;
};

type BreakoutPostProcessingEffectActivationParams =
  | ShakeActivationParams
  | ChaosActivationParams
  | ConfuseActivationParams;

export class BreakoutPostProcessor {
  static readonly NUMBER_OF_SAMPLES_MULTI_SAMPLING = 4;
  screenSize: BreakoutGameDimensions;

  postProcessingShader: Shader;
  screenTexture: Texture2D;

  /** The frame buffer object which the screen texture is attached to for intermediate rendering. */
  #screenTextureFbo: WebGLFramebuffer | null = null;
  #screenTextureQuadVao: WebGLVertexArrayObject | null = null;

  #multiSampleFbo: WebGLFramebuffer | null = null;
  #multiSampleRbo: WebGLRenderbuffer | null = null;

  effects: BreakoutPostProcessingEffects = {
    shake: {
      isActive: false,
      durationInSeconds: 0,
      strength: 0.01
    },
    chaos: {
      isActive: false,
      durationInSeconds: 0.0,
      strength: 0.01
    },
    confuse: {
      isActive: false,
      durationInSeconds: 0
    }
  };

  constructor(shader: Shader, screenSize: BreakoutGameDimensions) {
    this.postProcessingShader = shader;
    this.screenSize = screenSize;
    this.screenTexture = new Texture2D({ internalFormat: WebGL2RenderingContext.RGBA8 });
  }

  init(gl: WebGL2RenderingContext) {
    this.#screenTextureFbo = gl.createFramebuffer();

    this.#multiSampleFbo = gl.createFramebuffer();
    this.#multiSampleRbo = gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#multiSampleFbo);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#multiSampleRbo);
    gl.renderbufferStorageMultisample(
      gl.RENDERBUFFER,
      BreakoutPostProcessor.NUMBER_OF_SAMPLES_MULTI_SAMPLING,
      this.screenTexture.internalFormat,
      this.screenSize.x,
      this.screenSize.y
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.RENDERBUFFER,
      this.#multiSampleRbo
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Failed to initialize Multisample framebuffer object.");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#screenTextureFbo);
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
    // Unbind screen framebuffer after setup
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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
    // prettier-ignore
    const edgeDetectionKernel = new Float32Array([
      1.0,  1.0, 1.0,
      1.0, -8.0, 1.0,
      1.0,  1.0, 1.0
    ]);

    this.postProcessingShader
      .use(gl)
      // Set the texture unit of the texture the game is to be rendered to
      .setUniform(gl, "gameScene", { type: "int", value: 0 })
      .setUniform(gl, "kernelOffsets", { type: "vec2f-array", value: kernelOffsets })
      .setUniform(gl, "blurKernel", { type: "float-array", value: blurKernel })
      .setUniform(gl, "edgeDetectionKernel", { type: "float-array", value: edgeDetectionKernel })
      .finishUse(gl);
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#multiSampleFbo);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  endRenderToScreenTexture(gl: WebGL2RenderingContext) {
    // Resolve multi-sampled colour buffer into the screen texture frame buffer
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#multiSampleFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.#screenTextureFbo);
    gl.blitFramebuffer(
      0,
      0,
      this.screenSize.x,
      this.screenSize.y,
      0,
      0,
      this.screenSize.x,
      this.screenSize.y,
      gl.COLOR_BUFFER_BIT,
      gl.LINEAR
    );
    // Bind both read and draw frame buffers to the default frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  renderWithPostProcessing(gl: WebGL2RenderingContext, timeInSeconds: number) {
    this.postProcessingShader
      .use(gl)
      .setUniform(gl, "timeInSeconds", { type: "float", value: timeInSeconds })

      .setUniform(gl, "effects.shake", { type: "boolean", value: this.effects.shake.isActive })
      .setUniform(gl, "effects.shakeStrength", {
        type: "float",
        value: this.effects.shake.strength
      })

      .setUniform(gl, "effects.chaos", { type: "boolean", value: this.effects.chaos.isActive })
      .setUniform(gl, "effects.chaosStrength", {
        type: "float",
        value: this.effects.chaos.strength
      })

      .setUniform(gl, "effects.confuse", { type: "boolean", value: this.effects.confuse.isActive });

    gl.activeTexture(gl.TEXTURE0);
    this.screenTexture.bind(gl);
    gl.bindVertexArray(this.#screenTextureQuadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.postProcessingShader.finishUse(gl);
    this.screenTexture.unbind(gl);
    gl.bindVertexArray(null);
  }

  effectIsActive(effectName: keyof BreakoutPostProcessingEffects): boolean {
    return this.effects[effectName].isActive;
  }

  activateEffect(activationParams: BreakoutPostProcessingEffectActivationParams) {
    switch (activationParams.effectName) {
      case "shake":
        this.#activateShake(activationParams);
        break;
      case "chaos":
        this.#activateChaos(activationParams);
        break;
      case "confuse":
        this.#activateConfuse(activationParams);
        break;
      default:
        throw new Error(`Unknown effect activation params: ${activationParams}`);
    }
  }

  updateEffects(dt: number) {
    Object.keys(this.effects).forEach((effectName) => {
      const effect = this.effects[effectName as keyof BreakoutPostProcessingEffects];
      if (effect.isActive && effect.durationInSeconds > 0) {
        effect.durationInSeconds -= dt;
        if (effect.durationInSeconds <= Number.EPSILON) {
          this.resetEffect(effectName as keyof BreakoutPostProcessingEffects);
        }
      }
    });
  }

  resetEffect(effectName: keyof BreakoutPostProcessingEffects) {
    this.effects[effectName].isActive = false;
    this.effects[effectName].durationInSeconds = 0;
  }

  resetEffects() {
    Object.keys(this.effects).forEach((effectName) => {
      this.resetEffect(effectName as keyof BreakoutPostProcessingEffects);
    });
  }

  #activateShake(activationParams: ShakeActivationParams) {
    this.effects.shake.isActive = true;
    this.effects.shake.durationInSeconds = activationParams.collisionWith === "wall" ? 0.05 : 0.15;
    this.effects.shake.strength = activationParams.collisionWith === "wall" ? 0.01 : 0.15;
  }

  #activateChaos(activationParams: ChaosActivationParams) {
    this.effects.chaos.isActive = true;
    this.effects.chaos.durationInSeconds = activationParams.durationInSeconds;
    this.effects.chaos.strength = activationParams.strength ?? 0.02;
  }

  #activateConfuse(activationParams: ConfuseActivationParams) {
    this.effects.confuse.isActive = true;
    this.effects.confuse.durationInSeconds = activationParams.durationInSeconds;
  }
}
