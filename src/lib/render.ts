import type { ShaderSources } from "~/lib/shaders";

type EventHandlerCleanup = () => void;
export type RenderWrapper = (
  canvas: HTMLCanvasElement,
  shaderSources: ShaderSources
) => EventHandlerCleanup;

type SceneDetails = {
  name: string;
  route: string;
  description?: string;
  inputInstructions?: string;
};

export const sceneDetails: SceneDetails[] = [
  {
    name: "Hello Triangle",
    route: "hello-triangle",
    description: "An orange-ish triangle"
  },
  {
    name: "Hello Triangle Indexed",
    route: "hello-triangle-indexed",
    description: "An orange-ish rectangle"
  },
  {
    name: "Hello Uniforms",
    route: "hello-uniforms",
    description: "A triangle with a uniform colour that changes over time"
  },
  {
    name: "More Attributes",
    route: "more-attributes",
    description: "A colourful triangle with per-vertex colours interpolated across its surface"
  },
  {
    name: "Hello Textures",
    route: "hello-textures",
    description: "A rectangle textured with an image of a wooden container"
  },
  {
    name: "Texture Units",
    route: "texture-units",
    description:
      "A rectangle textured with two textures (a wooden container and a smiley face picture) using texture units",
    inputInstructions:
      "Click on the canvas then use the up and down arrow keys to change the blend between the wooden container and smiley face picture. (Sorry mobile guys.)"
  },
  {
    name: "Hello Transformations",
    route: "hello-transformations",
    description:
      "Two rectangles; one at the top-left, and one at the bottom-right of the screen. The first one scales up and down, and the other rotates over time."
  },
  {
    name: "Hello 3D (No Depth Test)",
    route: "hello-3d-no-depth-test",
    description:
      "A rotating 3D cube with each face textured with an image of a wooden container and a smiley face (with depth-testing disabled, thus causing some faces to be rendered over others.)"
  },
  {
    name: "Hello 3D",
    route: "hello-3d",
    description:
      "A rotating 3D cube with each face textured with an image of a wooden container and a smiley face (and depth-testing enabled)."
  },
  {
    name: "More Cubes",
    route: "more-cubes",
    description:
      "Ten 3D cubes with each face textured with an image of a wooden container and a smiley face (and depth-testing enabled). Four of them rotate over time."
  },
  {
    name: "Camera circle",
    route: "camera-circle",
    description:
      "Simulation of a camera going in a circle while looking at the center of the scene."
  },
  {
    name: "Movable Camera",
    route: "movable-camera",
    description:
      "Click on the canvas and then use the arrow keys to move the camera forward and backward, and strafe left and right."
  }
];
