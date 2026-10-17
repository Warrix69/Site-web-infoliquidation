// One-off: kie.ai recraft/remove-background on a local image.
import fs from "node:fs";
const KEY = process.env.KIE_AI_API_KEY;
const H = { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` };
const [src, dst] = process.argv.slice(2);
const b64 = `data:image/png;base64,${fs.readFileSync(src).toString("base64")}`;
const up = await (await fetch("https://kieai.redpandaai.co/api/file-base64-upload", { method: "POST", headers: H,
  body: JSON.stringify({ base64Data: b64, uploadPath: "scrollcraft", fileName: "knoll.png" }) })).json();
const url = up?.data?.downloadUrl || up?.data?.fileUrl;
const ct = await (await fetch("https://api.kie.ai/api/v1/jobs/createTask", { method: "POST", headers: H,
  body: JSON.stringify({ model: "recraft/remove-background", input: { image: url } }) })).json();
console.log("create", JSON.stringify(ct));
const id = ct?.data?.taskId; if (!id) process.exit(1);
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const r = await (await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${id}`, { headers: H })).json();
  const st = r?.data?.state;
  if (st === "success") {
    const out = JSON.parse(r.data.resultJson).resultUrls[0];
    fs.writeFileSync(dst, Buffer.from(await (await fetch(out)).arrayBuffer()));
    console.log("saved", dst); process.exit(0);
  }
  if (st === "fail") { console.log("fail", JSON.stringify(r.data)); process.exit(1); }
}
