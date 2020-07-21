var express = require('express');
var router = express.Router();
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

router.use(bodyParser.json());
router.use(methodOverride('_method'));


const mongoURI = 'mongodb+srv://hosam:hosam@mongouploads.ipcfv.mongodb.net/MongoUploads?retryWrites=true&w=majority'
//Create mongo connection

const conn = mongoose.createConnection(mongoURI);

//Init gfs
let gfs;

conn.once('open', () =>{
    //Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

//Create storage engine

const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = file.originalname;
          const metadata = req.body;
          const fileInfo = {
            filename: filename,
            metadata: metadata,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

// @route GET /
// @desc Loads form
router.get('/domains/:domain/:cluster/:need/:solution', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('specificsolution', { files: false, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, solution: req.params.solution });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('specificsolution', { files: files, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, solution: req.params.solution });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
router.post('/upload', upload.single('file'), (req, res) => {
  //res.json({ file: req.file })
  var domains = '/domains';
  var domain = req.body.domain;
  var cluster = req.body.cluster;
  var need = req.body.need;
  var solution = req.body.solution;
  var url = domains + '/' + domain + '/' + cluster + '/' + need + '/' + solution
  res.redirect(url);
});

router.post('/uploadasset', upload.single('file'), (req, res) => {
  //res.json({ file: req.file })
  var title = req.body.title;
  var domain = 'domains/';
  var combined = domain + title;

  res.redirect(combined);
});

// @route GET /files
// @desc  Display all files in JSON
router.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
router.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
router.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

  
    if (file) {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
router.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    if(req.body.whereto == "domainpage"){
      var title = req.body.domain;
  var domain = '/domains/';
  var combined = domain + title;

  res.redirect(combined);
    } else{
      var domains = '/domains';
  var domain = req.body.domain;
  var cluster = req.body.cluster;
  var need = req.body.need;
  var solution = req.body.solution;
  var url = domains + '/' + domain + '/' + cluster + '/' + need + '/' + solution
  res.redirect(url);
    }
    
  });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Observation System' });
});

/* GET domain page */
router.get('/domains', function(req, res, next) {
  var db = req.db;
  var collection = db.get('domains');
  collection.find({},{},function(e,docs){
    res.render('domains', {
      "targets" : docs
    });
  });
});

/*GET edit page */
router.get('/edit', function(req,res,next){
  var db = req.db;
  var collection = db.get('domains');
  collection.find({},{},function(e,docs){
    res.render('edit',{
      "targets":docs
    });
  });
});
router.get('/editdomain/:domain', function(req,res,next){
  var db = req.db;
  var collection = db.get('clusters');
  collection.find({"domain": req.params.domain.toLocaleUpperCase()},{},function(e,docs){
    res.render('edit-domain',{
      "clusters":docs, title: req.params.domain.toLocaleUpperCase()
    });
  });
});
router.get('/editcluster/:domain/:cluster', function(req,res,next){
  var db = req.db;
  var collection = db.get('needs');
  collection.find({"domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster},{},function(e,docs){
    res.render('edit-cluster',{
      "needs":docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster
    });
  });
});
router.get('/editneed/:domain/:cluster/:need', function(req,res,next){
  var db = req.db;
  var collection = db.get('solutions');
  collection.find({"domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster, "need": req.params.need},{},function(e,docs){
    res.render('edit-need',{
      "concepts":docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need
    });
  });
});


/* Get Clusters page based off user input*/
router.get("/domains/:domain", (req, res) => {
  var db = req.db;
  var collection = db.get("clusters");
  gfs.files.find().toArray((err, files) => {
  if (!files || files.length === 0) {
  collection.find({"domain": req.params.domain.toLocaleUpperCase()}, {}, function(e,docs){
    res.render("newurls", {"clusters": docs, files: false, title: req.params.domain.toLocaleUpperCase()})});
  } else{
    files.map(file => {
      if (
        file.contentType === 'image/jpeg' ||
        file.contentType === 'image/png'
      ) {
        file.isImage = true;
      } else {
        file.isImage = false;
      }
    });
    collection.find({"domain": req.params.domain.toLocaleUpperCase()}, {}, function(e,docs){
      res.render('newurls', {"clusters": docs, files: files, title: req.params.domain.toLocaleUpperCase()})})}})});

router.get("/domains/:domain/:cluster", (req, res) => {
  var db = req.db;
  var collection = db.get("needs");
  collection.find({"domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster}, {}, function(e,docs){
    res.render("needs", {
      "needs": docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster
    });
  });
});

router.get("/domains/:domain/:cluster/:need", (req, res) => {
  var db = req.db;
  var collection = db.get("solutions");
  collection.find({"domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster, "need": req.params.need}, {}, function(e,docs){
    res.render("solutions", {
      "solutions": docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need
    });
  });
});

/*router.get("/domains/:domain/:cluster/:need/:solution", (req, res) => {
  var db = req.db;
  var collection = db.get("solutions");
  collection.find({"domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster, "need": req.params.need, "solution": req.params.solution}, {}, function(e,docs){
    res.render("specificsolution", {
      "solutions": docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, solution: req.params.solution
    });
  });
});





/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
  res.render('helloworld', { title: 'Hello, World!' });
});


/* POST to Remove ALL Domains */
router.post('/removequeries', function(req,res){
  var db = req.db;
  var collection = db.get('domains');
  var collectioncluster = db.get('clusters');
  var collectionneeds = db.get('needs');
  var collectionsolutions = db.get('solutions');
  collection.remove({});
  collectioncluster.remove({});
  collectionneeds.remove({});
  collectionsolutions.remove({});
  res.redirect("domains");
});

/* POST to Remove ALL Needs */
router.post('/removeneeds', function(req,res){
  var db = req.db;
  var collection = db.get('needs');
  var collectionsolutions = db.get('solutions');
  var domain = req.body.domain;
  var cluster = req.body.cluster;
  collection.remove({"domain": domain, "cluster": cluster});
  collectionsolutions.remove({"domain": domain, "cluster": cluster})
  var redirect = "domains/" + domain + '/' + cluster;
  res.redirect(redirect);
});

/* POST to Remove ALL Solutions */
router.post('/removesolutions', function(req,res){
  var db = req.db;
  var collection = db.get('solutions');
  var domain = req.body.domain;
  var cluster = req.body.cluster;
  var need = req.body.need;
  collection.remove({"domain": domain, "cluster": cluster, "need": need});
  var redirect = "domains/" + domain + '/' + cluster + '/' + need;
  res.redirect(redirect);
});

/* POST to Remove one Need */
router.post('/removeneed', function(req,res){
  var db = req.db;
  var collection = db.get('needs');
  var collectionsolutions = db.get('solutions');
  var domain = req.body.domain;
  var cluster = req.body.cluster;
  var need = req.body.need;
  collection.remove({"domain": domain, "cluster": cluster, "need": need});
  collectionsolutions.remove({"domain": domain, "cluster": cluster, "need": need});
  var redirect = "editcluster/" + domain + '/' + cluster;
  res.redirect(redirect);
});

/* POST to Remove one Solution */
router.post('/removesolution', function(req,res){
  var db = req.db;
  var collection = db.get('solutions');
  var domain = req.body.domain;
  var cluster = req.body.cluster;
  var need = req.body.need;
  var solution = req.body.solution;
  collection.remove({"domain": domain, "cluster": cluster, "need": need, "solution": solution});
  var redirect = "editneed/" + domain + '/' + cluster + '/' + need;
  res.redirect(redirect);
});

/* POST to Remove one Domain */
router.post('/removequery', function(req,res){
  var db = req.db;
  var domainname = req.body.domain;
  
  var collection = db.get('domains');
  var collectioncluster = db.get('clusters');
  var collectionneeds = db.get('needs');
  var collectionsolutions = db.get('solutions');
  collection.remove({"domain": domainname});
  collectioncluster.remove({"domain": domainname});
  collectionneeds.remove({"domain": domainname});
  collectionsolutions.remove({"domain": domainname});
  res.redirect("edit");
});

/* POST to Edit one Domain */
router.post('/editdomain', function(req,res){
  var db = req.db;

  var domainname = req.body.olddomain;
  var newdomain = req.body.newdomain;

  var collection = db.get('domains');
  var collectioncluster = db.get('clusters');
  var collectionneeds = db.get('needs');
  var collectionsolutions = db.get('solutions');
  collection.update({"domain": domainname}, {$set: {"domain": newdomain}}, {multi: true});
  collectioncluster.update({"domain": domainname}, {$set: {"domain": newdomain}}, {multi: true});
  collectionneeds.update({"domain": domainname}, {$set:{"domain": newdomain}}, {multi: true});
  collectionsolutions.update({"domain": domainname}, {$set: {"domain": newdomain}}, {multi: true});
  res.redirect("edit");
});

/* POST to Edit one Cluster */
router.post('/editcluster', function(req,res){
  var db = req.db;

  var clustername = req.body.oldcluster;
  var newcluster = req.body.newcluster;
  var domain = req.body.domain;

  var url = "/editdomain/" + domain;

  var collectioncluster = db.get('clusters');
  var collectionneeds = db.get('needs');
  var collectionsolutions = db.get('solutions');
  collectioncluster.update({"cluster": clustername}, {$set: {"cluster": newcluster}}, {multi: true});
  collectionneeds.update({"cluster": clustername}, {$set:{"cluster": newcluster}}, {multi: true});
  collectionsolutions.update({"cluster": clustername}, {$set: {"cluster": newcluster}}, {multi: true});
  res.redirect(url);
});

/* POST to Edit one Need */
router.post('/editneed', function(req,res){
  var db = req.db;

  var oldneed = req.body.oldneed;
  var newneed= req.body.newneed;
  var cluster = req.body.cluster;
  var domain = req.body.domain;

  var url = "/editcluster/" + domain + '/' + cluster;

  var collectionneeds = db.get('needs');
  var collectionsolutions = db.get('solutions');
  collectionneeds.update({"need": oldneed}, {$set:{"need": newneed}}, {multi: true});
  collectionsolutions.update({"need": oldneed}, {$set: {"need": newneed}}, {multi: true});

  res.redirect(url);
});

/* POST to Edit one Concept */
router.post('/editconcept', function(req,res){
  var db = req.db;

  var need= req.body.need;
  var cluster = req.body.cluster;
  var domain = req.body.domain;
  var oldconcept = req.body.oldconcept;
  var newconcept = req.body.newconcept;

  var url = "/editneed/" + domain + '/' + cluster + '/' + need;

  var collectionsolutions = db.get('solutions');
  collectionsolutions.update({"solution": oldconcept}, {$set: {"solution": newconcept}}, {multi: true});

  res.redirect(url);
});

/* POST to Remove a Cluster */
router.post('/removecluster', function(req,res){
  var db = req.db;
  var domainname = req.body.domain;
  var clustername = req.body.cluster;

  var domain = 'editdomain/'

  var combined = domain + domainname;

  var collectioncluster = db.get('clusters');
  var collectionneeds = db.get('needs');
  var collectionsolutions = db.get('solutions');
  collectioncluster.remove({"domain": domainname, "cluster": clustername});
  collectionneeds.remove({"domain": domainname, "cluster": clustername});
  collectionsolutions.remove({"domain": domainname, "cluster": clustername});
  res.redirect(combined);
});

/* POST to Remove a URL*/
router.post('/removeurl', function(req,res){
  var db = req.db;
  var domainname = req.body.domain;
  var clustername = req.body.cluster;
  var urlname = req.body.url;

  var domain = 'domains/'

    var combined = domain + domainname;

  var collectioncluster = db.get('clusters');
  collectioncluster.remove({"domain": domainname, "cluster": clustername, "url": urlname});
  res.redirect(combined);
});


/* POST to Add Domain Service */
router.post('/adddomain', function(req, res) {

  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var domain = req.body.domain;

    var spawn = require("child_process").spawn;
    var process = spawn('python',["./public/images/hello.py",
  domain]);
  process.stdout.on('data', function(data){
    res.send(data.toString());
  });
  

  // Set our collection
  var collection = db.get('domains');

  // Submit to the DB
  collection.insert({
      "domain" : domain,
  }, function (err, doc) {
      if (err) {
          // If it failed, return error
          //res.send("You already added that Innovation Target!");
          res.redirect('/domains?re=' + encodeURIComponent('Duplicate_Domain'));
      }
      else {
          // And forward to success page
          res.redirect('/domains?re=' + encodeURIComponent('Domain_Received'));
      }
  });

});
/* POST to Add URL Service */
router.post('/addurl', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var url = req.body.url;
    var cluster = req.body.cluster;
    var title = req.body.title;

    var domain = 'domains/'

    var combined = domain + title;

    // Set our collection
    var collection = db.get('clusters');

    // Submit to the DB
    collection.insert({
        "domain": title,
        "cluster" : cluster,
        "url" : url
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            //res.send("You already added that URL to that cluster!");
            var errorurl = combined + '?re='  + encodeURIComponent('Duplicate_URL');
            res.redirect(errorurl);
        }
        else {
            // And forward to success page
            res.redirect(combined);
        }
    });

});

