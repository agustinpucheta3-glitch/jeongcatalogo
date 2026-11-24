// POST /.netlify/functions/descuento
// Body: { codigo: "XXXX", subtotal: 123456 }
// Respuestas:
//   { ok: true, codigo, tipo, valor, vence, compra_minima }
//   { ok: false, motivo: "invalido" | "inactivo" | "vencido" | "minimo", compra_minima? }
// La lista de códigos se edita en data/codigos.json (se empaqueta con la función en
// cada deploy, así nadie puede leerla desde el navegador). El vencimiento se controla
// acá, con la hora del servidor.
import lista from "../../data/codigos.json" with { type: "json" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function codigos() {
  return (Array.isArray(lista) ? lista : []).map((c) => ({
    codigo: String(c.codigo || "").trim().toUpperCase(),
    tipo: c.tipo === "monto" ? "monto" : "porcentaje",
    valor: Number(c.valor) || 0,
    activo: c.activo !== false,
    vence: c.vence ? String(c.vence) : null,
    compra_minima: c.compra_minima ? Number(c.compra_minima) : null,
  }));
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, motivo: "invalido" }, 400);
  }

  const texto = String((body && body.codigo) || "").trim().toUpperCase();
  const c = texto ? codigos().find((x) => x.codigo === texto) : null;
  if (!c || c.valor <= 0) return json({ ok: false, motivo: "invalido" });
  if (!c.activo) return json({ ok: false, motivo: "inactivo" });

  if (c.vence) {
    const hasta = Date.parse(c.vence);
    // Si la fecha está mal escrita, por seguridad se considera vencido.
    if (!Number.isFinite(hasta) || Date.now() > hasta) return json({ ok: false, motivo: "vencido" });
  }

  const subtotal = Number(body.subtotal) || 0;
  if (c.compra_minima && subtotal < c.compra_minima) {
    return json({ ok: false, motivo: "minimo", compra_minima: c.compra_minima });
  }

  return json({ ok: true, codigo: c.codigo, tipo: c.tipo, valor: c.valor, vence: c.vence, compra_minima: c.compra_minima });
};
