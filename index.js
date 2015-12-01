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

connection.query("SELECT * FROM Account", function(err, rows){
    console.log(rows);
})

connection.end();