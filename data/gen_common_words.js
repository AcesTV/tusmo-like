// Génère une liste de mots courants avec leurs formes communes
// (conjugaisons, pluriels, féminins)

const fs = require('fs');
const path = require('path');
const allWords = require('an-array-of-french-words');

function normalize(word) {
    return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

// Dictionnaire pour validation
const dictSet = new Set(allWords.map(w => normalize(w)));

// Mots de BASE vraiment courants (infinitifs, singuliers masculins)
const baseWords = {
    // NOMS COURANTS (singulier)
    nouns: [
        // Maison & Objets
        'maison', 'table', 'chaise', 'porte', 'fenetre', 'mur', 'toit', 'sol', 'plafond',
        'lit', 'armoire', 'tiroir', 'lampe', 'miroir', 'tapis', 'rideau', 'coussin',
        'cuisine', 'salon', 'chambre', 'salle', 'jardin', 'terrasse', 'balcon', 'escalier',
        'garage', 'cave', 'grenier', 'couloir', 'entree', 'sortie',
        // Objets quotidiens
        'verre', 'tasse', 'assiette', 'couteau', 'fourchette', 'cuillere', 'casserole', 'poele',
        'livre', 'cahier', 'stylo', 'crayon', 'gomme', 'ciseaux', 'papier', 'carte',
        'sac', 'valise', 'cle', 'cadeau', 'jouet', 'ballon', 'poupee',
        'telephone', 'ordinateur', 'ecran', 'clavier', 'souris', 'tablette', 'radio', 'television',
        // Transport
        'voiture', 'camion', 'avion', 'train', 'bateau', 'velo', 'moto', 'bus', 'metro', 'taxi',
        'roue', 'moteur', 'frein', 'volant', 'route', 'rue', 'pont', 'parking',
        // Nourriture
        'pain', 'beurre', 'fromage', 'viande', 'poulet', 'poisson', 'oeuf', 'lait',
        'cafe', 'the', 'jus', 'eau', 'vin', 'biere', 'sucre', 'sel',
        'fruit', 'pomme', 'banane', 'orange', 'fraise', 'cerise', 'raisin', 'citron',
        'legume', 'carotte', 'tomate', 'salade', 'oignon', 'haricot', 'pomme',
        'gateau', 'chocolat', 'bonbon', 'glace', 'biscuit', 'tarte', 'pizza', 'pate',
        'soupe', 'sauce', 'huile', 'farine', 'riz',
        // Vetements
        'pantalon', 'chemise', 'pull', 'veste', 'manteau', 'robe', 'jupe', 'short',
        'chaussure', 'botte', 'sandale', 'basket', 'chaussette', 'ceinture',
        'chapeau', 'casquette', 'echarpe', 'gant', 'lunette', 'montre', 'bijou',
        // Corps
        'tete', 'cheveu', 'visage', 'oeil', 'nez', 'bouche', 'oreille', 'joue', 'menton',
        'bras', 'main', 'doigt', 'ongle', 'epaule', 'coude', 'poignet',
        'jambe', 'pied', 'genou', 'cheville', 'orteil', 'dos', 'ventre', 'coeur', 'poumon',
        // Famille
        'pere', 'mere', 'parent', 'enfant', 'fils', 'fille', 'frere', 'soeur',
        'oncle', 'tante', 'cousin', 'cousine', 'neveu', 'niece', 'mamie', 'papy',
        'mari', 'femme', 'copain', 'copine', 'ami', 'amie', 'voisin', 'voisine',
        'bebe', 'garcon', 'homme', 'personne',
        // Animaux
        'chien', 'chat', 'oiseau', 'poisson', 'lapin', 'hamster', 'tortue', 'souris',
        'vache', 'cochon', 'poule', 'coq', 'cheval', 'mouton', 'chevre', 'canard',
        'lion', 'tigre', 'elephant', 'singe', 'girafe', 'ours', 'loup', 'renard',
        'serpent', 'crocodile', 'dauphin', 'baleine', 'requin', 'araignee', 'abeille', 'papillon',
        // Nature
        'soleil', 'lune', 'etoile', 'ciel', 'nuage', 'pluie', 'neige', 'vent', 'orage',
        'arbre', 'fleur', 'herbe', 'feuille', 'branche', 'racine', 'foret', 'parc',
        'mer', 'ocean', 'plage', 'sable', 'vague', 'ile', 'riviere', 'lac',
        'montagne', 'colline', 'vallee', 'desert', 'champ', 'prairie',
        // Temps
        'heure', 'minute', 'seconde', 'jour', 'nuit', 'matin', 'midi', 'soir',
        'semaine', 'mois', 'annee', 'moment', 'instant',
        'printemps', 'ete', 'automne', 'hiver',
        // Lieux
        'ville', 'village', 'quartier', 'place', 'carrefour', 'avenue',
        'magasin', 'boulangerie', 'pharmacie', 'banque', 'poste', 'hopital',
        'ecole', 'college', 'lycee', 'bibliotheque', 'musee', 'cinema', 'theatre',
        'restaurant', 'hotel', 'cafe', 'bar', 'stade', 'piscine',
        'eglise', 'mairie', 'gare', 'aeroport', 'port', 'marche', 'centre',
        // Concepts
        'idee', 'pensee', 'probleme', 'solution', 'question', 'reponse', 'choix', 'decision',
        'travail', 'projet', 'plan', 'resultat', 'succes', 'echec', 'erreur',
        'argent', 'prix', 'facture', 'salaire',
        'force', 'vitesse', 'taille', 'poids', 'forme', 'couleur', 'bruit', 'silence',
        // Sport
        'sport', 'match', 'equipe', 'joueur', 'score', 'point', 'but',
        'ballon', 'balle', 'raquette', 'filet', 'terrain',
        'football', 'basket', 'tennis', 'rugby', 'course', 'ski',
        'victoire', 'champion', 'record',
        // Emotions
        'amour', 'bonheur', 'joie', 'plaisir', 'surprise', 'espoir', 'courage',
        'peur', 'colere', 'tristesse', 'douleur', 'stress', 'fatigue',
        // Autres noms courants
        'film', 'photo', 'video', 'musique', 'chanson', 'histoire', 'conte', 'roman',
        'journal', 'article', 'titre', 'page', 'lettre', 'message', 'nouvelle',
        'fete', 'anniversaire', 'mariage', 'vacance', 'voyage',
        'cadeau', 'bougie', 'nombre', 'chiffre',
    ],

    // ADJECTIFS COURANTS (masculin singulier) 
    adjectives: [
        'grand', 'petit', 'gros', 'mince', 'long', 'court', 'large', 'etroit',
        'haut', 'bas', 'profond', 'plat', 'rond', 'carre', 'droit',
        'beau', 'joli', 'mignon', 'laid', 'nouveau', 'vieux', 'ancien', 'moderne',
        'bon', 'mauvais', 'meilleur', 'pire', 'excellent', 'parfait',
        'facile', 'difficile', 'simple', 'possible', 'impossible',
        'vrai', 'faux', 'certain', 'normal', 'special', 'different',
        'chaud', 'froid', 'tiede', 'frais', 'sec', 'humide', 'propre', 'sale',
        'plein', 'vide', 'lourd', 'leger', 'dur', 'mou', 'solide',
        'rapide', 'lent', 'calme', 'bruyant',
        'content', 'heureux', 'triste', 'fache', 'inquiet', 'surpris', 'fatigue',
        'fort', 'faible', 'malade', 'sain', 'jeune', 'libre', 'seul',
        'premier', 'dernier', 'suivant', 'prochain',
        'rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet', 'rose', 'marron',
        'noir', 'blanc', 'gris', 'dore', 'argente',
        'francais', 'anglais', 'allemand', 'espagnol', 'italien',
        'gentil', 'mechant', 'drole', 'serieux', 'timide', 'courageux',
        'intelligent', 'stupide', 'sage', 'fou',
        'riche', 'pauvre', 'cher', 'gratuit',
        'ouvert', 'ferme', 'vivant', 'mort',
        'entier', 'double', 'unique', 'rare', 'commun',
    ],

    // VERBES COURANTS (infinitif)
    verbs_er: [
        'aimer', 'adorer', 'detester', 'preferer', 'esperer',
        'parler', 'ecouter', 'regarder', 'chercher', 'trouver', 'donner', 'garder',
        'acheter', 'payer', 'couter',
        'marcher', 'sauter', 'tomber', 'monter', 'arriver', 'entrer',
        'jouer', 'gagner', 'danser', 'chanter', 'dessiner', 'creer',
        'commencer', 'continuer', 'arreter', 'changer', 'rester',
        'aider', 'accompagner', 'proteger', 'sauver', 'soigner',
        'manger', 'cuisiner', 'preparer', 'couper', 'gouter',
        'laver', 'secher', 'nettoyer', 'ranger', 'jeter', 'porter', 'poser',
        'appeler', 'demander', 'expliquer', 'raconter', 'montrer', 'cacher',
        'habiter', 'visiter', 'voyager',
        'pleurer', 'crier',
        'nager', 'voler', 'piloter',
        'penser', 'imaginer', 'oublier', 'rappeler',
        'travailler', 'etudier',
        'allumer', 'fermer', 'casser', 'reparer',
        'tirer', 'pousser', 'toucher', 'embrasser',
        'lever', 'tourner', 'retourner',
        'remplir', 'vider', 'verser',
    ],

    verbs_ir: [
        'finir', 'choisir', 'reussir', 'rougir', 'grandir', 'vieillir', 'remplir',
        'partir', 'sortir', 'dormir', 'sentir', 'servir',
        'venir', 'tenir', 'devenir', 'revenir',
        'ouvrir', 'offrir', 'couvrir', 'decouvrir',
        'courir', 'mourir',
    ],

    verbs_re: [
        'prendre', 'apprendre', 'comprendre', 'surprendre',
        'attendre', 'entendre', 'repondre', 'vendre', 'rendre', 'descendre',
        'mettre', 'permettre', 'promettre',
        'faire', 'dire', 'lire', 'ecrire', 'conduire', 'construire', 'detruire',
        'boire', 'croire', 'voir', 'recevoir',
        'connaitre', 'paraitre',
        'vivre', 'suivre',
        'battre', 'mordre',
    ],

    // Verbes irréguliers très courants
    verbs_irreg: [
        'etre', 'avoir', 'aller', 'faire', 'dire', 'voir', 'savoir', 'pouvoir', 'vouloir', 'devoir',
    ]
};

// Génère les variations d'un nom
function generateNounForms(noun) {
    const forms = [noun];
    const n = normalize(noun);

    // Pluriel classique
    forms.push(noun + 's');

    // Pluriel en -x pour -eau, -au, -eu
    if (noun.endsWith('eau') || noun.endsWith('au') || noun.endsWith('eu')) {
        forms.push(noun + 'x');
    }

    // Pluriel en -aux pour -al
    if (noun.endsWith('al')) {
        forms.push(noun.slice(0, -2) + 'aux');
    }

    return forms;
}

// Génère les variations d'un adjectif (masculin, féminin, pluriels)
function generateAdjectiveForms(adj) {
    const forms = [adj];

    // Féminin
    if (adj.endsWith('e')) {
        // Déjà féminin possible
        forms.push(adj + 's'); // pluriel
    } else if (adj.endsWith('eux')) {
        forms.push(adj.slice(0, -1) + 'se'); // heureuse
        forms.push(adj); // pluriel masculin = singulier
        forms.push(adj.slice(0, -1) + 'ses'); // heureuses
    } else if (adj.endsWith('if')) {
        forms.push(adj.slice(0, -1) + 've'); // sportive
        forms.push(adj + 's');
        forms.push(adj.slice(0, -1) + 'ves');
    } else if (adj.endsWith('er')) {
        forms.push(adj.slice(0, -2) + 'ere'); // premiere
        forms.push(adj + 's');
        forms.push(adj.slice(0, -2) + 'eres');
    } else if (adj.endsWith('el') || adj.endsWith('eil')) {
        forms.push(adj + 'le'); // belle
        forms.push(adj + 's');
        forms.push(adj + 'les');
    } else if (adj.endsWith('en') || adj.endsWith('on')) {
        forms.push(adj + 'ne'); // bonne
        forms.push(adj + 's');
        forms.push(adj + 'nes');
    } else {
        forms.push(adj + 'e'); // féminin standard
        forms.push(adj + 's'); // masculin pluriel
        forms.push(adj + 'es'); // féminin pluriel
    }

    return forms;
}

// Génère les conjugaisons courantes d'un verbe en -ER
function generateVerbFormsER(infinitif) {
    const forms = [infinitif];
    const stem = infinitif.slice(0, -2);

    // Présent
    forms.push(stem + 'e');      // je/il
    forms.push(stem + 'es');     // tu
    forms.push(stem + 'ons');    // nous
    forms.push(stem + 'ez');     // vous
    forms.push(stem + 'ent');    // ils

    // Passé composé (participe)
    forms.push(stem + 'e');      // mangé

    // Imparfait
    forms.push(stem + 'ais');    // je/tu
    forms.push(stem + 'ait');    // il
    forms.push(stem + 'ions');   // nous
    forms.push(stem + 'iez');    // vous
    forms.push(stem + 'aient');  // ils

    // Futur simple
    forms.push(infinitif + 'ai');
    forms.push(infinitif + 'as');
    forms.push(infinitif + 'a');
    forms.push(infinitif + 'ons');
    forms.push(infinitif + 'ez');
    forms.push(infinitif + 'ont');

    // Participe présent
    forms.push(stem + 'ant');

    return forms;
}

// Génère les conjugaisons courantes d'un verbe en -IR (2ème groupe)
function generateVerbFormsIR2(infinitif) {
    const forms = [infinitif];
    const stem = infinitif.slice(0, -2);

    // Présent
    forms.push(stem + 'is');
    forms.push(stem + 'it');
    forms.push(stem + 'issons');
    forms.push(stem + 'issez');
    forms.push(stem + 'issent');

    // Passé composé
    forms.push(stem + 'i');

    // Imparfait
    forms.push(stem + 'issais');
    forms.push(stem + 'issait');
    forms.push(stem + 'issions');
    forms.push(stem + 'issiez');
    forms.push(stem + 'issaient');

    // Futur
    forms.push(infinitif + 'ai');
    forms.push(infinitif + 'as');
    forms.push(infinitif + 'a');

    // Participe
    forms.push(stem + 'issant');

    return forms;
}

// Collecter tous les mots
const allForms = new Set();

// Noms avec pluriels
baseWords.nouns.forEach(noun => {
    generateNounForms(noun).forEach(form => allForms.add(normalize(form)));
});

// Adjectifs avec féminins et pluriels
baseWords.adjectives.forEach(adj => {
    generateAdjectiveForms(adj).forEach(form => allForms.add(normalize(form)));
});

// Verbes en -ER
baseWords.verbs_er.forEach(verb => {
    generateVerbFormsER(verb).forEach(form => allForms.add(normalize(form)));
});

// Verbes en -IR (2ème groupe)
['finir', 'choisir', 'reussir', 'rougir', 'grandir', 'vieillir', 'remplir'].forEach(verb => {
    generateVerbFormsIR2(verb).forEach(form => allForms.add(normalize(form)));
});

// Verbes irréguliers courants (formes manuelles les plus courantes)
const irregularForms = [
    // ETRE
    'suis', 'es', 'est', 'sommes', 'etes', 'sont',
    'etais', 'etait', 'etions', 'etiez', 'etaient',
    'serai', 'seras', 'sera', 'serons', 'serez', 'seront',
    'sois', 'soit', 'soyons', 'soyez', 'soient',
    'ete', 'etant',
    // AVOIR
    'ai', 'as', 'avons', 'avez', 'ont',
    'avais', 'avait', 'avions', 'aviez', 'avaient',
    'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
    'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient',
    'eu', 'ayant',
    // ALLER
    'vais', 'vas', 'va', 'allons', 'allez', 'vont',
    'allais', 'allait', 'allions', 'alliez', 'allaient',
    'irai', 'iras', 'ira', 'irons', 'irez', 'iront',
    'aille', 'ailles', 'allions', 'alliez', 'aillent',
    'alle', 'allee', 'alles', 'allees', 'allant',
    // FAIRE
    'fais', 'fait', 'faisons', 'faites', 'font',
    'faisais', 'faisait', 'faisions', 'faisiez', 'faisaient',
    'ferai', 'feras', 'fera', 'ferons', 'ferez', 'feront',
    'fasse', 'fasses', 'fassions', 'fassiez', 'fassent',
    'faite', 'faites', 'faisant',
    // DIRE
    'dis', 'dit', 'disons', 'dites', 'disent',
    'disais', 'disait', 'disions', 'disiez', 'disaient',
    'dirai', 'diras', 'dira', 'dirons', 'direz', 'diront',
    'disant',
    // VOIR
    'vois', 'voit', 'voyons', 'voyez', 'voient',
    'voyais', 'voyait', 'voyions', 'voyiez', 'voyaient',
    'verrai', 'verras', 'verra', 'verrons', 'verrez', 'verront',
    'voie', 'voies', 'voyions', 'voyiez', 'voient',
    'vu', 'vue', 'vus', 'vues', 'voyant',
    // SAVOIR
    'sais', 'sait', 'savons', 'savez', 'savent',
    'savais', 'savait', 'savions', 'saviez', 'savaient',
    'saurai', 'sauras', 'saura', 'saurons', 'saurez', 'sauront',
    'sache', 'saches', 'sachions', 'sachiez', 'sachent',
    'su', 'sachant',
    // POUVOIR
    'peux', 'peut', 'pouvons', 'pouvez', 'peuvent',
    'pouvais', 'pouvait', 'pouvions', 'pouviez', 'pouvaient',
    'pourrai', 'pourras', 'pourra', 'pourrons', 'pourrez', 'pourront',
    'puisse', 'puisses', 'puissions', 'puissiez', 'puissent',
    'pu', 'pouvant',
    // VOULOIR
    'veux', 'veut', 'voulons', 'voulez', 'veulent',
    'voulais', 'voulait', 'voulions', 'vouliez', 'voulaient',
    'voudrai', 'voudras', 'voudra', 'voudrons', 'voudrez', 'voudront',
    'veuille', 'veuilles', 'voulions', 'vouliez', 'veuillent',
    'voulu', 'voulue', 'voulus', 'voulues', 'voulant',
    // DEVOIR
    'dois', 'doit', 'devons', 'devez', 'doivent',
    'devais', 'devait', 'devions', 'deviez', 'devaient',
    'devrai', 'devras', 'devra', 'devrons', 'devrez', 'devront',
    'doive', 'doives', 'devions', 'deviez', 'doivent',
    'du', 'due', 'dus', 'dues', 'devant',
    // VENIR
    'viens', 'vient', 'venons', 'venez', 'viennent',
    'venais', 'venait', 'venions', 'veniez', 'venaient',
    'viendrai', 'viendras', 'viendra', 'viendrons', 'viendrez', 'viendront',
    'vienne', 'viennes', 'venions', 'veniez', 'viennent',
    'venu', 'venue', 'venus', 'venues', 'venant',
    // PRENDRE
    'prends', 'prend', 'prenons', 'prenez', 'prennent',
    'prenais', 'prenait', 'prenions', 'preniez', 'prenaient',
    'prendrai', 'prendras', 'prendra', 'prendrons', 'prendrez', 'prendront',
    'prenne', 'prennes', 'prenions', 'preniez', 'prennent',
    'pris', 'prise', 'prises', 'prenant',
    // METTRE
    'mets', 'met', 'mettons', 'mettez', 'mettent',
    'mettais', 'mettait', 'mettions', 'mettiez', 'mettaient',
    'mettrai', 'mettras', 'mettra', 'mettrons', 'mettrez', 'mettront',
    'mette', 'mettes', 'mettions', 'mettiez', 'mettent',
    'mis', 'mise', 'mises', 'mettant',
    // PARTIR/SORTIR
    'pars', 'part', 'partons', 'partez', 'partent',
    'partais', 'partait', 'partions', 'partiez', 'partaient',
    'partirai', 'partiras', 'partira', 'partirons', 'partirez', 'partiront',
    'parti', 'partie', 'partis', 'parties', 'partant',
    'sors', 'sort', 'sortons', 'sortez', 'sortent',
    'sortais', 'sortait', 'sortions', 'sortiez', 'sortaient',
    'sortirai', 'sortiras', 'sortira', 'sortirons', 'sortirez', 'sortiront',
    'sorti', 'sortie', 'sortis', 'sorties', 'sortant',
    // DORMIR
    'dors', 'dort', 'dormons', 'dormez', 'dorment',
    'dormais', 'dormait', 'dormions', 'dormiez', 'dormaient',
    'dormirai', 'dormiras', 'dormira', 'dormirons', 'dormirez', 'dormiront',
    'dormi', 'dormant',
    // OUVRIR
    'ouvre', 'ouvres', 'ouvrons', 'ouvrez', 'ouvrent',
    'ouvrais', 'ouvrait', 'ouvrions', 'ouvriez', 'ouvraient',
    'ouvrirai', 'ouvriras', 'ouvrira', 'ouvrirons', 'ouvrirez', 'ouvriront',
    'ouvert', 'ouverte', 'ouverts', 'ouvertes', 'ouvrant',
    // COURIR
    'cours', 'court', 'courons', 'courez', 'courent',
    'courais', 'courait', 'courions', 'couriez', 'couraient',
    'courrai', 'courras', 'courra', 'courrons', 'courrez', 'courront',
    'couru', 'courue', 'courus', 'courues', 'courant',
    // BOIRE
    'bois', 'boit', 'buvons', 'buvez', 'boivent',
    'buvais', 'buvait', 'buvions', 'buviez', 'buvaient',
    'boirai', 'boiras', 'boira', 'boirons', 'boirez', 'boiront',
    'bu', 'bue', 'bus', 'bues', 'buvant',
    // LIRE
    'lis', 'lit', 'lisons', 'lisez', 'lisent',
    'lisais', 'lisait', 'lisions', 'lisiez', 'lisaient',
    'lirai', 'liras', 'lira', 'lirons', 'lirez', 'liront',
    'lu', 'lue', 'lus', 'lues', 'lisant',
    // ECRIRE
    'ecris', 'ecrit', 'ecrivons', 'ecrivez', 'ecrivent',
    'ecrivais', 'ecrivait', 'ecrivions', 'ecriviez', 'ecrivaient',
    'ecrirai', 'ecriras', 'ecrira', 'ecrirons', 'ecrirez', 'ecriront',
    'ecrite', 'ecrits', 'ecrites', 'ecrivant',
    // ATTENDRE
    'attends', 'attend', 'attendons', 'attendez', 'attendent',
    'attendais', 'attendait', 'attendions', 'attendiez', 'attendaient',
    'attendrai', 'attendras', 'attendra', 'attendrons', 'attendrez', 'attendront',
    'attendu', 'attendue', 'attendus', 'attendues', 'attendant',
    // VIVRE
    'vis', 'vit', 'vivons', 'vivez', 'vivent',
    'vivais', 'vivait', 'vivions', 'viviez', 'vivaient',
    'vivrai', 'vivras', 'vivra', 'vivrons', 'vivrez', 'vivront',
    'vecu', 'vecue', 'vecus', 'vecues', 'vivant',
    // CONNAITRE
    'connais', 'connait', 'connaissons', 'connaissez', 'connaissent',
    'connaissais', 'connaissait', 'connaissions', 'connaissiez', 'connaissaient',
    'connaitrai', 'connaitras', 'connaitra', 'connaitrons', 'connaitrez', 'connaitront',
    'connu', 'connue', 'connus', 'connues', 'connaissant',
];

irregularForms.forEach(form => allForms.add(normalize(form)));

// Filtrer: garder seulement les mots valides dans le dictionnaire et de 4-10 lettres
const validWords = Array.from(allForms)
    .filter(w => dictSet.has(w) && w.length >= 4 && w.length <= 10 && /^[A-Z]+$/.test(w))
    .sort();

// Stats
const byLength = {};
validWords.forEach(word => {
    const len = word.length;
    if (!byLength[len]) byLength[len] = [];
    byLength[len].push(word);
});

console.log(`📚 Mots courants générés: ${validWords.length}`);
console.log('\n📊 Par longueur:');
for (let len = 4; len <= 10; len++) {
    console.log(`  ${len} lettres: ${(byLength[len] || []).length} mots`);
}

// Exemples
console.log('\n🔍 Exemples:');
['MAISON', 'MAISONS', 'MANGE', 'MANGES', 'MANGEONS', 'MANGEZ', 'MANGENT',
    'GRAND', 'GRANDE', 'GRANDS', 'GRANDES', 'HEUREUX', 'HEUREUSE',
    'VOITURE', 'VOITURES', 'CHIEN', 'CHIENS'].forEach(w => {
        console.log(`  ${w}: ${validWords.includes(w) ? '✅' : '❌'}`);
    });

// Écriture
const outputFile = path.join(__dirname, '..', 'src', 'commonWords.js');
const jsContent = `// Mots courants français pour Tusmo
// ${validWords.length} mots avec conjugaisons et accords courants
// Généré automatiquement par gen_common_words.js

const COMMON_WORDS = [
${validWords.map(w => `    '${w}'`).join(',\n')}
];

module.exports = COMMON_WORDS;
`;

fs.writeFileSync(outputFile, jsContent);
console.log(`\n✅ Fichier créé: ${outputFile}`);
