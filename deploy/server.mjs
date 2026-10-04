import { createServer } from "node:http";

const port = Number(process.env.PORT || 8080);

const server = createServer((req, res) => {
  if (req.url === "/api/health" || req.url === "/") {
    const body = JSON.stringify({
      ok: true,
      service: "professional-buyer",
      app: "professionalbuyer",
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { code: "not_found", message: "not found" } }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`listening on 0.0.0.0:${port}`);
});
