/** The price-watch Sprite that already exists. Do not create a second one. */
export const SPRITE_TARGET = {
  org: "stefano94120",
  name: "buyer-worker",
  url: "https://buyer-worker-b3y4b.sprites.app",
} as const;

export function assertExistingSprite(names: readonly string[], wanted = SPRITE_TARGET.name): void {
  if (!names.includes(wanted)) {
    throw new Error(`Sprite ${wanted} is not in this org. Refusing to create a second sprite.`);
  }
}

export function assertSpriteUrl(actual: string, expected = SPRITE_TARGET.url): void {
  const norm = (u: string) => u.replace(/\/$/, "");
  if (norm(actual) !== norm(expected)) {
    throw new Error(`Sprite URL ${actual} is not ${expected}. Refusing to deploy elsewhere.`);
  }
}
