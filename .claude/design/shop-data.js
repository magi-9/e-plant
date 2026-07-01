/* ════════════════════════════════════════════════════════════════
   DAS / Ebringer — shared catalogue data  →  window.ShopData
   ════════════════════════════════════════════════════════════════ */
(function(){
const IMGS = ['p1','p2','p3','p4','p5','p6','p7','p8'].map(n=>`assets/products/${n}.png`);

const TYPES = [
  {key:'tibase',   label:'TiBase',              count:547},
  {key:'mua',      label:'Multi-Unit Abutment', count:128},
  {key:'scanbody', label:'Scanbody',            count:84},
  {key:'analog',   label:'Analog',              count:210},
];
const BRANDS = [
  {key:'biomet',   label:'Biomet 3i'},
  {key:'astra',    label:'Astra Tech'},
  {key:'straumann',label:'Straumann'},
  {key:'camlog',   label:'Camlog'},
];
const MATERIALS = [
  {key:'ti',   label:'Titanium Grade 5'},
  {key:'cocr', label:'CoCr'},
];
const NAME_BY_TYPE = {
  tibase:'Dynamic TiBase NR HC9',
  mua:'Multi-Unit Abutment 17°',
  scanbody:'Scanbody Digital NR',
  analog:'Implant Analog NR',
};
const COMPAT = {biomet:'OS-3.4',astra:'AS-3.5',straumann:'BL-RC',camlog:'CL-3.8'};

const PRODUCTS = (()=>{
  const out=[]; let id=1;
  const refs=['Comp.0002','Comp.0004','Comp.0007','Comp.0012','Comp.0013','Comp.0015','Comp.0017','Comp.0022','Comp.0030','Comp.0041','Comp.0052','Comp.0063'];
  for(let i=0;i<48;i++){
    const t=TYPES[i%4], b=BRANDS[(i*3)%4], m=MATERIALS[i%2];
    const variants=[2,1,3,2,4,2][i%6];
    const stock = i%7!==3;
    out.push({
      id:id++, type:t.key, typeLabel:t.label, brand:b.key, brandLabel:b.label,
      material:m.key, materialLabel:m.label, name:NAME_BY_TYPE[t.key], code:refs[i%refs.length],
      variants, stock, stockQty: stock?(2+(i*3)%12):0, price: 48 + ((i*37)%320),
      img:IMGS[i%IMGS.length], compat:COMPAT[b.key],
      gingiva:[1,2,3][i%3], diameter:[3.5,4.0,4.5,5.0][i%4], angle:[0,15,17][i%3],
    });
  }
  return out;
})();

const SCREWS = [
  {id:901,name:'Dynamic Screw NR Std',ref:'SCR.1001',stock:9},
  {id:902,name:'Dynamic Screw NR Long',ref:'SCR.1002',stock:0},
  {id:903,name:'Omnigrip Screw Ti',ref:'SCR.1010',stock:14},
];

const variantWord = n => { const l2=n%100,l1=n%10;
  if(l2>=11&&l2<=14)return'variantov'; if(l1===1)return'variant'; if(l1>=2&&l1<=4)return'varianty'; return'variantov'; };
const itemWord = n => { if(n===1)return'položka'; if(n>=2&&n<=4)return'položky'; return'položiek'; };
const eur = n => Number(n).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const getById = id => PRODUCTS.find(p=>p.id===Number(id));
const isTiBase = p => p && p.type==='tibase';

window.ShopData = { IMGS, TYPES, BRANDS, MATERIALS, PRODUCTS, SCREWS, variantWord, itemWord, eur, getById, isTiBase };
})();
