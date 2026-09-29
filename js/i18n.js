/* ==========================================================================
   Languages: the shell of the game in German, French, Spanish, Brazilian
   Portuguese and Japanese.

   Every string is keyed by its English text, so the code reads as English
   and English needs no table. t('New Game') gives the current language's
   text, or the English when there is none. Placeholders are {name}; t() fills
   them from its second argument. (t is taken: the battle code's turn.)

   What is translated: the screens, buttons, menus, hints, toasts, questions,
   the first-chapter guide and the headings of the help. What is not: names
   of people, places, jobs, items and abilities, the story, and the help's own
   paragraphs, which stay in English in every language. tools/validate.js
   checks that every language has every key and every placeholder.

   The language is chosen in the camp's Options tab or on the title screen,
   kept in localStorage, and taken from the browser's language until then.
   ========================================================================== */

const LANG_KEY = 'elderon.lang';
// Code → how the language names itself. The order is the table's column order.
const LANGS = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português', ja: '日本語' };
const LANG_COLS = ['de', 'fr', 'es', 'pt', 'ja'];

const STRINGS = {
  // ---- title, credits, save slots ----
  'A Tactical Role-Playing Game': ['Ein taktisches Rollenspiel', 'Un jeu de rôle tactique', 'Un juego de rol táctico', 'Um RPG tático', 'タクティカルRPG'],
  'Two princes. One crown. A squire who knows too much.': ['Zwei Prinzen. Eine Krone. Ein Knappe, der zu viel weiß.', 'Deux princes. Une couronne. Un écuyer qui en sait trop.', 'Dos príncipes. Una corona. Un escudero que sabe demasiado.', 'Dois príncipes. Uma coroa. Um escudeiro que sabe demais.', '二人の王子。一つの王冠。知りすぎた従者。'],
  'New Game': ['Neues Spiel', 'Nouvelle partie', 'Nueva partida', 'Novo jogo', 'はじめから'],
  'Continue': ['Weiter', 'Continuer', 'Continuar', 'Continuar', '続ける'],
  'Load Game': ['Spiel laden', 'Charger une partie', 'Cargar partida', 'Carregar jogo', 'ロード'],
  'Credits': ['Mitwirkende', 'Crédits', 'Créditos', 'Créditos', 'クレジット'],
  'Isometric tactics · Charge Time turns · Jobs & abilities · Height and facing matter': ['Isometrische Taktik · Ladezeit-Züge · Jobs & Fähigkeiten · Höhe und Blickrichtung zählen', 'Tactique isométrique · Tours à temps de charge · Métiers et capacités · La hauteur et l’orientation comptent', 'Táctica isométrica · Turnos por tiempo de carga · Oficios y habilidades · La altura y la orientación importan', 'Tática isométrica · Turnos por tempo de carga · Classes e habilidades · Altura e direção importam', 'クォータービュー戦術 · チャージタイム制 · ジョブとアビリティ · 高低差と向きが勝負を決める'],
  'Language': ['Sprache', 'Langue', 'Idioma', 'Idioma', '言語'],
  'names, story and item text stay in English': ['Namen, Geschichte und Gegenstandstexte bleiben auf Englisch', 'les noms, l’histoire et les textes des objets restent en anglais', 'los nombres, la historia y los textos de objetos siguen en inglés', 'nomes, história e textos de itens continuam em inglês', '名前・物語・アイテム説明は英語のまま'],
  'Back': ['Zurück', 'Retour', 'Atrás', 'Voltar', '戻る'],
  'Load a game': ['Spiel laden', 'Charger une partie', 'Cargar una partida', 'Carregar um jogo', 'セーブデータを選ぶ'],
  'Every slot is taken. Which one gives way?': ['Alle Speicherplätze sind belegt. Welcher weicht?', 'Tous les emplacements sont pris. Lequel céder ?', 'Todas las ranuras están ocupadas. ¿Cuál se sacrifica?', 'Todos os slots estão ocupados. Qual será substituído?', 'すべてのスロットが使用中です。どれを上書きしますか？'],
  'Slot {n}': ['Speicherplatz {n}', 'Emplacement {n}', 'Ranura {n}', 'Slot {n}', 'スロット{n}'],
  'empty': ['leer', 'vide', 'vacía', 'vazio', '空き'],
  'Start here': ['Hier beginnen', 'Commencer ici', 'Empezar aquí', 'Começar aqui', 'ここに保存'],
  'Overwrite': ['Überschreiben', 'Écraser', 'Sobrescribir', 'Sobrescrever', '上書き'],
  'Load': ['Laden', 'Charger', 'Cargar', 'Carregar', 'ロード'],
  'Export': ['Exportieren', 'Exporter', 'Exportar', 'Exportar', '書き出す'],
  'Delete': ['Löschen', 'Supprimer', 'Borrar', 'Apagar', '削除'],
  'Import a save code': ['Spielstand-Code importieren', 'Importer un code de sauvegarde', 'Importar un código de guardado', 'Importar um código de save', 'セーブコードを読み込む'],
  'Copy': ['Kopieren', 'Copier', 'Copiar', 'Copiar', 'コピー'],
  'Share': ['Teilen', 'Partager', 'Compartir', 'Compartilhar', '共有'],
  'Save as file': ['Als Datei speichern', 'Enregistrer en fichier', 'Guardar como archivo', 'Salvar como arquivo', 'ファイルに保存'],
  'Into': ['In', 'Vers', 'En', 'Em', '保存先'],
  'Open a file': ['Datei öffnen', 'Ouvrir un fichier', 'Abrir un archivo', 'Abrir um arquivo', 'ファイルを開く'],
  'Import': ['Importieren', 'Importer', 'Importar', 'Importar', '読み込む'],
  'Close': ['Schließen', 'Fermer', 'Cerrar', 'Fechar', '閉じる'],
  'Slot {n} as a code. Copy it, share it, or save it as a file; on the other device, Load Game → Import a save code.': ['Speicherplatz {n} als Code. Kopiere ihn, teile ihn oder speichere ihn als Datei; auf dem anderen Gerät: Spiel laden → Spielstand-Code importieren.', 'Emplacement {n} sous forme de code. Copiez-le, partagez-le ou enregistrez-le en fichier ; sur l’autre appareil : Charger une partie → Importer un code de sauvegarde.', 'Ranura {n} como código. Cópialo, compártelo o guárdalo como archivo; en el otro dispositivo: Cargar partida → Importar un código de guardado.', 'Slot {n} como código. Copie, compartilhe ou salve como arquivo; no outro aparelho: Carregar jogo → Importar um código de save.', 'スロット{n}をコードにしました。コピー・共有・ファイル保存のいずれかで、別の端末の「ロード → セーブコードを読み込む」に貼り付けてください。'],
  'Paste a save code below, or open the file it was saved as, and choose the slot it goes into.': ['Füge unten einen Spielstand-Code ein oder öffne die Datei, als die er gespeichert wurde, und wähle den Speicherplatz.', 'Collez un code de sauvegarde ci-dessous, ou ouvrez le fichier dans lequel il a été enregistré, puis choisissez l’emplacement de destination.', 'Pega un código de guardado abajo, o abre el archivo en que se guardó, y elige la ranura de destino.', 'Cole um código de save abaixo, ou abra o arquivo em que foi salvo, e escolha o slot de destino.', '下にセーブコードを貼り付けるか、保存したファイルを開いて、保存先のスロットを選んでください。'],
  'That is not an Elderon save code: it should start with ELDERON1.': ['Das ist kein Elderon-Spielstand-Code: Er muss mit ELDERON1. beginnen.', 'Ce n’est pas un code de sauvegarde Elderon : il doit commencer par ELDERON1.', 'Eso no es un código de guardado de Elderon: debe empezar por ELDERON1.', 'Isso não é um código de save de Elderon: deve começar com ELDERON1.', 'Elderonのセーブコードではありません。ELDERON1. で始まる必要があります。'],
  'The code is damaged or incomplete. Copy it again, whole.': ['Der Code ist beschädigt oder unvollständig. Kopiere ihn noch einmal vollständig.', 'Le code est endommagé ou incomplet. Copiez-le à nouveau, en entier.', 'El código está dañado o incompleto. Cópialo de nuevo, entero.', 'O código está danificado ou incompleto. Copie-o de novo, inteiro.', 'コードが壊れているか不完全です。もう一度、全体をコピーしてください。'],
  'The code holds no company.': ['Der Code enthält keine Gruppe.', 'Le code ne contient aucune compagnie.', 'El código no contiene ningún grupo.', 'O código não contém nenhum grupo.', 'このコードにはパーティが含まれていません。'],
  'Write over slot {n}? That game is gone for good.': ['Speicherplatz {n} überschreiben? Dieses Spiel ist dann für immer verloren.', 'Écraser l’emplacement {n} ? Cette partie sera perdue pour de bon.', '¿Sobrescribir la ranura {n}? Esa partida se perderá para siempre.', 'Sobrescrever o slot {n}? Aquele jogo será perdido para sempre.', 'スロット{n}を上書きしますか？そのデータは二度と戻りません。'],
  'Delete slot {n}? That game is gone for good.': ['Speicherplatz {n} löschen? Dieses Spiel ist dann für immer verloren.', 'Supprimer l’emplacement {n} ? Cette partie sera perdue pour de bon.', '¿Borrar la ranura {n}? Esa partida se perderá para siempre.', 'Apagar o slot {n}? Aquele jogo será perdido para sempre.', 'スロット{n}を削除しますか？そのデータは二度と戻りません。'],
  'Write over slot {n} with the imported game? The game there is gone for good.': ['Speicherplatz {n} mit dem importierten Spiel überschreiben? Das Spiel dort ist dann für immer verloren.', 'Écraser l’emplacement {n} avec la partie importée ? La partie qui s’y trouve sera perdue pour de bon.', '¿Sobrescribir la ranura {n} con la partida importada? La partida que hay allí se perderá para siempre.', 'Sobrescrever o slot {n} com o jogo importado? O jogo que está lá será perdido para sempre.', '読み込んだデータでスロット{n}を上書きしますか？そこにあるデータは二度と戻りません。'],
  'Imported into slot {n}: {where}.': ['In Speicherplatz {n} importiert: {where}.', 'Importé dans l’emplacement {n} : {where}.', 'Importado en la ranura {n}: {where}.', 'Importado no slot {n}: {where}.', 'スロット{n}に読み込みました：{where}。'],
  'Save code copied.': ['Spielstand-Code kopiert.', 'Code de sauvegarde copié.', 'Código de guardado copiado.', 'Código de save copiado.', 'セーブコードをコピーしました。'],
  'Select the code and copy it.': ['Markiere den Code und kopiere ihn.', 'Sélectionnez le code et copiez-le.', 'Selecciona el código y cópialo.', 'Selecione o código e copie-o.', 'コードを選択してコピーしてください。'],
  'Saved as a file.': ['Als Datei gespeichert.', 'Enregistré en fichier.', 'Guardado como archivo.', 'Salvo como arquivo.', 'ファイルに保存しました。'],
  'Game saved.': ['Spiel gespeichert.', 'Partie sauvegardée.', 'Partida guardada.', 'Jogo salvo.', 'セーブしました。'],
  'The game could not be saved: storage is blocked or full.': ['Das Spiel konnte nicht gespeichert werden: Der Speicher ist gesperrt oder voll.', 'Impossible de sauvegarder : le stockage est bloqué ou plein.', 'No se pudo guardar la partida: el almacenamiento está bloqueado o lleno.', 'Não foi possível salvar o jogo: o armazenamento está bloqueado ou cheio.', 'セーブできませんでした。ストレージがブロックされているか満杯です。'],
  'The save could not be written: storage is blocked or full.': ['Der Spielstand konnte nicht geschrieben werden: Der Speicher ist gesperrt oder voll.', 'Impossible d’écrire la sauvegarde : le stockage est bloqué ou plein.', 'No se pudo escribir el guardado: el almacenamiento está bloqueado o lleno.', 'Não foi possível gravar o save: o armazenamento está bloqueado ou cheio.', 'セーブデータを書き込めませんでした。ストレージがブロックされているか満杯です。'],
  'That save could not be read. Start a new game.': ['Dieser Spielstand konnte nicht gelesen werden. Beginne ein neues Spiel.', 'Cette sauvegarde est illisible. Commencez une nouvelle partie.', 'No se pudo leer ese guardado. Empieza una nueva partida.', 'Não foi possível ler esse save. Comece um novo jogo.', 'セーブデータを読み込めませんでした。新しくはじめてください。'],
  'A new version of the game is ready. Reload into it now? Your progress is saved first.': ['Eine neue Version des Spiels ist bereit. Jetzt neu laden? Dein Fortschritt wird vorher gespeichert.', 'Une nouvelle version du jeu est prête. Recharger maintenant ? Votre progression est d’abord sauvegardée.', 'Hay una nueva versión del juego lista. ¿Recargar ahora? Tu progreso se guarda primero.', 'Uma nova versão do jogo está pronta. Recarregar agora? Seu progresso é salvo antes.', '新しいバージョンの準備ができました。今すぐ再読み込みしますか？進行状況は先にセーブされます。'],
  'Reload now': ['Jetzt neu laden', 'Recharger', 'Recargar ahora', 'Recarregar agora', '再読み込み'],
  'Later': ['Später', 'Plus tard', 'Más tarde', 'Depois', 'あとで'],
  // The slot summary line.
  '1 soldier': ['1 Soldat', '1 soldat', '1 soldado', '1 soldado', '兵士1人'],
  '{n} soldiers': ['{n} Soldaten', '{n} soldats', '{n} soldados', '{n} soldados', '兵士{n}人'],
  'Lv {n}': ['Lv {n}', 'Niv. {n}', 'Nv {n}', 'Nv {n}', 'Lv{n}'],
  '{n} gil': ['{n} Gil', '{n} gils', '{n} gil', '{n} gil', '{n}ギル'],
  '{time} played': ['{time} gespielt', '{time} de jeu', '{time} jugado', '{time} jogado', 'プレイ時間 {time}'],
  'just now': ['gerade eben', 'à l’instant', 'ahora mismo', 'agora mesmo', 'たった今'],
  '{n} min ago': ['vor {n} Min.', 'il y a {n} min', 'hace {n} min', 'há {n} min', '{n}分前'],
  '{n} h ago': ['vor {n} Std.', 'il y a {n} h', 'hace {n} h', 'há {n} h', '{n}時間前'],
  '{n} days ago': ['vor {n} Tagen', 'il y a {n} jours', 'hace {n} días', 'há {n} dias', '{n}日前'],
  'an older save': ['ein älterer Spielstand', 'une sauvegarde plus ancienne', 'un guardado más antiguo', 'um save mais antigo', '古いセーブ'],
  '{name} the {job}': ['{name}, {job}', '{name}, {job}', '{name}, {job}', '{name}, {job}', '{job}の{name}'],
  'Act {n}': ['Akt {n}', 'Acte {n}', 'Acto {n}', 'Ato {n}', '第{n}幕'],
  'Chapter {n}': ['Kapitel {n}', 'Chapitre {n}', 'Capítulo {n}', 'Capítulo {n}', '第{n}章'],
  'Trial {n}': ['Prüfung {n}', 'Épreuve {n}', 'Prueba {n}', 'Provação {n}', '試練{n}'],
  'Five Roads · at the capital': ['Fünf Wege · in der Hauptstadt', 'Cinq routes · à la capitale', 'Cinco caminos · en la capital', 'Cinco estradas · na capital', '五つの道 · 王都にて'],
  'After the war': ['Nach dem Krieg', 'Après la guerre', 'Después de la guerra', 'Depois da guerra', '戦争のあと'],

  // ---- the camp ----
  'Camp': ['Lager', 'Campement', 'Campamento', 'Acampamento', '野営地'],
  'March to Battle': ['In die Schlacht', 'Marcher au combat', 'Marchar a la batalla', 'Marchar para a batalha', '出撃'],
  'Choose a Road': ['Wähle einen Weg', 'Choisir une route', 'Elige un camino', 'Escolha uma estrada', '道を選ぶ'],
  'Training Battle': ['Übungskampf', 'Combat d’entraînement', 'Combate de entrenamiento', 'Batalha de treino', '訓練戦'],
  'Formation & Jobs': ['Aufstellung & Jobs', 'Formation et métiers', 'Formación y oficios', 'Formação e classes', '編成とジョブ'],
  'Shop': ['Laden', 'Boutique', 'Tienda', 'Loja', 'ショップ'],
  'Baggage': ['Gepäck', 'Bagages', 'Equipaje', 'Bagagem', '荷物'],
  'Save': ['Speichern', 'Sauvegarder', 'Guardar', 'Salvar', 'セーブ'],
  'Title': ['Titel', 'Titre', 'Título', 'Título', 'タイトル'],
  'Road': ['Weg', 'Route', 'Camino', 'Estrada', '道'],
  'Company': ['Gruppe', 'Compagnie', 'Compañía', 'Companhia', '仲間'],
  'Cities': ['Städte', 'Villes', 'Ciudades', 'Cidades', '都市'],
  'Options': ['Optionen', 'Options', 'Opciones', 'Opções', '設定'],
  'Around the fire': ['Am Feuer', 'Autour du feu', 'Junto al fuego', 'Ao redor da fogueira', '焚き火を囲んで'],
  'the night before': ['am Abend zuvor', 'la veille au soir', 'la noche anterior', 'na noite anterior', '前夜'],
  'Tavern': ['Taverne', 'Taverne', 'Taberna', 'Taverna', '酒場'],
  'Hire Squire': ['Knappen anheuern', 'Recruter un écuyer', 'Contratar escudero', 'Contratar escudeiro', '見習いを雇う'],
  'Hire Chemist': ['Chemiker anheuern', 'Recruter un chimiste', 'Contratar químico', 'Contratar químico', '薬師を雇う'],
  'Errands': ['Aufträge', 'Missions', 'Encargos', 'Tarefas', '任務'],
  'work away from the line, for pay and JP': ['Arbeit abseits der Front, für Sold und JP', 'du travail loin du front, contre solde et JP', 'trabajo lejos del frente, por paga y JP', 'trabalho longe da linha, por pagamento e JP', '前線を離れて働き、報酬とJPを得る'],
  'held until you open them; open, they hire, they sell and they forge': ['besetzt, bis ihr sie befreit; befreit heuern sie an, verkaufen und schmieden', 'occupées jusqu’à leur libération ; libres, elles recrutent, vendent et forgent', 'ocupadas hasta que las liberes; libres, contratan, venden y forjan', 'ocupadas até serem libertadas; livres, contratam, vendem e forjam', '解放するまでは敵の手に。解放すれば雇用・売買・鍛冶ができる'],
  'Difficulty': ['Schwierigkeit', 'Difficulté', 'Dificultad', 'Dificuldade', '難易度'],
  'changeable at any time': ['jederzeit änderbar', 'modifiable à tout moment', 'se puede cambiar en cualquier momento', 'pode ser alterada a qualquer momento', 'いつでも変更可'],
  'Difficulty set to {name}.': ['Schwierigkeit auf {name} gesetzt.', 'Difficulté réglée sur {name}.', 'Dificultad establecida en {name}.', 'Dificuldade definida como {name}.', '難易度を{name}に設定しました。'],
  'Squire': ['Knappe', 'Écuyer', 'Escudero', 'Escudeiro', '見習い'],
  'Knight': ['Ritter', 'Chevalier', 'Caballero', 'Cavaleiro', 'ナイト'],
  'Paladin': ['Paladin', 'Paladin', 'Paladín', 'Paladino', 'パラディン'],
  'Foes are a level below and less well equipped. Purses stretch further.': ['Gegner sind eine Stufe niedriger und schlechter ausgerüstet. Das Geld reicht weiter.', 'Les ennemis ont un niveau de moins et sont moins bien équipés. La bourse dure plus longtemps.', 'Los enemigos están un nivel por debajo y peor equipados. El dinero rinde más.', 'Os inimigos estão um nível abaixo e menos bem equipados. O dinheiro rende mais.', '敵のレベルが1低く、装備も劣る。資金に余裕がある。'],
  'The campaign as written.': ['Der Feldzug, wie er geschrieben steht.', 'La campagne telle qu’écrite.', 'La campaña tal como está escrita.', 'A campanha como foi escrita.', '設計どおりのバランス。'],
  'Foes outrank and outfit you, and coin is scarcer.': ['Gegner übertreffen dich an Rang und Ausrüstung, und Geld ist knapper.', 'Les ennemis vous surpassent en niveau et en équipement, et l’argent est plus rare.', 'Los enemigos te superan en nivel y equipo, y el dinero escasea.', 'Os inimigos superam você em nível e equipamento, e o dinheiro é mais escasso.', '敵のレベルも装備も上回り、資金は乏しい。'],
  'Party': ['Gruppe', 'Compagnie', 'Grupo', 'Grupo', 'パーティ'],
  '(first 5 deploy)': ['(die ersten 5 ziehen aus)', '(les 5 premiers se déploient)', '(los 5 primeros se despliegan)', '(os 5 primeiros entram em campo)', '（先頭の5人が出撃）'],
  '{name} the {job} joins the party.': ['{name}, {job}, schließt sich der Gruppe an.', '{name}, {job}, rejoint la compagnie.', '{name}, {job}, se une al grupo.', '{name}, {job}, entra para o grupo.', '{job}の{name}が仲間になった。'],
  '{name} is now a {job}.': ['{name} ist jetzt {job}.', '{name} est maintenant {job}.', '{name} ahora es {job}.', '{name} agora é {job}.', '{name}は{job}になった。'],
  'Objective: {goal}': ['Ziel: {goal}', 'Objectif : {goal}', 'Objetivo: {goal}', 'Objetivo: {goal}', '目標：{goal}'],
  'Defeat every enemy': ['Besiege jeden Gegner', 'Vaincre tous les ennemis', 'Derrota a todos los enemigos', 'Derrote todos os inimigos', '敵を全滅させる'],
  'Defeat {name}': ['Besiege {name}', 'Vaincre {name}', 'Derrota a {name}', 'Derrote {name}', '{name}を倒す'],
  'the commander': ['den Anführer', 'le commandant', 'al comandante', 'o comandante', '指揮官'],
  'Hold out for {n} rounds': ['Halte {n} Runden durch', 'Tenir {n} tours', 'Resiste {n} rondas', 'Resista por {n} rodadas', '{n}ラウンド持ちこたえる'],
  'Rowan must not be lost': ['Rowan darf nicht fallen', 'Rowan ne doit pas tomber', 'Rowan no debe caer', 'Rowan não pode cair', 'ローワンを倒されてはならない'],
  '{n} enemies · up to Lv {lv}': ['{n} Gegner · bis Lv {lv}', '{n} ennemis · jusqu’au niv. {lv}', '{n} enemigos · hasta Nv {lv}', '{n} inimigos · até Nv {lv}', '敵{n}体 · 最高Lv{lv}'],
  '{n} enemies · Lv {lv}': ['{n} Gegner · Lv {lv}', '{n} ennemis · niv. {lv}', '{n} enemigos · Nv {lv}', '{n} inimigos · Nv {lv}', '敵{n}体 · Lv{lv}'],
  'Fight a won field again for half the pay:': ['Ein gewonnenes Feld für halben Sold erneut schlagen:', 'Rejouer un champ gagné pour la moitié de la solde :', 'Volver a luchar en un campo ganado por la mitad de la paga:', 'Lutar de novo num campo vencido por metade do pagamento:', '勝利した戦場で再戦（報酬は半分）：'],
  'Revisit': ['Erneut', 'Revisiter', 'Repetir', 'Revisitar', '再戦'],

  // ---- formation, shop, baggage ----
  'Formation': ['Aufstellung', 'Formation', 'Formación', 'Formação', '編成'],
  'Units 1–5 deploy in battle. Use ▲▼ to reorder. Change jobs freely; abilities are learned with JP earned in that job.': ['Einheiten 1–5 ziehen in die Schlacht. Mit ▲▼ umsortieren. Jobs sind frei wechselbar; Fähigkeiten werden mit den JP dieses Jobs gelernt.', 'Les unités 1 à 5 se déploient au combat. ▲▼ pour réordonner. Changez de métier librement ; les capacités s’apprennent avec les JP gagnés dans ce métier.', 'Las unidades 1–5 se despliegan en batalla. Usa ▲▼ para reordenar. Cambia de oficio libremente; las habilidades se aprenden con los JP ganados en ese oficio.', 'As unidades 1–5 entram em batalha. Use ▲▼ para reordenar. Troque de classe à vontade; as habilidades são aprendidas com o JP ganho naquela classe.', '1〜5番目のユニットが出撃します。▲▼で並べ替え。ジョブは自由に変更でき、アビリティはそのジョブで得たJPで習得します。'],
  'Back to Camp': ['Zurück ins Lager', 'Retour au campement', 'Volver al campamento', 'Voltar ao acampamento', '野営地へ戻る'],
  'Merchant\'s Wagon': ['Händlerwagen', 'Chariot du marchand', 'Carreta del mercader', 'Carroça do mercador', '行商人の荷馬車'],
  'Buy': ['Kaufen', 'Acheter', 'Comprar', 'Comprar', '買う'],
  'Sell': ['Verkaufen', 'Vendre', 'Vender', 'Vender', '売る'],
  'Sell {n} gil': ['Für {n} Gil verkaufen', 'Vendre {n} gils', 'Vender por {n} gil', 'Vender por {n} gil', '{n}ギルで売る'],
  'Sell {n}': ['Verkaufen {n}', 'Vendre {n}', 'Vender {n}', 'Vender {n}', '売る {n}'],
  'Bought {item}.': ['{item} gekauft.', '{item} acheté.', '{item} comprado.', '{item} comprado.', '{item}を購入した。'],
  'Sold {item}.': ['{item} verkauft.', '{item} vendu.', '{item} vendido.', '{item} vendido.', '{item}を売却した。'],
  'Fits: {who}': ['Passt: {who}', 'Convient à : {who}', 'Sirve a: {who}', 'Serve a: {who}', '装備可：{who}'],
  'No one in your party can use this yet': ['Niemand in deiner Gruppe kann das bisher benutzen', 'Personne dans votre compagnie ne peut encore l’utiliser', 'Nadie en tu grupo puede usarlo todavía', 'Ninguém no seu grupo pode usar isto ainda', 'まだ誰も装備できない'],
  'in stock: {n}': ['im Gepäck: {n}', 'en stock : {n}', 'en reserva: {n}', 'em estoque: {n}', '所持：{n}'],
  'Spare: {n}': ['Übrig: {n}', 'En réserve : {n}', 'De sobra: {n}', 'Sobrando: {n}', '予備：{n}'],
  'Equip': ['Ausrüsten', 'Équiper', 'Equipar', 'Equipar', '装備'],
  'All': ['Alle', 'Tout', 'Todo', 'Tudo', 'すべて'],
  'Every kind': ['Jede Art', 'Tous les types', 'Todo tipo', 'Todo tipo', 'すべての種類'],
  'Weapons': ['Waffen', 'Armes', 'Armas', 'Armas', '武器'],
  'Shields': ['Schilde', 'Boucliers', 'Escudos', 'Escudos', '盾'],
  'Head': ['Kopf', 'Tête', 'Cabeza', 'Cabeça', '頭'],
  'Body': ['Körper', 'Corps', 'Cuerpo', 'Corpo', '体'],
  'Accessories': ['Accessoires', 'Accessoires', 'Accesorios', 'Acessórios', 'アクセサリ'],
  'Materials': ['Materialien', 'Matériaux', 'Materiales', 'Materiais', '素材'],
  'Worn by the party': ['Von der Gruppe getragen', 'Porté par la compagnie', 'Equipado por el grupo', 'Equipado pelo grupo', 'パーティの装備'],
  '× returns a piece to the baggage': ['× legt ein Stück zurück ins Gepäck', '× renvoie une pièce dans les bagages', '× devuelve una pieza al equipaje', '× devolve uma peça à bagagem', '× で荷物に戻す'],
  'Improve': ['Verbessern', 'Améliorer', 'Mejorar', 'Melhorar', '強化'],
  'Craft': ['Schmieden', 'Fabriquer', 'Fabricar', 'Forjar', '製作'],
  'Salvage': ['Zerlegen', 'Récupérer', 'Desguazar', 'Desmontar', '分解'],

  // ---- story, results, questions ----
  'Skip': ['Überspringen', 'Passer', 'Saltar', 'Pular', 'スキップ'],
  'Onward': ['Voran', 'En avant', 'Adelante', 'Avante', '進む'],
  'Victory!': ['Sieg!', 'Victoire !', '¡Victoria!', 'Vitória!', '勝利！'],
  'Defeat...': ['Niederlage...', 'Défaite...', 'Derrota...', 'Derrota...', '敗北…'],
  'Experience earned:': ['Erfahrung erhalten:', 'Expérience gagnée :', 'Experiencia obtenida:', 'Experiência ganha:', '獲得経験値：'],
  'Gil earned:': ['Gil erhalten:', 'Gils gagnés :', 'Gil ganado:', 'Gil ganho:', '獲得ギル：'],
  'Gil kept:': ['Gil behalten:', 'Gils conservés :', 'Gil conservado:', 'Gil mantido:', '保持ギル：'],
  'Recovered:': ['Geborgen:', 'Récupéré :', 'Recuperado:', 'Recuperado:', '回収品：'],
  'For the forge:': ['Für die Schmiede:', 'Pour la forge :', 'Para la forja:', 'Para a forja:', '鍛冶素材：'],
  'Your party regroups. Train, learn new abilities, and try again.': ['Deine Gruppe sammelt sich. Trainiere, lerne neue Fähigkeiten und versuche es erneut.', 'Votre compagnie se regroupe. Entraînez-vous, apprenez de nouvelles capacités et réessayez.', 'Tu grupo se reagrupa. Entrena, aprende nuevas habilidades e inténtalo de nuevo.', 'Seu grupo se reagrupa. Treine, aprenda novas habilidades e tente de novo.', 'パーティは態勢を立て直した。訓練し、新しいアビリティを覚えて、もう一度挑もう。'],
  'no JP': ['keine JP', 'aucun JP', 'sin JP', 'sem JP', 'JPなし'],
  'fell': ['gefallen', 'tombé', 'cayó', 'caiu', '戦闘不能'],
  '{who} has JP enough for something new. Spend it in Formation.': ['{who} hat genug JP für etwas Neues. Gib sie in der Aufstellung aus.', '{who} a assez de JP pour du nouveau. Dépensez-les dans Formation.', '{who} tiene JP suficientes para algo nuevo. Gástalos en Formación.', '{who} tem JP suficiente para algo novo. Gaste na Formação.', '{who}は新しい何かを覚えられるJPがある。編成で使おう。'],
  '{who} have JP enough for something new. Spend it in Formation.': ['{who} haben genug JP für etwas Neues. Gebt sie in der Aufstellung aus.', '{who} ont assez de JP pour du nouveau. Dépensez-les dans Formation.', '{who} tienen JP suficientes para algo nuevo. Gástalos en Formación.', '{who} têm JP suficiente para algo novo. Gaste na Formação.', '{who}は新しい何かを覚えられるJPがある。編成で使おう。'],
  '{a} and {b}': ['{a} und {b}', '{a} et {b}', '{a} y {b}', '{a} e {b}', '{a}と{b}'],
  'Try again': ['Noch einmal', 'Réessayer', 'Reintentar', 'Tentar de novo', 'もう一度'],
  'Cancel': ['Abbrechen', 'Annuler', 'Cancelar', 'Cancelar', 'キャンセル'],
  'OK': ['OK', 'OK', 'Aceptar', 'OK', 'OK'],
  'Retreat': ['Rückzug', 'Retraite', 'Retirada', 'Recuar', '撤退'],
  'Retreat from battle? This counts as a defeat, and no rewards are kept.': ['Aus der Schlacht zurückziehen? Das zählt als Niederlage, und keine Belohnung bleibt.', 'Battre en retraite ? Cela compte comme une défaite, sans aucune récompense.', '¿Retirarse de la batalla? Cuenta como derrota y no se conserva ninguna recompensa.', 'Recuar da batalha? Conta como derrota, e nenhuma recompensa é mantida.', '撤退しますか？敗北扱いとなり、報酬は得られません。'],
  'Leave without giving battle?': ['Gehen, ohne zu kämpfen?', 'Partir sans livrer bataille ?', '¿Irse sin presentar batalla?', 'Sair sem dar batalha?', '戦わずに立ち去りますか？'],
  'Leave': ['Gehen', 'Partir', 'Irse', 'Sair', '立ち去る'],
  'Stay': ['Bleiben', 'Rester', 'Quedarse', 'Ficar', 'とどまる'],
  'Keep fighting': ['Weiterkämpfen', 'Continuer le combat', 'Seguir luchando', 'Continuar lutando', '戦い続ける'],
  'Battle speed {n}×': ['Kampftempo {n}×', 'Vitesse de combat {n}×', 'Velocidad de batalla {n}×', 'Velocidade da batalha {n}×', '戦闘速度 {n}×'],

  // ---- the battle ----
  'Auto': ['Auto', 'Auto', 'Auto', 'Auto', '自動'],
  'Help': ['Hilfe', 'Aide', 'Ayuda', 'Ajuda', 'ヘルプ'],
  'Battle speed': ['Kampftempo', 'Vitesse de combat', 'Velocidad de batalla', 'Velocidade da batalha', '戦闘速度'],
  'Auto-battle': ['Automatischer Kampf', 'Combat automatique', 'Batalla automática', 'Batalha automática', '自動戦闘'],
  'Battle log': ['Kampfprotokoll', 'Journal de combat', 'Registro de batalla', 'Registro da batalha', '戦闘ログ'],
  'Turn Order': ['Zugreihenfolge', 'Ordre des tours', 'Orden de turnos', 'Ordem de turnos', '行動順'],
  'Opposition': ['Gegner', 'Adversaires', 'Enemigos', 'Oponentes', '敵軍'],
  'Deploy': ['Aufstellen', 'Déployer', 'Desplegar', 'Posicionar', '配置'],
  'Auto-place': ['Automatisch', 'Placement auto', 'Colocar auto', 'Auto-posicionar', '自動配置'],
  'Begin Battle': ['Schlacht beginnen', 'Commencer le combat', 'Empezar batalla', 'Iniciar batalha', '戦闘開始'],
  'Place at least one unit.': ['Stelle mindestens eine Einheit auf.', 'Placez au moins une unité.', 'Coloca al menos una unidad.', 'Posicione pelo menos uma unidade.', '少なくとも1人を配置してください。'],
  '{name} must take the field: this battle is lost without them.': ['{name} muss aufs Feld: Ohne sie ist diese Schlacht verloren.', '{name} doit prendre le champ : sans cette unité, la bataille est perdue.', '{name} debe salir al campo: sin esa unidad la batalla está perdida.', '{name} precisa entrar em campo: sem essa unidade a batalha está perdida.', '{name}は出撃が必要です。いなければこの戦いは敗北です。'],
  '{name} must take the field. ': ['{name} muss aufs Feld. ', '{name} doit prendre le champ. ', '{name} debe salir al campo. ', '{name} precisa entrar em campo. ', '{name}は出撃が必要です。'],
  'Tap a green tile to place {name}. Tap a deployed unit to pick it up.': ['Tippe auf ein grünes Feld, um {name} aufzustellen. Tippe auf eine aufgestellte Einheit, um sie aufzunehmen.', 'Touchez une case verte pour placer {name}. Touchez une unité déployée pour la reprendre.', 'Toca una casilla verde para colocar a {name}. Toca una unidad desplegada para recogerla.', 'Toque numa casa verde para posicionar {name}. Toque numa unidade posicionada para pegá-la.', '緑のマスをタップして{name}を配置。配置済みのユニットをタップすると戻せます。'],
  'Click a green tile to place {name}. Click a deployed unit to pick it up.': ['Klicke auf ein grünes Feld, um {name} aufzustellen. Klicke auf eine aufgestellte Einheit, um sie aufzunehmen.', 'Cliquez une case verte pour placer {name}. Cliquez une unité déployée pour la reprendre.', 'Haz clic en una casilla verde para colocar a {name}. Haz clic en una unidad desplegada para recogerla.', 'Clique numa casa verde para posicionar {name}. Clique numa unidade posicionada para pegá-la.', '緑のマスをクリックして{name}を配置。配置済みのユニットをクリックすると戻せます。'],
  'a unit': ['eine Einheit', 'une unité', 'una unidad', 'uma unidade', 'ユニット'],
  'Placed {n} of {max}, facing the enemy.': ['{n} von {max} aufgestellt, dem Feind zugewandt.', '{n} sur {max} placés, face à l’ennemi.', '{n} de {max} colocados, de cara al enemigo.', '{n} de {max} posicionados, de frente para o inimigo.', '{max}人中{n}人を敵に向けて配置しました。'],
  'Only {n} units may deploy.': ['Nur {n} Einheiten dürfen aufgestellt werden.', 'Seules {n} unités peuvent se déployer.', 'Solo pueden desplegarse {n} unidades.', 'Só {n} unidades podem entrar em campo.', '出撃できるのは{n}人までです。'],
  'Outside the deployment zone.': ['Außerhalb der Aufstellungszone.', 'Hors de la zone de déploiement.', 'Fuera de la zona de despliegue.', 'Fora da zona de posicionamento.', '配置可能範囲の外です。'],
  'Clear': ['Leeren', 'Vider', 'Vaciar', 'Limpar', '全解除'],
  '{name}\'s turn': ['{name} ist am Zug', 'Au tour de {name}', 'Turno de {name}', 'Turno de {name}', '{name}のターン'],
  'Move': ['Bewegen', 'Déplacer', 'Mover', 'Mover', '移動'],
  'Undo Move': ['Zug zurück', 'Annuler le déplacement', 'Deshacer movimiento', 'Desfazer movimento', '移動を戻す'],
  'Act': ['Handeln', 'Agir', 'Actuar', 'Agir', '行動'],
  'Wait': ['Warten', 'Attendre', 'Esperar', 'Esperar', '待機'],
  'Attack': ['Angriff', 'Attaque', 'Atacar', 'Atacar', '攻撃'],
  'Face': ['Blickrichtung', 'Orientation', 'Orientación', 'Direção', '向き'],
  'North': ['Norden', 'Nord', 'Norte', 'Norte', '北'],
  'East': ['Osten', 'Est', 'Este', 'Leste', '東'],
  'West': ['Westen', 'Ouest', 'Oeste', 'Oeste', '西'],
  'South': ['Süden', 'Sud', 'Sur', 'Sul', '南'],
  'Keep facing': ['Richtung behalten', 'Garder l’orientation', 'Mantener orientación', 'Manter direção', 'そのまま'],
  'Jump': ['Sprung', 'Saut', 'Salto', 'Salto', '跳躍'],
  'Evade': ['Ausweichen', 'Esquive', 'Evasión', 'Evasão', '回避'],
  'Choose an action.': ['Wähle eine Aktion.', 'Choisissez une action.', 'Elige una acción.', 'Escolha uma ação.', '行動を選んでください。'],
  'Cancel goes back.': ['Abbrechen geht zurück.', 'Annuler revient en arrière.', 'Cancelar vuelve atrás.', 'Cancelar volta.', 'キャンセルで戻ります。'],
  'Right-click or Esc cancels.': ['Rechtsklick oder Esc bricht ab.', 'Clic droit ou Échap pour annuler.', 'Clic derecho o Esc cancela.', 'Clique direito ou Esc cancela.', '右クリックかEscでキャンセル。'],
  '{name} is beyond command.': ['{name} hört auf keinen Befehl.', '{name} n’obéit plus.', '{name} no atiende órdenes.', '{name} não obedece a comandos.', '{name}は命令を聞かない。'],
  'Tap a tile to move to.': ['Tippe auf ein Zielfeld.', 'Touchez une case de destination.', 'Toca una casilla de destino.', 'Toque numa casa de destino.', '移動先のマスをタップ。'],
  'Select a tile to move to.': ['Wähle ein Zielfeld.', 'Sélectionnez une case de destination.', 'Selecciona una casilla de destino.', 'Selecione uma casa de destino.', '移動先のマスを選択。'],
  'Choose a skillset.': ['Wähle ein Fähigkeitenset.', 'Choisissez un jeu de capacités.', 'Elige un conjunto de habilidades.', 'Escolha um conjunto de habilidades.', 'スキルセットを選択。'],
  'Choose an ability.': ['Wähle eine Fähigkeit.', 'Choisissez une capacité.', 'Elige una habilidad.', 'Escolha uma habilidade.', 'アビリティを選択。'],
  'Choose an ability. Hover for details.': ['Wähle eine Fähigkeit. Details beim Überfahren.', 'Choisissez une capacité. Survolez pour les détails.', 'Elige una habilidad. Pasa el cursor para ver detalles.', 'Escolha uma habilidade. Passe o cursor para detalhes.', 'アビリティを選択。カーソルを合わせると詳細を表示。'],
  '{ability}: tap a target tile.': ['{ability}: Tippe auf ein Zielfeld.', '{ability} : touchez une case cible.', '{ability}: toca una casilla objetivo.', '{ability}: toque numa casa alvo.', '{ability}：対象のマスをタップ。'],
  '{ability}: select a target tile.': ['{ability}: Wähle ein Zielfeld.', '{ability} : sélectionnez une case cible.', '{ability}: selecciona una casilla objetivo.', '{ability}: selecione uma casa alvo.', '{ability}：対象のマスを選択。'],
  'Tap a direction to face, or tap a tile.': ['Tippe auf eine Blickrichtung oder ein Feld.', 'Touchez une direction, ou une case.', 'Toca una dirección o una casilla.', 'Toque numa direção ou numa casa.', '向きをタップするか、マスをタップ。'],
  'Choose a direction to face (or click a tile).': ['Wähle eine Blickrichtung (oder klicke ein Feld).', 'Choisissez une orientation (ou cliquez une case).', 'Elige una orientación (o haz clic en una casilla).', 'Escolha uma direção (ou clique numa casa).', '向きを選択（またはマスをクリック）。'],
  'raging': ['rasend', 'enragé', 'furioso', 'furioso', '狂戦士'],
  'silenced': ['verstummt', 'silence', 'silenciado', 'silenciado', '沈黙'],
  'no MP': ['keine MP', 'MP insuffisants', 'sin MP', 'sem MP', 'MP不足'],
  'Range {r} · Area {a} · Vert {v}': ['Reichweite {r} · Fläche {a} · Höhe {v}', 'Portée {r} · Zone {a} · Vert. {v}', 'Alcance {r} · Área {a} · Vert. {v}', 'Alcance {r} · Área {a} · Vert. {v}', '射程{r} · 範囲{a} · 高低{v}'],
  'cross': ['Kreuz', 'croix', 'cruz', 'cruz', '十字'],
  'wide': ['weit', 'large', 'amplia', 'ampla', '広範囲'],
  'single': ['einzeln', 'unique', 'única', 'única', '単体'],
  'Charge {n}': ['Aufladen {n}', 'Charge {n}', 'Carga {n}', 'Carga {n}', 'チャージ{n}'],
  'Instant': ['Sofort', 'Instantané', 'Instantánea', 'Instantânea', '即時'],
  '{name} cannot reach that tile. Tap a blue tile, or tap Cancel.': ['{name} erreicht dieses Feld nicht. Tippe auf ein blaues Feld oder auf Abbrechen.', '{name} ne peut pas atteindre cette case. Touchez une case bleue, ou Annuler.', '{name} no puede llegar a esa casilla. Toca una casilla azul o Cancelar.', '{name} não alcança essa casa. Toque numa casa azul ou em Cancelar.', '{name}はそのマスに届きません。青いマスかキャンセルをタップ。'],
  '{name} cannot reach that tile. Select a blue tile, or press Cancel.': ['{name} erreicht dieses Feld nicht. Wähle ein blaues Feld oder drücke Abbrechen.', '{name} ne peut pas atteindre cette case. Sélectionnez une case bleue, ou Annuler.', '{name} no puede llegar a esa casilla. Selecciona una casilla azul o pulsa Cancelar.', '{name} não alcança essa casa. Selecione uma casa azul ou pressione Cancelar.', '{name}はそのマスに届きません。青いマスを選ぶか、キャンセルを押してください。'],
  'Auto: your units act on their own. Press Auto again to take back command.': ['Auto: Deine Einheiten handeln selbst. Drücke erneut Auto, um das Kommando zurückzunehmen.', 'Auto : vos unités agissent seules. Appuyez de nouveau sur Auto pour reprendre le commandement.', 'Auto: tus unidades actúan solas. Pulsa Auto de nuevo para retomar el mando.', 'Auto: suas unidades agem sozinhas. Pressione Auto de novo para retomar o comando.', '自動：ユニットが自動で行動します。もう一度「自動」を押すと指揮に戻ります。'],
  'Auto off: command returns to you at the next turn.': ['Auto aus: Ab dem nächsten Zug hast du wieder das Kommando.', 'Auto désactivé : le commandement vous revient au prochain tour.', 'Auto desactivado: el mando vuelve a ti en el próximo turno.', 'Auto desligado: o comando volta para você no próximo turno.', '自動解除：次のターンから指揮が戻ります。'],
  'Violet: where {name} can strike next turn. Tap {name} again to clear.': ['Violett: Wohin {name} im nächsten Zug schlagen kann. Tippe erneut auf {name}, um es auszublenden.', 'Violet : où {name} peut frapper au prochain tour. Touchez {name} à nouveau pour effacer.', 'Violeta: donde {name} puede golpear el próximo turno. Toca {name} de nuevo para borrar.', 'Violeta: onde {name} pode atacar no próximo turno. Toque em {name} de novo para limpar.', '紫：{name}が次のターンに攻撃できる範囲。もう一度{name}をタップで消去。'],

  // ---- the first-chapter guide ----
  'Got it': ['Verstanden', 'Compris', 'Entendido', 'Entendi', 'わかった'],
  'Skip the guide': ['Anleitung überspringen', 'Passer le guide', 'Saltar la guía', 'Pular o guia', '案内をスキップ'],
  'Your first field. Tap a green tile to place each soldier, or Auto-place, then Begin Battle. Nothing is lost by a bad start: a lost battle can be fought again.': ['Dein erstes Feld. Tippe auf ein grünes Feld, um jeden Soldaten aufzustellen, oder wähle Automatisch, dann Schlacht beginnen. Ein schlechter Start kostet nichts: Eine verlorene Schlacht kann wiederholt werden.', 'Votre premier champ. Touchez une case verte pour placer chaque soldat, ou Placement auto, puis Commencer le combat. Un mauvais départ ne coûte rien : une bataille perdue peut être rejouée.', 'Tu primer campo. Toca una casilla verde para colocar a cada soldado, o Colocar auto, y luego Empezar batalla. Un mal comienzo no cuesta nada: una batalla perdida se puede repetir.', 'Seu primeiro campo. Toque numa casa verde para posicionar cada soldado, ou Auto-posicionar, depois Iniciar batalha. Um mau começo não custa nada: uma batalha perdida pode ser lutada de novo.', '最初の戦場です。緑のマスをタップして兵士を配置するか、自動配置を選び、戦闘開始を押してください。負けても失うものはなく、何度でも挑めます。'],
  '{name}\'s turn. Tap Move, then a blue tile. Higher ground hits harder, and the enemy\'s back is the best place to stand.': ['{name} ist am Zug. Tippe auf Bewegen, dann auf ein blaues Feld. Höheres Gelände schlägt härter, und der Rücken des Feindes ist der beste Platz.', 'Au tour de {name}. Touchez Déplacer, puis une case bleue. Le terrain élevé frappe plus fort, et le dos de l’ennemi est la meilleure place.', 'Turno de {name}. Toca Mover y luego una casilla azul. El terreno alto golpea más fuerte, y la espalda del enemigo es el mejor sitio.', 'Turno de {name}. Toque em Mover e depois numa casa azul. Terreno alto bate mais forte, e as costas do inimigo são o melhor lugar.', '{name}のターン。「移動」をタップし、青いマスを選びます。高い所からの攻撃は強く、敵の背後が最良の位置です。'],
  'Now Act, then Attack, then a red tile. The forecast shows the odds and the damage before you commit; Cancel backs out.': ['Jetzt Handeln, dann Angriff, dann ein rotes Feld. Die Vorschau zeigt Trefferchance und Schaden, bevor du dich festlegst; Abbrechen geht zurück.', 'Maintenant Agir, puis Attaque, puis une case rouge. La prévision montre les chances et les dégâts avant de valider ; Annuler revient en arrière.', 'Ahora Actuar, luego Atacar y una casilla roja. El pronóstico muestra la probabilidad y el daño antes de confirmar; Cancelar vuelve atrás.', 'Agora Agir, depois Atacar e uma casa vermelha. A previsão mostra as chances e o dano antes de confirmar; Cancelar volta.', '次は「行動」→「攻撃」→赤いマス。確定前に命中率とダメージの予測が出ます。キャンセルで戻れます。'],
  'The strip at the top is the turn order: fast units act more often, and a charged spell waits for its charge. Undo Move takes a move back until the unit acts.': ['Die Leiste oben ist die Zugreihenfolge: Schnelle Einheiten handeln öfter, und ein Zauber wartet auf seine Ladung. Zug zurück nimmt eine Bewegung zurück, bis die Einheit handelt.', 'La bande en haut est l’ordre des tours : les unités rapides agissent plus souvent, et un sort attend sa charge. Annuler le déplacement reprend un déplacement tant que l’unité n’a pas agi.', 'La tira de arriba es el orden de turnos: las unidades rápidas actúan más a menudo, y un hechizo espera su carga. Deshacer movimiento retira un movimiento hasta que la unidad actúe.', 'A faixa no topo é a ordem de turnos: unidades rápidas agem mais vezes, e um feitiço espera sua carga. Desfazer movimento retira um movimento até a unidade agir.', '上部の帯は行動順です。速いユニットほど頻繁に動き、詠唱魔法はチャージを待ちます。行動する前なら「移動を戻す」で移動を取り消せます。'],
  'That is the heart of it. The ? button has the rest. Good hunting.': ['Das ist der Kern. Der ?-Knopf hat den Rest. Gute Jagd.', 'Voilà l’essentiel. Le bouton ? a le reste. Bonne chasse.', 'Eso es lo esencial. El botón ? tiene el resto. Buena caza.', 'Esse é o essencial. O botão ? tem o resto. Boa caçada.', '基本はこれだけです。あとは「?」ボタンに。健闘を祈ります。'],
  'Last, choose a facing. A blow from behind cannot be dodged and lands a quarter harder, so face the enemy.': ['Zuletzt die Blickrichtung. Ein Schlag von hinten ist nicht auszuweichen und trifft ein Viertel härter, also wende dich dem Feind zu.', 'Enfin, choisissez l’orientation. Un coup dans le dos ne s’esquive pas et frappe un quart plus fort : faites face à l’ennemi.', 'Por último, elige la orientación. Un golpe por la espalda no se esquiva y pega un cuarto más fuerte: mira hacia el enemigo.', 'Por fim, escolha a direção. Um golpe pelas costas não é desviado e acerta um quarto mais forte: fique de frente para o inimigo.', '最後に向きを決めます。背後からの攻撃は回避できず、威力も25%増。敵の方を向きましょう。'],

  // ---- the help's headings ----
  'How to play': ['Spielanleitung', 'Comment jouer', 'Cómo jugar', 'Como jogar', '遊び方'],
  'Deployment:': ['Aufstellung:', 'Déploiement :', 'Despliegue:', 'Posicionamento:', '配置：'],
  'Charge Time (CT):': ['Ladezeit (CT):', 'Temps de charge (CT) :', 'Tiempo de carga (CT):', 'Tempo de carga (CT):', 'チャージタイム（CT）：'],
  'Turn:': ['Zug:', 'Tour :', 'Turno:', 'Turno:', 'ターン：'],
  'Facing:': ['Blickrichtung:', 'Orientation :', 'Orientación:', 'Direção:', '向き：'],
  'Friend or foe:': ['Freund oder Feind:', 'Ami ou ennemi :', 'Amigo o enemigo:', 'Amigo ou inimigo:', '敵と味方：'],
  'Height:': ['Höhe:', 'Hauteur :', 'Altura:', 'Altura:', '高低差：'],
  'Elements:': ['Elemente:', 'Éléments :', 'Elementos:', 'Elementos:', '属性：'],
  'The north:': ['Der Norden:', 'Le Nord :', 'El norte:', 'O norte:', '北方：'],
  'Guns and machines:': ['Gewehre und Maschinen:', 'Armes à feu et machines :', 'Armas de fuego y máquinas:', 'Armas de fogo e máquinas:', '銃と機械：'],
  'Charged abilities:': ['Aufgeladene Fähigkeiten:', 'Capacités à charge :', 'Habilidades de carga:', 'Habilidades com carga:', 'チャージ技：'],
  'Falling:': ['Stürzen:', 'Chutes :', 'Caídas:', 'Quedas:', '落下：'],
  'Crystals:': ['Kristalle:', 'Cristaux :', 'Cristales:', 'Cristais:', 'クリスタル：'],
  'Saves:': ['Spielstände:', 'Sauvegardes :', 'Guardado:', 'Saves:', 'セーブ：'],
  'Camp tabs:': ['Lager-Reiter:', 'Onglets du campement :', 'Pestañas del campamento:', 'Abas do acampamento:', '野営地のタブ：'],
  'Cities:': ['Städte:', 'Villes :', 'Ciudades:', 'Cidades:', '都市：'],
  'Forges:': ['Schmieden:', 'Forges :', 'Forjas:', 'Forjas:', '鍛冶場：'],
  'Errands:': ['Aufträge:', 'Missions :', 'Encargos:', 'Tarefas:', '任務：'],
  'Objective:': ['Ziel:', 'Objectif :', 'Objetivo:', 'Objetivo:', '目標：'],
  'Jobs:': ['Jobs:', 'Métiers :', 'Oficios:', 'Classes:', 'ジョブ：'],
  'Passives:': ['Passive:', 'Passifs :', 'Pasivas:', 'Passivas:', 'パッシブ：'],
  'Equipment:': ['Ausrüstung:', 'Équipement :', 'Equipo:', 'Equipamento:', '装備：'],
  'Baggage:': ['Gepäck:', 'Bagages :', 'Equipaje:', 'Bagagem:', '荷物：'],
  'Know your enemy:': ['Kenne deinen Feind:', 'Connaître l’ennemi :', 'Conoce a tu enemigo:', 'Conheça o inimigo:', '敵を知る：'],
  'Threat:': ['Bedrohung:', 'Menace :', 'Amenaza:', 'Ameaça:', '脅威範囲：'],
  'Auto:': ['Auto:', 'Auto :', 'Auto:', 'Auto:', '自動：'],
  'Speed:': ['Tempo:', 'Vitesse :', 'Velocidad:', 'Velocidade:', '速度：'],
  'Turning the field:': ['Feld drehen:', 'Rotation du champ :', 'Girar el campo:', 'Girar o campo:', '視点の回転：'],
  'Controls:': ['Steuerung:', 'Commandes :', 'Controles:', 'Controles:', '操作：'],
};

