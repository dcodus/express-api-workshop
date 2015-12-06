var express = require("express");
var bcrypt = require("bcrypt-nodejs");
var bodyParser = require("body-parser");
var app = express();
var port = process.env.PORT;
var Sequelize = require("sequelize");
var sequelize = new Sequelize('AddressBook', 'codus', null, {
    dialect: 'mysql'
});

app.use(bodyParser.json());

var Account = sequelize.define('Account', {
    email: {
        type: Sequelize.STRING,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: Sequelize.STRING
    }
});



var AddressBook = sequelize.define('AddressBook', {
    name: {
        type: Sequelize.STRING,
    }
});


var Entry = sequelize.define('Entry', {
    firstName: {
        type: Sequelize.STRING
    },
    lastName: {
        type: Sequelize.STRING
    },
    birthday: {
        type: Sequelize.DATEONLY,
        validate: {
            isDate: true
        }
    }
});


var Address = sequelize.define('Address', {
    type: {
        type: Sequelize.ENUM('home', 'work', 'other')
    },
    line_1: {
        type: Sequelize.STRING
    },
    line_2: {
        type: Sequelize.STRING
    },
    city: {
        type: Sequelize.STRING
    },
    state: {
        type: Sequelize.STRING
    },
    zip: {
        type: Sequelize.STRING
    },
    country: {
        type: Sequelize.STRING
    }
});

var Email = sequelize.define('Email', {
    type: {
        type: Sequelize.ENUM('work', 'home', 'other')
    },
    address: {
        type: Sequelize.STRING,
        validate: {
            isEmail: true
        }
    }
});

var Phone = sequelize.define('Phone', {
    type: {
        type: Sequelize.ENUM('work', 'home', 'other')
    },
    subtype: {
        type: Sequelize.ENUM('landline', 'mobile', 'fax')
    },
    phoneNumber: {
        type: Sequelize.INTEGER,
        validate: {
            isNumeric: true
        }
    }
});

var Token = sequelize.define('Token', {
    token: {
        type: Sequelize.STRING
    }
});



//TABLE CREATION AND UPDATING
//THE ORDER OF EXECUTION IS IMPORTANT

//We create the Account table first and specify that Accounts will have many AddressBooks

//FOR THIS API ALL DATA WILL BE RETURNED IN JSON
//IF A QUERY IS MADE FOR AN ELEMENT THEN ALL ITS PARENT ELEMENTS WILL ASLO BE RETURNED
//THE METHOD OF DELETING KEYS FROM RESULT OBJECTS CREATES CONFLICTS IN SOME CIRCUMSTANCES

Account.sync();
Account.hasMany(AddressBook);
Account.hasMany(Token);

Token.sync();
Token.belongsTo(Account);


AddressBook.sync();
AddressBook.belongsTo(Account);
AddressBook.hasMany(Entry);

Entry.sync();
Entry.belongsTo(AddressBook);

Entry.hasMany(Address);
Address.sync();
Address.belongsTo(Entry);

Entry.hasMany(Phone);
Phone.sync();
Phone.belongsTo(Entry);

Entry.hasMany(Email);
Email.sync();
Email.belongsTo(Entry);

//MIDDLEWARE
var middleware = {
    logger: function(req, res, next) {
        console.log("Request: " + req.method + ' ' + req.originalUrl);
    },
    authentication: function(req, res, next) {
        Token.findOne({
            where: {
                token: req.query.token
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt', 'id']
            }
        }).then(function(token) {
            if (token) {
                req.accountId = token.AccountId;
                next();
            }
            else {
                req.accountId = null;
                res.json('Account not found!');
            }
        }).catch(function(err) {
            res.json(err);
        });
    }
};


