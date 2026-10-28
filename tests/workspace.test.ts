import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { createAuth } from "../lib/auth";
import { createWorkspaceAPI } from "../lib/workspace-api";
import type { Database } from "../lib/db";

test("Email accounts, signed sessions and private room workflows use the real PostgreSQL queries", async () => {
  const pg = new PGlite();
  // Test-only transport: execute the pg driver's SQL against embedded Postgres.
  // No queries, authorization decisions, passwords or session results are mocked.
  const pool = {
    async connect() {
      return {
        async query(sql: string, values: unknown[] = []) {
          const result = await pg.query(sql, values);
          return {
            rows: result.rows,
            fields: result.fields,
            rowCount: result.affectedRows ?? result.rows.length,
            command: sql.trim().split(/\s/)[0].toUpperCase(),
          };
        },
        release() {},
      };
    },
    async end() {},
  } as unknown as Pool;
  const auth = createAuth(
    pool,
    "ephemeral-test-secret-with-at-least-thirty-two-characters",
    "https://test.local",
  );
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
  await pg.exec(
    await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"),
  );
  const db: Database = {
    async query(sql, values = []) {
      return (await pg.query(sql, values)).rows as never[];
    },
    async transaction(work) {
      return pg.transaction((tx) =>
        work({
          query: async (sql, values = []) =>
            (await tx.query(sql, values)).rows as never[],
          transaction: db.transaction,
        }),
      );
    },
  };
  const api = createWorkspaceAPI({
    db,
    getUser: async (request) =>
      (await auth.api.getSession({ headers: request.headers }))?.user ?? null,
  });
  const cookies: Record<string, string> = {};
  const ids: Record<string, string> = {};
  async function authRequest(path: string, payload: object, who?: string) {
    return auth.handler(
      new Request("https://test.local/api/auth/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://test.local",
          "x-real-ip": "127.0.0.1",
          ...(who ? { Cookie: cookies[who] } : {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }
  for (const name of ["alice", "bob", "charlie"]) {
    const response = await authRequest("sign-up/email", {
      email: name + "@example.test",
      password: "test-password-for-" + name,
      name,
    });
    assert.equal(response.status, 200, await response.clone().text());
    cookies[name] = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    assert.ok(cookies[name].includes("session_token"));
    ids[name] = (await response.json()).user.id;
  }
  assert.equal(
    (
      await authRequest("sign-in/email", {
        email: "alice@example.test",
        password: "wrong-password",
      })
    ).status,
    401,
  );
  const login = await authRequest("sign-in/email", {
    email: "alice@example.test",
    password: "test-password-for-alice",
  });
  assert.equal(login.status, 200);
  cookies.alice = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const get = async (who?: string) => {
    const response = await api.GET(
      new Request("https://test.local/api/workspace", {
        headers: who ? { Cookie: cookies[who] } : {},
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  const post = async (
    payload: object,
    who: string | null = "alice",
    origin = "https://test.local",
  ) => {
    const response = await api.POST(
      new Request("https://test.local/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(who ? { Cookie: cookies[who] } : {}),
        },
        body: JSON.stringify(payload),
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await get()).status, 401);
  assert.equal(
    (await post({ action: "createRoom", name: "No auth" }, null)).status,
    401,
  );
  const forged = await api.GET(
    new Request("https://test.local/api/workspace", {
      headers: {
        Cookie: "better-auth.session_token=fake.signature",
        "X-ChatGPT-User-Id": ids.alice,
      },
    }),
  );
  assert.equal(forged.status, 401);
  assert.equal(
    (
      await post(
        { action: "createRoom", name: "Wrong origin" },
        "alice",
        "https://other.test",
      )
    ).status,
    403,
  );
  const room = await post({
    action: "createRoom",
    name: "QA cloud",
    description: "Test",
    topic: "Cloud",
    color: "blue",
  });
  assert.equal(room.status, 200);
  const roomId = room.data.id;
  const first = (await get("alice")).data;
  assert.equal(first.rooms.length, 1);
  assert.equal(first.members.length, 1);
  const invite = first.rooms[0].invite;
  assert.match(invite, /^[a-f0-9-]{36}$/);
  assert.equal((await get("bob")).data.rooms.length, 0);
  assert.equal(
    (
      await post(
        { action: "addResource", roomId, title: "Hidden", modules: ["one"] },
        "bob",
      )
    ).status,
    403,
  );
  assert.equal(
    (await post({ action: "joinRoom", invite: "missing" }, "bob")).status,
    404,
  );
  assert.equal((await post({ action: "joinRoom", invite }, "bob")).status, 200);
  await post({ action: "joinRoom", invite }, "bob");
  assert.equal((await get("alice")).data.members.length, 2);
  assert.equal(
    (
      await post({
        action: "addResource",
        roomId,
        title: "Bad URL",
        modules: ["one"],
        url: "javascript:alert(1)",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post({
        action: "addResource",
        roomId,
        title: "Bad date",
        modules: ["one"],
        dueDate: "2026-02-30",
      })
    ).status,
    400,
  );
  const resource = await post({
    action: "addResource",
    roomId,
    title: "Learn AWS",
    modules: ["Learn", "Build"],
    url: "https://example.test",
    dueDate: "2026-12-01",
  });
  assert.equal(resource.status, 200);
  const resourceId = resource.data.id;
  assert.deepEqual((await get("bob")).data.resources[0].modules, [
    "Learn",
    "Build",
  ]);
  for (const index of [-1, 2, 0.5])
    assert.equal(
      (
        await post({
          action: "toggleModule",
          roomId,
          resourceId,
          index,
          completed: true,
        })
      ).status,
      400,
    );
  await post({
    action: "toggleModule",
    roomId,
    resourceId,
    index: 0,
    completed: true,
  });
  await post({
    action: "toggleModule",
    roomId,
    resourceId,
    index: 0,
    completed: true,
  });
  assert.equal((await get("alice")).data.completions.length, 1);
  await post(
    { action: "toggleModule", roomId, resourceId, index: 0, completed: false },
    "bob",
  );
  assert.equal(
    (await get("alice")).data.completions.length,
    1,
    "Bob cannot remove Alice’s completion",
  );
  await post({
    action: "toggleModule",
    roomId,
    resourceId,
    index: 0,
    completed: false,
  });
  assert.equal((await get("alice")).data.completions.length, 0);
  const checkin = await post({
    action: "checkin",
    roomId,
    resourceId,
    text: "I built a deployment.",
    link: "https://example.test/repo",
  });
  assert.equal(checkin.status, 200);
  const checkinId = checkin.data.id;
  assert.equal(
    (await post({ action: "approve", roomId, checkinId })).status,
    400,
  );
  assert.equal(
    (await post({ action: "approve", roomId, checkinId }, "charlie")).status,
    403,
  );
  assert.equal(
    (await post({ action: "approve", roomId, checkinId }, "bob")).status,
    200,
  );
  assert.equal((await get("alice")).data.checkins[0].approved_by, ids.bob);
  const noProof = await post({
    action: "checkin",
    roomId,
    text: "An update without proof.",
  });
  assert.equal(
    (
      await post(
        { action: "approve", roomId, checkinId: noProof.data.id },
        "bob",
      )
    ).status,
    400,
  );
  await post({ action: "react", roomId, checkinId }, "bob");
  assert.equal((await get("alice")).data.reactions.length, 1);
  await post({ action: "react", roomId, checkinId }, "bob");
  assert.equal((await get("alice")).data.reactions.length, 0);
  const session = {
    action: "session",
    roomId,
    resourceId,
    seconds: 120,
    sessionId: "qa-session-unique-123",
  };
  await post(session);
  await post(session);
  assert.equal((await get("alice")).data.sessions.length, 1);
  assert.equal((await post(session, "bob")).status, 409);
  assert.equal((await post({ ...session, seconds: 0 })).status, 400);
  assert.equal(
    (
      await post({
        action: "addPlan",
        roomId,
        title: "Past",
        startsAt: "2000-01-01T12:00:00Z",
        minutes: 25,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post({
        action: "addPlan",
        roomId,
        title: "Next session",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        minutes: 45,
      })
    ).status,
    200,
  );
  const other = await post(
    { action: "createRoom", name: "Other room" },
    "charlie",
  );
  assert.equal(
    (
      await post(
        {
          action: "toggleModule",
          roomId: other.data.id,
          resourceId,
          index: 0,
          completed: true,
        },
        "charlie",
      )
    ).status,
    404,
  );
  for (const key of [
    "checkins",
    "resources",
    "sessions",
    "plans",
    "completions",
  ])
    assert.equal((await get("charlie")).data[key].length, 0);
  await post({ action: "profile", name: "Alice Tech" });
  assert.equal((await get("alice")).data.user.name, "Alice Tech");
  assert.equal(
    (await get("bob")).data.members.find(
      (member: { user_id: string }) => member.user_id === ids.alice,
    ).name,
    "Alice Tech",
  );
  const invalid = await api.POST(
    new Request("https://test.local/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies.alice },
      body: "{broken",
    }),
  );
  assert.equal(invalid.status, 400);
  const oversized = await post({ action: "profile", name: "a".repeat(31000) });
  assert.equal(oversized.status, 413);
  await authRequest("sign-out", {}, "alice");
  assert.equal(
    (await get("alice")).status,
    401,
    "Signing out revokes the actual stored session",
  );
  await pg.close();
});
