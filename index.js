var express = require('express');
var bodyParser = require('body-parser');
var db = require('mysql');
var app = express();
app.use(bodyParser.json());

var connection = db.createConnection({
    user: 'codus',
    host: 'localhost',
    database: 'addressbook'
});

connection.connect();


app.use(function(req, res, next) {
    req.accountId = 1;
    next();
    //If we dont include this end we will get an error
    res.end();
})

app.get('/AddressBook', function(req, res) {
    console.log(req.accountId);
    connection.query("SELECT * FROM AddressBook where AddressBook.accountId=" + req.accountId, function(err, rows) {
        res.json(rows);
        if (err) {
            res.status(404).send("No match found!")
        }
    })
    res.end();
})


app.get('/AddressBook/:id', function(req, res) {
    connection.query("SELECT * FROM AddressBook where AddressBook.id=" + Number(req.params.id), function(err, rows) {
        if (rows) {
            rows.forEach(function(addressbook) {
                if (addressbook.accountId !== req.accountId) {
                    res.status(404).send("No matches found!");
                }
                else {
                    res.json(rows);
                }
            })
        }
        else if (err) {
            res.status(400).send("No matches found!");
        }
    })
    res.end();
})

app.post('/AddressBooks', function(req, res) {
    if (req.accountId) {
        if (req.body.name) {
            connection.query("INSERT into AddressBook (accountId, name) values (" + req.accountId + ",'" + req.body.name + "')", function(err, rows) {
                if (err) {
                    res.status(400).send()
                }
                connection.query("SELECT * FROM AddressBook where AddressBook.id=" + rows.insertId, function(err, rows) {
                    if (err) {
                        res.status(404).send("No match found")
                    }
                    res.json(rows);
                })
            })
        }
    }
    else {
        res.status(404).send("Account not found!");
    }
    res.end();
})


app.delete('/AddressBooks/:id', function(req, res) {
    console.log(req.params)
    if (req.accountId) {
        connection.query("DELETE FROM AddressBook where AddressBook.id=" + Number(req.params.id), function(err, rows) {
            if (err) {
                res.status.send("No match found!")
            }
            console.log(rows);
            res.send("AddressBook Deleted!")
        })
    }
    res.end();
})


app.put('/AddressBooks/:id', function(req, res) {
    if (req.accountId) {
        var body = req.body;
        console.log(body);
        var id = req.params.id;

        connection.query("SELECT * FROM AddressBook where AddressBook.id=" + id, function(err, rows) {
            if (err) {
                res.status(404).send("No match found")
            }
            if (rows) {
                console.log(rows);
                connection.query("UPDATE AddressBook set name = '" + body.name + "' WHERE AddressBook.id = " + id, function(err, rows) {
                    if (err) {
                        res.status(404).send("No match found!")
                    }
                    console.log(rows);
                })
            }
        })
    }
    res.end();
})

app.post('/Entries/:addressBookId', function(req, res) {
    if (req.body.firstName && req.body.lastName && req.body.birthday) {
        connection.query("SELECT * FROM AddressBook where AddressBook.id =" + req.params.addressBookId, function(err, rows) {
            if (err) {
                res.status(404).send(err);
            }
            console.log(rows);
            if (rows) {
                connection.query("INSERT into Entry (addressbookId, firstName, lastName, birthday) values (" + req.params.addressBookId + ',"' + req.body.firstName + '","' + req.body.lastName + '","' + req.body.birthday + '")', function(err, rows) {
                    if (err) {
                        res.status(404).send(err)
                    }
                    console.log(rows);
                })
            }
        })
    }
    res.end();
})

app.delete('/Entries/:addressBookId/:id', function(req, res) {
    connection.query("select Entry.id, Entry.firstName, Entry.lastName, Entry.birthday from Entry join AddressBook on AddressBook.id = Entry.addressbookId join Account on Account.id = AddressBook.accountId where AddressBook.id =" + req.params.addressBookId + " and Account.id = " + req.accountId + " and Entry.id =" + req.params.id, function(err, rows) {
        console.log(rows);
        if (rows) {
            if (err) {
                res.status(404).send("No match found")
            }
            else {
                connection.query("DELETE from Entry where Entry.id=" + req.params.id + " and Entry.addressbookId=" + req.params.addressBookId, function(err, rows) {
                    if (err) {
                        res.status(404).send();
                    }
                    else {
                        res.send("Entry deleted!")
                    }
                })
            }
        }
        else {
            res.status(404).send("No match found");
        }
    })
    res.end();
})

app.put('/Entries/:addressBookId/:id', function(req, res) {
    connection.query("select Entry.id, Entry.firstName, Entry.lastName, Entry.birthday from Entry join AddressBook on AddressBook.id = Entry.addressbookId join Account on Account.id = AddressBook.accountId where AddressBook.id =" + req.params.addressBookId + " and Account.id = " + req.accountId + " and Entry.id =" + req.params.id, function(err, rows) {
        if (err || rows.length < 1) {
            console.log("NO!");
            res.status(404).send("No access!");
        }
        else if (rows.length > 0) {
            var values = Object.keys(req.body);
            if (values) {
                values.forEach(function(value) {

                    //THIS WILL UPDATE BUT IT IS NOT THE RIGHT WAY OF DOING THINGS


                    /*
                    var query = {firstName: 'ziad', lastName: 'saab'};
                    //Here we are returning a string
                        Object.keys(query).map(function(key) {
                            return key + '="' + query[key] + '"';
                            //Joining the strings
                        }).join(', ')
                    */


                    connection.query("UPDATE Entry set " + value + " = '" + req.body[value] + "' where Entry.id=" + req.params.id + " and Entry.addressbookId=" + req.params.addressBookId, function(err, rows) {
                        if (err) {
                            res.status(400).send("Unable to update@")
                        }
                        res.send("Entry Updated!")
                    })
                })

            }
        }
    })
    res.end();
})



app.listen(process.env.PORT, function() {
    console.log("Server initialized. Listening on port " + process.env.PORT + '.');
})


