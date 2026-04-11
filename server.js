const express = require('express');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Création de la base de données
const db = new Database('fidelite.db');

// Création des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT,
    email TEXT,
    tampons INTEGER DEFAULT 0,
    total_passages INTEGER DEFAULT 0,
    date_inscription TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS passages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id TEXT,
    date_passage TEXT DEFAULT CURRENT_TIMESTAMP,
    soin TEXT,
    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS recompenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id TEXT,
    date_obtention TEXT DEFAULT CURRENT_TIMESTAMP,
    utilisee INTEGER DEFAULT 0,
    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
  );
`);

// PAGE PRINCIPALE - Interface prestataire
app.get('/', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nom').all();
  
  let listeClientes = clientes.map(c => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #f0e6e0">${c.prenom} ${c.nom}</td>
      <td style="padding:12px;border-bottom:1px solid #f0e6e0;text-align:center">
        ${'🟤'.repeat(c.tampons)}${'⚪'.repeat(5 - c.tampons)}
      </td>
      <td style="padding:12px;border-bottom:1px solid #f0e6e0;text-align:center">${c.total_passages}</td>
      <td style="padding:12px;border-bottom:1px solid #f0e6e0;text-align:center">
        <a href="/cliente/${c.id}" style="background:#8B4513;color:white;padding:6px 12px;border-radius:20px;text-decoration:none;font-size:13px">Voir</a>
      </td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Carte Fidélité - Espace Prestataire</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Georgia',serif; background:#fdf6f0; color:#3d2314; }
        .header { background:#3d2314; color:#fdf6f0; padding:20px; text-align:center; }
        .header h1 { font-size:22px; letter-spacing:3px; }
        .header p { font-size:12px; opacity:0.7; margin-top:4px; letter-spacing:1px; }
        .container { max-width:800px; margin:30px auto; padding:0 20px; }
        .btn { background:#8B4513; color:white; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:15px; text-decoration:none; display:inline-block; margin:5px; }
        .btn:hover { background:#6b3410; }
        .card { background:white; border-radius:15px; padding:25px; margin:20px 0; box-shadow:0 2px 15px rgba(139,69,19,0.1); }
        table { width:100%; border-collapse:collapse; }
        th { background:#fdf6f0; padding:12px; text-align:left; font-size:13px; letter-spacing:1px; color:#8B4513; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✨ ESPACE PRESTATAIRE ✨</h1>
        <p>CARTE FIDÉLITÉ</p>
      </div>
      <div class="container">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-size:18px">Mes clientes (${clientes.length})</h2>
            <a href="/nouvelle-cliente" class="btn">+ Nouvelle cliente</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th style="text-align:center">TAMPONS</th>
                <th style="text-align:center">PASSAGES</th>
                <th style="text-align:center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${listeClientes.length > 0 ? listeClientes : '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999">Aucune cliente pour le moment</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `);
});

