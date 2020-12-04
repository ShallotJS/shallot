import type { Configuration } from 'webpack';

import path from 'path';
import nodeExternals from 'webpack-node-externals';

const config: Configuration = {
  mode: 'production',
  target: 'node',
  entry: {
    index: './src/index.ts',
    'aws/index': './src/aws/index.ts',
    'azure/index': './src/azure/index.ts',
  },
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
    libraryTarget: 'commonjs',
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'source-map',
  externals: [nodeExternals()],
};

export default config;
