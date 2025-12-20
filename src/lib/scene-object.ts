import type { Geometry } from "~/lib/geometry";
import { type ShaderSources, createShaderProgram } from "~/lib/shaders";

export type SceneObject = {
  vertexArrayObject: WebGLVertexArrayObject;
  shaderProgram: WebGLProgram;
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

  // Unbind vertex array to prevent capturing another object's config.
  gl.bindVertexArray(null);

  return { vertexArrayObject, shaderProgram };
}
