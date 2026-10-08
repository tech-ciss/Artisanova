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
const id = `test-http-admin-${randomUUID()}`, email = `${id}@example.test`;
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
async function form(path: string, name: string, intent: string, fresh = false) {
  const html = await page(path);
  const body = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(match => match[1]).find(body => body.includes(`name="${name}" value="${intent}"`) && (!fresh || !body.includes('name="id"')));
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
const password="Admin-Test-42";
const code=`HTTP${randomUUID().replaceAll("-", "").toUpperCase()}`;
let categoryId:string|undefined,productId:string|undefined,orderId:string|undefined;
try {
 let response=await request("/admin",{},false);assert.equal(response.status,307);
 response=await post("/inscription",await form("/inscription","intent","signup"),{email,password,confirmation:password,firstName:"Admin",lastName:"Test",role:"ADMIN"});assert.equal(response.status,303);
 const user=await db.user.findUniqueOrThrow({where:{email}});assert.equal(user.role,"CLIENT");
 response=await request("/admin");assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/CA TTC du mois/);
 await db.user.update({where:{id:user.id},data:{role:"ADMIN"}});
 assert.match(await page("/admin"),/CA TTC du mois/);
 const catFields={name:id,slug:id,description:"Fixture HTTP",image:""};
 response=await post("/admin/categories",await form("/admin/categories","operation","category",true),catFields);assert.match(clean(await response.text()),/Modification enregistrée/);
 const category=await db.category.findUniqueOrThrow({where:{slug:id}});categoryId=category.id;
 const productFields={title:id,slug:id,description:"## Création\n\n- Premier détail\n- Second détail",price:"24.00",vat:"20",stock:"3",categoryId:category.id,artisanId:"demo-artisan-1",status:"PUBLISHED",images:"/demo/ceramiques.svg | Illustration fictive"};
 response=await post("/admin/produits",await form("/admin/produits","operation","product",true),{...productFields,images:"https://evil.example/x.png | Image"});assert.equal(response.status,200);assert.match(clean(await response.text()),/Image locale/);
 response=await post("/admin/produits",await form("/admin/produits","operation","product",true),productFields);assert.equal(response.status,303);
 const product=await db.product.findUniqueOrThrow({where:{slug:id}});productId=product.id;
 assert.match(await page(`/produits/${id}`),/<h3>Création<\/h3>/);
 const edit=await form(`/admin/produits/${product.id}`,"operation","product");
 await db.product.update({where:{id:product.id},data:{stock:2}});
 response=await post(`/admin/produits/${product.id}`,edit,{...productFields,stockReason:"Inventaire"});assert.match(clean(await response.text()),/Le produit a changé/);
 assert.equal((await db.product.findUniqueOrThrow({where:{id:product.id}})).stock,2);
 response=await post("/admin/promotions",await form("/admin/promotions","operation","promo",true),{code,type:"PERCENT",value:"15",expiresAt:"2027-07-01",maxUses:"10",isActive:"on"});assert.match(clean(await response.text()),/Modification enregistrée/);
 const savedPromo=await db.promoCode.findUniqueOrThrow({where:{code}});assert.equal(savedPromo.value,15);assert.equal(savedPromo.expiresAt?.toISOString(),"2027-07-01T22:00:00.000Z");
 const order=await db.order.create({data:{reference:`HTTP-${randomUUID()}`,idempotencyKey:id,email,status:"PAID",shippingMethod:"STANDARD",subtotalCents:2400,shippingCents:590,discountCents:0,totalCents:2990,items:{create:{productId:product.id,title:id,quantity:1,unitPriceCents:2400,vatBasisPoints:2000}},payments:{create:{provider:"mock",status:"SUCCEEDED",amountCents:2990}},history:{create:[{from:null,to:"PENDING_PAYMENT"},{from:"PENDING_PAYMENT",to:"PAID"}]},stockMovements:{create:{productId:product.id,kind:"SALE",delta:-1}}}});orderId=order.id;
 assert.match(await page(`/admin/commandes?q=${encodeURIComponent(email)}&status=PAID`),new RegExp(order.reference));
 response=await post(`/admin/commandes/${order.id}`,await form(`/admin/commandes/${order.id}`,"operation","transition"),{to:"DELIVERED"});assert.match(clean(await response.text()),/Transition interdite/);
 response=await post(`/admin/commandes/${order.id}`,await form(`/admin/commandes/${order.id}`,"operation","transition"),{to:"PREPARING"});assert.match(clean(await response.text()),/Modification enregistrée/);
 const shipping=await form(`/admin/commandes/${order.id}`,"operation","transition");
 response=await post(`/admin/commandes/${order.id}`,shipping,{to:"SHIPPED"});assert.match(clean(await response.text()),/Modification enregistrée/);
 response=await post(`/admin/commandes/${order.id}`,shipping,{to:"SHIPPED"});assert.equal(response.status,200);
 assert.equal(await db.emailLog.count({where:{eventKey:`shipped:${order.id}`,status:"SIMULATED"}}),1);
 assert.match(await page(`/admin/emails?q=${encodeURIComponent(email)}`),/ORDER_SHIPPED/);
 const captured=await form("/admin/categories","operation","category",true);
 await db.user.update({where:{id:user.id},data:{role:"CLIENT"}});
 response=await post("/admin/categories",captured,{...catFields,slug:`${id}-forged`,role:"ADMIN"});assert.ok(response.status>=400);
 assert.equal(await db.category.count({where:{slug:`${id}-forged`}}),0);
 for(const route of ["/admin","/admin/produits","/admin/categories","/admin/commandes","/admin/promotions","/admin/emails",`/admin/produits/${product.id}`,`/admin/commandes/${order.id}`]){response=await request(route);assert.equal(response.status,404);}
 console.log("HTTP admin : rôle serveur, POST refusé après révocation, produits/images/Markdown, stock périmé, catégories, promotions, filtres, transitions et email unique validés.");
}finally{
 if(orderId){await db.emailLog.deleteMany({where:{orderId}});await db.stockMovement.deleteMany({where:{orderId}});await db.order.deleteMany({where:{id:orderId}});}
 if(productId){await db.stockMovement.deleteMany({where:{productId}});await db.product.deleteMany({where:{id:productId}});}
 if(categoryId)await db.category.deleteMany({where:{id:categoryId}});
 await db.promoCode.deleteMany({where:{code}});
 await db.user.deleteMany({where:{email}});
 await db.cart.deleteMany({where:{sessionId:{in:[...guestHashes]}}});
 await db.authThrottle.deleteMany({where:{key:throttleKey(email)}});
 await db.$disconnect();
}
