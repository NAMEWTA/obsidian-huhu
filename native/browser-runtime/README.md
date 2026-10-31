# Browser 原生 helper

完整的设计、数据边界、支持平台与安装说明见 [浏览器运行时](../../docs/browser-runtime.md)。维护说明以该文档为准。

从仓库根目录构建与验证：

```sh
pnpm exec tsc -p tsconfig.browser-worker.json
node scripts/build-browser-runtime.mjs
cargo test --locked --manifest-path native/browser-runtime/Cargo.toml
cargo build --release --locked --manifest-path native/browser-runtime/Cargo.toml
node scripts/install-browser-runtime.mjs \\
  native/browser-runtime/target/release/huhu-browser-runtime \\
  /absolute/new-runtime-bundle \\
  /absolute/download-cache
node scripts/verify-browser-runtime-native.mjs \\
  /absolute/huhu-browser-runtime \\
  /absolute/chrome-linux64/chrome \\
  /absolute/new-native-evidence-directory
```

生产仅启用 Linux x64，Chrome sandbox 始终开启；其他平台必须通过自己的原生进程隔离和真实宿主门禁之后才能启用。
