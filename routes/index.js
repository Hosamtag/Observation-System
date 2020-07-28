var express = require('express');
var session = require('express-session');
var router = express.Router();
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

router.use(bodyParser.json());
router.use(session({secret: 'its a secret', resave: true, saveUninitialized: true, cookie: {maxAge: 1000*60*60*24*7}}));
router.use(methodOverride('_method'));

var MongoClient = require('mongodb').MongoClient;
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hosam:hosam@mongouploads.ipcfv.mongodb.net/MongoUploads?retryWrites=true&w=majority'
//Create mongo connection

const conn = mongoose.createConnection(mongoURI,{useUnifiedTopology: true,
  useNewUrlParser: true,}
  );

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
      res.render('specificsolution', { files: false, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, solution: req.params.solution, netid: req.session.netid });
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
      res.render('specificsolution', { files: files, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, solution: req.params.solution, netid: req.session.netid });
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

router.post('/uploadwordcloud', upload.single('file'), (req, res) => {
  res.redirect('/domains?re=' + encodeURIComponent('Domain_Received'));
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

router.post('/', function(req, res) {
  var access_token = req.body.access_token;
  axios.get('https://api.colab.duke.edu/identity/v1/', {
    headers: {
        'x-api-key': "musing-wright",
        'Authorization': `Bearer ${access_token}`
    }
  }).then((response) => {
    req.session.firstName= response.data.firstName;
    req.session.lastName = response.data.lastName;
    req.session.netid = response.data.netid;
    res.send('done');
});
});
/* GET domain page*/

router.get('/domains', function(req, res, next) {
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('domains');
    var collectioncluster = dbo.collection('clusters');
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    collection.createIndex( { netid:1, domain: 1 }, { unique: true } );
    collectioncluster.createIndex( { netid:1, domain: 1, cluster: 1, url: 1 }, { unique: true } );
    collectionneeds.createIndex( { netid:1, domain: 1, cluster: 1, need: 1 }, { unique: true } );
    collectionsolutions.createIndex( { netid:1, domain: 1, cluster: 1, need: 1, solution: 1 }, { unique: true } );
    collection.find({"netid": req.session.netid}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('domains', {
      "targets" : docs, netid: req.session.netid
    });
  });
});
});

/*GET edit page */
router.get('/edit', function(req,res,next){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('domains');
    collection.find({"netid": req.session.netid}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('edit', {
      "targets" : docs, netid: req.session.netid
    });
  });
});
});

router.get('/editdomain/:domain', function(req,res,next){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('clusters');
    collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase()}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('edit-domain', {
      "clusters" : docs, title: req.params.domain.toLocaleUpperCase(), netid: req.session.netid
    });
  });
});
});

router.get('/editcluster/:domain/:cluster', function(req,res,next){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('needs');
    collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('edit-cluster', {
        "needs":docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, netid: req.session.netid
    });
  });
});
});

router.get('/editneed/:domain/:cluster/:need', function(req,res,next){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('solutions');
    collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster, "need": req.params.need}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('edit-need', {
        "concepts":docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, netid: req.session.netid
    });
  });
});
});


/* Get Clusters page based off user input*/
router.get("/domains/:domain", (req, res) => {
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('clusters');
    if(!req.session.netid){
    gfs.files.find({"metadata.netid" : ""}).toArray((err, files) => {
      if (!files || files.length === 0) {
      collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase()}).toArray(function(e,docs){
        if (err) throw err;
        res.render("newurls", {"clusters": docs, files: false, title: req.params.domain.toLocaleUpperCase(), netid: req.session.netid})});
      }else{
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
        collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase()}).toArray(function(e,docs){
          res.render('newurls', {"clusters": docs, files: files, title: req.params.domain.toLocaleUpperCase(), netid: req.session.netid})})}})}

    else{
      gfs.files.find({"metadata.netid" : req.session.netid}).toArray((err, files) => {
        if (!files || files.length === 0) {
        collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase()}).toArray(function(e,docs){
          if (err) throw err;
          res.render("newurls", {"clusters": docs, files: false, title: req.params.domain.toLocaleUpperCase(), netid: req.session.netid})});
        }else{
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
          collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase()}).toArray(function(e,docs){
            res.render('newurls', {"clusters": docs, files: files, title: req.params.domain.toLocaleUpperCase(), netid: req.session.netid})})}})}
        });
    });

router.get("/domains/:domain/:cluster", (req, res) => {
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('needs');
    collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('needs', {
        "needs":docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, netid: req.session.netid
    });
  });
});
});

