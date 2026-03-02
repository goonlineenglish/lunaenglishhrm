import test from "node:test";
import assert from "node:assert/strict";

import {
  getFacebookIdempotencyFields,
  getZaloMessageId,
} from "../lib/integrations/webhook-idempotency.ts";

test("facebook idempotency fields are derived from entry id + time", () => {
  const fields = getFacebookIdempotencyFields({
    id: 123456,
    time: 1700000000,
  });

  assert.deepEqual(fields, {
    entryId: "123456",
    entryTime: "1700000000",
  });
});

test("facebook idempotency fields return null when id or time is missing", () => {
  assert.equal(getFacebookIdempotencyFields({ id: 1 }), null);
  assert.equal(getFacebookIdempotencyFields({ time: 1 }), null);
});

test("zalo message id is extracted from nested message payload", () => {
  assert.equal(
    getZaloMessageId({
      message: { msg_id: 9876543210 },
    }),
    "9876543210"
  );
});

test("zalo message id returns null when missing", () => {
  assert.equal(getZaloMessageId({}), null);
});
