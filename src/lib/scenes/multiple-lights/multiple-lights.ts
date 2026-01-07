import { setUniform } from "~/lib/shaders";
import type { Geometry, VertexAttributeConfig } from "~/lib/geometry";
import { clearCanvasViewport, resizeCanvas, setupWebGLContextWithCanvasResize } from "~/lib/canvas";
import { configureSceneObject, type SceneObject } from "~/lib/scene-object";
import { updateRenderTime, type RenderTime, type RenderWrapper } from "~/lib/render";
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { Camera, setupCameraInputEventHandlers, type CameraControlMouseState } from "~/lib/camera";

// Shaders
import containerVertexShaderSource from "~/lib/scenes/multiple-lights/container.vert?raw";
import containerFragmentShaderSource from "~/lib/scenes/multiple-lights/container.frag?raw";
import lightCubeVertexShaderSource from "~/lib/scenes/multiple-lights/light.vert?raw";
import lightCubeFragmentShaderSource from "~/lib/scenes/multiple-lights/light.frag?raw";
import { loadTexture } from "~/lib/textures";

const WHITE = vec3.fromValues(1.0, 1.0, 1.0);

// -- Default material/light properties --
// For all light casters
const SHININESS = 32.0;
const SPECULAR_HIGHLIGHT_COLOUR = WHITE;

// For point lights and spotlights
const ATTENUATION_TERMS = {
  constant: 1.0,
  linear: 0.09,
  quadratic: 0.032
};

// For spotlights
const SPOTLIGHT_CONE_ANGLES = {
  innerCutOff: glMatrix.toRadian(12.5),
  outerCutOff: glMatrix.toRadian(17.5)
};

// prettier-ignore
const containerPositions: vec3[] = [
    vec3.fromValues( 0.0,  0.0,  0.0),
    vec3.fromValues( 2.0,  5.0, -15.0),
    vec3.fromValues(-1.5, -2.2, -2.5),
    vec3.fromValues(-3.8, -2.0, -12.3),
    vec3.fromValues( 2.4, -0.4, -3.5),
    vec3.fromValues(-1.7,  3.0, -7.5),
    vec3.fromValues( 1.3, -2.0, -2.5),
    vec3.fromValues( 1.5,  2.0, -2.5),
    vec3.fromValues( 1.5,  0.2, -1.5),
    vec3.fromValues(-1.3,  1.0, -1.5),
];

const pointLightPositions = [
  vec3.fromValues(0.7, 0.2, 2.0),
  vec3.fromValues(2.3, -3.3, -4.0),
  vec3.fromValues(-4.0, 2.0, -12.0),
  vec3.fromValues(0.0, 0.0, -3.0)
];

