export default {
  fetch(): Response {
    return Response.json(
      { ok: false, service: "genba-ai-bootstrap", ready: false },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  },
};
