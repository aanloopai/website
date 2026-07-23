// Provisioner-registry (spec Plak B). Eén plek die een product_key naar zijn
// provisioner-module vertaalt. Nieuwe auto-provisionable producten voegen
// zichzelf toe aan PROVISIONERS — verder wijzigt niets aan bestaande code.
import * as voice from './voice.js';

const PROVISIONERS = [voice];

export function resolve(productKey) {
  return PROVISIONERS.find((p) => p.canProvision(productKey)) || null;
}

export function canProvision(productKey) {
  return resolve(productKey) != null;
}