router.get("/domains/:domain/:cluster/:need", (req, res) => {
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('solutions');
    collection.find({"netid": req.session.netid, "domain": req.params.domain.toLocaleUpperCase(), "cluster": req.params.cluster, "need": req.params.need}).toArray(function(e,docs){
      if (err) throw err;
      db.close();
      res.render('solutions', {
        "solutions":docs, title: req.params.domain.toLocaleUpperCase(), cluster: req.params.cluster, need: req.params.need, netid: req.session.netid
    });
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

/* POST to Remove ALL Domains */
router.post('/removequeries', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('domains');
    var collectioncluster = dbo.collection('clusters');
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    collection.remove({"netid": req.session.netid});
    collectioncluster.remove({"netid": req.session.netid});
    collectionneeds.remove({"netid": req.session.netid});
    collectionsolutions.remove({"netid": req.session.netid});
    res.redirect("domains");
});
});

/* POST to Remove ALL Needs */
router.post('/removeneeds', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var domain = req.body.domain;
    var cluster = req.body.cluster;
    collectionneeds.remove({"netid": req.session.netid, "domain": domain, "cluster": cluster});
    collectionsolutions.remove({"netid": req.session.netid, "domain": domain, "cluster": cluster});
    var redirect = "domains/" + domain + '/' + cluster;
    res.redirect(redirect);
});
});

/* POST to Remove ALL Solutions */
router.post('/removesolutions', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectionsolutions = dbo.collection('solutions');
    var domain = req.body.domain;
    var cluster = req.body.cluster;
    var need = req.body.need;
    collectionsolutions.remove({"netid": req.session.netid, "domain": domain, "cluster": cluster, "need": need});
    var redirect = "domains/" + domain + '/' + cluster + '/' + need;
    res.redirect(redirect);
});
});

/* POST to Remove one Need */
router.post('/removeneed', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var domain = req.body.domain;
    var cluster = req.body.cluster;
    var need = req.body.need;
    collection.remove({"netid": req.session.netid, "domain": domain, "cluster": cluster, "need": need});
    collectionsolutions.remove({"netid": req.session.netid, "domain": domain, "cluster": cluster, "need": need});
    var redirect = "editcluster/" + domain + '/' + cluster;
    res.redirect(redirect);
});
});

/* POST to Remove one Solution */
router.post('/removesolution', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('solutions');
    var domain = req.body.domain;
    var cluster = req.body.cluster;
    var need = req.body.need;
    var solution = req.body.solution;
    collection.remove({"netid": req.session.netid, "domain": domain, "cluster": cluster, "need": need, "solution": solution});
    var redirect = "editneed/" + domain + '/' + cluster + '/' + need;
    res.redirect(redirect);
});
});

/* POST to Remove one Domain */
router.post('/removequery', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('domains');
    var collectioncluster = dbo.collection('clusters');
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var domainname = req.body.domain;
    collection.remove({"netid": req.session.netid, "domain": domainname});
    collectioncluster.remove({"netid": req.session.netid, "domain": domainname});
    collectionneeds.remove({"netid": req.session.netid, "domain": domainname});
    collectionsolutions.remove({"netid": req.session.netid, "domain": domainname});
    res.redirect("edit");
});
});

/* POST to Edit one Domain */
router.post('/editdomain', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('domains');
    var collectioncluster = dbo.collection('clusters');
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var domainname = req.body.olddomain;
    var newdomain = req.body.newdomain;
    collection.update({"netid": req.session.netid, "domain": domainname}, {$set: {"domain": newdomain}}, {multi: true});
    collectioncluster.update({"netid": req.session.netid, "domain": domainname}, {$set: {"domain": newdomain}}, {multi: true});
    collectionneeds.update({"netid": req.session.netid, "domain": domainname}, {$set:{"domain": newdomain}}, {multi: true});
    collectionsolutions.update({"netid": req.session.netid, "domain": domainname}, {$set: {"domain": newdomain}}, {multi: true});
    res.redirect("edit");
});
});

/* POST to Edit one Cluster */
router.post('/editcluster', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectioncluster = dbo.collection('clusters');
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var clustername = req.body.oldcluster;
    var newcluster = req.body.newcluster;
    var domain = req.body.domain;
    collectioncluster.update({"netid": req.session.netid,"domain": domain, "cluster": clustername}, {$set: {"cluster": newcluster}}, {multi: true});
    collectionneeds.update({"netid": req.session.netid,"domain": domain, "cluster": clustername}, {$set:{"cluster": newcluster}}, {multi: true});
    collectionsolutions.update({"netid": req.session.netid,"domain": domain, "cluster": clustername}, {$set: {"cluster": newcluster}}, {multi: true});
    var url = "/editdomain/" + domain;
    res.redirect(url);
});
});

