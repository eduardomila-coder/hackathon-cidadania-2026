import { consultarProcessoTjpr, dataJudConfigurado, ErroDataJud } from "@/lib/datajud";

export const dynamic = "force-dynamic";

export function GET() { return Response.json({ configurado: dataJudConfigurado(), fonte: "DataJud público · TJPR" }); }

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null) as { numero?: string } | null;
  try {
    return Response.json(await consultarProcessoTjpr(corpo?.numero ?? ""));
  } catch (e) {
    if (e instanceof ErroDataJud) return Response.json({ erro: e.message }, { status: e.status });
    console.error("datajud:", e);
    return Response.json({ erro: "Não foi possível consultar a movimentação agora." }, { status: 502 });
  }
}
