/**
 * Diccionario local de comidas, bebidas y expresiones colombianas.
 * Lo usan la semilla de datos y extractEntry() (fase 3). Las categorías alimentan el motor de patrones.
 */
export interface FoodEntry {
  /** Formas en que la gente lo dice (minúsculas, sin tildes para comparar). */
  says: string[];
  /** Como se muestra en la app. */
  label: string;
  canonical: string;
  categories: string[];
  kind: 'food' | 'drink';
}

export const FOODS: FoodEntry[] = [
  { says: ['tinto', 'tintico', 'cafe negro'], label: 'Tinto', canonical: 'café', categories: ['cafeína'], kind: 'drink' },
  { says: ['perico', 'cafe con leche'], label: 'Perico', canonical: 'café con leche', categories: ['cafeína', 'lácteo'], kind: 'drink' },
  { says: ['changua'], label: 'Changua', canonical: 'changua', categories: ['lácteo', 'huevo'], kind: 'food' },
  { says: ['arepa', 'arepita'], label: 'Arepa', canonical: 'arepa', categories: ['maíz'], kind: 'food' },
  { says: ['arepa con queso', 'arepa de queso'], label: 'Arepa con queso', canonical: 'arepa con queso', categories: ['maíz', 'lácteo'], kind: 'food' },
  { says: ['bandeja paisa', 'bandeja'], label: 'Bandeja paisa', canonical: 'bandeja paisa', categories: ['frito', 'carne', 'grasa'], kind: 'food' },
  { says: ['empanada', 'empanadas'], label: 'Empanada', canonical: 'empanada', categories: ['frito', 'harina'], kind: 'food' },
  { says: ['pandebono', 'pandebonos'], label: 'Pandebono', canonical: 'pandebono', categories: ['lácteo', 'harina'], kind: 'food' },
  { says: ['bunuelo', 'bunuelos'], label: 'Buñuelo', canonical: 'buñuelo', categories: ['lácteo', 'harina', 'frito'], kind: 'food' },
  { says: ['almojabana', 'almojabanas'], label: 'Almojábana', canonical: 'almojábana', categories: ['lácteo', 'harina'], kind: 'food' },
  { says: ['queso', 'quesito'], label: 'Queso', canonical: 'queso', categories: ['lácteo'], kind: 'food' },
  { says: ['yogur', 'yogurt', 'kumis'], label: 'Yogur', canonical: 'yogur', categories: ['lácteo'], kind: 'food' },
  { says: ['leche', 'vaso de leche'], label: 'Leche', canonical: 'leche', categories: ['lácteo'], kind: 'drink' },
  { says: ['gaseosa', 'coca cola', 'cocacola', 'postobon'], label: 'Gaseosa', canonical: 'gaseosa', categories: ['azúcar', 'cafeína'], kind: 'drink' },
  { says: ['pola', 'polas', 'cerveza', 'cervezas'], label: 'Cerveza', canonical: 'cerveza', categories: ['alcohol'], kind: 'drink' },
  { says: ['aguardiente', 'guaro'], label: 'Aguardiente', canonical: 'aguardiente', categories: ['alcohol'], kind: 'drink' },
  { says: ['chocolate', 'chocolatico'], label: 'Chocolate', canonical: 'chocolate caliente', categories: ['lácteo', 'cacao'], kind: 'drink' },
  { says: ['agua de panela', 'aguapanela'], label: 'Agua de panela', canonical: 'agua de panela', categories: ['azúcar'], kind: 'drink' },
  { says: ['jugo', 'jugo natural'], label: 'Jugo natural', canonical: 'jugo de fruta', categories: ['fruta'], kind: 'drink' },
  { says: ['ajiaco'], label: 'Ajiaco', canonical: 'ajiaco', categories: ['sopa', 'lácteo'], kind: 'food' },
  { says: ['sancocho'], label: 'Sancocho', canonical: 'sancocho', categories: ['sopa'], kind: 'food' },
  { says: ['corrientazo', 'almuerzo ejecutivo', 'menu del dia'], label: 'Corrientazo', canonical: 'almuerzo casero', categories: ['comida casera'], kind: 'food' },
  { says: ['arroz con pollo'], label: 'Arroz con pollo', canonical: 'arroz con pollo', categories: ['comida casera'], kind: 'food' },
  { says: ['ensalada'], label: 'Ensalada', canonical: 'ensalada', categories: ['verdura'], kind: 'food' },
  { says: ['fruta', 'banano', 'mango', 'papaya'], label: 'Fruta', canonical: 'fruta', categories: ['fruta'], kind: 'food' },
  { says: ['huevos pericos', 'huevos revueltos', 'huevos'], label: 'Huevos pericos', canonical: 'huevos revueltos', categories: ['huevo'], kind: 'food' },
  { says: ['salchipapa', 'salchipapas', 'perro caliente', 'hamburguesa'], label: 'Comida rápida', canonical: 'comida rápida', categories: ['frito', 'grasa'], kind: 'food' },
  { says: ['pizza'], label: 'Pizza', canonical: 'pizza', categories: ['lácteo', 'harina', 'grasa'], kind: 'food' },
];

/** Medicamentos de venta libre frecuentes. "dolex" = acetaminofén. Solo para registrar, nunca para sugerir. */
export const MEDICATIONS = [
  { says: ['dolex', 'acetaminofen', 'paracetamol', 'winadol'], label: 'Acetaminofén (Dolex)', generic: 'acetaminofén' },
  { says: ['ibuprofeno', 'advil', 'motrin'], label: 'Ibuprofeno', generic: 'ibuprofeno' },
  { says: ['naproxeno'], label: 'Naproxeno', generic: 'naproxeno' },
  { says: ['buscapina'], label: 'Buscapina', generic: 'butilbromuro de hioscina' },
  { says: ['sal de frutas', 'alka seltzer', 'alkaseltzer'], label: 'Sal de frutas', generic: 'bicarbonato de sodio' },
  { says: ['omeprazol'], label: 'Omeprazol', generic: 'omeprazol' },
] as const;

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export function findFood(label: string): FoodEntry {
  const f = FOODS.find((x) => x.label === label);
  if (!f) throw new Error(`Comida desconocida en el diccionario: ${label}`);
  return f;
}
