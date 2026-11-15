// Words the sample model returns inside PlanResponse (the backend returns the same
// fields in the requested language). Spanish is a draft for human review.

import type { RotationId } from '../api/types';

type Lang = 'en' | 'es';

type RotationText = {
  name: string;
  seasons: string[];
  reason: string;
  notChosen: string;
  evidence: string;
  benefits: string;
  gaps: string;
  checkLocally: string;
};

export const ROTATION_TEXT: Record<Lang, Record<RotationId, RotationText>> = {
  en: {
    alfalfa: {
      name: 'Alfalfa',
      seasons: ['Alfalfa: all year, cut about 8 to 10 times'],
      reason: 'It earns the most per acre and scores highest for soil, so it carries your soil score.',
      notChosen: 'It needs the most water of any rotation, so at this budget it would push you over in hot years.',
      evidence: 'Alfalfa is the thirstiest common crop in central Arizona, often 5 to 6 acre-feet per acre per year. It is a legume, so it adds its own nitrogen.',
      benefits: 'Steady hay income, living roots all year, nitrogen for the next crop, and almost no tillage once planted.',
      gaps: 'We model alfalfa as a 4-year stand averaged per year. We do not model stand decline, pests, or hay quality discounts.',
      checkLocally: 'Ask about your stand age, hay contracts, and whether deficit irrigation in summer makes sense on your soil.',
    },
    cotton_barley: {
      name: 'Cotton then barley',
      seasons: ['Cotton: Apr to Oct', 'Barley: Dec to Mar'],
      reason: 'It earns well in good price years and uses less water than alfalfa.',
      notChosen: 'Its profit swings the most from year to year, and it still needs a lot of summer water.',
      evidence: 'Upland cotton in Pinal County typically uses around 4 acre-feet per acre. Winter barley uses much less because it grows in cool months.',
      benefits: 'Two crops a year, a winter cover of living roots, and residue that protects the soil.',
      gaps: 'Cotton prices and yields vary a lot. We use 20 past years of prices, which may not match the next 20.',
      checkLocally: 'Check gin access, pink bollworm history, and whether your barley can be sold or grazed nearby.',
    },
    durum_sorghum: {
      name: 'Durum wheat then sorghum',
      seasons: ['Durum wheat: Dec to May', 'Sorghum: Jul to Oct'],
      reason: 'It balances profit and water well, and does better than most in bad years.',
      notChosen: 'It earns less on average than alfalfa or cotton, so it is used only where safety matters more.',
      evidence: 'Desert durum grows through the cool season and needs roughly 3 acre-feet per acre. Grain sorghum tolerates heat and uses less water than corn.',
      benefits: 'Uses winter water when evaporation is low, adds crop variety, and returns a lot of residue.',
      gaps: 'Summer sorghum after durum is a tight window. We do not model planting delays or quality premiums for durum.',
      checkLocally: 'Ask about durum contracts and protein premiums, and whether sorghum fits your equipment and harvest timing.',
    },
    barley_fallow: {
      name: 'Barley then fallow',
      seasons: ['Barley: Dec to May', 'Fallow: Jun to Nov'],
      reason: 'It keeps land earning a little with very little water, skipping the hottest months.',
      notChosen: 'It earns little, so it only shows up when water is very tight.',
      evidence: 'Barley grows in the cool season, so it avoids the summer peak in water demand. Leaving fields fallow in summer saves the most water per acre.',
      benefits: 'Low water use, low risk, and some income on land that might otherwise sit idle.',
      gaps: 'Bare summer soil can blow and lose organic matter. We do not model dust control costs.',
      checkLocally: 'Ask about dust control rules for fallow ground and whether a summer cover crop could fit.',
    },
    fallow: {
      name: 'Fallow',
      seasons: ['Fallow: no crop all year'],
      reason: 'It uses no water, so it lets the rest of your land get the water it needs.',
      notChosen: 'It loses a little money each year and does little for soil, so the model avoids it when water allows.',
      evidence: 'Fallowing is the most common response to water cuts in central Arizona. It costs money for weed and dust control.',
      benefits: 'Frees water for your other fields and is easy to undo next year.',
      gaps: 'We use a flat cost of about $40 per acre. Real costs depend on weeds, dust rules, and land payments.',
      checkLocally: 'Ask about any fallowing programs that pay for conserved water in your district.',
    },
  },
  es: {
    alfalfa: {
      name: 'Alfalfa',
      seasons: ['Alfalfa: todo el año, unos 8 a 10 cortes'],
      reason: 'Es la que más gana por acre y la que más mejora el suelo, así que sostiene su puntaje de suelo.',
      notChosen: 'Es la rotación que más agua necesita, así que con este presupuesto se pasaría en los años calurosos.',
      evidence: 'La alfalfa es el cultivo común que más agua usa en el centro de Arizona, a menudo de 5 a 6 acre-pies por acre al año. Es leguminosa, así que aporta su propio nitrógeno.',
      benefits: 'Ingreso estable de heno, raíces vivas todo el año, nitrógeno para el siguiente cultivo y casi nada de labranza una vez sembrada.',
      gaps: 'Modelamos la alfalfa como un cultivo de 4 años promediado por año. No modelamos el deterioro del cultivo, plagas ni descuentos por calidad del heno.',
      checkLocally: 'Pregunte por la edad de su alfalfa, contratos de heno y si el riego deficitario en verano conviene en su suelo.',
    },
    cotton_barley: {
      name: 'Algodón y luego cebada',
      seasons: ['Algodón: abr a oct', 'Cebada: dic a mar'],
      reason: 'Gana bien en años de buen precio y usa menos agua que la alfalfa.',
      notChosen: 'Su ganancia cambia mucho de un año a otro y aun así necesita mucha agua en verano.',
      evidence: 'El algodón en el condado de Pinal suele usar unos 4 acre-pies por acre. La cebada de invierno usa mucho menos porque crece en meses frescos.',
      benefits: 'Dos cultivos al año, raíces vivas en invierno y residuos que protegen el suelo.',
      gaps: 'Los precios y rendimientos del algodón varían mucho. Usamos 20 años de precios pasados, que pueden no parecerse a los próximos 20.',
      checkLocally: 'Revise el acceso a despepitadora, el historial de gusano rosado y si puede vender o pastorear la cebada cerca.',
    },
    durum_sorghum: {
      name: 'Trigo duro y luego sorgo',
      seasons: ['Trigo duro: dic a may', 'Sorgo: jul a oct'],
      reason: 'Equilibra bien ganancia y agua, y le va mejor que a la mayoría en los años malos.',
      notChosen: 'Gana menos en promedio que la alfalfa o el algodón, así que solo se usa donde la seguridad pesa más.',
      evidence: 'El trigo duro del desierto crece en la temporada fresca y necesita unos 3 acre-pies por acre. El sorgo de grano tolera el calor y usa menos agua que el maíz.',
      benefits: 'Usa agua de invierno cuando la evaporación es baja, agrega variedad y deja muchos residuos.',
      gaps: 'Sembrar sorgo después del trigo duro deja poco margen. No modelamos retrasos de siembra ni primas por calidad.',
      checkLocally: 'Pregunte por contratos de trigo duro y primas por proteína, y si el sorgo le cuadra con su equipo y fechas de cosecha.',
    },
    barley_fallow: {
      name: 'Cebada y luego barbecho',
      seasons: ['Cebada: dic a may', 'Barbecho: jun a nov'],
      reason: 'Mantiene la tierra produciendo algo con muy poca agua y evita los meses más calurosos.',
      notChosen: 'Gana poco, así que solo aparece cuando el agua es muy escasa.',
      evidence: 'La cebada crece en la temporada fresca y evita el pico de demanda de agua del verano. Dejar el campo en barbecho en verano ahorra la mayor cantidad de agua por acre.',
      benefits: 'Poco uso de agua, poco riesgo y algo de ingreso en tierra que de otro modo quedaría sin uso.',
      gaps: 'El suelo desnudo en verano puede volarse y perder materia orgánica. No modelamos costos de control de polvo.',
      checkLocally: 'Pregunte por las reglas de control de polvo para tierra en barbecho y si cabe un cultivo de cobertura en verano.',
    },
    fallow: {
      name: 'Barbecho',
      seasons: ['Barbecho: sin cultivo todo el año'],
      reason: 'No usa agua, así que deja que el resto de su tierra reciba el agua que necesita.',
      notChosen: 'Pierde un poco de dinero cada año y aporta poco al suelo, así que el modelo lo evita cuando el agua alcanza.',
      evidence: 'El barbecho es la respuesta más común a los recortes de agua en el centro de Arizona. Cuesta dinero por el control de malezas y polvo.',
      benefits: 'Libera agua para sus otros campos y es fácil de revertir el próximo año.',
      gaps: 'Usamos un costo fijo de unos $40 por acre. Los costos reales dependen de malezas, reglas de polvo y pagos de tierra.',
      checkLocally: 'Pregunte si su distrito tiene programas que paguen por el agua conservada con barbecho.',
    },
  },
};

