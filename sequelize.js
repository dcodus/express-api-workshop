var express = require("express");
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
})

var AddressBook = sequelize.define('AddressBook', {
    name: Sequelize.STRING
}, {
    tableName: 'AddressBook'
})

Account.hasMany(AddressBook, {
    foreignKey: 'accountId'
});

var Entry = sequelize.define('Entry', {
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING,
    birthday: Sequelize.DATE
}, {
    tableName: 'Entry'
})

AddressBook.hasMany(Entry, {
    foreignKey: 'addressbookId'
});

app.use(function(req, res, next) {
    req.accountId = 1;
    next();
})


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
    })
})

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
    })
})

app.post("/AddressBooks", function(req, res) {
    if (req.body.name) {
        if (req.accountId) {
            AddressBook.findOrCreate({
                where: {
                    name: req.body.name,
                    accountId: req.accountId
                }
            }).spread(function(addressbook, created) {
                //This will return the addressbook that was created as an object
                console.log(addressbook.get({
                    plain: true
                }));
                console.log(created);
                res.json(addressbook.get({
                    plain: true
                }));
            })
        }
    }
})



app.delete('/AddressBooks/:id', function(req, res){
    if(req.accountId){
        AddressBook.findAll({
            where: {
                accountId: req.accountId,
                id: req.params.id
            }
        }).then(function(){
            return AddressBook.destroy({
                where : {
                    id: req.params.id
                }
            })
        }).then(function(){
            res.send("AddressBook Deleted!")
        })
    } else {
        res.status(404).send("AddressBook not found!");
    }
})

app.put('/AddressBooks/:id', function(req,res){
    AddressBook.update(
        {name: req.body.name},
        {where: {
            id: req.params.id,
            accountId: req.accountId
        }}
    ).then(function(){
        AddressBook.findAll({
            where: {
                id: req.params.id,
                accountId: req.accountId
            }
        }).then(function(result){
            res.json(result);
        })
    })
})









app.listen(port, function() {
    console.log('SKYNET IS ONLINE. LISTENING ON PORT ' + port + '.\nGLOBAL MONITORING WILL COMMENCE ON ' + new Date())
})
