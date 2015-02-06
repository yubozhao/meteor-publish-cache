Package.describe({
  summary: 'Publish database cache.',
  "version": "0.2.0",
  "git": "https://github.com/yubozhao/meteor-publish-cache",
  "name": "bozhao:publish-cache"
});

Package.on_use(function (api) {
  api.versionsFrom('METEOR@0.9.0');

  api.use('underscore');
  api.use('jquery');
  api.add_files('publish_cache_client.js', 'client');
  api.add_files('publish_cache_server.js', 'server');
});
