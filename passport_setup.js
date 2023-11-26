let LocalStrategy = require('passport-local').Strategy;
let bcrypt = require('bcrypt');
let models = require('./models');

module.exports= function(passport)
{
    passport.serializeUser((account, done)=>{
        done(null,account.id);
    });

    passport.deserializeUser((id,done) =>{
        models.account.findOne({
            where:{
                id: id,
                deleteFl: false
            }
        }).then(account=>{
            if(account== null)
                done( new Error('Wrong account id'));

            done(null,account);
            
        });
    });

    passport.use(new LocalStrategy({
        usernameField:'email',
        passwordField:'password',
        passReqToCallback: true
    }, (req,email,password,done)=>{
        return models.account
        .findOne({
            where: {
                email: email,
                deleteFl: false
            }
        }).then(account=>{

            if(account == null )
            {
                req.flash('message', 'Incorrect Credentials');
                return done(null,false);
            }
            else if( account.password == null || account.password == undefined)
            {
                req.flash('message', 'You must reset your password');
                return done(null, false);
            }
            else if(!validPassword(account, password))
            {
                req.flash('message', 'Incorrect credentials');
                return done(null,false);
            }

            return done(null,account);
        }).catch(err=>{
            done(err,false);
        });
    }));

    const validPassword = function(account, password)
    {
        return bcrypt.compareSync(password, account.password);
    }
}