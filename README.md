# Publish Cache
A Meteor package designed to provide a snapshot of dataset to the clients.

## About
Publish Cache is a Meteor package designed to provide a new way to access the Read heavy collection without the expensive livedata from regular Meteor pubsub.

## API
It is designed to be similiar to Meteor's own pubsub API.
### Server
Meteor.publishCache(name, func, options):  publish a record set

**Arguments:**

   *name(String, required):*
   > Name of the record set.  It can't not be null or undefined.
   
   *func(Function, required):* 
   > Function called on the server each time a client subscribeCaches.  Inside the function, this is bound to a method           invocation object, which has the same properties as Meteor.methods.  This function can return a Collection cursor, or       array of collection cursors.

   
### Client
Meteor.subscribeCache(name [, arg1, arg2, ...] [, callbacks])

**Arguments:**

  *name (String, required):*
  > Name of the subscription cache.  Matches the name of ther server's publishCache() call.
  
  *arg1, arg2, ...  (Any optional):*
  > Optional arguments passed to the publish Cache function on server
  
  *callbacks (Function or Object optional):*
  > Optional. May include ```onError``` and ```onReady``` callbacks.  If a function is passed instead of an object, it will interpreted as an ```onReady``` callback.

## Usage Pattern and Examples
**Basic: return a cursor**
````javascript
    Items = new Meteor.Collection('items');
    if (Meteor.isServer) {
      //we want to get info on other items that share the same tag.
      Meteor.publishCache('additionalItems', function (tag) {
        return Items.find({tag: tag});
      });
    }
    if (Meteor.isClient) {
      Meteor.subscribeCache('additionalItems', 'someTag');
    }
````

**Return Array of cursors**

We can return an array of cursors. Instead of populated 1 collection, we can populated more.
````javascript
    Books = new Meteor.Collection('books');
    Authors = new Meteor.Collection('authors');
    
    if (Meteor.isServer) {
      Meteor.publishCache('authorInfo', function (name) {
        var bookCursor = Books.find({author: name});
        var authroCursor = Authors.find({name: name});
        return [bookCursor, authorCursos];
      };
    }
    if (Meteor.isClient) {
      Meteor.Cache('authorInfo', name);
    }
````

**Unblock DDP message queue**

Since DDP messages (subscription and method) are processed in a sequence, sometimes, we want the subscription that router are depend on executes first.

In this example, we want to render the page, as soon as the first 5 game scores loaded to client. So we could create a small pub that grab the first five.  And use publishCache package to get rest of them without blocking the DDP message queue.
````javascript
    SportsScores = new Meteor.Collection('sports_scores');
   
    if (Meteor.isServer) {
      Meteor.publish('todayScores', function (sportType) {
        return SportsScores.find({type: sportType}, {limit: 5, sort: {date: -1}});
      }):
      Meteor.publishCache('todayScoresAll', function (sportType) {
        return SportsScores.find({type: sportType}, {sort: {date: -1}});
      }, {unblock: true});
    }
    if (Meteor.isClient) {
    //Using Iron router as an example
      Router.map(function () {
        this.route('todayScores', {
          path: '/scores/:type',
          waitOn: function () {
            Meteor.subscribeCache('todayScoresAll', this.params.type);
            
            return Meteor.subscribe('todayScores', this.params.type);
          }
        });
      });
    }
````
## License
MIT

