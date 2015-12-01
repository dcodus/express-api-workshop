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


app.get('/', function(req, res){
    console.log('The root folder was accessed!')
    res.send('This is the root folder!');
})

connection.connect();

connection.query("SELECT * FROM Account", function(err, rows){
    
})

connection.end();

app.listen(process.env.PORT, function(){
    console.log("Server initialized. Listening on port " + process.env.PORT + '.');
})