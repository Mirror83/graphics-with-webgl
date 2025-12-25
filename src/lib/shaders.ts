import type { mat4, vec3, vec4 } from "gl-matrix";

type ShaderType =
  | WebGL2RenderingContext["VERTEX_SHADER"]
  | WebGL2RenderingContext["FRAGMENT_SHADER"];

export type ShaderSources = {
  vertex: string;
  fragment: string;
};

type NumberUniformValue = {
  type: "float" | "int";
  value: number;
};

type Vec3UniformValue = {
  type: "vec3";
  value: vec3;
};

type Vec4UniformValue = {
  type: "vec4";
  value: vec4;
};

type Mat4UniformValue = {
  type: "mat4-float";
  value: mat4;
};

type UniformValue = NumberUniformValue | Vec3UniformValue | Vec4UniformValue | Mat4UniformValue;

type UniformDetails = {
  name: string;
} & UniformValue;

function createShader(
  gl: WebGL2RenderingContext,
  type: ShaderType,
  shaderSource: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error("Unable to create shader.");
    return null;
  }

  gl.shaderSource(shader, shaderSource);

  gl.compileShader(shader);
  const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compileStatus) {
    console.error(`Unable to compile ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader.`);
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createShaderProgram(gl: WebGL2RenderingContext, sources: ShaderSources) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, sources.vertex);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, sources.fragment);
  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  const linkStatus = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS);
  if (!linkStatus) {
    console.error("Unable to link vertex and fragment shader into shader program.");
    console.error(gl.getProgramInfoLog(shaderProgram));
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(shaderProgram);
    return null;
  }

  // The shader objects are no longer needed at this point
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return shaderProgram;
}

export function setUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  details: UniformDetails
) {
  const location = gl.getUniformLocation(program, details.name);
  if (!location) {
    console.warn(`Uniform ${details.name} not found in shader program.`);
    return;
  }
  switch (details.type) {
    case "float":
      gl.uniform1f(location, details.value);
      break;
    case "int":
      gl.uniform1i(location, details.value);
      break;
    case "vec3":
      gl.uniform3fv(location, details.value);
      break;
    case "vec4":
      gl.uniform4fv(location, details.value);
      break;
    case "mat4-float":
      gl.uniformMatrix4fv(location, false, details.value);
      break;
    default:
      console.warn(`Unsupported uniform type: ${details}`);
  }
}

export async function getVertexShaderSourceFromModule(sceneName: string): Promise<string> {
  const module = await import(`~/lib/scenes/${sceneName}/${sceneName}.vert?raw`);
  return module.default as string;
}

export async function getFragmentShaderSourceFromModule(sceneName: string): Promise<string> {
  const module = await import(`~/lib/scenes/${sceneName}/${sceneName}.frag?raw`);
  return module.default as string;
}

export async function getShaderSources(sceneName: string): Promise<ShaderSources> {
  try {
    const [fragmentSource, vertexSource] = await Promise.all([
      getFragmentShaderSourceFromModule(sceneName),
      getVertexShaderSourceFromModule(sceneName)
    ]);

    return {
      fragment: fragmentSource,
      vertex: vertexSource
    };
  } catch (error) {
    console.error(`Error loading shader sources for scene "${sceneName}":`, error);
    throw error;
  }
}
