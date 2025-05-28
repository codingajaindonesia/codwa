const express = require('express');
const path = require('path');
const app = express();
const engine = require('ejs-locals');
const session = require('express-session');

const expressLayouts = require('express-ejs-layouts');

const fileUpload = require('express-fileupload');
app.use(fileUpload());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'gaksa213-gapos',
  resave: false,
  saveUninitialized: true
}));

app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
  next();
});
app.use('/', require('./src/routes/web'));
app.use('/api', require('./src/routes/api'));

app.engine('ejs', engine);

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'src/views'));
// Set layout default
app.set('layout', 'layouts/app.layout');

app.listen(8000, () => {
  console.log('Server running at http://localhost:8000');
});