// PAGE - Nouvelle cliente
app.get('/nouvelle-cliente', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouvelle Cliente</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Georgia',serif; background:#fdf6f0; color:#3d2314; }
        .header { background:#3d2314; color:#fdf6f0; padding:20px; text-align:center; }
        .header h1 { font-size:22px; letter-spacing:3px; }
        .container { max-width:500px; margin:30px auto; padding:0 20px; }
        .card { background:white; border-radius:15px; padding:25px; box-shadow:0 2px 15px rgba(139,69,19,0.1); }
        input, select { width:100%; padding:12px; border:1px solid #e0cfc8; border-radius:10px; font-size:15px; margin-bottom:15px; font-family:'Georgia',serif; background:#fdf6f0; }
        label { display:block; margin-bottom:5px; font-size:13px; letter-spacing:1px; color:#8B4513; }
        .btn { background:#8B4513; color:white; padding:14px 24px; border:none; border-radius:25px; cursor:pointer; font-size:15px; width:100%; }
        .btn-retour { background:transparent; color:#8B4513; border:1px solid #8B4513; padding:10px 20px; border-radius:25px; text-decoration:none; display:inline-block; margin-bottom:20px; font-size:13px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✨ NOUVELLE CLIENTE ✨</h1>
      </div>
      <div class="container">
        <a href="/" class="btn-retour">← Retour</a>
        <div class="card">
          <form method="POST" action="/nouvelle-cliente">
            <label>PRÉNOM *</label>
            <input type="text" name="prenom" required placeholder="Prénom">
            <label>NOM *</label>
            <input type="text" name="nom" required placeholder="Nom">
            <label>TÉLÉPHONE</label>
            <input type="tel" name="telephone" placeholder="06 00 00 00 00">
            <label>EMAIL</label>
            <input type="email" name="email" placeholder="email@exemple.com">
            <button type="submit" class="btn">Créer la carte ✨</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ACTION - Créer nouvelle cliente
app.post('/nouvelle-cliente', (req, res) => {
  const { nom, prenom, telephone, email } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO clientes (id, nom, prenom, telephone, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nom, prenom, telephone || '', email || '');

  res.redirect(`/cliente/${id}`);
});

// PAGE - Fiche cliente
app.get('/cliente/:id', async (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.redirect('/');

  const passages = db.prepare('SELECT * FROM passages WHERE cliente_id = ? ORDER BY date_passage DESC').all(cliente.id);
  const recompenses = db.prepare('SELECT * FROM recompenses WHERE cliente_id = ? ORDER BY date_obtention DESC').all(cliente.id);
  const recompenseDisponible = recompenses.find(r => !r.utilisee);

  const qrUrl = `http://localhost:3000/scanner/${cliente.id}`;
  const qrCode = await QRCode.toDataURL(qrUrl, { width: 200, margin: 1, color: { dark: '#3d2314', light: '#fdf6f0' } });

  const listePassages = passages.map(p => `
    <div style="padding:10px 0;border-bottom:1px solid #f0e6e0;font-size:14px">
      <span>📅 ${new Date(p.date_passage).toLocaleDateString('fr-FR')}</span>
      ${p.soin ? `<span style="margin-left:10px;color:#8B4513">${p.soin}</span>` : ''}
    </div>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${cliente.prenom} ${cliente.nom}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Georgia',serif; background:#fdf6f0; color:#3d2314; }
        .header { background:#3d2314; color:#fdf6f0; padding:20px; text-align:center; }
        .header h1 { font-size:20px; letter-spacing:2px; }
        .container { max-width:600px; margin:30px auto; padding:0 20px; }
        .card { background:white; border-radius:15px; padding:25px; margin:15px 0; box-shadow:0 2px 15px rgba(139,69,19,0.1); }
        .tampons { display:flex; gap:10px; justify-content:center; margin:20px 0; }
        .tampon { width:50px; height:50px; border-radius:50%; border:2px solid #8B4513; display:flex; align-items:center; justify-content:center; font-size:22px; }
        .tampon.plein { background:#8B4513; }
        .tampon.vide { background:white; }
        .btn { background:#8B4513; color:white; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:15px; text-decoration:none; display:inline-block; margin:5px; }
        .btn-danger { background:#c0392b; }
        .btn-retour { background:transparent; color:#8B4513; border:1px solid #8B4513; padding:10px 20px; border-radius:25px; text-decoration:none; display:inline-block; margin-bottom:20px; font-size:13px; }
        .badge { background:#27ae60; color:white; padding:8px 16px; border-radius:20px; font-size:13px; display:inline-block; }
        select { padding:10px; border:1px solid #e0cfc8; border-radius:10px; font-size:14px; font-family:'Georgia',serif; background:#fdf6f0; margin-bottom:10px; width:100%; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✨ ${cliente.prenom.toUpperCase()} ${cliente.nom.toUpperCase()} ✨</h1>
      </div>
      <div class="container">
        <a href="/" class="btn-retour">← Retour</a>

        ${recompenseDisponible ? `
        <div class="card" style="border:2px solid #27ae60;text-align:center">
          <div style="font-size:30px">🎁</div>
          <h3 style="color:#27ae60;margin:10px 0">Récompense disponible !</h3>
          <p style="margin-bottom:15px;font-size:14px">Cette cliente a atteint 5 passages</p>
          <form method="POST" action="/utiliser-recompense/${recompenseDisponible.id}">
            <button type="submit" class="btn" style="background:#27ae60">Valider la récompense ✓</button>
          </form>
        </div>
        ` : ''}

        <div class="card" style="text-align:center">
          <h2 style="margin-bottom:5px">${cliente.tampons}/5 tampons</h2>
          <p style="font-size:13px;color:#999;margin-bottom:15px">${cliente.total_passages} passages au total</p>
          <div class="tampons">
            ${Array.from({length: 5}, (_, i) => `
              <div class="tampon ${i < cliente.tampons ? 'plein' : 'vide'}">
                ${i < cliente.tampons ? '✨' : ''}
              </div>
            `).join('')}
          </div>
          <form method="POST" action="/ajouter-tampon/${cliente.id}" style="margin-top:20px">
            <select name="soin">
              <option value="">Sélectionner le soin...</option>
              <option>Vajacial complet sans épilation</option>
              <option>Vajacial express avec épilation intégrale</option>
              <option>Vajacial complet avec épilation intégrale</option>
              <option>Soin des aisselles</option>
              <option>Épilation à la carte</option>
              <option>Formule combinée</option>
            </select>
            <button type="submit" class="btn">+ Ajouter un tampon</button>
          </form>
        </div>

        <div class="card" style="text-align:center">
          <h3 style="margin-bottom:15px;font-size:15px;letter-spacing:1px">QR CODE CLIENTE</h3>
          <img src="${qrCode}" style="border-radius:10px">
          <p style="font-size:12px;color:#999;margin-top:10px">La cliente peut scanner ce QR code</p>
        </div>

        <div class="card">
          <h3 style="margin-bottom:15px;font-size:15px;letter-spacing:1px">HISTORIQUE</h3>
          ${listePassages.length > 0 ? listePassages : '<p style="color:#999;font-size:14px">Aucun passage enregistré</p>'}
        </div>
      </div>
    </body>
    </html>
  `);
});

// ACTION - Ajouter un tampon
app.post('/ajouter-tampon/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.redirect('/');

  const soin = req.body.soin || '';
  
  db.prepare('INSERT INTO passages (cliente_id, soin) VALUES (?, ?)').run(cliente.id, soin);
  
  let nouveauxTampons = cliente.tampons + 1;
  let recompense = false;

  if (nouveauxTampons >= 5) {
    nouveauxTampons = 0;
    recompense = true;
    db.prepare('INSERT INTO recompenses (cliente_id) VALUES (?)').run(cliente.id);
  }

  db.prepare('UPDATE clientes SET tampons = ?, total_passages = total_passages + 1 WHERE id = ?')
    .run(nouveauxTampons, cliente.id);

  res.redirect(`/cliente/${cliente.id}`);
});

// ACTION - Utiliser une récompense
app.post('/utiliser-recompense/:id', (req, res) => {
  const recompense = db.prepare('SELECT * FROM recompenses WHERE id = ?').get(req.params.id);
  if (!recompense) return res.redirect('/');
  
  db.prepare('UPDATE recompenses SET utilisee = 1 WHERE id = ?').run(req.params.id);
  res.redirect(`/cliente/${recompense.cliente_id}`);
});

// PAGE - Scanner (vue cliente)
app.get('/scanner/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.send('Carte non trouvée');

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ma Carte Fidélité</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Georgia',serif; background:#3d2314; color:#fdf6f0; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; }
        .carte { background:linear-gradient(135deg, #8B4513, #3d2314); border-radius:20px; padding:30px; width:100%; max-width:340px; box-shadow:0 10px 40px rgba(0,0,0,0.4); text-align:center; }
        h1 { font-size:13px; letter-spacing:4px; opacity:0.8; margin-bottom:5px; }
        h2 { font-size:24px; margin-bottom:20px; }
        .tampons { display:flex; gap:8px; justify-content:center; margin:20px 0; }
        .tampon { width:45px; height:45px; border-radius:50%; border:2px solid rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; font-size:20px; }
        .tampon.plein { background:rgba(255,255,255,0.2); border-color:white; }
        p { font-size:13px; opacity:0.7; margin-top:15px; }
      </style>
    </head>
    <body>
      <div class="carte">
        <h1>CARTE FIDÉLITÉ ✨</h1>
        <h2>${cliente.prenom} ${cliente.nom}</h2>
        <div class="tampons">
          ${Array.from({length: 5}, (_, i) => `
            <div class="tampon ${i < cliente.tampons ? 'plein' : ''}">
              ${i < cliente.tampons ? '✨' : ''}
            </div>
          `).join('')}
        </div>
        <p>${cliente.tampons}/5 — encore ${5 - cliente.tampons} soin${5 - cliente.tampons > 1 ? 's' : ''} pour ta récompense ✨</p>
        <p style="margin-top:10px;font-size:11px;opacity:0.5">${cliente.total_passages} passages au total</p>
      </div>
    </body>
    </html>
  `);
});

// Démarrage du serveur
app.listen(3000, () => {
  console.log('');
  console.log('✨ Serveur démarré avec succès !');
  console.log('👉 Ouvre ton navigateur sur : http://localhost:3000');
  console.log('');
});