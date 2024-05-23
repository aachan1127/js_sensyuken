//requireを使ってインポートする
// const { log } = require('console')

// Node.jsの'crypto'モジュールをインポートする
const crypto = require('crypto')

// Expressフレームワークをインポートする
const express = require('express')

// Fetch APIをNode.jsで利用するための 'node-fetch' モジュールをインポートする
const fetch = require('node-fetch')

// メインモジュールとして実行されるかどうかをチェックし、実行された場合は main() 関数を呼び出す
if (require.main === module) {
    main()
}

// メイン関数
async function main() {

    try {
        // Expressアプリケーションのインスタンスを作成する
        const router = express()
        // console.log('here');  main.jsが動いているか確認するログ

        // ランダムなバイト列を生成し、それをSHA-256ハッシュ関数でハッシュ化する
        const verifier = base64UrlEncode(crypto.randomBytes(64))
        const challenge = base64UrlEncode(sha256Hash(Buffer.from(verifier)))



        //フィットビットにログインするための機能
        // '/signin' ルートのハンドラー関数
        router.get('/signin', (req, res) => {

            // Fitbit OAuth2認証のためのURLを構築してリダイレクトする
            // URLパラメーターはFitbit APIの仕様に基づいて設定される
            const search = '?' + new URLSearchParams({
                'client_id': process.env.FITBIT_CLIENT_ID,
                'response_type': 'code',
                'code_challenge': challenge,
                'code_challenge_method': 'S256',
                'scope': 'heartrate',
            })

            const url = 'https://www.fitbit.com/oauth2/authorize' + search
            res.redirect(url)
        })

        // '/callback' ルートのハンドラー関数
        router.get('/callback', async (req, res, next) => {
            try {
                // フィットビットのクライアントIDとクライアントシークレットを取得する
                const user = process.env.FITBIT_CLIENT_ID
                const pass = process.env.FITBIT_CLIENT_SECRET

                // Basic認証の認証情報を作成する
                const credentials = Buffer.from(`${user}:${pass}`).toString('base64')

                // Fitbitのトークン取得用のエンドポイントにリクエストを送信し、トークンを取得する
                const tokenUrl = 'https://api.fitbit.com/oauth2/token'
                const tokenResponse = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        'client_id': process.env.FITBIT_CLIENT_ID,
                        'code': req.query.code,
                        'code_verifier': verifier,

                        'grant_type': 'authorization_code',
                    }).toString(),
                })

                const tokenBody = await tokenResponse.json()

                // エラーがあればコンソールにエラーメッセージを出力し、500エラーを返す
                if (tokenBody.errors) {
                    console.error(tokenBody.errors[0].message)
                    res.status(500).end()
                    return
                }

                // Fitbit APIからユーザーのヘルスデータを取得するためのURLを構築する
                const userId = '-'
                const date = 'today'
                const detailLevel = '1sec'
                const dataUrl = 'https://api.fitbit.com/' + [
                    '1',
                    'user',
                    userId,
                    'activities',
                    'heart',
                    'date',
                    date,
                    '1d',
                    `${detailLevel}.json`,
                ].join('/')

                // ヘルスデータを取得するためのリクエストを送信し、データを取得する
                const dataResponse = await fetch(dataUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${tokenBody['access_token']}`,
                    },
                })

                const dataBody = await dataResponse.json()

                // エラーがあればコンソールにエラーメッセージを出力し、500エラーを返す
                if (dataBody.errors) {
                    console.error(dataBody.errors[0].message)
                    res.status(500).end()
                    return
                }

                // レスポンスをテキスト形式で送信する
                res.type('text/plain').send(JSON.stringify(dataBody, null, 2))


            } catch (err) {
                next(err)
            }
        })


        // Expressアプリケーションを指定したポートでリッスンする
        router.listen(3000)

    } catch (err) {
        console.error(err);
    }
}

// Base64URLエンコードを行うユーティリティ関数
function base64UrlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '_')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}

// SHA-256ハッシュを計算するユーティリティ関数
function sha256Hash(buffer) {
    const hash = crypto.createHash('sha256')

    hash.update(buffer)
    return hash.digest()
}

