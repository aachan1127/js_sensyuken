const token = '※発行したトークンを入力※';
const api = {
    url: 'https://api.fitbit.com/1',
    resource: '/user/-/body/log/weight/date/2017-11-01/1m.json', // 11月の体重を1ヶ月間取得したい場合
}

fetch(`${api.url}${api.resource}`, {
    method: 'get',
    headers: { 'Authorization': `Bearer ${token}` }
}).then((response) => {
    return response.json();
}).then((json) => {
    console.log(json);
});