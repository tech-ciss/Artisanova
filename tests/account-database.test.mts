import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "../scripts/demo-database";
import { saveAddress, deleteAddress, updateProfile, accountOrder } from "../src/lib/services/account.service";
import { throttleKey } from "../src/lib/services/auth.service";
const db = createDatabaseClient(requireDemoDatabase());
after(() => db.$disconnect());
const address = { firstName: "Test", lastName: "Client", line1: "1 rue Fictive", line2: "", city: "Nantes", zip: "44000", country: "FR", type: "SHIPPING", isDefault: false };
test("adresses : isolation, défaut concurrent, modification de type et suppression", async () => {
 const users = await Promise.all([1,2].map(async () => db.user.create({ data: { email: `${randomUUID()}@example.test`, firstName: "Test", lastName: "Client", passwordHash: "fixture" } })));
 try {
  const [a,b] = await Promise.all([saveAddress(db,users[0].id,address),saveAddress(db,users[0].id,{...address,isDefault:true})]);
  assert.equal(await db.address.count({where:{userId:users[0].id,type:"SHIPPING",isDefault:true}}),1);
  await assert.rejects(saveAddress(db,users[1].id,address,a.id));
  await assert.rejects(deleteAddress(db,users[1].id,a.id));
  await assert.rejects(saveAddress(db,users[0].id,{...address,country:"BE"}));
  await saveAddress(db,users[0].id,{...address,type:"BILLING"},b.id);
  assert.equal((await db.address.findUniqueOrThrow({where:{id:a.id}})).isDefault,true);
  const c=await saveAddress(db,users[0].id,address);
  await deleteAddress(db,users[0].id,a.id);
  assert.equal((await db.address.findUniqueOrThrow({where:{id:c.id}})).isDefault,true);
  assert.equal(await accountOrder(db,users[0].id,"ART-20261001-0001"),null);
 } finally {await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});}
});
test("profil : preuve, doublon, sessions révoquées et hash du nouveau mot de passe", async()=>{
 const email=`${randomUUID()}@example.test`, target=`${randomUUID()}@example.test`;
 const user=await db.user.create({data:{email,firstName:"Test",lastName:"Client",passwordHash:await hash("Ancien123!",12)}});
 const other=await db.user.create({data:{email:target,firstName:"Autre",lastName:"Client",passwordHash:"fixture"}});
 try {
  const profile={email:target,firstName:"Nouveau",lastName:"Client",currentPassword:"Ancien123!"};
  await assert.rejects(updateProfile(db,user.id,{...profile,currentPassword:"incorrect"}));
  await assert.rejects(updateProfile(db,user.id,profile));
  assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).email,email);
  await db.session.create({data:{userId:user.id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+60000)}});
  const changed=`${randomUUID()}@example.test`;
  assert.equal(await updateProfile(db,user.id,{...profile,email:changed,role:"ADMIN"}),true);
  assert.equal(await db.session.count({where:{userId:user.id}}),0);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).role,"CLIENT");
  await updateProfile(db,user.id,{currentPassword:"Ancien123!",password:"Nouveau123!",confirmation:"Nouveau123!"},true);
  assert.equal(await compare("Nouveau123!",(await db.user.findUniqueOrThrow({where:{id:user.id}})).passwordHash),true);
  await db.authThrottle.deleteMany({where:{key:throttleKey(changed)}});
 } finally {await db.user.deleteMany({where:{id:{in:[user.id,other.id]}}});await db.authThrottle.deleteMany({where:{key:throttleKey(email)}});}
});