function prepareContainerSceneObject(gl: WebGL2RenderingContext) {
  // prettier-ignore
  const containerVertices = new Float32Array([
      // positions        // texture  // normals
       -0.5, -0.5, -0.5,  0.0,  0.0,  0.0,  0.0, -1.0,
        0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  0.0, -1.0,  
        0.5,  0.5, -0.5,  1.0,  1.0,  0.0,  0.0, -1.0,
        0.5,  0.5, -0.5,  1.0,  1.0,  0.0,  0.0, -1.0,
       -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0, -1.0,
       -0.5, -0.5, -0.5,  0.0,  0.0,  0.0,  0.0, -1.0,

       -0.5, -0.5,  0.5,  0.0,  0.0,  0.0,  0.0,  1.0,
        0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  0.0,  1.0,
        0.5,  0.5,  0.5,  1.0,  1.0,  0.0,  0.0,  1.0,
        0.5,  0.5,  0.5,  1.0,  1.0,  0.0,  0.0,  1.0,
       -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  0.0,  1.0,
       -0.5, -0.5,  0.5,  0.0,  0.0,  0.0,  0.0,  1.0,

       -0.5,  0.5,  0.5,  1.0,  0.0, -1.0,  0.0,  0.0,
       -0.5,  0.5, -0.5,  1.0,  1.0, -1.0,  0.0,  0.0,
       -0.5, -0.5, -0.5,  0.0,  1.0, -1.0,  0.0,  0.0,
       -0.5, -0.5, -0.5,  0.0,  1.0, -1.0,  0.0,  0.0,
       -0.5, -0.5,  0.5,  0.0,  0.0, -1.0,  0.0,  0.0,
       -0.5,  0.5,  0.5,  1.0,  0.0, -1.0,  0.0,  0.0,

        0.5,  0.5,  0.5,  1.0,  0.0,  1.0,  0.0,  0.0,
        0.5,  0.5, -0.5,  1.0,  1.0,  1.0,  0.0,  0.0,
        0.5, -0.5, -0.5,  0.0,  1.0,  1.0,  0.0,  0.0,
        0.5, -0.5, -0.5,  0.0,  1.0,  1.0,  0.0,  0.0,
        0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  0.0,
        0.5,  0.5,  0.5,  1.0,  0.0,  1.0,  0.0,  0.0,

       -0.5, -0.5, -0.5,  0.0,  1.0,  0.0, -1.0,  0.0,
        0.5, -0.5, -0.5,  1.0,  1.0,  0.0, -1.0,  0.0,
        0.5, -0.5,  0.5,  1.0,  0.0,  0.0, -1.0,  0.0,
        0.5, -0.5,  0.5,  1.0,  0.0,  0.0, -1.0,  0.0,
       -0.5, -0.5,  0.5,  0.0,  0.0,  0.0, -1.0,  0.0,
       -0.5, -0.5, -0.5,  0.0,  1.0,  0.0, -1.0,  0.0,

       -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  1.0,  0.0,
        0.5,  0.5, -0.5,  1.0,  1.0,  0.0,  1.0,  0.0,
        0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,
        0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,
       -0.5,  0.5,  0.5,  0.0,  0.0,  0.0,  1.0,  0.0,
       -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  1.0,  0.0,
    ]);

  const positionComponentsPerVertex = 3;
  const normalComponentsPerVertex = 3;
  const textureCoordComponentsPerVertex = 2;

  const containerTotalComponentsPerVertex =
    positionComponentsPerVertex + normalComponentsPerVertex + textureCoordComponentsPerVertex;
  const containerStride = containerTotalComponentsPerVertex * containerVertices.BYTES_PER_ELEMENT;

  const containerAttributeConfigs: VertexAttributeConfig[] = [
    {
      name: "position",
      numberOfComponents: positionComponentsPerVertex,
      type: gl.FLOAT,
      stride: containerStride,
      normalize: false,
      offset: 0
    },
    {
      name: "textureCoord",
      numberOfComponents: textureCoordComponentsPerVertex,
      type: gl.FLOAT,
      stride: containerStride,
      normalize: false,
      offset: positionComponentsPerVertex * containerVertices.BYTES_PER_ELEMENT
    },
    {
      name: "normal",
      numberOfComponents: normalComponentsPerVertex,
      type: gl.FLOAT,
      stride: containerStride,
      normalize: false,
      offset:
        (positionComponentsPerVertex + textureCoordComponentsPerVertex) *
        containerVertices.BYTES_PER_ELEMENT
    }
  ];

  const containerGeometry: Geometry = {
    vertices: containerVertices,
    attributeConfigs: containerAttributeConfigs,
    textures: [
      loadTexture(gl, "/textures/steel-border-container.png"),
      loadTexture(gl, "/textures/steel-border-container-specular.png")
    ],
    textureNames: ["material.diffuse", "material.specular"]
  };

  const container = configureSceneObject(gl, containerGeometry, {
    vertex: containerVertexShaderSource,
    fragment: containerFragmentShaderSource
  });

  if (!container) {
    return null;
  }

  // Diffuse and specular maps are set while loading the textures above, but the shininess is not
  // Since the shininess does not change much (like the textures), it can be set once here
  gl.useProgram(container.shaderProgram);
  setUniform(gl, container.shaderProgram, {
    name: "material.shininess",
    type: "float",
    value: SHININESS
  });
  gl.useProgram(null);

  container.draw = function () {
    for (let i = 0; i < containerGeometry.textures!.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, containerGeometry.textures![i]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, containerVertices.length / containerTotalComponentsPerVertex);
  };

  return container;
}

function preparePointLightCubeSceneObject(gl: WebGL2RenderingContext) {
  // prettier-ignore
  const pointLightVertices = new Float32Array([
    // positions
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,

    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,

    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,

     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,

    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,

    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
  ]);

  const positionComponentsPerVertex = 3;
  const totalComponentsPerVertex = positionComponentsPerVertex;
  const stride = totalComponentsPerVertex * pointLightVertices.BYTES_PER_ELEMENT;

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
    vertices: pointLightVertices,
    attributeConfigs
  };

  const pointLightCube = configureSceneObject(gl, geometry, {
    vertex: lightCubeVertexShaderSource,
    fragment: lightCubeFragmentShaderSource
  });

  pointLightCube!.draw = function () {
    gl.drawArrays(gl.TRIANGLES, 0, pointLightVertices.length / totalComponentsPerVertex);
  };

  return pointLightCube;
}

function calculateAmbientAndDiffuseLightColours(baseLightColour: vec3): {
  ambientColour: vec3;
  diffuseColour: vec3;
} {
  const lightDiffuse = vec3.mul(vec3.create(), baseLightColour, vec3.fromValues(0.5, 0.5, 0.5));
  const lightAmbient = vec3.mul(vec3.create(), lightDiffuse, vec3.fromValues(0.2, 0.2, 0.2));
  return { ambientColour: lightAmbient, diffuseColour: lightDiffuse };
}