//SIGNUP
app.post('/accounts/signup', function(req, res) {
    var hashedPassword = bcrypt.hashSync(req.body.password);
    Account.create({
        email: req.body.email,
        password: hashedPassword
    }).then(function(result) {
        if (result) {
            var plainDisplay = result.get({
                plain: true
            });
            res.json(plainDisplay);
        }
    }).catch(function(err) {
        res.json(err);
    });
});
//LOGIN
app.post('/accounts/login', function(req, res) {
    var newToken = bcrypt.genSaltSync();
    Account.findOne({
        where: {
            email: req.body.email
        },
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        }
    }).then(function(account) {
        console.log(account);
        if (account) {
            var verify = bcrypt.compareSync(req.body.password, account.password);
            if (verify) {
                return Token.create({
                    token: newToken,
                    AccountId: account.id
                });
            }
            else {
                res.json("Wrong password!");
            }
        }
        else {
            res.json("Account not found!");
        }
    }).then(function(token) {
        var plainToken = token.get({
            plain: true
        });
        res.json(plainToken);
    }).catch(function(err) {
        console.log(err);
    });
});
//CREATE ADDRESSBOOK
app.post('/addressbooks', middleware.authentication, function(req, res) {
    if (req.accountId) {
        AddressBook.create({
            name: req.body.name,
            AccountId: req.accountId
        }).then(function(result) {
            var plainBook = result.get({
                plain: true
            });
            res.json([plainBook, 'Address Book created successfully!']);
        }).catch(function(err) {
            res.json(err);
        });
    }
    else {
        res.json("Please login!");
    }
});
//RETRIEVE ADDRESSBOOKS
//TO FIND BY NAME PLACE A JSON OBJECT IN THE QUERY LINE EX: {"NAME":"FRIENDS"} THIS WILL FILTER BY THE NAME
app.get('/addressbooks', middleware.authentication, function(req, res) {
    if (req.accountId) {
        //searchTerms will be the object passed to our search. If a filter is provided that will be included if not then the default terms will pass.
        var searchTerms;
        if (req.query.filter) {
            var parsed = JSON.parse(req.query.filter);
            searchTerms = {
                    where: {
                        AccountId: req.accountId
                    },
                    limit: req.query.limit,
                    offset: req.query.offset,
                    order: req.query.order,
                };
                //Looped over the keys and values
                //Added them to the where object
            Object.keys(parsed).forEach(function(key) {
                searchTerms.where[key] = parsed[key];
            });
        }
        else {
            searchTerms = {
                where: {
                    AccountId: req.accountId
                },
                limit: req.query.limit,
                offset: req.query.offset,
                order: req.query.order
            };
        }
        AddressBook.findAll(searchTerms).then(function(books) {
            if (books.length > 0) {
                res.json(books);
            }
            else {
                res.json("No address books found!");
            }
        }).catch(function(err) {
            res.json(err);
        });
    }
});
//GET ADDRESSBOOK BY ID
app.get('/addressbooks/:id', middleware.authentication, function(req, res) {
        if (req.accountId) {
            AddressBook.findOne({
                where: {
                    AccountId: req.accountId,
                    id: req.params.id
                }
            }).then(function(book) {
                if (book) {
                    res.json(book);
                }
                else {
                    res.send("Address Book not found!");
                }
            })
        }
        else {
            res.status(404).send("Please login!")
        }
    })
    //PROVIDE THE ID OF THE ADDRESSBOOK TO BE EDITED
