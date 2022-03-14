/* eslint-disable max-len */
/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { installHandler } = require('./api_handler');
const { connectToDb } = require('./db');
const auth = require('./auth');

const port = process.env.API_SERVER_PORT || 3000;

const app = express();
app.use(cookieParser()); // Parse the Cookie header on the request and expose (pas besoin d'aller le chercher (comme une vitrine)) the cookie data as the property req.cookies
app.use('/auth', auth.routes);
installHandler(app);

(async function start() {
  try {
    await connectToDb();
    app.listen(port, () => {
      console.log(`API server started on port ${port}`);
    });
  } catch (err) {
    console.log('ERROR:', err);
  }
}());
