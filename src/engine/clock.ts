export type Clock = () => number;

export const wallClock: Clock = () => Date.now();
