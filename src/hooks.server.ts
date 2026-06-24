import type { Handle } from '@sveltejs/kit';
import { startWipPoller } from '$lib/server/wipStore';

let pollerStarted = false;

export const handle: Handle = async ({ event, resolve }) => {
  if (!pollerStarted) {
    pollerStarted = true;
    startWipPoller();
  }
  return resolve(event);
};