export function whyText(lang: Lang, id: RotationId, share: number, isCurrent: boolean): string {
  const t = ROTATION_TEXT[lang][id];
  const pct = Math.round(share * 100);
  if (lang === 'es') {
    if (share > 0) return `Ocupa el ${pct}% de sus acres en el plan sugerido. ${t.reason}`;
    return `${isCurrent ? 'Está en su plan actual pero no' : 'No'} está en el plan sugerido con estos ajustes. ${t.notChosen}`;
  }
  if (share > 0) return `Takes ${pct}% of your acres in the suggested plan. ${t.reason}`;
  return `${isCurrent ? 'Part of your current plan, but not' : 'Not'} in the suggested plan at these settings. ${t.notChosen}`;
}

export const STRESS_LABELS: Record<Lang, Record<number, string>> = {
  en: {
    2020: '2020: record summer heat',
    2022: '2022: Colorado River water for central Arizona farms cut 65%',
    2023: '2023: no Colorado River water for central Arizona farms',
    2024: '2024: no Colorado River water, record heat',
  },
  es: {
    2020: '2020: calor récord en verano',
    2022: '2022: recorte de 65% del agua del río Colorado para granjas del centro de Arizona',
    2023: '2023: sin agua del río Colorado para granjas del centro de Arizona',
    2024: '2024: sin agua del río Colorado y calor récord',
  },
};