function setDirectionalLightUniforms(
  gl: WebGL2RenderingContext,
  containerShaderProgram: WebGLShader,
  lightDirection: vec3,
  ambientColour: vec3,
  diffuseColour: vec3,
  uniformBaseName: string = "directionalLight"
) {
  gl.useProgram(containerShaderProgram);

  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.direction`,
    type: "vec3",
    value: lightDirection
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.ambient`,
    type: "vec3",
    value: ambientColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.diffuse`,
    type: "vec3",
    value: diffuseColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.specular`,
    type: "vec3",
    value: SPECULAR_HIGHLIGHT_COLOUR
  });

  gl.useProgram(null);
}

function setPointLightUniforms(
  gl: WebGL2RenderingContext,
  containerShaderProgram: WebGLShader,
  lightPosition: vec3,
  ambientColour: vec3,
  diffuseColour: vec3,
  specularHighlightColour: vec3 = SPECULAR_HIGHLIGHT_COLOUR,
  attenuationTerms: {
    constant: number;
    linear: number;
    quadratic: number;
  } = ATTENUATION_TERMS,
  uniformBaseName: string = "pointLight"
) {
  gl.useProgram(containerShaderProgram);

  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.position`,
    type: "vec3",
    value: lightPosition
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.ambient`,
    type: "vec3",
    value: ambientColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.diffuse`,
    type: "vec3",
    value: diffuseColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.specular`,
    type: "vec3",
    value: specularHighlightColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.constant`,
    type: "float",
    value: attenuationTerms.constant
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.linear`,
    type: "float",
    value: attenuationTerms.linear
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.quadratic`,
    type: "float",
    value: attenuationTerms.quadratic
  });

  gl.useProgram(null);
}
function setSpotlightUniforms(
  gl: WebGL2RenderingContext,
  containerShaderProgram: WebGLShader,
  cameraPosition: vec3,
  lightDirection: vec3,
  ambientColour: vec3,
  diffuseColour: vec3,
  specularHighlightColour: vec3 = SPECULAR_HIGHLIGHT_COLOUR,
  attenuationTerms: {
    constant: number;
    linear: number;
    quadratic: number;
  } = ATTENUATION_TERMS,
  spotlightCutOffAngles: {
    innerCutOff: number;
    outerCutOff: number;
  } = SPOTLIGHT_CONE_ANGLES,
  uniformBaseName: string = "spotlight"
) {
  gl.useProgram(containerShaderProgram);

  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.position`,
    type: "vec3",
    value: cameraPosition
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.direction`,
    type: "vec3",
    value: lightDirection
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.cutOffCosine`,
    type: "float",
    value: Math.cos(spotlightCutOffAngles.innerCutOff)
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.outerCutOffCosine`,
    type: "float",
    value: Math.cos(spotlightCutOffAngles.outerCutOff)
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.ambient`,
    type: "vec3",
    value: ambientColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.diffuse`,
    type: "vec3",
    value: diffuseColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.specular`,
    type: "vec3",
    value: specularHighlightColour
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.constant`,
    type: "float",
    value: attenuationTerms.constant
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.linear`,
    type: "float",
    value: attenuationTerms.linear
  });
  setUniform(gl, containerShaderProgram, {
    name: `${uniformBaseName}.quadratic`,
    type: "float",
    value: attenuationTerms.quadratic
  });

  gl.useProgram(null);
}

function drawMultipleContainers(
  gl: WebGL2RenderingContext,
  renderTime: RenderTime,
  container: SceneObject,
  containerShaderProgram: WebGLShader,
  view: mat4,
  projection: mat4,
  containerPositions: vec3[]
) {
  gl.bindVertexArray(container.vertexArrayObject);
  gl.useProgram(containerShaderProgram);

  const timeInSeconds = renderTime.previousTime / 1000;
  setUniform(gl, containerShaderProgram, {
    name: "view",
    type: "mat4-float",
    value: view
  });
  setUniform(gl, containerShaderProgram, {
    name: "projection",
    type: "mat4-float",
    value: projection
  });

  for (let i = 0; i < containerPositions.length; i++) {
    const position = containerPositions[i];
    const model = mat4.create();
    const angle = 20 * i;
    mat4.rotate(
      model,
      model,
      glMatrix.toRadian(angle * timeInSeconds * 0.1),
      vec3.fromValues(1.0, 0.3, 0.5)
    );
    mat4.translate(model, model, position);
    setUniform(gl, container.shaderProgram, {
      name: "model",
      type: "mat4-float",
      value: model
    });
    container.draw?.();
  }

  gl.useProgram(null);
  gl.bindVertexArray(null);
}

