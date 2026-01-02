import type { Geometry } from "~/lib/geometry";
import { type ShaderSources, createShaderProgram, setUniform } from "~/lib/shaders";

export type SceneObject = {
  vertexArrayObject: WebGLVertexArrayObject;
  shaderProgram: WebGLProgram;
  elementBuffer?: WebGLBuffer;
  draw?: () => void;
};

export function configureSceneObject(
  gl: WebGL2RenderingContext,
  geometry: Geometry,
  shaderSources: ShaderSources
): SceneObject | null {
  const vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

  const elementBuffer = gl.createBuffer();
  if (geometry.indices) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
  }

  const shaderProgram = createShaderProgram(gl, shaderSources);

  if (!shaderProgram) {
    alert("Unable to create shader program");
    return null;
  }

  for (const config of geometry.attributeConfigs) {
    const location = gl.getAttribLocation(shaderProgram, config.name);
    gl.vertexAttribPointer(
      location,
      config.numberOfComponents,
      config.type,
      config.normalize,
      config.stride,
      config.offset
    );
    gl.enableVertexAttribArray(location);
  }

  gl.useProgram(shaderProgram);
  for (let i = 0; geometry.textures && i < geometry.textures.length; i++) {
    setUniform(gl, shaderProgram, {
      name: geometry.textureNames?.[i] ?? `texture${i}`,
      type: "int",
      value: i
    });
  }
  // Unbind program to prevent capturing another object's config.
  gl.useProgram(null);

  // Unbind vertex array to prevent capturing another object's config.
  gl.bindVertexArray(null);

  const sceneObject: SceneObject = { vertexArrayObject, shaderProgram };
  if (geometry.indices) {
    sceneObject.elementBuffer = elementBuffer;
  }
  return sceneObject;
}
