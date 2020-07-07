var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Observation System' });
});

/* GET domain page */
router.get('/domains', function(req, res, next) {
  res.render('domains', { title: 'Domains' });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
  res.render('helloworld', { title: 'Hello, World!' });
});

/* GET Userlist page. */
router.get('/clusters', function(req, res) {
  var db = req.db;
  var collection = db.get('usercollection');
  collection.find({},{sort: 'cluster'},function(e,docs){
      res.render('clusters', {
          "clusters" : docs
      });
  });
});

/* GET New User page. */
router.get('/newurls', function(req, res) {
  res.render('newurls', { title: 'Add New URL' });
});

/* POST to Add User Service */
router.post('/adduser', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var cluster = req.body.cluster;
    var url = req.body.url;

    // Set our collection
    var collection = db.get('usercollection');

    // Submit to the DB
    collection.insert({
        "cluster" : cluster,
        "url" : url
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            //res.redirect("userlist");
            res.redirect("newurls");
        }
    });

});

module.exports = router;
