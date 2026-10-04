const marker: string = "thrower";
(globalThis as { __thrower?: () => void }).__thrower = (): void => {
  throw new Error("boom from typescript");
};
console.log(marker);
