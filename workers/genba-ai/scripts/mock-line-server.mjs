import { createServer } from "node:http";

const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==", "base64");
const port = Number(process.env.MOCK_LINE_PORT ?? "8788");

createServer((request, response) => {
  if (request.url?.startsWith("/v2/bot/message/") && request.url.endsWith("/content")) {
    response.writeHead(200, { "content-type": "image/jpeg" });
    response.end(jpeg);
    return;
  }
  response.writeHead(404);
  response.end();
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`mock LINE content API listening on http://127.0.0.1:${port}\n`);
});
