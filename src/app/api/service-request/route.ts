import { NextResponse } from "next/server";

// Server-to-server bridge: the concierge form posts here, and this route
// forwards the request to the Albesat ERP public booking endpoint so the
// order lands in the ERP admin panel (Orders tab, source = Website).
//
// ERP_API_URL should point at the ERP FastAPI service. Both sites run on the
// same server; from inside this container the host is reachable via
// host.docker.internal (add `extra_hosts: ["host.docker.internal:host-gateway"]`
// in docker-compose) — the public IP below is only the fallback.
const ERP_API = process.env.ERP_API_URL ?? "http://49.13.160.62:8010/api/v1";

interface ServiceRequestBody {
  fullName?: string;
  phone?: string;
  email?: string;
  service?: string;
  notes?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

function erpErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    // FastAPI validation errors: {"detail": [{loc, msg, ...}]}
    if (Array.isArray(d.detail) && d.detail.length > 0) {
      const first = d.detail[0] as Record<string, unknown>;
      const loc = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
      const msg = typeof first.msg === "string" ? first.msg : "invalid value";
      return loc ? `${loc}: ${msg}` : msg;
    }
    if (typeof d.detail === "string") return d.detail;
  }
  return `Booking failed (${status}). Please try again.`;
}

export async function POST(req: Request) {
  let body: ServiceRequestBody;
  try {
    body = (await req.json()) as ServiceRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fullName = body.fullName?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  if (fullName.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (phone.length < 8) {
    return NextResponse.json(
      { error: "Please enter a valid Oman phone number (+968…)." },
      { status: 400 },
    );
  }
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json(
      { error: "Please select your pickup location on the map." },
      { status: 400 },
    );
  }

  // The ERP address field is required (min 5 chars); fall back to the pinned
  // coordinates when the map picker returned no street address.
  const address =
    (body.address ?? "").trim().length >= 5
      ? (body.address as string).trim()
      : `Pinned location: ${body.lat.toFixed(5)}, ${body.lng.toFixed(5)}`;

  // The ERP wash tiers are standard | premium | antique; the actual requested
  // service from the site's full catalogue is carried in the notes so the
  // admin sees exactly what was asked for.
  const notes = [
    body.service ? `Requested service: ${body.service}` : "",
    (body.notes ?? "").trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    full_name: fullName,
    phone,
    customer_email: body.email?.trim() || null,
    pickup_address: address,
    latitude: body.lat,
    longitude: body.lng,
    service_type: "standard",
    notes: notes || null,
  };

  let res: Response;
  try {
    res = await fetch(`${ERP_API}/orders/public/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Booking service is unreachable. Please try again shortly." },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: erpErrorMessage(data, res.status) }, { status: res.status });
  }

  return NextResponse.json({
    tracking_code: data?.tracking_code ?? null,
    message: data?.message ?? "Booking request received.",
  });
}
