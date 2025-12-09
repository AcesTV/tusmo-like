// Script to create a curated list of common French words
// Based on everyday vocabulary that everyone would know

const fs = require('fs');
const path = require('path');

// Common French word roots (nouns, adjectives, verbs in infinitive)
const commonRoots = [
    // TRANSPORT & VEHICULES
    'voiture', 'camion', 'avion', 'train', 'bateau', 'velo', 'moto', 'bus', 'metro', 'taxi',
    'roue', 'moteur', 'essence', 'route', 'autoroute', 'parking', 'garage', 'permis',

    // MAISON & MEUBLES
    'maison', 'appartement', 'chambre', 'cuisine', 'salon', 'salle', 'jardin', 'balcon',
    'porte', 'fenetre', 'mur', 'toit', 'escalier', 'cave', 'grenier', 'terrasse',
    'ruine', 'ruines', 'cabane', 'chalet', 'villa', 'chateau', 'palais', 'tour', 'tours',
    'immeuble', 'batiment', 'edifice', 'facade', 'entree', 'sortie', 'couloir', 'etage',
    'table', 'chaise', 'lit', 'armoire', 'canape', 'bureau', 'etagere', 'tiroir',
    'lampe', 'miroir', 'rideau', 'tapis', 'coussin', 'drap', 'oreiller', 'couverture',

    // TECHNOLOGIE
    'telephone', 'ordinateur', 'ecran', 'clavier', 'souris', 'internet', 'portable',
    'tablette', 'camera', 'photo', 'video', 'musique', 'radio', 'television',

    // NOURRITURE & BOISSONS
    'pain', 'beurre', 'fromage', 'viande', 'poulet', 'poisson', 'oeuf', 'lait',
    'cafe', 'the', 'jus', 'eau', 'vin', 'biere', 'sucre', 'sel', 'poivre',
    'fruit', 'pomme', 'banane', 'orange', 'fraise', 'cerise', 'raisin', 'citron',
    'legume', 'carotte', 'pomme', 'tomate', 'salade', 'oignon', 'haricot',
    'gateau', 'chocolat', 'bonbon', 'glace', 'biscuit', 'tarte', 'pizza', 'pates',
    'soupe', 'sauce', 'huile', 'vinaigre', 'moutarde', 'farine', 'riz',

    // VETEMENTS
    'pantalon', 'chemise', 'pull', 'veste', 'manteau', 'robe', 'jupe', 'short',
    'chaussure', 'botte', 'sandale', 'basket', 'chaussette', 'ceinture',
    'chapeau', 'casquette', 'echarpe', 'gant', 'lunette', 'montre', 'bijou',

    // CORPS HUMAIN
    'tete', 'cheveu', 'visage', 'oeil', 'yeux', 'nez', 'bouche', 'oreille', 'joue', 'menton',
    'bras', 'main', 'doigt', 'ongle', 'epaule', 'coude', 'poignet',
    'jambe', 'pied', 'genou', 'cheville', 'orteil', 'dos', 'ventre', 'coeur', 'poumon',

    // FAMILLE & PERSONNES
    'pere', 'mere', 'parent', 'enfant', 'fils', 'fille', 'frere', 'soeur',
    'oncle', 'tante', 'cousin', 'neveu', 'niece', 'mamie', 'papy',
    'mari', 'femme', 'copain', 'copine', 'ami', 'amie', 'voisin', 'voisine',
    'bebe', 'garcon', 'homme', 'monsieur', 'madame', 'personne', 'gens',

    // METIERS
    'docteur', 'medecin', 'infirmier', 'pompier', 'policier', 'facteur',
    'professeur', 'instituteur', 'etudiant', 'eleve', 'directeur',
    'boulanger', 'boucher', 'coiffeur', 'cuisinier', 'serveur', 'patron',
    'avocat', 'juge', 'architecte', 'ingenieur', 'artiste', 'musicien', 'acteur',
    'vendeur', 'caissier', 'secretaire', 'comptable', 'chauffeur', 'pilote',

    // ANIMAUX
    'chien', 'chat', 'oiseau', 'poisson', 'lapin', 'hamster', 'tortue', 'souris',
    'vache', 'cochon', 'poule', 'coq', 'cheval', 'mouton', 'chevre', 'canard',
    'lion', 'tigre', 'elephant', 'singe', 'girafe', 'ours', 'loup', 'renard',
    'serpent', 'crocodile', 'dauphin', 'baleine', 'requin', 'araignee', 'abeille', 'papillon',

    // NATURE & METEO
    'soleil', 'lune', 'etoile', 'ciel', 'nuage', 'pluie', 'neige', 'vent', 'orage',
    'arbre', 'fleur', 'herbe', 'feuille', 'branche', 'racine', 'foret', 'parc',
    'mer', 'ocean', 'plage', 'sable', 'vague', 'ile', 'riviere', 'lac', 'cascade',
    'montagne', 'colline', 'vallee', 'desert', 'champ', 'prairie', 'campagne',

    // TEMPS & CALENDRIER
    'heure', 'minute', 'seconde', 'jour', 'nuit', 'matin', 'midi', 'soir',
    'semaine', 'mois', 'annee', 'siecle', 'moment', 'instant', 'fois',
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
    'janvier', 'fevrier', 'mars', 'avril', 'juin', 'juillet', 'aout',
    'septembre', 'octobre', 'novembre', 'decembre', 'printemps', 'ete', 'automne', 'hiver',

    // LIEUX
    'ville', 'village', 'quartier', 'rue', 'avenue', 'place', 'pont', 'carrefour',
    'magasin', 'supermarche', 'boulangerie', 'pharmacie', 'banque', 'poste', 'hopital',
    'ecole', 'college', 'lycee', 'universite', 'bibliotheque', 'musee', 'cinema', 'theatre',
    'restaurant', 'hotel', 'cafe', 'bar', 'discoteque', 'stade', 'piscine', 'gymnase',
    'eglise', 'mairie', 'gare', 'aeroport', 'port', 'marche', 'centre',

    // OBJETS QUOTIDIENS
    'livre', 'cahier', 'stylo', 'crayon', 'gomme', 'regle', 'ciseaux', 'colle',
    'sac', 'valise', 'parapluie', 'cle', 'porte', 'serrure', 'cadeau', 'jouet',
    'assiette', 'verre', 'tasse', 'bol', 'couteau', 'fourchette', 'cuillere', 'casserole',
    'serviette', 'savon', 'brosse', 'peigne', 'dentifrice', 'shampoing',

    // EMOTIONS & SENTIMENTS
    'amour', 'bonheur', 'joie', 'plaisir', 'surprise', 'espoir', 'courage', 'confiance',
    'peur', 'colere', 'tristesse', 'douleur', 'stress', 'fatigue', 'ennui', 'honte',

    // CONCEPTS & ABSTRAITS
    'idee', 'pensee', 'probleme', 'solution', 'question', 'reponse', 'choix', 'decision',
    'travail', 'projet', 'plan', 'objectif', 'resultat', 'succes', 'echec', 'erreur',
    'argent', 'prix', 'cout', 'facture', 'salaire', 'depense', 'economie',
    'force', 'vitesse', 'taille', 'poids', 'forme', 'couleur', 'bruit', 'silence',

    // SPORT & JEUX
    'sport', 'match', 'equipe', 'joueur', 'score', 'scores', 'point', 'points', 'but', 'buts',
    'ballon', 'balle', 'raquette', 'filet', 'terrain', 'stade', 'piscine', 'gymnase',
    'football', 'basket', 'tennis', 'rugby', 'natation', 'course', 'velo', 'ski',
    'marathon', 'sprint', 'saut', 'lancer', 'tir', 'combat', 'boxe', 'judo',
    'victoire', 'defaite', 'final', 'finale', 'champion', 'arbitre', 'penalty',
    'corner', 'faute', 'carton', 'pause', 'temps', 'minute', 'seconde',
    'carte', 'cartes', 'pion', 'pions', 'des', 'plateau', 'partie', 'parties',
    'niveau', 'bonus', 'malus', 'record', 'records', 'classement',

    // ANGLICISMES COURANTS (français courant)
    'mail', 'mails', 'email', 'emails', 'texto', 'textos', 'appli', 'applis',
    'selfie', 'selfies', 'like', 'likes', 'post', 'posts', 'blog', 'blogs',
    'buzz', 'cool', 'fun', 'look', 'looks', 'style', 'styles', 'mode', 'modes',
    'shopping', 'parking', 'camping', 'meeting', 'planning', 'timing',
    'week', 'weekend', 'coach', 'coachs', 'leader', 'manager', 'business',
    'stress', 'break', 'snack', 'snacks', 'fast', 'food', 'burger', 'pizza',

    // ECOLE & TRAVAIL
    'classe', 'classes', 'cours', 'devoir', 'devoirs', 'examen', 'examens', 'note', 'notes',
    'lecon', 'lecons', 'exercice', 'dictee', 'calcul', 'calculs', 'lecture', 'lectures',
    'recreation', 'cantine', 'tableau', 'craie', 'cartable', 'trousse', 'agenda',
    'reunion', 'reunions', 'bureau', 'bureaux', 'dossier', 'dossiers', 'fichier', 'fichiers',
    'rapport', 'rapports', 'contrat', 'contrats', 'client', 'clients', 'commande', 'commandes',
    'livraison', 'facture', 'factures', 'paiement', 'paiements', 'cheque', 'cheques',

    // SANTE & CORPS (suite)
    'rhume', 'grippe', 'fievre', 'toux', 'migraine', 'allergie', 'vaccin', 'vaccins',
    'pilule', 'sirop', 'pansement', 'bandage', 'blessure', 'fracture', 'operation',
    'hopital', 'clinique', 'cabinet', 'ordonnance', 'medicament', 'traitement',

    // COMMUNICATION
    'message', 'messages', 'lettre', 'lettres', 'courrier', 'courriers', 'colis',
    'appel', 'appels', 'sonnerie', 'signal', 'signaux', 'annonce', 'annonces',
    'nouvelle', 'nouvelles', 'histoire', 'histoires', 'conte', 'contes', 'roman', 'romans',
    'journal', 'journaux', 'article', 'articles', 'titre', 'titres', 'page', 'pages',

    // FETES & EVENEMENTS
    'fete', 'fetes', 'anniversaire', 'mariage', 'mariages', 'bapteme', 'ceremonie',
    'soiree', 'soirees', 'concert', 'concerts', 'spectacle', 'spectacles', 'festival',
    'vacance', 'vacances', 'voyage', 'voyages', 'sejour', 'sejours', 'excursion',
    'cadeau', 'cadeaux', 'gateau', 'gateaux', 'bougie', 'bougies', 'ballon', 'ballons',

    // COULEURS
    'rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet', 'rose', 'marron',
    'noir', 'blanc', 'gris', 'beige', 'dore', 'argente',

    // NOMBRES & QUANTITES
    'nombre', 'chiffre', 'moitie', 'quart', 'tiers', 'double', 'triple',
    'zero', 'trois', 'quatre', 'cinq', 'sept', 'huit', 'neuf', 'onze', 'douze',
    'treize', 'quatorze', 'quinze', 'seize', 'vingt', 'trente', 'quarante',
    'cinquante', 'soixante', 'cent', 'mille', 'million',

    // ADJECTIFS COMMUNS
    'grand', 'petit', 'gros', 'mince', 'long', 'court', 'large', 'etroit',
    'haut', 'bas', 'profond', 'plat', 'rond', 'carre', 'droit', 'courbe',
    'beau', 'joli', 'mignon', 'laid', 'nouveau', 'vieux', 'ancien', 'moderne',
    'bon', 'mauvais', 'bien', 'mal', 'meilleur', 'pire', 'excellent', 'parfait',
    'facile', 'difficile', 'simple', 'complexe', 'possible', 'impossible',
    'vrai', 'faux', 'certain', 'probable', 'normal', 'special', 'different', 'pareil',
    'chaud', 'froid', 'tiede', 'frais', 'sec', 'humide', 'propre', 'sale',
    'plein', 'vide', 'lourd', 'leger', 'dur', 'mou', 'solide', 'liquide',
    'rapide', 'lent', 'calme', 'agite', 'silencieux', 'bruyant',
    'content', 'heureux', 'triste', 'fache', 'inquiet', 'surpris', 'fatigue',
    'fort', 'faible', 'malade', 'sain', 'jeune', 'age', 'libre', 'occupe',
    'seul', 'ensemble', 'premier', 'dernier', 'suivant', 'precedent', 'prochain',

    // VERBES COURANTS (infinitifs)
    'etre', 'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir', 'pouvoir', 'vouloir', 'devoir',
    'venir', 'tenir', 'prendre', 'rendre', 'mettre', 'partir', 'sortir', 'sentir', 'dormir',
    'manger', 'boire', 'cuisiner', 'preparer', 'couper', 'melanger', 'gouter', 'servir',
    'parler', 'ecouter', 'entendre', 'regarder', 'lire', 'ecrire', 'apprendre', 'comprendre',
    'penser', 'croire', 'imaginer', 'rever', 'oublier', 'rappeler', 'souvenir',
    'aimer', 'adorer', 'detester', 'preferer', 'esperer', 'craindre', 'souhaiter',
    'travailler', 'etudier', 'chercher', 'trouver', 'donner', 'recevoir', 'garder', 'perdre',
    'acheter', 'vendre', 'payer', 'couter', 'depenser', 'economiser',
    'marcher', 'courir', 'sauter', 'tomber', 'monter', 'descendre', 'entrer', 'arriver',
    'ouvrir', 'fermer', 'allumer', 'eteindre', 'casser', 'reparer', 'construire', 'detruire',
    'laver', 'secher', 'nettoyer', 'ranger', 'jeter', 'ramasser', 'porter', 'poser',
    'appeler', 'repondre', 'demander', 'expliquer', 'raconter', 'montrer', 'cacher',
    'jouer', 'gagner', 'danser', 'chanter', 'dessiner', 'peindre', 'fabriquer', 'creer',
    'attendre', 'commencer', 'finir', 'continuer', 'arreter', 'changer', 'rester',
    'aider', 'accompagner', 'suivre', 'guider', 'proteger', 'sauver', 'soigner',
    'rire', 'pleurer', 'sourire', 'crier', 'chuchoter', 'soupirer',
    'nager', 'plonger', 'voler', 'conduire', 'piloter', 'voyager', 'visiter',
    'habiter', 'vivre', 'naitre', 'mourir', 'grandir', 'vieillir',
    'mordre', 'griffer', 'piquer', 'bruler', 'chauffer', 'refroidir', 'geler',
    'tirer', 'pousser', 'frapper', 'toucher', 'caresser', 'embrasser', 'serrer',
    'lever', 'baisser', 'tourner', 'retourner', 'plier', 'depiler',
    'remplir', 'vider', 'verser', 'renverser', 'repandre',

    // CONJUGAISONS IRREGULIERES COURANTES
    // Être
    'suis', 'sont', 'sommes', 'etes', 'etais', 'etait', 'etions', 'etiez', 'etaient', 'serai', 'seras', 'sera', 'serons', 'serez', 'seront',
    // Avoir
    'avons', 'avez', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
    // Faire
    'fais', 'fait', 'faites', 'faisons', 'font', 'faisais', 'faisait', 'faisions', 'faisaient', 'ferai', 'feras', 'fera', 'ferons', 'ferez', 'feront',
    // Aller
    'vais', 'allons', 'allez', 'vont', 'allais', 'allait', 'allions', 'alliez', 'allaient', 'irai', 'iras', 'irons', 'irez', 'iront',
    // Venir
    'viens', 'vient', 'venons', 'venez', 'viennent', 'venais', 'venait', 'venions', 'veniez', 'venaient', 'viendrai', 'viendra', 'viendrons',
    // Prendre
    'prends', 'prend', 'prenons', 'prenez', 'prennent', 'prenais', 'prenait', 'prenions', 'preniez', 'prenaient', 'prendrai', 'prendra',
    // Voir
    'vois', 'voit', 'voyons', 'voyez', 'voient', 'voyais', 'voyait', 'voyions', 'voyaient', 'verrai', 'verra', 'verrons',
    // Savoir
    'sais', 'sait', 'savons', 'savez', 'savent', 'savais', 'savait', 'savions', 'savaient', 'saurai', 'saura', 'saurons',
    // Pouvoir
    'peux', 'peut', 'pouvons', 'pouvez', 'peuvent', 'pouvais', 'pouvait', 'pouvions', 'pouvaient', 'pourrai', 'pourra', 'pourrons',
    // Vouloir
    'veux', 'veut', 'voulons', 'voulez', 'veulent', 'voulais', 'voulait', 'voulions', 'voulaient', 'voudrai', 'voudra', 'voudrons',
    // Devoir
    'dois', 'doit', 'devons', 'devez', 'doivent', 'devais', 'devait', 'devions', 'devaient', 'devrai', 'devra', 'devrons',
    // Dire
    'disons', 'dites', 'disent', 'disais', 'disait', 'disions', 'disaient', 'dirai', 'diras', 'dira', 'dirons',
    // Mettre
    'mets', 'mettons', 'mettez', 'mettent', 'mettais', 'mettait', 'mettions', 'mettaient', 'mettrai', 'mettra',
    // Partir/Sortir
    'pars', 'part', 'partons', 'partez', 'partent', 'partais', 'partait', 'partirai', 'partira',
    'sors', 'sort', 'sortons', 'sortez', 'sortent', 'sortais', 'sortait', 'sortirai', 'sortira',
    // Boire
    'bois', 'boit', 'buvons', 'buvez', 'boivent', 'buvais', 'buvait', 'buvions', 'buvaient', 'boirai', 'boira',
    // Manger (avec nous mangeons)
    'mangeons', 'mangeais', 'mangeait', 'mangions', 'mangiez', 'mangeaient', 'mangerai', 'mangera', 'mangerons',
    // Lire
    'lisais', 'lisait', 'lisions', 'lisaient', 'lirai', 'lira', 'lirons',
    // Ecrire
    'ecris', 'ecrit', 'ecrivons', 'ecrivez', 'ecrivent', 'ecrivais', 'ecrivait', 'ecrirai', 'ecrira',
    // Conduire
    'conduis', 'conduit', 'conduisons', 'conduisez', 'conduisent', 'conduisais', 'conduirai', 'conduira',
    // Vivre
    'vivons', 'vivez', 'vivent', 'vivais', 'vivait', 'vivions', 'vivaient', 'vivrai', 'vivra',
    // Ouvrir
    'ouvre', 'ouvres', 'ouvrons', 'ouvrez', 'ouvrent', 'ouvrais', 'ouvrait', 'ouvrirai', 'ouvrira',
    // Courir
    'cours', 'court', 'courons', 'courez', 'courent', 'courais', 'courait', 'courrai', 'courra',
    // Dormir
    'dors', 'dort', 'dormons', 'dormez', 'dorment', 'dormais', 'dormait', 'dormirai', 'dormira',
    // Participes passés courants
    'mange', 'parle', 'fini', 'parti', 'sorti', 'venu', 'pris', 'fait', 'dit', 'ecrit', 'ouvert', 'mort', 'vecu', 'couru',
];

