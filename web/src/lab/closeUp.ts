import type { LabContext } from "./modelLab";

/** Close-up section placeholder; the rigid astronaut rig is added in the next commit. */
export async function initCloseUp(_ctx: LabContext, container: HTMLElement): Promise<void> {
  container.textContent = "Close-up: not available yet.";
}

export function setCloseUpActive(_active: boolean): void {}
