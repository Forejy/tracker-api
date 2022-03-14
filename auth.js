/* eslint-disable max-len */
const Router = require('express');
const bodyParser = require('body-parser');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');

let { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV !== 'production') {
    JWT_SECRET = 'tempjwtsecretfordevonly';
    console.log('Missing env var JWT_SECRET. Using unsafe dev secret');
  } else {
    console.log('Missing env var JWT_SECRET. Authentication disabled');
  }
}
// En l'absence la variable dans l'env, on utilise une valeur par défaut en developpement. C'est juste pour le developpement donc pas besoin d'une clé safe. En prodution on est plus le seul utilisateur, et c'est évident qu'en prod on doit avoir une clé plus sérieuse.


const routes = new Router();
routes.use(bodyParser.json());

function getUser(req) {
  const token = req.cookies.jwt; // Le token on va le récupérer, il est envoyé à chaque fois par le navigateur
  if (!token) return { signedIn: false };

  try {
    const credentials = jwt.verify(token, JWT_SECRET);
    console.log(credentials);
    return credentials; // Ça récupère ce qu'on a mis dans le 'jwt' du cookie const credentials = { signedIn: true, givenName, name, email }; //? (apres)  pourquoi il le fait pas en front ?
  } catch (error) {
    return { signedIn: false };
  }
}

routes.post('/user', (req, res) => {
  res.send(getUser(req));
});


// ! Le token expédié  par le front
// ! Le token expédié  par le front, et donc qu'on receptionne, est vérifié via l'api de google. Après que l'api de google, `OAuth2Client, ait pu `vérifié le token`, on peut demander le `payload qui contient les infos `utilisateurs. Puis encoder ces informations, et le resultat s'appelle un `jwt*. Et ces infos encodées on les stocke dans un `cookie, et on les renvoit aussi directement à la méthode appelante du front.
// * jwt pour json web tocken

routes.post('/signin', async (req, res) => {
  const googleToken = req.body.google_token;
  if (!googleToken) {
    res.status(400).send({ code: 400, message: 'Missing Token' });
    return; // Y'a quelque chose qui a pas fonctionné comme prévu, on envoit une erreur et on arrete le code.
  }
  const client = new OAuth2Client();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: googleToken }); // On utilise google-auth pour verifier le token
    payload = ticket.getPayload(); // Google auth nous fournit aussi les informations
  } catch (error) {
    res.status(403).send('Invalid credentials');
  }
  const { given_name: givenName, name, email } = payload;
  const credentials = {
    signedIn: true, givenName, name, email,
  };
  const token = jwt.sign(credentials, JWT_SECRET); // Encode the JsonWebToken as string, avec la clé (le secret) pour l'algorithme (et le décode avec la meme clé dans getUser par exemple)
  res.cookie('jwt', token, { httpOnly: true }); // Cookie visible dans l'onglet Storage de la console de dev
  res.json(credentials); // On renvoit les données utilisateurs, apres avoir vérifié le token avec le back parce que c'est une sécurité indispensable
});

routes.post('/signout', async (req, res) => {
  res.clearCookie('jwt'); // J'ai regardé le code source et ca ajoute simplement une date d'expiraion au cookie (et donc c'est sur c'est fait par le browser à reception de la réponse)
  res.status(200).end();
});

function mustBeSignedIn(resolver) {
  return (root, args, { user }) => {
    if (!user || !user.signedIn) {
      throw new AuthenticationError('You must be signed in');
    }
    return resolver(root, args, { user });
  };
}

module.exports = { routes, getUser, mustBeSignedIn };

// On verifie le token avec le client google, token que j'envoie depuis mon front
