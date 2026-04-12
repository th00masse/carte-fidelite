const express = require('express');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id VARCHAR(36) PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      telephone TEXT,
      email TEXT,
      tampons INT DEFAULT 0,
      total_passages INT DEFAULT 0,
      date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id VARCHAR(36),
      date_passage TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      soin TEXT,
      FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recompenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id VARCHAR(36),
      date_obtention TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      utilisee INT DEFAULT 0,
      FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )
  `);
  console.log('✅ Base de données MySQL prête');
}

// PAGE PRINCIPALE
app.get('/', async (req, res) => {
  const [clientes] = await pool.query('SELECT * FROM clientes ORDER BY nom');

  let listeClientes = clientes.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid #F0E6E0;">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#6B3A2A;font-weight:300">${c.prenom} ${c.nom}</div>
        <div style="font-size:9px;letter-spacing:2px;color:#9C7B6E;margin-top:4px">${c.total_passages} soin${c.total_passages > 1 ? 's' : ''} au total</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="display:flex;gap:5px">
          ${Array.from({length: 5}, (_, i) => `
            <div style="width:10px;height:10px;border-radius:50%;background:${i < c.tampons ? '#6B3A2A' : '#D4B8B0'}"></div>
          `).join('')}
        </div>
        <a href="/cliente/${c.id}" style="background:#6B3A2A;color:#F5EFE6;padding:8px 14px;border-radius:20px;text-decoration:none;font-size:9px;letter-spacing:2px">VOIR</a>
        <a href="sms:${c.telephone}?body=Bonjour ${c.prenom} 🌸 Voici votre carte fidélité Blossom : https://carte-fidelite-production-8a34.up.railway.app/scanner/${c.id}" style="background:#F5EFE6;color:#6B3A2A;border:1px solid #D4B8B0;padding:8px 14px;border-radius:20px;text-decoration:none;font-size:9px;letter-spacing:2px">ENVOYER</a>
      </div>
    </div>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Blossom — Espace Prestataire</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Montserrat',sans-serif; background:#F5EFE6; min-height:100vh; padding:40px 20px; }
        .logo-text { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:300; color:#6B3A2A; letter-spacing:8px; text-align:center; margin-bottom:4px; }
        .logo-sub { font-size:9px; font-weight:300; color:#9C7B6E; letter-spacing:4px; text-align:center; margin-bottom:8px; }
        .espace-label { font-size:8px; font-weight:500; color:#C4A99E; letter-spacing:3px; text-align:center; margin-bottom:40px; }
        .carte { background:white; border-radius:24px; padding:30px; width:100%; max-width:500px; margin:0 auto; box-shadow:0 8px 40px rgba(107,58,42,0.08); }
        .carte-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .carte-titre { font-size:9px; font-weight:500; color:#9C7B6E; letter-spacing:3px; }
        .btn-new { background:#6B3A2A; color:#F5EFE6; padding:10px 20px; border-radius:20px; text-decoration:none; font-size:9px; letter-spacing:2px; }
        .empty { font-family:'Cormorant Garamond',serif; font-size:16px; font-style:italic; color:#C4A99E; text-align:center; padding:30px 0; }
      </style>
    </head>
    <body>
      <div class="logo-text">BLOSSOM</div>
      <div class="logo-sub">ÉPILATION · VAJACIAL</div>
      <div class="espace-label">ESPACE PRESTATAIRE</div>
      <div class="carte">
        <div class="carte-header">
          <div class="carte-titre">MES CLIENTES (${clientes.length})</div>
          <a href="/nouvelle-cliente" class="btn-new">+ NOUVELLE</a>
        </div>
        ${listeClientes.length > 0 ? listeClientes : '<div class="empty">Aucune cliente pour le moment</div>'}
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
      <title>Blossom — Nouvelle Cliente</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Montserrat',sans-serif; background:#F5EFE6; min-height:100vh; padding:40px 20px; }
        .logo-text { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:300; color:#6B3A2A; letter-spacing:8px; text-align:center; margin-bottom:4px; }
        .logo-sub { font-size:9px; font-weight:300; color:#9C7B6E; letter-spacing:4px; text-align:center; margin-bottom:40px; }
        .carte { background:white; border-radius:24px; padding:30px; width:100%; max-width:400px; margin:0 auto; box-shadow:0 8px 40px rgba(107,58,42,0.08); }
        label { display:block; font-size:8px; letter-spacing:3px; color:#9C7B6E; margin-bottom:8px; margin-top:20px; }
        input { width:100%; padding:12px; border:none; border-bottom:1px solid #D4B8B0; font-size:15px; font-family:'Cormorant Garamond',serif; background:transparent; color:#6B3A2A; outline:none; }
        input::placeholder { color:#D4B8B0; }
        .btn { background:#6B3A2A; color:#F5EFE6; padding:14px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; margin-top:30px; }
        .btn-retour { color:#9C7B6E; font-size:9px; letter-spacing:2px; text-decoration:none; display:inline-block; margin-bottom:24px; }
      </style>
    </head>
    <body>
      <div class="logo-text">BLOSSOM</div>
      <div class="logo-sub">ÉPILATION · VAJACIAL</div>
      <div class="carte">
        <a href="/" class="btn-retour">← RETOUR</a>
        <form method="POST" action="/nouvelle-cliente">
          <label>PRÉNOM *</label>
          <input type="text" name="prenom" required placeholder="Prénom">
          <label>NOM *</label>
          <input type="text" name="nom" required placeholder="Nom">
          <label>TÉLÉPHONE</label>
          <input type="tel" name="telephone" placeholder="06 00 00 00 00">
          <label>EMAIL</label>
          <input type="email" name="email" placeholder="email@exemple.com">
          <button type="submit" class="btn">CRÉER LA CARTE</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ACTION - Créer nouvelle cliente
app.post('/nouvelle-cliente', async (req, res) => {
  const { nom, prenom, telephone, email } = req.body;
  const id = uuidv4();
  await pool.query(
    'INSERT INTO clientes (id, nom, prenom, telephone, email) VALUES (?, ?, ?, ?, ?)',
    [id, nom, prenom, telephone || '', email || '']
  );
  res.redirect(`/cliente/${id}`);
});

// PAGE - Fiche cliente
app.get('/cliente/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  const cliente = rows[0];
  if (!cliente) return res.redirect('/');

  const [passages] = await pool.query('SELECT * FROM passages WHERE cliente_id = ? ORDER BY date_passage DESC', [cliente.id]);
  const [recompenses] = await pool.query('SELECT * FROM recompenses WHERE cliente_id = ? ORDER BY date_obtention DESC', [cliente.id]);
  const recompenseDisponible = recompenses.find(r => !r.utilisee);

  const listePassages = passages.map(p => `
    <div style="padding:10px 0;border-bottom:1px solid #F0E6E0;font-size:13px;display:flex;justify-content:space-between">
      <span style="color:#9C7B6E">${new Date(p.date_passage).toLocaleDateString('fr-FR')}</span>
      ${p.soin ? `<span style="color:#6B3A2A">${p.soin}</span>` : ''}
    </div>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Blossom — ${cliente.prenom}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Montserrat',sans-serif; background:#F5EFE6; min-height:100vh; padding:40px 20px; }
        .logo-text { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:300; color:#6B3A2A; letter-spacing:8px; text-align:center; margin-bottom:4px; }
        .logo-sub { font-size:9px; font-weight:300; color:#9C7B6E; letter-spacing:4px; text-align:center; margin-bottom:40px; }
        .carte { background:white; border-radius:24px; padding:30px; width:100%; max-width:400px; margin:0 auto 20px; box-shadow:0 8px 40px rgba(107,58,42,0.08); }
        .section-label { font-size:8px; letter-spacing:3px; color:#9C7B6E; margin-bottom:16px; }
        .prenom { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:300; color:#6B3A2A; margin-bottom:4px; }
        .tampons { display:flex; gap:10px; justify-content:center; margin:20px 0; }
        .tampon { width:44px; height:44px; border-radius:50%; border:1px solid #D4B8B0; display:flex; align-items:center; justify-content:center; }
        .tampon.plein { background:#6B3A2A; border-color:#6B3A2A; }
        .tampon.plein::after { content:''; width:14px; height:14px; background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5EFE6'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E") center/contain no-repeat; display:block; }
        .tampon.vide::after { content:''; width:8px; height:8px; border-radius:50%; background:#D4B8B0; display:block; }
        select { width:100%; padding:12px; border:none; border-bottom:1px solid #D4B8B0; font-size:14px; font-family:'Cormorant Garamond',serif; background:transparent; color:#6B3A2A; outline:none; margin-bottom:16px; }
        .btn { background:#6B3A2A; color:#F5EFE6; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; }
        .btn-reward { background:#C4956A; color:#F5EFE6; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; margin-top:10px; }
        .btn-retour { color:#9C7B6E; font-size:9px; letter-spacing:2px; text-decoration:none; display:inline-block; margin-bottom:24px; }
        .reward-card { background:#FDF6F0; border-radius:16px; padding:20px; text-align:center; margin-bottom:20px; }
        .reward-titre { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:300; color:#6B3A2A; margin:8px 0 4px; }
        .reward-sub { font-size:8px; letter-spacing:2px; color:#9C7B6E; }
      </style>
    </head>
    <body>
      <div class="logo-text">BLOSSOM</div>
      <div class="logo-sub">ÉPILATION · VAJACIAL</div>
      <div style="max-width:400px;margin:0 auto">
        <a href="/" class="btn-retour">← RETOUR</a>
      </div>

      ${recompenseDisponible ? `
      <div style="max-width:400px;margin:0 auto 20px">
        <div class="reward-card">
          <div style="font-size:24px">🌸</div>
          <div class="reward-titre">Récompense disponible</div>
          <div class="reward-sub">CETTE CLIENTE A ATTEINT 5 SOINS</div>
          <form method="POST" action="/utiliser-recompense/${recompenseDisponible.id}" style="margin-top:16px">
            <button type="submit" class="btn-reward">VALIDER LA RÉCOMPENSE</button>
          </form>
        </div>
      </div>
      ` : ''}

      <div class="carte">
        <div class="section-label">CLIENTE</div>
        <div class="prenom">${cliente.prenom} ${cliente.nom}</div>
        <div style="font-size:9px;color:#9C7B6E;letter-spacing:2px;margin-top:4px">${cliente.total_passages} soin${cliente.total_passages > 1 ? 's' : ''} au total</div>
        <div class="tampons" style="margin-top:24px">
          ${Array.from({length: 5}, (_, i) => `
            <div class="tampon ${i < cliente.tampons ? 'plein' : 'vide'}"></div>
          `).join('')}
        </div>
        <div style="font-size:9px;letter-spacing:2px;color:#9C7B6E;text-align:center;margin-bottom:24px">${cliente.tampons} SOIN${cliente.tampons > 1 ? 'S' : ''} SUR 5</div>
        <div class="section-label">AJOUTER UN SOIN</div>
        <form method="POST" action="/ajouter-tampon/${cliente.id}">
          <select name="soin">
            <option value="">Sélectionner le soin...</option>
            <option>Vajacial complet sans épilation</option>
            <option>Vajacial express avec épilation intégrale</option>
            <option>Vajacial complet avec épilation intégrale</option>
            <option>Soin des aisselles</option>
            <option>Épilation à la carte</option>
            <option>Formule combinée</option>
          </select>
          <button type="submit" class="btn">+ AJOUTER UN TAMPON</button>
        </form>
      </div>

      <div class="carte">
        <div class="section-label">HISTORIQUE</div>
        ${listePassages.length > 0 ? listePassages : '<div style="font-family:Cormorant Garamond,serif;font-style:italic;color:#C4A99E;font-size:15px">Aucun passage enregistré</div>'}
      </div>
    </body>
    </html>
  `);
});

// ACTION - Ajouter un tampon
app.post('/ajouter-tampon/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  const cliente = rows[0];
  if (!cliente) return res.redirect('/');

  const soin = req.body.soin || '';
  await pool.query('INSERT INTO passages (cliente_id, soin) VALUES (?, ?)', [cliente.id, soin]);

  let nouveauxTampons = cliente.tampons + 1;
  if (nouveauxTampons >= 5) {
    nouveauxTampons = 0;
    await pool.query('INSERT INTO recompenses (cliente_id) VALUES (?)', [cliente.id]);
  }

  await pool.query(
    'UPDATE clientes SET tampons = ?, total_passages = total_passages + 1 WHERE id = ?',
    [nouveauxTampons, cliente.id]
  );

  res.redirect(`/cliente/${cliente.id}`);
});

// ACTION - Utiliser une récompense
app.post('/utiliser-recompense/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM recompenses WHERE id = ?', [req.params.id]);
  const recompense = rows[0];
  if (!recompense) return res.redirect('/');
  await pool.query('UPDATE recompenses SET utilisee = 1 WHERE id = ?', [req.params.id]);
  res.redirect(`/cliente/${recompense.cliente_id}`);
});

// PAGE - Carte cliente
app.get('/scanner/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  const cliente = rows[0];
  if (!cliente) return res.send('Carte non trouvée');

  const [recompenses] = await pool.query(
    'SELECT * FROM recompenses WHERE cliente_id = ? AND utilisee = 0',
    [cliente.id]
  );
  const recompenseDisponible = recompenses[0];

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Blossom — Ma Carte Fidélité</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Montserrat',sans-serif; background:#F5EFE6; min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:40px 20px; }
        .logo-text { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:300; color:#6B3A2A; letter-spacing:8px; text-align:center; margin-bottom:4px; }
        .logo-sub { font-size:10px; font-weight:300; color:#9C7B6E; letter-spacing:4px; text-align:center; margin-bottom:50px; }
        .carte { background:white; border-radius:24px; padding:40px 30px; width:100%; max-width:360px; box-shadow:0 8px 40px rgba(107,58,42,0.08); }
        .bonjour { font-family:'Cormorant Garamond',serif; font-size:13px; font-weight:300; color:#9C7B6E; letter-spacing:3px; text-align:center; margin-bottom:6px; }
        .prenom { font-family:'Cormorant Garamond',serif; font-size:36px; font-weight:300; color:#6B3A2A; text-align:center; margin-bottom:40px; }
        .tampons-label { font-size:9px; font-weight:500; color:#9C7B6E; letter-spacing:3px; text-align:center; margin-bottom:20px; }
        .tampons { display:flex; justify-content:center; gap:12px; margin-bottom:16px; }
        .tampon { width:44px; height:44px; border-radius:50%; border:1px solid #D4B8B0; display:flex; align-items:center; justify-content:center; }
        .tampon.plein { background:#6B3A2A; border-color:#6B3A2A; }
        .tampon.plein::after { content:''; width:14px; height:14px; background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5EFE6'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E") center/contain no-repeat; display:block; }
        .tampon.vide::after { content:''; width:8px; height:8px; border-radius:50%; background:#D4B8B0; display:block; }
        .progression { font-size:10px; font-weight:300; color:#9C7B6E; letter-spacing:2px; text-align:center; margin-bottom:40px; }
        .separateur { width:40px; height:1px; background:#D4B8B0; margin:0 auto 30px; }
        .recompense-titre { font-size:9px; font-weight:500; color:#9C7B6E; letter-spacing:3px; text-align:center; margin-bottom:12px; }
        .recompense-texte { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:300; font-style:italic; color:#6B3A2A; text-align:center; line-height:1.6; }
        .message-reward { background:#F5EFE6; border-radius:16px; padding:24px; text-align:center; margin-top:30px; }
        .reward-emoji { font-size:28px; margin-bottom:10px; }
        .reward-titre { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:300; color:#6B3A2A; margin-bottom:6px; }
        .reward-sub { font-size:10px; color:#9C7B6E; letter-spacing:2px; }
        .total { font-size:10px; color:#C4A99E; letter-spacing:2px; text-align:center; margin-top:30px; }
      </style>
    </head>
    <body>
      <div class="logo-text">BLOSSOM</div>
      <div class="logo-sub">ÉPILATION · VAJACIAL</div>
      <div class="carte">
        <div class="bonjour">BIENVENUE</div>
        <div class="prenom">${cliente.prenom}</div>
        <div class="tampons-label">VOTRE FIDÉLITÉ</div>
        <div class="tampons">
          ${Array.from({length: 5}, (_, i) => `
            <div class="tampon ${i < cliente.tampons ? 'plein' : 'vide'}"></div>
          `).join('')}
        </div>
        <div class="progression">${cliente.tampons} soin${cliente.tampons > 1 ? 's' : ''} sur 5</div>
        <div class="separateur"></div>
        <div class="recompense-titre">VOTRE RÉCOMPENSE</div>
        <div class="recompense-texte">
          Au 5ème soin,<br>profitez d'un soin des aisselles offert
        </div>
        ${recompenseDisponible ? `
        <div class="message-reward">
          <div class="reward-emoji">🌸</div>
          <div class="reward-titre">Félicitations</div>
          <div class="reward-sub">MERCI POUR VOTRE FIDÉLITÉ — VOTRE RÉCOMPENSE VOUS ATTEND</div>
        </div>
        ` : ''}
        <div class="total">${cliente.total_passages} soin${cliente.total_passages > 1 ? 's' : ''} au total</div>
      </div>
    </body>
    </html>
  `);
});

// Démarrage
initDB().then(() => {
  app.listen(3000, () => {
    console.log('✨ Serveur Blossom démarré !');
    console.log('👉 http://localhost:3000');
  });
});