/* POST to Add URL Service */
router.post('/addcluster', function(req, res) {

  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var cluster = req.body.cluster;
  var url = req.body.url;
  var title = req.body.title;

  var domain = 'domains/'

  var combined = domain + title;

  // Set our collection
  var collection = db.get('clusters');

  // Submit to the DB
  collection.insert({
      "domain": title,
      "cluster" : cluster,
      "url" : url
  }, function (err, doc) {
      if (err) {
          // If it failed, return error
          //res.send("You already added that URL to that cluster!");
          var errorurl = combined + '?re='  + encodeURIComponent('Duplicate_Cluster');
          res.redirect(errorurl);
      }
      else {
          // And forward to success page
          res.redirect(combined);
      }
  });

});

/*Post to Add a Need to a Cluster */
router.post('/addneed', function(req, res) {

  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var cluster = req.body.cluster;
  var need = req.body.need;
  var domain = req.body.domain;

  var domains = 'domains/'

  var combined = domains + domain + '/' + cluster;

  // Set our collection
  var collection = db.get('needs');

  // Submit to the DB
  collection.insert({
      "domain": domain,
      "cluster" : cluster,
      "need" : need
  }, function (err, doc) {
      if (err) {
          // If it failed, return error
          //res.send("Failed");
          var errorurl = combined + '?re='  + encodeURIComponent('Duplicate_Need');
          res.redirect(errorurl);
      }
      else {
          // And forward to success page
          var newurl = combined + '?re='  + encodeURIComponent('Received_Need');
          res.redirect(newurl);
      }
  });

});

/*Post to Add a Solution to a Need/Challenge */
router.post('/addsolution', function(req, res) {

  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var cluster = req.body.cluster;
  var need = req.body.need;
  var domain = req.body.domain;
  var solution = req.body.solution;

  var domains = 'domains/'

  var combined = domains + domain + '/' + cluster + '/' + need;

  // Set our collection
  var collection = db.get('solutions');

  // Submit to the DB
  collection.insert({
      "domain": domain,
      "cluster" : cluster,
      "need" : need,
      "solution" : solution
  }, function (err, doc) {
      if (err) {
          // If it failed, return error
          //res.send("Failed");
          var errorurl = combined + '?re='  + encodeURIComponent('Duplicate_Solution');
          res.redirect(errorurl);
      }
      else {
          // And forward to success page
          var newurl = combined + '?re='  + encodeURIComponent('Received_Solution');
          res.redirect(newurl);
      }
  });

});

module.exports = router;