/* POST to Edit one Need */
router.post('/editneed', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var oldneed = req.body.oldneed;
    var newneed= req.body.newneed;
    var cluster = req.body.cluster;
    var domain = req.body.domain;
    collectionneeds.update({"netid": req.session.netid,"domain": domain,"need": oldneed}, {$set:{"need": newneed}}, {multi: true});
    collectionsolutions.update({"netid": req.session.netid,"domain": domain,"need": oldneed}, {$set: {"need": newneed}}, {multi: true});
    var url = "/editcluster/" + domain + '/' + cluster;    
    res.redirect(url);
});
});

/* POST to Edit one Concept */
router.post('/editconcept', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectionsolutions = dbo.collection('solutions');
    var need= req.body.need;
    var cluster = req.body.cluster;
    var domain = req.body.domain;
    var oldconcept = req.body.oldconcept;
    var newconcept = req.body.newconcept;
    collectionsolutions.update({"netid": req.session.netid,"domain": domain,"solution": oldconcept}, {$set: {"solution": newconcept}}, {multi: true});
    var url = "/editneed/" + domain + '/' + cluster + '/' + need;    
    res.redirect(url);
});
});

/* POST to Remove a Cluster */
router.post('/removecluster', function(req,res){
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectioncluster = dbo.collection('clusters');
    var collectionneeds = dbo.collection('needs');
    var collectionsolutions = dbo.collection('solutions');
    var domainname = req.body.domain;
    var clustername = req.body.cluster;

    var domain = 'editdomain/'

    var combined = domain + domainname;
    collectioncluster.remove({"netid": req.session.netid,"domain": domainname, "cluster": clustername});
    collectionneeds.remove({"netid": req.session.netid,"domain": domainname, "cluster": clustername});
    collectionsolutions.remove({"netid": req.session.netid,"domain": domainname, "cluster": clustername}); 
    res.redirect(combined);
});
});

/* POST to Remove a URL*/
router.post('/removeurl', function(req,res){
  MongoClient.connect(mongoURI,  { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collectioncluster = dbo.collection('clusters');
    var domainname = req.body.domain;
    var clustername = req.body.cluster;
    var urlname = req.body.url;

    var domain = 'domains/'

    var combined = domain + domainname;
    collectioncluster.remove({"netid": req.session.netid,"domain": domainname, "cluster": clustername, "url": urlname});
    res.redirect(combined);
});
});


/* POST to Add Domain Service */
router.post('/adddomain', function(req, res) {
  var domain = req.body.domain;
  MongoClient.connect(mongoURI,  { useNewUrlParser: true }, function(err,db){
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('domains');
    collection.insert({
      "netid": req.session.netid,
      "domain" : domain,
  }, function (err, doc) {
      if (err) {
          // If it failed, return error
          //res.send("You already added that Innovation Target!");
          db.close();
          res.redirect('/domains?re=' + encodeURIComponent('Duplicate_Domain'));
      }
      else {
          // And forward to success page
          db.close();
          res.redirect('/domains?re=' + encodeURIComponent('Domain_Received'));
      }
  });
});
});
/* POST to Add URL Service */
router.post('/addurl', function(req, res) {
  // Get our form values. These rely on the "name" attributes
  var url = req.body.url;
  var cluster = req.body.cluster;
  var title = req.body.title;

  var domain = 'domains/'

  var combined = domain + title;
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err,db){
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('clusters');
    collection.insert({
      "netid": req.session.netid,
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
});

/*Post to ADD Cluster*/
router.post('/addcluster', function(req, res) {
  var cluster = req.body.cluster;
  var url = req.body.url;
  var title = req.body.title;

  var domain = 'domains/'

  var combined = domain + title;
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err,db){
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('clusters');
    collection.insert({
      "netid": req.session.netid,
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
});

/*Post to Add a Need to a Cluster */
router.post('/addneed', function(req, res) {
  var cluster = req.body.cluster;
  var need = req.body.need;
  var domain = req.body.domain;

  var domains = 'domains/'

  var combined = domains + domain + '/' + cluster;
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err,db){
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('needs');
    collection.insert({
      "netid": req.session.netid,
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
});

/*Post to Add a Solution to a Need/Challenge */
router.post('/addsolution', function(req, res) {
  var cluster = req.body.cluster;
  var need = req.body.need;
  var domain = req.body.domain;
  var solution = req.body.solution;

  var domains = 'domains/'

  var combined = domains + domain + '/' + cluster + '/' + need;
  MongoClient.connect(mongoURI, { useNewUrlParser: true }, function(err,db){
    if (err) throw err;
    var dbo = db.db("MongoUploads");
    var collection = dbo.collection('solutions');
    collection.insert({
      "netid": req.session.netid,
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
});

router.post('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
