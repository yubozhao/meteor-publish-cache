var cachedSubs = {};
Meteor.subscribeCache = function (/*name .. [arguments] .. (callback|callbacks)*/) {
  var args = _.toArray(arguments);
  var callbacks = {};

  var methodName = '/cache/' + args.shift();

  if (args.length) {
    var lastParam = args[args.length - 1];
    if (typeof lastParam === "function") {
      callbacks.onReady = args.pop();
    } else if (lastParam && (typeof lastParam.onReady === "function" ||
                             typeof lastParam.onError === "function")) {
      callbacks = args.pop();
    }
  };

  /**
   * We set up our CachedSubs information based on request
   */
  var alreadyCached = false;
  cachedSubs[methodName] = cachedSubs[methodName] || [];
  var thisSubs = cachedSubs[methodName];

  var argsStr = JSON.stringify(args);
  var subscriptionObj = _.findWhere(thisSubs, {args: argsStr});
  var timestamp = Math.floor(new Date().getTime() / 1000);

  if (subscriptionObj &&
   (subscriptionObj.sec + subscriptionObj.timestamp) > timestamp) {
    alreadyCached = true;
  } else {
    // We are going to create a new subscriptionObj,
    // so lets remove the old one, if it exists
    if (subscriptionObj) {
      var index = thisSubs.indexOf(subscriptionObj);
      if (index > -1) thisSubs.splice(index, 1);
    }

    var id = Random.id();
    subscriptionObj = {
      id: id,
      sec: 5,
      timestamp: timestamp,
      ready: false,
      args: JSON.stringify(args),
      readyDeps: new Tracker.Dependency,
      remove: function() {
        
      },
      stop: function() {
        
      },
      cache: function(sec) {
        this.sec = sec;
      }
    };

    cachedSubs[methodName].push(subscriptionObj);
  }


  // Even though subscription handle methods aren't really relevant
  // to subscribeCache, we still return them in order to be
  // consistent with the subscribe api, and allow callers
  // (e.g. iron:router) to use this package without breaking.
  var handle = {
    stop: function(){
      subscriptionObj.stop();
    },
    ready: function() {
      subscriptionObj.readyDeps.depend();
      return subscriptionObj.ready;
    },
    cache: function(sec) {
      subscriptionObj.cache(sec);
      return this;
    }
  };
  
  if (alreadyCached) {
    if (callbacks.onReady) {
      callbacks.onReady();
    }

    subscriptionObj.readyDeps.changed();
    subscriptionObj.ready = true;
  } else {
    Meteor.apply(methodName, args, function (err, res) {
      function finish() {
        subscriptionObj.readyDeps.changed();
        subscriptionObj.ready = true;
        subscriptionObj.timestamp = Math.floor(new Date().getTime() / 1000 );
      }

      if (err) {
        if (callbacks.onError) {
          callbacks.onError(err);
        }
      }

      if (!_.isObject(res)) {
        finish();
        err = new Error('Unrecognized return format');
        if (callbacks.onError) {
          callbacks.onError(err);
        }
      }

      if (_.isEmpty(res)) {
        if (callbacks.onReady) {
          callbacks.onReady();
        }
        finish();
        return;
      }

      var localCollections = Meteor.connection._mongo_livedata_collections;
      for (collectionName in res) {
        var docs = res[collectionName];
        var collection = localCollections[collectionName];

        //We do not handle collection that does not exist on the client.
        if (!collection) {
          console.error('Collection "' + collectionName + '" does not exist in local collection.');
          continue;
        }

        if (! _.isArray(docs)) {
          console.error('Unrecognized document format.');
          continue;
        }

        docs.forEach(function (doc) {
          if (!doc) {
            return;
          }

          if (!doc._id) {
            console.error('Return document does not contain _id field.');
            return;
          }
          doc.subCacheCached = true;
          collection.upsert({_id: doc._id}, doc);
        });
      };

      if (callbacks.onReady) {
        callbacks.onReady();
      }
      finish();
      return;
    });
  }

  return handle;
};

/*
 * We don't want to interfere with the regular Meteor pub/sub, when application
 * subscribe to the same data that Meteor is not aware it exists on the client
 * already.  We will override the msg from 'added' to 'changed'.
 *
 * This solution enables to cache the initial data set early. And application
 * can 'turn' those data into 'live data' with regular pubsub.
 *
 */

var originalLiveDataData = Meteor.default_connection._livedata_data;

Meteor.default_connection._livedata_data = function (msg) {
  var serverDoc = Meteor._get(this._serverDocuments, msg.collection, msg.id);
  if (!serverDoc && msg.msg == 'added') {
    var localCollection = Meteor.default_connection._mongo_livedata_collections[msg.collection];
    if (localCollection) {
      var existingDoc = localCollection.findOne(msg.id);
      if (existingDoc) {
        //use deep extend from jquery.  It will be recursively merged.
        //XXX This could be a performance issue.
        msg.fields = $.extend(true, existingDoc, msg.fields);
        delete msg.fields._id;
        msg.msg = "changed";
      }
    }
  }

  // If we get a remove msg, check if the doc is cached or not. For all cached documents we have set the key
  // subCacheCached = true. Just don't apply the msg and thats it.
  if (!serverDoc && msg.msg == 'removed') {
    var localCollection = Meteor.default_connection._mongo_livedata_collections[msg.collection];
    if (localCollection) {
      var existingDoc = localCollection.findOne({_id: msg.id, subCacheCached: true });
      if (existingDoc) {
        return;
      }
    }
  }

  return originalLiveDataData.call(this, msg);
};
