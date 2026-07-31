// $$Name$$ backend - Cloudflare Worker entry (generated once; this file is
// yours to edit). STARTING POINT: Workers use a fetch handler rather than
// a long-lived process - adapt the gateway wiring (src/env/lambda/lambda.ts
// is the AWS equivalent) to route requests into Seneca here.

export default {
  async fetch(_request: Request, _env: unknown, _ctx: unknown) {
    return new Response(JSON.stringify({
      ok: false,
      why: '$$name$$-backend worker entry not yet wired',
    }), { status: 501, headers: { 'content-type': 'application/json' } })
  },
}