// The language in force: 'en', or a column of the table.
let LANG = 'en';

// localStorage can be absent or refuse; the language is a preference, not
// state, so a refusal only means the browser's language is used again.
function langStored() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } }
function langStore(code) { try { localStorage.setItem(LANG_KEY, code); } catch (e) { /* kept for the session */ } }

// The browser's first preferred language that the game speaks, else English.
function langOfBrowser() {
  const prefs = typeof navigator === 'undefined' ? [] : (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
  for (const p of prefs) {
    const code = String(p || '').toLowerCase().split(/[-_]/)[0];
    if (LANGS[code]) return code;
  }
  return 'en';
}

function setLang(code) {
  LANG = LANGS[code] ? code : 'en';
  langStore(LANG);
  if (typeof document !== 'undefined') { document.documentElement.lang = LANG === 'pt' ? 'pt-BR' : LANG; localizeDom(document); }
  return LANG;
}

// The current language's text for an English string, with {placeholders}
// filled from vars. An unknown key is its own text, so nothing goes blank.
function tr(key, vars) {
  const col = LANG_COLS.indexOf(LANG);
  const row = col >= 0 ? STRINGS[key] : null;
  let s = row && row[col] ? row[col] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

// The static shell: every element marked data-i18n has its English text as
// the key (given as the attribute's value, or, when the attribute is empty,
// read once from the element itself and kept). data-i18n-title and
// data-i18n-aria do the same for a tooltip and an accessible name.
function localizeDom(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (!el.dataset.i18n) el.dataset.i18n = el.textContent.trim();
    const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : null;
    el.textContent = tr(el.dataset.i18n, vars);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = tr(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
}

// The language before anything is drawn: what was chosen, else the browser's.
LANG = LANGS[langStored()] ? langStored() : langOfBrowser();
if (typeof document !== 'undefined') {
  document.documentElement.lang = LANG === 'pt' ? 'pt-BR' : LANG;
  document.addEventListener('DOMContentLoaded', () => localizeDom(document));
}