function drawPointLights(
  gl: WebGL2RenderingContext,
  view: mat4,
  projection: mat4,
  pointLightCube: SceneObject,
  pointLightShaderProgram: WebGLShader,
  containerShaderProgram: WebGLShader
) {
  gl.bindVertexArray(pointLightCube.vertexArrayObject);
  gl.useProgram(pointLightShaderProgram);

  setUniform(gl, pointLightShaderProgram, {
    name: "view",
    type: "mat4-float",
    value: view
  });
  setUniform(gl, pointLightShaderProgram, {
    name: "projection",
    type: "mat4-float",
    value: projection
  });

  const { ambientColour, diffuseColour } = calculateAmbientAndDiffuseLightColours(WHITE);

  for (let i = 0; i < pointLightPositions.length; i++) {
    gl.useProgram(pointLightShaderProgram);
    const position = pointLightPositions[i];
    const model = mat4.create();
    mat4.translate(model, model, position);
    mat4.scale(model, model, vec3.fromValues(0.2, 0.2, 0.2));
    setUniform(gl, pointLightShaderProgram, {
      name: "model",
      type: "mat4-float",
      value: model
    });
    setUniform(gl, pointLightShaderProgram, {
      name: "lightColour",
      type: "vec3",
      value: WHITE
    });

    pointLightCube.draw?.();

    setPointLightUniforms(
      gl,
      containerShaderProgram,
      position,
      ambientColour,
      diffuseColour,
      SPECULAR_HIGHLIGHT_COLOUR,
      ATTENUATION_TERMS,
      `pointLights[${i}]`
    );
  }
  gl.useProgram(null);
  gl.bindVertexArray(null);
}

const multipleLights: RenderWrapper = (canvas) => {
  const result = setupWebGLContextWithCanvasResize(canvas);
  if (!result) {
    return () => {};
  }

  const { gl, resizeHandlerCleanup } = result;

  const container = prepareContainerSceneObject(gl);
  if (!container) {
    alert("Unable to configure geometry for container");
    return resizeHandlerCleanup;
  }

  const pointLightCube = preparePointLightCubeSceneObject(gl);
  if (!pointLightCube) {
    alert("Unable to configure geometry for point light cube");
    return resizeHandlerCleanup;
  }

  // The id of each requestAnimationFrame call, used to cancel the animation on cleanup
  let requestId: number;
  let initialCameraPosition = vec3.fromValues(3.51, 1.65, 8.4);
  let camera = new Camera(initialCameraPosition, undefined, { yaw: -112.6, pitch: -12.6 });

  const renderTime: RenderTime = {
    previousTime: 0,
    deltaTime: 0
  };
  const mouseState: CameraControlMouseState = {
    lastMousePos: { x: canvas.width / 2, y: canvas.height / 2 },
    isMouseDown: false
  };

  const cameraHandlersCleanup = setupCameraInputEventHandlers(
    canvas,
    renderTime,
    camera,
    mouseState
  );

  function render(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, currentTime: number = 0) {
    if (!container) {
      alert("Cannot draw scene object.");
      return;
    }

    if (!container.draw) {
      alert("Cannot draw scene object.");
      return;
    }

    if (!pointLightCube) {
      alert("Cannot draw point light object.");
      return;
    }

    if (!pointLightCube.draw) {
      alert("Cannot draw point light object.");
      return;
    }

    updateRenderTime(renderTime, currentTime);

    const view = mat4.create();
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

    const { ambientColour, diffuseColour } = calculateAmbientAndDiffuseLightColours(WHITE);
    setDirectionalLightUniforms(
      gl,
      container.shaderProgram,
      vec3.fromValues(-0.2, -1.0, -0.3),
      ambientColour,
      diffuseColour
    );
    setSpotlightUniforms(
      gl,
      container.shaderProgram,
      camera.position,
      camera.front,
      ambientColour,
      diffuseColour
    );

    drawPointLights(
      gl,
      view,
      projection,
      pointLightCube,
      pointLightCube.shaderProgram,
      container.shaderProgram
    );

    drawMultipleContainers(
      gl,
      renderTime,
      container,
      container.shaderProgram,
      view,
      projection,
      containerPositions
    );

    requestId = requestAnimationFrame((currentTime) => render(gl, canvas, currentTime));
  }

  resizeCanvas(canvas, gl, window.innerWidth, window.innerHeight);
  requestId = requestAnimationFrame((currentTime) => render(gl, canvas, currentTime));

  return () => {
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    cameraHandlersCleanup();
    resizeHandlerCleanup();
    cancelAnimationFrame(requestId);
  };
};

export default multipleLights;
