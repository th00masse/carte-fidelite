const express = require('express');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const { randomUUID: uuidv4 } = require('crypto');

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
        .btn:hover { background:#4e2a1e; }
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
  
  db.prepare(`
    INSERT INTO clientes (id, nom, prenom, telephone, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nom, prenom, telephone || '', email || '');

  res.redirect(`/cliente/${id}?nouveau=1`);
});

// PAGE - Fiche cliente
app.get('/cliente/:id', async (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.redirect('/');

  const passages = db.prepare('SELECT * FROM passages WHERE cliente_id = ? ORDER BY date_passage DESC').all(cliente.id);
  const recompenses = db.prepare('SELECT * FROM recompenses WHERE cliente_id = ? ORDER BY date_obtention DESC').all(cliente.id);
  const recompenseDisponible = recompenses.find(r => !r.utilisee);
  const isNew = req.query.nouveau === '1';

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const clientUrl = `${baseUrl}/scanner/${cliente.id}`;
  const qrCode = await QRCode.toDataURL(clientUrl, { width: 200, margin: 1, color: { dark: '#3d2314', light: '#fdf6f0' } });

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

        ${isNew ? `
        <div class="card" style="border:2px solid #8B4513;text-align:center;background:#fff8f4">
          <div style="font-size:36px;margin-bottom:8px">🎉</div>
          <h3 style="color:#8B4513;margin-bottom:8px;font-size:17px">Carte créée avec succès !</h3>
          <p style="font-size:14px;color:#666;margin-bottom:15px">Envoie ce lien à <strong>${cliente.prenom}</strong> pour qu'elle accède à sa carte :</p>
          <div style="background:#fdf6f0;border-radius:10px;padding:12px;margin-bottom:15px;word-break:break-all;font-size:13px;color:#3d2314;border:1px solid #e0cfc8">${clientUrl}</div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button onclick="copyLink('${clientUrl}', this)" class="btn" style="font-size:14px">📋 Copier le lien</button>
            ${cliente.telephone ? `<a href="https://wa.me/${cliente.telephone.replace(/\D/g,'')}?text=${encodeURIComponent('Bonjour ' + cliente.prenom + ' ! Voici ta carte fidélité : ' + clientUrl)}" target="_blank" class="btn" style="background:#25D366;font-size:14px">💬 Envoyer sur WhatsApp</a>` : ''}
          </div>
        </div>
        ` : ''}

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
          <h3 style="margin-bottom:15px;font-size:15px;letter-spacing:1px">🔗 LIEN & QR CODE CLIENTE</h3>
          <img src="${qrCode}" style="border-radius:10px">
          <p style="font-size:12px;color:#999;margin-top:10px;margin-bottom:15px">La cliente peut scanner ce QR code ou utiliser le lien</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button onclick="copyLink('${clientUrl}', this)" class="btn" style="font-size:13px">📋 Copier le lien</button>
            ${cliente.telephone ? `<a href="https://wa.me/${cliente.telephone.replace(/\D/g,'')}?text=${encodeURIComponent('Voici ta carte fidélité : ' + clientUrl)}" target="_blank" class="btn" style="background:#25D366;font-size:13px">💬 WhatsApp</a>` : ''}
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:15px;font-size:15px;letter-spacing:1px">HISTORIQUE</h3>
          ${listePassages.length > 0 ? listePassages : '<p style="color:#999;font-size:14px">Aucun passage enregistré</p>'}
        </div>
      </div>
      <script>
        function copyLink(url, btn) {
          navigator.clipboard.writeText(url).then(() => {
            const original = btn.textContent;
            btn.textContent = '✅ Copié !';
            btn.style.background = '#27ae60';
            setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 2500);
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
          <div class="reward-sub">VOTRE RÉCOMPENSE VOUS ATTEND</div>
        </div>
        ` : ''}
        <div class="total">${cliente.total_passages} soin${cliente.total_passages > 1 ? 's' : ''} au total</div>
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