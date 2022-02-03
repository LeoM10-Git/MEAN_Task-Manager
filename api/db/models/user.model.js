const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');


// JWT secret
const jwtSecret = "24310640310972547472kiaskdwi8464806030"

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        minLength: 1, 
        trim: true, 
        unique: true},
    password: { 
        type: String, 
        required: true, 
        minLength: 8, 
    },
    sessions:[{
    _id: false,
    refreshToken: {
        type: String, 
        required: true,
    },
    expiresAt:{ 
        type: Number,
        required: true,
    }
    }]
});

/* Instance methods */
UserSchema.methods.toJSON = function(){
    const user = this;
    const userObject = user.toObject();

    // return the document except the password and session (these shouldn't be made available)
    return _.omit(userObject, ['password', 'sessions']);
}

UserSchema.methods.createSession = function(){
    let user = this;
    return user.generateRefreshAuthToken().then((refreshToken) =>{
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken) => {
        return refreshToken;
    }).catch((err) => { 
        return Promise.reject('Failed to save session to database.\n' + err);
    })
}

UserSchema.methods.generateAccessAuthToken = function(){ 
    const user = this;
    return new Promise((resolve, reject) => {
        // create the JSON web Token and return
        jwt.sign({_id: user._id.toHexString()},jwtSecret, {expiresIn: "15m"}, 
        (err, token) => {
            if (!err) { 
                resolve(token);
            }else {
                reject();
            }
        })
    })
}

UserSchema.methods.generateRefreshAuthToken = function(){   
    // this method generate a 64bytes hex string - 
    // it doesn't save it to the database, saveSessionToDatabase() does that
    return new Promise((resolve, reject) =>{ 
        crypto.randomBytes(64, (error, buffer) =>{
            if (!error) {
                let token = buffer.toString('hex');
                return resolve(token);
            }
        })
    })
}



/* MODEL METHOD (static methods) */

UserSchema.statics.getJwtSecret = () => {
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function(_id, token){
    // finds user by id and token
    // used in auth middleware (verifySession)
    const user = this;
    // @ts-ignore
    return user.findOne({ 
        _id, 
        'sessions.refreshToken': token
    })
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000; 
    if (expiresAt > secondsSinceEpoch) { 
        // hasn't expired
        return false;
    }
    else return true; // expired
}

UserSchema.statics.findByCredentials = function(email, password){
    let user = this;
    // @ts-ignore
    return user.findOne({ email }).then((user) => { 
        if (!user) return Promise.reject("User not found");

        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) resolve(user);
                else{
                    reject("Wrong password");
                }
            })
        })
    })
}


/* MIDDLEWARE */
// Before a user document is saved, this code runs 

UserSchema.pre('save', function(next){
    let user = this;
    let constFactor = 10; // number of hashing rounds, how long to hash

    if (user.isModified('password')){ 
        //if the password has already been edited then run this code
        // generate salt and hash password
        bcrypt.genSalt(constFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => { 
                user.password = hash;
                next();
            })
        })
    }
})



/* HELPER METHOD */
let saveSessionToDatabase = (user, refreshToken) =>{ 
    // save session to database
    return new Promise((resolve, reject) =>{
        let expiresAt = generateRefreshTokenExpireTime();
        user.sessions.push({'refreshToken': refreshToken, expiresAt});

        // keep two refreshToken in database, after every login
        if (user.sessions.length >= 5){ 
            user.sessions.shift();
        }

        user.updateOne({sessions: user.sessions}, function(err, res){
            if (err){
                console.log(err)
            }else console.log('Session saved');
        }).clone().then(() =>{ 
            return resolve(refreshToken);
        }).catch((err) => { 
            reject(err);
        });
    })
}

let generateRefreshTokenExpireTime = () =>{
    let dayUntilExpire = 10; // 10 days
    let secondsUtilExpire = ((dayUntilExpire *24 ) * 60) *60;
    return ((Date.now() / 1000) + secondsUtilExpire);
}



const User = mongoose.model('User', UserSchema);

module.exports = { User }
