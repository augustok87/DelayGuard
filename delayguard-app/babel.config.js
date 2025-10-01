module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: 'commonjs'
    }],
    ['@babel/preset-typescript', {
      allowDeclareFields: true
    }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-object-rest-spread'
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          },
          modules: 'commonjs'
        }],
        ['@babel/preset-typescript', {
          allowDeclareFields: true
        }]
      ],
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-transform-object-rest-spread'
      ]
    }
  }
};
