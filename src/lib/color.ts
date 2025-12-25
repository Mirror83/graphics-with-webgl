export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export const Colors = {
  darkBluishGreen: { r: 0.2, g: 0.3, b: 0.3, a: 1.0 }
};

const MAX_COLOUR_VALUE = 255;

function componentToHex(c: number): string {
  return Math.floor(c * MAX_COLOUR_VALUE)
    .toString(16)
    .padStart(2, "0");
}

export function toHexColourString(color: Color): string {
  const r = componentToHex(color.r);
  const g = componentToHex(color.g);
  const b = componentToHex(color.b);
  const a = componentToHex(color.a);
  return `#${r}${g}${b}${a}`;
}

export const defaultClearColor = Colors.darkBluishGreen;
