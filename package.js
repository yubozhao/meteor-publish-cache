Package.describe({
  summary: 'Publish database cache.'
});

Package.on_use(function (api) {
  api.use('underscore');
  api.use('jquery');
  api.add_files('publish_cache_client.js', 'client');
  api.add_files('publish_cache_server.js', 'server');
});
