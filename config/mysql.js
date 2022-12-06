import * as mysql from 'mysql';
import {MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE} from './constants.js'

export const db = mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    charset: 'utf8mb4'
});

db.connect(function(err) {
    if (err) throw err;
    console.log("MySQL Connection OK");
});

