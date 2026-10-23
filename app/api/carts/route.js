export async function GET() {
  return Response.json({
    ok: true,
    storage: "browser-local-storage",
    message:
      "Cart items are stored in this browser. Open /cart to view or update them.",
  });
}
