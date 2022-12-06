import * as dotenv from 'dotenv'
dotenv.config()

// Discord API
export const BOT_TOKEN = process.env.BOT_TOKEN
export const CLIENT_ID = process.env.CLIENT_ID

// MySQL Database
export const MYSQL_HOST = process.env.MYSQL_HOST
export const MYSQL_USER = process.env.MYSQL_USER
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE