# GAS + React Template

Google Apps Script + React でWebアプリを構築するための最小テンプレート。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS
- **バックエンド**: Google Apps Script
- **ビルド**: esbuild + Babel (template-literals変換)
- **開発**: Vite（モックAPI付きローカルサーバー）
- **デプロイ**: clasp

## クイックスタート

```bash
pnpm install      # 依存パッケージのインストール
pnpm run dev      # ローカル開発サーバー起動 (モックAPI)
pnpm run setup    # GASウェブアプリの作成 (ログイン + プロジェクト作成 + 初回プッシュ)
pnpm run deploy   # デプロイ
```

`setup` コマンドで以下を自動実行:
1. claspのログイン確認（未ログインの場合はログイン）
2. GASウェブアプリプロジェクトの新規作成
3. 初回ビルド＆プッシュ

## セットアップ（手動）

上記の `pnpm run setup` を使わず、手動で行う場合:

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. claspにログイン

```bash
pnpm exec clasp login
```

> リモート/ヘッドレスサーバーの場合は `clasp login --no-localhost` を使用。

### 3. GASプロジェクトの作成

**新規Webアプリを作成:**

```bash
pnpm exec clasp create --type webapp --title "My App" --rootDir build
```

**既存のGASプロジェクトを使用する場合:**

`.clasp.json` を手動で作成:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "build"
}
```

### 4. ビルドとデプロイ

```bash
pnpm run build   # ビルドのみ
pnpm run push    # ビルド + GASにプッシュ
pnpm run deploy  # ビルド + プッシュ + デプロイ (dev)
```

## コマンド一覧

```bash
pnpm run dev                # Vite開発サーバー (モックAPI、HMR対応)
pnpm run setup              # GASウェブアプリの初期セットアップ
pnpm run build              # 本番用ビルド (GAS向け)
pnpm run push               # ビルド + GASにプッシュ
pnpm run deploy             # ビルド + プッシュ + デプロイ (dev)
pnpm run deploy:production  # ビルド + プッシュ + デプロイ (production)
```

## プロジェクト構成

```
src/
├── client/           # Reactフロントエンド
│   ├── main.tsx      # エントリーポイント
│   ├── App.tsx       # ルートコンポーネント (HashRouter)
│   ├── pages/        # ページコンポーネント
│   ├── api/          # GAS APIラッパー (gasCall)
│   └── styles/       # Tailwind CSS
└── server/           # GASバックエンド
    └── index.ts      # doGet, apiGet, apiPost, include
```

## 開発モード

`pnpm run dev` で Vite 開発サーバーが起動します（デフォルト: http://localhost:5173）。

- GAS環境外ではインメモリのモックAPIが自動的に使用されます
- HMR（ホットモジュールリプレースメント）対応で即座に変更が反映
- GASにデプロイせずにUI開発・動作確認が可能

## 仕組み

- **HashRouter** を使用 — GASはHTML5 History APIをサポートしないため
- **esbuild** でReactアプリを単一のIIFEにバンドルし、BabelでGAS互換のためにテンプレートリテラルを変換
- **CSSはインライン化** して `index.html` に埋め込み、JSはGASの `include()` パターンで読み込み
- **`escapeJsForGas`** で `</script>` や `://` パターンをエスケープ（GAS HTML埋め込み時の破損を防止）
- サーバーコードはESMとしてバンドル後、`import`/`export` を除去してGAS `.gs` 形式に変換
- **APIクライアント** が環境を自動判定: GASでは `google.script.run`、Viteではモック API を使用
