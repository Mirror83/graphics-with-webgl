/**
 * Chooses a random item from a list of items.
 * The probability of each item being chosen is proportional to its weight if provided, otherwise all items are equally likely.
 *
 * Inspired by Python's {@link https://docs.python.org/3/library/random.html#random.choices|`random.choices`} function.
 */
function choice<T>(items: readonly T[], weights?: number[]): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from an empty array");
  }

  const cumulativeWeights = [];
  let sum = 0;

  if (!weights) {
    weights = items.map(() => 1);
  } else if (weights.length !== items.length) {
    throw new Error("Weights array length must match items array length");
  }

  for (const weight of weights) {
    sum += weight;
    cumulativeWeights.push(sum);
  }

  const random = Math.random() * sum;

  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return items[i];
    }
  }
  // Fallback in case of rounding errors
  return items[items.length - 1];
}

/**
 * Returns a random number between `min` and `max` (inclusive of min, exclusive of max).
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_number_between_two_values */
function range(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export const Random = { choice, range };
