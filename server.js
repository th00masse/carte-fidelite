const express = require('express');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new Database('fidelite.db');

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

// PAGE PRINCIPALE
app.get('/', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nom').all();

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
        body { font-family:'Montserrat',sans-serif; background:#F5EFE6; min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:40px 20px; }
        .logo-text { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:300; color:#6B3A2A; letter-spacing:8px; text-align:center; margin-bottom:4px; }
        .logo-sub { font-size:10px; font-weight:300; color:#9C7B6E; letter-spacing:4px; text-align:center; margin-bottom:50px; }
        .carte { background:white; border-radius:24px; padding:40px 30px; width:100%; max-width:360px; box-shadow:0 8px 40px rgba(107,58,42,0.08); }
        .carte-titre { font-family:'Cormorant Garamond',serif; font-size:13px; font-weight:300; color:#9C7B6E; letter-spacing:3px; text-align:center; margin-bottom:30px; }
        .separateur { width:40px; height:1px; background:#D4B8B0; margin:0 auto 30px; }
        label { display:block; font-size:8px; letter-spacing:3px; color:#9C7B6E; margin-bottom:8px; margin-top:24px; }
        input { width:100%; padding:10px 0; border:none; border-bottom:1px solid #D4B8B0; font-size:16px; font-family:'Cormorant Garamond',serif; background:transparent; color:#6B3A2A; outline:none; }
        input::placeholder { color:#D4B8B0; font-style:italic; }
        input:focus { border-bottom-color:#6B3A2A; }
        .btn { background:#6B3A2A; color:#F5EFE6; padding:14px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; margin-top:36px; font-family:'Montserrat',sans-serif; }
        .btn-retour { font-size:9px; letter-spacing:2px; color:#9C7B6E; text-decoration:none; display:inline-block; margin-bottom:24px; font-family:'Montserrat',sans-serif; }
      </style>
    </head>
    <body>
      <div class="logo-text">BLOSSOM</div>
      <div class="logo-sub">ÉPILATION · VAJACIAL</div>
      <a href="/" class="btn-retour">← RETOUR</a>
      <div class="carte">
        <div class="carte-titre">NOUVELLE CLIENTE</div>
        <div class="separateur"></div>
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
app.post('/nouvelle-cliente', (req, res) => {
  const { nom, prenom, telephone, email } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO clientes (id, nom, prenom, telephone, email) VALUES (?, ?, ?, ?, ?)`)
    .run(id, nom, prenom, telephone || '', email || '');
  res.redirect(`/cliente/${id}`);
});

// PAGE - Fiche cliente
app.get('/cliente/:id', async (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.redirect('/');

  const passages = db.prepare('SELECT * FROM passages WHERE cliente_id = ? ORDER BY date_passage DESC').all(cliente.id);
  const recompenses = db.prepare('SELECT * FROM recompenses WHERE cliente_id = ? ORDER BY date_obtention DESC').all(cliente.id);
  const recompenseDisponible = recompenses.find(r => !r.utilisee);

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const clientUrl = `${baseUrl}/scanner/${cliente.id}`;
  const qrCode = await QRCode.toDataURL(clientUrl, { width: 200, margin: 1, color: { dark: '#6B3A2A', light: '#F5EFE6' } });

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
        .btn { background:#6B3A2A; color:#F5EFE6; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; font-family:'Montserrat',sans-serif; }
        .btn-reward { background:#C4956A; color:#F5EFE6; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; margin-top:10px; font-family:'Montserrat',sans-serif; }
        .btn-retour { color:#9C7B6E; font-size:9px; letter-spacing:2px; text-decoration:none; display:inline-block; margin-bottom:24px; font-family:'Montserrat',sans-serif; }
        .btn-whatsapp { background:#25D366; color:white; padding:12px 24px; border:none; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; margin-top:10px; font-family:'Montserrat',sans-serif; text-decoration:none; display:block; text-align:center; }
        .btn-copy { background:#F5EFE6; color:#6B3A2A; border:1px solid #D4B8B0; padding:12px 24px; border-radius:25px; cursor:pointer; font-size:9px; letter-spacing:3px; width:100%; margin-top:10px; font-family:'Montserrat',sans-serif; }
        .reward-card { background:#F5EFE6; border-radius:16px; padding:20px; text-align:center; margin-bottom:20px; max-width:400px; margin-left:auto; margin-right:auto; }
        .reward-titre { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:300; color:#6B3A2A; margin:8px 0 4px; }
        .reward-sub { font-size:8px; letter-spacing:2px; color:#9C7B6E; }
        .separateur { width:40px; height:1px; background:#D4B8B0; margin:0 auto 20px; }
      </style>
    </head>
    <body>
      <div class="logo-text">BLOSSOM</div>
      <div class="logo-sub">ÉPILATION · VAJACIAL</div>
      <div style="max-width:400px;margin:0 auto">
        <a href="/" class="btn-retour">← RETOUR</a>
      </div>

      ${recompenseDisponible ? `
      <div class="reward-card">
        <div style="font-size:24px">🌸</div>
        <div class="reward-titre">Récompense disponible</div>
        <div class="reward-sub">CETTE CLIENTE A ATTEINT 5 SOINS</div>
        <form method="POST" action="/utiliser-recompense/${recompenseDisponible.id}" style="margin-top:16px">
          <button type="submit" class="btn-reward">VALIDER LA RÉCOMPENSE</button>
        </form>
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
        <div class="separateur"></div>
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
        <div class="section-label">ENVOYER LA CARTE</div>
        <div style="text-align:center;margin-bottom:16px">
          <img src="${qrCode}" style="border-radius:10px;width:160px">
        </div>
        ${cliente.telephone ? `
        <a href="https://wa.me/${cliente.telephone.replace(/\D/g,'')}?text=${encodeURIComponent('Bonjour ' + cliente.prenom + ' 🌸 Voici votre carte fidélité Blossom : ' + clientUrl)}" target="_blank" class="btn-whatsapp">💬 ENVOYER SUR WHATSAPP</a>
        ` : ''}
        <button onclick="copyLink('${clientUrl}', this)" class="btn-copy">📋 COPIER LE LIEN</button>
      </div>

      <div class="carte">
        <div class="section-label">HISTORIQUE</div>
        ${listePassages.length > 0 ? listePassages : '<div style="font-family:Cormorant Garamond,serif;font-style:italic;color:#C4A99E;font-size:15px">Aucun passage enregistré</div>'}
      </div>

      <script>
        function copyLink(url, btn) {
          navigator.clipboard.writeText(url).then(() => {
            const original = btn.textContent;
            btn.textContent = '✅ COPIÉ !';
            btn.style.background = '#27ae60';
            btn.style.color = 'white';
            setTimeout(() => {
              btn.textContent = original;
              btn.style.background = '';
              btn.style.color = '';
            }, 2500);
          });
        }
      </script>
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
  if (nouveauxTampons >= 5) {
    nouveauxTampons = 0;
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

// PAGE - Carte cliente
app.get('/scanner/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.send('Carte non trouvée');

  const recompenseDisponible = db.prepare('SELECT * FROM recompenses WHERE cliente_id = ? AND utilisee = 0').get(cliente.id);

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
app.listen(3000, () => {
  console.log('✨ Serveur Blossom démarré !');
  console.log('👉 http://localhost:3000');
});