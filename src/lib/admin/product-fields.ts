import type { AdminField } from "@/components/features/admin-form";
import type { Product, ProductImage } from "@/generated/prisma/client";
export function productFields(categories: {id:string;name:string;isArchived:boolean}[], artisans: {id:string;name:string}[], product?: Product & {images:ProductImage[]}): AdminField[] {
  return [
    {name:"title",label:"Titre",value:product?.title}, {name:"slug",label:"Slug",value:product?.slug},
    {name:"description",label:"Description (Markdown simple)",type:"textarea",value:product?.description,help:"Paragraphes, titres ## et listes avec - sont pris en charge. Le HTML est affiché comme du texte."},
    {name:"price",label:"Prix TTC (€)",value:product? (product.priceCents/100).toFixed(2):"",help:"Le prix HT est calculé à partir du TTC et du taux de TVA."},
    {name:"vat",label:"TVA (%)",value:String((product?.vatBasisPoints??2000)/100),options:["0","2.1","5.5","10","20"].map(value=>({value,label:`${value} %`}))},
    {name:"stock",label:"Stock disponible",value:String(product?.stock??0)},
    {name:"stockReason",label:"Motif de l’ajustement de stock",required:false,help:"Obligatoire si vous changez le stock d’un produit existant."},
    {name:"categoryId",label:"Catégorie",value:product?.categoryId,options:[{value:"",label:"Choisir"},...categories.map(c=>({value:c.id,label:c.name+(c.isArchived?" (archivée)":"")}))]},
    {name:"artisanId",label:"Artisan",value:product?.artisanId,options:[{value:"",label:"Choisir"},...artisans.map(a=>({value:a.id,label:a.name}))]},
    {name:"status",label:"Statut",value:product?.status??"DRAFT",options:[{value:"DRAFT",label:"Brouillon"},{value:"PUBLISHED",label:"Publié"}]},
    {name:"isFeatured",label:"Coup de cœur (maximum six)",type:"checkbox",value:product?.isFeatured?"on":""},
    {name:"images",label:"Images et textes alternatifs (1 à 5)",type:"textarea",value:product?.images.map(i=>`${i.url} | ${i.alt}`).join("\n"),help:"Une ligne par image : URL | texte alternatif. Images locales /demo ou /images, ou HTTPS images.unsplash.com. L’ordre des lignes définit celui de la galerie."},
    ...(product?[{name:"expectedUpdatedAt",label:"",type:"hidden" as const,value:product.updatedAt.toISOString()}]:[]),
  ];
}
