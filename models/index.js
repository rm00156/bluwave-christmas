const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const env = process.env.NODE_ENV || 'development';

const sequelize = new Sequelize(env === 'test' ? process.env.test_database : process.env.database, process.env.username, process.env.password, {
  host: process.env.database_host,
  dialect: process.env.database_dialect,
  logging: env !== 'test' && env !== 'development',
});
const db = {};

fs
  .readdirSync(__dirname)
  .filter((file) => (file.indexOf('.') !== 0) && (file !== 'index.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
