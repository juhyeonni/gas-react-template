# GAS + React Template

Google Apps Script + React でWebアプリを構築するための最小テンプレート。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS
- **バックエンド**: Google Apps Script
- **ビルド**: esbuild + Babel (template-literals変換)
- **デプロイ**: clasp

## セットアップ

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. claspにログイン

```bash
pnpm exec clasp login
```

ブラウザが開き、Google OAuthの認証画面が表示されます。認証後、資格情報が `~/.clasprc.json` に保存されます。

> リモート/ヘッドレスサーバーの場合は `clasp login --no-localhost` を使用し、認証コードを手動で貼り付けてください。

### 3. GASプロジェクトの作成

**方法A: スタンドアロンスクリプトを作成**

```bash
pnpm exec clasp create --type webapp --title "My App" --rootDir build
```

新しいスクリプトIDで `.clasp.json` が自動生成されます。

**方法B: Googleスプレッドシートにバインドされたスクリプトを作成**

```bash
pnpm exec clasp create --type sheets --title "My App" --rootDir build
```

**方法C: 既存のGASプロジェクトを使用**

1. [script.google.com](https://script.google.com) でプロジェクトを開く
2. **プロジェクトの設定 > ID** からスクリプトIDをコピー
3. `.clasp.json` を手動で作成:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "build"
}
```

### 4. Webアプリとして設定 (claspで作成した場合)

作成後、Apps Scriptエディタを開いてWebアプリの設定を確認:

```bash
pnpm exec clasp open
```

エディタ内: **デプロイ > 新しいデプロイ > ウェブアプリ** — アクセス権を「全員」または任意のスコープに設定。

### 5. ビルドとデプロイ

```bash
pnpm run build   # ビルドのみ
pnpm run push    # ビルド + GASにプッシュ
pnpm run deploy  # ビルド + プッシュ + デプロイ (dev)
```

## コマンド一覧

```bash
pnpm run build              # 本番用ビルド
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

## 仕組み

- **HashRouter** を使用 — GASはHTML5 History APIをサポートしないため
- **esbuild** でReactアプリを単一のIIFEにバンドルし、BabelでGAS互換のためにテンプレートリテラルを変換
- **CSSはインライン化** して `index.html` に埋め込み、JSはGASの `include()` パターンで読み込み
- **`escapeJsForGas`** で `</script>` や `://` パターンをエスケープ（GAS HTML埋め込み時の破損を防止）
- サーバーコードはESMとしてバンドル後、`import`/`export` を除去してGAS `.gs` 形式に変換
