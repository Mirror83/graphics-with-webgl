const BYTES_IN_FLOAT = 4;
type SizeofType = "float";

class SizeofError extends Error {}

export function sizeof(type: SizeofType) {
  switch (type) {
    case "float":
      return BYTES_IN_FLOAT;
    default:
      throw new SizeofError("Unsupported type.");
  }
}
