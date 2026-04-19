import dotenv from 'dotenv';
dotenv.config();

const vars = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'PGUSER', 'PGDATABASE', 'PGPASSWORD', 'PGHOST'];
vars.forEach(v => {
  console.log(`${v}: type=${typeof process.env[v]}, value=${JSON.stringify(process.env[v])}`);
});
