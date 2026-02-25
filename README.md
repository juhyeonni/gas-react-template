# GAS + React Template

Google Apps Script + React + gsquery で Web アプリを構築するためのモノレポテンプレート。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS (FSD アーキテクチャ)
- **バックエンド**: Google Apps Script
- **データベース**: Google Sheets (gsquery ORM)
- **ビルド**: esbuild + Babel (template-literals 変換)
- **開発**: Vite + Hono モック API サーバー
- **デプロイ**: clasp
- **パッケージ管理**: pnpm workspace

## モノレポ構成

```
packages/
├── client/       # @gas-app/client  — React フロントエンド (FSD)
├── core/         # @gas-app/core    — 共通ビジネスロジック・スキーマ・API ハンドラ
├── gas-server/   # @gas-app/gas-server — GAS バックエンド (doGet, apiGet, apiPost)
└── dev-server/   # @gas-app/dev-server — ローカル開発用モック API サーバー (Hono)
```

### パッケージ概要

| パッケージ | 役割 |
|-----------|------|
| **client** | React 18 + FSD 構成の Web UI。`gasCall()` で GAS/dev 環境を自動判定 |
| **core** | gsquery スキーマ定義、サービス層、リクエストハンドラ。クライアント・サーバー共有 |
| **gas-server** | GAS グローバル関数 (`doGet`, `apiGet`, `apiPost`)。SheetsAdapter で Sheets 連携 |
| **dev-server** | Hono HTTP サーバー + MockAdapter。ローカル開発時に GAS を代替 |

## クイックスタート

```bash
pnpm install      # 依存パッケージのインストール
pnpm run dev      # ローカル開発サーバー起動 (Vite + モック API)
pnpm run setup    # GAS ウェブアプリの作成 (ログイン + プロジェクト作成 + 初回プッシュ)
pnpm run deploy   # デプロイ
```

`setup` コマンドで以下を自動実行:
1. clasp のログイン確認（未ログインの場合はログイン）
2. GAS ウェブアプリプロジェクトの新規作成
3. 初回ビルド＆プッシュ

## セットアップ（手動）

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. clasp にログイン

```bash
pnpm exec clasp login
```

> リモート/ヘッドレスサーバーの場合は `clasp login --no-localhost` を使用。

### 3. GAS プロジェクトの作成

**新規 Web アプリを作成:**

```bash
pnpm exec clasp create --type webapp --title "My App" --rootDir build
```

**既存の GAS プロジェクトを使用する場合:**

`.clasp.json` を手動で作成:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "build"
}
```

### 4. スプレッドシート ID の設定

```bash
pnpm run setup:sheet
```

`.clasp.json` から scriptId を読み取り、GAS スクリプトプロパティにスプレッドシート ID を設定します。

### 5. ビルドとデプロイ

```bash
pnpm run build   # ビルドのみ
pnpm run push    # ビルド + GAS にプッシュ
pnpm run deploy  # ビルド + プッシュ + デプロイ (dev)
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `pnpm run dev` | Vite + Hono 開発サーバー起動 (HMR 対応) |
| `pnpm run setup` | GAS ウェブアプリの初期セットアップ |
| `pnpm run setup:sheet` | スプレッドシート ID の設定 |
| `pnpm run build` | 本番用ビルド (GAS 向け) |
| `pnpm run push` | ビルド + GAS にプッシュ |
| `pnpm run deploy` | ビルド + プッシュ + デプロイ (dev) |
| `pnpm run deploy:production` | ビルド + プッシュ + デプロイ (production) |
| `pnpm run typecheck` | TypeScript 型チェック |

## gsquery について

[gsquery](https://github.com/juhyeonni/gsquery) は Google Sheets 向けの TypeScript ORM ライブラリです。

- **スキーマ定義** → CLI でコード生成 (`types.ts`, `client.ts`)
- **アダプタパターン**: `SheetsAdapter` (本番) / `MockAdapter` (開発・テスト)
- **リポジトリ API**:

```typescript
db.from('Counter').findById(id)
db.from('Counter').create({ count: 0 })
db.from('Counter').update(id, { count: 1 })
db.from('Counter').delete(id)
```

## クライアント構成 (FSD)

```
packages/client/src/
├── app/              # アプリケーション初期化・ルーティング
│   ├── providers/    # Router プロバイダ
│   └── routes/       # ルート定義
├── pages/            # ページコンポーネント
├── features/         # 機能スライス
├── entities/         # ドメインエンティティ
│   └── counter/      # Counter エンティティ (model, api)
├── widgets/          # 複合 UI コンポーネント
└── shared/           # 共通ユーティリティ・API クライアント
    ├── api/          # gasCall (GAS / fetch 自動切替)
    └── lib/          # ヘルパー関数
```

## 開発モード

`pnpm run dev` で Vite + Hono 開発サーバーが起動します。

- **クライアント**: `http://localhost:5173` (Vite + HMR)
- **API サーバー**: `http://localhost:3001` (Hono + MockAdapter)
- GAS にデプロイせずに UI 開発・動作確認が可能

## 仕組み

- **HashRouter** を使用 — GAS は HTML5 History API をサポートしないため
- **esbuild** で React アプリを単一の IIFE にバンドルし、Babel で GAS 互換のためにテンプレートリテラルを変換
- **CSS はインライン化** して `index.html` に埋め込み、JS は GAS の `include()` パターンで読み込み
- **`escapeJsForGas`** で `</script>` や `://` パターンをエスケープ（GAS HTML 埋め込み時の破損を防止）
- サーバーコードは ESM としてバンドル後、`import`/`export` を除去して GAS `.gs` 形式に変換
- **API クライアント** が環境を自動判定: GAS では `google.script.run`、Vite では fetch を使用
- **スプレッドシート ID** はビルド時に `.clasp.json` から注入

## ライセンス

MIT
