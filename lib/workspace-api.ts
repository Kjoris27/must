import type { Database } from "./db";

type User = { id: string; email: string; name: string };
type Dependencies = {
  db: Database;
  getUser: (request: Request) => Promise<User | null>;
};
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const str = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const safeURL = (value: unknown) => {
  const text = str(value, 2000);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
const roomWhere = "SELECT room_id FROM members WHERE user_id=$1";

export function createWorkspaceAPI({ db, getUser }: Dependencies) {
  return {
    async GET(request: Request) {
      try {
        const user = await getUser(request);
        if (!user) return json({ authenticated: false }, 401);
        const rows = await Promise.all([
          db.query("SELECT * FROM profiles WHERE id=$1", [user.id]),
          db.query(
            `SELECT * FROM rooms WHERE id IN (${roomWhere}) ORDER BY created_at DESC`,
            [user.id],
          ),
          db.query(
            `SELECT m.*,p.name FROM members m JOIN profiles p ON p.id=m.user_id WHERE m.room_id IN (${roomWhere})`,
            [user.id],
          ),
          db.query(`SELECT * FROM resources WHERE room_id IN (${roomWhere})`, [
            user.id,
          ]),
          db.query(
            `SELECT c.* FROM completions c JOIN resources r ON r.id=c.resource_id WHERE r.room_id IN (${roomWhere})`,
            [user.id],
          ),
          db.query(
            `SELECT c.*,p.name FROM checkins c JOIN profiles p ON p.id=c.user_id WHERE c.room_id IN (${roomWhere}) ORDER BY c.created_at DESC LIMIT 150`,
            [user.id],
          ),
          db.query(
            `SELECT x.* FROM reactions x JOIN checkins c ON c.id=x.checkin_id WHERE c.room_id IN (${roomWhere})`,
            [user.id],
          ),
          db.query(
            `SELECT * FROM sessions WHERE room_id IN (${roomWhere}) ORDER BY created_at DESC LIMIT 1000`,
            [user.id],
          ),
          db.query(
            `SELECT * FROM plans WHERE room_id IN (${roomWhere}) ORDER BY starts_at`,
            [user.id],
          ),
        ]);
        return json({
          authenticated: true,
          user: {
            id: user.id,
            name: rows[0][0]?.name || user.name || user.email.split("@")[0],
          },
          rooms: rows[1],
          members: rows[2],
          resources: rows[3],
          completions: rows[4],
          checkins: rows[5],
          reactions: rows[6],
          sessions: rows[7],
          plans: rows[8],
        });
      } catch (error) {
        console.error(
          "Workspace read failed",
          error instanceof Error ? error.name : "UnknownError",
        );
        return json(
          {
            error:
              "Impossible de charger ton espace. Réessaie dans un instant.",
          },
          503,
        );
      }
    },
    async POST(request: Request) {
      try {
        const origin = request.headers.get("origin");
        if (
          (origin && origin !== new URL(request.url).origin) ||
          request.headers.get("sec-fetch-site") === "cross-site"
        )
          return json({ error: "Origine non autorisée." }, 403);
        const user = await getUser(request);
        if (!user)
          return json(
            { error: "Connecte-toi pour enregistrer ton espace." },
            401,
          );
        if (
          !request.headers.get("content-type")?.startsWith("application/json")
        )
          return json({ error: "Contenu JSON attendu." }, 415);
        if (Number(request.headers.get("content-length") || 0) > 30000)
          return json({ error: "Contenu trop volumineux." }, 413);
        const text = await request.text();
        if (new TextEncoder().encode(text).length > 30000)
          return json({ error: "Contenu trop volumineux." }, 413);
        let payload: unknown;
        try {
          payload = JSON.parse(text);
        } catch {
          return json({ error: "Contenu invalide." }, 400);
        }
        if (!payload || typeof payload !== "object" || Array.isArray(payload))
          return json({ error: "Contenu invalide." }, 400);
        const p = payload as Record<string, unknown>;
        const action = str(p.action);
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const uid = user.id;
        await db.query(
          "INSERT INTO profiles(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [uid, str(user.name || user.email.split("@")[0], 60) || "Membre"],
        );
        if (action === "profile") {
          const name = str(p.name, 60);
          if (!name) return json({ error: "Indique ton prénom." }, 400);
          await db.query("UPDATE profiles SET name=$1 WHERE id=$2", [
            name,
            uid,
          ]);
          return json({ ok: true });
        }
        if (action === "createRoom") {
          const name = str(p.name, 80);
          if (!name) return json({ error: "Donne un nom à ta room." }, 400);
          const color = ["blue", "violet", "green", "orange"].includes(
            str(p.color),
          )
            ? str(p.color)
            : "green";
          await db.transaction(async (tx) => {
            await tx.query(
              "INSERT INTO rooms(id,name,description,topic,color,invite,owner,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
              [
                id,
                name,
                str(p.description, 400),
                str(p.topic, 40) || "Tech",
                color,
                crypto.randomUUID(),
                uid,
                now,
              ],
            );
            await tx.query(
              "INSERT INTO members(room_id,user_id,joined_at) VALUES($1,$2,$3)",
              [id, uid, now],
            );
          });
          return json({ ok: true, id });
        }
        if (action === "joinRoom") {
          const rooms = await db.query("SELECT id FROM rooms WHERE invite=$1", [
            str(p.invite, 100),
          ]);
          if (!rooms[0])
            return json(
              { error: "Ce lien d’invitation est introuvable." },
              404,
            );
          await db.query(
            "INSERT INTO members(room_id,user_id,joined_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [rooms[0].id, uid, now],
          );
          return json({ ok: true, id: rooms[0].id });
        }
        const roomId = str(p.roomId, 100);
        if (
          !(
            await db.query(
              "SELECT 1 FROM members WHERE room_id=$1 AND user_id=$2",
              [roomId, uid],
            )
          ).length
        )
          return json({ error: "Tu ne fais pas partie de cette room." }, 403);
        if (action === "addResource") {
          const title = str(p.title, 150);
          const modules = Array.isArray(p.modules)
            ? p.modules
                .map((value) => str(value, 180))
                .filter(Boolean)
                .slice(0, 150)
            : [];
          if (!title || !modules.length)
            return json(
              { error: "Ajoute un titre et au moins une étape." },
              400,
            );
          const url = safeURL(p.url);
          if (p.url && !url)
            return json(
              { error: "Le lien doit commencer par https:// ou http://." },
              400,
            );
          const dueDate = str(p.dueDate);
          if (
            dueDate &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
              !Number.isFinite(new Date(dueDate).getTime()) ||
              new Date(dueDate).toISOString().slice(0, 10) !== dueDate)
          )
            return json({ error: "Échéance invalide." }, 400);
          await db.query(
            "INSERT INTO resources(id,room_id,title,url,kind,modules,due_date,created_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)",
            [
              id,
              roomId,
              title,
              url,
              str(p.kind, 40) || "Formation",
              JSON.stringify(modules),
              dueDate,
              uid,
            ],
          );
          return json({ ok: true, id });
        }
        if (
          action === "toggleModule" ||
          action === "checkin" ||
          action === "session"
        ) {
          const resource = p.resourceId
            ? (
                await db.query(
                  "SELECT * FROM resources WHERE id=$1 AND room_id=$2",
                  [str(p.resourceId, 100), roomId],
                )
              )[0]
            : null;
          if (p.resourceId && !resource)
            return json(
              { error: "Objectif introuvable dans cette room." },
              404,
            );
          if (action === "toggleModule") {
            const index = p.index;
            if (
              !resource ||
              typeof index !== "number" ||
              !Number.isInteger(index) ||
              index < 0 ||
              index >= resource.modules.length ||
              typeof p.completed !== "boolean"
            )
              return json({ error: "Étape invalide." }, 400);
            if (p.completed)
              await db.query(
                "INSERT INTO completions(resource_id,user_id,module_index,created_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
                [resource.id, uid, index, now],
              );
            else
              await db.query(
                "DELETE FROM completions WHERE resource_id=$1 AND user_id=$2 AND module_index=$3",
                [resource.id, uid, index],
              );
            return json({ ok: true });
          }
          if (action === "checkin") {
            const content = str(p.text, 2500);
            if (!content)
              return json({ error: "Raconte ce que tu as appris." }, 400);
            const link = safeURL(p.link);
            if (p.link && !link)
              return json({ error: "Ajoute un lien web valide." }, 400);
            await db.query(
              "INSERT INTO checkins(id,room_id,user_id,resource_id,text,link,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
              [id, roomId, uid, resource?.id || null, content, link, now],
            );
            return json({ ok: true, id });
          }
          const seconds = Math.round(Number(p.seconds));
          if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400)
            return json({ error: "Durée de session invalide." }, 400);
          const sessionId = /^[a-z0-9-]{10,80}$/i.test(str(p.sessionId, 81))
            ? str(p.sessionId, 80)
            : id;
          const inserted = await db.query(
            "INSERT INTO sessions(id,room_id,user_id,resource_id,seconds,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id",
            [sessionId, roomId, uid, resource?.id || null, seconds, now],
          );
          if (!inserted.length) {
            const previous = (
              await db.query(
                "SELECT user_id,room_id FROM sessions WHERE id=$1",
                [sessionId],
              )
            )[0];
            if (previous?.user_id !== uid || previous?.room_id !== roomId)
              return json(
                { error: "Identifiant de session déjà utilisé." },
                409,
              );
          }
          return json({ ok: true });
        }
        if (action === "react" || action === "approve") {
          const post = (
            await db.query(
              "SELECT * FROM checkins WHERE id=$1 AND room_id=$2",
              [str(p.checkinId, 100), roomId],
            )
          )[0];
          if (!post) return json({ error: "Check-in introuvable." }, 404);
          if (action === "approve") {
            if (post.user_id === uid)
              return json(
                { error: "Un autre membre doit valider ton travail." },
                400,
              );
            if (!post.link)
              return json(
                { error: "Ce check-in ne contient pas de preuve à examiner." },
                400,
              );
            await db.query(
              "UPDATE checkins SET approved_by=$1 WHERE id=$2 AND approved_by IS NULL",
              [uid, post.id],
            );
          } else {
            await db.transaction(async (tx) => {
              await tx.query("SELECT id FROM checkins WHERE id=$1 FOR UPDATE", [
                post.id,
              ]);
              const existing = await tx.query(
                "DELETE FROM reactions WHERE checkin_id=$1 AND user_id=$2 RETURNING checkin_id",
                [post.id, uid],
              );
              if (!existing.length)
                await tx.query(
                  "INSERT INTO reactions(checkin_id,user_id) VALUES($1,$2)",
                  [post.id, uid],
                );
            });
          }
          return json({ ok: true });
        }
        if (action === "addPlan") {
          const title = str(p.title, 150);
          const date = new Date(str(p.startsAt));
          const minutes = Number(p.minutes);
          if (
            !title ||
            !Number.isFinite(date.getTime()) ||
            date.getTime() < Date.now() - 60000 ||
            !Number.isInteger(minutes) ||
            minutes < 5 ||
            minutes > 240
          )
            return json(
              {
                error:
                  "Choisis un créneau futur et une durée de 5 à 240 minutes.",
              },
              400,
            );
          await db.query(
            "INSERT INTO plans(id,room_id,user_id,title,starts_at,minutes) VALUES($1,$2,$3,$4,$5,$6)",
            [id, roomId, uid, title, date.toISOString(), minutes],
          );
          return json({ ok: true, id });
        }
        return json({ error: "Action inconnue." }, 400);
      } catch (error) {
        console.error(
          "Workspace write failed",
          error instanceof Error ? error.name : "UnknownError",
        );
        return json(
          { error: "L’enregistrement a échoué. Réessaie dans un instant." },
          500,
        );
      }
    },
  };
}
