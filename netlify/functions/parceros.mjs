import { getStore } from "@netlify/blobs";

// Permite llamar la API desde cualquier dispositivo u origen
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });

export default async (req, context) => {
  const store = getStore({ name: "parceros", consistency: "strong" });
  const id = context.params?.id;

  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // GET /parceros  -> lista todos
    // GET /parceros/:id -> uno solo
    if (req.method === "GET") {
      if (id) {
        const parcero = await store.get(id, { type: "json" });
        return parcero ? json(parcero) : json({ error: "Parcero no encontrado" }, 404);
      }
      const { blobs } = await store.list();
      const parceros = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
      return json(parceros.filter(Boolean));
    }

    // POST /parceros  body: { "nombre": "...", "ciudad": "...", "habilidad": "..." }
    if (req.method === "POST" && !id) {
      const body = await req.json().catch(() => null);
      if (!body?.nombre || typeof body.nombre !== "string") {
        return json({ error: "El campo 'nombre' es obligatorio" }, 400);
      }
      const parcero = {
        id: crypto.randomUUID(),
        nombre: body.nombre.trim().slice(0, 100),
        ciudad: String(body.ciudad ?? "").trim().slice(0, 100),
        habilidad: String(body.habilidad ?? "").trim().slice(0, 200),
        creadoEn: new Date().toISOString(),
      };
      await store.setJSON(parcero.id, parcero);
      return json(parcero, 201);
    }

    // DELETE /parceros/:id
    if (req.method === "DELETE" && id) {
      const existe = await store.get(id);
      if (!existe) return json({ error: "Parcero no encontrado" }, 404);
      await store.delete(id);
      return json({ ok: true, eliminado: id });
    }

    return json({ error: "Método no permitido" }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};

// Rutas públicas: rebuska.online/parceros y rebuska.online/parceros/:id
export const config = { path: ["/parceros", "/parceros/:id"] };