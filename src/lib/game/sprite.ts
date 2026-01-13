import { glMatrix, mat4, vec3, type vec2, type vec4 } from "gl-matrix";
import type { Shader } from "~/lib/shaders";
import type { Texture2D } from "~/lib/textures";

export class SpriteRenderer {
  #shader: Shader;
  #quadVertexArrayObject: WebGLVertexArrayObject | null = null;

  constructor(shader: Shader) {
    this.#shader = shader;
  }

  init(gl: WebGL2RenderingContext) {
    // prettier-ignore
    const vertices = new Float32Array([
      // pos    // tex
      0.0, 1.0, 0.0, 1.0,
      1.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 0.0,

      0.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
      1.0, 0.0, 1.0, 0.0
    ]);
    this.#quadVertexArrayObject = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    gl.bindVertexArray(this.#quadVertexArrayObject);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const totalComponentsPerVertex = 4;

    const positionAndTextureCoordLocation = 0;
    const size = totalComponentsPerVertex;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = totalComponentsPerVertex * vertices.BYTES_PER_ELEMENT;
    const offset = 0;

    gl.enableVertexAttribArray(positionAndTextureCoordLocation);
    gl.vertexAttribPointer(positionAndTextureCoordLocation, size, type, normalize, stride, offset);

    // Unbind vertex array object and buffer after setup
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  drawSprite(
    gl: WebGL2RenderingContext,
    texture: Texture2D,
    position: vec2,
    size: vec2,
    colour: vec4,
    rotationAngle: number = 0
  ) {
    if (this.#quadVertexArrayObject) {
      gl.bindVertexArray(this.#quadVertexArrayObject);
    } else {
      return;
    }
    // The sequence of transformations is as follows:
    // 1. Scale
    // 2. Rotate*
    // 3. Translate
    //
    // The `Rotation` step includes a translation to move the
    // sprite's origin ((0, 0) coordinate) from the top-left
    // of the sprite to its center.
    // Then the actual rotation is done, followed by another translation
    // to restore the origin for the next step in the sequence.
    const model = mat4.create();
    // Translate
    mat4.translate(model, model, vec3.fromValues(position[0], position[1], 0.0));
    // Rotate
    mat4.translate(model, model, vec3.fromValues(0.5 * size[0], 0.5 * size[1], 0.0));
    mat4.rotate(model, model, glMatrix.toRadian(rotationAngle), vec3.fromValues(0.0, 0.0, 1.0));
    mat4.translate(model, model, vec3.fromValues(-0.5 * size[0], -0.5 * size[1], 0.0));
    // Scale
    mat4.scale(model, model, vec3.fromValues(size[0], size[1], 1.0));
    this.#shader
      .use(gl)
      .setUniform(gl, "model", {
        type: "mat4-float",
        value: model
      })
      .setUniform(gl, "spriteColour", {
        type: "vec4",
        value: colour
      });

    gl.activeTexture(gl.TEXTURE0);
    texture.bind(gl);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    this.#shader.finishUse(gl);
  }
}