app.put('/addressbooks/:id', middleware.authentication, function(req, res) {
    //NOTICE when we update any entry we want to make sure that only certain fields are updated. For this reason a restriction was placed on everything except for name.
    AddressBook.update(req.body, {
        where: {
            id: req.params.id
        }
    }, {
        fields: ['name']
    }).then(function() {
        return AddressBook.findOne({
            where: {
                id: req.params.id
            }
        });
    }).then(function(result) {
        if (result) {
            res.json([result, "Address Book updated successfully"]);
        }
        else {
            res.json("Address Book not found!");
        }
    }).catch(function(err) {
        console.log(err);
    });
});
//PROVIDE THE ID OF THE ADDRESSBOOK TO BE DELETED
app.delete('/addressbooks/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        AddressBook.destroy({
            where: {
                id: req.params.id,
                AccountId: req.accountId
            }
        }).then(function(result) {
            if (result) {
                res.json("Address Book deleted!");
            }
            else {
                res.json("Address Book not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//CREATE ENTRY. PROVIDE ADDRESSBOOK ID WHERE TO CREATE THE ENTRY.
app.post('/entries/:addressbookId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        AddressBook.findOne({
            where: {
                AccountId: req.accountId,
                id: req.params.addressbookId
            }
        }).then(function(book) {
            if (book) {
                return Entry.create(req.body);
            }
            else {
                res.status(404).send("Address Book not found!");
            }
        }).then(function(entry) {
            var plainEntry = entry.get({
                plain: true
            });
            res.json(plainEntry);
            return Entry.update({
                AddressBookId: req.params.addressbookId
            }, {
                where: {
                    id: entry.id
                }
            });
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//RETURN ALL ENTRIES THAT BELONG TO ONE ACCOUNT
app.get('/entries', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findAll({
            include: [{
                model: AddressBook,
                where: {
                    AccountId: req.accountId
                },
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            }],
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            limit: req.query.limit,
            offset: req.query.offset
        }).then(function(entries) {
            if (entries) {
                res.json(entries);
            }
            else {
                res.send("No entries found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//RETURN ALL ENTRIES BELONGING TO ONE SPECIFIC ADDRESSBOOK
app.get('/entries/:addressbookId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findAll({
            where: {
                AddressBookId: req.params.addressbookId
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            limit: req.query.limit,
            offset: req.query.offset
        }).then(function(entries) {
            if (entries.length > 0) {
                res.json(entries);
            }
            else {
                res.send("No entries found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//DELETE AN ENTRY BASED ON ID, IF IT MATCHES THE CURRENT ACCOUNT
app.delete('/entries/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findOne({
            include: [{
                model: AddressBook,
                where: {
                    AccountId: req.accountId
                }
            }],
            where: {
                id: req.params.id
            }
        }).then(function(entry) {
            if (entry) {
                Entry.destroy({
                    where: {
                        id: req.params.id
                    }
                });
                res.send("Entry deleted!");
            }
            else {
                res.send("No entry found matching your account!");
            }
        });
    }
    else {
        res.status(404).send("Please login");
    }
});
//EDIT AN ENTRY BASED ON ID, IF IT MATCHES THE CURRENT ACCOUNT
app.put('/entries/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findOne({
            include: [{
                model: AddressBook,
                where: {
                    AccountId: req.accountId
                }
            }],
            where: {
                id: req.params.id
            }
        }).then(function(entry) {
            if (entry) {
                return Entry.update(req.body, {
                    fields: ['firstName', 'lastName', 'birthday'],
                    where: {
                        id: req.params.id
                    }
                });
            }
            else {
                res.send("Entry matching your account not found!");
            }
        }).then(function(entry) {
            res.json("Entry updated!");
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//CREATE NEW ADDRESS
//THE ENTRYID IS ADDED AFTER THE CREATION OF ADDRESS
app.post('/addresses/:entryId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findOne({
            include: [{
                model: AddressBook,
                where: {
                    AccountId: req.accountId
                }
            }],
            where: {
                id: req.params.entryId
            }
        }).then(function(entry) {
            if (entry) {
                return Address.create(req.body);
            }
            else {
                res.status(404).send("Entry not found");
            }
        }).then(function(newAddress) {
            res.json(newAddress);
            var plainAddress = newAddress.get({
                plain: true
            });
            return Address.update({
                EntryId: req.params.entryId
            }, {
                where: {
                    id: plainAddress.id
                }
            });
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//FIND ALL ADDRESSES MATCHING A CERTAIN ENTRY
app.get('/addresses/:entryId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Address.findAll({
            include: [{
                model: Entry,
                where: {
                    id: req.params.entryId
                },
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                EntryId: req.params.entryId
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            limit: req.query.limit,
            offset: req.query.offset
        }).then(function(addresses) {
            if (addresses.length > 0) {
                res.json(addresses);
            }
            else {
                res.send("No addresses found matching the provided entry.");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//FIND ONE SPECIFIC ADDRESS
app.get('/addresses/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Address.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(address) {
            if (address) {
                res.json(address);
            }
            else {
                res.send("No address found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//DELETE ADDRESS BASED ON ID. ADDRESS MUST BELONG TO CURRENT ACCOUNT
app.delete('/addresses/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Address.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(address) {
            if (address) {
                Address.destroy({
                    where: {
                        id: req.params.id
                    }
                });
                res.send("Address deleted!");
            }
            else {
                res.send("Address not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//UPDATE ADDRESS BASED ON ID
app.put('/addresses/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Address.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(address) {
            if (address) {
                res.send("Address updated!");
                return Address.update(req.body, {
                    where: {
                        id: req.params.id
                    }
                });
            }
            else {
                res.send("Address not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Plase signin!");
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//CREATE NEW EMAIL BASED ON ENTRY ID
app.post('/emails/:entryId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findOne({
            include: [{
                model: AddressBook,
                where: {
                    AccountId: req.accountId
                }
            }],
            where: {
                id: req.params.entryId
            }
        }).then(function(entry) {
            if (entry) {
                return Email.create(req.body);
            }
            else {
                res.status(404).send("Entry not found");
            }
        }).then(function(newEmail) {
            res.json(newEmail);
            var plainEmail = newEmail.get({
                plain: true
            });
            return Email.update({
                EntryId: req.params.entryId
            }, {
                where: {
                    id: plainEmail.id
                }
            });
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//FIND ALL EMAILS MATCHING A CERTAIN ENTRY
app.get('/emails/:entryId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Email.findAll({
            include: [{
                model: Entry,
                where: {
                    id: req.params.entryId
                },
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                EntryId: req.params.entryId
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            limit: req.query.limit,
            offset: req.query.offset
        }).then(function(emails) {
            if (emails.length > 0) {
                res.json(emails);
            }
            else {
                res.send("No emails found matching the provided entry.");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//FIND ONE SPECIFIC EMAIL
app.get('/emails/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Email.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(emails) {
            if (emails) {
                res.json(emails);
            }
            else {
                res.send("No email found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//DELETE EMAILS BASED ON ID. EMAIL MUST BELONG TO CURRENT ACCOUNT
app.delete('/emails/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Email.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(emails) {
            if (emails) {
                Email.destroy({
                    where: {
                        id: req.params.id
                    }
                });
                res.send("Email deleted!");
            }
            else {
                res.send("Email not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//UPDATE EMAIL BASED ON ID
app.put('/emails/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Email.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(emails) {
            if (emails) {
                res.send("Email updated!");
                return Email.update(req.body, {
                    where: {
                        id: req.params.id
                    }
                });
            }
            else {
                res.send("Email not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Plase signin!");
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//CREATE NEW PHONE BASED ON ENTRY ID
app.post('/phones/:entryId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Entry.findOne({
            include: [{
                model: AddressBook,
                where: {
                    AccountId: req.accountId
                }
            }],
            where: {
                id: req.params.entryId
            }
        }).then(function(entry) {
            if (entry) {
                return Phone.create(req.body);
            }
            else {
                res.status(404).send("Entry not found");
            }
        }).then(function(newPhone) {
            res.json(newPhone);
            var plainPhone = newPhone.get({
                plain: true
            });
            return Phone.update({
                EntryId: req.params.entryId
            }, {
                where: {
                    id: plainPhone.id
                }
            });
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//FIND ALL PHONES MATCHING A CERTAIN ENTRY
app.get('/phones/:entryId', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Phone.findAll({
            include: [{
                model: Entry,
                where: {
                    id: req.params.entryId
                },
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                EntryId: req.params.entryId
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            limit: req.query.limit,
            offset: req.query.offset
        }).then(function(phones) {
            if (phones.length > 0) {
                res.json(phones);
            }
            else {
                res.send("No phones found matching the provided entry.");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//FIND ONE SPECIFIC PHONE
app.get('/phones/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Phone.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(phones) {
            if (phones) {
                res.json(phones);
            }
            else {
                res.send("No phone found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//DELETE PHONES BASED ON ID. PHONE MUST BELONG TO CURRENT ACCOUNT
app.delete('/phones/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Phone.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(phones) {
            if (phones) {
                Phone.destroy({
                    where: {
                        id: req.params.id
                    }
                });
                res.send("Phone deleted!");
            }
            else {
                res.send("Phone not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Please login!");
    }
});
//UPDATE PHONE BASED ON ID
app.put('/phones/:id', middleware.authentication, function(req, res) {
    if (req.accountId) {
        Phone.findOne({
            include: [{
                model: Entry,
                include: [{
                    model: AddressBook,
                    where: {
                        AccountId: req.accountId
                    }
                }]
            }],
            where: {
                id: req.params.id
            }
        }).then(function(phones) {
            if (phones) {
                res.send("Phone updated!");
                return Phone.update(req.body, {
                    where: {
                        id: req.params.id
                    }
                });
            }
            else {
                res.send("Phone not found!");
            }
        }).catch(function(err) {
            console.log(err);
        });
    }
    else {
        res.status(404).send("Plase signin!");
    }
});






app.listen(port, function() {
    console.log('SERVER IS ONLINE. LISTENING ON PORT ' + port + '.');
});
