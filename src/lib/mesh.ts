import type { vec2, vec3 } from "gl-matrix";
import type { Shader } from "~/lib/shaders";

export type VertexData = {
  position: vec3;
  normal: vec3;
  texCoords: vec2;
};

export type TextureData = {
  id: WebGLTexture;
  type: "diffuse" | "specular";
  path: string;
};

/**
 * A thin abstraction over creating and using
 * WebGL buffers (vertex, element etc.), vertex array objects (VAOs)
 * and texture units to draw a 3D object.
 *  */
export class Mesh {
  vertices: VertexData[];
  indices: Uint32Array;
  textures: TextureData[];

  #vao: WebGLBuffer;

  constructor(
    gl: WebGL2RenderingContext,
    vertices: VertexData[],
    indices: Uint32Array,
    textures: TextureData[]
  ) {
    this.vertices = vertices;
    this.indices = indices;
    this.textures = textures;
    const { vao } = this.#setupMesh(gl);
    this.#vao = vao;
  }

  draw(gl: WebGL2RenderingContext, shader: Shader) {
    gl.bindVertexArray(this.#vao);
    gl.useProgram(shader.program);

    this.#bindTextures(gl, shader);

    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  #setupMesh(
    gl: WebGL2RenderingContext,
    positionLocation: number = 0,
    normalLocation: number = 1,
    texCoordLocation: number = 2
  ): {
    vao: WebGLBuffer;
  } {
    const vao = gl.createVertexArray();

    const flattenedVertices = Float32Array.from([
      ...this.vertices.flatMap((v) => [...v.position, ...v.normal, ...v.texCoords])
    ]);

    const positionComponentsPerVertex = 3;
    const normalComponentsPerVertex = 3;
    const texCoordComponentsPerVertex = 2;

    const totalComponentsPerVertex =
      positionComponentsPerVertex + normalComponentsPerVertex + texCoordComponentsPerVertex;

    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, flattenedVertices, gl.STATIC_DRAW);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    const stride = totalComponentsPerVertex * Float32Array.BYTES_PER_ELEMENT;

    // Vertex positions
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(
      positionLocation,
      positionComponentsPerVertex,
      gl.FLOAT,
      false,
      stride,
      0
    );

    // Vertex normals
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(
      normalLocation,
      normalComponentsPerVertex,
      gl.FLOAT,
      false,
      stride,
      positionComponentsPerVertex * Float32Array.BYTES_PER_ELEMENT
    );

    // Vertex texture coordinates
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(
      texCoordLocation,
      texCoordComponentsPerVertex,
      gl.FLOAT,
      false,
      stride,
      (positionComponentsPerVertex + normalComponentsPerVertex) * Float32Array.BYTES_PER_ELEMENT
    );

    gl.enableVertexAttribArray(0);
    gl.bindVertexArray(null);

    return { vao };
  }

  #bindTextures(gl: WebGL2RenderingContext, shader: Shader) {
    let currentDiffuseCount = 0;
    let currentSpecularCount = 0;

    for (let i = 0; i < this.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      const textureType = this.textures[i].type;
      let textureNumber;
      if (this.textures[i].type === "diffuse") {
        textureNumber = currentDiffuseCount;
        currentDiffuseCount += 1;
      } else if (this.textures[i].type === "specular") {
        textureNumber = currentSpecularCount;
        currentSpecularCount += 1;
      }
      // Texture unit sampler uniforms are named as 'material.<type><number>' e.g. material.diffuse0
      shader.setUniform(gl, `material.${textureType}${textureNumber}`, {
        type: "int",
        value: i
      });
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i].id);
    }
    gl.activeTexture(gl.TEXTURE0);
  }
}
