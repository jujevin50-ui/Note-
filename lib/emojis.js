const groups = [
 ['Documents','📄 page;📝 note;📃 document;📋 liste;📌 épingle;📎 pièce jointe;🗂️ classement;📁 dossier;📂 dossier ouvert;🗃️ archives;🗄️ rangement;📰 actualités;🗞️ journal;📜 parchemin;🧾 facture;✉️ courrier;📩 message;📬 boîte aux lettres'],
 ['Études','📚 livres;📖 lecture;📕 livre rouge;📗 livre vert;📘 livre bleu;📙 livre orange;📓 carnet;📔 cahier;🎓 diplôme;🏫 école;🧑‍🏫 professeur;🧑‍🎓 étudiant;✏️ crayon;🖊️ stylo;🖍️ dessin;📐 géométrie;📏 règle;🔬 microscope;🧪 chimie;🧬 biologie;🧮 calcul;🧠 cerveau'],
 ['Finance','📈 hausse bourse;📉 baisse bourse;📊 statistiques;💰 argent;💵 dollar;💶 euro;💷 livre sterling;💴 yen;💸 dépenses;💳 carte bancaire;🪙 monnaie;🏦 banque;🏢 entreprise;🏭 industrie;🏠 immobilier;🏘️ logements;💎 valeur;⚖️ équilibre;🧾 comptabilité;🛒 achats;🤝 accord;🌍 économie mondiale'],
 ['Organisation','📅 calendrier;🗓️ planning;⏰ réveil;⏱️ chronomètre;⏳ attente;⌛ durée;🎯 objectif;✅ terminé;☑️ validation;✔️ fait;❌ erreur;⚠️ attention;🚩 priorité;🔴 rouge;🟠 orange;🟡 jaune;🟢 vert;🔵 bleu;🟣 violet;⭐ favori;🌟 important;🔔 rappel;🔒 privé;🔓 ouvert;🔑 clé;🏷️ étiquette'],
 ['Création et tech','💡 idée;✨ inspiration;🎨 art;🖌️ peinture;🎭 théâtre;🎬 cinéma;🎞️ film;📷 photo;🎥 caméra;🎙️ podcast;🎧 écoute;🎵 musique;🎹 piano;🎸 guitare;💻 ordinateur;🖥️ écran;⌨️ clavier;🖱️ souris;📱 téléphone;💾 sauvegarde;💿 disque;🔌 prise;🔋 batterie;🤖 robot;🛠️ outils;⚙️ réglages;🧩 puzzle;🔗 lien;🌐 internet;📡 réseau'],
 ['Nature','🌱 plante;🌿 nature;🍀 chance;🌳 arbre;🌲 forêt;🌵 cactus;🌸 fleur;🌻 tournesol;🌹 rose;🍂 automne;🍁 feuille;☀️ soleil;🌙 lune;🌈 arc en ciel;☁️ nuage;🌧️ pluie;❄️ neige;🔥 feu;💧 eau;🌊 mer;🏔️ montagne;🌋 volcan;🦋 papillon;🐝 abeille;🐶 chien;🐱 chat;🦊 renard;🐼 panda;🦁 lion;🦉 chouette'],
 ['Vie quotidienne','❤️ amour;🧡 cœur orange;💛 cœur jaune;💚 cœur vert;💙 cœur bleu;💜 cœur violet;🖤 cœur noir;🤍 cœur blanc;😊 sourire;😎 cool;🤔 réflexion;🥳 fête;💪 motivation;🙌 réussite;👏 bravo;🙏 merci;🫶 soutien;🎁 cadeau;🎉 célébration;🏆 trophée;🥇 médaille;☕ café;🍵 thé;🍎 pomme;🍕 pizza;🍰 gâteau;🥗 repas;🍳 cuisine'],
 ['Voyage et sport','🚀 lancement;✈️ avion;🚂 train;🚗 voiture;🚲 vélo;⛵ bateau;🧭 boussole;🗺️ carte;🧳 voyage;🏖️ plage;🏕️ camping;🌆 ville;🗼 monument;🗽 liberté;🏛️ culture;⚽ football;🏀 basket;🎾 tennis;🏋️ musculation;🏃 course;🧘 méditation;🏊 natation;🎮 jeu;🎲 hasard;♟️ échecs'],
]
export const EMOJI_GROUPS = groups.map(([name, text]) => ({ name, entries: text.split(';').map(value => { const [emoji, ...words] = value.split(' '); return { emoji, label: words.join(' '), category: name } }) }))
export const EMOJIS = EMOJI_GROUPS.flatMap(group => group.entries).filter((entry,index,all)=>all.findIndex(other=>other.emoji===entry.emoji)===index)
export const searchEmojis = (query, category = 'Tous') => {
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr')
  const needle = normalize(query.trim())
  return EMOJIS.filter(entry => (category==='Tous' || entry.category===category) && (!needle || normalize(entry.label+' '+entry.category+' '+entry.emoji).includes(needle)))
}
