var isCursor = function (c) {
  return c && c._publishCursor;
};

Meteor.publishCache = function (name, func, options) {
  var methodName = '/cache/' + name;

  var methods = {};
  methods[methodName] = function () {
    if (options && options.unblock)
      this.unblock();

    try {
      var returnCursors = func.apply(this, arguments);
      var results = {};

      var returnCursors = _.isArray(returnCursors) ? returnCursors : [returnCursors];

      if (_.isEmpty(returnCursors))
        return;

      returnCursors.forEach(function (cursor) {
        if (! isCursor(cursor)) {
          if (! _.isObject(cursor)) {
            Meteor._debug('Return ');
            return;
          }

          _.extend(results, cursor);
          return;
        }

        if (_.isEmpty(cursor)) {
          Meteor._debug('Cursor is empty.');
          return;
        }

        var collection = cursor._cursorDescription.collectionName;
        cursor.rewind();
        var docs = cursor.fetch();
        results[collection] = docs;
      });

      return results;
    } catch (e) {
      throw e;
    }
  };

  Meteor.methods(methods);
};
