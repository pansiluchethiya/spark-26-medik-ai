module.exports = function (api) {
  api.cache(true);
  return {
    // NOTE: nativewind/babel is a preset (its factory returns { plugins }),
    // not a plugin — listing it under `plugins` breaks the Babel build.
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
