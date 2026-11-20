// babel.config.js
module.exports = function(api) {
  api.cache(true); // ou api.cache(false) dependendo da sua necessidade, true é comum
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Se você adicionou o plugin do reanimated, ele deve estar aqui:
      'react-native-reanimated/plugin',
      // Pode haver outros plugins aqui também
    ],
  };
};