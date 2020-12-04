import type { Configuration } from 'webpack';

import path from 'path';
import nodeExternals from 'webpack-node-externals';

const config: Configuration = {
  mode: 'production',
  target: 'node',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'source-map',
  externals: [nodeExternals()],
};

export default config;
