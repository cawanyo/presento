import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let joinCode = 'APP5AD';
let count = 250;
let convexUrl = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--code' && args[i + 1]) joinCode = args[i + 1].toUpperCase();
  if (args[i] === '--count' && args[i + 1]) count = parseInt(args[i + 1], 10);
  if (args[i] === '--url' && args[i + 1]) convexUrl = args[i + 1];
}

// If no URL provided, attempt to read from .env.local or .env
if (!convexUrl) {
  try {
    const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    const match = envLocal.match(/VITE_CONVEX_URL=(.+)/);
    if (match) convexUrl = match[1].trim();
  } catch {}
}
if (!convexUrl) {
  try {
    const env = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const match = env.match(/VITE_CONVEX_URL=(.+)/);
    if (match) convexUrl = match[1].trim();
  } catch {}
}
if (!convexUrl) {
  convexUrl = 'https://ceaseless-shark-75.eu-west-1.convex.cloud';
}

console.log(`\n🚀 Initialisation de la simulation de ${count} participants...`);
console.log(`📍 URL Backend Convex : ${convexUrl}`);
console.log(`🔑 Code de présentation : ${joinCode}\n`);

async function convexQuery(endpointUrl, pathName, queryArgs = {}) {
  const res = await fetch(`${endpointUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: pathName, args: queryArgs, format: 'json' }),
  });
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.errorMessage);
  return data.value;
}

async function convexMutation(endpointUrl, pathName, mutationArgs = {}) {
  const res = await fetch(`${endpointUrl}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: pathName, args: mutationArgs, format: 'json' }),
  });
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.errorMessage);
  return data.value;
}

async function run() {
  const startTime = Date.now();

  // 1. Find presentation
  console.log(`🔍 Recherche de la présentation avec le code [${joinCode}]...`);
  let presentation = null;
  try {
    presentation = await convexQuery(convexUrl, 'presentations:getByJoinCode', { join_code: joinCode });
  } catch (err) {
    console.error(`❌ Erreur de connexion à Convex :`, err.message);
    process.exit(1);
  }

  if (!presentation) {
    console.error(`⚠️ Aucune présentation trouvée avec le code [${joinCode}] sur ${convexUrl}.`);
    console.log(`\n💡 Vérifiez si votre présentation tourne sur une autre URL (ex: production Vercel ou local 127.0.0.1).`);
    console.log(`   Vous pouvez spécifier une URL avec : node scripts/simulate.js --code ${joinCode} --url <URL_CONVEX>`);
    process.exit(1);
  }

  const presId = presentation.id || presentation._id;
  console.log(`✅ Présentation trouvée : "${presentation.title}" (ID: ${presId}, Statut: ${presentation.status})`);

  // 2. Find current question
  let currentQuestion = null;
  if (presentation.current_question_id) {
    currentQuestion = await convexQuery(convexUrl, 'questions:getById', { id: presentation.current_question_id });
  }

  if (!currentQuestion) {
    // Try to get first question of the presentation
    const allQuestions = await convexQuery(convexUrl, 'questions:listByPresentation', { presentation_id: presId });
    if (allQuestions && allQuestions.length > 0) {
      currentQuestion = allQuestions[0];
      console.log(`ℹ️ Aucune question active définie sur la présentation. Utilisation de la 1ère question : "${currentQuestion.title}"`);
    }
  }

  if (currentQuestion) {
    console.log(`📊 Question ciblée : "${currentQuestion.title}" (Type: ${currentQuestion.type})`);
  } else {
    console.log(`⚠️ Aucune question trouvée dans la présentation. Seule l'inscription des participants sera simulée.`);
  }

  // 3. Simulate Participants Joining
  console.log(`\n👥 Étape 1/2 : Connexion de ${count} participants...`);
  const joinBatchSize = 25;
  let joinedCount = 0;

  for (let i = 0; i < count; i += joinBatchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + joinBatchSize, count); j++) {
      const partId = `sim_p_${Date.now()}_${j + 1}`;
      const name = `Participant ${j + 1}`;
      batch.push(
        convexMutation(convexUrl, 'participants:join', {
          presentation_id: presId,
          participant_id: partId,
          name,
        }).then(() => {
          joinedCount++;
        })
      );
    }
    await Promise.all(batch);
    process.stdout.write(`\r   Connectés : ${joinedCount}/${count} (${Math.round((joinedCount / count) * 100)}%)`);
  }
  console.log(`\n   🎉 Tous les ${count} participants sont connectés !`);

  // 4. Simulate Voting
  if (currentQuestion) {
    const qId = currentQuestion.id || currentQuestion._id;
    console.log(`\n🗳️  Étape 2/2 : Envoi des votes de ${count} participants...`);

    const qType = currentQuestion.type;
    const opts = currentQuestion.options || {};
    let choices = [];
    if (Array.isArray(opts)) choices = opts;
    else if (opts && Array.isArray(opts.choices)) choices = opts.choices;
    if (choices.length === 0) choices = ['Option A', 'Option B', 'Option C'];

    const wordCloudKeywords = ['Rapide', 'Interactif', 'Innovant', 'Simple', 'Efficace', 'Fluide', 'Design', 'Puissant', 'Top', 'Super'];

    const voteBatchSize = 25;
    let votesCount = 0;

    for (let i = 0; i < count; i += voteBatchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + voteBatchSize, count); j++) {
        const partId = `sim_p_${Date.now()}_${j + 1}`;
        let answer = '';

        if (qType === 'multiple_choice' || qType === 'quiz') {
          // Weighted random choice
          answer = choices[Math.floor(Math.random() * choices.length)];
        } else if (qType === 'rating') {
          // Score 3, 4, or 5 mostly
          const ratings = ['3', '4', '4', '5', '5', '5'];
          answer = ratings[Math.floor(Math.random() * ratings.length)];
        } else if (qType === 'word_cloud') {
          answer = wordCloudKeywords[Math.floor(Math.random() * wordCloudKeywords.length)];
        } else {
          answer = `Excellente présentation ! (#${j + 1})`;
        }

        batch.push(
          convexMutation(convexUrl, 'responses:submit', {
            question_id: qId,
            participant_id: partId,
            participant_name: `Participant ${j + 1}`,
            answers: [answer],
          }).then(() => {
            votesCount++;
          })
        );
      }
      await Promise.all(batch);
      process.stdout.write(`\r   Votes enregistrés : ${votesCount}/${count} (${Math.round((votesCount / count) * 100)}%)`);
    }
    console.log(`\n   🎉 Tous les ${count} votes ont été comptabilisés en direct !`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️  Temps total d'exécution : ${durationSec}s`);
  console.log(`⚡ Débit moyen : ${(count / durationSec).toFixed(1)} requêtes/seconde`);
  console.log(`✨ Votre écran de présentation doit maintenant afficher les 250 participants et leurs résultats en temps réel !\n`);
}

run().catch((err) => {
  console.error('\n❌ Erreur pendant la simulation :', err);
  process.exit(1);
});
