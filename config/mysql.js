import * as mysql from 'mysql';
import {MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE} from './constants.js'

export const db = mysql.createPool({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    charset: 'utf8mb4'
});



