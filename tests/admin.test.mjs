import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, orderTransitions } from "../src/lib/services/order-policy.ts";
import { productInput, promoInput, moneyInput, imageUrl, adminFilters } from "../src/lib/admin/validation.ts";
test("statuts : chemins autorisés uniquement, aucun retour ni sortie des états terminaux",()=>{
 const statuses=Object.keys(orderTransitions);
 const allowed=["PENDING_PAYMENT:PAID","PENDING_PAYMENT:CANCELLED","PAID:PREPARING","PAID:CANCELLED","PREPARING:SHIPPED","PREPARING:CANCELLED","SHIPPED:DELIVERED"];
 for(const from of statuses)for(const to of statuses)assert.equal(canTransition(from,to),allowed.includes(`${from}:${to}`));
});
test("admin : argent exact, images sûres, nombre d’images et promotions bornées",()=>{
 assert.equal(moneyInput.parse("24,99"),2499);assert.equal(moneyInput.safeParse("24.999").success,false);
 for(const url of ["javascript:alert(1)","//evil.example/x.png","https://evil.example/x.png","/demo/../secret.svg"])assert.equal(imageUrl.safeParse(url).success,false);
 assert.ok(imageUrl.safeParse("/demo/ceramiques.svg").success);
 const product={title:"Test",slug:"test",description:"Démo",price:"24.99",vat:"20",stock:"0",categoryId:"cat",artisanId:"artisan",status:"PUBLISHED",isFeatured:false,images:[]};
 assert.equal(productInput.safeParse(product).success,false);
 assert.equal(productInput.safeParse({...product,images:Array(6).fill({url:"/demo/ceramiques.svg",alt:"Test"})}).success,false);
 const promo={code:" bienvenue10 ",type:"PERCENT",value:"10",expiresAt:"",maxUses:"",isActive:true};
 assert.equal(promoInput.parse(promo).code,"BIENVENUE10");
 for(const value of ["0","101","1.5"])assert.equal(promoInput.safeParse({...promo,value}).success,false);
 assert.equal(adminFilters.safeParse({page:"-1"}).success,false);
});
