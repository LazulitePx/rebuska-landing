import { getStore } from "@netlify/blobs";

// Permite llamar la API desde cualquier dispositivo u origen
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });

const texto = (valor, max) => String(valor ?? "").trim().slice(0, max);

export default async (req, context) => {
  const store = getStore({ name: "parceros", consistency: "strong" });
  const id = context.params?.id;

  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // READ: GET /parceros (todos) o GET /parceros/:id (uno)
    if (req.method === "GET") {
      if (id) {
        const parcero = await store.get(id, { type: "json" });
        return parcero ? json(parcero) : json({ error: "Parcero no encontrado" }, 404);
      }
      const { blobs } = await store.list();
      const parceros = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
      return json(parceros.filter(Boolean));
    }

    // CREATE: POST /parceros
    if (req.method === "POST" && !id) {
      const body = await req.json().catch(() => null);
      if (!body?.nombre || !texto(body.nombre, 100)) {
        return json({ error: "El campo 'nombre' es obligatorio" }, 400);
      }
      const parcero = {
        id: crypto.randomUUID(),
        nombre: texto(body.nombre, 100),
        ciudad: texto(body.ciudad, 100),
        habilidad: texto(body.habilidad, 200),
        creadoEn: new Date().toISOString(),
      };
      await store.setJSON(parcero.id, parcero);
      return json(parcero, 201);
    }

    // UPDATE: PUT /parceros/:id (solo cambia los campos que envíes)
    if (req.method === "PUT" && id) {
      const actual = await store.get(id, { type: "json" });
      if (!actual) return json({ error: "Parcero no encontrado" }, 404);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Envía un JSON con los campos a cambiar" }, 400);
      if (body.nombre !== undefined && !texto(body.nombre, 100)) {
        return json({ error: "El nombre no puede quedar vacío" }, 400);
      }
      const actualizado = {
        ...actual,
        ...(body.nombre !== undefined && { nombre: texto(body.nombre, 100) }),
        ...(body.ciudad !== undefined && { ciudad: texto(body.ciudad, 100) }),
        ...(body.habilidad !== undefined && { habilidad: texto(body.habilidad, 200) }),
        actualizadoEn: new Date().toISOString(),
      };
      await store.setJSON(id, actualizado);
      return json(actualizado);
    }

    // DELETE: DELETE /parceros/:id
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
export const config = { path: ["/api/parceros", "/api/parceros/:id"] };