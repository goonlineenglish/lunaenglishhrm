import test from "node:test";
import assert from "node:assert/strict";

import { getNextRetryDelay } from "../lib/integrations/message-queue-backoff.ts";

test("message queue backoff follows expected sequence", () => {
  assert.equal(getNextRetryDelay(0), 1);
  assert.equal(getNextRetryDelay(1), 5);
  assert.equal(getNextRetryDelay(2), 30);
  assert.equal(getNextRetryDelay(3), 300);
  assert.equal(getNextRetryDelay(4), 3600);
});

test("message queue backoff is capped at max delay", () => {
  assert.equal(getNextRetryDelay(10), 3600);
});
