import { BRANDS } from '../config/brands.js';

console.log('Total Brands Length:', BRANDS.length);
for (let i = 0; i < BRANDS.length; i++) {
    const b = BRANDS[i];
    if (!b) console.log(`❌ Index ${i} is UNDEFINED`);
    else console.log(`✅ Index ${i}: ${b.name}`);
}
