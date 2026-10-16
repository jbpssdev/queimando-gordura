import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import admin from 'firebase-admin';
import { allowedDevelopmentProjects } from './cloud-safety.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, '../src/modules/foods/data/taco-data.json');

export function loadAndValidateTacoData() {
  const content = readFileSync(DATA_FILE, 'utf8');
  const items = JSON.parse(content);

  if (!Array.isArray(items) || items.length === 0) {
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
  console.log(`Fonte: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição (NEPA/Unicamp)`);
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

  // Verificações de segurança antes de gravar no Firestore
  if (options.cloudDev) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!allowedDevelopmentProjects.includes(projectId)) {
      throw new Error(`Projeto ${projectId} não é autorizado para importação no Cloud DEV.`);
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Importação bloqueada em ambiente NODE_ENV=production.');
    }
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const firestore = admin.firestore();
  console.log(`\nIniciando importação idempotente de ${items.length} alimentos para a coleção 'foods'...`);

  // Batch writes em blocos de até 400 (limite Firestore é 500)
  const BATCH_SIZE = 400;
  let batch = firestore.batch();
  let count = 0;
  let totalCommitted = 0;

  for (const item of items) {
    const docRef = firestore.collection('foods').doc(item.id);
    batch.set(
      docRef,
      {
        ...item,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    count += 1;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      totalCommitted += count;
      console.log(`Progresso: ${totalCommitted}/${items.length} itens gravados.`);
      batch = firestore.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    totalCommitted += count;
  }

  console.log(`Importação concluída com sucesso! Total gravado: ${totalCommitted} alimentos.`);
  return { success: true, dryRun: false, totalCommitted, report };
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
