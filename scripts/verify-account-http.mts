import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "./demo-database";
import { tokenHash } from "../src/lib/services/persistent-cart.service";
import { throttleKey } from "../src/lib/services/auth.service";
const db = createDatabaseClient(requireDemoDatabase());
const origin = process.env.HTTP_TEST_ORIGIN ?? "http://127.0.0.1:3000";
assert.ok(["http://127.0.0.1:3000", "http://127.0.0.1:3001"].includes(origin));
const id = `test-http-account-${randomUUID()}`, email = `${id}@example.test`, foreignEmail = `foreign-${id}@example.test`;
const jar = new Map<string, string>(), guestHashes = new Set<string>();
const decode = (value: string) => value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const clean = (html: string) => html.replaceAll(/<!--[\s\S]*?-->/g, "");
async function request(path: string, init: RequestInit = {}, privateSession = true) {
  const response = await fetch(origin + path, { ...init, redirect: "manual", headers: { cookie: privateSession ? [...jar].map(([name, value]) => `${name}=${value}`).join("; ") : "", "user-agent": "facebookexternalhit/1.1", ...init.headers }, signal: AbortSignal.timeout(90000) });
  if (privateSession) for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("="), name = pair.slice(0, separator), value = pair.slice(separator + 1);
    if (value) {
      assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=lax/i);
      jar.set(name, value);
      if (name === "artisanova_cart") guestHashes.add(tokenHash(value)!);
    } else jar.delete(name);
  }
  return response;
}
async function page(path: string) { const response = await request(path); assert.equal(response.status, 200); return clean(await response.text()); }
async function form(path: string, name: string, intent: string) {
  const html = await page(path);
  const body = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(match => match[1]).find(body => body.includes(`name="${name}" value="${intent}"`));
  assert.ok(body, `Form ${intent} missing`);
  const data = new FormData();
  for (const input of body.matchAll(/<input\b[^>]*>/g)) {
    const name = input[0].match(/name="([^"]*)"/)?.[1], value = input[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) data.set(decode(name), decode(value));
  }
  return data;
}
function post(path: string, data: FormData, fields: Record<string, string>, requestOrigin = origin) {
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return request(path, { method: "POST", headers: { origin: requestOrigin }, body: data });
}
const password="Account-Test-42";
let orderId: string | undefined;
try {
 let response=await post("/inscription",await form("/inscription","intent","signup"),{email,password,confirmation:password,firstName:"Test",lastName:"Client"});
 assert.equal(response.status,303);
 const user=await db.user.findUniqueOrThrow({where:{email}});
 const fields={firstName:"Test",lastName:"Client",line1:"1 rue Fictive",line2:"",city:"Nantes",zip:"44000",country:"FR",type:"SHIPPING"};
 response=await post("/compte/adresses",await form("/compte/adresses","intent","address"),{...fields,zip:"00000"});
 assert.match(clean(await response.text()),/Code postal invalide/);
 response=await post("/compte/adresses",await form("/compte/adresses","intent","address"),fields);
 assert.match(clean(await response.text()),/Modification enregistrée/);
 const address=await db.address.findFirstOrThrow({where:{userId:user.id}}); assert.equal(address.isDefault,true);
 response=await post("/compte/adresses",await form("/compte/adresses","intent","address"),{...fields,id:"foreign-address"});
 assert.match(clean(await response.text()),/Adresse indisponible/);
 const order=await db.order.create({data:{reference:`TEST-${randomUUID()}`,idempotencyKey:randomUUID(),userId:user.id,email,status:"PAID",shippingMethod:"STANDARD",subtotalCents:2400,shippingCents:590,discountCents:0,totalCents:2990,items:{create:{title:"<script>fixture</script>",unitPriceCents:2400,vatBasisPoints:2000,quantity:1}},addresses:{create:{...fields,type:"BILLING"}}}}); orderId=order.id;
 assert.match(await page("/compte/commandes"),new RegExp(order.reference));
 assert.match(await page(`/compte/commandes/${order.reference}`),/29,90/);
 response=await request(`/compte/commandes/${order.reference}/facture`);
 assert.equal(response.status,200);assert.match(response.headers.get("content-disposition")!,/attachment/);assert.match(response.headers.get("cache-control")!,/no-store/);
 const document=await response.text();assert.match(document,/&lt;script&gt;fixture/);assert.doesNotMatch(document,/<script>/);
 response=await request(`/compte/commandes/${order.reference}/facture`,{},false);assert.equal(response.status,401);
 response=await request(`/compte/commandes/foreign-reference`);assert.equal(response.status,404);
 const foreign=await db.user.create({data:{email:foreignEmail,firstName:"Autre",lastName:"Client",passwordHash:user.passwordHash}});
 await db.order.update({where:{id:order.id},data:{userId:foreign.id}});
 response=await request(`/compte/commandes/${order.reference}`);assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/fixture/);
 response=await request(`/compte/commandes/${order.reference}/facture`);assert.equal(response.status,404);
 response=await post("/compte/profil",await form("/compte/profil","intent","profile"),{email,firstName:"Nouveau",lastName:"Client",currentPassword:password,role:"ADMIN"});
 assert.match(clean(await response.text()),/Modification enregistrée/);assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).role,"CLIENT");
 response=await post("/compte/profil",await form("/compte/profil","intent","password"),{currentPassword:password,password:"Nouveau-Test-42",confirmation:"Nouveau-Test-42"});
 assert.equal(response.status,303);assert.equal(response.headers.get("location"),"/connexion");assert.equal(await db.session.count({where:{userId:user.id}}),0);
 console.log("HTTP compte : adresses, validation, profil, révocation, historique, facture et isolation des commandes validés.");
} finally {
 if(orderId)await db.order.deleteMany({where:{id:orderId}});
 await db.user.deleteMany({where:{email:{in:[email,foreignEmail]}}});
 await db.cart.deleteMany({where:{sessionId:{in:[...guestHashes]}}});
 await db.authThrottle.deleteMany({where:{key:throttleKey(email)}});
 await db.$disconnect();
}
