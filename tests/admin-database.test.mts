import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "../scripts/demo-database";
import { saveProduct, saveCategory, deleteCategory, deleteProduct, savePromo, transitionOrder, adminDashboard } from "../src/lib/services/admin.service";
import { prepareCheckout, placeOrder } from "../src/lib/services/checkout.service";
import { mutateCart, tokenHash } from "../src/lib/services/persistent-cart.service";
const db=createDatabaseClient(requireDemoDatabase());after(()=>db.$disconnect());
async function fixture(){
 const id=`test-admin-${randomUUID()}`;
 const admin=await db.user.create({data:{email:`${id}@example.test`,firstName:"Admin",lastName:"Test",passwordHash:"fixture",role:"ADMIN"}});
 const client=await db.user.create({data:{email:`client-${id}@example.test`,firstName:"Client",lastName:"Test",passwordHash:"fixture"}});
 const category=await saveCategory(db,admin.id,{name:"Catégorie test",slug:id,description:"Fixture",image:"",isArchived:false});
 const owner=tokenHash(randomUUID().replaceAll("-","")+randomUUID().replaceAll("-",""))!;
 const input={title:"Produit test admin",slug:id,description:"Description",price:"24.00",vat:"20",stock:"3",categoryId:category.id,artisanId:"demo-artisan-1",status:"PUBLISHED",isFeatured:false,images:[{url:"/demo/ceramiques.svg",alt:"Fixture"}]};
 let product;
 try {product=await saveProduct(db,admin.id,input);} catch(error) {
  await db.category.delete({where:{id:category.id}});await db.user.deleteMany({where:{id:{in:[admin.id,client.id]}}});throw error;
 }
 return {id,admin,client,category,owner,input,product,async clean(){
  const products=await db.product.findMany({where:{categoryId:category.id}}),ids=products.map(p=>p.id);
  const orders=await db.order.findMany({where:{OR:[{items:{some:{productId:{in:ids}}}},{idempotencyKey:{startsWith:id}}]}}),orderIds=orders.map(o=>o.id);
  await db.emailLog.deleteMany({where:{orderId:{in:orderIds}}});await db.stockMovement.deleteMany({where:{productId:{in:ids}}});
  await db.cart.deleteMany({where:{sessionId:owner}});await db.order.deleteMany({where:{id:{in:orderIds}}});
  await db.product.deleteMany({where:{categoryId:category.id}});await db.category.deleteMany({where:{id:category.id}});
  await db.promoCode.deleteMany({where:{code:{startsWith:`A${id.slice(-12).replaceAll("-","").toUpperCase()}`}}});
  await db.user.deleteMany({where:{id:{in:[admin.id,client.id]}}});
 }};
}
test("admin : rôle relu, images atomiques, édition périmée et catégorie archivée",async()=>{
 const f=await fixture();try{
  await assert.rejects(saveProduct(db,f.client.id,f.input),/administrateur/);
  await assert.rejects(deleteProduct(db,f.client.id,f.product.id),/administrateur/);
  await assert.rejects(saveCategory(db,f.client.id,{name:"Autre",slug:f.id,description:"",image:"",isArchived:false}),/administrateur/);
  const updated=await saveProduct(db,f.admin.id,{...f.input,title:"Actualisé",stock:"2",stockReason:"Inventaire",expectedUpdatedAt:f.product.updatedAt.toISOString()},f.product.id);
  assert.equal(await db.productImage.count({where:{productId:f.product.id}}),1);
  await assert.rejects(saveProduct(db,f.admin.id,{...f.input,expectedUpdatedAt:f.product.updatedAt.toISOString()},f.product.id),/changé/);
  const movement=await db.stockMovement.findFirstOrThrow({where:{productId:f.product.id,delta:-1}});assert.equal(movement.actorId,f.admin.id);assert.equal(movement.reason,"Inventaire");
  await assert.rejects(deleteCategory(db,f.admin.id,f.category.id),/archivez/);
  await saveCategory(db,f.admin.id,{name:"Catégorie test",slug:f.id,description:"",image:"",isArchived:true},f.category.id);
  await assert.rejects(saveProduct(db,f.admin.id,{...f.input,expectedUpdatedAt:updated.updatedAt.toISOString()},f.product.id),/archivée/);
  assert.match(await deleteProduct(db,f.admin.id,f.product.id),/historique/);
  assert.equal((await db.product.findUniqueOrThrow({where:{id:f.product.id}})).status,"DRAFT");
  await db.user.update({where:{id:f.admin.id},data:{role:"CLIENT"}});
  await assert.rejects(adminDashboard(db,f.admin.id),/administrateur/);
 }finally{await f.clean();}
});
async function paid(f:Awaited<ReturnType<typeof fixture>>){
 await mutateCart(db,f.owner,{operation:"add",productId:f.product.id,quantity:1});
 const draft=await prepareCheckout(db,f.owner,{email:"test@example.test",firstName:"Test",lastName:"Client",line1:"1 rue Fictive",city:"Nantes",zip:"44000",country:"FR",shippingMethod:"STANDARD"});
 const review=await db.checkoutDraft.findUniqueOrThrow({where:{tokenHash:tokenHash(draft)!}});
 return placeOrder(db,f.owner,draft,{reviewId:review.id,brand:"VISA",number:"4242424242424242",expiry:"12/2035",cvc:"123",simulation:"on"});
}
test("admin : annulation concurrente rembourse et réapprovisionne exactement une fois",async()=>{
 const f=await fixture();try{
  const order=await paid(f);
  await assert.rejects(transitionOrder(db,f.client.id,{id:order.id,from:"PAID",to:"CANCELLED"}),/administrateur/);
  await assert.rejects(transitionOrder(db,f.admin.id,{id:order.id,from:"PAID",to:"DELIVERED"}),/interdite/);
  await Promise.all([1,2].map(()=>transitionOrder(db,f.admin.id,{id:order.id,from:"PAID",to:"CANCELLED"})));
  assert.equal((await db.product.findUniqueOrThrow({where:{id:f.product.id}})).stock,3);
  assert.equal(await db.stockMovement.count({where:{orderId:order.id,kind:"CANCELLATION"}}),1);
  assert.equal(await db.orderStatusHistory.count({where:{orderId:order.id,to:"CANCELLED"}}),1);
  assert.equal((await db.payment.findFirstOrThrow({where:{orderId:order.id}})).status,"REFUNDED");
 }finally{await f.clean();}
});
test("admin : expédition historisée, email unique, états terminaux et filtres KPI",async()=>{
 const f=await fixture();try{
  const order=await paid(f);
  await transitionOrder(db,f.admin.id,{id:order.id,from:"PAID",to:"PREPARING"});
  await Promise.all([1,2].map(()=>transitionOrder(db,f.admin.id,{id:order.id,from:"PREPARING",to:"SHIPPED"})));
  assert.equal(await db.emailLog.count({where:{eventKey:`shipped:${order.id}`}}),1);
  assert.equal((await db.orderStatusHistory.findFirstOrThrow({where:{orderId:order.id,to:"SHIPPED"}})).actorId,f.admin.id);
  await assert.rejects(transitionOrder(db,f.admin.id,{id:order.id,from:"SHIPPED",to:"CANCELLED"}),/interdite/);
  await transitionOrder(db,f.admin.id,{id:order.id,from:"SHIPPED",to:"DELIVERED"});
  await assert.rejects(transitionOrder(db,f.admin.id,{id:order.id,from:"DELIVERED",to:"PREPARING"}),/interdite/);
  const dashboard=await adminDashboard(db,f.admin.id,new Date("2099-01-01T00:00:00Z"));assert.equal(dashboard.orders,0);assert.equal(dashboard.revenue,0);assert.equal(dashboard.average,0);
 }finally{await f.clean();}
});
test("admin : limite promotionnelle ne peut pas effacer les usages",async()=>{
 const f=await fixture();try{
  const input={code:`A${f.id.slice(-12).replaceAll("-","").toUpperCase()}`,type:"PERCENT",value:"10",expiresAt:"",maxUses:"3",isActive:true};
  const promo=await savePromo(db,f.admin.id,input);
  await db.promoCode.update({where:{id:promo.id},data:{usedCount:2}});
  await assert.rejects(savePromo(db,f.admin.id,{...input,maxUses:"1"},promo.id),/inférieur/);
  await assert.rejects(savePromo(db,f.client.id,input,promo.id),/administrateur/);
  const updated=await savePromo(db,f.admin.id,{...input,maxUses:"2",isActive:false,usedCount:"0",expiresAt:"2027-07-01"},promo.id);assert.equal(updated.usedCount,2);assert.equal(updated.isActive,false);assert.equal(updated.expiresAt?.toISOString(),"2027-07-01T22:00:00.000Z");
 }finally{await f.clean();}
});
test("admin : ajustement de stock concurrent avec un achat sans vente perdue",async()=>{
 const f=await fixture();try{
  await mutateCart(db,f.owner,{operation:"add",productId:f.product.id,quantity:1});
  const token=await prepareCheckout(db,f.owner,{email:"test@example.test",firstName:"Test",lastName:"Client",line1:"1 rue Fictive",city:"Nantes",zip:"44000",country:"FR",shippingMethod:"STANDARD"});
  const review=await db.checkoutDraft.findUniqueOrThrow({where:{tokenHash:tokenHash(token)!}});
  const results=await Promise.allSettled([
   placeOrder(db,f.owner,token,{reviewId:review.id,brand:"VISA",number:"4242424242424242",expiry:"12/2035",cvc:"123",simulation:"on"}),
   saveProduct(db,f.admin.id,{...f.input,stock:"5",stockReason:"Réception",expectedUpdatedAt:f.product.updatedAt.toISOString()},f.product.id),
  ]);
  assert.equal(results[0].status,"fulfilled");
  const stock=(await db.product.findUniqueOrThrow({where:{id:f.product.id}})).stock;
  assert.equal(stock,results[1].status==="fulfilled"?4:2);
  assert.equal(await db.stockMovement.count({where:{productId:f.product.id,kind:"SALE"}}),1);
 }finally{await f.clean();}
});
test("admin : KPI mensuels au fuseau Paris, annulations exclues du CA",async()=>{
 const f=await fixture();try{
  const order=await paid(f);
  await db.order.update({where:{id:order.id},data:{createdAt:new Date("2099-03-31T22:30:00Z")}});
  const april=await adminDashboard(db,f.admin.id,new Date("2099-04-10T12:00:00Z"));
  assert.equal(april.orders,1);assert.equal(april.revenue,2990);assert.equal(april.average,2990);
  const march=await adminDashboard(db,f.admin.id,new Date("2099-03-10T12:00:00Z"));assert.equal(march.orders,0);
  await transitionOrder(db,f.admin.id,{id:order.id,from:"PAID",to:"CANCELLED"});
  const cancelled=await adminDashboard(db,f.admin.id,new Date("2099-04-10T12:00:00Z"));
  assert.equal(cancelled.orders,1);assert.equal(cancelled.revenue,0);assert.equal(cancelled.average,0);
 }finally{await f.clean();}
});
