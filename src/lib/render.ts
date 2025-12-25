type EventHandlerCleanup = () => void;
export type RenderWrapper = (canvas: HTMLCanvasElement) => EventHandlerCleanup;

type SceneDetails = {
  name: string;
  route: string;
  description?: string;
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
  }
];
