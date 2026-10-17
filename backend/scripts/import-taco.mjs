import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, deleteApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { allowedDevelopmentProjects } from './cloud-safety.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, '../src/modules/foods/data/taco-data.json');

export function loadAndValidateTacoData() {
  const content = readFileSync(DATA_FILE, 'utf8');
  const items = JSON.parse(content);

  if (!Array.isArray(items) || items.length !== 597) {
    throw new Error('Arquivo de dados TACO vazio ou inválido.');
  }

  const report = {
    totalItems: items.length,
    byCategory: {},
    withMeasures: 0,
    gramOnly: 0,
    nullEnergy: 0,
    nullProtein: 0,
    nullCarb: 0,
    nullFat: 0,
    nullFiber: 0,
  };

  const idSet = new Set();

  for (const item of items) {
    if (!item.id || !item.id.startsWith('taco_')) {
      throw new Error(`Item com ID inválido: ${item.id}`);
    }
    if (idSet.has(item.id)) {
      throw new Error(`ID duplicado detectado: ${item.id}`);
    }
    idSet.add(item.id);

    if (!item.name || typeof item.name !== 'string') {
      throw new Error(`Item ${item.id} sem nome válido.`);
    }

    if (!item.category || typeof item.category !== 'string') {
      throw new Error(`Item ${item.id} sem categoria válida.`);
    }

    report.byCategory[item.category] = (report.byCategory[item.category] ?? 0) + 1;

    const n = item.nutrientsPer100g;
    if (!n) {
      throw new Error(`Item ${item.id} sem objeto nutrientsPer100g.`);
    }

    for (const [key, value] of Object.entries(n)) {
      if (
        value !== null &&
        (typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > (key === 'energyKcal' ? 1000 : 100))
      )
        throw new Error(`Nutriente inválido: ${item.id}/${key}`);
    }
    if (!item.sourceUrl || !item.sourceReference)
      throw new Error(`Proveniência ausente: ${item.id}`);
    if (n.energyKcal === null) report.nullEnergy += 1;
    if (n.proteinG === null) report.nullProtein += 1;
    if (n.carbohydrateG === null) report.nullCarb += 1;
    if (n.fatG === null) report.nullFat += 1;
    if (n.fiberG === null) report.nullFiber += 1;

    if (Array.isArray(item.householdMeasures) && item.householdMeasures.length > 0) {
      report.withMeasures += 1;
      for (const m of item.householdMeasures) {
        if (!m.id || !m.label || typeof m.grams !== 'number' || m.grams <= 0) {
          throw new Error(`Medida inválida no alimento ${item.id}: ${JSON.stringify(m)}`);
        }
      }
    } else {
      report.gramOnly += 1;
    }
  }

  return { items, report };
}

export async function runImport(options = {}) {
  const isDryRun = options.dryRun ?? (!options.emulator && !options.cloudDev);
  const { items, report } = loadAndValidateTacoData();

  console.log('=== RELATÓRIO DE VALIDAÇÃO DO CATÁLOGO TACO ===');
  console.log(
    `Fonte: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição (NEPA/Unicamp)`,
  );
  console.log(`Total de alimentos verificados: ${report.totalItems}`);
  console.log(`Alimentos com medidas caseiras IBGE/POF: ${report.withMeasures}`);
  console.log(`Alimentos com medição exclusiva em gramas: ${report.gramOnly}`);
  console.log('Distribuição por categoria:');
  for (const [cat, count] of Object.entries(report.byCategory)) {
    console.log(`  - ${cat}: ${count}`);
  }
  console.log('Nutrientes com valores não determinados (preservados como null):');
  console.log(`  - Energia (kcal): ${report.nullEnergy}`);
  console.log(`  - Proteína (g): ${report.nullProtein}`);
  console.log(`  - Carboidrato (g): ${report.nullCarb}`);
  console.log(`  - Lipídios (g): ${report.nullFat}`);
  console.log(`  - Fibra alimentar (g): ${report.nullFiber}`);

  if (isDryRun) {
    console.log('\n[MODO DRY-RUN] Validação concluída com sucesso. Nenhuma gravação efetuada.');
    return { success: true, dryRun: true, report };
  }

  if (Boolean(options.emulator) === Boolean(options.cloudDev))
    throw new Error('Selecione somente emulador ou Cloud DEV.');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (
    options.emulator &&
    (projectId !== 'demo-queimando-gordura' ||
      process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
      process.env.NODE_ENV === 'production')
  )
    throw new Error('Importação exige projeto demo exato e Firestore Emulator local.');
  if (
    options.cloudDev &&
    (!allowedDevelopmentProjects.includes(projectId) ||
      process.env.FIREBASE_ALLOW_CATALOG_IMPORT !== 'true' ||
      process.env.NODE_ENV === 'production' ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST)
  )
    throw new Error(
      'Cloud exige autorização explícita, ADC, projeto DEV permitido e ausência de emuladores.',
    );
  const app = initializeApp(
    { projectId, ...(options.cloudDev ? { credential: applicationDefault() } : {}) },
    `catalog-import-${Date.now()}`,
  );
  const firestore = getFirestore(app);
  let created = 0,
    unchanged = 0;
  try {
    for (let offset = 0; offset < items.length; offset += 400) {
      const chunk = items.slice(offset, offset + 400);
      const snapshots = await firestore.getAll(
        ...chunk.map((item) => firestore.doc(`foods/${item.id}`)),
      );
      const batch = firestore.batch();
      let writes = 0;
      for (const [index, item] of chunk.entries()) {
        const snapshot = snapshots[index];
        if (snapshot.exists) {
          if (JSON.stringify(snapshot.data()) !== JSON.stringify(item)) {
            // Comparação ignora ordenação das propriedades retornadas pelo Firestore.
            const same = (a, b) =>
              JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
            if (!same(JSON.parse(JSON.stringify(snapshot.data())), item)) {
              const stable = (v) =>
                Array.isArray(v)
                  ? v.map(stable)
                  : v && typeof v === 'object'
                    ? Object.fromEntries(
                        Object.entries(v)
                          .sort()
                          .map(([k, x]) => [k, stable(x)]),
                      )
                    : v;
              if (JSON.stringify(stable(snapshot.data())) !== JSON.stringify(stable(item)))
                throw new Error(
                  `Documento preexistente divergente: ${item.id}; não foi sobrescrito.`,
                );
            }
          }
          unchanged++;
          continue;
        }
        batch.create(snapshot.ref, item);
        created++;
        writes++;
      }
      if (writes) await batch.commit();
    }
    console.log(
      `Catálogo: ${items.length} alimentos; criados=${created}; inalterados=${unchanged}.`,
    );
    return { success: true, dryRun: false, totalCommitted: created, report };
  } finally {
    await firestore.terminate();
    await deleteApp(app);
  }
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const isDryRun = process.argv.includes('--dry-run');
  const isEmulator = process.argv.includes('--emulator');
  const isCloudDev = process.argv.includes('--cloud-dev');

  runImport({
    dryRun: isDryRun || (!isEmulator && !isCloudDev),
    emulator: isEmulator,
    cloudDev: isCloudDev,
  }).catch((err) => {
    console.error('Erro durante importação TACO:', err.message);
    process.exit(1);
  });
}