type Range = { n: number; from: number; to: number; trainTo: number; testFrom: number };

export const BACKTEST_LABELS: Record<Lang, (y: Range) => { suggested: string; current: string; currentFits: string; maxProfit: string; safest: string }> = {
  en: (y) => ({
    suggested: `Suggested plan, picked using ${y.from} to ${y.trainTo}`,
    current: 'Your current plan, cut back to fit your water',
    currentFits: 'Your current plan',
    maxProfit: `Highest average, picked using ${y.from} to ${y.trainTo}`,
    safest: `Safest, picked using ${y.from} to ${y.trainTo}`,
  }),
  es: (y) => ({
    suggested: `Plan sugerido, elegido con ${y.from} a ${y.trainTo}`,
    current: 'Su plan actual, recortado para caber en su agua',
    currentFits: 'Su plan actual',
    maxProfit: `Mayor promedio, elegido con ${y.from} a ${y.trainTo}`,
    safest: `El más seguro, elegido con ${y.from} a ${y.trainTo}`,
  }),
};

/** The first line is the sample warning; the engine drops it once the plan's inputs are real. */
export const ASSUMPTIONS: Record<Lang, (y: Range) => string[]> = {
  en: (y) => [
    'SAMPLE DATA: every profit, water, and soil number here is a placeholder for building the tool, not an estimate for any farm.',
    `Each of the ${y.n} past years (${y.from} to ${y.to}) is treated as one possible next year, with its own weather and prices.`,
    'Your water budget must hold in every one of those years, including the hottest.',
    'Profits are per acre in 2025 dollars and leave out the cost of buying water. Add a water cost under More options.',
    'Applied water assumes 75% irrigation efficiency unless you change it under More options.',
    'Alfalfa is modeled as a 4-year stand, averaged per year. Pests, diseases, and hay quality are not modeled.',
    'Shares move in 5% steps, so the suggested plan is the best of 10,626 possible mixes.',
    'Soil scores follow the four USDA NRCS soil-health principles (maximize soil cover, maximize continuous living roots, minimize disturbance, maximize biodiversity) plus nitrogen from legumes. An agronomist has not reviewed them yet; check them with a local expert.',
  ],
  es: (y) => [
    'DATOS DE MUESTRA: cada número de ganancia, agua y suelo aquí es un valor de prueba para construir la herramienta, no una estimación para ninguna granja.',
    `Cada uno de los ${y.n} años pasados (${y.from} a ${y.to}) se trata como un posible próximo año, con su propio clima y precios.`,
    'Su presupuesto de agua debe cumplirse en cada uno de esos años, incluido el más caluroso.',
    'Las ganancias son por acre en dólares de 2025 y no incluyen el costo de comprar agua. Agregue un costo de agua en Más opciones.',
    'El agua aplicada supone 75% de eficiencia de riego, salvo que la cambie en Más opciones.',
    'La alfalfa se modela como un cultivo de 4 años promediado por año. No se modelan plagas, enfermedades ni calidad del heno.',
    'Las proporciones cambian en pasos de 5%, así que el plan sugerido es el mejor de 10,626 mezclas posibles.',
    'Los puntajes de suelo siguen los cuatro principios de salud del suelo del USDA NRCS (maximizar la cobertura del suelo, maximizar las raíces vivas continuas, minimizar la alteración, maximizar la biodiversidad) más el nitrógeno de las leguminosas. Un agrónomo todavía no los ha revisado; revíselos con un experto local.',
  ],
};
