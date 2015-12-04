var express = require("express");
var bcrypt = require("bcrypt-nodejs");
var bodyParser = require("body-parser");
var app = express();
var port = process.env.PORT;
var Sequelize = require("sequelize");
var sequelize = new Sequelize('addressbook', 'codus', null, {
    dialect: 'mysql'
});

app.use(bodyParser.json());

var Account = sequelize.define('Account', {
    email: Sequelize.STRING,
    password: Sequelize.STRING,
}, {
    tableName: 'Account'
});

var Token = sequelize.define('Tokens', {
    token: Sequelize.STRING,
    accountId: Sequelize.STRING
}, {
    tableName: 'Tokens'
});

var AddressBook = sequelize.define('AddressBook', {
    name: Sequelize.STRING
}, {
    tableName: 'AddressBook'
});
Account.hasMany(AddressBook, {
    foreignKey: 'accountId'
});

AddressBook.belongsTo(Account, {
    foreignKey: 'accountId'
});

var Entry = sequelize.define('Entry', {
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING,
    birthday: Sequelize.DATE
}, {
    tableName: 'Entry'
});
AddressBook.hasMany(Entry, {
    foreignKey: 'addressbookId'
});

Entry.belongsTo(AddressBook, {
    foreignKey: 'addressbookId'
});

var Address = sequelize.define('Address', {
    type: Sequelize.STRING,
    line1: Sequelize.STRING,
    line2: Sequelize.STRING,
    city: Sequelize.STRING,
    state: Sequelize.STRING,
    zip: Sequelize.STRING,
    country: Sequelize.STRING,
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE
}, {
    tableName: 'Address'
});

Entry.hasMany(Address, {
    foreignKey: 'entryId'
});
Address.belongsTo(Entry, {
    foreignKey: 'entryId'
});

var Email = sequelize.define('Email', {
    type: Sequelize.STRING,
    address: Sequelize.STRING
}, {
    tableName: 'Email'
});

Entry.hasMany(Email, {
    foreignKey: 'entryId'
});

Email.belongsTo(Entry, {
    foreignKey: 'entryId'
});

var Phone = sequelize.define('Phone', {
    type: Sequelize.STRING,
    subype: Sequelize.STRING,
    phoneNumber: Sequelize.INTEGER
}, {
    tableName: 'Phone'
});

Entry.hasMany(Phone, {
    foreignKey: 'entryId'
});

Phone.belongsTo(Entry, {
    foreignKey: 'entryId'
});


app.use(function(req, res, next){
    Token.findOne({
        where: {
            token: req.query.token
        }
    }).then(function(result) {
        if(result){
            req.accountId = result.accountId;
            console.log("Account id was set to " + req.accountId);
        } else {
            req.accountId = null;
            res.status(404).send("Account not found");
        }
        next();
    });
});


app.get('/AddressBooks', function(req, res) {
    AddressBook.findAll({
        where: {
            accountId: req.accountId,
        }
    }).then(function(result) {
        res.json(result);
    }, function(err) {
        res.status(404).send(err);
    }).catch(function(err) {
        console.log(err);
    });
});

app.get('/AddressBooks/:id', function(req, res) {
    AddressBook.findAll({
        where: {
            id: req.params.id,
            accountId: req.accountId
        }
    }).then(function(result) {
        res.json(result);
    }, function(err) {
        res.status(404).send(err);
    });
});

app.post("/AddressBooks", function(req, res) {
    if (req.body.name) {
        if (req.accountId) {
            AddressBook.findOrCreate({
                where: {
                    name: req.body.name,
                    accountId: req.accountId
                }
            }).then(function(result) {
                return AddressBook.findOne({
                    where: {
                        id: result[0].id
                    },
                    attributes: {
                        exclude: ['createdAt', 'updatedAt', 'accountId']
                    }
                });
            }).then(function(result) {
                res.json(result);
            });
        }
    }
});

app.delete('/AddressBooks/:id', function(req, res) {
    if (req.accountId) {
        AddressBook.findAll({
            where: {
                accountId: req.accountId,
                id: req.params.id
            }
        }).then(function() {
            return AddressBook.destroy({
                where: {
                    id: req.params.id
                }
            });
        }).then(function() {
            res.send("AddressBook Deleted!");
        });
    }
    else {
        res.status(404).send("AddressBook not found!");
    }
});

