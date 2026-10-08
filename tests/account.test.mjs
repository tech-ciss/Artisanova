import { test } from "node:test";
import assert from "node:assert/strict";
import { profileInput, passwordInput, accountAddressInput } from "../src/lib/account/validation.ts";
test("compte : validation du profil, confirmation et politique de mot de passe",()=>{
 const profile=profileInput.parse({email:" TEST@example.test ",firstName:" Test ",lastName:"Client",currentPassword:"Actuel123!",role:"ADMIN"});
 assert.equal(profile.email,"test@example.test");assert.equal(profile.firstName,"Test");assert.equal(profile.role,undefined);
 assert.equal(profileInput.safeParse({...profile,currentPassword:""}).success,false);
 for(const password of ["court1A","sansmajuscule123","SansChiffre","É".repeat(40)+"1"])assert.equal(passwordInput.safeParse({currentPassword:"Actuel123!",password,confirmation:password}).success,false);
 assert.equal(passwordInput.safeParse({currentPassword:"Actuel123!",password:"Nouveau123!",confirmation:"autre"}).success,false);
 assert.equal(accountAddressInput.safeParse({firstName:"Test",lastName:"Client",line1:"1 rue Fictive",city:"Nantes",zip:"44000",country:"FR",type:"OTHER",isDefault:true}).success,false);
});
