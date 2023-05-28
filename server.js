const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');

const db = new sqlite3.Database(':memory:');

// Configuration d'EJS comme moteur de template
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());


// Création de la table "quizzes"
db.run(`CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY,
  title TEXT,
  questions JSON
)`);

// Création de la table "questions"
db.run(`CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  text TEXT,
  quizId INTEGER,
  note INTEGER, -- Ajout du champ "note"
  FOREIGN KEY (quizId) REFERENCES quizzes (id)
)`);


// Création de la table "answers"
db.run(`CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY,
  text TEXT,
  isCorrect INTEGER,
  questionId INTEGER,
  FOREIGN KEY (questionId) REFERENCES questions (id)
)`);

// Création de la table "userAnswers"
db.run(`CREATE TABLE IF NOT EXISTS userAnswers (
  id INTEGER PRIMARY KEY,
  userId INTEGER,
  questionId INTEGER,
  answer TEXT,
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (questionId) REFERENCES questions (id)
)`);


// Création de la table "users"
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  email TEXT,
  password TEXT
)`);

// Création de la table "results"
db.run(`CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY,
  userId INTEGER,
  quizId INTEGER,
  score INTEGER,
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (quizId) REFERENCES quizzes (id)
)`);

// Création de la table "sessions"
db.run(`CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  quizId INTEGER,
  startTime DATETIME,
  endTime DATETIME,
  FOREIGN KEY (quizId) REFERENCES quizzes (id)
)`);

// Création de la table "categories"
db.run(`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT
)`);

// Route d'inscription
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  // Vérifie si l'utilisateur existe déjà dans la base de données
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de l\'inscription');
    } else if (row) {
      res.status(400).send('Cet utilisateur existe déjà');
    } else {
      // Hash le mot de passe avant de le stocker
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de l\'inscription');
        } else {
          // Insère le nouvel utilisateur dans la base de données
          db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash], (err) => {
            if (err) {
              console.error(err);
              res.status(500).send('Erreur lors de l\'inscription');
            } else {
              res.send('Inscription réussie');
            }
          });
        }
      });
    }
  });
});


// Route d'authentification
app.get('/login', (req, res) => {
  res.render('login', { header: 'includes/header' });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // Logique d'authentification
});

  // Vérifie si l'utilisateur existe dans la base de données
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de l\'authentification');
    } else if (!row) {
      res.status(401).send('Adresse e-mail ou mot de passe incorrect');
    } else {
      // Vérifie le mot de passe hashé
      bcrypt.compare(password, row.password, (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de l\'authentification');
        } else if (!result) {
          res.status(401).send('Adresse e-mail ou mot de passe incorrect');
        } else {
          res.send('Authentification réussie');
        }
      });
    }
  });
});

// Route pour enregistrer les résultats d'un quiz pour un utilisateur
app.post('/results', (req, res) => {
  const { userId, quizId, score } = req.body;
  db.run('INSERT INTO results (userId, quizId, score) VALUES (?, ?, ?)', [userId, quizId, score], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de l\'enregistrement des résultats');
    } else {
      res.send('Résultats enregistrés avec succès');
    }
  });
});

// Route pour récupérer les résultats d'un quiz pour un utilisateur
app.get('/results/:userId/:quizId', (req, res) => {
  const { userId, quizId } = req.params;
  db.get('SELECT * FROM results WHERE userId = ? AND quizId = ?', [userId, quizId], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des résultats');
    } else if (!row) {
      res.status(404).send('Aucun résultat trouvé');
    } else {
      res.json(row);
    }
  });
});

// Route pour créer une nouvelle session de formation
app.post('/sessions', (req, res) => {
  const { quizId, startTime, endTime } = req.body;
  db.run('INSERT INTO sessions (quizId, startTime, endTime) VALUES (?, ?, ?)', [quizId, startTime, endTime], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la création de la session');
    } else {
      res.send('Session de formation créée avec succès');
    }
  });
});

// Route pour récupérer toutes les sessions de formation
app.get('/sessions', (req, res) => {
  db.all('SELECT * FROM sessions', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des sessions');
    } else {
      res.json(rows);
    }
  });
});

// Route pour récupérer une session de formation spécifique
app.get('/sessions/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération de la session');
    } else if (!row) {
      res.status(404).send('Session de formation non trouvée');
    } else {
      res.json(row);
    }
  });
});

// Route pour récupérer la liste des quiz disponibles
app.get('/quizzes', (req, res) => {
  db.all('SELECT * FROM quizzes', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des quiz');
    } else {
      res.json(rows);
    }
  });
});

// Route pour permettre aux utilisateurs de répondre aux questions d'un quiz
app.post('/quizzes/:quizId/answers', (req, res) => {
  const { quizId } = req.params;
  const { userId, answers } = req.body;

  // Vérifier que le userId est présent
  if (!userId) {
    return res.status(400).send('Le userId est requis.');
  }

  // Vérifier que les réponses sont présentes et qu'il y en a au moins une
  if (!answers || answers.length === 0) {
    return res.status(400).send('Veuillez fournir au moins une réponse.');
  }

  // Vérifier que chaque réponse a une questionId et une réponse non vide
  const invalidAnswers = answers.filter(answer => !answer.questionId || !answer.answer);
  if (invalidAnswers.length > 0) {
    return res.status(400).send('Chaque réponse doit avoir une questionId et une réponse non vide.');
  }

  // Effectuer le traitement des réponses du quiz
  // ...
});


// Route pour récupérer les résultats d'un quiz pour un utilisateur
app.get('/quizzes/:quizId/results/:userId', (req, res) => {
  const { quizId, userId } = req.params;

  db.get('SELECT * FROM results WHERE userId = ? AND quizId = ?', [userId, quizId], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des résultats');
    } else if (!row) {
      res.status(404).send('Aucun résultat trouvé');
    } else {
      res.json(row);
    }
  });
});

// Route pour créer une nouvelle session de formation
app.post('/sessions', (req, res) => {
  const { quizId, startTime, endTime } = req.body;
  
  // Vérifie si le quiz existe
  db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quizRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification du quiz');
    } else if (!quizRow) {
      res.status(404).send('Quiz non trouvé');
    } else {
      // Crée une nouvelle session de formation
      db.run('INSERT INTO sessions (quizId, startTime, endTime) VALUES (?, ?, ?)', [quizId, startTime, endTime], (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la création de la session');
        } else {
          res.send('Session de formation créée avec succès');
        }
      });
    }
  });
});

// Route pour récupérer toutes les sessions de formation
app.get('/sessions', (req, res) => {
  db.all('SELECT * FROM sessions', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des sessions');
    } else {
      res.json(rows);
    }
  });
});

// Route pour récupérer les détails d'une session de formation spécifique
app.get('/sessions/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération de la session');
    } else if (!row) {
      res.status(404).send('Session de formation non trouvée');
    } else {
      res.json(row);
    }
  });
});

// Route pour ajouter une question à un quiz existant
app.post('/quizzes/:quizId/questions', (req, res) => {
  const { quizId } = req.params;
  const { text, answers, correctAnswerId, points } = req.body;

  // Vérifie si le quiz existe
  db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quizRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification du quiz');
    } else if (!quizRow) {
      res.status(404).send('Quiz non trouvé');
    } else {
      // Insère la nouvelle question dans la base de données
      db.run(
        'INSERT INTO questions (text, quizId, correctAnswerId, points) VALUES (?, ?, ?, ?)',
        [text, quizId, correctAnswerId, points],
        function (err) {
          if (err) {
            console.error(err);
            res.status(500).send('Erreur lors de l\'ajout de la question');
          } else {
            const questionId = this.lastID;
            // Insère les réponses associées à la question dans la base de données
            const insertAnswers = 'INSERT INTO answers (text, isCorrect, questionId) VALUES (?, ?, ?)';
            const values = answers.map((answer) => [answer.text, answer.isCorrect, questionId]);
            db.run(insertAnswers, values, (err) => {
              if (err) {
                console.error(err);
                res.status(500).send('Erreur lors de l\'ajout des réponses');
              } else {
                res.send('Question ajoutée avec succès');
              }
            });
          }
        }
      );
    }
  });
});

// Route pour créer une nouvelle question
app.post('/questions', (req, res) => {
  const { text, answers } = req.body;

  // Vérifier que le texte de la question n'est pas vide
  if (!text) {
    return res.status(400).send('Le texte de la question est requis.');
  }

  // Vérifier que la question a au moins deux réponses
  if (!answers || answers.length < 2) {
    return res.status(400).send('La question doit avoir au moins deux réponses.');
  }

  // Vérifier qu'au moins une réponse est marquée comme correcte
  const correctAnswers = answers.filter(answer => answer.isCorrect);
  if (correctAnswers.length === 0) {
    return res.status(400).send('La question doit avoir au moins une réponse correcte.');
  }

  // Effectuer le traitement de création d'une nouvelle question
  // ...
});


// Vérifier que le texte de la question n'est pas vide
if (!text) {
  return res.status(400).send('Le texte de la question est requis.');
}

// Vérifier que la question a au moins deux réponses
if (!answers || answers.length < 2) {
  return res.status(400).send('La question doit avoir au moins deux réponses.');
}

// Vérifier qu'au moins une réponse est marquée comme correcte
const correctAnswers = answers.filter(answer => answer.isCorrect);
if (correctAnswers.length === 0) {
  return res.status(400).send('La question doit avoir au moins une réponse correcte.');
}


// Route pour mettre à jour une question existante
app.put('/questions/:id', (req, res) => {
  const { id } = req.params;
  const { text, note } = req.body;

  db.run('UPDATE questions SET text = ?, note = ? WHERE id = ?', [text, note, id], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la mise à jour de la question');
    } else {
      res.send('Question mise à jour avec succès');
    }
  });
});


// Route pour récupérer toutes les questions d'un quiz
app.get('/quizzes/:quizId/questions', (req, res) => {
  const { quizId } = req.params;

  db.all('SELECT * FROM questions WHERE quizId = ?', [quizId], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des questions');
    } else {
      res.json(rows);
    }
  });
});

// Route pour récupérer les détails d'une question spécifique
app.get('/quizzes/:quizId/questions/:questionId', (req, res) => {
  const { quizId, questionId } = req.params;

  db.get('SELECT * FROM questions WHERE quizId = ? AND id = ?', [quizId, questionId], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération de la question');
    } else if (!row) {
      res.status(404).send('Question non trouvée');
    } else {
      // Récupère les réponses associées à la question
      db.all('SELECT * FROM answers WHERE questionId = ?', [questionId], (err, answerRows) => {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la récupération des réponses');
        } else {
          const question = {
            id: row.id,
            text: row.text,
            answers: answerRows
          };
          res.json(question);
        }
      });
    }
  });
});

// Route pour récupérer les détails d'une question spécifique
app.get('/questions/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM questions WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération de la question');
    } else if (!row) {
      res.status(404).send('Question non trouvée');
    } else {
      res.json(row);
    }
  });
});


// Route pour mettre à jour les détails d'une question
app.put('/quizzes/:quizId/questions/:questionId', (req, res) => {
  const { quizId, questionId } = req.params;
  const { text, answers, correctAnswerId, points } = req.body;

  // Vérifie si la question existe
  db.get('SELECT * FROM questions WHERE quizId = ? AND id = ?', [quizId, questionId], (err, questionRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification de la question');
    } else if (!questionRow) {
      res.status(404).send('Question non trouvée');
    } else {
      // Met à jour les détails de la question dans la base de données
      db.run(
        'UPDATE questions SET text = ?, correctAnswerId = ?, points = ? WHERE quizId = ? AND id = ?',
        [text, correctAnswerId, points, quizId, questionId],
        function (err) {
          if (err) {
            console.error(err);
            res.status(500).send('Erreur lors de la mise à jour de la question');
          } else {
            // Supprime les réponses existantes de la question
            db.run('DELETE FROM answers WHERE questionId = ?', [questionId], (err) => {
              if (err) {
                console.error(err);
                res.status(500).send('Erreur lors de la suppression des réponses');
              } else {
                // Insère les nouvelles réponses associées à la question dans la base de données
                const insertAnswers = 'INSERT INTO answers (text, isCorrect, questionId) VALUES (?, ?, ?)';
                const values = answers.map((answer) => [answer.text, answer.isCorrect, questionId]);
                db.run(insertAnswers, values, (err) => {
                  if (err) {
                    console.error(err);
                    res.status(500).send('Erreur lors de l\'ajout des nouvelles réponses');
                  } else {
                    res.send('Question mise à jour avec succès');
                  }
                });
              }
            });
          }
        }
      );
    }
  });
});

// Route pour supprimer une question
app.delete('/quizzes/:quizId/questions/:questionId', (req, res) => {
  const { quizId, questionId } = req.params;

  // Vérifie si la question existe
  db.get('SELECT * FROM questions WHERE quizId = ? AND id = ?', [quizId, questionId], (err, questionRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification de la question');
    } else if (!questionRow) {
      res.status(404).send('Question non trouvée');
    } else {
      // Supprime la question de la base de données
      db.run('DELETE FROM questions WHERE quizId = ? AND id = ?', [quizId, questionId], function (err) {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la suppression de la question');
        } else {
          // Supprime les réponses associées à la question
          db.run('DELETE FROM answers WHERE questionId = ?', [questionId], (err) => {
            if (err) {
              console.error(err);
              res.status(500).send('Erreur lors de la suppression des réponses');
            } else {
              res.send('Question supprimée avec succès');
            }
          });
        }
      });
    }
  });
});

// Route pour créer une nouvelle catégorie
app.post('/categories', (req, res) => {
  const { name } = req.body;

  // Vérifie si la catégorie existe déjà dans la base de données
  db.get('SELECT * FROM categories WHERE name = ?', [name], (err, categoryRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification de la catégorie');
    } else if (categoryRow) {
      res.status(400).send('Cette catégorie existe déjà');
    } else {
      // Insère la nouvelle catégorie dans la base de données
      db.run('INSERT INTO categories (name) VALUES (?)', [name], (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la création de la catégorie');
        } else {
          res.send('Catégorie créée avec succès');
        }
      });
    }
  });
});

// Route pour récupérer toutes les catégories
app.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des catégories');
    } else {
      res.json(rows);
    }
  });
});

// Route pour récupérer une catégorie spécifique
app.get('/categories/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération de la catégorie');
    } else if (!row) {
      res.status(404).send('Catégorie non trouvée');
    } else {
      res.json(row);
    }
  });
});

// Route pour mettre à jour les détails d'une catégorie
app.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  // Vérifie si la catégorie existe
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, categoryRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification de la catégorie');
    } else if (!categoryRow) {
      res.status(404).send('Catégorie non trouvée');
    } else {
      // Met à jour les détails de la catégorie dans la base de données
      db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id], (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la mise à jour de la catégorie');
        } else {
          res.send('Catégorie mise à jour avec succès');
        }
      });
    }
  });
});

// Route pour supprimer une catégorie
app.delete('/categories/:id', (req, res) => {
  const { id } = req.params;

  // Vérifie si la catégorie existe
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, categoryRow) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la vérification de la catégorie');
    } else if (!categoryRow) {
      res.status(404).send('Catégorie non trouvée');
    } else {
      // Supprime la catégorie de la base de données
      db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
        if (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la suppression de la catégorie');
        } else {
          res.send('Catégorie supprimée avec succès');
        }
      });
    }
  });
});

// Route pour soumettre une réponse à une question
app.post('/questions/:id/answers', (req, res) => {
  const { id } = req.params;
  const { userId, answer } = req.body;

  db.run('INSERT INTO userAnswers (userId, questionId, answer) VALUES (?, ?, ?)', [userId, id, answer], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la soumission de la réponse');
    } else {
      res.send('Réponse soumise avec succès');
    }
  });
});

// Route pour récupérer les réponses d'un utilisateur à une question
app.get('/questions/:id/answers/:userId', (req, res) => {
  const { id, userId } = req.params;

  db.get('SELECT * FROM userAnswers WHERE questionId = ? AND userId = ?', [id, userId], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération de la réponse');
    } else if (!row) {
      res.status(404).send('Réponse non trouvée');
    } else {
      res.json(row);
    }
  });
});

app.use(express.static('public'));

// Port d'écoute du serveur
const port = 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