app.put('/AddressBooks/:id', function(req, res) {
    AddressBook.update({
        name: req.body.name
    }, {
        where: {
            id: req.params.id,
            accountId: req.accountId
        }
    }).then(function() {
        AddressBook.findAll({
            where: {
                id: req.params.id,
                accountId: req.accountId
            }
        }).then(function(result) {
            res.json(result);
        });
    });
});

app.get('/Entries', function(req, res) {
    Entry.findAll({
        include: [{
            model: AddressBook,
            include: [{
                model: Account,
                where: {
                    id: req.accountId
                }
            }]
        }],
    }).then(function(result) {
        res.json(result);
    }, function(err) {
        res.status(404).send(err);
    }).catch(function(err) {
        console.log(err);
    });

});


app.post('/Entries/:addressbookId', function(req, res) {
    AddressBook.findOne({where: {accountId: req.accountId, id: req.params.addressbookId}})
    .then(function(result) {
        if(result){
            return Entry.create({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                birthday: req.body.birthday,
                addressbookId: req.params.addressbookId
            });
        } else {
            res.status(404).send("AddressBook not found!");
        }
    }).then(function(result) {
        res.json(result);
    });
});


app.delete('/Entries/:id', function(req, res) {
    Entry.findOne({
        include: [{model: AddressBook, where: {accountId: req.accountId}}],
        where: {id: req.params.id}
    }).then(function(result) {
        if(result){
            return Entry.destroy({
                where: {
                    id: req.params.id
                }
            });
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(confirmation) {
        res.send("Entry deleted!");
    });
});


app.put('/Entries/:id', function(req, res) {
   Entry.findOne({
       include: [{model: AddressBook, where: {accountId: req.accountId}}],
       where: {id: req.params.id}
   }).then(function(result) {
       if(result){
           return Entry.update(req.body, {where: {id: req.params.id}});
       } else {
           res.status(404).send("Entry not found!");
       }
   }).then(function(confirm) {
       return Entry.findOne({
           where: {
               id: req.params.id
           }
       });
   }).then(function(result){
       res.json(result);
   });
});


app.get('/addresses/:id', function(req, res) {
    Address.findOne({
        include: [{
            model: Entry,
            include: [{
                model: AddressBook,
                include: [{
                    model: Account,
                    where: {
                        id: req.accountId
                    },
                    attributes: {
                        exclude: ['id']
                    }
                }]
            }]
        }],
        where: {
            id: req.params.id
        },
        attributes: {
            exclude: ['Entry']
        }
    }).then(function(result) {
        var plainObject = result.get({
            plain: true
        });
        delete plainObject.Entry;
        res.json(plainObject);
    });
});


app.get('/phones/:id', function(req, res) {
    Phone.findOne({
        include: [{
            model: Entry,
            include: [{
                model: AddressBook,
                include: [{
                    model: Account,
                    where: {
                        id: req.accountId
                    }
                }]
            }]
        }],
        where: {
            id: req.params.id
        }
    }).then(function(result) {
        var plainObject = result.get({
            plain: true
        });
        delete plainObject.Entr;
        res.json(plainObject);
    });
});

app.get('/emails/:id', function(req, res) {
    Email.findOne({
        include: [{
            model: Entry,
            include: [{
                model: AddressBook,
                include: [{
                    model: Account,
                    where: {
                        id: req.accountId
                    }
                }]
            }]
        }],
        where: {
            id: req.params.id
        }
    }).then(function(result) {
        var plainObject = result.get({
            planin: true
        });
        delete plainObject.Entry;
        res.json(plainObject);
    });
});

app.post('/addresses', function(req, res) {
    Entry.findOne({
        include: [{model: AddressBook, where: {accountId: req.accountId}}],
        where: {id: req.body.entryId}
    }).then(function(result) {
        console.log(result);
        if(result){
            return Address.create(req.body, {where: {entryId: req.body.entryId}});
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(result) {
        res.json(result);
    });
});

app.post('/phones', function(req, res) {
    Entry.findOne({
        include: [{model: AddressBook, where: {accountId: req.accountId}}],
        where: {id: req.body.entryId}
    }).then(function(result) {
        console.log(result);
        if(result){
            return Phone.create(req.body, {where: {entryId: req.body.entryId}});
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(result) {
        res.json(result);
    });
});

app.post('/emails', function(req, res) {
    Entry.findOne({
        include: [{model: AddressBook, where: {accountId: req.accountId}}],
        where: {id: req.body.entryId}
    }).then(function(result) {
        console.log(result);
        if(result){
            return Email.create(req.body, {where: {entryId: req.body.entryId}});
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(result) {
        res.json(result);
    });
});

app.delete('/addresses/:id', function(req, res) {
   Entry.findOne({include: [{model: AddressBook, where: {accountId: req.accountId}}], where: {id: req.body.entryId}}).then(function(result) {
       if(result){
           return Address.destroy({
               where: {
                   id: req.params.id
               }
           });
       } else {
           res.status(404).send("Entry not found!");
       }
   }).then(function(consfirm){
       res.send("Address deleted!");
   });
});

app.delete('/phones/:id', function(req, res) {
    Entry.findOne({include: [{model: AddressBook, where: {accountId: req.accountId}}], where: {id: req.body.entryId}}).then(function(result) {
       if(result){
           return Phone.destroy({
               where: {
                   id: req.params.id
               }
           });
       } else {
           res.status(404).send("Entry not found!");
       }
   }).then(function(consfirm){
       res.send("Phone number deleted!");
   });
});


app.delete('/emails/:id', function(req, res) {
   Entry.findOne({include: [{model: AddressBook, where: {accountId: req.accountId}}], where: {id: req.body.entryId}}).then(function(result) {
       if(result){
           return Email.destroy({
               where: {
                   id: req.params.id
               }
           });
       } else {
           res.status(404).send("Entry not found!");
       }
   }).then(function(consfirm){
       res.send("Email deleted!");
   });
});

app.put('/addresses/:id', function(req, res) {
    Entry.findOne({include: [{model: AddressBook, where: {accountId: req.accountId}}],where: {id: req.body.entryId}}).then(function(result) {
        if(result){
            return Address.update(req.body, {where: {id: req.params.id}});
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(result) {
       return Address.findById(req.params.id);
    }).then(function(result) {
        res.json(result);
    });
});


app.put('/phones/:id', function(req, res) {
    Entry.findOne({include: [{model: AddressBook, where: {accountId: req.accountId}}],where: {id: req.body.entryId}}).then(function(result) {
        if(result){
            return Phone.update(req.body, {where: {id: req.params.id}});
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(result) {
       return Phone.findById(req.params.id);
    }).then(function(result) {
        res.json(result);
    });
});

app.put('/emails/:addressbookId/:entryId/:id', function(req, res) {
    Entry.findOne({include: [{model: AddressBook, where: {accountId: req.accountId}}],where: {id: req.body.entryId}}).then(function(result) {
        if(result){
            return Email.update(req.body, {where: {id: req.params.id}});
        } else {
            res.status(404).send("Entry not found!");
        }
    }).then(function(result) {
       return Email.findById(req.params.id);
    }).then(function(result) {
        res.json(result);
    });
});

app.post('/Accounts/signup', function(req, res) {

    var hashedPassword = bcrypt.hashSync(req.body.password);
    Account.create({
        email: req.body.email,
        password: hashedPassword
    }).then(function(result) {
        return Account.findOne({
            where: {
                id: result.id
            },
            attributes: {
                exclude: ['password', 'createdAt', 'updatedAt']
            }
        });
    }, function(err) {
        res.send("Email address exists!");
    }).then(function(result) {
        res.json(result);
    });

});


//User logs in, get token, passes this token to further requests

app.post('/Accounts/login', function(req, res) {
    var newToken = bcrypt.genSaltSync(10);
    Account.findOne({
        where: {
            email: req.body.email
        },
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        }
    }).then(function(result) {
        
        if(result){
        var account = result.get({
            plain: true
        });
        var verify = bcrypt.compareSync(req.body.password, account.password);
        if (verify === true) {
            Token.create({
                token: newToken,
                accountId: account.id
            }).catch(function(err){
                console.log(err);
            });
            
            var simpleObject = result.get({
                plain: true
            });
            delete simpleObject.password;
            simpleObject.token = newToken;
            res.json(simpleObject );

        }
        else {
            res.status(400).send("Passwords do not match!");
        }
        } else {
            res.status(404).send("Email address not found!");
        }
    });
});





app.listen(port, function() {
    console.log('SKYNET IS ONLINE. LISTENING ON PORT ' + port + '.\nGLOBAL MONITORING WILL COMMENCE ON ' + new Date((new Date()).getTime() + (10 * 86400000)));
});



// var hash = bcrypt.hashSync("bacon");

// console.log(bcrypt.compareSync("bacon", hash)); // true
// console.log(bcrypt.compareSync("veggies", hash)); // false