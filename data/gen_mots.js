// gen_mots.js - Génération de la liste de mots français pour Tusmo
// Utilise le package an-array-of-french-words (~336 000 mots)

const fs = require('fs');
const path = require('path');
const words = require('an-array-of-french-words');

// Regex pour filtrer: seulement lettres + accents (pas de tirets, apostrophes, etc.)
const regex = /^[a-zàâäáãåçéèêëíìîïñóòôöõúùûüÿœæ]+$/i;

// Fonction pour normaliser (enlever les accents) pour le jeu
function normalizeWord(word) {
    return word
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

// Filtrage des mots
const filtered = words.filter(w => {
    // Longueur entre 4 et 10 (comme Tusmo original)
    if (w.length < 4 || w.length > 10) return false;
    // Seulement des lettres (pas de tirets, apostrophes, etc.)
    if (!regex.test(w)) return false;
    return true;
});

console.log(`📚 Total original : ${words.length} mots`);
console.log(`📝 Total filtré (4-10 lettres) : ${filtered.length} mots`);

// Normaliser les mots (enlever accents, mettre en majuscules)
const seen = new Set();
const normalizedWords = filtered
    .map(w => normalizeWord(w))
    .filter(w => {
        // Supprimer les doublons après normalisation
        if (seen.has(w)) return false;
        seen.add(w);
        return true;
    })
    .sort();

console.log(`✨ Après déduplication : ${normalizedWords.length} mots uniques`);

// Stats par longueur
const byLength = {};
normalizedWords.forEach(word => {
    const len = word.length;
    if (!byLength[len]) byLength[len] = [];
    byLength[len].push(word);
});

console.log('\n📊 Statistiques par longueur:');
for (let len = 4; len <= 10; len++) {
    console.log(`  ${len} lettres: ${(byLength[len] || []).length} mots`);
}

// Vérification de quelques mots
console.log('\n🔍 Vérification de mots courants:');
const samples = ['RUINE', 'VOITURE', 'TELEPHONE', 'MANGER', 'MANGE', 'BOIRE', 'BOIS', 'SCORES', 'MAISON'];
samples.forEach(s => {
    console.log(`  ${s}: ${normalizedWords.includes(s) ? '✅' : '❌'}`);
});

// Écriture du fichier words.js pour le serveur
const outputFile = path.join(__dirname, '..', 'src', 'words.js');
const jsContent = `// French words dictionary (from an-array-of-french-words)
// ${normalizedWords.length} words, 4-10 letters, normalized (no accents)
// Includes all conjugations, plurals, feminine forms

const FRENCH_WORDS = [
${normalizedWords.map(w => `    '${w}'`).join(',\n')}
];

module.exports = FRENCH_WORDS;
`;

fs.writeFileSync(outputFile, jsContent);
console.log(`\n✅ Fichier créé: ${outputFile}`);
