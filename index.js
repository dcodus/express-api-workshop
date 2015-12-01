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


app.use('/signIn', function(req, res, next) {
    req.accountId = 1;
    next();
})

app.get('/signIn/AddressBook', function(req, res) {
    console.log(req.accountId);
    connection.query("SELECT * FROM AddressBook where AddressBook.accountId=" + req.accountId, function(err, rows) {
        res.json(rows);
    })
})


app.get('/signIn/AddressBook/:id', function(req, res) {
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
        } else {
            res.status(400).send("No matches found!");
        }
    })

})



app.listen(process.env.PORT, function() {
    console.log("Server initialized. Listening on port " + process.env.PORT + '.');
})