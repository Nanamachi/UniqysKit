# Blockchain Platform Project

[![CircleCI](https://circleci.com/gh/mfac/BPP/tree/master.svg?style=svg)](https://circleci.com/gh/mfac/BPP/tree/master)

:link: :link: :link:

## Get started

### Setup for [ndenv](https://github.com/riywo/ndenv)

```
$ ndenv install v10.1.0
```

### Installation

```
$ cd BPP
$ npm install
```

### Build

```
$ npm run build
```

### Launch for development

```shell:dapp
$ npm run sample:dapp
> bpp-project@0.0.1 sample:dapp /Users/iinuma/project/BPP
> npm run ts-node src/app/sample/grpc-dapp.ts


> bpp-project@0.0.1 ts-node /Users/iinuma/project/BPP
> node -r ts-node/register "src/app/sample/grpc-dapp.ts"

  sample app address: fd70ae06b1609d92012fdbe40924e7547bccf89a +0ms
  grpc start grpc server localhost:56002 +0ms
>
```

When `sample:dapp` starts, execute `sample:core`

```shell:core
$ npm run sample:core

> bpp-project@0.0.1 sample:core /Users/iinuma/project/BPP
> npm run ts-node src/app/sample/grpc-core.ts


> bpp-project@0.0.1 ts-node /Users/iinuma/project/BPP
> node -r ts-node/register "src/app/sample/grpc-core.ts"

(node:9685) ExperimentalWarning: The fs.promises API is experimental
  grpc start grpc server localhost:56001 +0ms
> (node:9685) [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
  grpc connected +34ms
  validator initialized at block(0) +0ms
  validator execute transaction in block(1) +0ms
  grpc executed +13ms
  validator need appState proof block +14ms
  validator add block(2): 0c8063e11c922de9d2366e25585cfae01b95cc48861f220ed612c5d2046c57df +1ms
  validator execute transaction in block(2) +0ms
  grpc executed +7ms
```

### Tests

```
$ npm test
$ open coverage/lcov-report/index.html
```
