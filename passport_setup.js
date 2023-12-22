const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const models = require('./models');

function Passports(passport) {
  passport.serializeUser((account, done) => {
    done(null, account.id);
  });

  passport.deserializeUser((id, done) => {
    models.account.findOne({
      where: {
        id,
        deleteFl: false,
      },
    }).then((account) => {
      if (account == null) done(new Error('Wrong account id'));

      done(null, account);
    });
  });

  function validPassword(account, password) {
    return bcrypt.compareSync(password, account.password);
  }

  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  }, (req, email, password, done) => models.account
    .findOne({
      where: {
        email,
        deleteFl: false,
      },
    }).then((account) => {
      if (account == null) {
        req.flash('message', 'Incorrect Credentials');
        return done(null, false);
      } if (account.password == null || account.password === undefined) {
        req.flash('message', 'You must reset your password');
        return done(null, false);
      } if (!validPassword(account, password)) {
        req.flash('message', 'Incorrect credentials');
        return done(null, false);
      }

      return done(null, account);
    }).catch((err) => {
      done(err, false);
    })));
}

module.exports = Passports;