// Common verb conjugation endings
const verbEndings = {
    // Présent
    present: ['e', 'es', 'e', 'ons', 'ez', 'ent', 'is', 'it', 'issons', 'issez', 'issent', 'ds', 'd', 'ais', 'ait', 'ont'],
    // Passé composé participes
    participes: ['e', 'i', 'u', 'is', 'it', 'ert', 'ait', 'int', 'us', 'ant'],
    // Imparfait
    imparfait: ['ais', 'ait', 'ions', 'iez', 'aient'],
    // Futur
    futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont', 'rai', 'ras', 'ra', 'rons', 'rez', 'ront'],
};

// Read Gutenberg words to filter
const gutenbergFile = path.join(__dirname, 'gutenberg_words.txt');
const gutenbergContent = fs.readFileSync(gutenbergFile, 'utf-8');

function normalizeWord(word) {
    return word
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

// Create set of all Gutenberg words for fast lookup
const gutenbergWords = new Set(
    gutenbergContent.split('\n').map(w => normalizeWord(w.trim()))
);

// Generate common words set
const commonWords = new Set();

// Add normalized roots
commonRoots.forEach(root => {
    const normalized = normalizeWord(root);
    if (normalized.length >= 4 && normalized.length <= 10 && gutenbergWords.has(normalized)) {
        commonWords.add(normalized);
    }

    // Try common variations (plurals, feminines)
    const variations = [
        normalized + 'S',
        normalized + 'E',
        normalized + 'ES',
        normalized + 'X',
        normalized.replace(/EAU$/, 'EAUX'),
        normalized.replace(/AL$/, 'AUX'),
    ];

    variations.forEach(v => {
        if (v.length >= 4 && v.length <= 10 && gutenbergWords.has(v)) {
            commonWords.add(v);
        }
    });
});

// Add verb conjugations
const verbRoots = commonRoots.filter(w =>
    w.endsWith('er') || w.endsWith('ir') || w.endsWith('re') || w.endsWith('oir')
);

verbRoots.forEach(verb => {
    const normalized = normalizeWord(verb);
    let stem = normalized;

    if (normalized.endsWith('ER')) stem = normalized.slice(0, -2);
    else if (normalized.endsWith('IR')) stem = normalized.slice(0, -2);
    else if (normalized.endsWith('RE')) stem = normalized.slice(0, -2);
    else if (normalized.endsWith('OIR')) stem = normalized.slice(0, -3);

    // Generate conjugations
    Object.values(verbEndings).flat().forEach(ending => {
        const conjugated = stem + ending.toUpperCase();
        if (conjugated.length >= 4 && conjugated.length <= 10 && gutenbergWords.has(conjugated)) {
            commonWords.add(conjugated);
        }
    });
});

// NOTE: We do NOT add all short Gutenberg words automatically
// This avoids obscure words like RUTS, GUZLA
// Only curated common words + their conjugations are included

// Convert to sorted array
const finalWords = Array.from(commonWords)
    .filter(w => /^[A-Z]+$/.test(w) && w.length >= 4 && w.length <= 10)
    .sort();

// Group by length for stats
const byLength = {};
finalWords.forEach(word => {
    const len = word.length;
    if (!byLength[len]) byLength[len] = [];
    byLength[len].push(word);
});

console.log('📊 Statistiques par longueur:');
for (let len = 4; len <= 10; len++) {
    console.log(`  ${len} lettres: ${(byLength[len] || []).length} mots`);
}
console.log(`\n📝 Total: ${finalWords.length} mots\n`);

// Sample words to verify quality
console.log('🔍 Exemples de mots courants:');
const samples = ['VOITURE', 'TELEPHONE', 'ECRAN', 'MANGER', 'MANGE', 'MANGES', 'MANGEONS',
    'BOIRE', 'BOIS', 'BOIT', 'MORDRE', 'MORDU', 'MORDAIS', 'MAISON', 'TABLE', 'CHIEN'];
samples.forEach(s => {
    console.log(`  ${s}: ${finalWords.includes(s) ? '✅' : '❌'}`);
});

// Create JS module
const outputFile = path.join(__dirname, '..', 'src', 'words.js');
const jsContent = `// French common words dictionary (curated)
// ${finalWords.length} words, 4-10 letters
// Only common everyday words that everyone knows

const FRENCH_WORDS = [
${finalWords.map(w => `    '${w}'`).join(',\n')}
];

module.exports = FRENCH_WORDS;
`;

fs.writeFileSync(outputFile, jsContent);
console.log(`\n✅ Fichier créé: ${outputFile}`);
