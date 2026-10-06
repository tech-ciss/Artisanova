export const demoCategories = [
  { id: "demo-category-ceramiques", name: "Céramiques", slug: "ceramiques", description: "Des pièces pour la table et la maison.", image: "/demo/ceramiques.svg" },
  { id: "demo-category-bougies", name: "Bougies & savons", slug: "bougies-savons", description: "Les petits rituels du quotidien.", image: "/demo/bougies.svg" },
  { id: "demo-category-bijoux", name: "Bijoux", slug: "bijoux", description: "Des détails à porter chaque jour.", image: "/demo/bijoux.svg" },
  { id: "demo-category-textiles", name: "Textiles", slug: "textiles", description: "Des matières pour adoucir la maison.", image: "/demo/textiles.svg" },
  { id: "demo-category-soins", name: "Cosmétiques naturels", slug: "cosmetiques-naturels", description: "Un univers consacré au soin.", image: "/demo/soins.svg" },
];

export const demoArtisans = [
  { id: "demo-artisan-1", name: "Atelier Terre Douce", bio: "Atelier fictif de céramique créé pour la démonstration Artisanova." },
  { id: "demo-artisan-2", name: "Les Rituels de Louise", bio: "Atelier fictif de bougies et savons créé pour la démonstration Artisanova." },
  { id: "demo-artisan-3", name: "Atelier Fil d’Or", bio: "Atelier fictif de bijoux créé pour la démonstration Artisanova." },
  { id: "demo-artisan-4", name: "Maison Lin", bio: "Atelier fictif de textiles créé pour la démonstration Artisanova." },
  { id: "demo-artisan-5", name: "Le Jardin des Soins", bio: "Atelier fictif de cosmétiques créé pour la démonstration Artisanova." },
];

const groups = [
  [["Tasse en grès crème", "tasse-gres-creme", 2400], ["Vase terre cuite", "vase-terre-cuite", 4800], ["Bol moucheté", "bol-mouchete", 2800], ["Assiette en céramique", "assiette-ceramique", 3200], ["Pichet en grès", "pichet-gres", 5600]],
  [["Bougie lavande", "bougie-lavande", 2200], ["Bougie fleur de coton", "bougie-fleur-coton", 2400], ["Savon douceur", "savon-douceur", 800], ["Savon verveine", "savon-verveine", 900], ["Coffret de bougies", "coffret-bougies", 4200]],
  [["Boucles d’oreilles lune", "boucles-oreilles-lune", 3600], ["Collier cercle", "collier-cercle", 4500], ["Bracelet fin", "bracelet-fin", 2900], ["Bague martelée", "bague-martelee", 3400], ["Broche feuille", "broche-feuille", 2500]],
  [["Serviette en lin", "serviette-lin", 1600], ["Housse de coussin", "housse-coussin", 3800], ["Tote bag naturel", "tote-bag-naturel", 2600], ["Chemin de table", "chemin-table", 4900], ["Pochette en coton", "pochette-coton", 1800]],
  [["Baume douceur", "baume-douceur", 1900], ["Huile de soin", "huile-soin", 2700], ["Crème mains", "creme-mains", 1500], ["Coffret rituel", "coffret-rituel", 5900], ["Soin lèvres", "soin-levres", 700]],
] satisfies [string, string, number][][];

export const demoProducts = groups.flatMap((group, categoryIndex) => group.map(([title, slug, priceCents], index) => ({
  id: `demo-product-${categoryIndex + 1}-${index + 1}`,
  title, slug, priceCents,
  stock: categoryIndex === 2 && index === 4 ? 0 : 8 + index * 3,
  categoryId: demoCategories[categoryIndex].id,
  artisanId: demoArtisans[categoryIndex].id,
  image: demoCategories[categoryIndex].image,
  isFeatured: index === 0,
  description: `${title}. Exemple de création présenté dans le catalogue de démonstration Artisanova. Le produit, l’atelier et le visuel sont fictifs. Les caractéristiques réelles, les dimensions et les conseils d’entretien devront être fournis avant toute commercialisation.`,
}))) ;

export const demoAccounts = [
  { id: "demo-admin", email: "admin@artisanova.test", firstName: "Alex", lastName: "Démo", role: "ADMIN" },
  { id: "demo-client-1", email: "camille@artisanova.test", firstName: "Camille", lastName: "Démo", role: "CLIENT" },
  { id: "demo-client-2", email: "sam@artisanova.test", firstName: "Sam", lastName: "Démo", role: "CLIENT" },
  { id: "demo-client-3", email: "lou@artisanova.test", firstName: "Lou", lastName: "Démo", role: "CLIENT" },
] as const;
